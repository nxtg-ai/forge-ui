/**
 * Security Audit Report Generator
 * Comprehensive security analysis and reporting
 */

import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";

export interface SecurityViolation {
  file: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  recommendation: string;
}

export interface SecurityAuditReport {
  timestamp: Date;
  summary: {
    totalFiles: number;
    filesScanned: number;
    violations: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    passedChecks: number;
    failedChecks: number;
    overallScore: number; // 0-100
  };
  violations: SecurityViolation[];
  /** Findings a COMMAND_INJECTION_WAIVERS entry waived, with its reason and evidence. */
  suppressed: SuppressedFinding[];
  /** Waivers that covered no finding. A stale waiver would hide the next sink in its symbol. */
  unusedWaivers: string[];
  recommendations: string[];
  complianceStatus: {
    inputValidation: boolean;
    xssPrevention: boolean;
    commandInjectionPrevention: boolean;
    pathTraversalPrevention: boolean;
    secretManagement: boolean;
    accessControl: boolean;
  };
}

export interface SuppressedFinding {
  file: string;
  line: number;
  category: string;
  description: string;
  reason: string;
}

/**
 * Command-injection rule, calibrated (DIRECTIVE-NXTG-20260718-17, forge-pm
 * ruling 65402e5e; rule defects listed in docs/security/2026-10-07-scanner-triage.md).
 *
 * The old rule flagged every `exec(`/`spawn(` token as CRITICAL unless the
 * line said "validate". It could not tell a literal command or an argument
 * array (the construction that prevents shell injection) from a shell string
 * built at runtime, and it matched `RegExp.exec()` and method names. The
 * calibrated rule asks the question that matters: does a shell parse a string
 * that is not a literal?
 *
 * - `exec`/`execSync`: the first argument is parsed by a shell. A string
 *   literal (or a template with no `${}`) is clear; anything else is CRITICAL.
 * - `spawn`/`spawnSync`/`execFile`/`execFileSync`: no shell, so an argument
 *   array is clear. It is CRITICAL when a shell or interpreter can parse a
 *   non-literal: a `shell` option in any form (or options the scanner cannot
 *   see), a literal shell executable whose arguments are not a visible literal
 *   array, or a script flag (`-c`, `-lc`, `/c`, `-Command`, `node -e`, …)
 *   followed by a non-literal. A non-literal executable is reported HIGH: no
 *   shell parses it, but it should not come from a request.
 * - Dotted and bracket calls count only on a `child_process`/`node-pty`/
 *   `cross-spawn`/`shelljs` namespace (`cp.exec(x)`, `cp["exec"](x)`);
 *   `pattern.exec(s)` and `worker.spawn()` do not. Aliases (`const e = exec`,
 *   `promisify(exec)`, destructuring, `import cp = require`, dynamic `import()`)
 *   are followed. Method definitions and comment lines are not calls.
 * - `eval` in any form, `new Function(…)` and `vm.run*`/`new vm.Script` with a
 *   non-literal are CRITICAL.
 * - Limits (line-based, no type information): a call through a variable the
 *   scanner cannot trace to a process module, or a third-party runner other
 *   than shelljs (execa, zx), is not seen.
 *
 * A CRITICAL finding can be waived only by an entry in
 * COMMAND_INJECTION_WAIVERS, keyed to one file and one function or method
 * (never a rule or a directory), carrying its reason and the evidence that no
 * request reaches it. Every waiver is printed on every run, a waiver that
 * covers nothing fails the run, and security-waivers.test.ts fails if a waived
 * symbol becomes reachable from the server (forge-pm ruling, al 00:21Z).
 */
const SHELL_STRING_CALLS = new Set(["exec", "execSync"]);
const ARGV_CALLS = new Set(["spawn", "spawnSync", "execFile", "execFileSync"]);
const PROCESS_MODULE = String.raw`['"](?:node:)?child_process['"]|['"]node-pty['"]|['"]cross-spawn['"]|['"]shelljs['"]`;
const VM_MODULE = String.raw`['"](?:node:)?vm['"]`;
/** A literal naming a shell, which parses its script argument. */
const SHELL_EXECUTABLE = /^['"`](?:[\w./\\:-]*[/\\])?(?:sh|bash|zsh|dash|ksh|fish|cmd|cmd\.exe|powershell|powershell\.exe|pwsh)['"`]$/i;
/** A literal naming an interpreter whose flag takes code. */
const INTERPRETER = /^['"`](?:[\w./\\:-]*[/\\])?(?:node|deno|bun|python[\d.]*|perl|ruby|php)['"`]$/i;
/** Flags after which a shell or interpreter takes a script. */
const SCRIPT_FLAG = /^['"`](?:-[a-z]*c[a-z]*|\/c|\/k|-command|-e|--eval|-p|--print|-r)['"`]$/i;
/** Lines after the call line searched for its arguments. */
const CALL_WINDOW_LINES = 8;

export interface ProcessCallContext {
  /** Names bound to a process module: `import * as cp from "child_process"`. */
  namespaces: Set<string>;
  /** Local name -> process function: `spawn`, `run` for `exec as run`, promisified aliases. */
  locals: Map<string, string>;
  /** Names bound to the `vm` module. */
  vmNamespaces: Set<string>;
}

/** Which names in this file launch a process. */
export function processCallContext(content: string): ProcessCallContext {
  const namespaces = new Set<string>(["child_process"]);
  const locals = new Map<string, string>();
  for (const name of [...SHELL_STRING_CALLS, ...ARGV_CALLS]) locals.set(name, name);

  const load = String.raw`(?:require|(?:await\s+)?import)\(\s*(?:${PROCESS_MODULE})\s*\)`;
  const nsPatterns = [
    String.raw`import\s+\*\s+as\s+([\w$]+)\s+from\s+(?:${PROCESS_MODULE})`,
    String.raw`import\s+([\w$]+)\s*(?:,\s*\{[^}]*\})?\s+from\s+(?:${PROCESS_MODULE})`,
    String.raw`(?:const|let|var)\s+([\w$]+)\s*=\s*${load}`,
    String.raw`import\s+([\w$]+)\s*=\s*require\(\s*(?:${PROCESS_MODULE})\s*\)`,
  ];
  for (const pattern of nsPatterns) {
    for (const m of content.matchAll(new RegExp(pattern, "g"))) namespaces.add(m[1]);
  }

  const named = new RegExp(
    String.raw`(?:import\s*(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*|(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:require|(?:await\s+)?import)\(\s*)(?:${PROCESS_MODULE})`,
    "g",
  );
  const lists: string[] = [];
  for (const m of content.matchAll(named)) lists.push(m[1] ?? m[2] ?? "");
  // Destructuring from a namespace already found: const { execSync: go } = cp
  for (const m of content.matchAll(/(?:const|let|var)\s*\{([^}]*)\}\s*=\s*([\w$]+)\s*[;\n]/g)) {
    if (namespaces.has(m[2])) lists.push(m[1]);
  }
  for (const list of lists) {
    for (const part of list.split(",")) {
      const [imported, local] = part.split(/\s+as\s+|\s*:\s*/).map((x) => x.trim());
      if (imported && (SHELL_STRING_CALLS.has(imported) || ARGV_CALLS.has(imported))) {
        locals.set(local || imported, imported);
      }
    }
  }
  // Wrappers (promisify under any name) and plain aliases: run = promisify(exec),
  // e = exec, run = cp.execSync.
  for (const m of content.matchAll(/([\w$]+)\s*=\s*[\w$.]+\(\s*(?:([\w$]+)\.)?(exec|execFile)\s*\)/g)) {
    if (m[2] === undefined || namespaces.has(m[2])) locals.set(m[1], m[3]);
  }
  for (const m of content.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*(?:([\w$]+)\.)?([\w$]+)\s*[;\n]/g)) {
    const target = m[2] === undefined ? locals.get(m[3]) : namespaces.has(m[2]) ? m[3] : undefined;
    if (target && (SHELL_STRING_CALLS.has(target) || ARGV_CALLS.has(target))) locals.set(m[1], target);
  }

  const vmNamespaces = new Set<string>();
  const vmPatterns = [
    String.raw`import\s+\*\s+as\s+([\w$]+)\s+from\s+(?:${VM_MODULE})`,
    String.raw`import\s+([\w$]+)\s+from\s+(?:${VM_MODULE})`,
    String.raw`(?:const|let|var)\s+([\w$]+)\s*=\s*(?:require|(?:await\s+)?import)\(\s*(?:${VM_MODULE})\s*\)`,
  ];
  for (const pattern of vmPatterns) {
    for (const m of content.matchAll(new RegExp(pattern, "g"))) vmNamespaces.add(m[1]);
  }
  return { namespaces, locals, vmNamespaces };
}

/**
 * The top-level items of the list that opens at `text[open]` ("(", "[" or "{").
 * Quotes, templates and nested brackets are respected. If the text ends
 * before the list closes, the items read so far are returned.
 */
export function splitTopLevel(text: string, open: number): string[] {
  const close = text[open] === "[" ? "]" : text[open] === "{" ? "}" : ")";
  const items: string[] = [];
  const stack: string[] = [];
  let cur = "";
  for (let i = open + 1; i < text.length; i += 1) {
    const c = text[i];
    const top = stack[stack.length - 1];
    if (top === '"' || top === "'" || top === "`") {
      cur += c;
      if (c === "\\") {
        cur += text[i + 1] ?? "";
        i += 1;
      } else if (c === top) {
        stack.pop();
      } else if (top === "`" && c === "$" && text[i + 1] === "{") {
        cur += "{";
        i += 1;
        stack.push("${");
      }
      continue;
    }
    if (stack.length === 0 && c === ",") {
      items.push(cur.trim());
      cur = "";
      continue;
    }
    if (stack.length === 0 && c === close) {
      items.push(cur.trim());
      return items.filter((x) => x.length > 0);
    }
    cur += c;
    if (c === '"' || c === "'" || c === "`" || c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" || c === "]" || c === "}") stack.pop();
  }
  if (cur.trim()) items.push(cur.trim());
  return items;
}

/** A string literal, or a template literal with no `${}` substitution. */
export function isLiteralString(arg: string | undefined): boolean {
  if (arg === undefined) return false;
  const a = arg.trim();
  return (
    /^"(?:[^"\\\n]|\\.)*"$/.test(a) ||
    /^'(?:[^'\\\n]|\\.)*'$/.test(a) ||
    /^`(?:[^`\\$]|\\.|\$(?!\{))*`$/.test(a)
  );
}

export interface ProcessCallVerdict {
  severity: "critical" | "high";
  description: string;
}

/** Judge one process call from its canonical function name and its arguments. */
export function classifyProcessCall(fn: string, args: string[]): ProcessCallVerdict | null {
  if (SHELL_STRING_CALLS.has(fn)) {
    if (isLiteralString(args[0])) return null;
    return { severity: "critical", description: `${fn}() passes a shell string that is not a literal` };
  }

  const [file, argv] = args;
  const argvIsArray = argv?.startsWith("[") ?? false;
  const argvItems = argvIsArray ? splitTopLevel(argv!, 0) : undefined;
  // Options are the object after the argv (or in its place). The scanner can
  // only see an object literal; anything else may set `shell`.
  // With two arguments the second is options only when it is an object literal;
  // otherwise it is the argv (a non-literal argv is judged below).
  const argvIsOptions = args.length === 2 && (argv?.startsWith("{") ?? false);
  const optionArgs = args.length >= 3 ? args.slice(2) : argvIsOptions ? [argv!] : [];
  const optionsHidden = optionArgs.some((o) => !o.startsWith("{") || splitTopLevel(o, 0).some((x) => x.startsWith("...")));
  const shellSet = optionArgs.some((o) =>
    splitTopLevel(o.startsWith("{") ? o : `{${o}}`, 0).some((x) =>
      /^["'`]?shell["'`]?\s*(?::\s*(?!false\b)\S|$)/.test(x),
    ),
  );
  const visibleLiterals =
    isLiteralString(file) && (argv === undefined || argvIsOptions || (argvItems?.every(isLiteralString) ?? false));

  if ((shellSet || optionsHidden) && !visibleLiterals) {
    return {
      severity: "critical",
      description: shellSet
        ? `${fn}() with a shell option runs a command that is not a literal`
        : `${fn}() passes options the scanner cannot see (they may set shell) with a non-literal command`,
    };
  }

  const fileIsShell = file !== undefined && SHELL_EXECUTABLE.test(file);
  if (fileIsShell && !argvIsArray && argv !== undefined && !argvIsOptions) {
    return { severity: "critical", description: `${fn}() runs a shell with arguments that are not a visible literal array` };
  }

  if (argvItems) {
    const scriptable = fileIsShell || (file !== undefined && INTERPRETER.test(file)) || !isLiteralString(file);
    const c = argvItems.findIndex((x) => /^['"`](?:-c|\/c|-Command)['"`]$/i.test(x) || (scriptable && SCRIPT_FLAG.test(x)));
    if (c >= 0 && argvItems[c + 1] !== undefined && !isLiteralString(argvItems[c + 1])) {
      return { severity: "critical", description: `${fn}() passes a script flag (${argvItems[c]}) with a non-literal script` };
    }
  }

  if (file !== undefined && !isLiteralString(file)) {
    return {
      severity: "high",
      description: `${fn}() launches an executable that is not a literal (no shell parses it; confirm it cannot come from a request)`,
    };
  }
  return null;
}

export interface CommandInjectionWaiver {
  /** Path under src/, as findings report it. */
  file: string;
  /** `Class.method` or `function`; the waiver covers that body only. */
  symbol: string;
  /** Why this shell string is acceptable here. */
  reason: string;
  /** Why no request reaches it. Guarded by src/test/quality/security-waivers.test.ts. */
  evidence: string;
}

/**
 * The only CRITICAL findings the gate tolerates. Each is a function whose
 * contract is "run this shell command", with no request path to it today.
 */
export const COMMAND_INJECTION_WAIVERS: readonly CommandInjectionWaiver[] = [
  {
    file: "services/command-service.ts",
    symbol: "CommandService.executeBlocking",
    reason: "Runs a caller-supplied shell command by contract (the forge command runner)",
    evidence: "CommandService is never instantiated in src/ outside tests; AutomationService, its only consumer, is not instantiated either",
  },
  {
    file: "services/command-service.ts",
    symbol: "CommandService.executeStreaming",
    reason: "Streams a caller-supplied shell command by contract (shell: true)",
    evidence: "CommandService is never instantiated in src/ outside tests; AutomationService, its only consumer, is not instantiated either",
  },
  {
    file: "adapters/claude-code.ts",
    symbol: "ClaudeCodeAdapter.executeShell",
    reason: "Adapter interface method whose contract is to run a shell command",
    evidence: "No file under src/server references executeShell or imports adapters/claude-code, adapters/mock or adapters/factory",
  },
  {
    file: "adapters/mock.ts",
    symbol: "MockAdapter.executeShell",
    reason: "Adapter interface method whose contract is to run a shell command",
    evidence: "No file under src/server references executeShell or imports adapters/claude-code, adapters/mock or adapters/factory",
  },
  {
    file: "core/backends/wsl-backend.ts",
    symbol: "WSLBackend.execute",
    reason: "IRunspaceBackend.execute runs a shell command in a runspace by contract",
    evidence: "Called only by wsl-backend.test.ts; runspace-manager.ts and pty-bridge.ts, which hold backends, never call .execute(",
  },
  {
    file: "adapters/backend.ts",
    symbol: "whichSync",
    reason: "Interpolates only a name already checked against the fixed ALLOWED_CLI_COMMANDS set",
    evidence: "whichSync returns null before the call for any name outside ALLOWED_CLI_COMMANDS (codex, gemini, claude, node)",
  },
];

/**
 * The 1-based [first, last] lines of the body of `name` (a function or
 * method definition), or null if there is not exactly one definition.
 */
export function symbolLineRange(lines: string[], name: string): [number, number] | null {
  const def = new RegExp(
    String.raw`^\s*(?:export\s+)?(?:(?:public|private|protected|static|async|override)\s+)*(?:function\s+)?${name}\s*(?:<[^>]*>)?\(`,
  );
  const starts = lines.flatMap((line, i) => (def.test(line) ? [i] : []));
  if (starts.length !== 1) return null;
  // Count braces in code only: not inside strings, templates or comments.
  // `stack` holds the open quote/template/comment, or "${" for a template hole.
  let depth = 0;
  let opened = false;
  const stack: string[] = [];
  for (let i = starts[0]; i < lines.length; i += 1) {
    const line = lines[i];
    for (let j = 0; j < line.length; j += 1) {
      const c = line[j];
      const top = stack[stack.length - 1];
      if (top === "/*") {
        if (c === "*" && line[j + 1] === "/") {
          stack.pop();
          j += 1;
        }
        continue;
      }
      if (top === '"' || top === "'" || top === "`") {
        if (c === "\\") j += 1;
        else if (c === top) stack.pop();
        else if (top === "`" && c === "$" && line[j + 1] === "{") {
          stack.push("${");
          j += 1;
        }
        continue;
      }
      if (c === "/" && line[j + 1] === "/") break;
      if (c === "/" && line[j + 1] === "*") {
        stack.push("/*");
        j += 1;
      } else if (c === '"' || c === "'" || c === "`") {
        stack.push(c);
      } else if (c === "{") {
        if (top === "${" || stack.length > 0) stack.push("{");
        else {
          depth += 1;
          opened = true;
        }
      } else if (c === "}") {
        if (stack.length > 0) stack.pop();
        else {
          depth -= 1;
          if (opened && depth === 0) return [starts[0] + 1, i + 1];
        }
      }
    }
    // A string or line comment does not continue past the line end.
    if (stack[stack.length - 1] === '"' || stack[stack.length - 1] === "'") stack.pop();
  }
  return null;
}

interface ActiveWaiver {
  waiver: CommandInjectionWaiver;
  range: [number, number];
  used: boolean;
}

export class SecurityAuditor {
  private violations: SecurityViolation[] = [];
  private suppressed: SuppressedFinding[] = [];
  private waivers = new Map<string, ActiveWaiver[]>();
  private passedChecks = 0;
  private failedChecks = 0;

  async runAudit(
    projectPath: string = process.cwd(),
    options: { waivers?: readonly CommandInjectionWaiver[] } = {},
  ): Promise<SecurityAuditReport> {
    this.violations = [];
    this.suppressed = [];
    this.passedChecks = 0;
    this.failedChecks = 0;

    const srcPath = path.join(projectPath, "src");
    await this.loadWaivers(srcPath, options.waivers ?? COMMAND_INJECTION_WAIVERS);

    // Scan all TypeScript files
    // glob v9 removed the callback API; v13 is installed, so the callback was
    // never invoked and this promise never settled — the audit hung forever and
    // the process exited 0 having scanned nothing.
    const files = await glob("**/*.{ts,tsx}", {
      cwd: srcPath,
      ignore: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.d.ts",
            "**/node_modules/**",
            // The scanner itself: its rule strings and comments name every
            // pattern it looks for (triage: 7 of 9 dev/test findings).
            "test/reports/security-audit.ts",
          ],
    });

    console.log(`Scanning ${files.length} files for security issues...`);

    for (const file of files) {
      const fullPath = path.join(srcPath, file);
      await this.scanFile(fullPath, file);
    }

    const report = this.generateReport(files.length);
    report.unusedWaivers = [...this.waivers.values()]
      .flat()
      .filter((w) => !w.used)
      .map((w) => `${w.waiver.file} ${w.waiver.symbol}`);
    await this.saveReport(report, projectPath);

    return report;
  }

  /** Resolve each waiver to its symbol's lines. An invalid waiver fails the audit. */
  private async loadWaivers(srcPath: string, waivers: readonly CommandInjectionWaiver[]): Promise<void> {
    this.waivers = new Map();
    for (const waiver of waivers) {
      if (waiver.reason.trim().length < 20 || waiver.evidence.trim().length < 20) {
        throw new Error(`Waiver ${waiver.file} ${waiver.symbol} needs a reason and evidence (20+ chars each)`);
      }
      const method = waiver.symbol.split(".").pop() ?? "";
      const lines = (await fs.readFile(path.join(srcPath, waiver.file), "utf-8")).split("\n");
      const range = symbolLineRange(lines, method);
      if (!range) {
        throw new Error(`Waiver ${waiver.file} ${waiver.symbol}: no single definition of ${method}`);
      }
      const list = this.waivers.get(waiver.file) ?? [];
      list.push({ waiver, range, used: false });
      this.waivers.set(waiver.file, list);
    }
  }

  private async scanFile(
    filePath: string,
    relativePath: string,
  ): Promise<void> {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const processCalls = processCallContext(content);

    lines.forEach((line, index) => {
      this.checkHardcodedSecrets(line, index + 1, relativePath);
      this.checkSqlInjection(line, index + 1, relativePath);
      this.checkXssVulnerabilities(line, index + 1, relativePath);
      this.checkCommandInjection(lines, index, relativePath, processCalls);
      this.checkPathTraversal(line, index + 1, relativePath);
      this.checkInsecureCrypto(line, index + 1, relativePath);
    });

    // File-level checks
    this.checkInputValidation(content, relativePath);
    this.checkAccessControl(content, relativePath);
  }

  private checkHardcodedSecrets(
    line: string,
    lineNum: number,
    file: string,
  ): void {
    const secretPatterns = [
      {
        pattern: /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
        name: "API Key",
      },
      {
        pattern: /secret[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
        name: "Secret Key",
      },
      { pattern: /password\s*=\s*['"][^'"]{8,}['"]/i, name: "Password" },
      { pattern: /token\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i, name: "Token" },
      { pattern: /sk-[a-zA-Z0-9]{48}/, name: "OpenAI API Key" },
      { pattern: /github_pat_[a-zA-Z0-9]{82}/, name: "GitHub PAT" },
      { pattern: /AIza[a-zA-Z0-9_-]{35}/, name: "Google API Key" },
    ];

    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
      return;
    }

    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(line)) {
        this.violations.push({
          file,
          line: lineNum,
          severity: "critical",
          category: "Hardcoded Secrets",
          description: `Potential hardcoded ${name} detected`,
          recommendation:
            "Use environment variables or secure secret management instead",
        });
        this.failedChecks++;
        return;
      }
    }

    this.passedChecks++;
  }

  private checkSqlInjection(line: string, lineNum: number, file: string): void {
    // Check for string concatenation in SQL queries
    // The alternation is grouped: ungrouped, any line containing "update",
    // "insert" or "delete" matched (604 of 607 findings, e.g. `updatedAt?: string;`).
    const sqlConcatPattern = /[`'"]\s*(?:SELECT|INSERT|UPDATE|DELETE)\b[^`'"]*[`'"]\s*\+/i;
    const templateLiteralSql = /`\s*(?:SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{/i;

    if (sqlConcatPattern.test(line)) {
      this.violations.push({
        file,
        line: lineNum,
        severity: "high",
        category: "SQL Injection",
        description: "Potential SQL injection via string concatenation",
        recommendation: "Use parameterized queries or prepared statements",
      });
      this.failedChecks++;
    } else if (templateLiteralSql.test(line)) {
      this.violations.push({
        file,
        line: lineNum,
        severity: "high",
        category: "SQL Injection",
        description: "Potential SQL injection via template literals",
        recommendation: "Use parameterized queries with proper escaping",
      });
      this.failedChecks++;
    } else {
      this.passedChecks++;
    }
  }

  private checkXssVulnerabilities(
    line: string,
    lineNum: number,
    file: string,
  ): void {
    // Check for dangerous innerHTML usage
    if (
      /\.innerHTML\s*=/.test(line) &&
      !line.includes("DOMPurify") &&
      !line.includes("sanitize")
    ) {
      this.violations.push({
        file,
        line: lineNum,
        severity: "high",
        category: "XSS Vulnerability",
        description: "Unsafe innerHTML assignment without sanitization",
        recommendation: "Use textContent or sanitize HTML with DOMPurify",
      });
      this.failedChecks++;
    }

    // Check for dangerouslySetInnerHTML in React
    if (/dangerouslySetInnerHTML/.test(line) && !line.includes("DOMPurify")) {
      this.violations.push({
        file,
        line: lineNum,
        severity: "high",
        category: "XSS Vulnerability",
        description: "dangerouslySetInnerHTML used without sanitization",
        recommendation: "Sanitize HTML content before rendering",
      });
      this.failedChecks++;
    }
  }

  private checkCommandInjection(
    lines: string[],
    index: number,
    file: string,
    context: ProcessCallContext,
  ): void {
    const line = lines[index];
    const trimmed = line.trim();
    // Comment lines: `//`, `/*`, and block-comment continuations (`* text`, `*/`).
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || /^\*(?:\s|\/|$)/.test(trimmed)) return;

    const window = lines.slice(index, index + 1 + CALL_WINDOW_LINES).join("\n");
    const names = [...context.locals.keys(), "eval"].map((n) => n.replace(/\$/g, "\\$")).join("|");
    const callRe = new RegExp(String.raw`(?<![\w$])(?:([\w$]+)\s*\.\s*)?(${names})\s*\(`, "g");
    const requireRe = new RegExp(String.raw`require\(\s*(?:${PROCESS_MODULE})\s*\)\s*\.\s*([\w$]+)\s*\(`, "g");

    const found: Array<{ fn: string; open: number }> = [];
    for (const m of line.matchAll(callRe)) {
      const [whole, receiver, name] = m;
      const open = (m.index ?? 0) + whole.length - 1;
      if (receiver !== undefined) {
        // A method on some other object: RegExp.exec, worker.spawn, ...
        if (!context.namespaces.has(receiver)) continue;
        if (!SHELL_STRING_CALLS.has(name) && !ARGV_CALLS.has(name)) continue;
        found.push({ fn: name, open });
        continue;
      }
      const before = line.slice(0, m.index ?? 0);
      if (/(?:function|\.)\s*$/.test(before)) continue;
      const definition = new RegExp(
        String.raw`^\s*(?:(?:public|private|protected|static|async|override)\s+)*${name.replace(/\$/g, "\\$")}\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^{=;]+)?\{`,
      );
      if (definition.test(line)) continue;
      found.push({ fn: name === "eval" ? "eval" : (context.locals.get(name) ?? name), open });
    }
    for (const m of line.matchAll(requireRe)) {
      if (SHELL_STRING_CALLS.has(m[1]) || ARGV_CALLS.has(m[1])) {
        found.push({ fn: m[1], open: (m.index ?? 0) + m[0].length - 1 });
      }
    }
    // cp["exec"](x) and (0, cp.exec)(x) / (0, exec)(x)
    for (const m of line.matchAll(/([\w$]+)\s*\[\s*['"`]([\w$]+)['"`]\s*\]\s*\(/g)) {
      if (context.namespaces.has(m[1]) && (SHELL_STRING_CALLS.has(m[2]) || ARGV_CALLS.has(m[2]))) {
        found.push({ fn: m[2], open: (m.index ?? 0) + m[0].length - 1 });
      }
    }
    for (const m of line.matchAll(/\(\s*0\s*,\s*(?:([\w$]+)\s*\.\s*)?([\w$]+)\s*\)\s*\(/g)) {
      const fn = m[1] === undefined ? (m[2] === "eval" ? "eval" : context.locals.get(m[2])) : context.namespaces.has(m[1]) ? m[2] : undefined;
      if (fn && (fn === "eval" || SHELL_STRING_CALLS.has(fn) || ARGV_CALLS.has(fn))) {
        found.push({ fn, open: (m.index ?? 0) + m[0].length - 1 });
      }
    }
    // eval through globalThis/window or optional call; Function constructor; vm.
    for (const m of line.matchAll(/(?:\b(?:globalThis|window|global|self)\s*\.\s*eval|(?<![\w$.])eval\s*\?\.)\s*\(/g)) {
      found.push({ fn: "eval", open: (m.index ?? 0) + m[0].length - 1 });
    }
    for (const m of line.matchAll(/\bnew\s+Function\s*\(|(?<![\w$.])Function\s*\(/g)) {
      found.push({ fn: "Function", open: (m.index ?? 0) + m[0].length - 1 });
    }
    for (const m of line.matchAll(/(?:\bnew\s+)?([\w$]+)\s*\.\s*(runInNewContext|runInThisContext|runInContext|compileFunction|Script)\s*\(/g)) {
      if (context.vmNamespaces.has(m[1])) found.push({ fn: "vm", open: (m.index ?? 0) + m[0].length - 1 });
    }

    for (const { fn, open } of found) {
      const callArgs = splitTopLevel(window, open);
      const verdict: ProcessCallVerdict | null =
        fn === "eval"
          ? { severity: "critical", description: "eval() runs a string as code" }
          : fn === "Function" || fn === "vm"
            ? callArgs.length > 0 && callArgs.every(isLiteralString)
              ? null
              : { severity: "critical", description: `${fn === "vm" ? "vm" : "Function"}() compiles a string that is not a literal` }
            : classifyProcessCall(fn, callArgs);
      if (!verdict) {
        this.passedChecks++;
        continue;
      }
      if (verdict.severity === "critical") {
        const lineNum = index + 1;
        const active = this.waivers
          .get(file)
          ?.find((w) => lineNum >= w.range[0] && lineNum <= w.range[1]);
        if (active) {
          active.used = true;
          this.suppressed.push({
            file,
            line: lineNum,
            category: "Command Injection",
            description: verdict.description,
            reason: `${active.waiver.symbol}: ${active.waiver.reason}. No request path: ${active.waiver.evidence}`,
          });
          continue;
        }
      }
      this.violations.push({
        file,
        line: index + 1,
        severity: verdict.severity,
        category: verdict.severity === "critical" ? "Command Injection" : "Command Execution",
        description: verdict.description,
        recommendation:
          verdict.severity === "critical"
            ? "Pass an argument array without a shell (execFile/spawn), or make the command a literal"
            : "Make the executable a literal or check it against a fixed allowlist",
      });
      this.failedChecks++;
    }
  }

  private checkPathTraversal(
    line: string,
    lineNum: number,
    file: string,
  ): void {
    // Check for path operations without validation
    if (/path\.join\(|fs\.(readFile|writeFile|unlink)/.test(line)) {
      if (
        !line.includes("validate") &&
        !line.includes(".claude") &&
        line.includes("..")
      ) {
        this.violations.push({
          file,
          line: lineNum,
          severity: "high",
          category: "Path Traversal",
          description: "Potential path traversal vulnerability",
          recommendation: "Validate paths and restrict to allowed directories",
        });
        this.failedChecks++;
      }
    }
  }

  private checkInsecureCrypto(
    line: string,
    lineNum: number,
    file: string,
  ): void {
    // Check for weak cryptographic algorithms
    const weakAlgorithms = ["md5", "sha1", "des", "rc4"];

    for (const algo of weakAlgorithms) {
      if (new RegExp(`['"]${algo}['"]`, "i").test(line)) {
        this.violations.push({
          file,
          line: lineNum,
          severity: "medium",
          category: "Weak Cryptography",
          description: `Weak cryptographic algorithm detected: ${algo}`,
          recommendation:
            "Use modern algorithms like SHA-256, SHA-512, or bcrypt",
        });
        this.failedChecks++;
      }
    }
  }

  private checkInputValidation(content: string, file: string): void {
    // Check for Zod schema validation
    const hasZodValidation = /import.*zod|from\s+['"]zod['"]/.test(content);
    const hasUserInput = /input|req\.|query|params|body/.test(content);

    if (hasUserInput && !hasZodValidation && !content.includes("validate")) {
      this.violations.push({
        file,
        line: 0,
        severity: "medium",
        category: "Input Validation",
        description: "File handles user input without explicit validation",
        recommendation: "Add Zod schema validation for all user inputs",
      });
      this.failedChecks++;
    }
  }

  private checkAccessControl(content: string, file: string): void {
    // Check for access control in API routes
    if (
      file.includes("route") ||
      file.includes("api") ||
      file.includes("handler")
    ) {
      const hasAuthCheck = /auth|authenticate|authorize|permission|role/.test(
        content,
      );

      if (!hasAuthCheck) {
        this.violations.push({
          file,
          line: 0,
          severity: "high",
          category: "Access Control",
          description: "API endpoint may lack authentication/authorization",
          recommendation:
            "Implement proper authentication and authorization checks",
        });
        this.failedChecks++;
      }
    }
  }

  private generateReport(totalFiles: number): SecurityAuditReport {
    const violationsBySeverity = {
      critical: this.violations.filter((v) => v.severity === "critical").length,
      high: this.violations.filter((v) => v.severity === "high").length,
      medium: this.violations.filter((v) => v.severity === "medium").length,
      low: this.violations.filter((v) => v.severity === "low").length,
    };

    // Calculate overall score (0-100)
    const totalChecks = this.passedChecks + this.failedChecks;
    const baseScore =
      totalChecks > 0 ? (this.passedChecks / totalChecks) * 100 : 0;

    // Deduct points for violations
    const criticalPenalty = violationsBySeverity.critical * 10;
    const highPenalty = violationsBySeverity.high * 5;
    const mediumPenalty = violationsBySeverity.medium * 2;
    const lowPenalty = violationsBySeverity.low * 1;

    const overallScore = Math.max(
      0,
      baseScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty,
    );

    const recommendations: string[] = [];

    if (violationsBySeverity.critical > 0) {
      recommendations.push(
        "CRITICAL: Address all hardcoded secrets and command injection vulnerabilities immediately",
      );
    }
    if (violationsBySeverity.high > 0) {
      recommendations.push(
        "HIGH: Implement input validation and XSS prevention measures",
      );
    }
    if (violationsBySeverity.medium > 0) {
      recommendations.push(
        "MEDIUM: Replace weak cryptographic algorithms and improve access controls",
      );
    }

    if (overallScore >= 90) {
      recommendations.push(
        "Excellent security posture. Continue monitoring and testing.",
      );
    } else if (overallScore >= 70) {
      recommendations.push(
        "Good security foundation. Address high and critical issues.",
      );
    } else if (overallScore >= 50) {
      recommendations.push(
        "Security needs improvement. Prioritize critical vulnerabilities.",
      );
    } else {
      recommendations.push(
        "URGENT: Significant security gaps detected. Immediate action required.",
      );
    }

    return {
      timestamp: new Date(),
      summary: {
        totalFiles,
        filesScanned: totalFiles,
        violations: violationsBySeverity,
        passedChecks: this.passedChecks,
        failedChecks: this.failedChecks,
        overallScore: Math.round(overallScore),
      },
      violations: this.violations.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      suppressed: this.suppressed,
      unusedWaivers: [],
      recommendations,
      complianceStatus: {
        inputValidation:
          this.violations.filter((v) => v.category === "Input Validation")
            .length === 0,
        xssPrevention:
          this.violations.filter((v) => v.category === "XSS Vulnerability")
            .length === 0,
        commandInjectionPrevention:
          this.violations.filter((v) => v.category === "Command Injection")
            .length === 0,
        pathTraversalPrevention:
          this.violations.filter((v) => v.category === "Path Traversal")
            .length === 0,
        secretManagement:
          this.violations.filter((v) => v.category === "Hardcoded Secrets")
            .length === 0,
        accessControl:
          this.violations.filter((v) => v.category === "Access Control")
            .length === 0,
      },
    };
  }

  private async saveReport(
    report: SecurityAuditReport,
    projectPath: string,
  ): Promise<void> {
    const reportsDir = path.join(projectPath, ".claude", "reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, "security-audit.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also save markdown version
    const markdown = this.reportToMarkdown(report);
    const markdownPath = path.join(reportsDir, "security-audit.md");
    await fs.writeFile(markdownPath, markdown);

    console.log(`Security audit report saved to ${reportPath}`);
  }

  private reportToMarkdown(report: SecurityAuditReport): string {
    const lines: string[] = [];

    lines.push("# Security Audit Report");
    lines.push("");
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push("");

    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Files Scanned: ${report.summary.filesScanned}`);
    lines.push(
      `- Overall Security Score: **${report.summary.overallScore}/100**`,
    );
    lines.push(`- Passed Checks: ${report.summary.passedChecks}`);
    lines.push(`- Failed Checks: ${report.summary.failedChecks}`);
    lines.push("");

    // Violations by Severity
    lines.push("### Violations by Severity");
    lines.push("");
    lines.push(`- Critical: ${report.summary.violations.critical}`);
    lines.push(`- High: ${report.summary.violations.high}`);
    lines.push(`- Medium: ${report.summary.violations.medium}`);
    lines.push(`- Low: ${report.summary.violations.low}`);
    lines.push("");

    // Compliance Status
    lines.push("## Compliance Status");
    lines.push("");
    Object.entries(report.complianceStatus).forEach(([check, passed]) => {
      const icon = passed ? "✅" : "❌";
      lines.push(`${icon} ${check.replace(/([A-Z])/g, " $1").trim()}`);
    });
    lines.push("");

    // Recommendations
    lines.push("## Recommendations");
    lines.push("");
    report.recommendations.forEach((rec) => {
      lines.push(`- ${rec}`);
    });
    lines.push("");

    // Detailed Violations
    if (report.violations.length > 0) {
      lines.push("## Detailed Violations");
      lines.push("");

      const violationsByCategory = report.violations.reduce(
        (acc, v) => {
          if (!acc[v.category]) acc[v.category] = [];
          acc[v.category].push(v);
          return acc;
        },
        {} as Record<string, SecurityViolation[]>,
      );

      Object.entries(violationsByCategory).forEach(([category, violations]) => {
        lines.push(`### ${category}`);
        lines.push("");

        violations.forEach((v) => {
          lines.push(`**${v.severity.toUpperCase()}** - ${v.file}:${v.line}`);
          lines.push(`- Description: ${v.description}`);
          lines.push(`- Recommendation: ${v.recommendation}`);
          lines.push("");
        });
      });
    }

    return lines.join("\n");
  }
}

/**
 * Enforcement state — FPL ruling, NEXUS 621005a (DIRECTIVE-NXTG-20260718-17).
 *
 * This scanner spent an unknown period exiting 0 having scanned nothing (glob's
 * callback API was removed in v9; the wrapping promise never settled). With it
 * actually running, its output turned out to be uncalibrated: 606 of 626 "high"
 * were SQL-injection warnings in a project with NO SQL dependency — one flagged
 * line is `updatedAt?: string;` — and every `spawn()` is "critical" regardless
 * of form, though none use `shell` and all pass an argument array, which is the
 * construction that prevents injection.
 *
 * So it runs REPORT-ONLY until calibrated, and says so loudly on every run — a
 * silent green is what got us here. The report-only window is not open-ended:
 * it expires by VERSION, so the gate returns to blocking on its own even if
 * nobody does the calibration work.
 */

/**
 * Calibrated by DIRECTIVE-NXTG-20260718-17 (forge-pm ruling 65402e5e): the
 * command-injection, SQL and self-scan defects from the 2026-10-07 triage are
 * fixed, so the scanner blocks on CRITICAL at every version.
 */
export const SECURITY_SCAN_CALIBRATED = true;

/** Blocking resumes at this version regardless of calibration state. */
export const SECURITY_SCAN_BLOCKING_FROM = "3.5.0";

/** Numeric compare of major.minor.patch; non-semver sorts low. */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    (v.split("-")[0].split(".").map((n) => Number.parseInt(n, 10)) ?? []).map(
      (n) => (Number.isNaN(n) ? 0 : n),
    );
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface ScanEnforcement {
  blocking: boolean;
  reason: "calibrated" | "expired" | "report-only";
}

/**
 * Whether the scanner blocks the build.
 *
 * Pure, so the expiry is a tested behavior rather than a promise in a comment.
 */
export function resolveScanEnforcement(opts: {
  version: string;
  calibrated?: boolean;
  blockingFrom?: string;
}): ScanEnforcement {
  const blockingFrom = opts.blockingFrom ?? SECURITY_SCAN_BLOCKING_FROM;

  if (opts.calibrated ?? SECURITY_SCAN_CALIBRATED) {
    return { blocking: true, reason: "calibrated" };
  }
  if (compareVersions(opts.version, blockingFrom) >= 0) {
    return { blocking: true, reason: "expired" };
  }
  return { blocking: false, reason: "report-only" };
}

/** The loud banner. A report-only gate that whispers is a silent green. */
export function formatReportOnlyBanner(
  findings: number,
  version: string,
): string {
  const bar = "=".repeat(72);
  return [
    "",
    bar,
    `SECURITY SCAN: REPORT-ONLY (uncalibrated) — ${findings} findings, see DIRECTIVE-NXTG-20260718-17`,
    "",
    "  These findings are NOT a security posture. The rule classes do not match",
    "  this project's dependency surface and have never been triaged.",
    `  Currently v${version}. Returns to BLOCKING at v${SECURITY_SCAN_BLOCKING_FROM},`,
    "  or sooner when calibration lands — whichever comes first.",
    bar,
    "",
  ].join("\n");
}

// CLI usage
const _isMain = process.argv[1]?.endsWith('security-audit.ts') || process.argv[1]?.endsWith('security-audit.js');
if (_isMain) {
  const auditor = new SecurityAuditor();
  auditor
    .runAudit()
    .then(async (report) => {
      console.log("\n=== Security Audit Complete ===");
      console.log(`Overall Score: ${report.summary.overallScore}/100`);
      console.log(`Critical Issues: ${report.summary.violations.critical}`);
      console.log(`High Issues: ${report.summary.violations.high}`);
      console.log(`Medium Issues: ${report.summary.violations.medium}`);
      console.log(`Low Issues: ${report.summary.violations.low}`);

      // Single version surface (the app-version pattern ratified for -12):
      // read the version, never re-hardcode it.
      const { appVersion } = await import("../../services/app-version");
      const enforcement = resolveScanEnforcement({ version: appVersion });
      const total =
        report.summary.violations.critical +
        report.summary.violations.high +
        report.summary.violations.medium +
        report.summary.violations.low;

      // Waivers are printed on every run, so a waived finding is never silent.
      for (const s of report.suppressed) {
        console.log(`WAIVED ${s.category} ${s.file}:${s.line}: ${s.description} -- ${s.reason}`);
      }

      for (const w of report.unusedWaivers) {
        console.log(`UNUSED WAIVER ${w}: it covers no finding; remove it`);
      }

      if (!enforcement.blocking) {
        console.log(formatReportOnlyBanner(total, appVersion));
        return; // exit 0 — reported loudly, does not block
      }

      if (report.unusedWaivers.length > 0) {
        console.error(`\n⚠️  ${report.unusedWaivers.length} unused waiver(s) (scanner BLOCKING — ${enforcement.reason})`);
        process.exit(1);
      }

      if (report.summary.violations.critical > 0) {
        console.error(
          `\n⚠️  CRITICAL security issues detected! (scanner BLOCKING — ${enforcement.reason})`,
        );
        process.exit(1);
      }
      console.log(
        `SECURITY SCAN: BLOCKING (${enforcement.reason}) — 0 critical, ${report.suppressed.length} waived`,
      );
    })
    .catch((error) => {
      console.error("Audit failed:", error);
      process.exit(1);
    });
}

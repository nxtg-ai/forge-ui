// @vitest-environment node
/**
 * Command-injection calibration. NEXUS: DIRECTIVE-NXTG-20260718-17, forge-pm
 * rulings 65402e5e and al 00:21Z.
 *
 * Calibration removed the false positives (literal commands, argument arrays,
 * RegExp.exec, method names, the scanner's own file). These tests hold the
 * other half: every shape that lets request input reach a shell is still
 * CRITICAL (red control ii), and a waiver covers only its own symbol.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const os = await vi.importActual<typeof import("node:os")>("node:os");
const path = await vi.importActual<typeof import("node:path")>("node:path");

const {
  SecurityAuditor,
  classifyProcessCall,
  isLiteralString,
  processCallContext,
  splitTopLevel,
  symbolLineRange,
} = await import("../reports/security-audit");

/** Lines that MUST be CRITICAL. Each puts request input where a shell parses it. */
const INJECTIONS = [
  'import { exec, execSync, spawn } from "child_process";',
  'import * as cp from "node:child_process";',
  'import { exec as sh } from "child_process";',
  'import { promisify } from "util";',
  "const run = promisify(exec);",
  "export function handler(req: any) {",
  "  exec(`ls ${req.query.dir}`);", // INJ template
  '  execSync("cat " + req.body.file);', // INJ concatenation
  '  spawn("sh", ["-c", req.body.cmd]);', // INJ shell -c
  "  spawn(req.body.cmd, { shell: true });", // INJ shell option
  "  execSync(", // INJ argument on the next line
  "    `git log ${req.query.ref}`,",
  "  );",
  "  run(req.body.cmd);", // INJ promisified alias
  "  cp.exec(req.body.cmd);", // INJ namespace import
  '  require("child_process").execSync(req.body.cmd);', // INJ inline require
  "  sh(req.body.x);", // INJ renamed import
  "  eval(req.body.code);", // INJ eval
  "}",
];

/** Lines that must NOT be CRITICAL: the false-positive classes from the triage. */
const CLEAN = [
  'import { execSync, spawn } from "child_process";',
  "export class Worker {",
  "  async spawn(): Promise<void> {", // method definition
  "    return;",
  "  }",
  "  run(s: string, req: any) {",
  '    execSync("git status --short 2>&1");', // literal command
  '    spawn("forge", ["mcp", "--project", req.body.root]);', // argument array, no shell
  "    /x/.exec(s);", // RegExp.exec
  "    this.spawn();", // method call
  "    // exec(req.body.cmd) in a comment is not a call",
  "  }",
  "}",
];

let root: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "forge-scan-calibration-"));
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "inject.ts"), INJECTIONS.join("\n"));
  fs.writeFileSync(path.join(root, "src", "clean.ts"), CLEAN.join("\n"));
  fs.writeFileSync(
    path.join(root, "src", "sql.ts"),
    ['const q = "SELECT * FROM users WHERE id = " + id;', "interface Row { updatedAt?: string; }"].join("\n"),
  );
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function criticalLines(report: { violations: Array<{ file: string; line: number; severity: string }> }, file: string) {
  return report.violations
    .filter((v) => v.file === file && v.severity === "critical")
    .map((v) => v.line)
    .sort((a, b) => a - b);
}

describe("command-injection rule (red control ii)", () => {
  it("still flags every shell shape built from request input as CRITICAL", async () => {
    const report = await new SecurityAuditor().runAudit(root, { waivers: [] });
    const expected = INJECTIONS.flatMap((line, i) => (line.includes("req.") && !line.startsWith("    `") ? [i + 1] : []));
    // The multi-line call is reported on its opening line.
    expected.push(INJECTIONS.indexOf("  execSync(") + 1);
    expect(criticalLines(report, "inject.ts")).toEqual([...new Set(expected)].sort((a, b) => a - b));
    expect(expected.length).toBe(10);
  });

  it("does not flag literal commands, argument arrays, RegExp.exec, method names or comments", async () => {
    const report = await new SecurityAuditor().runAudit(root, { waivers: [] });
    expect(criticalLines(report, "clean.ts")).toEqual([]);
  });

  it("flags a real SQL concatenation and not a field named updatedAt", async () => {
    const report = await new SecurityAuditor().runAudit(root, { waivers: [] });
    const sql = report.violations.filter((v) => v.file === "sql.ts" && v.category === "SQL Injection");
    expect(sql.map((v) => v.line)).toEqual([1]);
  });
});

describe("classifyProcessCall", () => {
  it("clears a literal exec and flags any other exec argument", () => {
    expect(classifyProcessCall("execSync", ['"npm --version"'])).toBeNull();
    expect(classifyProcessCall("exec", ["`git status`"])).toBeNull();
    expect(classifyProcessCall("exec", ["`ls ${dir}`"])?.severity).toBe("critical");
    expect(classifyProcessCall("exec", ["cmd"])?.severity).toBe("critical");
    expect(classifyProcessCall("exec", [])?.severity).toBe("critical");
  });

  it("clears an argument array, reports a non-literal executable as HIGH, and flags shell forms", () => {
    expect(classifyProcessCall("spawn", ['"git"', '["log", ref]'])).toBeNull();
    expect(classifyProcessCall("spawn", ["bin", "[]"])?.severity).toBe("high");
    expect(classifyProcessCall("spawn", ['"bash"', '["-c", script]'])?.severity).toBe("critical");
    expect(classifyProcessCall("spawn", ['"bash"', '["-c", "echo ok"]'])).toBeNull();
    expect(classifyProcessCall("execFile", ['"git"', "[x]", "{ shell: true }"])?.severity).toBe("critical");
    expect(classifyProcessCall("spawn", ['"git"', '["status"]', "{ shell: false }"])).toBeNull();
  });

  it("parses arguments across quotes, templates and nesting", () => {
    expect(splitTopLevel('("a,b", `c${d(1, 2)}`, [e, f])', 0)).toEqual(['"a,b"', "`c${d(1, 2)}`", "[e, f]"]);
    expect(isLiteralString('"a\\"b"')).toBe(true);
    expect(isLiteralString("`a${b}`")).toBe(false);
    expect(isLiteralString('"a" + b')).toBe(false);
  });

  it("knows which local names launch a process", () => {
    const ctx = processCallContext(
      'import * as cp from "child_process";\nimport { exec as sh } from "node:child_process";\nconst run = promisify(execFile);',
    );
    expect(ctx.namespaces.has("cp")).toBe(true);
    expect(ctx.locals.get("sh")).toBe("exec");
    expect(ctx.locals.get("run")).toBe("execFile");
  });
});

describe("waivers are keyed to one symbol", () => {
  const two = [
    'import { exec } from "child_process";',
    "export class Runner {",
    "  runA(c: string) {",
    "    exec(c);",
    "  }",
    "  runB(c: string) {",
    "    exec(c);",
    "  }",
    "}",
  ];
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-scan-waiver-"));
    fs.mkdirSync(path.join(dir, "src"));
    fs.writeFileSync(path.join(dir, "src", "runner.ts"), two.join("\n"));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const waiver = {
    file: "runner.ts",
    symbol: "Runner.runA",
    reason: "fixture: runs a shell command by contract",
    evidence: "fixture: nothing calls it from a request",
  };

  it("waives the finding inside its symbol and not the one in a sibling", async () => {
    const report = await new SecurityAuditor().runAudit(dir, { waivers: [waiver] });
    expect(report.suppressed.map((s) => s.line)).toEqual([4]);
    expect(report.suppressed[0].reason).toContain("No request path:");
    expect(criticalLines(report, "runner.ts")).toEqual([7]);
    expect(report.unusedWaivers).toEqual([]);
  });

  it("reports a waiver that covers nothing", async () => {
    const report = await new SecurityAuditor().runAudit(root, {
      waivers: [],
    });
    expect(report.unusedWaivers).toEqual([]);
    const stale = await new SecurityAuditor().runAudit(dir, {
      waivers: [waiver, { ...waiver, symbol: "Runner.runB" }, { ...waiver, file: "runner.ts", symbol: "Runner.runA" }],
    });
    expect(stale.unusedWaivers).toEqual(["runner.ts Runner.runA"]);
  });

  it("refuses a waiver without a reason or evidence, or with no such symbol", async () => {
    await expect(new SecurityAuditor().runAudit(dir, { waivers: [{ ...waiver, reason: "ok" }] })).rejects.toThrow(
      /reason and evidence/,
    );
    await expect(new SecurityAuditor().runAudit(dir, { waivers: [{ ...waiver, evidence: "" }] })).rejects.toThrow(
      /reason and evidence/,
    );
    await expect(
      new SecurityAuditor().runAudit(dir, { waivers: [{ ...waiver, symbol: "Runner.runC" }] }),
    ).rejects.toThrow(/no single definition/);
  });

  it("finds a symbol's body by brace matching", () => {
    expect(symbolLineRange(two, "runA")).toEqual([3, 5]);
    expect(symbolLineRange(two, "runB")).toEqual([6, 8]);
    expect(symbolLineRange(two, "runC")).toBeNull();
  });
});

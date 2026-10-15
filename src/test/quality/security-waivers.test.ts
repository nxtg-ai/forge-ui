// @vitest-environment node
/**
 * Every COMMAND_INJECTION_WAIVERS entry rests on "no request reaches this
 * symbol". These guards fail the moment that stops being true, so a waiver
 * cannot quietly cover a new caller. NEXUS: DIRECTIVE-NXTG-20260718-17,
 * forge-pm ruling al 00:21Z item 3.
 *
 * Reachability is the import graph from every production file under
 * src/server (static, dynamic and re-export imports, `.js` specifiers, index
 * barrels and every tsconfig path alias), not a text search, so an indirect
 * caller, a barrel or an `import()` still counts. A computed specifier cannot
 * be followed, so a reachable module may not use one.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const path = await vi.importActual<typeof import("node:path")>("node:path");
const ts = (await import("typescript")).default;

const { COMMAND_INJECTION_WAIVERS, symbolLineRange } = await import("../reports/security-audit");

const SRC = path.resolve(__dirname, "../..");
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/");
const read = (f: string) => fs.readFileSync(f, "utf-8");

/** Production sources: no tests, no test infrastructure (src/test), no declaration files. */
function productionFiles(dir = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const skip = e.name === "__tests__" || e.name === "node_modules" || full === path.join(SRC, "test");
      return skip ? [] : productionFiles(full);
    }
    if (!/\.(ts|tsx)$/.test(e.name) || /\.(test|spec)\.tsx?$/.test(e.name) || e.name.endsWith(".d.ts")) return [];
    return [full];
  });
}

/** tsconfig.json `paths`: "@core/*" -> "<root>/src/core/". */
const ALIASES: Array<[string, string]> = (() => {
  const root = path.resolve(SRC, "..");
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), (f) => fs.readFileSync(f, "utf-8")).config;
  const paths = (config?.compilerOptions?.paths ?? {}) as Record<string, string[]>;
  return Object.entries(paths).map(([alias, [target]]) => [
    alias.replace(/\*$/, ""),
    path.resolve(root, (config.compilerOptions.baseUrl as string | undefined) ?? ".", target.replace(/\*$/, "")),
  ]);
})();

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  const alias = ALIASES.find(([prefix]) => spec.startsWith(prefix));
  if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else if (alias) base = path.join(alias[1], spec.slice(alias[0].length));
  else return null;
  base = base.replace(/\.(js|jsx|ts|tsx|mjs|cjs)$/, "");
  for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const files = productionFiles();
const imports = new Map<string, string[]>(
  files.map((f) => [
    f,
    ts
      .preProcessFile(read(f), true, true)
      .importedFiles.map((i) => resolveImport(f, i.fileName))
      .filter((x): x is string => x !== null),
  ]),
);

/** Modules a server file can load. */
const reachable = (() => {
  const seen = new Set<string>();
  const stack = files.filter((f) => rel(f).startsWith("server/"));
  while (stack.length > 0) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    stack.push(...(imports.get(f) ?? []));
  }
  return seen;
})();
const isReachable = (r: string) => reachable.has(path.join(SRC, r));

/** Comments removed. */
const noComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

/** Code only: comments and string/template literal text removed. */
function code(text: string): string {
  return noComments(text).replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
}

const GUARDED = [
  "services/command-service.ts CommandService.executeBlocking",
  "services/command-service.ts CommandService.executeStreaming",
  "adapters/claude-code.ts ClaudeCodeAdapter.executeShell",
  "adapters/mock.ts MockAdapter.executeShell",
  "core/backends/wsl-backend.ts WSLBackend.execute",
  "adapters/backend.ts whichSync",
];

describe("command-injection waivers stay unreachable", () => {
  it("has a guard below for every waiver, and no waiver without one", () => {
    expect(COMMAND_INJECTION_WAIVERS.map((w) => `${w.file} ${w.symbol}`).sort()).toEqual([...GUARDED].sort());
  });

  it("builds a real graph: the server reaches its own entry and the backend it does use", () => {
    expect(isReachable("server/api-server.ts")).toBe(true);
    expect(isReachable("core/backends/wsl-backend.ts")).toBe(true);
    expect(reachable.size).toBeGreaterThan(20);
    expect(ALIASES.map(([a]) => a)).toEqual(expect.arrayContaining(["@/", "@core/", "@utils/"]));
  });

  it("no module the server reaches loads a module by a computed specifier", () => {
    // import(`../adapters/${name}`) or require(name) cannot be followed by the graph.
    const computed = [...reachable]
      .filter((f) => {
        const text = noComments(read(f));
        return [...text.matchAll(/(?<![\w$.])(import|require)\s*\(\s*([^)\s][^)]*)\)/g)].some(
          ([, , arg]) => !/^(["'])[^"'`$]*\1$/.test(arg.trim()) && !/^`[^`$]*`$/.test(arg.trim()) && !/^\w+\s*:/.test(arg.trim()),
        );
      })
      .map(rel);
    expect(computed).toEqual([]);
  });

  it("CommandService and AutomationService, its only consumer, are not reachable from the server", () => {
    expect(isReachable("services/command-service.ts")).toBe(false);
    expect(isReachable("services/automation-service.ts")).toBe(false);
  });

  it("no module the server reaches can run an adapter's executeShell", () => {
    for (const m of ["adapters/claude-code.ts", "adapters/mock.ts", "adapters/factory.ts", "adapters/index.ts"]) {
      expect(isReachable(m), m).toBe(false);
    }
    const callers = [...reachable].filter((f) => /\bexecuteShell\b/.test(code(read(f)))).map(rel);
    expect(callers).toEqual([]);
  });

  it("nothing the server reaches calls a runspace backend's execute()", () => {
    // Holders: reachable modules that can get a backend object.
    const backendModules = ["core/backends/wsl-backend.ts", "core/runspace.ts"].map((r) => path.join(SRC, r));
    const holders = [...reachable]
      .filter((f) => !backendModules.includes(f))
      .filter((f) => (imports.get(f) ?? []).some((d) => backendModules.includes(d)))
      .map(rel)
      .sort();
    // A new holder must be reviewed here before it is accepted.
    expect(holders).toEqual(["core/runspace-manager.ts", "server/pty-bridge.ts"]);
    for (const h of holders) {
      // `execute` in any form: .execute(, ?.(, .bind, and ["execute"] (a string,
      // so that form is checked before string text is removed).
      const text = read(path.join(SRC, h));
      expect(/\bexecute\b/.test(code(text)), h).toBe(false);
      // No "execute" string except pty-bridge's terminal message type
      // (`case "execute":`), and no computed key built from strings
      // (b["exec" + "ute"], b[`${x}`]) that could spell it.
      expect(/(?<!case\s{1,4})["'`]execute["'`]/.test(noComments(text)), h).toBe(false);
      expect(/\[[^\]\n]*(?:["'`]\s*\+|\+\s*["'`]|`[^`\]]*\$\{)[^\]\n]*\]/.test(noComments(text)), h).toBe(false);
    }
    // RunspaceManager keeps its backends private and never hands one out.
    const manager = code(read(path.join(SRC, "core/runspace-manager.ts")));
    expect(manager).toMatch(/private\s+backends\s*=/);
    expect(manager).not.toMatch(/return\s+(?:this\.backends|backend)\b/);
  });

  it("whichSync returns before it runs anything for a name outside the fixed allowlist", () => {
    const text = read(path.join(SRC, "adapters/backend.ts")).replace(/\r/g, "");
    expect(text).toMatch(/const ALLOWED_CLI_COMMANDS = new Set\(\["codex", "gemini", "claude", "node"\]\);/);
    const lines = text.split("\n");
    const range = symbolLineRange(lines, "whichSync");
    expect(range).not.toBeNull();
    const body = lines.slice(range![0] - 1, range![1]).join("\n");
    // The guard clause itself returns null, and it precedes the only exec.
    const guard = /if \(!ALLOWED_CLI_COMMANDS\.has\(command\)\) \{\s*return null;\s*\}/.exec(body);
    expect(guard).not.toBeNull();
    expect(guard!.index).toBeLessThan(body.indexOf("execSync("));
    expect(body.match(/execSync\(/g)).toHaveLength(1);
  });
});

// @vitest-environment node
/**
 * Every COMMAND_INJECTION_WAIVERS entry rests on "no request reaches this
 * symbol". These guards fail the moment that stops being true, so a waiver
 * cannot quietly cover a new caller. NEXUS: DIRECTIVE-NXTG-20260718-17,
 * forge-pm ruling al 00:21Z item 3.
 */
import { describe, it, expect, vi } from "vitest";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const path = await vi.importActual<typeof import("node:path")>("node:path");

const { COMMAND_INJECTION_WAIVERS, symbolLineRange } = await import("../reports/security-audit");

const SRC = path.resolve(__dirname, "../..");

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

const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/");
const read = (f: string) => fs.readFileSync(f, "utf-8");

/** Strip comments so a mention in prose is not a call. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const GUARDED = [
  "services/command-service.ts CommandService.executeBlocking",
  "services/command-service.ts CommandService.executeStreaming",
  "adapters/claude-code.ts ClaudeCodeAdapter.executeShell",
  "adapters/mock.ts MockAdapter.executeShell",
  "core/backends/wsl-backend.ts WSLBackend.execute",
  "adapters/backend.ts whichSync",
];

describe("command-injection waivers stay unreachable", () => {
  const files = productionFiles();

  it("has a guard below for every waiver, and no waiver without one", () => {
    expect(COMMAND_INJECTION_WAIVERS.map((w) => `${w.file} ${w.symbol}`).sort()).toEqual([...GUARDED].sort());
  });

  it("CommandService (and AutomationService, its only consumer) is never instantiated", () => {
    const hits = files.filter((f) => /\bnew\s+(CommandService|AutomationService)\b/.test(code(read(f)))).map(rel);
    expect(hits).toEqual([]);
  });

  it("no server file reaches an adapter's executeShell", () => {
    const server = files.filter((f) => rel(f).startsWith("server/"));
    const hits = server
      .filter((f) => {
        const text = code(read(f));
        return /\bexecuteShell\b/.test(text) || /from\s+["'][^"']*adapters\/(claude-code|mock|factory)["']/.test(text);
      })
      .map(rel);
    expect(hits).toEqual([]);
  });

  it("nothing outside tests calls a runspace backend's execute()", () => {
    const holders = files.filter((f) => {
      const r = rel(f);
      if (r === "core/backends/wsl-backend.ts" || r === "core/runspace.ts") return false;
      return /\b(WSLBackend|IRunspaceBackend)\b/.test(code(read(f)));
    });
    expect(holders.map(rel).sort()).toEqual(["core/runspace-manager.ts", "server/pty-bridge.ts"]);
    const callers = holders.filter((f) => /\.execute\s*\(/.test(code(read(f)))).map(rel);
    expect(callers).toEqual([]);
  });

  it("whichSync checks the fixed allowlist before it runs anything", () => {
    const text = read(path.join(SRC, "adapters/backend.ts"));
    expect(text).toMatch(/const ALLOWED_CLI_COMMANDS = new Set\(\["codex", "gemini", "claude", "node"\]\);/);
    const lines = text.split("\n");
    const range = symbolLineRange(lines, "whichSync");
    expect(range).not.toBeNull();
    const body = lines.slice(range![0] - 1, range![1]).join("\n");
    const check = body.indexOf("if (!ALLOWED_CLI_COMMANDS.has(command))");
    const run = body.indexOf("execSync(");
    expect(check).toBeGreaterThanOrEqual(0);
    expect(check).toBeLessThan(run);
    expect(body.slice(check, run)).toMatch(/return null;/);
  });
});

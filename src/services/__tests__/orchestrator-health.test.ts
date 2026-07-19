// @vitest-environment node
/**
 * Orchestrator Health Bridge — integration tests
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-02 item 2 (health-score contract fix).
 *
 * These drive the REAL spawn + JSON-RPC path against a stub binary rather than
 * mocking child_process, per the project's "Real Logs, No Mocking" principle.
 * FORGE_BIN points the bridge at src/test/fixtures/forge-mcp-stub.mjs, which
 * speaks the same protocol the orchestrator does; FORGE_STUB_MODE selects the
 * response shape.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STUB = fileURLToPath(
  new URL("../../test/fixtures/forge-mcp-stub.mjs", import.meta.url),
);

// Unique per run so the spawn counter never carries across runs.
//
// randomUUID rather than mkdtempSync, for two reasons: this is a file-path
// PREFIX (tests derive siblings like `${COUNTER}-concurrent`), not a directory;
// and the global setup mocks `fs`, so calling mkdtempSync at module scope would
// reach the mock. randomUUID is collision-safe without touching the filesystem.
const COUNTER = join(tmpdir(), `forge-stub-count-${process.pid}-${randomUUID()}`);

// Cache keys, not directories on disk — the bridge memoizes per project root and
// never stats these. Unique per process so no fixed temp path remains, but
// STABLE within a test: the cache tests deliberately reuse one key to prove a hit.
const probe = (name: string) => join(tmpdir(), `forge-probe-${process.pid}-${name}`);

const originalBin = process.env.FORGE_BIN;
const originalMode = process.env.FORGE_STUB_MODE;

let getOrchestratorHealth: typeof import("../orchestrator-health").getOrchestratorHealth;
let clearOrchestratorHealthCache: typeof import("../orchestrator-health").clearOrchestratorHealthCache;
let awaitPendingReaps: typeof import("../orchestrator-health").awaitPendingReaps;

// The global test setup mocks `fs`; these assertions read files the stub really
// wrote, so they need the unmocked module.
let readFileSync: typeof import("node:fs").readFileSync;

beforeEach(async () => {
  ({ readFileSync } = await vi.importActual<typeof import("node:fs")>("node:fs"));
  ({ getOrchestratorHealth, clearOrchestratorHealthCache, awaitPendingReaps } =
    await import("../orchestrator-health"));
  clearOrchestratorHealthCache();
  process.env.FORGE_BIN = STUB;
});

afterAll(() => {
  if (originalBin === undefined) delete process.env.FORGE_BIN;
  else process.env.FORGE_BIN = originalBin;
  if (originalMode === undefined) delete process.env.FORGE_STUB_MODE;
  else process.env.FORGE_STUB_MODE = originalMode;
});

describe("getOrchestratorHealth", () => {
  it("returns the orchestrator's canonical score", async () => {
    process.env.FORGE_STUB_MODE = "ok";

    const health = await getOrchestratorHealth(probe("root"));

    expect(health).not.toBeNull();
    expect(health!.score).toBe(95);
    expect(health!.summary).toBe(
      "Health: 95/100 | 0 critical, 1 warnings, 7 info",
    );
    expect(health!.findings).toHaveLength(1);
    expect(health!.findings[0].category).toBe("documentation");
  });

  it("clamps a score above 100", async () => {
    process.env.FORGE_STUB_MODE = "high";
    expect((await getOrchestratorHealth(probe("root")))!.score).toBe(100);
  });

  it("clamps a negative score to 0", async () => {
    process.env.FORGE_STUB_MODE = "low";
    expect((await getOrchestratorHealth(probe("root")))!.score).toBe(0);
  });

  it("rounds a fractional score", async () => {
    process.env.FORGE_STUB_MODE = "fractional";
    expect((await getOrchestratorHealth(probe("root")))!.score).toBe(87);
  });

  it("returns null when the binary does not exist", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
    expect(await getOrchestratorHealth(probe("root"))).toBeNull();
  });

  it("returns null when the response omits health_score", async () => {
    process.env.FORGE_STUB_MODE = "no-score";
    expect(await getOrchestratorHealth(probe("root"))).toBeNull();
  });

  it("returns null on malformed (non-JSON) output", async () => {
    process.env.FORGE_STUB_MODE = "garbage";
    expect(await getOrchestratorHealth(probe("root"))).toBeNull();
  });

  it("returns null when the binary exits non-zero without output", async () => {
    process.env.FORGE_STUB_MODE = "exit";
    expect(await getOrchestratorHealth(probe("root"))).toBeNull();
  });

  it("memoizes within the cache window so repeated reads spawn once", async () => {
    // The stub reports its own invocation count as the score, so an unchanged
    // score across two calls proves the second was served from cache.
    process.env.FORGE_STUB_MODE = "counted";
    process.env.FORGE_STUB_COUNTER = COUNTER;

    const first = await getOrchestratorHealth(probe("cache"));
    const second = await getOrchestratorHealth(probe("cache"));

    expect(first!.score).toBe(1);
    expect(second!.score).toBe(1);
  });

  // Codex Wave-1 gate, [P1]: v3.3.1 measured concurrent_calls=20 spawned=20.
  // The memoization test above only covers SEQUENTIAL callers, which is why
  // the concurrent fan-out survived that release.
  it("coalesces 20 concurrent callers into a single spawn", async () => {
    process.env.FORGE_STUB_MODE = "counted";
    const counter = `${COUNTER}-concurrent`;
    process.env.FORGE_STUB_COUNTER = counter;

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        getOrchestratorHealth(probe("concurrent")),
      ),
    );

    // The stub appends one byte per invocation: the file length IS the spawn
    // count, measured the same way Codex measured it.
    expect(readFileSync(counter, "utf-8").length).toBe(1);
    // Every caller still gets the real answer, not a null.
    expect(results.map((r) => r!.score)).toEqual(Array(20).fill(1));
  });

  it("kills a child that ignores SIGTERM by escalating to SIGKILL", async () => {
    process.env.FORGE_STUB_MODE = "stubborn";
    const pidfile = `${COUNTER}-stubborn-pid`;
    process.env.FORGE_STUB_PIDFILE = pidfile;

    const health = await getOrchestratorHealth(probe("reap"));
    expect(health!.score).toBe(50);

    await awaitPendingReaps();

    // `close` fires only after Node reaps the child, so a resolved reap means
    // the pid is released — signal 0 probes existence without sending one.
    const pid = Number(readFileSync(pidfile, "utf-8"));
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
  });

  it("re-spawns after the cache is cleared", async () => {
    process.env.FORGE_STUB_MODE = "counted";
    process.env.FORGE_STUB_COUNTER = `${COUNTER}-cleared`;

    const first = await getOrchestratorHealth(probe("clear"));
    clearOrchestratorHealthCache();
    const second = await getOrchestratorHealth(probe("clear"));

    expect(first!.score).toBe(1);
    expect(second!.score).toBe(2);
  });
});

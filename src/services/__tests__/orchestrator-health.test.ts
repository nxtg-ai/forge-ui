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

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { fileURLToPath } from "node:url";

const STUB = fileURLToPath(
  new URL("../../test/fixtures/forge-mcp-stub.mjs", import.meta.url),
);

// Unique per run so the spawn counter never carries across runs.
const COUNTER = `/tmp/forge-stub-count-${process.pid}-${Date.now()}`;

const originalBin = process.env.FORGE_BIN;
const originalMode = process.env.FORGE_STUB_MODE;

let getOrchestratorHealth: typeof import("../orchestrator-health").getOrchestratorHealth;
let clearOrchestratorHealthCache: typeof import("../orchestrator-health").clearOrchestratorHealthCache;

beforeEach(async () => {
  ({ getOrchestratorHealth, clearOrchestratorHealthCache } = await import(
    "../orchestrator-health"
  ));
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

    const health = await getOrchestratorHealth("/tmp");

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
    expect((await getOrchestratorHealth("/tmp"))!.score).toBe(100);
  });

  it("clamps a negative score to 0", async () => {
    process.env.FORGE_STUB_MODE = "low";
    expect((await getOrchestratorHealth("/tmp"))!.score).toBe(0);
  });

  it("rounds a fractional score", async () => {
    process.env.FORGE_STUB_MODE = "fractional";
    expect((await getOrchestratorHealth("/tmp"))!.score).toBe(87);
  });

  it("returns null when the binary does not exist", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
    expect(await getOrchestratorHealth("/tmp")).toBeNull();
  });

  it("returns null when the response omits health_score", async () => {
    process.env.FORGE_STUB_MODE = "no-score";
    expect(await getOrchestratorHealth("/tmp")).toBeNull();
  });

  it("returns null on malformed (non-JSON) output", async () => {
    process.env.FORGE_STUB_MODE = "garbage";
    expect(await getOrchestratorHealth("/tmp")).toBeNull();
  });

  it("returns null when the binary exits non-zero without output", async () => {
    process.env.FORGE_STUB_MODE = "exit";
    expect(await getOrchestratorHealth("/tmp")).toBeNull();
  });

  it("memoizes within the cache window so repeated reads spawn once", async () => {
    // The stub reports its own invocation count as the score, so an unchanged
    // score across two calls proves the second was served from cache.
    process.env.FORGE_STUB_MODE = "counted";
    process.env.FORGE_STUB_COUNTER = COUNTER;

    const first = await getOrchestratorHealth("/tmp/cache-probe");
    const second = await getOrchestratorHealth("/tmp/cache-probe");

    expect(first!.score).toBe(1);
    expect(second!.score).toBe(1);
  });

  it("re-spawns after the cache is cleared", async () => {
    process.env.FORGE_STUB_MODE = "counted";
    process.env.FORGE_STUB_COUNTER = `${COUNTER}-cleared`;

    const first = await getOrchestratorHealth("/tmp/clear-probe");
    clearOrchestratorHealthCache();
    const second = await getOrchestratorHealth("/tmp/clear-probe");

    expect(first!.score).toBe(1);
    expect(second!.score).toBe(2);
  });
});

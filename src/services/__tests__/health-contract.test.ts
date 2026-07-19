// @vitest-environment node
/**
 * UI health contract — DIRECTIVE-NXTG-20260718-14, contracts/dx-journeys.md:170-172
 * ("UI health score matches /forge:status output for the same project").
 *
 * These are the forge-ui side of the contract that forge-plugin's L3 harness
 * (DIRECTIVE-13) asserts from the outside with a `UI_HEALTH_CONTRACT_DRIFT`
 * tripwire. They value-proof against the SERVED payload — the same object the
 * HTTP layer serializes — not rendered DOM, so a drift here fails locally
 * before it can fail the cross-repo harness.
 *
 * Precedence under test:
 *   orchestrator (canonical) > governance-mcp (canonical, plugin-only) > estimate
 *
 * Non-vacuity: every canonical case seeds a score no local computation would
 * produce (42, 87.4, 63), so a served value that matches the seed can only have
 * come from the MCP surface. The seeded-divergence control below makes that
 * explicit by asserting the served score TRACKS the seed when it changes.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORCH_STUB = fileURLToPath(
  new URL("../../test/fixtures/forge-mcp-stub.mjs", import.meta.url),
);
const GOV_STUB = fileURLToPath(
  new URL("../../test/fixtures/governance-mcp-stub.mjs", import.meta.url),
);

const originalBin = process.env.FORGE_BIN;
const originalMode = process.env.FORGE_STUB_MODE;
const originalGovMode = process.env.FORGE_GOV_STUB_MODE;
const originalGovScore = process.env.FORGE_GOV_STUB_SCORE;

// The global setup mocks `fs`; these tests build real fixture dirs on disk.
let fsp: typeof import("node:fs/promises");

let StatusService: typeof import("../status-service").StatusService;
let clearOrchestratorHealthCache: typeof import("../orchestrator-health").clearOrchestratorHealthCache;
let clearGovernanceHealthCache: typeof import("../governance-health").clearGovernanceHealthCache;

beforeEach(async () => {
  fsp = await vi.importActual<typeof import("node:fs/promises")>(
    "node:fs/promises",
  );
  ({ StatusService } = await import("../status-service"));
  ({ clearOrchestratorHealthCache } = await import("../orchestrator-health"));
  ({ clearGovernanceHealthCache } = await import("../governance-health"));
  clearOrchestratorHealthCache();
  clearGovernanceHealthCache();

  delete process.env.FORGE_BIN;
  delete process.env.FORGE_STUB_MODE;
  delete process.env.FORGE_GOV_STUB_MODE;
  delete process.env.FORGE_GOV_STUB_SCORE;
});

afterAll(() => {
  const restore = (k: string, v: string | undefined) =>
    v === undefined ? delete process.env[k] : (process.env[k] = v);
  restore("FORGE_BIN", originalBin);
  restore("FORGE_STUB_MODE", originalMode);
  restore("FORGE_GOV_STUB_MODE", originalGovMode);
  restore("FORGE_GOV_STUB_SCORE", originalGovScore);
});

/** A project dir, optionally carrying forge state and/or a governance server. */
async function makeFixture(opts: {
  projectName?: string;
  governance?: boolean;
}): Promise<string> {
  const dir = await fsp.mkdtemp(join(tmpdir(), "forge-health-contract-"));

  if (opts.projectName) {
    await fsp.mkdir(join(dir, ".forge"), { recursive: true });
    await fsp.writeFile(
      join(dir, ".forge", "state.json"),
      JSON.stringify({ project_name: opts.projectName }),
    );
  }

  if (opts.governance) {
    await fsp.writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "governance-mcp": { type: "stdio", command: "node", args: [GOV_STUB] },
        },
      }),
    );
  }

  return dir;
}

describe("health source precedence", () => {
  it("serves the orchestrator score verbatim when it is reachable", async () => {
    // 95 is the stub's canonical answer — not a value the local estimate
    // produces for an empty fixture.
    process.env.FORGE_BIN = ORCH_STUB;
    process.env.FORGE_STUB_MODE = "ok";

    const dir = await makeFixture({ projectName: "contract-fixture" });
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("orchestrator");
    expect(status.health.score).toBe(95);
    expect(status.health.summary).toContain("95/100");
  });

  it("rounds a fractional orchestrator score — the L3 tripwire contract", async () => {
    // forge_get_health returns a FLOAT (live: 90.0, 87.4). The harness asserts
    // ui.score === Math.round(health_score); if this ever stopped rounding,
    // UI_HEALTH_CONTRACT_DRIFT would fire on every fractional score.
    process.env.FORGE_BIN = ORCH_STUB;
    process.env.FORGE_STUB_MODE = "fractional"; // 87.4

    const dir = await makeFixture({});
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("orchestrator");
    expect(status.health.score).toBe(Math.round(87.4));
  });

  it("falls back to governance-mcp when the orchestrator is absent", async () => {
    // No FORGE_BIN → orchestrator tier unreachable. 63 is seeded, so a served
    // 63 can only have come from the governance server.
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
    process.env.FORGE_GOV_STUB_MODE = "ok";
    process.env.FORGE_GOV_STUB_SCORE = "63";

    const dir = await makeFixture({ governance: true });
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("governance");
    expect(status.health.score).toBe(63);
  });

  it("prefers the orchestrator when BOTH surfaces are reachable", async () => {
    process.env.FORGE_BIN = ORCH_STUB;
    process.env.FORGE_STUB_MODE = "ok"; // 95
    process.env.FORGE_GOV_STUB_MODE = "ok";
    process.env.FORGE_GOV_STUB_SCORE = "11"; // must NOT win

    const dir = await makeFixture({ governance: true });
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("orchestrator");
    expect(status.health.score).toBe(95);
  });

  it("labels a local estimate when no MCP surface answers", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";

    const dir = await makeFixture({}); // no .mcp.json → no governance tier
    const status = (await new StatusService(dir).getStatus()).unwrap();

    // The DoD's hard FAIL condition is rendering a local number as canonical.
    expect(status.health.source).toBe("estimate");
    expect(["orchestrator", "governance"]).not.toContain(status.health.source);
  });

  it("does not claim a canonical source when governance answers without a score", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
    process.env.FORGE_GOV_STUB_MODE = "no-score";

    const dir = await makeFixture({ governance: true });
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("estimate");
  });
});

describe("seeded divergence control", () => {
  it("tracks the seeded orchestrator score rather than recomputing", async () => {
    // The non-vacuity proof. Two different seeds must produce two different
    // served scores. A locally recomputed number would be identical across
    // both runs against the same fixture shape, and this fails.
    process.env.FORGE_BIN = ORCH_STUB;

    const dir = await makeFixture({});

    process.env.FORGE_STUB_MODE = "ok"; // 95
    clearOrchestratorHealthCache();
    const first = (await new StatusService(dir).getStatus()).unwrap();

    process.env.FORGE_STUB_MODE = "low"; // -8 → clamps to 0
    clearOrchestratorHealthCache();
    const second = (await new StatusService(dir).getStatus()).unwrap();

    expect(first.health.score).toBe(95);
    expect(second.health.score).toBe(0);
    expect(first.health.score).not.toBe(second.health.score);
  });

  it("tracks the seeded governance score rather than recomputing", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
    process.env.FORGE_GOV_STUB_MODE = "ok";

    const dir = await makeFixture({ governance: true });

    process.env.FORGE_GOV_STUB_SCORE = "41";
    clearGovernanceHealthCache();
    const first = (await new StatusService(dir).getStatus()).unwrap();

    process.env.FORGE_GOV_STUB_SCORE = "88";
    clearGovernanceHealthCache();
    const second = (await new StatusService(dir).getStatus()).unwrap();

    expect(first.health.score).toBe(41);
    expect(second.health.score).toBe(88);
  });
});

describe("project identity binding", () => {
  it("sources identity from .forge/state.json, not package.json", async () => {
    // The L3 harness binds its fixture by name. A bare `forge init` project has
    // no package.json at all, which used to report "unknown" and made identity
    // binding impossible.
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";

    const dir = await makeFixture({ projectName: "l3-fixture" });
    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.project.name).toBe("l3-fixture");
    expect(status.project.path).toBe(dir);
  });

  it("prefers canonical forge identity over a package.json name", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";

    const dir = await makeFixture({ projectName: "canonical-name" });
    await fsp.writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "package-json-name", version: "1.0.0" }),
    );

    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.project.name).toBe("canonical-name");
  });

  it("still falls back to package.json for a non-forge project", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";

    const dir = await makeFixture({});
    await fsp.writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "plain-node-project", version: "1.0.0" }),
    );

    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.project.name).toBe("plain-node-project");
  });
});

describe("project root resolution", () => {
  it("follows a resolver so status cannot drift from the active runspace", async () => {
    process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";

    const first = await makeFixture({ projectName: "project-one" });
    const second = await makeFixture({ projectName: "project-two" });

    let active = first;
    const service = new StatusService(() => active);

    expect((await service.getStatus()).unwrap().project.name).toBe("project-one");

    active = second;
    // Before this was a resolver, the service kept the root it was constructed
    // with and reported the previous project after a runspace switch.
    expect((await service.getStatus()).unwrap().project.name).toBe("project-two");
  });
});

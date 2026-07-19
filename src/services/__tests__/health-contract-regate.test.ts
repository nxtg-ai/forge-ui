// @vitest-environment node
/**
 * Codex re-gate 13 [P1] controls — DIRECTIVE-NXTG-20260718-14 follow-up.
 *
 * Both defects were mine, and both slipped past the tests I already had
 * because those tests probed the RIGHT behavior from the WRONG angle:
 *
 *   C1 — one status response could blend two runspaces. My existing test
 *        switched roots BETWEEN completed requests, which the snapshot fix and
 *        the broken version both pass. The failure needs a switch DURING a
 *        request, while the async probes are in flight.
 *
 *   C2 — the `.mcp.json` env map was dropped when spawning the governance
 *        server. My existing fixtures set those variables in the PARENT
 *        process, so the stub read them from inherited env and the omission
 *        was invisible. The control has to put the value ONLY in the spec.
 *
 * Both tests below were verified to fail against the un-cured code.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GOV_STUB = fileURLToPath(
  new URL("../../test/fixtures/governance-mcp-stub.mjs", import.meta.url),
);

const originalBin = process.env.FORGE_BIN;
const originalGovMode = process.env.FORGE_GOV_STUB_MODE;
const originalGovScore = process.env.FORGE_GOV_STUB_SCORE;

let fsp: typeof import("node:fs/promises");
let StatusService: typeof import("../status-service").StatusService;
let clearGovernanceHealthCache: typeof import("../governance-health").clearGovernanceHealthCache;
let clearOrchestratorHealthCache: typeof import("../orchestrator-health").clearOrchestratorHealthCache;

beforeEach(async () => {
  fsp = await vi.importActual<typeof import("node:fs/promises")>(
    "node:fs/promises",
  );
  ({ StatusService } = await import("../status-service"));
  ({ clearGovernanceHealthCache } = await import("../governance-health"));
  ({ clearOrchestratorHealthCache } = await import("../orchestrator-health"));
  clearGovernanceHealthCache();
  clearOrchestratorHealthCache();

  // No orchestrator: these exercise the governance tier and the root snapshot.
  process.env.FORGE_BIN = "/nonexistent/definitely-not-a-real-binary";
  delete process.env.FORGE_GOV_STUB_MODE;
  delete process.env.FORGE_GOV_STUB_SCORE;
});

afterAll(() => {
  const restore = (k: string, v: string | undefined) =>
    v === undefined ? delete process.env[k] : (process.env[k] = v);
  restore("FORGE_BIN", originalBin);
  restore("FORGE_GOV_STUB_MODE", originalGovMode);
  restore("FORGE_GOV_STUB_SCORE", originalGovScore);
});

describe("C1 — one response describes exactly one runspace", () => {
  it("does not blend two projects when the root switches MID-request", async () => {
    // Project A has a dist/ directory; project B does not. If any probe reads
    // the resolver after the switch, the response mixes A's build status with
    // B's identity — the exact payload Codex produced.
    const a = await fsp.mkdtemp(join(tmpdir(), "forge-regate-A-"));
    const b = await fsp.mkdtemp(join(tmpdir(), "forge-regate-B-"));

    await fsp.mkdir(join(a, ".forge"), { recursive: true });
    await fsp.writeFile(
      join(a, ".forge", "state.json"),
      JSON.stringify({ project_name: "project-a" }),
    );
    await fsp.mkdir(join(a, "dist"), { recursive: true });

    await fsp.mkdir(join(b, ".forge"), { recursive: true });
    await fsp.writeFile(
      join(b, ".forge", "state.json"),
      JSON.stringify({ project_name: "project-b" }),
    );

    let active = a;
    let reads = 0;
    const service = new StatusService(() => {
      reads += 1;
      // Flip immediately after the FIRST read, so every later read inside this
      // same request would see B if the root were not snapshotted.
      const current = active;
      if (reads >= 1) active = b;
      return current;
    });

    const status = (await service.getStatus()).unwrap();

    // Whichever project this response is about, it must be about ONE project.
    expect(status.project.name).toBe("project-a");
    expect(status.project.path).toBe(a);
    // The tell-tale from the verdict: identity from one project, build state
    // from the other.
    expect(status.build.status).not.toBe("unknown");
  });

  it("still follows the resolver BETWEEN requests", async () => {
    // The snapshot must not freeze the service — switching runspaces has to
    // keep working across requests.
    const a = await fsp.mkdtemp(join(tmpdir(), "forge-regate-A2-"));
    const b = await fsp.mkdtemp(join(tmpdir(), "forge-regate-B2-"));
    for (const [dir, name] of [
      [a, "between-a"],
      [b, "between-b"],
    ] as const) {
      await fsp.mkdir(join(dir, ".forge"), { recursive: true });
      await fsp.writeFile(
        join(dir, ".forge", "state.json"),
        JSON.stringify({ project_name: name }),
      );
    }

    let active = a;
    const service = new StatusService(() => active);

    expect((await service.getStatus()).unwrap().project.name).toBe("between-a");
    active = b;
    expect((await service.getStatus()).unwrap().project.name).toBe("between-b");
  });
});

describe("C2 — the .mcp.json env map is part of the contract", () => {
  it("applies env declared ONLY in the spec, not in the parent process", async () => {
    // The parent process deliberately does NOT carry FORGE_GOV_STUB_SCORE.
    // Against the un-cured bridge the stub falls back to its default (72);
    // only a bridge that actually executes the declared env yields 63.
    expect(process.env.FORGE_GOV_STUB_SCORE).toBeUndefined();

    const dir = await fsp.mkdtemp(join(tmpdir(), "forge-regate-env-"));
    await fsp.writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "governance-mcp": {
            type: "stdio",
            command: "node",
            args: [GOV_STUB],
            env: { FORGE_GOV_STUB_MODE: "ok", FORGE_GOV_STUB_SCORE: "63" },
          },
        },
      }),
    );

    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("governance");
    expect(status.health.score).toBe(63);
    expect(status.health.score).not.toBe(72); // the stub's default
  });

  it("expands ${VAR} in a spec env value from the inherited environment", async () => {
    process.env.FORGE_REGATE_SCORE_SOURCE = "51";

    const dir = await fsp.mkdtemp(join(tmpdir(), "forge-regate-expand-"));
    await fsp.writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "governance-mcp": {
            command: "node",
            args: [GOV_STUB],
            env: {
              FORGE_GOV_STUB_MODE: "ok",
              FORGE_GOV_STUB_SCORE: "${FORGE_REGATE_SCORE_SOURCE}",
            },
          },
        },
      }),
    );

    try {
      const status = (await new StatusService(dir).getStatus()).unwrap();
      expect(status.health.source).toBe("governance");
      expect(status.health.score).toBe(51);
    } finally {
      delete process.env.FORGE_REGATE_SCORE_SOURCE;
    }
  });

  it("honours a ${VAR:-default} fallback", async () => {
    const dir = await fsp.mkdtemp(join(tmpdir(), "forge-regate-default-"));
    await fsp.writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "governance-mcp": {
            command: "node",
            args: [GOV_STUB],
            env: {
              FORGE_GOV_STUB_MODE: "ok",
              FORGE_GOV_STUB_SCORE: "${FORGE_REGATE_ABSENT:-37}",
            },
          },
        },
      }),
    );

    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("governance");
    expect(status.health.score).toBe(37);
  });

  it("makes the tier unavailable when a placeholder cannot be resolved", async () => {
    // Running a half-configured server would answer with defaults and look
    // healthy — worse than not answering, because it is plausible.
    const dir = await fsp.mkdtemp(join(tmpdir(), "forge-regate-unresolved-"));
    await fsp.writeFile(
      join(dir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "governance-mcp": {
            command: "node",
            args: [GOV_STUB],
            env: { FORGE_GOV_STUB_SCORE: "${FORGE_REGATE_DEFINITELY_UNSET}" },
          },
        },
      }),
    );

    const status = (await new StatusService(dir).getStatus()).unwrap();

    expect(status.health.source).toBe("estimate");
  });
});

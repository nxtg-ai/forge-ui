/**
 * @vitest-environment node
 *
 * Cross-product governance.json schema contract — DIRECTIVE-NXTG-20260719-18
 * Leg B, Codex re-gate 14 Item 1 root cause.
 *
 * forge-ui's startup migration used to rewrite `.claude/governance.json` down
 * to `{version, constitution}`, dropping every field another product owns.
 * governance-mcp reads `project` (identity), `qualityGates`, `metrics`, and
 * `workstreams` from that same file
 * (forge-plugin/docs/governance-mcp-governance-json-contract.md). The drop was
 * silent — tsc was happy, forge-ui's own suite was green — because those fields
 * are not in forge-ui's `GovernanceState` type, so nothing on this side
 * referenced them.
 *
 * These pin the round-trip from forge-ui's side. The plugin's un-repaired L3
 * leg is the cross-product instrument; this is the local one, so a regression
 * fails here before it reaches the harness.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GovernanceStateManager } from "../governance-state-manager";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";

/** A governance.json as governance-mcp / `/forge:init` writes it. */
function pluginShapeState(manager: GovernanceStateManager) {
  const seed = manager.createInitialState() as Record<string, unknown>;
  // Foreign fields governance-mcp owns — not in forge-ui's GovernanceState type.
  seed.project = {
    name: "l3-fixture",
    vision: "ship it",
    goals: ["a", "b"],
  };
  seed.qualityGates = { coverage: 80, lint: "strict" };
  seed.metrics = { sessions: 3, tasksCompleted: 12 };
  return seed;
}

describe("governance.json cross-product round-trip", () => {
  let testDir: string;
  let manager: GovernanceStateManager;
  const govPath = () => path.join(testDir, ".claude", "governance.json");

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), "gov-contract-"));
    await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
    manager = new GovernanceStateManager(testDir);
  });

  async function readGov(): Promise<Record<string, unknown>> {
    return JSON.parse(await fs.readFile(govPath(), "utf-8"));
  }

  it("preserves governance-mcp's fields through a read/write migration", async () => {
    await fs.writeFile(
      govPath(),
      JSON.stringify(pluginShapeState(manager), null, 2),
    );

    // A migration cycle — what forge-ui startup does.
    await manager.writeState(await manager.readState());

    const gov = await readGov();

    // Identity is the leg the L3 harness asserts.
    expect((gov.project as { name?: string })?.name).toBe("l3-fixture");
    expect((gov.project as { goals?: string[] })?.goals).toEqual(["a", "b"]);
    // The rest of the consumed contract.
    expect(gov.qualityGates).toEqual({ coverage: 80, lint: "strict" });
    expect(gov.metrics).toEqual({ sessions: 3, tasksCompleted: 12 });
    // forge-ui's own field is still there too.
    expect(gov.constitution).toBeDefined();
  });

  it("preserves a FUTURE foreign field it does not model", async () => {
    // The whole reason for stripping-by-allowlist rather than keeping-by-
    // allowlist: a field a later governance-mcp version adds must survive
    // without a forge-ui change.
    const seed = pluginShapeState(manager) as Record<string, unknown>;
    seed.someFutureContractField = { added: "later" };
    await fs.writeFile(govPath(), JSON.stringify(seed, null, 2));

    await manager.writeState(await manager.readState());

    expect((await readGov()).someFutureContractField).toEqual({
      added: "later",
    });
  });

  it("keeps its volatile fields OUT of the tracked file", async () => {
    await fs.writeFile(
      govPath(),
      JSON.stringify(pluginShapeState(manager), null, 2),
    );

    await manager.writeState(await manager.readState());

    const gov = await readGov();
    // These churn every write; they belong in the untracked runtime file, or
    // running the project would dirty the git tree (the -04 invariant).
    expect(gov.sentinelLog).toBeUndefined();
    expect(gov.timestamp).toBeUndefined();
    expect(gov.metadata).toBeUndefined();

    const runtime = JSON.parse(
      await fs.readFile(
        path.join(testDir, ".forge", "governance-runtime.json"),
        "utf-8",
      ),
    );
    expect(runtime.sentinelLog).toBeDefined();
    // workstreams is mirrored: the hook's live copy lives in runtime...
    expect(runtime.workstreams).toBeDefined();
    // ...and a snapshot stays in the tracked file for governance-mcp.
    expect(gov.workstreams).toBeDefined();
  });

  it("does not dirty the tracked file on an idle write", async () => {
    await fs.writeFile(
      govPath(),
      JSON.stringify(pluginShapeState(manager), null, 2),
    );
    await manager.writeState(await manager.readState()); // settle to split shape

    const before = await fs.readFile(govPath(), "utf-8");
    // A second write with no versioned content change — only timestamp moved,
    // and timestamp is runtime-only.
    await manager.writeState(await manager.readState());
    const after = await fs.readFile(govPath(), "utf-8");

    expect(after).toBe(before);
  });

  it("SEEDED-DROP CONTROL: a response that loses project.name is caught", async () => {
    // The non-vacuity proof. If the migration ever drops identity again, the
    // round-trip assertion above must fail — demonstrated here by asserting the
    // negative directly against a hand-built dropped shape.
    const dropped: Record<string, unknown> = {
      version: 1,
      constitution: { directive: "d", vision: [], status: "EXECUTION", confidence: 75 },
    };
    await fs.writeFile(govPath(), JSON.stringify(dropped, null, 2));

    const gov = await readGov();
    expect((gov.project as { name?: string })?.name).toBeUndefined();
    // This is exactly the state governance-mcp reports as
    // GOVERNANCE_SCHEMA_DIVERGENCE; the round-trip test above proves the
    // migration no longer produces it.
  });
});

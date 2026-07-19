/**
 * @vitest-environment node
 *
 * Cross-product governance.json schema contract — DIRECTIVE-NXTG-20260719-18
 * Leg B, Codex re-gate 14 Item 1 root cause.
 *
 * The failure had TWO layers. splitState() dropped foreign fields on WRITE, and
 * before that readState() REJECTED governance-mcp's shape entirely (string
 * `version`, no `constitution`/`timestamp`/`metadata`), so forge-ui's startup
 * reseeded a fresh state — overwriting `project` (identity), emptying
 * `workstreams`, dropping `qualityGates`. The first cure for this shipped a test
 * built from a forge-ui-VALID state, which passed the reseed path entirely and
 * went green while the real thing stayed red.
 *
 * So these use governance-mcp's EXACT fixture shape (per
 * forge-plugin/docs/governance-mcp-governance-json-contract.md and the L3
 * harness), and assert the VALUES survive — a non-empty `workstreams` and a
 * populated `qualityGates`, not merely that the keys reappear.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GovernanceStateManager } from "../governance-state-manager";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";

/** governance-mcp's on-disk shape: string version, NO constitution, populated. */
function pluginShape() {
  return {
    version: "3.0.0",
    project: {
      name: "l3-fixture",
      vision: "A clean fixture for the L3 harness.",
      goals: ["ship", "test"],
    },
    workstreams: [
      { id: "w1", name: "core", status: "active", progress: 25, tasks: [] },
    ],
    qualityGates: { gate: 1 },
  };
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

  const writeGov = (obj: unknown) =>
    fs.writeFile(govPath(), JSON.stringify(obj, null, 2));
  const readGov = async (): Promise<Record<string, unknown>> =>
    JSON.parse(await fs.readFile(govPath(), "utf-8"));

  it("MIGRATES governance-mcp's shape on read instead of rejecting it", async () => {
    // The reseed trigger: readState() used to throw on this (string version, no
    // constitution), and the startup discarded it. It must now migrate.
    await writeGov(pluginShape());

    const state = await manager.readState();

    // Foreign values survive, WHOLE — goals ride along with name.
    expect(state.project).toEqual({
      name: "l3-fixture",
      vision: "A clean fixture for the L3 harness.",
      goals: ["ship", "test"],
    });
    // Non-empty, not restored-then-emptied.
    expect(state.workstreams).toHaveLength(1);
    expect(state.workstreams[0].id).toBe("w1");
    expect((state as unknown as { qualityGates: unknown }).qualityGates).toEqual({
      gate: 1,
    });
    // Version preserved as the plugin's string, never coerced.
    expect(state.version).toBe("3.0.0");
    // forge-ui filled its own missing field.
    expect(state.constitution).toBeDefined();
  });

  it("persists those values back to the tracked file through a write", async () => {
    await writeGov(pluginShape());

    // The full migration cycle: read (migrate) → write (splitState preserves).
    await manager.writeState(await manager.readState());

    const gov = await readGov();
    expect((gov.project as { name?: string }).name).toBe("l3-fixture");
    expect((gov.project as { goals?: string[] }).goals).toEqual(["ship", "test"]);
    expect(gov.workstreams).toHaveLength(1);
    expect((gov.workstreams as { id: string }[])[0].id).toBe("w1");
    expect(gov.qualityGates).toEqual({ gate: 1 });
    expect(gov.version).toBe("3.0.0");
  });

  it("preserves a FUTURE foreign field it does not model", async () => {
    const seed = { ...pluginShape(), someFutureContractField: { added: "later" } };
    await writeGov(seed);

    await manager.writeState(await manager.readState());

    expect((await readGov()).someFutureContractField).toEqual({ added: "later" });
  });

  it("keeps its volatile fields OUT of the tracked file", async () => {
    await writeGov(pluginShape());

    await manager.writeState(await manager.readState());

    const gov = await readGov();
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
    // workstreams is mirrored: runtime = the hook's live copy, tracked = the
    // governance-mcp snapshot. Both carry the value.
    expect(runtime.workstreams).toHaveLength(1);
    expect(gov.workstreams).toHaveLength(1);
  });

  it("does not dirty the tracked file on an idle re-write", async () => {
    await writeGov(pluginShape());
    await manager.writeState(await manager.readState()); // settle to split shape

    const before = await fs.readFile(govPath(), "utf-8");
    await manager.writeState(await manager.readState());
    const after = await fs.readFile(govPath(), "utf-8");

    expect(after).toBe(before);
  });

  describe("seed-vs-migrate boundary (guardrails)", () => {
    it("throws on a missing file so the startup seeds fresh", async () => {
      await expect(manager.readState()).rejects.toThrow(
        "Governance state not found",
      );
    });

    it("throws on an empty file", async () => {
      await fs.writeFile(govPath(), "   ");
      await expect(manager.readState()).rejects.toThrow();
    });

    it("throws on unrelated JSON rather than migrating junk", async () => {
      await writeGov({ random: "stuff", foo: 1 });
      await expect(manager.readState()).rejects.toThrow("Invalid state structure");
    });

    it("still loads a forge-ui-native state unchanged", async () => {
      const native = manager.createInitialState();
      await writeGov(native);
      const state = await manager.readState();
      expect(state.version).toBe(native.version); // number, untouched
      expect(state.constitution).toEqual(native.constitution);
    });
  });

  it("SEEDED-DROP CONTROL: the reseed shape has no identity", async () => {
    // The exact state the old reseed produced — proof of what we no longer
    // write. governance-mcp reads project?.name === undefined from this =
    // GOVERNANCE_SCHEMA_DIVERGENCE.
    const reseeded = manager.createInitialState() as Record<string, unknown>;
    expect((reseeded.project as { name?: string } | undefined)?.name).toBeUndefined();
  });
});

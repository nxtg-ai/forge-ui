// @vitest-environment node
/**
 * Hook library: sync_governance_progress must never destroy state.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-04 item 3 follow-up.
 *
 * The runtime/config split moved `workstreams` out of the tracked
 * `.claude/governance.json`, but this shell function kept editing that file.
 * jq then failed on the missing key, `$updated` came back empty, and
 * `echo "$updated" > file && mv` happily truncated the VERSIONED CONSTITUTION
 * to a single newline — while logging "Success". Observed live: a 326-byte
 * committed file reduced to 1 byte by a routine post-task hook fire.
 *
 * Two independent guarantees are pinned here:
 *   1. the function operates on the runtime file, never the constitution;
 *   2. a failing jq writes NOTHING, rather than truncating its target.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

vi.unmock("fs");
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } =
  await vi.importActual<typeof import("node:fs")>("node:fs");

const REAL_LIB = path.resolve(__dirname, "../../../.claude/hooks/lib.sh");

const CONSTITUTION = JSON.stringify(
  {
    version: 1,
    constitution: {
      directive: "test constitution — must survive",
      vision: ["v1"],
      status: "EXECUTION",
      confidence: 75,
    },
  },
  null,
  2,
);

const RUNTIME = JSON.stringify(
  {
    timestamp: "2026-07-18T00:00:00.000Z",
    workstreams: [
      {
        id: "ws-1",
        progress: 0,
        metrics: {},
        tasks: [{ status: "completed" }, { status: "pending" }],
      },
    ],
    sentinelLog: [],
    metadata: { sessionId: "t", projectPath: "/tmp", forgeVersion: "3.3.1", lastSync: "x" },
  },
  null,
  2,
);

describe("sync_governance_progress", () => {
  let root: string;
  let constitutionPath: string;
  let runtimePath: string;

  /** Run the function against the sandbox copy of the hook library. */
  const runSync = () =>
    execFileSync(
      "bash",
      [
        "-c",
        // `|| true` because the function correctly returns non-zero on the
        // refusal paths; we assert on its OUTPUT, not its exit status.
        `source "${path.join(root, ".claude/hooks/lib.sh")}" >/dev/null 2>&1; sync_governance_progress || true`,
      ],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );

  beforeEach(() => {
    // lib.sh derives PROJECT_ROOT from its own location, so the sandbox needs
    // the real directory shape with a copy of the real library.
    root = mkdtempSync(path.join(tmpdir(), "forge-hooks-"));
    mkdirSync(path.join(root, ".claude/hooks"), { recursive: true });
    mkdirSync(path.join(root, ".forge"), { recursive: true });
    copyFileSync(REAL_LIB, path.join(root, ".claude/hooks/lib.sh"));

    constitutionPath = path.join(root, ".claude/governance.json");
    runtimePath = path.join(root, ".forge/governance-runtime.json");
    writeFileSync(constitutionPath, CONSTITUTION);
    writeFileSync(runtimePath, RUNTIME);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("updates runtime workstreams and leaves the constitution byte-identical", () => {
    runSync();

    // The constitution is versioned config — a routine hook fire must not
    // change it by even one byte.
    expect(readFileSync(constitutionPath, "utf-8")).toBe(CONSTITUTION);

    // The runtime file got the computed progress: 1 of 2 tasks complete = 50%.
    const runtime = JSON.parse(readFileSync(runtimePath, "utf-8"));
    expect(runtime.workstreams[0].progress).toBe(50);
    expect(runtime.workstreams[0].metrics.tasksCompleted).toBe(1);
    expect(runtime.workstreams[0].metrics.totalTasks).toBe(2);
  });

  it("writes nothing when jq fails, instead of truncating its target", () => {
    // Unparseable input forces the exact failure mode that destroyed the file.
    const corrupt = "this is not json";
    writeFileSync(runtimePath, corrupt);

    const output = runSync();

    // The old code logged Success here and left a 1-byte file behind.
    expect(output).toContain("Governance sync skipped");
    expect(output).not.toContain("Synced governance workstream progress");
    expect(readFileSync(runtimePath, "utf-8")).toBe(corrupt);
    expect(readFileSync(constitutionPath, "utf-8")).toBe(CONSTITUTION);
  });

  it("does not touch the constitution even when runtime state is absent", () => {
    rmSync(runtimePath);

    const output = runSync();

    expect(output).toContain("Governance runtime state not found");
    expect(readFileSync(constitutionPath, "utf-8")).toBe(CONSTITUTION);
  });
});

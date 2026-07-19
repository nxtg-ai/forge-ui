// @vitest-environment node
/**
 * Governance watchers on the LEGACY single-file upgrade path.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-04 item 3 / Codex re-gate 2 [P1].
 *
 * The runtime/config split introduced a regression on a real upgrade path:
 * when a project still had the pre-split single-file `.claude/governance.json`
 * and no `.forge/` directory, `readState()` succeeded from the versioned file
 * alone. That skipped the seed branch, so the runtime file did not exist when
 * the runtime watcher was attached. Its ENOENT escaped past the constitution
 * watcher and was swallowed by a non-fatal catch — leaving a healthy-LOOKING
 * server with NEITHER watcher active for its entire life. No governance change
 * could ever broadcast.
 *
 * This drives the real server as a subprocess against a real legacy fixture,
 * because the bug lived in startup ORDERING — it is invisible to a unit test
 * that constructs the manager directly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

// The global test setup mocks `fs`; this test touches the real filesystem
// (temp fixture dirs the spawned server must actually read).
vi.unmock("fs");
const { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } =
  await vi.importActual<typeof import("node:fs")>("node:fs");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SERVER_ENTRY = path.join(REPO_ROOT, "src/server/api-server.ts");

/** A pre-split project: everything in the tracked file, no `.forge/`. */
function writeLegacyFixture(dir: string) {
  mkdirSync(path.join(dir, ".claude/governance"), { recursive: true });
  writeFileSync(
    path.join(dir, ".claude/governance.json"),
    JSON.stringify(
      {
        version: 1,
        timestamp: "2026-07-18T00:00:00.000Z",
        constitution: {
          directive: "legacy fixture",
          vision: ["v"],
          status: "EXECUTION",
          confidence: 75,
        },
        workstreams: [],
        sentinelLog: [
          {
            id: "legacy-1",
            timestamp: 1752800000000,
            type: "INFO",
            severity: "low",
            category: "governance",
            source: "api-server",
            message: "written before the split",
            context: {},
            actionRequired: false,
          },
        ],
        metadata: {
          sessionId: "legacy",
          projectPath: dir,
          forgeVersion: "3.3.1",
          lastSync: "2026-07-18T00:00:00.000Z",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(dir, ".claude/governance/config.json"),
    JSON.stringify({
      sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
      stateManagement: { backupEnabled: false, maxBackups: 10 },
    }),
  );
}

/** Run the server until `predicate` sees enough output, then kill it. */
function runServer(
  cwd: string,
  port: number,
  predicate: (log: string) => boolean,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve) => {
    let log = "";
    let done = false;

    const child: ChildProcess = spawn(
      "npx",
      ["tsx", SERVER_ENTRY],
      {
        cwd,
        env: {
          ...process.env,
          PORT: String(port),
          // Guarantee no orchestrator is reachable, so the run does not depend
          // on a locally installed binary.
          FORGE_BIN: "/nonexistent/definitely-not-forge",
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already gone */
      }
      resolve(log);
    };

    const onData = (chunk: Buffer) => {
      log += chunk.toString();
      if (predicate(log)) finish();
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    const timer = setTimeout(finish, timeoutMs);
  });
}

describe("governance watchers — legacy single-file startup", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(path.join(tmpdir(), "forge-legacy-"));
    writeLegacyFixture(projectDir);
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("activates BOTH watchers when upgrading a legacy single-file state", async () => {
    // Precondition: this is genuinely the legacy layout.
    expect(existsSync(path.join(projectDir, ".forge/governance-runtime.json"))).toBe(
      false,
    );

    const log = await runServer(
      projectDir,
      5197,
      (l) =>
        l.includes("constitution watcher active") &&
        l.includes("runtime watcher active"),
      55_000,
    );

    // Both watchers up — the regression left BOTH down.
    expect(log).toContain("runtime watcher active");
    expect(log).toContain("constitution watcher active");
    // And the failure signature is absent.
    expect(log).not.toContain("File watcher failed");

    // The runtime file was materialized from the legacy layout before the
    // watcher was attached — this ordering is the actual fix.
    expect(existsSync(path.join(projectDir, ".forge/governance-runtime.json"))).toBe(
      true,
    );
  }, 60_000);

  it("took the legacy read path, not the seed path", async () => {
    const log = await runServer(
      projectDir,
      5198,
      (l) => l.includes("watcher active") || l.includes("seeding initial state"),
      55_000,
    );

    // Guards the fixture itself: if the state were invalid the server would
    // seed a fresh one and this test would pass without ever exercising the
    // legacy upgrade it exists to cover.
    expect(log).toContain("Existing state loaded successfully");
    expect(log).not.toContain("No valid state found");
  }, 60_000);
});

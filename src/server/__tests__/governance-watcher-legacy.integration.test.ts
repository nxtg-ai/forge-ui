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
const { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, renameSync } =
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

/**
 * Run the server until `predicate` is satisfied, then kill it.
 *
 * `afterReady` runs once `readyMarker` appears and is followed by `settleMs`
 * of extra capture — that window is what proves the watchers are still LIVE
 * after startup, rather than merely attached at startup.
 */
function runServer(
  cwd: string,
  port: number,
  predicate: (log: string) => boolean,
  timeoutMs: number,
  opts: {
    readyMarker?: string;
    afterReady?: () => void | Promise<void>;
    settleMs?: number;
  } = {},
): Promise<{ log: string; logAtWrite: string }> {
  return new Promise((resolve) => {
    let log = "";
    let done = false;
    let readyFired = false;
    // Snapshot of the log taken the instant BEFORE the test's writes.
    // Baselining on the "initialized" marker instead would be wrong: the
    // startup sentinel's own broadcast arrives AFTER that line, so it would be
    // miscounted as one of the post-write broadcasts and mask a dead watcher.
    let logAtWrite = "";

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
      resolve({ log, logAtWrite });
    };

    const onData = (chunk: Buffer) => {
      log += chunk.toString();

      // Startup complete: perform the mutations, then keep capturing so the
      // resulting broadcasts land in `log` before we tear the server down.
      if (
        !readyFired &&
        opts.readyMarker &&
        opts.afterReady &&
        log.includes(opts.readyMarker)
      ) {
        readyFired = true;
        setTimeout(async () => {
          logAtWrite = log;
          await opts.afterReady!();
          setTimeout(finish, opts.settleMs ?? 2_000);
        }, 500);
        return;
      }

      // When an afterReady phase is configured, only IT decides when to stop.
      if (!opts.afterReady && predicate(log)) finish();
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

    const { log } = await runServer(
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

  /**
   * Codex re-gate 3, [P1]. Attaching the watchers is not the same as KEEPING
   * them. Both state files are written atomically (temp file + rename), which
   * replaces the inode — and `fs.watch(file)` stays bound to the OLD inode, so
   * a file-based watcher goes deaf after the very first write. Our own
   * atomic-write correctness was what killed it.
   *
   * The earlier version of this suite could not see that: it stopped as soon
   * as the "watcher active" strings appeared, before the startup sentinel's
   * rename ever proved continued liveness.
   */
  const productionWrite = (target: string, mutate: (o: any) => any) => {
    const current = JSON.parse(readFileSync(target, "utf-8"));
    const tmp = `${target}.tmp`;
    // Exactly how the server writes: stage to .tmp, then rename over target.
    writeFileSync(tmp, JSON.stringify(mutate(current), null, 2));
    renameSync(tmp, target);
  };

  const countBroadcasts = (log: string) =>
    log.split("State change detected and broadcast").length - 1;

  it("keeps BOTH watchers live across atomic rewrites of each file", async () => {
    const runtimePath = path.join(projectDir, ".forge/governance-runtime.json");
    const constitutionPath = path.join(projectDir, ".claude/governance.json");

    const { log, logAtWrite } = await runServer(projectDir, 5196, () => false, 90_000, {
      readyMarker: "All services initialized successfully",
      settleMs: 4_000,
      afterReady: async () => {
        // TWO spaced rounds per file, deliberately. Replacing a watched file
        // emits one spurious "change" from the unlink of the OLD inode, so a
        // single write per file cannot tell a live watcher from one that is
        // about to go deaf — an earlier version of this test passed against
        // the broken implementation for exactly that reason.
        for (const round of [1, 2]) {
        productionWrite(runtimePath, (s) => ({
          ...s,
          sentinelLog: [
            ...(s.sentinelLog ?? []),
            {
              id: `liveness-probe-${round}`,
              timestamp: 1,
              type: "INFO",
              severity: "low",
              category: "governance",
              source: "test",
              message: "runtime rewrite",
              context: {},
              actionRequired: false,
            },
          ],
        }));
        productionWrite(constitutionPath, (s) => ({
          ...s,
          constitution: { ...s.constitution, confidence: 79 + round },
        }));
        await new Promise((r) => setTimeout(r, 400));
        }
      },
    });

    // Baseline is the count at the moment of the writes — NOT at the
    // "initialized" line, which precedes the startup sentinel broadcast.
    // 2 files x 2 rounds. A watcher that dies after its first write yields 2.
    expect(countBroadcasts(log) - countBroadcasts(logAtWrite)).toBeGreaterThanOrEqual(4);

    // The mutations really happened — otherwise "no new broadcasts" would be
    // indistinguishable from "nothing was written", which is exactly how an
    // earlier hand probe of mine produced a false reading.
    const runtime = JSON.parse(readFileSync(runtimePath, "utf-8"));
    expect(
      runtime.sentinelLog.some((e: { id: string }) => e.id === "liveness-probe-2"),
    ).toBe(true);
    expect(
      JSON.parse(readFileSync(constitutionPath, "utf-8")).constitution.confidence,
    ).toBe(81);
  }, 100_000);

  it("survives repeated rewrites and ignores .tmp staging files", async () => {
    const runtimePath = path.join(projectDir, ".forge/governance-runtime.json");

    const { log, logAtWrite } = await runServer(projectDir, 5195, () => false, 90_000, {
      readyMarker: "All services initialized successfully",
      settleMs: 5_000,
      afterReady: async () => {
        // A watcher that reattaches only once would pass a single-rewrite test
        // and still be dead by the third write. Spaced beyond the coalescing
        // window so each rewrite is its own logical event — bunching them would
        // (correctly) collapse into one broadcast and prove nothing about
        // survival.
        for (const n of [1, 2, 3]) {
          productionWrite(runtimePath, (s) => ({
            ...s,
            metadata: { ...s.metadata, sessionId: `rewrite-${n}` },
          }));
          await new Promise((r) => setTimeout(r, 400));
        }
        // Staging file alone must NOT broadcast — the basename filter's job.
        writeFileSync(`${runtimePath}.tmp`, JSON.stringify({ ignored: true }));
      },
    });

    expect(countBroadcasts(log) - countBroadcasts(logAtWrite)).toBeGreaterThanOrEqual(3);
    expect(
      JSON.parse(readFileSync(runtimePath, "utf-8")).metadata.sessionId,
    ).toBe("rewrite-3");
  }, 100_000);

  it("took the legacy read path, not the seed path", async () => {
    const { log } = await runServer(
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

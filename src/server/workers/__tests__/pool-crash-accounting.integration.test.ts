// @vitest-environment node
/**
 * Crash accounting with real child processes (no child_process mock).
 *
 * NEXUS: DIRECTIVE-NXTG-20261014-15, forge-pm F1. AgentWorker emitted "crashed"
 * on every exit, terminate() included, so idle-worker removals counted as
 * crashes and /api/workers/health read unhealthy on a healthy pool.
 */

import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// The shared setup mocks fs; these workers need real files and real processes.
vi.unmock("fs");

import { AgentWorkerPool } from "../AgentWorkerPool";
import { createWorkerRoutes } from "../../routes/workers";
import type { RouteContext } from "../../route-context";

const READY = JSON.stringify({ type: "ready", id: "ready", timestamp: 0, payload: null });

// Stays up until the pool sends its shutdown control message.
const STEADY_WORKER = `
process.stdout.write(${JSON.stringify(READY + "\n")});
let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { buf += d; if (buf.includes('"shutdown"')) process.exit(0); });
setInterval(() => {}, 1000);
`;

// Reports ready, then dies with exit code 2 (the codex --agent shape).
const CRASHING_WORKER = `
process.stdout.write(${JSON.stringify(READY + "\n")});
setTimeout(() => process.exit(2), 50);
`;

let dir: string;
let pool: AgentWorkerPool | null = null;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-pool-crash-"));
  fs.writeFileSync(path.join(dir, "steady.cjs"), STEADY_WORKER);
  fs.writeFileSync(path.join(dir, "crashing.cjs"), CRASHING_WORKER);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

afterEach(async () => {
  if (pool) await pool.shutdown();
  pool = null;
});

function makePool(script: string, workers: number): AgentWorkerPool {
  return new AgentWorkerPool({
    minWorkers: 1,
    maxWorkers: 10,
    initialWorkers: workers,
    scaleInterval: 3_600_000,
    healthCheckInterval: 3_600_000,
    spawnConfig: {
      mode: "spawn",
      command: process.execPath,
      args: [path.join(dir, script)],
      communicationProtocol: "jsonlines",
    },
  });
}

async function healthStatus(p: AgentWorkerPool): Promise<string> {
  const app = express();
  app.use("/api/workers", createWorkerRoutes({ getWorkerPool: () => p } as unknown as RouteContext));
  const res = await request(app).get("/api/workers/health");
  return res.body.data.status;
}

async function waitFor(cond: () => boolean, ms: number): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("condition not met in time");
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe("worker pool crash accounting (real processes)", () => {
  it("does not count three scale-downs as crashes; health stays healthy", async () => {
    pool = makePool("steady.cjs", 4);
    await pool.initialize();
    expect(pool.getMetrics().totalWorkers).toBe(4);

    for (let i = 0; i < 3; i += 1) await pool.scaleDown(1);
    // Give any (wrong) "crashed" handlers a chance to run.
    await new Promise((r) => setTimeout(r, 200));

    expect(pool.getMetrics().totalWorkers).toBe(1);
    expect(pool.getMetrics().recentCrashes).toBe(0);
    expect(pool.getStatus().status).toBe("running");
    expect(await healthStatus(pool)).toBe("healthy");
  }, 30_000);

  it("still reads unhealthy during a real crash loop", async () => {
    // Three workers that each die once. (A restart after a crash waits up to
    // 5 s for the dead process, so one worker would take ~15 s to crash 3 times.)
    pool = makePool("crashing.cjs", 3);
    await pool.initialize();

    await waitFor(() => pool!.getMetrics().recentCrashes >= 3, 10_000);

    expect(await healthStatus(pool)).toBe("unhealthy");
    // The pool status itself settles at its health tick.
    await (pool as unknown as { checkHealth(): Promise<void> }).checkHealth();
    expect(pool.getStatus().status).toBe("degraded");
  }, 30_000);
});

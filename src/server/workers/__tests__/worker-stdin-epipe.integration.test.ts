// @vitest-environment node
/**
 * A worker whose stdin is already closed must not crash the server.
 *
 * NEXUS: DIRECTIVE-NXTG-20261014-15 follow-up. CI on the v3.5.2 release PR
 * caught an uncaught `write EPIPE` from AgentWorker.sendMessage: terminate()
 * writes the shutdown message to the stdin of a worker that has gone away, and
 * nothing listened for the stream's "error" event. In the API server that is an
 * uncaught exception during pool shutdown or a crash-loop restart.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as os from "os";
import * as path from "path";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

import { AgentWorker } from "../AgentWorker";
import { DEFAULT_RESOURCE_LIMITS } from "../types";

const READY = JSON.stringify({ type: "ready", id: "ready", timestamp: 0, payload: null });

// Reports ready, closes its own stdin (so any write from the parent gets
// EPIPE), then stays alive briefly and exits.
const CLOSES_STDIN = `
process.stdout.write(${JSON.stringify(READY + "\n")});
require("fs").closeSync(0);
setTimeout(() => process.exit(0), 400);
`;

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-worker-epipe-"));
  fs.writeFileSync(path.join(dir, "closes-stdin.cjs"), CLOSES_STDIN);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("worker stdin errors", () => {
  it("survives writing to a worker whose stdin is closed", async () => {
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => uncaught.push(err);
    process.on("uncaughtException", onUncaught);
    try {
      const worker = new AgentWorker("epipe-worker", DEFAULT_RESOURCE_LIMITS, {
        mode: "spawn",
        command: process.execPath,
        args: [path.join(dir, "closes-stdin.cjs")],
        communicationProtocol: "jsonlines",
      });
      await worker.spawn();
      // Let the child close its end of the pipe before the shutdown write.
      await new Promise((r) => setTimeout(r, 150));

      await worker.terminate();
      await new Promise((r) => setTimeout(r, 100));

      expect(uncaught).toEqual([]);
    } finally {
      process.off("uncaughtException", onUncaught);
    }
  }, 15_000);
});

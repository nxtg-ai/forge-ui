/**
 * Terminal output that contains a git diff must not produce a made-up diff event.
 *
 * NEXUS: DIRECTIVE-NXTG-20261105-02, forge-pm al:810e98d55ce4e857. interceptOutput used to answer
 * any chunk containing "diff --git" with a fixed placeholder ({ filePath: "example.ts",
 * oldContent: "// old code", ... }) that ClaudeTerminal forwards to DiffVisualization. A PTY
 * chunk cannot carry the old and new file contents that event promises, so the bridge sends
 * nothing; the real diff text still reaches the terminal as output.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import * as http from "http";

const TEST_SECRET = vi.hoisted(() => {
  const s = "d".repeat(64);
  process.env.FORGE_UI_SECRET = s;
  return s;
});

// Token checks are covered by security-auth.integration.test.ts.
vi.mock("../routes/features", () => ({
  validateWSAuthToken: () => true,
  consumeWSAuthToken: () => true,
}));

// node-pty stand-in: the test writes PTY output by emitting "data".
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => {
    const emitter = new EventEmitter() as EventEmitter & Record<string, unknown>;
    emitter.write = vi.fn();
    emitter.resize = vi.fn();
    emitter.kill = vi.fn();
    emitter.pid = 4343;
    emitter.onData = (cb: (data: string) => void) => {
      emitter.on("data", cb);
      return { dispose: () => emitter.off("data", cb) };
    };
    emitter.onExit = (cb: (info: { exitCode: number }) => void) => {
      emitter.on("exit", cb);
      return { dispose: () => emitter.off("exit", cb) };
    };
    return emitter;
  }),
}));

import { spawn } from "node-pty";
import { createPTYBridge, cleanupPTYBridge } from "../pty-bridge";
import type { RunspaceManager } from "../../core/runspace-manager";

const noRunspaces = { getRunspace: () => null, getActiveRunspace: () => null };

let server: http.Server;
let wss: WebSocketServer;
let port: number;
const clients: WebSocket[] = [];

beforeEach(async () => {
  vi.mocked(spawn).mockClear();
  server = http.createServer();
  wss = createPTYBridge(server, noRunspaces as unknown as RunspaceManager);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  port = (server.address() as { port: number }).port;
});

afterEach(async () => {
  for (const c of clients) c.terminate();
  clients.length = 0;
  cleanupPTYBridge();
  for (const c of wss.clients) c.terminate();
  await new Promise<void>((resolve) => wss.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const DIFF = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1 +1 @@",
  "-const a = 1;",
  "+const a = 2;",
  "",
].join("\r\n");

describe("PTY bridge and diff output", () => {
  it("passes diff text through as output and sends no placeholder diff event", async () => {
    const messages: Array<{ type: string; data?: unknown }> = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}/terminal?sessionId=diff&token=t-diff`, {
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    });
    clients.push(ws);
    await new Promise<void>((resolve, reject) => {
      ws.on("error", reject);
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        messages.push(msg);
        if (msg.type === "session") resolve();
      });
    });

    const pty = vi.mocked(spawn).mock.results[0].value as EventEmitter;
    pty.emit("data", DIFF);
    await new Promise((r) => setTimeout(r, 100));

    const output = messages.filter((m) => m.type === "output").map((m) => m.data).join("");
    expect(output).toContain("+const a = 2;");
    expect(messages.filter((m) => m.type === "diff")).toEqual([]);
    expect(JSON.stringify(messages)).not.toContain("example.ts");
  });
});

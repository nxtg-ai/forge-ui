/**
 * Session release on a shared PTY.
 *
 * NEXUS: DIRECTIVE-NXTG-20261014-15, forge-pm F2 and F3. Default-shell sessions
 * share one PTY. Each session registers onData/onExit on it; a timed-out
 * session must remove them (F2), and a WebSocket "error" followed by "close"
 * must still start the keepalive timer (F3).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";
import * as http from "http";

// The /terminal upgrade needs the per-install secret; these tests run after that gate.
const TEST_SECRET = vi.hoisted(() => {
  process.env.FORGE_TERMINAL_KEEPALIVE_MS = "150";
  const s = "r".repeat(64);
  process.env.FORGE_UI_SECRET = s;
  return s;
});

// Token checks are covered by security-auth.integration.test.ts.
vi.mock("../routes/features", () => ({
  validateWSAuthToken: () => true,
  consumeWSAuthToken: () => true,
}));

// node-pty stand-in with node-pty's disposable contract, so listener counts are observable.
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => {
    const emitter = new EventEmitter() as EventEmitter & Record<string, unknown>;
    emitter.write = vi.fn();
    emitter.resize = vi.fn();
    emitter.kill = vi.fn();
    emitter.pid = 4242;
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

/** Open a terminal session and resolve once the bridge has created it. */
function openSession(sessionId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/terminal?sessionId=${sessionId}&token=t-${sessionId}`, {
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    });
    clients.push(ws);
    ws.on("error", reject);
    ws.on("message", (raw) => {
      if (JSON.parse(raw.toString()).type === "session") resolve(ws);
    });
  });
}

function sharedPty(): EventEmitter & { kill: ReturnType<typeof vi.fn> } {
  const results = vi.mocked(spawn).mock.results;
  expect(results).toHaveLength(1); // one PTY, shared by every default-shell session
  return results[0].value;
}

const pastKeepalive = () => new Promise((r) => setTimeout(r, 400));

describe("PTY bridge session release", () => {
  it("removes a timed-out session's listeners from the shared PTY (F2)", async () => {
    const live = await openSession("live");
    const goneA = await openSession("gone-a");
    const goneB = await openSession("gone-b");
    const pty = sharedPty();
    expect(pty.listenerCount("data")).toBe(3);
    expect(pty.listenerCount("exit")).toBe(3);

    goneA.close();
    goneB.close();
    await pastKeepalive();

    expect(pty.listenerCount("data")).toBe(1);
    expect(pty.listenerCount("exit")).toBe(1);
    expect(pty.kill).not.toHaveBeenCalled(); // the live user keeps the PTY
    expect(live.readyState).toBe(WebSocket.OPEN);
  });

  it("still times out a session whose socket errored before closing (F3)", async () => {
    await openSession("errored");
    const pty = sharedPty();
    const [serverSide] = [...wss.clients];

    serverSide.emit("error", new Error("socket reset"));
    serverSide.terminate();
    await pastKeepalive();

    // Last user gone: its listeners are removed and the PTY is killed.
    expect(pty.listenerCount("data")).toBe(0);
    expect(pty.kill).toHaveBeenCalled();
  });
});

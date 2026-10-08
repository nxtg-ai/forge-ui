/**
 * WebSockets open on the page's own origin, in a production build too.
 *
 * NEXUS: DIRECTIVE-NXTG-20261008-03. ws-manager and the command, architect
 * and vision views honoured an absolute VITE_WS_URL (.env.example shipped
 * ws://localhost:5051/ws), and the terminal fell back to port 5050 on a
 * default-port page. A WebSocket handshake carries the session cookie, so
 * each of those could hand it to another origin.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join, relative, resolve } from "path";
import { DEFAULT_WS_PATH, sameOriginWsUrl, wsUrl } from "../api-base";
import { wsManager } from "../ws-manager";

const page = { protocol: "http:", host: "forge.example:4173" };

describe("wsUrl() / sameOriginWsUrl()", () => {
  it("defaults to /ws on the page's host and port", () => {
    expect(wsUrl({}, page)).toBe("ws://forge.example:4173/ws");
    expect(wsUrl({}, { protocol: "https:", host: "forge.example" })).toBe("wss://forge.example/ws");
    expect(DEFAULT_WS_PATH).toBe("/ws");
  });

  it("accepts another path on the same origin", () => {
    expect(wsUrl({ VITE_WS_URL: "/forge/ws" }, page)).toBe("ws://forge.example:4173/forge/ws");
  });

  it("ignores a VITE_WS_URL that names another origin", () => {
    for (const value of ["ws://localhost:5051/ws", "wss://api.example.com/ws", "//localhost:5051/ws", "/\\evil.example/ws"]) {
      expect(wsUrl({ VITE_WS_URL: value }, page)).toBe("ws://forge.example:4173/ws");
    }
  });

  it("never builds a URL to another host from a path argument", () => {
    expect(sameOriginWsUrl("//evil.example/terminal", page)).toBe("ws://forge.example:4173/ws");
    expect(sameOriginWsUrl("/terminal", page)).toBe("ws://forge.example:4173/terminal");
  });
});

describe("production build: ws-manager stays on the serving origin", () => {
  const opened: string[] = [];
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    // The value .env.example used to ship.
    vi.stubEnv("VITE_WS_URL", "ws://localhost:5051/ws");
    opened.length = 0;
    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 0;
      constructor(public url: string) {
        opened.push(url);
      }
      send(): void {}
      close(): void {
        this.readyState = 3;
      }
    }
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    (wsManager as unknown as { fetchAuthToken: () => unknown }).fetchAuthToken = () => ({
      then: (cb: (token: string | null) => void) => cb("t"),
    });
    (wsManager as unknown as { isConnecting: boolean }).isConnecting = false;
  });

  afterEach(() => {
    wsManager.disconnect();
    globalThis.WebSocket = originalWebSocket;
    vi.unstubAllEnvs();
  });

  it("connects to ws(s)://<page host>/ws, not the configured absolute URL", () => {
    wsManager.connect();
    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.host).toBe(window.location.host);
    expect(url.pathname).toBe("/ws");
    expect(opened[0]).not.toContain("5051");
  });
});

describe("browser source: one same-origin rule, no hand-rolled hosts or ports", () => {
  // Every browser-side file, so a new call site cannot skip the helper.
  const SRC = resolve(__dirname, "../..");
  const HELPER = "services/api-base.ts";

  async function browserSources(): Promise<Array<{ file: string; text: string }>> {
    const fs = await vi.importActual<typeof import("fs")>("fs");
    const out: Array<{ file: string; text: string }> = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        const rel = relative(SRC, full).split("\\").join("/");
        if (entry.isDirectory()) {
          if (["server", "__tests__", "test"].includes(entry.name)) continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          out.push({ file: rel, text: fs.readFileSync(full, "utf-8") });
        }
      }
    };
    walk(SRC);
    return out;
  }

  it("reads VITE_API_URL / VITE_WS_URL and builds ws:// URLs only in the helper", async () => {
    const offenders = (await browserSources())
      .filter(({ file }) => file !== HELPER)
      .filter(({ text }) =>
        /import\.meta\.env\??\.VITE_(WS|API)_URL/.test(text) ||
        /location\.(hostname|port)\b/.test(text) ||
        /["'`]wss?:(\/\/)?["'`$]/.test(text),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});

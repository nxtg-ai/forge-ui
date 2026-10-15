// @vitest-environment node
/**
 * The Vite dev server must not serve project state or server code.
 *
 * NEXUS: forge-pm security finding al:802d7317c90eb745 and forge-ui's Journey 3
 * inventory (GHSA-rc7c-r55p-923j class). With Vite's default config, :5050
 * served /.claude/governance.json, /CLAUDE.md and server source (?raw) to any
 * client without a credential. In dev the repo root is also the API's working
 * directory, so those files are the project's governance state.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import net from "node:net";
import path from "node:path";
import type { ViteDevServer } from "vite";

vi.unmock("fs");

const REPO_ROOT = path.resolve(__dirname, "../../..");
let server: ViteDevServer | null = null;
let base = "";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

beforeAll(async () => {
  const { createServer } = await import("vite");
  const port = await freePort();
  server = await createServer({
    configFile: path.join(REPO_ROOT, "vite.config.ts"),
    root: REPO_ROOT,
    logLevel: "silent",
    server: { port, strictPort: true, host: "127.0.0.1", hmr: false, open: false },
  });
  await server.listen();
  base = `http://127.0.0.1:${port}`;
}, 60_000);

afterAll(async () => {
  await server?.close();
});

const status = async (p: string): Promise<number> => (await fetch(`${base}${p}`)).status;

describe("Vite dev server file exposure", () => {
  it.each([
    "/.claude/governance.json",
    "/CLAUDE.md",
    "/README.md",
    "/src/server/auth/ui-auth.ts?raw",
    "/src/server/api-server.ts",
    "/.github/workflows/terminal-e2e.yml",
    "/.env.example",
  ])("refuses %s", async (p) => {
    expect(await status(p)).toBe(403);
  });

  it("still serves the app itself", async () => {
    expect(await status("/")).toBe(200);
    expect(await status("/src/main.tsx")).toBe(200);
  });
});

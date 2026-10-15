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
import { literalGlobPath } from "../../../vite.config";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
// Vite's own matcher (picomatch ships no types; this is the slice used here).
type Matcher = (glob: string, opts: Record<string, boolean>) => (file: string) => boolean;
const picomatch = (await vi.importActual<{ default: Matcher }>("picomatch")).default;

const REPO_ROOT = path.resolve(__dirname, "../../..");
let server: ViteDevServer | null = null;
let base = "";

// Project state, runtime and build output that may or may not exist on a
// given machine. Each gets a probe file, so the check does not depend on the
// machine's state. A fresh clone carries no .claude/governance.json (it is not
// tracked), and a missing file falls through to the SPA's index.html with 200,
// so .claude/ is probed with a file of its own.
const PROBE = "__vite_fs_probe__";
const FIXTURES = [".claude", "dist/server", "logs", "data", "coverage"].map((dir) => ({
  dir: path.join(REPO_ROOT, dir),
  file: path.join(REPO_ROOT, dir, `${PROBE}.txt`),
  url: `/${dir}/${PROBE}.txt`,
}));
const createdDirs: string[] = [];

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
  for (const f of FIXTURES) {
    if (!fs.existsSync(f.dir)) {
      // Remember the outermost directory this test creates, to remove it after.
      let top = f.dir;
      while (!fs.existsSync(path.dirname(top))) top = path.dirname(top);
      createdDirs.push(top);
      fs.mkdirSync(f.dir, { recursive: true });
    }
    fs.writeFileSync(f.file, "probe\n");
  }
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
  for (const f of FIXTURES) fs.rmSync(f.file, { force: true });
  for (const dir of createdDirs) fs.rmSync(dir, { recursive: true, force: true });
});

const get = (p: string) => fetch(`${base}${p}`);

describe("Vite dev server file exposure", () => {
  it.each([
    "/CLAUDE.md",
    "/README.md",
    "/src/server/auth/ui-auth.ts?raw",
    "/src/server/api-server.ts",
    "/.github/workflows/terminal-e2e.yml",
    "/package.json",
    ...FIXTURES.map((f) => f.url),
  ])("refuses %s", async (p) => {
    expect((await get(p)).status).toBe(403);
  });

  it("still serves the app itself, with real content", async () => {
    const page = await get("/");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('<div id="root">');

    const entry = await get("/src/main.tsx");
    expect(entry.status).toBe(200);
    expect(await entry.text()).not.toContain("<!DOCTYPE html>");

    // Vite's own client lives in node_modules/vite/dist: a broad deny glob such
    // as **/dist/** blocks it and the app never boots.
    // Sent as a browser loads a module script; a plain fetch takes another path.
    const client = await fetch(`${base}/@vite/client`, { headers: { Accept: "*/*", "Sec-Fetch-Dest": "script" } });
    expect(client.status).toBe(200);

    // public/CHANGELOG.md is fetched by the in-app changelog dialog.
    const changelog = await get("/CHANGELOG.md");
    expect(changelog.status).toBe(200);
    expect(await changelog.text()).toMatch(/^# /m);
  });
});

// The src/server deny rule is an absolute path. Built naively, a checkout under
// a folder with glob characters ("John (Work)") made it match nothing, and the
// dev server served server source again. Same matcher options as Vite 7's
// fsDenyGlob (node_modules/vite/dist/node/chunks/config.js).
describe("server-source deny rule under any checkout path", () => {
  it.each([
    "/home/a/forge-ui",
    "/home/John (Work)/forge-ui",
    "/srv/@(team)/forge-ui",
    "/srv/[x]/forge-ui",
    "/srv/a+b{c}!/forge-ui",
    "C:\\Users\\J (W)\\forge-ui",
  ])("%s", (root) => {
    const r = root.replace(/\\/g, "/");
    const isDenied = picomatch(`${literalGlobPath(`${root}/src/server`)}/**`, { matchBase: false, nocase: true, dot: true });
    expect(isDenied(`${r}/src/server/api-server.ts`)).toBe(true);
    expect(isDenied(`${r}/src/server/auth/ui-auth.ts`)).toBe(true);
    expect(isDenied(`${r}/src/servers/x.ts`)).toBe(false);
    expect(isDenied(`${r}/src/main.tsx`)).toBe(false);
  });
});

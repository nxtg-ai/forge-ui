// @vitest-environment node
/**
 * One-time sign-in codes work only on this machine (GHSA-r49v-8jjx-w5f9).
 *
 * A real API server listens on all interfaces, and a real Vite dev server proxies /api to it with
 * the repo's own proxy options. Requests sent to this machine's external address stand in for
 * another device on the network. Through the dev proxy, every request reaches the API from
 * 127.0.0.1, so the API has to read the address the proxy records.
 *
 * NEXUS: PRM-NXTG-20261123-14 (forge-pm al:58a1f34cd1178771), GoPMO 1.18.7.5.149.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createServer, type ViteDevServer, type ProxyOptions } from "vite";
import viteConfig from "../../../vite.config";

const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SERVER_ENTRY = path.join(REPO_ROOT, "src/server/api-server.ts");

let child: ChildProcess | null = null;
let vite: ViteDevServer | null = null;
let workDir = "";
let secretFile = "";
let apiPort = 0;
let vitePort = 0;
let external = "";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "0.0.0.0", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

function canReach(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
    sock.setTimeout(3000, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

/** A non-loopback IPv4 address of this machine that a local client can connect to. */
async function externalAddress(): Promise<string> {
  const candidates = Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal);
  const control = net.createServer();
  await new Promise<void>((r) => control.listen(0, "0.0.0.0", () => r()));
  const port = (control.address() as net.AddressInfo).port;
  try {
    for (const c of candidates) if (await canReach(c.address, port)) return c.address;
  } finally {
    control.close();
  }
  throw new Error(
    "No non-loopback IPv4 address on this machine accepts local connections, so this test cannot stand in for a LAN peer.",
  );
}

const secret = () => fs.readFileSync(secretFile, "utf-8").trim();

async function mintOnLoopback(): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${apiPort}/api/auth/login-code`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}` },
  });
  expect(res.status).toBe(200);
  return ((await res.json()).data as { code: string }).code;
}

function redeem(base: string, code: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/auth/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ code }),
  });
}

function mint(base: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/auth/login-code`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, ...headers },
  });
}

const repoApiProxy = () => (viteConfig.server?.proxy as Record<string, ProxyOptions>)["/api"];

describe.sequential("one-time sign-in codes work only on this machine (GHSA-r49v-8jjx-w5f9)", () => {
  beforeAll(async () => {
    external = await externalAddress();
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-ui-login-local-"));
    secretFile = path.join(workDir, "config", "ui-secret");
    apiPort = await freePort();
    vitePort = await freePort();

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(apiPort),
      FORGE_UI_HOST: "0.0.0.0",
      FORGE_UI_SECRET_FILE: secretFile,
      NODE_ENV: "test",
    };
    delete env.FORGE_UI_SECRET;
    delete env.ALLOWED_ORIGINS;
    child = spawn("npx", ["tsx", SERVER_ENTRY], { cwd: REPO_ROOT, env, stdio: "ignore", detached: true });

    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try {
        if ((await fetch(`http://127.0.0.1:${apiPort}/api/auth/session`)).status === 401) break;
      } catch {
        // not listening yet
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    vite = await createServer({
      configFile: false,
      root: workDir,
      logLevel: "silent",
      optimizeDeps: { noDiscovery: true, include: [] },
      server: {
        host: "0.0.0.0",
        port: vitePort,
        strictPort: true,
        proxy: { "/api": { ...repoApiProxy(), target: `http://127.0.0.1:${apiPort}` } },
      },
    });
    await vite.listen();
  }, 90_000);

  afterAll(async () => {
    await vite?.close();
    if (child?.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("the repo's dev proxy records the client address for /api", () => {
    expect(repoApiProxy().xfwd).toBe(true);
  });

  it("positive control: a code redeems on this machine through the dev proxy", async () => {
    const res = await redeem(`http://127.0.0.1:${vitePort}`, await mintOnLoopback());
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toMatch(/^forge_session=[0-9a-f]{64}/);
  });

  it("refuses to redeem from another machine through the dev proxy, and leaves the code unspent", async () => {
    const code = await mintOnLoopback();
    const remote = await redeem(`http://${external}:${vitePort}`, code);
    expect(remote.status).toBe(403);
    expect(remote.headers.get("set-cookie")).toBeNull();

    const local = await redeem(`http://127.0.0.1:${vitePort}`, code);
    expect(local.status).toBe(200);
  });

  it("a spoofed X-Forwarded-For: 127.0.0.1 from another machine does not get through the dev proxy", async () => {
    const res = await redeem(`http://${external}:${vitePort}`, await mintOnLoopback(), {
      "X-Forwarded-For": "127.0.0.1",
      "X-Real-IP": "127.0.0.1",
    });
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to mint from another machine through the dev proxy, even with the token", async () => {
    const res = await mint(`http://${external}:${vitePort}`);
    expect(res.status).toBe(403);
    expect((await res.json()).data).toBeUndefined();
  });

  it("refuses mint and redeem from another machine talking to the API directly", async () => {
    const minted = await mint(`http://${external}:${apiPort}`);
    expect(minted.status).toBe(403);
    expect((await minted.json()).data).toBeUndefined();

    const res = await redeem(`http://${external}:${apiPort}`, await mintOnLoopback());
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a loopback request that a proxy recorded as coming from another machine", async () => {
    const base = `http://127.0.0.1:${apiPort}`;
    const recordedElsewhere: Record<string, string>[] = [
      { "X-Forwarded-For": "192.168.1.50" },
      { "X-Forwarded-For": "127.0.0.1, 192.168.1.50" },
      { "X-Real-IP": "10.0.0.7" },
      { Forwarded: 'for="[2001:db8::1]:4711"' },
    ];
    for (const headers of recordedElsewhere) {
      expect((await mint(base, headers)).status).toBe(403);
      expect((await redeem(base, await mintOnLoopback(), headers)).status).toBe(403);
    }
  });
});

// @vitest-environment node
/**
 * Authentication requirements, checked against the REAL server.
 * NEXUS: DIRECTIVE-NXTG-20261007-10 item 4 (GHSA-rc7c-r55p-923j).
 *
 * The positive control proves the terminal executes input for the signed-in
 * owner, so each refusal here means "blocked", not "broken".
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import WebSocket from "ws";

vi.unmock("fs");
const fs = await vi.importActual<typeof import("node:fs")>("node:fs");

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SERVER_ENTRY = path.join(REPO_ROOT, "src/server/api-server.ts");

let child: ChildProcess | null = null;
let port = 0;
let base = "";
let workDir = "";
let secretFile = "";
let serverLog = "";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port: p } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(p));
    });
  });
}

function secret(): string {
  return fs.readFileSync(secretFile, "utf-8").trim();
}

/** Try a WebSocket upgrade; resolve with the HTTP status of a refusal, or "open". */
function tryUpgrade(url: string, headers: Record<string, string> = {}): Promise<number | "open"> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    const timer = setTimeout(() => {
      resolve(-1);
      ws.terminate();
    }, 5000);
    ws.on("close", () => clearTimeout(timer));
    ws.on("unexpected-response", (_req, res) => {
      resolve(res.statusCode ?? 0);
      ws.terminate();
    });
    ws.on("open", () => {
      resolve("open");
      ws.terminate();
    });
    ws.on("error", () => resolve(0));
  });
}

async function login(): Promise<string> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: secret() }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

async function waitForFile(file: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return fs.existsSync(file);
}

describe.sequential("API and terminal require authentication (GHSA-rc7c-r55p-923j)", () => {
  beforeAll(async () => {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "forge-ui-auth-"));
    secretFile = path.join(workDir, "config", "ui-secret");
    port = await freePort();
    base = `http://127.0.0.1:${port}`;

    const env = { ...process.env, PORT: String(port), FORGE_UI_SECRET_FILE: secretFile, NODE_ENV: "test" };
    delete env.FORGE_UI_SECRET;
    delete env.FORGE_UI_HOST;
    delete env.ALLOWED_ORIGINS;

    child = spawn("npx", ["tsx", SERVER_ENTRY], {
      cwd: REPO_ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    child.stdout?.on("data", (d) => (serverLog += d.toString()));
    child.stderr?.on("data", (d) => (serverLog += d.toString()));

    // Ready = the PTY bridge has registered its upgrade handler, which happens
    // after async startup, later than the first /api response.
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try {
        if ((await tryUpgrade(`ws://127.0.0.1:${port}/terminal`)) === 401) break;
      } catch {
        // not listening yet
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }, 60_000);

  afterAll(() => {
    if (child?.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it("creates the secret 0600 and never writes it to the server's output", () => {
    expect(fs.existsSync(secretFile)).toBe(true);
    if (process.platform !== "win32") {
      expect(fs.statSync(secretFile).mode & 0o777).toBe(0o600);
    }
    expect(secret()).toMatch(/^[0-9a-f]{64}$/);
    expect(serverLog).not.toContain(secret());
  });

  it("issues no WebSocket token to an unauthenticated peer", async () => {
    for (const route of ["/api/ws-token", "/api/auth/ws-token"]) {
      const res = await fetch(`${base}${route}`, { method: "POST" });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.data?.token).toBeUndefined();
    }
  });

  it("serves no /api route to an unauthenticated peer", async () => {
    for (const route of ["/api/health", "/api/forge/status", "/api/state", "/api/auth/session"]) {
      expect((await fetch(`${base}${route}`)).status).toBe(401);
    }
  });

  it("opens no terminal or /ws for an unauthenticated peer, even with a valid WebSocket token", async () => {
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/terminal`)).toBe(401);
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/ws`)).toBe(401);

    // A token minted by the owner is not enough on its own.
    const res = await fetch(`${base}/api/ws-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret()}` },
    });
    const token = (await res.json()).data.token as string;
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/terminal?token=${token}`)).toBe(401);
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/ws?token=${token}`)).toBe(401);
  });

  it("survives a malformed session cookie on an upgrade and keeps answering", async () => {
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/ws`, { Cookie: "forge_session=%" })).toBe(401);
    expect(await tryUpgrade(`ws://127.0.0.1:${port}/terminal`, { Cookie: "forge_session=%" })).toBe(401);
    expect((await fetch(`${base}/api/health`, { headers: { Cookie: "forge_session=%" } })).status).toBe(401);
    expect((await fetch(`${base}/api/health`, { headers: { Authorization: `Bearer ${secret()}` } })).status).toBe(200);
  });

  it("accepts no worker task from an unauthenticated peer", async () => {
    const res = await fetch(`${base}/api/workers/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "shell", command: "touch", args: [path.join(workDir, "worker-marker")] }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects a free-form worker command even from the owner", async () => {
    const res = await fetch(`${base}/api/workers/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret()}` },
      body: JSON.stringify({ type: "shell", command: "touch", args: [path.join(workDir, "worker-marker")] }),
    });
    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(workDir, "worker-marker"))).toBe(false);
  });

  it("refuses a foreign Origin even with the secret", async () => {
    const res = await fetch(`${base}/api/health`, {
      headers: { Origin: "https://evil.example", Authorization: `Bearer ${secret()}` },
    });
    expect(res.status).toBe(403);
    expect(
      await tryUpgrade(`ws://127.0.0.1:${port}/terminal`, {
        Origin: "https://evil.example",
        Authorization: `Bearer ${secret()}`,
      }),
    ).toBe(403);
  });

  it("rejects a wrong access token at login and sets no cookie", async () => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: randomBytes(32).toString("hex") }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("mints a one-time sign-in code only for an authenticated caller", async () => {
    for (const route of ["/api/auth/login-code", "/api/login-code"]) {
      const res = await fetch(`${base}${route}`, { method: "POST" });
      expect(res.status).toBe(401);
      expect((await res.json()).data).toBeUndefined();
    }
  });

  it("redeems a one-time code once for a session cookie, then refuses it", async () => {
    const minted = await fetch(`${base}/api/auth/login-code`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret()}` },
    });
    expect(minted.status).toBe(200);
    const { code, expiresIn } = (await minted.json()).data as { code: string; expiresIn: number };
    expect(code).toMatch(/^[0-9a-f]{64}$/);
    expect(code).not.toContain(secret());
    expect(expiresIn).toBe(60_000);

    const redeem = () =>
      fetch(`${base}/api/auth/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:5050" },
        body: JSON.stringify({ code }),
      });
    const first = await redeem();
    expect(first.status).toBe(200);
    const cookie = (first.headers.get("set-cookie") ?? "").split(";")[0];
    expect(cookie).toMatch(/^forge_session=[0-9a-f]{64}$/);
    expect((await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie } })).status).toBe(200);

    const second = await redeem();
    expect(second.status).toBe(401);
    expect(second.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a made-up code and a foreign Origin at redeem", async () => {
    for (const route of ["/api/auth/redeem", "/api/redeem"]) {
      const res = await fetch(`${base}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: randomBytes(32).toString("hex") }),
      });
      expect(res.status).toBe(401);
    }

    const minted = await fetch(`${base}/api/auth/login-code`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret()}` },
    });
    const { code } = (await minted.json()).data as { code: string };
    const foreign = await fetch(`${base}/api/auth/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ code }),
    });
    expect(foreign.status).toBe(403);
  });

  it("print-login-link prints a one-time link and never the token", async () => {
    const result = await new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
      const cli = spawn("npx", ["tsx", path.join(REPO_ROOT, "src/server/auth/print-login-link.ts")], {
        cwd: REPO_ROOT,
        env: { ...process.env, FORGE_UI_SECRET_FILE: secretFile, FORGE_UI_SECRET: "", FORGE_UI_API_URL: base },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      cli.stdout?.on("data", (d) => (out += d.toString()));
      cli.stderr?.on("data", (d) => (err += d.toString()));
      cli.on("close", (code) => resolve({ code, out, err }));
    });
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/^http:\/\/localhost:5050\/\?forge_login_code=[0-9a-f]{64}\n$/);
    expect(result.out + result.err).not.toContain(secret());

    const code = new URL(result.out.trim()).searchParams.get("forge_login_code");
    const res = await fetch(`${base}/api/auth/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    expect(res.status).toBe(200);
    expect(serverLog).not.toContain(secret());
  }, 30_000);

  it("print-login-link refuses to send the token to a non-loopback API", async () => {
    const result = await new Promise<{ code: number | null; err: string }>((resolve) => {
      const cli = spawn("npx", ["tsx", path.join(REPO_ROOT, "src/server/auth/print-login-link.ts")], {
        cwd: REPO_ROOT,
        env: { ...process.env, FORGE_UI_SECRET_FILE: secretFile, FORGE_UI_SECRET: "", FORGE_UI_API_URL: "http://example.com:5051" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let err = "";
      cli.stderr?.on("data", (d) => (err += d.toString()));
      cli.on("close", (code) => resolve({ code, err }));
    });
    expect(result.code).toBe(1);
    expect(result.err).toContain("must be an http:// loopback address");
    expect(result.err).not.toContain(secret());
  }, 30_000);

  it("positive control: the signed-in owner gets a terminal that runs input", async () => {
    const cookie = await login();
    expect(cookie).toMatch(/^forge_session=[0-9a-f]{64}$/);

    const tokenRes = await fetch(`${base}/api/ws-token`, { method: "POST", headers: { Cookie: cookie } });
    expect(tokenRes.status).toBe(200);
    const token = (await tokenRes.json()).data.token as string;

    const marker = path.join(workDir, "owner-marker");
    const ws = new WebSocket(`ws://127.0.0.1:${port}/terminal?token=${token}`, {
      headers: { Cookie: cookie, Origin: "http://localhost:5050" },
    });
    // Wait for the PTY's first message rather than a fixed sleep: under a loaded
    // full-suite run the shell can take well over a second to come up.
    const firstMessage = new Promise<void>((resolve) => ws.once("message", () => resolve()));
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("unexpected-response", (_r, res) => reject(new Error(`upgrade refused: ${res.statusCode}`)));
      ws.once("error", reject);
    });
    await Promise.race([firstMessage, new Promise((r) => setTimeout(r, 10_000))]);
    await new Promise((r) => setTimeout(r, 500));
    ws.send(JSON.stringify({ type: "input", data: `touch ${marker}\r` }));
    const created = await waitForFile(marker, 20_000);
    ws.terminate();
    expect(created).toBe(true);
  }, 45_000);

  it("listens on loopback only by default", async () => {
    expect(serverLog).toContain(`running on http://127.0.0.1:${port}`);

    const canReach = (host: string, p: number) =>
      new Promise<boolean>((resolve) => {
        const sock = net.connect({ host, port: p }, () => {
          sock.destroy();
          resolve(true);
        });
        sock.once("error", () => resolve(false));
        sock.setTimeout(3000, () => {
          sock.destroy();
          resolve(false);
        });
      });

    // Only meaningful where an all-interfaces listener IS reachable on the
    // external address; some virtualised networks don't loop that back.
    const externals = Object.values(os.networkInterfaces())
      .flat()
      .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal);
    const control = net.createServer();
    await new Promise<void>((r) => control.listen(0, "0.0.0.0", () => r()));
    const controlPort = (control.address() as net.AddressInfo).port;
    let checked = 0;
    try {
      for (const ext of externals) {
        if (!(await canReach(ext.address, controlPort))) continue;
        checked++;
        expect(await canReach(ext.address, port)).toBe(false);
      }
    } finally {
      control.close();
    }
    if (checked === 0) console.warn("[security-auth] no external address loops back here; bind checked by log only");
  });
});

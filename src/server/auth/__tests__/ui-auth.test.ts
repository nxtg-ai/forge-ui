// @vitest-environment node
/**
 * ui-auth — the single gate for /api and WebSocket upgrades.
 * NEXUS: DIRECTIVE-NXTG-20261007-10 (GHSA-rc7c-r55p-923j).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IncomingMessage } from "http";

// The global setup mocks `fs`; secret-file behaviour needs the real one.
vi.unmock("fs");
const realFs = await vi.importActual<typeof import("node:fs")>("node:fs");
const os = await vi.importActual<typeof import("node:os")>("node:os");
const path = await vi.importActual<typeof import("node:path")>("node:path");

const auth = await import("../ui-auth");

const SECRET = "a".repeat(64);

function req(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe("ui-auth", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    auth.resetSecretCacheForTests();
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.FORGE_UI_HOST;
    process.env.FORGE_UI_SECRET = SECRET;
  });

  afterEach(() => {
    process.env = { ...saved };
    auth.resetSecretCacheForTests();
  });

  describe("authorize", () => {
    it("rejects a request with no credential and no Origin (401)", () => {
      expect(auth.authorize(req({}))).toEqual({ ok: false, status: 401, reason: "Authentication required" });
    });

    it("rejects an allow-listed Origin that carries no credential (401)", () => {
      expect(auth.authorize(req({ origin: "http://localhost:5050" }))).toMatchObject({ ok: false, status: 401 });
    });

    it("rejects a foreign Origin even with the correct secret (403)", () => {
      const decision = auth.authorize(req({ origin: "https://evil.example", authorization: `Bearer ${SECRET}` }));
      expect(decision).toEqual({ ok: false, status: 403, reason: "Origin not allowed" });
    });

    it("admits the Bearer secret with no Origin", () => {
      expect(auth.authorize(req({ authorization: `Bearer ${SECRET}` }))).toEqual({ ok: true });
    });

    it("admits the X-Forge-Token header", () => {
      expect(auth.authorize(req({ "x-forge-token": SECRET }))).toEqual({ ok: true });
    });

    it("admits the session cookie from an allow-listed Origin", () => {
      const cookie = `other=1; ${auth.SESSION_COOKIE}=${auth.sessionValue()}`;
      expect(auth.authorize(req({ origin: "http://localhost:5050", cookie }))).toEqual({ ok: true });
    });

    it("rejects a wrong secret, a truncated secret and a forged cookie", () => {
      expect(auth.authorize(req({ authorization: `Bearer ${"b".repeat(64)}` }))).toMatchObject({ status: 401 });
      expect(auth.authorize(req({ authorization: `Bearer ${SECRET.slice(0, 63)}` }))).toMatchObject({ status: 401 });
      expect(auth.authorize(req({ cookie: `${auth.SESSION_COOKIE}=${"0".repeat(64)}` }))).toMatchObject({ status: 401 });
    });

    it("fails closed on a malformed cookie instead of throwing", () => {
      expect(() => auth.authorize(req({ cookie: `${auth.SESSION_COOKIE}=%` }))).not.toThrow();
      expect(auth.authorize(req({ cookie: `${auth.SESSION_COOKIE}=%E0%A4%A` }))).toMatchObject({ status: 401 });
    });

    it("never accepts the raw secret as the cookie value", () => {
      expect(auth.authorize(req({ cookie: `${auth.SESSION_COOKIE}=${SECRET}` }))).toMatchObject({ status: 401 });
    });

    it("honours ALLOWED_ORIGINS", () => {
      process.env.ALLOWED_ORIGINS = "http://192.168.1.206:5050";
      const lan = req({ origin: "http://192.168.1.206:5050", authorization: `Bearer ${SECRET}` });
      expect(auth.authorize(lan)).toEqual({ ok: true });
      expect(auth.authorize(req({ origin: "http://localhost:5050", authorization: `Bearer ${SECRET}` }))).toMatchObject({
        status: 403,
      });
    });
  });

  describe("session cookie", () => {
    it("is HttpOnly, SameSite=Strict and does not contain the secret", () => {
      const header = auth.sessionCookieHeader();
      expect(header).toContain("HttpOnly");
      expect(header).toContain("SameSite=Strict");
      expect(header).toContain("Path=/");
      expect(header).not.toContain(SECRET);
      expect(auth.sessionValue()).toMatch(/^[0-9a-f]{64}$/);
    });

    it("changes when the secret changes", () => {
      expect(auth.sessionValue("x".repeat(64))).not.toBe(auth.sessionValue("y".repeat(64)));
    });
  });

  describe("secret storage", () => {
    let dir: string;

    beforeEach(() => {
      delete process.env.FORGE_UI_SECRET;
      dir = realFs.mkdtempSync(path.join(os.tmpdir(), "forge-ui-secret-"));
      process.env.FORGE_UI_SECRET_FILE = path.join(dir, "nested", "ui-secret");
    });

    afterEach(() => {
      realFs.rmSync(dir, { recursive: true, force: true });
    });

    it("creates a 64-hex secret with mode 0600 on first run, then reuses it", () => {
      const first = auth.loadOrCreateSecret();
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      if (process.platform !== "win32") {
        expect(realFs.statSync(process.env.FORGE_UI_SECRET_FILE!).mode & 0o777).toBe(0o600);
      }
      auth.resetSecretCacheForTests();
      expect(auth.loadOrCreateSecret()).toBe(first);
    });

    it("tightens a group/other-readable secret file to 0600", () => {
      if (process.platform === "win32") return;
      const file = process.env.FORGE_UI_SECRET_FILE!;
      realFs.mkdirSync(path.dirname(file), { recursive: true });
      realFs.writeFileSync(file, "c".repeat(64), { mode: 0o644 });
      realFs.chmodSync(file, 0o644);
      expect(auth.loadOrCreateSecret()).toBe("c".repeat(64));
      expect(realFs.statSync(file).mode & 0o777).toBe(0o600);
    });

    it("refuses a short secret", () => {
      process.env.FORGE_UI_SECRET = "short";
      expect(() => auth.loadOrCreateSecret()).toThrow(/at least 32/);
    });
  });

  describe("bind host", () => {
    it("defaults to IPv4 loopback", () => {
      expect(auth.resolveBindHost()).toBe("127.0.0.1");
    });

    it("binds elsewhere only when FORGE_UI_HOST opts in", () => {
      process.env.FORGE_UI_HOST = "0.0.0.0";
      expect(auth.resolveBindHost()).toBe("0.0.0.0");
      expect(auth.isLoopbackHost("0.0.0.0")).toBe(false);
      expect(auth.isLoopbackHost("127.0.0.1")).toBe(true);
    });
  });
});

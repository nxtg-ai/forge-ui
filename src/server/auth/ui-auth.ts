/**
 * UI/API authentication — one per-install secret gates every /api route and
 * every WebSocket upgrade.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-10 (GHSA-rc7c-r55p-923j).
 *
 * Credentials accepted:
 *   - `Authorization: Bearer <secret>` or `X-Forge-Token: <secret>` — tools/CLI.
 *   - the `forge_session` cookie set by POST /api/auth/login — the browser.
 *     It holds an HMAC of the secret, never the secret itself, and is
 *     HttpOnly + SameSite=Strict, so a cross-site page can neither read it nor
 *     make the browser send it.
 *
 * Origin policy: a request carrying an Origin that is not allow-listed is
 * rejected even when authenticated. A request with NO Origin is a non-browser
 * client and is admitted only with a credential.
 *
 * The secret is never logged. It lives in a 0600 file created on first run,
 * or comes from FORGE_UI_SECRET.
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { IncomingMessage } from "http";
import type { NextFunction, Request, Response } from "express";

export const SESSION_COOKIE = "forge_session";
const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5050",
  "http://127.0.0.1:5050",
  "http://localhost:5051",
  "http://127.0.0.1:5051",
  "http://localhost:5173",
];

export function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
}

/** Where the secret lives: FORGE_UI_SECRET_FILE, else $XDG_CONFIG_HOME (or ~/.config)/nxtg-forge/ui-secret. */
export function getSecretFilePath(): string {
  if (process.env.FORGE_UI_SECRET_FILE) return process.env.FORGE_UI_SECRET_FILE;
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "nxtg-forge", "ui-secret");
}

let cachedSecret: string | null = null;

/**
 * Load the per-install secret, creating it (0600, in a 0700 directory) on
 * first run. A pre-existing file readable by group/other is tightened to 0600.
 */
export function loadOrCreateSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.FORGE_UI_SECRET;
  if (fromEnv !== undefined) {
    if (fromEnv.length < MIN_SECRET_LENGTH) {
      throw new Error(`FORGE_UI_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  const file = getSecretFilePath();
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const secret = crypto.randomBytes(32).toString("hex");
    try {
      // "wx": never overwrite a secret another process created first.
      fs.writeFileSync(file, secret + "\n", { mode: 0o600, flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }

  if (process.platform !== "win32") {
    const mode = fs.statSync(file).mode & 0o777;
    if (mode & 0o077) fs.chmodSync(file, 0o600);
  }

  const secret = fs.readFileSync(file, "utf-8").trim();
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`UI secret in ${file} is shorter than ${MIN_SECRET_LENGTH} characters`);
  }
  cachedSecret = secret;
  return cachedSecret;
}

/** Test hook: forget the cached secret so env/file changes take effect. */
export function resetSecretCacheForTests(): void {
  cachedSecret = null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** The session cookie value: an HMAC of the secret, so the cookie never carries it. */
export function sessionValue(secret: string = loadOrCreateSecret()): string {
  return crypto.createHmac("sha256", secret).update("forge-ui-session-v1").digest("hex");
}

export function verifySecret(candidate: unknown): boolean {
  return typeof candidate === "string" && candidate.length > 0 && safeEqual(candidate, loadOrCreateSecret());
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** True when the request carries the secret (header) or a valid session cookie. */
export function isAuthenticated(req: IncomingMessage): boolean {
  const authz = headerValue(req.headers.authorization);
  if (authz?.startsWith("Bearer ") && verifySecret(authz.slice("Bearer ".length).trim())) return true;

  const tokenHeader = headerValue(req.headers["x-forge-token"]);
  if (tokenHeader && verifySecret(tokenHeader)) return true;

  const cookie = readCookie(headerValue(req.headers.cookie), SESSION_COOKIE);
  return cookie !== undefined && safeEqual(cookie, sessionValue());
}

export type AuthDecision =
  | { ok: true }
  | { ok: false; status: 401 | 403; reason: string };

/**
 * The single decision used by both the HTTP middleware and the WebSocket
 * upgrade gates: foreign Origin → 403; no credential → 401.
 */
export function authorize(req: IncomingMessage): AuthDecision {
  const origin = headerValue(req.headers.origin);
  if (origin !== undefined && !getAllowedOrigins().includes(origin)) {
    return { ok: false, status: 403, reason: "Origin not allowed" };
  }
  if (!isAuthenticated(req)) {
    return { ok: false, status: 401, reason: "Authentication required" };
  }
  return { ok: true };
}

/** Routes under /api reachable without a credential (Origin policy still applies). */
const PUBLIC_API_PATHS = new Set(["/auth/login", "/login", "/auth/logout", "/logout"]);

/** Express middleware for the /api mount. */
export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_API_PATHS.has(req.path)) {
    const origin = req.headers.origin;
    if (origin !== undefined && !getAllowedOrigins().includes(origin)) {
      res.status(403).json({ success: false, error: "Origin not allowed", timestamp: new Date().toISOString() });
      return;
    }
    next();
    return;
  }
  const decision = authorize(req);
  if (!decision.ok) {
    res.status(decision.status).json({ success: false, error: decision.reason, timestamp: new Date().toISOString() });
    return;
  }
  next();
}

export function sessionCookieHeader(): string {
  return `${SESSION_COOKIE}=${sessionValue()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_S}`;
}

export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

/**
 * Bind address. Loopback unless FORGE_UI_HOST says otherwise — LAN exposure is
 * an explicit opt-in, and the caller prints a warning when it is taken.
 */
export function resolveBindHost(): string {
  return process.env.FORGE_UI_HOST?.trim() || "127.0.0.1";
}

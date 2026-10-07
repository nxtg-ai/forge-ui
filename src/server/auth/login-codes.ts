/**
 * One-time sign-in codes for automated browser sessions.
 *
 * NEXUS: DIRECTIVE-NXTG-20261007-15.
 *
 * An agent driving a browser through tool calls can only pass a sign-in value
 * by putting it in a URL or a tool call, both of which are recorded. The
 * access token must never take that path. Instead:
 *
 *   1. A local process that already holds the token (read from its file or
 *      env, sent only in a request header) asks for a code:
 *      POST /api/auth/login-code — behind requireApiAuth like every /api route.
 *   2. The browser opens /?forge_login_code=<code>; the sign-in screen redeems
 *      it once: POST /api/auth/redeem → the normal session cookie.
 *
 * A code is random (256 bits), single-use and expires after CODE_TTL_MS, so a
 * copy left in a transcript is spent or stale. It is never the token and is
 * never derived from it.
 */

import * as crypto from "crypto";

export const CODE_TTL_MS = 60_000;
export const MAX_OUTSTANDING_CODES = 8;

const codes = new Map<string, number>(); // code → expiresAt

function pruneExpired(now: number): void {
  for (const [code, expiresAt] of codes) {
    if (expiresAt <= now) codes.delete(code);
  }
}

/** Mint a code, or null when too many unexpired codes are already outstanding. */
export function mintLoginCode(now: number = Date.now()): { code: string; expiresIn: number } | null {
  pruneExpired(now);
  if (codes.size >= MAX_OUTSTANDING_CODES) return null;
  const code = crypto.randomBytes(32).toString("hex");
  codes.set(code, now + CODE_TTL_MS);
  return { code, expiresIn: CODE_TTL_MS };
}

/** Spend a code. True exactly once per minted code, and only before it expires. */
export function redeemLoginCode(code: unknown, now: number = Date.now()): boolean {
  if (typeof code !== "string" || !/^[0-9a-f]{64}$/.test(code)) return false;
  const expiresAt = codes.get(code);
  if (expiresAt === undefined) return false;
  codes.delete(code); // single use, even if it turns out to be expired
  return expiresAt > now;
}

/** Test hook. */
export function resetLoginCodesForTests(): void {
  codes.clear();
}

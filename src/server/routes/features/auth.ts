/**
 * Auth Routes - session login/logout and WebSocket token issuance.
 *
 * Everything here except /login and /logout sits behind requireApiAuth
 * (ui-auth.ts), so a WebSocket token is only ever issued to a caller that
 * already holds the per-install secret.
 */

import express from "express";
import * as crypto from "crypto";
import type { RouteContext } from "../../route-context";
import { rateLimit, authLimiter } from "../../middleware";
import { clearedSessionCookieHeader, sessionCookieHeader, verifySecret } from "../../auth/ui-auth";

const wsAuthTokens = new Map<string, { createdAt: number; clientId: string }>();
const WS_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateWSAuthToken(clientId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  wsAuthTokens.set(token, { createdAt: Date.now(), clientId });
  return token;
}

export function validateWSAuthToken(token: string | undefined): boolean {
  if (!token) return false;
  const data = wsAuthTokens.get(token);
  if (!data) return false;
  if (Date.now() - data.createdAt > WS_TOKEN_EXPIRY_MS) {
    wsAuthTokens.delete(token);
    return false;
  }
  return true;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of wsAuthTokens.entries()) {
    if (now - data.createdAt > WS_TOKEN_EXPIRY_MS) {
      wsAuthTokens.delete(token);
    }
  }
}, 60000);

export function createAuthRoutes(_ctx: RouteContext): express.Router {
  const router = express.Router();

  // Exchange the per-install secret for an HttpOnly session cookie.
  router.post("/login", rateLimit(authLimiter), (req, res) => {
    const token = (req.body as { token?: unknown } | undefined)?.token;
    if (!verifySecret(token)) {
      res.status(401).json({ success: false, error: "Invalid access token", timestamp: new Date().toISOString() });
      return;
    }
    res.setHeader("Set-Cookie", sessionCookieHeader());
    res.json({ success: true, data: { authenticated: true }, timestamp: new Date().toISOString() });
  });

  router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", clearedSessionCookieHeader());
    res.json({ success: true, data: { authenticated: false }, timestamp: new Date().toISOString() });
  });

  // Reaching this handler means requireApiAuth already admitted the caller.
  router.get("/session", (_req, res) => {
    res.json({ success: true, data: { authenticated: true }, timestamp: new Date().toISOString() });
  });

  // Get WebSocket authentication token
  router.post("/ws-token", rateLimit(authLimiter), (req, res) => {
    try {
      const clientId = req.ip || req.socket.remoteAddress || crypto.randomBytes(8).toString("hex");
      const token = generateWSAuthToken(clientId);

      res.json({
        success: true,
        data: { token, expiresIn: WS_TOKEN_EXPIRY_MS },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate token",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

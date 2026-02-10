/**
 * Auth Routes - WebSocket authentication token management
 */

import express from "express";
import * as crypto from "crypto";
import type { RouteContext } from "../../route-context";
import { rateLimit, authLimiter } from "../../middleware";

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

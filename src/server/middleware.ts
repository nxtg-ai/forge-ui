/**
 * Shared Middleware - Rate limiting, validation, and security
 *
 * Extracted from api-server.ts for reuse across route modules.
 */

import type express from "express";
import { z } from "zod";

// ============= Rate Limiting =============

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number,
    public maxRequests: number,
  ) {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  cleanup() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

const isProd = process.env.NODE_ENV === "production";
export const generalLimiter = new InMemoryRateLimiter(60000, isProd ? 300 : 5000);
export const writeLimiter = new InMemoryRateLimiter(60000, isProd ? 30 : 100);
export const authLimiter = new InMemoryRateLimiter(60000, isProd ? 10 : 50);

export function rateLimit(limiter: InMemoryRateLimiter) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || "unknown";
    const result = limiter.check(identifier);

    res.setHeader("X-RateLimit-Limit", limiter.maxRequests);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many requests",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

// ============= Input Validation =============

export function validateRequest(schema: z.ZodSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.issues,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
}

// ============= Validation Schemas =============

export const visionCaptureSchema = z.object({
  text: z.string().min(1).max(10000),
});

export const commandExecuteSchema = z.object({
  name: z.string().min(1).max(200),
  args: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.string().optional(),
});

export const agentTaskSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

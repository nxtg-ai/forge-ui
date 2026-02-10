/**
 * Vision Routes - Project vision CRUD and alignment checking
 */

import express from "express";
import type { RouteContext } from "../../route-context";
import {
  rateLimit,
  writeLimiter,
  validateRequest,
  visionCaptureSchema,
} from "../../middleware";

export function createVisionRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const vision = await ctx.visionSystem.getVision();
      res.json({
        success: true,
        data: vision,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.put("/", async (req, res) => {
    try {
      const vision = await ctx.visionSystem.updateVision(req.body);
      ctx.broadcast("vision.change", vision);
      res.json({
        success: true,
        data: vision,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post(
    "/capture",
    rateLimit(writeLimiter),
    validateRequest(visionCaptureSchema),
    async (req, res) => {
      try {
        const { text } = req.body;
        const vision = await ctx.visionSystem.captureVision(text);
        ctx.broadcast("vision.change", vision);
        res.json({
          success: true,
          data: vision,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  router.get("/history", async (req, res) => {
    try {
      const history = await ctx.visionSystem.getVisionHistory();
      res.json({
        success: true,
        data: history.map((event: Record<string, unknown>) => ({
          id: event.id,
          timestamp: event.timestamp,
          type: event.type,
          actor: event.actor || "system",
          summary: event.type === "created" ? "Vision created" :
                   event.type === "updated" ? "Vision updated" :
                   event.type === "goal-added" ? "Goal added" :
                   event.type === "goal-completed" ? "Goal completed" :
                   event.type === "focus-changed" ? "Focus changed" : "Unknown event",
          version: event.newVersion || event.previousVersion || "1.0",
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post("/alignment", async (req, res) => {
    try {
      const { decision } = req.body;
      const result = await ctx.visionSystem.checkAlignment({
        id: `check-${Date.now()}`,
        type: "user-check",
        description: decision,
        impact: "medium",
        rationale: decision,
      });
      res.json({
        success: true,
        data: {
          decision,
          aligned: result.aligned,
          score: result.score,
          violations: result.violations?.map((v: { reason?: string; principle?: string }) => v.reason || v.principle),
          suggestions: result.suggestions,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

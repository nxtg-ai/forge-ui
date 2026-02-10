/**
 * State Routes - Project state and health metrics
 */

import express from "express";
import type { RouteContext } from "../../route-context";

export function createStateRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const state = ctx.stateManager.getState();
      res.json({
        success: true,
        data: state,
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

  router.patch("/phase", async (req, res) => {
    try {
      const { phase } = req.body;
      const state = await ctx.stateManager.updatePhase(phase);
      ctx.broadcast("state.update", state);
      res.json({
        success: true,
        data: state,
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

  router.get("/health", async (req, res) => {
    try {
      const health = await ctx.stateManager.getHealthMetrics();
      res.json({
        success: true,
        data: health,
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

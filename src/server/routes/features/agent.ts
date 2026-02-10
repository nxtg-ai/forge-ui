/**
 * Agent Routes - Agent activities, status, and task assignment
 */

import express from "express";
import type { RouteContext } from "../../route-context";
import {
  rateLimit,
  writeLimiter,
  validateRequest,
  agentTaskSchema,
} from "../../middleware";

export function createAgentRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/activities", async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = "timestamp",
        sortOrder = "desc",
      } = req.query;
      const activities = await ctx.coordinationService.getAgentActivities({
        page: Number(page),
        limit: Number(limit),
        sortBy: String(sortBy),
        sortOrder: sortOrder as "asc" | "desc",
      });
      res.json({
        success: true,
        data: activities,
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

  router.get("/active", async (req, res) => {
    try {
      const agents = await ctx.coordinationService.getActiveAgents();
      res.json({
        success: true,
        data: agents,
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
    "/:agentId/tasks",
    rateLimit(writeLimiter),
    validateRequest(agentTaskSchema),
    async (req, res) => {
      try {
        const agentId = String(req.params.agentId || '');
        const task = req.body;
        const result = await ctx.coordinationService.assignTask(agentId, task);

        // Broadcast agent activity
        ctx.broadcast("agent.activity", {
          agent: agentId,
          action: `Assigned task: ${task.name}`,
          status: "started",
          timestamp: new Date().toISOString(),
        });

        res.json({
          success: true,
          data: result,
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

  return router;
}

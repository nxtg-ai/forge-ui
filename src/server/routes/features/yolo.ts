/**
 * YOLO Routes - YOLO mode execution and history
 * Memory Routes - Knowledge base seed data
 */

import express from "express";
import * as crypto from "crypto";
import type { RouteContext } from "../../route-context";

export function createYoloRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/statistics", async (req, res) => {
    try {
      const stats = await ctx.orchestrator.getYoloStatistics();
      res.json({
        success: true,
        data: stats,
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

  router.post("/execute", async (req, res) => {
    try {
      const action = req.body;
      const result = await ctx.orchestrator.executeYoloAction(action);

      // Broadcast YOLO action
      ctx.broadcast("yolo.action", {
        action,
        result,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: { actionId: result.actionId },
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

  router.get("/history", async (req, res) => {
    try {
      const history = await ctx.orchestrator.getYoloHistory();
      res.json({
        success: true,
        data: history,
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

export function createMemoryRoutes(_ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/seed", async (_req, res) => {
    try {
      const seedItems = [
        {
          id: crypto.randomUUID(),
          content:
            "Dog-Food or Die: Use Claude Code's native capabilities (agents, hooks, commands, skills). DON'T build TypeScript meta-services when agents can do the work.",
          tags: ["critical", "dog-food", "week-1"],
          category: "instruction",
          created: new Date("2026-01-28").toISOString(),
          updated: new Date("2026-01-28").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "TypeScript IS appropriate for UI abstractions (state-bridge, terminal components). NOT appropriate for meta-orchestration services (plan-executor, builder-service).",
          tags: ["typescript", "architecture", "ui"],
          category: "learning",
          created: new Date("2026-01-29").toISOString(),
          updated: new Date("2026-01-29").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "Run agents in PARALLEL (up to 20) using multiple Task tool calls in a SINGLE message. Maximizes throughput.",
          tags: ["agents", "performance", "parallel"],
          category: "instruction",
          created: new Date("2026-01-29").toISOString(),
          updated: new Date("2026-01-29").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "QA agents must see REAL web logs from running servers. No mocked testing data. Real integration tests only.",
          tags: ["testing", "qa", "real-logs"],
          category: "instruction",
          created: new Date("2026-01-29").toISOString(),
          updated: new Date("2026-01-29").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "CEO-LOOP makes decision → EXECUTE immediately. Don't ask for additional permission unless CRITICAL (Impact: CRITICAL + Risk: CRITICAL).",
          tags: ["ceo-loop", "autonomous", "execution"],
          category: "decision",
          created: new Date("2026-01-28").toISOString(),
          updated: new Date("2026-01-28").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "Week 1 COMPLETE: 5 critical gaps closed (approval queue, planner agent, CEO-LOOP validation, checkpoints, memory widgets). Foundation for autonomous operation established.",
          tags: ["week-1", "milestone", "complete"],
          category: "context",
          created: new Date("2026-01-29").toISOString(),
          updated: new Date("2026-01-29").toISOString(),
        },
        {
          id: crypto.randomUUID(),
          content:
            "OOM crash at 4GB heap during CEO-LOOP invocation. Solution: Increase NODE_OPTIONS to 8GB + use focused, lightweight operations.",
          tags: ["incident", "memory", "learned"],
          category: "learning",
          created: new Date("2026-01-29").toISOString(),
          updated: new Date("2026-01-29").toISOString(),
        },
      ];

      res.json({
        success: true,
        data: seedItems,
        count: seedItems.length,
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

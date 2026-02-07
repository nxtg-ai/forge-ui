/**
 * Worker Pool Routes
 * Agent worker pool management endpoints
 */

import express from "express";
import type { RouteContext } from "../route-context";
import { getLogger } from "../../utils/logger";
import { captureException } from "../../monitoring/sentry";
import {
  getIntelligenceContext,
  injectIntelligence,
} from "../../utils/intelligence-injector";

const logger = getLogger("routes:workers");

export function createWorkerRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  // Initialize worker pool
  router.post("/init", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      res.json({
        success: true,
        data: pool.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize worker pool",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get worker pool status
  router.get("/", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.json({
          success: true,
          data: { status: "stopped", workers: [], metrics: null },
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: pool.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get worker status",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get pool metrics
  router.get("/metrics", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.status(404).json({
          success: false,
          error: "Worker pool not initialized",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: pool.getMetrics(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get metrics",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get individual worker
  router.get("/:workerId", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.status(404).json({
          success: false,
          error: "Worker pool not initialized",
          timestamp: new Date().toISOString(),
        });
      }
      const worker = pool.getWorker(req.params.workerId);
      if (!worker) {
        return res.status(404).json({
          success: false,
          error: "Worker not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: worker,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get worker",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Submit task to worker pool
  router.post("/tasks", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      const {
        type,
        priority,
        command,
        args,
        workstreamId,
        timeout,
        env,
        metadata,
      } = req.body;

      if (!type || !command) {
        return res.status(400).json({
          success: false,
          error: "type and command are required",
          timestamp: new Date().toISOString(),
        });
      }

      // Get intelligence context for agent tasks
      let enhancedCommand = command;
      let enhancedArgs = args;

      if (type === "agent" || type === "claude-code") {
        // Extract context from command/args for relevance matching
        const contextText = [command, ...(args || [])].join(" ");
        const contextKeywords = contextText
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 10); // Limit to 10 keywords

        // Get intelligence context (defaults: high+ priority, 500 tokens)
        const intelligence = await getIntelligenceContext({
          contextKeywords,
          maxTokens: 500,
          minPriority: "high",
        });

        // Inject intelligence into task
        if (intelligence) {
          const injected = injectIntelligence(command, args, intelligence);
          enhancedCommand = injected.command;
          enhancedArgs = injected.args;
        }
      }

      const taskId = await pool.submitTask({
        type,
        priority: priority || "medium",
        command: enhancedCommand,
        args: enhancedArgs,
        workstreamId,
        timeout,
        env,
        metadata,
      });

      res.json({
        success: true,
        data: { taskId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit task",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get task status
  router.get("/tasks/:taskId", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.status(404).json({
          success: false,
          error: "Worker pool not initialized",
          timestamp: new Date().toISOString(),
        });
      }
      const status = pool.getTaskStatus(req.params.taskId);
      if (!status) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: { taskId: req.params.taskId, status },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get task status",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cancel task
  router.delete("/tasks/:taskId", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.status(404).json({
          success: false,
          error: "Worker pool not initialized",
          timestamp: new Date().toISOString(),
        });
      }
      const cancelled = await pool.cancelTask(req.params.taskId);
      res.json({
        success: true,
        data: { taskId: req.params.taskId, cancelled },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel task",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scale pool up
  router.post("/scale/up", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      const { count } = req.body;
      await pool.scaleUp(count || 2);
      res.json({
        success: true,
        data: pool.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to scale up",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Scale pool down
  router.post("/scale/down", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.status(404).json({
          success: false,
          error: "Worker pool not initialized",
          timestamp: new Date().toISOString(),
        });
      }
      const { count } = req.body;
      await pool.scaleDown(count || 1);
      res.json({
        success: true,
        data: pool.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to scale down",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Worker pool health check
  router.get("/health", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.json({
          success: true,
          data: {
            status: "stopped",
            workers: { total: 0, active: 0, idle: 0, error: 0 },
            queue: { depth: 0, oldestTaskAge: 0 },
            lastCheck: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      const status = pool.getStatus();
      const metrics = status.metrics;

      res.json({
        success: true,
        data: {
          status:
            metrics.errorWorkers > metrics.totalWorkers * 0.5
              ? "unhealthy"
              : metrics.errorWorkers > 0
                ? "degraded"
                : "healthy",
          workers: {
            total: metrics.totalWorkers,
            active: metrics.activeWorkers,
            idle: metrics.idleWorkers,
            error: metrics.errorWorkers,
          },
          queue: {
            depth: metrics.tasksQueued,
            avgWaitTime: metrics.avgQueueWaitTime,
          },
          lastCheck: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to check health",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Shutdown worker pool
  router.post("/shutdown", async (req, res) => {
    try {
      const pool = ctx.getWorkerPool();
      if (!pool) {
        return res.json({
          success: true,
          message: "Worker pool not running",
          timestamp: new Date().toISOString(),
        });
      }
      await pool.shutdown();
      // Note: The actual pool reference is managed by api-server.ts
      res.json({
        success: true,
        message: "Worker pool shutdown complete",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to shutdown",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

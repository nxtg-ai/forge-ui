/**
 * Runspace Routes
 *
 * Handles all runspace management endpoints including:
 * - CRUD operations for runspaces
 * - Lifecycle management (start, stop, suspend)
 * - Active runspace switching
 * - Health checks
 */

import express from "express";
import type { RouteContext } from "../route-context";
import { getLogger } from "../../utils/logger";

const logger = getLogger("RunspaceRoutes");

export function createRunspaceRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  // POST / - create runspace
  router.post("/", async (req, res) => {
    try {
      const config = req.body;
      const runspace = await ctx.runspaceManager.createRunspace(config);
      ctx.broadcast("runspace.created", runspace);
      res.json({
        success: true,
        data: runspace,
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

  // GET / - list all
  router.get("/", async (req, res) => {
    try {
      const runspaces = ctx.runspaceManager.getAllRunspaces();
      const activeRunspace = ctx.runspaceManager.getActiveRunspace();
      res.json({
        success: true,
        data: {
          runspaces,
          activeRunspaceId: activeRunspace?.id || null,
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

  // GET /:id - get by id
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const runspace = ctx.runspaceManager.getRunspace(id);
      if (!runspace) {
        return res.status(404).json({
          success: false,
          error: `Runspace not found: ${id}`,
          timestamp: new Date().toISOString(),
        });
      }
      res.json({
        success: true,
        data: runspace,
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

  // PUT /:id - update
  router.put("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const runspace = await ctx.runspaceManager.updateRunspace(id, updates);
      ctx.broadcast("runspace.updated", runspace);
      res.json({
        success: true,
        data: runspace,
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

  // DELETE /:id - delete
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { deleteFiles } = req.query;
      await ctx.runspaceManager.deleteRunspace(id, deleteFiles === "true");
      ctx.broadcast("runspace.deleted", { runspaceId: id });
      res.json({
        success: true,
        data: { deleted: true },
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

  // POST /:id/switch - switch active
  router.post("/:id/switch", async (req, res) => {
    try {
      const { id } = req.params;
      await ctx.runspaceManager.switchRunspace(id);
      const runspace = ctx.runspaceManager.getActiveRunspace();
      ctx.broadcast("runspace.activated", { runspaceId: id });
      res.json({
        success: true,
        data: runspace,
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

  // POST /:id/start - start
  router.post("/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      await ctx.runspaceManager.startRunspace(id);
      const runspace = ctx.runspaceManager.getRunspace(id);
      ctx.broadcast("runspace.updated", runspace);
      res.json({
        success: true,
        data: runspace,
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

  // POST /:id/stop - stop
  router.post("/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      await ctx.runspaceManager.stopRunspace(id);
      const runspace = ctx.runspaceManager.getRunspace(id);
      ctx.broadcast("runspace.updated", runspace);
      res.json({
        success: true,
        data: runspace,
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

  // POST /:id/suspend - suspend
  router.post("/:id/suspend", async (req, res) => {
    try {
      const { id } = req.params;
      await ctx.runspaceManager.suspendRunspace(id);
      const runspace = ctx.runspaceManager.getRunspace(id);
      ctx.broadcast("runspace.suspended", { runspaceId: id });
      res.json({
        success: true,
        data: runspace,
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

  // GET /:id/health - health
  router.get("/:id/health", async (req, res) => {
    try {
      const { id } = req.params;
      const health = await ctx.runspaceManager.getRunspaceHealth(id);
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

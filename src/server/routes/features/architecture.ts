/**
 * Architecture Routes - Architecture decision records
 */

import express from "express";
import type { RouteContext } from "../../route-context";

export function createArchitectureRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.get("/decisions", async (req, res) => {
    try {
      const decisions = await ctx.coordinationService.getArchitectureDecisions();
      res.json({
        success: true,
        data: decisions,
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

  router.post("/propose", async (req, res) => {
    try {
      const decision = req.body;
      const result =
        await ctx.coordinationService.proposeArchitectureDecision(decision);

      // Broadcast decision
      ctx.broadcast("decision.made", result);

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
  });

  router.post(
    "/decisions/:decisionId/approve",
    async (req, res) => {
      try {
        const { decisionId } = req.params;
        const result =
          await ctx.coordinationService.approveArchitectureDecision(decisionId);

        // Broadcast approval
        ctx.broadcast("decision.made", result);

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

/**
 * Intelligence Card API
 * Reads Claude Code's native MEMORY.md and parses into structured intelligence cards
 * for transparent display on the UI and injection into agent contexts
 */

import * as express from "express";
import {
  getAllIntelligenceCards,
  getCompactIntelligenceCards,
} from "../../utils/intelligence-parser.js";
import { getLogger } from "../../utils/logger";
import type { RouteContext } from "../route-context";

const logger = getLogger('intelligence-route');

export function createIntelligenceRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  /**
   * GET /api/memory/intelligence
   * Returns all intelligence cards parsed from MEMORY.md and governance.json
   */
  router.get("/intelligence", async (req, res) => {
    try {
      const budget = await getAllIntelligenceCards(ctx.projectRoot);

      res.json({
        success: true,
        data: budget,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to parse intelligence cards:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/memory/intelligence/compact
   * Returns cards optimized for agent injection (critical and high priority only)
   */
  router.get("/intelligence/compact", async (req, res) => {
    try {
      const budget = await getCompactIntelligenceCards(ctx.projectRoot);

      res.json({
        success: true,
        data: budget,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to parse compact intelligence cards:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

// Keep default export for backward compatibility during transition
const router = express.Router();
export default router;

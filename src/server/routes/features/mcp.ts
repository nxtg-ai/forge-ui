/**
 * MCP Routes - MCP suggestion engine and configuration
 */

import express from "express";
import type { RouteContext } from "../../route-context";
import { getLogger } from "../../../utils/logger";

const logger = getLogger('feature-routes');

function extractTechStack(vision: unknown, category: string): string | undefined {
  const text = JSON.stringify(vision).toLowerCase();
  const patterns: Record<string, string[]> = {
    backend: [
      "node",
      "express",
      "fastify",
      "python",
      "django",
      "flask",
      "go",
      "rust",
    ],
    frontend: ["react", "vue", "angular", "svelte", "next", "nuxt"],
    database: ["postgres", "mysql", "mongodb", "redis", "sqlite"],
  };

  for (const tech of patterns[category] || []) {
    if (text.includes(tech)) return tech;
  }
  return undefined;
}

function detectIndustry(vision: unknown): string | undefined {
  const text = JSON.stringify(vision).toLowerCase();
  const industries: Record<string, string[]> = {
    healthcare: ["health", "medical", "hipaa", "patient"],
    fintech: ["finance", "banking", "payment", "crypto"],
    ecommerce: ["shop", "store", "cart", "checkout", "product"],
    saas: ["subscription", "tenant", "workspace"],
  };

  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return industry;
    }
  }
  return undefined;
}

export function createMcpRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  router.post("/suggestions", async (req, res) => {
    try {
      const { vision } = req.body;

      // Transform vision data to VisionContext format
      const visionContext = {
        mission: vision.mission || "",
        goals: vision.goals || [],
        techStack: {
          backend: extractTechStack(vision, "backend"),
          frontend: extractTechStack(vision, "frontend"),
          database: extractTechStack(vision, "database"),
        },
        features: vision.goals || [],
        integrations: [],
        industry: detectIndustry(vision),
      };

      logger.info(
        "🤖 Generating MCP suggestions for vision:",
        visionContext.mission,
      );
      const suggestions = await ctx.mcpSuggestionEngine.suggestMCPs(visionContext);

      res.json({
        success: true,
        data: suggestions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("MCP suggestion error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.post("/configure", async (req, res) => {
    try {
      const { selectedServers } = req.body;

      // Generate .claude/mcp.json configuration
      const mcpConfig = ctx.mcpSuggestionEngine.generateMCPConfig(selectedServers);
      const setupGuide = ctx.mcpSuggestionEngine.generateSetupGuide(selectedServers);

      res.json({
        success: true,
        data: {
          config: mcpConfig,
          setupGuide,
          selectedServers,
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

/**
 * Feature Routes - Vision, MCP, Auth, State, Agent, Architecture, YOLO, Memory
 *
 * This module groups miscellaneous feature routes extracted from api-server.ts
 */

import express from "express";
import * as crypto from "crypto";
import type { RouteContext } from "../route-context";
import {
  rateLimit,
  writeLimiter,
  authLimiter,
  validateRequest,
  visionCaptureSchema,
  agentTaskSchema,
} from "../middleware";
import { getLogger } from "../../utils/logger";

const logger = getLogger('feature-routes');

// ============= WebSocket Authentication =============

const wsAuthTokens = new Map<string, { createdAt: number; clientId: string }>();
const WS_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateWSAuthToken(clientId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  wsAuthTokens.set(token, { createdAt: Date.now(), clientId });
  return token;
}

export function validateWSAuthToken(token: string | undefined): boolean {
  if (!token) return false;
  const data = wsAuthTokens.get(token);
  if (!data) return false;
  if (Date.now() - data.createdAt > WS_TOKEN_EXPIRY_MS) {
    wsAuthTokens.delete(token);
    return false;
  }
  return true;
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of wsAuthTokens.entries()) {
    if (now - data.createdAt > WS_TOKEN_EXPIRY_MS) {
      wsAuthTokens.delete(token);
    }
  }
}, 60000);

// ============= Helper Functions =============

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

// ============= Route Factory =============

export function createFeatureRoutes(ctx: RouteContext): express.Router {
  const router = express.Router();

  // ============= Auth Routes =============

  const authRouter = express.Router();

  // Get WebSocket authentication token
  authRouter.post("/ws-token", rateLimit(authLimiter), (req, res) => {
    try {
      const clientId = req.ip || req.socket.remoteAddress || crypto.randomBytes(8).toString("hex");
      const token = generateWSAuthToken(clientId);

      res.json({
        success: true,
        data: { token, expiresIn: WS_TOKEN_EXPIRY_MS },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate token",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.use("/auth", authRouter);

  // ============= Vision Routes =============

  const visionRouter = express.Router();

  visionRouter.get("/", async (req, res) => {
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

  visionRouter.put("/", async (req, res) => {
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

  visionRouter.post(
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

  visionRouter.get("/history", async (req, res) => {
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

  visionRouter.post("/alignment", async (req, res) => {
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

  router.use("/vision", visionRouter);

  // ============= MCP Routes =============

  const mcpRouter = express.Router();

  mcpRouter.post("/suggestions", async (req, res) => {
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

  mcpRouter.post("/configure", async (req, res) => {
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

  router.use("/mcp", mcpRouter);

  // ============= State Routes =============

  const stateRouter = express.Router();

  stateRouter.get("/", async (req, res) => {
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

  stateRouter.patch("/phase", async (req, res) => {
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

  stateRouter.get("/health", async (req, res) => {
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

  router.use("/state", stateRouter);

  // ============= Agent Routes =============

  const agentRouter = express.Router();

  agentRouter.get("/activities", async (req, res) => {
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

  agentRouter.get("/active", async (req, res) => {
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

  agentRouter.post(
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

  router.use("/agents", agentRouter);

  // ============= Architecture Routes =============

  const architectureRouter = express.Router();

  architectureRouter.get("/decisions", async (req, res) => {
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

  architectureRouter.post("/propose", async (req, res) => {
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

  architectureRouter.post(
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

  router.use("/architecture", architectureRouter);

  // ============= YOLO Routes =============

  const yoloRouter = express.Router();

  yoloRouter.get("/statistics", async (req, res) => {
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

  yoloRouter.post("/execute", async (req, res) => {
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

  yoloRouter.get("/history", async (req, res) => {
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

  router.use("/yolo", yoloRouter);

  // ============= Memory Routes =============

  const memoryRouter = express.Router();

  memoryRouter.get("/seed", async (_req, res) => {
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

  router.use("/memory", memoryRouter);

  return router;
}

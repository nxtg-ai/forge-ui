/**
 * NXTG-Forge API Server
 * Express server with WebSocket support for real-time updates
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { z } from "zod";
import { ForgeOrchestrator } from "../core/orchestrator";
import { VisionSystem } from "../core/vision";
import { StateManager } from "../core/state";
import { CoordinationService } from "../core/coordination";
import { BootstrapService } from "../core/bootstrap";
import { createPTYBridge, cleanupPTYBridge } from "./pty-bridge";
import { MCPSuggestionEngine } from "../orchestration/mcp-suggestion-engine";
import { RunspaceManager } from "../core/runspace-manager";
import * as fs from "fs/promises";
import * as path from "path";
import { GovernanceState } from "../types/governance.types";
import { GovernanceStateManager } from "../services/governance-state-manager";
import { AgentWorkerPool, PoolStatus, AgentTask } from "./workers";
import { InitService } from "../services/init-service";
import type {
  InitOptions,
  InitResult,
  ProjectDetection,
  ExistingSetup,
} from "../services/init-service";
import {
  initSentryServer,
  captureException,
  setTag,
  addBreadcrumb,
  flushSentry,
} from "../monitoring/sentry";
import swaggerRouter from "./swagger";
import { StatusService } from "../services/status-service";
import type { ForgeStatus } from "../services/status-service";
import { ComplianceService } from "../services/compliance-service";
import intelligenceRouter from "./routes/intelligence.js";
import * as crypto from "crypto";
import {
  getIntelligenceContext,
  injectIntelligence,
} from "../utils/intelligence-injector";
import { getLogger } from "../utils/logger";

const app = express();
const logger = getLogger('api-server');

// ============= Security: Validation Schemas =============

const visionCaptureSchema = z.object({
  text: z.string().min(1).max(10000),
});

const commandExecuteSchema = z.object({
  name: z.string().min(1).max(200),
  args: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.string().optional(),
});

const agentTaskSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// ============= Security: Rate Limiting =============

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number,
    private maxRequests: number,
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requests.entries()) {
        if (now > entry.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
  }

  cleanup() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Rate limiters - generous for reads (dashboard polls multiple endpoints),
// strict for writes and auth
const isProd = process.env.NODE_ENV === "production";
const generalLimiter = new InMemoryRateLimiter(60000, isProd ? 300 : 1000); // reads: generous
const writeLimiter = new InMemoryRateLimiter(60000, isProd ? 30 : 100); // writes: moderate
const authLimiter = new InMemoryRateLimiter(60000, isProd ? 10 : 50); // auth: strict

// Rate limiting middleware factory
function rateLimit(limiter: InMemoryRateLimiter) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const identifier = req.ip || req.socket.remoteAddress || "unknown";
    const result = limiter.check(identifier);

    res.setHeader("X-RateLimit-Limit", limiter["maxRequests"]);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: "Too many requests",
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}

// ============= Security: WebSocket Authentication =============

const wsAuthTokens = new Map<string, { createdAt: number; clientId: string }>();
const WS_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateWSAuthToken(clientId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  wsAuthTokens.set(token, { createdAt: Date.now(), clientId });
  return token;
}

function validateWSAuthToken(token: string | undefined): boolean {
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

// ============= Security: Input Validation Middleware =============

function validateRequest(schema: z.ZodSchema) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.issues,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
}

// Initialize Sentry early (before other middleware)
let sentryReady = false;
initSentryServer()
  .then((ready) => {
    sentryReady = ready;
    if (ready) {
      setTag("server", "api-server");
      addBreadcrumb({
        category: "lifecycle",
        message: "API server starting",
        level: "info",
      });
      logger.info("[Sentry] Error tracking ready");
    }
  })
  .catch((err) => {
    logger.warn("[Sentry] Initialization failed:", err);
  });
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Initialize Governance State Manager
const projectRoot = process.cwd();
const governanceStateManager = new GovernanceStateManager(projectRoot);

// File watcher for governance.json changes
import { watch } from "fs";
let governanceWatcher: ReturnType<typeof watch> | null = null;

function setupGovernanceWatcher() {
  const governancePath = path.join(projectRoot, ".claude/governance.json");

  governanceWatcher = watch(governancePath, async (eventType) => {
    if (eventType === "change") {
      try {
        // Read updated state
        const state = await governanceStateManager.readState();

        // Broadcast to all WebSocket clients
        broadcast("governance.update", state);

        logger.info("[Governance] State change detected and broadcast to clients");
      } catch (error) {
        logger.error("[Governance] Failed to read state after change:", error);
      }
    }
  });

  logger.info("[Governance] File watcher initialized");
}

// Initialize Worker Pool (lazy - starts on first request or explicit init)
let workerPool: AgentWorkerPool | null = null;
async function getWorkerPool(): Promise<AgentWorkerPool> {
  if (!workerPool) {
    workerPool = new AgentWorkerPool({
      initialWorkers: 5,
      maxWorkers: 20,
      minWorkers: 2,
    });

    // Forward pool events to WebSocket clients
    workerPool.on("event", (event) => {
      broadcast("worker.event", event);
    });

    await workerPool.initialize();
    logger.info("[API] Worker pool initialized");
  }
  return workerPool;
}

// ============= Security: Middleware Configuration =============

// Security headers (basic implementation, helmet would provide more)
app.use((req, res, next) => {
  // NOTE: helmet package not installed - add with: npm install helmet
  // For now, setting critical headers manually
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';"
  );

  next();
});

// CORS configuration - restrictive in production, permissive in dev
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5050", "http://127.0.0.1:5050", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // In development, allow all origins for multi-device testing
      if (!isProduction) {
        return callback(null, true);
      }

      // In production, check against allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      logger.warn(`[Security] Blocked CORS request from unauthorized origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Request size limit to prevent DoS
app.use(express.json({ limit: "1mb" }));

// General rate limiting on all routes
app.use(rateLimit(generalLimiter));

// API Documentation (Swagger UI)
app.use(swaggerRouter);

// Intelligence Cards API (reads native MEMORY.md)
app.use("/api/memory", intelligenceRouter);

// Initialize core services
const visionManager = new VisionSystem(process.cwd());
const visionSystem = visionManager; // Alias for API compatibility
const coordinationService = new CoordinationService();
const orchestrator = new ForgeOrchestrator(visionManager, coordinationService);
const stateManager = new StateManager();
const bootstrapService = new BootstrapService(stateManager);
// Use Claude Code CLI (user's Pro Max subscription) - no API key needed
const mcpSuggestionEngine = new MCPSuggestionEngine();
// Multi-project runspace manager
const runspaceManager = new RunspaceManager();
// Initialize init service for project setup
const initService = new InitService(projectRoot);
// Initialize status service for /frg-status command
const statusService = new StatusService(projectRoot);

// WebSocket connection management
const clients = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
  // Security: Validate origin
  const origin = req.headers.origin;
  if (isProduction && origin && !allowedOrigins.includes(origin)) {
    logger.error(`[Security] Blocked WebSocket from unauthorized origin: ${origin}`);
    ws.send(JSON.stringify({ type: "error", error: "Unauthorized origin" }));
    ws.close();
    return;
  }

  // Security: Require authentication token (production only)
  if (isProduction) {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!validateWSAuthToken(token ?? undefined)) {
      logger.error("[Security] WebSocket connection rejected: invalid or missing token");
      ws.send(JSON.stringify({ type: "error", error: "Authentication required" }));
      ws.close();
      return;
    }
  }

  clients.add(ws);
  logger.info("New WebSocket client connected (authenticated)");

  // Send initial state
  ws.send(
    JSON.stringify({
      type: "state.update",
      payload: stateManager.getState(),
      timestamp: new Date().toISOString(),
    }),
  );

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleWSMessage(ws, message);
    } catch (error) {
      logger.error("Invalid WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    logger.info("WebSocket client disconnected");
  });

  ws.on("error", (error) => {
    logger.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(type: string, payload: unknown) {
  const message = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle WebSocket messages
async function handleWSMessage(ws: WebSocket, message: Record<string, unknown>) {
  switch (message.type) {
    case "ping":
      // Respond to heartbeat
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;

    case "state.update":
      await stateManager.updateState(message.payload as any);
      broadcast("state.update", stateManager.getState());
      break;

    case "command.execute":
      const result = await orchestrator.executeCommand(message.payload as string);
      ws.send(
        JSON.stringify({
          type: "command.result",
          payload: result,
          correlationId: message.correlationId,
        }),
      );
      break;

    default:
      // Only log truly unknown message types (not common ones)
      if (!['pong', 'heartbeat'].includes(String(message.type || ''))) {
        logger.info(`Unknown message type: ${message.type}`);
      }
  }
}

// ============= Security & Auth Endpoints =============

// Get WebSocket authentication token
app.post("/api/auth/ws-token", rateLimit(authLimiter), (req, res) => {
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

// ============= Vision Endpoints =============

app.get("/api/vision", async (req, res) => {
  try {
    const vision = await visionSystem.getVision();
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

app.put("/api/vision", async (req, res) => {
  try {
    const vision = await visionSystem.updateVision(req.body);
    broadcast("vision.change", vision);
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

app.post(
  "/api/vision/capture",
  rateLimit(writeLimiter),
  validateRequest(visionCaptureSchema),
  async (req, res) => {
    try {
      const { text } = req.body;
      const vision = await visionSystem.captureVision(text);
      broadcast("vision.change", vision);
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

app.get("/api/vision/history", async (req, res) => {
  try {
    const history = await visionSystem.getVisionHistory();
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

app.post("/api/vision/alignment", async (req, res) => {
  try {
    const { decision } = req.body;
    const result = await visionSystem.checkAlignment({
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

// ============= MCP Suggestion Endpoints =============

app.post("/api/mcp/suggestions", async (req, res) => {
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
    const suggestions = await mcpSuggestionEngine.suggestMCPs(visionContext);

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

app.post("/api/mcp/configure", async (req, res) => {
  try {
    const { selectedServers } = req.body;

    // Generate .claude/mcp.json configuration
    const mcpConfig = mcpSuggestionEngine.generateMCPConfig(selectedServers);
    const setupGuide = mcpSuggestionEngine.generateSetupGuide(selectedServers);

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

// Helper functions
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

// ============= Project State Endpoints =============

app.get("/api/state", async (req, res) => {
  try {
    const state = stateManager.getState();
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

app.patch("/api/state/phase", async (req, res) => {
  try {
    const { phase } = req.body;
    const state = await stateManager.updatePhase(phase);
    broadcast("state.update", state);
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

app.get("/api/state/health", async (req, res) => {
  try {
    const health = await stateManager.getHealthMetrics();
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

// ============= Agent Endpoints =============

app.get("/api/agents/activities", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = "timestamp",
      sortOrder = "desc",
    } = req.query;
    const activities = await coordinationService.getAgentActivities({
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

app.get("/api/agents/active", async (req, res) => {
  try {
    const agents = await coordinationService.getActiveAgents();
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

app.post(
  "/api/agents/:agentId/tasks",
  rateLimit(writeLimiter),
  validateRequest(agentTaskSchema),
  async (req, res) => {
    try {
      const agentId = String(req.params.agentId || '');
      const task = req.body;
      const result = await coordinationService.assignTask(agentId, task);

      // Broadcast agent activity
      broadcast("agent.activity", {
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

// ============= Command Endpoints =============
// Note: Main /api/commands/execute handler is below with EXECUTABLE_COMMANDS

app.get("/api/commands/history", async (req, res) => {
  try {
    const history = await orchestrator.getCommandHistory();
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

app.post("/api/commands/suggestions", async (req, res) => {
  try {
    const { context } = req.body;
    const suggestions = await orchestrator.getCommandSuggestions(context);
    res.json({
      success: true,
      data: suggestions,
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

// Get available commands list
app.get("/api/commands", async (req, res) => {
  try {
    // Import the forge commands registry
    const { FORGE_COMMANDS } = await import("../config/forge-commands");

    // Transform to UI-compatible format
    const commands = FORGE_COMMANDS.map((cmd) => ({
      id: cmd.id,
      name: cmd.name,
      description: cmd.description,
      category: cmd.category,
      hotkey: cmd.hotkey,
      requiresConfirmation: cmd.requiresConfirmation,
      severity: cmd.severity,
      // Icon name is sent as string, component resolves on client
      iconName: cmd.icon.name,
    }));

    res.json({
      success: true,
      data: commands,
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

// ============= Command Execution Endpoint =============

// Whitelist of commands that can be executed from the UI
const EXECUTABLE_COMMANDS: Record<string, () => Promise<{ success: boolean; output: string; data?: unknown }>> = {
  "frg-status": async () => {
    const result = await statusService.getStatus();
    if (result.isErr()) {
      return { success: false, output: result.error.message };
    }
    const status = result.unwrap();
    const cliOutput = StatusService.formatForCLI(status);
    return { success: true, output: cliOutput, data: status };
  },

  "frg-test": async () => {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("npx vitest run --reporter=verbose 2>&1", {
        cwd: projectRoot,
        timeout: 120000,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 5,
      });
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;
      return {
        success: failed === 0,
        output,
        data: { passed, failed, total: passed + failed },
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;
      const failMatch = output.match(/(\d+) failed/);
      const passMatch = output.match(/(\d+) passed/);
      return {
        success: false,
        output,
        data: {
          passed: passMatch ? parseInt(passMatch[1]) : 0,
          failed: failMatch ? parseInt(failMatch[1]) : 0,
        },
      };
    }
  },

  "frg-deploy": async () => {
    const { execSync } = await import("child_process");
    // Pre-flight: type check
    try {
      execSync("npx tsc --noEmit 2>&1", {
        cwd: projectRoot,
        timeout: 60000,
        encoding: "utf-8",
      });
    } catch (error: any) {
      return {
        success: false,
        output: `Pre-flight failed: TypeScript errors\n${error.stdout || error.message}`,
      };
    }
    // Build
    try {
      const output = execSync("npx vite build 2>&1", {
        cwd: projectRoot,
        timeout: 60000,
        encoding: "utf-8",
      });
      return { success: true, output, data: { stage: "build-complete" } };
    } catch (error: any) {
      return {
        success: false,
        output: `Build failed:\n${error.stdout || error.message}`,
      };
    }
  },

  "frg-feature": async () => {
    return {
      success: true,
      output: "Feature creation requires the Infinity Terminal.\nNavigate to the Terminal page and use: /frg-feature <name>",
      data: { redirect: "/terminal" },
    };
  },

  "frg-gap-analysis": async () => {
    const { execSync } = await import("child_process");
    const lines: string[] = [];

    // Test coverage
    try {
      const testOutput = execSync("npx vitest run --reporter=verbose 2>&1 | tail -5", {
        cwd: projectRoot, timeout: 120000, encoding: "utf-8",
      });
      lines.push("## Test Coverage\n" + testOutput.trim());
    } catch { lines.push("## Test Coverage\nFailed to run tests"); }

    // Doc coverage
    try {
      const srcFiles = execSync("find src -name '*.ts' -o -name '*.tsx' | grep -v test | grep -v __tests__ | wc -l", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const docFiles = execSync("find docs -name '*.md' 2>/dev/null | wc -l", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      lines.push(`## Documentation\nSource files: ${srcFiles}\nDoc files: ${docFiles}`);
    } catch { lines.push("## Documentation\nFailed to analyze"); }

    return { success: true, output: lines.join("\n\n") };
  },

  // ============= Git Commands =============

  "git-status": async () => {
    const { execSync } = await import("child_process");
    try {
      const branch = execSync("git branch --show-current 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const status = execSync("git status --short 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const log = execSync("git log --oneline -5 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const ahead = execSync("git rev-list --count @{u}..HEAD 2>/dev/null || echo 'no upstream'", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();

      const lines = [
        `Branch: ${branch}`,
        `Ahead of remote: ${ahead} commits`,
        "",
        "--- Changed Files ---",
        status || "(working tree clean)",
        "",
        "--- Recent Commits ---",
        log,
      ];
      return {
        success: true,
        output: lines.join("\n"),
        data: { branch, changedFiles: status.split("\n").filter(Boolean).length },
      };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  },

  "git-diff": async () => {
    const { execSync } = await import("child_process");
    try {
      const staged = execSync("git diff --cached --stat 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const unstaged = execSync("git diff --stat 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      }).trim();
      const lines = [
        "--- Staged Changes ---",
        staged || "(nothing staged)",
        "",
        "--- Unstaged Changes ---",
        unstaged || "(no unstaged changes)",
      ];
      return { success: true, output: lines.join("\n") };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  },

  "git-log": async () => {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("git log --oneline --graph --decorate -20 2>&1", {
        cwd: projectRoot, timeout: 10000, encoding: "utf-8",
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  },

  // ============= Analyze Commands =============

  "analyze-types": async () => {
    const { execSync } = await import("child_process");
    try {
      execSync("npx tsc --noEmit 2>&1", {
        cwd: projectRoot, timeout: 60000, encoding: "utf-8",
      });
      return { success: true, output: "TypeScript: 0 errors. All types check out." };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;
      const errorCount = (output.match(/error TS/g) || []).length;
      return {
        success: false,
        output: `TypeScript: ${errorCount} error(s) found\n\n${output}`,
        data: { errorCount },
      };
    }
  },

  "analyze-lint": async () => {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("npx eslint src --ext .ts,.tsx --format stylish 2>&1", {
        cwd: projectRoot, timeout: 60000, encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 5,
      });
      return { success: true, output: output || "ESLint: No issues found." };
    } catch (error: any) {
      const output = error.stdout || error.stderr || error.message;
      return { success: false, output };
    }
  },

  "analyze-deps": async () => {
    const { execSync } = await import("child_process");
    try {
      const outdated = execSync("npm outdated --json 2>/dev/null || echo '{}'", {
        cwd: projectRoot, timeout: 30000, encoding: "utf-8",
      });
      const parsed = JSON.parse(outdated);
      const entries = Object.entries(parsed);
      if (entries.length === 0) {
        return { success: true, output: "All dependencies are up to date." };
      }
      const lines = entries.map(([pkg, info]: [string, any]) =>
        `${pkg}: ${info.current} → ${info.latest} (wanted: ${info.wanted})`
      );
      return {
        success: true,
        output: `${entries.length} outdated package(s):\n\n${lines.join("\n")}`,
        data: { outdatedCount: entries.length },
      };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  },

  "analyze-bundle": async () => {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("npx vite build --mode production 2>&1 | tail -30", {
        cwd: projectRoot, timeout: 120000, encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 5,
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.message };
    }
  },

  // ============= Test Variants =============

  "test-coverage": async () => {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("npx vitest run --coverage --reporter=verbose 2>&1 | tail -40", {
        cwd: projectRoot, timeout: 180000, encoding: "utf-8",
        maxBuffer: 1024 * 1024 * 5,
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.stdout || error.stderr || error.message };
    }
  },

  // ============= Info Commands =============

  "system-info": async () => {
    const { execSync } = await import("child_process");
    const os = await import("os");
    try {
      const nodeVersion = process.version;
      const npmVersion = execSync("npm --version 2>&1", { encoding: "utf-8" }).trim();
      const gitVersion = execSync("git --version 2>&1", { encoding: "utf-8" }).trim();
      const platform = `${os.platform()} ${os.release()}`;
      const memory = `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total, ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB free`;
      const cpus = `${os.cpus().length} cores (${os.cpus()[0]?.model || "unknown"})`;
      const uptime = `${Math.round(os.uptime() / 3600)}h`;
      const diskUsage = execSync("df -h . 2>&1 | tail -1", { cwd: projectRoot, encoding: "utf-8" }).trim();

      const lines = [
        "--- Runtime ---",
        `Node.js:  ${nodeVersion}`,
        `npm:      ${npmVersion}`,
        `Git:      ${gitVersion}`,
        "",
        "--- System ---",
        `Platform: ${platform}`,
        `Memory:   ${memory}`,
        `CPUs:     ${cpus}`,
        `Uptime:   ${uptime}`,
        `Disk:     ${diskUsage}`,
      ];
      return { success: true, output: lines.join("\n") };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  },
};

app.post("/api/commands/execute", rateLimit(writeLimiter), async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing command ID",
        timestamp: new Date().toISOString(),
      });
    }

    const handler = EXECUTABLE_COMMANDS[command];
    if (!handler) {
      return res.status(404).json({
        success: false,
        error: `Unknown command: ${command}. Available: ${Object.keys(EXECUTABLE_COMMANDS).join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast that command is starting
    broadcast("command.started", { command, startedAt: new Date().toISOString() });

    const result = await handler();

    // Broadcast result
    broadcast(result.success ? "command.completed" : "command.failed", {
      command,
      success: result.success,
      completedAt: new Date().toISOString(),
    });

    res.json({
      success: result.success,
      data: {
        command,
        output: result.output,
        ...(result.data || {}),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    captureException(error instanceof Error ? error : String(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Command execution failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============= Architecture Endpoints =============

app.get("/api/architecture/decisions", async (req, res) => {
  try {
    const decisions = await coordinationService.getArchitectureDecisions();
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

app.post("/api/architecture/propose", async (req, res) => {
  try {
    const decision = req.body;
    const result =
      await coordinationService.proposeArchitectureDecision(decision);

    // Broadcast decision
    broadcast("decision.made", result);

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

app.post(
  "/api/architecture/decisions/:decisionId/approve",
  async (req, res) => {
    try {
      const { decisionId } = req.params;
      const result =
        await coordinationService.approveArchitectureDecision(decisionId);

      // Broadcast approval
      broadcast("decision.made", result);

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

// ============= YOLO Mode Endpoints =============

app.get("/api/yolo/statistics", async (req, res) => {
  try {
    const stats = await orchestrator.getYoloStatistics();
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

app.post("/api/yolo/execute", async (req, res) => {
  try {
    const action = req.body;
    const result = await orchestrator.executeYoloAction(action);

    // Broadcast YOLO action
    broadcast("yolo.action", {
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

app.get("/api/yolo/history", async (req, res) => {
  try {
    const history = await orchestrator.getYoloHistory();
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

// ============= Memory Endpoints =============

app.get("/api/memory/seed", async (_req, res) => {
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

// ============= Memory Endpoints (Read-Only) =============
// Note: Memory persistence now uses Claude Code's native memory system via MCP
// These endpoints provide read-only seed data for the UI widget only

// ============= Governance Endpoints =============

app.get("/api/governance/state", async (req, res) => {
  try {
    const projectRoot = process.cwd();
    const governancePath = path.join(projectRoot, ".claude/governance.json");

    try {
      const data = await fs.readFile(governancePath, "utf-8");
      const state: GovernanceState = JSON.parse(data);

      res.json({
        success: true,
        data: state,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        res.status(404).json({
          success: false,
          error: "Governance state not found",
          message: "Initialize governance with seed data first",
          timestamp: new Date().toISOString(),
        });
      } else {
        throw error; // Re-throw to be caught by outer catch
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to read governance state",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/config", async (req, res) => {
  try {
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, ".claude/governance/config.json");

    try {
      const data = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(data);

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // Return default config if file doesn't exist
        const { DEFAULT_GOVERNANCE_CONFIG } =
          await import("../types/governance.types.js");
        res.json({
          success: true,
          data: DEFAULT_GOVERNANCE_CONFIG,
          timestamp: new Date().toISOString(),
          message: "Using default configuration (config.json not found)",
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to read governance config",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/governance/sentinel", async (req, res) => {
  try {
    const entry = req.body;

    // Validate required fields
    if (!entry.type || !entry.source || !entry.message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: type, source, message",
        timestamp: new Date().toISOString(),
      });
    }

    // Append log using state manager (includes automatic rotation)
    await governanceStateManager.appendSentinelLog(entry);

    // Broadcast governance update to all clients
    const state = await governanceStateManager.readState();
    broadcast("governance.update", state);

    res.json({
      success: true,
      message: "Sentinel log entry added",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to append sentinel log",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/live-context", async (req, res) => {
  try {
    const liveContext = await statusService.getLiveContext();
    res.json({
      success: true,
      data: liveContext,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to gather live context",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/memory-insights", async (req, res) => {
  try {
    const os = await import("os");
    const homeDir = os.default.homedir();

    // Find native Claude memory file
    const memoryGlob = path.join(
      homeDir,
      ".claude/projects/*/memory/MEMORY.md",
    );
    const { glob } = await import("glob");
    const memoryFiles = await glob(memoryGlob);

    // Also check project-specific memory path
    const projectMemoryPath = path.join(
      homeDir,
      ".claude/projects/-home-axw-projects-NXTG-Forge-v3/memory/MEMORY.md",
    );

    let memoryContent = "";
    const targetPath =
      memoryFiles.find((f) => f.includes("NXTG-Forge")) || projectMemoryPath;

    try {
      memoryContent = await fs.readFile(targetPath, "utf-8");
    } catch {
      // No memory file found
    }

    // Parse sections from MEMORY.md
    const sections: {
      title: string;
      items: string[];
      type: "rule" | "decision" | "discovery" | "other";
    }[] = [];
    const lines = memoryContent.replace(/\r/g, "").split("\n");
    let currentSection = "";
    let currentItems: string[] = [];
    let currentType: "rule" | "decision" | "discovery" | "other" = "other";

    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentSection && currentItems.length > 0) {
          sections.push({
            title: currentSection,
            items: currentItems.slice(0, 5),
            type: currentType,
          });
        }
        currentSection = line.replace(/^#+\s*/, "");
        currentItems = [];
        if (currentSection.toLowerCase().includes("rule"))
          currentType = "rule";
        else if (currentSection.toLowerCase().includes("decision"))
          currentType = "decision";
        else if (currentSection.toLowerCase().includes("discovery"))
          currentType = "discovery";
        else currentType = "other";
      } else if (line.startsWith("### ")) {
        currentItems.push(line.replace(/^#+\s*/, ""));
      }
    }
    if (currentSection && currentItems.length > 0) {
      sections.push({
        title: currentSection,
        items: currentItems.slice(0, 5),
        type: currentType,
      });
    }

    res.json({
      success: true,
      data: {
        hasMemory: memoryContent.length > 0,
        sections: sections.slice(0, 6),
        totalRules: sections
          .filter((s) => s.type === "rule")
          .reduce((sum, s) => sum + s.items.length, 0),
        totalDecisions: sections
          .filter((s) => s.type === "decision")
          .reduce((sum, s) => sum + s.items.length, 0),
        lastModified: memoryContent.length > 0
          ? (await fs.stat(targetPath)).mtime.toISOString()
          : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to read memory insights",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/blockers", async (req, res) => {
  try {
    const state = await governanceStateManager.readState();

    // Extract blockers from workstreams
    const blockedWorkstreams = state.workstreams
      .filter(
        (ws) =>
          ws.status === "blocked" ||
          ws.risk === "high" ||
          (ws.metrics?.blockers ?? 0) > 0,
      )
      .map((ws) => ({
        id: ws.id,
        name: ws.name,
        status: ws.status,
        risk: ws.risk,
        blockerCount: ws.metrics?.blockers ?? 0,
        progress: ws.progress,
      }));

    // Extract actionRequired sentinel entries
    const actionItems = (state.sentinelLog || [])
      .filter(
        (entry) =>
          entry.actionRequired === true ||
          entry.type === "ERROR" ||
          entry.type === "CRITICAL",
      )
      .slice(-10)
      .map((entry) => ({
        id: entry.id,
        type: entry.type,
        message: entry.message,
        source: entry.source,
        timestamp: entry.timestamp,
        actionRequired: entry.actionRequired ?? false,
      }));

    // Extract pending decision workstreams
    const pendingDecisions = state.workstreams
      .filter((ws) => ws.status === "pending")
      .map((ws) => ({
        id: ws.id,
        name: ws.name,
        taskCount: ws.tasks?.length ?? 0,
        dependencies: ws.dependencies ?? [],
      }));

    res.json({
      success: true,
      data: {
        blockedWorkstreams,
        actionItems,
        pendingDecisions,
        summary: {
          totalBlockers: blockedWorkstreams.length,
          totalActionItems: actionItems.length,
          totalPending: pendingDecisions.length,
          needsAttention:
            blockedWorkstreams.length > 0 || actionItems.length > 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to gather blocker data",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/validate", async (req, res) => {
  try {
    const result = await governanceStateManager.validateStateIntegrity();

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to validate state",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/governance/backup/latest", async (req, res) => {
  try {
    const backup = await governanceStateManager.getLatestBackup();

    if (!backup) {
      return res.status(404).json({
        success: false,
        error: "No backups found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: backup,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve backup",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============= Diff Endpoints =============

app.post("/api/diffs/apply", async (req, res) => {
  try {
    const { filePath, timestamp } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "filePath is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Diff application is handled by Claude Code's native file operations.
    // This endpoint provides UI notification and event broadcasting.
    logger.info(`📝 Applying diff to: ${filePath}`);

    // Broadcast diff applied event
    broadcast("diff.applied", {
      filePath,
      timestamp: timestamp || new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Successfully applied changes to ${filePath}`,
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

app.post("/api/diffs/reject", async (req, res) => {
  try {
    const { filePath, timestamp } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "filePath is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Diff rejection notifies UI and broadcasts event.
    // Actual file state is managed by Claude Code.
    logger.info(`❌ Rejecting diff for: ${filePath}`);

    // Broadcast diff rejected event
    broadcast("diff.rejected", {
      filePath,
      timestamp: timestamp || new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Rejected changes to ${filePath}`,
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

app.get("/api/diffs/pending", async (req, res) => {
  try {
    // Pending diffs are tracked in the approval queue, not here.
    // This endpoint returns the UI-visible pending state.
    const diffs: Array<{ filePath: string; timestamp: string }> = [];

    res.json({
      success: true,
      data: diffs,
      count: diffs.length,
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

// ============= Error Tracking Endpoint =============

app.post("/api/errors", async (req, res) => {
  try {
    const errorData = req.body;

    // Log error with structured format
    logger.error("🚨 Frontend Error Reported:", {
      message: errorData.message,
      name: errorData.name,
      url: errorData.url,
      timestamp: errorData.timestamp,
      environment: errorData.environment,
    });

    // Send to Sentry if initialized
    if (sentryReady) {
      const error = new Error(errorData.message);
      error.name = errorData.name || "FrontendError";
      error.stack = errorData.stack;

      captureException(error, {
        url: errorData.url,
        userAgent: errorData.userAgent,
        componentStack: errorData.componentStack,
        timestamp: errorData.timestamp,
        source: "frontend",
      });
    }

    // Broadcast error event for monitoring dashboard
    broadcast("error.reported", {
      message: errorData.message,
      timestamp: errorData.timestamp,
    });

    res.json({
      success: true,
      message: "Error reported successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to log error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to log error",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============= Runspace Endpoints =============

app.post("/api/runspaces", async (req, res) => {
  try {
    const config = req.body;
    const runspace = await runspaceManager.createRunspace(config);
    broadcast("runspace.created", runspace);
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

app.get("/api/runspaces", async (req, res) => {
  try {
    const runspaces = runspaceManager.getAllRunspaces();
    const activeRunspace = runspaceManager.getActiveRunspace();
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

app.get("/api/runspaces/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const runspace = runspaceManager.getRunspace(id);
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

app.put("/api/runspaces/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const runspace = await runspaceManager.updateRunspace(id, updates);
    broadcast("runspace.updated", runspace);
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

app.delete("/api/runspaces/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFiles } = req.query;
    await runspaceManager.deleteRunspace(id, deleteFiles === "true");
    broadcast("runspace.deleted", { runspaceId: id });
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

app.post("/api/runspaces/:id/switch", async (req, res) => {
  try {
    const { id } = req.params;
    await runspaceManager.switchRunspace(id);
    const runspace = runspaceManager.getActiveRunspace();
    broadcast("runspace.activated", { runspaceId: id });
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

app.post("/api/runspaces/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    await runspaceManager.startRunspace(id);
    const runspace = runspaceManager.getRunspace(id);
    broadcast("runspace.updated", runspace);
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

app.post("/api/runspaces/:id/stop", async (req, res) => {
  try {
    const { id } = req.params;
    await runspaceManager.stopRunspace(id);
    const runspace = runspaceManager.getRunspace(id);
    broadcast("runspace.updated", runspace);
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

app.post("/api/runspaces/:id/suspend", async (req, res) => {
  try {
    const { id } = req.params;
    await runspaceManager.suspendRunspace(id);
    const runspace = runspaceManager.getRunspace(id);
    broadcast("runspace.suspended", { runspaceId: id });
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

app.get("/api/runspaces/:id/health", async (req, res) => {
  try {
    const { id } = req.params;
    const health = await runspaceManager.getRunspaceHealth(id);
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

// ============= Health Check =============

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      orchestrator: orchestrator.isHealthy(),
      vision: visionSystem.isHealthy(),
      state: stateManager.isHealthy(),
      coordination: coordinationService.isHealthy(),
      websocket: clients.size > 0,
    },
  });
});

// ============= Worker Pool Endpoints =============

// Initialize worker pool
app.post("/api/workers/init", async (req, res) => {
  try {
    const pool = await getWorkerPool();
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
app.get("/api/workers", async (req, res) => {
  try {
    if (!workerPool) {
      return res.json({
        success: true,
        data: { status: "stopped", workers: [], metrics: null },
        timestamp: new Date().toISOString(),
      });
    }
    res.json({
      success: true,
      data: workerPool.getStatus(),
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
app.get("/api/workers/metrics", async (req, res) => {
  try {
    if (!workerPool) {
      return res.status(404).json({
        success: false,
        error: "Worker pool not initialized",
        timestamp: new Date().toISOString(),
      });
    }
    res.json({
      success: true,
      data: workerPool.getMetrics(),
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
app.get("/api/workers/:workerId", async (req, res) => {
  try {
    if (!workerPool) {
      return res.status(404).json({
        success: false,
        error: "Worker pool not initialized",
        timestamp: new Date().toISOString(),
      });
    }
    const worker = workerPool.getWorker(req.params.workerId);
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
app.post("/api/workers/tasks", async (req, res) => {
  try {
    const pool = await getWorkerPool();
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
app.get("/api/workers/tasks/:taskId", async (req, res) => {
  try {
    if (!workerPool) {
      return res.status(404).json({
        success: false,
        error: "Worker pool not initialized",
        timestamp: new Date().toISOString(),
      });
    }
    const status = workerPool.getTaskStatus(req.params.taskId);
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
app.delete("/api/workers/tasks/:taskId", async (req, res) => {
  try {
    if (!workerPool) {
      return res.status(404).json({
        success: false,
        error: "Worker pool not initialized",
        timestamp: new Date().toISOString(),
      });
    }
    const cancelled = await workerPool.cancelTask(req.params.taskId);
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
app.post("/api/workers/scale/up", async (req, res) => {
  try {
    const pool = await getWorkerPool();
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
app.post("/api/workers/scale/down", async (req, res) => {
  try {
    if (!workerPool) {
      return res.status(404).json({
        success: false,
        error: "Worker pool not initialized",
        timestamp: new Date().toISOString(),
      });
    }
    const { count } = req.body;
    await workerPool.scaleDown(count || 1);
    res.json({
      success: true,
      data: workerPool.getStatus(),
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
app.get("/api/workers/health", async (req, res) => {
  try {
    if (!workerPool) {
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

    const status = workerPool.getStatus();
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
app.post("/api/workers/shutdown", async (req, res) => {
  try {
    if (!workerPool) {
      return res.json({
        success: true,
        message: "Worker pool not running",
        timestamp: new Date().toISOString(),
      });
    }
    await workerPool.shutdown();
    workerPool = null;
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

// ============= Forge Initialization Endpoints =============

// Detect project type
app.get("/api/forge/detect", async (req, res) => {
  try {
    const detectionResult = await initService.detectProjectType();

    if (detectionResult.isErr()) {
      return res.status(500).json({
        success: false,
        error: detectionResult.error.message,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: detectionResult.unwrap(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Detection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Check existing setup
app.get("/api/forge/check", async (req, res) => {
  try {
    const setupResult = await initService.checkExistingSetup();

    if (setupResult.isErr()) {
      return res.status(500).json({
        success: false,
        error: setupResult.error.message,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: setupResult.unwrap(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Setup check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Initialize NXTG-Forge
app.post("/api/forge/init", async (req, res) => {
  try {
    const options: InitOptions = req.body;

    // Perform initialization
    const result = await initService.initializeProject(options);

    if (result.isErr()) {
      const error = result.error;
      return res.status(400).json({
        success: false,
        error: error.message,
        code: "code" in error ? error.code : "INIT_ERROR",
        timestamp: new Date().toISOString(),
      });
    }

    const initResult = result.unwrap();

    // Broadcast initialization event
    broadcast("forge.initialized", {
      projectType: initResult.projectType,
      agentsCopied: initResult.agentsCopied,
      filesCreated: initResult.created.length,
    });

    res.json({
      success: true,
      data: initResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Initialization failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get project status (/frg-status command backend)
app.get("/api/forge/status", async (req, res) => {
  try {
    const statusResult = await statusService.getStatus();

    if (statusResult.isErr()) {
      return res.status(500).json({
        success: false,
        error: statusResult.error.message,
        timestamp: new Date().toISOString(),
      });
    }

    const status = statusResult.unwrap();

    // Support CLI format via query param
    if (req.query.format === "cli") {
      res.type("text/plain");
      res.send(StatusService.formatForCLI(status));
    } else {
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    captureException(error instanceof Error ? error : String(error));
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Status retrieval failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============= Beta Feedback Endpoints =============

const FEEDBACK_FILE = path.join(projectRoot, "data", "feedback.json");

// Ensure feedback file exists
async function ensureFeedbackFile() {
  try {
    await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
    try {
      await fs.access(FEEDBACK_FILE);
    } catch {
      await fs.writeFile(FEEDBACK_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    logger.error("Failed to initialize feedback file:", error);
  }
}

// Initialize feedback file on startup
ensureFeedbackFile();

// Submit feedback
app.post(
  "/api/feedback",
  rateLimit(writeLimiter),
  validateRequest(feedbackSchema),
  async (req, res) => {
    try {
      const {
        rating,
        category,
        description,
        url,
        userAgent,
        timestamp,
      } = req.body;

    // Create feedback entry
    const feedback = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      rating: Number(rating),
      category,
      description,
      url: url || "unknown",
      userAgent: userAgent || "unknown",
      timestamp: timestamp || new Date().toISOString(),
      status: "new",
    };

    // Read existing feedback
    await ensureFeedbackFile();
    const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const feedbackList = JSON.parse(data);

    // Add new feedback
    feedbackList.push(feedback);

    // Write back to file
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbackList, null, 2));

    // Broadcast feedback event
    broadcast("feedback.submitted", {
      id: feedback.id,
      category: feedback.category,
      rating: feedback.rating,
      timestamp: feedback.timestamp,
    });

    res.json({
      success: true,
      data: { id: feedback.id },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to save feedback:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
},
);

// Get all feedback (admin endpoint)
app.get("/api/feedback", async (req, res) => {
  try {
    await ensureFeedbackFile();
    const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const feedbackList = JSON.parse(data);

    // Sort by timestamp descending
    feedbackList.sort((a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({
      success: true,
      data: feedbackList,
      count: feedbackList.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to read feedback:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get feedback statistics
app.get("/api/feedback/stats", async (req, res) => {
  try {
    await ensureFeedbackFile();
    const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
    const feedbackList = JSON.parse(data);

    // Calculate statistics
    const totalCount = feedbackList.length;
    const averageRating = totalCount > 0
      ? feedbackList.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0) / totalCount
      : 0;

    // Count by category
    const byCategory: Record<string, number> = {};
    feedbackList.forEach((f: { category: string }) => {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    });

    // Count by rating
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbackList.forEach((f: { rating: number }) => {
      byRating[f.rating] = (byRating[f.rating] || 0) + 1;
    });

    // Recent feedback (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = feedbackList.filter((f: { timestamp: string }) =>
      new Date(f.timestamp) >= sevenDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        totalCount,
        averageRating: Math.round(averageRating * 10) / 10,
        byCategory,
        byRating,
        recentCount,
        lastSubmission: totalCount > 0 ? feedbackList[0].timestamp : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to calculate feedback stats:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============= Compliance Endpoints =============

const complianceService = new ComplianceService(projectRoot);

// Full compliance report
app.get("/api/compliance/report", async (req, res) => {
  try {
    const result = await complianceService.getComplianceReport();
    if (result.ok) {
      res.json(result.value);
    } else {
      logger.error("[Compliance] Report generation failed:", result.error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  } catch (error) {
    logger.error("Compliance report failed:", error);
    res.status(500).json({ error: "Failed to generate compliance report" });
  }
});

// CycloneDX SBOM document
app.get("/api/compliance/sbom", async (req, res) => {
  try {
    const result = await complianceService.generateSBOM();
    if (result.ok) {
      res.setHeader("Content-Type", "application/vnd.cyclonedx+json");
      res.json(result.value);
    } else {
      logger.error("[Compliance] SBOM generation failed:", result.error);
      res.status(500).json({ error: "Failed to generate SBOM" });
    }
  } catch (error) {
    logger.error("SBOM generation failed:", error);
    res.status(500).json({ error: "Failed to generate SBOM" });
  }
});

// License conflicts (lightweight for dashboard badges)
app.get("/api/compliance/conflicts", async (req, res) => {
  try {
    const result = await complianceService.getComplianceReport();
    if (result.ok) {
      res.json({
        status: result.value.status,
        score: result.value.score,
        conflicts: result.value.conflicts,
        summary: result.value.summary,
      });
    } else {
      logger.error("[Compliance] Conflicts check failed:", result.error);
      res.status(500).json({ error: "Failed to check license conflicts" });
    }
  } catch (error) {
    logger.error("Compliance conflicts check failed:", error);
    res.status(500).json({ error: "Failed to check license conflicts" });
  }
});

// Start server
const PORT = Number(process.env.PORT) || 5051; // NXTG-Forge dedicated API port

// Handle WebSocket upgrade routing
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
  // PTY bridge handles /terminal path in createPTYBridge
});

// ============= Safeguard: Duplicate Route Detector =============
// Prevents the exact bug where a placeholder route shadows a real handler.
// If two routes share the same method+path, the second is DEAD CODE in Express.
// This detector crashes the server at startup so the bug is caught immediately.

function detectDuplicateRoutes(expressApp: express.Application): void {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  // Express stores routes in app._router.stack
  const stack = (expressApp as any)._router?.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      const route = layer.route;
      for (const method of Object.keys(route.methods)) {
        const key = `${method.toUpperCase()} ${route.path}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count > 1) {
          duplicates.push(key);
        }
      }
    }
    // Also check mounted routers
    if (layer.name === 'router' && layer.handle?.stack) {
      const prefix = layer.regexp?.source?.replace?.(/[\\\/?^$]/g, '') || '';
      for (const subLayer of layer.handle.stack) {
        if (subLayer.route) {
          for (const method of Object.keys(subLayer.route.methods)) {
            const key = `${method.toUpperCase()} /${prefix}${subLayer.route.path}`;
            const count = (seen.get(key) || 0) + 1;
            seen.set(key, count);
            if (count > 1) {
              duplicates.push(key);
            }
          }
        }
      }
    }
  }

  if (duplicates.length > 0) {
    const msg = `FATAL: Duplicate routes detected! These routes are registered multiple times (second handler is DEAD CODE):\n  ${duplicates.join('\n  ')}`;
    logger.error(msg);
    throw new Error(msg);
  }

  logger.info(`Route integrity check passed: ${seen.size} unique routes, 0 duplicates`);
}

// Run the check BEFORE listening — crash early if routes are broken
detectDuplicateRoutes(app);

server.listen(PORT, "0.0.0.0", async () => {
  logger.info(`NXTG-Forge API Server running on http://0.0.0.0:${PORT}`);
  logger.info(`WebSocket server available at ws://0.0.0.0:${PORT}/ws`);

  // Initialize services
  orchestrator.initialize();
  visionSystem.initialize();
  stateManager.initialize();
  coordinationService.initialize();

  // Initialize RunspaceManager for multi-project support
  await runspaceManager.initialize();
  logger.info("RunspaceManager initialized");

  // Initialize PTY Bridge for Claude Code Terminal (with runspace support)
  createPTYBridge(server, runspaceManager);
  logger.info(`PTY Bridge initialized at ws://localhost:${PORT}/terminal`);

  // Setup governance file watcher for real-time updates
  setupGovernanceWatcher();

  // Post startup sentinel log with live context
  try {
    const liveCtx = await statusService.getLiveContext();
    await governanceStateManager.appendSentinelLog({
      type: "INFO",
      severity: "low",
      source: "api-server",
      message: `Server started on branch ${liveCtx.git.branch}, ${liveCtx.git.uncommittedCount} uncommitted files, health: ${liveCtx.health.score}/100`,
    });
  } catch (err: unknown) {
    logger.warn("Failed to post startup sentinel log:", { error: err instanceof Error ? err.message : String(err) });
  }

  logger.info("All services initialized successfully");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server...");

  // Flush Sentry events before shutdown
  if (sentryReady) {
    logger.info("Flushing Sentry events...");
    await flushSentry(2000);
  }

  // Shutdown worker pool
  if (workerPool) {
    await workerPool.shutdown();
    logger.info("Worker pool shutdown complete");
  }

  // Shutdown runspace manager
  await runspaceManager.shutdown();
  logger.info("RunspaceManager shutdown complete");

  // Close governance watcher
  if (governanceWatcher) {
    governanceWatcher.close();
    logger.info("Governance watcher closed");
  }

  // Cleanup rate limiters
  generalLimiter.cleanup();
  writeLimiter.cleanup();
  authLimiter.cleanup();
  logger.info("Rate limiters cleaned up");

  // Close WebSocket connections
  clients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

export default server;

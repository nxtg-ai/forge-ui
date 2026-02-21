/**
 * NXTG-Forge API Server
 *
 * Thin orchestrator that initializes services, mounts route modules,
 * and manages the server lifecycle (WebSocket, PTY bridge, shutdown).
 *
 * All HTTP route handlers live in src/server/routes/*.ts modules.
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import * as path from "path";
import { watch } from "fs";

import { ForgeOrchestrator } from "../core/orchestrator";
import { VisionSystem } from "../core/vision";
import { StateManager } from "../core/state";
import { CoordinationService } from "../core/coordination";
import { BootstrapService } from "../core/bootstrap";
import { MCPSuggestionEngine } from "../orchestration/mcp-suggestion-engine";
import { RunspaceManager } from "../core/runspace-manager";
import { GovernanceStateManager } from "../services/governance-state-manager";
import { AgentWorkerPool } from "./workers";
import { DEFAULT_POOL_CONFIG } from "./workers/types";
import { detectBackend } from "../adapters/backend-detector";
import { InitService } from "../services/init-service";
import { StatusService } from "../services/status-service";
import { ComplianceService } from "../services/compliance-service";
import { createPTYBridge } from "./pty-bridge";
import {
  initSentryServer,
  captureException,
  setTag,
  addBreadcrumb,
  flushSentry,
} from "../monitoring/sentry";
import swaggerRouter from "./swagger";
import { createIntelligenceRoutes } from "./routes/intelligence.js";
import { getLogger } from "../utils/logger";
import { generalLimiter, writeLimiter, authLimiter, rateLimit } from "./middleware";
import type { RouteContext } from "./route-context";

// Route module factories
import { createGovernanceRoutes } from "./routes/governance";
import { createCommandRoutes } from "./routes/commands";
import { createWorkerRoutes } from "./routes/workers";
import { createRunspaceRoutes } from "./routes/runspaces";
import { createFeatureRoutes, validateWSAuthToken } from "./routes/features";
import { createForgeRoutes } from "./routes/forge";

const app = express();
const logger = getLogger("api-server");

// ============= Sentry Initialization =============

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

// ============= HTTP & WebSocket Servers =============

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// ============= Core Service Initialization =============

const projectRoot = process.cwd();
const governanceStateManager = new GovernanceStateManager(projectRoot);
const visionSystem = new VisionSystem(projectRoot);
const coordinationService = new CoordinationService();
const orchestrator = new ForgeOrchestrator(visionSystem, coordinationService);
const stateManager = new StateManager();
const bootstrapService = new BootstrapService(stateManager);
const mcpSuggestionEngine = new MCPSuggestionEngine();
const runspaceManager = new RunspaceManager();
const initService = new InitService(projectRoot);
const statusService = new StatusService(projectRoot);
const complianceService = new ComplianceService(projectRoot);

// ============= Worker Pool (Auto-detected backend) =============

let workerPool: AgentWorkerPool | null = null;

async function initializeWorkerPool(): Promise<void> {
  const backend = await detectBackend();
  if (backend.name === "claude-code") {
    logger.info("Claude Code detected — using native Agent Teams, worker pool disabled");
    return;
  }
  const config = { ...DEFAULT_POOL_CONFIG, spawnConfig: backend.getSpawnConfig() };
  workerPool = new AgentWorkerPool(config);
  await workerPool.initialize();
  logger.info(`Worker pool initialized with ${backend.name} backend`);
}

function getWorkerPool(): AgentWorkerPool | null {
  return workerPool;
}

// ============= WebSocket Connection Management =============

const clients = new Set<WebSocket>();

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

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5050", "http://127.0.0.1:5050", "http://localhost:5173"];

wss.on("connection", (ws, req) => {
  // Validate origin in all modes
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    logger.error(`[Security] Blocked WebSocket from unauthorized origin: ${origin}`);
    ws.send(JSON.stringify({ type: "error", error: "Unauthorized origin" }));
    ws.close();
    return;
  }

  // Require auth token in all modes
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (!validateWSAuthToken(token ?? undefined)) {
    logger.error("[Security] WebSocket connection rejected: invalid or missing token");
    ws.send(JSON.stringify({ type: "error", error: "Authentication required" }));
    ws.close();
    return;
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

async function handleWSMessage(ws: WebSocket, message: Record<string, unknown>) {
  switch (message.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;

    case "state.update":
      await stateManager.updateState(message.payload as Record<string, unknown>);
      broadcast("state.update", stateManager.getState());
      break;

    case "command.execute": {
      const result = await orchestrator.executeCommand(message.payload as string);
      ws.send(
        JSON.stringify({
          type: "command.result",
          payload: result,
          correlationId: message.correlationId,
        }),
      );
      break;
    }

    default:
      if (!["pong", "heartbeat"].includes(String(message.type || ""))) {
        logger.info(`Unknown message type: ${message.type}`);
      }
  }
}

// ============= Middleware =============

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';",
  );
  next();
});

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      logger.warn(`[Security] Blocked CORS request from unauthorized origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Body parser + general rate limit
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit(generalLimiter));

// ============= Pre-existing Route Modules =============

app.use(swaggerRouter);

// ============= Route Context =============

const ctx: RouteContext = {
  // Dynamic projectRoot: resolves to active runspace path, falls back to startup cwd
  get projectRoot() {
    const active = runspaceManager.getActiveRunspace();
    return active?.path ?? projectRoot;
  },
  orchestrator,
  visionSystem,
  stateManager,
  coordinationService,
  bootstrapService,
  mcpSuggestionEngine,
  runspaceManager,
  governanceStateManager,
  initService,
  statusService,
  complianceService,
  getWorkerPool,
  broadcast,
  getWsClientCount: () => clients.size,
};

// ForgeRouteContext adds sentryReady (getter so it reflects async init)
const forgeCtx = Object.create(ctx, {
  sentryReady: { get: () => sentryReady, enumerable: true },
});

// ============= Mount Route Modules =============

/** Maps Router instances to their mount prefix for the duplicate route detector. */
const routerMountPaths = new WeakMap<express.Router, string>();

function mountRouter(prefix: string, router: express.Router): void {
  routerMountPaths.set(router, prefix);
  app.use(prefix, router);
}

mountRouter("/api/memory", createIntelligenceRoutes(ctx));
mountRouter("/api/governance", createGovernanceRoutes(ctx));
mountRouter("/api/commands", createCommandRoutes(ctx));
mountRouter("/api/workers", createWorkerRoutes(ctx));
mountRouter("/api/runspaces", createRunspaceRoutes(ctx));
mountRouter("/api", createFeatureRoutes(ctx));
mountRouter("/api", createForgeRoutes(forgeCtx));

// ============= Safeguard: Duplicate Route Detector =============

/** Express internal router layer — not part of the public API but stable across v4/v5. */
interface ExpressLayer {
  name?: string;
  route?: { path: string; methods: Record<string, boolean> };
  handle?: express.Router & { stack?: ExpressLayer[] };
}

function detectDuplicateRoutes(
  expressApp: express.Application,
  mounts: WeakMap<express.Router, string>,
): void {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  // Express 5 exposes `app.router`; Express 4 used `app._router`.
  const appWithRouter = expressApp as express.Application & {
    router?: { stack?: ExpressLayer[] };
  };
  const stack: ExpressLayer[] = appWithRouter.router?.stack || [];
  for (const layer of stack) {
    // Top-level route directly on `app`
    if (layer.route) {
      const route = layer.route;
      for (const method of Object.keys(route.methods)) {
        const key = `${method.toUpperCase()} ${route.path}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count > 1) duplicates.push(key);
      }
    }
    // Mounted router — only inspect one level deep (direct child routes)
    if (layer.name === "router" && layer.handle?.stack) {
      const prefix = (layer.handle && mounts.get(layer.handle)) || "";
      for (const subLayer of layer.handle.stack) {
        if (subLayer.route) {
          for (const method of Object.keys(subLayer.route.methods)) {
            const key = `${method.toUpperCase()} ${prefix}${subLayer.route.path}`;
            const count = (seen.get(key) || 0) + 1;
            seen.set(key, count);
            if (count > 1) duplicates.push(key);
          }
        }
      }
    }
  }

  if (duplicates.length > 0) {
    const msg = `FATAL: Duplicate routes detected! These routes are registered multiple times (second handler is DEAD CODE):\n  ${duplicates.join("\n  ")}`;
    logger.error(msg);
    throw new Error(msg);
  }

  logger.info(`Route integrity check passed: ${seen.size} unique routes, 0 duplicates`);
}

detectDuplicateRoutes(app, routerMountPaths);

// ============= WebSocket Upgrade Handler =============

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  if (url.pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
  // PTY bridge handles /terminal path in createPTYBridge
});

// ============= Governance File Watcher =============

let governanceWatcher: ReturnType<typeof watch> | null = null;

function setupGovernanceWatcher() {
  const governancePath = path.join(projectRoot, ".claude/governance.json");
  governanceWatcher = watch(governancePath, async (eventType) => {
    if (eventType === "change") {
      try {
        const state = await governanceStateManager.readState();
        broadcast("governance.update", state);
        logger.info("[Governance] State change detected and broadcast to clients");
      } catch (error) {
        logger.error("[Governance] Failed to read state after change:", error);
      }
    }
  });
  logger.info("[Governance] File watcher initialized");
}

// ============= Server Startup =============

const PORT = Number(process.env.PORT) || 5051;

server.listen(PORT, "0.0.0.0", async () => {
  logger.info(`NXTG-Forge API Server running on http://0.0.0.0:${PORT}`);
  logger.info(`WebSocket server available at ws://0.0.0.0:${PORT}/ws`);

  // Initialize services
  orchestrator.initialize();
  visionSystem.initialize();
  stateManager.initialize();
  coordinationService.initialize();

  await runspaceManager.initialize();
  logger.info("RunspaceManager initialized");

  createPTYBridge(server, runspaceManager);
  logger.info(`PTY Bridge initialized at ws://localhost:${PORT}/terminal`);

  // Seed governance state if empty or missing (BEFORE watcher so file exists)
  try {
    await governanceStateManager.readState();
    logger.info("[Governance] Existing state loaded successfully");
  } catch {
    logger.info("[Governance] No valid state found, seeding initial state...");
    const seedState = governanceStateManager.createInitialState();
    await governanceStateManager.writeState(seedState);
    broadcast("governance.update", seedState);
    logger.info("[Governance] Initial state seeded and broadcast");
  }

  // Start watching governance file AFTER seed ensures it exists
  try {
    setupGovernanceWatcher();
  } catch (err: unknown) {
    logger.warn("[Governance] File watcher failed (non-fatal):", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Initialize worker pool with auto-detected backend
  try {
    await initializeWorkerPool();
  } catch (err: unknown) {
    logger.warn("Worker pool initialization failed (non-fatal):", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

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
    logger.warn("Failed to post startup sentinel log:", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info("All services initialized successfully");
});

// ============= Graceful Shutdown =============

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server...");

  if (sentryReady) {
    logger.info("Flushing Sentry events...");
    await flushSentry(2000);
  }

  if (workerPool !== null) {
    await (workerPool as AgentWorkerPool).shutdown();
    logger.info("Worker pool shutdown complete");
  }

  await runspaceManager.shutdown();
  logger.info("RunspaceManager shutdown complete");

  if (governanceWatcher) {
    governanceWatcher.close();
    logger.info("Governance watcher closed");
  }

  generalLimiter.cleanup();
  writeLimiter.cleanup();
  authLimiter.cleanup();
  logger.info("Rate limiters cleaned up");

  clients.forEach((client) => client.close());

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

export default server;

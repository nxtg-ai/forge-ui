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

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Initialize Governance State Manager
const projectRoot = process.cwd();
const governanceStateManager = new GovernanceStateManager(projectRoot);

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
    console.log("[API] Worker pool initialized");
  }
  return workerPool;
}

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins for multi-device access (mobile, tablet, etc.)
    credentials: true,
  }),
);
app.use(express.json());

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

// WebSocket connection management
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("New WebSocket client connected");

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
      console.error("Invalid WebSocket message:", error);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("WebSocket client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(type: string, payload: any) {
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
async function handleWSMessage(ws: WebSocket, message: any) {
  switch (message.type) {
    case "ping":
      // Respond to heartbeat
      ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;

    case "state.update":
      await stateManager.updateState(message.payload);
      broadcast("state.update", stateManager.getState());
      break;

    case "command.execute":
      const result = await orchestrator.executeCommand(message.payload);
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
      if (!['pong', 'heartbeat'].includes(message.type)) {
        console.log("Unknown message type:", message.type);
      }
  }
}

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

app.post("/api/vision/capture", async (req, res) => {
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
});

app.get("/api/vision/history", async (req, res) => {
  try {
    const history = await visionSystem.getVisionHistory();
    res.json({
      success: true,
      data: history.map((event: any) => ({
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
        violations: result.violations?.map((v: any) => v.reason || v.principle),
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

    console.log(
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
    console.error("MCP suggestion error:", error);
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
function extractTechStack(vision: any, category: string): string | undefined {
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

function detectIndustry(vision: any): string | undefined {
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

app.post("/api/agents/:agentId/tasks", async (req, res) => {
  try {
    const { agentId } = req.params;
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
});

// ============= Command Endpoints =============

app.post("/api/commands/execute", async (req, res) => {
  try {
    const command = req.body;
    const result = await orchestrator.executeCommand(command);

    // Broadcast command execution
    broadcast("command.executed", {
      command,
      result,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: { result },
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
    } catch (error: any) {
      if (error.code === "ENOENT") {
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
    } catch (error: any) {
      if (error.code === "ENOENT") {
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

    // TODO: Implement actual diff application logic
    // For now, simulate success
    console.log(`📝 Applying diff to: ${filePath}`);

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

    // TODO: Implement actual diff rejection logic
    console.log(`❌ Rejecting diff for: ${filePath}`);

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
    // TODO: Implement actual pending diffs retrieval
    // For now, return empty array
    const diffs: any[] = [];

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
    console.error("🚨 Frontend Error Reported:", {
      message: errorData.message,
      name: errorData.name,
      url: errorData.url,
      timestamp: errorData.timestamp,
      environment: errorData.environment,
    });

    // In production, this would forward to Sentry/LogRocket/etc.
    // For now, we just log it
    if (process.env.NODE_ENV === "production") {
      // TODO: Forward to external error tracking service
      // Example: Sentry.captureException(errorData);
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
    console.error("Failed to log error:", error);
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

    const taskId = await pool.submitTask({
      type,
      priority: priority || "medium",
      command,
      args,
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

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`NXTG-Forge API Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server available at ws://0.0.0.0:${PORT}/ws`);

  // Initialize services
  orchestrator.initialize();
  visionSystem.initialize();
  stateManager.initialize();
  coordinationService.initialize();

  // Initialize RunspaceManager for multi-project support
  await runspaceManager.initialize();
  console.log("RunspaceManager initialized");

  // Initialize PTY Bridge for Claude Code Terminal (with runspace support)
  createPTYBridge(server, runspaceManager);
  console.log(`PTY Bridge initialized at ws://localhost:${PORT}/terminal`);

  console.log("All services initialized successfully");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");

  // Shutdown worker pool
  if (workerPool) {
    await workerPool.shutdown();
    console.log("Worker pool shutdown complete");
  }

  // Shutdown runspace manager
  await runspaceManager.shutdown();
  console.log("RunspaceManager shutdown complete");

  // Close WebSocket connections
  clients.forEach((client) => {
    client.close();
  });

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default server;

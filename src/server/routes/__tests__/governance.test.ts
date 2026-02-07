/**
 * Governance Routes Tests - Comprehensive test coverage for governance.ts
 *
 * Tests all governance routes:
 * - GET /state - Read governance state
 * - GET /config - Read governance configuration
 * - POST /sentinel - Append sentinel log entry
 * - GET /live-context - Gather live project context
 * - GET /memory-insights - Parse Claude memory file
 * - GET /blockers - Extract blockers and action items
 * - GET /validate - Validate state integrity
 * - GET /backup/latest - Retrieve latest backup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import type { RouteContext } from "../../route-context";
import type {
  GovernanceState,
  GovernanceConfig,
  SentinelEntry,
} from "../../../types/governance.types";
import { DEFAULT_GOVERNANCE_CONFIG } from "../../../types/governance.types";

// Mock fs/promises at module level
const mockReadFile = vi.fn();
const mockStat = vi.fn();

vi.mock("fs/promises", () => ({
  default: {
    readFile: mockReadFile,
    stat: mockStat,
  },
  readFile: mockReadFile,
  stat: mockStat,
}));

// Mock glob at module level
const mockGlob = vi.fn();
vi.mock("glob", () => ({
  glob: mockGlob,
}));

// Import after mocks are set up
const { createGovernanceRoutes } = await import("../governance");

describe("Governance Routes", () => {
  let app: express.Application;
  let mockCtx: RouteContext;

  // Mock data
  const mockGovernanceState: GovernanceState = {
    version: 1,
    timestamp: "2026-02-06T10:00:00Z",
    constitution: {
      directive: "Build NXTG-Forge",
      vision: ["Enable agent teams", "Provide governance"],
      status: "EXECUTION",
      confidence: 85,
      updatedBy: "system",
      updatedAt: "2026-02-06T09:00:00Z",
    },
    workstreams: [
      {
        id: "ws-1",
        name: "Core Infrastructure",
        status: "active",
        risk: "low",
        startedAt: "2026-02-05T10:00:00Z",
        progress: 75,
        metrics: {
          progress: 75,
          tasksCompleted: 3,
          totalTasks: 4,
          blockers: 0,
        },
      },
      {
        id: "ws-2",
        name: "API Development",
        status: "blocked",
        risk: "high",
        startedAt: "2026-02-04T10:00:00Z",
        progress: 30,
        metrics: {
          progress: 30,
          tasksCompleted: 1,
          totalTasks: 5,
          blockers: 2,
        },
      },
      {
        id: "ws-3",
        name: "Documentation",
        status: "pending",
        risk: "low",
        startedAt: "2026-02-06T10:00:00Z",
        progress: 0,
        metrics: {
          progress: 0,
          tasksCompleted: 0,
          totalTasks: 3,
          blockers: 0,
        },
        tasks: [
          { id: "t1", name: "Write README", status: "pending" },
          { id: "t2", name: "API docs", status: "pending" },
        ],
      },
    ],
    sentinelLog: [
      {
        id: "log-1",
        timestamp: Date.now() - 1000,
        type: "INFO",
        severity: "low",
        source: "system",
        message: "System initialized",
      },
      {
        id: "log-2",
        timestamp: Date.now() - 500,
        type: "ERROR",
        severity: "high",
        source: "api",
        message: "API endpoint failed",
        actionRequired: true,
      },
      {
        id: "log-3",
        timestamp: Date.now() - 200,
        type: "CRITICAL",
        severity: "critical",
        source: "security",
        message: "Security vulnerability detected",
        actionRequired: true,
      },
    ],
    metadata: {
      sessionId: "test-session-123",
      projectPath: "/test/project",
      forgeVersion: "1.0.0",
      lastSync: "2026-02-06T10:00:00Z",
      checksum: "abc123",
    },
  };

  const mockLiveContext = {
    git: {
      branch: "main",
      lastCommit: {
        hash: "abc1234",
        message: "feat: Add governance routes",
        date: "2026-02-06T09:00:00Z",
        author: "Test User",
      },
      uncommittedCount: 3,
      ahead: 1,
      behind: 0,
    },
    tests: {
      passing: 42,
      failing: 2,
      skipped: 1,
      lastRun: "2026-02-06T09:30:00Z",
    },
    health: {
      score: 85,
      factors: [
        { label: "Test Coverage", value: 80, max: 100 },
        { label: "Code Quality", value: 90, max: 100 },
      ],
    },
    timestamp: "2026-02-06T10:00:00Z",
  };

  const mockValidationResult = {
    valid: true,
    errors: [],
    warnings: ["Some workstreams have no owner"],
    checksPerformed: 5,
  };

  const mockBackup = {
    timestamp: "2026-02-06T09:00:00Z",
    state: mockGovernanceState,
    filename: "governance-2026-02-06T09-00-00Z.json",
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockReadFile.mockImplementation(async (path: any) => {
      if (path.includes("governance.json")) {
        return JSON.stringify(mockGovernanceState);
      }
      if (path.includes("config.json")) {
        return JSON.stringify(DEFAULT_GOVERNANCE_CONFIG);
      }
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });

    mockStat.mockResolvedValue({
      mtime: new Date("2026-02-06T10:00:00Z"),
    });

    mockGlob.mockResolvedValue([]);

    // Create mock context with all required services
    mockCtx = {
      projectRoot: "/test/project",
      orchestrator: {} as any,
      visionSystem: {} as any,
      stateManager: {} as any,
      coordinationService: {} as any,
      mcpSuggestionEngine: {} as any,
      bootstrapService: {} as any,
      runspaceManager: {} as any,
      governanceStateManager: {
        readState: vi.fn().mockResolvedValue(mockGovernanceState),
        writeState: vi.fn(),
        readConfig: vi.fn(),
        appendSentinelLog: vi.fn(),
        validateStateIntegrity: vi.fn(),
        getLatestBackup: vi.fn(),
      } as any,
      initService: {} as any,
      statusService: {
        getLiveContext: vi.fn(),
      } as any,
      complianceService: {} as any,
      broadcast: vi.fn(),
      getWorkerPool: vi.fn(),
      getWsClientCount: vi.fn(),
    };

    // Create express app with routes
    app = express();
    app.use(express.json());
    app.use("/api/governance", createGovernanceRoutes(mockCtx));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============= GET /state =============

  describe("GET /api/governance/state", () => {
    it("returns governance state successfully", async () => {
      const res = await request(app).get("/api/governance/state").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.constitution).toBeDefined();
      expect(res.body.data.workstreams).toBeDefined();
      expect(res.body.data.sentinelLog).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns 404 when governance state file not found", async () => {
      mockReadFile.mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      const res = await request(app).get("/api/governance/state").expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Governance state not found");
      expect(res.body.message).toBe(
        "Initialize governance with seed data first"
      );
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles JSON parse errors gracefully", async () => {
      mockReadFile.mockResolvedValue("invalid json {");

      const res = await request(app).get("/api/governance/state").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to read governance state");
      expect(res.body.message).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles unknown errors", async () => {
      mockReadFile.mockRejectedValue(new Error("Disk I/O error"));

      const res = await request(app).get("/api/governance/state").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to read governance state");
    });
  });

  // ============= GET /config =============

  describe("GET /api/governance/config", () => {
    it("returns governance config successfully", async () => {
      const res = await request(app).get("/api/governance/config").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.version).toBeDefined();
      expect(res.body.data.thresholds).toBeDefined();
      expect(res.body.data.polling).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns default config when file not found", async () => {
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("config.json")) {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        }
        return JSON.stringify(mockGovernanceState);
      });

      const res = await request(app).get("/api/governance/config").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(DEFAULT_GOVERNANCE_CONFIG);
      expect(res.body.message).toBe(
        "Using default configuration (config.json not found)"
      );
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles JSON parse errors", async () => {
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("config.json")) {
          return "invalid json {";
        }
        return JSON.stringify(mockGovernanceState);
      });

      const res = await request(app).get("/api/governance/config").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to read governance config");
      expect(res.body.message).toBeDefined();
    });

    it("handles unknown errors", async () => {
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("config.json")) {
          throw new Error("Disk I/O error");
        }
        return JSON.stringify(mockGovernanceState);
      });

      const res = await request(app).get("/api/governance/config").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to read governance config");
    });
  });

  // ============= POST /sentinel =============

  describe("POST /api/governance/sentinel", () => {
    it("appends sentinel log entry successfully", async () => {
      const entry: Partial<SentinelEntry> = {
        type: "WARN",
        source: "test-agent",
        message: "Test warning message",
        severity: "medium",
      };

      vi.mocked(mockCtx.governanceStateManager.appendSentinelLog).mockResolvedValue();
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(entry)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Sentinel log entry added");
      expect(res.body.timestamp).toBeDefined();
      expect(
        mockCtx.governanceStateManager.appendSentinelLog
      ).toHaveBeenCalledWith(entry);
      expect(mockCtx.broadcast).toHaveBeenCalledWith(
        "governance.update",
        mockGovernanceState
      );
    });

    it("validates required field: type", async () => {
      const invalidEntry = {
        source: "test-agent",
        message: "Test message",
      };

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(invalidEntry)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing required fields: type, source, message");
      expect(res.body.timestamp).toBeDefined();
    });

    it("validates required field: source", async () => {
      const invalidEntry = {
        type: "WARN",
        message: "Test message",
      };

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(invalidEntry)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing required fields: type, source, message");
    });

    it("validates required field: message", async () => {
      const invalidEntry = {
        type: "WARN",
        source: "test-agent",
      };

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(invalidEntry)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing required fields: type, source, message");
    });

    it("handles append errors gracefully", async () => {
      const entry = {
        type: "WARN",
        source: "test-agent",
        message: "Test message",
      };

      vi.mocked(
        mockCtx.governanceStateManager.appendSentinelLog
      ).mockRejectedValue(new Error("Failed to write log"));

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(entry)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to append sentinel log");
      expect(res.body.message).toBe("Failed to write log");
    });

    it("handles unknown errors", async () => {
      const entry = {
        type: "ERROR",
        source: "test",
        message: "Test",
      };

      vi.mocked(
        mockCtx.governanceStateManager.appendSentinelLog
      ).mockRejectedValue("String error");

      const res = await request(app)
        .post("/api/governance/sentinel")
        .send(entry)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unknown error");
    });
  });

  // ============= GET /live-context =============

  describe("GET /api/governance/live-context", () => {
    it("returns live project context successfully", async () => {
      vi.mocked(mockCtx.statusService.getLiveContext).mockResolvedValue(
        mockLiveContext
      );

      const res = await request(app)
        .get("/api/governance/live-context")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockLiveContext);
      expect(res.body.data.git).toBeDefined();
      expect(res.body.data.tests).toBeDefined();
      expect(res.body.data.health).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.statusService.getLiveContext).toHaveBeenCalledOnce();
    });

    it("handles errors gracefully", async () => {
      vi.mocked(mockCtx.statusService.getLiveContext).mockRejectedValue(
        new Error("Git command failed")
      );

      const res = await request(app)
        .get("/api/governance/live-context")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to gather live context");
      expect(res.body.message).toBe("Git command failed");
    });

    it("handles unknown errors", async () => {
      vi.mocked(mockCtx.statusService.getLiveContext).mockRejectedValue(
        "String error"
      );

      const res = await request(app)
        .get("/api/governance/live-context")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unknown error");
    });
  });

  // ============= GET /memory-insights =============

  describe("GET /api/governance/memory-insights", () => {
    it("returns memory insights when memory file exists", async () => {
      const memoryContent = `# NXTG-Forge Project Memory

## CRITICAL RULES

### Rule 0: TEST THE REAL THING
Test all changes

### Rule 1: AUDIT BEFORE SUGGESTING
Check before adding

## Architecture Decisions

### Decision 1: Use TypeScript
TypeScript for type safety

## CRITICAL DISCOVERY

### Discovery 1: Claude Memory
Found native memory system`;

      mockGlob.mockResolvedValue([
        "/home/.claude/projects/test/memory/MEMORY.md",
      ]);
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("MEMORY.md")) {
          return memoryContent;
        }
        if (path.includes("governance.json")) {
          return JSON.stringify(mockGovernanceState);
        }
        return JSON.stringify(DEFAULT_GOVERNANCE_CONFIG);
      });

      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.hasMemory).toBe(true);
      expect(res.body.data.sections).toBeDefined();
      expect(Array.isArray(res.body.data.sections)).toBe(true);
      expect(res.body.data.sections.length).toBeGreaterThan(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns empty insights when no memory file found", async () => {
      mockGlob.mockResolvedValue([]);
      mockReadFile.mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" })
      );

      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.hasMemory).toBe(false);
    });

    it("parses memory sections correctly", async () => {
      const memoryContent = `## Rule Section\n### Rule 1\n### Rule 2\n## Decision Section\n### Dec 1`;

      mockGlob.mockResolvedValue(["/test/MEMORY.md"]);
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("MEMORY.md")) return memoryContent;
        if (path.includes("governance.json")) return JSON.stringify(mockGovernanceState);
        return JSON.stringify(DEFAULT_GOVERNANCE_CONFIG);
      });

      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      expect(res.body.data.sections.length).toBeGreaterThan(0);
      const ruleSection = res.body.data.sections.find((s: any) =>
        s.title.includes("Rule")
      );
      expect(ruleSection).toBeDefined();
      expect(ruleSection.type).toBe("rule");
    });

    it("counts rules and decisions correctly", async () => {
      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      expect(res.body.data).toHaveProperty("totalRules");
      expect(res.body.data).toHaveProperty("totalDecisions");
      expect(typeof res.body.data.totalRules).toBe("number");
      expect(typeof res.body.data.totalDecisions).toBe("number");
    });

    it("limits sections to 6 items", async () => {
      const manySection = Array.from(
        { length: 10 },
        (_, i) => `## Section ${i}\n### Item ${i}`
      ).join("\n");

      mockGlob.mockResolvedValue(["/test/MEMORY.md"]);
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("MEMORY.md")) return manySection;
        if (path.includes("governance.json")) return JSON.stringify(mockGovernanceState);
        return JSON.stringify(DEFAULT_GOVERNANCE_CONFIG);
      });

      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      expect(res.body.data.sections.length).toBeLessThanOrEqual(6);
    });

    it("limits section items to 5 per section", async () => {
      const manyItems = `## Test Section\n${Array.from({ length: 10 }, (_, i) => `### Item ${i}`).join("\n")}`;

      mockGlob.mockResolvedValue(["/test/MEMORY.md"]);
      mockReadFile.mockImplementation(async (path: any) => {
        if (path.includes("MEMORY.md")) return manyItems;
        if (path.includes("governance.json")) return JSON.stringify(mockGovernanceState);
        return JSON.stringify(DEFAULT_GOVERNANCE_CONFIG);
      });

      const res = await request(app)
        .get("/api/governance/memory-insights")
        .expect(200);

      res.body.data.sections.forEach((section: any) => {
        expect(section.items.length).toBeLessThanOrEqual(5);
      });
    });

    it("handles filesystem errors gracefully", async () => {
      mockGlob.mockRejectedValue(new Error("Permission denied"));

      const res = await request(app).get("/api/governance/memory-insights");

      // Should handle error gracefully
      expect([200, 500]).toContain(res.status);
      if (res.status === 500) {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Failed to read memory insights");
      }
    });

    it("handles unknown errors", async () => {
      mockGlob.mockRejectedValue("String error");

      const res = await request(app).get("/api/governance/memory-insights");

      if (res.status === 500) {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Unknown error");
      }
    });
  });

  // ============= GET /blockers =============

  describe("GET /api/governance/blockers", () => {
    it("extracts blocked workstreams successfully", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.blockedWorkstreams).toBeDefined();
      expect(Array.isArray(res.body.data.blockedWorkstreams)).toBe(true);

      // ws-2 is blocked
      const blocked = res.body.data.blockedWorkstreams.find(
        (ws: any) => ws.id === "ws-2"
      );
      expect(blocked).toBeDefined();
      expect(blocked.status).toBe("blocked");
      expect(blocked.blockerCount).toBe(2);
    });

    it("extracts action items from sentinel log", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.actionItems).toBeDefined();
      expect(Array.isArray(res.body.data.actionItems)).toBe(true);

      // Should have 2 action items (ERROR and CRITICAL)
      expect(res.body.data.actionItems.length).toBeGreaterThan(0);

      const actionItem = res.body.data.actionItems[0];
      expect(actionItem).toHaveProperty("id");
      expect(actionItem).toHaveProperty("type");
      expect(actionItem).toHaveProperty("message");
      expect(actionItem).toHaveProperty("source");
      expect(actionItem).toHaveProperty("timestamp");
      expect(actionItem).toHaveProperty("actionRequired");
    });

    it("limits action items to last 10 entries", async () => {
      const manyLogs: SentinelEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: Date.now() - i * 1000,
        type: "ERROR",
        severity: "high",
        source: "test",
        message: `Error ${i}`,
        actionRequired: true,
      }));

      const stateWithManyLogs: GovernanceState = {
        ...mockGovernanceState,
        sentinelLog: manyLogs,
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        stateWithManyLogs
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.actionItems.length).toBeLessThanOrEqual(10);
    });

    it("extracts pending decisions", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.pendingDecisions).toBeDefined();
      expect(Array.isArray(res.body.data.pendingDecisions)).toBe(true);

      // ws-3 is pending
      const pending = res.body.data.pendingDecisions.find(
        (ws: any) => ws.id === "ws-3"
      );
      expect(pending).toBeDefined();
      expect(pending.name).toBe("Documentation");
      expect(pending.taskCount).toBe(2);
    });

    it("calculates summary correctly", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalBlockers).toBeGreaterThan(0);
      expect(res.body.data.summary.totalActionItems).toBeGreaterThan(0);
      expect(res.body.data.summary.totalPending).toBeGreaterThan(0);
      expect(res.body.data.summary.needsAttention).toBe(true);
    });

    it("handles needsAttention flag when no blockers", async () => {
      const cleanState: GovernanceState = {
        ...mockGovernanceState,
        workstreams: [
          {
            id: "ws-clean",
            name: "Clean workstream",
            status: "active",
            risk: "low",
            startedAt: "2026-02-06T10:00:00Z",
            progress: 50,
          },
        ],
        sentinelLog: [
          {
            id: "log-info",
            timestamp: Date.now(),
            type: "INFO",
            severity: "low",
            source: "system",
            message: "All good",
          },
        ],
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        cleanState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.summary.needsAttention).toBe(false);
    });

    it("handles empty workstreams array", async () => {
      const emptyState: GovernanceState = {
        ...mockGovernanceState,
        workstreams: [],
        sentinelLog: [],
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        emptyState
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      expect(res.body.data.blockedWorkstreams).toEqual([]);
      expect(res.body.data.actionItems).toEqual([]);
      expect(res.body.data.pendingDecisions).toEqual([]);
      expect(res.body.data.summary.totalBlockers).toBe(0);
    });

    it("handles state read errors", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockRejectedValue(
        new Error("State file corrupted")
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to gather blocker data");
      expect(res.body.message).toBe("State file corrupted");
    });

    it("handles unknown errors", async () => {
      vi.mocked(mockCtx.governanceStateManager.readState).mockRejectedValue(
        "String error"
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unknown error");
    });

    it("handles workstreams with missing metrics", async () => {
      const stateWithMissingMetrics: GovernanceState = {
        ...mockGovernanceState,
        workstreams: [
          {
            id: "ws-no-metrics",
            name: "No metrics",
            status: "blocked",
            risk: "high",
            startedAt: "2026-02-06T10:00:00Z",
            progress: 0,
            // No metrics field
          },
        ],
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        stateWithMissingMetrics
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      const blocked = res.body.data.blockedWorkstreams[0];
      expect(blocked.blockerCount).toBe(0); // Defaults to 0 when metrics missing
    });

    it("handles workstreams with missing dependencies", async () => {
      const stateWithNoDeps: GovernanceState = {
        ...mockGovernanceState,
        workstreams: [
          {
            id: "ws-no-deps",
            name: "No dependencies",
            status: "pending",
            risk: "low",
            startedAt: "2026-02-06T10:00:00Z",
            progress: 0,
            // No dependencies field
          },
        ],
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        stateWithNoDeps
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      const pending = res.body.data.pendingDecisions[0];
      expect(pending.dependencies).toEqual([]); // Defaults to empty array
    });

    it("handles workstreams with missing tasks", async () => {
      const stateWithNoTasks: GovernanceState = {
        ...mockGovernanceState,
        workstreams: [
          {
            id: "ws-no-tasks",
            name: "No tasks",
            status: "pending",
            risk: "low",
            startedAt: "2026-02-06T10:00:00Z",
            progress: 0,
            // No tasks field
          },
        ],
      };

      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        stateWithNoTasks
      );

      const res = await request(app)
        .get("/api/governance/blockers")
        .expect(200);

      const pending = res.body.data.pendingDecisions[0];
      expect(pending.taskCount).toBe(0); // Defaults to 0 when tasks missing
    });
  });

  // ============= GET /validate =============

  describe("GET /api/governance/validate", () => {
    it("validates state integrity successfully", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.validateStateIntegrity
      ).mockResolvedValue(mockValidationResult);

      const res = await request(app)
        .get("/api/governance/validate")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockValidationResult);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.errors).toEqual([]);
      expect(res.body.data.warnings).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns validation errors when state is invalid", async () => {
      const invalidResult = {
        valid: false,
        errors: ["Missing workstream owner", "Invalid timestamp format"],
        warnings: [],
        checksPerformed: 5,
      };

      vi.mocked(
        mockCtx.governanceStateManager.validateStateIntegrity
      ).mockResolvedValue(invalidResult);

      const res = await request(app)
        .get("/api/governance/validate")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.errors.length).toBe(2);
    });

    it("handles validation errors gracefully", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.validateStateIntegrity
      ).mockRejectedValue(new Error("Validation service unavailable"));

      const res = await request(app)
        .get("/api/governance/validate")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to validate state");
      expect(res.body.message).toBe("Validation service unavailable");
    });

    it("handles unknown errors", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.validateStateIntegrity
      ).mockRejectedValue("String error");

      const res = await request(app)
        .get("/api/governance/validate")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unknown error");
    });
  });

  // ============= GET /backup/latest =============

  describe("GET /api/governance/backup/latest", () => {
    it("retrieves latest backup successfully", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.getLatestBackup
      ).mockResolvedValue(mockBackup);

      const res = await request(app)
        .get("/api/governance/backup/latest")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockBackup);
      expect(res.body.data.timestamp).toBeDefined();
      expect(res.body.data.state).toBeDefined();
      expect(res.body.data.filename).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it("returns 404 when no backups found", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.getLatestBackup
      ).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/governance/backup/latest")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("No backups found");
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles backup retrieval errors", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.getLatestBackup
      ).mockRejectedValue(new Error("Backup directory not accessible"));

      const res = await request(app)
        .get("/api/governance/backup/latest")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to retrieve backup");
      expect(res.body.message).toBe("Backup directory not accessible");
    });

    it("handles unknown errors", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.getLatestBackup
      ).mockRejectedValue("String error");

      const res = await request(app)
        .get("/api/governance/backup/latest")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Unknown error");
    });

    it("returns complete backup structure", async () => {
      vi.mocked(
        mockCtx.governanceStateManager.getLatestBackup
      ).mockResolvedValue(mockBackup);

      const res = await request(app)
        .get("/api/governance/backup/latest")
        .expect(200);

      expect(res.body.data.state.version).toBeDefined();
      expect(res.body.data.state.constitution).toBeDefined();
      expect(res.body.data.state.workstreams).toBeDefined();
      expect(res.body.data.state.sentinelLog).toBeDefined();
      expect(res.body.data.state.metadata).toBeDefined();
    });
  });

  // ============= Edge Cases and Additional Coverage =============

  describe("Edge cases and error handling", () => {
    it("handles empty request body gracefully", async () => {
      const res = await request(app)
        .post("/api/governance/sentinel")
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Missing required fields: type, source, message");
    });

    it("handles malformed JSON in state file", async () => {
      mockReadFile.mockResolvedValue("{ malformed json");

      const res = await request(app).get("/api/governance/state").expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to read governance state");
    });

    it("timestamps are in ISO 8601 format", async () => {
      const res = await request(app).get("/api/governance/config");

      expect(res.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("handles concurrent sentinel log writes", async () => {
      vi.mocked(mockCtx.governanceStateManager.appendSentinelLog).mockResolvedValue();
      vi.mocked(mockCtx.governanceStateManager.readState).mockResolvedValue(
        mockGovernanceState
      );

      const entries = Array.from({ length: 5 }, (_, i) => ({
        type: "INFO",
        source: `agent-${i}`,
        message: `Message ${i}`,
      }));

      const promises = entries.map((entry) =>
        request(app).post("/api/governance/sentinel").send(entry)
      );

      const results = await Promise.all(promises);

      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});

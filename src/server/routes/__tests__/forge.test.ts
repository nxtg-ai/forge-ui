/**
 * Forge Routes Tests - Comprehensive test coverage for all forge endpoints
 *
 * Tests all routes in forge.ts including:
 * - Diff endpoints (apply, reject, pending)
 * - Error tracking
 * - Health check
 * - Forge initialization (detect, check, init)
 * - Project status
 * - Feedback endpoints (submit, list, stats)
 * - Compliance endpoints (report, sbom, conflicts)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createForgeRoutes } from "../forge";
import type { RouteContext } from "../../route-context";
import { Result } from "../../../utils/result";

// Mock Sentry module before importing forge routes
vi.mock("../../../monitoring/sentry", () => ({
  captureException: vi.fn(),
}));

// Mock fs/promises for feedback endpoints
const mockFs = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue("[]"),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("fs/promises", () => ({
  ...mockFs,
  default: mockFs,
}));

// Create a mock RouteContext with all required properties
function createMockContext(overrides?: Partial<RouteContext & { getWsClientCount: () => number; sentryReady: boolean }>): RouteContext & { getWsClientCount: () => number; sentryReady: boolean } {
  return {
    projectRoot: "/test/project",
    orchestrator: {
      isHealthy: vi.fn().mockReturnValue(true),
    } as any,
    visionSystem: {
      isHealthy: vi.fn().mockReturnValue(true),
    } as any,
    stateManager: {
      isHealthy: vi.fn().mockReturnValue(true),
    } as any,
    coordinationService: {
      isHealthy: vi.fn().mockReturnValue(true),
    } as any,
    bootstrapService: {} as any,
    mcpSuggestionEngine: {} as any,
    runspaceManager: {} as any,
    governanceStateManager: {} as any,
    initService: {
      detectProjectType: vi.fn(),
      checkExistingSetup: vi.fn(),
      initializeProject: vi.fn(),
    } as any,
    statusService: {
      getStatus: vi.fn(),
    } as any,
    complianceService: {
      getComplianceReport: vi.fn(),
      generateSBOM: vi.fn(),
    } as any,
    getWorkerPool: vi.fn().mockReturnValue({}) as any,
    broadcast: vi.fn(),
    getWsClientCount: vi.fn().mockReturnValue(1),
    sentryReady: false,
    ...overrides,
  };
}

// Helper to create express app with routes
function createTestApp(ctx: RouteContext & { getWsClientCount: () => number; sentryReady: boolean }): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api", createForgeRoutes(ctx));
  return app;
}

describe("Forge Routes", () => {
  let mockCtx: RouteContext & { getWsClientCount: () => number; sentryReady: boolean };
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockContext();
    app = createTestApp(mockCtx);
  });

  // ============= Diff Endpoints =============

  describe("POST /api/diffs/apply", () => {
    it("applies diff successfully with valid filePath", async () => {
      const response = await request(app)
        .post("/api/diffs/apply")
        .send({ filePath: "/test/file.ts" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Successfully applied changes");
      expect(response.body.message).toContain("/test/file.ts");
      expect(response.body.timestamp).toBeDefined();
      expect(mockCtx.broadcast).toHaveBeenCalledWith("diff.applied", expect.objectContaining({
        filePath: "/test/file.ts",
      }));
    });

    it("applies diff with custom timestamp", async () => {
      const customTimestamp = "2026-01-01T00:00:00.000Z";
      const response = await request(app)
        .post("/api/diffs/apply")
        .send({ filePath: "/test/file.ts", timestamp: customTimestamp });

      expect(response.status).toBe(200);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("diff.applied", expect.objectContaining({
        filePath: "/test/file.ts",
        timestamp: customTimestamp,
      }));
    });

    it("returns 400 when filePath is missing", async () => {
      const response = await request(app)
        .post("/api/diffs/apply")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("filePath is required");
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns 400 when filePath is empty string", async () => {
      const response = await request(app)
        .post("/api/diffs/apply")
        .send({ filePath: "" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("filePath is required");
    });

    it("returns 400 when filePath is null", async () => {
      const response = await request(app)
        .post("/api/diffs/apply")
        .send({ filePath: null });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/diffs/reject", () => {
    it("rejects diff successfully with valid filePath", async () => {
      const response = await request(app)
        .post("/api/diffs/reject")
        .send({ filePath: "/test/file.ts" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("Rejected changes");
      expect(response.body.message).toContain("/test/file.ts");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("diff.rejected", expect.objectContaining({
        filePath: "/test/file.ts",
      }));
    });

    it("rejects diff with custom timestamp", async () => {
      const customTimestamp = "2026-01-01T00:00:00.000Z";
      const response = await request(app)
        .post("/api/diffs/reject")
        .send({ filePath: "/test/file.ts", timestamp: customTimestamp });

      expect(response.status).toBe(200);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("diff.rejected", expect.objectContaining({
        filePath: "/test/file.ts",
        timestamp: customTimestamp,
      }));
    });

    it("returns 400 when filePath is missing", async () => {
      const response = await request(app)
        .post("/api/diffs/reject")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("filePath is required");
    });
  });

  describe("GET /api/diffs/pending", () => {
    it("returns empty pending diffs list", async () => {
      const response = await request(app)
        .get("/api/diffs/pending");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // ============= Error Tracking Endpoint =============

  describe("POST /api/errors", () => {
    it("logs frontend error successfully", async () => {
      const errorData = {
        message: "Test error",
        name: "TestError",
        url: "/test/page",
        timestamp: "2026-01-01T00:00:00.000Z",
        environment: "test",
      };

      const response = await request(app)
        .post("/api/errors")
        .send(errorData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Error reported successfully");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("error.reported", {
        message: errorData.message,
        timestamp: errorData.timestamp,
      });
    });

    it("logs error with stack trace", async () => {
      const errorData = {
        message: "Test error",
        name: "TestError",
        stack: "Error: Test error\n    at test.ts:1:1",
        url: "/test/page",
        timestamp: "2026-01-01T00:00:00.000Z",
      };

      const response = await request(app)
        .post("/api/errors")
        .send(errorData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("logs error with component stack", async () => {
      const errorData = {
        message: "Test error",
        url: "/test/page",
        timestamp: "2026-01-01T00:00:00.000Z",
        componentStack: "at Component (test.tsx:1:1)",
      };

      const response = await request(app)
        .post("/api/errors")
        .send(errorData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("handles minimal error data", async () => {
      const errorData = {
        message: "Minimal error",
      };

      const response = await request(app)
        .post("/api/errors")
        .send(errorData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============= Health Check =============

  describe("GET /api/health", () => {
    it("returns healthy status when all services are healthy", async () => {
      const response = await request(app)
        .get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toEqual({
        orchestrator: true,
        vision: true,
        state: true,
        coordination: true,
        websocket: true,
      });
    });

    it("reports unhealthy orchestrator", async () => {
      mockCtx.orchestrator.isHealthy = vi.fn().mockReturnValue(false);
      app = createTestApp(mockCtx);

      const response = await request(app)
        .get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.services.orchestrator).toBe(false);
    });

    it("reports no websocket clients", async () => {
      mockCtx.getWsClientCount = vi.fn().mockReturnValue(0);
      app = createTestApp(mockCtx);

      const response = await request(app)
        .get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.services.websocket).toBe(false);
    });

    it("reports multiple websocket clients", async () => {
      mockCtx.getWsClientCount = vi.fn().mockReturnValue(5);
      app = createTestApp(mockCtx);

      const response = await request(app)
        .get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.services.websocket).toBe(true);
    });
  });

  // ============= Forge Initialization Endpoints =============

  describe("GET /api/forge/detect", () => {
    it("detects project type successfully", async () => {
      const detectionData = {
        projectType: "typescript",
        framework: "react",
        hasPackageJson: true,
        hasTsConfig: true,
      };

      mockCtx.initService.detectProjectType = vi.fn().mockResolvedValue(Result.ok(detectionData));

      const response = await request(app)
        .get("/api/forge/detect");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(detectionData);
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns 500 when detection fails", async () => {
      mockCtx.initService.detectProjectType = vi.fn().mockResolvedValue(
        Result.err(new Error("Detection failed"))
      );

      const response = await request(app)
        .get("/api/forge/detect");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Detection failed");
    });

    it("handles detection service throwing error", async () => {
      mockCtx.initService.detectProjectType = vi.fn().mockRejectedValue(new Error("Service crashed"));

      const response = await request(app)
        .get("/api/forge/detect");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Service crashed");
    });
  });

  describe("GET /api/forge/check", () => {
    it("returns existing setup successfully", async () => {
      const setupData = {
        hasForgeConfig: true,
        hasAgents: true,
        hasGovernance: false,
      };

      mockCtx.initService.checkExistingSetup = vi.fn().mockResolvedValue(Result.ok(setupData));

      const response = await request(app)
        .get("/api/forge/check");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(setupData);
    });

    it("returns 500 when setup check fails", async () => {
      mockCtx.initService.checkExistingSetup = vi.fn().mockResolvedValue(
        Result.err(new Error("Setup check failed"))
      );

      const response = await request(app)
        .get("/api/forge/check");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Setup check failed");
    });

    it("handles setup check throwing error", async () => {
      mockCtx.initService.checkExistingSetup = vi.fn().mockRejectedValue(new Error("Check crashed"));

      const response = await request(app)
        .get("/api/forge/check");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Check crashed");
    });
  });

  describe("POST /api/forge/init", () => {
    it("initializes project successfully", async () => {
      const initOptions = {
        projectType: "typescript",
        includeAgents: true,
      };

      const initResult = {
        projectType: "typescript",
        agentsCopied: 10,
        created: ["file1.ts", "file2.ts"],
      };

      mockCtx.initService.initializeProject = vi.fn().mockResolvedValue(Result.ok(initResult));

      const response = await request(app)
        .post("/api/forge/init")
        .send(initOptions);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(initResult);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("forge.initialized", {
        projectType: "typescript",
        agentsCopied: 10,
        filesCreated: 2,
      });
    });

    it("returns 400 when initialization fails with validation error", async () => {
      const error = { message: "Invalid project type", code: "VALIDATION_ERROR" };
      mockCtx.initService.initializeProject = vi.fn().mockResolvedValue(Result.err(error));

      const response = await request(app)
        .post("/api/forge/init")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid project type");
      expect(response.body.code).toBe("VALIDATION_ERROR");
    });

    it("handles initialization error without code", async () => {
      const error = new Error("Init failed");
      mockCtx.initService.initializeProject = vi.fn().mockResolvedValue(Result.err(error));

      const response = await request(app)
        .post("/api/forge/init")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Init failed");
      expect(response.body.code).toBe("INIT_ERROR");
    });

    it("handles initialization throwing error", async () => {
      mockCtx.initService.initializeProject = vi.fn().mockRejectedValue(new Error("Init crashed"));

      const response = await request(app)
        .post("/api/forge/init")
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Init crashed");
    });

    it("broadcasts initialization with zero agents", async () => {
      const initResult = {
        projectType: "javascript",
        agentsCopied: 0,
        created: [],
      };

      mockCtx.initService.initializeProject = vi.fn().mockResolvedValue(Result.ok(initResult));

      const response = await request(app)
        .post("/api/forge/init")
        .send({});

      expect(response.status).toBe(200);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("forge.initialized", {
        projectType: "javascript",
        agentsCopied: 0,
        filesCreated: 0,
      });
    });
  });

  describe("GET /api/forge/status", () => {
    it("returns status in JSON format by default", async () => {
      const statusData = {
        projectName: "NXTG-Forge",
        version: "3.0.0",
        health: "green",
      };

      mockCtx.statusService.getStatus = vi.fn().mockResolvedValue(Result.ok(statusData));

      const response = await request(app)
        .get("/api/forge/status");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(statusData);
      expect(response.body.timestamp).toBeDefined();
    });

    it("returns status in CLI format when requested", async () => {
      // Create properly typed ForgeStatus mock that matches the interface
      const statusData = {
        project: {
          name: "NXTG-Forge",
          path: "/test/project",
          forgeVersion: "3.0.0",
        },
        git: {
          branch: "main",
          status: "clean",
          hasUncommitted: false,
          lastCommit: {
            hash: "abc123",
            message: "Test commit",
            date: "2026-01-01",
            author: "Test Author",
          },
        },
        tests: {
          total: 10,
          passing: 10,
          failing: 0,
          skipped: 0,
          lines: 95,
          branches: 90,
          functions: 92,
          statements: 94,
        },
        build: {
          status: "passing",
          lastBuild: new Date().toISOString(),
          errors: 0,
          warnings: 0,
        },
        governance: {
          status: "compliant",
          score: 95,
          lastCheck: new Date().toISOString(),
        },
        agents: {
          total: 5,
          active: 3,
          available: ["agent1", "agent2", "agent3"],
        },
        timestamp: new Date().toISOString(),
      };

      mockCtx.statusService.getStatus = vi.fn().mockResolvedValue(Result.ok(statusData));

      const response = await request(app)
        .get("/api/forge/status?format=cli");

      expect(response.status).toBe(200);
      expect(response.type).toContain("text/plain");
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe("string");
      expect(response.text.length).toBeGreaterThan(0);
      expect(response.text).toContain("NXTG-Forge Status");
    });

    it("returns 500 when status retrieval fails", async () => {
      mockCtx.statusService.getStatus = vi.fn().mockResolvedValue(
        Result.err(new Error("Status failed"))
      );

      const response = await request(app)
        .get("/api/forge/status");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Status failed");
    });

    it("handles status service throwing error", async () => {
      mockCtx.statusService.getStatus = vi.fn().mockRejectedValue(new Error("Service crashed"));

      const response = await request(app)
        .get("/api/forge/status");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Service crashed");
    });
  });

  // ============= Compliance Endpoints =============

  describe("GET /api/compliance/report", () => {
    it("returns compliance report successfully", async () => {
      const reportData = {
        status: "compliant",
        score: 95,
        summary: "All checks passed",
      };

      mockCtx.complianceService.getComplianceReport = vi.fn().mockResolvedValue({
        ok: true,
        value: reportData,
      });

      const response = await request(app)
        .get("/api/compliance/report");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(reportData);
    });

    it("returns 500 when compliance report fails", async () => {
      mockCtx.complianceService.getComplianceReport = vi.fn().mockResolvedValue({
        ok: false,
        error: "Report failed",
      });

      const response = await request(app)
        .get("/api/compliance/report");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to generate compliance report");
    });

    it("handles compliance service throwing error", async () => {
      mockCtx.complianceService.getComplianceReport = vi.fn().mockRejectedValue(new Error("Service crashed"));

      const response = await request(app)
        .get("/api/compliance/report");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to generate compliance report");
    });
  });

  describe("GET /api/compliance/sbom", () => {
    it("returns SBOM in CycloneDX format", async () => {
      const sbomData = {
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        version: 1,
        components: [],
      };

      mockCtx.complianceService.generateSBOM = vi.fn().mockResolvedValue({
        ok: true,
        value: sbomData,
      });

      const response = await request(app)
        .get("/api/compliance/sbom");

      expect(response.status).toBe(200);
      expect(response.type).toContain("application/vnd.cyclonedx+json");
      expect(response.body).toEqual(sbomData);
    });

    it("returns 500 when SBOM generation fails", async () => {
      mockCtx.complianceService.generateSBOM = vi.fn().mockResolvedValue({
        ok: false,
        error: "SBOM generation failed",
      });

      const response = await request(app)
        .get("/api/compliance/sbom");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to generate SBOM");
    });

    it("handles SBOM service throwing error", async () => {
      mockCtx.complianceService.generateSBOM = vi.fn().mockRejectedValue(new Error("Service crashed"));

      const response = await request(app)
        .get("/api/compliance/sbom");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to generate SBOM");
    });
  });

  describe("GET /api/compliance/conflicts", () => {
    it("returns license conflicts summary", async () => {
      const reportData = {
        status: "warning",
        score: 75,
        conflicts: ["GPL-3.0 conflicts with MIT"],
        summary: "1 conflict found",
      };

      mockCtx.complianceService.getComplianceReport = vi.fn().mockResolvedValue({
        ok: true,
        value: reportData,
      });

      const response = await request(app)
        .get("/api/compliance/conflicts");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "warning",
        score: 75,
        conflicts: ["GPL-3.0 conflicts with MIT"],
        summary: "1 conflict found",
      });
    });

    it("returns 500 when conflicts check fails", async () => {
      mockCtx.complianceService.getComplianceReport = vi.fn().mockResolvedValue({
        ok: false,
        error: "Conflicts check failed",
      });

      const response = await request(app)
        .get("/api/compliance/conflicts");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to check license conflicts");
    });

    it("handles conflicts service throwing error", async () => {
      mockCtx.complianceService.getComplianceReport = vi.fn().mockRejectedValue(new Error("Service crashed"));

      const response = await request(app)
        .get("/api/compliance/conflicts");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to check license conflicts");
    });
  });

  // ============= Feedback Endpoints =============

  describe("POST /api/feedback", () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue("[]");
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it("submits feedback successfully with valid data", async () => {
      const feedback = {
        rating: 5,
        category: "feature",
        description: "Great feature!",
        url: "/test/page",
        userAgent: "test-agent",
      };

      const response = await request(app)
        .post("/api/feedback")
        .send(feedback);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.id).toMatch(/^feedback-/);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("feedback.submitted", expect.objectContaining({
        category: "feature",
        rating: 5,
      }));
    });

    it("validates rating must be 1-5", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 6,
          category: "bug",
          description: "Test",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("requires description field", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "feature",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("handles write errors", async () => {
      mockFs.writeFile.mockRejectedValue(new Error("Disk full"));

      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "feature",
          description: "Test feedback",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/feedback", () => {
    it("returns empty feedback list", async () => {
      mockFs.readFile.mockResolvedValue("[]");

      const response = await request(app)
        .get("/api/feedback");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("returns and sorts feedback by timestamp", async () => {
      const feedbackList = [
        { id: "f1", rating: 3, category: "bug", description: "Old", timestamp: "2026-01-01T00:00:00Z" },
        { id: "f2", rating: 5, category: "feature", description: "New", timestamp: "2026-02-01T00:00:00Z" },
      ];
      mockFs.readFile.mockResolvedValue(JSON.stringify(feedbackList));

      const response = await request(app)
        .get("/api/feedback");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      // Sorted newest first
      expect(response.body.data[0].id).toBe("f2");
    });

    it("handles read errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      const response = await request(app)
        .get("/api/feedback");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/feedback/stats", () => {
    it("calculates stats for empty feedback", async () => {
      mockFs.readFile.mockResolvedValue("[]");

      const response = await request(app)
        .get("/api/feedback/stats");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCount).toBe(0);
      expect(response.body.data.averageRating).toBe(0);
    });

    it("calculates stats correctly", async () => {
      const feedbackList = [
        { id: "f1", rating: 3, category: "bug", description: "A", timestamp: new Date().toISOString() },
        { id: "f2", rating: 5, category: "feature", description: "B", timestamp: new Date().toISOString() },
        { id: "f3", rating: 4, category: "bug", description: "C", timestamp: new Date().toISOString() },
      ];
      mockFs.readFile.mockResolvedValue(JSON.stringify(feedbackList));

      const response = await request(app)
        .get("/api/feedback/stats");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCount).toBe(3);
      expect(response.body.data.averageRating).toBe(4);
      expect(response.body.data.byCategory.bug).toBe(2);
      expect(response.body.data.byCategory.feature).toBe(1);
    });

    it("handles read errors", async () => {
      mockFs.readFile.mockRejectedValue(new Error("Read error"));

      const response = await request(app)
        .get("/api/feedback/stats");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

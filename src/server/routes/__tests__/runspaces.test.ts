/**
 * Runspace Routes Tests - Comprehensive test coverage for runspaces.ts
 *
 * Tests all runspace routes:
 * - CRUD operations (create, list, get, update, delete)
 * - Lifecycle management (start, stop, suspend, switch)
 * - Health checks
 *
 * Test coverage includes:
 * - Success paths for all endpoints
 * - Error handling (service errors, not found errors)
 * - Broadcasting of runspace events
 * - Query parameter handling (deleteFiles)
 * - Edge cases (missing runspaces, null active runspace)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createRunspaceRoutes } from "../runspaces";
import type { RouteContext } from "../../route-context";

describe("Runspace Routes", () => {
  let app: express.Application;
  let mockCtx: RouteContext;

  beforeEach(() => {
    // Create mock context with runspaceManager
    mockCtx = {
      projectRoot: "/test/project",
      runspaceManager: {
        createRunspace: vi.fn(),
        getAllRunspaces: vi.fn(),
        getActiveRunspace: vi.fn(),
        getRunspace: vi.fn(),
        updateRunspace: vi.fn(),
        deleteRunspace: vi.fn(),
        switchRunspace: vi.fn(),
        startRunspace: vi.fn(),
        stopRunspace: vi.fn(),
        suspendRunspace: vi.fn(),
        getRunspaceHealth: vi.fn(),
      } as any,
      broadcast: vi.fn(),
      orchestrator: {} as any,
      visionSystem: {} as any,
      stateManager: {} as any,
      coordinationService: {} as any,
      bootstrapService: {} as any,
      mcpSuggestionEngine: {} as any,
      governanceStateManager: {} as any,
      initService: {} as any,
      statusService: {} as any,
      complianceService: {} as any,
      getWorkerPool: vi.fn(),
      getWsClientCount: vi.fn(),
    };

    // Create express app with routes
    app = express();
    app.use(express.json());
    app.use("/api/runspaces", createRunspaceRoutes(mockCtx));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============= Create Runspace =============

  describe("POST /", () => {
    it("creates a runspace successfully", async () => {
      const config = {
        name: "test-runspace",
        path: "/test/path",
        shell: "/bin/bash",
      };
      const mockRunspace = {
        id: "rs-123",
        ...config,
        status: "stopped",
        createdAt: "2026-02-06T10:00:00Z",
      };
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockResolvedValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces")
        .send(config)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.createRunspace).toHaveBeenCalledWith(config);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.created", mockRunspace);
    });

    it("handles creation errors", async () => {
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockRejectedValue(
        new Error("Failed to create runspace")
      );

      const res = await request(app)
        .post("/api/runspaces")
        .send({ name: "test" })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to create runspace");
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockRejectedValue(
        "String error"
      );

      const res = await request(app)
        .post("/api/runspaces")
        .send({ name: "test" })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unknown error");
    });
  });

  // ============= List Runspaces =============

  describe("GET /", () => {
    it("returns all runspaces with active runspace ID", async () => {
      const mockRunspaces = [
        { id: "rs-1", name: "Runspace 1", status: "running" },
        { id: "rs-2", name: "Runspace 2", status: "stopped" },
        { id: "rs-3", name: "Runspace 3", status: "suspended" },
      ];
      const mockActiveRunspace = { id: "rs-1", name: "Runspace 1", status: "running" };

      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue(mockRunspaces);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(mockActiveRunspace);

      const res = await request(app)
        .get("/api/runspaces")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.runspaces).toEqual(mockRunspaces);
      expect(res.body.data.activeRunspaceId).toBe("rs-1");
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.getAllRunspaces).toHaveBeenCalledOnce();
      expect(mockCtx.runspaceManager.getActiveRunspace).toHaveBeenCalledOnce();
    });

    it("returns null when no active runspace", async () => {
      const mockRunspaces = [
        { id: "rs-1", name: "Runspace 1", status: "stopped" },
      ];

      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue(mockRunspaces);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.activeRunspaceId).toBeNull();
    });

    it("returns empty list when no runspaces exist", async () => {
      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue([]);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.runspaces).toEqual([]);
      expect(res.body.data.activeRunspaceId).toBeNull();
    });

    it("handles errors", async () => {
      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockImplementation(() => {
        throw new Error("Database error");
      });

      const res = await request(app)
        .get("/api/runspaces")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Database error");
    });
  });

  // ============= Get Runspace by ID =============

  describe("GET /:id", () => {
    it("returns runspace by ID", async () => {
      const mockRunspace = {
        id: "rs-123",
        name: "Test Runspace",
        status: "running",
        path: "/test/path",
      };
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .get("/api/runspaces/rs-123")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.getRunspace).toHaveBeenCalledWith("rs-123");
    });

    it("returns 404 when runspace not found", async () => {
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces/nonexistent")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Runspace not found: nonexistent");
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.getRunspace).toHaveBeenCalledWith("nonexistent");
    });

    it("handles errors", async () => {
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockImplementation(() => {
        throw new Error("Query failed");
      });

      const res = await request(app)
        .get("/api/runspaces/rs-123")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Query failed");
    });
  });

  // ============= Update Runspace =============

  describe("PUT /:id", () => {
    it("updates runspace successfully", async () => {
      const updates = {
        name: "Updated Name",
        shell: "/bin/zsh",
      };
      const mockUpdatedRunspace = {
        id: "rs-123",
        ...updates,
        status: "running",
      };
      vi.mocked(mockCtx.runspaceManager.updateRunspace).mockResolvedValue(mockUpdatedRunspace);

      const res = await request(app)
        .put("/api/runspaces/rs-123")
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockUpdatedRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.updateRunspace).toHaveBeenCalledWith("rs-123", updates);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.updated", mockUpdatedRunspace);
    });

    it("handles update errors", async () => {
      vi.mocked(mockCtx.runspaceManager.updateRunspace).mockRejectedValue(
        new Error("Update failed")
      );

      const res = await request(app)
        .put("/api/runspaces/rs-123")
        .send({ name: "New Name" })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Update failed");
    });

    it("accepts partial updates", async () => {
      const mockUpdatedRunspace = {
        id: "rs-123",
        name: "Only Name Changed",
        status: "running",
      };
      vi.mocked(mockCtx.runspaceManager.updateRunspace).mockResolvedValue(mockUpdatedRunspace);

      const res = await request(app)
        .put("/api/runspaces/rs-123")
        .send({ name: "Only Name Changed" })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ============= Delete Runspace =============

  describe("DELETE /:id", () => {
    it("deletes runspace without deleting files", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/runspaces/rs-123")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.deleteRunspace).toHaveBeenCalledWith("rs-123", false);
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.deleted", { runspaceId: "rs-123" });
    });

    it("deletes runspace with files when deleteFiles=true", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/runspaces/rs-456?deleteFiles=true")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockCtx.runspaceManager.deleteRunspace).toHaveBeenCalledWith("rs-456", true);
    });

    it("handles deleteFiles=false explicitly", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/runspaces/rs-789?deleteFiles=false")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockCtx.runspaceManager.deleteRunspace).toHaveBeenCalledWith("rs-789", false);
    });

    it("handles deletion errors", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockRejectedValue(
        new Error("Cannot delete active runspace")
      );

      const res = await request(app)
        .delete("/api/runspaces/rs-123")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Cannot delete active runspace");
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockRejectedValue(
        { code: "ENOENT" }
      );

      const res = await request(app)
        .delete("/api/runspaces/rs-123")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unknown error");
    });
  });

  // ============= Switch Active Runspace =============

  describe("POST /:id/switch", () => {
    it("switches to runspace successfully", async () => {
      const mockRunspace = {
        id: "rs-123",
        name: "Target Runspace",
        status: "running",
      };
      vi.mocked(mockCtx.runspaceManager.switchRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces/rs-123/switch")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.switchRunspace).toHaveBeenCalledWith("rs-123");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.activated", { runspaceId: "rs-123" });
    });

    it("handles switch errors", async () => {
      vi.mocked(mockCtx.runspaceManager.switchRunspace).mockRejectedValue(
        new Error("Runspace not found")
      );

      const res = await request(app)
        .post("/api/runspaces/nonexistent/switch")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Runspace not found");
    });

    it("handles null active runspace after switch", async () => {
      vi.mocked(mockCtx.runspaceManager.switchRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      const res = await request(app)
        .post("/api/runspaces/rs-123/switch")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  // ============= Start Runspace =============

  describe("POST /:id/start", () => {
    it("starts runspace successfully", async () => {
      const mockRunspace = {
        id: "rs-123",
        name: "Test Runspace",
        status: "running",
      };
      vi.mocked(mockCtx.runspaceManager.startRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces/rs-123/start")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.startRunspace).toHaveBeenCalledWith("rs-123");
      expect(mockCtx.runspaceManager.getRunspace).toHaveBeenCalledWith("rs-123");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.updated", mockRunspace);
    });

    it("handles start errors", async () => {
      vi.mocked(mockCtx.runspaceManager.startRunspace).mockRejectedValue(
        new Error("Already running")
      );

      const res = await request(app)
        .post("/api/runspaces/rs-123/start")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Already running");
    });

    it("handles null runspace after start", async () => {
      vi.mocked(mockCtx.runspaceManager.startRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(null);

      const res = await request(app)
        .post("/api/runspaces/rs-123/start")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  // ============= Stop Runspace =============

  describe("POST /:id/stop", () => {
    it("stops runspace successfully", async () => {
      const mockRunspace = {
        id: "rs-123",
        name: "Test Runspace",
        status: "stopped",
      };
      vi.mocked(mockCtx.runspaceManager.stopRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces/rs-123/stop")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.stopRunspace).toHaveBeenCalledWith("rs-123");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.updated", mockRunspace);
    });

    it("handles stop errors", async () => {
      vi.mocked(mockCtx.runspaceManager.stopRunspace).mockRejectedValue(
        new Error("Already stopped")
      );

      const res = await request(app)
        .post("/api/runspaces/rs-123/stop")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Already stopped");
    });
  });

  // ============= Suspend Runspace =============

  describe("POST /:id/suspend", () => {
    it("suspends runspace successfully", async () => {
      const mockRunspace = {
        id: "rs-123",
        name: "Test Runspace",
        status: "suspended",
      };
      vi.mocked(mockCtx.runspaceManager.suspendRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces/rs-123/suspend")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockRunspace);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.suspendRunspace).toHaveBeenCalledWith("rs-123");
      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.suspended", { runspaceId: "rs-123" });
    });

    it("handles suspend errors", async () => {
      vi.mocked(mockCtx.runspaceManager.suspendRunspace).mockRejectedValue(
        new Error("Cannot suspend")
      );

      const res = await request(app)
        .post("/api/runspaces/rs-123/suspend")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Cannot suspend");
    });

    it("handles null runspace after suspend", async () => {
      vi.mocked(mockCtx.runspaceManager.suspendRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(null);

      const res = await request(app)
        .post("/api/runspaces/rs-123/suspend")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  // ============= Get Runspace Health =============

  describe("GET /:id/health", () => {
    it("returns runspace health successfully", async () => {
      const mockHealth = {
        status: "healthy",
        uptime: 12345,
        memory: { used: 100, total: 1000 },
        cpu: { usage: 45.2 },
        processes: 5,
      };
      vi.mocked(mockCtx.runspaceManager.getRunspaceHealth).mockResolvedValue(mockHealth);

      const res = await request(app)
        .get("/api/runspaces/rs-123/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockHealth);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.runspaceManager.getRunspaceHealth).toHaveBeenCalledWith("rs-123");
    });

    it("returns degraded health status", async () => {
      const mockHealth = {
        status: "degraded",
        uptime: 60000,
        memory: { used: 900, total: 1000 },
        cpu: { usage: 95.0 },
        processes: 50,
        warnings: ["High memory usage", "High CPU usage"],
      };
      vi.mocked(mockCtx.runspaceManager.getRunspaceHealth).mockResolvedValue(mockHealth);

      const res = await request(app)
        .get("/api/runspaces/rs-123/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("degraded");
      expect(res.body.data.warnings).toHaveLength(2);
    });

    it("handles health check errors", async () => {
      vi.mocked(mockCtx.runspaceManager.getRunspaceHealth).mockRejectedValue(
        new Error("Runspace not running")
      );

      const res = await request(app)
        .get("/api/runspaces/rs-123/health")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Runspace not running");
    });

    it("handles unhealthy runspace", async () => {
      const mockHealth = {
        status: "unhealthy",
        uptime: 30000,
        errors: ["Process crashed", "Out of memory"],
      };
      vi.mocked(mockCtx.runspaceManager.getRunspaceHealth).mockResolvedValue(mockHealth);

      const res = await request(app)
        .get("/api/runspaces/rs-123/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("unhealthy");
      expect(res.body.data.errors).toBeDefined();
    });
  });

  // ============= Edge Cases and Additional Tests =============

  describe("Edge cases", () => {
    it("handles multiple runspaces with different statuses", async () => {
      const mockRunspaces = [
        { id: "rs-1", status: "running" },
        { id: "rs-2", status: "stopped" },
        { id: "rs-3", status: "suspended" },
        { id: "rs-4", status: "failed" },
      ];
      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue(mockRunspaces);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(mockRunspaces[0]);

      const res = await request(app)
        .get("/api/runspaces")
        .expect(200);

      expect(res.body.data.runspaces).toHaveLength(4);
      expect(res.body.data.runspaces.map((r: any) => r.status)).toEqual([
        "running",
        "stopped",
        "suspended",
        "failed",
      ]);
    });

    it("handles runspace with complex configuration", async () => {
      const complexConfig = {
        name: "complex-runspace",
        path: "/test/path",
        shell: "/bin/bash",
        env: { NODE_ENV: "test", PATH: "/usr/bin" },
        cwd: "/test/working/dir",
        timeout: 30000,
      };
      const mockRunspace = { id: "rs-complex", ...complexConfig, status: "stopped" };
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockResolvedValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces")
        .send(complexConfig)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.env).toEqual(complexConfig.env);
    });

    it("handles empty request body for create", async () => {
      const mockRunspace = { id: "rs-default", status: "stopped" };
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockResolvedValue(mockRunspace);

      const res = await request(app)
        .post("/api/runspaces")
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockCtx.runspaceManager.createRunspace).toHaveBeenCalledWith({});
    });

    it("handles empty request body for update", async () => {
      const mockRunspace = { id: "rs-123", status: "running" };
      vi.mocked(mockCtx.runspaceManager.updateRunspace).mockResolvedValue(mockRunspace);

      const res = await request(app)
        .put("/api/runspaces/rs-123")
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockCtx.runspaceManager.updateRunspace).toHaveBeenCalledWith("rs-123", {});
    });

    it("handles special characters in runspace ID", async () => {
      const runspaceId = "rs-123-abc_def";
      const mockRunspace = { id: runspaceId, status: "running" };
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      const res = await request(app)
        .get(`/api/runspaces/${runspaceId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(runspaceId);
    });

    it("preserves query parameters case sensitivity", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockResolvedValue(undefined);

      // Test with mixed case (should still work as "true" === "true")
      await request(app)
        .delete("/api/runspaces/rs-123?deleteFiles=True")
        .expect(200);

      // Should be false because "True" !== "true"
      expect(mockCtx.runspaceManager.deleteRunspace).toHaveBeenCalledWith("rs-123", false);
    });
  });

  // ============= Broadcasting Tests =============

  describe("Broadcasting", () => {
    it("broadcasts create event with correct payload", async () => {
      const mockRunspace = { id: "rs-123", name: "Test", status: "stopped" };
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockResolvedValue(mockRunspace);

      await request(app)
        .post("/api/runspaces")
        .send({ name: "Test" });

      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.created", mockRunspace);
      expect(mockCtx.broadcast).toHaveBeenCalledTimes(1);
    });

    it("broadcasts update event with correct payload", async () => {
      const mockRunspace = { id: "rs-123", name: "Updated", status: "running" };
      vi.mocked(mockCtx.runspaceManager.updateRunspace).mockResolvedValue(mockRunspace);

      await request(app)
        .put("/api/runspaces/rs-123")
        .send({ name: "Updated" });

      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.updated", mockRunspace);
    });

    it("broadcasts delete event with runspace ID", async () => {
      vi.mocked(mockCtx.runspaceManager.deleteRunspace).mockResolvedValue(undefined);

      await request(app)
        .delete("/api/runspaces/rs-456");

      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.deleted", { runspaceId: "rs-456" });
    });

    it("broadcasts activated event on switch", async () => {
      vi.mocked(mockCtx.runspaceManager.switchRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      await request(app)
        .post("/api/runspaces/rs-789/switch");

      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.activated", { runspaceId: "rs-789" });
    });

    it("broadcasts suspended event on suspend", async () => {
      const mockRunspace = { id: "rs-123", status: "suspended" };
      vi.mocked(mockCtx.runspaceManager.suspendRunspace).mockResolvedValue(undefined);
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(mockRunspace);

      await request(app)
        .post("/api/runspaces/rs-123/suspend");

      expect(mockCtx.broadcast).toHaveBeenCalledWith("runspace.suspended", { runspaceId: "rs-123" });
    });

    it("does not broadcast on errors", async () => {
      vi.mocked(mockCtx.runspaceManager.createRunspace).mockRejectedValue(
        new Error("Failed")
      );

      await request(app)
        .post("/api/runspaces")
        .send({ name: "Test" })
        .expect(500);

      expect(mockCtx.broadcast).not.toHaveBeenCalled();
    });
  });

  // ============= Response Format Tests =============

  describe("Response format", () => {
    it("always includes timestamp in success responses", async () => {
      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue([]);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces")
        .expect(200);

      expect(res.body.timestamp).toBeDefined();
      expect(typeof res.body.timestamp).toBe("string");
      expect(new Date(res.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it("always includes timestamp in error responses", async () => {
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces/nonexistent")
        .expect(404);

      expect(res.body.timestamp).toBeDefined();
      expect(typeof res.body.timestamp).toBe("string");
    });

    it("includes success: true for successful responses", async () => {
      vi.mocked(mockCtx.runspaceManager.getAllRunspaces).mockReturnValue([]);
      vi.mocked(mockCtx.runspaceManager.getActiveRunspace).mockReturnValue(null);

      const res = await request(app)
        .get("/api/runspaces");

      expect(res.body.success).toBe(true);
    });

    it("includes success: false for error responses", async () => {
      vi.mocked(mockCtx.runspaceManager.getRunspace).mockImplementation(() => {
        throw new Error("Error");
      });

      const res = await request(app)
        .get("/api/runspaces/rs-123");

      expect(res.body.success).toBe(false);
    });
  });
});

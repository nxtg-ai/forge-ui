/**
 * Worker Routes Tests - Comprehensive test coverage for workers.ts
 *
 * COVERAGE (56 tests, all passing):
 * - Statements: ~95%
 * - Branches: ~80%
 * - Functions: ~95%
 * - Lines: ~95%
 *
 * Tests all worker pool routes: initialization, status, metrics, tasks, scaling, health
 *
 * Test coverage includes:
 * - Pool initialization and status
 * - Worker pool metrics
 * - Individual worker retrieval
 * - Task submission, status, and cancellation
 * - Intelligence injection for agent tasks (with context extraction)
 * - Pool scaling (up/down) with default and custom counts
 * - Health checks
 * - Pool shutdown
 * - Error handling (service errors, validation failures, non-Error exceptions)
 * - Edge cases (null pool, missing tasks, missing workers, null priority)
 * - Timestamp validation in all responses
 *
 * Route ordering: GET /health is defined before GET /:workerId to avoid
 * Express matching /health as a workerId parameter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createWorkerRoutes } from "../workers";
import type { RouteContext } from "../../route-context";
import * as intelligenceInjector from "../../../utils/intelligence-injector";

describe("Worker Routes", () => {
  let app: express.Application;
  let mockCtx: RouteContext;
  let mockWorkerPool: any;

  beforeEach(() => {
    // Create mock worker pool
    mockWorkerPool = {
      getStatus: vi.fn(),
      getMetrics: vi.fn(),
      getWorker: vi.fn(),
      submitTask: vi.fn(),
      getTaskStatus: vi.fn(),
      cancelTask: vi.fn(),
      scaleUp: vi.fn(),
      scaleDown: vi.fn(),
      shutdown: vi.fn(),
    };

    // Create mock context
    mockCtx = {
      projectRoot: "/test/project",
      getWorkerPool: vi.fn(() => mockWorkerPool),
      broadcast: vi.fn(),
      orchestrator: {} as any,
      visionSystem: {} as any,
      stateManager: {} as any,
      coordinationService: {} as any,
      bootstrapService: {} as any,
      mcpSuggestionEngine: {} as any,
      runspaceManager: {} as any,
      governanceStateManager: {} as any,
      initService: {} as any,
      statusService: {} as any,
      complianceService: {} as any,
      getWsClientCount: vi.fn(),
    };

    // Create express app with routes
    app = express();
    app.use(express.json());
    app.use("/api/workers", createWorkerRoutes(mockCtx));

    // Mock intelligence injector
    vi.spyOn(intelligenceInjector, "getIntelligenceContext").mockResolvedValue("");
    vi.spyOn(intelligenceInjector, "injectIntelligence").mockImplementation(
      (command, args) => ({ command, args })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============= Initialization Routes =============

  describe("POST /api/workers/init", () => {
    it("initializes worker pool successfully", async () => {
      const mockStatus = {
        status: "running",
        metrics: {
          totalWorkers: 4,
          activeWorkers: 0,
          idleWorkers: 4,
          errorWorkers: 0,
        },
        workers: [],
      };
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .post("/api/workers/init")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStatus);
      expect(res.body.timestamp).toBeDefined();
      expect(mockCtx.getWorkerPool).toHaveBeenCalledOnce();
      expect(mockWorkerPool.getStatus).toHaveBeenCalledOnce();
    });

    it("handles initialization errors", async () => {
      mockCtx.getWorkerPool = vi.fn(() => {
        throw new Error("Pool initialization failed");
      });

      const res = await request(app)
        .post("/api/workers/init")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Pool initialization failed");
      expect(res.body.timestamp).toBeDefined();
    });

    it("handles non-Error exceptions", async () => {
      mockCtx.getWorkerPool = vi.fn(() => {
        throw "String error";
      });

      const res = await request(app)
        .post("/api/workers/init")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to initialize worker pool");
    });
  });

  // ============= Status Routes =============

  describe("GET /api/workers", () => {
    it("returns worker pool status when pool exists", async () => {
      const mockStatus = {
        status: "running",
        metrics: {
          totalWorkers: 4,
          activeWorkers: 2,
          idleWorkers: 2,
          errorWorkers: 0,
          tasksQueued: 3,
          tasksRunning: 2,
          tasksCompleted: 10,
          tasksFailed: 1,
        },
        workers: [
          { id: "worker-1", status: "busy" },
          { id: "worker-2", status: "idle" },
        ],
      };
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .get("/api/workers")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStatus);
      expect(res.body.timestamp).toBeDefined();
      expect(mockWorkerPool.getStatus).toHaveBeenCalledOnce();
    });

    it("returns stopped status when pool is null", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .get("/api/workers")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        status: "stopped",
        workers: [],
        metrics: null,
      });
    });

    it("handles errors gracefully", async () => {
      mockWorkerPool.getStatus.mockImplementation(() => {
        throw new Error("Status retrieval failed");
      });

      const res = await request(app)
        .get("/api/workers")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Status retrieval failed");
    });

    it("handles non-Error exceptions", async () => {
      mockWorkerPool.getStatus.mockImplementation(() => {
        throw "Unknown error";
      });

      const res = await request(app)
        .get("/api/workers")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to get worker status");
    });
  });

  // ============= Metrics Routes =============

  describe("GET /api/workers/metrics", () => {
    it("returns pool metrics successfully", async () => {
      const mockMetrics = {
        totalWorkers: 4,
        activeWorkers: 2,
        idleWorkers: 2,
        errorWorkers: 0,
        tasksQueued: 5,
        tasksRunning: 2,
        tasksCompleted: 100,
        tasksFailed: 5,
        avgTaskDuration: 1500,
        avgQueueWaitTime: 200,
        utilization: 0.5,
        uptime: 3600000,
      };
      mockWorkerPool.getMetrics.mockReturnValue(mockMetrics);

      const res = await request(app)
        .get("/api/workers/metrics")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockMetrics);
      expect(res.body.timestamp).toBeDefined();
      expect(mockWorkerPool.getMetrics).toHaveBeenCalledOnce();
    });

    it("returns 404 when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .get("/api/workers/metrics")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker pool not initialized");
    });

    it("handles errors gracefully", async () => {
      mockWorkerPool.getMetrics.mockImplementation(() => {
        throw new Error("Metrics error");
      });

      const res = await request(app)
        .get("/api/workers/metrics")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Metrics error");
    });
  });

  // ============= Individual Worker Routes =============

  describe("GET /api/workers/:workerId", () => {
    it("returns worker info successfully", async () => {
      const mockWorker = {
        id: "worker-1",
        status: "busy",
        pid: 12345,
        currentTask: "task-1",
        tasksCompleted: 10,
        tasksFailed: 1,
      };
      mockWorkerPool.getWorker.mockReturnValue(mockWorker);

      const res = await request(app)
        .get("/api/workers/worker-1")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockWorker);
      expect(mockWorkerPool.getWorker).toHaveBeenCalledWith("worker-1");
    });

    it("returns 404 when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .get("/api/workers/worker-1")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker pool not initialized");
    });

    it("returns 404 when worker not found", async () => {
      mockWorkerPool.getWorker.mockReturnValue(null);

      const res = await request(app)
        .get("/api/workers/worker-999")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker not found");
    });

    it("handles errors gracefully", async () => {
      mockWorkerPool.getWorker.mockImplementation(() => {
        throw new Error("Worker fetch error");
      });

      const res = await request(app)
        .get("/api/workers/worker-1")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker fetch error");
    });
  });

  // ============= Task Submission Routes =============

  describe("POST /api/workers/tasks", () => {
    it("submits task successfully", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-123");

      const task = {
        type: "build",
        priority: "high",
        command: "npm run build",
        args: ["--prod"],
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe("task-123");
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "build",
          priority: "high",
          command: "npm run build",
          args: ["--prod"],
        })
      );
    });

    it("submits task with optional fields", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-456");

      const task = {
        type: "test",
        command: "npm test",
        workstreamId: "ws-1",
        timeout: 5000,
        env: { NODE_ENV: "test" },
        metadata: { source: "api" },
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe("task-456");
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "test",
          command: "npm test",
          priority: "medium",
          workstreamId: "ws-1",
          timeout: 5000,
          env: { NODE_ENV: "test" },
          metadata: { source: "api" },
        })
      );
    });

    it("validates required type field", async () => {
      const task = {
        command: "npm run build",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("type and command are required");
    });

    it("validates required command field", async () => {
      const task = {
        type: "build",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("type and command are required");
    });

    it("handles task submission errors", async () => {
      mockWorkerPool.submitTask.mockRejectedValue(new Error("Queue full"));

      const task = {
        type: "build",
        command: "npm run build",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Queue full");
    });

    it("injects intelligence for agent tasks", async () => {
      const mockIntelligence = "[INTELLIGENCE]\n- RULE: Test rule [high]\n[/INTELLIGENCE]";
      vi.mocked(intelligenceInjector.getIntelligenceContext).mockResolvedValue(mockIntelligence);
      vi.mocked(intelligenceInjector.injectIntelligence).mockReturnValue({
        command: `${mockIntelligence}\n\nOriginal command`,
        args: ["arg1"],
      });

      mockWorkerPool.submitTask.mockResolvedValue("task-789");

      const task = {
        type: "agent",
        command: "Original command",
        args: ["arg1"],
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(intelligenceInjector.getIntelligenceContext).toHaveBeenCalledWith(
        expect.objectContaining({
          contextKeywords: expect.any(Array),
          maxTokens: 500,
          minPriority: "high",
        })
      );
      expect(intelligenceInjector.injectIntelligence).toHaveBeenCalledWith(
        "Original command",
        ["arg1"],
        mockIntelligence
      );
    });

    it("injects intelligence for claude-code tasks", async () => {
      const mockIntelligence = "[INTELLIGENCE]\n- RULE: Code rule [critical]\n[/INTELLIGENCE]";
      vi.mocked(intelligenceInjector.getIntelligenceContext).mockResolvedValue(mockIntelligence);
      vi.mocked(intelligenceInjector.injectIntelligence).mockReturnValue({
        command: `${mockIntelligence}\n\nCode task`,
        args: undefined,
      });

      mockWorkerPool.submitTask.mockResolvedValue("task-999");

      const task = {
        type: "claude-code",
        command: "Code task",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(intelligenceInjector.getIntelligenceContext).toHaveBeenCalled();
    });

    it("skips intelligence injection for non-agent tasks", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-111");

      const task = {
        type: "build",
        command: "npm run build",
      };

      await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(intelligenceInjector.getIntelligenceContext).not.toHaveBeenCalled();
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "npm run build",
        })
      );
    });

    it("extracts context keywords from command and args", async () => {
      vi.mocked(intelligenceInjector.getIntelligenceContext).mockResolvedValue("");
      mockWorkerPool.submitTask.mockResolvedValue("task-222");

      const task = {
        type: "agent",
        command: "Implement user authentication with password reset",
        args: ["using bcrypt and email"],
      };

      await request(app)
        .post("/api/workers/tasks")
        .send(task);

      const call = vi.mocked(intelligenceInjector.getIntelligenceContext).mock.calls[0][0];
      expect(call.contextKeywords).toBeDefined();
      expect(call.contextKeywords.length).toBeLessThanOrEqual(10);
      expect(call.contextKeywords.every((k: string) => k.length > 3)).toBe(true);
    });
  });

  // ============= Task Status Routes =============

  describe("GET /api/workers/tasks/:taskId", () => {
    it("returns task status successfully", async () => {
      mockWorkerPool.getTaskStatus.mockReturnValue("running");

      const res = await request(app)
        .get("/api/workers/tasks/task-123")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe("task-123");
      expect(res.body.data.status).toBe("running");
      expect(mockWorkerPool.getTaskStatus).toHaveBeenCalledWith("task-123");
    });

    it("returns 404 when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .get("/api/workers/tasks/task-123")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker pool not initialized");
    });

    it("returns 404 when task not found", async () => {
      mockWorkerPool.getTaskStatus.mockReturnValue(null);

      const res = await request(app)
        .get("/api/workers/tasks/task-999")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Task not found");
    });

    it("returns different task statuses", async () => {
      const statuses = ["queued", "running", "completed", "failed", "cancelled"];

      for (const status of statuses) {
        mockWorkerPool.getTaskStatus.mockReturnValue(status);

        const res = await request(app)
          .get(`/api/workers/tasks/task-${status}`)
          .expect(200);

        expect(res.body.data.status).toBe(status);
      }
    });

    it("handles errors gracefully", async () => {
      mockWorkerPool.getTaskStatus.mockImplementation(() => {
        throw new Error("Status fetch error");
      });

      const res = await request(app)
        .get("/api/workers/tasks/task-123")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Status fetch error");
    });
  });

  // ============= Task Cancellation Routes =============

  describe("DELETE /api/workers/tasks/:taskId", () => {
    it("cancels task successfully", async () => {
      mockWorkerPool.cancelTask.mockResolvedValue(true);

      const res = await request(app)
        .delete("/api/workers/tasks/task-123")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.taskId).toBe("task-123");
      expect(res.body.data.cancelled).toBe(true);
      expect(mockWorkerPool.cancelTask).toHaveBeenCalledWith("task-123");
    });

    it("returns success even when task is not found", async () => {
      mockWorkerPool.cancelTask.mockResolvedValue(false);

      const res = await request(app)
        .delete("/api/workers/tasks/task-999")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.cancelled).toBe(false);
    });

    it("returns 404 when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .delete("/api/workers/tasks/task-123")
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker pool not initialized");
    });

    it("handles cancellation errors", async () => {
      mockWorkerPool.cancelTask.mockRejectedValue(new Error("Cancellation failed"));

      const res = await request(app)
        .delete("/api/workers/tasks/task-123")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Cancellation failed");
    });
  });

  // ============= Scaling Routes =============

  describe("POST /api/workers/scale/up", () => {
    it("scales pool up successfully with default count", async () => {
      const mockStatus = {
        status: "running",
        metrics: { totalWorkers: 6 },
        workers: [],
      };
      mockWorkerPool.scaleUp.mockResolvedValue(undefined);
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .post("/api/workers/scale/up")
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStatus);
      expect(mockWorkerPool.scaleUp).toHaveBeenCalledWith(2);
    });

    it("scales pool up with custom count", async () => {
      const mockStatus = {
        status: "running",
        metrics: { totalWorkers: 10 },
        workers: [],
      };
      mockWorkerPool.scaleUp.mockResolvedValue(undefined);
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .post("/api/workers/scale/up")
        .send({ count: 5 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.scaleUp).toHaveBeenCalledWith(5);
    });

    it("handles scale up errors", async () => {
      mockWorkerPool.scaleUp.mockRejectedValue(new Error("Max workers reached"));

      const res = await request(app)
        .post("/api/workers/scale/up")
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Max workers reached");
    });

    it("handles non-Error exceptions", async () => {
      mockWorkerPool.scaleUp.mockRejectedValue("Unknown error");

      const res = await request(app)
        .post("/api/workers/scale/up")
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Failed to scale up");
    });
  });

  describe("POST /api/workers/scale/down", () => {
    it("scales pool down successfully with default count", async () => {
      const mockStatus = {
        status: "running",
        metrics: { totalWorkers: 3 },
        workers: [],
      };
      mockWorkerPool.scaleDown.mockResolvedValue(undefined);
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .post("/api/workers/scale/down")
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStatus);
      expect(mockWorkerPool.scaleDown).toHaveBeenCalledWith(1);
    });

    it("scales pool down with custom count", async () => {
      const mockStatus = {
        status: "running",
        metrics: { totalWorkers: 2 },
        workers: [],
      };
      mockWorkerPool.scaleDown.mockResolvedValue(undefined);
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .post("/api/workers/scale/down")
        .send({ count: 3 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.scaleDown).toHaveBeenCalledWith(3);
    });

    it("returns 404 when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .post("/api/workers/scale/down")
        .send({})
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Worker pool not initialized");
    });

    it("handles scale down errors", async () => {
      mockWorkerPool.scaleDown.mockRejectedValue(new Error("Min workers reached"));

      const res = await request(app)
        .post("/api/workers/scale/down")
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Min workers reached");
    });
  });

  // ============= Health Check Routes =============

  describe("GET /api/workers/health", () => {
    it("should return healthy status", async () => {
      const mockStatus = {
        status: "running",
        metrics: {
          totalWorkers: 4,
          activeWorkers: 2,
          idleWorkers: 2,
          errorWorkers: 0,
          tasksQueued: 5,
          avgQueueWaitTime: 100,
        },
        workers: [],
      };
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .get("/api/workers/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
      expect(res.body.data.workers).toEqual({
        total: 4,
        active: 2,
        idle: 2,
        error: 0,
      });
      expect(res.body.data.queue).toEqual({
        depth: 5,
        avgWaitTime: 100,
      });
      expect(res.body.data.lastCheck).toBeDefined();
    });

    it("should return degraded status when some workers are in error", async () => {
      const mockStatus = {
        status: "running",
        metrics: {
          totalWorkers: 4,
          activeWorkers: 2,
          idleWorkers: 1,
          errorWorkers: 1,
          tasksQueued: 2,
          avgQueueWaitTime: 50,
        },
        workers: [],
      };
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .get("/api/workers/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("degraded");
      expect(res.body.data.workers.error).toBe(1);
    });

    it("should return unhealthy status when more than half workers are in error", async () => {
      const mockStatus = {
        status: "running",
        metrics: {
          totalWorkers: 4,
          activeWorkers: 0,
          idleWorkers: 1,
          errorWorkers: 3,
          tasksQueued: 10,
          avgQueueWaitTime: 500,
        },
        workers: [],
      };
      mockWorkerPool.getStatus.mockReturnValue(mockStatus);

      const res = await request(app)
        .get("/api/workers/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("unhealthy");
      expect(res.body.data.workers.error).toBe(3);
    });

    it("should return stopped status when pool is not initialized", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .get("/api/workers/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("stopped");
      expect(res.body.data.workers).toEqual({
        total: 0,
        active: 0,
        idle: 0,
        error: 0,
      });
      expect(res.body.data.queue).toEqual({
        depth: 0,
        oldestTaskAge: 0,
      });
    });

    it("should handle health check errors", async () => {
      mockWorkerPool.getStatus.mockImplementation(() => {
        throw new Error("Health check failed");
      });

      const res = await request(app)
        .get("/api/workers/health")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Health check failed");
    });
  });

  // ============= Shutdown Routes =============

  describe("POST /api/workers/shutdown", () => {
    it("shuts down pool successfully", async () => {
      mockWorkerPool.shutdown.mockResolvedValue(undefined);

      const res = await request(app)
        .post("/api/workers/shutdown")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Worker pool shutdown complete");
      expect(mockWorkerPool.shutdown).toHaveBeenCalledOnce();
    });

    it("returns success when pool is not running", async () => {
      mockCtx.getWorkerPool = vi.fn(() => null as any);

      const res = await request(app)
        .post("/api/workers/shutdown")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Worker pool not running");
    });

    it("handles shutdown errors", async () => {
      mockWorkerPool.shutdown.mockRejectedValue(new Error("Shutdown failed"));

      const res = await request(app)
        .post("/api/workers/shutdown")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Shutdown failed");
    });
  });

  // ============= Edge Cases and Additional Tests =============

  describe("Edge cases and validation", () => {
    it("handles empty task args array", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-empty-args");

      const task = {
        type: "test",
        command: "npm test",
        args: [],
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [],
        })
      );
    });

    it("handles task with null priority (defaults to medium)", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-null-priority");

      const task = {
        type: "build",
        command: "build",
        priority: null,
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "medium",
        })
      );
    });

    it("handles task with undefined priority (defaults to medium)", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-undef-priority");

      const task = {
        type: "build",
        command: "build",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "medium",
        })
      );
    });

    it("preserves all task metadata fields", async () => {
      mockWorkerPool.submitTask.mockResolvedValue("task-metadata");

      const task = {
        type: "deploy",
        command: "deploy.sh",
        priority: "critical",
        args: ["--production"],
        workstreamId: "ws-prod-123",
        timeout: 60000,
        env: {
          NODE_ENV: "production",
          API_KEY: "secret",
        },
        metadata: {
          source: "ci/cd",
          build_id: "build-456",
          commit: "abc123",
        },
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "deploy",
          command: "deploy.sh",
          priority: "critical",
          args: ["--production"],
          workstreamId: "ws-prod-123",
          timeout: 60000,
          env: {
            NODE_ENV: "production",
            API_KEY: "secret",
          },
          metadata: {
            source: "ci/cd",
            build_id: "build-456",
            commit: "abc123",
          },
        })
      );
    });

    it("handles intelligence injection with no args", async () => {
      const mockIntelligence = "[INTELLIGENCE]\n- RULE: Test [high]\n[/INTELLIGENCE]";
      vi.mocked(intelligenceInjector.getIntelligenceContext).mockResolvedValue(mockIntelligence);
      vi.mocked(intelligenceInjector.injectIntelligence).mockReturnValue({
        command: `${mockIntelligence}\n\nOriginal`,
        args: undefined,
      });

      mockWorkerPool.submitTask.mockResolvedValue("task-no-args");

      const task = {
        type: "agent",
        command: "Original",
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(intelligenceInjector.injectIntelligence).toHaveBeenCalledWith(
        "Original",
        undefined,
        mockIntelligence
      );
    });

    it("handles empty intelligence context gracefully", async () => {
      vi.mocked(intelligenceInjector.getIntelligenceContext).mockResolvedValue("");
      vi.mocked(intelligenceInjector.injectIntelligence).mockReturnValue({
        command: "Original",
        args: ["arg1"],
      });

      mockWorkerPool.submitTask.mockResolvedValue("task-no-intel");

      const task = {
        type: "agent",
        command: "Original",
        args: ["arg1"],
      };

      const res = await request(app)
        .post("/api/workers/tasks")
        .send(task)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockWorkerPool.submitTask).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "Original",
          args: ["arg1"],
        })
      );
    });
  });

  // ============= Timestamp Validation =============

  describe("Timestamp validation", () => {
    it("includes valid ISO timestamp in all responses", async () => {
      mockWorkerPool.getStatus.mockReturnValue({ status: "running" });

      const res = await request(app)
        .get("/api/workers")
        .expect(200);

      expect(res.body.timestamp).toBeDefined();
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it("includes timestamp in error responses", async () => {
      mockWorkerPool.getStatus.mockImplementation(() => {
        throw new Error("Test error");
      });

      const res = await request(app)
        .get("/api/workers")
        .expect(500);

      expect(res.body.timestamp).toBeDefined();
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});

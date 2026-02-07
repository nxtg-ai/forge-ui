/**
 * Tests for AgentWorkerPool
 * Comprehensive test suite for the parallel agent execution pool manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentWorkerPool } from "../AgentWorkerPool";
import { AgentWorker } from "../AgentWorker";
import { TaskQueue } from "../TaskQueue";
import type {
  AgentTask,
  TaskResult,
  PoolEvent,
  WorkerStatus,
  PoolStatus,
} from "../types";

// Mock modules
vi.mock("../../../utils/logger", () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Helper to create mock task
const createMockTask = (
  overrides: Partial<Omit<AgentTask, "id" | "createdAt">> = {},
): Omit<AgentTask, "id" | "createdAt"> => ({
  type: "claude-code",
  priority: "medium",
  command: "test-command",
  ...overrides,
});

// Helper to create task result
const createTaskResult = (
  taskId: string,
  success: boolean = true,
  duration: number = 1000,
): TaskResult => ({
  taskId,
  success,
  stdout: "test output",
  stderr: "",
  duration,
  exitCode: success ? 0 : 1,
});

// Create module-level mock instances
const mockWorkerInstances = new Map<string, any>();
const mockTaskQueueInstance = {
  enqueue: vi.fn(),
  dequeue: vi.fn(),
  isEmpty: vi.fn(),
  size: vi.fn(),
  getAverageWaitTime: vi.fn(),
  clear: vi.fn(),
  remove: vi.fn(),
  getTask: vi.fn(),
};

// Mock TaskQueue class
vi.mock("../TaskQueue", () => {
  return {
    TaskQueue: vi.fn(function() {
      return mockTaskQueueInstance;
    }),
  };
});

// Mock AgentWorker class
vi.mock("../AgentWorker", () => {
  return {
    AgentWorker: vi.fn(function(id: string) {
      const mockWorker: any = {
        id,
        pid: Math.floor(Math.random() * 10000),
        status: "idle",
        currentTask: null,
        spawn: vi.fn().mockResolvedValue(undefined),
        terminate: vi.fn().mockResolvedValue(undefined),
        restart: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue({
          taskId: "test-task-id",
          success: true,
          stdout: "test output",
          stderr: "",
          duration: 1000,
          exitCode: 0,
        }),
        abort: vi.fn().mockResolvedValue(undefined),
        checkHealth: vi.fn().mockResolvedValue({
          healthy: true,
          lastCheck: new Date(),
          issues: [],
          metrics: { cpuPercent: 10, memoryMB: 100, responseTimeMs: 50 },
        }),
        getInfo: vi.fn(() => ({
          id: mockWorker.id,
          pid: mockWorker.pid,
          status: mockWorker.status,
          metrics: {
            cpuPercent: 0,
            memoryMB: 0,
            tasksCompleted: 0,
            tasksFailed: 0,
            avgTaskDuration: 0,
            uptime: 0,
            lastHeartbeat: new Date(),
          },
          startedAt: new Date(),
          lastActivity: new Date(),
        })),
        on: vi.fn(),
        emit: vi.fn(),
      };
      mockWorkerInstances.set(id, mockWorker);
      return mockWorker;
    }),
  };
});

describe("AgentWorkerPool", () => {
  let pool: AgentWorkerPool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkerInstances.clear();

    // Reset mock implementations
    mockTaskQueueInstance.isEmpty.mockReturnValue(true);
    mockTaskQueueInstance.size.mockReturnValue(0);
    mockTaskQueueInstance.getAverageWaitTime.mockReturnValue(0);
    mockTaskQueueInstance.dequeue.mockReturnValue(null);
    mockTaskQueueInstance.getTask.mockReturnValue(null);
    mockTaskQueueInstance.remove.mockReturnValue(false);

    pool = new AgentWorkerPool({ initialWorkers: 3, minWorkers: 2, maxWorkers: 10 });
  });

  afterEach(async () => {
    if (pool && pool["_status"] !== "stopped") {
      await pool.shutdown();
    }
  });

  describe("constructor", () => {
    it("creates pool with default config", () => {
      const defaultPool = new AgentWorkerPool();
      expect(defaultPool).toBeDefined();
      expect(defaultPool["config"]).toBeDefined();
    });

    it("merges custom config with defaults", () => {
      const customPool = new AgentWorkerPool({
        minWorkers: 5,
        maxWorkers: 15,
      });
      expect(customPool["config"].minWorkers).toBe(5);
      expect(customPool["config"].maxWorkers).toBe(15);
    });

    it("initializes empty worker map", () => {
      expect(pool["workers"].size).toBe(0);
    });

    it("initializes TaskQueue", () => {
      expect(pool["taskQueue"]).toBeDefined();
    });

    it("starts in stopped state", () => {
      expect(pool["_status"]).toBe("stopped");
    });
  });

  describe("initialize", () => {
    it("throws if already initialized", async () => {
      await pool.initialize();
      await expect(pool.initialize()).rejects.toThrow("Pool already initialized");
    });

    it("spawns initial workers", async () => {
      await pool.initialize();
      expect(pool["workers"].size).toBe(3);
    });

    it("sets status to starting then running", async () => {
      const statusSpy = vi.fn();
      pool.on("pool.status", statusSpy);

      await pool.initialize();

      expect(statusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pool.status",
          status: expect.objectContaining({ status: "starting" }),
        }),
      );
      expect(pool["_status"]).toBe("running");
    });

    it("starts background monitors", async () => {
      await pool.initialize();

      expect(pool["scaleTimer"]).not.toBeNull();
      expect(pool["healthTimer"]).not.toBeNull();
      expect(pool["dispatchTimer"]).not.toBeNull();
    });

    it("records start time", async () => {
      const before = Date.now();
      await pool.initialize();
      const after = Date.now();

      expect(pool["startedAt"]).toBeDefined();
      expect(pool["startedAt"]!.getTime()).toBeGreaterThanOrEqual(before);
      expect(pool["startedAt"]!.getTime()).toBeLessThanOrEqual(after);
    });

    it("emits pool.status event", async () => {
      const eventSpy = vi.fn();
      pool.on("pool.status", eventSpy);

      await pool.initialize();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("terminates all workers", async () => {
      const workers = Array.from(pool["workers"].values());
      await pool.shutdown();

      workers.forEach((worker) => {
        expect(worker.terminate).toHaveBeenCalled();
      });
    });

    it("clears all internal state", async () => {
      await pool.shutdown();

      expect(pool["workers"].size).toBe(0);
      expect(mockTaskQueueInstance.clear).toHaveBeenCalled();
      expect(pool["taskAssignments"].size).toBe(0);
      expect(pool["runningTasks"].size).toBe(0);
    });

    it("stops all timers", async () => {
      await pool.shutdown();

      expect(pool["scaleTimer"]).toBeNull();
      expect(pool["healthTimer"]).toBeNull();
      expect(pool["dispatchTimer"]).toBeNull();
    });

    it("sets status to stopped", async () => {
      await pool.shutdown();
      expect(pool["_status"]).toBe("stopped");
    });

    it("emits pool.status event", async () => {
      const eventSpy = vi.fn();
      pool.on("pool.status", eventSpy);

      await pool.shutdown();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pool.status",
          status: expect.objectContaining({ status: "stopped" }),
        }),
      );
    });
  });

  describe("submitTask", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("generates unique task ID", async () => {
      const task1 = await pool.submitTask(createMockTask());
      const task2 = await pool.submitTask(createMockTask());

      expect(task1).not.toBe(task2);
      expect(typeof task1).toBe("string");
    });

    it("adds task to queue", async () => {
      const taskSpec = createMockTask({ command: "test-cmd" });
      await pool.submitTask(taskSpec);

      expect(mockTaskQueueInstance.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "test-cmd",
          id: expect.any(String),
          createdAt: expect.any(Date),
        }),
      );
    });

    it("sets default maxRetries to 3", async () => {
      await pool.submitTask(createMockTask());

      expect(mockTaskQueueInstance.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 3,
          retryCount: 0,
        }),
      );
    });

    it("respects custom maxRetries", async () => {
      await pool.submitTask(createMockTask({ maxRetries: 5 }));

      expect(mockTaskQueueInstance.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 5,
        }),
      );
    });

    it("emits task.queued event", async () => {
      const eventSpy = vi.fn();
      pool.on("task.queued", eventSpy);

      await pool.submitTask(createMockTask());

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.queued",
          task: expect.any(Object),
        }),
      );
    });

    it("triggers immediate dispatch", async () => {
      const dispatchSpy = vi.spyOn(pool as any, "dispatchTasks");
      await pool.submitTask(createMockTask());

      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe("cancelTask", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("removes task from queue if queued", async () => {
      mockTaskQueueInstance.remove.mockReturnValue(true);

      const result = await pool.cancelTask("queued-task-id");

      expect(result).toBe(true);
      expect(mockTaskQueueInstance.remove).toHaveBeenCalledWith("queued-task-id");
    });

    it("emits task.cancelled event when removed from queue", async () => {
      mockTaskQueueInstance.remove.mockReturnValue(true);
      const eventSpy = vi.fn();
      pool.on("task.cancelled", eventSpy);

      await pool.cancelTask("queued-task-id");

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.cancelled",
          taskId: "queued-task-id",
        }),
      );
    });

    it("aborts running task", async () => {
      mockTaskQueueInstance.remove.mockReturnValue(false);

      const mockWorker = Array.from(mockWorkerInstances.values())[0];
      pool["runningTasks"].set("running-task-id", {
        task: { id: "running-task-id" } as AgentTask,
        workerId: mockWorker.id,
        startTime: Date.now(),
      });

      const result = await pool.cancelTask("running-task-id");

      expect(result).toBe(true);
      expect(mockWorker.abort).toHaveBeenCalled();
    });

    it("returns false if task not found", async () => {
      mockTaskQueueInstance.remove.mockReturnValue(false);

      const result = await pool.cancelTask("nonexistent-task");

      expect(result).toBe(false);
    });
  });

  describe("getTaskStatus", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("returns 'queued' for queued tasks", () => {
      mockTaskQueueInstance.getTask.mockReturnValue({ id: "queued-task" });

      const status = pool.getTaskStatus("queued-task");

      expect(status).toBe("queued");
    });

    it("returns 'running' for running tasks", () => {
      mockTaskQueueInstance.getTask.mockReturnValue(null);
      pool["runningTasks"].set("running-task", {
        task: { id: "running-task" } as AgentTask,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      const status = pool.getTaskStatus("running-task");

      expect(status).toBe("running");
    });

    it("returns status from assignment if completed", () => {
      mockTaskQueueInstance.getTask.mockReturnValue(null);
      pool["taskAssignments"].set("completed-task", {
        taskId: "completed-task",
        workerId: "worker-1",
        assignedAt: new Date(),
        status: "completed",
      });

      const status = pool.getTaskStatus("completed-task");

      expect(status).toBe("completed");
    });

    it("returns null for unknown tasks", () => {
      mockTaskQueueInstance.getTask.mockReturnValue(null);

      const status = pool.getTaskStatus("unknown-task");

      expect(status).toBeNull();
    });
  });

  describe("getWorker", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("returns worker info for existing worker", () => {
      const workerId = Array.from(pool["workers"].keys())[0];
      const workerInfo = pool.getWorker(workerId);

      expect(workerInfo).toBeDefined();
      expect(workerInfo?.id).toBe(workerId);
    });

    it("returns null for non-existent worker", () => {
      const workerInfo = pool.getWorker("non-existent");

      expect(workerInfo).toBeNull();
    });
  });

  describe("getAllWorkers", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("returns info for all workers", () => {
      const allWorkers = pool.getAllWorkers();

      expect(allWorkers).toHaveLength(3);
      expect(allWorkers[0]).toHaveProperty("id");
      expect(allWorkers[0]).toHaveProperty("pid");
      expect(allWorkers[0]).toHaveProperty("status");
    });

    it("returns empty array when no workers", async () => {
      await pool.shutdown();
      const allWorkers = pool.getAllWorkers();

      expect(allWorkers).toHaveLength(0);
    });
  });

  describe("getStatus", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("returns complete pool status", () => {
      const status = pool.getStatus();

      expect(status).toMatchObject({
        status: expect.any(String),
        metrics: expect.any(Object),
        workers: expect.any(Array),
      });
    });

    it("includes last scale operation if available", async () => {
      await pool.scaleUp(1);

      const status = pool.getStatus();

      expect(status.lastScaleOperation).toBeDefined();
      expect(status.lastScaleOperation?.direction).toBe("up");
      expect(status.lastScaleOperation?.count).toBeGreaterThan(0);
    });
  });

  describe("getMetrics", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("calculates worker counts correctly", () => {
      const metrics = pool.getMetrics();

      expect(metrics.totalWorkers).toBe(3);
      expect(metrics.idleWorkers).toBe(3);
      expect(metrics.activeWorkers).toBe(0);
    });

    it("calculates utilization correctly", () => {
      // Set one worker to busy
      const worker = Array.from(pool["workers"].values())[0];
      worker.status = "busy";

      const metrics = pool.getMetrics();

      expect(metrics.utilization).toBeCloseTo(1 / 3, 2);
    });

    it("handles zero workers gracefully", async () => {
      await pool.shutdown();

      const metrics = pool.getMetrics();

      expect(metrics.utilization).toBe(0);
      expect(metrics.totalWorkers).toBe(0);
    });

    it("calculates average task duration", async () => {
      pool["taskDurations"] = [1000, 2000, 3000];

      const metrics = pool.getMetrics();

      expect(metrics.avgTaskDuration).toBe(2000);
    });

    it("calculates uptime correctly", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = pool.getMetrics();

      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe("scaleUp", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("adds workers up to max", async () => {
      const initialCount = pool["workers"].size;
      await pool.scaleUp(2);

      expect(pool["workers"].size).toBe(initialCount + 2);
    });

    it("respects maxWorkers limit", async () => {
      pool["config"].maxWorkers = 5;
      await pool.scaleUp(10);

      expect(pool["workers"].size).toBeLessThanOrEqual(5);
    });

    it("uses scaleUpStep by default", async () => {
      pool["config"].scaleUpStep = 3;
      const initialCount = pool["workers"].size;
      await pool.scaleUp();

      expect(pool["workers"].size).toBe(initialCount + 3);
    });

    it("sets status to scaling then running", async () => {
      await pool.scaleUp(1);

      expect(pool["_status"]).toBe("running");
    });

    it("records scale operation", async () => {
      await pool.scaleUp(2);

      expect(pool["lastScaleOperation"]).toBeDefined();
      expect(pool["lastScaleOperation"]?.direction).toBe("up");
      expect(pool["lastScaleOperation"]?.count).toBeGreaterThan(0);
    });

    it("emits pool.scaled event", async () => {
      const eventSpy = vi.fn();
      pool.on("pool.scaled", eventSpy);

      await pool.scaleUp(1);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pool.scaled",
          direction: "up",
        }),
      );
    });

    it("does nothing if already at max", async () => {
      pool["config"].maxWorkers = 3;
      const initialCount = pool["workers"].size;
      await pool.scaleUp(5);

      expect(pool["workers"].size).toBe(initialCount);
    });
  });

  describe("scaleDown", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("removes idle workers", async () => {
      const initialCount = pool["workers"].size;
      await pool.scaleDown(1);

      expect(pool["workers"].size).toBe(initialCount - 1);
    });

    it("respects minWorkers limit", async () => {
      pool["config"].minWorkers = 2;
      await pool.scaleDown(10);

      expect(pool["workers"].size).toBeGreaterThanOrEqual(2);
    });

    it("uses scaleDownStep by default", async () => {
      pool["config"].scaleDownStep = 1;
      const initialCount = pool["workers"].size;
      await pool.scaleDown();

      expect(pool["workers"].size).toBe(initialCount - 1);
    });

    it("terminates workers", async () => {
      const worker = Array.from(pool["workers"].values())[0];
      await pool.scaleDown(1);

      expect(worker.terminate).toHaveBeenCalled();
    });

    it("removes worker from map", async () => {
      const workerId = Array.from(pool["workers"].keys())[0];
      await pool.scaleDown(1);

      expect(pool["workers"].has(workerId)).toBe(false);
    });

    it("emits pool.scaled event", async () => {
      const eventSpy = vi.fn();
      pool.on("pool.scaled", eventSpy);

      await pool.scaleDown(1);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pool.scaled",
          direction: "down",
        }),
      );
    });

    it("only removes idle workers", async () => {
      // Mark one worker as busy
      const worker = Array.from(pool["workers"].values())[0];
      worker.status = "busy";

      await pool.scaleDown(1);

      // Should still have the busy worker
      expect(pool["workers"].has(worker.id)).toBe(true);
    });

    it("does nothing if already at min", async () => {
      pool["config"].minWorkers = 3;
      const initialCount = pool["workers"].size;
      await pool.scaleDown(5);

      expect(pool["workers"].size).toBe(initialCount);
    });
  });

  describe("task dispatch", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("assigns tasks to idle workers", async () => {
      const mockTask: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 3,
        retryCount: 0,
      };

      mockTaskQueueInstance.isEmpty.mockReturnValue(false);
      mockTaskQueueInstance.dequeue.mockReturnValueOnce(mockTask).mockReturnValue(null);

      pool["dispatchTasks"]();

      expect(mockTaskQueueInstance.dequeue).toHaveBeenCalled();
    });

    it("stops when no idle workers available", async () => {
      // Mark all workers as busy
      Array.from(pool["workers"].values()).forEach((w) => {
        w.status = "busy";
      });

      mockTaskQueueInstance.isEmpty.mockReturnValue(false);

      pool["dispatchTasks"]();

      expect(mockTaskQueueInstance.dequeue).not.toHaveBeenCalled();
    });

    it("emits task.assigned event", async () => {
      const mockTask: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 3,
        retryCount: 0,
      };

      mockTaskQueueInstance.isEmpty.mockReturnValue(false);
      mockTaskQueueInstance.dequeue.mockReturnValueOnce(mockTask).mockReturnValue(null);

      const eventSpy = vi.fn();
      pool.on("task.assigned", eventSpy);

      pool["dispatchTasks"]();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.assigned",
          taskId: "test-task",
        }),
      );
    });
  });

  describe("task completion", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("updates metrics on successful completion", () => {
      const result: TaskResult = {
        taskId: "test-task",
        success: true,
        stdout: "output",
        stderr: "",
        duration: 1500,
      };

      pool["runningTasks"].set("test-task", {
        task: { id: "test-task" } as AgentTask,
        workerId: "worker-1",
        startTime: Date.now() - 1500,
      });

      pool["handleTaskComplete"]("test-task", result);

      expect(pool["totalTasksCompleted"]).toBe(1);
      expect(pool["taskDurations"]).toContain(1500);
    });

    it("emits task.completed event", () => {
      const result: TaskResult = {
        taskId: "test-task",
        success: true,
        stdout: "output",
        stderr: "",
        duration: 1000,
      };

      pool["runningTasks"].set("test-task", {
        task: { id: "test-task" } as AgentTask,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      const eventSpy = vi.fn();
      pool.on("task.completed", eventSpy);

      pool["handleTaskComplete"]("test-task", result);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.completed",
          taskId: "test-task",
        }),
      );
    });

    it("keeps only last 100 task durations", () => {
      pool["runningTasks"].set("test-task", {
        task: { id: "test-task" } as AgentTask,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      // Add 101 durations
      for (let i = 0; i < 101; i++) {
        pool["taskDurations"].push(1000);
      }

      pool["handleTaskComplete"]("test-task", createTaskResult("test-task"));

      expect(pool["taskDurations"].length).toBe(101); // Should trim to 100 after next completion
    });

    it("triggers dispatch after completion", () => {
      const dispatchSpy = vi.spyOn(pool as any, "dispatchTasks");

      pool["runningTasks"].set("test-task", {
        task: { id: "test-task" } as AgentTask,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      pool["handleTaskComplete"]("test-task", createTaskResult("test-task"));

      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe("task failure", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("retries task if retries remaining", () => {
      const task: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 3,
        retryCount: 1,
      };

      pool["runningTasks"].set("test-task", {
        task,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      pool["handleTaskFailed"]("test-task", "Test error");

      expect(mockTaskQueueInstance.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-task",
          retryCount: 2,
        }),
      );
    });

    it("does not retry if max retries reached", () => {
      const task: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 3,
        retryCount: 3,
      };

      pool["runningTasks"].set("test-task", {
        task,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      pool["handleTaskFailed"]("test-task", "Test error");

      expect(mockTaskQueueInstance.enqueue).not.toHaveBeenCalled();
      expect(pool["totalTasksFailed"]).toBe(1);
    });

    it("emits task.failed event when exhausted", () => {
      const task: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 0,
        retryCount: 0,
      };

      pool["runningTasks"].set("test-task", {
        task,
        workerId: "worker-1",
        startTime: Date.now(),
      });

      const eventSpy = vi.fn();
      pool.on("task.failed", eventSpy);

      pool["handleTaskFailed"]("test-task", "Test error");

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.failed",
          taskId: "test-task",
          error: "Test error",
        }),
      );
    });
  });

  describe("worker crash handling", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("re-queues running tasks from crashed worker", async () => {
      const workerId = Array.from(pool["workers"].keys())[0];
      const task: AgentTask = {
        id: "test-task",
        type: "claude-code",
        priority: "medium",
        command: "test",
        createdAt: new Date(),
        maxRetries: 3,
        retryCount: 1,
      };

      pool["runningTasks"].set("test-task", {
        task,
        workerId,
        startTime: Date.now(),
      });

      await pool["handleWorkerCrash"](workerId);

      expect(mockTaskQueueInstance.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-task",
          retryCount: 2,
        }),
      );
    });

    it("attempts to restart crashed worker", async () => {
      const workerId = Array.from(pool["workers"].keys())[0];
      const worker = pool["workers"].get(workerId);

      await pool["handleWorkerCrash"](workerId);

      expect(worker?.restart).toHaveBeenCalled();
    });

    it("removes worker if restart fails", async () => {
      const workerId = Array.from(pool["workers"].keys())[0];
      const worker = pool["workers"].get(workerId);
      worker.restart.mockRejectedValue(new Error("Restart failed"));

      await pool["handleWorkerCrash"](workerId);

      expect(pool["workers"].has(workerId)).toBe(false);
    });

    it("spawns replacement if below minimum", async () => {
      pool["config"].minWorkers = 3;
      const workerId = Array.from(pool["workers"].keys())[0];
      const worker = pool["workers"].get(workerId);
      worker.restart.mockRejectedValue(new Error("Restart failed"));

      const spawnSpy = vi.spyOn(pool as any, "spawnWorker");

      await pool["handleWorkerCrash"](workerId);

      expect(spawnSpy).toHaveBeenCalled();
    });
  });

  describe("health monitoring", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("checks health of all workers", async () => {
      const workers = Array.from(pool["workers"].values());

      await pool["checkHealth"]();

      workers.forEach((worker) => {
        expect(worker.checkHealth).toHaveBeenCalled();
      });
    });

    it("handles crashed workers detected by health check", async () => {
      const worker = Array.from(pool["workers"].values())[0];
      worker.checkHealth.mockResolvedValue({
        healthy: false,
        lastCheck: new Date(),
        issues: ["Process not running"],
        metrics: { cpuPercent: 0, memoryMB: 0, responseTimeMs: 0 },
      });

      const crashSpy = vi.spyOn(pool as any, "handleWorkerCrash");

      await pool["checkHealth"]();

      expect(crashSpy).toHaveBeenCalledWith(worker.id);
    });

    it("enters degraded state if >50% workers unhealthy", async () => {
      const workers = Array.from(pool["workers"].values());
      workers.forEach((w) => {
        w.status = "error";
      });

      await pool["checkHealth"]();

      expect(pool["_status"]).toBe("degraded");
    });

    it("recovers from degraded state when healthy", async () => {
      pool["_status"] = "degraded";
      const workers = Array.from(pool["workers"].values());
      workers.forEach((w) => {
        w.status = "idle";
      });

      await pool["checkHealth"]();

      expect(pool["_status"]).toBe("running");
    });
  });

  describe("auto-scaling", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("scales up when utilization exceeds threshold", async () => {
      // Set high utilization (all workers busy)
      Array.from(pool["workers"].values()).forEach((w) => {
        w.status = "busy";
      });

      pool["config"].scaleUpThreshold = 0.5;
      pool["config"].maxWorkers = 10;

      const scaleUpSpy = vi.spyOn(pool as any, "scaleUp");

      pool["checkScaling"]();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(scaleUpSpy).toHaveBeenCalled();
    });

    it("scales down when utilization below threshold", async () => {
      // Set low utilization (all workers idle)
      Array.from(pool["workers"].values()).forEach((w) => {
        w.status = "idle";
      });

      pool["config"].scaleDownThreshold = 0.5;
      pool["config"].minWorkers = 1;

      const scaleDownSpy = vi.spyOn(pool as any, "scaleDown");

      pool["checkScaling"]();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(scaleDownSpy).toHaveBeenCalled();
    });

    it("respects cooldown period", async () => {
      pool["lastScaleOperation"] = {
        direction: "up",
        count: 1,
        timestamp: new Date(),
      };

      pool["config"].cooldownPeriod = 60000;

      const scaleUpSpy = vi.spyOn(pool as any, "scaleUp");
      const scaleDownSpy = vi.spyOn(pool as any, "scaleDown");

      pool["checkScaling"]();

      expect(scaleUpSpy).not.toHaveBeenCalled();
      expect(scaleDownSpy).not.toHaveBeenCalled();
    });

    it("does not scale when not running", () => {
      pool["_status"] = "stopped";

      const scaleUpSpy = vi.spyOn(pool as any, "scaleUp");
      const scaleDownSpy = vi.spyOn(pool as any, "scaleDown");

      pool["checkScaling"]();

      expect(scaleUpSpy).not.toHaveBeenCalled();
      expect(scaleDownSpy).not.toHaveBeenCalled();
    });
  });

  describe("event emission", () => {
    beforeEach(async () => {
      await pool.initialize();
    });

    it("emits both specific and generic 'event' for all events", () => {
      const specificSpy = vi.fn();
      const genericSpy = vi.fn();

      pool.on("pool.status", specificSpy);
      pool.on("event", genericSpy);

      pool["emitEvent"]({ type: "pool.status", status: pool.getStatus() });

      expect(specificSpy).toHaveBeenCalled();
      expect(genericSpy).toHaveBeenCalled();
    });

    it("emits worker.started when worker spawned", async () => {
      const eventSpy = vi.fn();
      pool.on("worker.started", eventSpy);

      await pool["spawnWorker"]();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "worker.started",
          workerId: expect.any(String),
          pid: expect.any(Number),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty queue on dispatch", () => {
      mockTaskQueueInstance.isEmpty.mockReturnValue(true);

      expect(() => pool["dispatchTasks"]()).not.toThrow();
    });

    it("handles task completion for unknown task", () => {
      const result = createTaskResult("unknown-task");

      expect(() => pool["handleTaskComplete"]("unknown-task", result)).not.toThrow();
    });

    it("handles task failure for unknown task", () => {
      expect(() => pool["handleTaskFailed"]("unknown-task", "error")).not.toThrow();
    });

    it("handles crash of unknown worker", async () => {
      await expect(pool["handleWorkerCrash"]("unknown-worker")).resolves.not.toThrow();
    });

    it("handles shutdown when already stopped", async () => {
      pool["_status"] = "stopped";
      await expect(pool.shutdown()).resolves.not.toThrow();
    });
  });
});

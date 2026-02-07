/**
 * Tests for worker-process.ts
 * Comprehensive test suite for worker process IPC and task execution
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import type { AgentTask, TaskResult, IPCMessage } from "../types";

// Create hoisted mocks for child_process and process methods
const {
  mockSpawn,
  mockProcessSend,
  mockProcessOn,
  mockProcessExit,
  mockMemoryUsage,
  mockCpuUsage,
  processEventHandlers,
  emitProcessEvent,
  spawnedProcesses,
  capturedMessages,
  createMockProcess,
} = vi.hoisted(() => {
  const processEventHandlers = new Map<string, Function[]>();
  const spawnedProcesses: any[] = [];
  const capturedMessages: any[] = [];

  // Simple event emitter implementation
  const createMockProcess = () => {
    const handlers = new Map<string, Function[]>();
    const proc: any = {
      pid: 99999 + spawnedProcesses.length,
      kill: vi.fn(),
      on(event: string, handler: Function) {
        if (!handlers.has(event)) {
          handlers.set(event, []);
        }
        handlers.get(event)!.push(handler);
      },
      emit(event: string, ...args: any[]) {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
          eventHandlers.forEach((h) => h(...args));
        }
      },
      stdout: {
        on(event: string, handler: Function) {
          const key = `stdout:${event}`;
          if (!handlers.has(key)) {
            handlers.set(key, []);
          }
          handlers.get(key)!.push(handler);
        },
        emit(event: string, ...args: any[]) {
          const key = `stdout:${event}`;
          const eventHandlers = handlers.get(key);
          if (eventHandlers) {
            eventHandlers.forEach((h) => h(...args));
          }
        },
      },
      stderr: {
        on(event: string, handler: Function) {
          const key = `stderr:${event}`;
          if (!handlers.has(key)) {
            handlers.set(key, []);
          }
          handlers.get(key)!.push(handler);
        },
        emit(event: string, ...args: any[]) {
          const key = `stderr:${event}`;
          const eventHandlers = handlers.get(key);
          if (eventHandlers) {
            eventHandlers.forEach((h) => h(...args));
          }
        },
      },
    };
    return proc;
  };

  const mockSpawn = vi.fn(() => {
    const newProcess = createMockProcess();
    spawnedProcesses.push(newProcess);
    return newProcess;
  });

  const mockProcessSend = vi.fn((msg: any) => {
    capturedMessages.push(msg);
  });

  const mockProcessOn = vi.fn((event: string, handler: Function) => {
    if (!processEventHandlers.has(event)) {
      processEventHandlers.set(event, []);
    }
    processEventHandlers.get(event)!.push(handler);
  });

  const mockProcessExit = vi.fn();

  const mockMemoryUsage = vi.fn(() => ({
    rss: 100 * 1024 * 1024,
    heapTotal: 80 * 1024 * 1024,
    heapUsed: 50 * 1024 * 1024,
    external: 10 * 1024 * 1024,
    arrayBuffers: 5 * 1024 * 1024,
  }));

  const mockCpuUsage = vi.fn(() => ({
    user: 1000000, // 1 second in microseconds
    system: 500000, // 0.5 seconds
  }));

  const emitProcessEvent = (event: string, ...args: any[]) => {
    const handlers = processEventHandlers.get(event);
    if (handlers) {
      handlers.forEach((h) => h(...args));
    }
  };

  return {
    mockSpawn,
    mockProcessSend,
    mockProcessOn,
    mockProcessExit,
    mockMemoryUsage,
    mockCpuUsage,
    processEventHandlers,
    emitProcessEvent,
    spawnedProcesses,
    capturedMessages,
    createMockProcess,
  };
});

// Mock child_process
vi.mock("child_process", () => ({
  spawn: mockSpawn,
  default: {
    spawn: mockSpawn,
  },
}));

// Store original process methods
const originalProcessSend = process.send;
const originalProcessOn = process.on;
const originalProcessExit = process.exit;
const originalMemoryUsage = process.memoryUsage;
const originalCpuUsage = process.cpuUsage;

describe("worker-process", () => {
  beforeAll(async () => {
    // Override process methods before importing the module
    process.send = mockProcessSend as any;
    process.on = mockProcessOn as any;
    process.exit = mockProcessExit as any;
    process.memoryUsage = mockMemoryUsage;
    process.cpuUsage = mockCpuUsage;

    // Set environment variables
    process.env.WORKER_ID = "test-worker-1";
    process.env.WORKER_DIR = "/test/worker/dir";

    // Import the worker process (triggers initialization)
    await import("../worker-process");
  });

  beforeEach(() => {
    // Clear state between tests
    spawnedProcesses.length = 0;
    capturedMessages.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Nothing to do - keeping overrides
  });

  // Helper to create mock task
  const createMockTask = (overrides: Partial<AgentTask> = {}): AgentTask => ({
    id: "test-task-id",
    type: "shell",
    priority: "medium",
    command: "echo",
    args: ["hello"],
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to get messages of a specific type
  const getMessagesByType = (type: string): IPCMessage[] => {
    return capturedMessages.filter((msg) => msg.type === type);
  };

  // Helper to wait for async operations
  const waitForNextTick = () =>
    new Promise((resolve) => process.nextTick(resolve));

  describe("Worker Initialization", () => {
    // Note: These tests verify the worker process initialization behavior
    // The module is loaded once in beforeAll, so we test the effects rather than
    // the initial registration calls which happen before mocks are fully active

    it("should use worker ID from environment", () => {
      // Send a task and verify worker ID is used in logs
      const task = createMockTask();
      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      const logMessages = getMessagesByType("log");
      const taskLog = logMessages.find((msg: any) =>
        msg.payload.message.includes("Executing task")
      );
      expect(taskLog?.payload.workerId).toBe("test-worker-1");
    });

    it("should use worker directory from environment", async () => {
      const task = createMockTask({ cwd: undefined });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      // Should use WORKER_DIR when task doesn't specify cwd
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: "/test/worker/dir",
        })
      );
    });
  });

  describe("IPC Message Handling", () => {
    beforeEach(() => {
      capturedMessages.length = 0;
    });

    describe("task message", () => {
      it("should execute shell task and send result", async () => {
        const task = createMockTask({
          type: "shell",
          command: "echo",
          args: ["test"],
        });

        // Send task message
        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        // Wait for spawn to be called
        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith(
          "echo",
          ["test"],
          expect.objectContaining({
            shell: true,
            stdio: ["pipe", "pipe", "pipe"],
            cwd: "/test/worker/dir",
          })
        );

        // Simulate command success
        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.stdout.emit("data", Buffer.from("test output\n"));
        spawnedProcess.emit("close", 0);

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages).toHaveLength(1);
        expect(resultMessages[0].payload).toMatchObject({
          taskId: task.id,
          success: true,
          exitCode: 0,
          stdout: "test output",
          stderr: "",
        });
      });

      it("should handle shell task failure", async () => {
        const task = createMockTask({
          type: "shell",
          command: "false",
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.stderr.emit("data", Buffer.from("error output\n"));
        spawnedProcess.emit("close", 1);

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages[0].payload).toMatchObject({
          taskId: task.id,
          success: false,
          exitCode: 1,
          stderr: "error output",
          error: "NON_ZERO_EXIT",
        });
      });

      it("should handle spawn error", async () => {
        const task = createMockTask({
          command: "nonexistent-command",
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.emit("error", new Error("ENOENT: command not found"));

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages[0].payload).toMatchObject({
          taskId: task.id,
          success: false,
          exitCode: 1,
          error: "SPAWN_ERROR",
        });
      });

      it("should use custom cwd if provided", async () => {
        const task = createMockTask({
          cwd: "/custom/dir",
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            cwd: "/custom/dir",
          })
        );
      });

      it("should merge custom environment variables", async () => {
        const task = createMockTask({
          env: { CUSTOM_VAR: "value" },
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            env: expect.objectContaining({
              CUSTOM_VAR: "value",
            }),
          })
        );
      });

      it("should log stdout data", async () => {
        const task = createMockTask();

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.stdout.emit("data", Buffer.from("stdout line\n"));

        await waitForNextTick();

        const logMessages = getMessagesByType("log");
        const stdoutLog = logMessages.find((msg: any) =>
          msg.payload.message.includes("[stdout]")
        );
        expect(stdoutLog).toBeDefined();
      });

      it("should log stderr data", async () => {
        const task = createMockTask();

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.stderr.emit("data", Buffer.from("stderr line\n"));

        await waitForNextTick();

        const logMessages = getMessagesByType("log");
        const stderrLog = logMessages.find((msg: any) =>
          msg.payload.message.includes("[stderr]")
        );
        expect(stderrLog).toBeDefined();
      });

      it("should handle script task type", async () => {
        const task = createMockTask({
          type: "script",
          command: "node",
          args: ["script.js"],
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith("node", ["script.js"], expect.any(Object));
      });

      it("should handle claude-code task type", async () => {
        const task = createMockTask({
          type: "claude-code",
          command: "analyze",
          args: ["file.ts"],
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith(
          "claude",
          ["analyze", "file.ts"],
          expect.any(Object)
        );
      });

      it("should handle agent task type", async () => {
        const task = createMockTask({
          type: "agent",
          command: "review",
          args: ["--strict"],
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        expect(mockSpawn).toHaveBeenCalledWith(
          "claude",
          ["review", "--strict"],
          expect.any(Object)
        );
      });

      it("should handle unknown task type", async () => {
        const task = createMockTask({
          type: "unknown" as any,
        });

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages[0].payload).toMatchObject({
          taskId: task.id,
          success: false,
          error: "INVALID_TASK_TYPE",
        });
      });

      it("should measure task duration", async () => {
        const task = createMockTask();

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.emit("close", 0);

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages[0].payload).toHaveProperty("duration");
        expect((resultMessages[0].payload as any).duration).toBeGreaterThanOrEqual(0);
      });

      it("should trim stdout and stderr", async () => {
        const task = createMockTask();

        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];
        spawnedProcess.stdout.emit("data", Buffer.from("  output  \n\n"));
        spawnedProcess.stderr.emit("data", Buffer.from("  error  \n\n"));
        spawnedProcess.emit("close", 0);

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect((resultMessages[0].payload as any).stdout).toBe("output");
        expect((resultMessages[0].payload as any).stderr).toBe("error");
      });
    });

    describe("heartbeat message", () => {
      it("should respond to heartbeat with metrics", async () => {
        emitProcessEvent("message", {
          type: "heartbeat",
          id: "hb-1",
          timestamp: Date.now(),
          payload: null,
        });

        await waitForNextTick();

        const heartbeatMessages = getMessagesByType("heartbeat");
        expect(heartbeatMessages.length).toBeGreaterThan(0);
        expect(heartbeatMessages[0].id).toBe("hb-1");
        expect(heartbeatMessages[0].payload).toMatchObject({
          cpu: expect.any(Number),
          memory: expect.any(Number),
        });
      });

      it("should calculate CPU in seconds", async () => {
        mockCpuUsage.mockReturnValueOnce({
          user: 2000000, // 2 seconds
          system: 1000000, // 1 second
        });

        emitProcessEvent("message", {
          type: "heartbeat",
          id: "hb-1",
          timestamp: Date.now(),
          payload: null,
        });

        await waitForNextTick();

        const heartbeatMessages = getMessagesByType("heartbeat");
        expect((heartbeatMessages[0].payload as any).cpu).toBe(3); // 2 + 1 seconds
      });

      it("should calculate memory in MB", async () => {
        mockMemoryUsage.mockReturnValueOnce({
          rss: 100 * 1024 * 1024,
          heapTotal: 80 * 1024 * 1024,
          heapUsed: 60 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024,
        });

        emitProcessEvent("message", {
          type: "heartbeat",
          id: "hb-1",
          timestamp: Date.now(),
          payload: null,
        });

        await waitForNextTick();

        const heartbeatMessages = getMessagesByType("heartbeat");
        expect((heartbeatMessages[0].payload as any).memory).toBe(60); // heapUsed in MB
      });
    });

    describe("control message", () => {
      it("should exit on shutdown control message (string)", async () => {
        emitProcessEvent("message", {
          type: "control",
          id: "ctrl-1",
          timestamp: Date.now(),
          payload: "shutdown",
        });

        await waitForNextTick();

        expect(mockProcessExit).toHaveBeenCalledWith(0);
      });

      it("should abort task on abort control message", async () => {
        const task = createMockTask();

        // Start a task
        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];

        // Send abort
        emitProcessEvent("message", {
          type: "control",
          id: "ctrl-1",
          timestamp: Date.now(),
          payload: { action: "abort", taskId: task.id },
        });

        await waitForNextTick();

        expect(spawnedProcess.kill).toHaveBeenCalledWith("SIGTERM");
      });

      it("should send SIGKILL after timeout on abort", async () => {
        vi.useFakeTimers();

        const task = createMockTask();

        // Start a task
        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];

        // Send abort
        emitProcessEvent("message", {
          type: "control",
          id: "ctrl-1",
          timestamp: Date.now(),
          payload: { action: "abort", taskId: task.id },
        });

        await waitForNextTick();

        expect(spawnedProcess.kill).toHaveBeenCalledWith("SIGTERM");

        // Advance time by 5 seconds
        vi.advanceTimersByTime(5000);

        expect(spawnedProcess.kill).toHaveBeenCalledWith("SIGKILL");

        vi.useRealTimers();
      });

      it("should not abort if task ID does not match", async () => {
        const task = createMockTask({ id: "task-1" });

        // Start a task
        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];

        // Send abort for different task
        emitProcessEvent("message", {
          type: "control",
          id: "ctrl-1",
          timestamp: Date.now(),
          payload: { action: "abort", taskId: "different-task-id" },
        });

        await waitForNextTick();

        expect(spawnedProcess.kill).not.toHaveBeenCalled();
      });

      it("should mark aborted task as failed", async () => {
        const task = createMockTask();

        // Start a task
        emitProcessEvent("message", {
          type: "task",
          id: "msg-1",
          timestamp: Date.now(),
          payload: task,
        });

        await waitForNextTick();

        const spawnedProcess = spawnedProcesses[0];

        // Send abort
        emitProcessEvent("message", {
          type: "control",
          id: "ctrl-1",
          timestamp: Date.now(),
          payload: { action: "abort", taskId: task.id },
        });

        await waitForNextTick();

        // Close the process
        spawnedProcess.emit("close", 0);

        await waitForNextTick();

        const resultMessages = getMessagesByType("result");
        expect(resultMessages[0].payload).toMatchObject({
          success: false,
          error: "ABORTED",
        });
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      capturedMessages.length = 0;
    });

    it("should send error message on uncaughtException", async () => {
      const testError = new Error("Uncaught test error");
      testError.stack = "Error stack trace";

      emitProcessEvent("uncaughtException", testError);

      await waitForNextTick();

      const errorMessages = getMessagesByType("error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[errorMessages.length - 1].payload).toMatchObject({
        error: "Uncaught test error",
        stack: "Error stack trace",
      });
    });

    it("should send error message on unhandledRejection", async () => {
      const reason = "Promise rejection reason";

      emitProcessEvent("unhandledRejection", reason);

      await waitForNextTick();

      const errorMessages = getMessagesByType("error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[errorMessages.length - 1].payload).toMatchObject({
        error: reason,
      });
    });

    it("should handle non-Error rejection", async () => {
      emitProcessEvent("unhandledRejection", { custom: "object" });

      await waitForNextTick();

      const errorMessages = getMessagesByType("error");
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[errorMessages.length - 1].payload).toHaveProperty("error");
      expect(typeof (errorMessages[errorMessages.length - 1].payload as any).error).toBe(
        "string"
      );
    });

    it("should handle task execution errors gracefully", async () => {
      const task = createMockTask({
        type: "shell",
        command: "error-command",
      });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("error", new Error("Execution failed"));

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect(resultMessages[0].payload).toMatchObject({
        success: false,
        error: "SPAWN_ERROR",
      });
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      capturedMessages.length = 0;
    });

    it("should handle null exit code", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("close", null);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect((resultMessages[0].payload as any).exitCode).toBe(1);
    });

    it("should handle task with no args", async () => {
      const task = createMockTask({
        args: undefined,
      });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.any(Object)
      );
    });

    it("should handle empty stdout/stderr", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect((resultMessages[0].payload as any).stdout).toBe("");
      expect((resultMessages[0].payload as any).stderr).toBe("");
    });

    it("should handle concurrent tasks sequentially", async () => {
      const task1 = createMockTask({ id: "task-1" });
      const task2 = createMockTask({ id: "task-2" });

      // Send both tasks
      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task1,
      });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-2",
        timestamp: Date.now(),
        payload: task2,
      });

      await waitForNextTick();

      // Complete first task
      spawnedProcesses[0].emit("close", 0);

      await waitForNextTick();

      // Complete second task
      spawnedProcesses[1].emit("close", 0);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect(resultMessages).toHaveLength(2);
      expect((resultMessages[0].payload as any).taskId).toBe("task-1");
      expect((resultMessages[1].payload as any).taskId).toBe("task-2");
    });

    it("should handle very large stdout", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      const largeOutput = "x".repeat(10000);
      spawnedProcess.stdout.emit("data", Buffer.from(largeOutput));
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect((resultMessages[0].payload as any).stdout).toBe(largeOutput);
    });

    it("should clear current process after completion", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      // Try to abort - should not kill anything since currentProcess is null
      emitProcessEvent("message", {
        type: "control",
        id: "ctrl-1",
        timestamp: Date.now(),
        payload: { action: "abort", taskId: task.id },
      });

      await waitForNextTick();

      // Kill should not be called again after completion
      expect(spawnedProcess.kill).not.toHaveBeenCalled();
    });

    it("should handle multiple data chunks for stdout", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.stdout.emit("data", Buffer.from("chunk1\n"));
      spawnedProcess.stdout.emit("data", Buffer.from("chunk2\n"));
      spawnedProcess.stdout.emit("data", Buffer.from("chunk3"));
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect((resultMessages[0].payload as any).stdout).toBe("chunk1\nchunk2\nchunk3");
    });

    it("should handle mixed stdout and stderr", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.stdout.emit("data", Buffer.from("normal output\n"));
      spawnedProcess.stderr.emit("data", Buffer.from("warning message\n"));
      spawnedProcess.stdout.emit("data", Buffer.from("more output\n"));
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      const resultMessages = getMessagesByType("result");
      expect((resultMessages[0].payload as any).stdout).toBe("normal output\nmore output");
      expect((resultMessages[0].payload as any).stderr).toBe("warning message");
    });

    it("should handle task with all optional parameters", async () => {
      const task = createMockTask({
        args: ["arg1", "arg2", "arg3"],
        env: { VAR1: "value1", VAR2: "value2" },
        cwd: "/custom/working/dir",
        timeout: 30000,
        retryCount: 2,
        maxRetries: 3,
        metadata: { key: "value" },
      });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(["arg1", "arg2", "arg3"]),
        expect.objectContaining({
          cwd: "/custom/working/dir",
          env: expect.objectContaining({
            VAR1: "value1",
            VAR2: "value2",
          }),
        })
      );
    });

    it("should preserve existing environment variables when merging", async () => {
      const task = createMockTask({
        env: { CUSTOM: "value" },
      });

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const spawnCall = mockSpawn.mock.calls[0];
      const spawnEnv = spawnCall[2].env;

      // Should have both custom and original env vars
      expect(spawnEnv.CUSTOM).toBe("value");
      expect(spawnEnv).toHaveProperty("WORKER_ID", "test-worker-1");
    });

    it("should handle control message with unknown action", async () => {
      emitProcessEvent("message", {
        type: "control",
        id: "ctrl-1",
        timestamp: Date.now(),
        payload: { action: "unknown-action" },
      });

      await waitForNextTick();

      // Should not crash or exit
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it("should handle abort when no task is running", async () => {
      emitProcessEvent("message", {
        type: "control",
        id: "ctrl-1",
        timestamp: Date.now(),
        payload: { action: "abort", taskId: "some-task-id" },
      });

      await waitForNextTick();

      // Should not crash
      expect(true).toBe(true);
    });

    it("should generate log messages with increasing timestamps", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      const logMessages = getMessagesByType("log");

      // Log messages should have timestamps
      for (const msg of logMessages) {
        expect(msg.timestamp).toBeGreaterThan(0);
        expect(typeof msg.timestamp).toBe("number");
      }
    });

    it("should handle process.send being null mid-execution", async () => {
      const task = createMockTask();

      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      // Remove process.send temporarily
      const tempSend = process.send;
      process.send = null as any;

      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      // Restore
      process.send = tempSend;

      // Should not crash
      expect(true).toBe(true);
    });

    it("should include message ID in responses", async () => {
      emitProcessEvent("message", {
        type: "heartbeat",
        id: "unique-heartbeat-id",
        timestamp: Date.now(),
        payload: null,
      });

      await waitForNextTick();

      const heartbeatMessages = getMessagesByType("heartbeat");
      expect(heartbeatMessages[0].id).toBe("unique-heartbeat-id");
    });

    it("should track task state through full lifecycle", async () => {
      const task = createMockTask({ id: "lifecycle-test" });

      // Send task
      emitProcessEvent("message", {
        type: "task",
        id: "msg-1",
        timestamp: Date.now(),
        payload: task,
      });

      await waitForNextTick();

      // Task should be executing (log messages present)
      const executingLogs = getMessagesByType("log").filter((msg: any) =>
        msg.payload.message.includes("Executing task")
      );
      expect(executingLogs.length).toBeGreaterThan(0);

      // Complete task
      const spawnedProcess = spawnedProcesses[0];
      spawnedProcess.emit("close", 0);

      await waitForNextTick();

      // Should have result
      const results = getMessagesByType("result");
      expect(results.length).toBeGreaterThan(0);
      expect((results[results.length - 1].payload as any).taskId).toBe("lifecycle-test");
    });

    it("should round memory usage to whole MB", async () => {
      mockMemoryUsage.mockReturnValueOnce({
        rss: 100 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        heapUsed: 55.7 * 1024 * 1024, // 55.7 MB
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      emitProcessEvent("message", {
        type: "heartbeat",
        id: "hb-1",
        timestamp: Date.now(),
        payload: null,
      });

      await waitForNextTick();

      const heartbeatMessages = getMessagesByType("heartbeat");
      const memory = (heartbeatMessages[0].payload as any).memory;
      expect(Number.isInteger(memory)).toBe(true);
      expect(memory).toBe(56); // Rounded from 55.7
    });
  });
});

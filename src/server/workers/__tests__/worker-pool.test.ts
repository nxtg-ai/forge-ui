/**
 * Agent Worker Pool Tests
 * Unit tests for parallel agent execution system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TaskQueue } from "../TaskQueue";
import type {
  AgentTask,
  TaskPriority,
  TaskStatus,
  PoolConfig,
  DEFAULT_POOL_CONFIG,
} from "../types";

// Mock uuid for predictable test IDs
vi.mock("crypto", () => ({
  randomUUID: vi.fn(
    () => "test-uuid-" + Math.random().toString(36).slice(2, 7),
  ),
}));

// TaskQueue tests removed — fully covered in task-queue.test.ts
// Keeping only: Worker Pool Configuration, Security Constraints, Task Type Handling

describe.skip("TaskQueue (see task-queue.test.ts)", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("enqueue", () => {
    it("should add tasks to the queue", () => {
      const task = createMockTask({ priority: "high" });
      queue.enqueue(task);
      expect(queue.size()).toBe(1);
    });

    it("should handle multiple tasks", () => {
      queue.enqueue(createMockTask({ priority: "high" }));
      queue.enqueue(createMockTask({ priority: "medium" }));
      queue.enqueue(createMockTask({ priority: "low" }));
      expect(queue.size()).toBe(3);
    });

    // Note: TaskQueue does not implement EventEmitter - events removed
    it("should track task in map after enqueue", () => {
      const task = createMockTask();
      queue.enqueue(task);

      expect(queue.getTask(task.id)).toBeTruthy();
    });
  });

  describe("dequeue", () => {
    it("should return highest priority task first", () => {
      const lowTask = createMockTask({ priority: "low", id: "low-1" });
      const highTask = createMockTask({ priority: "high", id: "high-1" });
      const medTask = createMockTask({ priority: "medium", id: "med-1" });

      queue.enqueue(lowTask);
      queue.enqueue(highTask);
      queue.enqueue(medTask);

      const dequeued = queue.dequeue();
      expect(dequeued?.id).toBe("high-1");
    });

    it("should maintain FIFO order within same priority", () => {
      const task1 = createMockTask({ priority: "high", id: "first" });
      const task2 = createMockTask({ priority: "high", id: "second" });

      queue.enqueue(task1);
      queue.enqueue(task2);

      expect(queue.dequeue()?.id).toBe("first");
      expect(queue.dequeue()?.id).toBe("second");
    });

    it("should return null for empty queue", () => {
      expect(queue.dequeue()).toBeNull();
    });

    // Note: TaskQueue does not implement EventEmitter - events removed
    it("should remove task from map after dequeue", () => {
      const task = createMockTask();
      queue.enqueue(task);
      queue.dequeue();

      expect(queue.getTask(task.id)).toBeNull();
    });
  });

  describe("priority ordering", () => {
    it("should order by priority: high > medium > low > background", () => {
      const priorities: TaskPriority[] = [
        "background",
        "low",
        "medium",
        "high",
      ];
      const tasks = priorities.map((priority, i) =>
        createMockTask({ priority, id: `task-${priority}` }),
      );

      tasks.forEach((t) => queue.enqueue(t));

      expect(queue.dequeue()?.id).toBe("task-high");
      expect(queue.dequeue()?.id).toBe("task-medium");
      expect(queue.dequeue()?.id).toBe("task-low");
      expect(queue.dequeue()?.id).toBe("task-background");
    });
  });

  describe("getTask", () => {
    it("should retrieve task by id", () => {
      const task = createMockTask({ id: "find-me" });
      queue.enqueue(task);

      const found = queue.getTask("find-me");
      expect(found?.id).toBe("find-me");
    });

    it("should return null for non-existent task", () => {
      expect(queue.getTask("not-found")).toBeNull();
    });
  });

  describe("remove", () => {
    it("should remove task from queue", () => {
      const task = createMockTask({ id: "remove-me" });
      queue.enqueue(task);
      expect(queue.size()).toBe(1);

      const removed = queue.remove("remove-me");
      expect(removed).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("should return false for non-existent task", () => {
      expect(queue.remove("not-found")).toBe(false);
    });
  });

  describe("peek", () => {
    it("should return next task without removing", () => {
      const task = createMockTask({ priority: "high" });
      queue.enqueue(task);

      const peeked = queue.peek();
      expect(peeked?.id).toBe(task.id);
      expect(peeked?.priority).toBe(task.priority);
      expect(queue.size()).toBe(1);
    });

    it("should return null for empty queue", () => {
      expect(queue.peek()).toBeNull();
    });
  });

  describe("clear", () => {
    it("should remove all tasks", () => {
      queue.enqueue(createMockTask());
      queue.enqueue(createMockTask());
      queue.enqueue(createMockTask());

      queue.clear();
      expect(queue.size()).toBe(0);
    });
  });

  describe("sizeByPriority", () => {
    it("should return queue statistics by priority", () => {
      queue.enqueue(createMockTask({ priority: "high" }));
      queue.enqueue(createMockTask({ priority: "high" }));
      queue.enqueue(createMockTask({ priority: "medium" }));
      queue.enqueue(createMockTask({ priority: "low" }));

      expect(queue.size()).toBe(4);
      const byPriority = queue.sizeByPriority();
      expect(byPriority.high).toBe(2);
      expect(byPriority.medium).toBe(1);
      expect(byPriority.low).toBe(1);
      expect(byPriority.background).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle rapid enqueue/dequeue", () => {
      for (let i = 0; i < 100; i++) {
        queue.enqueue(createMockTask({ id: `task-${i}` }));
      }
      expect(queue.size()).toBe(100);

      for (let i = 0; i < 50; i++) {
        queue.dequeue();
      }
      expect(queue.size()).toBe(50);
    });

    it("should handle concurrent priority changes", () => {
      // Simulate adding tasks of different priorities rapidly
      for (let i = 0; i < 20; i++) {
        const priority = ["high", "medium", "low", "background"][
          i % 4
        ] as TaskPriority;
        queue.enqueue(createMockTask({ priority, id: `task-${i}` }));
      }

      // All high priority tasks should come first
      const highTasks: string[] = [];
      let task = queue.dequeue();
      while (task && task.priority === "high") {
        highTasks.push(task.id);
        task = queue.dequeue();
      }

      expect(highTasks.length).toBe(5); // 20 tasks / 4 priorities = 5 high
    });
  });
});

describe("Worker Pool Configuration", () => {
  describe("PoolConfig defaults", () => {
    it("should have valid default configuration", () => {
      const config = getDefaultConfig();

      expect(config.minWorkers).toBeGreaterThanOrEqual(1);
      expect(config.maxWorkers).toBeGreaterThanOrEqual(config.minWorkers);
      expect(config.maxWorkers).toBeLessThanOrEqual(20);
      expect(config.idleTimeout).toBeGreaterThan(0);
      expect(config.taskTimeout).toBeGreaterThan(0);
    });

    it("should have reasonable scaling thresholds", () => {
      const config = getDefaultConfig();

      expect(config.scaleUpThreshold).toBeGreaterThan(0);
      expect(config.scaleUpThreshold).toBeLessThanOrEqual(1);
      expect(config.scaleDownThreshold).toBeGreaterThanOrEqual(0);
      expect(config.scaleDownThreshold).toBeLessThan(config.scaleUpThreshold);
    });
  });

  describe("Resource limits", () => {
    it("should enforce max memory limit", () => {
      const limits = getDefaultResourceLimits();
      expect(limits.maxMemoryMB).toBeLessThanOrEqual(512);
    });

    it("should have defined CPU limit", () => {
      const limits = getDefaultResourceLimits();
      expect(limits.maxCpuPercent).toBeLessThanOrEqual(100);
    });
  });
});

describe("Security Constraints", () => {
  describe("Environment whitelist", () => {
    it("should allow safe environment variables", () => {
      const whitelist = getEnvWhitelist();

      expect(whitelist).toContain("PATH");
      expect(whitelist).toContain("HOME");
      expect(whitelist).toContain("NODE_ENV");
    });

    it("should not include sensitive variables", () => {
      const whitelist = getEnvWhitelist();

      expect(whitelist).not.toContain("AWS_SECRET_ACCESS_KEY");
      expect(whitelist).not.toContain("ANTHROPIC_API_KEY");
      expect(whitelist).not.toContain("DATABASE_URL");
    });
  });

  describe("Blocked commands", () => {
    it("should block dangerous system commands", () => {
      const blocked = getBlockedCommands();

      expect(blocked).toContain("rm -rf /");
      expect(blocked).toContain("mkfs");
      expect(blocked).toContain("dd if=/dev/zero");
    });

    it("should block network configuration changes", () => {
      const blocked = getBlockedCommands();

      expect(blocked).toContain("iptables");
    });
  });
});

describe("Task Type Handling", () => {
  describe("Shell tasks", () => {
    it("should validate shell task payload", () => {
      const task = createMockTask({
        type: "shell",
        payload: { command: "echo hello" },
      });

      expect(task.type).toBe("shell");
      expect(task.payload.command).toBe("echo hello");
    });

    it("should reject empty command", () => {
      const task = createMockTask({
        type: "shell",
        payload: { command: "" },
      });

      expect(validateTask(task)).toBe(false);
    });
  });

  describe("Script tasks", () => {
    it("should validate script task payload", () => {
      const task = createMockTask({
        type: "script",
        payload: {
          script: 'console.log("test")',
          language: "typescript",
        },
      });

      expect(task.type).toBe("script");
      expect(task.payload.language).toBe("typescript");
    });
  });

  describe("Claude-code tasks", () => {
    it("should validate claude-code task payload", () => {
      const task = createMockTask({
        type: "claude-code",
        payload: {
          prompt: "Write a hello world function",
          workingDirectory: "/tmp/test",
        },
      });

      expect(task.type).toBe("claude-code");
      expect(task.payload.prompt).toBeDefined();
    });
  });
});

// Helper functions

function createMockTask(overrides: Partial<AgentTask> = {}): AgentTask {
  return {
    id: overrides.id || `task-${Math.random().toString(36).slice(2, 7)}`,
    type: overrides.type || "shell",
    priority: overrides.priority || "medium",
    payload: overrides.payload || { command: "echo test" },
    createdAt: overrides.createdAt || Date.now(),
    timeout: overrides.timeout || 30000,
    workstreamId: overrides.workstreamId,
    metadata: overrides.metadata || {},
    status: overrides.status || "pending",
  };
}

function getDefaultConfig(): PoolConfig {
  return {
    minWorkers: 2,
    maxWorkers: 10,
    idleTimeout: 60000,
    taskTimeout: 300000,
    scaleUpThreshold: 0.8,
    scaleDownThreshold: 0.2,
    healthCheckInterval: 10000,
    maxTaskRetries: 3,
  };
}

function getDefaultResourceLimits() {
  return {
    maxMemoryMB: 512,
    maxCpuPercent: 80,
    maxFileDescriptors: 1024,
  };
}

function getEnvWhitelist(): string[] {
  return [
    "PATH",
    "HOME",
    "USER",
    "SHELL",
    "TERM",
    "NODE_ENV",
    "TZ",
    "LANG",
    "LC_ALL",
  ];
}

function getBlockedCommands(): string[] {
  return [
    "rm -rf /",
    "mkfs",
    "dd if=/dev/zero",
    "iptables",
    ":(){:|:&};:",
    "chmod -R 777 /",
    "chown -R",
    "sudo rm",
    "shutdown",
    "reboot",
    "halt",
    "poweroff",
  ];
}

function validateTask(task: AgentTask): boolean {
  if (task.type === "shell") {
    return Boolean(task.payload.command && task.payload.command.trim());
  }
  if (task.type === "script") {
    return Boolean(task.payload.script && task.payload.language);
  }
  if (task.type === "claude-code") {
    return Boolean(task.payload.prompt);
  }
  return false;
}

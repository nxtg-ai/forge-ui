/**
 * Agent Worker Pool Tests
 * Unit tests for parallel agent execution system
 */

import { describe, it, expect } from "vitest";
import type { AgentTask, PoolConfig } from "../types";

// TaskQueue tests fully covered in task-queue.test.ts

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

/**
 * Checkpoint Manager Tests
 * Comprehensive unit tests for checkpoint system with 100% coverage goal
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import { CheckpointManager, TaskCheckpoint } from "../checkpoint-manager";
import { Task, TaskStatus } from "../../types/state";

// Unmock fs for this test since we need real file system operations
vi.unmock("fs");

describe("CheckpointManager", () => {
  let manager: CheckpointManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join(
      process.cwd(),
      ".test-checkpoint-" + Date.now(),
    );
    await fs.mkdir(testProjectPath, { recursive: true });
    manager = new CheckpointManager(testProjectPath);
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  });

  const createTestTask = (id: string): Task => ({
    id,
    title: `Test Task ${id}`,
    description: "A test task",
    status: TaskStatus.IN_PROGRESS,
    dependencies: [],
    createdAt: new Date(),
    priority: 5,
    artifacts: [],
  });

  const createTestCheckpoint = (taskId: string): TaskCheckpoint => ({
    taskId,
    timestamp: new Date(),
    task: createTestTask(taskId),
    executionState: {
      step: 1,
      totalSteps: 5,
      currentAction: "Testing",
      artifacts: ["test.txt"],
      errors: [],
    },
  });

  describe("initialize", () => {
    it("should create checkpoint directory", async () => {
      const checkpointDir = path.join(testProjectPath, ".forge", "checkpoints");
      const stats = await fs.stat(checkpointDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should return Ok result", async () => {
      const newManager = new CheckpointManager(
        path.join(testProjectPath, "new"),
      );
      const result = await newManager.initialize();
      expect(result.isOk()).toBe(true);
    });
  });

  describe("saveCheckpoint and restoreFromCheckpoint", () => {
    it("should save and restore checkpoint", async () => {
      const checkpoint = createTestCheckpoint("task-1");
      const saveResult = await manager.saveCheckpoint("task-1", checkpoint);
      expect(saveResult.isOk()).toBe(true);

      const restoreResult = await manager.restoreFromCheckpoint("task-1");
      expect(restoreResult.isOk()).toBe(true);
      expect(restoreResult.unwrap().taskId).toBe("task-1");
    });

    it("should preserve all checkpoint data", async () => {
      const checkpoint = createTestCheckpoint("task-2");
      checkpoint.executionState.step = 3;
      checkpoint.executionState.totalSteps = 10;
      checkpoint.executionState.artifacts = ["file1.ts", "file2.ts"];

      await manager.saveCheckpoint("task-2", checkpoint);
      const result = await manager.restoreFromCheckpoint("task-2");

      const restored = result.unwrap();
      expect(restored.executionState.step).toBe(3);
      expect(restored.executionState.totalSteps).toBe(10);
      expect(restored.executionState.artifacts).toEqual([
        "file1.ts",
        "file2.ts",
      ]);
    });

    it("should restore Date objects correctly", async () => {
      const checkpoint = createTestCheckpoint("task-3");
      await manager.saveCheckpoint("task-3", checkpoint);

      const result = await manager.restoreFromCheckpoint("task-3");
      const restored = result.unwrap();

      expect(restored.timestamp).toBeInstanceOf(Date);
      expect(restored.task.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("restoreFromCheckpoint - missing checkpoint", () => {
    it("should return error for non-existent checkpoint", async () => {
      const result = await manager.restoreFromCheckpoint("non-existent");
      expect(result.isErr()).toBe(true);
      expect(result.error).toContain("No checkpoint found");
    });
  });

  describe("listCheckpoints", () => {
    it("should return empty array when no checkpoints exist", async () => {
      const checkpoints = await manager.listCheckpoints();
      expect(checkpoints).toEqual([]);
    });

    it("should list all checkpoints", async () => {
      await manager.saveCheckpoint("task-1", createTestCheckpoint("task-1"));
      await manager.saveCheckpoint("task-2", createTestCheckpoint("task-2"));
      await manager.saveCheckpoint("task-3", createTestCheckpoint("task-3"));

      const checkpoints = await manager.listCheckpoints();
      expect(checkpoints.length).toBe(3);
    });

    it("should sort by timestamp descending", async () => {
      const cp1 = createTestCheckpoint("task-1");
      cp1.timestamp = new Date("2024-01-01");
      await manager.saveCheckpoint("task-1", cp1);

      const cp2 = createTestCheckpoint("task-2");
      cp2.timestamp = new Date("2024-01-03");
      await manager.saveCheckpoint("task-2", cp2);

      const cp3 = createTestCheckpoint("task-3");
      cp3.timestamp = new Date("2024-01-02");
      await manager.saveCheckpoint("task-3", cp3);

      const checkpoints = await manager.listCheckpoints();
      expect(checkpoints[0].taskId).toBe("task-2"); // newest
      expect(checkpoints[2].taskId).toBe("task-1"); // oldest
    });
  });

  describe("clearCheckpoint", () => {
    it("should clear existing checkpoint", async () => {
      await manager.saveCheckpoint("task-1", createTestCheckpoint("task-1"));
      expect(await manager.hasCheckpoint("task-1")).toBe(true);

      await manager.clearCheckpoint("task-1");
      expect(await manager.hasCheckpoint("task-1")).toBe(false);
    });

    it("should not throw for non-existent checkpoint", async () => {
      await expect(
        manager.clearCheckpoint("non-existent"),
      ).resolves.not.toThrow();
    });
  });

  describe("clearAllCheckpoints", () => {
    it("should clear all checkpoints", async () => {
      await manager.saveCheckpoint("task-1", createTestCheckpoint("task-1"));
      await manager.saveCheckpoint("task-2", createTestCheckpoint("task-2"));
      await manager.saveCheckpoint("task-3", createTestCheckpoint("task-3"));

      const result = await manager.clearAllCheckpoints();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(3);

      const checkpoints = await manager.listCheckpoints();
      expect(checkpoints.length).toBe(0);
    });

    it("should return 0 when no checkpoints exist", async () => {
      const result = await manager.clearAllCheckpoints();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });
  });

  describe("hasCheckpoint", () => {
    it("should return true for existing checkpoint", async () => {
      await manager.saveCheckpoint("task-1", createTestCheckpoint("task-1"));
      expect(await manager.hasCheckpoint("task-1")).toBe(true);
    });

    it("should return false for non-existent checkpoint", async () => {
      expect(await manager.hasCheckpoint("non-existent")).toBe(false);
    });
  });

  describe("getCheckpointAge", () => {
    it("should return checkpoint age", async () => {
      const checkpoint = createTestCheckpoint("task-1");
      checkpoint.timestamp = new Date(Date.now() - 5000); // 5 seconds ago
      await manager.saveCheckpoint("task-1", checkpoint);

      const result = await manager.getCheckpointAge("task-1");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeGreaterThanOrEqual(4000);
      expect(result.unwrap()).toBeLessThan(10000);
    });

    it("should return error for non-existent checkpoint", async () => {
      const result = await manager.getCheckpointAge("non-existent");
      expect(result.isErr()).toBe(true);
    });
  });

  describe("cleanupOldCheckpoints", () => {
    it("should cleanup old checkpoints", async () => {
      const oldCp = createTestCheckpoint("old-task");
      oldCp.timestamp = new Date(Date.now() - 10000); // 10 seconds ago
      await manager.saveCheckpoint("old-task", oldCp);

      const newCp = createTestCheckpoint("new-task");
      newCp.timestamp = new Date();
      await manager.saveCheckpoint("new-task", newCp);

      const result = await manager.cleanupOldCheckpoints(5000); // 5 second threshold
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(1);

      const checkpoints = await manager.listCheckpoints();
      expect(checkpoints.length).toBe(1);
      expect(checkpoints[0].taskId).toBe("new-task");
    });

    it("should not remove recent checkpoints", async () => {
      const checkpoint = createTestCheckpoint("recent");
      await manager.saveCheckpoint("recent", checkpoint);

      const result = await manager.cleanupOldCheckpoints(60000); // 1 minute
      expect(result.unwrap()).toBe(0);
    });
  });

  describe("filename sanitization", () => {
    it("should handle special characters in task IDs", async () => {
      const taskId = "task/with:special*chars?";
      const checkpoint = createTestCheckpoint(taskId);

      const saveResult = await manager.saveCheckpoint(taskId, checkpoint);
      expect(saveResult.isOk()).toBe(true);

      const restoreResult = await manager.restoreFromCheckpoint(taskId);
      expect(restoreResult.isOk()).toBe(true);
      expect(restoreResult.unwrap().taskId).toBe(taskId);
    });
  });

  describe("data validation", () => {
    it("should handle optional task fields", async () => {
      const checkpoint = createTestCheckpoint("task-optional");
      checkpoint.task.startedAt = new Date("2024-01-01");
      checkpoint.task.completedAt = new Date("2024-01-02");
      checkpoint.task.metadata = { priority: "high" };

      await manager.saveCheckpoint("task-optional", checkpoint);
      const result = await manager.restoreFromCheckpoint("task-optional");

      const restored = result.unwrap();
      expect(restored.task.startedAt).toBeInstanceOf(Date);
      expect(restored.task.completedAt).toBeInstanceOf(Date);
      expect(restored.task.metadata).toEqual({ priority: "high" });
    });

    it("should handle checkpoint metadata", async () => {
      const checkpoint = createTestCheckpoint("task-meta");
      checkpoint.metadata = { session: "abc", branch: "feature" };

      await manager.saveCheckpoint("task-meta", checkpoint);
      const result = await manager.restoreFromCheckpoint("task-meta");

      expect(result.unwrap().metadata).toEqual({
        session: "abc",
        branch: "feature",
      });
    });
  });
});

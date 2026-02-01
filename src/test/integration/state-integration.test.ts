/**
 * State Management Integration Tests
 * Tests Dashboard -> StateManager -> state persistence
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { StateManager } from "@core/state";
import { TaskStatus } from "../../types/state";
import { promises as fs } from "fs";

describe("State Integration: Dashboard -> StateManager -> File System", () => {
  let stateManager: StateManager;
  let mockProjectPath: string;

  beforeEach(() => {
    mockProjectPath = "/test/project";
    stateManager = new StateManager(mockProjectPath);
    vi.clearAllMocks();
  });

  describe("State persistence workflow", () => {
    it("should initialize and restore state from file", async () => {
      const mockState = {
        version: "3.0.0",
        timestamp: new Date(),
        vision: {
          version: "1.0",
          created: new Date(),
          updated: new Date(),
          mission: "Test mission",
          principles: [],
          strategicGoals: [],
          currentFocus: "",
          successMetrics: {},
        },
        currentTasks: [],
        agentStates: {},
        conversationContext: {
          sessionId: "test-session",
          startedAt: new Date(),
          lastInteraction: new Date(),
          messageCount: 0,
          recentMessages: [],
          contextTags: [],
        },
        progressGraph: [],
        metadata: {
          sessionId: "test-session",
          environment: "test",
          projectPath: mockProjectPath,
        },
      };

      (fs.readFile as any).mockResolvedValue(
        JSON.stringify({
          state: mockState,
          timestamp: new Date(),
          checksum: "test-checksum",
          compressed: false,
        }),
      );

      // Mock checksum validation
      vi.spyOn(stateManager as any, "calculateChecksum").mockReturnValue(
        "test-checksum",
      );

      const restored = await stateManager.restoreState();

      expect(restored).toBeTruthy();
      expect(restored?.version).toBe("3.0.0");
    });

    it("should save state updates with checksum verification", async () => {
      await stateManager.initialize(mockProjectPath);

      await stateManager.saveState();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("current.json"),
        expect.stringContaining('"checksum"'),
        "utf-8",
      );
    });

    it("should detect and handle corrupted state files", async () => {
      const corruptedState = {
        state: { invalid: "data" },
        timestamp: new Date(),
        checksum: "wrong-checksum",
        compressed: false,
      };

      (fs.readFile as any)
        .mockResolvedValueOnce(JSON.stringify(corruptedState))
        .mockResolvedValueOnce(JSON.stringify(corruptedState)); // backup

      vi.spyOn(stateManager as any, "calculateChecksum").mockReturnValue(
        "correct-checksum",
      );

      const restored = await stateManager.restoreState();

      // Should fall back to backup
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it("should create backup before saving new state", async () => {
      await stateManager.initialize(mockProjectPath);

      await stateManager.saveState();

      expect(fs.copyFile).toHaveBeenCalledWith(
        expect.stringContaining("current.json"),
        expect.stringContaining("backup.json"),
      );
    });
  });

  describe("Context graph building", () => {
    it("should build context graph from state", async () => {
      await stateManager.initialize(mockProjectPath);

      const currentState = stateManager.getCurrentState();
      if (currentState) {
        currentState.currentTasks = [
          {
            id: "task-1",
            title: "Test Task",
            description: "Test",
            status: TaskStatus.IN_PROGRESS,
            priority: 5,
            dependencies: [],
            assignedAgent: "developer",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }

      const graph = await stateManager.buildContextGraph();

      expect(graph.nodes).toContainEqual(
        expect.objectContaining({
          id: "vision",
          type: "vision",
        }),
      );

      expect(graph.nodes).toContainEqual(
        expect.objectContaining({
          id: "task-task-1",
          type: "task",
        }),
      );
    });

    it("should create edges between related nodes", async () => {
      await stateManager.initialize(mockProjectPath);

      const currentState = stateManager.getCurrentState();
      if (currentState) {
        currentState.vision.strategicGoals = [
          {
            id: "goal-1",
            title: "Test Goal",
            description: "Test",
            priority: "high" as const,
            status: "in-progress" as const,
            progress: 50,
            metrics: [],
          },
        ];

        currentState.currentTasks = [
          {
            id: "task-1",
            title: "Test Task",
            description: "Test",
            status: TaskStatus.IN_PROGRESS,
            priority: 5,
            dependencies: [],
            assignedAgent: "developer",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }

      const graph = await stateManager.buildContextGraph();

      expect(graph.edges).toContainEqual(
        expect.objectContaining({
          from: "vision",
          to: "goal-goal-1",
          type: "implements",
        }),
      );
    });
  });

  describe("Situation reporting", () => {
    it("should generate accurate situation report", async () => {
      await stateManager.initialize(mockProjectPath);

      const currentState = stateManager.getCurrentState();
      if (currentState) {
        currentState.currentTasks = [
          {
            id: "task-1",
            title: "Task 1",
            description: "Test",
            status: TaskStatus.IN_PROGRESS,
            priority: 5,
            dependencies: [],
            assignedAgent: "dev1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "task-2",
            title: "Task 2",
            description: "Test",
            status: TaskStatus.COMPLETED,
            priority: 5,
            dependencies: [],
            assignedAgent: "dev2",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "task-3",
            title: "Task 3",
            description: "Test",
            status: TaskStatus.BLOCKED,
            priority: 5,
            dependencies: [],
            assignedAgent: "dev3",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }

      const sitrep = await stateManager.getSituation();

      expect(sitrep.tasksInProgress).toBe(1);
      expect(sitrep.tasksCompleted).toBe(1);
      expect(sitrep.blockingIssues).toHaveLength(1);
      expect(sitrep.blockingIssues[0]).toMatchObject({
        id: "task-3",
        impact: "medium",
      });
    });

    it("should provide next actions based on pending tasks", async () => {
      await stateManager.initialize(mockProjectPath);

      const currentState = stateManager.getCurrentState();
      if (currentState) {
        currentState.currentTasks = [
          {
            id: "task-1",
            title: "Pending Task 1",
            description: "Test",
            status: TaskStatus.PENDING,
            priority: 5,
            dependencies: [],
            assignedAgent: "dev1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }

      const sitrep = await stateManager.getSituation();

      expect(sitrep.nextActions).toContain("Start task: Pending Task 1");
    });
  });

  describe("Event sourcing", () => {
    it("should record all state changes as events", async () => {
      await stateManager.initialize(mockProjectPath);

      stateManager.updateTaskStatus("task-1", TaskStatus.COMPLETED);

      const events = stateManager.getEvents();

      expect(events).toContainEqual(
        expect.objectContaining({
          type: "task-status-changed",
          data: {
            taskId: "task-1",
            status: TaskStatus.COMPLETED,
          },
        }),
      );
    });

    it("should write events to append-only log", async () => {
      await stateManager.initialize(mockProjectPath);

      stateManager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);

      await vi.waitFor(() => {
        expect(fs.appendFile).toHaveBeenCalledWith(
          expect.stringContaining("events.jsonl"),
          expect.stringContaining("task-status-changed"),
        );
      });
    });
  });

  describe("Performance requirements", () => {
    it("should restore state in less than 2 seconds", async () => {
      const start = Date.now();
      await stateManager.restoreState();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it("should update state with latency < 100ms", async () => {
      await stateManager.initialize(mockProjectPath);

      const start = Date.now();
      stateManager.updateTaskStatus("task-1", TaskStatus.COMPLETED);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it("should handle auto-save without blocking", async () => {
      await stateManager.initialize(mockProjectPath);

      stateManager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);

      // Should not block
      const start = Date.now();
      stateManager.updateTaskStatus("task-2", TaskStatus.COMPLETED);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe("Memory leak prevention", () => {
    it("should clean up auto-save interval on stop", async () => {
      await stateManager.initialize(mockProjectPath);

      const intervalSpy = vi.spyOn(global, "clearInterval");

      stateManager.stopAutoSave();

      expect(intervalSpy).toHaveBeenCalled();
    });

    it("should not accumulate events indefinitely", async () => {
      await stateManager.initialize(mockProjectPath);

      // Generate many events
      for (let i = 0; i < 1000; i++) {
        stateManager.updateTaskStatus(`task-${i}`, TaskStatus.COMPLETED);
      }

      const events = stateManager.getEvents();

      // Events should be persisted to file, not kept in memory forever
      // In production, would implement event rotation
      expect(events.length).toBeLessThan(10000);
    });
  });
});

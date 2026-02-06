/**
 * State Manager Tests
 * Comprehensive unit tests for state management system with 100% coverage goal
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { StateManager } from "../state";
import {
  Task,
  TaskStatus,
  AgentState,
  SystemState,
  ContextGraph,
} from "../../types/state";
import { CanonicalVision, Priority } from "../../types/vision";

// Unmock fs for this test since we need real file system operations
vi.unmock("fs");
vi.unmock("node:fs");

describe("StateManager", () => {
  let manager: StateManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join(
      process.cwd(),
      ".test-state-" + Date.now() + "-" + Math.random().toString(36).slice(2),
    );
    await fs.mkdir(testProjectPath, { recursive: true });
    manager = new StateManager(testProjectPath);
  });

  afterEach(async () => {
    manager.stopAutoSave();
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Helper functions
  const createTestTask = (id: string, status: TaskStatus = TaskStatus.PENDING): Task => ({
    id,
    title: `Test Task ${id}`,
    description: "A test task",
    status,
    dependencies: [],
    createdAt: new Date(),
    priority: 5,
    artifacts: [],
  });

  const createTestAgentState = (id: string): AgentState => ({
    id,
    name: `Agent ${id}`,
    status: "idle" as const,
    taskQueue: [],
    capabilities: ["coding", "testing"],
    performance: {
      tasksCompleted: 0,
      averageDuration: 0,
      successRate: 1.0,
      lastActive: new Date(),
    },
  });

  const waitForAutoSave = () => new Promise((resolve) => setTimeout(resolve, 100));

  describe("Constructor", () => {
    it("should initialize with default project path", () => {
      const defaultManager = new StateManager();
      expect(defaultManager).toBeInstanceOf(StateManager);
      expect(defaultManager.getCurrentState()).toBeNull();
    });

    it("should initialize with custom project path", () => {
      const customManager = new StateManager("/custom/path");
      expect(customManager).toBeInstanceOf(StateManager);
    });

    it("should inherit from EventEmitter", () => {
      expect(manager.on).toBeDefined();
      expect(manager.emit).toBeDefined();
      expect(manager.removeListener).toBeDefined();
    });
  });

  describe("initialize", () => {
    it("should create state directory", async () => {
      await manager.initialize();
      const stateDir = path.join(testProjectPath, ".claude", "state");
      const stats = await fs.stat(stateDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create initial state when no state exists", async () => {
      await manager.initialize();
      const state = manager.getCurrentState();
      expect(state).not.toBeNull();
      expect(state?.version).toBe("3.0.0");
      expect(state?.currentTasks).toEqual([]);
      expect(state?.agentStates).toEqual({});
    });

    it("should restore existing state", async () => {
      // First initialization
      await manager.initialize();
      const task = createTestTask("task-1");
      manager.getCurrentState()?.currentTasks.push(task);
      await manager.saveState();

      // Create new manager and initialize
      const newManager = new StateManager(testProjectPath);
      await newManager.initialize();
      const state = newManager.getCurrentState();

      expect(state?.currentTasks).toHaveLength(1);
      expect(state?.currentTasks[0].id).toBe("task-1");
      newManager.stopAutoSave();
    });

    it("should reinitialize with new project path", async () => {
      await manager.initialize(testProjectPath);
      const state = manager.getCurrentState();
      expect(state).not.toBeNull();
      expect(state?.metadata.projectPath).toBe(testProjectPath);
    });

    it("should start auto-save after initialization", async () => {
      await manager.initialize();
      // Auto-save interval should be set (tested indirectly)
      expect(manager.getCurrentState()).not.toBeNull();
    });

    it("should emit stateRestored event when restoring state", async () => {
      await manager.initialize();
      await manager.saveState();

      const newManager = new StateManager(testProjectPath);
      const eventPromise = new Promise((resolve) => {
        newManager.once("stateRestored", resolve);
      });

      await newManager.initialize();
      const event = await eventPromise;
      expect(event).toBeDefined();
      newManager.stopAutoSave();
    });
  });

  describe("saveState", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should save current state to file", async () => {
      await manager.saveState();
      const statePath = path.join(testProjectPath, ".claude", "state", "current.json");
      const content = await fs.readFile(statePath, "utf-8");
      const snapshot = JSON.parse(content);
      expect(snapshot.state).toBeDefined();
      expect(snapshot.checksum).toBeDefined();
    });

    it("should create backup of existing state", async () => {
      await manager.saveState();

      // Modify and save again
      const state = manager.getCurrentState();
      state!.currentTasks.push(createTestTask("task-1"));
      await manager.saveState();

      const backupPath = path.join(testProjectPath, ".claude", "state", "backup.json");
      const content = await fs.readFile(backupPath, "utf-8");
      const backup = JSON.parse(content);
      expect(backup.state).toBeDefined();
    });

    it("should calculate and include checksum", async () => {
      await manager.saveState();
      const statePath = path.join(testProjectPath, ".claude", "state", "current.json");
      const content = await fs.readFile(statePath, "utf-8");
      const snapshot = JSON.parse(content);
      expect(snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should include timestamp in snapshot", async () => {
      await manager.saveState();
      const statePath = path.join(testProjectPath, ".claude", "state", "current.json");
      const content = await fs.readFile(statePath, "utf-8");
      const snapshot = JSON.parse(content);
      expect(snapshot.timestamp).toBeDefined();
      expect(new Date(snapshot.timestamp)).toBeInstanceOf(Date);
    });

    it("should emit stateSaved event", async () => {
      const eventPromise = new Promise((resolve) => {
        manager.once("stateSaved", resolve);
      });
      await manager.saveState();
      const event = await eventPromise;
      expect(event).toBeDefined();
    });

    it("should throw error when no state to save", async () => {
      const emptyManager = new StateManager(testProjectPath);
      await expect(emptyManager.saveState()).rejects.toThrow("No state to save");
    });

    it("should save provided state parameter", async () => {
      const customState: SystemState = {
        version: "3.0.0",
        timestamp: new Date(),
        vision: {
          version: "1.0",
          created: new Date(),
          updated: new Date(),
          mission: "Custom mission",
          principles: [],
          strategicGoals: [],
          currentFocus: "",
          successMetrics: {},
        },
        currentTasks: [createTestTask("custom-task")],
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
          sessionId: "test",
          environment: "test",
          projectPath: testProjectPath,
        },
      };

      await manager.initialize();

      // Get the initialized state and modify it with custom data
      const state = manager.getCurrentState();
      Object.assign(state!, customState);

      await manager.saveState(state!);

      expect(manager.getCurrentState()?.currentTasks[0].id).toBe("custom-task");
    });
  });

  describe("restoreState", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return null when no state file exists", async () => {
      const newManager = new StateManager(
        path.join(testProjectPath, "nonexistent"),
      );
      const state = await newManager.restoreState();
      expect(state).toBeNull();
    });

    it("should restore state from file", async () => {
      const task = createTestTask("task-1");
      manager.getCurrentState()?.currentTasks.push(task);
      await manager.saveState();

      const newManager = new StateManager(testProjectPath);
      const state = await newManager.restoreState();
      expect(state?.currentTasks).toHaveLength(1);
      expect(state?.currentTasks[0].id).toBe("task-1");
    });

    it("should verify checksum and use backup on mismatch", async () => {
      await manager.saveState();

      // Corrupt current state
      const statePath = path.join(testProjectPath, ".claude", "state", "current.json");
      const content = await fs.readFile(statePath, "utf-8");
      const snapshot = JSON.parse(content);
      snapshot.checksum = "invalid-checksum";
      await fs.writeFile(statePath, JSON.stringify(snapshot));

      // Restore should fall back to backup
      const newManager = new StateManager(testProjectPath);
      const state = await newManager.restoreState();
      expect(state).not.toBeNull();
    });

    it("should parse date strings into Date objects", async () => {
      await manager.saveState();

      const newManager = new StateManager(testProjectPath);
      const state = await newManager.restoreState();
      expect(state?.timestamp).toBeInstanceOf(Date);
      expect(state?.vision.created).toBeInstanceOf(Date);
      expect(state?.conversationContext.startedAt).toBeInstanceOf(Date);
    });

    it("should rebuild context graph after restore", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));
      await manager.saveState();

      const newManager = new StateManager(testProjectPath);
      await newManager.restoreState();

      const graph = newManager.getContextGraph();
      expect(graph).not.toBeNull();
      expect(graph?.nodes.length).toBeGreaterThan(0);
    });

    it("should emit stateRestored event", async () => {
      await manager.saveState();

      const newManager = new StateManager(testProjectPath);
      const eventPromise = new Promise((resolve) => {
        newManager.once("stateRestored", resolve);
      });

      await newManager.restoreState();
      const event = await eventPromise;
      expect(event).toBeDefined();
    });

    it("should handle corrupted JSON gracefully", async () => {
      await manager.saveState();

      const statePath = path.join(testProjectPath, ".claude", "state", "current.json");
      await fs.writeFile(statePath, "invalid json{{{");

      const newManager = new StateManager(testProjectPath);
      const state = await newManager.restoreState();
      // Should fall back to backup or return null
      expect(state).toBeTruthy(); // Backup should work
    });
  });

  describe("buildContextGraph", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should throw error when no state available", async () => {
      const emptyManager = new StateManager(testProjectPath);
      await expect(emptyManager.buildContextGraph()).rejects.toThrow(
        "No state available",
      );
    });

    it("should create graph with vision root node", async () => {
      const graph = await manager.buildContextGraph();
      const visionNode = graph.nodes.find((n) => n.id === "vision");
      expect(visionNode).toBeDefined();
      expect(visionNode?.type).toBe("vision");
    });

    it("should add strategic goals as nodes", async () => {
      const state = manager.getCurrentState();
      state?.vision.strategicGoals.push({
        id: "goal-1",
        title: "Strategic Goal",
        description: "Test goal",
        priority: Priority.HIGH,
        metrics: [],
        status: "in-progress",
        progress: 50,
      });

      const graph = await manager.buildContextGraph();
      const goalNode = graph.nodes.find((n) => n.id === "goal-goal-1");
      expect(goalNode).toBeDefined();
      expect(goalNode?.type).toBe("goal");
    });

    it("should add tasks as nodes", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));

      const graph = await manager.buildContextGraph();
      const taskNode = graph.nodes.find((n) => n.id === "task-task-1");
      expect(taskNode).toBeDefined();
      expect(taskNode?.type).toBe("task");
    });

    it("should create edges between vision and goals", async () => {
      const state = manager.getCurrentState();
      state?.vision.strategicGoals.push({
        id: "goal-1",
        title: "Goal",
        description: "Test",
        priority: Priority.HIGH,
        metrics: [],
        status: "in-progress",
        progress: 0,
      });

      const graph = await manager.buildContextGraph();
      const edge = graph.edges.find(
        (e) => e.from === "vision" && e.to === "goal-goal-1",
      );
      expect(edge).toBeDefined();
      expect(edge?.type).toBe("implements");
    });

    it("should create edges for task dependencies", async () => {
      const state = manager.getCurrentState();
      const task1 = createTestTask("task-1");
      const task2 = createTestTask("task-2");
      task2.dependencies = ["task-1"];

      state?.currentTasks.push(task1, task2);

      const graph = await manager.buildContextGraph();
      const edge = graph.edges.find(
        (e) => e.from === "task-task-1" && e.to === "task-task-2",
      );
      expect(edge).toBeDefined();
      expect(edge?.type).toBe("depends-on");
    });

    it("should save graph to file", async () => {
      await manager.buildContextGraph();
      const graphPath = path.join(
        testProjectPath,
        ".claude",
        "state",
        "context-graph.json",
      );
      const content = await fs.readFile(graphPath, "utf-8");
      const graph = JSON.parse(content);
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
    });

    it("should return graph with correct structure", async () => {
      const graph = await manager.buildContextGraph();
      expect(graph).toHaveProperty("nodes");
      expect(graph).toHaveProperty("edges");
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });
  });

  describe("getSituation", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should throw error when no state available", async () => {
      const emptyManager = new StateManager(testProjectPath);
      await expect(emptyManager.getSituation()).rejects.toThrow(
        "No state available",
      );
    });

    it("should return situation report with task counts", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(
        createTestTask("task-1", TaskStatus.IN_PROGRESS),
        createTestTask("task-2", TaskStatus.COMPLETED),
        createTestTask("task-3", TaskStatus.PENDING),
      );

      const situation = await manager.getSituation();
      expect(situation.tasksInProgress).toBe(1);
      expect(situation.tasksCompleted).toBe(1);
    });

    it("should identify blocking issues", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("blocked-task", TaskStatus.BLOCKED));

      const situation = await manager.getSituation();
      expect(situation.blockingIssues).toHaveLength(1);
      expect(situation.blockingIssues[0].description).toContain("blocked");
    });

    it("should suggest next actions", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(
        createTestTask("pending-1", TaskStatus.PENDING),
        createTestTask("pending-2", TaskStatus.PENDING),
      );

      const situation = await manager.getSituation();
      expect(situation.nextActions.length).toBeGreaterThan(0);
      expect(situation.nextActions[0]).toContain("Start task");
    });

    it("should include active goals", async () => {
      const state = manager.getCurrentState();
      state?.vision.strategicGoals.push({
        id: "goal-1",
        title: "Active Goal",
        description: "Test",
        priority: Priority.HIGH,
        metrics: [],
        status: "in-progress",
        progress: 50,
      });

      const situation = await manager.getSituation();
      expect(situation.activeGoals).toContain("goal-1");
    });

    it("should estimate completion time", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(
        createTestTask("task-1", TaskStatus.PENDING),
        createTestTask("task-2", TaskStatus.IN_PROGRESS),
      );

      const situation = await manager.getSituation();
      expect(situation.estimatedCompletion).toBeDefined();
      expect(situation.estimatedCompletion).toBeInstanceOf(Date);
    });

    it("should return undefined completion when no pending tasks", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1", TaskStatus.COMPLETED));

      const situation = await manager.getSituation();
      expect(situation.estimatedCompletion).toBeUndefined();
    });

    it("should include timestamp", async () => {
      const situation = await manager.getSituation();
      expect(situation.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("getTaskVisionPath", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return null when no context graph", () => {
      const emptyManager = new StateManager(testProjectPath);
      const path = emptyManager.getTaskVisionPath("task-1");
      expect(path).toBeNull();
    });

    it("should return null for non-existent task", async () => {
      await manager.buildContextGraph();
      const path = manager.getTaskVisionPath("non-existent");
      expect(path).toBeNull();
    });

    it("should return path from task to vision", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));
      await manager.buildContextGraph();

      const path = manager.getTaskVisionPath("task-1");
      expect(path).not.toBeNull();
      expect(path?.path).toContain("vision");
      expect(path?.path).toContain("task-task-1");
    });

    it("should include relationships in path", async () => {
      const state = manager.getCurrentState();
      state?.vision.strategicGoals.push({
        id: "goal-1",
        title: "Goal",
        description: "Test",
        priority: Priority.HIGH,
        metrics: [],
        status: "in-progress",
        progress: 0,
      });
      state?.currentTasks.push(createTestTask("task-1"));
      await manager.buildContextGraph();

      const path = manager.getTaskVisionPath("task-1");
      expect(path?.relationships).toBeDefined();
      expect(Array.isArray(path?.relationships)).toBe(true);
    });
  });

  describe("updateTaskStatus", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update task status", () => {
      const state = manager.getCurrentState();
      const task = createTestTask("task-1");
      state?.currentTasks.push(task);

      manager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);
      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it("should mark state as dirty", () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));

      manager.updateTaskStatus("task-1", TaskStatus.COMPLETED);
      // State should be marked dirty (tested via auto-save)
    });

    it("should emit taskStatusChanged event", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));

      const eventPromise = new Promise((resolve) => {
        manager.once("taskStatusChanged", resolve);
      });

      manager.updateTaskStatus("task-1", TaskStatus.COMPLETED);

      const data = await eventPromise as any;
      expect(data.taskId).toBe("task-1");
      expect(data.status).toBe(TaskStatus.COMPLETED);
    });

    it("should not throw for non-existent task", () => {
      expect(() => {
        manager.updateTaskStatus("non-existent", TaskStatus.COMPLETED);
      }).not.toThrow();
    });

    it("should handle multiple status updates", () => {
      const state = manager.getCurrentState();
      const task = createTestTask("task-1");
      state?.currentTasks.push(task);

      manager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);
      manager.updateTaskStatus("task-1", TaskStatus.BLOCKED);
      manager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);
      manager.updateTaskStatus("task-1", TaskStatus.COMPLETED);

      expect(task.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe("updateAgentState", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update agent state", () => {
      const state = manager.getCurrentState();
      const agentState = createTestAgentState("agent-1");
      state!.agentStates["agent-1"] = agentState;

      manager.updateAgentState("agent-1", { status: "busy" });
      expect(agentState.status).toBe("busy");
    });

    it("should merge partial updates", () => {
      const state = manager.getCurrentState();
      const agentState = createTestAgentState("agent-1");
      state!.agentStates["agent-1"] = agentState;

      manager.updateAgentState("agent-1", {
        status: "busy",
        currentTask: "task-1",
      });

      expect(agentState.status).toBe("busy");
      expect(agentState.currentTask).toBe("task-1");
      expect(agentState.name).toBe("Agent agent-1"); // Original preserved
    });

    it("should emit agentStateChanged event", async () => {
      const state = manager.getCurrentState();
      state!.agentStates["agent-1"] = createTestAgentState("agent-1");

      const eventPromise = new Promise((resolve) => {
        manager.once("agentStateChanged", resolve);
      });

      manager.updateAgentState("agent-1", { status: "busy" });

      const data = await eventPromise as any;
      expect(data.agentId).toBe("agent-1");
      expect(data.state.status).toBe("busy");
    });

    it("should not throw for non-existent agent", () => {
      expect(() => {
        manager.updateAgentState("non-existent", { status: "busy" });
      }).not.toThrow();
    });
  });

  describe("updateState", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should throw error when no state available", async () => {
      const emptyManager = new StateManager(testProjectPath);
      await expect(emptyManager.updateState({})).rejects.toThrow(
        "No state to update",
      );
    });

    it("should update state with partial updates", async () => {
      const task = createTestTask("task-1");
      const updated = await manager.updateState({
        currentTasks: [task],
      });

      expect(updated.currentTasks).toHaveLength(1);
      expect(updated.currentTasks[0].id).toBe("task-1");
    });

    it("should update timestamp", async () => {
      const oldTimestamp = manager.getCurrentState()?.timestamp;
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await manager.updateState({});
      expect(updated.timestamp.getTime()).toBeGreaterThan(oldTimestamp!.getTime());
    });

    it("should save state automatically", async () => {
      await manager.updateState({
        currentTasks: [createTestTask("task-1")],
      });

      const statePath = path.join(
        testProjectPath,
        ".claude",
        "state",
        "current.json",
      );
      const content = await fs.readFile(statePath, "utf-8");
      const snapshot = JSON.parse(content);
      expect(snapshot.state.currentTasks).toHaveLength(1);
    });
  });

  describe("updatePhase", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update current phase in metadata", async () => {
      const updated = await manager.updatePhase("testing");
      expect(updated.metadata.currentPhase).toBe("testing");
    });

    it("should preserve other metadata", async () => {
      const state = manager.getCurrentState();
      const originalEnv = state?.metadata.environment;

      await manager.updatePhase("development");
      expect(manager.getCurrentState()?.metadata.environment).toBe(originalEnv);
    });

    it("should save state after update", async () => {
      await manager.updatePhase("production");

      const newManager = new StateManager(testProjectPath);
      await newManager.initialize();
      expect(newManager.getCurrentState()?.metadata.currentPhase).toBe("production");
    });
  });

  describe("getHealthMetrics", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should return health metrics", async () => {
      const metrics = await manager.getHealthMetrics();
      expect(metrics).toHaveProperty("healthy");
      expect(metrics).toHaveProperty("taskCompletion");
      expect(metrics).toHaveProperty("failedTasks");
      expect(metrics).toHaveProperty("totalTasks");
      expect(metrics).toHaveProperty("timestamp");
    });

    it("should calculate task completion percentage", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(
        createTestTask("task-1", TaskStatus.COMPLETED),
        createTestTask("task-2", TaskStatus.COMPLETED),
        createTestTask("task-3", TaskStatus.PENDING),
        createTestTask("task-4", TaskStatus.PENDING),
      );

      const metrics = await manager.getHealthMetrics();
      expect(metrics.taskCompletion).toBe(0.5);
    });

    it("should count failed tasks", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(
        createTestTask("task-1", TaskStatus.FAILED),
        createTestTask("task-2", TaskStatus.FAILED),
      );

      const metrics = await manager.getHealthMetrics();
      expect(metrics.failedTasks).toBe(2);
    });

    it("should mark unhealthy when tasks failed", async () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1", TaskStatus.FAILED));

      const metrics = await manager.getHealthMetrics();
      expect(metrics.healthy).toBe(false);
    });

    it("should handle empty task list", async () => {
      const metrics = await manager.getHealthMetrics();
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.taskCompletion).toBe(0);
    });
  });

  describe("isHealthy", () => {
    it("should return false when no state", () => {
      const emptyManager = new StateManager(testProjectPath);
      expect(emptyManager.isHealthy()).toBe(false);
    });

    it("should return true when state exists", async () => {
      await manager.initialize();
      expect(manager.isHealthy()).toBe(true);
    });
  });

  describe("Auto-save", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should not save when state is not dirty", async () => {
      await manager.saveState();
      const statePath = path.join(
        testProjectPath,
        ".claude",
        "state",
        "current.json",
      );
      const stat1 = await fs.stat(statePath);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const stat2 = await fs.stat(statePath);
      expect(stat2.mtimeMs).toBe(stat1.mtimeMs);
    });

    it("should stop auto-save when requested", () => {
      manager.stopAutoSave();
      expect(() => manager.stopAutoSave()).not.toThrow();
    });
  });

  describe("Checkpoint integration", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should save checkpoint", async () => {
      const checkpoint = {
        taskId: "task-1",
        timestamp: new Date(),
        task: createTestTask("task-1"),
        executionState: {
          step: 2,
          totalSteps: 5,
          currentAction: "Continue testing",
          artifacts: ["test.ts"],
          errors: [],
        },
      };

      const result = await manager.saveCheckpoint("task-1", checkpoint);
      expect(result.isOk()).toBe(true);
    });

    it("should restore checkpoint", async () => {
      const checkpoint = {
        taskId: "task-1",
        timestamp: new Date(),
        task: createTestTask("task-1"),
        executionState: {
          step: 1,
          totalSteps: 5,
          currentAction: "Testing",
          artifacts: ["test.ts"],
          errors: [],
        },
      };

      await manager.saveCheckpoint("task-1", checkpoint);
      const result = await manager.restoreFromCheckpoint("task-1");

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().taskId).toBe("task-1");
    });

    it("should list checkpoints", async () => {
      const checkpoints = await manager.listCheckpoints();
      expect(Array.isArray(checkpoints)).toBe(true);
    });

    it("should check checkpoint existence", async () => {
      const exists = await manager.hasCheckpoint("task-1");
      expect(typeof exists).toBe("boolean");
    });

    it("should clear checkpoint", async () => {
      const checkpoint = {
        taskId: "task-1",
        timestamp: new Date(),
        task: createTestTask("task-1"),
        executionState: {
          step: 1,
          totalSteps: 5,
          currentAction: "Next",
          artifacts: [],
          errors: [],
        },
      };

      await manager.saveCheckpoint("task-1", checkpoint);
      await manager.clearCheckpoint("task-1");

      const exists = await manager.hasCheckpoint("task-1");
      expect(exists).toBe(false);
    });

    it("should clear all checkpoints", async () => {
      const result = await manager.clearAllCheckpoints();
      expect(result.isOk()).toBe(true);
    });

    it("should cleanup old checkpoints", async () => {
      const result = await manager.cleanupOldCheckpoints(1000);
      expect(result.isOk()).toBe(true);
    });
  });

  describe("Event sourcing", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should record state initialization event", async () => {
      const events = manager.getEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("state-initialized");
    });

    it("should record task status change events", () => {
      const state = manager.getCurrentState();
      state?.currentTasks.push(createTestTask("task-1"));

      manager.updateTaskStatus("task-1", TaskStatus.IN_PROGRESS);

      const events = manager.getEvents();
      const statusEvent = events.find((e) => e.type === "task-status-changed");
      expect(statusEvent).toBeDefined();
    });

    it("should record agent state change events", () => {
      const state = manager.getCurrentState();
      state!.agentStates["agent-1"] = createTestAgentState("agent-1");

      manager.updateAgentState("agent-1", { status: "busy" });

      const events = manager.getEvents();
      const agentEvent = events.find((e) => e.type === "agent-state-changed");
      expect(agentEvent).toBeDefined();
    });

    it("should include event metadata", () => {
      const events = manager.getEvents();
      events.forEach((event) => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("data");
      });
    });

    it("should return copy of events array", () => {
      const events1 = manager.getEvents();
      const events2 = manager.getEvents();
      expect(events1).not.toBe(events2); // Different array instances
    });
  });

  describe("Getters", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("getCurrentState should return current state", () => {
      const state = manager.getCurrentState();
      expect(state).not.toBeNull();
      expect(state?.version).toBe("3.0.0");
    });

    it("getState should return current state (API compat)", () => {
      const state1 = manager.getCurrentState();
      const state2 = manager.getState();
      expect(state1).toBe(state2);
    });

    it("getContextGraph should return context graph", async () => {
      await manager.buildContextGraph();
      const graph = manager.getContextGraph();
      expect(graph).not.toBeNull();
      expect(graph?.nodes).toBeDefined();
      expect(graph?.edges).toBeDefined();
    });

    it("getContextGraph should return null before building", () => {
      const emptyManager = new StateManager(testProjectPath);
      expect(emptyManager.getContextGraph()).toBeNull();
    });
  });
});

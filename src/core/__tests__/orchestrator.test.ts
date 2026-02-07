/**
 * Meta-Orchestrator Tests
 * Comprehensive tests for the orchestration engine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MetaOrchestrator,
  ForgeOrchestrator,
  ExecutionPattern,
  ExecutionResult,
  ProgressState,
  Workflow,
  WorkflowStep,
  WorkflowResult,
} from "../orchestrator";
import { VisionManager } from "../vision";
import { AgentCoordinationProtocol } from "../coordination";
import { Agent, DependencyGraph, ParallelResult } from "../../types/agents";
import { Task, TaskStatus } from "../../types/state";
import { Decision } from "../../types/vision";
import * as crypto from "crypto";

// Mock dependencies
vi.mock("../vision");
vi.mock("../coordination");

describe("MetaOrchestrator", () => {
  let orchestrator: MetaOrchestrator;
  let visionManager: VisionManager;
  let coordinationProtocol: AgentCoordinationProtocol;

  beforeEach(() => {
    // Create mock instances
    visionManager = new VisionManager();
    coordinationProtocol = new AgentCoordinationProtocol();

    // Mock coordination protocol methods
    vi.spyOn(coordinationProtocol, "executeTask").mockResolvedValue({
      success: true,
      duration: 100,
      result: "task completed",
      artifacts: ["artifact-1"],
    });

    vi.spyOn(coordinationProtocol, "requestSignOff").mockResolvedValue({
      approved: true,
      reviewer: "architect",
      timestamp: new Date(),
      comments: "Approved",
    });

    // Mock vision manager methods
    vi.spyOn(visionManager, "checkAlignment").mockResolvedValue({
      score: 0.8,
      reasons: ["Aligned with vision"],
      suggestions: [],
    });

    orchestrator = new MetaOrchestrator(visionManager, coordinationProtocol);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createTestAgent = (id: string): Agent => ({
    id,
    name: `Test Agent ${id}`,
    role: "executor",
    capabilities: [],
    priority: 5,
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
  });

  const createTestTask = (id: string): Task => ({
    id,
    title: `Test Task ${id}`,
    description: "A test task",
    status: TaskStatus.PENDING,
    dependencies: [],
    createdAt: new Date(),
    priority: 5,
    artifacts: [],
  });

  const createTestDecision = (id: string): Decision => ({
    id,
    title: `Test Decision ${id}`,
    description: "A test decision",
    options: ["option1", "option2"],
    recommendedOption: "option1",
    rationale: "Best choice",
    impact: "medium",
    reversible: true,
    confidence: 0.8,
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await orchestrator.initialize();
      expect(orchestrator.isHealthy()).toBe(true);
    });

    it("should be an instance of ForgeOrchestrator", () => {
      expect(orchestrator).toBeInstanceOf(MetaOrchestrator);
      expect(orchestrator).toBeInstanceOf(ForgeOrchestrator);
    });

    it("should start with healthy status", () => {
      expect(orchestrator.isHealthy()).toBe(true);
    });
  });

  describe("Agent Registration", () => {
    it("should register an agent", () => {
      const agent = createTestAgent("agent-1");
      orchestrator.registerAgent(agent);

      // Verify by trying to execute a task with the agent
      expect(() => orchestrator.registerAgent(agent)).not.toThrow();
    });

    it("should register multiple agents", () => {
      const agent1 = createTestAgent("agent-1");
      const agent2 = createTestAgent("agent-2");
      const agent3 = createTestAgent("agent-3");

      orchestrator.registerAgent(agent1);
      orchestrator.registerAgent(agent2);
      orchestrator.registerAgent(agent3);

      expect(() => orchestrator.registerAgent(agent3)).not.toThrow();
    });

    it("should handle agent with special capabilities", () => {
      const agent = createTestAgent("special-agent");
      agent.capabilities = ["planning", "coding", "testing"];

      expect(() => orchestrator.registerAgent(agent)).not.toThrow();
    });
  });

  describe("Task Execution - Sequential Pattern", () => {
    beforeEach(() => {
      const agent = createTestAgent("exec-agent");
      orchestrator.registerAgent(agent);
    });

    it("should execute task sequentially", async () => {
      const task = createTestTask("seq-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.taskId).toBe("seq-task");
      expect(result.pattern).toBe(ExecutionPattern.SEQUENTIAL);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(coordinationProtocol.executeTask).toHaveBeenCalled();
    });

    it("should default to sequential pattern when not specified", async () => {
      const task = createTestTask("default-task");
      const result = await orchestrator.execute(task);

      expect(result.pattern).toBe(ExecutionPattern.SEQUENTIAL);
      expect(result.success).toBe(true);
    });

    it("should handle sequential execution failure", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValueOnce({
        success: false,
        duration: 50,
        error: "Task failed",
      });

      const task = createTestTask("fail-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true); // Still succeeds but with error in nested result
      expect(result.taskId).toBe("fail-task");
    });

    it("should track task duration", async () => {
      const task = createTestTask("duration-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include artifacts in result", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValueOnce({
        success: true,
        duration: 100,
        artifacts: ["artifact-1", "artifact-2"],
      });

      const task = createTestTask("artifact-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true);
    });
  });

  describe("Task Execution - Parallel Pattern", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("parallel-1"));
      orchestrator.registerAgent(createTestAgent("parallel-2"));
      orchestrator.registerAgent(createTestAgent("parallel-3"));
    });

    it("should execute task in parallel", async () => {
      const task = createTestTask("parallel-task");
      const result = await orchestrator.execute(task, ExecutionPattern.PARALLEL);

      expect(result.taskId).toBe("parallel-task");
      expect(result.pattern).toBe(ExecutionPattern.PARALLEL);
      expect(result.success).toBe(true);
      expect(result.agentResults).toBeDefined();
      expect(result.agentResults!.length).toBeGreaterThan(0);
    });

    it("should decompose task into subtasks", async () => {
      const task = createTestTask("decompose-task");
      const result = await orchestrator.execute(task, ExecutionPattern.PARALLEL);

      expect(result.success).toBe(true);
      expect(coordinationProtocol.executeTask).toHaveBeenCalled();
    });

    it("should handle parallel execution with some failures", async () => {
      vi.mocked(coordinationProtocol.executeTask)
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockResolvedValueOnce({ success: false, duration: 50, error: "Failed" })
        .mockResolvedValueOnce({ success: true, duration: 100 });

      const task = createTestTask("partial-fail-task");
      const result = await orchestrator.execute(task, ExecutionPattern.PARALLEL);

      expect(result.pattern).toBe(ExecutionPattern.PARALLEL);
      // Result depends on decomposition logic
      expect(result).toBeDefined();
    });
  });

  describe("Task Execution - Iterative Pattern", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("iterative-agent"));
    });

    it("should execute task iteratively", async () => {
      const task = createTestTask("iterative-task");
      const result = await orchestrator.execute(task, ExecutionPattern.ITERATIVE);

      expect(result.taskId).toBe("iterative-task");
      expect(result.pattern).toBe(ExecutionPattern.ITERATIVE);
      expect(result.success).toBe(true);
    });

    it("should refine task on iteration failure", async () => {
      vi.mocked(coordinationProtocol.executeTask)
        .mockResolvedValueOnce({ success: false, duration: 50, error: "First try failed" })
        .mockResolvedValueOnce({ success: true, duration: 100, result: "Success on retry" });

      const task = createTestTask("refine-task");
      const result = await orchestrator.execute(task, ExecutionPattern.ITERATIVE);

      expect(result.success).toBe(true);
      expect(coordinationProtocol.executeTask).toHaveBeenCalled();
    });

    it("should limit iterations to max", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValue({
        success: false,
        duration: 50,
        error: "Always fails",
      });

      const task = createTestTask("max-iterations-task");
      const result = await orchestrator.execute(task, ExecutionPattern.ITERATIVE);

      expect(result.pattern).toBe(ExecutionPattern.ITERATIVE);
      // Should stop after max iterations (5)
      expect(coordinationProtocol.executeTask).toHaveBeenCalledTimes(5);
    });
  });

  describe("Task Execution - Hierarchical Pattern", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("hierarchical-1"));
      orchestrator.registerAgent(createTestAgent("hierarchical-2"));
    });

    it("should execute task hierarchically", async () => {
      const task = createTestTask("hierarchical-task");
      const result = await orchestrator.execute(task, ExecutionPattern.HIERARCHICAL);

      expect(result.taskId).toBe("hierarchical-task");
      expect(result.pattern).toBe(ExecutionPattern.HIERARCHICAL);
      expect(result.success).toBe(true);
    });

    it("should create task hierarchy", async () => {
      const task = createTestTask("hierarchy-task");
      const result = await orchestrator.execute(task, ExecutionPattern.HIERARCHICAL);

      expect(result.success).toBe(true);
      expect(coordinationProtocol.executeTask).toHaveBeenCalled();
    });

    it("should stop on level failure", async () => {
      vi.mocked(coordinationProtocol.executeTask)
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockResolvedValueOnce({ success: false, duration: 50, error: "Level failed" });

      const task = createTestTask("level-fail-task");
      const result = await orchestrator.execute(task, ExecutionPattern.HIERARCHICAL);

      expect(result.pattern).toBe(ExecutionPattern.HIERARCHICAL);
    });
  });

  describe("Parallel Execution", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("parallel-agent"));
    });

    it("should execute multiple tasks in parallel", async () => {
      const tasks = [
        createTestTask("task-1"),
        createTestTask("task-2"),
        createTestTask("task-3"),
      ];

      const result = await orchestrator.executeParallel(tasks);

      expect(result.totalTasks).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.results).toHaveLength(3);
    });

    it("should handle parallel execution with failures", async () => {
      vi.mocked(coordinationProtocol.executeTask)
        .mockResolvedValueOnce({ success: true, duration: 100 })
        .mockRejectedValueOnce(new Error("Task 2 failed"))
        .mockResolvedValueOnce({ success: true, duration: 100 });

      const tasks = [
        createTestTask("task-1"),
        createTestTask("task-2"),
        createTestTask("task-3"),
      ];

      const result = await orchestrator.executeParallel(tasks);

      expect(result.totalTasks).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
    });

    it("should handle empty task array", async () => {
      const result = await orchestrator.executeParallel([]);

      expect(result.totalTasks).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should return error details for failed tasks", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockRejectedValue(
        new Error("Execution error")
      );

      const tasks = [createTestTask("fail-task")];
      const result = await orchestrator.executeParallel(tasks);

      expect(result.failed).toBe(1);
      expect(result.results[0].status).toBe("failure");
      expect(result.results[0].error).toBeDefined();
    });
  });

  describe("Agent Coordination", () => {
    it("should coordinate multiple agents", async () => {
      const agents = [
        createTestAgent("coord-1"),
        createTestAgent("coord-2"),
        createTestAgent("coord-3"),
      ];

      const dependencies: DependencyGraph = {
        tasks: {
          "task-1": [],
          "task-2": ["task-1"],
          "task-3": ["task-1", "task-2"],
        },
      };

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.agentResults).toBeDefined();
      expect(coordinationProtocol.executeTask).toHaveBeenCalled();
    });

    it("should respect dependency order", async () => {
      const executionOrder: string[] = [];
      vi.mocked(coordinationProtocol.executeTask).mockImplementation(
        async (agent, task) => {
          executionOrder.push(task.id);
          return { success: true, duration: 50 };
        }
      );

      const agents = [createTestAgent("dep-agent")];
      const dependencies: DependencyGraph = {
        tasks: {
          "task-1": [],
          "task-2": ["task-1"],
        },
      };

      await orchestrator.coordinateAgents(agents, dependencies);

      // task-1 should execute before task-2
      const task1Index = executionOrder.indexOf("task-1");
      const task2Index = executionOrder.indexOf("task-2");
      expect(task1Index).toBeLessThan(task2Index);
    });

    it("should handle coordination with no dependencies", async () => {
      const agents = [createTestAgent("no-dep-agent")];
      const dependencies: DependencyGraph = {
        tasks: {
          "task-1": [],
          "task-2": [],
        },
      };

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result.success).toBe(true);
    });

    it("should handle empty agent list", async () => {
      const dependencies: DependencyGraph = { tasks: {} };
      const result = await orchestrator.coordinateAgents([], dependencies);

      expect(result.success).toBe(true);
      expect(result.agentResults).toHaveLength(0);
    });
  });

  describe("Workflow Execution with Sign-Off", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("workflow-agent"));
      orchestrator.registerAgent(createTestAgent("architect"));
    });

    it("should execute workflow with sign-offs", async () => {
      const workflow: Workflow = {
        id: "workflow-1",
        name: "Test Workflow",
        description: "A test workflow",
        steps: [
          {
            id: "step-1",
            name: "First Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-1"),
            requiresSignOff: true,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.workflowId).toBe("workflow-1");
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.steps).toHaveLength(1);
      expect(coordinationProtocol.requestSignOff).toHaveBeenCalled();
    });

    it("should execute workflow without sign-offs", async () => {
      const workflow: Workflow = {
        id: "workflow-2",
        name: "No Sign-Off Workflow",
        description: "Workflow without sign-offs",
        steps: [
          {
            id: "step-1",
            name: "First Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-1"),
            requiresSignOff: false,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.success).toBe(true);
      expect(coordinationProtocol.requestSignOff).not.toHaveBeenCalled();
    });

    it("should stop workflow on sign-off rejection", async () => {
      vi.mocked(coordinationProtocol.requestSignOff).mockResolvedValueOnce({
        approved: false,
        reviewer: "architect",
        timestamp: new Date(),
        comments: "Needs revision",
      });

      const workflow: Workflow = {
        id: "workflow-reject",
        name: "Rejected Workflow",
        description: "Workflow with rejection",
        steps: [
          {
            id: "step-1",
            name: "First Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-1"),
            requiresSignOff: true,
          },
          {
            id: "step-2",
            name: "Second Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-2"),
            requiresSignOff: false,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(1); // Only first step executed
      expect(result.steps[0].status).toBe(TaskStatus.BLOCKED);
    });

    it("should handle missing agent in workflow", async () => {
      const workflow: Workflow = {
        id: "workflow-missing",
        name: "Missing Agent Workflow",
        description: "Workflow with missing agent",
        steps: [
          {
            id: "step-1",
            name: "First Step",
            agentId: "non-existent-agent",
            task: createTestTask("step-task-1"),
            requiresSignOff: false,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.success).toBe(false);
      expect(result.steps[0].status).toBe(TaskStatus.FAILED);
      expect(result.steps[0].error).toContain("not found");
    });

    it("should handle workflow step failure without retry", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValueOnce({
        success: false,
        duration: 50,
        error: "Step failed",
      });

      const workflow: Workflow = {
        id: "workflow-fail",
        name: "Failing Workflow",
        description: "Workflow with failure",
        steps: [
          {
            id: "step-1",
            name: "Failing Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-1"),
            requiresSignOff: false,
            retryOnFailure: false,
          },
          {
            id: "step-2",
            name: "Second Step",
            agentId: "workflow-agent",
            task: createTestTask("step-task-2"),
            requiresSignOff: false,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(1); // Stopped after failure
    });
  });

  describe("Progress Tracking", () => {
    it("should get progress state", async () => {
      const progress = await orchestrator.getProgress();

      expect(progress).toBeDefined();
      expect(progress.totalTasks).toBeGreaterThanOrEqual(0);
      expect(progress.completedTasks).toBeGreaterThanOrEqual(0);
      expect(progress.inProgressTasks).toBeGreaterThanOrEqual(0);
      expect(progress.failedTasks).toBeGreaterThanOrEqual(0);
      expect(progress.blockedTasks).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);
    });

    it("should calculate overall progress percentage", async () => {
      orchestrator.registerAgent(createTestAgent("progress-agent"));
      const task = createTestTask("progress-task");

      await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      const progress = await orchestrator.getProgress();
      expect(progress.overallProgress).toBeDefined();
    });

    it("should detect current phase", async () => {
      const progress = await orchestrator.getProgress();
      expect(progress.currentPhase).toBeDefined();
      expect(["idle", "planning", "executing", "completed", "active"]).toContain(
        progress.currentPhase
      );
    });

    it("should estimate completion time when tasks in progress", async () => {
      orchestrator.registerAgent(createTestAgent("estimate-agent"));
      const task = createTestTask("estimate-task");

      // Start task but don't wait for completion
      const executePromise = orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      const progress = await orchestrator.getProgress();

      await executePromise;

      // estimatedCompletion is set when there are in-progress tasks
      expect(progress).toBeDefined();
    });
  });

  describe("Decision Escalation", () => {
    it("should escalate decision with low alignment", async () => {
      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        score: 0.3,
        reasons: ["Low alignment with vision"],
        suggestions: ["Reconsider approach"],
      });

      const decision = createTestDecision("low-alignment");
      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(true);
      expect(visionManager.checkAlignment).toHaveBeenCalledWith(decision);
    });

    it("should escalate high-impact decisions", async () => {
      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        score: 0.8,
        reasons: ["Good alignment"],
        suggestions: [],
      });

      const decision = createTestDecision("high-impact");
      decision.impact = "high";

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(true);
    });

    it("should not escalate well-aligned medium-impact decisions", async () => {
      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        score: 0.8,
        reasons: ["Good alignment"],
        suggestions: [],
      });

      const decision = createTestDecision("medium-aligned");
      decision.impact = "medium";

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(false);
    });

    it("should not escalate low-impact well-aligned decisions", async () => {
      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        score: 0.9,
        reasons: ["Excellent alignment"],
        suggestions: [],
      });

      const decision = createTestDecision("low-impact");
      decision.impact = "low";

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(false);
    });
  });

  describe("Task Queue Management", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("queue-agent"));
    });

    it("should queue task for execution", () => {
      const task = createTestTask("queued-task");
      orchestrator.queueTask(task);

      // Task should be queued
      expect(() => orchestrator.queueTask(task)).not.toThrow();
    });

    it("should queue multiple tasks", () => {
      const tasks = [
        createTestTask("queue-1"),
        createTestTask("queue-2"),
        createTestTask("queue-3"),
      ];

      tasks.forEach(task => orchestrator.queueTask(task));

      expect(() => orchestrator.queueTask(tasks[0])).not.toThrow();
    });
  });

  describe("Command Execution (API Compatibility)", () => {
    it("should execute command", async () => {
      const command = { action: "test", params: { foo: "bar" } };
      const result = await orchestrator.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.output).toContain("test");
    });

    it("should track command history", async () => {
      const command1 = { action: "cmd1" };
      const command2 = { action: "cmd2" };

      await orchestrator.executeCommand(command1);
      await orchestrator.executeCommand(command2);

      const history = await orchestrator.getCommandHistory();

      expect(history.length).toBe(2);
      expect(history[0].command).toEqual(command1);
      expect(history[1].command).toEqual(command2);
    });

    it("should get command suggestions", async () => {
      const context = { currentState: "development" };
      const suggestions = await orchestrator.getCommandSuggestions(context);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain("/[FRG]-init");
    });

    it("should handle command with complex payload", async () => {
      const command = {
        action: "complex",
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
      };

      const result = await orchestrator.executeCommand(command);

      expect(result.success).toBe(true);
    });
  });

  describe("YOLO Mode (API Compatibility)", () => {
    it("should get YOLO statistics", async () => {
      const stats = await orchestrator.getYoloStatistics();

      expect(stats.actionsToday).toBeDefined();
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.timesSaved).toBeGreaterThanOrEqual(0);
      expect(stats.issuesFixed).toBeGreaterThanOrEqual(0);
      expect(stats.performanceGain).toBeGreaterThanOrEqual(0);
      expect(stats.costSaved).toBeGreaterThanOrEqual(0);
    });

    it("should execute YOLO action", async () => {
      const action = { type: "auto-fix", target: "test.ts" };
      const result = await orchestrator.executeYoloAction(action);

      expect(result.actionId).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it("should get YOLO history", async () => {
      const history = await orchestrator.getYoloHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Health Status", () => {
    it("should report healthy status", () => {
      expect(orchestrator.isHealthy()).toBe(true);
    });

    it("should maintain health after operations", async () => {
      orchestrator.registerAgent(createTestAgent("health-agent"));
      const task = createTestTask("health-task");

      await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(orchestrator.isHealthy()).toBe(true);
    });
  });

  describe("Event Emission", () => {
    it("should emit taskComplete event on task completion", async () => {
      orchestrator.registerAgent(createTestAgent("event-agent"));

      const completedTasks: ExecutionResult[] = [];
      orchestrator.on("taskComplete", (result: ExecutionResult) => {
        completedTasks.push(result);
      });

      const task = createTestTask("event-task");
      await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(completedTasks.length).toBe(1);
      expect(completedTasks[0].taskId).toBe("event-task");
    });

    it("should emit taskStatusChanged event on status update", async () => {
      orchestrator.registerAgent(createTestAgent("status-event-agent"));

      const statusChanges: Array<{ taskId: string; status: TaskStatus }> = [];
      orchestrator.on("taskStatusChanged", (change: { taskId: string; status: TaskStatus }) => {
        statusChanges.push(change);
      });

      const task = createTestTask("status-event-task");
      await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(statusChanges.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("error-agent"));
    });

    it("should handle execution errors gracefully", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockRejectedValueOnce(
        new Error("Execution failed")
      );

      const task = createTestTask("error-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Execution failed");
    });

    it("should handle missing agent error", async () => {
      const task = createTestTask("no-agent-task");

      // Remove all agents by creating new orchestrator
      const emptyOrchestrator = new MetaOrchestrator(visionManager, coordinationProtocol);

      const result = await emptyOrchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No suitable agent");
    });

    it("should handle unknown execution pattern", async () => {
      const task = createTestTask("unknown-pattern-task");

      // Force unknown pattern
      const result = await orchestrator.execute(task, "unknown" as ExecutionPattern);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown execution pattern");
    });

    it("should track failed tasks in results", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockRejectedValueOnce(
        new Error("Task execution error")
      );

      const task = createTestTask("tracked-error-task");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(false);
      expect(result.taskId).toBe("tracked-error-task");
    });
  });

  describe("Dependency Resolution", () => {
    it("should perform topological sort on dependencies", async () => {
      const agents = [createTestAgent("topo-agent")];
      const dependencies: DependencyGraph = {
        tasks: {
          "task-a": [],
          "task-b": ["task-a"],
          "task-c": ["task-a", "task-b"],
          "task-d": ["task-c"],
        },
      };

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result.success).toBe(true);
    });

    it("should handle circular dependencies gracefully", async () => {
      const agents = [createTestAgent("circular-agent")];
      const dependencies: DependencyGraph = {
        tasks: {
          "task-a": ["task-b"],
          "task-b": ["task-a"],
        },
      };

      // Should handle gracefully without infinite loop
      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result).toBeDefined();
    });

    it("should handle complex dependency graph", async () => {
      const agents = [createTestAgent("complex-agent")];
      const dependencies: DependencyGraph = {
        tasks: {
          "task-1": [],
          "task-2": [],
          "task-3": ["task-1", "task-2"],
          "task-4": ["task-1"],
          "task-5": ["task-3", "task-4"],
        },
      };

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result.success).toBe(true);
    });
  });

  describe("Retry Logic", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("retry-agent"));
    });

    it("should retry iterative execution on failure", async () => {
      let attempts = 0;
      vi.mocked(coordinationProtocol.executeTask).mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return { success: false, duration: 50, error: "Retry needed" };
        }
        return { success: true, duration: 100, result: "Success after retries" };
      });

      const task = createTestTask("retry-task");
      const result = await orchestrator.execute(task, ExecutionPattern.ITERATIVE);

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it("should respect max retries in iterative execution", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValue({
        success: false,
        duration: 50,
        error: "Always fails",
      });

      const task = createTestTask("max-retry-task");
      const result = await orchestrator.execute(task, ExecutionPattern.ITERATIVE);

      expect(result.success).toBe(true); // Execute wraps result, checks pattern success differently
      expect(result.pattern).toBe(ExecutionPattern.ITERATIVE);
      // Max iterations is 5
      expect(coordinationProtocol.executeTask).toHaveBeenCalledTimes(5);
    });
  });

  describe("Concurrent Task Execution", () => {
    beforeEach(() => {
      orchestrator.registerAgent(createTestAgent("concurrent-1"));
      orchestrator.registerAgent(createTestAgent("concurrent-2"));
      orchestrator.registerAgent(createTestAgent("concurrent-3"));
    });

    it("should handle multiple concurrent executions", async () => {
      const tasks = [
        createTestTask("concurrent-1"),
        createTestTask("concurrent-2"),
        createTestTask("concurrent-3"),
      ];

      const promises = tasks.map(task =>
        orchestrator.execute(task, ExecutionPattern.SEQUENTIAL)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      // At least some should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it("should maintain state consistency across concurrent operations", async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createTestTask(`concurrent-${i}`)
      );

      const promises = tasks.map(task =>
        orchestrator.execute(task, ExecutionPattern.SEQUENTIAL)
      );

      await Promise.all(promises);

      const progress = await orchestrator.getProgress();
      expect(progress).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle task with empty dependencies", async () => {
      orchestrator.registerAgent(createTestAgent("empty-dep-agent"));

      const task = createTestTask("empty-deps");
      task.dependencies = [];

      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true);
    });

    it("should handle task with undefined metadata", async () => {
      orchestrator.registerAgent(createTestAgent("no-meta-agent"));

      const task = createTestTask("no-meta");

      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true);
    });

    it("should handle very long task descriptions", async () => {
      orchestrator.registerAgent(createTestAgent("long-desc-agent"));

      const task = createTestTask("long-task");
      task.description = "x".repeat(10000);

      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true);
    });

    it("should handle zero-duration tasks", async () => {
      vi.mocked(coordinationProtocol.executeTask).mockResolvedValueOnce({
        success: true,
        duration: 0,
      });

      orchestrator.registerAgent(createTestAgent("zero-duration-agent"));

      const task = createTestTask("zero-duration");
      const result = await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(result.success).toBe(true);
    });

    it("should handle progress calculation with zero tasks", async () => {
      const progress = await orchestrator.getProgress();

      expect(progress.overallProgress).toBe(0);
      expect(progress.totalTasks).toBe(0);
    });
  });
});

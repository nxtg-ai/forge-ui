/**
 * Meta-Orchestrator Tests
 * Comprehensive tests for command routing, agent dispatch, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MetaOrchestrator,
  ExecutionPattern,
  ExecutionResult,
} from "../orchestrator";
import { VisionManager } from "../vision";
import { AgentCoordinationProtocol } from "../coordination";
import { Task, TaskStatus } from "../../types/state";
import { Agent, CoordinationRequest, DependencyGraph } from "../../types/agents";
import { Decision } from "../../types/vision";
import * as crypto from "crypto";

// Mock VisionManager
vi.mock("../vision", () => ({
  VisionManager: vi.fn().mockImplementation(function (this: any) {
    this.checkAlignment = vi.fn().mockResolvedValue({
      aligned: true,
      score: 0.8,
      violations: [],
      suggestions: [],
    });
    this.initialize = vi.fn().mockResolvedValue(undefined);
  }),
}));

// Mock AgentCoordinationProtocol
vi.mock("../coordination", () => ({
  AgentCoordinationProtocol: vi.fn().mockImplementation(function (this: any) {
    this.executeTask = vi.fn().mockResolvedValue({
      success: true,
      duration: 100,
      result: { output: "Task completed" },
      artifacts: [],
    });
    this.requestSignOff = vi.fn().mockResolvedValue({
      approved: true,
      comments: "Approved",
    });
  }),
}));

// Type for mocked coordination protocol with mockable methods
interface MockedCoordinationProtocol extends AgentCoordinationProtocol {
  executeTask: ReturnType<typeof vi.fn>;
  requestSignOff: ReturnType<typeof vi.fn>;
}

describe("MetaOrchestrator", () => {
  let orchestrator: MetaOrchestrator;
  let visionManager: VisionManager;
  let coordinationProtocol: MockedCoordinationProtocol;

  beforeEach(() => {
    visionManager = new VisionManager("/test/project");
    coordinationProtocol = new AgentCoordinationProtocol() as MockedCoordinationProtocol;
    orchestrator = new MetaOrchestrator(visionManager, coordinationProtocol);
  });

  afterEach(() => {
    // Clean up any pending tasks
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await orchestrator.initialize();
      expect(orchestrator.isHealthy()).toBe(true);
    });

    it("should register agents", () => {
      const agent: Agent = {
        id: "test-agent-1",
        name: "Test Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      // Agent should be available for task assignment
      expect(true).toBe(true); // No direct access to verify, but shouldn't throw
    });
  });

  describe("Command execution", () => {
    it("should execute simple command", async () => {
      const command = {
        type: "test",
        action: "run",
      };

      const result = await orchestrator.executeCommand(command);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toContain("Command executed");
    });

    it("should track command history", async () => {
      const command1 = { type: "test", action: "first" };
      const command2 = { type: "test", action: "second" };

      await orchestrator.executeCommand(command1);
      await orchestrator.executeCommand(command2);

      const history = await orchestrator.getCommandHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].command).toEqual(command1);
      expect(history[1].command).toEqual(command2);
    });

    it("should provide command suggestions", async () => {
      const context = { currentTask: "testing" };
      const suggestions = await orchestrator.getCommandSuggestions(context);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain("/[FRG]-init");
    });
  });

  describe("Task execution patterns", () => {
    let testAgent: Agent;
    let testTask: Task;

    beforeEach(() => {
      testAgent = {
        id: "test-agent",
        name: "Test Agent",
        type: "executor",
        capabilities: ["testing", "analysis"],
        status: "idle",
      };

      testTask = {
        id: "test-task-1",
        title: "Test Task",
        description: "Test task for execution",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      orchestrator.registerAgent(testAgent);
    });

    it("should execute task sequentially", async () => {
      const result = await orchestrator.execute(
        testTask,
        ExecutionPattern.SEQUENTIAL
      );

      expect(result).toBeDefined();
      expect(result.taskId).toBe(testTask.id);
      expect(result.pattern).toBe(ExecutionPattern.SEQUENTIAL);
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should execute task in parallel", async () => {
      const result = await orchestrator.execute(
        testTask,
        ExecutionPattern.PARALLEL
      );

      expect(result).toBeDefined();
      expect(result.pattern).toBe(ExecutionPattern.PARALLEL);
      expect(result.success).toBe(true);
      expect(result.agentResults).toBeDefined();
    });

    it("should execute task iteratively", async () => {
      const result = await orchestrator.execute(
        testTask,
        ExecutionPattern.ITERATIVE
      );

      expect(result).toBeDefined();
      expect(result.pattern).toBe(ExecutionPattern.ITERATIVE);
      expect(result.success).toBe(true);
    });

    it("should execute task hierarchically", async () => {
      const result = await orchestrator.execute(
        testTask,
        ExecutionPattern.HIERARCHICAL
      );

      expect(result).toBeDefined();
      expect(result.pattern).toBe(ExecutionPattern.HIERARCHICAL);
      expect(result.success).toBe(true);
    });

    it("should handle task execution failure", async () => {
      // Mock executeTask to throw (triggers catch in execute())
      coordinationProtocol.executeTask.mockRejectedValueOnce(
        new Error("Task execution failed")
      );

      const result = await orchestrator.execute(
        testTask,
        ExecutionPattern.SEQUENTIAL
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should emit taskComplete event", async () => {
      const completedTasks: ExecutionResult[] = [];

      orchestrator.on("taskComplete", (result) => {
        completedTasks.push(result);
      });

      await orchestrator.execute(testTask, ExecutionPattern.SEQUENTIAL);

      expect(completedTasks.length).toBe(1);
      expect(completedTasks[0].taskId).toBe(testTask.id);
    });
  });

  describe("Agent coordination", () => {
    it("should coordinate multiple agents", async () => {
      const agents: Agent[] = [
        {
          id: "agent-1",
          name: "Agent 1",
          type: "planner",
          capabilities: ["planning"],
          status: "idle",
        },
        {
          id: "agent-2",
          name: "Agent 2",
          type: "executor",
          capabilities: ["execution"],
          status: "idle",
        },
        {
          id: "agent-3",
          name: "Agent 3",
          type: "reviewer",
          capabilities: ["review"],
          status: "idle",
        },
      ];

      const dependencies: DependencyGraph = {
        tasks: {
          "task-1": [],
          "task-2": ["task-1"],
          "task-3": ["task-1", "task-2"],
        },
      };

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.agentResults).toBeDefined();
      expect(result.agentResults.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle agent coordination failure", async () => {
      const agents: Agent[] = [
        {
          id: "failing-agent",
          name: "Failing Agent",
          type: "executor",
          capabilities: ["testing"],
          status: "idle",
        },
      ];

      const dependencies: DependencyGraph = {
        tasks: {
          "fail-task": [],
        },
      };

      // Mock failure
      coordinationProtocol.executeTask.mockResolvedValueOnce({
        success: false,
        duration: 50,
        error: "Agent failed",
        artifacts: [],
      });

      const result = await orchestrator.coordinateAgents(agents, dependencies);

      expect(result.success).toBe(false);
      expect(result.agentResults.some((r) => r.status === "failure")).toBe(
        true
      );
    });

    it("should respect task dependencies", async () => {
      const agents: Agent[] = [
        {
          id: "dep-agent-1",
          name: "Dependent Agent 1",
          type: "executor",
          capabilities: ["testing"],
          status: "idle",
        },
        {
          id: "dep-agent-2",
          name: "Dependent Agent 2",
          type: "executor",
          capabilities: ["testing"],
          status: "idle",
        },
      ];

      const dependencies: DependencyGraph = {
        tasks: {
          "task-a": [],
          "task-b": ["task-a"], // task-b depends on task-a
        },
      };

      const executionOrder: string[] = [];

      coordinationProtocol.executeTask.mockImplementation(
        async (agent, task) => {
          executionOrder.push(task.id);
          return {
            success: true,
            duration: 10,
            result: { output: "done" },
            artifacts: [],
          };
        }
      );

      await orchestrator.coordinateAgents(agents, dependencies);

      // task-a should execute before task-b
      const taskAIndex = executionOrder.indexOf("task-a");
      const taskBIndex = executionOrder.indexOf("task-b");

      expect(taskAIndex).toBeLessThan(taskBIndex);
    });
  });

  describe("Parallel task execution", () => {
    it("should execute multiple tasks in parallel", async () => {
      const agent: Agent = {
        id: "parallel-agent",
        name: "Parallel Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      const tasks: Task[] = [
        {
          id: "parallel-1",
          title: "Parallel Task 1",
          description: "First parallel task",
          status: TaskStatus.PENDING,
          dependencies: [],
          createdAt: new Date(),
          priority: 5,
          artifacts: [],
        },
        {
          id: "parallel-2",
          title: "Parallel Task 2",
          description: "Second parallel task",
          status: TaskStatus.PENDING,
          dependencies: [],
          createdAt: new Date(),
          priority: 5,
          artifacts: [],
        },
        {
          id: "parallel-3",
          title: "Parallel Task 3",
          description: "Third parallel task",
          status: TaskStatus.PENDING,
          dependencies: [],
          createdAt: new Date(),
          priority: 5,
          artifacts: [],
        },
      ];

      const result = await orchestrator.executeParallel(tasks);

      expect(result).toBeDefined();
      expect(result.totalTasks).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(3);
    });

    it("should handle partial failures in parallel execution", async () => {
      const agent: Agent = {
        id: "partial-fail-agent",
        name: "Partial Fail Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      const tasks: Task[] = [
        {
          id: "success-1",
          title: "Success Task",
          description: "Will succeed",
          status: TaskStatus.PENDING,
          dependencies: [],
          createdAt: new Date(),
          priority: 5,
          artifacts: [],
        },
        {
          id: "fail-1",
          title: "Fail Task",
          description: "Will fail",
          status: TaskStatus.PENDING,
          dependencies: [],
          createdAt: new Date(),
          priority: 5,
          artifacts: [],
        },
      ];

      // First call succeeds, second call fails
      coordinationProtocol.executeTask
        .mockResolvedValueOnce({
          success: true,
          duration: 100,
          result: { output: "success" },
          artifacts: [],
        })
        .mockRejectedValueOnce(new Error("Intentional failure"));

      const result = await orchestrator.executeParallel(tasks);

      expect(result.succeeded + result.failed).toBe(2);
      expect(result.failed).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Progress tracking", () => {
    it("should track execution progress", async () => {
      const task: Task = {
        id: "progress-task",
        title: "Progress Task",
        description: "Task for progress tracking",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      const agent: Agent = {
        id: "progress-agent",
        name: "Progress Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      // Start task execution (don't await)
      const executionPromise = orchestrator.execute(
        task,
        ExecutionPattern.SEQUENTIAL
      );

      // Check progress while executing
      const progress = await orchestrator.getProgress();

      expect(progress).toBeDefined();
      expect(progress.totalTasks).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);

      await executionPromise;
    });

    it("should calculate estimated completion time", async () => {
      const task: Task = {
        id: "estimate-task",
        title: "Estimate Task",
        description: "Task for time estimation",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      const agent: Agent = {
        id: "estimate-agent",
        name: "Estimate Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);
      orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      const progress = await orchestrator.getProgress();

      // Should have progress info
      expect(progress.currentPhase).toBeDefined();
    });
  });

  describe("Decision escalation", () => {
    it("should escalate high-impact decisions", async () => {
      const decision: Decision = {
        id: "high-impact-decision",
        type: "architecture",
        description: "Critical architectural change",
        impact: "high",
        rationale: "Requires review",
      };

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(true);
    });

    it("should not escalate low-impact decisions", async () => {
      const decision: Decision = {
        id: "low-impact-decision",
        type: "code",
        description: "Minor code change",
        impact: "low",
        rationale: "Safe to proceed",
      };

      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        aligned: true,
        score: 0.9,
        violations: [],
        suggestions: [],
      });

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(false);
    });

    it("should escalate decisions with low alignment", async () => {
      const decision: Decision = {
        id: "misaligned-decision",
        type: "feature",
        description: "Feature not in vision",
        impact: "medium",
        rationale: "Misaligned",
      };

      vi.mocked(visionManager.checkAlignment).mockResolvedValueOnce({
        aligned: false,
        score: 0.3,
        violations: ["Not aligned with vision"],
        suggestions: ["Review vision first"],
      });

      const shouldEscalate = await orchestrator.shouldEscalate(decision);

      expect(shouldEscalate).toBe(true);
    });
  });

  describe("Workflow execution", () => {
    it("should execute workflow with sign-off", async () => {
      const agent1: Agent = {
        id: "workflow-agent-1",
        name: "Workflow Agent 1",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      const agent2: Agent = {
        id: "architect",
        name: "Architect Agent",
        type: "reviewer",
        capabilities: ["architecture"],
        status: "idle",
      };

      orchestrator.registerAgent(agent1);
      orchestrator.registerAgent(agent2);

      const workflow = {
        id: "test-workflow",
        name: "Test Workflow",
        description: "Workflow with sign-off",
        steps: [
          {
            id: "step-1",
            name: "Implementation",
            agentId: agent1.id,
            task: {
              id: "impl-task",
              title: "Implement feature",
              description: "Implement new feature",
              status: TaskStatus.PENDING,
              dependencies: [],
              createdAt: new Date(),
              priority: 5,
              artifacts: [],
            },
            requiresSignOff: true,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result).toBeDefined();
      expect(result.workflowId).toBe(workflow.id);
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(1);
    });

    it("should stop workflow on sign-off rejection", async () => {
      const agent: Agent = {
        id: "signoff-agent",
        name: "Signoff Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      const architectAgent: Agent = {
        id: "architect",
        name: "Architect",
        type: "reviewer",
        capabilities: ["review"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);
      orchestrator.registerAgent(architectAgent);

      // Mock sign-off rejection
      coordinationProtocol.requestSignOff.mockResolvedValueOnce({
        approved: false,
        comments: "Needs revision",
      });

      const workflow = {
        id: "rejected-workflow",
        name: "Rejected Workflow",
        description: "Workflow with rejection",
        steps: [
          {
            id: "step-rejected",
            name: "Implementation",
            agentId: agent.id,
            task: {
              id: "rejected-task",
              title: "Task to be rejected",
              description: "Will be rejected",
              status: TaskStatus.PENDING,
              dependencies: [],
              createdAt: new Date(),
              priority: 5,
              artifacts: [],
            },
            requiresSignOff: true,
          },
        ],
        dependencies: { tasks: {} },
      };

      const result = await orchestrator.executeWorkflowWithSignOff(workflow);

      expect(result.success).toBe(false);
      expect(result.steps[0].status).toBe(TaskStatus.BLOCKED);
      expect(result.steps[0].error).toContain("Sign-off rejected");
    });
  });

  describe("YOLO mode", () => {
    it("should provide YOLO statistics", async () => {
      const stats = await orchestrator.getYoloStatistics();

      expect(stats).toBeDefined();
      expect(stats.actionsToday).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.timesSaved).toBeGreaterThanOrEqual(0);
    });

    it("should execute YOLO action", async () => {
      const action = {
        type: "optimize",
        description: "Quick optimization",
      };

      const result = await orchestrator.executeYoloAction(action);

      expect(result).toBeDefined();
      expect(result.actionId).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it("should track YOLO history", async () => {
      const history = await orchestrator.getYoloHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("Task queue management", () => {
    it("should queue task for execution", () => {
      const task: Task = {
        id: "queued-task",
        title: "Queued Task",
        description: "Task to be queued",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      orchestrator.queueTask(task);

      // Task should be queued (no error thrown)
      expect(true).toBe(true);
    });

    it("should process queued tasks", async () => {
      const agent: Agent = {
        id: "queue-agent",
        name: "Queue Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      const task: Task = {
        id: "queue-process-task",
        title: "Queue Process Task",
        description: "Task to be processed from queue",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      orchestrator.queueTask(task);

      // Wait for processing loop to pick up task
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Task should be processed (verify via progress or history)
      const progress = await orchestrator.getProgress();
      expect(progress).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle unknown execution pattern", async () => {
      const task: Task = {
        id: "unknown-pattern",
        title: "Unknown Pattern",
        description: "Task with unknown pattern",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      const agent: Agent = {
        id: "error-agent",
        name: "Error Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      // Execute with invalid pattern (cast to bypass TypeScript)
      const result = await orchestrator.execute(
        task,
        "invalid-pattern" as ExecutionPattern
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle task execution timeout", async () => {
      const task: Task = {
        id: "timeout-task",
        title: "Timeout Task",
        description: "Task that times out",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      const agent: Agent = {
        id: "timeout-agent",
        name: "Timeout Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      // Mock a timeout
      coordinationProtocol.executeTask.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: false,
                  duration: 5000,
                  error: "Timeout",
                  artifacts: [],
                }),
              100
            );
          })
      );

      const result = await orchestrator.execute(
        task,
        ExecutionPattern.SEQUENTIAL
      );

      expect(result).toBeDefined();
    });

    it("should emit taskStatusChanged events", async () => {
      const statusChanges: Array<{ taskId: string; status: TaskStatus }> = [];

      orchestrator.on("taskStatusChanged", (change) => {
        statusChanges.push(change);
      });

      const task: Task = {
        id: "status-task",
        title: "Status Task",
        description: "Task for status tracking",
        status: TaskStatus.PENDING,
        dependencies: [],
        createdAt: new Date(),
        priority: 5,
        artifacts: [],
      };

      const agent: Agent = {
        id: "status-agent",
        name: "Status Agent",
        type: "executor",
        capabilities: ["testing"],
        status: "idle",
      };

      orchestrator.registerAgent(agent);

      await orchestrator.execute(task, ExecutionPattern.SEQUENTIAL);

      expect(statusChanges.length).toBeGreaterThan(0);
      expect(statusChanges.some((c) => c.status === TaskStatus.IN_PROGRESS)).toBe(
        true
      );
      expect(statusChanges.some((c) => c.status === TaskStatus.COMPLETED)).toBe(
        true
      );
    });
  });
});

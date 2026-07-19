/**
 * Activity Service Tests
 * Comprehensive tests for agent activity tracking and streaming
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ActivityService,
  ActivityEventType,
  ActivityFilter,
} from "../activity-service";
import { EngagementMode } from "../../components/types";

describe("ActivityService", () => {
  let service: ActivityService;

  beforeEach(async () => {
    service = new ActivityService({
      name: "TestActivityService",
      maxEventHistory: 100,
      persistActivity: false,
      streamBufferSize: 50,
    });
    await service.initialize();
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", async () => {
      const defaultService = new ActivityService();
      await defaultService.initialize();

      expect(defaultService["config"].maxEventHistory).toBe(1000);
      expect(defaultService["config"].persistActivity).toBe(true);
      expect(defaultService["config"].activityLogPath).toBe(
        ".claude/activity.log",
      );
      expect(defaultService["config"].streamBufferSize).toBe(100);

      await defaultService.dispose();
    });

    it("should initialize with custom configuration", async () => {
      const customService = new ActivityService({
        name: "CustomService",
        maxEventHistory: 500,
        streamBufferSize: 200,
      });
      await customService.initialize();

      expect(customService["config"].maxEventHistory).toBe(500);
      expect(customService["config"].streamBufferSize).toBe(200);

      await customService.dispose();
    });

    it("should start with empty activity history", () => {
      const history = service.getActivityHistory();
      expect(history).toEqual([]);
    });

    it("should start with no active agents", () => {
      const agents = service.getActiveAgents();
      expect(agents).toEqual([]);
    });
  });

  describe("recordActivity", () => {
    it("should record an activity event successfully", async () => {
      const result = await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "TestAgent",
        data: { task: "Testing" },
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBeDefined();
        expect(result.value.timestamp).toBeInstanceOf(Date);
        expect(result.value.type).toBe(ActivityEventType.AGENT_STARTED);
        expect(result.value.agentId).toBe("agent-1");
      }
    });

    it("should generate unique event IDs", async () => {
      const result1 = await service.recordActivity({
        type: ActivityEventType.TASK_ASSIGNED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "low",
        category: "execution",
      });

      const result2 = await service.recordActivity({
        type: ActivityEventType.TASK_ASSIGNED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["builder"],
        importance: "low",
        category: "execution",
      });

      expect(result1.isOk() && result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });

    it("should add events to history", async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const history = service.getActivityHistory();
      expect(history).toHaveLength(1);
      expect(history[0].agentId).toBe("agent-1");
    });

    it("should emit activity event", async () => {
      const activityHandler = vi.fn();
      service.on("activity", activityHandler);

      await service.recordActivity({
        type: ActivityEventType.DECISION_MADE,
        agentId: "agent-1",
        agentName: "Agent1",
        data: { decision: "Use TypeScript" },
        visibility: ["founder"],
        importance: "high",
        category: "decision",
      });

      expect(activityHandler).toHaveBeenCalledTimes(1);
      expect(activityHandler.mock.calls[0][0].type).toBe(
        ActivityEventType.DECISION_MADE,
      );
    });

    it("should validate activity events", async () => {
      const result = await service.recordActivity({
        type: "invalid-type" as ActivityEventType,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Invalid activity event");
      }
    });

    it("should handle validation errors for invalid visibility", async () => {
      const result = await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["invalid-mode" as any],
        importance: "medium",
        category: "execution",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("Invalid activity event");
      }
    });

    it("should trim history when max size is exceeded", async () => {
      // Service configured with maxEventHistory: 100
      // Add 101 events
      for (let i = 0; i < 101; i++) {
        await service.recordActivity({
          type: ActivityEventType.AGENT_STARTED,
          agentId: `agent-${i}`,
          agentName: `Agent${i}`,
          data: {},
          visibility: ["builder"],
          importance: "low",
          category: "execution",
        });
      }

      const history = service.getActivityHistory();
      expect(history).toHaveLength(100);
      // First event should be removed
      expect(history[0].agentId).toBe("agent-1");
    });

    it("should update agent performance metrics", async () => {
      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const performanceResult = service.getAgentPerformance("agent-1");
      expect(performanceResult.isOk()).toBe(true);

      if (performanceResult.isOk()) {
        expect(performanceResult.value.tasksCompleted).toBe(1);
        expect(performanceResult.value.successRate).toBeGreaterThan(0);
      }
    });
  });

  describe("getActivityHistory", () => {
    beforeEach(async () => {
      // Add sample events
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer", "builder"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["founder"],
        importance: "high",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.ERROR_OCCURRED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: { error: "Test error" },
        visibility: ["engineer"],
        importance: "critical",
        category: "error",
      });
    });

    it("should return all events without filter", () => {
      const history = service.getActivityHistory();
      expect(history).toHaveLength(3);
    });

    it("should filter by agent IDs", () => {
      const filter: ActivityFilter = { agentIds: ["agent-1"] };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(2);
      expect(history.every((e) => e.agentId === "agent-1")).toBe(true);
    });

    it("should filter by event types", () => {
      const filter: ActivityFilter = {
        types: [ActivityEventType.TASK_COMPLETED],
      };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ActivityEventType.TASK_COMPLETED);
    });

    it("should filter by visibility", () => {
      const filter: ActivityFilter = { visibility: "founder" };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(1);
      expect(history[0].agentId).toBe("agent-2");
    });

    it("should filter by importance", () => {
      const filter: ActivityFilter = { importance: ["critical", "high"] };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(2);
      expect(history.every((e) => ["critical", "high"].includes(e.importance))).toBe(true);
    });

    it("should filter by categories", () => {
      const filter: ActivityFilter = { categories: ["error"] };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(1);
      expect(history[0].category).toBe("error");
    });

    it("should filter by time range", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);
      const future = new Date(now.getTime() + 1000);

      const filter: ActivityFilter = {
        startTime: past,
        endTime: future,
      };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(3);
    });

    it("should combine multiple filters", () => {
      const filter: ActivityFilter = {
        agentIds: ["agent-1"],
        categories: ["execution"],
        importance: ["medium"],
      };
      const history = service.getActivityHistory(filter);

      expect(history).toHaveLength(1);
      expect(history[0].agentId).toBe("agent-1");
      expect(history[0].category).toBe("execution");
    });
  });

  describe("subscribeToStream", () => {
    it("should subscribe to activity stream", async () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToStream("subscriber-1", callback);

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it("should unsubscribe from stream", async () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToStream("subscriber-1", callback);

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      await service.recordActivity({
        type: ActivityEventType.AGENT_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      // Should still be 1 (not called again)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should filter stream events", async () => {
      const callback = vi.fn();
      const filter: ActivityFilter = { agentIds: ["agent-1"] };
      service.subscribeToStream("subscriber-1", callback, filter);

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].agentId).toBe("agent-1");
    });

    it("should handle subscriber errors gracefully", async () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Subscriber error");
      });

      service.subscribeToStream("subscriber-1", errorCallback);

      // Should not throw even when subscriber throws
      await expect(
        service.recordActivity({
          type: ActivityEventType.AGENT_STARTED,
          agentId: "agent-1",
          agentName: "Agent1",
          data: {},
          visibility: ["builder"],
          importance: "medium",
          category: "execution",
        }),
      ).resolves.toBeDefined();

      // The throwing subscriber was called
      expect(errorCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("getStatistics", () => {
    beforeEach(async () => {
      // Create diverse activity data
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "low",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.ERROR_OCCURRED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["engineer"],
        importance: "critical",
        category: "error",
      });

      await service.recordActivity({
        type: ActivityEventType.DECISION_MADE,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["founder"],
        importance: "high",
        category: "decision",
      });
    });

    it("should calculate total events", () => {
      const stats = service.getStatistics();
      expect(stats.totalEvents).toBe(4);
    });

    it("should calculate events per agent", () => {
      const stats = service.getStatistics();
      expect(stats.eventsPerAgent["agent-1"]).toBe(3);
      expect(stats.eventsPerAgent["agent-2"]).toBe(1);
    });

    it("should calculate events per type", () => {
      const stats = service.getStatistics();
      expect(stats.eventsPerType[ActivityEventType.AGENT_STARTED]).toBe(1);
      expect(stats.eventsPerType[ActivityEventType.TASK_COMPLETED]).toBe(1);
      expect(stats.eventsPerType[ActivityEventType.ERROR_OCCURRED]).toBe(1);
    });

    it("should identify most active agent", () => {
      const stats = service.getStatistics();
      expect(stats.mostActiveAgent).toBe("agent-1");
    });

    it("should count critical events", () => {
      const stats = service.getStatistics();
      expect(stats.criticalEvents).toBe(1);
    });

    it("should calculate error rate", () => {
      const stats = service.getStatistics();
      expect(stats.errorRate).toBe(0.25); // 1 error out of 4 events
    });

    it("should apply filters to statistics", () => {
      const filter: ActivityFilter = { agentIds: ["agent-1"] };
      const stats = service.getStatistics(filter);

      expect(stats.totalEvents).toBe(3);
      expect(stats.mostActiveAgent).toBe("agent-1");
    });

    it("should handle empty event history", () => {
      const emptyService = new ActivityService();
      const stats = emptyService.getStatistics();

      expect(stats.totalEvents).toBe(0);
      expect(stats.mostActiveAgent).toBe("");
      expect(stats.errorRate).toBe(0);
    });
  });

  describe("getAgentPerformance", () => {
    it("should track task completions", async () => {
      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const result = service.getAgentPerformance("agent-1");
      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.tasksCompleted).toBe(1);
        expect(result.value.tasksFailed).toBe(0);
      }
    });

    it("should track task failures", async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_FAILED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "high",
        category: "execution",
      });

      const result = service.getAgentPerformance("agent-1");

      if (result.isOk()) {
        expect(result.value.tasksFailed).toBe(1);
        expect(result.value.successRate).toBe(0);
      }
    });

    it("should track blocker count", async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_BLOCKED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "high",
        category: "execution",
      });

      const result = service.getAgentPerformance("agent-1");

      if (result.isOk()) {
        expect(result.value.blockerCount).toBe(1);
      }
    });

    it("should track decisions influenced", async () => {
      await service.recordActivity({
        type: ActivityEventType.DECISION_MADE,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["founder"],
        importance: "high",
        category: "decision",
      });

      const result = service.getAgentPerformance("agent-1");

      if (result.isOk()) {
        expect(result.value.decisionsInfluenced).toBe(1);
      }
    });

    it("should calculate success rate", async () => {
      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_FAILED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "high",
        category: "execution",
      });

      const result = service.getAgentPerformance("agent-1");

      if (result.isOk()) {
        expect(result.value.successRate).toBeCloseTo(0.666, 2);
      }
    });

    it("should return error for unknown agent", () => {
      const result = service.getAgentPerformance("unknown-agent");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NO_PERFORMANCE_DATA");
      }
    });
  });

  describe("getAllAgentPerformances", () => {
    it("should return all agent performance data", async () => {
      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const performances = service.getAllAgentPerformances();

      expect(performances).toHaveLength(2);
      expect(performances.map((p) => p.agentId)).toContain("agent-1");
      expect(performances.map((p) => p.agentId)).toContain("agent-2");
    });

    it("should return empty array when no agents", () => {
      const performances = service.getAllAgentPerformances();
      expect(performances).toEqual([]);
    });
  });

  describe("updateAgentStatus", () => {
    it("should update agent status successfully", async () => {
      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "working" as const,
        currentTask: "Building feature",
        confidence: 0.9,
      };

      const result = await service.updateAgentStatus(agent);

      expect(result.isOk()).toBe(true);
    });

    it("should add agent to active agents list", async () => {
      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "working" as const,
        currentTask: "Testing",
        confidence: 0.8,
      };

      await service.updateAgentStatus(agent);

      const activeAgents = service.getActiveAgents();
      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].id).toBe("agent-1");
    });

    it("should emit agentStatusUpdate event", async () => {
      const handler = vi.fn();
      service.on("agentStatusUpdate", handler);

      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "working" as const,
        currentTask: "Testing",
        confidence: 0.8,
      };

      await service.updateAgentStatus(agent);

      expect(handler).toHaveBeenCalledWith(agent);
    });

    it("should create activity event for status change", async () => {
      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "blocked" as const,
        currentTask: "Waiting for input",
        confidence: 0.5,
      };

      await service.updateAgentStatus(agent);

      const history = service.getActivityHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ActivityEventType.AGENT_BLOCKED);
      expect(history[0].importance).toBe("high");
    });
  });

  describe("clearHistory", () => {
    it("should clear activity history", async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      expect(service.getActivityHistory()).toHaveLength(1);

      service.clearHistory();

      expect(service.getActivityHistory()).toHaveLength(0);
    });

    it("should emit historyCleared event", () => {
      const handler = vi.fn();
      service.on("historyCleared", handler);

      service.clearHistory();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("exportActivityLog", () => {
    beforeEach(async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: { test: "data" },
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });
    });

    it("should export as JSON", async () => {
      const result = await service.exportActivityLog("json");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const parsed = JSON.parse(result.value);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].agentId).toBe("agent-1");
      }
    });

    it("should export as CSV", async () => {
      const result = await service.exportActivityLog("csv");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const lines = result.value.split("\n");
        expect(lines[0]).toContain("ID,Type,Agent ID");
        expect(lines[1]).toContain("agent-1");
      }
    });

    it("should default to JSON format", async () => {
      const result = await service.exportActivityLog();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(() => JSON.parse(result.value)).not.toThrow();
      }
    });
  });

  describe("recordActivity error handling", () => {
    it("should wrap an Error thrown internally with its message", async () => {
      const spy = vi
        .spyOn(service as any, "addToHistory")
        .mockImplementation(() => {
          throw new Error("disk full");
        });

      const result = await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe("Failed to record activity: disk full");
        expect(result.error.code).toBe("RECORD_ERROR");
      }
      spy.mockRestore();
    });

    it("should wrap a non-Error thrown internally via String(error)", async () => {
      const spy = vi
        .spyOn(service as any, "addToHistory")
        .mockImplementation(() => {
          throw "raw-string-failure";
        });

      const result = await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to record activity: raw-string-failure",
        );
        expect(result.error.code).toBe("RECORD_ERROR");
      }
      spy.mockRestore();
    });
  });

  describe("updateAgentStatus error handling", () => {
    it("should wrap an Error thrown by recordActivity with its message", async () => {
      const spy = vi
        .spyOn(service, "recordActivity")
        .mockRejectedValueOnce(new Error("network down"));

      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "working" as const,
        currentTask: "Building feature",
        confidence: 0.9,
      };

      const result = await service.updateAgentStatus(agent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to update agent status: network down",
        );
        expect(result.error.code).toBe("STATUS_UPDATE_ERROR");
      }
      spy.mockRestore();
    });

    it("should wrap a non-Error rejection from recordActivity via String(error)", async () => {
      const spy = vi
        .spyOn(service, "recordActivity")
        .mockRejectedValueOnce("plain-reject");

      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "working" as const,
        currentTask: "Building feature",
        confidence: 0.9,
      };

      const result = await service.updateAgentStatus(agent);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to update agent status: plain-reject",
        );
        expect(result.error.code).toBe("STATUS_UPDATE_ERROR");
      }
      spy.mockRestore();
    });
  });

  describe("mapStatusToEventType branches", () => {
    it("should map 'discussing' status to DISCUSSION_STARTED", async () => {
      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "discussing" as const,
        currentTask: "Debating approach",
        confidence: 0.7,
      };

      await service.updateAgentStatus(agent);

      const history = service.getActivityHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ActivityEventType.DISCUSSION_STARTED);
    });

    it("should map an unrecognized status ('idle') to AGENT_STARTED via the default case", async () => {
      const agent = {
        id: "agent-1",
        name: "TestAgent",
        role: "builder",
        status: "idle" as const,
        currentTask: "Waiting",
        confidence: 0.3,
      };

      await service.updateAgentStatus(agent);

      const history = service.getActivityHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ActivityEventType.AGENT_STARTED);
    });
  });

  describe("addToHistory nullish-coalescing fallbacks", () => {
    it("should fall back to default maxEventHistory/streamBufferSize when config values are undefined", async () => {
      const svc = new ActivityService({
        name: "NullishConfigService",
        persistActivity: false,
        maxEventHistory: undefined,
        streamBufferSize: undefined,
      });
      await svc.initialize();

      const result = await svc.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(result.isOk()).toBe(true);
      expect(svc.getActivityHistory()).toHaveLength(1);

      await svc.dispose();
    });
  });

  describe("subscribeToStream additional filter branches (matchesFilter)", () => {
    it("should include events matching filter.types and exclude events that don't", async () => {
      const callback = vi.fn();
      service.subscribeToStream("sub-types", callback, {
        types: [ActivityEventType.TASK_COMPLETED],
      });

      await service.recordActivity({
        type: ActivityEventType.TASK_COMPLETED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].type).toBe(
        ActivityEventType.TASK_COMPLETED,
      );
    });

    it("should include events matching filter.visibility and exclude events that don't", async () => {
      const callback = vi.fn();
      service.subscribeToStream("sub-vis", callback, { visibility: "founder" });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["founder", "engineer"],
        importance: "medium",
        category: "execution",
      });
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-2",
        agentName: "Agent2",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].agentId).toBe("agent-1");
    });

    it("should include events matching filter.importance and exclude events that don't", async () => {
      const callback = vi.fn();
      service.subscribeToStream("sub-imp", callback, {
        importance: ["critical"],
      });

      await service.recordActivity({
        type: ActivityEventType.ERROR_OCCURRED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "critical",
        category: "error",
      });
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "low",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].importance).toBe("critical");
    });

    it("should include events matching filter.categories and exclude events that don't", async () => {
      const callback = vi.fn();
      service.subscribeToStream("sub-cat", callback, {
        categories: ["decision"],
      });

      await service.recordActivity({
        type: ActivityEventType.DECISION_MADE,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["founder"],
        importance: "high",
        category: "decision",
      });
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].category).toBe("decision");
    });

    it("should exclude stream events recorded before filter.startTime", async () => {
      const future = new Date(Date.now() + 60_000);
      const callback = vi.fn();
      service.subscribeToStream("sub-start-exclude", callback, {
        startTime: future,
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should include stream events recorded at/after filter.startTime", async () => {
      const past = new Date(Date.now() - 60_000);
      const callback = vi.fn();
      service.subscribeToStream("sub-start-include", callback, {
        startTime: past,
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should exclude stream events recorded after filter.endTime", async () => {
      const past = new Date(Date.now() - 60_000);
      const callback = vi.fn();
      service.subscribeToStream("sub-end-exclude", callback, {
        endTime: past,
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should include stream events recorded at/before filter.endTime", async () => {
      const future = new Date(Date.now() + 60_000);
      const callback = vi.fn();
      service.subscribeToStream("sub-end-include", callback, {
        endTime: future,
      });

      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("exportActivityLog error handling", () => {
    it("should wrap a circular-structure Error during JSON export with its message", async () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      (service as any).activityHistory.push({
        id: "evt_circular",
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-circular",
        agentName: "AgentCircular",
        timestamp: new Date(),
        data: { circular },
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const result = await service.exportActivityLog("json");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("EXPORT_ERROR");
        expect(result.error.message).toContain(
          "Failed to export activity log:",
        );
      }
    });

    it("should wrap a non-Error thrown during CSV export via String(error)", async () => {
      (service as any).activityHistory.push({
        id: "evt_bad_timestamp",
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-bad",
        agentName: "AgentBad",
        timestamp: {
          toISOString: () => {
            throw "bad-timestamp";
          },
        },
        data: {},
        visibility: ["engineer"],
        importance: "medium",
        category: "execution",
      });

      const result = await service.exportActivityLog("csv");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe(
          "Failed to export activity log: bad-timestamp",
        );
        expect(result.error.code).toBe("EXPORT_ERROR");
      }
    });
  });

  describe("disposal", () => {
    it("should clear all data on disposal", async () => {
      await service.recordActivity({
        type: ActivityEventType.AGENT_STARTED,
        agentId: "agent-1",
        agentName: "Agent1",
        data: {},
        visibility: ["builder"],
        importance: "medium",
        category: "execution",
      });

      await service.dispose();

      // Create new service instance to test persistence
      const newService = new ActivityService({
        name: "NewService",
        persistActivity: false,
      });
      await newService.initialize();

      expect(newService.getActivityHistory()).toHaveLength(0);
      await newService.dispose();
    });
  });
});

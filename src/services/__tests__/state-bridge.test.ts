/**
 * State Bridge Service Tests
 * Unit tests for state synchronization service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StateBridgeService, StateUpdateType } from "../state-bridge";
import { ProjectState, Blocker, Decision } from "../../components/types";

describe("StateBridgeService", () => {
  let service: StateBridgeService;

  beforeEach(() => {
    service = new StateBridgeService({
      name: "TestStateBridge",
      pollingInterval: 0, // Disable polling for tests
    });
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      const result = await service.initialize();
      expect(result.isOk()).toBe(true);
      expect(service.getState()).toBe("ready");
    });

    it("should load initial state", async () => {
      await service.initialize();
      const stateResult = service.getProjectState();

      expect(stateResult.isOk()).toBe(true);
      if (stateResult.isOk()) {
        expect(stateResult.value).toHaveProperty("phase");
        expect(stateResult.value).toHaveProperty("progress");
        expect(stateResult.value).toHaveProperty("blockers");
      }
    });

    it("should load initial context", async () => {
      await service.initialize();
      const contextResult = service.getProjectContext();

      expect(contextResult.isOk()).toBe(true);
      if (contextResult.isOk()) {
        expect(contextResult.value).toHaveProperty("name");
        expect(contextResult.value).toHaveProperty("activeAgents");
      }
    });
  });

  describe("state updates", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should update project state", async () => {
      const update: Partial<ProjectState> = {
        phase: "building",
        progress: 50,
      };

      const result = await service.updateProjectState(update);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.phase).toBe("building");
        expect(result.value.progress).toBe(50);
      }
    });

    it("should validate state updates", async () => {
      const invalidUpdate: any = {
        progress: 150, // Invalid: > 100
      };

      const result = await service.updateProjectState(invalidUpdate);
      expect(result.isErr()).toBe(true);
    });

    it("should emit state update events", async () => {
      const updateHandler = vi.fn();
      service.on("stateUpdate", updateHandler);

      await service.updateProjectState({ progress: 75 });

      expect(updateHandler).toHaveBeenCalled();
      const event = updateHandler.mock.calls[0][0];
      expect(event.type).toBe(StateUpdateType.PROJECT_STATE);
    });
  });

  describe("blocker management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add a blocker", async () => {
      const blocker: Blocker = {
        id: "blocker-1",
        severity: "high",
        title: "Test blocker",
        agent: "test-agent",
        needsHuman: true,
      };

      const result = await service.addBlocker(blocker);
      expect(result.isOk()).toBe(true);

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        expect(stateResult.value.blockers).toContainEqual(blocker);
      }
    });

    it("should resolve a blocker", async () => {
      const blocker: Blocker = {
        id: "blocker-2",
        severity: "medium",
        title: "Another blocker",
        agent: "test-agent",
        needsHuman: false,
      };

      await service.addBlocker(blocker);
      const result = await service.resolveBlocker("blocker-2");

      expect(result.isOk()).toBe(true);

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        expect(stateResult.value.blockers).not.toContainEqual(blocker);
      }
    });

    it("should emit blocker events", async () => {
      const updateHandler = vi.fn();
      service.on("stateUpdate", updateHandler);

      const blocker: Blocker = {
        id: "blocker-3",
        severity: "critical",
        title: "Critical blocker",
        agent: "test-agent",
        needsHuman: true,
      };

      await service.addBlocker(blocker);

      const addEvent = updateHandler.mock.calls.find(
        (call) => call[0].type === StateUpdateType.BLOCKER_ADDED,
      );
      expect(addEvent).toBeDefined();

      await service.resolveBlocker("blocker-3");

      const resolveEvent = updateHandler.mock.calls.find(
        (call) => call[0].type === StateUpdateType.BLOCKER_RESOLVED,
      );
      expect(resolveEvent).toBeDefined();
    });
  });

  describe("decision recording", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should record a decision", async () => {
      const decision: Decision = {
        id: "decision-1",
        type: "architecture",
        title: "Use microservices",
        madeBy: "architect",
        timestamp: new Date(),
        impact: "high",
      };

      const result = await service.recordDecision(decision);
      expect(result.isOk()).toBe(true);

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        expect(stateResult.value.recentDecisions).toContainEqual(decision);
      }
    });

    it("should limit recent decisions to 10", async () => {
      // Add 12 decisions
      for (let i = 0; i < 12; i++) {
        const decision: Decision = {
          id: `decision-${i}`,
          type: "implementation",
          title: `Decision ${i}`,
          madeBy: "test",
          timestamp: new Date(),
          impact: "low",
        };
        await service.recordDecision(decision);
      }

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        expect(stateResult.value.recentDecisions).toHaveLength(10);
        // Should keep the most recent ones
        expect(stateResult.value.recentDecisions[0].id).toBe("decision-11");
      }
    });
  });

  describe("subscriptions", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should subscribe to state updates", async () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe("test-sub", callback);

      await service.updateProjectState({ progress: 60 });

      expect(callback).toHaveBeenCalled();

      unsubscribe();
      callback.mockClear();

      await service.updateProjectState({ progress: 70 });
      expect(callback).not.toHaveBeenCalled();
    });

    it("should filter subscriptions", async () => {
      const callback = vi.fn();
      service.subscribe("filtered-sub", callback, {
        filter: (update) => update.type === StateUpdateType.BLOCKER_ADDED,
      });

      await service.updateProjectState({ progress: 80 });
      expect(callback).not.toHaveBeenCalled();

      const blocker: Blocker = {
        id: "test-blocker",
        severity: "low",
        title: "Test",
        agent: "test",
        needsHuman: false,
      };
      await service.addBlocker(blocker);
      expect(callback).toHaveBeenCalled();
    });

    it("should debounce subscriptions", async () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      service.subscribe("debounced-sub", callback, {
        debounceMs: 100,
      });

      // Rapid updates
      await service.updateProjectState({ progress: 10 });
      await service.updateProjectState({ progress: 20 });
      await service.updateProjectState({ progress: 30 });

      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      // Should only be called once due to debouncing
      expect(callback).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("snapshot management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should create a snapshot", async () => {
      await service.updateProjectState({
        phase: "testing",
        progress: 90,
      });

      const snapshot = service.getSnapshot();

      expect(snapshot).not.toBeNull();
      expect(snapshot?.projectState.phase).toBe("testing");
      expect(snapshot?.projectState.progress).toBe(90);
      expect(snapshot?.version).toBeGreaterThan(0);
    });

    it("should restore from snapshot", async () => {
      const originalState = service.getProjectState();

      const snapshot = service.getSnapshot()!;

      await service.updateProjectState({
        phase: "deploying",
        progress: 95,
      });

      await service.restoreFromSnapshot(snapshot);

      const restoredState = service.getProjectState();
      if (originalState.isOk() && restoredState.isOk()) {
        expect(restoredState.value.phase).toBe(originalState.value.phase);
      }
    });
  });

  describe("update history", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should maintain update history", async () => {
      await service.updateProjectState({ progress: 25 });
      await service.updateProjectState({ progress: 50 });
      await service.updateProjectState({ progress: 75 });

      const history = service.getUpdateHistory();

      expect(history).toHaveLength(3);
      expect(history[0].type).toBe(StateUpdateType.PROJECT_STATE);
    });

    it("should limit history size", async () => {
      const config = { maxBufferSize: 5 };
      const limitedService = new StateBridgeService({
        name: "LimitedService",
        ...config,
      });

      await limitedService.initialize();

      for (let i = 0; i < 10; i++) {
        await limitedService.updateProjectState({ progress: i * 10 });
      }

      const history = limitedService.getUpdateHistory();
      expect(history.length).toBeLessThanOrEqual(config.maxBufferSize);

      await limitedService.dispose();
    });

    it("should clear update history", async () => {
      await service.updateProjectState({ progress: 30 });
      await service.updateProjectState({ progress: 60 });

      service.clearUpdateHistory();

      const history = service.getUpdateHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe("agent state management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should update agent state", async () => {
      const agent = {
        id: "agent-1",
        name: "Test Agent",
        role: "builder",
        status: "working" as const,
        currentTask: "Building feature",
        confidence: 0.85,
      };

      const result = await service.updateAgentState(agent);
      expect(result.isOk()).toBe(true);

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        const foundAgent = stateResult.value.activeAgents.find(
          (a) => a.id === "agent-1",
        );
        expect(foundAgent).toEqual(agent);
      }
    });

    it("should update existing agent", async () => {
      const agent = {
        id: "agent-2",
        name: "Another Agent",
        role: "tester",
        status: "idle" as const,
        currentTask: "None",
        confidence: 0.5,
      };

      await service.updateAgentState(agent);

      const updatedAgent = {
        ...agent,
        status: "working" as const,
        currentTask: "Running tests",
        confidence: 0.9,
      };

      await service.updateAgentState(updatedAgent);

      const stateResult = service.getProjectState();
      if (stateResult.isOk()) {
        const foundAgent = stateResult.value.activeAgents.find(
          (a) => a.id === "agent-2",
        );
        expect(foundAgent?.status).toBe("working");
        expect(foundAgent?.confidence).toBe(0.9);
      }
    });
  });

  describe("error handling", () => {
    it("should handle initialization errors gracefully", async () => {
      const errorService = new StateBridgeService({
        name: "ErrorService",
        statePath: "/invalid/path/state.json",
      });

      const result = await errorService.initialize();
      // Should still initialize with default state
      expect(result.isOk()).toBe(true);

      await errorService.dispose();
    });

    it("should handle update errors", async () => {
      await service.initialize();

      // Force an error by disposing first
      await service.dispose();

      const result = await service.updateProjectState({ progress: 50 });
      expect(result.isErr()).toBe(true);
    });

    it("should validate snapshot before restore", async () => {
      await service.initialize();

      const invalidSnapshot: any = {
        projectState: { invalid: true },
        projectContext: {},
        timestamp: new Date(),
        version: 1,
      };

      const result = await service.restoreFromSnapshot(invalidSnapshot);
      expect(result.isErr()).toBe(true);
    });
  });
});

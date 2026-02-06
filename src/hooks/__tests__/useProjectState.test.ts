/**
 * Tests for useProjectState Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProjectState } from "../useProjectState";
import { Result } from "../../utils/result";
import { StateUpdateType } from "../../services/state-bridge";

// Mock StateBridgeService
const mockStateBridge = {
  initialize: vi.fn(),
  getProjectState: vi.fn(),
  getProjectContext: vi.fn(),
  subscribe: vi.fn(),
  updateProjectState: vi.fn(),
  addBlocker: vi.fn(),
  resolveBlocker: vi.fn(),
  recordDecision: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("../../services/state-bridge", () => ({
  StateBridgeService: vi.fn(() => mockStateBridge),
  StateUpdateType: {
    PROJECT_STATE: "project_state",
    AGENT_STATE: "agent_state",
    BLOCKER_ADDED: "blocker_added",
    BLOCKER_RESOLVED: "blocker_resolved",
    DECISION_MADE: "decision_made",
    PHASE_CHANGED: "phase_changed",
    PROGRESS_UPDATE: "progress_update",
  },
}));

describe("useProjectState", () => {
  const mockProjectState = {
    phase: "building" as const,
    progress: 50,
    blockers: [],
    recentDecisions: [],
    activeAgents: [],
    healthScore: 85,
  };

  const mockProjectContext = {
    name: "Test Project",
    phase: "building",
    activeAgents: 2,
    pendingTasks: 5,
    healthScore: 85,
    lastActivity: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    mockStateBridge.initialize.mockResolvedValue(Result.ok(undefined));
    mockStateBridge.getProjectState.mockReturnValue(Result.ok(mockProjectState));
    mockStateBridge.getProjectContext.mockReturnValue(Result.ok(mockProjectContext));
    mockStateBridge.subscribe.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useProjectState({ autoConnect: false }));

    expect(result.current.loading).toBe(true);
    expect(result.current.state).toBe(null);
    expect(result.current.context).toBe(null);
    expect(result.current.connected).toBe(false);
  });

  it("should auto-connect by default", async () => {
    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(mockStateBridge.initialize).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.connected).toBe(true);
    });
  });

  it("should not auto-connect when disabled", async () => {
    renderHook(() => useProjectState({ autoConnect: false }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockStateBridge.initialize).not.toHaveBeenCalled();
  });

  it("should fetch initial state on initialization", async () => {
    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.state).toEqual(mockProjectState);
    expect(result.current.context).toEqual(mockProjectContext);
  });

  it("should handle initialization error", async () => {
    const error = new Error("Init failed");
    mockStateBridge.initialize.mockResolvedValue(Result.err(error));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useProjectState({ onError })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.connected).toBe(false);
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("should subscribe to state updates", async () => {
    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(mockStateBridge.subscribe).toHaveBeenCalled();
    });

    expect(mockStateBridge.subscribe).toHaveBeenCalledWith(
      "useProjectState",
      expect.any(Function),
      expect.objectContaining({ debounceMs: 100 })
    );
  });

  it("should handle PROJECT_STATE update", async () => {
    let updateCallback: ((update: any) => void) | null = null;
    mockStateBridge.subscribe.mockImplementation((id, callback) => {
      updateCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newState = {
      ...mockProjectState,
      phase: "testing" as const,
      progress: 75,
    };

    act(() => {
      updateCallback?.({
        type: StateUpdateType.PROJECT_STATE,
        timestamp: new Date(),
        data: newState,
      });
    });

    await waitFor(() => {
      expect(result.current.state).toEqual(newState);
    });
  });

  it("should handle PHASE_CHANGED update", async () => {
    let updateCallback: ((update: any) => void) | null = null;
    mockStateBridge.subscribe.mockImplementation((id, callback) => {
      updateCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      updateCallback?.({
        type: StateUpdateType.PHASE_CHANGED,
        timestamp: new Date(),
        data: "deploying",
      });
    });

    await waitFor(() => {
      expect(result.current.state?.phase).toBe("deploying");
    });
  });

  it("should handle PROGRESS_UPDATE", async () => {
    let updateCallback: ((update: any) => void) | null = null;
    mockStateBridge.subscribe.mockImplementation((id, callback) => {
      updateCallback = callback;
      return () => {};
    });

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      updateCallback?.({
        type: StateUpdateType.PROGRESS_UPDATE,
        timestamp: new Date(),
        data: 90,
      });
    });

    await waitFor(() => {
      expect(result.current.state?.progress).toBe(90);
    });
  });

  it("should update state", async () => {
    const updatedState = { ...mockProjectState, progress: 100 };
    mockStateBridge.updateProjectState.mockResolvedValue(Result.ok(updatedState));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateState({ progress: 100 });
    });

    expect(mockStateBridge.updateProjectState).toHaveBeenCalledWith({ progress: 100 });
    expect(result.current.state).toEqual(updatedState);
  });

  it("should throw error when updating state without initialization", async () => {
    const { result } = renderHook(() => useProjectState({ autoConnect: false }));

    await expect(async () => {
      await act(async () => {
        await result.current.updateState({ progress: 50 });
      });
    }).rejects.toThrow("Service not initialized");
  });

  it("should add blocker", async () => {
    mockStateBridge.addBlocker.mockResolvedValue(Result.ok(undefined));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const blocker = {
      id: "blocker-1",
      severity: "high" as const,
      title: "Test blocker",
      agent: "test-agent",
      needsHuman: true,
    };

    await act(async () => {
      await result.current.addBlocker(blocker);
    });

    expect(mockStateBridge.addBlocker).toHaveBeenCalledWith(blocker);
  });

  it("should resolve blocker", async () => {
    mockStateBridge.resolveBlocker.mockResolvedValue(Result.ok(undefined));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.resolveBlocker("blocker-1");
    });

    expect(mockStateBridge.resolveBlocker).toHaveBeenCalledWith("blocker-1");
  });

  it("should record decision", async () => {
    mockStateBridge.recordDecision.mockResolvedValue(Result.ok(undefined));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const decision = {
      id: "decision-1",
      type: "architecture" as const,
      title: "Use React",
      madeBy: "architect",
      timestamp: new Date(),
      impact: "high" as const,
    };

    await act(async () => {
      await result.current.recordDecision(decision);
    });

    expect(mockStateBridge.recordDecision).toHaveBeenCalledWith(decision);
  });

  it("should refresh state", async () => {
    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newState = { ...mockProjectState, progress: 80 };
    mockStateBridge.getProjectState.mockReturnValue(Result.ok(newState));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state).toEqual(newState);
  });

  it("should cleanup on unmount", async () => {
    const unsubscribe = vi.fn();
    mockStateBridge.subscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(mockStateBridge.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(mockStateBridge.dispose).toHaveBeenCalled();
  });

  it("should handle errors in state operations", async () => {
    const error = new Error("Update failed");
    mockStateBridge.updateProjectState.mockResolvedValue(Result.err(error));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.updateState({ progress: 100 });
      });
    }).rejects.toThrow("Update failed");
  });

  it("should pass polling interval to service", async () => {
    const { StateBridgeService } = await import("../../services/state-bridge");

    renderHook(() => useProjectState({ pollingInterval: 5000 }));

    await waitFor(() => {
      expect(StateBridgeService).toHaveBeenCalledWith(
        expect.objectContaining({
          pollingInterval: 5000,
        })
      );
    });
  });

  it("should handle state when service returns error result", async () => {
    mockStateBridge.getProjectState.mockReturnValue(Result.err(new Error("State error")));
    mockStateBridge.getProjectContext.mockReturnValue(Result.err(new Error("Context error")));

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still be connected but state/context are null
    expect(result.current.connected).toBe(true);
    expect(result.current.state).toBe(null);
    expect(result.current.context).toBe(null);
  });
});

/**
 * Tests for useForgeIntegration Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useVision,
  useProjectState,
  useAgentActivities,
  useCommandExecution,
  useArchitectureDecisions,
  useYoloMode,
  useForgeIntegration,
} from "../useForgeIntegration";

// Mock API client - use vi.hoisted to avoid hoisting issues
const mockApiClient = vi.hoisted(() => ({
  getVision: vi.fn(),
  updateVision: vi.fn(),
  captureVision: vi.fn(),
  getProjectState: vi.fn(),
  updateProjectPhase: vi.fn(),
  getAgentActivities: vi.fn(),
  executeCommand: vi.fn(),
  getCommandHistory: vi.fn(),
  getCommandSuggestions: vi.fn(),
  getArchitectureDecisions: vi.fn(),
  proposeArchitecture: vi.fn(),
  approveArchitectureDecision: vi.fn(),
  getYoloStatistics: vi.fn(),
  getYoloHistory: vi.fn(),
  executeYoloAction: vi.fn(),
  subscribe: vi.fn(() => () => {}),
}));

vi.mock("../../services/api-client", () => ({
  apiClient: mockApiClient,
  WSMessageType: {
    VISION_CHANGE: "vision.change",
    STATE_UPDATE: "state.update",
    AGENT_ACTIVITY: "agent.activity",
    COMMAND_EXECUTED: "command.executed",
    DECISION_MADE: "decision.made",
    YOLO_ACTION: "yolo.action",
  },
}));

describe("useVision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockVisionData = {
    mission: "Build great software",
    strategicGoals: ["Goal 1", "Goal 2"],
    principles: ["Principle 1"],
    created: "2026-01-01T00:00:00Z",
    updated: "2026-01-02T00:00:00Z",
    version: 1,
  };

  it("should fetch vision on mount", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: true,
      data: mockVisionData,
    });

    const { result } = renderHook(() => useVision());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.getVision).toHaveBeenCalled();
    expect(result.current.vision).toBeDefined();
    expect(result.current.vision?.mission).toBe("Build great software");
  });

  it("should handle fetch error", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: false,
      error: "Failed to fetch",
    });

    const { result } = renderHook(() => useVision());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch");
  });

  it("should update vision", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: true,
      data: mockVisionData,
    });

    const updatedVisionData = { ...mockVisionData, mission: "Updated mission" };
    mockApiClient.updateVision.mockResolvedValue({
      success: true,
      data: updatedVisionData,
    });

    const { result } = renderHook(() => useVision());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateVision({ mission: "Updated mission" });
    });

    expect(mockApiClient.updateVision).toHaveBeenCalledWith({
      mission: "Updated mission",
    });
    expect(result.current.vision?.mission).toBe("Updated mission");
  });

  it("should capture vision from text", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: true,
      data: mockVisionData,
    });

    mockApiClient.captureVision.mockResolvedValue({
      success: true,
      data: mockVisionData,
    });

    const { result } = renderHook(() => useVision());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const success = await act(async () => {
      return await result.current.captureVision("New vision text");
    });

    expect(success).toBe(true);
    expect(mockApiClient.captureVision).toHaveBeenCalledWith("New vision text");
  });

  it("should subscribe to vision changes", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: true,
      data: mockVisionData,
    });

    const { result } = renderHook(() => useVision());

    await waitFor(() => {
      expect(mockApiClient.subscribe).toHaveBeenCalledWith(
        "vision.change",
        expect.any(Function)
      );
    });
  });

  it("should map backend vision to frontend format", async () => {
    const backendVision = {
      mission: "Test",
      strategicGoals: [
        { title: "Goal 1", description: "Desc 1" },
        "Simple goal",
      ],
      principles: ["P1"],
    };

    mockApiClient.getVision.mockResolvedValue({
      success: true,
      data: backendVision,
    });

    const { result } = renderHook(() => useVision());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vision?.goals).toHaveLength(2);
    expect(result.current.vision?.goals[0].title).toBe("Goal 1");
    expect(result.current.vision?.goals[1].title).toBe("Simple goal");
  });
});

describe("useProjectState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStateData = {
    phase: "building",
    progress: 50,
    blockers: [],
    recentDecisions: [],
    activeAgents: [],
    healthScore: 85,
  };

  it("should fetch project state on mount", async () => {
    mockApiClient.getProjectState.mockResolvedValue({
      success: true,
      data: mockStateData,
    });

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.getProjectState).toHaveBeenCalled();
    expect(result.current.projectState).toEqual(mockStateData);
  });

  it("should setup polling", async () => {
    mockApiClient.getProjectState.mockResolvedValue({
      success: true,
      data: mockStateData,
    });

    const { unmount } = renderHook(() => useProjectState());

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockApiClient.getProjectState).toHaveBeenCalledTimes(1);
    });

    // Wait for at least one polling cycle (5 seconds + buffer)
    await waitFor(
      () => {
        expect(mockApiClient.getProjectState).toHaveBeenCalledTimes(2);
      },
      { timeout: 6000 }
    );

    // Clean up
    unmount();
  });

  it("should update phase", async () => {
    mockApiClient.getProjectState.mockResolvedValue({
      success: true,
      data: mockStateData,
    });

    const updatedState = { ...mockStateData, phase: "testing" };
    mockApiClient.updateProjectPhase.mockResolvedValue({
      success: true,
      data: updatedState,
    });

    const { result } = renderHook(() => useProjectState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePhase("testing");
    });

    expect(result.current.projectState?.phase).toBe("testing");
  });
});

describe("useAgentActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActivities = [
    {
      agentId: "agent-1",
      action: "Started task",
      timestamp: new Date(),
      visibility: "engineer" as const,
    },
  ];

  it("should fetch activities on mount", async () => {
    mockApiClient.getAgentActivities.mockResolvedValue({
      success: true,
      data: mockActivities,
    });

    const { result } = renderHook(() => useAgentActivities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.getAgentActivities).toHaveBeenCalledWith({ limit: 50 });
    expect(result.current.activities).toEqual(mockActivities);
  });

  it("should subscribe to activity updates", async () => {
    mockApiClient.getAgentActivities.mockResolvedValue({
      success: true,
      data: [],
    });

    const { result } = renderHook(() => useAgentActivities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify subscribe was called with the correct event
    expect(mockApiClient.subscribe).toHaveBeenCalledWith(
      "agent.activity",
      expect.any(Function)
    );
  });
});

describe("useCommandExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCommand = {
    id: "frg-status",
    name: "Status",
    description: "Status",
    category: "forge" as const,
    icon: null,
  };

  it("should execute command", async () => {
    mockApiClient.getCommandHistory.mockResolvedValue({
      success: true,
      data: [],
    });

    mockApiClient.executeCommand.mockResolvedValue({
      success: true,
      data: { result: "Success" },
    });

    const { result } = renderHook(() => useCommandExecution());

    await waitFor(() => {
      expect(result.current.executing).toBe(false);
    });

    await act(async () => {
      await result.current.executeCommand(mockCommand);
    });

    expect(mockApiClient.executeCommand).toHaveBeenCalledWith(mockCommand);
    expect(result.current.lastResult).toEqual("Success");
  });

  it("should fetch command history", async () => {
    const mockHistory = [mockCommand];
    mockApiClient.getCommandHistory.mockResolvedValue({
      success: true,
      data: mockHistory,
    });

    const { result } = renderHook(() => useCommandExecution());

    await waitFor(() => {
      expect(result.current.history).toEqual(mockHistory);
    });
  });

  it("should get command suggestions", async () => {
    mockApiClient.getCommandHistory.mockResolvedValue({
      success: true,
      data: [],
    });

    mockApiClient.getCommandSuggestions.mockResolvedValue({
      success: true,
      data: [mockCommand],
    });

    const { result } = renderHook(() => useCommandExecution());

    await waitFor(() => {
      expect(result.current.executing).toBe(false);
    });

    const suggestions = await act(async () => {
      return await result.current.getSuggestions("test context");
    });

    expect(suggestions).toEqual([mockCommand]);
  });
});

describe("useArchitectureDecisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDecision = {
    id: "dec-1",
    approach: "Use React",
    rationale: "Modern framework",
    tradeoffs: ["Learning curve"],
    consensus: 90,
    signedOffBy: ["architect-1"],
  };

  it("should fetch decisions on mount", async () => {
    mockApiClient.getArchitectureDecisions.mockResolvedValue({
      success: true,
      data: [mockDecision],
    });

    const { result } = renderHook(() => useArchitectureDecisions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decisions).toEqual([mockDecision]);
  });

  it("should propose decision", async () => {
    mockApiClient.getArchitectureDecisions.mockResolvedValue({
      success: true,
      data: [],
    });

    mockApiClient.proposeArchitecture.mockResolvedValue({
      success: true,
      data: mockDecision,
    });

    const { result } = renderHook(() => useArchitectureDecisions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.proposeDecision({ approach: "Use React" });
    });

    expect(result.current.decisions).toContainEqual(mockDecision);
  });

  it("should approve decision", async () => {
    mockApiClient.getArchitectureDecisions.mockResolvedValue({
      success: true,
      data: [mockDecision],
    });

    const approvedDecision = { ...mockDecision, consensus: 100 };
    mockApiClient.approveArchitectureDecision.mockResolvedValue({
      success: true,
      data: approvedDecision,
    });

    const { result } = renderHook(() => useArchitectureDecisions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.approveDecision("dec-1");
    });

    expect(result.current.decisions[0].consensus).toBe(100);
  });
});

describe("useYoloMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStatistics = {
    actionsToday: 5,
    successRate: 95,
    timesSaved: 120,
    issuesFixed: 10,
    performanceGain: 15,
    costSaved: 50,
  };

  const mockAction = {
    id: "action-1",
    type: "fix" as const,
    title: "Fix bug",
    description: "Auto fix",
    impact: "medium" as const,
    status: "completed" as const,
    timestamp: new Date(),
    confidence: 95,
    automated: true,
  };

  it("should fetch statistics and history", async () => {
    mockApiClient.getYoloStatistics.mockResolvedValue({
      success: true,
      data: mockStatistics,
    });

    mockApiClient.getYoloHistory.mockResolvedValue({
      success: true,
      data: [mockAction],
    });

    const { result } = renderHook(() => useYoloMode());

    await waitFor(() => {
      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.history).toEqual([mockAction]);
    });
  });

  it("should execute yolo action", async () => {
    mockApiClient.getYoloStatistics.mockResolvedValue({
      success: true,
      data: mockStatistics,
    });

    mockApiClient.getYoloHistory.mockResolvedValue({
      success: true,
      data: [],
    });

    mockApiClient.executeYoloAction.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useYoloMode());

    await waitFor(() => {
      expect(result.current.executing).toBe(false);
    });

    await act(async () => {
      await result.current.executeAction(mockAction);
    });

    expect(mockApiClient.executeYoloAction).toHaveBeenCalledWith(mockAction);
    expect(result.current.history).toContainEqual(mockAction);
  });
});

describe("useForgeIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks for all hooks
    mockApiClient.getVision.mockResolvedValue({ success: true, data: {} });
    mockApiClient.getProjectState.mockResolvedValue({ success: true, data: {} });
    mockApiClient.getAgentActivities.mockResolvedValue({ success: true, data: [] });
    mockApiClient.getCommandHistory.mockResolvedValue({ success: true, data: [] });
    mockApiClient.getArchitectureDecisions.mockResolvedValue({ success: true, data: [] });
    mockApiClient.getYoloStatistics.mockResolvedValue({ success: true, data: {} });
    mockApiClient.getYoloHistory.mockResolvedValue({ success: true, data: [] });
  });

  it("should combine all hooks", async () => {
    const { result } = renderHook(() => useForgeIntegration());

    expect(result.current.vision).toBeDefined();
    expect(result.current.projectState).toBeDefined();
    expect(result.current.agentActivities).toBeDefined();
    expect(result.current.commandExecution).toBeDefined();
    expect(result.current.architectureDecisions).toBeDefined();
    expect(result.current.yoloMode).toBeDefined();
  });

  it("should track loading state", async () => {
    const { result } = renderHook(() => useForgeIntegration());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should collect errors from all hooks", async () => {
    mockApiClient.getVision.mockResolvedValue({
      success: false,
      error: "Vision error",
    });

    const { result } = renderHook(() => useForgeIntegration());

    await waitFor(() => {
      expect(result.current.errors.length).toBeGreaterThan(0);
    });

    expect(result.current.errors).toContain("Vision error");
  });

  it("should report connection status", async () => {
    const { result } = renderHook(() => useForgeIntegration());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});

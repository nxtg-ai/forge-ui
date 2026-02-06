/**
 * Tests for GovernanceHUD Component
 *
 * Test coverage:
 * - Data fetching from /api/governance/state
 * - Loading state
 * - Error state
 * - Governance state rendering
 * - WebSocket connection
 * - WebSocket reconnection
 * - Fallback polling
 * - Sub-component rendering
 * - Connection status indicators
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GovernanceHUD } from "../GovernanceHUD";
import type { GovernanceState } from "../../../types/governance.types";

// Mock sub-components
vi.mock("../ConstitutionCard", () => ({
  ConstitutionCard: ({ constitution }: any) => (
    <div data-testid="constitution-card">
      Constitution: {constitution?.name || "None"}
    </div>
  ),
}));

vi.mock("../ImpactMatrix", () => ({
  ImpactMatrix: ({ workstreams }: any) => (
    <div data-testid="impact-matrix">Workstreams: {workstreams?.length || 0}</div>
  ),
}));

vi.mock("../OracleFeed", () => ({
  OracleFeed: ({ logs }: any) => (
    <div data-testid="oracle-feed">Logs: {logs?.length || 0}</div>
  ),
}));

vi.mock("../StrategicAdvisor", () => ({
  StrategicAdvisor: ({ state }: any) => (
    <div data-testid="strategic-advisor">Strategic Advisor</div>
  ),
}));

vi.mock("../WorkerPoolMetrics", () => ({
  WorkerPoolMetrics: () => <div data-testid="worker-pool-metrics">Worker Pool</div>,
}));

vi.mock("../AgentActivityFeed", () => ({
  AgentActivityFeed: ({ maxEntries }: any) => (
    <div data-testid="agent-activity-feed">Activity Feed (max: {maxEntries})</div>
  ),
}));

describe("GovernanceHUD", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockWebSocket: any;
  const mockGovernanceState: GovernanceState = {
    constitution: {
      name: "Test Constitution",
      version: "1.0.0",
      principles: ["Test principle 1", "Test principle 2"],
      rules: [],
      violations: [],
    },
    workstreams: [
      {
        id: "ws-1",
        name: "Testing Workstream",
        status: "active",
        agents: [],
        tasks: [],
      },
    ],
    sentinelLog: [
      {
        id: "log-1",
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Test log entry",
        source: "sentinel",
      },
    ],
    metrics: {
      totalAgents: 5,
      activeAgents: 3,
      completedTasks: 42,
      pendingTasks: 8,
    },
  };

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock WebSocket
    mockWebSocket = {
      close: vi.fn(),
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    vi.stubGlobal("WebSocket", vi.fn(() => mockWebSocket));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Loading State", () => {
    test("shows loading state initially", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      render(<GovernanceHUD />);

      expect(screen.getByTestId("governance-hud-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading governance...")).toBeInTheDocument();
    });

    test("shows loading spinner", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      render(<GovernanceHUD />);

      const loadingState = screen.getByTestId("governance-hud-loading");
      expect(loadingState.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    test("shows error state on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument();
      });
    });

    test("displays error message", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load governance")).toBeInTheDocument();
        expect(screen.getByText("API unavailable")).toBeInTheDocument();
      });
    });

    test("shows error state on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument();
        expect(screen.getByText(/500/)).toBeInTheDocument();
      });
    });
  });

  describe("Data Fetching", () => {
    test("fetches governance state on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/governance/state");
      });
    });

    test("renders governance state after successful fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });
    });

    test("handles response without data property", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          // Missing data property
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument();
        expect(screen.getByText(/missing data property/)).toBeInTheDocument();
      });
    });
  });

  describe("Header", () => {
    test("displays header with title", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByText("Governance HUD")).toBeInTheDocument();
      });
    });

    test("shows connecting status initially", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByText("Connecting")).toBeInTheDocument();
      });
    });

    test("displays connection status indicator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        const container = screen.getByTestId("governance-hud-container");
        expect(container.querySelector(".rounded-full")).toBeInTheDocument();
      });
    });
  });

  describe("Sub-components Rendering", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });
    });

    test("renders StrategicAdvisor", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("strategic-advisor")).toBeInTheDocument();
      });
    });

    test("renders ConstitutionCard", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("constitution-card")).toBeInTheDocument();
        expect(screen.getByText(/Test Constitution/)).toBeInTheDocument();
      });
    });

    test("renders WorkerPoolMetrics", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("worker-pool-metrics")).toBeInTheDocument();
      });
    });

    test("renders ImpactMatrix", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("impact-matrix")).toBeInTheDocument();
        expect(screen.getByText("Workstreams: 1")).toBeInTheDocument();
      });
    });

    test("renders AgentActivityFeed", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("agent-activity-feed")).toBeInTheDocument();
        expect(screen.getByText("Activity Feed (max: 15)")).toBeInTheDocument();
      });
    });

    test("renders OracleFeed", async () => {
      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("oracle-feed")).toBeInTheDocument();
        expect(screen.getByText("Logs: 1")).toBeInTheDocument();
      });
    });
  });

  describe("WebSocket Connection", () => {
    test("attempts WebSocket connection after initial fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      expect(WebSocket).toHaveBeenCalled();
    });

    test("updates to connected status when WebSocket opens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      // Simulate WebSocket open
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });
    });

    test("handles WebSocket message updates", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      // Simulate WebSocket message
      const updatedState = {
        ...mockGovernanceState,
        workstreams: [
          ...mockGovernanceState.workstreams,
          {
            id: "ws-2",
            name: "New Workstream",
            status: "active",
            agents: [],
            tasks: [],
          },
        ],
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "governance.update",
            payload: updatedState,
          }),
        });
      }

      await waitFor(() => {
        expect(screen.getByText("Workstreams: 2")).toBeInTheDocument();
      });
    });

    test("closes WebSocket on unmount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      const { unmount } = render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      unmount();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe("WebSocket Reconnection", () => {
    test("attempts reconnection on close", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      // Simulate WebSocket close
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      await waitFor(() => {
        expect(screen.getByText("Connecting")).toBeInTheDocument();
      });

      // Advance time for reconnect delay
      vi.advanceTimersByTime(1000);

      expect(WebSocket).toHaveBeenCalledTimes(2);
    });

    test("uses exponential backoff for reconnection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      // First close
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      vi.advanceTimersByTime(1000);
      expect(WebSocket).toHaveBeenCalledTimes(2);

      // Second close
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose();
      }

      vi.advanceTimersByTime(2000);
      expect(WebSocket).toHaveBeenCalledTimes(3);
    });

    test("falls back to polling after max reconnect attempts", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(500);

      // Simulate 5 failed connections
      for (let i = 0; i < 5; i++) {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose();
        }
        vi.advanceTimersByTime(10000);
      }

      await waitFor(() => {
        expect(screen.getByText("Polling")).toBeInTheDocument();
      });
    });
  });

  describe("Fallback Polling", () => {
    test("polls API every 5 seconds in fallback mode", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      render(<GovernanceHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(500);

      // Simulate max reconnect attempts
      for (let i = 0; i < 5; i++) {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose();
        }
        vi.advanceTimersByTime(10000);
      }

      await waitFor(() => {
        expect(screen.getByText("Polling")).toBeInTheDocument();
      });

      const initialFetchCount = mockFetch.mock.calls.length;

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialFetchCount);
      });
    });

    test("stops polling on unmount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      const { unmount } = render(<GovernanceHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument();
      });

      // Force fallback mode
      vi.advanceTimersByTime(500);
      for (let i = 0; i < 5; i++) {
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose();
        }
        vi.advanceTimersByTime(10000);
      }

      const fetchCountBeforeUnmount = mockFetch.mock.calls.length;
      unmount();

      vi.advanceTimersByTime(10000);

      // Should not have made additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(fetchCountBeforeUnmount);
    });
  });

  describe("Custom className", () => {
    test("applies custom className prop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockGovernanceState,
        }),
      });

      const { container } = render(<GovernanceHUD className="custom-class" />);

      await waitFor(() => {
        expect(container.querySelector(".custom-class")).toBeInTheDocument();
      });
    });
  });
});

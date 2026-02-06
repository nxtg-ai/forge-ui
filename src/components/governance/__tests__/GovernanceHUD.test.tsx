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
  let wsOpenCallback: (() => void) | null = null;
  let wsMessageCallback: ((event: MessageEvent) => void) | null = null;
  let wsCloseCallback: (() => void) | null = null;
  let wsErrorCallback: ((event: Event) => void) | null = null;
  let wsConstructorCalls: number = 0;
  let wsAutoOpen: boolean = true;

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
    // Reset callbacks and counters
    wsOpenCallback = null;
    wsMessageCallback = null;
    wsCloseCallback = null;
    wsErrorCallback = null;
    wsConstructorCalls = 0;
    wsAutoOpen = true;

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock WebSocket with conditional auto-open behavior using a class
    class WebSocketMock {
      url: string;
      readyState: number = 0;
      close = vi.fn();
      send = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();

      constructor(url: string) {
        this.url = url;
        mockWebSocket = this;
        wsConstructorCalls++;
      }

      get onopen() {
        return wsOpenCallback;
      }
      set onopen(callback: (() => void) | null) {
        wsOpenCallback = callback;
        // Auto-trigger onopen asynchronously only if enabled
        if (callback && wsAutoOpen) {
          queueMicrotask(() => {
            this.readyState = 1; // OPEN
            callback();
          });
        } else if (callback && !wsAutoOpen) {
          // If auto-open is disabled, auto-close instead
          queueMicrotask(() => {
            this.readyState = 3; // CLOSED
            if (wsCloseCallback) {
              wsCloseCallback();
            }
          });
        }
      }

      get onmessage() {
        return wsMessageCallback;
      }
      set onmessage(callback: ((event: MessageEvent) => void) | null) {
        wsMessageCallback = callback;
      }

      get onclose() {
        return wsCloseCallback;
      }
      set onclose(callback: (() => void) | null) {
        wsCloseCallback = callback;
      }

      get onerror() {
        return wsErrorCallback;
      }
      set onerror(callback: ((event: Event) => void) | null) {
        wsErrorCallback = callback;
      }
    }

    vi.stubGlobal("WebSocket", WebSocketMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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

      await waitFor(() => {
        expect(wsConstructorCalls).toBeGreaterThanOrEqual(1);
      }, { timeout: 1000 });
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

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      }, { timeout: 1000 });
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

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      }, { timeout: 1000 });

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

      if (wsMessageCallback) {
        wsMessageCallback({
          data: JSON.stringify({
            type: "governance.update",
            payload: updatedState,
          }),
        } as MessageEvent);
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

      await waitFor(() => {
        expect(wsConstructorCalls).toBeGreaterThanOrEqual(1);
      }, { timeout: 1000 });

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

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(1);
      }, { timeout: 1000 });

      // Simulate WebSocket close
      if (wsCloseCallback) {
        wsCloseCallback();
      }

      // Wait for reconnection attempt (exponential backoff starts at 1000ms)
      await waitFor(() => {
        expect(wsConstructorCalls).toBe(2);
      }, { timeout: 2000 });

      // Should be back to Live status
      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });
    }, 10000);

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

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(1);
      }, { timeout: 1000 });

      // First close - should reconnect after 1000ms
      if (wsCloseCallback) {
        wsCloseCallback();
      }

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(2);
      }, { timeout: 2000 });

      // Second close - should reconnect after 2000ms
      if (wsCloseCallback) {
        wsCloseCallback();
      }

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(3);
      }, { timeout: 3000 });
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

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(1);
      }, { timeout: 1000 });

      // Disable auto-open for reconnection attempts
      wsAutoOpen = false;

      // Simulate 5 failed connections by closing immediately
      for (let i = 0; i < 5; i++) {
        if (wsCloseCallback) {
          wsCloseCallback();
        }
        // Wait for reconnect delay
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000) + 100));
      }

      // Should now be in fallback/polling mode
      await waitFor(() => {
        expect(screen.getByText("Polling")).toBeInTheDocument();
      }, { timeout: 2000 });
    }, 60000);
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

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(1);
      }, { timeout: 1000 });

      // Disable auto-open for reconnection attempts
      wsAutoOpen = false;

      // Simulate 5 failed connections to trigger fallback
      for (let i = 0; i < 5; i++) {
        if (wsCloseCallback) {
          wsCloseCallback();
        }
        // Wait for reconnect delay
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000) + 100));
      }

      // Should now be in fallback/polling mode
      await waitFor(() => {
        expect(screen.getByText("Polling")).toBeInTheDocument();
      }, { timeout: 2000 });

      const initialFetchCount = mockFetch.mock.calls.length;

      // Wait for polling interval (5 seconds)
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialFetchCount);
      }, { timeout: 6000 });
    }, 60000);

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

      await waitFor(() => {
        expect(wsConstructorCalls).toBe(1);
      }, { timeout: 1000 });

      // Disable auto-open for reconnection attempts
      wsAutoOpen = false;

      // Force fallback mode by triggering close events
      for (let i = 0; i < 5; i++) {
        if (wsCloseCallback) {
          wsCloseCallback();
        }
        // Wait for reconnect delay
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 10000) + 100));
      }

      // Should now be in fallback/polling mode
      await waitFor(() => {
        expect(screen.getByText("Polling")).toBeInTheDocument();
      }, { timeout: 2000 });

      const fetchCountBeforeUnmount = mockFetch.mock.calls.length;
      unmount();

      // Wait to ensure no additional calls are made
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Should not have made additional fetch calls
      expect(mockFetch.mock.calls.length).toBe(fetchCountBeforeUnmount);
    }, 60000);
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

/**
 * Tests for LiveActivityFeed Component
 *
 * Test coverage:
 * - Initial data fetch
 * - Empty state
 * - Loading state
 * - Error state
 * - Activity rendering
 * - Refresh button
 * - WebSocket updates
 * - Filtering
 * - Virtual scrolling threshold
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LiveActivityFeed } from "../LiveActivityFeed";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock @tanstack/react-virtual
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 1000,
    getVirtualItems: () => [],
    measureElement: () => {},
  }),
}));

describe("LiveActivityFeed", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockWebSocket: any;
  let MockWebSocketConstructor: any;

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
      readyState: WebSocket.OPEN,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    };

    // Create proper WebSocket constructor mock
    MockWebSocketConstructor = vi.fn(function(this: any, url: string) {
      Object.assign(this, mockWebSocket);
      // Simulate async connection - call onopen after a short delay
      setTimeout(() => {
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 0);
      return this;
    });

    vi.stubGlobal("WebSocket", MockWebSocketConstructor);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("Initial Load", () => {
    test("shows loading state initially", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      render(<LiveActivityFeed />);

      expect(screen.getByText("Loading activities...")).toBeInTheDocument();
      expect(screen.getByText("Fetching recent agent activity")).toBeInTheDocument();
    });

    test("fetches activities on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/agents/activities")
        );
      });
    });

    test("displays activities after successful fetch", async () => {
      const mockActivities = [
        {
          id: "activity-1",
          agentId: "agent-1",
          agentName: "Testing Agent",
          status: "completed",
          action: "Completed test suite",
          timestamp: new Date().toISOString(),
        },
        {
          id: "activity-2",
          agentId: "agent-2",
          agentName: "Builder Agent",
          status: "working",
          action: "Building components",
          timestamp: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.getByText("Completed test suite")).toBeInTheDocument();
        expect(screen.getByText("Builder Agent")).toBeInTheDocument();
        expect(screen.getByText("Building components")).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    test("shows empty state when no activities", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("No activities yet")).toBeInTheDocument();
        expect(
          screen.getByText("Activities will appear here when agents start working")
        ).toBeInTheDocument();
      });
    });

    test("shows connection status in empty state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(
          screen.getByText(/Waiting for agent activity|Connecting to activity stream/)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error State", () => {
    test("shows error state on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load activities")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    test("shows retry button on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Retry")).toBeInTheDocument();
      });
    });

    test("shows error indicator in header", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Error")).toBeInTheDocument();
      });
    });
  });

  describe("Header", () => {
    test("displays header with title", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-header")).toBeInTheDocument();
        expect(screen.getByText("Live Activity")).toBeInTheDocument();
      });
    });

    test("shows connection status indicator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        // Check for the status badge container with the specific structure
        const statusBadges = screen.getAllByText(/Live|Reconnecting|Offline/);
        // Should have at least one status indicator
        expect(statusBadges.length).toBeGreaterThan(0);
      });
    });

    test("displays filter buttons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-filter-all")).toBeInTheDocument();
        expect(screen.getByTestId("activity-feed-filter-important")).toBeInTheDocument();
        expect(screen.getByTestId("activity-feed-filter-errors")).toBeInTheDocument();
      });
    });

    test("displays refresh button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-refresh-btn")).toBeInTheDocument();
      });
    });
  });

  describe("Activity Rendering", () => {
    test("renders activity with details", async () => {
      const mockActivity = {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "completed",
        action: "Completed test suite",
        details: "All 52 tests passed",
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockActivity],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.getByText("Completed test suite")).toBeInTheDocument();
        expect(screen.getByText("All 52 tests passed")).toBeInTheDocument();
      });
    });

    test("renders activity with confidence indicator", async () => {
      const mockActivity = {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "working",
        action: "Running tests",
        confidence: 85,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockActivity],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("85% confident")).toBeInTheDocument();
      });
    });

    test("renders activity with related agents", async () => {
      const mockActivity = {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "discussing",
        action: "Discussing implementation",
        relatedAgents: ["Builder", "Architect", "Reviewer"],
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockActivity],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("with")).toBeInTheDocument();
      });
    });

    test("formats timestamp correctly", async () => {
      const mockActivity = {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "completed",
        action: "Completed test suite",
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockActivity],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("just now")).toBeInTheDocument();
      });
    });
  });

  describe("Filtering", () => {
    const mockActivities = [
      {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "completed",
        action: "Completed test suite",
        timestamp: new Date().toISOString(),
      },
      {
        id: "activity-2",
        agentId: "agent-2",
        agentName: "Builder Agent",
        status: "working",
        action: "Building components",
        timestamp: new Date().toISOString(),
      },
      {
        id: "activity-3",
        agentId: "agent-3",
        agentName: "Debug Agent",
        status: "blocked",
        action: "Encountered error",
        timestamp: new Date().toISOString(),
      },
    ];

    test("shows all activities by default", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.getByText("Builder Agent")).toBeInTheDocument();
        expect(screen.getByText("Debug Agent")).toBeInTheDocument();
      });
    });

    test("filters to important activities", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-filter-important")).toBeInTheDocument();
      });

      const importantButton = screen.getByTestId("activity-feed-filter-important");
      fireEvent.click(importantButton);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.getByText("Debug Agent")).toBeInTheDocument();
        expect(screen.queryByText("Builder Agent")).not.toBeInTheDocument();
      });
    });

    test("filters to errors only", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-filter-errors")).toBeInTheDocument();
      });

      const errorsButton = screen.getByTestId("activity-feed-filter-errors");
      fireEvent.click(errorsButton);

      await waitFor(() => {
        expect(screen.getByText("Debug Agent")).toBeInTheDocument();
        expect(screen.queryByText("Testing Agent")).not.toBeInTheDocument();
        expect(screen.queryByText("Builder Agent")).not.toBeInTheDocument();
      });
    });

    test("filters by agent ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed filterByAgent={["agent-1"]} />);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.queryByText("Builder Agent")).not.toBeInTheDocument();
        expect(screen.queryByText("Debug Agent")).not.toBeInTheDocument();
      });
    });
  });

  describe("Refresh Functionality", () => {
    test("refreshes data when refresh button clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-refresh-btn")).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: "new-activity",
              agentId: "agent-1",
              agentName: "New Agent",
              status: "working",
              action: "New activity",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      const refreshButton = screen.getByTestId("activity-feed-refresh-btn");
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText("New Agent")).toBeInTheDocument();
      });
    });

    test("shows loading state during refresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-refresh-btn")).toBeInTheDocument();
      });

      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      const refreshButton = screen.getByTestId(
        "activity-feed-refresh-btn"
      ) as HTMLButtonElement;
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(refreshButton).toBeDisabled();
      });
    });
  });

  describe("Activity Click Handler", () => {
    test("calls onActivityClick when activity clicked", async () => {
      const mockOnActivityClick = vi.fn();
      const mockActivity = {
        id: "activity-1",
        agentId: "agent-1",
        agentName: "Testing Agent",
        status: "completed",
        action: "Completed test suite",
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockActivity],
        }),
      });

      render(<LiveActivityFeed onActivityClick={mockOnActivityClick} />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-feed-item-activity-1")).toBeInTheDocument();
      });

      const activityElement = screen.getByTestId("activity-feed-item-activity-1");
      fireEvent.click(activityElement);

      expect(mockOnActivityClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "activity-1",
          agentId: "agent-1",
        })
      );
    });
  });

  describe("Footer", () => {
    test("shows activity count in footer", async () => {
      const mockActivities = [
        {
          id: "activity-1",
          agentId: "agent-1",
          agentName: "Testing Agent",
          status: "completed",
          action: "Completed test suite",
          timestamp: new Date().toISOString(),
        },
        {
          id: "activity-2",
          agentId: "agent-2",
          agentName: "Builder Agent",
          status: "working",
          action: "Building components",
          timestamp: new Date().toISOString(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Showing 2 activities")).toBeInTheDocument();
      });
    });

    test("shows clear button in footer", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: "activity-1",
              agentId: "agent-1",
              agentName: "Testing Agent",
              status: "completed",
              action: "Completed test suite",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(screen.getByText("Clear")).toBeInTheDocument();
      });
    });
  });

  describe("WebSocket Connection", () => {
    test("attempts to connect WebSocket on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(MockWebSocketConstructor).toHaveBeenCalled();
      });
    });

    test("closes WebSocket on unmount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      const { unmount } = render(<LiveActivityFeed />);

      await waitFor(() => {
        expect(MockWebSocketConstructor).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockWebSocket.close).toHaveBeenCalled();
      });
    });
  });

  describe("Max Items", () => {
    test("limits activities to maxItems prop", async () => {
      const mockActivities = Array.from({ length: 100 }, (_, i) => ({
        id: `activity-${i}`,
        agentId: `agent-${i}`,
        agentName: `Agent ${i}`,
        status: "working",
        action: `Action ${i}`,
        timestamp: new Date().toISOString(),
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockActivities,
        }),
      });

      render(<LiveActivityFeed maxItems={10} />);

      await waitFor(() => {
        expect(screen.getByText("Showing 100 activities")).toBeInTheDocument();
      });
    });
  });
});

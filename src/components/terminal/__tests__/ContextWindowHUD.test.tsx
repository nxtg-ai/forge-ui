/**
 * Tests for ContextWindowHUD Component
 *
 * Test coverage:
 * - Real data fetching from /api/state
 * - Context notes rendering
 * - Session info display
 * - Token usage bar
 * - Export functionality
 * - Loading state
 * - Error handling
 * - Context event listening
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContextWindowHUD } from "../ContextWindowHUD";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("ContextWindowHUD", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Data Fetching", () => {
    test("fetches state data on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {
              sessionId: "session-123",
              startedAt: new Date().toISOString(),
              messageCount: 5,
              lastInteraction: new Date().toISOString(),
            },
            currentTasks: [],
            vision: {
              mission: "Test mission",
              principles: ["Test principle 1"],
              strategicGoals: [],
            },
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/state");
      });
    });

    test("handles fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/state");
      });

      // Component should still render, possibly with fallback data
      expect(screen.getByText("Context & Notes")).toBeInTheDocument();
    });

    test("refreshes data every 10 seconds", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    test("clears interval on unmount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      const { unmount } = render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      vi.advanceTimersByTime(10000);

      // Should not fetch after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Session Info Display", () => {
    test("displays session information", async () => {
      const sessionId = "session-abc123xyz";
      const lastInteraction = new Date();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {
              sessionId,
              startedAt: new Date().toISOString(),
              messageCount: 42,
              lastInteraction: lastInteraction.toISOString(),
            },
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("42 messages")).toBeInTheDocument();
        expect(screen.getByText(/session-abc/)).toBeInTheDocument();
      });
    });

    test("displays last active time", async () => {
      const lastInteraction = new Date();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {
              sessionId: "session-123",
              startedAt: new Date().toISOString(),
              messageCount: 10,
              lastInteraction: lastInteraction.toISOString(),
            },
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Last Active:")).toBeInTheDocument();
      });
    });
  });

  describe("Token Usage Bar", () => {
    test("displays token usage", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [
              {
                id: "task-1",
                description: "Test task",
                status: "in_progress",
              },
            ],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Token Usage")).toBeInTheDocument();
      });
    });

    test("displays token capacity percentage", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText(/% capacity/)).toBeInTheDocument();
      });
    });

    test("shows token count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText(/200,000/)).toBeInTheDocument();
      });
    });
  });

  describe("Context Notes", () => {
    test("displays context notes from vision data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {
              mission: "Build the best testing framework",
              principles: ["Write comprehensive tests", "Test behavior not implementation"],
              strategicGoals: [
                { title: "Goal 1", description: "Achieve 100% coverage" },
              ],
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Build the best testing framework")).toBeInTheDocument();
        expect(screen.getByText("Write comprehensive tests")).toBeInTheDocument();
        expect(screen.getByText("Test behavior not implementation")).toBeInTheDocument();
        expect(screen.getByText("Achieve 100% coverage")).toBeInTheDocument();
      });
    });

    test("displays no context notes message when empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      // Mock seed data endpoint to also return empty
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("No context notes available")).toBeInTheDocument();
      });
    });

    test("categorizes notes correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {
              mission: "Test mission",
              principles: ["Test principle"],
              strategicGoals: [{ title: "Goal", description: "Test goal" }],
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("CONTEXT")).toBeInTheDocument();
        expect(screen.getByText("INSTRUCTION")).toBeInTheDocument();
        expect(screen.getByText("DECISION")).toBeInTheDocument();
      });
    });

    test("displays tags on notes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {
              mission: "Test mission",
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            },
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("vision")).toBeInTheDocument();
        expect(screen.getByText("mission")).toBeInTheDocument();
      });
    });
  });

  describe("Export Functionality", () => {
    test("shows export button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Export")).toBeInTheDocument();
      });
    });

    test("displays export instructions when export clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Export")).toBeInTheDocument();
      });

      const exportButton = screen.getByText("Export");
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText("Export to Claude Code Memory")).toBeInTheDocument();
        expect(
          screen.getByText(/To persist these notes using Claude Code's native memory system:/)
        ).toBeInTheDocument();
      });
    });

    test("closes export instructions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Export")).toBeInTheDocument();
      });

      const exportButton = screen.getByText("Export");
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText("Close")).toBeInTheDocument();
      });

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Export to Claude Code Memory")).not.toBeInTheDocument();
      });
    });
  });

  describe("Files Section", () => {
    test("displays files when currentTasks present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [
              {
                id: "task-1",
                description: "Implementing feature X",
                status: "in_progress",
              },
              {
                id: "task-2",
                description: "Writing tests for Y",
                status: "completed",
              },
            ],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByTestId("context-window-files-section")).toBeInTheDocument();
        expect(screen.getByText("Implementing feature X")).toBeInTheDocument();
        expect(screen.getByText("Writing tests for Y")).toBeInTheDocument();
      });
    });

    test("shows file status icons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [
              {
                id: "task-1",
                description: "Task 1",
                status: "completed",
              },
              {
                id: "task-2",
                description: "Task 2",
                status: "in_progress",
              },
            ],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        const section = screen.getByTestId("context-window-files-section");
        expect(section.querySelectorAll("svg").length).toBeGreaterThan(0);
      });
    });

    test("displays footer stats with file counts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [
              { id: "1", description: "Task 1", status: "reading" },
              { id: "2", description: "Task 2", status: "analyzing" },
              { id: "3", description: "Task 3", status: "completed" },
            ],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Reading")).toBeInTheDocument();
        expect(screen.getByText("Analyzing")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });
  });

  describe("Fallback to Seed Data", () => {
    test("loads seed data when no vision data present", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              conversationContext: {},
              currentTasks: [],
              vision: {},
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            items: [
              {
                id: "seed-1",
                content: "Seed note 1",
                category: "instruction",
                tags: ["test"],
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
              },
            ],
          }),
        });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/memory/seed");
      });

      await waitFor(() => {
        expect(screen.getByText("Seed note 1")).toBeInTheDocument();
      });
    });
  });

  describe("Context Event Listening", () => {
    test("listens for context-window-update events", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Context & Notes")).toBeInTheDocument();
      });

      // Simulate custom event
      const event = new CustomEvent("context-window-update", {
        detail: {
          files: [
            {
              path: "/test/file.ts",
              tokens: 1500,
              status: "reading",
              lastAccessed: new Date(),
            },
          ],
          totalTokens: 1500,
          maxTokens: 200000,
          currentThought: "Analyzing test file",
        },
      });

      window.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByText("/test/file.ts")).toBeInTheDocument();
        expect(screen.getByText("Analyzing test file")).toBeInTheDocument();
      });
    });

    test("removes event listener on unmount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = render(<ContextWindowHUD />);

      await waitFor(() => {
        expect(screen.getByText("Context & Notes")).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "context-window-update",
        expect.any(Function)
      );
    });
  });

  describe("Custom className", () => {
    test("applies custom className prop", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            conversationContext: {},
            currentTasks: [],
            vision: {},
          },
        }),
      });

      const { container } = render(<ContextWindowHUD className="custom-class" />);

      await waitFor(() => {
        expect(container.querySelector(".custom-class")).toBeInTheDocument();
      });
    });
  });
});

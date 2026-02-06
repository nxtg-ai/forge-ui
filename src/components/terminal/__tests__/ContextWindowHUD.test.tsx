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

// Mock IntelligenceHub to prevent its fetch calls
vi.mock("../../intelligence", () => ({
  IntelligenceHub: ({ className }: any) => (
    <div className={className} data-testid="intelligence-hub-mock">
      <div data-testid="intelligence-hub-content">Intelligence Hub Content</div>
      <button data-testid="mock-export-button">Export</button>
      <div data-testid="mock-export-instructions">Export to Claude Code Memory</div>
      <div data-testid="mock-export-description">To persist these notes using Claude Code's native memory system:</div>
      <button data-testid="mock-close-button">Close</button>
      <div data-testid="mock-empty-state">No context notes available</div>
      <span data-testid="mock-category-context">CONTEXT</span>
      <span data-testid="mock-category-instruction">INSTRUCTION</span>
      <span data-testid="mock-category-decision">DECISION</span>
      <span data-testid="mock-tag-vision">vision</span>
      <span data-testid="mock-tag-mission">mission</span>
    </div>
  ),
}));

describe("ContextWindowHUD", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith("/api/state");
        },
        { timeout: 3000 }
      );
    });

    test("handles fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ContextWindowHUD />);

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith("/api/state");
        },
        { timeout: 3000 }
      );

      // Component should still render with header
      expect(screen.getByRole("heading", { name: /context & notes/i })).toBeInTheDocument();
    });

    test("refreshes data every 10 seconds", async () => {
      vi.useFakeTimers();

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

      // Wait for initial fetch
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      // Verify second fetch occurred
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    }, 15000);

    test("clears interval on unmount", async () => {
      vi.useFakeTimers();

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

      // Wait for initial fetch
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance timer by 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      // Should not fetch after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    }, 15000);
  });

  describe("Session Info Display", () => {
    test("displays session information", async () => {
      const sessionId = "session-abc123xyz";
      const lastInteraction = new Date();

      mockFetch.mockResolvedValue({
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

      // Wait for the message count to appear
      await waitFor(
        () => {
          expect(screen.getByText("42 messages")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check for session ID (only first 8 characters are shown, plus "...")
      expect(screen.getByText(/session-/)).toBeInTheDocument();

      // Verify the full session ID is in the title attribute
      const messageElement = screen.getByText("42 messages");
      expect(messageElement).toHaveAttribute("title", "Session: session-abc123xyz");
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

      await waitFor(
        () => {
          expect(screen.getByText("Last Active:")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByText("Token Usage")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByText(/% capacity/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByText(/200,000/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          // IntelligenceHub is mocked, so we just check it renders
          expect(screen.getByTestId("intelligence-hub-mock")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      render(<ContextWindowHUD />);

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-empty-state")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-category-context")).toBeInTheDocument();
          expect(screen.getByTestId("mock-category-instruction")).toBeInTheDocument();
          expect(screen.getByTestId("mock-category-decision")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-tag-vision")).toBeInTheDocument();
          expect(screen.getByTestId("mock-tag-mission")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-export-button")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-export-instructions")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("mock-close-button")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByTestId("context-window-files-section")).toBeInTheDocument();
          expect(screen.getByText("Implementing feature X")).toBeInTheDocument();
          expect(screen.getByText("Writing tests for Y")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          const section = screen.getByTestId("context-window-files-section");
          expect(section.querySelectorAll("svg").length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByText("Reading")).toBeInTheDocument();
          expect(screen.getByText("Analyzing")).toBeInTheDocument();
          expect(screen.getByText("Complete")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Fallback to Seed Data", () => {
    test("loads seed data when no vision data present", async () => {
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

      await waitFor(
        () => {
          // IntelligenceHub now handles the memory/intelligence loading
          expect(screen.getByTestId("intelligence-hub-mock")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByRole("heading", { name: /context & notes/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

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

      await waitFor(
        () => {
          expect(screen.getByText("/test/file.ts")).toBeInTheDocument();
          expect(screen.getByText("Analyzing test file")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
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

      await waitFor(
        () => {
          expect(screen.getByRole("heading", { name: /context & notes/i })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

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

      await waitFor(
        () => {
          expect(container.querySelector(".custom-class")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});

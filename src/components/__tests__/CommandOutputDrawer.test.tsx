/**
 * Tests for CommandOutputDrawer Component
 *
 * Test coverage:
 * - Does not render when no entries and not executing
 * - Renders when there are entries
 * - Shows running state when isRunning is true
 * - Shows success/failure badges
 * - Shows command output in pre element
 * - Shows history sidebar when multiple entries
 * - Copy button copies to clipboard
 * - Dismiss button collapses drawer
 * - Height controls (expand/collapse)
 * - History navigation
 * - Keyboard shortcuts
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandOutputDrawer } from "../CommandOutputDrawer";
import type { UseCommandOutputReturn } from "../../hooks/useCommandOutput";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, onDoubleClick, ...props }: any) => (
      <div
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={className}
        {...props}
      >
        {children}
      </div>
    ),
    aside: ({ children, className, ...props }: any) => (
      <aside className={className} {...props}>
        {children}
      </aside>
    ),
  },
}));

// Mock SafeAnimatePresence - render children conditionally like the real AnimatePresence
vi.mock("../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => {
    // Children can be null/undefined/false when condition is false
    return <>{children}</>;
  },
}));

describe("CommandOutputDrawer", () => {
  let mockCommandOutput: UseCommandOutputReturn;

  beforeEach(() => {
    // Base mock with no entries
    mockCommandOutput = {
      entries: [],
      activeEntry: null,
      activeEntryId: null,
      drawerHeight: "collapsed",
      isVisible: false,
      hasRunning: false,
      startCommand: vi.fn(),
      completeCommand: vi.fn(),
      appendOutput: vi.fn(),
      selectEntry: vi.fn(),
      clearHistory: vi.fn(),
      dismiss: vi.fn(),
      toggle: vi.fn(),
      cycleHeight: vi.fn(),
      setDrawerHeight: vi.fn(),
      setIsVisible: vi.fn(),
    };

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering Conditions", () => {
    test("does not render when no entries and not visible", () => {
      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByTestId("command-output-drawer")).not.toBeInTheDocument();
    });

    test("does not render when entries exist but not visible", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests passed",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.isVisible = false;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByTestId("command-output-drawer")).not.toBeInTheDocument();
    });

    test("renders when entries exist and visible", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests passed",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.activeEntryId = "cmd-1";
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByTestId("command-output-drawer")).toBeInTheDocument();
    });
  });

  describe("Status Bar Display", () => {
    test("shows command name in status bar", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-status",
          output: "Status: OK",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 500,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("frg-status")).toBeInTheDocument();
    });

    test("shows running status badge", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Running tests...",
          status: "running",
          startedAt: new Date(),
          finishedAt: null,
          duration: null,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("Running")).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /command running/i })).toBeInTheDocument();
    });

    test("shows success status badge", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests passed",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /command success/i })).toBeInTheDocument();
    });

    test("shows error status badge", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests failed",
          status: "error",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByRole("status", { name: /command failed/i })).toBeInTheDocument();
    });

    test("shows duration in status bar", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Done",
          status: "success",
          startedAt: new Date(Date.now() - 2500),
          finishedAt: new Date(),
          duration: 2500,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("2.5s")).toBeInTheDocument();
    });
  });

  describe("Output Display", () => {
    test("shows command output in pre element", () => {
      const output = "Test suite passed\n10 tests, 10 passed\nDuration: 2.3s";
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output,
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 2300,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.activeEntryId = "cmd-1";
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const outputElement = screen.getByRole("log", { name: /output from frg-test/i });
      expect(outputElement).toBeInTheDocument();
      expect(outputElement.textContent).toContain("Test suite passed");
      expect(outputElement.textContent).toContain("10 tests, 10 passed");
      expect(outputElement.textContent).toContain("Duration: 2.3s");
    });

    test("shows waiting message when running with no output", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "",
          status: "running",
          startedAt: new Date(),
          finishedAt: null,
          duration: null,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("Waiting for output...")).toBeInTheDocument();
    });

    test("shows no output message when completed with no output", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 100,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("No output produced.")).toBeInTheDocument();
    });

    test("shows metadata in output header", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests complete",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 2000,
          metadata: {
            passed: 10,
            failed: 2,
            skipped: 1,
          },
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("10 passed")).toBeInTheDocument();
      expect(screen.getByText("2 failed")).toBeInTheDocument();
      expect(screen.getByText("1 skipped")).toBeInTheDocument();
    });

    test("does not show failed count when zero", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Tests complete",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 2000,
          metadata: {
            passed: 10,
            failed: 0,
          },
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("10 passed")).toBeInTheDocument();
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  describe("History Sidebar", () => {
    test("shows history count badge when multiple entries", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "first",
          output: "Output 1",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: "cmd-2",
          command: "second",
          output: "Output 2",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: "cmd-3",
          command: "third",
          output: "Output 3",
          status: "error",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(
        screen.getByLabelText(/show command history \(3 entries\)/i)
      ).toBeInTheDocument();
    });

    test("does not show history badge when single entry", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByLabelText(/show command history/i)).not.toBeInTheDocument();
    });

    test("calls selectEntry when history item clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "first",
          output: "Output 1",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: "cmd-2",
          command: "second",
          output: "Output 2",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.activeEntryId = "cmd-1";
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      // Open history sidebar
      const historyButton = screen.getByLabelText(/show command history/i);
      fireEvent.click(historyButton);

      // Find and click second command
      const secondCommand = screen.getByText("second");
      fireEvent.click(secondCommand);

      expect(mockCommandOutput.selectEntry).toHaveBeenCalledWith("cmd-2");
    });

    test("calls clearHistory when clear button clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "first",
          output: "Output 1",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
        {
          id: "cmd-2",
          command: "second",
          output: "Output 2",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      // Open history sidebar
      const historyButton = screen.getByLabelText(/show command history/i);
      fireEvent.click(historyButton);

      // Find and click clear button
      const clearButton = screen.getByLabelText(/clear command history/i);
      fireEvent.click(clearButton);

      expect(mockCommandOutput.clearHistory).toHaveBeenCalled();
    });
  });

  describe("Copy Functionality", () => {
    test("copies output to clipboard when copy button clicked", async () => {
      const output = "Test output to copy";
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output,
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const copyButton = screen.getByLabelText(/copy output to clipboard/i);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(output);
      });
    });

    test("shows checkmark after successful copy", async () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const copyButton = screen.getByLabelText(/copy output to clipboard/i);
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/copied to clipboard/i)).toBeInTheDocument();
      });
    });

    test("does not show copy button when collapsed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "collapsed";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByLabelText(/copy output/i)).not.toBeInTheDocument();
    });
  });

  describe("Height Controls", () => {
    test("calls setDrawerHeight when expand button clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const expandButton = screen.getByLabelText(/expand panel/i);
      fireEvent.click(expandButton);

      expect(mockCommandOutput.setDrawerHeight).toHaveBeenCalledWith("expanded");
    });

    test("calls setDrawerHeight when shrink button clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "expanded";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const shrinkButton = screen.getByLabelText(/shrink panel/i);
      fireEvent.click(shrinkButton);

      expect(mockCommandOutput.setDrawerHeight).toHaveBeenCalledWith("half");
    });

    test("calls dismiss when collapse button clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const collapseButton = screen.getByLabelText(/collapse output panel/i);
      fireEvent.click(collapseButton);

      expect(mockCommandOutput.dismiss).toHaveBeenCalled();
    });

    test("calls setDrawerHeight when expand from collapsed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "collapsed";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const expandButton = screen.getByLabelText(/expand output panel/i);
      fireEvent.click(expandButton);

      expect(mockCommandOutput.setDrawerHeight).toHaveBeenCalledWith("half");
    });

    test("calls cycleHeight on double-click", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const separator = screen.getByRole("separator");
      fireEvent.doubleClick(separator);

      expect(mockCommandOutput.cycleHeight).toHaveBeenCalled();
    });
  });

  describe("Dismiss Button", () => {
    test("calls dismiss when close button clicked", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      const closeButton = screen.getByLabelText(/close output panel/i);
      fireEvent.click(closeButton);

      expect(mockCommandOutput.dismiss).toHaveBeenCalled();
    });
  });

  describe("Running Indicator", () => {
    test("shows running progress bar when command is running", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Running...",
          status: "running",
          startedAt: new Date(),
          finishedAt: null,
          duration: null,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText(/command is running/i)).toBeInTheDocument();
    });

    test("does not show running progress bar when command completed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "frg-test",
          output: "Done",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByText(/command is running/i)).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    test("calls toggle when Cmd+Backtick pressed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      fireEvent.keyDown(window, { key: "`", metaKey: true });

      expect(mockCommandOutput.toggle).toHaveBeenCalled();
    });

    test("calls toggle when Ctrl+Backtick pressed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      fireEvent.keyDown(window, { key: "`", ctrlKey: true });

      expect(mockCommandOutput.toggle).toHaveBeenCalled();
    });

    test("calls dismiss when Escape pressed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockCommandOutput.dismiss).toHaveBeenCalled();
    });

    test("does not call dismiss when Escape pressed and already collapsed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "collapsed";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(mockCommandOutput.dismiss).not.toHaveBeenCalled();
    });

    test("does not intercept keyboard shortcuts when typing in input", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;

      const { container } = render(
        <>
          <input data-testid="some-input" />
          <CommandOutputDrawer commandOutput={mockCommandOutput} />
        </>
      );

      const input = screen.getByTestId("some-input");
      fireEvent.keyDown(input, { key: "`", metaKey: true });

      expect(mockCommandOutput.toggle).not.toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    test("shows empty state when no active entry and drawer expanded", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = null;
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByText("No command output to display")).toBeInTheDocument();
      expect(screen.getByText("Run a command to see its output here")).toBeInTheDocument();
    });
  });

  describe("Content Area Visibility", () => {
    test("hides content area when collapsed", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "collapsed";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.queryByRole("log")).not.toBeInTheDocument();
    });

    test("shows content area when half height", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "half";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByRole("log")).toBeInTheDocument();
    });

    test("shows content area when expanded", () => {
      mockCommandOutput.entries = [
        {
          id: "cmd-1",
          command: "test",
          output: "Output",
          status: "success",
          startedAt: new Date(),
          finishedAt: new Date(),
          duration: 1000,
        },
      ];
      mockCommandOutput.activeEntry = mockCommandOutput.entries[0];
      mockCommandOutput.isVisible = true;
      mockCommandOutput.drawerHeight = "expanded";

      render(<CommandOutputDrawer commandOutput={mockCommandOutput} />);

      expect(screen.getByRole("log")).toBeInTheDocument();
    });
  });
});

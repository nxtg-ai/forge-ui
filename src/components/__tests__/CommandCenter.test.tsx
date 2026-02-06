/**
 * Tests for CommandCenter Component
 *
 * Test coverage:
 * - Rendering with commands
 * - Loading state
 * - Command execution
 * - Keyboard shortcuts (Cmd+K, Escape, Enter)
 * - Search/filter functionality
 * - Quick actions
 * - Modal interactions
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommandCenter } from "../CommandCenter";
import type { Command, ProjectContext } from "../CommandCenter";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
    div: ({ children, className, onClick, ...props }: any) => (
      <div onClick={onClick} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("CommandCenter", () => {
  let mockOnCommandExecute: ReturnType<typeof vi.fn>;
  let mockCommands: Command[];
  let mockProjectContext: ProjectContext;

  beforeEach(() => {
    mockOnCommandExecute = vi.fn();
    mockCommands = [
      {
        id: "frg-status",
        name: "Status Check",
        description: "View current project status",
        category: "forge",
        hotkey: "Ctrl+S",
        icon: <div>Icon</div>,
      },
      {
        id: "frg-test",
        name: "Run Tests",
        description: "Execute test suite",
        category: "test",
        icon: <div>Icon</div>,
      },
      {
        id: "git-commit",
        name: "Commit Changes",
        description: "Create git commit",
        category: "git",
        requiresConfirmation: true,
        icon: <div>Icon</div>,
      },
      {
        id: "deploy-prod",
        name: "Deploy to Production",
        description: "Deploy to production environment",
        category: "deploy",
        requiresConfirmation: true,
        icon: <div>Icon</div>,
      },
    ];
    mockProjectContext = {
      name: "NXTG-Forge",
      phase: "building",
      activeAgents: 3,
      pendingTasks: 5,
      healthScore: 85,
      lastActivity: new Date(),
    };

    // Mock window.confirm
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Rendering", () => {
    test("renders trigger button", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      expect(screen.getByTestId("command-center-trigger-btn")).toBeInTheDocument();
    });

    test("shows active agents indicator when agents > 0", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      const button = screen.getByTestId("command-center-trigger-btn");
      expect(button.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    test("renders quick actions bar", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      expect(screen.getByTestId("command-center-quick-actions")).toBeInTheDocument();
      expect(screen.getByTestId("command-center-quick-frg-status-btn")).toBeInTheDocument();
    });

    test("does not show modal initially", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      expect(screen.queryByTestId("command-center-modal")).not.toBeInTheDocument();
    });
  });

  describe("Modal Opening", () => {
    test("opens modal when trigger button clicked", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      const triggerButton = screen.getByTestId("command-center-trigger-btn");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("command-center-modal")).toBeInTheDocument();
      });
    });

    test("opens modal with Cmd+K keyboard shortcut", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-modal")).toBeInTheDocument();
      });
    });

    test("opens modal with Ctrl+K keyboard shortcut", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Content", () => {
    test("displays search input", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-search-input")).toBeInTheDocument();
      });
    });

    test("displays project context", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByText("NXTG-Forge")).toBeInTheDocument();
        expect(screen.getByText("building")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("85% health")).toBeInTheDocument();
      });
    });

    test("displays all commands grouped by category", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-category-forge")).toBeInTheDocument();
        expect(screen.getByTestId("command-center-category-test")).toBeInTheDocument();
        expect(screen.getByTestId("command-center-category-git")).toBeInTheDocument();
        expect(screen.getByTestId("command-center-category-deploy")).toBeInTheDocument();
      });
    });

    test("displays command with hotkey", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    test("shows loading indicator when isLoadingCommands is true", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={[]}
          projectContext={mockProjectContext}
          isExecuting={false}
          isLoadingCommands={true}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByText("Loading commands...")).toBeInTheDocument();
        expect(screen.getByText("Fetching available NXTG-Forge commands")).toBeInTheDocument();
      });
    });

    test("shows executing indicator when isExecuting is true", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={true}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByText("Executing...")).toBeInTheDocument();
      });
    });

    test("disables quick action buttons when executing", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={true}
        />
      );

      const quickButton = screen.getByTestId("command-center-quick-frg-status-btn");
      expect(quickButton).toBeDisabled();
    });
  });

  describe("Search Functionality", () => {
    test("filters commands by name", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("command-center-search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-frg-test")).toBeInTheDocument();
        expect(screen.queryByTestId("command-center-command-frg-status")).not.toBeInTheDocument();
      });
    });

    test("filters commands by description", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("command-center-search-input");
      fireEvent.change(searchInput, { target: { value: "production" } });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-deploy-prod")).toBeInTheDocument();
        expect(screen.queryByTestId("command-center-command-frg-status")).not.toBeInTheDocument();
      });
    });

    test("shows no results message when no matches", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("command-center-search-input");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText("No commands found")).toBeInTheDocument();
        expect(screen.getByText("Try a different search term")).toBeInTheDocument();
      });
    });
  });

  describe("Command Execution", () => {
    test("executes command when clicked", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-frg-status")).toBeInTheDocument();
      });

      const commandButton = screen.getByTestId("command-center-command-frg-status");
      fireEvent.click(commandButton);

      expect(mockOnCommandExecute).toHaveBeenCalledWith("frg-status");
    });

    test("closes modal after command execution", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-frg-status")).toBeInTheDocument();
      });

      const commandButton = screen.getByTestId("command-center-command-frg-status");
      fireEvent.click(commandButton);

      await waitFor(() => {
        expect(screen.queryByTestId("command-center-modal")).not.toBeInTheDocument();
      });
    });

    test("requests confirmation for commands with requiresConfirmation", async () => {
      const mockConfirm = vi.fn(() => true);
      vi.stubGlobal("confirm", mockConfirm);

      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-git-commit")).toBeInTheDocument();
      });

      const commandButton = screen.getByTestId("command-center-command-git-commit");
      fireEvent.click(commandButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockOnCommandExecute).toHaveBeenCalledWith("git-commit");
    });

    test("does not execute if confirmation declined", async () => {
      const mockConfirm = vi.fn(() => false);
      vi.stubGlobal("confirm", mockConfirm);

      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-command-git-commit")).toBeInTheDocument();
      });

      const commandButton = screen.getByTestId("command-center-command-git-commit");
      fireEvent.click(commandButton);

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockOnCommandExecute).not.toHaveBeenCalled();
    });

    test("executes quick action", () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      const quickButton = screen.getByTestId("command-center-quick-frg-status-btn");
      fireEvent.click(quickButton);

      expect(mockOnCommandExecute).toHaveBeenCalledWith("frg-status");
    });
  });

  describe("Keyboard Shortcuts", () => {
    test("closes modal with Escape key", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-modal")).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("command-center-modal")).not.toBeInTheDocument();
      });
    });

    test("clears search query on Escape", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("command-center-search-input") as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: "test" } });

      expect(searchInput.value).toBe("test");

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(searchInput.value).toBe("");
      });
    });
  });

  describe("Modal Closing", () => {
    test("closes modal when backdrop clicked", async () => {
      render(
        <CommandCenter
          onCommandExecute={mockOnCommandExecute}
          availableCommands={mockCommands}
          projectContext={mockProjectContext}
          isExecuting={false}
        />
      );

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      await waitFor(() => {
        expect(screen.getByTestId("command-center-modal")).toBeInTheDocument();
      });

      const backdrop = screen.getByTestId("command-center-modal").previousSibling as HTMLElement;
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByTestId("command-center-modal")).not.toBeInTheDocument();
      });
    });
  });
});

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectSwitcher } from "../ProjectSwitcher";
import type { Runspace } from "../../core/runspace";

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <span data-testid={`icon-${props.name}`} {...props} />;
  return {
    ChevronDown: (props: any) => <MockIcon name="ChevronDown" {...props} />,
    Plus: (props: any) => <MockIcon name="Plus" {...props} />,
    Circle: (props: any) => <MockIcon name="Circle" {...props} />,
    CheckCircle: (props: any) => <MockIcon name="CheckCircle" {...props} />,
    FolderOpen: (props: any) => <MockIcon name="FolderOpen" {...props} />,
    Settings: (props: any) => <MockIcon name="Settings" {...props} />,
  };
});

describe("ProjectSwitcher", () => {
  const mockRunspaces: Runspace[] = [
    {
      id: "rs-1",
      name: "nxtg-forge-v3",
      displayName: "NXTG-Forge v3",
      path: "/home/user/projects/nxtg-forge/v3",
      backendType: "wsl",
      status: "active",
      createdAt: new Date("2026-01-01"),
      lastActive: new Date("2026-02-07"),
      tags: ["typescript", "react"],
      color: "#6366f1",
      icon: "🚀",
    },
    {
      id: "rs-2",
      name: "personal-website",
      displayName: "Personal Website",
      path: "/home/user/projects/website",
      backendType: "wsl",
      status: "suspended",
      createdAt: new Date("2025-12-15"),
      lastActive: new Date("2026-02-01"),
      tags: ["nextjs", "blog"],
      color: "#22c55e",
    },
    {
      id: "rs-3",
      name: "api-service",
      displayName: "API Service",
      path: "/home/user/projects/api",
      backendType: "container",
      status: "stopped",
      createdAt: new Date("2025-11-20"),
      lastActive: new Date("2026-01-15"),
      tags: ["node", "express", "postgres"],
    },
  ];

  const mockOnSwitch = vi.fn();
  const mockOnNew = vi.fn();
  const mockOnManage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener("mousedown", () => {});
  });

  describe("Trigger Button", () => {
    test("renders trigger button with current runspace", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      expect(screen.getByTestId("project-switcher-trigger")).toBeInTheDocument();
      expect(screen.getByText("NXTG-Forge v3")).toBeInTheDocument();
    });

    test("shows emoji icon when runspace has icon", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      expect(screen.getByText("🚀")).toBeInTheDocument();
    });

    test("shows folder icon when runspace has no icon", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[1]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      expect(screen.getByTestId("icon-FolderOpen")).toBeInTheDocument();
    });

    test("displays No Project when currentRunspace is null", () => {
      render(
        <ProjectSwitcher
          currentRunspace={null}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      expect(screen.getByText("No Project")).toBeInTheDocument();
    });

    test("toggles dropdown when trigger is clicked", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      const trigger = screen.getByTestId("project-switcher-trigger");

      // Initially closed
      expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();

      // Open dropdown
      fireEvent.click(trigger);
      expect(screen.getByTestId("project-switcher-dropdown")).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(trigger);
      expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Dropdown Menu", () => {
    beforeEach(() => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      // Open dropdown
      fireEvent.click(screen.getByTestId("project-switcher-trigger"));
    });

    test("renders dropdown with header", () => {
      expect(screen.getByText("Your Projects")).toBeInTheDocument();
    });

    test("displays all runspaces in list", () => {
      expect(screen.getByTestId("project-switcher-item-nxtg-forge-v3")).toBeInTheDocument();
      expect(screen.getByTestId("project-switcher-item-personal-website")).toBeInTheDocument();
      expect(screen.getByTestId("project-switcher-item-api-service")).toBeInTheDocument();
    });

    test("shows runspace paths", () => {
      expect(screen.getByText("/home/user/projects/nxtg-forge/v3")).toBeInTheDocument();
      expect(screen.getByText("/home/user/projects/website")).toBeInTheDocument();
      expect(screen.getByText("/home/user/projects/api")).toBeInTheDocument();
    });

    test("displays status labels", () => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Suspended")).toBeInTheDocument();
      expect(screen.getByText("Stopped")).toBeInTheDocument();
    });

    test("shows tags for each runspace", () => {
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("nextjs")).toBeInTheDocument();
      expect(screen.getByText("node")).toBeInTheDocument();
    });

    test("limits tags display to first 2", () => {
      const apiItem = screen.getByTestId("project-switcher-item-api-service");
      const tags = apiItem.querySelectorAll(".px-2.py-0\\.5");

      // Should show "node", "express" and "+1" (for postgres)
      expect(tags.length).toBeLessThanOrEqual(3);
    });

    test("marks current runspace with checkmark", () => {
      const activeItem = screen.getByTestId("project-switcher-item-nxtg-forge-v3");
      expect(activeItem.querySelector('[data-testid="icon-CheckCircle"]')).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("shows empty message when no runspaces", () => {
      render(
        <ProjectSwitcher
          currentRunspace={null}
          runspaces={[]}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      expect(screen.getByText("No projects yet. Create your first one!")).toBeInTheDocument();
    });
  });

  describe("Project Switching", () => {
    test("calls onSwitch when project is clicked", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const websiteItem = screen.getByTestId("project-switcher-item-personal-website");
      fireEvent.click(websiteItem);

      expect(mockOnSwitch).toHaveBeenCalledWith("rs-2");
    });

    test("closes dropdown after switching", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const websiteItem = screen.getByTestId("project-switcher-item-personal-website");
      fireEvent.click(websiteItem);

      expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Footer Actions", () => {
    beforeEach(() => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));
    });

    test("shows New Project button", () => {
      expect(screen.getByTestId("project-switcher-new-btn")).toBeInTheDocument();
      expect(screen.getByText("New Project")).toBeInTheDocument();
    });

    test("shows Manage Projects button", () => {
      expect(screen.getByTestId("project-switcher-manage-btn")).toBeInTheDocument();
      expect(screen.getByText("Manage Projects")).toBeInTheDocument();
    });

    test("calls onNew when New Project is clicked", () => {
      fireEvent.click(screen.getByTestId("project-switcher-new-btn"));

      expect(mockOnNew).toHaveBeenCalled();
      expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();
    });

    test("calls onManage when Manage Projects is clicked", () => {
      fireEvent.click(screen.getByTestId("project-switcher-manage-btn"));

      expect(mockOnManage).toHaveBeenCalled();
      expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Runspace Sorting", () => {
    test("sorts active runspaces first", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[1]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const dropdown = screen.getByTestId("project-switcher-dropdown");
      const items = dropdown.querySelectorAll('[data-testid^="project-switcher-item-"]');

      // First item should be the active one (nxtg-forge-v3)
      expect(items[0]).toHaveAttribute("data-testid", "project-switcher-item-nxtg-forge-v3");
    });

    test("sorts by last active date after status", () => {
      const runspaces = [
        { ...mockRunspaces[1], lastActive: new Date("2026-02-05") },
        { ...mockRunspaces[2], lastActive: new Date("2026-02-06") },
      ];

      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={runspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const dropdown = screen.getByTestId("project-switcher-dropdown");
      const items = dropdown.querySelectorAll('[data-testid^="project-switcher-item-"]');

      // api-service has more recent lastActive, should come first among stopped/suspended
      expect(items[0]).toHaveAttribute("data-testid", "project-switcher-item-api-service");
    });
  });

  describe("Status Colors", () => {
    test("displays active status with green color", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const activeItem = screen.getByTestId("project-switcher-item-nxtg-forge-v3");
      const statusBadge = activeItem.querySelector(".bg-green-500\\/10");
      expect(statusBadge).toBeInTheDocument();
    });

    test("displays suspended status with yellow color", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const suspendedItem = screen.getByTestId("project-switcher-item-personal-website");
      const statusBadge = suspendedItem.querySelector(".bg-yellow-500\\/10");
      expect(statusBadge).toBeInTheDocument();
    });

    test("displays stopped status with gray color", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const stoppedItem = screen.getByTestId("project-switcher-item-api-service");
      const statusBadge = stoppedItem.querySelector(".bg-gray-500\\/10");
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe("Click Outside to Close", () => {
    test("closes dropdown when clicking outside", async () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      // Open dropdown
      fireEvent.click(screen.getByTestId("project-switcher-trigger"));
      expect(screen.getByTestId("project-switcher-dropdown")).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByTestId("project-switcher-dropdown")).not.toBeInTheDocument();
      });
    });

    test("does not close dropdown when clicking inside", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const dropdown = screen.getByTestId("project-switcher-dropdown");
      fireEvent.mouseDown(dropdown);

      expect(screen.getByTestId("project-switcher-dropdown")).toBeInTheDocument();
    });
  });

  describe("Visual Elements", () => {
    test("shows truncated text for long names", () => {
      const longNameRunspace = {
        ...mockRunspaces[0],
        displayName: "This is a very long project name that should be truncated",
      };

      render(
        <ProjectSwitcher
          currentRunspace={longNameRunspace}
          runspaces={[longNameRunspace]}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      const trigger = screen.getByTestId("project-switcher-trigger");
      const nameSpan = trigger.querySelector(".truncate");
      expect(nameSpan).toBeInTheDocument();
    });

    test("rotates chevron icon when dropdown is open", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      const trigger = screen.getByTestId("project-switcher-trigger");

      // Initially not rotated
      expect(trigger.querySelector(".rotate-180")).not.toBeInTheDocument();

      // Open - should rotate
      fireEvent.click(trigger);
      expect(trigger.querySelector(".rotate-180")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles runspace with no tags", () => {
      const noTagsRunspace = { ...mockRunspaces[0], tags: [] };

      render(
        <ProjectSwitcher
          currentRunspace={noTagsRunspace}
          runspaces={[noTagsRunspace]}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const item = screen.getByTestId("project-switcher-item-nxtg-forge-v3");
      expect(item).toBeInTheDocument();
    });

    test("handles single runspace", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={[mockRunspaces[0]]}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const items = screen.getAllByTestId(/project-switcher-item-/);
      expect(items.length).toBe(1);
    });

    test("handles switching to same project", () => {
      render(
        <ProjectSwitcher
          currentRunspace={mockRunspaces[0]}
          runspaces={mockRunspaces}
          onSwitch={mockOnSwitch}
          onNew={mockOnNew}
          onManage={mockOnManage}
        />,
      );

      fireEvent.click(screen.getByTestId("project-switcher-trigger"));

      const currentItem = screen.getByTestId("project-switcher-item-nxtg-forge-v3");
      fireEvent.click(currentItem);

      expect(mockOnSwitch).toHaveBeenCalledWith("rs-1");
    });
  });
});

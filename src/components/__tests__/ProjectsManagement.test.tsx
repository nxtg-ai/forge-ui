import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectsManagement } from "../ProjectsManagement";
import type { Runspace } from "../../core/runspace";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, layout, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <span data-testid={`icon-${props.name}`} {...props} />;
  return {
    FolderOpen: (props: any) => <MockIcon name="FolderOpen" {...props} />,
    X: (props: any) => <MockIcon name="X" {...props} />,
    Play: (props: any) => <MockIcon name="Play" {...props} />,
    Pause: (props: any) => <MockIcon name="Pause" {...props} />,
    Trash2: (props: any) => <MockIcon name="Trash2" {...props} />,
    Edit: (props: any) => <MockIcon name="Edit" {...props} />,
    Plus: (props: any) => <MockIcon name="Plus" {...props} />,
    Activity: (props: any) => <MockIcon name="Activity" {...props} />,
    Clock: (props: any) => <MockIcon name="Clock" {...props} />,
    HardDrive: (props: any) => <MockIcon name="HardDrive" {...props} />,
    RefreshCw: (props: any) => <MockIcon name="RefreshCw" {...props} />,
  };
});

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../feedback/ToastSystem", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe("ProjectsManagement", () => {
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
      tags: ["node", "express", "postgres", "docker"],
    },
  ];

  const mockOnClose = vi.fn();
  const mockOnRefresh = vi.fn();
  const mockOnSwitch = vi.fn();
  const mockOnStart = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe("Modal Visibility", () => {
    test("renders nothing when isOpen is false", () => {
      const { container } = render(
        <ProjectsManagement
          isOpen={false}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    test("renders modal when isOpen is true", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("Manage Projects")).toBeInTheDocument();
    });
  });

  describe("Header", () => {
    beforeEach(() => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );
    });

    test("displays title and project count", () => {
      expect(screen.getByText("Manage Projects")).toBeInTheDocument();
      expect(screen.getByText("3 projects")).toBeInTheDocument();
    });

    test("shows refresh button", () => {
      expect(screen.getByTestId("icon-RefreshCw")).toBeInTheDocument();
    });

    test("shows close button", () => {
      expect(screen.getByTestId("icon-X")).toBeInTheDocument();
    });

    test("calls onRefresh when refresh button is clicked", () => {
      const refreshBtn = screen.getByTestId("icon-RefreshCw").closest("button");
      fireEvent.click(refreshBtn!);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    test("calls onClose when close button is clicked", () => {
      const closeBtn = screen.getByTestId("icon-X").closest("button");
      fireEvent.click(closeBtn!);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    test("shows empty state when no runspaces", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={[]}
          activeRunspaceId={null}
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("No Projects Yet")).toBeInTheDocument();
      expect(screen.getByText("Create your first project to get started")).toBeInTheDocument();
    });

    test("shows new project button in empty state", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={[]}
          activeRunspaceId={null}
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("New Project")).toBeInTheDocument();
    });

    test("shows toast info when new project button is clicked in empty state", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={[]}
          activeRunspaceId={null}
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const newProjectBtn = screen.getByText("New Project");
      fireEvent.click(newProjectBtn);

      expect(mockToast.info).toHaveBeenCalledWith(
        expect.stringContaining("Open the Infinity Terminal"),
      );
    });
  });

  describe("Project Grid", () => {
    beforeEach(() => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );
    });

    test("displays all projects in grid", () => {
      expect(screen.getByText("NXTG-Forge v3")).toBeInTheDocument();
      expect(screen.getByText("Personal Website")).toBeInTheDocument();
      expect(screen.getByText("API Service")).toBeInTheDocument();
    });

    test("shows project paths", () => {
      expect(screen.getByText("/home/user/projects/nxtg-forge/v3")).toBeInTheDocument();
      expect(screen.getByText("/home/user/projects/website")).toBeInTheDocument();
      expect(screen.getByText("/home/user/projects/api")).toBeInTheDocument();
    });

    test("displays status indicators", () => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Suspended")).toBeInTheDocument();
      expect(screen.getByText("Stopped")).toBeInTheDocument();
    });

    test("displays project icons", () => {
      expect(screen.getByText("🚀")).toBeInTheDocument();
    });

    test("shows folder icon for projects without custom icon", () => {
      const folderIcons = screen.getAllByTestId("icon-FolderOpen");
      expect(folderIcons.length).toBeGreaterThan(0);
    });

    test("displays project tags", () => {
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("react")).toBeInTheDocument();
      expect(screen.getByText("nextjs")).toBeInTheDocument();
      expect(screen.getByText("node")).toBeInTheDocument();
    });

    test("limits tag display to 3 with overflow indicator", () => {
      // api-service has 4 tags, should show 3 + "+1"
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    test("highlights active project with border", () => {
      const activeProject = screen.getByText("NXTG-Forge v3").closest("div");
      expect(activeProject?.className).toContain("border-purple-500");
    });

    test("shows ACTIVE PROJECT badge on active runspace", () => {
      expect(screen.getByText("ACTIVE PROJECT")).toBeInTheDocument();
    });
  });

  describe("Project Actions - Start/Stop", () => {
    test("shows Start button for stopped projects", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const apiProject = screen.getByText("API Service").closest("div");
      const startBtn = apiProject?.querySelector('button:has([data-testid="icon-Play"])');
      expect(startBtn).toBeInTheDocument();
    });

    test("shows Stop button for active/suspended projects", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const activeProject = screen.getByText("NXTG-Forge v3").closest("div");
      const stopBtn = activeProject?.querySelector('button:has([data-testid="icon-Pause"])');
      expect(stopBtn).toBeInTheDocument();
    });

    test("calls onStart when Start button is clicked", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const apiProject = screen.getByText("API Service").closest("div");
      const startBtn = apiProject?.querySelector('button:has([data-testid="icon-Play"])');
      fireEvent.click(startBtn!);

      expect(mockOnStart).toHaveBeenCalledWith("rs-3");
    });

    test("calls onStop when Stop button is clicked", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const activeProject = screen.getByText("NXTG-Forge v3").closest("div");
      const stopBtn = activeProject?.querySelector('button:has([data-testid="icon-Pause"])');
      fireEvent.click(stopBtn!);

      expect(mockOnStop).toHaveBeenCalledWith("rs-1");
    });
  });

  describe("Project Actions - Delete", () => {
    test("shows delete button for all projects", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButtons = screen.getAllByTestId("icon-Trash2");
      expect(deleteButtons.length).toBe(3);
    });

    test("shows confirmation dialog before deleting", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[1].closest("button");
      fireEvent.click(deleteBtn!);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Personal Website"?',
      );
    });

    test("calls onDelete when confirmed", async () => {
      mockOnDelete.mockResolvedValue(undefined);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[1].closest("button");
      fireEvent.click(deleteBtn!);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith("rs-2");
      });
    });

    test("does not delete when confirmation is cancelled", () => {
      window.confirm = vi.fn(() => false);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[0].closest("button");
      fireEvent.click(deleteBtn!);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    test("shows success toast on successful delete", async () => {
      mockOnDelete.mockResolvedValue(undefined);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[1].closest("button");
      fireEvent.click(deleteBtn!);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith("Project deleted", {
          message: "Successfully deleted Personal Website",
          duration: 3000,
        });
      });
    });

    test("shows error toast on delete failure", async () => {
      mockOnDelete.mockRejectedValue(new Error("Delete failed"));

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[0].closest("button");
      fireEvent.click(deleteBtn!);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to delete project", {
          message: "Delete failed",
          duration: 5000,
        });
      });
    });

    test("shows Deleting... text while delete is in progress", async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockOnDelete.mockReturnValue(deletePromise);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[0].closest("button");
      fireEvent.click(deleteBtn!);

      await waitFor(() => {
        expect(screen.getByText("Deleting...")).toBeInTheDocument();
      });

      resolveDelete!();
    });

    test("disables delete button while deleting", async () => {
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockOnDelete.mockReturnValue(deletePromise);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const deleteBtn = screen.getAllByTestId("icon-Trash2")[0].closest("button")!;
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(deleteBtn).toBeDisabled();
      });

      resolveDelete!();
    });
  });

  describe("Project Selection", () => {
    test("selects project when clicked", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const project = screen.getByText("Personal Website").closest("div");
      fireEvent.click(project!);

      expect(project?.className).toContain("ring-2");
    });

  });

  describe("Footer", () => {
    test("displays project count in footer", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("3 projects total")).toBeInTheDocument();
    });

    test("uses singular form for single project", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={[mockRunspaces[0]]}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("1 project total")).toBeInTheDocument();
    });

    test("shows close button in footer", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const closeButtons = screen.getAllByText("Close");
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    test("calls onClose when footer close button is clicked", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const closeBtn = screen.getAllByText("Close")[0];
      fireEvent.click(closeBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Status Colors", () => {
    beforeEach(() => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );
    });

    test("displays green status for active projects", () => {
      const activeProject = screen.getByText("NXTG-Forge v3").closest("div");
      const statusDot = activeProject?.querySelector(".bg-green-500");
      expect(statusDot).toBeInTheDocument();
    });

    test("displays yellow status for suspended projects", () => {
      const suspendedProject = screen.getByText("Personal Website").closest("div");
      const statusDot = suspendedProject?.querySelector(".bg-yellow-500");
      expect(statusDot).toBeInTheDocument();
    });

    test("displays gray status for stopped projects", () => {
      const stoppedProject = screen.getByText("API Service").closest("div");
      const statusDot = stoppedProject?.querySelector(".bg-gray-500");
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles null activeRunspaceId", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId={null}
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.queryByText("ACTIVE PROJECT")).not.toBeInTheDocument();
    });

    test("handles project with no tags", () => {
      const noTagsRunspace = { ...mockRunspaces[0], tags: [] };

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={[noTagsRunspace]}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("NXTG-Forge v3")).toBeInTheDocument();
    });

    test("handles large number of projects", () => {
      const manyRunspaces = Array.from({ length: 20 }, (_, i) => ({
        ...mockRunspaces[0],
        id: `rs-${i}`,
        name: `project-${i}`,
        displayName: `Project ${i}`,
      }));

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={manyRunspaces}
          activeRunspaceId="rs-0"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("20 projects")).toBeInTheDocument();
      expect(screen.getByText("20 projects total")).toBeInTheDocument();
    });
  });

  describe("Action Button Event Propagation", () => {
    test("prevents event propagation when Start button is clicked", () => {
      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const apiProject = screen.getByText("API Service").closest("div");
      const startBtn = apiProject?.querySelector('button:has([data-testid="icon-Play"])');

      // Project should not be selected when action button is clicked
      fireEvent.click(startBtn!);
      expect(apiProject?.className).not.toContain("ring-2");
    });

    test("prevents event propagation when Delete button is clicked", () => {
      mockOnDelete.mockResolvedValue(undefined);

      render(
        <ProjectsManagement
          isOpen={true}
          onClose={mockOnClose}
          runspaces={mockRunspaces}
          activeRunspaceId="rs-1"
          onRefresh={mockOnRefresh}
          onSwitch={mockOnSwitch}
          onStart={mockOnStart}
          onStop={mockOnStop}
          onDelete={mockOnDelete}
        />,
      );

      const project = screen.getByText("Personal Website").closest("div");
      const deleteBtn = project?.querySelector('button:has([data-testid="icon-Trash2"])');

      fireEvent.click(deleteBtn!);
      expect(project?.className).not.toContain("ring-2");
    });
  });
});

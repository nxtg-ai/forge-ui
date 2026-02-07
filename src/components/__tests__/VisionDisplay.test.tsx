import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VisionDisplay } from "../VisionDisplay";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons - just export simple components
vi.mock("lucide-react", () => {
  const MockIcon = (props: any) => <span data-testid={`icon-${props.name}`} {...props} />;
  return {
    Target: (props: any) => <MockIcon name="Target" {...props} />,
    Sparkles: (props: any) => <MockIcon name="Sparkles" {...props} />,
    CheckCircle: (props: any) => <MockIcon name="CheckCircle" {...props} />,
    Clock: (props: any) => <MockIcon name="Clock" {...props} />,
    TrendingUp: (props: any) => <MockIcon name="TrendingUp" {...props} />,
    AlertTriangle: (props: any) => <MockIcon name="AlertTriangle" {...props} />,
    Edit3: (props: any) => <MockIcon name="Edit3" {...props} />,
    Lock: (props: any) => <MockIcon name="Lock" {...props} />,
    Unlock: (props: any) => <MockIcon name="Unlock" {...props} />,
    GitBranch: (props: any) => <MockIcon name="GitBranch" {...props} />,
    Flag: (props: any) => <MockIcon name="Flag" {...props} />,
    Compass: (props: any) => <MockIcon name="Compass" {...props} />,
    Mountain: (props: any) => <MockIcon name="Mountain" {...props} />,
    Trophy: (props: any) => <MockIcon name="Trophy" {...props} />,
    Zap: (props: any) => <MockIcon name="Zap" {...props} />,
  };
});

// Mock ProgressBar
vi.mock("../ui/ProgressBar", () => ({
  ProgressBar: ({ value, max, className, testIdPrefix = "progress-bar" }: any) => (
    <div
      className={className}
      data-testid={`${testIdPrefix}-container`}
      data-value={value}
      data-max={max}
    />
  ),
}));

describe("VisionDisplay", () => {
  const mockVision = {
    mission: "Build the next generation of developer tools",
    goals: [
      {
        id: "goal-1",
        title: "Complete Core Features",
        description: "Implement all essential functionality",
        status: "in-progress" as const,
        progress: 65,
        dependencies: ["goal-2"],
      },
      {
        id: "goal-2",
        title: "Testing Suite",
        description: "Comprehensive test coverage",
        status: "completed" as const,
        progress: 100,
        dependencies: [],
      },
      {
        id: "goal-3",
        title: "Documentation",
        description: "Write user and developer docs",
        status: "pending" as const,
        progress: 30,
        dependencies: ["goal-1"],
      },
      {
        id: "goal-4",
        title: "Blocked Task",
        description: "Something is blocking this",
        status: "blocked" as const,
        progress: 15,
        dependencies: [],
      },
    ],
    constraints: ["Must work offline", "No vendor lock-in", "Open source"],
    successMetrics: [
      {
        id: "metric-1",
        name: "Test Coverage",
        current: 85,
        target: 95,
        unit: "%",
        trend: "up" as const,
      },
      {
        id: "metric-2",
        name: "Performance",
        current: 50,
        target: 100,
        unit: "ms",
        trend: "down" as const,
      },
      {
        id: "metric-3",
        name: "Active Users",
        current: 100,
        target: 100,
        unit: "",
        trend: "stable" as const,
      },
    ],
    timeframe: "Q1 2026",
    createdAt: new Date("2026-01-01"),
    lastUpdated: new Date("2026-02-07"),
    version: 3,
  };

  const mockProgress = {
    overallProgress: 65,
    phase: "building",
    daysElapsed: 38,
    estimatedDaysRemaining: 52,
    velocity: 1.2,
    blockers: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Empty State", () => {
    test("renders empty state when vision is undefined", () => {
      render(
        <VisionDisplay
          vision={undefined as any}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-empty")).toBeInTheDocument();
      expect(screen.getByText("No Vision Defined")).toBeInTheDocument();
      expect(
        screen.getByText('Click "Update Vision" to create your canonical vision'),
      ).toBeInTheDocument();
    });

    test("renders empty state when vision is null", () => {
      render(
        <VisionDisplay
          vision={null as any}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-empty")).toBeInTheDocument();
    });
  });

  describe("Compact Mode", () => {
    test("renders compact view when compactMode is true", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          compactMode={true}
        />,
      );

      expect(screen.getByTestId("vision-display-compact-container")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-compact-mission")).toHaveTextContent(
        mockVision.mission,
      );
      expect(screen.getByTestId("vision-display-compact-progress")).toHaveTextContent(
        "65% complete • 4 goals",
      );
    });

    test("toggles show metrics in compact mode", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          compactMode={true}
        />,
      );

      const toggleBtn = screen.getByTestId("vision-display-compact-toggle-btn");
      // Initial state: compactMode=true means showMetrics=false, button says "Show Details"
      expect(toggleBtn).toHaveTextContent("Show Details");

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("Hide Details");

      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveTextContent("Show Details");
    });
  });

  describe("Full Display - Mission Section", () => {
    test("renders mission section with all metadata", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-mission-section")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-mission-title")).toHaveTextContent(
        "North Star Vision",
      );
      expect(screen.getByTestId("vision-display-mission-version")).toHaveTextContent(
        "v3",
      );
      expect(screen.getByTestId("vision-display-mission-text")).toHaveTextContent(
        mockVision.mission,
      );
    });

    test("displays timeframe, progress, and velocity", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByText(mockVision.timeframe)).toBeInTheDocument();
      expect(screen.getAllByText("65%").length).toBeGreaterThan(0);
      expect(screen.getByText("1.2x")).toBeInTheDocument();
    });

    test("shows edit button when not locked", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          isLocked={false}
        />,
      );

      expect(screen.getByTestId("vision-display-edit-btn")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-edit-btn")).toHaveTextContent(
        "Edit Vision",
      );
    });

    test("shows locked status when isLocked is true", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          isLocked={true}
        />,
      );

      expect(screen.getByTestId("vision-display-lock-status")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-lock-status")).toHaveTextContent(
        "Locked",
      );
      expect(screen.queryByTestId("vision-display-edit-btn")).not.toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    test("enters edit mode when edit button is clicked", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      fireEvent.click(screen.getByTestId("vision-display-edit-btn"));
      expect(screen.getByTestId("vision-display-mission-input")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-save-btn")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-cancel-btn")).toBeInTheDocument();
    });

    test("updates mission text in edit mode", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      fireEvent.click(screen.getByTestId("vision-display-edit-btn"));
      const input = screen.getByTestId("vision-display-mission-input") as HTMLTextAreaElement;

      fireEvent.change(input, { target: { value: "New mission statement" } });
      expect(input.value).toBe("New mission statement");
    });

    test("saves changes and calls onVisionUpdate", () => {
      const onVisionUpdate = vi.fn();
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          onVisionUpdate={onVisionUpdate}
        />,
      );

      fireEvent.click(screen.getByTestId("vision-display-edit-btn"));
      const input = screen.getByTestId("vision-display-mission-input");
      fireEvent.change(input, { target: { value: "Updated mission" } });
      fireEvent.click(screen.getByTestId("vision-display-save-btn"));

      expect(onVisionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          mission: "Updated mission",
          version: 4,
        }),
      );
    });

    test("cancels edit mode without saving", () => {
      const onVisionUpdate = vi.fn();
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
          onVisionUpdate={onVisionUpdate}
        />,
      );

      fireEvent.click(screen.getByTestId("vision-display-edit-btn"));
      const input = screen.getByTestId("vision-display-mission-input");
      fireEvent.change(input, { target: { value: "Changed text" } });
      fireEvent.click(screen.getByTestId("vision-display-cancel-btn"));

      expect(onVisionUpdate).not.toHaveBeenCalled();
      expect(screen.getByTestId("vision-display-mission-text")).toHaveTextContent(
        mockVision.mission,
      );
    });

    test("toggles edit mode text when clicking edit button", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const editBtn = screen.getByTestId("vision-display-edit-btn");
      expect(editBtn).toHaveTextContent("Edit Vision");

      fireEvent.click(editBtn);
      expect(editBtn).toHaveTextContent("Cancel Edit");
    });
  });

  describe("Goals Section", () => {
    test("renders all goals in grid", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-goals-section")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-goals-title")).toHaveTextContent(
        "Strategic Goals",
      );

      mockVision.goals.forEach((goal) => {
        expect(
          screen.getByTestId(`vision-display-goal-item-${goal.id}`),
        ).toBeInTheDocument();
      });
    });

    test("displays goal status with correct styling", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goalItem = screen.getByTestId("vision-display-goal-item-goal-1");
      expect(goalItem).toHaveTextContent("in progress");
    });

    test("shows goal progress percentage", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goal1 = screen.getByTestId("vision-display-goal-item-goal-1");
      expect(goal1).toHaveTextContent("65%");
    });

    test("displays goal dependencies count", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goal1 = screen.getByTestId("vision-display-goal-item-goal-1");
      expect(goal1).toHaveTextContent("1");
    });

    test("expands goal to show dependencies when clicked", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goalItem = screen.getByTestId("vision-display-goal-item-goal-1");
      fireEvent.click(goalItem);

      expect(screen.getByText("Dependencies")).toBeInTheDocument();
      expect(screen.getByText("goal-2")).toBeInTheDocument();
    });

    test("collapses expanded goal when clicked again", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goalItem = screen.getByTestId("vision-display-goal-item-goal-1");
      fireEvent.click(goalItem);
      expect(screen.getByText("Dependencies")).toBeInTheDocument();

      fireEvent.click(goalItem);
      expect(screen.queryByText("Dependencies")).not.toBeInTheDocument();
    });

    test("handles empty goals array", () => {
      const visionWithNoGoals = { ...mockVision, goals: [] };
      render(
        <VisionDisplay
          vision={visionWithNoGoals}
          progress={mockProgress}
        />,
      );

      const goalsGrid = screen.getByTestId("vision-display-goals-grid");
      expect(goalsGrid.children.length).toBe(0);
    });
  });

  describe("Success Metrics Section", () => {
    test("renders all metrics", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-metrics-section")).toBeInTheDocument();
      expect(screen.getByTestId("vision-display-metrics-title")).toHaveTextContent(
        "Success Metrics",
      );

      mockVision.successMetrics.forEach((metric) => {
        expect(
          screen.getByTestId(`vision-display-metric-item-${metric.id}`),
        ).toBeInTheDocument();
      });
    });

    test("displays metric values and targets", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const metric1 = screen.getByTestId("vision-display-metric-item-metric-1");
      expect(metric1).toHaveTextContent("Test Coverage");
      expect(metric1).toHaveTextContent("85%");
      expect(metric1).toHaveTextContent("Target: 95%");
    });

    test("shows trend indicators with correct colors", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const upTrend = screen.getByTestId("vision-display-metric-item-metric-1");
      expect(upTrend).toHaveTextContent("↑");

      const downTrend = screen.getByTestId("vision-display-metric-item-metric-2");
      expect(downTrend).toHaveTextContent("↓");

      const stableTrend = screen.getByTestId("vision-display-metric-item-metric-3");
      expect(stableTrend).toHaveTextContent("→");
    });

    test("handles empty metrics array", () => {
      const visionWithNoMetrics = { ...mockVision, successMetrics: [] };
      render(
        <VisionDisplay
          vision={visionWithNoMetrics}
          progress={mockProgress}
        />,
      );

      const metricsGrid = screen.getByTestId("vision-display-metrics-grid");
      expect(metricsGrid.children.length).toBe(0);
    });
  });

  describe("Constraints Section", () => {
    test("renders constraints when present", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByText("Constraints & Boundaries")).toBeInTheDocument();
      mockVision.constraints.forEach((constraint) => {
        expect(screen.getByText(constraint)).toBeInTheDocument();
      });
    });

    test("does not render constraints section when empty", () => {
      const visionWithNoConstraints = { ...mockVision, constraints: [] };
      render(
        <VisionDisplay
          vision={visionWithNoConstraints}
          progress={mockProgress}
        />,
      );

      expect(screen.queryByText("Constraints & Boundaries")).not.toBeInTheDocument();
    });

    test("handles undefined constraints", () => {
      const visionWithUndefinedConstraints = {
        ...mockVision,
        constraints: undefined as any,
      };
      render(
        <VisionDisplay
          vision={visionWithUndefinedConstraints}
          progress={mockProgress}
        />,
      );

      expect(screen.queryByText("Constraints & Boundaries")).not.toBeInTheDocument();
    });
  });

  describe("Timeline Progress", () => {
    test("renders timeline with correct calculations", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.getByText("Timeline Progress")).toBeInTheDocument();
      expect(screen.getByText("Day 38 of estimated 90")).toBeInTheDocument();
      expect(screen.getByText("Started 38 days ago")).toBeInTheDocument();
      expect(screen.getByText("52 days remaining")).toBeInTheDocument();
    });

    test("uses ProgressBar component with correct props", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const progressBars = screen.getAllByTestId("progress-bar-container");
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe("Blockers Alert", () => {
    test("shows blockers alert when blockers > 0", () => {
      const progressWithBlockers = { ...mockProgress, blockers: 3 };
      render(
        <VisionDisplay
          vision={mockVision}
          progress={progressWithBlockers}
        />,
      );

      expect(screen.getByText("3 Blockers Detected")).toBeInTheDocument();
      expect(
        screen.getByText("Your Chief of Staff is working to resolve these issues"),
      ).toBeInTheDocument();
    });

    test("uses singular form for 1 blocker", () => {
      const progressWithOneBlocker = { ...mockProgress, blockers: 1 };
      render(
        <VisionDisplay
          vision={mockVision}
          progress={progressWithOneBlocker}
        />,
      );

      expect(screen.getByText("1 Blocker Detected")).toBeInTheDocument();
    });

    test("does not show blockers alert when blockers = 0", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      expect(screen.queryByText(/Blocker/)).not.toBeInTheDocument();
    });
  });

  describe("Prop Defaults", () => {
    test("uses default values for optional props", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      // isLocked defaults to false, so edit button should be visible
      expect(screen.getByTestId("vision-display-edit-btn")).toBeInTheDocument();

      // compactMode defaults to false, so full container should be visible
      expect(screen.getByTestId("vision-display-container")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles vision with version 0", () => {
      const visionV0 = { ...mockVision, version: 0 };
      render(
        <VisionDisplay
          vision={visionV0}
          progress={mockProgress}
        />,
      );

      expect(screen.getByTestId("vision-display-mission-version")).toHaveTextContent("v0");
    });

    test("handles goals with no dependencies", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      const goalWithNoDeps = screen.getByTestId("vision-display-goal-item-goal-2");
      expect(goalWithNoDeps).not.toHaveTextContent("Dependencies");
    });

    test("handles undefined onVisionUpdate callback", () => {
      render(
        <VisionDisplay
          vision={mockVision}
          progress={mockProgress}
        />,
      );

      fireEvent.click(screen.getByTestId("vision-display-edit-btn"));
      const saveBtn = screen.getByTestId("vision-display-save-btn");

      // Should not throw when callback is undefined
      expect(() => fireEvent.click(saveBtn)).not.toThrow();
    });
  });
});

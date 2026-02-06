/**
 * Tests for ChiefOfStaffDashboard Component
 *
 * Test coverage:
 * - Rendering with project state data
 * - Phase display
 * - Health score visualization
 * - Active agents display
 * - Blockers display
 * - Activity stream
 * - Engagement mode filtering
 * - Agent detail modal
 * - Recent decisions
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChiefOfStaffDashboard } from "../ChiefOfStaffDashboard";
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  EngagementMode,
} from "../ChiefOfStaffDashboard";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>
        {children}
      </button>
    ),
  },
}));

// Mock SafeAnimatePresence
vi.mock("../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ProgressBar
vi.mock("../ui/ProgressBar", () => ({
  ProgressBar: ({ value, max, className }: any) => (
    <div className={className} data-value={value} data-max={max}>
      Progress: {value}/{max}
    </div>
  ),
}));

describe("ChiefOfStaffDashboard", () => {
  let mockVisionData: VisionData;
  let mockProjectState: ProjectState;
  let mockAgentActivity: AgentActivity[];
  let mockOnModeChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockVisionData = {
      mission: "Build a comprehensive testing framework for NXTG-Forge",
      goals: ["Achieve 100% coverage", "Write maintainable tests"],
      constraints: ["Use Vitest", "Follow testing best practices"],
      successMetrics: ["Coverage > 85%", "All tests pass"],
      timeframe: "Q1 2026",
    };

    mockProjectState = {
      phase: "building",
      progress: 65,
      blockers: [
        {
          id: "blocker-1",
          severity: "high",
          title: "Type errors in component tests",
          agent: "Testing Agent",
          needsHuman: true,
        },
        {
          id: "blocker-2",
          severity: "medium",
          title: "Mock configuration issues",
          agent: "Builder Agent",
          needsHuman: false,
        },
      ],
      recentDecisions: [
        {
          id: "decision-1",
          type: "architecture",
          title: "Use Vitest for all testing",
          madeBy: "Architect Agent",
          timestamp: new Date(),
          impact: "high",
        },
        {
          id: "decision-2",
          type: "implementation",
          title: "Mock framer-motion components",
          madeBy: "Testing Agent",
          timestamp: new Date(),
          impact: "medium",
        },
      ],
      activeAgents: [
        {
          id: "agent-1",
          name: "Testing Agent",
          role: "QA Specialist",
          status: "working",
          currentTask: "Writing component tests",
          confidence: 85,
        },
        {
          id: "agent-2",
          name: "Builder Agent",
          role: "Developer",
          status: "thinking",
          currentTask: "Implementing test fixtures",
          confidence: 70,
        },
        {
          id: "agent-3",
          name: "Review Agent",
          role: "Code Reviewer",
          status: "idle",
          currentTask: "Waiting for PRs",
          confidence: 100,
        },
      ],
      healthScore: 85,
    };

    mockAgentActivity = [
      {
        agentId: "agent-1",
        action: "Created test suite for CommandCenter",
        timestamp: new Date(),
        visibility: "engineer",
      },
      {
        agentId: "agent-2",
        action: "Fixed type errors in LiveActivityFeed tests",
        timestamp: new Date(),
        visibility: "builder",
      },
      {
        agentId: "agent-3",
        action: "Project health improved to 85%",
        timestamp: new Date(),
        visibility: "ceo",
      },
    ];

    mockOnModeChange = vi.fn();
  });

  describe("Rendering", () => {
    test("renders dashboard container", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-container")).toBeInTheDocument();
    });

    test("displays vision card with mission", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="ceo"
        />
      );

      expect(screen.getByTestId("dashboard-vision-card")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-mission-title")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-mission-text")).toBeInTheDocument();
      expect(
        screen.getByText("Build a comprehensive testing framework for NXTG-Forge")
      ).toBeInTheDocument();
    });

    test("displays timeframe for CEO mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="ceo"
        />
      );

      expect(screen.getByText("Q1 2026")).toBeInTheDocument();
      expect(screen.getByText("2 defined")).toBeInTheDocument();
      expect(screen.getByText("2 tracked")).toBeInTheDocument();
    });

    test("displays timeframe for founder mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="founder"
        />
      );

      expect(screen.getByText("Q1 2026")).toBeInTheDocument();
    });

    test("hides timeframe for engineer mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.queryByText("Q1 2026")).not.toBeInTheDocument();
    });
  });

  describe("Project Progress", () => {
    test("displays progress card", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-progress-card")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-progress-title")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-progress-value")).toBeInTheDocument();
    });

    test("displays progress percentage", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("65%")).toBeInTheDocument();
    });

    test("displays current phase", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("building")).toBeInTheDocument();
    });

    test("displays all phases", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("planning")).toBeInTheDocument();
      expect(screen.getByText("architecting")).toBeInTheDocument();
      expect(screen.getByText("building")).toBeInTheDocument();
      expect(screen.getByText("testing")).toBeInTheDocument();
      expect(screen.getByText("deploying")).toBeInTheDocument();
    });
  });

  describe("Active Agents", () => {
    test("displays active agents for non-CEO modes", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-active-agents")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-agents-title")).toBeInTheDocument();
    });

    test("hides active agents for CEO mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="ceo"
        />
      );

      expect(screen.queryByTestId("dashboard-active-agents")).not.toBeInTheDocument();
    });

    test("displays agent cards", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-agent-card-agent-1")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-agent-card-agent-2")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-agent-card-agent-3")).toBeInTheDocument();
    });

    test("displays agent name and current task", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("Testing Agent")).toBeInTheDocument();
      expect(screen.getByText("Writing component tests")).toBeInTheDocument();
    });

    test("displays agent confidence level", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("85% confident")).toBeInTheDocument();
      expect(screen.getByText("70% confident")).toBeInTheDocument();
      expect(screen.getByText("100% confident")).toBeInTheDocument();
    });

    test("opens agent detail modal on click", async () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      const agentCard = screen.getByTestId("dashboard-agent-card-agent-1");
      fireEvent.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText("Testing Agent")).toBeInTheDocument();
        expect(screen.getByText("QA Specialist")).toBeInTheDocument();
        expect(screen.getByText("Current Task")).toBeInTheDocument();
        expect(screen.getByText("Confidence Level")).toBeInTheDocument();
      });
    });
  });

  describe("Health Score", () => {
    test("displays health card", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-health-card")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-health-title")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-health-score")).toBeInTheDocument();
    });

    test("displays health score value", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    test("displays health status for optimal score", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("All systems optimal")).toBeInTheDocument();
    });

    test("displays health status for medium score", () => {
      const mediumHealthState = { ...mockProjectState, healthScore: 70 };

      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mediumHealthState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("Minor issues detected")).toBeInTheDocument();
    });

    test("displays health status for low score", () => {
      const lowHealthState = { ...mockProjectState, healthScore: 45 };

      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={lowHealthState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("Attention required")).toBeInTheDocument();
    });
  });

  describe("Blockers", () => {
    test("displays blockers card when present", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-blockers-card")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-blockers-title")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-blockers-list")).toBeInTheDocument();
    });

    test("displays blocker details", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-blocker-blocker-1")).toBeInTheDocument();
      expect(screen.getByText("Type errors in component tests")).toBeInTheDocument();
      expect(screen.getByText(/Testing Agent • high/)).toBeInTheDocument();
    });

    test("shows 'Needs input' badge for blockers requiring human intervention", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByText("Needs input")).toBeInTheDocument();
    });

    test("limits blockers to 1 for CEO mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="ceo"
        />
      );

      expect(screen.getByTestId("dashboard-blocker-blocker-1")).toBeInTheDocument();
      expect(screen.queryByTestId("dashboard-blocker-blocker-2")).not.toBeInTheDocument();
    });

    test("shows up to 3 blockers for non-CEO modes", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-blocker-blocker-1")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-blocker-blocker-2")).toBeInTheDocument();
    });

    test("hides blockers card when none present", () => {
      const noBlockersState = { ...mockProjectState, blockers: [] };

      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={noBlockersState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.queryByTestId("dashboard-blockers-card")).not.toBeInTheDocument();
    });
  });

  describe("Activity Stream", () => {
    test("displays activity stream for non-CEO modes", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.getByTestId("dashboard-activity-stream")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-activity-title")).toBeInTheDocument();
    });

    test("hides activity stream for CEO mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="ceo"
        />
      );

      expect(screen.queryByTestId("dashboard-activity-stream")).not.toBeInTheDocument();
    });

    test("filters activities by engagement mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      // Engineer should see ceo, vp, and engineer activities
      expect(screen.getByText("Created test suite for CommandCenter")).toBeInTheDocument();
      expect(screen.getByText("Project health improved to 85%")).toBeInTheDocument();
      // Builder activity should not be visible to engineer
      expect(
        screen.queryByText("Fixed type errors in LiveActivityFeed tests")
      ).not.toBeInTheDocument();
    });

    test("toggles details visibility", async () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      const toggleButton = screen.getByTestId("dashboard-toggle-details-btn");
      expect(screen.getByText("Show")).toBeInTheDocument();

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText("Hide")).toBeInTheDocument();
      });
    });
  });

  describe("Recent Decisions", () => {
    test("displays decisions for VP mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="vp"
        />
      );

      expect(screen.getByText("Recent Strategic Decisions")).toBeInTheDocument();
      expect(screen.getByText("Use Vitest for all testing")).toBeInTheDocument();
      expect(screen.getByText("Mock framer-motion components")).toBeInTheDocument();
    });

    test("displays decisions for founder mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="founder"
        />
      );

      expect(screen.getByText("Recent Strategic Decisions")).toBeInTheDocument();
    });

    test("hides decisions for engineer mode", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      expect(screen.queryByText("Recent Strategic Decisions")).not.toBeInTheDocument();
    });

    test("displays decision types and impacts", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="vp"
        />
      );

      expect(screen.getByText("architecture")).toBeInTheDocument();
      expect(screen.getByText("implementation")).toBeInTheDocument();
      expect(screen.getByText("high impact")).toBeInTheDocument();
      expect(screen.getByText("medium impact")).toBeInTheDocument();
    });

    test("displays decision maker", () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="vp"
        />
      );

      expect(screen.getByText(/by Architect Agent/)).toBeInTheDocument();
      expect(screen.getByText(/by Testing Agent/)).toBeInTheDocument();
    });
  });

  describe("Agent Detail Modal", () => {
    test("closes modal when close button clicked", async () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      const agentCard = screen.getByTestId("dashboard-agent-card-agent-1");
      fireEvent.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText("QA Specialist")).toBeInTheDocument();
      });

      const closeButton = screen.getByText("✕");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("QA Specialist")).not.toBeInTheDocument();
      });
    });

    test("closes modal when backdrop clicked", async () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      const agentCard = screen.getByTestId("dashboard-agent-card-agent-1");
      fireEvent.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText("QA Specialist")).toBeInTheDocument();
      });

      const backdrop = screen.getByText("QA Specialist").closest(".fixed");
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText("Current Task")).not.toBeInTheDocument();
      });
    });

    test("displays confidence progress bar", async () => {
      render(
        <ChiefOfStaffDashboard
          visionData={mockVisionData}
          projectState={mockProjectState}
          agentActivity={mockAgentActivity}
          onModeChange={mockOnModeChange}
          currentMode="engineer"
        />
      );

      const agentCard = screen.getByTestId("dashboard-agent-card-agent-1");
      fireEvent.click(agentCard);

      await waitFor(() => {
        const progressBar = screen.getByText(/Progress: 85\/100/);
        expect(progressBar).toBeInTheDocument();
      });
    });
  });
});

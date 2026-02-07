import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VisionCapture } from "../VisionCapture";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
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
    Sparkles: (props: any) => <MockIcon name="Sparkles" {...props} />,
    Brain: (props: any) => <MockIcon name="Brain" {...props} />,
    Target: (props: any) => <MockIcon name="Target" {...props} />,
    Zap: (props: any) => <MockIcon name="Zap" {...props} />,
    ChevronRight: (props: any) => <MockIcon name="ChevronRight" {...props} />,
    Command: (props: any) => <MockIcon name="Command" {...props} />,
  };
});

describe("VisionCapture", () => {
  const mockOnVisionSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Render", () => {
    test("renders in initial mode", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      expect(screen.getByTestId("vision-capture-container")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-mode-label")).toHaveTextContent(
        "Initializing Chief of Staff",
      );
    });

    test("renders in update mode", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="update"
        />,
      );

      expect(screen.getByTestId("vision-capture-mode-label")).toHaveTextContent(
        "Updating Vision",
      );
    });

    test("displays header with title and subtitle", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      expect(screen.getByTestId("vision-capture-title")).toHaveTextContent(
        "Define Your Vision",
      );
      expect(screen.getByTestId("vision-capture-subtitle")).toHaveTextContent(
        "Your AI Chief of Staff needs to understand your mission",
      );
    });
  });

  describe("Step Progression", () => {
    test("starts at step 0 (mission)", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "What are we building?",
      );
      expect(screen.getByTestId("vision-capture-step-subtitle")).toHaveTextContent(
        "Describe your vision in one powerful sentence",
      );
    });

    test("displays all 5 step indicators", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      expect(screen.getByTestId("vision-capture-step-mission")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-step-goals")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-step-constraints")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-step-metrics")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-step-timeframe")).toBeInTheDocument();
    });

    test("shows step indicators with correct states", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const missionIndicator = screen.getByTestId("vision-capture-step-indicator-mission");
      expect(missionIndicator).toHaveTextContent("1");
    });
  });

  describe("Mission Step (Non-Array)", () => {
    test("renders mission input field", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const input = screen.getByTestId("vision-capture-input-mission");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute(
        "placeholder",
        expect.stringContaining("A platform that eliminates developer burnout"),
      );
    });

    test("updates input value on change", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const input = screen.getByTestId("vision-capture-input-mission") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Build amazing software" } });

      expect(input.value).toBe("Build amazing software");
    });

    test("shows next button for non-array fields", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      expect(screen.getByTestId("vision-capture-next-btn")).toBeInTheDocument();
    });

    test("advances to next step when next button is clicked", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const input = screen.getByTestId("vision-capture-input-mission");
      fireEvent.change(input, { target: { value: "My mission" } });

      const nextBtn = screen.getByTestId("vision-capture-next-btn");
      fireEvent.click(nextBtn);

      // Should now be on goals step
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "Key objectives",
      );
    });
  });

  describe("Goals Step (Array Field)", () => {
    beforeEach(() => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      // Navigate to goals step
      const missionInput = screen.getByTestId("vision-capture-input-mission");
      fireEvent.change(missionInput, { target: { value: "My mission" } });
      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));
    });

    test("renders goals step input", () => {
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "Key objectives",
      );
      expect(screen.getByTestId("vision-capture-input-goals")).toBeInTheDocument();
    });

    test("adds item to list when Enter is pressed", () => {
      const input = screen.getByTestId("vision-capture-input-goals") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "First goal" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByTestId("vision-capture-list-goals")).toBeInTheDocument();
      expect(screen.getByTestId("vision-capture-item-goals-0")).toHaveTextContent(
        "First goal",
      );
      expect(input.value).toBe("");
    });

    test("adds multiple items to list", () => {
      const input = screen.getByTestId("vision-capture-input-goals") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "Goal 1" } });
      fireEvent.keyDown(input, { key: "Enter" });

      fireEvent.change(input, { target: { value: "Goal 2" } });
      fireEvent.keyDown(input, { key: "Enter" });

      fireEvent.change(input, { target: { value: "Goal 3" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByTestId("vision-capture-item-goals-0")).toHaveTextContent("Goal 1");
      expect(screen.getByTestId("vision-capture-item-goals-1")).toHaveTextContent("Goal 2");
      expect(screen.getByTestId("vision-capture-item-goals-2")).toHaveTextContent("Goal 3");
    });

    test("does not add empty items", () => {
      const input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.queryByTestId("vision-capture-list-goals")).not.toBeInTheDocument();
    });

    test("shows continue button after adding items", () => {
      const input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "Goal 1" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByTestId("vision-capture-continue-btn")).toBeInTheDocument();
    });

    test("advances to next step when continue is clicked", () => {
      const input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "Goal 1" } });
      fireEvent.keyDown(input, { key: "Enter" });

      fireEvent.click(screen.getByTestId("vision-capture-continue-btn"));

      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "Constraints & requirements",
      );
    });
  });

  describe("Constraints Step", () => {
    beforeEach(() => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      // Navigate to constraints step
      let input = screen.getByTestId("vision-capture-input-mission");
      fireEvent.change(input, { target: { value: "Mission" } });
      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "Goal" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.click(screen.getByTestId("vision-capture-continue-btn"));
    });

    test("renders constraints step", () => {
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "Constraints & requirements",
      );
    });

    test("adds constraints to list", () => {
      const input = screen.getByTestId("vision-capture-input-constraints");
      fireEvent.change(input, { target: { value: "Must be open source" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByTestId("vision-capture-item-constraints-0")).toHaveTextContent(
        "Must be open source",
      );
    });
  });

  describe("Existing Vision (Update Mode)", () => {
    const existingVision = {
      mission: "Existing mission",
      goals: ["Goal 1", "Goal 2"],
      constraints: ["Constraint 1"],
      successMetrics: ["Metric 1"],
      timeframe: "Q4 2025",
      engagementMode: "engineer" as const,
    };

    test("pre-fills form with existing vision data", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          existingVision={existingVision}
          mode="update"
        />,
      );

      // Mission step should show existing mission in input when editing
      const input = screen.getByTestId("vision-capture-input-mission") as HTMLInputElement;
      expect(input.value).toBe("");

      // But the vision state should be pre-populated
      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      // Goals should be pre-populated
      expect(screen.getByTestId("vision-capture-item-goals-0")).toHaveTextContent("Goal 1");
      expect(screen.getByTestId("vision-capture-item-goals-1")).toHaveTextContent("Goal 2");
    });
  });

  describe("Keyboard Navigation", () => {
    test("does not submit on Enter for other keys", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const input = screen.getByTestId("vision-capture-input-mission");
      fireEvent.change(input, { target: { value: "Test" } });
      fireEvent.keyDown(input, { key: "Tab" });

      // Should still be on mission step
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "What are we building?",
      );
    });

    test("submits array item only on Enter key", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      const input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "Goal" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByTestId("vision-capture-list-goals")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty string values gracefully", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const input = screen.getByTestId("vision-capture-input-mission");
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      // Should advance even with empty value
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent(
        "Key objectives",
      );
    });

    test("trims whitespace from array items", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      const input = screen.getByTestId("vision-capture-input-goals");
      fireEvent.change(input, { target: { value: "  Trimmed Goal  " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(screen.getByTestId("vision-capture-item-goals-0")).toHaveTextContent(
        "Trimmed Goal",
      );
    });

    test("handles step back navigation", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      // Go to step 2
      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));
      expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent("Key objectives");

      // Back button should exist on step 2
      const backBtn = screen.queryByTestId("vision-capture-back-btn");
      if (backBtn) {
        fireEvent.click(backBtn);
        expect(screen.getByTestId("vision-capture-step-title")).toHaveTextContent("What are we building?");
      }
    });
  });

  describe("Progress Visualization", () => {
    test("marks completed steps with checkmark", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      const missionIndicator = screen.getByTestId("vision-capture-step-indicator-mission");
      expect(missionIndicator).toHaveTextContent("✓");
    });

    test("shows current step number for active step", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      fireEvent.click(screen.getByTestId("vision-capture-next-btn"));

      const goalsIndicator = screen.getByTestId("vision-capture-step-indicator-goals");
      expect(goalsIndicator).toHaveTextContent("2");
    });

    test("shows step numbers for future steps", () => {
      render(
        <VisionCapture
          onVisionSubmit={mockOnVisionSubmit}
          mode="initial"
        />,
      );

      const constraintsIndicator = screen.getByTestId(
        "vision-capture-step-indicator-constraints",
      );
      expect(constraintsIndicator).toHaveTextContent("3");
    });
  });
});

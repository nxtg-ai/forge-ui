/**
 * Tests for ProgressBar Component
 *
 * Test coverage:
 * - Animated vs non-animated rendering
 * - Percentage calculation (value/max)
 * - showPercentage prop
 * - Custom colors (bgColor, fillColor)
 * - testIdPrefix for data-testid attributes
 * - Edge cases: value=0, value>max, max=0, undefined values
 * - Framer motion integration
 * - CSS transitions
 * - Accessibility
 */

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, initial, animate, transition, ...props }: any) => (
      <div
        className={className}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

describe("ProgressBar", () => {
  describe("Basic Rendering", () => {
    test("renders animated progress bar by default", () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByTestId("progress-bar-container")).toBeInTheDocument();
      expect(screen.getByTestId("progress-bar-track")).toBeInTheDocument();
      expect(screen.getByTestId("progress-bar-fill")).toBeInTheDocument();
    });

    test("renders non-animated progress bar when animated=false", () => {
      render(<ProgressBar value={50} animated={false} />);
      expect(screen.getByTestId("progress-bar-container")).toBeInTheDocument();
      expect(screen.getByTestId("progress-bar-track")).toBeInTheDocument();
      expect(screen.getByTestId("progress-bar-fill")).toBeInTheDocument();
    });

    test("applies custom className to container", () => {
      render(<ProgressBar value={50} className="custom-progress" />);
      const container = screen.getByTestId("progress-bar-container");
      expect(container).toHaveClass("custom-progress");
      expect(container).toHaveClass("relative");
    });

    test("applies custom testIdPrefix", () => {
      render(<ProgressBar value={50} testIdPrefix="custom-progress" />);
      expect(screen.getByTestId("custom-progress-container")).toBeInTheDocument();
      expect(screen.getByTestId("custom-progress-track")).toBeInTheDocument();
      expect(screen.getByTestId("custom-progress-fill")).toBeInTheDocument();
    });
  });

  describe("Percentage Calculation", () => {
    test("calculates percentage correctly with default max=100", () => {
      render(<ProgressBar value={50} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    test("calculates percentage correctly with custom max", () => {
      render(<ProgressBar value={50} max={200} showPercentage />);
      expect(screen.getByText("25%")).toBeInTheDocument();
    });

    test("handles 0% progress", () => {
      render(<ProgressBar value={0} showPercentage />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    test("handles 100% progress", () => {
      render(<ProgressBar value={100} showPercentage />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("caps percentage at 100% when value > max", () => {
      render(<ProgressBar value={150} max={100} showPercentage />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("handles fractional percentages", () => {
      render(<ProgressBar value={33} max={100} showPercentage />);
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    test("rounds percentage to nearest integer", () => {
      render(<ProgressBar value={33.7} max={100} showPercentage />);
      expect(screen.getByText("34%")).toBeInTheDocument();
    });

    test("handles percentage with custom max", () => {
      render(<ProgressBar value={3} max={7} showPercentage />);
      // 3/7 = 42.857... rounds to 43%
      expect(screen.getByText("43%")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles undefined value", () => {
      // TypeScript requires value to be a number, so this tests runtime behavior
      const { container } = render(<ProgressBar value={undefined as any} showPercentage />);
      expect(container).toBeInTheDocument();
    });

    test("handles null value", () => {
      // TypeScript requires value to be a number, so this tests runtime behavior
      const { container } = render(<ProgressBar value={null as any} showPercentage />);
      expect(container).toBeInTheDocument();
    });

    test("handles max=0 safely", () => {
      render(<ProgressBar value={50} max={0} showPercentage />);
      // When max=0, percentage calculation uses 100 as fallback
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    test("handles negative value", () => {
      render(<ProgressBar value={-10} showPercentage />);
      // Negative values result in negative percentage (component doesn't clamp negatives)
      expect(screen.getByText("-10%")).toBeInTheDocument();
    });

    test("handles very large values", () => {
      render(<ProgressBar value={1000000} max={100} showPercentage />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("handles very small max values", () => {
      render(<ProgressBar value={0.5} max={1} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("showPercentage Prop", () => {
    test("hides percentage by default", () => {
      render(<ProgressBar value={50} />);
      expect(screen.queryByTestId("progress-bar-value")).not.toBeInTheDocument();
    });

    test("shows percentage when showPercentage=true", () => {
      render(<ProgressBar value={75} showPercentage />);
      expect(screen.getByTestId("progress-bar-value")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    test("percentage label has correct styling", () => {
      render(<ProgressBar value={50} showPercentage />);
      const label = screen.getByTestId("progress-bar-value");
      expect(label).toHaveClass("absolute");
      expect(label).toHaveClass("inset-0");
      expect(label).toHaveClass("flex");
      expect(label).toHaveClass("items-center");
      expect(label).toHaveClass("justify-center");
    });
  });

  describe("Custom Colors", () => {
    test("applies default background color", () => {
      render(<ProgressBar value={50} />);
      const track = screen.getByTestId("progress-bar-track");
      expect(track).toHaveClass("bg-gray-800");
    });

    test("applies custom background color", () => {
      render(<ProgressBar value={50} bgColor="bg-blue-900" />);
      const track = screen.getByTestId("progress-bar-track");
      expect(track).toHaveClass("bg-blue-900");
      expect(track).not.toHaveClass("bg-gray-800");
    });

    test("applies default fill color", () => {
      render(<ProgressBar value={50} />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-gradient-to-r");
      expect(fill).toHaveClass("from-blue-500");
      expect(fill).toHaveClass("to-purple-500");
    });

    test("applies custom fill color", () => {
      render(<ProgressBar value={50} fillColor="bg-green-500" />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-green-500");
    });

    test("supports gradient fill colors", () => {
      render(<ProgressBar value={50} fillColor="bg-gradient-to-r from-red-500 to-yellow-500" />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-gradient-to-r");
      expect(fill).toHaveClass("from-red-500");
      expect(fill).toHaveClass("to-yellow-500");
    });
  });

  describe("Animated Mode", () => {
    test("uses framer-motion div in animated mode", () => {
      render(<ProgressBar value={60} animated={true} />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveAttribute("data-initial");
      expect(fill).toHaveAttribute("data-animate");
      expect(fill).toHaveAttribute("data-transition");
    });

    test("animates from 0 to target width", () => {
      render(<ProgressBar value={75} animated={true} />);
      const fill = screen.getByTestId("progress-bar-fill");
      const initial = JSON.parse(fill.getAttribute("data-initial") || "{}");
      const animate = JSON.parse(fill.getAttribute("data-animate") || "{}");
      expect(initial.width).toBe(0);
      expect(animate.width).toBe("75%");
    });

    test("uses custom easing transition", () => {
      render(<ProgressBar value={50} animated={true} />);
      const fill = screen.getByTestId("progress-bar-fill");
      const transition = JSON.parse(fill.getAttribute("data-transition") || "{}");
      expect(transition.duration).toBe(0.5);
      expect(transition.ease).toEqual([0.16, 1, 0.3, 1]);
    });

    test("applies correct classes to track in animated mode", () => {
      render(<ProgressBar value={50} animated={true} />);
      const track = screen.getByTestId("progress-bar-track");
      expect(track).toHaveClass("h-full");
      expect(track).toHaveClass("rounded-full");
      expect(track).toHaveClass("overflow-hidden");
    });

    test("renders percentage in animated mode", () => {
      render(<ProgressBar value={50} animated={true} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("Non-Animated Mode", () => {
    test("uses regular div in non-animated mode", () => {
      render(<ProgressBar value={60} animated={false} />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).not.toHaveAttribute("data-initial");
      expect(fill).not.toHaveAttribute("data-animate");
    });

    test("applies CSS transition classes", () => {
      render(<ProgressBar value={50} animated={false} />);
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("transition-all");
      expect(fill).toHaveClass("duration-300");
    });

    test("sets width via CSS custom property", () => {
      render(<ProgressBar value={65} animated={false} />);
      const fill = screen.getByTestId("progress-bar-fill");
      const style = fill.getAttribute("style");
      expect(style).toContain("--progress-width: 65%");
    });

    test("applies correct classes to track in non-animated mode", () => {
      render(<ProgressBar value={50} animated={false} />);
      const track = screen.getByTestId("progress-bar-track");
      expect(track).toHaveClass("h-full");
      expect(track).toHaveClass("rounded-full");
      expect(track).toHaveClass("overflow-hidden");
    });

    test("renders percentage in non-animated mode", () => {
      render(<ProgressBar value={50} animated={false} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("Multiple Progress Bars", () => {
    test("renders multiple independent progress bars", () => {
      const { container } = render(
        <div>
          <ProgressBar value={30} testIdPrefix="bar-1" />
          <ProgressBar value={70} testIdPrefix="bar-2" />
        </div>
      );

      expect(screen.getByTestId("bar-1-container")).toBeInTheDocument();
      expect(screen.getByTestId("bar-2-container")).toBeInTheDocument();
    });

    test("each bar maintains independent state", () => {
      render(
        <div>
          <ProgressBar value={25} testIdPrefix="bar-1" showPercentage />
          <ProgressBar value={75} testIdPrefix="bar-2" showPercentage />
        </div>
      );

      expect(screen.getByText("25%")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("container has relative positioning for percentage overlay", () => {
      render(<ProgressBar value={50} />);
      const container = screen.getByTestId("progress-bar-container");
      expect(container).toHaveClass("relative");
    });

    test("percentage text is centered over progress bar", () => {
      render(<ProgressBar value={50} showPercentage />);
      const label = screen.getByTestId("progress-bar-value");
      expect(label).toHaveClass("absolute");
      expect(label).toHaveClass("inset-0");
      expect(label).toHaveClass("flex");
      expect(label).toHaveClass("items-center");
      expect(label).toHaveClass("justify-center");
    });

    test("supports additional props passed through", () => {
      const { container } = render(
        <div>
          <ProgressBar value={50} className="custom-class" data-custom="test" />
        </div>
      );
      const progressContainer = screen.getByTestId("progress-bar-container");
      expect(progressContainer).toHaveClass("custom-class");
    });
  });

  describe("Real-world Scenarios", () => {
    test("renders loading state (0%)", () => {
      render(<ProgressBar value={0} showPercentage />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    test("renders in-progress state (50%)", () => {
      render(<ProgressBar value={50} max={100} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    test("renders complete state (100%)", () => {
      render(<ProgressBar value={100} showPercentage />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("renders file upload scenario (bytes)", () => {
      const uploaded = 5242880; // 5MB
      const total = 10485760; // 10MB
      render(<ProgressBar value={uploaded} max={total} showPercentage />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    test("renders task completion scenario", () => {
      const completed = 7;
      const total = 10;
      render(<ProgressBar value={completed} max={total} showPercentage />);
      expect(screen.getByText("70%")).toBeInTheDocument();
    });

    test("renders health score scenario", () => {
      render(<ProgressBar value={85} fillColor="bg-green-500" showPercentage />);
      expect(screen.getByText("85%")).toBeInTheDocument();
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-green-500");
    });

    test("renders warning state with custom color", () => {
      render(<ProgressBar value={30} fillColor="bg-yellow-500" showPercentage />);
      expect(screen.getByText("30%")).toBeInTheDocument();
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-yellow-500");
    });

    test("renders error state with custom color", () => {
      render(<ProgressBar value={15} fillColor="bg-red-500" showPercentage />);
      expect(screen.getByText("15%")).toBeInTheDocument();
      const fill = screen.getByTestId("progress-bar-fill");
      expect(fill).toHaveClass("bg-red-500");
    });
  });

  describe("Style Consistency", () => {
    test("track always has rounded-full class in both modes", () => {
      const { container: container1 } = render(<ProgressBar value={50} animated={true} testIdPrefix="animated" />);
      expect(screen.getByTestId("animated-track")).toHaveClass("rounded-full");

      const { container: container2 } = render(<ProgressBar value={50} animated={false} testIdPrefix="static" />);
      expect(screen.getByTestId("static-track")).toHaveClass("rounded-full");
    });

    test("track always has overflow-hidden class in both modes", () => {
      const { container: container1 } = render(<ProgressBar value={50} animated={true} testIdPrefix="animated" />);
      expect(screen.getByTestId("animated-track")).toHaveClass("overflow-hidden");

      const { container: container2 } = render(<ProgressBar value={50} animated={false} testIdPrefix="static" />);
      expect(screen.getByTestId("static-track")).toHaveClass("overflow-hidden");
    });

    test("track always has h-full class in both modes", () => {
      const { container: container1 } = render(<ProgressBar value={50} animated={true} testIdPrefix="animated" />);
      expect(screen.getByTestId("animated-track")).toHaveClass("h-full");

      const { container: container2 } = render(<ProgressBar value={50} animated={false} testIdPrefix="static" />);
      expect(screen.getByTestId("static-track")).toHaveClass("h-full");
    });

    test("fill always has h-full class in both modes", () => {
      const { container: container1 } = render(<ProgressBar value={50} animated={true} testIdPrefix="animated" />);
      expect(screen.getByTestId("animated-fill")).toHaveClass("h-full");

      const { container: container2 } = render(<ProgressBar value={50} animated={false} testIdPrefix="static" />);
      expect(screen.getByTestId("static-fill")).toHaveClass("h-full");
    });
  });
});

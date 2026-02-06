/** @vitest-environment jsdom */

/**
 * Tests for Badge Component
 *
 * Test coverage:
 * - Rendering with different variants
 * - Different sizes
 * - Interactive badges
 * - Removable badges with onRemove callback
 * - Left icon rendering
 * - Pulse animation
 * - Click handling
 * - Accessibility attributes
 */

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "../Badge";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
}));

describe("Badge", () => {
  describe("Rendering", () => {
    test("renders with default variant", () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText("Default Badge");
      expect(badge).toBeInTheDocument();
    });

    test("renders with children text", () => {
      render(<Badge>Test Content</Badge>);
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      render(<Badge className="custom-class">Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("custom-class");
    });
  });

  describe("Variants", () => {
    test("renders primary variant", () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText("Primary");
      expect(badge).toHaveClass("bg-nxtg-purple-900/20");
      expect(badge).toHaveClass("text-nxtg-purple-400");
    });

    test("renders secondary variant", () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText("Secondary");
      expect(badge).toHaveClass("bg-nxtg-blue-900/20");
      expect(badge).toHaveClass("text-nxtg-blue-400");
    });

    test("renders success variant", () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText("Success");
      expect(badge).toHaveClass("bg-nxtg-success-dark/20");
      expect(badge).toHaveClass("text-nxtg-success-light");
    });

    test("renders warning variant", () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText("Warning");
      expect(badge).toHaveClass("bg-nxtg-warning-dark/20");
      expect(badge).toHaveClass("text-nxtg-warning-light");
    });

    test("renders error variant", () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText("Error");
      expect(badge).toHaveClass("bg-nxtg-error-dark/20");
      expect(badge).toHaveClass("text-nxtg-error-light");
    });

    test("renders info variant", () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText("Info");
      expect(badge).toHaveClass("bg-nxtg-info-dark/20");
      expect(badge).toHaveClass("text-nxtg-info-light");
    });
  });

  describe("Sizes", () => {
    test("renders xs size", () => {
      render(<Badge size="xs">XS Badge</Badge>);
      const badge = screen.getByText("XS Badge");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("px-1.5");
    });

    test("renders sm size (default)", () => {
      render(<Badge size="sm">SM Badge</Badge>);
      const badge = screen.getByText("SM Badge");
      expect(badge).toHaveClass("text-sm");
      expect(badge).toHaveClass("px-2");
    });

    test("renders md size", () => {
      render(<Badge size="md">MD Badge</Badge>);
      const badge = screen.getByText("MD Badge");
      expect(badge).toHaveClass("text-base");
      expect(badge).toHaveClass("px-2.5");
    });

    test("renders lg size", () => {
      render(<Badge size="lg">LG Badge</Badge>);
      const badge = screen.getByText("LG Badge");
      expect(badge).toHaveClass("text-lg");
      expect(badge).toHaveClass("px-3");
    });
  });

  describe("Interactive", () => {
    test("applies interactive styles when interactive=true", () => {
      render(<Badge interactive>Interactive</Badge>);
      const badge = screen.getByText("Interactive");
      expect(badge).toHaveClass("cursor-pointer");
      expect(badge).toHaveClass("hover:opacity-80");
    });

    test("applies interactive styles when onClick is provided", () => {
      const onClick = vi.fn();
      render(<Badge onClick={onClick}>Clickable</Badge>);
      const badge = screen.getByText("Clickable");
      expect(badge).toHaveClass("cursor-pointer");
    });

    test("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(<Badge onClick={onClick}>Click Me</Badge>);
      const badge = screen.getByText("Click Me");
      fireEvent.click(badge);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Removable", () => {
    test("shows remove button when onRemove is provided", () => {
      const onRemove = vi.fn();
      render(<Badge onRemove={onRemove}>Removable</Badge>);
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    test("shows remove button when removable=true", () => {
      const onRemove = vi.fn();
      render(
        <Badge removable onRemove={onRemove}>
          Removable
        </Badge>
      );
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    test("calls onRemove when remove button clicked", () => {
      const onRemove = vi.fn();
      render(<Badge onRemove={onRemove}>Removable</Badge>);
      const removeButton = screen.getByRole("button", { name: "Remove" });
      fireEvent.click(removeButton);
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test("stops propagation when remove button clicked", () => {
      const onRemove = vi.fn();
      const onClick = vi.fn();
      render(
        <Badge onClick={onClick} onRemove={onRemove}>
          Removable
        </Badge>
      );
      const removeButton = screen.getByRole("button", { name: "Remove" });
      fireEvent.click(removeButton);
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    test("applies padding adjustment for removable badge", () => {
      const onRemove = vi.fn();
      render(<Badge onRemove={onRemove}>Removable</Badge>);
      const badge = screen.getByText("Removable");
      expect(badge).toHaveClass("pr-1");
    });

    test("remove button has correct aria-label", () => {
      const onRemove = vi.fn();
      render(<Badge onRemove={onRemove}>Removable</Badge>);
      const removeButton = screen.getByRole("button", { name: "Remove" });
      expect(removeButton).toHaveAttribute("aria-label", "Remove");
    });
  });

  describe("Left Icon", () => {
    test("renders left icon when provided", () => {
      const icon = <span data-testid="custom-icon">Icon</span>;
      render(<Badge leftIcon={icon}>With Icon</Badge>);
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      expect(screen.getByText("With Icon")).toBeInTheDocument();
    });

    test("applies margin to left icon", () => {
      const icon = <span data-testid="custom-icon">Icon</span>;
      const { container } = render(<Badge leftIcon={icon}>With Icon</Badge>);
      const iconWrapper = container.querySelector(".mr-1");
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe("Pulse Animation", () => {
    test("applies pulse animation when pulse=true", () => {
      render(<Badge pulse>Pulsing</Badge>);
      const badge = screen.getByText("Pulsing");
      expect(badge).toHaveClass("animate-pulse-glow");
    });

    test("does not apply pulse animation by default", () => {
      render(<Badge>Not Pulsing</Badge>);
      const badge = screen.getByText("Not Pulsing");
      expect(badge).not.toHaveClass("animate-pulse-glow");
    });
  });

  describe("Combined Props", () => {
    test("renders with multiple props combined", () => {
      const onRemove = vi.fn();
      const onClick = vi.fn();
      const icon = <span data-testid="custom-icon">Icon</span>;

      render(
        <Badge
          variant="success"
          size="lg"
          interactive
          leftIcon={icon}
          onRemove={onRemove}
          onClick={onClick}
          pulse
          className="custom-class"
        >
          Complex Badge
        </Badge>
      );

      const badge = screen.getByText("Complex Badge");
      expect(badge).toHaveClass("bg-nxtg-success-dark/20");
      expect(badge).toHaveClass("text-lg");
      expect(badge).toHaveClass("cursor-pointer");
      expect(badge).toHaveClass("animate-pulse-glow");
      expect(badge).toHaveClass("custom-class");
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    });
  });

  describe("Forwarded Ref", () => {
    test("forwards ref to underlying div element", () => {
      const ref = vi.fn();
      render(<Badge ref={ref}>Badge</Badge>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

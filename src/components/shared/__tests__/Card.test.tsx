/** @vitest-environment jsdom */

/**
 * Tests for Card Component and sub-components
 *
 * Test coverage:
 * - Card rendering with different variants
 * - Different padding sizes
 * - Hover animation
 * - Animation delay
 * - CardHeader, CardTitle, CardDescription
 * - CardContent, CardFooter
 * - Accessibility and custom props
 */

import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../Card";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, initial, animate, transition, whileHover, ...props }: any) => (
      <div
        className={className}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        data-whilehover={JSON.stringify(whileHover)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

describe("Card", () => {
  describe("Rendering", () => {
    test("renders with children", () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });

    test("applies custom className", () => {
      render(<Card className="custom-class">Content</Card>);
      const card = screen.getByText("Content");
      expect(card).toHaveClass("custom-class");
    });

    test("renders as div by default", () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });
  });

  describe("Variants", () => {
    test("renders default variant", () => {
      render(<Card variant="default">Default</Card>);
      const card = screen.getByText("Default");
      expect(card).toHaveClass("bg-surface-1");
      expect(card).toHaveClass("border-surface-4");
      expect(card).toHaveClass("shadow-elevation-1");
    });

    test("renders elevated variant", () => {
      render(<Card variant="elevated">Elevated</Card>);
      const card = screen.getByText("Elevated");
      expect(card).toHaveClass("bg-surface-2");
      expect(card).toHaveClass("shadow-elevation-2");
    });

    test("renders interactive variant", () => {
      render(<Card variant="interactive">Interactive</Card>);
      const card = screen.getByText("Interactive");
      expect(card).toHaveClass("bg-surface-1");
      expect(card).toHaveClass("hover:shadow-elevation-3");
      expect(card).toHaveClass("hover:border-nxtg-purple-800");
      expect(card).toHaveClass("cursor-pointer");
    });

    test("renders gradient variant", () => {
      render(<Card variant="gradient">Gradient</Card>);
      const card = screen.getByText("Gradient");
      expect(card).toHaveClass("bg-gradient-to-br");
      expect(card).toHaveClass("from-surface-1");
      expect(card).toHaveClass("to-surface-2");
    });

    test("renders glow variant", () => {
      render(<Card variant="glow">Glow</Card>);
      const card = screen.getByText("Glow");
      expect(card).toHaveClass("bg-surface-1");
      expect(card).toHaveClass("border-nxtg-purple-700");
      expect(card).toHaveClass("shadow-glow-purple");
    });
  });

  describe("Padding", () => {
    test("renders with no padding", () => {
      render(<Card padding="none">No Padding</Card>);
      const card = screen.getByText("No Padding");
      expect(card).not.toHaveClass("p-");
    });

    test("renders with sm padding", () => {
      render(<Card padding="sm">Small Padding</Card>);
      const card = screen.getByText("Small Padding");
      expect(card).toHaveClass("p-3");
    });

    test("renders with md padding (default)", () => {
      render(<Card padding="md">Medium Padding</Card>);
      const card = screen.getByText("Medium Padding");
      expect(card).toHaveClass("p-4");
    });

    test("renders with lg padding", () => {
      render(<Card padding="lg">Large Padding</Card>);
      const card = screen.getByText("Large Padding");
      expect(card).toHaveClass("p-6");
    });

    test("renders with xl padding", () => {
      render(<Card padding="xl">XL Padding</Card>);
      const card = screen.getByText("XL Padding");
      expect(card).toHaveClass("p-8");
    });
  });

  describe("Hover Animation", () => {
    test("renders as motion.div when hover=true", () => {
      render(<Card hover>Hover Card</Card>);
      const card = screen.getByText("Hover Card");
      expect(card).toHaveAttribute("data-initial");
      expect(card).toHaveAttribute("data-animate");
    });

    test("renders as regular div when hover=false", () => {
      render(<Card hover={false}>Static Card</Card>);
      const card = screen.getByText("Static Card");
      expect(card).not.toHaveAttribute("data-initial");
    });

    test("applies correct animation props when hover=true", () => {
      render(<Card hover>Animated</Card>);
      const card = screen.getByText("Animated");
      const initial = JSON.parse(card.getAttribute("data-initial") || "{}");
      const animate = JSON.parse(card.getAttribute("data-animate") || "{}");
      const whileHover = JSON.parse(card.getAttribute("data-whilehover") || "{}");

      expect(initial).toEqual({ opacity: 0, y: 20 });
      expect(animate).toEqual({ opacity: 1, y: 0 });
      expect(whileHover).toEqual({ y: -4 });
    });

    test("applies animation delay", () => {
      render(
        <Card hover delay={0.5}>
          Delayed
        </Card>
      );
      const card = screen.getByText("Delayed");
      const transition = JSON.parse(card.getAttribute("data-transition") || "{}");
      expect(transition.delay).toBe(0.5);
    });

    test("uses default delay of 0", () => {
      render(<Card hover>Default Delay</Card>);
      const card = screen.getByText("Default Delay");
      const transition = JSON.parse(card.getAttribute("data-transition") || "{}");
      expect(transition.delay).toBe(0);
    });
  });

  describe("Combined Props", () => {
    test("renders with multiple props combined", () => {
      render(
        <Card variant="gradient" padding="lg" hover delay={0.3} className="custom-class">
          Complex Card
        </Card>
      );
      const card = screen.getByText("Complex Card");
      expect(card).toHaveClass("bg-gradient-to-br");
      expect(card).toHaveClass("p-6");
      expect(card).toHaveClass("custom-class");
      expect(card).toHaveAttribute("data-initial");
    });
  });

  describe("Forwarded Ref", () => {
    test("forwards ref to underlying element", () => {
      const ref = vi.fn();
      render(<Card ref={ref}>Card</Card>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe("CardHeader", () => {
  test("renders with children", () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText("Header Content")).toBeInTheDocument();
  });

  test("applies default classes", () => {
    render(<CardHeader>Header</CardHeader>);
    const header = screen.getByText("Header");
    expect(header).toHaveClass("flex");
    expect(header).toHaveClass("flex-col");
    expect(header).toHaveClass("space-y-1.5");
    expect(header).toHaveClass("pb-4");
  });

  test("applies custom className", () => {
    render(<CardHeader className="custom-header">Header</CardHeader>);
    const header = screen.getByText("Header");
    expect(header).toHaveClass("custom-header");
  });

  test("forwards ref", () => {
    const ref = vi.fn();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("CardTitle", () => {
  test("renders as h3 element", () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    expect(container.querySelector("h3")).toBeInTheDocument();
  });

  test("renders with children", () => {
    render(<CardTitle>Card Title</CardTitle>);
    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  test("applies default classes", () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("text-2xl");
    expect(title).toHaveClass("font-semibold");
    expect(title).toHaveClass("text-nxtg-gray-100");
  });

  test("applies custom className", () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("custom-title");
  });

  test("forwards ref", () => {
    const ref = vi.fn();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("CardDescription", () => {
  test("renders as p element", () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    expect(container.querySelector("p")).toBeInTheDocument();
  });

  test("renders with children", () => {
    render(<CardDescription>Card Description</CardDescription>);
    expect(screen.getByText("Card Description")).toBeInTheDocument();
  });

  test("applies default classes", () => {
    render(<CardDescription>Description</CardDescription>);
    const description = screen.getByText("Description");
    expect(description).toHaveClass("text-sm");
    expect(description).toHaveClass("text-nxtg-gray-400");
  });

  test("applies custom className", () => {
    render(<CardDescription className="custom-desc">Description</CardDescription>);
    const description = screen.getByText("Description");
    expect(description).toHaveClass("custom-desc");
  });

  test("forwards ref", () => {
    const ref = vi.fn();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("CardContent", () => {
  test("renders with children", () => {
    render(<CardContent>Content Area</CardContent>);
    expect(screen.getByText("Content Area")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    render(<CardContent className="custom-content">Content</CardContent>);
    const content = screen.getByText("Content");
    expect(content).toHaveClass("custom-content");
  });

  test("forwards ref", () => {
    const ref = vi.fn();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("CardFooter", () => {
  test("renders with children", () => {
    render(<CardFooter>Footer Content</CardFooter>);
    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });

  test("applies default classes", () => {
    render(<CardFooter>Footer</CardFooter>);
    const footer = screen.getByText("Footer");
    expect(footer).toHaveClass("flex");
    expect(footer).toHaveClass("items-center");
    expect(footer).toHaveClass("pt-4");
  });

  test("applies custom className", () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>);
    const footer = screen.getByText("Footer");
    expect(footer).toHaveClass("custom-footer");
  });

  test("forwards ref", () => {
    const ref = vi.fn();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref).toHaveBeenCalled();
  });
});

describe("Card Composition", () => {
  test("renders complete card with all sub-components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(screen.getByText("Test Footer")).toBeInTheDocument();
  });
});

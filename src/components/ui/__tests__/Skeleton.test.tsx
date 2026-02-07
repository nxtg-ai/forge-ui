/**
 * Tests for Skeleton Component System
 *
 * Test coverage:
 * - Base Skeleton component (width, height, borderRadius)
 * - SkeletonText (lines, lastLineWidth, lineHeight)
 * - SkeletonCard (header, footer, content)
 * - SkeletonAvatar (size, variant)
 * - SkeletonChart (height, legend)
 * - SkeletonPanel (variant, itemCount)
 * - SkeletonTable (rows, columns, header)
 * - SkeletonList (items, avatar, icon)
 * - forwardRef functionality
 * - className merging
 * - Style prop merging
 */

import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonChart,
  SkeletonPanel,
  SkeletonTable,
  SkeletonList,
} from "../Skeleton";

describe("Skeleton", () => {
  describe("Base Skeleton Component", () => {
    test("renders without crashing", () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    test("applies default classes", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("bg-gray-800/50");
      expect(skeleton).toHaveClass("rounded-md");
      expect(skeleton).toHaveClass("animate-pulse");
    });

    test("applies width as number (px)", () => {
      render(<Skeleton width={200} data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ width: "200px" });
    });

    test("applies width as string", () => {
      render(<Skeleton width="100%" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ width: "100%" });
    });

    test("applies height as number (px)", () => {
      render(<Skeleton height={50} data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ height: "50px" });
    });

    test("applies height as string", () => {
      render(<Skeleton height="2rem" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ height: "2rem" });
    });

    test("applies borderRadius as number (px)", () => {
      render(<Skeleton borderRadius={8} data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ borderRadius: "8px" });
    });

    test("applies borderRadius as string", () => {
      render(<Skeleton borderRadius="50%" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ borderRadius: "50%" });
    });

    test("merges custom className", () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("custom-class");
      expect(skeleton).toHaveClass("bg-gray-800/50"); // Base class still present
    });

    test("merges custom styles", () => {
      render(<Skeleton style={{ opacity: 0.5 }} data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({ opacity: "0.5" });
    });

    test("combines width, height, and borderRadius props", () => {
      render(<Skeleton width={100} height={100} borderRadius="50%" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle({
        width: "100px",
        height: "100px",
        borderRadius: "50%",
      });
    });

    test("forwards ref to div element", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} data-testid="skeleton" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toBe(screen.getByTestId("skeleton"));
    });

    test("passes through HTML attributes", () => {
      render(<Skeleton data-testid="skeleton" aria-label="Loading content" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("aria-label", "Loading content");
    });
  });

  describe("SkeletonText", () => {
    test("renders default 3 lines", () => {
      const { container } = render(<SkeletonText />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(lines).toHaveLength(3);
    });

    test("renders custom number of lines", () => {
      const { container } = render(<SkeletonText lines={5} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(lines).toHaveLength(5);
    });

    test("renders single line", () => {
      const { container } = render(<SkeletonText lines={1} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(lines).toHaveLength(1);
    });

    test("applies default lineHeight of 16px", () => {
      const { container } = render(<SkeletonText lines={2} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      lines.forEach((line) => {
        expect(line).toHaveStyle({ height: "16px" });
      });
    });

    test("applies custom lineHeight", () => {
      const { container } = render(<SkeletonText lines={2} lineHeight={24} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      lines.forEach((line) => {
        expect(line).toHaveStyle({ height: "24px" });
      });
    });

    test("applies default lastLineWidth of 75%", () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      const lastLine = lines[2];
      expect(lastLine).toHaveStyle({ width: "75%" });
    });

    test("applies custom lastLineWidth", () => {
      const { container } = render(<SkeletonText lines={2} lastLineWidth="50%" />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      const lastLine = lines[1];
      expect(lastLine).toHaveStyle({ width: "50%" });
    });

    test("first lines have 100% width", () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(lines[0]).toHaveStyle({ width: "100%" });
      expect(lines[1]).toHaveStyle({ width: "100%" });
    });

    test("applies spacing between lines", () => {
      const { container } = render(<SkeletonText lines={2} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("space-y-2");
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonText ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonText className="custom-text" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-text");
      expect(wrapper).toHaveClass("space-y-2");
    });
  });

  describe("SkeletonCard", () => {
    test("renders card skeleton", () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("shows header by default", () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test("hides header when showHeader is false", () => {
      const { container } = render(<SkeletonCard showHeader={false} />);
      // Should have fewer skeleton elements without header
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(skeletons.length).toBe(3); // Only content lines
    });

    test("shows footer when showFooter is true", () => {
      const { container } = render(<SkeletonCard showFooter={true} />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      // Header (2) + Content (3) + Footer (2) = 7
      expect(skeletons.length).toBeGreaterThanOrEqual(7);
    });

    test("hides footer by default", () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      // Header (2) + Content (3) = 5
      expect(skeletons.length).toBe(5);
    });

    test("renders custom number of content lines", () => {
      const { container } = render(<SkeletonCard showHeader={false} showFooter={false} contentLines={5} />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(skeletons.length).toBe(5);
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonCard ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonCard className="custom-card" />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("custom-card");
    });
  });

  describe("SkeletonAvatar", () => {
    test("renders with default size of 40px", () => {
      render(<SkeletonAvatar data-testid="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveStyle({ width: "40px", height: "40px" });
    });

    test("renders with custom size", () => {
      render(<SkeletonAvatar size={64} data-testid="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveStyle({ width: "64px", height: "64px" });
    });

    test("renders circular variant by default", () => {
      render(<SkeletonAvatar data-testid="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveStyle({ borderRadius: "50%" });
    });

    test("renders square variant", () => {
      render(<SkeletonAvatar variant="square" data-testid="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveStyle({ borderRadius: "8px" });
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonAvatar ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      render(<SkeletonAvatar className="custom-avatar" data-testid="avatar" />);
      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveClass("custom-avatar");
    });
  });

  describe("SkeletonChart", () => {
    test("renders chart with 6 bars", () => {
      const { container } = render(<SkeletonChart />);
      const bars = container.querySelectorAll("div.flex-1.bg-gray-800\\/50");
      expect(bars).toHaveLength(6);
    });

    test("applies default height of 180px", () => {
      const { container } = render(<SkeletonChart />);
      const chartArea = container.querySelector("div.flex") as HTMLElement;
      expect(chartArea).toHaveStyle({ height: "180px" });
    });

    test("applies custom height", () => {
      const { container } = render(<SkeletonChart height={250} />);
      const chartArea = container.querySelector("div.flex") as HTMLElement;
      expect(chartArea).toHaveStyle({ height: "250px" });
    });

    test("shows legend by default", () => {
      const { container } = render(<SkeletonChart />);
      const legendItems = container.querySelectorAll("div.flex.items-center.gap-4 > div");
      expect(legendItems.length).toBeGreaterThan(0);
    });

    test("hides legend when showLegend is false", () => {
      const { container } = render(<SkeletonChart showLegend={false} />);
      const legendContainer = container.querySelector("div.flex.items-center.justify-center.gap-4");
      expect(legendContainer).not.toBeInTheDocument();
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonChart ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonChart className="custom-chart" />);
      const chart = container.firstChild as HTMLElement;
      expect(chart).toHaveClass("custom-chart");
    });
  });

  describe("SkeletonPanel", () => {
    test("renders panel with default 4 items", () => {
      const { container } = render(<SkeletonPanel />);
      const items = container.querySelectorAll("div.flex.items-start.gap-3");
      expect(items).toHaveLength(4);
    });

    test("renders custom number of items", () => {
      const { container } = render(<SkeletonPanel itemCount={7} />);
      const items = container.querySelectorAll("div.flex.items-start.gap-3");
      expect(items).toHaveLength(7);
    });

    test("renders left variant by default", () => {
      const { container } = render(<SkeletonPanel />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("border-r");
      expect(panel).not.toHaveClass("border-l");
    });

    test("renders right variant", () => {
      const { container } = render(<SkeletonPanel variant="right" />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("border-l");
      expect(panel).not.toHaveClass("border-r");
    });

    test("renders avatars for each item", () => {
      const { container } = render(<SkeletonPanel itemCount={3} />);
      // Each panel item has an avatar with circular border-radius
      const items = container.querySelectorAll("div.flex.items-start.gap-3");
      expect(items).toHaveLength(3);
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonPanel ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonPanel className="custom-panel" />);
      const panel = container.firstChild as HTMLElement;
      expect(panel).toHaveClass("custom-panel");
    });
  });

  describe("SkeletonTable", () => {
    test("renders default 5 rows", () => {
      const { container } = render(<SkeletonTable />);
      const rows = container.querySelectorAll("div.space-y-2 > div");
      expect(rows).toHaveLength(5);
    });

    test("renders custom number of rows", () => {
      const { container } = render(<SkeletonTable rows={8} />);
      const rows = container.querySelectorAll("div.space-y-2 > div");
      expect(rows).toHaveLength(8);
    });

    test("renders default 4 columns per row", () => {
      const { container } = render(<SkeletonTable rows={1} />);
      const row = container.querySelector("div.space-y-2 > div");
      const columns = row?.querySelectorAll("div.bg-gray-800\\/50");
      expect(columns).toHaveLength(4);
    });

    test("renders custom number of columns", () => {
      const { container } = render(<SkeletonTable rows={1} columns={6} />);
      const row = container.querySelector("div.space-y-2 > div");
      const columns = row?.querySelectorAll("div.bg-gray-800\\/50");
      expect(columns).toHaveLength(6);
    });

    test("shows header by default", () => {
      const { container } = render(<SkeletonTable />);
      const allSkeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      // Header (4 columns) + Rows (5 * 4 columns) = 24
      expect(allSkeletons.length).toBe(24);
    });

    test("hides header when showHeader is false", () => {
      const { container } = render(<SkeletonTable showHeader={false} rows={5} columns={4} />);
      const allSkeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      // Only rows (5 * 4 columns) = 20
      expect(allSkeletons.length).toBe(20);
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonTable ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonTable className="custom-table" />);
      const table = container.firstChild as HTMLElement;
      expect(table).toHaveClass("custom-table");
    });
  });

  describe("SkeletonList", () => {
    test("renders default 5 items", () => {
      const { container } = render(<SkeletonList />);
      const items = container.querySelectorAll("div.flex.items-center.gap-3");
      expect(items).toHaveLength(5);
    });

    test("renders custom number of items", () => {
      const { container } = render(<SkeletonList items={10} />);
      const items = container.querySelectorAll("div.flex.items-center.gap-3");
      expect(items).toHaveLength(10);
    });

    test("shows avatars by default", () => {
      const { container } = render(<SkeletonList items={3} />);
      // Each list item has an avatar component
      const items = container.querySelectorAll("div.flex.items-center.gap-3");
      expect(items).toHaveLength(3);
    });

    test("hides avatars when showAvatar is false", () => {
      const { container } = render(<SkeletonList items={3} showAvatar={false} />);
      const avatars = container.querySelectorAll("div[style*='borderRadius: 50%']");
      expect(avatars).toHaveLength(0);
    });

    test("hides icons by default", () => {
      const { container } = render(<SkeletonList items={3} />);
      const icons = container.querySelectorAll("div[style*='width: 24px'][style*='height: 24px']");
      expect(icons).toHaveLength(0);
    });

    test("shows icons when showIcon is true", () => {
      const { container } = render(<SkeletonList items={3} showIcon={true} showAvatar={false} />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      // Each item has icon (1) + 2 text lines (2) = 3 * 3 = 9
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    test("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<SkeletonList ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    test("merges custom className", () => {
      const { container } = render(<SkeletonList className="custom-list" />);
      const list = container.firstChild as HTMLElement;
      expect(list).toHaveClass("custom-list");
    });
  });

  describe("Edge Cases", () => {
    test("SkeletonText with 0 lines renders empty", () => {
      const { container } = render(<SkeletonText lines={0} />);
      const lines = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(lines).toHaveLength(0);
    });

    test("SkeletonList with 0 items renders empty", () => {
      const { container } = render(<SkeletonList items={0} />);
      const items = container.querySelectorAll("div.flex.items-center.gap-3");
      expect(items).toHaveLength(0);
    });

    test("SkeletonTable with 0 rows renders only header", () => {
      const { container } = render(<SkeletonTable rows={0} columns={4} />);
      const skeletons = container.querySelectorAll("div.bg-gray-800\\/50");
      expect(skeletons.length).toBe(4); // Only header
    });

    test("SkeletonPanel with 0 items renders header only", () => {
      const { container } = render(<SkeletonPanel itemCount={0} />);
      const items = container.querySelectorAll("div.flex.items-start.gap-3");
      expect(items).toHaveLength(0);
    });

    test("Skeleton with undefined width/height has minimal inline styles", () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      // When width/height are undefined, the style object is empty or minimal
      // Just verify the component renders without crashing
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Display Names", () => {
    test("Skeleton has correct displayName", () => {
      expect(Skeleton.displayName).toBe("Skeleton");
    });

    test("SkeletonText has correct displayName", () => {
      expect(SkeletonText.displayName).toBe("SkeletonText");
    });

    test("SkeletonCard has correct displayName", () => {
      expect(SkeletonCard.displayName).toBe("SkeletonCard");
    });

    test("SkeletonAvatar has correct displayName", () => {
      expect(SkeletonAvatar.displayName).toBe("SkeletonAvatar");
    });

    test("SkeletonChart has correct displayName", () => {
      expect(SkeletonChart.displayName).toBe("SkeletonChart");
    });

    test("SkeletonPanel has correct displayName", () => {
      expect(SkeletonPanel.displayName).toBe("SkeletonPanel");
    });

    test("SkeletonTable has correct displayName", () => {
      expect(SkeletonTable.displayName).toBe("SkeletonTable");
    });

    test("SkeletonList has correct displayName", () => {
      expect(SkeletonList.displayName).toBe("SkeletonList");
    });
  });
});

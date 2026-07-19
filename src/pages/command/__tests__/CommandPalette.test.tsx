/**
 * Tests for CommandPalette's project-context bar.
 *
 * NEXUS: DIRECTIVE-NXTG-20260718-04 items 1-2.
 *
 * The palette previously rendered six hardcoded literals (healthScore 87,
 * activeAgents 3, pendingTasks 12, …) as though they were live measurements.
 * These tests pin the two properties that replaced them:
 *   1. a metric with no real value renders an explicit unavailable state —
 *      never a plausible-looking number;
 *   2. a non-canonical (locally estimated) score is always labeled, so it
 *      cannot be mistaken for the orchestrator's canonical number.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "../CommandPalette";
import type { ProjectContext } from "../types";

// Mock framer-motion — animations are irrelevant here and jsdom cannot run them.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const UNKNOWN_CONTEXT: ProjectContext = {
  name: null,
  phase: null,
  activeAgents: null,
  pendingTasks: null,
  healthScore: null,
  healthSource: null,
  lastActivity: null,
};

const renderPalette = (
  context: ProjectContext,
  contextLoading = false,
) =>
  render(
    <CommandPalette
      isOpen
      onClose={() => {}}
      categories={[]}
      onExecute={() => {}}
      isExecuting={false}
      projectContext={context}
      contextLoading={contextLoading}
    />,
  );

describe("CommandPalette context bar", () => {
  it("renders an explicit unavailable state instead of a fabricated number", () => {
    renderPalette(UNKNOWN_CONTEXT);

    expect(screen.getByTestId("palette-health")).toHaveTextContent(
      "unavailable health",
    );
    expect(screen.getByTestId("palette-agents")).toHaveTextContent(
      "unavailable",
    );
    expect(screen.getByTestId("palette-project-name")).toHaveTextContent(
      "unavailable",
    );
    expect(screen.getByTestId("palette-phase")).toHaveTextContent("unavailable");
  });

  it("never renders the removed hardcoded values when context is unknown", () => {
    const { container } = renderPalette(UNKNOWN_CONTEXT);

    // The exact literals that used to ship: 87% health, 3 agents, 12 tasks.
    expect(container.textContent).not.toContain("87");
    expect(container.textContent).not.toContain("NXTG-Forge");
    expect(container.textContent).not.toMatch(/\d+% health/);
  });

  it("distinguishes a pending fetch from an unreachable backend", () => {
    renderPalette(UNKNOWN_CONTEXT, true);

    // Loading shows a neutral ellipsis, not "unavailable" — claiming the
    // backend is unreachable before the first fetch settles would be wrong.
    expect(screen.getByTestId("palette-health")).toHaveTextContent("… health");
    expect(screen.getByTestId("palette-health")).not.toHaveTextContent(
      "unavailable",
    );
  });

  it("renders a real score without an estimate label when canonical", () => {
    renderPalette({
      ...UNKNOWN_CONTEXT,
      name: "forge-ui",
      healthScore: 82,
      healthSource: "orchestrator",
    });

    expect(screen.getByTestId("palette-health")).toHaveTextContent("82% health");
    expect(
      screen.queryByTestId("palette-health-estimate-label"),
    ).not.toBeInTheDocument();
  });

  it("labels a locally estimated score so it is not mistaken for canonical", () => {
    renderPalette({
      ...UNKNOWN_CONTEXT,
      name: "forge-ui",
      healthScore: 82,
      healthSource: "estimate",
    });

    expect(screen.getByTestId("palette-health")).toHaveTextContent("82% health");
    expect(
      screen.getByTestId("palette-health-estimate-label"),
    ).toHaveTextContent("estimate");
  });

  it("renders live values when the context is fully populated", () => {
    renderPalette({
      name: "forge-ui",
      phase: "building",
      activeAgents: 4,
      pendingTasks: 7,
      healthScore: 91,
      healthSource: "orchestrator",
      lastActivity: new Date("2026-07-18T00:00:00Z"),
    });

    expect(screen.getByTestId("palette-project-name")).toHaveTextContent(
      "forge-ui",
    );
    expect(screen.getByTestId("palette-phase")).toHaveTextContent("building");
    expect(screen.getByTestId("palette-agents")).toHaveTextContent("4");
    expect(screen.getByTestId("palette-health")).toHaveTextContent("91% health");
  });
});

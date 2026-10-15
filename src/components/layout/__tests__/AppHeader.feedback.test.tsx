/**
 * The feedback trigger lives in the header, so it never covers page content.
 * NEXUS: DIRECTIVE-NXTG-20261014-15 item 3 (the floating button covered the
 * right rail at 1440 px).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "../AppHeader";

const minimal = {
  showEngagementSelector: false,
  showPanelToggles: false,
  showConnectionStatus: false,
  showNavigation: false,
  showProjectSwitcher: false,
};

describe("AppHeader feedback button", () => {
  it("opens feedback when clicked", () => {
    const onFeedbackClick = vi.fn();
    render(<AppHeader {...minimal} onFeedbackClick={onFeedbackClick} />);

    const button = screen.getByTestId("app-feedback-btn");
    expect(button).toHaveAccessibleName("Send feedback");
    fireEvent.click(button);
    expect(onFeedbackClick).toHaveBeenCalledTimes(1);
  });

  it("is absent when no handler is given", () => {
    render(<AppHeader {...minimal} />);

    expect(screen.queryByTestId("app-feedback-btn")).not.toBeInTheDocument();
  });

  it("stage tooltip says public preview and nothing about maturity", () => {
    render(<AppHeader {...minimal} />);

    const title = screen.getByTestId("app-stage-badge").getAttribute("title") ?? "";
    expect(title).toMatch(/^Public preview/);
    expect(title).not.toMatch(/alpha|maturity/i);
  });
});

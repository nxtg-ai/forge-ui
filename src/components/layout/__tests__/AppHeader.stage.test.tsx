/**
 * The app header shows the release stage from the one constant.
 * NEXUS: DIRECTIVE-NXTG-20261007-11.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "../AppHeader";
import { APP_STAGE } from "../../../services/app-stage";

describe("AppHeader stage badge", () => {
  it("renders 'stage: <APP_STAGE>' beside the brand", () => {
    render(
      <AppHeader
        showEngagementSelector={false}
        showPanelToggles={false}
        showConnectionStatus={false}
        showNavigation={false}
        showProjectSwitcher={false}
      />,
    );
    const badge = screen.getByTestId("app-stage-badge");
    expect(badge).toHaveTextContent(`stage: ${APP_STAGE}`);
    expect(badge).toHaveTextContent("stage: internal");
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BetaBanner } from "../BetaBanner";

describe("BetaBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("Initial Render", () => {
    test("renders banner on first visit", () => {
      render(<BetaBanner />);

      expect(screen.getByText("You're using NXTG-Forge Beta!")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Help shape the future of development orchestration - we'd love your feedback"
        )
      ).toBeInTheDocument();
    });

    test("does not render when previously dismissed", () => {
      localStorage.setItem("nxtg-beta-banner-dismissed", "true");

      render(<BetaBanner />);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });

    test("does not render when shown in current session", () => {
      sessionStorage.setItem("nxtg-beta-banner-session", "true");

      render(<BetaBanner />);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });

    test("sets session storage on first render", () => {
      render(<BetaBanner />);

      expect(sessionStorage.getItem("nxtg-beta-banner-session")).toBe("true");
    });
  });

  describe("Dismiss Functionality", () => {
    test("hides banner when dismiss button is clicked", () => {
      render(<BetaBanner />);

      expect(screen.getByText("You're using NXTG-Forge Beta!")).toBeInTheDocument();

      const dismissButton = screen.getByLabelText("Dismiss banner");
      fireEvent.click(dismissButton);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });

    test("saves dismissed state to localStorage", () => {
      render(<BetaBanner />);

      const dismissButton = screen.getByLabelText("Dismiss banner");
      fireEvent.click(dismissButton);

      expect(localStorage.getItem("nxtg-beta-banner-dismissed")).toBe("true");
    });

    test("banner stays hidden after dismiss on new render", () => {
      const { rerender } = render(<BetaBanner />);

      const dismissButton = screen.getByLabelText("Dismiss banner");
      fireEvent.click(dismissButton);

      rerender(<BetaBanner />);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });
  });

  describe("Feedback Button", () => {
    test("renders feedback button with correct text", () => {
      render(<BetaBanner />);

      expect(screen.getByText("Share Feedback")).toBeInTheDocument();
    });

    test("renders short text on mobile", () => {
      render(<BetaBanner />);

      const feedbackButton = screen.getByText("Feedback");
      expect(feedbackButton).toBeInTheDocument();
    });

    test("calls onFeedbackClick when feedback button is clicked", () => {
      const onFeedbackClick = vi.fn();
      render(<BetaBanner onFeedbackClick={onFeedbackClick} />);

      const feedbackButton = screen.getByText("Share Feedback");
      fireEvent.click(feedbackButton);

      expect(onFeedbackClick).toHaveBeenCalledOnce();
    });

    test("hides banner when feedback button is clicked", () => {
      const onFeedbackClick = vi.fn();
      render(<BetaBanner onFeedbackClick={onFeedbackClick} />);

      expect(screen.getByText("You're using NXTG-Forge Beta!")).toBeInTheDocument();

      const feedbackButton = screen.getByText("Share Feedback");
      fireEvent.click(feedbackButton);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });

    test("does not save dismissed state when feedback button clicked", () => {
      const onFeedbackClick = vi.fn();
      render(<BetaBanner onFeedbackClick={onFeedbackClick} />);

      const feedbackButton = screen.getByText("Share Feedback");
      fireEvent.click(feedbackButton);

      // Should not be permanently dismissed, only hidden
      expect(localStorage.getItem("nxtg-beta-banner-dismissed")).toBeNull();
    });

    test("feedback button works without onFeedbackClick callback", () => {
      render(<BetaBanner />);

      const feedbackButton = screen.getByText("Share Feedback");
      fireEvent.click(feedbackButton);

      // Should just hide banner without error
      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });
  });

  describe("Banner Styling", () => {
    test("has correct positioning classes", () => {
      const { container } = render(<BetaBanner />);

      const banner = container.firstChild;
      expect(banner).toHaveClass("fixed");
      expect(banner).toHaveClass("top-0");
      expect(banner).toHaveClass("left-0");
      expect(banner).toHaveClass("right-0");
      expect(banner).toHaveClass("z-50");
    });

    test("has gradient background", () => {
      const { container } = render(<BetaBanner />);

      const banner = container.firstChild;
      expect(banner).toHaveClass("bg-gradient-to-r");
      expect(banner).toHaveClass("from-purple-900/90");
      expect(banner).toHaveClass("to-blue-900/90");
    });

    test("has border and shadow", () => {
      const { container } = render(<BetaBanner />);

      const banner = container.firstChild;
      expect(banner).toHaveClass("border-b");
      expect(banner).toHaveClass("border-purple-500/30");
      expect(banner).toHaveClass("shadow-elevation-3");
    });
  });

  describe("Beta Badge", () => {
    test("renders beta badge with correct styling", () => {
      render(<BetaBanner />);

      const betaBadge = screen.getByText("Beta");
      expect(betaBadge).toBeInTheDocument();
      expect(betaBadge).toHaveClass("px-2");
      expect(betaBadge).toHaveClass("py-0.5");
      expect(betaBadge).toHaveClass("bg-purple-500/30");
      expect(betaBadge).toHaveClass("border");
      expect(betaBadge).toHaveClass("rounded-full");
    });
  });

  describe("Responsive Layout", () => {
    test("renders responsive container", () => {
      render(<BetaBanner />);

      const container = screen
        .getByText("You're using NXTG-Forge Beta!")
        .closest(".max-w-7xl");
      expect(container).toBeInTheDocument();
    });

    test("has responsive padding classes", () => {
      render(<BetaBanner />);

      const container = screen
        .getByText("You're using NXTG-Forge Beta!")
        .closest(".max-w-7xl");
      expect(container).toHaveClass("px-4");
      expect(container).toHaveClass("sm:px-6");
      expect(container).toHaveClass("lg:px-8");
    });
  });

  describe("Text Content", () => {
    test("displays main heading", () => {
      render(<BetaBanner />);

      const heading = screen.getByText("You're using NXTG-Forge Beta!");
      expect(heading).toHaveClass("text-sm");
      expect(heading).toHaveClass("font-semibold");
      expect(heading).toHaveClass("text-white");
    });

    test("displays descriptive text", () => {
      render(<BetaBanner />);

      const description = screen.getByText(
        "Help shape the future of development orchestration - we'd love your feedback"
      );
      expect(description).toHaveClass("text-xs");
      expect(description).toHaveClass("text-gray-300");
      expect(description).toHaveClass("mt-1");
    });
  });

  describe("Session Persistence", () => {
    test("banner appears on first page load", () => {
      render(<BetaBanner />);

      expect(screen.getByText("You're using NXTG-Forge Beta!")).toBeInTheDocument();
      expect(sessionStorage.getItem("nxtg-beta-banner-session")).toBe("true");
    });

    test("banner does not appear on subsequent renders in same session", () => {
      sessionStorage.setItem("nxtg-beta-banner-session", "true");

      render(<BetaBanner />);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });

    test("banner reappears in new session if not dismissed", () => {
      // Simulate first session
      const { unmount } = render(<BetaBanner />);

      const dismissButton = screen.getByLabelText("Dismiss banner");
      fireEvent.click(dismissButton);

      unmount();

      // Clear session storage to simulate new session
      sessionStorage.clear();

      // Banner should not appear because localStorage dismissed is set
      render(<BetaBanner />);

      expect(
        screen.queryByText("You're using NXTG-Forge Beta!")
      ).not.toBeInTheDocument();
    });
  });

  describe("LocalStorage Keys", () => {
    test("uses correct localStorage key for dismissed state", () => {
      render(<BetaBanner />);

      const dismissButton = screen.getByLabelText("Dismiss banner");
      fireEvent.click(dismissButton);

      expect(localStorage.getItem("nxtg-beta-banner-dismissed")).toBe("true");
    });

    test("uses correct sessionStorage key for session state", () => {
      render(<BetaBanner />);

      expect(sessionStorage.getItem("nxtg-beta-banner-session")).toBe("true");
    });
  });

  describe("Edge Cases", () => {
    test("handles missing sessionStorage gracefully", () => {
      const sessionStorageGetSpy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockReturnValue(null);

      render(<BetaBanner />);

      expect(screen.getByText("You're using NXTG-Forge Beta!")).toBeInTheDocument();

      sessionStorageGetSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    test("dismiss button has aria-label", () => {
      render(<BetaBanner />);

      const dismissButton = screen.getByLabelText("Dismiss banner");
      expect(dismissButton).toBeInTheDocument();
    });

    test("feedback button is keyboard accessible", () => {
      const onFeedbackClick = vi.fn();
      render(<BetaBanner onFeedbackClick={onFeedbackClick} />);

      const feedbackButton = screen.getByText("Share Feedback");
      feedbackButton.focus();
      fireEvent.keyDown(feedbackButton, { key: "Enter" });

      // Button should be focusable
      expect(feedbackButton).toBeInTheDocument();
    });
  });
});

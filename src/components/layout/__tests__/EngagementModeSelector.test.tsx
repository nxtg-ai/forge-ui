/**
 * Tests for EngagementModeSelector Component
 *
 * Test coverage:
 * - Rendering and display
 * - Keyboard navigation
 * - Mouse interactions
 * - Focus management
 * - Accessibility (ARIA)
 * - Context integration
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EngagementModeSelector } from "../EngagementModeSelector";
import { EngagementProvider } from "../../../contexts/EngagementContext";
import type { EngagementMode } from "../../types";

/**
 * Helper: Render component with EngagementProvider
 */
const renderWithProvider = (
  ui: React.ReactElement,
  options?: { onModeChange?: (mode: EngagementMode) => void },
) => {
  return render(
    <EngagementProvider onModeChange={options?.onModeChange}>
      {ui}
    </EngagementProvider>,
  );
};

describe("EngagementModeSelector", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("Rendering", () => {
    test("renders with default variant", () => {
      renderWithProvider(<EngagementModeSelector />);
      expect(screen.getByTestId("engagement-mode-button")).toBeInTheDocument();
    });

    test("renders with compact variant", () => {
      renderWithProvider(<EngagementModeSelector variant="compact" />);
      const button = screen.getByTestId("engagement-mode-button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("px-3", "py-1.5", "text-xs");
    });

    test("renders with custom className", () => {
      renderWithProvider(<EngagementModeSelector className="custom-class" />);
      const container = screen
        .getByTestId("engagement-mode-button")
        .closest("div");
      expect(container).toHaveClass("custom-class");
    });

    test("displays current mode from context", () => {
      // Set mode in localStorage before rendering
      localStorage.setItem("nxtg-forge-engagement-mode", "ceo");

      renderWithProvider(<EngagementModeSelector />);
      expect(screen.getByTestId("engagement-mode-button")).toHaveTextContent(
        "CEO",
      );
    });

    test("shows dropdown when button is clicked", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Navigation", () => {
    test("opens dropdown on ArrowDown key", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      button.focus();
      fireEvent.keyDown(button, { key: "ArrowDown" });

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });
    });

    test("closes dropdown on Escape key", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(
          screen.queryByTestId("engagement-mode-dropdown"),
        ).not.toBeInTheDocument();
      });
    });

    test("navigates options with ArrowDown", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Current mode (engineer, index 2) should be highlighted by default
      const engineerOption = screen.getByTestId("engagement-mode-engineer");
      expect(engineerOption).toHaveClass("ring-2", "ring-purple-500/50");

      // Press ArrowDown to move to next option
      fireEvent.keyDown(window, { key: "ArrowDown" });

      // Builder option (index 3) should now be highlighted
      const builderOption = screen.getByTestId("engagement-mode-builder");
      expect(builderOption).toHaveClass("ring-2", "ring-purple-500/50");
    });

    test("navigates options with ArrowUp", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Current mode (engineer, index 2) should be highlighted by default
      const engineerOption = screen.getByTestId("engagement-mode-engineer");
      expect(engineerOption).toHaveClass("ring-2", "ring-purple-500/50");

      // Press ArrowUp to move to previous option
      fireEvent.keyDown(window, { key: "ArrowUp" });

      // VP option (index 1) should now be highlighted
      const vpOption = screen.getByTestId("engagement-mode-vp");
      expect(vpOption).toHaveClass("ring-2", "ring-purple-500/50");
    });

    test("selects option with Enter key", async () => {
      const handleChange = vi.fn();
      renderWithProvider(
        <EngagementModeSelector onModeChange={handleChange} />,
      );

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Navigate to CEO option
      fireEvent.keyDown(window, { key: "ArrowUp" });
      fireEvent.keyDown(window, { key: "ArrowUp" });

      // Press Enter to select CEO option
      fireEvent.keyDown(window, { key: "Enter" });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("ceo");
        expect(
          screen.queryByTestId("engagement-mode-dropdown"),
        ).not.toBeInTheDocument();
      });
    });

    test("selects option with Space key", async () => {
      const handleChange = vi.fn();
      renderWithProvider(
        <EngagementModeSelector onModeChange={handleChange} />,
      );

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Navigate to CEO option
      fireEvent.keyDown(window, { key: "ArrowUp" });
      fireEvent.keyDown(window, { key: "ArrowUp" });

      // Press Space to select CEO option
      fireEvent.keyDown(window, { key: " " });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("ceo");
      });
    });

    test("jumps to first option with Home key", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Move to middle option first
      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "ArrowDown" });

      // Press Home to jump to first
      fireEvent.keyDown(window, { key: "Home" });

      const firstOption = screen.getByTestId("engagement-mode-ceo");
      expect(firstOption).toHaveClass("ring-2", "ring-purple-500/50");
    });

    test("jumps to last option with End key", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Press End to jump to last
      fireEvent.keyDown(window, { key: "End" });

      const lastOption = screen.getByTestId("engagement-mode-founder");
      expect(lastOption).toHaveClass("ring-2", "ring-purple-500/50");
    });
  });

  describe("Mouse Interactions", () => {
    test("toggles dropdown on button click", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");

      // Click to open
      fireEvent.click(button);
      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Click again to close
      fireEvent.click(button);
      await waitFor(() => {
        expect(
          screen.queryByTestId("engagement-mode-dropdown"),
        ).not.toBeInTheDocument();
      });
    });

    test("selects mode on option click", async () => {
      const handleChange = vi.fn();
      renderWithProvider(
        <EngagementModeSelector onModeChange={handleChange} />,
      );

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Click CEO option
      const ceoOption = screen.getByTestId("engagement-mode-ceo");
      fireEvent.click(ceoOption);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("ceo");
        expect(
          screen.queryByTestId("engagement-mode-dropdown"),
        ).not.toBeInTheDocument();
      });
    });

    test("highlights option on mouse enter", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Hover over VP option
      const vpOption = screen.getByTestId("engagement-mode-vp");
      fireEvent.mouseEnter(vpOption);

      expect(vpOption).toHaveClass("ring-2", "ring-purple-500/50");
    });

    test("closes dropdown on outside click", async () => {
      renderWithProvider(
        <div>
          <EngagementModeSelector />
          <button data-testid="outside-button">Outside</button>
        </div>,
      );

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Click outside
      const outsideButton = screen.getByTestId("outside-button");
      fireEvent.mouseDown(outsideButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("engagement-mode-dropdown"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Focus Management", () => {
    test("returns focus to button after selection", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");

      // Open dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Select option
      const ceoOption = screen.getByTestId("engagement-mode-ceo");
      fireEvent.click(ceoOption);

      // Wait for dropdown to close and focus to return
      await waitFor(
        () => {
          expect(
            screen.queryByTestId("engagement-mode-dropdown"),
          ).not.toBeInTheDocument();
          expect(document.activeElement).toBe(button);
        },
        { timeout: 200 },
      );
    });

    test("returns focus to button on Escape", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");

      // Open dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(document.activeElement).toBe(button);
      });
    });
  });

  describe("Accessibility", () => {
    test("button has correct ARIA attributes", () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-label");
    });

    test("button aria-expanded changes when opened", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      expect(button).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute("aria-expanded", "true");
      });
    });

    test("dropdown has role=listbox", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        const dropdown = screen.getByTestId("engagement-mode-dropdown");
        expect(dropdown).toHaveAttribute("role", "listbox");
      });
    });

    test("options have role=option", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        const ceoOption = screen.getByTestId("engagement-mode-ceo");
        expect(ceoOption).toHaveAttribute("role", "option");
      });
    });

    test("selected option has aria-selected=true", async () => {
      // Set CEO mode
      localStorage.setItem("nxtg-forge-engagement-mode", "ceo");

      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        const ceoOption = screen.getByTestId("engagement-mode-ceo");
        expect(ceoOption).toHaveAttribute("aria-selected", "true");
      });
    });

    test("options have descriptive aria-label", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        const ceoOption = screen.getByTestId("engagement-mode-ceo");
        const label = ceoOption.getAttribute("aria-label");
        expect(label).toContain("CEO");
        expect(label).toContain("Health");
      });
    });
  });

  describe("Context Integration", () => {
    test("updates context when mode is selected", async () => {
      renderWithProvider(<EngagementModeSelector />);

      // Open dropdown
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Select VP mode
      const vpOption = screen.getByTestId("engagement-mode-vp");
      fireEvent.click(vpOption);

      // Verify mode is saved to localStorage
      await waitFor(() => {
        expect(localStorage.getItem("nxtg-forge-engagement-mode")).toBe("vp");
      });

      // Verify button displays new mode
      expect(button).toHaveTextContent("VP");
    });

    test("calls onModeChange callback", async () => {
      const handleChange = vi.fn();
      renderWithProvider(
        <EngagementModeSelector onModeChange={handleChange} />,
      );

      // Open and select
      const button = screen.getByTestId("engagement-mode-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      const ceoOption = screen.getByTestId("engagement-mode-ceo");
      fireEvent.click(ceoOption);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("ceo");
        expect(handleChange).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Visual States", () => {
    test("displays checkmark for selected mode", async () => {
      localStorage.setItem("nxtg-forge-engagement-mode", "engineer");

      renderWithProvider(<EngagementModeSelector />);

      // Verify button shows Engineer mode
      const button = screen.getByTestId("engagement-mode-button");
      expect(button).toHaveTextContent("Engineer");

      // Open dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId("engagement-mode-dropdown"),
        ).toBeInTheDocument();
      });

      // Wait for the engineer option to have aria-selected="true"
      await waitFor(() => {
        const engineerOption = screen.getByTestId("engagement-mode-engineer");
        expect(engineerOption).toHaveAttribute("aria-selected", "true");
      });

      // Now check for the CheckCircle icon
      const engineerOption = screen.getByTestId("engagement-mode-engineer");
      const svgElements = engineerOption.querySelectorAll("svg");

      // The engineer option should have at least 2 SVG elements: the Code2 icon and CheckCircle
      expect(svgElements.length).toBe(2);

      // The second SVG should be the CheckCircle (lucide-react renders it with different class names)
      const checkCircle = svgElements[1];
      const classList = checkCircle.classList.toString();
      // Check for either the old name or the new name from lucide-react
      expect(
        classList.includes("lucide-check-circle") ||
          classList.includes("lucide-circle-check-big"),
      ).toBe(true);
    });

    test("applies correct styling to open button", async () => {
      renderWithProvider(<EngagementModeSelector />);

      const button = screen.getByTestId("engagement-mode-button");

      // Closed state
      expect(button).toHaveClass("border-gray-700");

      // Open state
      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toHaveClass("border-purple-500/50");
      });
    });
  });
});

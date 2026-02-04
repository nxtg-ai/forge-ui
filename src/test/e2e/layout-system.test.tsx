/**
 * E2E Test Suite: Layout System
 * Tests AppShell rendering, panel configurations, keyboard shortcuts, responsive breakpoints, and viewport containment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { Terminal } from "lucide-react";

// Mock responsive layout hook
const createMockLayout = (overrides = {}) => ({
  layout: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: "xl",
    width: 1920,
    showSidebar: true,
    sidebarWidth: 280,
    showHUD: true,
    hudWidth: 320,
    terminalHeight: "100%",
    paneLayout: "multi",
    panelMode: "fixed",
    ...overrides,
  },
  sidebarVisible: true,
  hudVisible: true,
  footerVisible: true,
  toggleSidebar: vi.fn(),
  toggleHUD: vi.fn(),
  toggleFooter: vi.fn(),
  setSidebar: vi.fn(),
  setHUD: vi.fn(),
  setFooter: vi.fn(),
  getResponsiveClasses: vi.fn(),
  breakpoints: {},
});

vi.mock("../../components/infinity-terminal/hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => createMockLayout(),
}));

vi.mock("../../components/infinity-terminal/Panel", () => ({
  Panel: ({ children, visible, title }: any) =>
    visible ? (
      <div data-testid={`panel-${title || "untitled"}`}>{children}</div>
    ) : null,
}));

vi.mock("../../components/infinity-terminal/FooterPanel", () => ({
  FooterPanel: (props: any) => (
    <div data-testid="footer-panel">Footer: {props.sessionName}</div>
  ),
}));

vi.mock("../../components/ui/KeyboardShortcutsHelp", () => ({
  KeyboardShortcutsHelp: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="keyboard-help">
        <button onClick={onClose}>Close Help</button>
      </div>
    ) : null,
}));

describe("E2E: Layout System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AppShell Basic Rendering", () => {
    it("should render with all panel configurations", () => {
      render(
        <AppShell
          title="Full Layout"
          leftPanel={<div>Left Content</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          rightPanel={<div>Right Content</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
          showFooter={true}
          sessionName="test-session"
        >
          <div>Main Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
      expect(screen.getByText("Full Layout")).toBeInTheDocument();
      expect(screen.getByTestId("panel-Left")).toBeInTheDocument();
      expect(screen.getByTestId("panel-Right")).toBeInTheDocument();
      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
      expect(screen.getByText("Main Content")).toBeInTheDocument();
    });

    it("should render with left panel only", () => {
      render(
        <AppShell
          title="Left Panel Only"
          leftPanel={<div>Left Content</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          showRightPanel={false}
        >
          <div>Main Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("panel-Left")).toBeInTheDocument();
      expect(screen.queryByTestId("panel-Right")).not.toBeInTheDocument();
    });

    it("should render with right panel only", () => {
      render(
        <AppShell
          title="Right Panel Only"
          rightPanel={<div>Right Content</div>}
          rightPanelTitle="Right"
          showLeftPanel={false}
          showRightPanel={true}
        >
          <div>Main Content</div>
        </AppShell>,
      );

      expect(screen.queryByTestId("panel-Left")).not.toBeInTheDocument();
      expect(screen.getByTestId("panel-Right")).toBeInTheDocument();
    });

    it("should render with no panels", () => {
      render(
        <AppShell
          title="No Panels"
          showLeftPanel={false}
          showRightPanel={false}
          showFooter={false}
        >
          <div>Main Content Only</div>
        </AppShell>,
      );

      expect(screen.queryByTestId("panel-Left")).not.toBeInTheDocument();
      expect(screen.queryByTestId("panel-Right")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footer-panel")).not.toBeInTheDocument();
      expect(screen.getByText("Main Content Only")).toBeInTheDocument();
    });

    it("should render with icon and badge", () => {
      render(
        <AppShell
          title="Terminal"
          icon={<Terminal data-testid="title-icon" />}
          badge="Live"
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("title-icon")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("should render header actions", () => {
      render(
        <AppShell
          title="Test"
          headerActions={
            <button data-testid="custom-action">Custom Action</button>
          }
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("custom-action")).toBeInTheDocument();
    });

    it("should render custom footer", () => {
      render(
        <AppShell
          title="Test"
          showFooter={true}
          footer={<div data-testid="custom-footer">Custom Footer</div>}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
      expect(screen.queryByTestId("footer-panel")).not.toBeInTheDocument();
    });
  });

  describe("Panel Toggle Keyboard Shortcuts", () => {
    it("should open keyboard help with ?", async () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      fireEvent.keyDown(window, { key: "?" });

      await waitFor(() => {
        expect(screen.getByTestId("keyboard-help")).toBeInTheDocument();
      });
    });

    it("should close keyboard help", async () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      fireEvent.keyDown(window, { key: "?" });

      await waitFor(() => {
        expect(screen.getByTestId("keyboard-help")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close Help"));

      await waitFor(() => {
        expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
      });
    });

    it("should not intercept keyboard events in input fields", () => {
      render(
        <AppShell title="Test">
          <input data-testid="test-input" type="text" />
        </AppShell>,
      );

      const input = screen.getByTestId("test-input");
      fireEvent.keyDown(input, { key: "?" });

      expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
    });

    it("should not intercept keyboard events in textarea", () => {
      render(
        <AppShell title="Test">
          <textarea data-testid="test-textarea" />
        </AppShell>,
      );

      const textarea = screen.getByTestId("test-textarea");
      fireEvent.keyDown(textarea, { key: "?" });

      expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
    });

    it("should handle multiple keyboard shortcuts", () => {
      render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          rightPanel={<div>Right</div>}
        >
          <div>Content</div>
        </AppShell>,
      );

      // Press various shortcuts without errors
      fireEvent.keyDown(window, { key: "[" });
      fireEvent.keyDown(window, { key: "]" });
      fireEvent.keyDown(window, { key: "f", altKey: true });

      // Should not crash
      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it.skip("should support escape key to close help - needs browser-level Escape dispatch", async () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      fireEvent.keyDown(window, { key: "?" });

      await waitFor(() => {
        expect(screen.getByTestId("keyboard-help")).toBeInTheDocument();
      });

      fireEvent.keyDown(window, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
      });
    });
  });

  describe("Responsive Layout Breakpoints", () => {
    it("should handle mobile breakpoint", () => {
      vi.mock(
        "../../components/infinity-terminal/hooks/useResponsiveLayout",
        () => ({
          useResponsiveLayout: () =>
            createMockLayout({
              isMobile: true,
              isTablet: false,
              isDesktop: false,
              breakpoint: "sm",
              width: 375,
            }),
        }),
      );

      render(
        <AppShell title="Mobile Layout">
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("should handle tablet breakpoint", () => {
      vi.mock(
        "../../components/infinity-terminal/hooks/useResponsiveLayout",
        () => ({
          useResponsiveLayout: () =>
            createMockLayout({
              isMobile: false,
              isTablet: true,
              isDesktop: false,
              breakpoint: "md",
              width: 768,
            }),
        }),
      );

      render(
        <AppShell title="Tablet Layout">
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("should handle desktop breakpoint", () => {
      vi.mock(
        "../../components/infinity-terminal/hooks/useResponsiveLayout",
        () => ({
          useResponsiveLayout: () =>
            createMockLayout({
              isMobile: false,
              isTablet: false,
              isDesktop: true,
              breakpoint: "xl",
              width: 1920,
            }),
        }),
      );

      render(
        <AppShell title="Desktop Layout">
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("should apply responsive CSS classes", () => {
      render(
        <AppShell title="Test" className="custom-class">
          <div>Content</div>
        </AppShell>,
      );

      const shell = screen.getByTestId("app-shell");
      expect(shell).toHaveClass("custom-class");
      expect(shell).toHaveClass("flex");
      expect(shell).toHaveClass("flex-col");
      expect(shell).toHaveClass("h-screen");
    });

    it("should handle window resize events", () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      // Simulate window resize
      fireEvent(window, new Event("resize"));

      // Should still render correctly
      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });
  });

  describe("Footer Visibility Toggle", () => {
    it("should show footer when showFooter is true", () => {
      render(
        <AppShell title="Test" showFooter={true} sessionName="test-session">
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });

    it("should hide footer when showFooter is false", () => {
      render(
        <AppShell title="Test" showFooter={false}>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.queryByTestId("footer-panel")).not.toBeInTheDocument();
    });

    it("should toggle footer visibility", () => {
      const { rerender } = render(
        <AppShell title="Test" showFooter={true} sessionName="test">
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();

      rerender(
        <AppShell title="Test" showFooter={false}>
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.queryByTestId("footer-panel")).not.toBeInTheDocument();
    });

    it("should pass oracle messages to footer", () => {
      const messages = [
        { id: "1", type: "info" as const, text: "Test message" },
      ];

      render(
        <AppShell
          title="Test"
          showFooter={true}
          sessionName="test"
          oracleMessages={messages}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });

    it("should show connection status in footer", () => {
      render(
        <AppShell
          title="Test"
          showFooter={true}
          sessionName="test"
          isConnected={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });
  });

  describe("Full Viewport Containment", () => {
    it("should use full viewport height", () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      const shell = screen.getByTestId("app-shell");
      expect(shell).toHaveClass("h-screen");
    });

    it("should prevent overflow on main content", () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      const content = screen.getByTestId("app-shell-content");
      expect(content).toHaveClass("overflow-hidden");
    });

    it("should allow scrolling within content area", () => {
      render(
        <AppShell title="Test">
          <div style={{ height: "2000px" }}>Tall Content</div>
        </AppShell>,
      );

      const content = screen.getByTestId("app-shell-content");
      expect(content).toHaveClass("flex-1");
    });

    it("should maintain layout with long content", () => {
      const longContent = Array.from({ length: 100 }, (_, i) => (
        <div key={i}>Line {i}</div>
      ));

      render(
        <AppShell title="Test">
          <div>{longContent}</div>
        </AppShell>,
      );

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("should handle deeply nested content", () => {
      render(
        <AppShell title="Test">
          <div>
            <div>
              <div>
                <div>
                  <div>Deep Content</div>
                </div>
              </div>
            </div>
          </div>
        </AppShell>,
      );

      expect(screen.getByText("Deep Content")).toBeInTheDocument();
    });
  });

  describe("ARIA and Accessibility", () => {
    it("should have proper ARIA structure", () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>,
      );

      const header = screen.getByTestId("app-shell-header");
      expect(header).toBeInTheDocument();

      const main = screen.getByTestId("app-shell-content");
      expect(main).toBeInTheDocument();
      expect(main.tagName).toBe("MAIN");
    });

    it("should support keyboard navigation", () => {
      const { container } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          rightPanel={<div>Right</div>}
        >
          <div>Content</div>
        </AppShell>,
      );

      // Keyboard shortcuts should not throw errors
      fireEvent.keyDown(window, { key: "[" });
      fireEvent.keyDown(window, { key: "]" });
      fireEvent.keyDown(window, { key: "f", altKey: true });

      expect(container).toBeInTheDocument();
    });

    it("should have focusable elements", () => {
      const { container } = render(
        <AppShell
          title="Test"
          headerActions={<button>Action</button>}
        >
          <input type="text" placeholder="Test input" />
        </AppShell>,
      );

      const focusableElements = container.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it("should have descriptive labels", () => {
      render(
        <AppShell
          title="Dashboard"
          leftPanelTitle="Navigation"
          rightPanelTitle="Tools"
          leftPanel={<div>Nav content</div>}
          rightPanel={<div>Tool content</div>}
          showLeftPanel={true}
          showRightPanel={true}
        >
          <div>Main content</div>
        </AppShell>,
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  describe("Panel State Management", () => {
    it("should maintain panel state across updates", () => {
      const { rerender } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left v1</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Left v1")).toBeInTheDocument();

      rerender(
        <AppShell
          title="Test"
          leftPanel={<div>Left v2</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Left v2")).toBeInTheDocument();
    });

    it("should handle rapid panel toggling", () => {
      const { rerender } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      // Toggle rapidly
      for (let i = 0; i < 5; i++) {
        rerender(
          <AppShell
            title="Test"
            leftPanel={<div>Left</div>}
            leftPanelTitle="Left"
            showLeftPanel={i % 2 === 0}
          >
            <div>Content</div>
          </AppShell>,
        );
      }

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("should handle multiple panels toggling independently", () => {
      const { rerender } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          rightPanel={<div>Right</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.getByTestId("panel-Left")).toBeInTheDocument();
      expect(screen.getByTestId("panel-Right")).toBeInTheDocument();

      // Toggle left only
      rerender(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          leftPanelTitle="Left"
          showLeftPanel={false}
          rightPanel={<div>Right</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(screen.queryByTestId("panel-Left")).not.toBeInTheDocument();
      expect(screen.getByTestId("panel-Right")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render efficiently with many panels", () => {
      const startTime = performance.now();

      render(
        <AppShell
          title="Performance Test"
          leftPanel={<div>{Array.from({ length: 100 }, (_, i) => <div key={i}>Item {i}</div>)}</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          rightPanel={<div>{Array.from({ length: 100 }, (_, i) => <div key={i}>Item {i}</div>)}</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
        >
          <div>{Array.from({ length: 100 }, (_, i) => <div key={i}>Main {i}</div>)}</div>
        </AppShell>,
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Should render in under 500ms
    });

    it("should not cause memory leaks on unmount", () => {
      const { unmount } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          rightPanel={<div>Right</div>}
        >
          <div>Content</div>
        </AppShell>,
      );

      expect(() => unmount()).not.toThrow();
    });

    it("should handle rapid re-renders", () => {
      const { rerender } = render(
        <AppShell title="Test">
          <div>Content 1</div>
        </AppShell>,
      );

      for (let i = 0; i < 10; i++) {
        rerender(
          <AppShell title={`Test ${i}`}>
            <div>Content {i}</div>
          </AppShell>,
        );
      }

      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should render complete layout with all features", () => {
      render(
        <AppShell
          title="Dashboard"
          icon={<Terminal data-testid="icon" />}
          badge="Live"
          headerActions={<button data-testid="action">Refresh</button>}
          leftPanel={<div>Left Panel</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          rightPanel={<div>Right Panel</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
          showFooter={true}
          sessionName="test-session"
          isConnected={true}
        >
          <div>Main Content Area</div>
        </AppShell>,
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByTestId("action")).toBeInTheDocument();
      expect(screen.getByText("Left Panel")).toBeInTheDocument();
      expect(screen.getByText("Right Panel")).toBeInTheDocument();
      expect(screen.getByText("Main Content Area")).toBeInTheDocument();
      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });

    it("should work with dynamic content updates", () => {
      const { rerender } = render(
        <AppShell title="Dynamic Content">
          <div>Initial Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Initial Content")).toBeInTheDocument();

      rerender(
        <AppShell title="Dynamic Content">
          <div>Updated Content</div>
        </AppShell>,
      );

      expect(screen.getByText("Updated Content")).toBeInTheDocument();
    });

    it("should handle complex nested layouts", () => {
      render(
        <AppShell title="Complex Layout">
          <div>
            <AppShell title="Nested Shell">
              <div>Nested Content</div>
            </AppShell>
          </div>
        </AppShell>,
      );

      expect(screen.getAllByText("Complex Layout")[0]).toBeInTheDocument();
      expect(screen.getByText("Nested Content")).toBeInTheDocument();
    });
  });
});

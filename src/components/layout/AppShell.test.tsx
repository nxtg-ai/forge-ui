/**
 * AppShell Component Tests
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppShell } from "./AppShell";
import { Terminal, Brain, Layers } from "lucide-react";
import type { OracleMessage } from "../infinity-terminal/OracleFeedMarquee";

// Mock the hooks and components
vi.mock("../infinity-terminal/hooks/useResponsiveLayout", () => ({
  useResponsiveLayout: () => ({
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
  }),
}));

vi.mock("../infinity-terminal/Panel", () => ({
  Panel: ({ children, visible, title }: any) =>
    visible ? (
      <div data-testid={`panel-${title || "untitled"}`}>{children}</div>
    ) : null,
}));

vi.mock("../infinity-terminal/FooterPanel", () => ({
  FooterPanel: (props: any) => (
    <div data-testid="footer-panel">Footer: {props.sessionName}</div>
  ),
}));

vi.mock("../../hooks/useResizablePanels", () => ({
  useResizablePanels: () => ({
    leftWidth: 25,
    rightWidth: 25,
    containerRef: { current: null },
    startLeftDrag: vi.fn(),
    startRightDrag: vi.fn(),
    isDragging: false,
    resetWidths: vi.fn(),
  }),
}));

vi.mock("../ui/KeyboardShortcutsHelp", () => ({
  KeyboardShortcutsHelp: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="keyboard-help">
        <button onClick={onClose}>Close Help</button>
      </div>
    ) : null,
}));

describe("AppShell", () => {
  describe("Basic Rendering", () => {
    it("renders with minimal props", () => {
      render(
        <AppShell title="Test Page">
          <div>Test Content</div>
        </AppShell>
      );

      expect(screen.getByText("Test Page")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });

    it("renders with icon and badge", () => {
      render(
        <AppShell
          title="Terminal"
          icon={<Terminal data-testid="title-icon" />}
          badge="Live"
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("title-icon")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("renders header actions", () => {
      render(
        <AppShell
          title="Test"
          headerActions={
            <button data-testid="custom-action">Action</button>
          }
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("custom-action")).toBeInTheDocument();
    });
  });

  describe("Panel Management", () => {
    it("renders left panel when provided", () => {
      render(
        <AppShell
          title="Test"
          leftPanel={<div>Left Content</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
        >
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("panel-Left")).toBeInTheDocument();
      expect(screen.getByText("Left Content")).toBeInTheDocument();
    });

    it("renders right panel when provided", () => {
      render(
        <AppShell
          title="Test"
          rightPanel={<div>Right Content</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
        >
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("panel-Right")).toBeInTheDocument();
      expect(screen.getByText("Right Content")).toBeInTheDocument();
    });

    it("hides panels when showPanel is false", () => {
      render(
        <AppShell
          title="Test"
          leftPanel={<div>Left Content</div>}
          leftPanelTitle="Left"
          showLeftPanel={false}
        >
          <div>Main Content</div>
        </AppShell>
      );

      expect(screen.queryByTestId("panel-Left")).not.toBeInTheDocument();
    });
  });

  describe("Footer", () => {
    it("renders default footer when showFooter is true", () => {
      render(
        <AppShell
          title="Test"
          showFooter={true}
          sessionName="test-session"
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
      expect(screen.getByText("Footer: test-session")).toBeInTheDocument();
    });

    it("renders custom footer when provided", () => {
      render(
        <AppShell
          title="Test"
          showFooter={true}
          footer={<div data-testid="custom-footer">Custom Footer</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
      expect(screen.getByText("Custom Footer")).toBeInTheDocument();
    });

    it("passes oracle messages to footer", () => {
      const messages: OracleMessage[] = [
        { id: "1", type: "info", text: "Test message" },
      ];

      render(
        <AppShell
          title="Test"
          showFooter={true}
          sessionName="test"
          oracleMessages={messages}
        >
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("shows keyboard help when ? is pressed", async () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      );

      fireEvent.keyDown(window, { key: "?" });

      await waitFor(() => {
        expect(screen.getByTestId("keyboard-help")).toBeInTheDocument();
      });
    });

    it("closes keyboard help when close button is clicked", async () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      );

      // Open help
      fireEvent.keyDown(window, { key: "?" });

      await waitFor(() => {
        expect(screen.getByTestId("keyboard-help")).toBeInTheDocument();
      });

      // Close help
      const closeButton = screen.getByText("Close Help");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
      });
    });

    it("does not intercept keyboard events in input fields", () => {
      render(
        <AppShell title="Test">
          <input data-testid="test-input" type="text" />
        </AppShell>
      );

      const input = screen.getByTestId("test-input");
      fireEvent.keyDown(input, { key: "?" });

      // Help should not open when typing in input
      expect(screen.queryByTestId("keyboard-help")).not.toBeInTheDocument();
    });
  });

  describe("Responsive Layout", () => {
    it("applies correct CSS classes", () => {
      render(
        <AppShell title="Test" className="custom-class">
          <div>Content</div>
        </AppShell>
      );

      const shell = screen.getByTestId("app-shell");
      expect(shell).toHaveClass("custom-class");
      expect(shell).toHaveClass("flex");
      expect(shell).toHaveClass("flex-col");
      expect(shell).toHaveClass("flex-1");
    });

    it("renders main content area", () => {
      render(
        <AppShell title="Test">
          <div data-testid="main-content">Main Content</div>
        </AppShell>
      );

      const content = screen.getByTestId("app-shell-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("flex-1");
      expect(content).toHaveClass("overflow-hidden");
    });
  });

  describe("Integration", () => {
    it("renders complete layout with all features", () => {
      const oracleMessages: OracleMessage[] = [
        { id: "1", type: "info", text: "Test message" },
      ];

      render(
        <AppShell
          title="Dashboard"
          icon={<Brain data-testid="icon" />}
          badge="Live"
          headerActions={
            <button data-testid="action">Refresh</button>
          }
          leftPanel={<div>Left Panel</div>}
          leftPanelTitle="Left"
          showLeftPanel={true}
          rightPanel={<div>Right Panel</div>}
          rightPanelTitle="Right"
          showRightPanel={true}
          showFooter={true}
          sessionName="test-session"
          isConnected={true}
          oracleMessages={oracleMessages}
        >
          <div>Main Content Area</div>
        </AppShell>
      );

      // Verify all parts are rendered
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByTestId("action")).toBeInTheDocument();
      expect(screen.getByText("Left Panel")).toBeInTheDocument();
      expect(screen.getByText("Right Panel")).toBeInTheDocument();
      expect(screen.getByText("Main Content Area")).toBeInTheDocument();
      expect(screen.getByTestId("footer-panel")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA structure", () => {
      render(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      );

      const header = screen.getByTestId("app-shell-header");
      expect(header).toBeInTheDocument();

      const main = screen.getByTestId("app-shell-content");
      expect(main).toBeInTheDocument();
      expect(main.tagName).toBe("MAIN");
    });

    it("supports keyboard navigation", () => {
      const { container } = render(
        <AppShell
          title="Test"
          leftPanel={<div>Left</div>}
          rightPanel={<div>Right</div>}
        >
          <div>Content</div>
        </AppShell>
      );

      // All keyboard shortcuts should not throw errors
      fireEvent.keyDown(window, { key: "[" });
      fireEvent.keyDown(window, { key: "]" });
      fireEvent.keyDown(window, { key: "f", altKey: true });
      fireEvent.keyDown(window, { key: "?" });

      // No errors means success
      expect(container).toBeInTheDocument();
    });
  });
});

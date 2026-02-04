/**
 * AppShell Component
 * Unified layout structure composing header, panels, and content
 *
 * Layout Architecture:
 * ┌─────────────────────────────────┐
 * │ AppHeader (unified, 64px)       │
 * ├──────┬──────────────┬───────────┤
 * │Left  │   children   │  Right    │
 * │Panel │  (scrollable)│  Panel    │
 * │      │              │           │
 * ├──────┴──────────────┴───────────┤
 * │ FooterPanel (optional)          │
 * └─────────────────────────────────┘
 */

import React, { useCallback, useEffect } from "react";
import { Panel, PanelMode } from "../infinity-terminal/Panel";
import { FooterPanel } from "../infinity-terminal/FooterPanel";
import { KeyboardShortcutsHelp, type KeyboardShortcut } from "../ui/KeyboardShortcutsHelp";
import type { OracleMessage } from "../infinity-terminal/OracleFeedMarquee";
import { useLayoutOptional } from "../../contexts/LayoutContext";

export interface AppShellProps {
  // Page identity (passed to AppHeader)
  title: string;
  icon?: React.ReactNode;
  badge?: string;

  // Header customization
  headerActions?: React.ReactNode;
  showEngagementSelector?: boolean;

  // Panel configuration
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  showLeftPanel?: boolean;
  showRightPanel?: boolean;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
  leftPanelTitle?: string;
  rightPanelTitle?: string;

  // Main content
  children: React.ReactNode;

  // Footer configuration
  footer?: React.ReactNode;
  showFooter?: boolean;
  sessionName?: string;
  isConnected?: boolean;
  oracleMessages?: OracleMessage[];
  onToggleContext?: () => void;
  onToggleGovernance?: () => void;
  contextVisible?: boolean;
  governanceVisible?: boolean;

  // Keyboard shortcuts
  customShortcuts?: KeyboardShortcut[];

  className?: string;
}

/**
 * AppShell - Main layout compositor
 *
 * Responsibilities:
 * - Compose AppHeader, Panels, and content area
 * - Manage responsive layout state
 * - Handle keyboard shortcuts at shell level
 * - Coordinate panel visibility and modes
 * - Dispatch resize events for terminal compatibility
 */
export const AppShell: React.FC<AppShellProps> = ({
  title,
  icon,
  badge,
  headerActions,
  showEngagementSelector = false,
  leftPanel,
  rightPanel,
  showLeftPanel: leftPanelProp,
  showRightPanel: rightPanelProp,
  leftPanelWidth = 280,
  rightPanelWidth = 320,
  leftPanelTitle,
  rightPanelTitle,
  children,
  footer,
  showFooter = false,
  sessionName,
  isConnected = true,
  oracleMessages = [],
  onToggleContext,
  onToggleGovernance,
  contextVisible = false,
  governanceVisible = false,
  customShortcuts = [],
  className = "",
}) => {
  // Use LayoutContext if available for panel state
  const layoutContext = useLayoutOptional();

  // Panel visibility - prefer LayoutContext, fallback to props
  const sidebarVisible = layoutContext?.contextPanelVisible ?? leftPanelProp ?? true;
  const hudVisible = layoutContext?.governancePanelVisible ?? rightPanelProp ?? true;
  const footerVisibleState = layoutContext?.footerVisible ?? showFooter;

  // Toggle functions - prefer LayoutContext, fallback to callbacks
  const toggleSidebar = layoutContext?.toggleContextPanel ?? onToggleContext ?? (() => {});
  const toggleHUD = layoutContext?.toggleGovernancePanel ?? onToggleGovernance ?? (() => {});
  const toggleFooter = useCallback(() => {
    // Footer toggle not commonly exposed, just log for now
    console.log("Footer toggle requested");
  }, []);

  // Layout info from context
  const layout = layoutContext?.layout ?? {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    panelMode: "fixed" as PanelMode,
    breakpoint: "lg" as const,
    width: 1024,
    showSidebar: true,
    sidebarWidth: 280,
    showHUD: true,
    hudWidth: 320,
    terminalHeight: "100%",
    paneLayout: "single" as const,
  };

  // Keyboard shortcuts state
  const [showKeyboardHelp, setShowKeyboardHelp] = React.useState(false);

  // Determine panel mode based on layout
  const panelMode: PanelMode = layout.panelMode ?? "fixed";

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Check for modifier keys
      const hasCtrl = e.ctrlKey || e.metaKey;
      const hasShift = e.shiftKey;
      const hasAlt = e.altKey;

      // Show keyboard shortcuts help
      if (e.key === "?" && !hasCtrl && !hasShift && !hasAlt) {
        e.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Toggle left panel
      if (e.key === "[" && !hasCtrl && !hasShift && !hasAlt) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Toggle right panel
      if (e.key === "]" && !hasCtrl && !hasShift && !hasAlt) {
        e.preventDefault();
        toggleHUD();
        return;
      }

      // Toggle footer
      if (e.key === "f" && hasAlt && !hasCtrl && !hasShift) {
        e.preventDefault();
        toggleFooter();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidebar, toggleHUD, toggleFooter]);

  // Handle panel close callbacks
  const handleLeftPanelClose = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleRightPanelClose = useCallback(() => {
    toggleHUD();
  }, [toggleHUD]);

  // Render header (placeholder until AppHeader is created)
  const renderHeader = () => (
    <header
      className="h-16 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm flex-shrink-0 sticky top-0 z-30"
      data-testid="app-shell-header"
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Left section - Title & Icon */}
        <div className="flex items-center gap-3">
          {icon && <div className="text-purple-400">{icon}</div>}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            {badge && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                {badge}
              </span>
            )}
          </div>
        </div>

        {/* Right section - Actions */}
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </div>
    </header>
  );

  // Render footer
  const renderFooter = () => {
    if (!footerVisibleState) return null;

    if (footer) {
      return footer;
    }

    // Default footer using FooterPanel
    return (
      <FooterPanel
        sessionName={sessionName}
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={onToggleContext}
        onToggleGovernance={onToggleGovernance}
        contextVisible={contextVisible}
        governanceVisible={governanceVisible}
        isMobile={layout.isMobile}
      />
    );
  };

  return (
    <div
      className={`flex flex-col h-screen bg-gray-950 text-white overflow-hidden ${className}`}
      data-testid="app-shell"
    >
      {/* Header */}
      {renderHeader()}

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel */}
        {leftPanel && (
          <Panel
            side="left"
            mode={panelMode}
            visible={sidebarVisible}
            width={leftPanelWidth}
            onClose={panelMode === "overlay" ? handleLeftPanelClose : undefined}
            title={leftPanelTitle}
            className="h-full"
          >
            {leftPanel}
          </Panel>
        )}

        {/* Main Content Area */}
        <main
          className="flex-1 min-w-0 overflow-hidden bg-gray-950 flex flex-col"
          data-testid="app-shell-content"
        >
          {children}
        </main>

        {/* Right Panel */}
        {rightPanel && (
          <Panel
            side="right"
            mode={panelMode}
            visible={hudVisible}
            width={rightPanelWidth}
            onClose={panelMode === "overlay" ? handleRightPanelClose : undefined}
            title={rightPanelTitle}
            className="h-full"
          >
            {rightPanel}
          </Panel>
        )}
      </div>

      {/* Footer */}
      {renderFooter()}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        customShortcuts={customShortcuts}
      />
    </div>
  );
};

export default AppShell;

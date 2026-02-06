/**
 * AppShell Component
 * Unified full-width layout with resizable 3-column panels
 *
 * Layout Architecture (default 25% | 50% | 25%):
 * ┌─────────────────────────────────────────┐
 * │ AppHeader (unified, 64px)               │
 * ├────────┬─┬──────────────┬─┬─────────────┤
 * │ Left   │▐│   children   │▐│   Right     │
 * │ Panel  │▐│  (scrollable)│▐│   Panel     │
 * │  25%   │▐│     50%      │▐│    25%      │
 * ├────────┴─┴──────────────┴─┴─────────────┤
 * │ FooterPanel (optional)                  │
 * └─────────────────────────────────────────┘
 *
 * ▐ = drag-to-resize handles
 * Double-click handle to reset to defaults
 * Widths persist to localStorage
 */

import React, { useCallback, useEffect } from "react";
import { Panel, PanelMode } from "../infinity-terminal/Panel";
import { FooterPanel } from "../infinity-terminal/FooterPanel";
import { KeyboardShortcutsHelp, type KeyboardShortcut } from "../ui/KeyboardShortcutsHelp";
import type { OracleMessage } from "../infinity-terminal/OracleFeedMarquee";
import { useLayoutOptional } from "../../contexts/LayoutContext";
import { useResizablePanels } from "../../hooks/useResizablePanels";
import { logger } from "../../utils/browser-logger";

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
  overlayPanelWidth?: number;
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
 * Resize handle between panels - drag to resize, double-click to reset
 */
const ResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}> = ({ onMouseDown, onDoubleClick }) => (
  <div
    onMouseDown={onMouseDown}
    onDoubleClick={onDoubleClick}
    className="w-1.5 flex-shrink-0 cursor-col-resize group relative z-10"
    title="Drag to resize, double-click to reset"
  >
    {/* Wide invisible hit target */}
    <div className="absolute inset-y-0 -left-1 -right-1" />
    {/* Visible handle line */}
    <div className="w-full h-full bg-gray-800 group-hover:bg-purple-500/50 group-active:bg-purple-400 transition-colors" />
  </div>
);

/**
 * AppShell - Main layout compositor
 *
 * Responsibilities:
 * - Compose AppHeader, Panels, and content area
 * - Manage responsive layout state
 * - Handle keyboard shortcuts at shell level
 * - Coordinate panel visibility and modes
 * - Dispatch resize events for terminal compatibility
 * - Provide drag-to-resize handles between columns
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
  overlayPanelWidth = 320,
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
    logger.debug("Footer toggle requested");
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

  // Resizable panel widths (percentage-based, persisted to localStorage)
  const {
    leftWidth,
    rightWidth,
    containerRef,
    startLeftDrag,
    startRightDrag,
    isDragging,
    resetWidths,
  } = useResizablePanels();

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

  // Render header
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

  // Panel width: percentage for fixed mode, pixels for overlay mode
  const leftPanelW = panelMode === "overlay" ? overlayPanelWidth : `${leftWidth}%`;
  const rightPanelW = panelMode === "overlay" ? overlayPanelWidth : `${rightWidth}%`;

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 bg-gray-950 text-white overflow-hidden ${className}`}
      data-testid="app-shell"
    >
      {/* Header */}
      {renderHeader()}

      {/* Main Layout Area */}
      <div
        ref={containerRef}
        className={`flex flex-1 overflow-hidden relative ${isDragging ? "select-none" : ""}`}
      >
        {/* Left Panel */}
        {leftPanel && (
          <Panel
            side="left"
            mode={panelMode}
            visible={sidebarVisible}
            width={leftPanelW}
            onClose={panelMode === "overlay" ? handleLeftPanelClose : undefined}
            title={leftPanelTitle}
            className="h-full"
          >
            {leftPanel}
          </Panel>
        )}

        {/* Left Resize Handle */}
        {leftPanel && sidebarVisible && panelMode === "fixed" && (
          <ResizeHandle onMouseDown={startLeftDrag} onDoubleClick={resetWidths} />
        )}

        {/* Main Content Area */}
        <main
          className="flex-1 min-w-0 overflow-hidden bg-gray-950 flex flex-col"
          data-testid="app-shell-content"
        >
          {children}
        </main>

        {/* Right Resize Handle */}
        {rightPanel && hudVisible && panelMode === "fixed" && (
          <ResizeHandle onMouseDown={startRightDrag} onDoubleClick={resetWidths} />
        )}

        {/* Right Panel */}
        {rightPanel && (
          <Panel
            side="right"
            mode={panelMode}
            visible={hudVisible}
            width={rightPanelW}
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

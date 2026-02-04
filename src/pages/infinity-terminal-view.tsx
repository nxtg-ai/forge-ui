/**
 * Infinity Terminal View Page
 * Full-screen persistent terminal with Governance HUD
 *
 * Features:
 * - Persistent sessions via Zellij + ttyd
 * - Multi-device access
 * - Responsive layout (mobile/tablet/desktop)
 * - Integrated Governance HUD
 * - Unified AppShell layout integration
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import {
  Terminal,
  X,
  Keyboard,
  Infinity,
  RefreshCw,
  Maximize2,
  Minimize2,
  LayoutDashboard,
} from "lucide-react";

import {
  InfinityTerminal,
  SessionRestoreModal,
  ConnectionBadge,
} from "../components/infinity-terminal";
import type { SessionState } from "../components/infinity-terminal/InfinityTerminal";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import { GovernanceHUD } from "../components/governance";
import { ContextWindowHUD } from "../components/terminal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useToast } from "../components/feedback/ToastSystem";
import { AppShell } from "../components/layout";
import { useLayout } from "../contexts/LayoutContext";
import type { KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";

// Check for stored session
function getLastSession() {
  try {
    const stored = localStorage.getItem("infinity-terminal-sessions");
    if (!stored) return null;
    const sessions = JSON.parse(stored);
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  } catch {
    return null;
  }
}

interface InfinityTerminalViewProps {
  onNavigate?: (viewId: string) => void;
}

const InfinityTerminalView: React.FC<InfinityTerminalViewProps> = ({ onNavigate }) => {
  const { toast } = useToast();

  // Use centralized layout context for panel state
  const {
    contextPanelVisible,
    governancePanelVisible,
    footerVisible,
    toggleContextPanel,
    toggleGovernancePanel,
    layout,
  } = useLayout();

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [lastSession, setLastSession] =
    useState<ReturnType<typeof getLastSession>>(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Terminal control state (exposed from InfinityTerminal)
  const [terminalState, setTerminalState] = useState<SessionState | null>(null);
  const [reconnectFn, setReconnectFn] = useState<(() => void) | null>(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);

  // Mock oracle messages (will be replaced with real data from governance state)
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "System initialized successfully",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "success",
      message: "Governance state loaded",
      timestamp: new Date(),
    },
  ]);

  // Check for previous session on mount
  useEffect(() => {
    const session = getLastSession();
    if (session && !sessionRestored) {
      setLastSession(session);
      setShowRestoreModal(true);
    }
  }, [sessionRestored]);

  const handleSessionRestore = useCallback(
    (sessionId: string) => {
      toast.success(`Session restored: ${sessionId}`);
      setSessionRestored(true);
    },
    [toast],
  );

  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      if (connected) {
        toast.success("Connected to persistent session");
      }
    },
    [toast],
  );

  const handleRestoreClick = useCallback(() => {
    setShowRestoreModal(false);
    setSessionRestored(true);
  }, []);

  const handleNewSession = useCallback(() => {
    setShowRestoreModal(false);
    setSessionRestored(true);
    localStorage.removeItem("infinity-terminal-sessions");
  }, []);

  // Stable callback for reconnect ref
  const handleReconnectRef = useCallback((fn: () => void) => {
    setReconnectFn(() => fn);
  }, []);

  // Terminal-specific keyboard shortcuts (memoized to prevent re-renders)
  const terminalShortcuts: KeyboardShortcut[] = useMemo(() => [
    { key: "Ctrl+C", description: "Cancel command", category: "terminal" },
    { key: "Ctrl+L", description: "Clear terminal", category: "terminal" },
    { key: "Ctrl+O D", description: "Detach session (Zellij)", category: "terminal" },
    { key: "Alt+H/J/K/L", description: "Navigate panes (Zellij)", category: "terminal" },
    { key: "Ctrl+P N", description: "New pane (Zellij)", category: "terminal" },
    { key: "Ctrl+P X", description: "Close pane (Zellij)", category: "terminal" },
    { key: "↑ / ↓", description: "Command history", category: "terminal" },
  ], []);

  // Terminal header actions (connection status, controls)
  const terminalActions = (
    <>
      {/* Navigation back to dashboard */}
      {onNavigate && (
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-800 rounded transition-all text-gray-400 hover:text-white text-xs"
          title="Back to Dashboard"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
      )}

      <div className="w-px h-5 bg-gray-700" />

      {/* Connection Status */}
      {terminalState && <ConnectionBadge state={terminalState} />}

      {/* Reconnect Button */}
      <button
        onClick={() => reconnectFn?.()}
        className="p-1.5 hover:bg-gray-800 rounded transition-all"
        title="Reconnect"
        disabled={terminalState?.connecting}
      >
        <RefreshCw
          className={`w-4 h-4 text-gray-400 ${terminalState?.connecting ? "animate-spin" : ""}`}
        />
      </button>

      {/* Expand/Collapse */}
      <button
        onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
        className="p-1.5 hover:bg-gray-800 rounded transition-all"
        title={isTerminalExpanded ? "Minimize" : "Maximize"}
      >
        {isTerminalExpanded ? (
          <Minimize2 className="w-4 h-4 text-gray-400" />
        ) : (
          <Maximize2 className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </>
  );

  // Left Panel Content - Memory & Context
  const leftPanelContent = (
    <div className="h-full p-2 overflow-y-auto">
      <ContextWindowHUD className="h-full" />
    </div>
  );

  // Right Panel Content - Governance HUD
  const rightPanelContent = (
    <ErrorBoundary fallbackMessage="Governance HUD encountered an error.">
      <div className="h-full p-2 overflow-y-auto">
        <GovernanceHUD />
      </div>
    </ErrorBoundary>
  );

  return (
    <>
      <AppShell
        // Page identity
        title="Infinity Terminal"
        icon={
          <div className="relative">
            <Terminal className="w-6 h-6" />
            <Infinity className="w-3 h-3 text-cyan-400 absolute -bottom-1 -right-1" />
          </div>
        }
        badge="Persistent"
        // Header actions
        headerActions={terminalActions}
        // Left panel configuration - proportional to viewport
        leftPanel={leftPanelContent}
        showLeftPanel={contextPanelVisible}
        leftPanelWidth={layout.isMobile ? layout.width : Math.round(layout.width * 0.2)}
        leftPanelTitle="Memory & Context"
        // Right panel configuration - proportional to viewport
        rightPanel={rightPanelContent}
        showRightPanel={governancePanelVisible}
        rightPanelWidth={layout.isMobile ? layout.width : Math.round(layout.width * 0.2)}
        rightPanelTitle="Governance HUD"
        // Footer configuration
        showFooter={footerVisible}
        sessionName="nxtg-forge-v3"
        isConnected={true}
        oracleMessages={oracleMessages}
        onToggleContext={toggleContextPanel}
        onToggleGovernance={toggleGovernancePanel}
        contextVisible={contextPanelVisible}
        governanceVisible={governancePanelVisible}
        // Keyboard shortcuts
        customShortcuts={terminalShortcuts}
      >
        {/* Terminal Content */}
        <div className="flex-1 min-h-0 bg-black flex flex-col" data-testid="infinity-terminal-view">
          <InfinityTerminal
            projectName="nxtg-forge-v3"
            layout="default"
            onSessionRestore={handleSessionRestore}
            onConnectionChange={handleConnectionChange}
            className="flex-1 min-h-0"
            showHeader={false}
            isExpanded={isTerminalExpanded}
            onExpandedChange={setIsTerminalExpanded}
            onReconnectRef={handleReconnectRef}
            onSessionStateChange={setTerminalState}
          />
        </div>
      </AppShell>

      {/* Session Restore Modal */}
      {showRestoreModal && lastSession && (
        <SessionRestoreModal
          session={lastSession}
          onRestore={handleRestoreClick}
          onNewSession={handleNewSession}
          onClose={() => setShowRestoreModal(false)}
        />
      )}
    </>
  );
};

export default InfinityTerminalView;

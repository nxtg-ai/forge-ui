/**
 * Infinity Terminal View Page
 * Full-screen persistent terminal with Governance HUD
 *
 * Features:
 * - Persistent sessions via Zellij + ttyd
 * - Multi-device access
 * - Responsive layout (mobile/tablet/desktop)
 * - Integrated Governance HUD
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Info,
  X,
  Layout,
  Keyboard,
  Settings,
  Infinity,
  Brain,
} from "lucide-react";

import {
  InfinityTerminal,
  InfinityTerminalLayout,
  SessionRestoreModal,
  useResponsiveLayout,
} from "../components/infinity-terminal";
import { Panel } from "../components/infinity-terminal/Panel";
import { FooterPanel } from "../components/infinity-terminal/FooterPanel";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import { GovernanceHUD } from "../components/governance";
import { ContextWindowHUD } from "../components/terminal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useToast } from "../components/feedback/ToastSystem";

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

const InfinityTerminalView: React.FC = () => {
  const { toast } = useToast();
  const {
    layout,
    hudVisible,
    contextPanelVisible,
    footerVisible,
    toggleHUD,
    toggleContextPanel,
  } = useResponsiveLayout();

  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [lastSession, setLastSession] =
    useState<ReturnType<typeof getLastSession>>(null);
  const [sessionRestored, setSessionRestored] = useState(false);

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

  return (
    <div
      className="h-screen bg-gray-950 text-white flex flex-col"
      data-testid="infinity-terminal-view"
    >
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex-shrink-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="w-6 h-6 text-purple-400" />
                <Infinity className="w-3 h-3 text-cyan-400 absolute -bottom-1 -right-1" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Infinity Terminal
              </h1>
              <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                Persistent
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Keyboard Shortcuts */}
              <button
                onClick={() => setShowHelpOverlay(!showHelpOverlay)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  showHelpOverlay
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
                title="Keyboard shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Left Panel - Memory & Context */}
        <Panel
          side="left"
          mode={layout.panelMode}
          visible={contextPanelVisible}
          width={320}
          onClose={toggleContextPanel}
          title="Memory & Context"
        >
          <div className="h-full p-4">
            <ContextWindowHUD className="h-full" />
          </div>
        </Panel>

        {/* Terminal */}
        <main className="flex-1 min-w-0 bg-black">
          <InfinityTerminal
            projectName="nxtg-forge-v3"
            layout="default"
            onSessionRestore={handleSessionRestore}
            onConnectionChange={handleConnectionChange}
            className="h-full"
          />
        </main>

        {/* Right Panel - Governance HUD */}
        <Panel
          side="right"
          mode={layout.panelMode}
          visible={hudVisible}
          width={320}
          onClose={toggleHUD}
          title="Governance HUD"
        >
          <ErrorBoundary fallbackMessage="Governance HUD encountered an error.">
            <div className="h-full p-4">
              <GovernanceHUD />
            </div>
          </ErrorBoundary>
        </Panel>
      </div>

      {/* Footer Panel */}
      {footerVisible && (
        <FooterPanel
          sessionName="nxtg-forge-v3"
          isConnected={true}
          oracleMessages={oracleMessages}
          onToggleContext={toggleContextPanel}
          onToggleGovernance={toggleHUD}
          contextVisible={contextPanelVisible}
          governanceVisible={hudVisible}
          isMobile={layout.isMobile}
        />
      )}

      {/* Help Overlay */}
      <AnimatePresence>
        {showHelpOverlay && (
          <HelpOverlay onClose={() => setShowHelpOverlay(false)} />
        )}
      </AnimatePresence>

      {/* Session Restore Modal */}
      {showRestoreModal && lastSession && (
        <SessionRestoreModal
          session={lastSession}
          onRestore={handleRestoreClick}
          onNewSession={handleNewSession}
          onClose={() => setShowRestoreModal(false)}
        />
      )}
    </div>
  );
};

// Help overlay with keyboard shortcuts
const HelpOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const shortcuts = [
    { key: "Ctrl+C", description: "Cancel command" },
    { key: "Ctrl+L", description: "Clear terminal" },
    { key: "Ctrl+O D", description: "Detach session (Zellij)" },
    { key: "Alt+H/J/K/L", description: "Navigate panes (Zellij)" },
    { key: "Ctrl+P N", description: "New pane (Zellij)" },
    { key: "Ctrl+P X", description: "Close pane (Zellij)" },
    { key: "↑ / ↓", description: "Command history" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-400" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
            >
              <span className="text-gray-300">{description}</span>
              <kbd className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-400 font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Sessions persist even after closing the browser. Reattach anytime
            with:
          </p>
          <code className="block mt-2 px-3 py-2 bg-gray-800 rounded text-sm text-cyan-400 font-mono">
            zellij attach forge-nxtg-forge-v3
          </code>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InfinityTerminalView;

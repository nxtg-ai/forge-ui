/**
 * Infinity Terminal Component
 * Persistent terminal sessions via Zellij + ttyd
 *
 * Features:
 * - Session persistence across browser refreshes
 * - Multi-device access to same session
 * - Auto-reconnection with exponential backoff
 * - Connection status indicators
 */

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  Settings,
  History,
} from "lucide-react";

import {
  useSessionPersistence,
  SessionState,
} from "./hooks/useSessionPersistence";

interface InfinityTerminalProps {
  projectName?: string;
  layout?: string;
  ttydPort?: number;
  ttydHost?: string;
  className?: string;
  onSessionRestore?: (sessionId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  /** Hide the built-in header (for when page provides its own header) */
  showHeader?: boolean;
  /** Controlled expanded state */
  isExpanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Callback to expose reconnect function to parent */
  onReconnectRef?: (reconnect: () => void) => void;
  /** Callback to expose session state to parent */
  onSessionStateChange?: (state: SessionState) => void;
}

export const InfinityTerminal: React.FC<InfinityTerminalProps> = ({
  projectName = "nxtg-forge",
  layout = "default",
  // Use current port (5050 in dev) - Vite proxies /terminal to API server
  ttydPort = typeof window !== 'undefined' ? parseInt(window.location.port) || 5050 : 5050,
  ttydHost = typeof window !== 'undefined' ? window.location.hostname : "localhost",
  className = "",
  onSessionRestore,
  onConnectionChange,
  showHeader = true,
  isExpanded: controlledExpanded,
  onExpandedChange,
  onReconnectRef,
  onSessionStateChange,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);
  const wsListenerAttached = useRef(false);

  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setIsExpanded = onExpandedChange || setInternalExpanded;
  const [showSessionHistory, setShowSessionHistory] = useState(false);

  // Store callbacks in refs to avoid dependency issues causing infinite loops
  const onReconnectRefCallback = useRef(onReconnectRef);
  const onSessionStateChangeRef = useRef(onSessionStateChange);
  const onConnectionChangeRef = useRef(onConnectionChange);
  useEffect(() => {
    onReconnectRefCallback.current = onReconnectRef;
    onSessionStateChangeRef.current = onSessionStateChange;
    onConnectionChangeRef.current = onConnectionChange;
  });

  const {
    state: sessionState,
    connect,
    disconnect,
    resetReconnect,
    restoreSession,
    getAvailableSessions,
    getWebSocket,
    getTtydUrl,
  } = useSessionPersistence({
    projectName,
    layout,
    config: { wsPort: ttydPort, wsHost: ttydHost },
    onSessionRestore,
    onConnectionChange,
  });

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
      scrollback: 5000,
      theme: {
        background: "#0a0a0a",
        foreground: "#e5e7eb",
        cursor: "#818cf8",
        cursorAccent: "#1e1b4b",
        selectionBackground: "#3730a3",
        black: "#1e1b4b",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e5e7eb",
        brightBlack: "#374151",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#f3f4f6",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Defer initial fit to next frame so the browser has laid out the container
    requestAnimationFrame(() => fitAddon.fit());

    // Minimal status - UI chrome shows identity + connection badges
    term.writeln("\x1b[90m● Connecting...\x1b[0m");

    // Handle resize with both window events and ResizeObserver for panel toggles
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener("resize", handleResize);

    // Watch terminal container for size changes (e.g., when panels toggle)
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        fitAddon.fit();
      });
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // Connect to ttyd when terminal is ready.
  // Deferred via setTimeout so React StrictMode's unmount/remount cycle
  // can cancel the first attempt before a WebSocket is created, avoiding
  // a wasted connection that Firefox logs as "interrupted while loading."
  useEffect(() => {
    if (!xtermRef.current || !initializedRef.current) return;

    const timer = setTimeout(() => connect(), 0);
    return () => clearTimeout(timer);
  }, [connect]);

  // Connect terminal to WebSocket with JSON protocol
  useEffect(() => {
    const ws = getWebSocket();
    const term = xtermRef.current;

    if (!ws || !term || ws.readyState !== WebSocket.OPEN) return;
    if (wsListenerAttached.current) return;

    wsListenerAttached.current = true;

    // Handle incoming messages from PTY bridge
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case "output":
            term.write(message.data);
            break;
          case "session":
            // Session info from backend — clear "Connecting..." line
            term.write("\x1b[1A\x1b[2K");
            if (message.restored) {
              // Restored session — scrollback replay follows automatically
              term.writeln(`\x1b[32m● Session restored\x1b[0m`);
            } else {
              term.writeln(`\x1b[32m● Session: ${sessionState.sessionName}\x1b[0m`);
              term.writeln("");
            }
            break;
          case "cost":
            // Could display cost info if needed
            break;
        }
      } catch (err) {
        // If not JSON, write raw data (fallback)
        if (typeof event.data === "string") {
          term.write(event.data);
        }
      }
    };

    // Send terminal input as JSON
    const handleData = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Send resize events as JSON
    const handleResize = term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    ws.addEventListener("message", handleMessage);

    // Send initial resize
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
      );
      // Signal backend that message handler is attached — safe to send scrollback
      ws.send(JSON.stringify({ type: "ready" }));
    }

    // Fit after connection
    fitAddonRef.current?.fit();

    return () => {
      ws.removeEventListener("message", handleMessage);
      handleData.dispose();
      handleResize.dispose();
      wsListenerAttached.current = false;
    };
  }, [sessionState.connected, getWebSocket, sessionState.sessionName]);

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
      if (xtermRef.current) {
        xtermRef.current.writeln("\x1b[33m⟳ Reconnecting...\x1b[0m");
      }
    }, 500);
  }, [connect, disconnect]);

  // Expose reconnect function to parent (using ref to avoid infinite loops)
  useEffect(() => {
    onReconnectRefCallback.current?.(handleReconnect);
  }, [handleReconnect]);

  // Expose session state to parent (using ref to avoid infinite loops)
  useEffect(() => {
    onSessionStateChangeRef.current?.(sessionState);
  }, [sessionState]);

  // Handle session restore
  const handleRestoreSession = useCallback(
    (sessionName: string) => {
      setShowSessionHistory(false);
      restoreSession(sessionName);
      if (xtermRef.current) {
        xtermRef.current.writeln(
          `\x1b[33m⟳ Restoring session: ${sessionName}\x1b[0m`,
        );
      }
    },
    [restoreSession],
  );

  const availableSessions = getAvailableSessions();

  return (
    <div
      className={`flex flex-col ${isExpanded ? "fixed inset-4 z-50" : "relative"} ${className}`}
      data-testid="infinity-terminal"
    >
      {/* Header (optional - can be hidden when page provides its own) */}
      {showHeader && (
        <div data-testid="infinity-terminal-header" className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-sm">Infinity Terminal</span>

            {/* Connection Status */}
            <ConnectionBadge state={sessionState} />

            {/* Session Name */}
            {sessionState.sessionName && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">
                <Cloud className="w-3 h-3" />
                <span className="font-mono">{sessionState.sessionName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Session History */}
            {availableSessions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  className="p-1.5 hover:bg-gray-800 rounded transition-all"
                  title="Session history"
                >
                  <History className="w-4 h-4 text-gray-400" />
                </button>

                {showSessionHistory && (
                  <SessionHistoryDropdown
                    sessions={availableSessions}
                    currentSession={sessionState.sessionName}
                    onSelect={handleRestoreSession}
                    onClose={() => setShowSessionHistory(false)}
                  />
                )}
              </div>
            )}

            {/* Reconnect Button */}
            <button
              onClick={handleReconnect}
              className="p-1.5 hover:bg-gray-800 rounded transition-all"
              title="Reconnect"
              disabled={sessionState.connecting}
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-400 ${sessionState.connecting ? "animate-spin" : ""}`}
              />
            </button>

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-800 rounded transition-all"
              title={isExpanded ? "Minimize" : "Maximize"}
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 w-full min-w-0 min-h-0 bg-[#0a0a0a] p-2 overflow-hidden"
        data-testid="infinity-terminal-container"
      />

      {/* Error Banner */}
      {sessionState.error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 text-red-400 text-sm flex items-center justify-between">
          <span>{sessionState.error}</span>
          <button
            onClick={() => {
              resetReconnect();
              connect();
            }}
            className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// Connection status badge
const ConnectionBadge: React.FC<{ state: SessionState }> = ({ state }) => {
  const { connected, connecting, reconnectAttempts } = state;

  if (connecting) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Connecting{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ""}
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
        <Wifi className="w-3 h-3" />
        Live
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
      <WifiOff className="w-3 h-3" />
      Disconnected
    </div>
  );
};

// Session history dropdown
interface StoredSession {
  sessionId: string;
  sessionName: string;
  layout: string;
  projectRoot: string;
  createdAt: string;
  lastAccess: string;
}

interface SessionHistoryDropdownProps {
  sessions: StoredSession[];
  currentSession: string;
  onSelect: (sessionName: string) => void;
  onClose: () => void;
}

const SessionHistoryDropdown: React.FC<SessionHistoryDropdownProps> = ({
  sessions,
  currentSession,
  onSelect,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
        <div className="px-3 py-2 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">Recent Sessions</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => onSelect(session.sessionName)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-800 transition-colors ${
                session.sessionName === currentSession ? "bg-purple-500/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gray-300">
                  {session.sessionName}
                </span>
                {session.sessionName === currentSession && (
                  <span className="text-xs text-purple-400">Active</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>Layout: {session.layout}</span>
                <span>•</span>
                <span>{formatRelativeTime(new Date(session.lastAccess))}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Export ConnectionBadge for use in page headers
export { ConnectionBadge };

// Re-export SessionState type
export type { SessionState };

export default InfinityTerminal;

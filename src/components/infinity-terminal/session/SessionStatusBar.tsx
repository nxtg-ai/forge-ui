/**
 * Session Status Bar Component
 * Displays session info and quick actions for mobile/tablet views
 */

import React from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { SessionState } from "../hooks/useSessionPersistence";

interface SessionStatusBarProps {
  state: SessionState;
  onReconnect: () => void;
  onShowHistory?: () => void;
  compact?: boolean;
}

export const SessionStatusBar: React.FC<SessionStatusBarProps> = ({
  state,
  onReconnect,
  onShowHistory,
  compact = false,
}) => {
  const {
    sessionName,
    connected,
    connecting,
    reconnectAttempts,
    lastActivity,
  } = state;

  return (
    <div
      className={`flex items-center justify-between px-3 ${compact ? "py-1.5" : "py-2"} bg-gray-900/95 backdrop-blur-sm border-b border-gray-800`}
      data-testid="session-status-bar"
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Connection Status Indicator */}
        <div
          className={`flex-shrink-0 w-2 h-2 rounded-full ${
            connected
              ? "bg-green-500"
              : connecting
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
          }`}
        />

        {/* Session Name */}
        <button
          onClick={onShowHistory}
          className="flex items-center gap-1 text-sm text-gray-300 truncate hover:text-white transition-colors"
        >
          {connected ? (
            <Cloud className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          )}
          <span className="font-mono truncate">
            {sessionName || "No session"}
          </span>
          {onShowHistory && (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection Status Text */}
        <span
          className={`text-xs ${connected ? "text-green-400" : connecting ? "text-yellow-400" : "text-red-400"}`}
        >
          {connected
            ? "Connected"
            : connecting
              ? `Reconnecting${reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ""}...`
              : "Disconnected"}
        </span>

        {/* Reconnect Button */}
        <button
          onClick={onReconnect}
          disabled={connecting}
          className="p-1 hover:bg-gray-800 rounded transition-all disabled:opacity-50"
          title="Reconnect"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-gray-400 ${connecting ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
};

export default SessionStatusBar;

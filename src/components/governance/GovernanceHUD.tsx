import React, { useState, useEffect, useRef } from "react";
import type { GovernanceState } from "../../types/governance.types";
import { ConstitutionCard } from "./ConstitutionCard";
import { ImpactMatrix } from "./ImpactMatrix";
import { OracleFeed } from "./OracleFeed";
import { StrategicAdvisor } from "./StrategicAdvisor";
import { WorkerPoolMetrics } from "./WorkerPoolMetrics";
import { AgentActivityFeed } from "./AgentActivityFeed";

interface GovernanceHUDProps {
  className?: string;
}

export const GovernanceHUD: React.FC<GovernanceHUDProps> = ({ className }) => {
  const [state, setState] = useState<GovernanceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "fallback">("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Fetch state from API
  const fetchState = async () => {
    try {
      const res = await fetch("/api/governance/state");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", res.status, errorText);
        throw new Error(`API returned ${res.status}: ${errorText}`);
      }

      const response = await res.json();

      // API wraps response in { success, data, timestamp }
      if (response.data) {
        setState(response.data);
        setError(null);
      } else {
        throw new Error("Invalid response structure - missing data property");
      }
    } catch (err) {
      console.error("Governance fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Setup WebSocket connection
  const connectWebSocket = () => {
    if (!isMountedRef.current) return;

    // Maximum 5 reconnection attempts before falling back to polling
    if (reconnectAttemptsRef.current >= 5) {
      console.log("[Governance] Max reconnect attempts reached, falling back to polling");
      setConnectionStatus("fallback");
      enableFallbackPolling();
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }

        console.log("[Governance] WebSocket connected");
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionStatus("connected");
        setError(null);

        // Clear fallback polling if it was active
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message = JSON.parse(event.data);

          // Listen for governance.update events
          if (message.type === "governance.update") {
            console.log("[Governance] Real-time update received");
            setState(message.payload);
            setError(null);
          }
        } catch (err) {
          console.error("[Governance] Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;

        console.log("[Governance] WebSocket disconnected");
        setIsConnected(false);
        setConnectionStatus("disconnected");
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setConnectionStatus("connecting");
            connectWebSocket();
          }
        }, delay);
      };

      ws.onerror = (err) => {
        console.error("[Governance] WebSocket error:", err);
        // onclose will handle reconnection
      };
    } catch (err) {
      console.error("[Governance] Failed to create WebSocket:", err);
      setConnectionStatus("fallback");
      enableFallbackPolling();
    }
  };

  // Enable fallback polling when WebSocket fails
  const enableFallbackPolling = () => {
    if (fallbackIntervalRef.current) return; // Already polling

    console.log("[Governance] Enabling fallback polling");
    fallbackIntervalRef.current = setInterval(fetchState, 5000); // Poll every 5 seconds
  };

  // Initial setup
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch initial state
    fetchState();

    // Wait a bit before connecting WebSocket to allow API server to start
    const initialConnectTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        connectWebSocket();
      }
    }, 500);

    // Cleanup
    return () => {
      isMountedRef.current = false;

      // Clear timeouts
      clearTimeout(initialConnectTimeout);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!state) {
    return null;
  }

  return (
    <div
      className={`h-full w-full bg-gray-950/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-2xl flex flex-col overflow-hidden ${className || ""}`}
      data-testid="governance-hud-container"
    >
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Governance HUD</h2>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500 animate-pulse"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : connectionStatus === "fallback"
                  ? "bg-blue-500"
                  : "bg-gray-500"
              }`}
              title={
                connectionStatus === "connected"
                  ? "Real-time updates active"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : connectionStatus === "fallback"
                  ? "Polling mode (5s)"
                  : "Disconnected"
              }
            />
            <span className="text-xs text-gray-500">
              {connectionStatus === "connected"
                ? "Live"
                : connectionStatus === "fallback"
                ? "Polling"
                : connectionStatus === "connecting"
                ? "Connecting"
                : "Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 p-2">
        <StrategicAdvisor state={state} />
        <ConstitutionCard constitution={state.constitution} />
        <WorkerPoolMetrics />
        <ImpactMatrix workstreams={state.workstreams} />
        <AgentActivityFeed maxEntries={15} />
        <OracleFeed logs={state.sentinelLog} />
      </div>
    </div>
  );
};

// Helper components - memoized to prevent unnecessary re-renders
const LoadingState: React.FC = React.memo(() => (
  <div
    className="h-full w-full bg-gray-950/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl flex items-center justify-center"
    data-testid="governance-hud-loading"
  >
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-500">Loading governance...</p>
    </div>
  </div>
));
LoadingState.displayName = "LoadingState";

const ErrorState: React.FC<{ message: string }> = React.memo(({ message }) => (
  <div
    className="h-full w-full bg-gray-950/95 backdrop-blur-sm border border-red-500/20 rounded-xl shadow-2xl flex items-center justify-center"
    data-testid="governance-hud-error"
  >
    <div className="text-center p-4">
      <p className="text-sm text-red-400 mb-2">Failed to load governance</p>
      <p className="text-xs text-gray-500">{message}</p>
    </div>
  </div>
));
ErrorState.displayName = "ErrorState";

export default GovernanceHUD;

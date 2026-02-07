import React, { useState, useEffect, useRef } from "react";
import type { GovernanceState } from "../../types/governance.types";
import { ConstitutionCard } from "./ConstitutionCard";
import { ImpactMatrix } from "./ImpactMatrix";
import { OracleFeed } from "./OracleFeed";
import { StrategicAdvisor } from "./StrategicAdvisor";
import { WorkerPoolMetrics } from "./WorkerPoolMetrics";
import { ProjectContextCard } from "./ProjectContextCard";
import { AgentActivityFeed } from "./AgentActivityFeed";
import { MemoryInsightsCard } from "./MemoryInsightsCard";
import { BlockingDecisionsCard } from "./BlockingDecisionsCard";
import { wsManager, type ConnectionStatus } from "../../services/ws-manager";
import { logger } from "../../utils/browser-logger";
import { apiFetch } from "../../utils/api-fetch";

interface GovernanceHUDProps {
  className?: string;
}

export const GovernanceHUD: React.FC<GovernanceHUDProps> = ({ className }) => {
  const [state, setState] = useState<GovernanceState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "fallback"
  >("connecting");

  const isMountedRef = useRef(true);

  // Fetch state from API
  const fetchState = async () => {
    try {
      const res = await apiFetch("/api/governance/state");
      if (!res.ok) {
        const errorText = await res.text();
        logger.warn("Governance API Error:", res.status, errorText);
        throw new Error(`API returned ${res.status}: ${errorText}`);
      }

      const response = await res.json();

      if (response.data) {
        setState(response.data);
        setError(null);
      } else {
        throw new Error("Invalid response structure - missing data property");
      }
    } catch (err) {
      logger.warn("Governance fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial setup: HTTP fetch + wsManager subscription
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch initial state
    fetchState();

    // Subscribe to governance updates via shared wsManager
    const unsubMessage = wsManager.subscribe(
      "governance.update",
      (data: any) => {
        if (!isMountedRef.current) return;
        if (data) {
          setState(data);
          setError(null);
        }
      },
    );

    // Track connection status from wsManager
    const unsubState = wsManager.onStateChange((wsState) => {
      if (!isMountedRef.current) return;

      if (wsState.status === "connected") {
        setConnectionStatus("connected");
      } else if (
        wsState.status === "disconnected" &&
        wsState.reconnectAttempt >= 5
      ) {
        setConnectionStatus("fallback");
      } else if (wsState.status === "reconnecting") {
        setConnectionStatus("connecting");
      } else {
        setConnectionStatus("disconnected");
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubMessage();
      unsubState();
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
        <ProjectContextCard />
        <StrategicAdvisor state={state} />
        <ConstitutionCard constitution={state.constitution} />
        <WorkerPoolMetrics />
        <ImpactMatrix workstreams={state.workstreams} />
        <BlockingDecisionsCard />
        <MemoryInsightsCard />
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

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/governance/state");
        if (!res.ok) {
          const errorText = await res.text();
          console.error("API Error:", res.status, errorText);
          throw new Error(`API returned ${res.status}: ${errorText}`);
        }

        const text = await res.text();
        console.log("API Response (raw):", text.substring(0, 100));

        const response = JSON.parse(text);
        console.log("API Response (parsed):", response);

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

    // Initial fetch
    fetchState();

    // Poll every 2 seconds
    const interval = setInterval(fetchState, 2000);

    return () => clearInterval(interval);
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
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
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

// Helper components
const LoadingState: React.FC = () => (
  <div
    className="h-full w-full bg-gray-950/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl flex items-center justify-center"
    data-testid="governance-hud-loading"
  >
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-500">Loading governance...</p>
    </div>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="h-full w-full bg-gray-950/95 backdrop-blur-sm border border-red-500/20 rounded-xl shadow-2xl flex items-center justify-center"
    data-testid="governance-hud-error"
  >
    <div className="text-center p-4">
      <p className="text-sm text-red-400 mb-2">Failed to load governance</p>
      <p className="text-xs text-gray-500">{message}</p>
    </div>
  </div>
);

export default GovernanceHUD;

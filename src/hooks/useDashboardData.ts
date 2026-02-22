/**
 * useDashboardData Hook
 * Fetches real data from API server with auto-refresh.
 * WebSocket updates come through the shared wsManager singleton.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ProjectState, Agent, Blocker, Decision } from "../components/types";
import type { ForgeStatus } from "../services/status-service";
import { wsManager } from "../services/ws-manager";
import { logger } from "../utils/browser-logger";
import { apiFetch } from "../utils/api-fetch";

// API base URL helper
const getApiBase = () => {
  if (import.meta.env?.DEV) return "";
  return `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:5051`;
};

/**
 * Vision data structure from API
 */
export interface VisionData {
  mission: string;
  goals: string[];
  constraints: string[];
  successMetrics: string[];
  timeframe: string;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  projectState: {
    phase: string;
    progress: number;
    blockers: Blocker[];
    recentDecisions: Decision[];
    activeAgents: Agent[];
    healthScore: number;
  };
  visionData: {
    mission: string;
    goals: string[];
    constraints: string[];
    successMetrics: string[];
    timeframe: string;
  };
  forgeStatus: ForgeStatus | null;
  agents: Agent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Default/fallback data for graceful degradation
 */
const DEFAULT_VISION: VisionData = {
  mission: "Building innovative solutions",
  goals: [],
  constraints: [],
  successMetrics: [],
  timeframe: "Ongoing",
};

const DEFAULT_PROJECT_STATE: DashboardData["projectState"] = {
  phase: "planning",
  progress: 0,
  blockers: [],
  recentDecisions: [],
  activeAgents: [],
  healthScore: 0,
};

/**
 * Hook for fetching and managing live dashboard data
 */
export function useDashboardData(): DashboardData {
  const [projectState, setProjectState] =
    useState<DashboardData["projectState"]>(DEFAULT_PROJECT_STATE);
  const [visionData, setVisionData] = useState<VisionData>(DEFAULT_VISION);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch data from a single endpoint with error handling
   */
  const fetchEndpoint = async <T,>(
    endpoint: string,
    fallback: T,
  ): Promise<T> => {
    try {
      const response = await apiFetch(`${getApiBase()}${endpoint}`);
      if (!response.ok) {
        logger.debug(`[Dashboard] ${endpoint} returned ${response.status}`);
        return fallback;
      }
      const json = await response.json();
      return json.data || json;
    } catch (err) {
      logger.debug(`[Dashboard] Failed to fetch ${endpoint}:`, err);
      return fallback;
    }
  };

  /**
   * Calculate health score from forge status data
   */
  const calculateHealthScore = (status: ForgeStatus | null): number => {
    if (!status) return 0;

    let score = 100;

    if (status.git?.hasUncommitted) score -= 5;
    if (status.git?.modified > 0) score -= 3;
    if (status.git?.untracked > 5) score -= 5;

    if (status.tests) {
      const testsPassing = status.tests.passing || 0;
      const totalTests = status.tests.total || 0;
      if (totalTests > 0) {
        const passRate = (testsPassing / totalTests) * 100;
        if (passRate < 80) score -= 20;
        else if (passRate < 90) score -= 10;
      }
    }

    if (status.build?.status === "error") {
      score -= 15;
    }

    if (status.governance) {
      if (status.governance.status === "blocked") score -= 20;
      if (status.governance.workstreamsBlocked > 0) {
        score -= Math.min(status.governance.workstreamsBlocked * 5, 15);
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  /**
   * Fetch all dashboard data via HTTP
   */
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [forgeStatusData, visionDataRaw, stateData, agentsData] =
        await Promise.all([
          fetchEndpoint<ForgeStatus | null>("/api/forge/status", null),
          fetchEndpoint<VisionData>("/api/vision", DEFAULT_VISION),
          fetchEndpoint<Partial<ProjectState> | null>("/api/state", null),
          fetchEndpoint<Agent[]>("/api/agents/active", []),
        ]);

      setForgeStatus(forgeStatusData);

      setVisionData({
        mission: visionDataRaw.mission || DEFAULT_VISION.mission,
        goals: Array.isArray(visionDataRaw.goals)
          ? visionDataRaw.goals.map((g: string | { title?: string; description?: string }) =>
              typeof g === "string" ? g : g.title || g.description || "",
            )
          : [],
        constraints: Array.isArray(visionDataRaw.constraints)
          ? visionDataRaw.constraints
          : [],
        successMetrics: Array.isArray(visionDataRaw.successMetrics)
          ? visionDataRaw.successMetrics.map((m: string | { name?: string }) =>
              typeof m === "string" ? m : m.name || "",
            )
          : [],
        timeframe: visionDataRaw.timeframe || DEFAULT_VISION.timeframe,
      });

      if (stateData) {
        setProjectState({
          phase: stateData.phase || "planning",
          progress: stateData.progress || 0,
          blockers: stateData.blockers || [],
          recentDecisions: stateData.recentDecisions || [],
          activeAgents: agentsData || [],
          healthScore: calculateHealthScore(forgeStatusData),
        });
      } else {
        setProjectState({
          ...DEFAULT_PROJECT_STATE,
          activeAgents: agentsData || [],
          healthScore: calculateHealthScore(forgeStatusData),
        });
      }

      setAgents(agentsData || []);
      setLoading(false);
    } catch (err) {
      logger.error("[Dashboard] Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data",
      );
      setLoading(false);
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Initialize on mount: HTTP fetch + wsManager subscriptions
   */
  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Subscribe to real-time updates via shared wsManager
    const unsubs = [
      wsManager.subscribe("state.update", (data: Partial<ProjectState> | null) => {
        if (data) {
          setProjectState((prev) => ({
            ...prev,
            phase: data.phase || prev.phase,
            progress: data.progress ?? prev.progress,
            blockers: data.blockers || prev.blockers,
            recentDecisions: data.recentDecisions || prev.recentDecisions,
          }));
        }
      }),

      wsManager.subscribe("agent.activity", () => {
        // Refresh agents from API on activity events
        fetchEndpoint<Agent[]>("/api/agents/active", []).then((data) => {
          setAgents(data);
          setProjectState((prev) => ({ ...prev, activeAgents: data }));
        });
      }),

      wsManager.subscribe("vision.change", (data: Partial<VisionData> | null) => {
        if (data) {
          setVisionData((prev) => ({
            mission: data.mission || prev.mission,
            goals: data.goals || prev.goals,
            constraints: data.constraints || prev.constraints,
            successMetrics: data.successMetrics || prev.successMetrics,
            timeframe: data.timeframe || prev.timeframe,
          }));
        }
      }),

      // Re-fetch all data when runspace changes
      wsManager.subscribe("runspace.activated", () => {
        fetchData();
      }),
    ];

    // Auto-refresh every 30 seconds as fallback
    refreshIntervalRef.current = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      unsubs.forEach((unsub) => unsub());
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchData]);

  return {
    projectState,
    visionData,
    forgeStatus,
    agents,
    loading,
    error,
    refresh,
  };
}

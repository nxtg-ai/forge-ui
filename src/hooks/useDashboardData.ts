/**
 * useDashboardData Hook
 * Comprehensive data fetching hook for the live dashboard
 * Fetches real data from API server with auto-refresh and WebSocket updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ProjectState, Agent } from "../components/types";
import type { ForgeStatus } from "../services/status-service";

// API base URL helper (same pattern as diff-service.ts)
const getApiBase = () => {
  // @ts-ignore - import.meta.env exists in Vite
  if (import.meta.env?.DEV) return "";
  return `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:5051`;
};

// WebSocket URL helper
const getWsUrl = () => {
  // @ts-ignore
  if (import.meta.env.VITE_WS_URL) {
    // @ts-ignore
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://localhost:5051/ws";
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
    blockers: any[];
    recentDecisions: any[];
    activeAgents: any[];
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
  agents: any[];
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
  const [projectState, setProjectState] = useState<DashboardData["projectState"]>(DEFAULT_PROJECT_STATE);
  const [visionData, setVisionData] = useState<VisionData>(DEFAULT_VISION);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  /**
   * Fetch data from a single endpoint with error handling
   */
  const fetchEndpoint = async <T,>(
    endpoint: string,
    fallback: T,
  ): Promise<T> => {
    try {
      const response = await fetch(`${getApiBase()}${endpoint}`);
      if (!response.ok) {
        console.warn(`[Dashboard] ${endpoint} returned ${response.status}`);
        return fallback;
      }
      const json = await response.json();
      return json.data || json;
    } catch (err) {
      console.warn(`[Dashboard] Failed to fetch ${endpoint}:`, err);
      return fallback;
    }
  };

  /**
   * Calculate health score from forge status data
   */
  const calculateHealthScore = (status: ForgeStatus | null): number => {
    if (!status) return 0;

    let score = 100;

    // Git status impact
    if (status.git?.hasUncommitted) score -= 5;
    if (status.git?.modified > 0) score -= 3;
    if (status.git?.untracked > 5) score -= 5;

    // Test impact
    if (status.tests) {
      const testsPassing = status.tests.passing || 0;
      const totalTests = status.tests.total || 0;
      if (totalTests > 0) {
        const passRate = (testsPassing / totalTests) * 100;
        if (passRate < 80) score -= 20;
        else if (passRate < 90) score -= 10;
      }
    }

    // Build status impact
    if (status.build?.status === "error") {
      score -= 15;
    }

    // Governance impact
    if (status.governance) {
      if (status.governance.status === "blocked") score -= 20;
      if (status.governance.workstreamsBlocked > 0) {
        score -= Math.min(status.governance.workstreamsBlocked * 5, 15);
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  /**
   * Fetch all dashboard data
   */
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch all endpoints in parallel
      const [forgeStatusData, visionDataRaw, stateData, agentsData] = await Promise.all([
        fetchEndpoint<ForgeStatus | null>("/api/forge/status", null),
        fetchEndpoint<VisionData>("/api/vision", DEFAULT_VISION),
        fetchEndpoint<any>("/api/state", null),
        fetchEndpoint<any[]>("/api/agents/active", []),
      ]);

      // Update forge status
      setForgeStatus(forgeStatusData);

      // Update vision data
      setVisionData({
        mission: visionDataRaw.mission || DEFAULT_VISION.mission,
        goals: Array.isArray(visionDataRaw.goals)
          ? visionDataRaw.goals.map((g: any) => (typeof g === "string" ? g : g.title || g.description || ""))
          : [],
        constraints: Array.isArray(visionDataRaw.constraints) ? visionDataRaw.constraints : [],
        successMetrics: Array.isArray(visionDataRaw.successMetrics)
          ? visionDataRaw.successMetrics.map((m: any) => (typeof m === "string" ? m : m.name || ""))
          : [],
        timeframe: visionDataRaw.timeframe || DEFAULT_VISION.timeframe,
      });

      // Update project state from state endpoint
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
        // Fallback if state endpoint fails
        setProjectState({
          ...DEFAULT_PROJECT_STATE,
          activeAgents: agentsData || [],
          healthScore: calculateHealthScore(forgeStatusData),
        });
      }

      // Update agents
      setAgents(agentsData || []);

      setLoading(false);
    } catch (err) {
      console.error("[Dashboard] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
      setLoading(false);
    }
  }, []);

  /**
   * Setup WebSocket connection for real-time updates
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Dashboard] WebSocket connected");
        // Only reset reconnect counter after stable connection (2s)
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            reconnectAttempts.current = 0;
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle different message types
          switch (message.type) {
            case "state.update":
              // Update project state
              if (message.data) {
                setProjectState((prev) => ({
                  ...prev,
                  phase: message.data.phase || prev.phase,
                  progress: message.data.progress ?? prev.progress,
                  blockers: message.data.blockers || prev.blockers,
                  recentDecisions: message.data.recentDecisions || prev.recentDecisions,
                }));
              }
              break;

            case "agent.activity":
              // Refresh agents data
              fetchEndpoint<any[]>("/api/agents/active", []).then((data) => {
                setAgents(data);
                setProjectState((prev) => ({
                  ...prev,
                  activeAgents: data,
                }));
              });
              break;

            case "vision.change":
              // Update vision data
              if (message.data) {
                setVisionData((prev) => ({
                  mission: message.data.mission || prev.mission,
                  goals: message.data.goals || prev.goals,
                  constraints: message.data.constraints || prev.constraints,
                  successMetrics: message.data.successMetrics || prev.successMetrics,
                  timeframe: message.data.timeframe || prev.timeframe,
                }));
              }
              break;

            case "pong":
              // Heartbeat response - ignore
              break;
          }
        } catch (err) {
          console.warn("[Dashboard] Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[Dashboard] WebSocket error:", event);
      };

      ws.onclose = () => {
        console.log("[Dashboard] WebSocket disconnected");
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Dashboard] Reconnecting (attempt ${reconnectAttempts.current})...`);
            connectWebSocket();
          }, delay);
        }
      };
    } catch (err) {
      console.error("[Dashboard] Failed to create WebSocket:", err);
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Setup WebSocket connection
    connectWebSocket();

    // Setup auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchData();
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchData, connectWebSocket]);

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

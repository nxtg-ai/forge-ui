/**
 * Forge Integration Hooks
 * React hooks for seamless UI-backend integration
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, WSMessageType } from "../services/api-client";
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  Command,
  ArchitectureDecision,
  AutomatedAction,
  YoloStatistics,
} from "../components/types";

// ============= Data Mappers (Backend -> Frontend) =============

/**
 * Backend vision data structure
 */
interface BackendVision {
  mission?: string;
  strategicGoals?: Array<string | { title: string; description: string }>;
  principles?: string[];
  created?: string;
  updated?: string;
  version?: string | number;
}

/**
 * Maps backend vision response to frontend VisionData structure
 */
function mapBackendVisionToFrontend(backendData: BackendVision | null): VisionData | null {
  if (!backendData) return null;

  return {
    mission: backendData.mission || "",
    goals: (backendData.strategicGoals || []).map(
      (goal: string | { title: string; description: string }, index: number) => ({
        id: `goal-${index}`,
        title: typeof goal === 'string' ? goal : goal.title,
        description: typeof goal === 'string' ? '' : (goal.description || ''),
        status: "pending" as const,
        progress: 0,
        dependencies: [],
      }),
    ),
    constraints: backendData.principles || [],
    successMetrics: [],
    timeframe: "Not set",
    createdAt: backendData.created ? new Date(backendData.created) : new Date(),
    lastUpdated: backendData.updated
      ? new Date(backendData.updated)
      : new Date(),
    version: typeof backendData.version === "string" ? 1 : backendData.version,
  };
}

// ============= Vision Hook =============

export function useVision() {
  const [vision, setVision] = useState<VisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVision = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await apiClient.getVision();

    if (response.success && response.data) {
      const mappedVision = mapBackendVisionToFrontend(response.data);
      setVision(mappedVision);
    } else {
      setError(response.error || "Failed to fetch vision");
    }

    setLoading(false);
  }, []);

  const updateVision = useCallback(async (updates: Partial<VisionData>) => {
    setLoading(true);
    setError(null);

    const response = await apiClient.updateVision(updates);

    if (response.success && response.data) {
      const mappedVision = mapBackendVisionToFrontend(response.data);
      setVision(mappedVision);
    } else {
      setError(response.error || "Failed to update vision");
    }

    setLoading(false);
    return response.success;
  }, []);

  const captureVision = useCallback(async (visionText: string) => {
    setLoading(true);
    setError(null);

    const response = await apiClient.captureVision(visionText);

    if (response.success && response.data) {
      const mappedVision = mapBackendVisionToFrontend(response.data);
      setVision(mappedVision);
    } else {
      setError(response.error || "Failed to capture vision");
    }

    setLoading(false);
    return response.success;
  }, []);

  useEffect(() => {
    fetchVision();

    // Subscribe to vision changes
    const unsubscribe = apiClient.subscribe("vision.change", (data: BackendVision) => {
      const mappedVision = mapBackendVisionToFrontend(data);
      setVision(mappedVision);
    });

    return unsubscribe;
  }, [fetchVision]);

  return {
    vision,
    loading,
    error,
    updateVision,
    captureVision,
    refresh: fetchVision,
  };
}

// ============= Project State Hook =============

export function useProjectState() {
  const [projectState, setProjectState] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchProjectState = useCallback(async () => {
    const response = await apiClient.getProjectState();

    if (response.success && response.data) {
      setProjectState(response.data);
      setError(null);
    } else {
      setError(response.error || "Failed to fetch project state");
    }

    setLoading(false);
  }, []);

  const updatePhase = useCallback(async (phase: ProjectState["phase"]) => {
    const response = await apiClient.updateProjectPhase(phase);

    if (response.success && response.data) {
      setProjectState(response.data);
    }

    return response.success;
  }, []);

  useEffect(() => {
    fetchProjectState();

    // Subscribe to state updates
    const unsubscribe = apiClient.subscribe(
      "state.update",
      (data: ProjectState) => {
        setProjectState(data);
      },
    );

    // Set up polling as fallback (every 5 seconds)
    pollingInterval.current = setInterval(fetchProjectState, 5000);

    return () => {
      unsubscribe();
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [fetchProjectState]);

  return {
    projectState,
    loading,
    error,
    updatePhase,
    refresh: fetchProjectState,
  };
}

// ============= Agent Activities Hook =============

export function useAgentActivities() {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activityBuffer = useRef<AgentActivity[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const response = await apiClient.getAgentActivities({ limit: 50 });

    if (response.success && response.data) {
      setActivities(response.data);
      setError(null);
    } else {
      setError(response.error || "Failed to fetch activities");
    }

    setLoading(false);
  }, []);

  const addActivity = useCallback((activity: AgentActivity) => {
    // Buffer activities to batch UI updates
    activityBuffer.current.push(activity);

    // Clear existing timer
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
    }

    // Set new timer to flush buffer
    flushTimer.current = setTimeout(() => {
      setActivities((prev) =>
        [...activityBuffer.current, ...prev].slice(0, 100),
      ); // Keep last 100
      activityBuffer.current = [];
    }, 100);
  }, []);

  useEffect(() => {
    fetchActivities();

    // Subscribe to agent activity updates
    const unsubscribe = apiClient.subscribe("agent.activity", addActivity);

    return () => {
      unsubscribe();
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
    };
  }, [fetchActivities, addActivity]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
}

// ============= Command Execution Hook =============

export function useCommandExecution() {
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Command[]>([]);

  const executeCommand = useCallback(async (command: Command) => {
    setExecuting(true);
    setError(null);

    const response = await apiClient.executeCommand(command);

    if (response.success && response.data) {
      setLastResult(response.data.output);
      setHistory((prev) => [command, ...prev]);
    } else {
      setError(response.error || "Command execution failed");
    }

    setExecuting(false);
    return response.success;
  }, []);

  const fetchHistory = useCallback(async () => {
    const response = await apiClient.getCommandHistory();
    if (response.success && response.data) {
      setHistory(response.data);
    }
  }, []);

  const getSuggestions = useCallback(async (context: string) => {
    const response = await apiClient.getCommandSuggestions(context);
    return response.success ? response.data || [] : [];
  }, []);

  useEffect(() => {
    fetchHistory();

    // Subscribe to command execution events
    const unsubscribe = apiClient.subscribe("command.executed", (data: { result?: unknown; command?: Command }) => {
      setLastResult(data.result);
      if (data.command) {
        const cmd = data.command;
        setHistory((prev) => [cmd, ...prev]);
      }
    });

    return unsubscribe;
  }, [fetchHistory]);

  return {
    executeCommand,
    executing,
    lastResult,
    error,
    history,
    getSuggestions,
  };
}

// ============= Architecture Decisions Hook =============

export function useArchitectureDecisions() {
  const [decisions, setDecisions] = useState<ArchitectureDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    const response = await apiClient.getArchitectureDecisions();

    if (response.success && response.data) {
      setDecisions(response.data);
      setError(null);
    } else {
      setError(response.error || "Failed to fetch decisions");
    }

    setLoading(false);
  }, []);

  const proposeDecision = useCallback(
    async (decision: Partial<ArchitectureDecision>) => {
      const response = await apiClient.proposeArchitecture(decision);

      if (response.success && response.data) {
        setDecisions((prev) => [response.data!, ...prev]);
      }

      return response.success;
    },
    [],
  );

  const approveDecision = useCallback(async (decisionId: string) => {
    const response = await apiClient.approveArchitectureDecision(decisionId);

    if (response.success && response.data) {
      setDecisions((prev) =>
        prev.map((d) => (d.id === decisionId ? response.data! : d)),
      );
    }

    return response.success;
  }, []);

  useEffect(() => {
    fetchDecisions();

    // Subscribe to decision updates
    const unsubscribe = apiClient.subscribe(
      "decision.made",
      (data: ArchitectureDecision) => {
        setDecisions((prev) => {
          const exists = prev.some((d) => d.id === data.id);
          if (exists) {
            return prev.map((d) => (d.id === data.id ? data : d));
          }
          return [data, ...prev];
        });
      },
    );

    return unsubscribe;
  }, [fetchDecisions]);

  return {
    decisions,
    loading,
    error,
    proposeDecision,
    approveDecision,
    refresh: fetchDecisions,
  };
}

// ============= YOLO Mode Hook =============

export function useYoloMode() {
  const [statistics, setStatistics] = useState<YoloStatistics | null>(null);
  const [history, setHistory] = useState<AutomatedAction[]>([]);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    const response = await apiClient.getYoloStatistics();

    if (response.success && response.data) {
      setStatistics(response.data);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const response = await apiClient.getYoloHistory();

    if (response.success && response.data) {
      setHistory(response.data);
    }
  }, []);

  const executeAction = useCallback(
    async (action: AutomatedAction) => {
      setExecuting(true);
      setError(null);

      const response = await apiClient.executeYoloAction(action);

      if (response.success) {
        setHistory((prev) => [action, ...prev]);
        fetchStatistics(); // Refresh statistics
      } else {
        setError(response.error || "YOLO action failed");
      }

      setExecuting(false);
      return response.success;
    },
    [fetchStatistics],
  );

  useEffect(() => {
    fetchStatistics();
    fetchHistory();

    // Subscribe to YOLO action events
    const unsubscribe = apiClient.subscribe("yolo.action", (data: { action?: AutomatedAction; statistics?: YoloStatistics }) => {
      if (data.action) {
        const action = data.action;
        setHistory((prev) => [action, ...prev]);
      }
      if (data.statistics) {
        setStatistics(data.statistics);
      }
    });

    return unsubscribe;
  }, [fetchStatistics, fetchHistory]);

  return {
    statistics,
    history,
    executing,
    error,
    executeAction,
    refresh: () => {
      fetchStatistics();
      fetchHistory();
    },
  };
}

// ============= Combined Hook for Full Integration =============

export function useForgeIntegration() {
  const vision = useVision();
  const projectState = useProjectState();
  const agentActivities = useAgentActivities();
  const commandExecution = useCommandExecution();
  const architectureDecisions = useArchitectureDecisions();
  const yoloMode = useYoloMode();

  const isLoading =
    vision.loading ||
    projectState.loading ||
    agentActivities.loading ||
    architectureDecisions.loading;

  const errors = [
    vision.error,
    projectState.error,
    agentActivities.error,
    commandExecution.error,
    architectureDecisions.error,
    yoloMode.error,
  ].filter(Boolean);

  return {
    vision,
    projectState,
    agentActivities,
    commandExecution,
    architectureDecisions,
    yoloMode,
    isLoading,
    errors,
    isConnected: !isLoading && errors.length === 0,
  };
}

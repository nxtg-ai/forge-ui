/**
 * useAgentActivity Hook
 * React hook for live agent activity feed
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Agent, AgentActivity, EngagementMode } from "../components/types";
import {
  ActivityService,
  ActivityEvent,
  ActivityFilter,
  ActivityStatistics,
  AgentPerformance,
} from "../services/activity-service";

/**
 * Agent activity hook options
 */
export interface UseAgentActivityOptions {
  autoConnect?: boolean;
  filter?: ActivityFilter;
  maxEvents?: number;
  onError?: (error: Error) => void;
}

/**
 * Agent activity hook return type
 */
export interface UseAgentActivityReturn {
  events: ActivityEvent[];
  activeAgents: Agent[];
  statistics: ActivityStatistics | null;
  performances: Map<string, AgentPerformance>;
  loading: boolean;
  error: Error | null;
  connected: boolean;
  recordActivity: (
    activity: Omit<ActivityEvent, "id" | "timestamp">,
  ) => Promise<void>;
  updateAgentStatus: (agent: Agent) => Promise<void>;
  clearHistory: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing agent activity
 */
export function useAgentActivity(
  options: UseAgentActivityOptions = {},
): UseAgentActivityReturn {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [performances, setPerformances] = useState<
    Map<string, AgentPerformance>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);

  const serviceRef = useRef<ActivityService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create service instance
      const service = new ActivityService({
        name: "AgentActivityHook",
        maxEventHistory: options.maxEvents ?? 100,
      });

      serviceRef.current = service;

      // Initialize service
      const initResult = await service.initialize();
      if (initResult.isErr()) {
        throw initResult.error;
      }

      // Get initial data
      const history = service.getActivityHistory(options.filter);
      setEvents(history);

      const agents = service.getActiveAgents();
      setActiveAgents(agents);

      const stats = service.getStatistics(options.filter);
      setStatistics(stats);

      // Load performances
      const perfMap = new Map<string, AgentPerformance>();
      agents.forEach((agent) => {
        const perfResult = service.getAgentPerformance(agent.id);
        if (perfResult.isOk()) {
          perfMap.set(agent.id, perfResult.value);
        }
      });
      setPerformances(perfMap);

      // Subscribe to activity stream
      unsubscribeRef.current = service.subscribeToStream(
        "useAgentActivity",
        handleActivityEvent,
        options.filter,
      );

      setConnected(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [options.maxEvents, options.filter, options.onError]);

  /**
   * Handle activity event from service
   */
  const handleActivityEvent = useCallback(
    (event: ActivityEvent) => {
      // Add new event to the beginning
      setEvents((prev) => {
        const maxEvents = options.maxEvents ?? 100;
        const updated = [event, ...prev];
        return updated.slice(0, maxEvents);
      });

      // Update statistics
      if (serviceRef.current) {
        const stats = serviceRef.current.getStatistics(options.filter);
        setStatistics(stats);
      }
    },
    [options.maxEvents, options.filter],
  );

  /**
   * Record activity
   */
  const recordActivity = useCallback(
    async (activity: Omit<ActivityEvent, "id" | "timestamp">) => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      const result = await serviceRef.current.recordActivity(activity);
      if (result.isErr()) {
        throw result.error;
      }
    },
    [],
  );

  /**
   * Update agent status
   */
  const updateAgentStatus = useCallback(async (agent: Agent) => {
    if (!serviceRef.current) {
      throw new Error("Service not initialized");
    }

    const result = await serviceRef.current.updateAgentStatus(agent);
    if (result.isErr()) {
      throw result.error;
    }

    // Update active agents list
    setActiveAgents((prev) => {
      const index = prev.findIndex((a) => a.id === agent.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = agent;
        return updated;
      } else {
        return [...prev, agent];
      }
    });

    // Update performance
    const perfResult = serviceRef.current.getAgentPerformance(agent.id);
    if (perfResult.isOk()) {
      setPerformances((prev) => {
        const updated = new Map(prev);
        updated.set(agent.id, perfResult.value);
        return updated;
      });
    }
  }, []);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.clearHistory();
    setEvents([]);
    setStatistics(null);
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    if (!serviceRef.current) {
      return;
    }

    const history = serviceRef.current.getActivityHistory(options.filter);
    setEvents(history);

    const agents = serviceRef.current.getActiveAgents();
    setActiveAgents(agents);

    const stats = serviceRef.current.getStatistics(options.filter);
    setStatistics(stats);

    // Refresh performances
    const perfMap = new Map<string, AgentPerformance>();
    agents.forEach((agent) => {
      const perfResult = serviceRef.current!.getAgentPerformance(agent.id);
      if (perfResult.isOk()) {
        perfMap.set(agent.id, perfResult.value);
      }
    });
    setPerformances(perfMap);
  }, [options.filter]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (options.autoConnect !== false) {
      initializeService();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (serviceRef.current) {
        serviceRef.current.dispose();
      }
    };
  }, []);

  return {
    events,
    activeAgents,
    statistics,
    performances,
    loading,
    error,
    connected,
    recordActivity,
    updateAgentStatus,
    clearHistory,
    refresh,
  };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { wsManager } from "../services/ws-manager";
import { logger } from "../utils/browser-logger";

export interface ActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  type: "thinking" | "working" | "completed" | "blocked" | "discussing";
  action: string;
  details?: string;
  confidence?: number;
  timestamp: Date;
  isNew?: boolean;
  relatedAgents?: string[];
}

/** Raw activity data from API or WebSocket before transformation */
interface RawActivityData {
  id?: string;
  agentId?: string;
  agent?: string;
  agentName?: string;
  type?: string;
  status?: string;
  action?: string;
  message?: string;
  details?: string;
  description?: string;
  confidence?: number;
  timestamp?: string | number | Date;
  relatedAgents?: string[];
}

function transformApiActivity(item: RawActivityData): ActivityItem {
  return {
    id:
      item.id ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId: item.agentId || item.agent || "unknown",
    agentName: item.agentName || item.agent || "Agent",
    type:
      (item.type as ActivityItem["type"]) ||
      (item.status === "completed"
        ? "completed"
        : item.status === "blocked"
          ? "blocked"
          : "working"),
    action: item.action || item.message || "Activity",
    details: item.details || item.description,
    confidence: item.confidence,
    timestamp: new Date(item.timestamp || Date.now()),
    relatedAgents: item.relatedAgents,
  };
}

export function useActivityData(maxItems: number, autoScroll: boolean, scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Clean up pending animation timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current.clear();
    };
  }, []);

  // Shared fetch logic
  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(
        `${apiUrl}/agents/activities?limit=${maxItems}&sortBy=timestamp&sortOrder=desc`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch activities: ${response.statusText}`,
        );
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setActivities(result.data.map(transformApiActivity));
      } else {
        setActivities([]);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      logger.warn(
        "[LiveActivityFeed] Failed to fetch activities:",
        errorMessage,
      );
      setError(errorMessage);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [maxItems]);

  // Fetch initial activities on mount
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handle incoming WS activity
  const handleNewActivity = useCallback(
    (activity: ActivityItem) => {
      setActivities((prev) => {
        const newActivities = [
          { ...activity, isNew: true },
          ...prev.slice(0, maxItems - 1),
        ];

        const timeout = setTimeout(() => {
          pendingTimeoutsRef.current.delete(timeout);
          setActivities((current) =>
            current.map((a) =>
              a.id === activity.id ? { ...a, isNew: false } : a,
            ),
          );
        }, 2000);
        pendingTimeoutsRef.current.add(timeout);

        return newActivities;
      });

      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
    [maxItems, autoScroll, scrollRef],
  );

  // Subscribe to real-time updates via shared wsManager
  useEffect(() => {
    const unsubMessage = wsManager.subscribe(
      "agent.activity",
      (payload: RawActivityData | null) => {
        if (!payload) return;
        const activity: ActivityItem = {
          id:
            payload.id ||
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          agentId: payload.agent || "unknown",
          agentName: payload.agentName || payload.agent || "Agent",
          type:
            payload.status === "completed"
              ? "completed"
              : payload.status === "blocked"
                ? "blocked"
                : "working",
          action: payload.action || "Activity",
          details: payload.details,
          timestamp: new Date(payload.timestamp || Date.now()),
        };
        handleNewActivity(activity);
      },
    );

    const unsubState = wsManager.onStateChange((state) => {
      setIsConnected(state.status === "connected");
      setIsReconnecting(state.status === "reconnecting");
    });

    return () => {
      unsubMessage();
      unsubState();
    };
  }, [handleNewActivity]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    isConnected,
    isReconnecting,
    isLoading,
    error,
    refresh: fetchActivities,
    clearActivities,
  };
}

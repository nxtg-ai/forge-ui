import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Activity,
  Users,
  Zap,
  Brain,
  MessageSquare,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  MoreVertical,
  Filter,
  RefreshCw,
} from "lucide-react";

interface ActivityItem {
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

interface LiveActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
  filterByAgent?: string[];
  onActivityClick?: (activity: ActivityItem) => void;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  maxItems = 50,
  autoScroll = true,
  filterByAgent = [],
  onActivityClick,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<"all" | "important" | "errors">("all");

  // Virtual scrolling configuration
  const VIRTUAL_SCROLL_THRESHOLD = 50;
  const ESTIMATED_ROW_HEIGHT = 64;

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          setIsReconnecting(false);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            // Only handle agent.activity messages
            if (message.type === "agent.activity" && message.payload) {
              const activity: ActivityItem = {
                id: message.payload.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                agentId: message.payload.agent || "unknown",
                agentName: message.payload.agentName || message.payload.agent || "Agent",
                type: message.payload.status === "completed" ? "completed" :
                      message.payload.status === "blocked" ? "blocked" : "working",
                action: message.payload.action || "Activity",
                details: message.payload.details,
                timestamp: new Date(message.payload.timestamp || message.timestamp),
              };
              handleNewActivity(activity);
            }
          } catch (err) {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
          setIsReconnecting(true);
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Exponential backoff reconnection
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch (error) {
        console.error("WebSocket connection failed:", error);
        setIsReconnecting(true);
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  const handleNewActivity = useCallback(
    (activity: ActivityItem) => {
      setActivities((prev) => {
        const newActivities = [
          { ...activity, isNew: true },
          ...prev.slice(0, maxItems - 1),
        ];

        // Mark old activities as not new after animation
        setTimeout(() => {
          setActivities((current) =>
            current.map((a) =>
              a.id === activity.id ? { ...a, isNew: false } : a,
            ),
          );
        }, 2000);

        return newActivities;
      });

      // Auto-scroll to top for new activities
      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
    [maxItems, autoScroll],
  );

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Agent filter
    if (filterByAgent.length > 0 && !filterByAgent.includes(activity.agentId)) {
      return false;
    }

    // Type filter
    if (
      filter === "important" &&
      activity.type !== "completed" &&
      activity.type !== "blocked"
    ) {
      return false;
    }
    if (filter === "errors" && activity.type !== "blocked") {
      return false;
    }

    return true;
  });

  // Setup virtualizer for large lists
  const virtualizer = useVirtualizer({
    count: filteredActivities.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  // Determine if we should use virtual scrolling
  const useVirtualScroll = filteredActivities.length > VIRTUAL_SCROLL_THRESHOLD;

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "thinking":
        return <Brain className="w-4 h-4 text-yellow-400" />;
      case "working":
        return <Zap className="w-4 h-4 text-blue-400" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "blocked":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "discussing":
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "thinking":
        return "border-yellow-500/20 bg-yellow-500/5";
      case "working":
        return "border-blue-500/20 bg-blue-500/5";
      case "completed":
        return "border-green-500/20 bg-green-500/5";
      case "blocked":
        return "border-red-500/20 bg-red-500/5";
      case "discussing":
        return "border-purple-500/20 bg-purple-500/5";
    }
  };

  const formatTimestamp = (date: Date | string) => {
    const now = new Date();
    const dateObj = date instanceof Date ? date : new Date(date);
    const diff = now.getTime() - dateObj.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return dateObj.toLocaleDateString();
  };

  return (
    <div
      data-testid="activity-feed-container"
      className="h-full flex flex-col bg-gray-900/50 rounded-2xl border border-gray-800"
    >
      {/* Header */}
      <div
        data-testid="activity-feed-header"
        className="px-4 py-3 border-b border-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Live Activity</h3>

            {/* Connection status */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? "bg-green-500"
                    : isReconnecting
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {isConnected
                  ? "Live"
                  : isReconnecting
                    ? "Reconnecting"
                    : "Offline"}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div
              data-testid="activity-feed-filter-group"
              className="flex gap-1 px-1 py-1 bg-gray-800 rounded-lg"
            >
              <button
                data-testid="activity-feed-filter-all"
                onClick={() => setFilter("all")}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  filter === "all"
                    ? "bg-gray-700 text-gray-100"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                All
              </button>
              <button
                data-testid="activity-feed-filter-important"
                onClick={() => setFilter("important")}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  filter === "important"
                    ? "bg-gray-700 text-gray-100"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Important
              </button>
              <button
                data-testid="activity-feed-filter-errors"
                onClick={() => setFilter("errors")}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  filter === "errors"
                    ? "bg-gray-700 text-gray-100"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Errors
              </button>
            </div>

            <button
              data-testid="activity-feed-filter-btn"
              className="p-1 hover:bg-gray-800 rounded transition-all"
            >
              <Filter className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 max-h-100"
      >
        {filteredActivities.length > 0 ? (
          useVirtualScroll ? (
            // Virtual scrolling for large lists (>50 items)
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const activity = filteredActivities[virtualItem.index];
                return (
                  <div
                    key={activity.id || `activity-${virtualItem.index}`}
                    data-testid={`activity-feed-item-${activity.id || virtualItem.index}`}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => onActivityClick?.(activity)}
                    className={`
                      relative px-3 py-2 mb-1 rounded-lg border transition-all cursor-pointer
                      ${getActivityColor(activity.type)}
                      hover:bg-gray-800/30
                    `}
                  >
                    {/* New activity glow */}
                    {activity.isNew && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg pointer-events-none animate-pulse" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5">{getActivityIcon(activity.type)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-blue-400">
                                {activity.agentName}
                              </span>
                              {activity.relatedAgents &&
                                activity.relatedAgents.length > 0 && (
                                  <>
                                    <span className="text-xs text-gray-500">
                                      with
                                    </span>
                                    <div className="flex -space-x-1">
                                      {activity.relatedAgents
                                        .slice(0, 3)
                                        .map((agent, i) => (
                                          <div
                                            key={i}
                                            className="w-5 h-5 rounded-full bg-gray-700 border border-gray-900 flex items-center justify-center"
                                          >
                                            <span className="text-xs text-gray-400">
                                              {agent[0]}
                                            </span>
                                          </div>
                                        ))}
                                      {activity.relatedAgents.length > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-900 flex items-center justify-center">
                                          <span className="text-xs text-gray-500">
                                            +{activity.relatedAgents.length - 3}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                            </div>

                            <p className="text-sm text-gray-300 mt-0.5">
                              {activity.action}
                            </p>

                            {activity.details && (
                              <p className="text-xs text-gray-500 mt-1">
                                {activity.details}
                              </p>
                            )}

                            {/* Confidence indicator */}
                            {activity.confidence !== undefined && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 max-w-[100px] h-1 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ease-out ${
                                      activity.confidence >= 80
                                        ? "bg-green-500"
                                        : activity.confidence >= 60
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{ width: `${activity.confidence ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {activity.confidence ?? 0}% confident
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span
                            data-testid={`activity-feed-timestamp-${activity.id}`}
                            className="text-xs text-gray-500 whitespace-nowrap"
                          >
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Actions menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle menu
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-all opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Regular rendering for small lists (<=50 items)
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id || `activity-${index}`}
                    data-testid={`activity-feed-item-${activity.id || index}`}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        delay: index * 0.02,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      },
                    }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    onClick={() => onActivityClick?.(activity)}
                    className={`
                      relative px-3 py-2 rounded-lg border transition-all cursor-pointer
                      ${getActivityColor(activity.type)}
                      hover:bg-gray-800/30
                    `}
                  >
                    {/* New activity glow */}
                    {activity.isNew && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 2 }}
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg pointer-events-none"
                      />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="mt-0.5">{getActivityIcon(activity.type)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-blue-400">
                                {activity.agentName}
                              </span>
                              {activity.relatedAgents &&
                                activity.relatedAgents.length > 0 && (
                                  <>
                                    <span className="text-xs text-gray-500">
                                      with
                                    </span>
                                    <div className="flex -space-x-1">
                                      {activity.relatedAgents
                                        .slice(0, 3)
                                        .map((agent, i) => (
                                          <div
                                            key={i}
                                            className="w-5 h-5 rounded-full bg-gray-700 border border-gray-900 flex items-center justify-center"
                                          >
                                            <span className="text-xs text-gray-400">
                                              {agent[0]}
                                            </span>
                                          </div>
                                        ))}
                                      {activity.relatedAgents.length > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-900 flex items-center justify-center">
                                          <span className="text-xs text-gray-500">
                                            +{activity.relatedAgents.length - 3}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                            </div>

                            <p className="text-sm text-gray-300 mt-0.5">
                              {activity.action}
                            </p>

                            {activity.details && (
                              <p className="text-xs text-gray-500 mt-1">
                                {activity.details}
                              </p>
                            )}

                            {/* Confidence indicator */}
                            {activity.confidence !== undefined && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 max-w-[100px] h-1 bg-gray-800 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full ${
                                      activity.confidence >= 80
                                        ? "bg-green-500"
                                        : activity.confidence >= 60
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activity.confidence ?? 0}%` }}
                                    transition={{
                                      duration: 0.5,
                                      ease: [0.16, 1, 0.3, 1],
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">
                                  {activity.confidence ?? 0}% confident
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span
                            data-testid={`activity-feed-timestamp-${activity.id}`}
                            className="text-xs text-gray-500 whitespace-nowrap"
                          >
                            {formatTimestamp(activity.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Actions menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle menu
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-all opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 mb-1">No activities yet</p>
            <p className="text-xs text-gray-500">
              {isConnected
                ? "Waiting for agent activity..."
                : "Connecting to activity stream..."}
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer with stats */}
      {filteredActivities.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/30">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Showing {filteredActivities.length} activities</span>
            <button
              onClick={() => setActivities([])}
              className="flex items-center gap-1 hover:text-gray-300 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

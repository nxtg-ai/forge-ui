/**
 * Agent Activity Feed Component
 * Real-time activity stream from worker pool
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Filter,
  ChevronDown,
  Bot,
  Zap,
} from "lucide-react";

interface WorkerActivity {
  id: string;
  timestamp: Date;
  workerId: string;
  type:
    | "task.started"
    | "task.completed"
    | "task.failed"
    | "worker.status"
    | "pool.scaled";
  message: string;
  taskId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface AgentActivityFeedProps {
  className?: string;
  maxEntries?: number;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  className = "",
  maxEntries = 20,
}) => {
  const [activities, setActivities] = useState<WorkerActivity[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  // Fetch initial activities and set up WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const connectWebSocket = () => {
      if (isCancelled) return;

      // Stop trying after max attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        setConnectionFailed(true);
        return;
      }

      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          if (isCancelled) {
            ws?.close();
            return;
          }
          reconnectAttempts = 0;
          setIsConnected(true);
          setConnectionFailed(false);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === "worker.event") {
              const activity = parseWorkerEvent(message.payload);
              if (activity) {
                setActivities((prev) =>
                  [activity, ...prev].slice(0, maxEntries),
                );
              }
            }
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onclose = () => {
          if (isCancelled) return;
          setIsConnected(false);

          // Reconnect with backoff, but only up to max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = 2000 * Math.pow(2, reconnectAttempts - 1);
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          } else {
            setConnectionFailed(true);
          }
        };

        ws.onerror = () => {
          // Let onclose handle the state change
        };
      } catch (err) {
        // WebSocket constructor failed
        setConnectionFailed(true);
      }
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [maxEntries]);

  // Parse worker event to activity
  const parseWorkerEvent = (event: any): WorkerActivity | null => {
    if (!event || !event.type) return null;

    const id = `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date();

    switch (event.type) {
      case "task.started":
        return {
          id,
          timestamp,
          workerId: event.workerId,
          type: "task.started",
          message: `Worker ${event.workerId.slice(-8)} started task`,
          taskId: event.taskId,
        };

      case "task.completed":
        return {
          id,
          timestamp,
          workerId: event.workerId || "unknown",
          type: "task.completed",
          message: `Task completed successfully`,
          taskId: event.taskId,
          duration: event.result?.duration,
        };

      case "task.failed":
        return {
          id,
          timestamp,
          workerId: event.workerId || "unknown",
          type: "task.failed",
          message: `Task failed: ${event.error || "Unknown error"}`,
          taskId: event.taskId,
        };

      case "worker.status":
        return {
          id,
          timestamp,
          workerId: event.workerId,
          type: "worker.status",
          message: `Worker ${event.workerId.slice(-8)} → ${event.status}`,
        };

      case "pool.scaled":
        return {
          id,
          timestamp,
          workerId: "pool",
          type: "pool.scaled",
          message: `Pool scaled ${event.direction} by ${event.count} workers`,
        };

      default:
        return null;
    }
  };

  // Filter activities
  const filteredActivities = activities.filter((a) => {
    if (filter === "all") return true;
    if (filter === "tasks") return a.type.startsWith("task.");
    if (filter === "workers") return a.type.startsWith("worker.");
    if (filter === "errors") return a.type === "task.failed";
    return true;
  });

  return (
    <div
      className={`bg-gray-900/50 rounded-lg border border-gray-800 ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium">Agent Activity</span>
          {activities.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
              {activities.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionFailed
                ? "bg-gray-500"
                : isConnected
                  ? "bg-green-500"
                  : "bg-yellow-500 animate-pulse"
            }`}
          />
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filter Bar */}
            <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2">
              <Filter className="w-3 h-3 text-gray-500" />
              {["all", "tasks", "workers", "errors"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    filter === f
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Activity List */}
            <div className="max-h-48 overflow-y-auto">
              {connectionFailed ? (
                <div className="px-3 py-4 text-center text-gray-500 text-xs">
                  <p>Worker pool not running.</p>
                  <p className="mt-1 text-gray-600">
                    Initialize via Worker Pool panel above.
                  </p>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="px-3 py-4 text-center text-gray-500 text-xs">
                  {isConnected
                    ? "No activity yet. Worker pool events will appear here."
                    : "Connecting to worker pool..."}
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {filteredActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Activity item component
const ActivityItem: React.FC<{ activity: WorkerActivity }> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case "task.started":
        return <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />;
      case "task.completed":
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case "task.failed":
        return <XCircle className="w-3 h-3 text-red-400" />;
      case "worker.status":
        return <Bot className="w-3 h-3 text-blue-400" />;
      case "pool.scaled":
        return <Zap className="w-3 h-3 text-purple-400" />;
      default:
        return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-3 py-2 flex items-start gap-2 hover:bg-gray-800/30 transition-colors"
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 truncate">{activity.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-500">
            {formatTime(activity.timestamp)}
          </span>
          {activity.duration && (
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {(activity.duration / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AgentActivityFeed;

/**
 * Worker Pool Metrics Component
 * Displays pool utilization, queue depth, and worker health
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Activity,
  Users,
  Clock,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  Plus,
  Minus,
} from "lucide-react";

interface PoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  errorWorkers: number;
  tasksQueued: number;
  tasksRunning: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskDuration: number;
  avgQueueWaitTime: number;
  utilization: number;
  uptime: number;
}

interface WorkerPoolMetricsProps {
  className?: string;
  onScaleUp?: () => void;
  onScaleDown?: () => void;
}

export const WorkerPoolMetrics: React.FC<WorkerPoolMetricsProps> = ({
  className = "",
  onScaleUp,
  onScaleDown,
}) => {
  const [metrics, setMetrics] = useState<PoolMetrics | null>(null);
  const [poolStatus, setPoolStatus] = useState<string>("stopped");
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics periodically
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/workers");
        if (!res.ok) throw new Error("Failed to fetch worker status");

        const data = await res.json();
        if (data.success && data.data) {
          setPoolStatus(data.data.status || "stopped");
          if (data.data.metrics) {
            setMetrics(data.data.metrics);
          }
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  // Initialize pool
  const handleInitPool = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workers/init", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPoolStatus(data.data.status);
        setMetrics(data.data.metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize");
    } finally {
      setIsLoading(false);
    }
  };

  // Scale handlers
  const handleScaleUp = async () => {
    try {
      await fetch("/api/workers/scale/up", { method: "POST" });
      onScaleUp?.();
    } catch (err) {
      console.error("Scale up failed:", err);
    }
  };

  const handleScaleDown = async () => {
    try {
      await fetch("/api/workers/scale/down", { method: "POST" });
      onScaleDown?.();
    } catch (err) {
      console.error("Scale down failed:", err);
    }
  };

  const getStatusColor = () => {
    switch (poolStatus) {
      case "running":
        return "text-green-400";
      case "scaling":
        return "text-yellow-400";
      case "degraded":
        return "text-orange-400";
      case "stopped":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getHealthStatus = () => {
    if (!metrics) return { status: "unknown", color: "text-gray-400" };
    const errorRate =
      metrics.totalWorkers > 0
        ? metrics.errorWorkers / metrics.totalWorkers
        : 0;

    if (errorRate > 0.5) return { status: "unhealthy", color: "text-red-400" };
    if (errorRate > 0) return { status: "degraded", color: "text-yellow-400" };
    return { status: "healthy", color: "text-green-400" };
  };

  const health = getHealthStatus();

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
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">Worker Pool</span>
          <span className={`text-xs ${getStatusColor()}`}>{poolStatus}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800"
          >
            {poolStatus === "stopped" ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-400 mb-3">
                  Worker pool not running
                </p>
                <button
                  onClick={handleInitPool}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Initialize Pool
                </button>
              </div>
            ) : metrics ? (
              <div className="p-3 space-y-3">
                {/* Utilization Gauge */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Utilization</span>
                    <span className="text-xs font-mono text-gray-300">
                      {Math.round(metrics.utilization * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.utilization * 100}%` }}
                      className={`h-full rounded-full ${
                        metrics.utilization > 0.8
                          ? "bg-red-500"
                          : metrics.utilization > 0.5
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Worker Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <StatBox
                    icon={<Users className="w-3 h-3" />}
                    label="Total"
                    value={metrics.totalWorkers}
                    color="text-blue-400"
                  />
                  <StatBox
                    icon={<Activity className="w-3 h-3" />}
                    label="Active"
                    value={metrics.activeWorkers}
                    color="text-green-400"
                  />
                  <StatBox
                    icon={<Pause className="w-3 h-3" />}
                    label="Idle"
                    value={metrics.idleWorkers}
                    color="text-gray-400"
                  />
                  <StatBox
                    icon={<AlertTriangle className="w-3 h-3" />}
                    label="Error"
                    value={metrics.errorWorkers}
                    color="text-red-400"
                  />
                </div>

                {/* Queue & Tasks */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Clock className="w-3 h-3" />
                      Queue
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {metrics.tasksQueued}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Avg wait: {(metrics.avgQueueWaitTime / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <CheckCircle className="w-3 h-3" />
                      Tasks
                    </div>
                    <p className="text-lg font-semibold text-white">
                      {metrics.tasksCompleted}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {metrics.tasksFailed} failed
                    </p>
                  </div>
                </div>

                {/* Health & Scale Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${health.color}`}>
                      Health: {health.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleScaleDown}
                      disabled={metrics.totalWorkers <= 2}
                      className="p-1 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                      title="Scale down"
                    >
                      <Minus className="w-4 h-4 text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-500 w-12 text-center">
                      {metrics.totalWorkers}/20
                    </span>
                    <button
                      onClick={handleScaleUp}
                      disabled={metrics.totalWorkers >= 20}
                      className="p-1 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
                      title="Scale up"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {isLoading
                  ? "Loading metrics..."
                  : error || "No data available"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Stat box component
const StatBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-gray-800/50 rounded p-2 text-center">
    <div
      className={`flex items-center justify-center gap-1 text-xs ${color} mb-1`}
    >
      {icon}
    </div>
    <p className="text-sm font-semibold text-white">{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

export default WorkerPoolMetrics;

/**
 * Live Metrics Dashboard Component
 * Real-time display of system health and performance metrics
 */

import React, { useState, useEffect, useRef } from "react";
import {
  HealthMonitor,
  SystemHealth,
  HealthStatus,
  HealthCheckType,
} from "./health";
import {
  PerformanceMonitor,
  PerformanceReport,
  MetricType,
  PerformanceAlert,
} from "./performance";
import {
  ErrorTracker,
  ErrorReport,
  ErrorCategory,
  ErrorSeverity,
} from "./errors";
import { StatusIndicator } from "../components/monitoring/StatusIndicator";
import { DashboardProgressBar } from "../components/monitoring/DashboardProgressBar";
import { MetricCard } from "../components/monitoring/MetricCard";
import { AlertItem } from "../components/monitoring/AlertItem";

// Dashboard props
interface MetricsDashboardProps {
  projectPath?: string;
  refreshInterval?: number;
  compact?: boolean;
}

/**
 * Main Metrics Dashboard Component
 */
export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  projectPath,
  refreshInterval = 5000,
  compact = false,
}) => {
  // State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [performance, setPerformance] = useState<PerformanceReport | null>(
    null,
  );
  const [errors, setErrors] = useState<ErrorReport | null>(null);
  const [alerts, setAlerts] = useState<(PerformanceAlert & { id: string })[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<
    "overview" | "performance" | "errors" | "alerts"
  >("overview");

  // Refs for monitors
  const healthMonitor = useRef<HealthMonitor | null>(null);
  const performanceMonitor = useRef<PerformanceMonitor | null>(null);
  const errorTracker = useRef<ErrorTracker | null>(null);

  // Initialize monitors
  useEffect(() => {
    // Create monitors
    healthMonitor.current = new HealthMonitor(projectPath);
    performanceMonitor.current = new PerformanceMonitor();
    errorTracker.current = new ErrorTracker(projectPath);

    // Set up event listeners
    healthMonitor.current.on("healthUpdate", (update: SystemHealth) => {
      setHealth(update);
    });

    performanceMonitor.current.on(
      "performanceReport",
      (report: PerformanceReport) => {
        setPerformance(report);
      },
    );

    performanceMonitor.current.on(
      "performanceAlert",
      (alert: PerformanceAlert) => {
        setAlerts((prev) => [
          ...prev.slice(-9),
          { ...alert, id: Date.now().toString() },
        ]);
      },
    );

    errorTracker.current.on("errorReport", (report: ErrorReport) => {
      setErrors(report);
    });

    // Start monitoring
    healthMonitor.current.start(refreshInterval);
    performanceMonitor.current.start(refreshInterval);
    errorTracker.current.start(refreshInterval);

    // Cleanup
    return () => {
      healthMonitor.current?.stop();
      performanceMonitor.current?.stop();
      errorTracker.current?.stop();
    };
  }, [projectPath, refreshInterval]);

  // Get status color for progress bar
  const getStatusColor = (
    score: number,
  ): "green" | "yellow" | "red" => {
    if (score >= 85) return "green";
    if (score >= 70) return "yellow";
    return "red";
  };

  // Get health status for metric cards
  const getHealthStatus = (
    score: number,
  ): "healthy" | "warning" | "critical" => {
    if (score >= 85) return "healthy";
    if (score >= 70) return "warning";
    return "critical";
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (compact) {
    // Compact view for embedding
    return (
      <div
        data-testid="monitoring-dashboard-compact"
        className="bg-gray-50 rounded-lg p-3"
      >
        <div className="flex items-center justify-between mb-2">
          <h3
            data-testid="monitoring-health-title"
            className="text-sm font-semibold"
          >
            System Health
          </h3>
          {health && <StatusIndicator status={health.status} size="small" />}
        </div>
        {health && (
          <div className="space-y-2">
            <DashboardProgressBar
              value={health.overallScore}
              label="Overall Health"
              color={getStatusColor(health.overallScore)}
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Uptime:</span>
                <span className="ml-1 font-medium">
                  {formatUptime(health.uptime)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Errors:</span>
                <span className="ml-1 font-medium">
                  {errors?.totalErrors || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full dashboard view
  return (
    <div
      data-testid="monitoring-dashboard-container"
      className="bg-gray-50 min-h-screen p-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div data-testid="monitoring-dashboard-header" className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            System Metrics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time health and performance monitoring
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(["overview", "performance", "errors", "alerts"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-6 border-b-2 font-medium text-sm capitalize transition-colors ${
                      activeTab === tab
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && health && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Overall Health"
                value={`${health.overallScore}%`}
                subtitle={health.status}
                status={getHealthStatus(health.overallScore)}
                trend={
                  health.overallScore > 85
                    ? "up"
                    : health.overallScore < 70
                      ? "down"
                      : "stable"
                }
              />
              <MetricCard
                title="Uptime"
                value={formatUptime(health.uptime)}
                subtitle="System running time"
              />
              <MetricCard
                title="Error Rate"
                value={errors?.errorRate.toFixed(2) || "0"}
                subtitle="Errors per minute"
                status={
                  errors && errors.errorRate > 10
                    ? "critical"
                    : errors && errors.errorRate > 5
                      ? "warning"
                      : "healthy"
                }
              />
              <MetricCard
                title="Active Agents"
                value={
                  health.checks.find(
                    (c) => c.type === HealthCheckType.AGENT_EXECUTION,
                  )?.details?.available || 0
                }
                subtitle="Available agents"
              />
            </div>

            {/* Health Checks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Health Checks</h2>
              <div className="space-y-3">
                {health.checks.map((check) => (
                  <div
                    key={check.type}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={check.status} size="small" />
                      <div>
                        <p className="font-medium text-sm">
                          {check.type.replace(/_/g, " ").toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">{check.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{check.score}%</p>
                      <p className="text-xs text-gray-500">
                        {check.latency.toFixed(0)}ms
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {health.recommendations && health.recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Recommendations
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {health.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-blue-800">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && performance && (
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total Operations"
                value={performance.totalOperations}
                subtitle="In reporting period"
              />
              <MetricCard
                title="Average Latency"
                value={`${performance.averageLatency.toFixed(2)}ms`}
                subtitle="Across all operations"
                status={
                  performance.averageLatency > 1000 ? "warning" : "healthy"
                }
              />
              <MetricCard
                title="Error Rate"
                value={`${performance.errorRate.toFixed(1)}%`}
                subtitle="Failed operations"
                status={
                  performance.errorRate > 10
                    ? "critical"
                    : performance.errorRate > 5
                      ? "warning"
                      : "healthy"
                }
              />
            </div>

            {/* Metrics by Type */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                Performance by Operation Type
              </h2>
              <div className="space-y-4">
                {Array.from(performance.metrics.entries()).map(
                  ([type, stats]) => (
                    <div key={type} className="border-b border-gray-200 pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {type.replace(/_/g, " ").toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stats.count} operations
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {stats.successRate.toFixed(1)}% success
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Avg:</span>
                          <span className="ml-1 font-medium">
                            {stats.averageDuration.toFixed(0)}ms
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">P50:</span>
                          <span className="ml-1 font-medium">
                            {stats.p50.toFixed(0)}ms
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">P90:</span>
                          <span className="ml-1 font-medium">
                            {stats.p90.toFixed(0)}ms
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">P99:</span>
                          <span className="ml-1 font-medium">
                            {stats.p99.toFixed(0)}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === "errors" && errors && (
          <div className="space-y-6">
            {/* Error Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Errors"
                value={errors.totalErrors}
                subtitle="All time"
                status={errors.totalErrors > 50 ? "warning" : "healthy"}
              />
              <MetricCard
                title="Error Rate"
                value={`${errors.errorRate.toFixed(2)}/min`}
                subtitle="Current rate"
                status={
                  errors.errorRate > 10
                    ? "critical"
                    : errors.errorRate > 5
                      ? "warning"
                      : "healthy"
                }
              />
              <MetricCard
                title="Recovery Rate"
                value={`${errors.recoveryRate.toFixed(1)}%`}
                subtitle="Recovered errors"
                status={
                  errors.recoveryRate < 50
                    ? "critical"
                    : errors.recoveryRate < 75
                      ? "warning"
                      : "healthy"
                }
              />
              <MetricCard
                title="Critical Errors"
                value={errors.criticalErrors.length}
                subtitle="Unresolved"
                status={
                  errors.criticalErrors.length > 0 ? "critical" : "healthy"
                }
              />
            </div>

            {/* Error Categories */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Errors by Category</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from(errors.categories.entries()).map(
                  ([category, stats]) => (
                    <div key={category} className="text-center">
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-gray-600">{category}</p>
                      <div className="mt-2 flex justify-center space-x-2 text-xs">
                        <span className="text-green-600">
                          {stats.resolved} resolved
                        </span>
                        <span className="text-red-600">
                          {stats.unresolved} active
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Top Errors */}
            {errors.topErrors.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Most Frequent Errors
                </h2>
                <div className="space-y-3">
                  {errors.topErrors.slice(0, 5).map((error) => (
                    <div
                      key={error.id}
                      className="flex justify-between items-start border-b border-gray-200 pb-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{error.message}</p>
                        <div className="flex space-x-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {error.category}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              error.severity === "critical"
                                ? "text-red-600"
                                : error.severity === "high"
                                  ? "text-orange-600"
                                  : error.severity === "medium"
                                    ? "text-yellow-600"
                                    : "text-gray-600"
                            }`}
                          >
                            {error.severity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{error.count}x</p>
                        {error.recovered && (
                          <span className="text-xs text-green-600">
                            Recovered
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      severity={alert.severity}
                      message={alert.message}
                      timestamp={alert.timestamp}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No alerts at this time
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsDashboard;

/**
 * Metrics Grid Component
 * Displays success metrics with trend indicators
 */

import React from "react";
import { TrendingUp } from "lucide-react";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { Metric } from "../../components/types";

interface MetricsGridProps {
  metrics: (string | Metric)[];
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const normalizedMetrics: Metric[] = metrics.map((metric, index) => {
    if (typeof metric === "string") {
      return {
        id: `metric-${index}`,
        name: metric,
        current: 0,
        target: 100,
        unit: "",
        trend: "stable" as const,
      };
    }
    return metric;
  });

  const getTrendIcon = (trend: Metric["trend"]) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="vision-metrics-grid">
      {normalizedMetrics.map((metric) => (
        <div
          key={metric.id}
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800"
          data-testid={`vision-metric-${metric.id}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{metric.name}</span>
            {getTrendIcon(metric.trend)}
          </div>
          <div className="text-2xl font-bold text-gray-200 mb-1">
            {metric.current}{metric.unit}
          </div>
          {metric.target && (
            <>
              <div className="text-xs text-gray-500 mb-2">
                Target: {metric.target}{metric.unit}
              </div>
              <ProgressBar
                value={metric.current}
                max={metric.target}
                className="h-1"
                fillColor="bg-gradient-to-r from-green-500 to-emerald-500"
                animated={false}
                testIdPrefix={`metric-${metric.id}-progress`}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

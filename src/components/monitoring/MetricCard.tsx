import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status?: "healthy" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
  sparkline?: number[];
}

/**
 * Metric Card Component
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  status,
  trend,
  sparkline,
}) => {
  const statusColors = {
    healthy: "border-green-500",
    warning: "border-yellow-500",
    critical: "border-red-500",
  };

  const trendIcons = {
    up: "\u2191",
    down: "\u2193",
    stable: "\u2192",
  };

  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    stable: "text-gray-500",
  };

  return (
    <div
      data-testid={`monitoring-metric-item-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={`bg-white rounded-lg shadow p-4 border-l-4 ${status ? statusColors[status] : "border-blue-500"}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <span className={`text-lg ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 h-8 flex items-end space-x-1">
          {sparkline.map((v, i) => {
            const heightPercent = (v / Math.max(...sparkline)) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-blue-400 rounded-t transition-all duration-300"
                style={
                  {
                    "--sparkline-height": `${heightPercent}%`,
                    height: "var(--sparkline-height)",
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

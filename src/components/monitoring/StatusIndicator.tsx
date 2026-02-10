import React from "react";
import type { HealthStatus } from "../../monitoring/health";

interface StatusIndicatorProps {
  status: HealthStatus;
  size?: "small" | "medium" | "large";
}

/**
 * Status Indicator Component
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = "medium",
}) => {
  const sizeClasses = {
    small: "h-2 w-2",
    medium: "h-3 w-3",
    large: "h-4 w-4",
  };

  const statusColors = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    critical: "bg-red-500",
    failed: "bg-red-600",
  };

  return (
    <div
      data-testid={`monitoring-health-score-${status}`}
      className={`${sizeClasses[size]} ${statusColors[status]} rounded-full animate-pulse`}
    />
  );
};

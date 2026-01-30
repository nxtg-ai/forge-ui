import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  bgColor?: string;
  fillColor?: string;
  animated?: boolean;
  showPercentage?: boolean;
  testIdPrefix?: string; // Prefix for unique data-testid values
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = "",
  bgColor = "bg-gray-800",
  fillColor = "bg-gradient-to-r from-blue-500 to-purple-500",
  animated = true,
  showPercentage = false,
  testIdPrefix = "progress-bar",
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  if (animated) {
    return (
      <div
        className={`relative ${className}`}
        data-testid={`${testIdPrefix}-container`}
      >
        <div
          className={`h-full ${bgColor} rounded-full overflow-hidden`}
          data-testid={`${testIdPrefix}-track`}
        >
          <motion.div
            className={`h-full ${fillColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            data-testid={`${testIdPrefix}-fill`}
          />
        </div>
        {showPercentage && (
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-medium"
            data-testid={`${testIdPrefix}-value`}
          >
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      data-testid={`${testIdPrefix}-container`}
    >
      <div
        className={`h-full ${bgColor} rounded-full overflow-hidden`}
        data-testid={`${testIdPrefix}-track`}
      >
        <div
          className={`h-full ${fillColor} transition-all duration-300`}
          style={
            { "--progress-width": `${percentage}%` } as React.CSSProperties
          }
          data-testid={`${testIdPrefix}-fill`}
        />
      </div>
      {showPercentage && (
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-medium"
          data-testid={`${testIdPrefix}-value`}
        >
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

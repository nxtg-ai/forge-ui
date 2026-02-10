import React from "react";
import { ProgressBar } from "../ui/ProgressBar";

interface DashboardProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: "green" | "yellow" | "red" | "blue";
}

/**
 * Progress Bar Wrapper Component for Dashboard
 */
export const DashboardProgressBar: React.FC<DashboardProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = "blue",
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          {label && <span>{label}</span>}
          {showPercentage && <span>{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <ProgressBar
        value={value}
        max={max}
        className="h-2"
        fillColor={colorClasses[color]}
        bgColor="bg-gray-200"
        animated={false}
      />
    </div>
  );
};

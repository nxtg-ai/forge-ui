import React from "react";

interface AlertItemProps {
  severity: "warning" | "critical";
  message: string;
  timestamp: Date;
}

/**
 * Alert Item Component
 */
export const AlertItem: React.FC<AlertItemProps> = ({
  severity,
  message,
  timestamp,
}) => {
  const severityClasses = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    critical: "bg-red-50 border-red-200 text-red-800",
  };

  const severityIcons = {
    warning: "\u26A0",
    critical: "\uD83D\uDEA8",
  };

  return (
    <div className={`p-3 rounded-md border ${severityClasses[severity]} mb-2`}>
      <div className="flex items-start">
        <span className="text-lg mr-2">{severityIcons[severity]}</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs mt-1 opacity-75">
            {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

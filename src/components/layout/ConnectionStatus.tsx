import React from "react";

export interface ConnectionStatusProps {
  isConnected: boolean;
}

/**
 * Connection Status Indicator Component
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => (
  <div
    data-testid="app-connection-status"
    className="flex items-center space-x-2"
    aria-live="polite"
  >
    <div
      className={`h-2 w-2 rounded-full ${
        isConnected ? "bg-green-500" : "bg-red-500"
      } animate-pulse`}
      aria-hidden="true"
    />
    <span className="text-sm text-gray-400">
      {isConnected ? "Connected" : "Disconnected"}
    </span>
  </div>
);

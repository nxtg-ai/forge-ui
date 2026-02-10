import React from "react";
import {
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { ActivityFilter } from "../../hooks/useActivityFiltering";

interface ActivityFeedHeaderProps {
  isConnected: boolean;
  isReconnecting: boolean;
  isLoading: boolean;
  error: string | null;
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  onRefresh: () => void;
}

export const ActivityFeedHeader: React.FC<ActivityFeedHeaderProps> = ({
  isConnected,
  isReconnecting,
  isLoading,
  error,
  filter,
  onFilterChange,
  onRefresh,
}) => {
  return (
    <div
      data-testid="activity-feed-header"
      className="px-4 py-3 border-b border-gray-800"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Live Activity</h3>

          {/* Connection status */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? "bg-green-500"
                  : isReconnecting
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-400">
              {isConnected
                ? "Live"
                : isReconnecting
                  ? "Reconnecting"
                  : "Offline"}
            </span>
          </div>

          {/* Error indicator */}
          {error && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-900/20">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">Error</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div
            data-testid="activity-feed-filter-group"
            className="flex gap-1 px-1 py-1 bg-gray-800 rounded-lg"
          >
            <button
              data-testid="activity-feed-filter-all"
              onClick={() => onFilterChange("all")}
              className={`px-2 py-1 rounded text-xs transition-all ${
                filter === "all"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              All
            </button>
            <button
              data-testid="activity-feed-filter-important"
              onClick={() => onFilterChange("important")}
              className={`px-2 py-1 rounded text-xs transition-all ${
                filter === "important"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Important
            </button>
            <button
              data-testid="activity-feed-filter-errors"
              onClick={() => onFilterChange("errors")}
              className={`px-2 py-1 rounded text-xs transition-all ${
                filter === "errors"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Errors
            </button>
          </div>

          <button
            data-testid="activity-feed-refresh-btn"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-gray-800 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh activities"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-400 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useActivityData } from "../../hooks/useActivityData";
import type { ActivityItem } from "../../hooks/useActivityData";
import { useActivityFiltering } from "../../hooks/useActivityFiltering";
import { ActivityFeedHeader } from "../activity/ActivityFeedHeader";
import {
  ActivityItemContent,
  getActivityColor,
  formatTimestamp,
} from "../activity/ActivityItemContent";

interface LiveActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
  filterByAgent?: string[];
  onActivityClick?: (activity: ActivityItem) => void;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  maxItems = 50,
  autoScroll = true,
  filterByAgent = [],
  onActivityClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    activities,
    isConnected,
    isReconnecting,
    isLoading,
    error,
    refresh,
    clearActivities,
  } = useActivityData(maxItems, autoScroll, scrollRef);

  const { filter, setFilter, filteredActivities } = useActivityFiltering(
    activities,
    filterByAgent,
  );

  // Virtual scrolling configuration
  const VIRTUAL_SCROLL_THRESHOLD = 50;
  const ESTIMATED_ROW_HEIGHT = 64;

  // Setup virtualizer for large lists
  const virtualizer = useVirtualizer({
    count: filteredActivities.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  });

  const useVirtualScroll =
    filteredActivities.length > VIRTUAL_SCROLL_THRESHOLD;

  return (
    <div
      data-testid="activity-feed-container"
      className="h-full flex flex-col bg-gray-900/50 rounded-2xl border border-gray-800"
    >
      {/* Header */}
      <ActivityFeedHeader
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        isLoading={isLoading}
        error={error}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={refresh}
      />

      {/* Activity list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-2 max-h-100"
      >
        {filteredActivities.length > 0 ? (
          useVirtualScroll ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const activity = filteredActivities[virtualItem.index];
                return (
                  <div
                    key={activity.id || `activity-${virtualItem.index}`}
                    data-testid={`activity-feed-item-${activity.id || virtualItem.index}`}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => onActivityClick?.(activity)}
                    className={`
                      relative px-3 py-2 mb-1 rounded-lg border transition-all cursor-pointer
                      ${getActivityColor(activity.type)}
                      hover:bg-gray-800/30
                    `}
                  >
                    {activity.isNew && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg pointer-events-none animate-pulse" />
                    )}
                    <ActivityItemContent
                      activity={activity}
                      formatTimestamp={formatTimestamp}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id || `activity-${index}`}
                    data-testid={`activity-feed-item-${activity.id || index}`}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        delay: index * 0.02,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      },
                    }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    onClick={() => onActivityClick?.(activity)}
                    className={`
                      relative px-3 py-2 rounded-lg border transition-all cursor-pointer
                      ${getActivityColor(activity.type)}
                      hover:bg-gray-800/30
                    `}
                  >
                    {activity.isNew && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 2 }}
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg pointer-events-none"
                      />
                    )}
                    <ActivityItemContent
                      activity={activity}
                      formatTimestamp={formatTimestamp}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <p className="text-gray-400 mb-1">Loading activities...</p>
            <p className="text-xs text-gray-500">
              Fetching recent agent activity
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-900/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 mb-1">Failed to load activities</p>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 mb-1">No activities yet</p>
            <p className="text-xs text-gray-500">
              {isConnected
                ? "Waiting for agent activity..."
                : "Connecting to activity stream..."}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Activities will appear here when agents start working
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer with stats */}
      {filteredActivities.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/30">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Showing {filteredActivities.length} activities</span>
            <button
              onClick={clearActivities}
              className="flex items-center gap-1 hover:text-gray-300 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

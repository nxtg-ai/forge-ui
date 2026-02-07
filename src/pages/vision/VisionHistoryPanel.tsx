/**
 * Vision History Panel Component
 * Displays timeline of vision changes and updates
 */

import React from "react";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import { VisionHistoryLoading } from "../../components/ui/LoadingStates";
import { formatTimeAgo } from "./utils";

export interface VisionEvent {
  id: string;
  timestamp: Date;
  type: "created" | "updated" | "goal-added" | "goal-completed" | "focus-changed";
  actor: string;
  summary: string;
  version: string;
}

interface VisionHistoryPanelProps {
  events: VisionEvent[];
  loading: boolean;
  onSelectEvent: (event: VisionEvent) => void;
  selectedEventId: string | null;
}

export const VisionHistoryPanel: React.FC<VisionHistoryPanelProps> = ({
  events,
  loading,
  onSelectEvent,
  selectedEventId,
}) => {
  if (loading) {
    return <VisionHistoryLoading />;
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No history yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2" data-testid="vision-history-list">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <History className="w-4 h-4" />
        Vision History
      </h3>
      {events.map((event, index) => (
        <motion.button
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectEvent(event)}
          className={`
            w-full text-left p-3 rounded-lg border transition-all
            ${
              selectedEventId === event.id
                ? "bg-purple-500/20 border-purple-500/40"
                : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
            }
          `}
          data-testid={`vision-history-event-${event.id}`}
        >
          <div className="flex items-start gap-3">
            <div className={`
              w-2 h-2 rounded-full mt-2 flex-shrink-0
              ${event.type === "created" ? "bg-green-500" :
                event.type === "goal-completed" ? "bg-blue-500" :
                event.type === "updated" ? "bg-purple-500" : "bg-gray-500"}
            `} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">
                {event.summary}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>v{event.version}</span>
                <span>-</span>
                <span>{formatTimeAgo(event.timestamp)}</span>
              </div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

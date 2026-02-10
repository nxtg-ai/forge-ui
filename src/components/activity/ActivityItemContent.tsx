import React from "react";
import {
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import type { ActivityItem } from "../../hooks/useActivityData";

interface ActivityItemContentProps {
  activity: ActivityItem;
  formatTimestamp: (date: Date | string) => string;
}

export const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "thinking":
      return <Brain className="w-4 h-4 text-yellow-400" />;
    case "working":
      return <Zap className="w-4 h-4 text-blue-400" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "blocked":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "discussing":
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
  }
};

export const getActivityColor = (type: ActivityItem["type"]) => {
  switch (type) {
    case "thinking":
      return "border-yellow-500/20 bg-yellow-500/5";
    case "working":
      return "border-blue-500/20 bg-blue-500/5";
    case "completed":
      return "border-green-500/20 bg-green-500/5";
    case "blocked":
      return "border-red-500/20 bg-red-500/5";
    case "discussing":
      return "border-purple-500/20 bg-purple-500/5";
  }
};

export const formatTimestamp = (date: Date | string) => {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);
  const diff = now.getTime() - dateObj.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return dateObj.toLocaleDateString();
};

export const ActivityItemContent: React.FC<ActivityItemContentProps> = ({
  activity,
  formatTimestamp: formatTs,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {getActivityIcon(activity.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-blue-400">
                {activity.agentName}
              </span>
              {activity.relatedAgents &&
                activity.relatedAgents.length > 0 && (
                  <>
                    <span className="text-xs text-gray-500">
                      with
                    </span>
                    <div className="flex -space-x-1">
                      {activity.relatedAgents
                        .slice(0, 3)
                        .map((agent, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full bg-gray-700 border border-gray-900 flex items-center justify-center"
                          >
                            <span className="text-xs text-gray-400">
                              {agent[0]}
                            </span>
                          </div>
                        ))}
                      {activity.relatedAgents.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-gray-800 border border-gray-900 flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            +
                            {activity.relatedAgents.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
            </div>

            <p className="text-sm text-gray-300 mt-0.5">
              {activity.action}
            </p>

            {activity.details && (
              <p className="text-xs text-gray-500 mt-1">
                {activity.details}
              </p>
            )}

            {activity.confidence !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 max-w-[100px] h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${
                      activity.confidence >= 80
                        ? "bg-green-500"
                        : activity.confidence >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${activity.confidence ?? 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {activity.confidence ?? 0}% confident
                </span>
              </div>
            )}
          </div>

          <span
            data-testid={`activity-feed-timestamp-${activity.id}`}
            className="text-xs text-gray-500 whitespace-nowrap"
          >
            {formatTs(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

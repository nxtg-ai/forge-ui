/**
 * Session Persistence Indicator
 * Visual indicator showing session persistence state
 */

import React from "react";
import { Cloud, CloudOff, Zap, Clock } from "lucide-react";

interface SessionPersistenceIndicatorProps {
  isPersistent: boolean;
  sessionName: string;
  lastSaved?: Date | null;
  size?: "sm" | "md";
}

export const SessionPersistenceIndicator: React.FC<
  SessionPersistenceIndicatorProps
> = ({ isPersistent, sessionName, lastSaved, size = "md" }) => {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex items-center gap-2 ${textSize}`}
      title={isPersistent ? "Session is persistent" : "Session is ephemeral"}
    >
      {isPersistent ? (
        <>
          <div className="flex items-center gap-1.5 text-green-400">
            <Cloud className={iconSize} />
            <span>Persistent</span>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTimeSince(lastSaved)}</span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-1.5 text-yellow-400">
          <CloudOff className={iconSize} />
          <span>Ephemeral</span>
        </div>
      )}
    </div>
  );
};

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just saved";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default SessionPersistenceIndicator;

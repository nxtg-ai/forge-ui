/**
 * Oracle Feed Marquee
 * Horizontal scrolling marquee for oracle messages
 */

import React from "react";

export interface OracleMessage {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: Date;
}

interface OracleFeedMarqueeProps {
  messages: OracleMessage[];
  className?: string;
}

export const OracleFeedMarquee: React.FC<OracleFeedMarqueeProps> = ({
  messages,
  className = "",
}) => {
  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <span className="text-xs text-gray-600">No oracle messages</span>
      </div>
    );
  }

  const getTypeColor = (type: OracleMessage["type"]) => {
    switch (type) {
      case "info":
        return "text-cyan-400";
      case "warning":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const getTypeBadge = (type: OracleMessage["type"]) => {
    switch (type) {
      case "info":
        return "bg-cyan-500/10 border-cyan-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
      case "success":
        return "bg-green-500/10 border-green-500/30";
      default:
        return "bg-gray-500/10 border-gray-500/30";
    }
  };

  // Duplicate messages for seamless loop
  const duplicatedMessages = [...messages, ...messages];

  return (
    <div className={`relative overflow-hidden h-full ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="flex gap-4 animate-marquee hover:pause-animation">
          {duplicatedMessages.map((msg, index) => (
            <div
              key={`${msg.id}-${index}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border whitespace-nowrap ${getTypeBadge(msg.type)}`}
            >
              <span className={`text-xs font-medium ${getTypeColor(msg.type)}`}>
                {msg.type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-300">{msg.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OracleFeedMarquee;

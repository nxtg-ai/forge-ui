/**
 * Command History Panel
 * Displays past command executions with status and ability to rerun
 */

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  RotateCw,
  X,
  Clock,
  History,
  Terminal,
} from "lucide-react";

import type { Command as CommandType } from "../../components/types";
import type { ExecutedCommand } from "./types";
import { formatTimeAgo } from "./utils";

interface CommandHistoryPanelProps {
  history: ExecutedCommand[];
  loading: boolean;
  onRerun: (command: CommandType) => void;
  onClear: () => void;
}

export const CommandHistoryPanel: React.FC<CommandHistoryPanelProps> = ({
  history,
  loading,
  onRerun,
  onClear,
}) => {
  const getStatusIcon = (status: ExecutedCommand["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case "cancelled":
        return <X className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutedCommand["status"]) => {
    switch (status) {
      case "success":
        return "border-green-500/30 bg-green-500/5";
      case "failed":
        return "border-red-500/30 bg-red-500/5";
      case "running":
        return "border-blue-500/30 bg-blue-500/5";
      default:
        return "border-gray-800 bg-gray-900/50";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-800 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="command-history-panel">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <History className="w-4 h-4" />
          Command History
        </h3>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No commands executed yet</p>
          </div>
        ) : (
          history.map((executed, index) => (
            <motion.div
              key={executed.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`
                p-3 rounded-lg border transition-all
                ${getStatusColor(executed.status)}
              `}
              data-testid={`history-item-${executed.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(executed.status)}
                  <span className="font-medium text-sm text-gray-200">
                    {executed.command.name}
                  </span>
                </div>
                <button
                  onClick={() => onRerun(executed.command)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Run again"
                >
                  <RotateCw className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>{formatTimeAgo(executed.startedAt)}</span>
                {executed.duration !== undefined && (
                  <>
                    <span>-</span>
                    <span>{executed.duration}ms</span>
                  </>
                )}
              </div>
              {executed.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {executed.error}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

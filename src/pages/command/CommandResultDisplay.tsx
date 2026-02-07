/**
 * Command Result Display
 * Shows command execution results with output and error handling
 */

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  RotateCw,
  X,
} from "lucide-react";

import type { ExecutedCommand } from "./types";

interface CommandResultDisplayProps {
  executed: ExecutedCommand;
  onDismiss: () => void;
  onRerun: () => void;
}

export const CommandResultDisplay: React.FC<CommandResultDisplayProps> = ({
  executed,
  onDismiss,
  onRerun,
}) => {
  const output = typeof executed.result === "object" && executed.result !== null
    ? (executed.result as Record<string, unknown>).output as string || JSON.stringify(executed.result, null, 2)
    : String(executed.result || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      data-testid="command-result-display"
    >
      {/* Result Header */}
      <div className={`
        px-4 py-3 flex items-center justify-between
        ${executed.status === "success"
          ? "bg-green-500/10 border-b border-green-500/20"
          : executed.status === "failed"
            ? "bg-red-500/10 border-b border-red-500/20"
            : "bg-blue-500/10 border-b border-blue-500/20"}
      `}>
        <div className="flex items-center gap-3">
          {executed.status === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : executed.status === "failed" ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <RotateCw className="w-5 h-5 text-blue-400 animate-spin" />
          )}
          <div>
            <span className="font-semibold text-gray-100">{executed.command.name}</span>
            <span className="text-xs text-gray-400 ml-3">
              {executed.command.id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {executed.duration !== undefined && (
            <span className="text-xs text-gray-400 tabular-nums">
              {executed.duration < 1000
                ? `${executed.duration}ms`
                : `${(executed.duration / 1000).toFixed(1)}s`}
            </span>
          )}
          <button
            onClick={onRerun}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Run again"
          >
            <RotateCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Result Output */}
      <div className="bg-gray-950 max-h-[60vh] overflow-y-auto">
        {executed.status === "running" ? (
          <div className="p-6 text-center">
            <RotateCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Executing {executed.command.name}...</p>
          </div>
        ) : output ? (
          <pre className="p-4 text-sm font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {output}
          </pre>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>No output</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {executed.error && (
        <div className="px-4 py-3 bg-red-500/5 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap break-words">
              {executed.error}
            </pre>
          </div>
        </div>
      )}
    </motion.div>
  );
};

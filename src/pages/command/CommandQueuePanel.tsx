/**
 * Command Queue Panel
 * Shows running command and queued commands with execution stats
 */

import React from "react";
import {
  RotateCw,
  X,
  Layers,
  CheckCircle,
} from "lucide-react";

import { ProgressBar } from "../../components/ui/ProgressBar";
import type { ExecutedCommand } from "./types";

interface CommandQueuePanelProps {
  queue: ExecutedCommand[];
  running: ExecutedCommand | null;
  onCancel: (id: string) => void;
}

export const CommandQueuePanel: React.FC<CommandQueuePanelProps> = ({
  queue,
  running,
  onCancel,
}) => {
  return (
    <div className="h-full flex flex-col" data-testid="command-queue-panel">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Execution Queue
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Currently Running */}
        {running && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-medium text-blue-300">Running</span>
              </div>
              <button
                onClick={() => onCancel(running.id)}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="text-sm text-gray-200">{running.command.name}</div>
            <div className="text-xs text-gray-500 mt-1">{running.command.description}</div>
            <div className="mt-3">
              <ProgressBar
                value={50}
                max={100}
                className="h-1"
                fillColor="bg-blue-500"
                animated={true}
                testIdPrefix="running-progress"
              />
            </div>
          </div>
        )}

        {/* Queued Commands */}
        {queue.length > 0 ? (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Queued ({queue.length})</div>
            <div className="space-y-2">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-gray-300">{item.command.name}</span>
                  </div>
                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Remove from queue"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : !running ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No commands in queue</p>
          </div>
        ) : null}

        {/* Quick Stats */}
        <div className="mt-auto pt-4 border-t border-gray-800">
          <div className="text-xs font-medium text-gray-500 mb-2">Session Stats</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-900/50 border border-gray-800">
              <div className="text-lg font-bold text-green-400">
                {queue.filter((q) => q.status === "success").length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="p-2 rounded bg-gray-900/50 border border-gray-800">
              <div className="text-lg font-bold text-red-400">
                {queue.filter((q) => q.status === "failed").length}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

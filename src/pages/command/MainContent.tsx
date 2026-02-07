/**
 * Main Content Area
 * Displays active results, quick actions, and recent commands
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  History,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

import type { Command as CommandType } from "../../components/types";
import type { ExecutedCommand, CommandCategory } from "./types";
import { CommandResultDisplay } from "./CommandResultDisplay";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { formatTimeAgo } from "./utils";

interface MainContentProps {
  activeResult: ExecutedCommand | null;
  commandHistory: ExecutedCommand[];
  categories: CommandCategory[];
  isExecuting: boolean;
  onExecute: (command: CommandType) => void;
  onDismissResult: () => void;
  onShowResult: (executed: ExecutedCommand) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeResult,
  commandHistory,
  categories,
  isExecuting,
  onExecute,
  onDismissResult,
  onShowResult,
}) => {
  return (
    <div
      className="flex-1 min-w-0 bg-gray-950 overflow-y-auto pb-16 md:pb-0"
      role="main"
      aria-label="Command center"
      data-testid="command-view-container"
    >
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Active Result Display */}
        {activeResult && (
          <CommandResultDisplay
            executed={activeResult}
            onDismiss={onDismissResult}
            onRerun={() => onExecute(activeResult.command)}
          />
        )}

        {/* Quick Actions - always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quick Actions
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{commandHistory.filter((c) => c.status === "success").length} passed</span>
              <span>{commandHistory.filter((c) => c.status === "failed").length} failed</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">/</kbd>
              <span>palette</span>
            </div>
          </div>
          <QuickActionsGrid
            categories={categories}
            onExecute={onExecute}
            isExecuting={isExecuting}
          />
        </motion.div>

        {/* Recent Commands - compact cards */}
        {commandHistory.length > 0 && !activeResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Recent Commands
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commandHistory.slice(0, 4).map((executed) => (
                <button
                  key={executed.id}
                  onClick={() => onShowResult(executed)}
                  className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700
                             text-left transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    {executed.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <div>
                      <div className="font-medium text-sm text-gray-200">
                        {executed.command.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(executed.startedAt)}
                        {executed.duration && ` - ${executed.duration}ms`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

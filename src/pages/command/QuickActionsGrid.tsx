/**
 * Quick Actions Grid
 * Displays categorized command shortcuts in a grid layout
 */

import React from "react";
import { Play } from "lucide-react";

import type { Command as CommandType } from "../../components/types";
import type { CommandCategory } from "./types";
import { CATEGORY_COLORS } from "./constants";

interface QuickActionsGridProps {
  categories: CommandCategory[];
  onExecute: (command: CommandType) => void;
  isExecuting: boolean;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  categories,
  onExecute,
  isExecuting,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="quick-actions-grid">
      {categories.map((category) => (
        <div
          key={category.id}
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category.id] || CATEGORY_COLORS.forge}`}>
              {category.icon}
            </div>
            <h3 className="font-semibold text-gray-200">{category.name}</h3>
          </div>
          <div className="space-y-2">
            {category.commands.slice(0, 3).map((command) => (
              <button
                key={command.id}
                onClick={() => onExecute(command)}
                disabled={isExecuting}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-900 border border-gray-800
                           hover:border-gray-700 hover:bg-gray-800 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-between group"
                data-testid={`quick-action-${command.id}`}
              >
                <span className="text-sm text-gray-300 group-hover:text-gray-100">
                  {command.name}
                </span>
                <Play className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Goals Grid Component
 * Displays strategic goals with progress and dependencies
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { SafeAnimatePresence as AnimatePresence } from "../../components/ui/SafeAnimatePresence";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { Goal } from "../../components/types";

interface GoalsGridProps {
  goals: (string | Goal)[];
  onGoalUpdate?: (goalId: string, updates: Partial<Goal>) => void;
  isLocked: boolean;
}

export const GoalsGrid: React.FC<GoalsGridProps> = ({
  goals,
  onGoalUpdate,
  isLocked,
}) => {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const normalizedGoals: Goal[] = goals.map((goal, index) => {
    if (typeof goal === "string") {
      return {
        id: `goal-${index}`,
        title: goal,
        description: "",
        status: "pending" as const,
        progress: 0,
        dependencies: [],
      };
    }
    return goal;
  });

  const getStatusColor = (status: Goal["status"]) => {
    const colors = {
      pending: "text-gray-400 bg-gray-500/10 border-gray-500/20",
      "in-progress": "text-blue-400 bg-blue-500/10 border-blue-500/20",
      completed: "text-green-400 bg-green-500/10 border-green-500/20",
      blocked: "text-red-400 bg-red-500/10 border-red-500/20",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="vision-goals-grid">
      {normalizedGoals.map((goal) => (
        <motion.div
          key={goal.id}
          layout
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800
                     hover:border-gray-700 transition-all cursor-pointer"
          onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
          data-testid={`vision-goal-${goal.id}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`
                px-2 py-1 rounded-lg text-xs font-medium border
                ${getStatusColor(goal.status)}
              `}>
                {(goal.status || "pending").replace("-", " ")}
              </span>
              {goal.dependencies && goal.dependencies.length > 0 && (
                <span className="px-2 py-1 rounded-lg bg-gray-800 text-gray-500
                                 text-xs flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {goal.dependencies.length}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-300">
              {goal.progress || 0}%
            </span>
          </div>

          <h4 className="font-medium text-gray-200 mb-1">{goal.title}</h4>
          {goal.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{goal.description}</p>
          )}

          <ProgressBar
            value={goal.progress || 0}
            max={100}
            className="mt-3 h-1"
            animated={true}
            testIdPrefix={`goal-${goal.id}-progress`}
          />

          <AnimatePresence>
            {expandedGoal === goal.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-800"
              >
                {goal.dependencies && goal.dependencies.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-2">Dependencies</div>
                    <div className="flex flex-wrap gap-2">
                      {goal.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
};

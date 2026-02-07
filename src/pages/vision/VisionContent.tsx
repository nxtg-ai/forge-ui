/**
 * Vision Content Component
 * Main content area displaying mission, goals, metrics, and constraints
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Mountain,
  Clock,
  TrendingUp,
  Zap,
  Target,
  Trophy,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { EditableMission } from "./EditableMission";
import { GoalsGrid } from "./GoalsGrid";
import { MetricsGrid } from "./MetricsGrid";
import { formatTimeAgo } from "./utils";
import type { VisionData } from "../../components/types";

interface VisionContentProps {
  vision: VisionData;
  isEditing: boolean;
  onMissionSave: (mission: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  progress: {
    overall: number;
    phase: string;
    velocity: number;
  };
}

export const VisionContent: React.FC<VisionContentProps> = ({
  vision,
  isEditing,
  onMissionSave,
  onStartEdit,
  onCancelEdit,
  progress,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Mission Statement Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-cyan-900/10 border border-purple-500/20"
        data-testid="vision-mission-card"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                North Star Vision
              </h2>
              <div className="text-xs text-gray-500">
                v{vision.version || 1} - Updated {vision.lastUpdated ? formatTimeAgo(vision.lastUpdated) : "recently"}
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={onStartEdit}
              className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700
                         text-gray-300 text-xs flex items-center gap-1 transition-all"
              data-testid="vision-edit-btn"
            >
              <Edit3 className="w-3 h-3" />
              Edit Vision
            </button>
          )}
        </div>

        <EditableMission
          mission={vision.mission || ""}
          isEditing={isEditing}
          onSave={onMissionSave}
          onCancel={onCancelEdit}
          onStartEdit={onStartEdit}
          isLocked={false}
        />

        {/* Progress Summary */}
        <div className="flex items-center gap-6 text-sm mt-6 pt-4 border-t border-gray-800/50">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Timeframe:</span>
            <span className="text-gray-200 font-medium">{vision.timeframe || "Not set"}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Progress:</span>
            <span className="text-gray-200 font-medium">{progress.overall}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Velocity:</span>
            <span className="text-gray-200 font-medium">{progress.velocity}x</span>
          </div>
        </div>
      </motion.div>

      {/* Goals Section */}
      {vision.goals && Array.isArray(vision.goals) && vision.goals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="vision-goals-section"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Strategic Goals
          </h3>
          <GoalsGrid goals={vision.goals} isLocked={false} />
        </motion.div>
      )}

      {/* Metrics Section */}
      {vision.successMetrics && Array.isArray(vision.successMetrics) && vision.successMetrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="vision-metrics-section"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Success Metrics
          </h3>
          <MetricsGrid metrics={vision.successMetrics} />
        </motion.div>
      )}

      {/* Constraints Section */}
      {vision.constraints && vision.constraints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          data-testid="vision-constraints-section"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Constraints & Boundaries
          </h3>
          <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-500/20">
            <ul className="space-y-2">
              {vision.constraints.map((constraint, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-0.5">-</span>
                  <span className="text-gray-300">{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
};

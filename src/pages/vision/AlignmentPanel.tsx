/**
 * Alignment Panel Component
 * Checks decision alignment with vision and displays goal progress
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Target, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { VisionData, Goal } from "../../components/types";

export interface AlignmentCheck {
  decision: string;
  aligned: boolean;
  score: number;
  violations?: string[];
  suggestions?: string[];
}

interface AlignmentPanelProps {
  vision: VisionData | null;
  recentChecks: AlignmentCheck[];
  onCheckAlignment: (decision: string) => Promise<AlignmentCheck | null>;
}

export const AlignmentPanel: React.FC<AlignmentPanelProps> = ({
  vision,
  recentChecks,
  onCheckAlignment,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<AlignmentCheck | null>(null);

  const handleCheck = async () => {
    if (!inputValue.trim()) return;

    setChecking(true);
    const result = await onCheckAlignment(inputValue);
    if (result) {
      setLastCheck(result);
    }
    setChecking(false);
  };

  return (
    <div className="p-4 space-y-4" data-testid="alignment-panel">
      <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Alignment Checker
      </h3>

      {/* Quick Check Input */}
      <div className="space-y-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe a decision to check alignment..."
          className="w-full h-20 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg
                     text-sm text-gray-200 placeholder-gray-500 resize-none
                     focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none"
          data-testid="alignment-input"
        />
        <button
          onClick={handleCheck}
          disabled={!inputValue.trim() || checking}
          className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30
                     border border-purple-500/30 rounded-lg text-sm font-medium
                     text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="alignment-check-btn"
        >
          {checking ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking...
            </span>
          ) : (
            "Check Alignment"
          )}
        </button>
      </div>

      {/* Last Check Result */}
      {lastCheck && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            p-3 rounded-lg border
            ${lastCheck.aligned
              ? "bg-green-900/20 border-green-500/30"
              : "bg-amber-900/20 border-amber-500/30"}
          `}
          data-testid="alignment-result"
        >
          <div className="flex items-center gap-2 mb-2">
            {lastCheck.aligned ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span className={`text-sm font-medium ${lastCheck.aligned ? "text-green-400" : "text-amber-400"}`}>
              {lastCheck.aligned ? "Aligned" : "Needs Review"}
            </span>
            <span className="ml-auto text-xs text-gray-500">
              Score: {(lastCheck.score * 100).toFixed(0)}%
            </span>
          </div>

          {lastCheck.violations && lastCheck.violations.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">Violations:</div>
              {lastCheck.violations.map((v, i) => (
                <div key={i} className="text-xs text-amber-300 pl-2">- {v}</div>
              ))}
            </div>
          )}

          {lastCheck.suggestions && lastCheck.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">Suggestions:</div>
              {lastCheck.suggestions.map((s, i) => (
                <div key={i} className="text-xs text-gray-300 pl-2">- {s}</div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Goals Progress Summary */}
      {vision && vision.goals && Array.isArray(vision.goals) && vision.goals.length > 0 && (
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Goals Progress
          </h4>
          <div className="space-y-3">
            {vision.goals.slice(0, 5).map((goal, index) => {
              const goalData = typeof goal === "string"
                ? { id: `goal-${index}`, title: goal, progress: 0, status: "pending" as const }
                : goal;

              return (
                <div key={goalData.id || index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">
                      {goalData.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      {goalData.progress || 0}%
                    </span>
                  </div>
                  <ProgressBar
                    value={goalData.progress || 0}
                    max={100}
                    className="h-1"
                    animated={false}
                    testIdPrefix={`goal-progress-${goalData.id || index}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

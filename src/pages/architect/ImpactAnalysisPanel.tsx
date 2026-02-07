/**
 * Impact Analysis Panel Component
 * Displays impact metrics, tradeoffs, risks, and opportunities for a decision
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Scale,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  GitBranch,
} from "lucide-react";
import type { ArchitectDecision, ImpactAnalysis } from "./types";

interface ImpactAnalysisPanelProps {
  decision: ArchitectDecision | null;
  analysis: ImpactAnalysis | null;
  loading: boolean;
}

export const ImpactAnalysisPanel: React.FC<ImpactAnalysisPanelProps> = ({
  decision,
  analysis,
  loading,
}) => {
  if (!decision) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a decision to view impact analysis</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = analysis ? [
    { label: "Performance", value: analysis.performance, color: "from-blue-500 to-cyan-500" },
    { label: "Scalability", value: analysis.scalability, color: "from-green-500 to-emerald-500" },
    { label: "Maintainability", value: analysis.maintainability, color: "from-purple-500 to-pink-500" },
    { label: "Security", value: analysis.security, color: "from-red-500 to-orange-500" },
    { label: "Cost Efficiency", value: analysis.cost, color: "from-yellow-500 to-amber-500" },
    { label: "Timeline", value: analysis.timeline, color: "from-cyan-500 to-blue-500" },
  ] : [];

  return (
    <div className="p-4 space-y-6" data-testid="impact-analysis-panel">
      {/* Impact Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Impact Metrics
        </h3>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{metric.label}</span>
                <span className="text-gray-200 font-medium">{metric.value ?? 0}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metric.value ?? 0}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`h-full bg-gradient-to-r ${metric.color} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tradeoffs */}
      {decision.tradeoffs && decision.tradeoffs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Tradeoffs
          </h3>
          <ul className="space-y-2">
            {decision.tradeoffs.map((tradeoff, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">-</span>
                {tradeoff}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {analysis?.risks && analysis.risks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            Risks
          </h3>
          <ul className="space-y-2">
            {analysis.risks.map((risk, idx) => (
              <li key={idx} className="text-sm text-red-300/80 flex items-start gap-2 bg-red-900/10 p-2 rounded">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Opportunities */}
      {analysis?.opportunities && analysis.opportunities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-green-400" />
            Opportunities
          </h3>
          <ul className="space-y-2">
            {analysis.opportunities.map((opp, idx) => (
              <li key={idx} className="text-sm text-green-300/80 flex items-start gap-2 bg-green-900/10 p-2 rounded">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Decisions */}
      {decision.relatedDecisions && decision.relatedDecisions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Related Decisions
          </h3>
          <div className="flex flex-wrap gap-2">
            {decision.relatedDecisions.map((related) => (
              <span
                key={related}
                className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400"
              >
                {related}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

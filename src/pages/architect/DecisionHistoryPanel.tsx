/**
 * Decision History Panel Component
 * Displays filterable list of architecture decisions with status and consensus
 */

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Search } from "lucide-react";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { ArchitectDecision } from "./types";

interface DecisionHistoryPanelProps {
  decisions: ArchitectDecision[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (decision: ArchitectDecision) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export const DecisionHistoryPanel: React.FC<DecisionHistoryPanelProps> = ({
  decisions,
  loading,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}) => {
  const filteredDecisions = useMemo(() => {
    if (!filter) return decisions;
    const lowerFilter = filter.toLowerCase();
    return decisions.filter(
      (d) =>
        d.title.toLowerCase().includes(lowerFilter) ||
        d.description?.toLowerCase().includes(lowerFilter) ||
        d.tags?.some((t) => t.toLowerCase().includes(lowerFilter))
    );
  }, [decisions, filter]);

  const statusColors = {
    proposed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    discussing: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    approved: "text-green-400 bg-green-500/10 border-green-500/20",
    rejected: "text-red-400 bg-red-500/10 border-red-500/20",
    implemented: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };

  const impactColors = {
    low: "text-gray-400",
    medium: "text-yellow-400",
    high: "text-orange-400",
    critical: "text-red-400",
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-800 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="decision-history-panel">
      {/* Search/Filter */}
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Search decisions..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg
                       text-sm text-gray-200 placeholder-gray-500
                       focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none"
            data-testid="decision-search-input"
          />
        </div>
      </div>

      {/* Decision List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No decisions found</p>
          </div>
        ) : (
          filteredDecisions.map((decision, index) => (
            <motion.button
              key={decision.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(decision)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all
                ${
                  selectedId === decision.id
                    ? "bg-purple-500/20 border-purple-500/40"
                    : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                }
              `}
              data-testid={`decision-item-${decision.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`
                  px-2 py-0.5 rounded text-xs font-medium border
                  ${statusColors[decision.status]}
                `}>
                  {decision.status}
                </span>
                <span className={`text-xs ${impactColors[decision.impact]}`}>
                  {decision.impact} impact
                </span>
              </div>
              <h4 className="font-medium text-gray-200 text-sm mb-1 line-clamp-2">
                {decision.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{decision.proposedBy}</span>
                <span>-</span>
                <span>{formatTimeAgo(decision.proposedAt)}</span>
              </div>
              {decision.consensus !== undefined && (
                <div className="mt-2">
                  <ProgressBar
                    value={decision.consensus}
                    max={100}
                    className="h-1"
                    fillColor={decision.consensus >= 75 ? "bg-green-500" : decision.consensus >= 50 ? "bg-yellow-500" : "bg-red-500"}
                    animated={false}
                    testIdPrefix={`consensus-${decision.id}`}
                  />
                </div>
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
};

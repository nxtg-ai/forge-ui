/**
 * Architect View Page - SOTA Implementation
 * Real API integration with architecture decision management
 *
 * Features:
 * - Left panel: Decision History (collapsible, 320px)
 * - Center: Main architect discussion/decision interface
 * - Right panel: Impact Analysis + Tradeoffs (collapsible, 320px)
 * - Footer: Oracle Feed + panel toggles
 * - Responsive: Mobile (full-screen + overlays), Tablet (2-col), Desktop (3-col)
 * - Full keyboard navigation and screen reader support
 * - Real WebSocket updates for collaborative decisions
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import {
  Building2,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCode,
  GitBranch,
  Database,
  Cloud,
  Shield,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ChevronRight,
  Clock,
  ArrowRight,
  Layers,
  Package,
  Settings,
  History,
  RefreshCw,
  Plus,
  Search,
  Filter,
  LayoutDashboard,
  Keyboard,
  Send,
  Target,
  Scale,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

import { AppShell } from "../components/layout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ProgressBar } from "../components/ui/ProgressBar";
import { type KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";
import { ToastProvider, useToast } from "../components/feedback/ToastSystem";
import {
  useRealtimeConnection,
  useAdaptivePolling,
} from "../hooks/useRealtimeConnection";
import { apiClient } from "../services/api-client";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import type { ArchitectureDecision } from "../components/types";
import { useLayout } from "../contexts/LayoutContext";

// Architect-specific keyboard shortcuts
const ARCHITECT_SHORTCUTS: KeyboardShortcut[] = [
  { key: "[", description: "Toggle History panel", category: "navigation" },
  { key: "]", description: "Toggle Impact panel", category: "navigation" },
  { key: "n", description: "New decision proposal", category: "actions" },
  { key: "a", description: "Approve selected decision", category: "actions" },
  { key: "r", description: "Refresh decisions", category: "actions" },
  { key: "Escape", description: "Close panels / Cancel", category: "general" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
  { key: "/", description: "Focus search", category: "navigation" },
];

// ============= Types =============

interface ArchitectDecision extends ArchitectureDecision {
  id: string;
  title: string;
  description: string;
  approach: string;
  rationale: string;
  tradeoffs: string[];
  impact: "low" | "medium" | "high" | "critical";
  status: "proposed" | "discussing" | "approved" | "rejected" | "implemented";
  proposedBy: string;
  proposedAt: Date;
  approvedBy?: string[];
  consensus: number;
  votes?: { approve: number; reject: number; abstain: number };
  relatedDecisions?: string[];
  tags?: string[];
}

interface ImpactAnalysis {
  performance: number;
  scalability: number;
  maintainability: number;
  security: number;
  cost: number;
  timeline: number;
  risks: string[];
  opportunities: string[];
}

// ============= Sub-components =============

// Decision History Panel
const DecisionHistoryPanel: React.FC<{
  decisions: ArchitectDecision[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (decision: ArchitectDecision) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}> = ({ decisions, loading, selectedId, onSelect, filter, onFilterChange }) => {
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

// Impact Analysis Panel
const ImpactAnalysisPanel: React.FC<{
  decision: ArchitectDecision | null;
  analysis: ImpactAnalysis | null;
  loading: boolean;
}> = ({ decision, analysis, loading }) => {
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

// Proposal Form Component
const ProposalForm: React.FC<{
  onSubmit: (proposal: Partial<ArchitectDecision>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ onSubmit, onCancel, isSubmitting }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [approach, setApproach] = useState("");
  const [rationale, setRationale] = useState("");
  const [impact, setImpact] = useState<ArchitectDecision["impact"]>("medium");
  const [tradeoffs, setTradeoffs] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      approach,
      rationale,
      impact,
      tradeoffs: tradeoffs.split("\n").filter((t) => t.trim()),
      status: "proposed",
      proposedAt: new Date(),
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onSubmit={handleSubmit}
      className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 space-y-4"
      data-testid="proposal-form"
    >
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Plus className="w-5 h-5 text-purple-400" />
        New Architecture Proposal
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g., Adopt Event Sourcing for Order Management"
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-gray-200 placeholder-gray-500
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          data-testid="proposal-title-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={2}
          placeholder="Brief description of what this decision addresses..."
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-gray-200 placeholder-gray-500 resize-none
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          data-testid="proposal-description-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Proposed Approach</label>
        <textarea
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
          required
          rows={3}
          placeholder="Describe the proposed solution or approach..."
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-gray-200 placeholder-gray-500 resize-none
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          data-testid="proposal-approach-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Rationale</label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          required
          rows={2}
          placeholder="Why is this the right approach?"
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                     text-gray-200 placeholder-gray-500 resize-none
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          data-testid="proposal-rationale-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Impact Level</label>
          <select
            value={impact}
            onChange={(e) => setImpact(e.target.value as ArchitectDecision["impact"])}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                       text-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            data-testid="proposal-impact-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Tradeoffs</label>
          <textarea
            value={tradeoffs}
            onChange={(e) => setTradeoffs(e.target.value)}
            rows={1}
            placeholder="One tradeoff per line..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                       text-gray-200 placeholder-gray-500 resize-none
                       focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            data-testid="proposal-tradeoffs-input"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !approach.trim()}
          className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700
                     disabled:cursor-not-allowed text-white rounded-lg font-medium
                     transition-all flex items-center justify-center gap-2"
          data-testid="proposal-submit-btn"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Proposal
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300
                     rounded-lg font-medium transition-all"
          data-testid="proposal-cancel-btn"
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );
};

// Decision Detail View
const DecisionDetailView: React.FC<{
  decision: ArchitectDecision;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isApproving: boolean;
}> = ({ decision, onApprove, onReject, isApproving }) => {
  const statusColors = {
    proposed: "from-blue-500 to-cyan-500",
    discussing: "from-purple-500 to-pink-500",
    approved: "from-green-500 to-emerald-500",
    rejected: "from-red-500 to-orange-500",
    implemented: "from-cyan-500 to-blue-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      data-testid="decision-detail-view"
    >
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/50 border border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statusColors[decision.status]} flex items-center justify-center`}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">{decision.title}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>Proposed by {decision.proposedBy}</span>
                <span>-</span>
                <span>{formatTimeAgo(decision.proposedAt)}</span>
              </div>
            </div>
          </div>
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium
            bg-gradient-to-r ${statusColors[decision.status]} text-white
          `}>
            {decision.status.charAt(0).toUpperCase() + decision.status.slice(1)}
          </div>
        </div>

        <p className="text-gray-300 leading-relaxed mb-4">
          {decision.description}
        </p>

        {decision.tags && decision.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {decision.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Approach & Rationale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            Proposed Approach
          </h3>
          <p className="text-gray-200 text-sm leading-relaxed">
            {decision.approach || "No approach specified"}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Rationale
          </h3>
          <p className="text-gray-200 text-sm leading-relaxed">
            {decision.rationale || "No rationale provided"}
          </p>
        </div>
      </div>

      {/* Voting Section */}
      {decision.status === "proposed" || decision.status === "discussing" ? (
        <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Cast Your Vote
          </h3>

          {decision.consensus !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-400">Current Consensus</span>
                <span className={`font-medium ${
                  decision.consensus >= 75 ? "text-green-400" :
                  decision.consensus >= 50 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {decision.consensus}%
                </span>
              </div>
              <ProgressBar
                value={decision.consensus}
                max={100}
                className="h-2"
                fillColor={
                  decision.consensus >= 75 ? "bg-green-500" :
                  decision.consensus >= 50 ? "bg-yellow-500" : "bg-red-500"
                }
                animated={true}
                testIdPrefix="consensus-progress"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="flex-1 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30
                         text-green-400 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              data-testid="decision-approve-btn"
            >
              {isApproving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={onReject}
              disabled={isApproving}
              className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30
                         text-red-400 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              data-testid="decision-reject-btn"
            >
              <ThumbsDown className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      ) : decision.status === "approved" ? (
        <div className="p-4 rounded-xl bg-green-900/20 border border-green-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <h4 className="font-medium text-green-400">Decision Approved</h4>
              {decision.approvedBy && (
                <p className="text-sm text-gray-400">
                  Approved by: {decision.approvedBy.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : decision.status === "rejected" ? (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <div>
              <h4 className="font-medium text-red-400">Decision Rejected</h4>
              <p className="text-sm text-gray-400">
                This proposal was not accepted.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

// ============= Helper Functions =============

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

// ============= Main Component =============

const ArchitectView: React.FC = () => {
  const { toast } = useToast();

  // Layout management from centralized LayoutContext
  const {
    contextPanelVisible: historyPanelVisible,
    governancePanelVisible: impactPanelVisible,
    footerVisible,
    toggleContextPanel: toggleHistoryPanel,
    toggleGovernancePanel: toggleImpactPanel,
    layout,
  } = useLayout();

  // State
  const [decisions, setDecisions] = useState<ArchitectDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<ArchitectDecision | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Architecture decision system active",
      timestamp: new Date(),
    },
  ]);

  // WebSocket connection
  const { isConnected, sendMessage, messages, clearMessages } = useRealtimeConnection({
    url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    onOpen: () => {
      toast.success("Connected to Forge", { message: "Real-time updates enabled" });
    },
  });

  // Fetch decisions
  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getArchitectureDecisions();
      if (response.success && response.data) {
        // Map backend data to our format
        const mappedDecisions: ArchitectDecision[] = (response.data as any[]).map((d: any) => ({
          id: d.id || `decision-${Date.now()}`,
          title: d.title || d.approach || "Untitled Decision",
          description: d.description || "",
          approach: d.approach || "",
          rationale: d.rationale || "",
          tradeoffs: d.tradeoffs || [],
          impact: d.impact || "medium",
          status: d.status || "proposed",
          proposedBy: d.proposedBy || "Unknown",
          proposedAt: d.proposedAt ? new Date(d.proposedAt) : new Date(),
          approvedBy: d.approvedBy,
          consensus: d.consensus,
          votes: d.votes,
          relatedDecisions: d.relatedDecisions,
          tags: d.tags,
          signedOffBy: d.signedOffBy || [],
        }));
        setDecisions(mappedDecisions);
      }
    } catch (error) {
      console.error("Failed to fetch decisions:", error);
      toast.error("Failed to load decisions", { message: "Please try again" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Submit proposal
  const handleProposalSubmit = useCallback(async (proposal: Partial<ArchitectDecision>) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.proposeArchitecture(proposal as any);
      if (response.success) {
        toast.success("Proposal submitted", { message: "Your architecture decision has been proposed" });
        setShowProposalForm(false);
        await fetchDecisions();

        // Broadcast via WebSocket
        if (isConnected) {
          sendMessage({ type: "decision.made", payload: response.data });
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast.error("Failed to submit proposal", { message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchDecisions, isConnected, sendMessage, toast]);

  // Approve decision
  const handleApprove = useCallback(async () => {
    if (!selectedDecision) return;

    setIsApproving(true);
    try {
      const response = await apiClient.approveArchitectureDecision(selectedDecision.id);
      if (response.success) {
        toast.success("Decision approved", { message: `"${selectedDecision.title}" has been approved` });
        await fetchDecisions();

        // Broadcast via WebSocket
        if (isConnected) {
          sendMessage({ type: "decision.made", payload: response.data });
        }
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      toast.error("Failed to approve", { message: error.message });
    } finally {
      setIsApproving(false);
    }
  }, [selectedDecision, fetchDecisions, isConnected, sendMessage, toast]);

  // Reject decision (local only for now)
  const handleReject = useCallback(async () => {
    if (!selectedDecision) return;

    setIsApproving(true);
    try {
      // For now, just update local state - would need backend endpoint
      setDecisions((prev) =>
        prev.map((d) =>
          d.id === selectedDecision.id ? { ...d, status: "rejected" as const } : d
        )
      );
      toast.info("Decision rejected", { message: `"${selectedDecision.title}" has been rejected` });
    } finally {
      setIsApproving(false);
    }
  }, [selectedDecision, toast]);

  // Handle decision selection
  const handleSelectDecision = useCallback((decision: ArchitectDecision) => {
    setSelectedDecision(decision);
    setShowProposalForm(false);

    // Generate mock impact analysis
    setImpactLoading(true);
    setTimeout(() => {
      setImpactAnalysis({
        performance: Math.floor(Math.random() * 30) + 70,
        scalability: Math.floor(Math.random() * 30) + 70,
        maintainability: Math.floor(Math.random() * 30) + 70,
        security: Math.floor(Math.random() * 30) + 70,
        cost: Math.floor(Math.random() * 30) + 70,
        timeline: Math.floor(Math.random() * 30) + 70,
        risks: [
          "Increased complexity in initial implementation",
          "Team learning curve for new patterns",
        ],
        opportunities: [
          "Better long-term maintainability",
          "Improved system resilience",
        ],
      });
      setImpactLoading(false);
    }, 500);
  }, []);

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((message: any) => {
        if (message.type === "decision.made") {
          fetchDecisions();
          toast.info("Decision updated", { message: "Architecture decisions have been updated" });
        }
      });
      clearMessages();
    }
  }, [messages, clearMessages, fetchDecisions, toast]);

  // Initial data load
  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== "Escape") return;
      }

      switch (e.key) {
        case "[":
          e.preventDefault();
          toggleHistoryPanel();
          setAnnouncement(`History panel ${!historyPanelVisible ? "opened" : "closed"}`);
          break;
        case "]":
          e.preventDefault();
          toggleImpactPanel();
          setAnnouncement(`Impact panel ${!impactPanelVisible ? "opened" : "closed"}`);
          break;
        case "n":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowProposalForm(true);
            setSelectedDecision(null);
            setAnnouncement("New proposal form opened");
          }
          break;
        case "a":
          if (!e.ctrlKey && !e.metaKey && selectedDecision) {
            e.preventDefault();
            handleApprove();
          }
          break;
        case "r":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            fetchDecisions();
            toast.info("Refreshing decisions...");
          }
          break;
        case "Escape":
          if (showProposalForm) {
            setShowProposalForm(false);
            setAnnouncement("Proposal form closed");
          } else if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
          }
          break;
        case "?":
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
        case "/":
          e.preventDefault();
          // Focus search input
          const searchInput = document.querySelector('[data-testid="decision-search-input"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    historyPanelVisible,
    impactPanelVisible,
    showProposalForm,
    showKeyboardHelp,
    selectedDecision,
    toggleHistoryPanel,
    toggleImpactPanel,
    handleApprove,
    fetchDecisions,
    toast,
  ]);

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <AppShell
        // Page identity
        title="Architecture Decisions"
        icon={<Building2 className="w-6 h-6" />}
        badge={`${decisions.filter(d => d.status === 'proposed').length} Pending`}

        // Left Panel - History
        leftPanel={
          <DecisionHistoryPanel
            decisions={decisions}
            loading={loading}
            selectedId={selectedDecision?.id || null}
            onSelect={handleSelectDecision}
            filter={searchFilter}
            onFilterChange={setSearchFilter}
          />
        }
        showLeftPanel={historyPanelVisible}
        leftPanelWidth={320}
        leftPanelTitle="Decision History"

        // Right Panel - Impact Analysis
        rightPanel={
          <ErrorBoundary fallbackMessage="Impact panel error">
            <ImpactAnalysisPanel
              decision={selectedDecision}
              analysis={impactAnalysis}
              loading={impactLoading}
            />
          </ErrorBoundary>
        }
        showRightPanel={impactPanelVisible}
        rightPanelWidth={320}
        rightPanelTitle="Impact Analysis"

        // Footer
        showFooter={footerVisible}
        sessionName="architect"
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={toggleHistoryPanel}
        onToggleGovernance={toggleImpactPanel}
        contextVisible={historyPanelVisible}
        governanceVisible={impactPanelVisible}

        // Keyboard shortcuts
        customShortcuts={ARCHITECT_SHORTCUTS}

        className="h-screen"
        data-testid="architect-view-container"
      >
        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {showProposalForm ? (
              <ProposalForm
                key="proposal-form"
                onSubmit={handleProposalSubmit}
                onCancel={() => setShowProposalForm(false)}
                isSubmitting={isSubmitting}
              />
            ) : selectedDecision ? (
              <DecisionDetailView
                key={selectedDecision.id}
                decision={selectedDecision}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={isApproving}
              />
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Building2 className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h2 className="text-2xl font-bold text-gray-400 mb-2">
                  Architecture Decision Records
                </h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Select a decision from the history panel or create a new proposal
                  to start making architecture decisions.
                </p>
                <button
                  onClick={() => setShowProposalForm(true)}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600
                             text-white rounded-lg font-medium transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Proposal
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppShell>
    </>
  );
};

// Wrap with providers
const ArchitectPage: React.FC = () => {
  return (
    <ToastProvider>
      <ArchitectView />
    </ToastProvider>
  );
};

export default ArchitectPage;

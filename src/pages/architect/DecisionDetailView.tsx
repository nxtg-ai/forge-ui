/**
 * Decision Detail View Component
 * Displays full details of a selected architecture decision with voting controls
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Target,
  Brain,
  Users,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ProgressBar } from "../../components/ui/ProgressBar";
import type { ArchitectDecision } from "./types";

interface DecisionDetailViewProps {
  decision: ArchitectDecision;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isApproving: boolean;
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

export const DecisionDetailView: React.FC<DecisionDetailViewProps> = ({
  decision,
  onApprove,
  onReject,
  isApproving,
}) => {
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

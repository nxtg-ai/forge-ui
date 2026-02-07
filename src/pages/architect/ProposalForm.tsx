/**
 * Proposal Form Component
 * Form for submitting new architecture decision proposals
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Send, RefreshCw } from "lucide-react";
import type { ArchitectDecision } from "./types";

interface ProposalFormProps {
  onSubmit: (proposal: Partial<ArchitectDecision>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const ProposalForm: React.FC<ProposalFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
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

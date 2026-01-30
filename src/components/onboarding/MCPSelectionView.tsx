/**
 * MCP Selection View
 *
 * Beautiful UI for selecting MCP servers with AI-powered suggestions
 */

import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Circle,
  Info,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  MCPServer,
  MCPSuggestion,
} from "../../orchestration/mcp-suggestion-engine";

interface MCPSelectionViewProps {
  suggestions: MCPSuggestion;
  onSelectionComplete: (selectedIds: string[]) => void;
  onSkip: () => void;
}

export function MCPSelectionView({
  suggestions,
  onSelectionComplete,
  onSkip,
}: MCPSelectionViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(suggestions.essential.map((m) => m.id)),
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleContinue = () => {
    onSelectionComplete(Array.from(selectedIds));
  };

  const MCPServerCard = ({
    server,
    defaultSelected = false,
  }: {
    server: MCPServer;
    defaultSelected?: boolean;
  }) => {
    const isSelected = selectedIds.has(server.id);
    const isExpanded = expandedIds.has(server.id);

    const priorityColors = {
      essential: "border-green-500 bg-green-500/5",
      recommended: "border-blue-500 bg-blue-500/5",
      optional: "border-gray-600 bg-gray-800/30",
    };

    const priorityBadges = {
      essential: "bg-green-500/20 text-green-400 border-green-500/30",
      recommended: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      optional: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };

    return (
      <div
        className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
          isSelected
            ? priorityColors[server.priority]
            : "border-gray-700 bg-gray-800/50"
        } hover:border-purple-500/50`}
        onClick={() => toggleSelection(server.id)}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <div className="mt-1">
            {isSelected ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Circle className="w-6 h-6 text-gray-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {server.name}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-xs border ${priorityBadges[server.priority]}`}
              >
                {server.priority.toUpperCase()}
              </span>
              <span className="ml-auto text-sm text-gray-400 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {server.relevanceScore}% relevant
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-300 mb-3">{server.description}</p>

            {/* Use Case */}
            <div className="bg-gray-900/50 rounded p-3 mb-3">
              <p className="text-sm text-purple-400 font-medium mb-1">
                💡 Use Case
              </p>
              <p className="text-sm text-gray-300">{server.useCase}</p>
            </div>

            {/* AI Reasoning */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mb-3">
              <p className="text-sm text-blue-400 font-medium mb-1 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Why We Recommend This
              </p>
              <p className="text-sm text-gray-300">{server.reasoning}</p>
            </div>

            {/* Expand/Collapse Details */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(server.id);
              }}
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Details
                </>
              )}
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 space-y-3 border-t border-gray-700 pt-3">
                {/* Benefits */}
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">
                    Benefits:
                  </p>
                  <ul className="space-y-1">
                    {server.benefits.map((benefit, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-green-400 mt-0.5">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">
                    Example Commands:
                  </p>
                  <ul className="space-y-1">
                    {server.examples.slice(0, 2).map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-300 italic">
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Setup Info */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                  <p className="text-xs text-yellow-400 font-medium mb-1">
                    Setup Required:
                  </p>
                  <p className="text-xs text-gray-300">{server.setup}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-3">
          🔌 Supercharge Your Development with MCP Servers
        </h1>
        <p className="text-gray-400 text-lg">
          Our AI analyzed your project and recommends these integrations
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Setup time: {suggestions.totalEstimatedSetupTime}
          </span>
          <span>•</span>
          <span>{selectedIds.size} selected</span>
        </div>
      </div>

      {/* Essential */}
      {suggestions.essential.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-green-400">
              🎯 Essential (Highly Recommended)
            </h2>
            <span className="text-sm text-gray-500">
              These are crucial for your project's success
            </span>
          </div>
          <div className="space-y-4">
            {suggestions.essential.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                defaultSelected={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended */}
      {suggestions.recommended.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-blue-400">
              💡 Recommended
            </h2>
            <span className="text-sm text-gray-500">
              These will significantly boost productivity
            </span>
          </div>
          <div className="space-y-4">
            {suggestions.recommended.map((server) => (
              <MCPServerCard key={server.id} server={server} />
            ))}
          </div>
        </div>
      )}

      {/* Optional */}
      {suggestions.optional.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-400">
              🔮 Future Considerations
            </h2>
            <span className="text-sm text-gray-500">
              You can add these later as your project grows
            </span>
          </div>
          <div className="space-y-4">
            {suggestions.optional.map((server) => (
              <MCPServerCard key={server.id} server={server} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-6 -mx-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Skip for Now
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">
                {selectedIds.size} MCP server{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <p className="text-xs text-gray-500">
                ~{selectedIds.size * 2} minutes setup time
              </p>
            </div>

            <button
              onClick={handleContinue}
              disabled={selectedIds.size === 0}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg
                       hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50
                       disabled:cursor-not-allowed font-semibold shadow-lg"
            >
              Continue with Selected MCPs →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

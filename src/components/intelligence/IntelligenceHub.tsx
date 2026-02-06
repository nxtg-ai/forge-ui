/**
 * Intelligence Hub Component
 * Displays intelligence cards from Claude's memory and governance system
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Layers, AlertCircle, RefreshCw } from "lucide-react";
import { IntelligenceCard } from "./IntelligenceCard";

interface IntelligenceCardData {
  id: string;
  title: string;
  content: string;
  category: "rule" | "decision" | "pattern" | "discovery" | "architecture";
  priority: "critical" | "high" | "medium" | "low";
  source: string;
  tags: string[];
  estimatedTokens: number;
  created: string;
  updated: string;
}

interface IntelligenceHubProps {
  className?: string;
}

export const IntelligenceHub: React.FC<IntelligenceHubProps> = React.memo(
  ({ className = "" }) => {
    const [cards, setCards] = useState<IntelligenceCardData[]>([]);
    const [totalTokens, setTotalTokens] = useState(0);
    const [compactMode, setCompactMode] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [filterCategory, setFilterCategory] = useState<string>("all");

    const loadIntelligence = async () => {
      try {
        const response = await fetch("/api/memory/intelligence");
        if (!response.ok) {
          throw new Error(`Failed to fetch intelligence: ${response.status}`);
        }

        const result = await response.json();
        if (result.success && result.data && result.data.cards) {
          setCards(result.data.cards);
          setTotalTokens(result.data.totalTokens || 0);
          setError(null);
          setLastUpdate(new Date());
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Failed to load intelligence cards:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load intelligence",
        );
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      loadIntelligence();

      // Auto-refresh every 30 seconds
      const interval = setInterval(loadIntelligence, 30000);
      return () => clearInterval(interval);
    }, []);

    const filteredCards =
      filterCategory === "all"
        ? cards
        : cards.filter((card) => card.category === filterCategory);

    const categories = [
      { value: "all", label: "All", count: cards.length },
      {
        value: "rule",
        label: "Rules",
        count: cards.filter((c) => c.category === "rule").length,
      },
      {
        value: "decision",
        label: "Decisions",
        count: cards.filter((c) => c.category === "decision").length,
      },
      {
        value: "pattern",
        label: "Patterns",
        count: cards.filter((c) => c.category === "pattern").length,
      },
      {
        value: "discovery",
        label: "Discoveries",
        count: cards.filter((c) => c.category === "discovery").length,
      },
      {
        value: "architecture",
        label: "Architecture",
        count: cards.filter((c) => c.category === "architecture").length,
      },
    ];

    if (loading) {
      return (
        <div
          className={`p-4 flex items-center justify-center ${className}`}
          data-testid="intelligence-hub-loading"
        >
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading intelligence...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div
          className={`p-4 ${className}`}
          data-testid="intelligence-hub-error"
        >
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-400 mb-1">
                Failed to load intelligence
              </div>
              <div className="text-xs text-gray-300">{error}</div>
              <button
                onClick={loadIntelligence}
                className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Intelligence Hub
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCompactMode(!compactMode)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                title={compactMode ? "Expand all cards" : "Collapse all cards"}
              >
                <Layers className="w-3 h-3" />
                {compactMode ? "Compact" : "Expanded"}
              </button>
              <button
                onClick={loadIntelligence}
                className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                title="Refresh intelligence"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Token Budget */}
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-gray-400">Intelligence Loaded</span>
            <span className="font-mono text-gray-300">
              {totalTokens.toLocaleString()} tokens
            </span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filterCategory === cat.value
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Last Update */}
          <div className="mt-2 text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No intelligence cards available
            </div>
          ) : (
            filteredCards.map((card) => (
              <IntelligenceCard
                key={card.id}
                {...card}
                compactMode={compactMode}
              />
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-950/50">
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-gray-500 mb-0.5">Critical</div>
              <div className="text-sm font-semibold text-red-400">
                {cards.filter((c) => c.priority === "critical").length}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">High</div>
              <div className="text-sm font-semibold text-orange-400">
                {cards.filter((c) => c.priority === "high").length}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Total Cards</div>
              <div className="text-sm font-semibold text-gray-300">
                {filteredCards.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

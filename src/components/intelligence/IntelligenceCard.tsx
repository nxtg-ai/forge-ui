/**
 * Intelligence Card Component
 * Displays a single intelligence card with category-based styling
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  Lightbulb,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface IntelligenceCardProps {
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
  compactMode?: boolean;
  className?: string;
}

export const IntelligenceCard: React.FC<IntelligenceCardProps> = React.memo(
  ({
    title,
    content,
    category,
    priority,
    source,
    tags,
    estimatedTokens,
    compactMode = false,
    className = "",
  }) => {
    const [isExpanded, setIsExpanded] = useState(!compactMode);

    const getCategoryConfig = () => {
      switch (category) {
        case "rule":
          return {
            bg: "bg-red-500/10",
            border: "border-red-500/30",
            text: "text-red-400",
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            label: "RULE",
          };
        case "decision":
          return {
            bg: "bg-purple-500/10",
            border: "border-purple-500/30",
            text: "text-purple-400",
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            label: "DECISION",
          };
        case "pattern":
          return {
            bg: "bg-blue-500/10",
            border: "border-blue-500/30",
            text: "text-blue-400",
            icon: <Brain className="w-3.5 h-3.5" />,
            label: "PATTERN",
          };
        case "discovery":
          return {
            bg: "bg-green-500/10",
            border: "border-green-500/30",
            text: "text-green-400",
            icon: <Lightbulb className="w-3.5 h-3.5" />,
            label: "DISCOVERY",
          };
        case "architecture":
          return {
            bg: "bg-cyan-500/10",
            border: "border-cyan-500/30",
            text: "text-cyan-400",
            icon: <Code2 className="w-3.5 h-3.5" />,
            label: "ARCHITECTURE",
          };
      }
    };

    const getPriorityConfig = () => {
      switch (priority) {
        case "critical":
          return {
            bg: "bg-red-500/20",
            text: "text-red-300",
            label: "CRITICAL",
          };
        case "high":
          return {
            bg: "bg-orange-500/20",
            text: "text-orange-300",
            label: "HIGH",
          };
        case "medium":
          return {
            bg: "bg-yellow-500/20",
            text: "text-yellow-300",
            label: "MEDIUM",
          };
        case "low":
          return {
            bg: "bg-gray-500/20",
            text: "text-gray-300",
            label: "LOW",
          };
      }
    };

    const categoryConfig = getCategoryConfig();
    const priorityConfig = getPriorityConfig();

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`rounded-lg border ${categoryConfig.border} ${categoryConfig.bg} ${className}`}
        data-testid="intelligence-card"
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-2 text-left hover:bg-white/5 transition-colors rounded-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className={`mt-0.5 ${categoryConfig.text}`}>
                {categoryConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${categoryConfig.text}`}
                  >
                    {categoryConfig.label}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig.bg} ${priorityConfig.text} font-semibold`}
                  >
                    {priorityConfig.label}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-200 truncate">
                  {title}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="text-xs text-gray-400 font-mono">
                {estimatedTokens}t
              </div>
              {compactMode && (
                <div className="text-gray-400">
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-2 pb-2"
          >
            <p className="text-sm text-gray-300 mb-2 leading-relaxed">
              {content}
            </p>

            {/* Footer - Tags & Source */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 bg-gray-800/50 text-gray-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Source: {source}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  },
);

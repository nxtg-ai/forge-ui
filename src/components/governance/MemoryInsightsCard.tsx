/**
 * Memory Insights Card
 * Shows what the system has learned: rules, decisions, discoveries
 * from Claude Code's native memory (MEMORY.md).
 * Polls /api/governance/memory-insights every 60s.
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  Brain,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Scale,
} from "lucide-react";

interface MemorySection {
  title: string;
  items: string[];
  type: "rule" | "decision" | "discovery" | "other";
}

interface MemoryInsights {
  hasMemory: boolean;
  sections: MemorySection[];
  totalRules: number;
  totalDecisions: number;
  lastModified: string | null;
}

const POLL_INTERVAL = 60_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sectionIcon(type: string) {
  switch (type) {
    case "rule":
      return <BookOpen className="w-3 h-3 text-red-400" />;
    case "decision":
      return <Scale className="w-3 h-3 text-blue-400" />;
    case "discovery":
      return <Lightbulb className="w-3 h-3 text-yellow-400" />;
    default:
      return <Brain className="w-3 h-3 text-gray-400" />;
  }
}

export const MemoryInsightsCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [data, setData] = useState<MemoryInsights | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchInsights = async () => {
      try {
        const res = await fetch("/api/governance/memory-insights");
        if (!res.ok) return;
        const json = await res.json();
        if (isMountedRef.current && json.success && json.data) {
          setData(json.data);
        }
      } catch {
        // Degrade silently
      }
    };

    fetchInsights();
    const interval = setInterval(fetchInsights, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!data || !data.hasMemory) return null;

  return (
    <div
      className={`bg-gray-900/50 rounded-lg border border-gray-800 ${className}`}
      data-testid="memory-insights-card"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">Memory</span>
          <span className="text-xs text-gray-500">
            {data.totalRules}R / {data.totalDecisions}D
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800"
          >
            <div className="p-3 space-y-2">
              {/* Stats row */}
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>
                  {data.totalRules} rules, {data.totalDecisions} decisions
                </span>
                {data.lastModified && (
                  <span>Updated {timeAgo(data.lastModified)}</span>
                )}
              </div>

              {/* Sections */}
              {data.sections.map((section) => (
                <div
                  key={section.title}
                  className="bg-gray-800/50 rounded p-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {sectionIcon(section.type)}
                    <span className="text-xs text-gray-300 font-medium">
                      {section.title}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="text-[10px] text-gray-500 pl-4 truncate"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemoryInsightsCard;

/**
 * Project Context Card
 * Self-contained component that displays live operational data (git, tests, health)
 * from /api/governance/live-context. Polls every 30s.
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  GitBranch,
  GitCommit,
  ChevronDown,
  Heart,
  FlaskConical,
  ArrowUpDown,
} from "lucide-react";

interface LastCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

interface LiveTestResults {
  passing: number;
  failing: number;
  skipped: number;
  lastRun: string | null;
}

interface LiveContext {
  git: {
    branch: string;
    lastCommit: LastCommit | null;
    uncommittedCount: number;
    ahead: number;
    behind: number;
  };
  tests: LiveTestResults;
  health: {
    score: number;
    factors: { label: string; value: number; max: number }[];
  };
  timestamp: string;
}

const POLL_INTERVAL = 30_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function healthColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function healthBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

export const ProjectContextCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [ctx, setCtx] = useState<LiveContext | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchContext = async () => {
      try {
        const res = await fetch("/api/governance/live-context");
        if (!res.ok) return;
        const json = await res.json();
        if (isMountedRef.current && json.success && json.data) {
          setCtx(json.data);
        }
      } catch {
        // Degrade silently
      }
    };

    fetchContext();
    const interval = setInterval(fetchContext, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!ctx) return null;

  const { git, tests, health } = ctx;
  const totalTests = tests.passing + tests.failing + tests.skipped;

  return (
    <div
      className={`bg-gray-900/50 rounded-lg border border-gray-800 ${className}`}
      data-testid="project-context-card"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium">Project Context</span>
          <span className={`text-xs ${healthColor(health.score)}`}>
            {health.score}/100
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
            <div className="p-3 space-y-3">
              {/* Health Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-pink-400" />
                    <span className="text-xs text-gray-400">Health</span>
                  </div>
                  <span
                    className={`text-xs font-mono ${healthColor(health.score)}`}
                  >
                    {health.score}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${health.score}%` }}
                    className={`h-full rounded-full ${healthBarColor(health.score)}`}
                  />
                </div>
              </div>

              {/* Git Info */}
              <div className="bg-gray-800/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300">
                    {git.branch}
                  </span>
                  {(git.ahead > 0 || git.behind > 0) && (
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <ArrowUpDown className="w-2.5 h-2.5" />
                      {git.ahead > 0 && `+${git.ahead}`}
                      {git.ahead > 0 && git.behind > 0 && "/"}
                      {git.behind > 0 && `-${git.behind}`}
                    </span>
                  )}
                </div>

                {git.lastCommit && (
                  <div className="flex items-start gap-1.5">
                    <GitCommit className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs text-gray-300 font-mono">
                        {git.lastCommit.hash}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        {git.lastCommit.message.length > 50
                          ? git.lastCommit.message.slice(0, 50) + "..."
                          : git.lastCommit.message}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-1">
                        {timeAgo(git.lastCommit.date)}
                      </span>
                    </div>
                  </div>
                )}

                {git.uncommittedCount > 0 && (
                  <div className="text-[10px] text-yellow-500/80">
                    {git.uncommittedCount} uncommitted{" "}
                    {git.uncommittedCount === 1 ? "change" : "changes"}
                  </div>
                )}
              </div>

              {/* Test Summary */}
              <div className="bg-gray-800/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Tests</span>
                  </div>
                  {tests.lastRun && (
                    <span className="text-[10px] text-gray-600">
                      {timeAgo(tests.lastRun)}
                    </span>
                  )}
                </div>
                {totalTests > 0 ? (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-green-400">
                      {tests.passing} pass
                    </span>
                    {tests.failing > 0 && (
                      <span className="text-xs text-red-400">
                        {tests.failing} fail
                      </span>
                    )}
                    {tests.skipped > 0 && (
                      <span className="text-xs text-gray-500">
                        {tests.skipped} skip
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-600 mt-1">
                    No cached results
                  </p>
                )}
              </div>

              {/* Health Factors */}
              <div className="grid grid-cols-2 gap-1">
                {health.factors.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between px-2 py-1 bg-gray-800/30 rounded text-[10px]"
                  >
                    <span className="text-gray-500">{f.label}</span>
                    <span
                      className={`font-mono ${
                        f.value >= f.max * 0.7
                          ? "text-green-400"
                          : f.value >= f.max * 0.4
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {f.value}/{f.max}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectContextCard;

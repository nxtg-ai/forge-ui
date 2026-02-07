/**
 * Blocking Decisions Card
 * Shows governance blockers, action-required sentinel entries,
 * and pending decision workstreams.
 * Polls /api/governance/blockers every 30s.
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import { apiFetch } from "../../utils/api-fetch";
import {
  ShieldAlert,
  ChevronDown,
  AlertTriangle,
  Clock,
  CircleDot,
} from "lucide-react";

interface BlockedWorkstream {
  id: string;
  name: string;
  status: string;
  risk: string;
  blockerCount: number;
  progress: number;
}

interface ActionItem {
  id: string;
  type: string;
  message: string;
  source: string;
  timestamp: number;
  actionRequired: boolean;
}

interface PendingDecision {
  id: string;
  name: string;
  taskCount: number;
  dependencies: string[];
}

interface BlockerData {
  blockedWorkstreams: BlockedWorkstream[];
  actionItems: ActionItem[];
  pendingDecisions: PendingDecision[];
  summary: {
    totalBlockers: number;
    totalActionItems: number;
    totalPending: number;
    needsAttention: boolean;
  };
}

const POLL_INTERVAL = 30_000;

function typeColor(type: string): string {
  switch (type) {
    case "CRITICAL":
      return "text-red-500";
    case "ERROR":
      return "text-red-400";
    case "WARN":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
}

export const BlockingDecisionsCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [data, setData] = useState<BlockerData | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchBlockers = async () => {
      try {
        const res = await apiFetch("/api/governance/blockers");
        if (!res.ok) return;
        const json = await res.json();
        if (isMountedRef.current && json.success && json.data) {
          setData(json.data);
        }
      } catch {
        // Degrade silently
      }
    };

    fetchBlockers();
    const interval = setInterval(fetchBlockers, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!data || !data.summary) return null;

  const { blockedWorkstreams, actionItems, pendingDecisions, summary } = data;
  const totalIssues =
    summary.totalBlockers + summary.totalActionItems + summary.totalPending;

  return (
    <div
      className={`bg-gray-900/50 rounded-lg border ${summary.needsAttention ? "border-red-500/30" : "border-gray-800"} ${className}`}
      data-testid="blocking-decisions-card"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={`w-4 h-4 ${summary.needsAttention ? "text-red-400" : "text-green-400"}`}
          />
          <span className="text-sm font-medium">Blockers</span>
          {totalIssues > 0 ? (
            <span className="text-xs text-red-400">{totalIssues} items</span>
          ) : (
            <span className="text-xs text-green-400">Clear</span>
          )}
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
              {totalIssues === 0 ? (
                <p className="text-xs text-green-400/80 text-center py-2">
                  No blockers or pending decisions
                </p>
              ) : (
                <>
                  {/* Blocked Workstreams */}
                  {blockedWorkstreams.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" />
                        Blocked / High Risk
                      </div>
                      {blockedWorkstreams.map((ws) => (
                        <div
                          key={ws.id}
                          className="bg-red-500/5 border border-red-500/10 rounded p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">
                              {ws.name}
                            </span>
                            <span
                              className={`text-[10px] ${ws.risk === "high" ? "text-red-400" : "text-yellow-400"}`}
                            >
                              {ws.risk} risk
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-500/50 rounded-full"
                                style={{ width: `${ws.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-600">
                              {ws.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Required Items */}
                  {actionItems.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider">
                        <CircleDot className="w-3 h-3" />
                        Action Required
                      </div>
                      {actionItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="bg-gray-800/50 rounded p-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-mono ${typeColor(item.type)}`}
                            >
                              {item.type}
                            </span>
                            <span className="text-xs text-gray-400 truncate">
                              {item.message}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending Decisions */}
                  {pendingDecisions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        Pending Decisions
                      </div>
                      {pendingDecisions.map((pd) => (
                        <div
                          key={pd.id}
                          className="bg-yellow-500/5 border border-yellow-500/10 rounded p-2"
                        >
                          <span className="text-xs text-gray-300">
                            {pd.name}
                          </span>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {pd.taskCount} tasks
                            {pd.dependencies.length > 0 &&
                              ` | depends on: ${pd.dependencies.join(", ")}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlockingDecisionsCard;

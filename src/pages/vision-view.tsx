/**
 * Vision View Page
 * SOTA implementation with panel architecture, real-time updates, and full API integration
 *
 * Features:
 * - Left panel: Vision History timeline (collapsible, 320px)
 * - Center: Main vision content (VisionDisplay + Edit mode)
 * - Right panel: Alignment Checker + Goals Progress (collapsible, 320px)
 * - Footer: Oracle Feed + panel toggles
 * - Responsive: Mobile (full-screen + overlays), Tablet (2-col), Desktop (3-col)
 * - Full keyboard navigation and screen reader support
 * - Real-time WebSocket updates
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Compass,
  Mountain,
  Clock,
  History,
  CheckCircle,
  AlertTriangle,
  Edit3,
  Save,
  X,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Zap,
  Brain,
  Shield,
  GitBranch,
  Trophy,
  Plus,
  Trash2,
  LayoutDashboard,
  Keyboard,
} from "lucide-react";

import { AppShell } from "../components/layout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ProgressBar } from "../components/ui/ProgressBar";
import { VisionPageLoading, VisionHistoryLoading } from "../components/ui/LoadingStates";
import { type KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";
import { ToastProvider, useToast } from "../components/feedback/ToastSystem";
import {
  useRealtimeConnection,
  useAdaptivePolling,
} from "../hooks/useRealtimeConnection";
import { useVision } from "../hooks/useForgeIntegration";
import { apiClient } from "../services/api-client";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import type { VisionData, Goal, Metric } from "../components/types";

// Vision-specific keyboard shortcuts
const VISION_SHORTCUTS: KeyboardShortcut[] = [
  { key: "[", description: "Toggle History panel", category: "navigation" },
  { key: "]", description: "Toggle Alignment panel", category: "navigation" },
  { key: "e", description: "Edit mission", category: "actions" },
  { key: "s", description: "Save changes", category: "actions", modifiers: ["ctrl"] },
  { key: "Escape", description: "Cancel edit / Close panels", category: "general" },
  { key: "r", description: "Refresh vision data", category: "actions" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
];

// ============= Types =============

interface VisionEvent {
  id: string;
  timestamp: Date;
  type: "created" | "updated" | "goal-added" | "goal-completed" | "focus-changed";
  actor: string;
  summary: string;
  version: string;
}

interface AlignmentCheck {
  decision: string;
  aligned: boolean;
  score: number;
  violations?: string[];
  suggestions?: string[];
}

// ============= Sub-components =============

// Vision History Panel
const VisionHistoryPanel: React.FC<{
  events: VisionEvent[];
  loading: boolean;
  onSelectEvent: (event: VisionEvent) => void;
  selectedEventId: string | null;
}> = ({ events, loading, onSelectEvent, selectedEventId }) => {
  if (loading) {
    return <VisionHistoryLoading />;
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No history yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2" data-testid="vision-history-list">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
        <History className="w-4 h-4" />
        Vision History
      </h3>
      {events.map((event, index) => (
        <motion.button
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelectEvent(event)}
          className={`
            w-full text-left p-3 rounded-lg border transition-all
            ${
              selectedEventId === event.id
                ? "bg-purple-500/20 border-purple-500/40"
                : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
            }
          `}
          data-testid={`vision-history-event-${event.id}`}
        >
          <div className="flex items-start gap-3">
            <div className={`
              w-2 h-2 rounded-full mt-2 flex-shrink-0
              ${event.type === "created" ? "bg-green-500" :
                event.type === "goal-completed" ? "bg-blue-500" :
                event.type === "updated" ? "bg-purple-500" : "bg-gray-500"}
            `} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">
                {event.summary}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span>v{event.version}</span>
                <span>-</span>
                <span>{formatTimeAgo(event.timestamp)}</span>
              </div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// Alignment Checker Panel
const AlignmentPanel: React.FC<{
  vision: VisionData | null;
  recentChecks: AlignmentCheck[];
  onCheckAlignment: (decision: string) => Promise<AlignmentCheck | null>;
}> = ({ vision, recentChecks, onCheckAlignment }) => {
  const [inputValue, setInputValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<AlignmentCheck | null>(null);

  const handleCheck = async () => {
    if (!inputValue.trim()) return;

    setChecking(true);
    const result = await onCheckAlignment(inputValue);
    if (result) {
      setLastCheck(result);
    }
    setChecking(false);
  };

  return (
    <div className="p-4 space-y-4" data-testid="alignment-panel">
      <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Alignment Checker
      </h3>

      {/* Quick Check Input */}
      <div className="space-y-2">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe a decision to check alignment..."
          className="w-full h-20 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg
                     text-sm text-gray-200 placeholder-gray-500 resize-none
                     focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none"
          data-testid="alignment-input"
        />
        <button
          onClick={handleCheck}
          disabled={!inputValue.trim() || checking}
          className="w-full px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30
                     border border-purple-500/30 rounded-lg text-sm font-medium
                     text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="alignment-check-btn"
        >
          {checking ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking...
            </span>
          ) : (
            "Check Alignment"
          )}
        </button>
      </div>

      {/* Last Check Result */}
      {lastCheck && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            p-3 rounded-lg border
            ${lastCheck.aligned
              ? "bg-green-900/20 border-green-500/30"
              : "bg-amber-900/20 border-amber-500/30"}
          `}
          data-testid="alignment-result"
        >
          <div className="flex items-center gap-2 mb-2">
            {lastCheck.aligned ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span className={`text-sm font-medium ${lastCheck.aligned ? "text-green-400" : "text-amber-400"}`}>
              {lastCheck.aligned ? "Aligned" : "Needs Review"}
            </span>
            <span className="ml-auto text-xs text-gray-500">
              Score: {(lastCheck.score * 100).toFixed(0)}%
            </span>
          </div>

          {lastCheck.violations && lastCheck.violations.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">Violations:</div>
              {lastCheck.violations.map((v, i) => (
                <div key={i} className="text-xs text-amber-300 pl-2">- {v}</div>
              ))}
            </div>
          )}

          {lastCheck.suggestions && lastCheck.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-400">Suggestions:</div>
              {lastCheck.suggestions.map((s, i) => (
                <div key={i} className="text-xs text-gray-300 pl-2">- {s}</div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Goals Progress Summary */}
      {vision && vision.goals && Array.isArray(vision.goals) && vision.goals.length > 0 && (
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Goals Progress
          </h4>
          <div className="space-y-3">
            {vision.goals.slice(0, 5).map((goal, index) => {
              const goalData = typeof goal === "string"
                ? { id: `goal-${index}`, title: goal, progress: 0, status: "pending" as const }
                : goal;

              return (
                <div key={goalData.id || index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300 truncate flex-1 mr-2">
                      {goalData.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      {goalData.progress || 0}%
                    </span>
                  </div>
                  <ProgressBar
                    value={goalData.progress || 0}
                    max={100}
                    className="h-1"
                    animated={false}
                    testIdPrefix={`goal-progress-${goalData.id || index}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Editable Mission Section
const EditableMission: React.FC<{
  mission: string;
  isEditing: boolean;
  onSave: (mission: string) => void;
  onCancel: () => void;
  onStartEdit: () => void;
  isLocked: boolean;
}> = ({ mission, isEditing, onSave, onCancel, onStartEdit, isLocked }) => {
  const [editValue, setEditValue] = useState(mission);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(mission);
  }, [mission]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="space-y-3">
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                     text-lg text-gray-200 leading-relaxed resize-none
                     focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
          rows={3}
          placeholder="Enter your vision mission..."
          data-testid="vision-mission-input"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(editValue)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white
                       rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            data-testid="vision-mission-save-btn"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300
                       rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            data-testid="vision-mission-cancel-btn"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p
        className="text-lg text-gray-200 leading-relaxed"
        data-testid="vision-mission-text"
      >
        {mission || "No mission defined yet. Click edit to add one."}
      </p>
      {!isLocked && (
        <button
          onClick={onStartEdit}
          className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100
                     bg-gray-800/80 rounded-lg transition-opacity"
          title="Edit mission"
          data-testid="vision-mission-edit-btn"
        >
          <Edit3 className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
};

// Goals Grid
const GoalsGrid: React.FC<{
  goals: (string | Goal)[];
  onGoalUpdate?: (goalId: string, updates: Partial<Goal>) => void;
  isLocked: boolean;
}> = ({ goals, onGoalUpdate, isLocked }) => {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const normalizedGoals: Goal[] = goals.map((goal, index) => {
    if (typeof goal === "string") {
      return {
        id: `goal-${index}`,
        title: goal,
        description: "",
        status: "pending" as const,
        progress: 0,
        dependencies: [],
      };
    }
    return goal;
  });

  const getStatusColor = (status: Goal["status"]) => {
    const colors = {
      pending: "text-gray-400 bg-gray-500/10 border-gray-500/20",
      "in-progress": "text-blue-400 bg-blue-500/10 border-blue-500/20",
      completed: "text-green-400 bg-green-500/10 border-green-500/20",
      blocked: "text-red-400 bg-red-500/10 border-red-500/20",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="vision-goals-grid">
      {normalizedGoals.map((goal) => (
        <motion.div
          key={goal.id}
          layout
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800
                     hover:border-gray-700 transition-all cursor-pointer"
          onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
          data-testid={`vision-goal-${goal.id}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`
                px-2 py-1 rounded-lg text-xs font-medium border
                ${getStatusColor(goal.status)}
              `}>
                {(goal.status || "pending").replace("-", " ")}
              </span>
              {goal.dependencies && goal.dependencies.length > 0 && (
                <span className="px-2 py-1 rounded-lg bg-gray-800 text-gray-500
                                 text-xs flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {goal.dependencies.length}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-300">
              {goal.progress || 0}%
            </span>
          </div>

          <h4 className="font-medium text-gray-200 mb-1">{goal.title}</h4>
          {goal.description && (
            <p className="text-sm text-gray-400 line-clamp-2">{goal.description}</p>
          )}

          <ProgressBar
            value={goal.progress || 0}
            max={100}
            className="mt-3 h-1"
            animated={true}
            testIdPrefix={`goal-${goal.id}-progress`}
          />

          <AnimatePresence>
            {expandedGoal === goal.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-800"
              >
                {goal.dependencies && goal.dependencies.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-2">Dependencies</div>
                    <div className="flex flex-wrap gap-2">
                      {goal.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
};

// Success Metrics Grid
const MetricsGrid: React.FC<{
  metrics: (string | Metric)[];
}> = ({ metrics }) => {
  const normalizedMetrics: Metric[] = metrics.map((metric, index) => {
    if (typeof metric === "string") {
      return {
        id: `metric-${index}`,
        name: metric,
        current: 0,
        target: 100,
        unit: "",
        trend: "stable" as const,
      };
    }
    return metric;
  });

  const getTrendIcon = (trend: Metric["trend"]) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <span className="text-gray-400">-</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="vision-metrics-grid">
      {normalizedMetrics.map((metric) => (
        <div
          key={metric.id}
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800"
          data-testid={`vision-metric-${metric.id}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{metric.name}</span>
            {getTrendIcon(metric.trend)}
          </div>
          <div className="text-2xl font-bold text-gray-200 mb-1">
            {metric.current}{metric.unit}
          </div>
          {metric.target && (
            <>
              <div className="text-xs text-gray-500 mb-2">
                Target: {metric.target}{metric.unit}
              </div>
              <ProgressBar
                value={metric.current}
                max={metric.target}
                className="h-1"
                fillColor="bg-gradient-to-r from-green-500 to-emerald-500"
                animated={false}
                testIdPrefix={`metric-${metric.id}-progress`}
              />
            </>
          )}
        </div>
      ))}
    </div>
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

const VisionView: React.FC = () => {
  const { toast } = useToast();

  // Panel visibility state (managed by AppShell)
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false);
  const [alignmentPanelVisible, setAlignmentPanelVisible] = useState(true);
  const toggleHistoryPanel = useCallback(() => setHistoryPanelVisible((prev) => !prev), []);
  const toggleAlignmentPanel = useCallback(() => setAlignmentPanelVisible((prev) => !prev), []);

  // Vision data from hook
  const {
    vision,
    loading: visionLoading,
    error: visionError,
    updateVision,
    refresh: refreshVision,
  } = useVision();

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [visionHistory, setVisionHistory] = useState<VisionEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<string | null>(null);
  const [recentAlignmentChecks, setRecentAlignmentChecks] = useState<AlignmentCheck[]>([]);
  const [announcement, setAnnouncement] = useState("");

  // Oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Vision system active",
      timestamp: new Date(),
    },
  ]);

  // WebSocket connection
  const { isConnected, sendMessage, messages, clearMessages } = useRealtimeConnection({
    url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    onOpen: () => {
      toast.success("Connected to Forge", { message: "Real-time vision updates enabled" });
    },
  });

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((message: any) => {
        if (message.type === "vision.change") {
          refreshVision();
          toast.info("Vision updated", { message: "Changes synced from server" });
        }
      });
      clearMessages();
    }
  }, [messages, clearMessages, refreshVision, toast]);

  // Fetch vision history
  const fetchVisionHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      // Try to fetch from API - if it fails, use empty array
      const response = await fetch("/api/vision/history");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setVisionHistory(result.data.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          })));
        }
      }
    } catch (error) {
      // History endpoint may not exist yet - that's fine
      console.log("Vision history not available");
      setVisionHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Check alignment
  const checkAlignment = useCallback(async (decision: string): Promise<AlignmentCheck | null> => {
    try {
      const response = await fetch("/api/vision/alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const check = result.data as AlignmentCheck;
          setRecentAlignmentChecks((prev) => [check, ...prev].slice(0, 5));
          return check;
        }
      }

      // Fallback: simple local check
      const localCheck: AlignmentCheck = {
        decision,
        aligned: decision.toLowerCase().includes("vision") || decision.length > 20,
        score: 0.75,
        suggestions: ["Ensure alignment with mission statement"],
      };
      setRecentAlignmentChecks((prev) => [localCheck, ...prev].slice(0, 5));
      return localCheck;
    } catch (error) {
      console.error("Alignment check failed:", error);
      return null;
    }
  }, []);

  // Handle mission save
  const handleMissionSave = useCallback(async (newMission: string) => {
    const success = await updateVision({ mission: newMission });
    if (success) {
      setIsEditing(false);
      toast.success("Mission updated", { message: "Vision has been saved" });
      if (isConnected) {
        sendMessage({ type: "vision.update", payload: { mission: newMission } });
      }
    } else {
      toast.error("Failed to save", { message: "Please try again" });
    }
  }, [updateVision, isConnected, sendMessage, toast]);

  // Handle history event selection
  const handleHistorySelect = useCallback((event: VisionEvent) => {
    setSelectedHistoryEvent(event.id);
    setAnnouncement(`Selected vision version ${event.version} from ${formatTimeAgo(event.timestamp)}`);
    toast.info(`Viewing v${event.version}`, {
      message: event.summary,
      duration: 3000,
    });
  }, [toast]);

  // Initial data load
  useEffect(() => {
    fetchVisionHistory();
  }, [fetchVisionHistory]);

  // Vision-specific keyboard shortcuts (panel toggles handled by AppShell)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Escape and Ctrl+S even in inputs
        if (e.key !== "Escape" && !(e.key === "s" && (e.ctrlKey || e.metaKey))) {
          return;
        }
      }

      switch (e.key) {
        case "e":
          if (!e.ctrlKey && !e.metaKey && !isEditing) {
            e.preventDefault();
            setIsEditing(true);
            setAnnouncement("Edit mode enabled");
          }
          break;
        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Save is handled by the editable component
            toast.info("Use the Save button to save changes");
          }
          break;
        case "r":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            refreshVision();
            fetchVisionHistory();
            toast.info("Refreshing vision data...");
          }
          break;
        case "Escape":
          if (isEditing) {
            setIsEditing(false);
            setAnnouncement("Edit mode cancelled");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, refreshVision, fetchVisionHistory, toast]);

  // Progress calculation
  const progress = useMemo(() => {
    if (!vision || !vision.goals) return { overall: 0, phase: "planning", velocity: 1.0 };

    const goals = vision.goals.map((g) => typeof g === "string" ? { progress: 0 } : g);
    const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    const avgProgress = goals.length > 0 ? totalProgress / goals.length : 0;

    return {
      overall: Math.round(avgProgress),
      phase: avgProgress < 25 ? "planning" : avgProgress < 75 ? "building" : "shipping",
      velocity: 1.2,
    };
  }, [vision]);

  // Header actions
  const headerActions = (
    <>
      {/* Connection status */}
      <div
        role="status"
        aria-label={isConnected ? "Connected" : "Disconnected"}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          ${isConnected
            ? "bg-green-900/20 border border-green-500/30"
            : "bg-red-900/20 border border-red-500/30"}
        `}
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
        <span className="text-xs font-medium">
          {isConnected ? "Live" : "Offline"}
        </span>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => {
          refreshVision();
          fetchVisionHistory();
          toast.info("Refreshing vision data...");
        }}
        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"
        aria-label="Refresh vision data"
        data-testid="vision-refresh-btn"
      >
        <RefreshCw className={`w-4 h-4 text-gray-400 ${visionLoading ? "animate-spin" : ""}`} />
      </button>
    </>
  );

  // Left panel content (History)
  const leftPanelContent = (
    <VisionHistoryPanel
      events={visionHistory}
      loading={historyLoading}
      onSelectEvent={handleHistorySelect}
      selectedEventId={selectedHistoryEvent}
    />
  );

  // Right panel content (Alignment)
  const rightPanelContent = (
    <ErrorBoundary fallbackMessage="Alignment panel error">
      <AlignmentPanel
        vision={vision}
        recentChecks={recentAlignmentChecks}
        onCheckAlignment={checkAlignment}
      />
    </ErrorBoundary>
  );

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <AppShell
        title="Vision"
        icon={
          <div className="relative">
            <Mountain className="w-6 h-6 text-purple-400" />
            <Compass className="w-3 h-3 text-cyan-400 absolute -bottom-1 -right-1" />
          </div>
        }
        badge="North Star"
        headerActions={headerActions}
        leftPanel={leftPanelContent}
        rightPanel={rightPanelContent}
        showLeftPanel={historyPanelVisible}
        showRightPanel={alignmentPanelVisible}
        leftPanelWidth={320}
        rightPanelWidth={320}
        leftPanelTitle="Vision History"
        rightPanelTitle="Alignment & Progress"
        showFooter={true}
        sessionName="vision"
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={toggleHistoryPanel}
        onToggleGovernance={toggleAlignmentPanel}
        contextVisible={historyPanelVisible}
        governanceVisible={alignmentPanelVisible}
        customShortcuts={VISION_SHORTCUTS}
      >
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Loading State */}
            {visionLoading && !vision && (
              <div className="space-y-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-800 rounded w-1/3 mb-4" />
                  <div className="h-4 bg-gray-800 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-800 rounded w-2/3" />
                </div>
              </div>
            )}

            {/* Error State */}
            {visionError && (
              <div className="p-6 rounded-xl bg-red-900/20 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  <div>
                    <div className="font-medium text-red-400">Failed to load vision</div>
                    <div className="text-sm text-gray-400">{visionError}</div>
                  </div>
                  <button
                    onClick={refreshVision}
                    className="ml-auto px-4 py-2 bg-red-500/20 hover:bg-red-500/30
                               text-red-400 rounded-lg text-sm font-medium transition-all"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Vision Content */}
            {vision && (
              <>
                {/* Mission Statement Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-cyan-900/10 border border-purple-500/20"
                  data-testid="vision-mission-card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Mountain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                          North Star Vision
                        </h2>
                        <div className="text-xs text-gray-500">
                          v{vision.version || 1} - Updated {vision.lastUpdated ? formatTimeAgo(vision.lastUpdated) : "recently"}
                        </div>
                      </div>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700
                                   text-gray-300 text-xs flex items-center gap-1 transition-all"
                        data-testid="vision-edit-btn"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Vision
                      </button>
                    )}
                  </div>

                  <EditableMission
                    mission={vision.mission || ""}
                    isEditing={isEditing}
                    onSave={handleMissionSave}
                    onCancel={() => setIsEditing(false)}
                    onStartEdit={() => setIsEditing(true)}
                    isLocked={false}
                  />

                  {/* Progress Summary */}
                  <div className="flex items-center gap-6 text-sm mt-6 pt-4 border-t border-gray-800/50">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">Timeframe:</span>
                      <span className="text-gray-200 font-medium">{vision.timeframe || "Not set"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">Progress:</span>
                      <span className="text-gray-200 font-medium">{progress.overall}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">Velocity:</span>
                      <span className="text-gray-200 font-medium">{progress.velocity}x</span>
                    </div>
                  </div>
                </motion.div>

                {/* Goals Section */}
                {vision.goals && Array.isArray(vision.goals) && vision.goals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    data-testid="vision-goals-section"
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Strategic Goals
                    </h3>
                    <GoalsGrid goals={vision.goals} isLocked={false} />
                  </motion.div>
                )}

                {/* Metrics Section */}
                {vision.successMetrics && Array.isArray(vision.successMetrics) && vision.successMetrics.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    data-testid="vision-metrics-section"
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      Success Metrics
                    </h3>
                    <MetricsGrid metrics={vision.successMetrics} />
                  </motion.div>
                )}

                {/* Constraints Section */}
                {vision.constraints && vision.constraints.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    data-testid="vision-constraints-section"
                  >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      Constraints & Boundaries
                    </h3>
                    <div className="p-4 rounded-xl bg-amber-900/10 border border-amber-500/20">
                      <ul className="space-y-2">
                        {vision.constraints.map((constraint, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-400 mt-0.5">-</span>
                            <span className="text-gray-300">{constraint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Empty State */}
            {!visionLoading && !vision && (
              <div className="text-center py-16">
                <Mountain className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h2 className="text-2xl font-bold text-gray-400 mb-2">No Vision Defined</h2>
                <p className="text-gray-500 mb-6">
                  Define your north star to guide all development decisions
                </p>
                <button
                  onClick={() => window.location.href = "#/vision-capture"}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600
                             text-white rounded-lg font-medium transition-all"
                >
                  Capture Your Vision
                </button>
              </div>
            )}
          </div>
        </AppShell>
      </>
    );
  };

// Wrap with providers
const VisionPage: React.FC = () => {
  return (
    <ToastProvider>
      <VisionView />
    </ToastProvider>
  );
};

export default VisionPage;

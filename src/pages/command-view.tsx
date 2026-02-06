/**
 * Command View Page - SOTA Implementation
 * Full command center with panel architecture and real API integration
 *
 * Features:
 * - Left panel: Command History (collapsible, 320px)
 * - Center: Main command interface with quick actions
 * - Right panel: Command Queue + Execution Status (collapsible, 320px)
 * - Footer: Oracle Feed + panel toggles
 * - Responsive: Mobile (full-screen + overlays), Tablet (2-col), Desktop (3-col)
 * - Full keyboard navigation and screen reader support
 * - Real WebSocket updates for command execution
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import {
  Command,
  Sparkles,
  Brain,
  Zap,
  Shield,
  Activity,
  Users,
  Terminal,
  FileCode,
  GitBranch,
  Package,
  Database,
  Cloud,
  Settings,
  ChevronRight,
  Search,
  Plus,
  Play,
  Pause,
  RotateCw,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  MessageSquare,
  Layers,
  Target,
  BarChart3,
  History,
  Keyboard,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  X,
  Send,
  LayoutDashboard,
  Rocket,
} from "lucide-react";

import { AppShell } from "../components/layout";
import { useLayout } from "../contexts/LayoutContext";
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
import type { Command as CommandType } from "../components/types";

// Command-specific keyboard shortcuts
const COMMAND_SHORTCUTS: KeyboardShortcut[] = [
  { key: "/", description: "Focus search / Open command palette", category: "navigation" },
  { key: "Enter", description: "Execute selected command", category: "actions" },
  { key: "Escape", description: "Close panels / Cancel", category: "general" },
  { key: "1-9", description: "Quick action shortcuts", category: "actions" },
];

// ============= Types =============

interface ExecutedCommand {
  id: string;
  command: CommandType;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  duration?: number;
}

interface CommandCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  commands: CommandType[];
}

interface ProjectContext {
  name: string;
  phase: string;
  activeAgents: number;
  pendingTasks: number;
  healthScore: number;
  lastActivity: Date;
}

// ============= Default Commands =============

const DEFAULT_COMMANDS: CommandCategory[] = [
  {
    id: "forge",
    name: "Forge",
    icon: <Sparkles className="w-4 h-4" />,
    color: "purple",
    commands: [
      { id: "frg-status", name: "Status Report", description: "Get current project status", category: "forge", icon: <Activity className="w-4 h-4" /> },
      { id: "frg-feature", name: "New Feature", description: "Start implementing a new feature", category: "forge", requiresConfirmation: true, icon: <Plus className="w-4 h-4" /> },
      { id: "frg-gap-analysis", name: "Gap Analysis", description: "Analyze test, doc, and security gaps", category: "forge", icon: <Search className="w-4 h-4" /> },
      { id: "system-info", name: "System Info", description: "Node, npm, git versions, memory, disk", category: "forge", icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    id: "git",
    name: "Git",
    icon: <GitBranch className="w-4 h-4" />,
    color: "green",
    commands: [
      { id: "git-status", name: "Git Status", description: "Branch, changed files, recent commits", category: "git", icon: <GitBranch className="w-4 h-4" /> },
      { id: "git-diff", name: "Git Diff", description: "Show staged and unstaged changes", category: "git", icon: <FileCode className="w-4 h-4" /> },
      { id: "git-log", name: "Git Log", description: "Commit graph (last 20 commits)", category: "git", icon: <Clock className="w-4 h-4" /> },
    ],
  },
  {
    id: "test",
    name: "Test",
    icon: <Shield className="w-4 h-4" />,
    color: "blue",
    commands: [
      { id: "frg-test", name: "Run All Tests", description: "Execute full vitest suite", category: "test", icon: <Play className="w-4 h-4" /> },
      { id: "test-coverage", name: "Coverage Report", description: "Run tests with coverage analysis", category: "test", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    id: "deploy",
    name: "Deploy",
    icon: <Rocket className="w-4 h-4" />,
    color: "orange",
    commands: [
      { id: "frg-deploy", name: "Build & Deploy", description: "Type-check then vite build", category: "deploy", requiresConfirmation: true, icon: <Rocket className="w-4 h-4" /> },
    ],
  },
  {
    id: "analyze",
    name: "Analyze",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "cyan",
    commands: [
      { id: "analyze-types", name: "Type Check", description: "Run tsc --noEmit", category: "analyze", icon: <FileCode className="w-4 h-4" /> },
      { id: "analyze-lint", name: "Lint", description: "Run ESLint on src/", category: "analyze", icon: <Shield className="w-4 h-4" /> },
      { id: "analyze-deps", name: "Outdated Deps", description: "Check for outdated npm packages", category: "analyze", icon: <Package className="w-4 h-4" /> },
      { id: "analyze-bundle", name: "Bundle Size", description: "Production build with size report", category: "analyze", icon: <Database className="w-4 h-4" /> },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  forge: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  git: "text-green-400 bg-green-500/10 border-green-500/20",
  test: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  deploy: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  analyze: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

// ============= Sub-components =============

// Command History Panel
const CommandHistoryPanel: React.FC<{
  history: ExecutedCommand[];
  loading: boolean;
  onRerun: (command: CommandType) => void;
  onClear: () => void;
}> = ({ history, loading, onRerun, onClear }) => {
  const getStatusIcon = (status: ExecutedCommand["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case "cancelled":
        return <X className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ExecutedCommand["status"]) => {
    switch (status) {
      case "success":
        return "border-green-500/30 bg-green-500/5";
      case "failed":
        return "border-red-500/30 bg-red-500/5";
      case "running":
        return "border-blue-500/30 bg-blue-500/5";
      default:
        return "border-gray-800 bg-gray-900/50";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-800 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="command-history-panel">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <History className="w-4 h-4" />
          Command History
        </h3>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No commands executed yet</p>
          </div>
        ) : (
          history.map((executed, index) => (
            <motion.div
              key={executed.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`
                p-3 rounded-lg border transition-all
                ${getStatusColor(executed.status)}
              `}
              data-testid={`history-item-${executed.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(executed.status)}
                  <span className="font-medium text-sm text-gray-200">
                    {executed.command.name}
                  </span>
                </div>
                <button
                  onClick={() => onRerun(executed.command)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  title="Run again"
                >
                  <RotateCw className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>{formatTimeAgo(executed.startedAt)}</span>
                {executed.duration !== undefined && (
                  <>
                    <span>-</span>
                    <span>{executed.duration}ms</span>
                  </>
                )}
              </div>
              {executed.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {executed.error}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

// Command Queue Panel
const CommandQueuePanel: React.FC<{
  queue: ExecutedCommand[];
  running: ExecutedCommand | null;
  onCancel: (id: string) => void;
}> = ({ queue, running, onCancel }) => {
  return (
    <div className="h-full flex flex-col" data-testid="command-queue-panel">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Execution Queue
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Currently Running */}
        {running && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-medium text-blue-300">Running</span>
              </div>
              <button
                onClick={() => onCancel(running.id)}
                className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="text-sm text-gray-200">{running.command.name}</div>
            <div className="text-xs text-gray-500 mt-1">{running.command.description}</div>
            <div className="mt-3">
              <ProgressBar
                value={50}
                max={100}
                className="h-1"
                fillColor="bg-blue-500"
                animated={true}
                testIdPrefix="running-progress"
              />
            </div>
          </div>
        )}

        {/* Queued Commands */}
        {queue.length > 0 ? (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">Queued ({queue.length})</div>
            <div className="space-y-2">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-sm text-gray-300">{item.command.name}</span>
                  </div>
                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Remove from queue"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : !running ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No commands in queue</p>
          </div>
        ) : null}

        {/* Quick Stats */}
        <div className="mt-auto pt-4 border-t border-gray-800">
          <div className="text-xs font-medium text-gray-500 mb-2">Session Stats</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-gray-900/50 border border-gray-800">
              <div className="text-lg font-bold text-green-400">
                {queue.filter((q) => q.status === "success").length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="p-2 rounded bg-gray-900/50 border border-gray-800">
              <div className="text-lg font-bold text-red-400">
                {queue.filter((q) => q.status === "failed").length}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Command Palette Modal
const CommandPalette: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  categories: CommandCategory[];
  onExecute: (command: CommandType) => void;
  isExecuting: boolean;
  projectContext: ProjectContext;
}> = ({ isOpen, onClose, categories, onExecute, isExecuting, projectContext }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    const allCommands = categories.flatMap((cat) => cat.commands);
    if (!searchQuery) return allCommands;

    const lower = searchQuery.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lower) ||
        cmd.description.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower)
    );
  }, [categories, searchQuery]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onExecute(filteredCommands[selectedIndex]);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onExecute, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="fixed inset-x-0 top-20 mx-auto w-full max-w-2xl z-50 px-4"
        data-testid="command-palette"
      >
        <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 text-lg"
                data-testid="command-palette-search"
              />
              <div className="flex items-center gap-2">
                {isExecuting && (
                  <div className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" />
                    Executing...
                  </div>
                )}
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">ESC</kbd>
              </div>
            </div>
          </div>

          {/* Context Bar */}
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  <span className="text-gray-400">Project:</span>
                  <span className="text-gray-200 font-medium">{projectContext.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span className="text-gray-400">Phase:</span>
                  <span className="text-gray-200 font-medium">{projectContext.phase}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-green-400" />
                  <span className="text-gray-200">{projectContext.activeAgents}</span>
                  <span className="text-gray-400">agents</span>
                </div>
                <div className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${projectContext.healthScore >= 80
                    ? "bg-green-500/20 text-green-400"
                    : projectContext.healthScore >= 60
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"}
                `}>
                  {projectContext.healthScore}% health
                </div>
              </div>
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command, idx) => (
                <button
                  key={command.id}
                  onClick={() => {
                    onExecute(command);
                    onClose();
                  }}
                  className={`
                    w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all
                    ${selectedIndex === idx
                      ? "bg-gray-800 text-gray-100"
                      : "hover:bg-gray-800/50 text-gray-300"}
                  `}
                  data-testid={`command-option-${command.id}`}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center border
                    ${CATEGORY_COLORS[command.category] || CATEGORY_COLORS.forge}
                  `}>
                    {command.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {command.name}
                      {command.requiresConfirmation && (
                        <span className="text-xs text-orange-400">(requires confirm)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{command.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-2">No commands found</p>
                <p className="text-sm text-gray-500">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Command Result Display
const CommandResultDisplay: React.FC<{
  executed: ExecutedCommand;
  onDismiss: () => void;
  onRerun: () => void;
}> = ({ executed, onDismiss, onRerun }) => {
  const output = typeof executed.result === "object" && executed.result !== null
    ? (executed.result as Record<string, unknown>).output as string || JSON.stringify(executed.result, null, 2)
    : String(executed.result || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      data-testid="command-result-display"
    >
      {/* Result Header */}
      <div className={`
        px-4 py-3 flex items-center justify-between
        ${executed.status === "success"
          ? "bg-green-500/10 border-b border-green-500/20"
          : executed.status === "failed"
            ? "bg-red-500/10 border-b border-red-500/20"
            : "bg-blue-500/10 border-b border-blue-500/20"}
      `}>
        <div className="flex items-center gap-3">
          {executed.status === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : executed.status === "failed" ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <RotateCw className="w-5 h-5 text-blue-400 animate-spin" />
          )}
          <div>
            <span className="font-semibold text-gray-100">{executed.command.name}</span>
            <span className="text-xs text-gray-400 ml-3">
              {executed.command.id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {executed.duration !== undefined && (
            <span className="text-xs text-gray-400 tabular-nums">
              {executed.duration < 1000
                ? `${executed.duration}ms`
                : `${(executed.duration / 1000).toFixed(1)}s`}
            </span>
          )}
          <button
            onClick={onRerun}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Run again"
          >
            <RotateCw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Result Output */}
      <div className="bg-gray-950 max-h-[60vh] overflow-y-auto">
        {executed.status === "running" ? (
          <div className="p-6 text-center">
            <RotateCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400">Executing {executed.command.name}...</p>
          </div>
        ) : output ? (
          <pre className="p-4 text-sm font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {output}
          </pre>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>No output</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {executed.error && (
        <div className="px-4 py-3 bg-red-500/5 border-t border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <pre className="text-sm font-mono text-red-300 whitespace-pre-wrap break-words">
              {executed.error}
            </pre>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Quick Actions Grid
const QuickActionsGrid: React.FC<{
  categories: CommandCategory[];
  onExecute: (command: CommandType) => void;
  isExecuting: boolean;
}> = ({ categories, onExecute, isExecuting }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="quick-actions-grid">
      {categories.map((category) => (
        <div
          key={category.id}
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category.id] || CATEGORY_COLORS.forge}`}>
              {category.icon}
            </div>
            <h3 className="font-semibold text-gray-200">{category.name}</h3>
          </div>
          <div className="space-y-2">
            {category.commands.slice(0, 3).map((command) => (
              <button
                key={command.id}
                onClick={() => onExecute(command)}
                disabled={isExecuting}
                className="w-full text-left px-3 py-2 rounded-lg bg-gray-900 border border-gray-800
                           hover:border-gray-700 hover:bg-gray-800 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-between group"
                data-testid={`quick-action-${command.id}`}
              >
                <span className="text-sm text-gray-300 group-hover:text-gray-100">
                  {command.name}
                </span>
                <Play className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============= Helper Functions =============

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return "just now";
}

// ============= Main Component =============

const CommandView: React.FC = () => {
  const { toast } = useToast();

  // Layout management from centralized context
  const {
    contextPanelVisible: historyPanelVisible,
    governancePanelVisible: queuePanelVisible,
    footerVisible,
    toggleContextPanel: toggleHistoryPanel,
    toggleGovernancePanel: toggleQueuePanel,
    layout,
  } = useLayout();

  // State
  const [commandHistory, setCommandHistory] = useState<ExecutedCommand[]>([]);
  const [commandQueue, setCommandQueue] = useState<ExecutedCommand[]>([]);
  const [runningCommand, setRunningCommand] = useState<ExecutedCommand | null>(null);
  const [activeResult, setActiveResult] = useState<ExecutedCommand | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Project context (would come from API in real implementation)
  const [projectContext] = useState<ProjectContext>({
    name: "NXTG-Forge",
    phase: "building",
    activeAgents: 3,
    pendingTasks: 12,
    healthScore: 87,
    lastActivity: new Date(),
  });

  // Oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Command center active",
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

  // Execute command
  const executeCommand = useCallback(async (command: CommandType) => {
    // Confirmation if needed
    if (command.requiresConfirmation) {
      const confirmed = window.confirm(`Execute "${command.name}"?\n${command.description}`);
      if (!confirmed) return;
    }

    const executedCommand: ExecutedCommand = {
      id: `exec-${Date.now()}`,
      command,
      status: "running",
      startedAt: new Date(),
    };

    setIsExecuting(true);
    setRunningCommand(executedCommand);
    setActiveResult(executedCommand);
    setAnnouncement(`Executing ${command.name}`);

    try {
      const startTime = Date.now();
      const response = await apiClient.executeCommand(command);
      const duration = Date.now() - startTime;

      const completedCommand: ExecutedCommand = {
        ...executedCommand,
        status: response.success ? "success" : "failed",
        completedAt: new Date(),
        result: response.data,
        error: response.error,
        duration,
      };

      setCommandHistory((prev) => [completedCommand, ...prev].slice(0, 50));
      setActiveResult(completedCommand);

      if (response.success) {
        toast.success(`${command.name} completed`, {
          message: `Executed in ${duration}ms`,
          duration: 3000,
        });
      } else {
        throw new Error(response.error || "Command failed");
      }

      // Broadcast via WebSocket
      if (isConnected) {
        sendMessage({ type: "command.executed", payload: { command: command.id, result: response.data } });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const failedCommand: ExecutedCommand = {
        ...executedCommand,
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
        duration: Date.now() - executedCommand.startedAt.getTime(),
      };

      setCommandHistory((prev) => [failedCommand, ...prev].slice(0, 50));
      setActiveResult(failedCommand);
      toast.error(`${command.name} failed`, {
        message: errorMessage,
        actions: [
          { label: "Retry", onClick: () => executeCommand(command) },
        ],
      });
    } finally {
      setIsExecuting(false);
      setRunningCommand(null);
    }
  }, [isConnected, sendMessage, toast]);

  // Cancel command
  const cancelCommand = useCallback((id: string) => {
    if (runningCommand?.id === id) {
      // Would need backend support for actual cancellation
      setRunningCommand(null);
      setIsExecuting(false);
      toast.info("Command cancelled");
    } else {
      setCommandQueue((prev) => prev.filter((c) => c.id !== id));
    }
  }, [runningCommand, toast]);

  // Clear history
  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    toast.info("History cleared");
  }, [toast]);

  // WebSocket message type
  interface CommandMessage {
    type: string;
    payload?: {
      command?: { name: string };
    };
  }

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((message: CommandMessage) => {
        if (message.type === "command.executed") {
          // Handle external command execution updates
          toast.info("Command executed", { message: message.payload?.command?.name });
        }
      });
      clearMessages();
    }
  }, [messages, clearMessages, toast]);

  // Keyboard shortcuts (AppShell handles panel toggles, we just handle command palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== "Escape") return;
      }

      switch (e.key) {
        case "/":
          e.preventDefault();
          setIsPaletteOpen(true);
          break;
        case "Escape":
          if (isPaletteOpen) {
            setIsPaletteOpen(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteOpen]);

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <AppShell
        // Page identity
        title="Command Center"
        icon={<Command className="w-6 h-6" />}
        badge="Live"

        // Left Panel - History
        leftPanel={
          <CommandHistoryPanel
            history={commandHistory}
            loading={false}
            onRerun={executeCommand}
            onClear={clearHistory}
          />
        }
        showLeftPanel={historyPanelVisible}
        leftPanelWidth={320}
        leftPanelTitle="Command History"

        // Right Panel - Queue
        rightPanel={
          <ErrorBoundary fallbackMessage="Queue panel error">
            <CommandQueuePanel
              queue={commandQueue}
              running={runningCommand}
              onCancel={cancelCommand}
            />
          </ErrorBoundary>
        }
        showRightPanel={queuePanelVisible}
        rightPanelWidth={320}
        rightPanelTitle="Execution Queue"

        // Footer
        showFooter={footerVisible}
        sessionName="command"
        isConnected={isConnected}
        oracleMessages={oracleMessages}
        onToggleContext={toggleHistoryPanel}
        onToggleGovernance={toggleQueuePanel}
        contextVisible={historyPanelVisible}
        governanceVisible={queuePanelVisible}

        // Keyboard shortcuts
        customShortcuts={COMMAND_SHORTCUTS}
      >
        {/* Main Content */}
        <div
          className="flex-1 min-w-0 bg-gray-950 overflow-y-auto pb-16 md:pb-0"
          role="main"
          aria-label="Command center"
          data-testid="command-view-container"
        >
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Active Result Display */}
            {activeResult && (
              <CommandResultDisplay
                executed={activeResult}
                onDismiss={() => setActiveResult(null)}
                onRerun={() => executeCommand(activeResult.command)}
              />
            )}

            {/* Quick Actions — always visible */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{commandHistory.filter((c) => c.status === "success").length} passed</span>
                  <span>{commandHistory.filter((c) => c.status === "failed").length} failed</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">/</kbd>
                  <span>palette</span>
                </div>
              </div>
              <QuickActionsGrid
                categories={DEFAULT_COMMANDS}
                onExecute={executeCommand}
                isExecuting={isExecuting}
              />
            </motion.div>

            {/* Recent Commands — compact cards */}
            {commandHistory.length > 0 && !activeResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  Recent Commands
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {commandHistory.slice(0, 4).map((executed) => (
                    <button
                      key={executed.id}
                      onClick={() => setActiveResult(executed)}
                      className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700
                                 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        {executed.status === "success" ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        <div>
                          <div className="font-medium text-sm text-gray-200">
                            {executed.command.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimeAgo(executed.startedAt)}
                            {executed.duration && ` - ${executed.duration}ms`}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </AppShell>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        categories={DEFAULT_COMMANDS}
        onExecute={executeCommand}
        isExecuting={isExecuting}
        projectContext={projectContext}
      />

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-sm
                   border-t border-gray-800 z-50 md:hidden pb-safe"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="h-full flex items-center justify-around px-4">
          <button
            onClick={toggleHistoryPanel}
            className={`flex flex-col items-center gap-1 flex-1 h-full justify-center
                        ${historyPanelVisible ? "text-purple-400" : "text-gray-400"}`}
          >
            <History className="w-5 h-5" />
            <span className="text-xs">History</span>
          </button>
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 h-full justify-center text-gray-400"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">Commands</span>
          </button>
          <button
            onClick={toggleQueuePanel}
            className={`flex flex-col items-center gap-1 flex-1 h-full justify-center
                        ${queuePanelVisible ? "text-purple-400" : "text-gray-400"}`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-xs">Queue</span>
          </button>
        </div>
      </nav>
    </>
  );
};

// Wrap with providers
const CommandPage: React.FC = () => {
  return (
    <ToastProvider>
      <CommandView />
    </ToastProvider>
  );
};

export default CommandPage;

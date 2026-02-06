/**
 * CommandOutputDrawer
 *
 * A bottom slide-up drawer that displays full command execution output.
 * Replaces the broken toast-based truncated output with a proper
 * terminal-style output panel.
 *
 * Three height states:
 * - Collapsed (48px): Persistent status bar showing last command result
 * - Half (40vh): Default view after command completes
 * - Expanded (80vh): Full output for long results like test suites
 *
 * Features:
 * - Monospace terminal-style output rendering
 * - Command name, duration, and status header
 * - History sidebar to recall past command outputs
 * - Auto-scroll to bottom during streaming
 * - Copy output to clipboard
 * - Keyboard navigation (Escape to dismiss, Backtick to toggle)
 *
 * Design decisions:
 * - Bottom drawer instead of modal: does not block dashboard view
 * - Full width: monospace output needs horizontal space
 * - Drag handle for resize: familiar VS Code / Chrome DevTools pattern
 * - Collapsed bar persists: user always knows their last command result
 */
import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "./ui/SafeAnimatePresence";
import {
  Terminal,
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  Trash2,
  GripHorizontal,
} from "lucide-react";
import type {
  CommandOutputEntry,
  DrawerHeight,
  UseCommandOutputReturn,
} from "../hooks/useCommandOutput";

// ---------------------------------------------------------------------------
// Height configuration (in viewport height units)
// ---------------------------------------------------------------------------

const HEIGHT_MAP: Record<DrawerHeight, string> = {
  collapsed: "3rem",    // 48px - just the status bar
  half: "40vh",         // Comfortable for reading output + dashboard visible
  expanded: "80vh",     // Near-full for long test suites
};

// Spring transition for smooth, natural drawer movement
const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
};

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Format milliseconds to human-readable duration */
function formatDuration(ms: number | null): string {
  if (ms === null) return "...";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/** Format timestamp to HH:MM:SS */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Status badge with appropriate color and icon */
const StatusBadge: React.FC<{ status: CommandOutputEntry["status"] }> = ({
  status,
}) => {
  const config = {
    running: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: "Running",
      classes: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
    success: {
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      label: "Success",
      classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    error: {
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: "Failed",
      classes: "bg-red-500/15 text-red-400 border-red-500/30",
    },
  }[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs
        font-medium border ${config.classes}
      `}
      role="status"
      aria-label={`Command ${config.label.toLowerCase()}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

/** History sidebar entry */
const HistoryItem: React.FC<{
  entry: CommandOutputEntry;
  isActive: boolean;
  onSelect: () => void;
}> = ({ entry, isActive, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm
        ${
          isActive
            ? "bg-gray-800 text-gray-100"
            : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
        }
      `}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs truncate">{entry.command}</span>
        <StatusBadge status={entry.status} />
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
        <span>{formatTime(entry.startedAt)}</span>
        {entry.duration !== null && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(entry.duration)}
          </span>
        )}
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface CommandOutputDrawerProps {
  commandOutput: UseCommandOutputReturn;
}

export const CommandOutputDrawer: React.FC<CommandOutputDrawerProps> = ({
  commandOutput,
}) => {
  const {
    entries,
    activeEntry,
    activeEntryId,
    drawerHeight,
    isVisible,
    selectEntry,
    clearHistory,
    dismiss,
    toggle,
    cycleHeight,
    setDrawerHeight,
  } = commandOutput;

  const outputRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-scroll to bottom when output changes for running commands
  useEffect(() => {
    if (activeEntry?.status === "running" && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeEntry?.output, activeEntry?.status]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Backtick toggles the drawer (VS Code convention)
      if (e.key === "`" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggle();
        return;
      }

      // Escape dismisses (collapses) the drawer
      if (e.key === "Escape" && drawerHeight !== "collapsed") {
        e.preventDefault();
        dismiss();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle, dismiss, drawerHeight]);

  // Copy output to clipboard
  const handleCopy = useCallback(async () => {
    if (!activeEntry?.output) return;
    try {
      await navigator.clipboard.writeText(activeEntry.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = activeEntry.output;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeEntry?.output]);

  // Nothing to show yet
  if (!isVisible || entries.length === 0) return null;

  const isCollapsed = drawerHeight === "collapsed";
  const isExpanded = drawerHeight === "expanded";

  return (
    <motion.div
      data-testid="command-output-drawer"
      role="region"
      aria-label="Command output panel"
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-gray-950 border-t border-gray-800"
      animate={{
        height: HEIGHT_MAP[drawerHeight],
      }}
      transition={SPRING_TRANSITION}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Drag Handle + Collapsed Status Bar                                */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="flex-shrink-0 cursor-pointer select-none"
        onClick={isCollapsed ? () => setDrawerHeight("half") : undefined}
        onDoubleClick={cycleHeight}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize command output panel. Double-click to cycle sizes."
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            cycleHeight();
          }
        }}
      >
        {/* Drag indicator line */}
        <div className="flex justify-center py-1.5">
          <div className="w-8 h-1 rounded-full bg-gray-700 group-hover:bg-gray-600 transition-colors" />
        </div>

        {/* Status bar -- always visible even when collapsed */}
        <div className="flex items-center justify-between px-4 pb-2">
          {/* Left: Terminal icon + command info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-gray-400">
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Output
              </span>
            </div>

            {activeEntry && (
              <>
                <div className="w-px h-4 bg-gray-800" aria-hidden="true" />
                <span className="font-mono text-sm text-gray-200 truncate">
                  {activeEntry.command}
                </span>
                <StatusBadge status={activeEntry.status} />
                {activeEntry.duration !== null && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDuration(activeEntry.duration)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* History count badge */}
            {entries.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCollapsed) setDrawerHeight("half");
                  setShowHistory(!showHistory);
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                  transition-all
                  ${
                    showHistory
                      ? "bg-gray-800 text-gray-200"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                  }
                `}
                aria-label={`${showHistory ? "Hide" : "Show"} command history (${entries.length} entries)`}
                aria-expanded={showHistory}
              >
                <History className="w-3.5 h-3.5" />
                <span>{entries.length}</span>
              </button>
            )}

            {/* Copy button */}
            {activeEntry?.output && !isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all"
                aria-label={copied ? "Copied to clipboard" : "Copy output to clipboard"}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Expand/Collapse toggle */}
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerHeight(isExpanded ? "half" : "expanded");
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all"
                aria-label={isExpanded ? "Shrink panel" : "Expand panel"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Chevron up/down */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isCollapsed) {
                  setDrawerHeight("half");
                } else {
                  dismiss();
                }
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all"
              aria-label={isCollapsed ? "Expand output panel" : "Collapse output panel"}
            >
              {isCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Close (hide entirely) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-all"
              aria-label="Close output panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Content Area (hidden when collapsed)                              */}
      {/* ----------------------------------------------------------------- */}
      {!isCollapsed && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* History Sidebar */}
          <AnimatePresence>
            {showHistory && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 256, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 border-r border-gray-800 overflow-hidden"
                aria-label="Command history"
              >
                <div className="w-64 h-full flex flex-col">
                  {/* History header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      History
                    </span>
                    <button
                      onClick={clearHistory}
                      className="p-1 rounded text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-all"
                      aria-label="Clear command history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* History list */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {entries.map((entry) => (
                      <HistoryItem
                        key={entry.id}
                        entry={entry}
                        isActive={entry.id === activeEntryId}
                        onSelect={() => selectEntry(entry.id)}
                      />
                    ))}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Output Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeEntry ? (
              <>
                {/* Output header with metadata */}
                <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-gray-800/50 bg-gray-900/30">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-gray-400">Started:</span>
                    <span className="font-mono">
                      {formatTime(activeEntry.startedAt)}
                    </span>
                  </div>
                  {activeEntry.finishedAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="text-gray-400">Finished:</span>
                      <span className="font-mono">
                        {formatTime(activeEntry.finishedAt)}
                      </span>
                    </div>
                  )}
                  {activeEntry.metadata &&
                    Object.keys(activeEntry.metadata).length > 0 && (
                      <div className="flex items-center gap-3 ml-auto">
                        {activeEntry.metadata.passed !== undefined && (
                          <span className="text-xs text-emerald-400 font-medium">
                            {String(activeEntry.metadata.passed)} passed
                          </span>
                        )}
                        {activeEntry.metadata.failed !== undefined &&
                          Number(activeEntry.metadata.failed) > 0 && (
                            <span className="text-xs text-red-400 font-medium">
                              {String(activeEntry.metadata.failed)} failed
                            </span>
                          )}
                        {activeEntry.metadata.skipped !== undefined &&
                          Number(activeEntry.metadata.skipped) > 0 && (
                            <span className="text-xs text-yellow-400 font-medium">
                              {String(activeEntry.metadata.skipped)} skipped
                            </span>
                          )}
                      </div>
                    )}
                </div>

                {/* Terminal output */}
                <pre
                  ref={outputRef}
                  className={`
                    flex-1 overflow-auto px-4 py-3 font-mono text-sm leading-relaxed
                    text-gray-300 whitespace-pre-wrap break-words
                    selection:bg-purple-500/30 selection:text-white
                    ${activeEntry.output ? "" : "flex items-center justify-center"}
                  `}
                  tabIndex={0}
                  role="log"
                  aria-label={`Output from ${activeEntry.command}`}
                  aria-live={activeEntry.status === "running" ? "polite" : "off"}
                >
                  {activeEntry.output || (
                    <span className="text-gray-600 text-sm">
                      {activeEntry.status === "running"
                        ? "Waiting for output..."
                        : "No output produced."}
                    </span>
                  )}
                </pre>

                {/* Running indicator at bottom */}
                {activeEntry.status === "running" && (
                  <div className="flex-shrink-0 px-4 py-2 border-t border-gray-800/50">
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>
                        Command is running...{" "}
                        <span className="text-gray-500">
                          {formatDuration(
                            Date.now() - activeEntry.startedAt.getTime()
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty state when no entry is selected */
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                <Terminal className="w-8 h-8 mb-3" />
                <p className="text-sm">No command output to display</p>
                <p className="text-xs mt-1">
                  Run a command to see its output here
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Running progress bar at the very bottom edge */}
      {activeEntry?.status === "running" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default CommandOutputDrawer;

/**
 * useCommandOutput - State management for command execution output
 *
 * Tracks the output of every command execution with full history.
 * Designed to replace the toast-based output display with a proper
 * output drawer that can show hundreds of lines of terminal output.
 *
 * History is capped at 20 entries and stored in-memory only.
 * Each entry records the command name, full output, timing,
 * and success/failure status.
 */
import { useState, useCallback, useRef } from "react";

export type CommandOutputStatus = "running" | "success" | "error";

export interface CommandOutputEntry {
  /** Unique identifier for this execution */
  id: string;
  /** The command that was executed (e.g., "frg-status", "frg-test") */
  command: string;
  /** Full untruncated output from the command */
  output: string;
  /** Execution status */
  status: CommandOutputStatus;
  /** When execution started */
  startedAt: Date;
  /** When execution finished (null if still running) */
  finishedAt: Date | null;
  /** Duration in milliseconds (null if still running) */
  duration: number | null;
  /** Exit code or HTTP status if available */
  exitCode?: number;
  /** Structured data from the response (e.g., test counts) */
  metadata?: Record<string, unknown>;
}

export type DrawerHeight = "collapsed" | "half" | "expanded";

const MAX_HISTORY = 20;

export function useCommandOutput() {
  const [entries, setEntries] = useState<CommandOutputEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [drawerHeight, setDrawerHeight] = useState<DrawerHeight>("collapsed");
  const [isVisible, setIsVisible] = useState(false);

  // Track running commands by ID for updating output
  const runningRef = useRef<Map<string, CommandOutputEntry>>(new Map());

  /**
   * Start tracking a new command execution.
   * Returns the entry ID so the caller can update it later.
   */
  const startCommand = useCallback((command: string): string => {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const entry: CommandOutputEntry = {
      id,
      command,
      output: "",
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      duration: null,
    };

    runningRef.current.set(id, entry);

    setEntries((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    setActiveEntryId(id);
    setIsVisible(true);

    // Auto-expand to half height when a command starts
    setDrawerHeight((prev) => (prev === "collapsed" ? "half" : prev));

    return id;
  }, []);

  /**
   * Complete a running command with its output.
   */
  const completeCommand = useCallback(
    (
      id: string,
      output: string,
      status: "success" | "error",
      metadata?: Record<string, unknown>
    ) => {
      const running = runningRef.current.get(id);
      const now = new Date();

      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          return {
            ...entry,
            output,
            status,
            finishedAt: now,
            duration: now.getTime() - entry.startedAt.getTime(),
            metadata,
          };
        })
      );

      runningRef.current.delete(id);
    },
    []
  );

  /**
   * Append output to a running command (for streaming).
   */
  const appendOutput = useCallback((id: string, chunk: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        return { ...entry, output: entry.output + chunk };
      })
    );
  }, []);

  /**
   * Get the currently active entry (the one being viewed).
   */
  const activeEntry = entries.find((e) => e.id === activeEntryId) ?? null;

  /**
   * Select a specific entry from history to view.
   */
  const selectEntry = useCallback(
    (id: string) => {
      setActiveEntryId(id);
      setIsVisible(true);
      if (drawerHeight === "collapsed") {
        setDrawerHeight("half");
      }
    },
    [drawerHeight]
  );

  /**
   * Clear all history.
   */
  const clearHistory = useCallback(() => {
    setEntries([]);
    setActiveEntryId(null);
    setIsVisible(false);
    setDrawerHeight("collapsed");
  }, []);

  /**
   * Dismiss the drawer (collapse it).
   */
  const dismiss = useCallback(() => {
    setDrawerHeight("collapsed");
  }, []);

  /**
   * Toggle drawer visibility entirely.
   */
  const toggle = useCallback(() => {
    if (!isVisible || drawerHeight === "collapsed") {
      setIsVisible(true);
      setDrawerHeight("half");
    } else {
      setDrawerHeight("collapsed");
    }
  }, [isVisible, drawerHeight]);

  /**
   * Cycle through drawer heights: collapsed -> half -> expanded -> collapsed.
   */
  const cycleHeight = useCallback(() => {
    setDrawerHeight((prev) => {
      if (prev === "collapsed") return "half";
      if (prev === "half") return "expanded";
      return "collapsed";
    });
  }, []);

  return {
    // State
    entries,
    activeEntry,
    activeEntryId,
    drawerHeight,
    isVisible,
    hasRunning: runningRef.current.size > 0,

    // Actions
    startCommand,
    completeCommand,
    appendOutput,
    selectEntry,
    clearHistory,
    dismiss,
    toggle,
    cycleHeight,
    setDrawerHeight,
    setIsVisible,
  };
}

export type UseCommandOutputReturn = ReturnType<typeof useCommandOutput>;

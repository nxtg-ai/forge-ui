/**
 * Diff Visualization Component
 * VS Code-style side-by-side diff viewer for Claude Code output
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Zap,
} from "lucide-react";

interface DiffData {
  filePath: string;
  language: string;
  oldContent: string;
  newContent: string;
  changes: DiffChange[];
}

interface DiffChange {
  lineNumber: number;
  type: "added" | "removed" | "modified";
  oldLine?: string;
  newLine?: string;
}

interface DiffVisualizationProps {
  onApply?: (filePath: string) => void;
  onReject?: (filePath: string) => void;
}

export const DiffVisualization: React.FC<DiffVisualizationProps> = ({
  onApply,
  onReject,
}) => {
  const [diffs, setDiffs] = useState<DiffData[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedDiff, setSelectedDiff] = useState<string | null>(null);

  useEffect(() => {
    // Listen for diff events from ClaudeTerminal
    const handleDiff = (event: CustomEvent) => {
      const diffData = event.detail as DiffData;
      setDiffs((prev) => [...prev, diffData]);
      setSelectedDiff(diffData.filePath);

      // Auto-expand the new diff
      setExpandedFiles((prev) => new Set(prev).add(diffData.filePath));
    };

    window.addEventListener("claude-diff", handleDiff as EventListener);

    return () => {
      window.removeEventListener("claude-diff", handleDiff as EventListener);
    };
  }, []);

  const toggleFileExpand = (filePath: string) => {
    setExpandedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleApply = (filePath: string) => {
    if (onApply) {
      onApply(filePath);
    }
    // Remove from list
    setDiffs((prev) => prev.filter((d) => d.filePath !== filePath));
    if (selectedDiff === filePath) {
      setSelectedDiff(null);
    }
  };

  const handleReject = (filePath: string) => {
    if (onReject) {
      onReject(filePath);
    }
    // Remove from list
    setDiffs((prev) => prev.filter((d) => d.filePath !== filePath));
    if (selectedDiff === filePath) {
      setSelectedDiff(null);
    }
  };

  if (diffs.length === 0) {
    return null;
  }

  const currentDiff =
    diffs.find((d) => d.filePath === selectedDiff) || diffs[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed right-4 top-20 bottom-4 w-[600px] bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl z-40 flex flex-col"
      data-testid="diff-visualization-container"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold">Claude Code Changes</h3>
        </div>
        <div className="text-xs text-gray-500">
          {diffs.length} file{diffs.length !== 1 ? "s" : ""} modified
        </div>
      </div>

      {/* File List */}
      <div className="border-b border-gray-800">
        {diffs.map((diff) => (
          <div
            key={diff.filePath}
            className={`border-b border-gray-800 last:border-b-0 ${
              selectedDiff === diff.filePath ? "bg-blue-500/10" : ""
            }`}
          >
            <button
              onClick={() => {
                setSelectedDiff(diff.filePath);
                toggleFileExpand(diff.filePath);
              }}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-all"
            >
              <div className="flex items-center gap-2">
                {expandedFiles.has(diff.filePath) ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-mono">{diff.filePath}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-400">
                  +{diff.changes.filter((c) => c.type === "added").length}
                </span>
                <span className="text-xs text-red-400">
                  -{diff.changes.filter((c) => c.type === "removed").length}
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Diff View */}
      {currentDiff && expandedFiles.has(currentDiff.filePath) && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-px bg-gray-800">
            {/* Old Content */}
            <div className="bg-gray-950 p-4">
              <div className="text-xs text-gray-500 mb-2 font-semibold">
                BEFORE
              </div>
              <pre className="text-xs font-mono leading-relaxed">
                {currentDiff.oldContent.split("\n").map((line, idx) => {
                  const change = currentDiff.changes.find(
                    (c) => c.lineNumber === idx + 1,
                  );
                  const isRemoved = change?.type === "removed";
                  const isModified = change?.type === "modified";

                  return (
                    <div
                      key={idx}
                      className={`${
                        isRemoved
                          ? "bg-red-500/20 text-red-300"
                          : isModified
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "text-gray-400"
                      } px-2 py-0.5`}
                    >
                      <span className="text-gray-600 mr-4 select-none">
                        {idx + 1}
                      </span>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* New Content */}
            <div className="bg-gray-950 p-4">
              <div className="text-xs text-gray-500 mb-2 font-semibold">
                AFTER
              </div>
              <pre className="text-xs font-mono leading-relaxed">
                {currentDiff.newContent.split("\n").map((line, idx) => {
                  const change = currentDiff.changes.find(
                    (c) => c.lineNumber === idx + 1,
                  );
                  const isAdded = change?.type === "added";
                  const isModified = change?.type === "modified";

                  return (
                    <div
                      key={idx}
                      className={`${
                        isAdded
                          ? "bg-green-500/20 text-green-300"
                          : isModified
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "text-gray-400"
                      } px-2 py-0.5`}
                    >
                      <span className="text-gray-600 mr-4 select-none">
                        {idx + 1}
                      </span>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {currentDiff && (
        <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4" />
            <span>Review changes carefully before applying</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReject(currentDiff.filePath)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => handleApply(currentDiff.filePath)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              Apply Changes
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

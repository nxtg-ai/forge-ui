import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  X,
  Sparkles,
  Bug,
  Zap,
  Shield,
  Trash2,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface ChangelogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Changelog: React.FC<ChangelogProps> = ({ isOpen, onClose }) => {
  const [changelog, setChangelog] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadChangelog();
    }
  }, [isOpen]);

  const loadChangelog = async () => {
    try {
      setLoading(true);
      const response = await fetch("/CHANGELOG.md");
      if (response.ok) {
        const text = await response.text();
        setChangelog(text);
      } else {
        throw new Error("Failed to load changelog");
      }
    } catch (err) {
      console.error("Error loading changelog:", err);
      setError("Unable to load changelog");
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "added":
        return <Sparkles className="w-4 h-4 text-green-400" />;
      case "changed":
        return <Zap className="w-4 h-4 text-blue-400" />;
      case "fixed":
        return <Bug className="w-4 h-4 text-yellow-400" />;
      case "removed":
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case "security":
        return <Shield className="w-4 h-4 text-purple-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-elevation-5 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      What's New
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Latest updates and improvements
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">Loading changelog...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <p className="text-red-300">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Simple markdown-like rendering */}
                    {changelog.split("\n").map((line, index) => {
                      const trimmedLine = line.trim();

                      // Skip empty lines
                      if (!trimmedLine) return null;

                      // Main headers
                      if (trimmedLine.startsWith("# ")) {
                        return (
                          <h1
                            key={index}
                            className="text-3xl font-bold text-white mb-4 pb-4 border-b border-gray-800"
                          >
                            {trimmedLine.substring(2)}
                          </h1>
                        );
                      }

                      // Version headers
                      if (trimmedLine.startsWith("## ")) {
                        return (
                          <h2
                            key={index}
                            className="text-2xl font-semibold text-white mt-8 mb-4 flex items-center gap-2"
                          >
                            {trimmedLine.substring(3)}
                          </h2>
                        );
                      }

                      // Section headers
                      if (trimmedLine.startsWith("### ")) {
                        const text = trimmedLine.substring(4);
                        let icon = null;
                        let colorClass = "text-gray-300 border-gray-700 bg-gray-800/50";

                        if (text.includes("Added") || text.includes("✨")) {
                          icon = getChangeTypeIcon("added");
                          colorClass = "text-green-400 border-green-500/30 bg-green-900/20";
                        } else if (text.includes("Changed") || text.includes("🔄")) {
                          icon = getChangeTypeIcon("changed");
                          colorClass = "text-blue-400 border-blue-500/30 bg-blue-900/20";
                        } else if (text.includes("Fixed") || text.includes("🔧")) {
                          icon = getChangeTypeIcon("fixed");
                          colorClass = "text-yellow-400 border-yellow-500/30 bg-yellow-900/20";
                        } else if (text.includes("Removed") || text.includes("🗑️")) {
                          icon = getChangeTypeIcon("removed");
                          colorClass = "text-red-400 border-red-500/30 bg-red-900/20";
                        } else if (text.includes("Security") || text.includes("🚨")) {
                          icon = getChangeTypeIcon("security");
                          colorClass = "text-purple-400 border-purple-500/30 bg-purple-900/20";
                        }

                        return (
                          <h3
                            key={index}
                            className={`text-lg font-medium mt-6 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass}`}
                          >
                            {icon}
                            {text.replace(/[✨🔄🔧🗑️🚨🎉🏆]/g, "")}
                          </h3>
                        );
                      }

                      // List items
                      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
                        return (
                          <div key={index} className="flex items-start gap-2 text-gray-300 ml-4">
                            <span className="text-purple-400 mt-1">•</span>
                            <span className="flex-1">{trimmedLine.substring(2)}</span>
                          </div>
                        );
                      }

                      // Code blocks
                      if (trimmedLine.startsWith("```")) {
                        return null; // Skip code fence markers
                      }

                      // Links
                      if (trimmedLine.match(/\[.*\]\(.*\)/)) {
                        const match = trimmedLine.match(/\[(.*)\]\((.*)\)/);
                        if (match) {
                          return (
                            <a
                              key={index}
                              href={match[2]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 underline block"
                            >
                              {match[1]}
                            </a>
                          );
                        }
                      }

                      // Inline code
                      if (trimmedLine.includes("`")) {
                        const parts = trimmedLine.split("`");
                        return (
                          <p key={index} className="text-gray-300 my-2">
                            {parts.map((part, i) =>
                              i % 2 === 0 ? (
                                part
                              ) : (
                                <code
                                  key={i}
                                  className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-purple-300 font-mono text-sm"
                                >
                                  {part}
                                </code>
                              )
                            )}
                          </p>
                        );
                      }

                      // Horizontal rule
                      if (trimmedLine === "---") {
                        return <hr key={index} className="border-gray-800 my-8" />;
                      }

                      // Regular paragraph
                      return (
                        <p key={index} className="text-gray-300 my-2">
                          {trimmedLine}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Last updated: {new Date().toLocaleDateString()}</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

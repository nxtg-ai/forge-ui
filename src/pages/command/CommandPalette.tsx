/**
 * Command Palette Modal
 * Search and execute commands with keyboard navigation
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../../components/ui/SafeAnimatePresence";
import {
  Search,
  Clock,
  ChevronRight,
  Target,
  Activity,
  Users,
} from "lucide-react";

import type { Command as CommandType } from "../../components/types";
import type { CommandCategory, ProjectContext } from "./types";
import { CATEGORY_COLORS } from "./constants";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CommandCategory[];
  onExecute: (command: CommandType) => void;
  isExecuting: boolean;
  projectContext: ProjectContext;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  categories,
  onExecute,
  isExecuting,
  projectContext,
}) => {
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

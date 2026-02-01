import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";

interface CommandCenterProps {
  onCommandExecute: (command: string, args?: any) => void;
  availableCommands: Command[];
  projectContext: ProjectContext;
  isExecuting: boolean;
}

interface Command {
  id: string;
  name: string;
  description: string;
  category: "forge" | "git" | "test" | "deploy" | "analyze";
  hotkey?: string;
  requiresConfirmation?: boolean;
  icon: React.ReactNode;
}

interface ProjectContext {
  name: string;
  phase: string;
  activeAgents: number;
  pendingTasks: number;
  healthScore: number;
  lastActivity: Date;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  onCommandExecute,
  availableCommands,
  projectContext,
  isExecuting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [filteredCommands, setFilteredCommands] = useState(availableCommands);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Filter commands based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = availableCommands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cmd.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredCommands(filtered);
    } else {
      setFilteredCommands(availableCommands);
    }
  }, [searchQuery, availableCommands]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }

      // Enter to execute selected command
      if (e.key === "Enter" && selectedCommand && isOpen) {
        handleCommandExecute(selectedCommand);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCommand, isOpen]);

  const handleCommandExecute = (command: Command) => {
    if (command.requiresConfirmation) {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Execute "${command.name}"? ${command.description}`,
      );
      if (!confirmed) return;
    }

    onCommandExecute(command.id);
    setCommandHistory((prev) => [command.id, ...prev.slice(0, 9)]);
    setIsOpen(false);
    setSearchQuery("");
  };

  const categoryColors = {
    forge: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    git: "text-green-400 bg-green-500/10 border-green-500/20",
    test: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    deploy: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    analyze: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };

  const quickActions = [
    {
      id: "status",
      label: "Status",
      icon: <Activity className="w-4 h-4" />,
      color: "blue",
    },
    {
      id: "feature",
      label: "New Feature",
      icon: <Plus className="w-4 h-4" />,
      color: "green",
    },
    {
      id: "test",
      label: "Run Tests",
      icon: <Play className="w-4 h-4" />,
      color: "purple",
    },
    {
      id: "deploy",
      label: "Deploy",
      icon: <Cloud className="w-4 h-4" />,
      color: "orange",
    },
  ];

  return (
    <>
      {/* Floating Command Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="command-center-trigger-btn"
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Command className="w-6 h-6 text-white" />
          </div>

          {/* Status Indicator */}
          {projectContext.activeAgents > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-gray-950" />
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">⌘</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">K</kbd>
            </div>
          </div>
        </div>
      </motion.button>

      {/* Quick Actions Bar */}
      {showQuickActions && !isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-6 z-30"
          data-testid="command-center-quick-actions"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-800">
            <div className="text-xs text-gray-500 mr-2">Quick:</div>
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onCommandExecute(action.id)}
                disabled={isExecuting}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                  ${
                    isExecuting
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-800 active:scale-95"
                  }
                `}
                data-testid={`command-center-quick-${action.id}-btn`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-x-0 top-20 mx-auto w-full max-w-2xl z-50 px-4"
              data-testid="command-center-modal"
            >
              <div
                className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden"
                data-testid="command-center-palette"
              >
                {/* Search Header */}
                <div
                  className="p-4 border-b border-gray-800"
                  data-testid="command-center-search-header"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type a command or search..."
                      className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 text-lg"
                      autoFocus
                      data-testid="command-center-search-input"
                    />
                    <div className="flex items-center gap-2">
                      {isExecuting && (
                        <div className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" />
                          Executing...
                        </div>
                      )}
                      <kbd className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                        ESC
                      </kbd>
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
                        <span className="text-gray-200 font-medium">
                          {projectContext.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <span className="text-gray-400">Phase:</span>
                        <span className="text-gray-200 font-medium">
                          {projectContext.phase}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-green-400" />
                        <span className="text-gray-200">
                          {projectContext.activeAgents}
                        </span>
                        <span className="text-gray-400">agents</span>
                      </div>
                      <div
                        className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${
                          projectContext.healthScore >= 80
                            ? "bg-green-500/20 text-green-400"
                            : projectContext.healthScore >= 60
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }
                      `}
                      >
                        {projectContext.healthScore}% health
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commands List */}
                <div
                  className="max-h-96 overflow-y-auto"
                  data-testid="command-center-commands-list"
                >
                  {filteredCommands.length > 0 ? (
                    <div className="p-2">
                      {Object.entries(
                        filteredCommands.reduce(
                          (acc, cmd) => {
                            if (!acc[cmd.category]) acc[cmd.category] = [];
                            acc[cmd.category].push(cmd);
                            return acc;
                          },
                          {} as Record<string, Command[]>,
                        ),
                      ).map(([category, commands]) => (
                        <div
                          key={category}
                          className="mb-4"
                          data-testid={`command-center-category-${category}`}
                        >
                          <div className="px-3 py-1 mb-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {category}
                            </span>
                          </div>
                          {commands.map((command, idx) => (
                            <button
                              key={command.id}
                              onClick={() => handleCommandExecute(command)}
                              onMouseEnter={() => setSelectedCommand(command)}
                              className={`
                                w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all
                                ${
                                  selectedCommand?.id === command.id
                                    ? "bg-gray-800 text-gray-100"
                                    : "hover:bg-gray-800/50 text-gray-300"
                                }
                              `}
                              data-testid={`command-center-command-${command.id}`}
                            >
                              <div
                                className={`
                                w-8 h-8 rounded-lg flex items-center justify-center border
                                ${categoryColors[command.category]}
                              `}
                              >
                                {command.icon}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {command.name}
                                  {command.hotkey && (
                                    <kbd className="px-1.5 py-0.5 bg-gray-900 rounded text-xs text-gray-500">
                                      {command.hotkey}
                                    </kbd>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {command.description}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-400 mb-2">No commands found</p>
                      <p className="text-sm text-gray-500">
                        Try a different search term
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent Commands */}
                {commandHistory.length > 0 && !searchQuery && (
                  <div className="p-4 border-t border-gray-800 bg-gray-800/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">Recent</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {commandHistory.slice(0, 5).map((cmdId) => {
                        const cmd = availableCommands.find(
                          (c) => c.id === cmdId,
                        );
                        if (!cmd) return null;
                        return (
                          <button
                            key={cmdId}
                            onClick={() => handleCommandExecute(cmd)}
                            className="px-3 py-1 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-all"
                          >
                            {cmd.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

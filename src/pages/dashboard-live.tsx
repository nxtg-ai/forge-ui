/**
 * Live Dashboard with Panel Architecture
 * 3-column responsive layout: Memory | Dashboard | Governance
 *
 * Features:
 * - Left panel: Context/Memory panel (collapsible, 320px)
 * - Center: Main dashboard content (ChiefOfStaffDashboard)
 * - Right panel: Governance HUD (collapsible, 320px)
 * - Footer: Oracle Feed + panel toggles
 * - Responsive: Mobile (full-screen + overlays), Tablet (2-col), Desktop (3-col)
 * - Full keyboard navigation and screen reader support
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChiefOfStaffDashboard } from "../components/ChiefOfStaffDashboard";
import { CommandCenter } from "../components/CommandCenter";
import { LiveActivityFeed } from "../components/real-time/LiveActivityFeed";
import { AgentCollaborationView } from "../components/real-time/AgentCollaborationView";
import { GovernanceHUD } from "../components/governance";
import { ContextWindowHUD } from "../components/terminal";
import { Panel } from "../components/infinity-terminal/Panel";
import { FooterPanel } from "../components/infinity-terminal/FooterPanel";
import { useResponsiveLayout } from "../components/infinity-terminal/hooks";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import {
  ToastProvider,
  useToast,
  toastPresets,
} from "../components/feedback/ToastSystem";
import {
  useRealtimeConnection,
  useOptimisticUpdate,
  useAdaptivePolling,
} from "../hooks/useRealtimeConnection";
import { EngagementProvider, useEngagement } from "../contexts/EngagementContext";
import {
  Activity,
  Users,
  Zap,
  Brain,
  Shield,
  MessageSquare,
  Network,
  BarChart3,
  Settings,
  RefreshCw,
  LayoutDashboard,
  Target,
  Code2,
  Terminal,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

// Dashboard with real-time integration
const LiveDashboard: React.FC = () => {
  const { toast } = useToast();

  // Layout management
  const {
    layout,
    contextPanelVisible,
    hudVisible: governancePanelVisible,
    footerVisible,
    toggleContextPanel,
    toggleHUD: toggleGovernancePanel,
  } = useResponsiveLayout({
    defaultHUDVisible: true, // Governance panel visible by default on desktop
    defaultSidebarVisible: false, // Not using sidebar, using context panel instead
  });

  // State management
  const [viewMode, setViewMode] = useState<"overview" | "agents" | "activity">(
    "overview",
  );
  const [engagementMode, setEngagementMode] = useState<
    "ceo" | "vp" | "engineer" | "builder" | "founder"
  >(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('dashboard-engagement-mode');
    return (saved as any) || "engineer";
  });
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);

  // Refs for focus management
  const modeSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Screen reader announcements
  const [announcement, setAnnouncement] = useState("");

  // Mock data - replace with real API
  const [visionData] = useState({
    mission:
      "Build a next-generation development platform that orchestrates AI agents for rapid software delivery",
    goals: [
      "Automate 80% of development tasks",
      "Reduce time-to-market by 10x",
      "Maintain 99.9% code quality",
    ],
    constraints: ["Must be secure", "Must be scalable", "Must be maintainable"],
    successMetrics: [
      "Tasks automated",
      "Development velocity",
      "Code quality score",
    ],
    timeframe: "Q1 2024",
  });

  const [projectState, setProjectState] = useState<{
    phase: "building";
    progress: number;
    blockers: any[];
    recentDecisions: any[];
    activeAgents: any[];
    healthScore: number;
  }>({
    phase: "building",
    progress: 65,
    blockers: [],
    recentDecisions: [],
    activeAgents: [],
    healthScore: 87,
  });

  // Mock oracle messages for footer
  const [oracleMessages] = useState<OracleMessage[]>([
    {
      id: "1",
      type: "info",
      message: "Dashboard initialized successfully",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "success",
      message: "Real-time connection established",
      timestamp: new Date(),
    },
  ]);

  // Mode configuration - memoized to prevent recreation
  const modeConfig = useMemo<Record<
    "ceo" | "vp" | "engineer" | "builder" | "founder",
    { label: string; icon: React.ReactNode; color: string; description: string }
  >>(() => ({
    ceo: {
      label: "CEO",
      icon: <Target className="w-4 h-4" />,
      color: "purple",
      description: "Health + Progress + Critical blockers only",
    },
    vp: {
      label: "VP",
      icon: <BarChart3 className="w-4 h-4" />,
      color: "blue",
      description: "Strategic oversight + Recent decisions + Top 3 blockers",
    },
    engineer: {
      label: "Engineer",
      icon: <Code2 className="w-4 h-4" />,
      color: "green",
      description: "Full agent activity + Technical details",
    },
    builder: {
      label: "Builder",
      icon: <Terminal className="w-4 h-4" />,
      color: "orange",
      description: "Implementation tasks + All details",
    },
    founder: {
      label: "Founder",
      icon: <Brain className="w-4 h-4" />,
      color: "red",
      description: "Everything visible, no filters",
    },
  }), []);

  // Mode keys for keyboard navigation
  const modeKeys = useMemo(() => Object.keys(modeConfig) as Array<keyof typeof modeConfig>, [modeConfig]);

  // WebSocket connection for real-time updates
  const { connectionState, messages, sendMessage, isConnected } =
    useRealtimeConnection({
      url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      onOpen: () => {
        toast.success("Connected to Forge", {
          message: "Real-time updates enabled",
        });
      },
      onClose: () => {
        toast.warning("Connection lost", {
          message: "Attempting to reconnect...",
          persistent: true,
        });
      },
      onReconnect: (attempt) => {
        if (attempt === 1) {
          toast.info(`Reconnecting... (Attempt ${attempt})`, {
            persistent: true,
          });
        }
      },
    });

  // Handle engagement mode change - memoized
  const handleModeChange = useCallback((mode: "ceo" | "vp" | "engineer" | "builder" | "founder") => {
    setEngagementMode(mode);
    localStorage.setItem('dashboard-engagement-mode', mode);
    setShowModeSelector(false);

    // Send mode change to backend via WebSocket
    if (isConnected) {
      sendMessage({
        type: "engagement_mode_change",
        payload: { mode },
      });
    }

    // Apply mode-specific panel visibility
    if (mode === "ceo") {
      // CEO mode: Only governance panel visible
      if (!governancePanelVisible) {
        toggleGovernancePanel();
      }
    }

    // Screen reader announcement
    setAnnouncement(`Switched to ${modeConfig[mode].label} mode. ${modeConfig[mode].description}`);

    toast.info(`Switched to ${modeConfig[mode].label} mode`, {
      message: modeConfig[mode].description,
      duration: 2000,
    });

    // Return focus to button
    setTimeout(() => {
      modeSelectorButtonRef.current?.focus();
    }, 100);
  }, [isConnected, sendMessage, governancePanelVisible, toggleGovernancePanel, toast, modeConfig]);

  // Mock data updates - memoized callbacks
  const updateAgentState = useCallback((agent: any) => {
    setProjectState((prev) => ({
      ...prev,
      activeAgents: prev.activeAgents.map((a) =>
        a.id === agent.id ? { ...a, ...agent } : a,
      ),
    }));
  }, []);

  const updateProjectProgress = useCallback((progress: number) => {
    setProjectState((prev) => ({
      ...prev,
      progress: Math.min(100, progress),
    }));

    if (progress === 100) {
      toast.success("Phase completed!", {
        message: "Moving to the next phase...",
        duration: 5000,
      });
    }
  }, [toast]);

  const handleNewBlocker = useCallback((blocker: any) => {
    setProjectState((prev) => ({
      ...prev,
      blockers: [blocker, ...prev.blockers].slice(0, 5),
    }));

    toast.warning("New blocker detected", {
      message: blocker.title,
      persistent: blocker.needsHuman,
      actions: blocker.needsHuman
        ? [
            {
              label: "View details",
              onClick: () => setViewMode("overview"),
            },
          ]
        : undefined,
    });
  }, [toast]);

  const handleTaskCompleted = useCallback((task: any) => {
    toast.success(`Task completed: ${task.name}`, {
      duration: 3000,
    });
  }, [toast]);

  // Process incoming WebSocket messages
  const handleRealtimeMessage = useCallback((message: any) => {
    switch (message.type) {
      case "agent_update":
        updateAgentState(message.payload);
        break;
      case "project_progress":
        updateProjectProgress(message.payload);
        break;
      case "blocker_detected":
        handleNewBlocker(message.payload);
        break;
      case "task_completed":
        handleTaskCompleted(message.payload);
        break;
    }
  }, [updateAgentState, updateProjectProgress, handleNewBlocker, handleTaskCompleted]);

  useEffect(() => {
    messages.forEach((msg) => {
      handleRealtimeMessage(msg);
    });
  }, [messages, handleRealtimeMessage]);

  // Optimistic updates for commands
  const {
    value: commandQueue,
    update: updateCommandQueue,
    isUpdating: isCommandExecuting,
  } = useOptimisticUpdate<any[]>([], async (commands) => {
    const response = await fetch("/api/commands/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    return response.json();
  });

  // Adaptive polling for non-WebSocket fallback
  const { isPolling, forceRefresh } = useAdaptivePolling(
    async () => {
      const response = await fetch("/api/status");
      const data = await response.json();
      setProjectState(data);
    },
    {
      enabled: !isConnected,
      baseInterval: 2000,
      maxInterval: 30000,
      onError: (error) => {
        toast.error("Failed to fetch status", {
          details: error.message,
        });
      },
    },
  );

  // Command execution handler - memoized
  const handleCommandExecute = useCallback(async (command: string, args?: any) => {
    setIsExecuting(true);

    // Show executing toast
    const toastId = Date.now().toString();
    toast.info("Executing command", {
      ...toastPresets.commandExecuting(command),
      id: toastId,
    });

    try {
      // Optimistic update
      await updateCommandQueue([
        ...commandQueue,
        { command, args, timestamp: new Date() },
      ]);

      // Send via WebSocket if connected
      if (isConnected) {
        sendMessage({
          type: "execute_command",
          payload: { command, args },
        });
      } else {
        // Fallback to HTTP
        const response = await fetch("/api/commands/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, args }),
        });

        if (!response.ok) throw new Error("Command execution failed");
      }

      toast.success(`${command} completed successfully`, {
        duration: 3000,
      });
    } catch (error: any) {
      toast.error(`${command} failed`, {
        message: "An error occurred while executing the command",
        details: error?.message || "Unknown error",
        actions: [
          {
            label: "Retry",
            onClick: () => handleCommandExecute(command, args),
          },
        ],
      });
    } finally {
      setIsExecuting(false);
    }
  }, [toast, commandQueue, updateCommandQueue, isConnected, sendMessage]);

  // Mock available commands - memoized to prevent recreation
  const availableCommands = useMemo(() => [
    {
      id: "status",
      name: "Status Report",
      description: "Get current project status",
      category: "forge" as const,
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: "feature",
      name: "New Feature",
      description: "Start implementing a new feature",
      category: "forge" as const,
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "test",
      name: "Run Tests",
      description: "Execute test suite",
      category: "test" as const,
      icon: <Shield className="w-4 h-4" />,
    },
    {
      id: "deploy",
      name: "Deploy",
      description: "Deploy to production",
      category: "deploy" as const,
      requiresConfirmation: true,
      icon: <Network className="w-4 h-4" />,
    },
  ], []);

  // Mock agents data - memoized to prevent recreation
  const mockAgents = useMemo(() => [
    {
      id: "arch-1",
      name: "Architect",
      role: "architect" as const,
      status: "thinking" as const,
      currentTask: "Designing authentication system",
      confidence: 85,
      collaboratingWith: ["dev-1"],
      messagesInQueue: 2,
      lastActivity: new Date(),
      performance: {
        tasksCompleted: 12,
        successRate: 92,
        avgResponseTime: 3.2,
      },
    },
    {
      id: "dev-1",
      name: "Developer",
      role: "developer" as const,
      status: "working" as const,
      currentTask: "Implementing user service",
      confidence: 78,
      collaboratingWith: ["arch-1", "qa-1"],
      messagesInQueue: 0,
      lastActivity: new Date(),
      performance: {
        tasksCompleted: 24,
        successRate: 88,
        avgResponseTime: 2.8,
      },
    },
    {
      id: "qa-1",
      name: "QA Engineer",
      role: "qa" as const,
      status: "idle" as const,
      currentTask: undefined,
      confidence: 90,
      collaboratingWith: [],
      messagesInQueue: 5,
      lastActivity: new Date(),
      performance: {
        tasksCompleted: 18,
        successRate: 95,
        avgResponseTime: 4.1,
      },
    },
  ], []);

  const mockEdges = useMemo(() => [
    {
      from: "arch-1",
      to: "dev-1",
      type: "decision" as const,
      isActive: true,
      strength: 0.8,
    },
    {
      from: "dev-1",
      to: "qa-1",
      type: "handoff" as const,
      isActive: false,
      strength: 0.5,
    },
  ], []);

  // Keyboard navigation for mode selector dropdown
  useEffect(() => {
    if (!showModeSelector) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setShowModeSelector(false);
          modeSelectorButtonRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedModeIndex((prev) => (prev + 1) % modeKeys.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedModeIndex((prev) => (prev - 1 + modeKeys.length) % modeKeys.length);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleModeChange(modeKeys[selectedModeIndex]);
          break;
        case "Home":
          e.preventDefault();
          setSelectedModeIndex(0);
          break;
        case "End":
          e.preventDefault();
          setSelectedModeIndex(modeKeys.length - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModeSelector, selectedModeIndex, modeKeys, handleModeChange]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showModeSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(e.target as Node) &&
        modeSelectorButtonRef.current &&
        !modeSelectorButtonRef.current.contains(e.target as Node)
      ) {
        setShowModeSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModeSelector]);

  // Announce connection status changes
  useEffect(() => {
    if (connectionState.status === "connected") {
      setAnnouncement(`Connected to Forge. Latency ${connectionState.latency} milliseconds.`);
    } else if (connectionState.status === "reconnecting") {
      setAnnouncement("Connection lost. Attempting to reconnect.");
    } else if (connectionState.status === "disconnected") {
      setAnnouncement("Disconnected from Forge.");
    }
  }, [connectionState.status, connectionState.latency]);

  return (
    <div
      className="h-screen bg-gray-950 text-white flex flex-col"
      data-testid="live-dashboard-container"
    >
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex-shrink-0 z-30" role="banner">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" aria-hidden="true" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Chief of Staff Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                Live
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Engagement Mode Selector - Prominent */}
              <div className="relative">
                <button
                  ref={modeSelectorButtonRef}
                  onClick={() => {
                    setShowModeSelector(!showModeSelector);
                    setSelectedModeIndex(modeKeys.indexOf(engagementMode));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" && !showModeSelector) {
                      e.preventDefault();
                      setShowModeSelector(true);
                      setSelectedModeIndex(modeKeys.indexOf(engagementMode));
                    }
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={showModeSelector}
                  aria-label={`Engagement mode: ${modeConfig[engagementMode].label}. ${modeConfig[engagementMode].description}`}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                    transition-all border-2
                    ${
                      showModeSelector
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                        : "bg-gray-900/90 border-gray-700 text-gray-300 hover:border-gray-600"
                    }
                  `}
                  data-testid="engagement-mode-button"
                >
                  <span aria-hidden="true">{modeConfig[engagementMode].icon}</span>
                  <span className="text-sm">{modeConfig[engagementMode].label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showModeSelector ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {/* Mode Selector Dropdown */}
                <AnimatePresence>
                  {showModeSelector && (
                    <motion.div
                      ref={modeDropdownRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      role="listbox"
                      aria-label="Engagement mode options"
                      className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                      data-testid="engagement-mode-dropdown"
                    >
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider" aria-hidden="true">
                          Engagement Mode
                        </div>
                        {(Object.entries(modeConfig) as [keyof typeof modeConfig, typeof modeConfig[keyof typeof modeConfig]][]).map(([mode, config], index) => (
                          <button
                            key={mode}
                            onClick={() => handleModeChange(mode)}
                            onMouseEnter={() => setSelectedModeIndex(index)}
                            role="option"
                            aria-selected={engagementMode === mode}
                            aria-label={`${config.label} mode: ${config.description}`}
                            className={`
                              w-full flex items-start gap-3 px-3 py-3 rounded-lg
                              transition-all text-left
                              ${
                                selectedModeIndex === index
                                  ? "bg-gray-800 ring-2 ring-purple-500/50"
                                  : engagementMode === mode
                                  ? "bg-purple-500/20 border border-purple-500/30"
                                  : "hover:bg-gray-800"
                              }
                            `}
                            data-testid={`engagement-mode-${mode}`}
                          >
                            <div className={`mt-0.5 ${engagementMode === mode ? "text-purple-400" : "text-gray-400"}`} aria-hidden="true">
                              {config.icon}
                            </div>
                            <div className="flex-1">
                              <div className={`font-semibold text-sm mb-1 ${engagementMode === mode ? "text-purple-400" : "text-gray-200"}`}>
                                {config.label}
                              </div>
                              <div className="text-xs text-gray-400">
                                {config.description}
                              </div>
                            </div>
                            {engagementMode === mode && (
                              <div className="text-purple-400" aria-hidden="true">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View mode selector - Desktop only */}
              <div className="hidden md:flex gap-1 p-1 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800" role="tablist" aria-label="Dashboard view mode">
                <button
                  data-testid="live-dashboard-view-overview"
                  onClick={() => {
                    setViewMode("overview");
                    setAnnouncement("Switched to Overview view");
                  }}
                  role="tab"
                  aria-selected={viewMode === "overview"}
                  aria-controls="dashboard-content"
                  aria-label="Overview view"
                  className={`
                    px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      viewMode === "overview"
                        ? "bg-gray-800 text-gray-100"
                        : "text-gray-400 hover:text-gray-200"
                    }
                  `}
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Overview
                </button>
                <button
                  data-testid="live-dashboard-view-agents"
                  onClick={() => {
                    setViewMode("agents");
                    setAnnouncement("Switched to Agents view");
                  }}
                  role="tab"
                  aria-selected={viewMode === "agents"}
                  aria-controls="dashboard-content"
                  aria-label="Agents collaboration view"
                  className={`
                    px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      viewMode === "agents"
                        ? "bg-gray-800 text-gray-100"
                        : "text-gray-400 hover:text-gray-200"
                    }
                  `}
                >
                  <Users className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Agents
                </button>
                <button
                  data-testid="live-dashboard-view-activity"
                  onClick={() => {
                    setViewMode("activity");
                    setAnnouncement("Switched to Activity view");
                  }}
                  role="tab"
                  aria-selected={viewMode === "activity"}
                  aria-controls="dashboard-content"
                  aria-label="Live activity feed view"
                  className={`
                    px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${
                      viewMode === "activity"
                        ? "bg-gray-800 text-gray-100"
                        : "text-gray-400 hover:text-gray-200"
                    }
                  `}
                >
                  <Activity className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Activity
                </button>
              </div>

              {/* Panel toggles (desktop only in header) */}
              {!layout.isMobile && (
                <div className="flex gap-2 ml-2" role="group" aria-label="Panel toggles">
                  <button
                    onClick={() => {
                      toggleContextPanel();
                      setAnnouncement(`Memory and Context panel ${!contextPanelVisible ? "opened" : "closed"}`);
                    }}
                    aria-pressed={contextPanelVisible}
                    aria-label={`Toggle Memory and Context panel. Currently ${contextPanelVisible ? "visible" : "hidden"}.`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      contextPanelVisible
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                    title="Toggle Memory & Context"
                  >
                    <Brain className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => {
                      toggleGovernancePanel();
                      setAnnouncement(`Governance HUD panel ${!governancePanelVisible ? "opened" : "closed"}`);
                    }}
                    aria-pressed={governancePanelVisible}
                    aria-label={`Toggle Governance HUD panel. Currently ${governancePanelVisible ? "visible" : "hidden"}.`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      governancePanelVisible
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                    title="Toggle Governance HUD"
                  >
                    <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Connection indicator */}
              <div
                role="status"
                aria-live="polite"
                aria-label={
                  connectionState.status === "connected"
                    ? `Connected. Latency ${connectionState.latency} milliseconds.`
                    : connectionState.status === "reconnecting"
                      ? "Connection lost. Reconnecting."
                      : "Offline. Not connected."
                }
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg
                  ${
                    connectionState.status === "connected"
                      ? "bg-green-900/20 border border-green-500/30"
                      : connectionState.status === "reconnecting"
                        ? "bg-yellow-900/20 border border-yellow-500/30"
                        : "bg-red-900/20 border border-red-500/30"
                  }
                `}
              >
                <div
                  aria-hidden="true"
                  className={`
                    w-2 h-2 rounded-full
                    ${
                      connectionState.status === "connected"
                        ? "bg-green-500"
                        : connectionState.status === "reconnecting"
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-red-500"
                    }
                  `}
                />
                <span className="text-xs font-medium">
                  {connectionState.status === "connected"
                    ? `Live (${connectionState.latency}ms)`
                    : connectionState.status === "reconnecting"
                      ? `Reconnecting...`
                      : "Offline"}
                </span>
                {!isConnected && (
                  <button
                    data-testid="live-dashboard-refresh-btn"
                    onClick={forceRefresh}
                    aria-label="Refresh connection status"
                    className="p-1 hover:bg-gray-800 rounded transition-all"
                  >
                    <RefreshCw
                      aria-hidden="true"
                      className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex">
        {/* Left Panel - Memory & Context */}
        <Panel
          side="left"
          mode={layout.panelMode}
          visible={contextPanelVisible}
          width={320}
          onClose={toggleContextPanel}
          title="Memory & Context"
        >
          <ErrorBoundary fallbackMessage="Context panel encountered an error.">
            <div className="h-full p-4">
              <ContextWindowHUD className="h-full" />
            </div>
          </ErrorBoundary>
        </Panel>

        {/* Main Dashboard Content */}
        <main className="flex-1 min-w-0 bg-gray-950 overflow-y-auto pb-16 md:pb-0" role="main" id="dashboard-content" aria-label="Dashboard main content">
          {/* Status bar */}
          <div
            data-testid="live-dashboard-status-bar"
            role="progressbar"
            aria-label={isCommandExecuting ? "Command executing" : "No commands executing"}
            aria-valuenow={isCommandExecuting ? undefined : 0}
            className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-900"
          >
            <AnimatePresence>
              {isCommandExecuting && (
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Main content */}
          <AnimatePresence mode="wait">
            {viewMode === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ChiefOfStaffDashboard
                  visionData={visionData}
                  projectState={projectState}
                  agentActivity={[]}
                  onModeChange={setEngagementMode}
                  currentMode={engagementMode}
                />
              </motion.div>
            )}

            {viewMode === "agents" && (
              <motion.div
                key="agents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto px-6 py-20"
              >
                <h1 className="text-2xl font-bold mb-8">
                  Agent Collaboration Network
                </h1>
                <AgentCollaborationView
                  agents={mockAgents}
                  edges={mockEdges}
                  viewMode="network"
                />
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Agent Details</h2>
                  <AgentCollaborationView
                    agents={mockAgents}
                    edges={mockEdges}
                    viewMode="list"
                  />
                </div>
              </motion.div>
            )}

            {viewMode === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto px-6 py-20"
              >
                <h1 className="text-2xl font-bold mb-8">Live Activity Feed</h1>
                <LiveActivityFeed maxItems={100} autoScroll={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Panel - Governance HUD */}
        <Panel
          side="right"
          mode={layout.panelMode}
          visible={governancePanelVisible}
          width={320}
          onClose={toggleGovernancePanel}
          title="Governance HUD"
        >
          <ErrorBoundary fallbackMessage="Governance HUD encountered an error.">
            <div className="h-full p-4">
              <GovernanceHUD />
            </div>
          </ErrorBoundary>
        </Panel>
      </div>

      {/* Footer Panel */}
      {footerVisible && (
        <FooterPanel
          sessionName="nxtg-forge-v3"
          isConnected={isConnected}
          oracleMessages={oracleMessages}
          onToggleContext={toggleContextPanel}
          onToggleGovernance={toggleGovernancePanel}
          contextVisible={contextPanelVisible}
          governanceVisible={governancePanelVisible}
          isMobile={layout.isMobile}
        />
      )}

      {/* Command center */}
      <CommandCenter
        onCommandExecute={handleCommandExecute}
        availableCommands={availableCommands}
        projectContext={{
          name: "NXTG-Forge",
          phase: projectState.phase,
          activeAgents: mockAgents.filter((a) => a.status !== "idle").length,
          pendingTasks: 12,
          healthScore: projectState.healthScore,
          lastActivity: new Date(),
        }}
        isExecuting={isExecuting || isCommandExecuting}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-50 md:hidden pb-safe" role="navigation" aria-label="Mobile navigation">
        <div className="h-full flex items-center justify-around px-4" role="tablist">
          {/* Overview Tab */}
          <motion.button
            data-testid="mobile-nav-overview"
            onClick={() => {
              setViewMode("overview");
              setAnnouncement("Switched to Overview view");
            }}
            whileTap={{ scale: 0.95 }}
            role="tab"
            aria-selected={viewMode === "overview"}
            aria-controls="dashboard-content"
            aria-label="Overview view"
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
          >
            <motion.div
              animate={{
                color: viewMode === "overview" ? "#a78bfa" : "#9ca3af",
              }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <BarChart3 className="w-5 h-5" />
            </motion.div>
            <span
              className={`text-xs font-medium transition-colors ${
                viewMode === "overview" ? "text-purple-400" : "text-gray-400"
              }`}
            >
              Overview
            </span>
            {viewMode === "overview" && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                aria-hidden="true"
              />
            )}
          </motion.button>

          {/* Agents Tab */}
          <motion.button
            data-testid="mobile-nav-agents"
            onClick={() => {
              setViewMode("agents");
              setAnnouncement("Switched to Agents collaboration view");
            }}
            whileTap={{ scale: 0.95 }}
            role="tab"
            aria-selected={viewMode === "agents"}
            aria-controls="dashboard-content"
            aria-label="Agents collaboration view"
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
          >
            <motion.div
              animate={{
                color: viewMode === "agents" ? "#a78bfa" : "#9ca3af",
              }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <Users className="w-5 h-5" />
            </motion.div>
            <span
              className={`text-xs font-medium transition-colors ${
                viewMode === "agents" ? "text-purple-400" : "text-gray-400"
              }`}
            >
              Agents
            </span>
            {viewMode === "agents" && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                aria-hidden="true"
              />
            )}
          </motion.button>

          {/* Activity Tab */}
          <motion.button
            data-testid="mobile-nav-activity"
            onClick={() => {
              setViewMode("activity");
              setAnnouncement("Switched to Live Activity Feed view");
            }}
            whileTap={{ scale: 0.95 }}
            role="tab"
            aria-selected={viewMode === "activity"}
            aria-controls="dashboard-content"
            aria-label="Live activity feed view"
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
          >
            <motion.div
              animate={{
                color: viewMode === "activity" ? "#a78bfa" : "#9ca3af",
              }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              <Activity className="w-5 h-5" />
            </motion.div>
            <span
              className={`text-xs font-medium transition-colors ${
                viewMode === "activity" ? "text-purple-400" : "text-gray-400"
              }`}
            >
              Activity
            </span>
            {viewMode === "activity" && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                aria-hidden="true"
              />
            )}
          </motion.button>
        </div>
      </nav>
    </div>
  );
};

// Wrap with providers
const DashboardPage: React.FC = () => {
  return (
    <EngagementProvider>
      <ToastProvider>
        <LiveDashboard />
      </ToastProvider>
    </EngagementProvider>
  );
};

export default DashboardPage;

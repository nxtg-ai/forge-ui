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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import { ChiefOfStaffDashboard } from "../components/ChiefOfStaffDashboard";
import { CommandCenter } from "../components/CommandCenter";
import { LiveActivityFeed } from "../components/real-time/LiveActivityFeed";
import { AgentCollaborationView } from "../components/real-time/AgentCollaborationView";
import { GovernanceHUD } from "../components/governance";
import { ContextWindowHUD } from "../components/terminal";
import { AppShell } from "../components/layout";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { type KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";
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
import { useLayout } from "../contexts/LayoutContext";
import type {
  Agent,
  Blocker,
  Command,
  ProjectState,
} from "../components/types";
import {
  Activity,
  Users,
  Zap,
  Brain,
  Shield,
  MessageSquare,
  Network,
  BarChart3,
  RefreshCw,
} from "lucide-react";

// Dashboard keyboard shortcuts
const DASHBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: "[", description: "Toggle Context panel", category: "navigation" },
  { key: "]", description: "Toggle Governance panel", category: "navigation" },
  { key: "1", description: "Overview tab", category: "navigation" },
  { key: "2", description: "Agents tab", category: "navigation" },
  { key: "3", description: "Activity tab", category: "navigation" },
  { key: "r", description: "Refresh data", category: "actions" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
];

// Dashboard with real-time integration
const LiveDashboard: React.FC = () => {
  const { toast } = useToast();
  const { mode: engagementMode } = useEngagement();

  // Layout management from context
  const {
    contextPanelVisible,
    governancePanelVisible,
    footerVisible,
    toggleContextPanel,
    toggleGovernancePanel,
    layout,
  } = useLayout();

  // State management
  const [viewMode, setViewMode] = useState<"overview" | "agents" | "activity">(
    "overview",
  );
  const [isExecuting, setIsExecuting] = useState(false);

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

  const [projectState, setProjectState] = useState<ProjectState>({
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

  // Mock data updates - memoized callbacks
  const updateAgentState = useCallback((agent: Agent) => {
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

  const handleNewBlocker = useCallback((blocker: Blocker) => {
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

  const handleTaskCompleted = useCallback((task: { name: string }) => {
    toast.success(`Task completed: ${task.name}`, {
      duration: 3000,
    });
  }, [toast]);

  // WebSocket message structure
  interface RealtimeMessage {
    type: 'agent_update' | 'project_progress' | 'blocker_detected' | 'task_completed';
    payload: Agent | number | Blocker | { name: string };
  }

  // Process incoming WebSocket messages
  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
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
  } = useOptimisticUpdate<Command[]>([], async (commands) => {
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
      const response = await fetch("/api/state");
      if (!response.ok) return;
      const result = await response.json();
      if (result.success) setProjectState(result.data);
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
  const handleCommandExecute = useCallback(async (command: string, args?: Record<string, unknown>) => {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${command} failed`, {
        message: "An error occurred while executing the command",
        details: errorMessage,
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
    <AppShell
      title="Dashboard"
      icon={<BarChart3 className="w-6 h-6" />}
      badge="Live"
      leftPanel={<ContextWindowHUD />}
      rightPanel={<GovernanceHUD />}
      customShortcuts={DASHBOARD_SHORTCUTS}
    >
      <div
        className="h-full bg-gray-950 text-white flex flex-col"
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

        {/* Main Dashboard Content */}
        <main className="flex-1 min-w-0 bg-gray-950 overflow-y-auto" role="main" id="dashboard-content" aria-label="Dashboard main content">
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

          {/* Page-specific view mode tabs */}
          <div className="border-b border-gray-800 bg-gray-900/30">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex gap-1 py-2" role="tablist" aria-label="Dashboard view mode">
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
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
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
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
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
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
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
          </div>
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
                onModeChange={() => {}} // No-op since mode is managed by EngagementContext
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
              className="max-w-7xl mx-auto px-6 py-8"
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
              className="max-w-7xl mx-auto px-6 py-8"
            >
              <h1 className="text-2xl font-bold mb-8">Live Activity Feed</h1>
              <LiveActivityFeed maxItems={100} autoScroll={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
      </div>
    </AppShell>
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

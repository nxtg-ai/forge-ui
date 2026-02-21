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

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import { ChiefOfStaffDashboard } from "../components/ChiefOfStaffDashboard";
import { CommandCenter } from "../components/CommandCenter";
import { CommandOutputDrawer } from "../components/CommandOutputDrawer";
import { LiveActivityFeed } from "../components/real-time/LiveActivityFeed";
import { AgentCollaborationView } from "../components/real-time/AgentCollaborationView";
import { GovernanceHUD } from "../components/governance";
import { ContextWindowHUD } from "../components/terminal";
import { AppShell } from "../components/layout";
import { type KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";
import {
  ToastProvider,
  useToast,
  toastPresets,
} from "../components/feedback/ToastSystem";
import {
  useRealtimeConnection,
  useAdaptivePolling,
} from "../hooks/useRealtimeConnection";
import { useForgeCommands } from "../hooks/useForgeCommands";
import { useDashboardData } from "../hooks/useDashboardData";
import { useCommandOutput } from "../hooks/useCommandOutput";
import { wsManager } from "../services/ws-manager";
import { apiFetch } from "../utils/api-fetch";
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
  BarChart3,
} from "lucide-react";

/** Worker data from /api/workers endpoint */
interface WorkerApiData {
  id: string;
  assignedWorkstream?: string;
  status?: string;
  currentTask?: { command?: string };
  metrics?: { successRate?: number; tasksCompleted?: number; avgTaskDuration?: number };
  lastActivity?: string | Date;
}

/** Transformed worker for AgentCollaborationView */
interface WorkerAgent {
  id: string;
  name: string;
  role: "architect" | "developer" | "qa" | "devops" | "orchestrator";
  status: "idle" | "thinking" | "working" | "blocked" | "discussing";
  currentTask?: string;
  confidence: number;
  collaboratingWith: string[];
  messagesInQueue: number;
  lastActivity: Date;
  performance: { tasksCompleted: number; successRate: number; avgResponseTime: number };
}

// Dashboard keyboard shortcuts
const DASHBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: "[", description: "Toggle Context panel", category: "navigation" },
  { key: "]", description: "Toggle Governance panel", category: "navigation" },
  { key: "1", description: "Overview tab", category: "navigation" },
  { key: "2", description: "Agents tab", category: "navigation" },
  { key: "3", description: "Activity tab", category: "navigation" },
  { key: "r", description: "Refresh data", category: "actions" },
  { key: "Ctrl+`", description: "Toggle command output panel", category: "actions" },
  { key: "?", description: "Show keyboard shortcuts", category: "general" },
];

// Dashboard with real-time integration
const LiveDashboard: React.FC = () => {
  const { toast } = useToast();
  const { mode: engagementMode, setMode } = useEngagement();

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

  // Command output drawer state
  const commandOutput = useCommandOutput();

  // Screen reader announcements
  const [announcement, setAnnouncement] = useState("");

  // Real data from API endpoints
  const {
    projectState,
    visionData,
    agents: realAgents,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboardData();

  // WebSocket connection for real-time updates (shared via wsManager singleton)
  const { connectionState, isConnected } =
    useRealtimeConnection({
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

  // Subscribe to specific event types for toasts (no blanket refresh)
  useEffect(() => {
    const unsubs = [
      wsManager.subscribe("task_completed", (data: { name?: string } | null) => {
        toast.success(`Task completed: ${data?.name || "unknown"}`, {
          duration: 3000,
        });
      }),
      wsManager.subscribe("blocker_detected", (data: { title?: string } | null) => {
        toast.warning("New blocker detected", {
          message: data?.title || "Unknown blocker",
        });
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [toast]);

  // Fetch available commands from API
  const { commands: availableCommands, isLoading: commandsLoading, error: commandsError } = useForgeCommands();

  // Adaptive polling for non-WebSocket fallback - uses real dashboard refresh
  const { isPolling, forceRefresh } = useAdaptivePolling(
    refreshDashboard,
    {
      enabled: !isConnected,
      baseInterval: 5000,
      maxInterval: 30000,
      onError: (error) => {
        toast.error("Failed to fetch status", {
          details: error.message,
        });
      },
    },
  );

  // Show error toast if commands fail to load
  useEffect(() => {
    if (commandsError) {
      toast.error("Failed to load commands", {
        details: commandsError,
        persistent: false,
      });
    }
  }, [commandsError, toast]);

  // Command execution handler - calls real /api/commands/execute endpoint
  // Output is sent to the CommandOutputDrawer for full display.
  // Toasts are now lightweight status notifications only (no truncated output).
  const handleCommandExecute = useCallback(async (command: string, args?: Record<string, unknown>) => {
    setIsExecuting(true);

    // Track in the output drawer
    const entryId = commandOutput.startCommand(command);

    try {
      const response = await apiFetch("/api/commands/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, args }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const output = result.data?.output || result.error || "Unknown error";
        commandOutput.completeCommand(entryId, output, "error", result.data);

        // Lightweight toast -- just the status, not the full output
        toast.error(`${command} failed`, {
          duration: 5000,
          actions: [
            {
              label: "Retry",
              onClick: () => handleCommandExecute(command, args),
            },
          ],
        });
        return;
      }

      // Handle redirect commands (e.g., frg-feature -> terminal)
      if (result.data?.redirect) {
        const output = result.data.output || `Navigate to ${result.data.redirect}`;
        commandOutput.completeCommand(entryId, output, "success");
        toast.info(output, { duration: 5000 });
        return;
      }

      // Full output goes to the drawer
      const output = result.data?.output || "";
      const metadata = result.data ? { ...result.data } : undefined;
      // Remove the output string from metadata to avoid duplication
      if (metadata) delete metadata.output;

      commandOutput.completeCommand(entryId, output, "success", metadata);

      // Lightweight success toast (no output, just status)
      if (command === "frg-test" && result.data) {
        const { passed, failed } = result.data;
        toast.success(`Tests: ${passed} passed${failed ? `, ${failed} failed` : ""}`, {
          duration: 4000,
        });
      } else if (command === "frg-deploy") {
        toast.success("Build completed successfully", { duration: 4000 });
      } else {
        toast.success(`${command} completed`, { duration: 3000 });
      }

      // Refresh dashboard data after command execution
      refreshDashboard();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      commandOutput.completeCommand(entryId, errorMessage, "error");

      toast.error(`${command} failed`, {
        duration: 5000,
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
  }, [toast, refreshDashboard, commandOutput]);

  // Commands are now fetched via useForgeCommands hook
  // Agents data fetched from worker pool API
  const [workerAgents, setWorkerAgents] = useState<WorkerAgent[]>([]);
  const [workerEdges, setWorkerEdges] = useState<any[]>([]);

  // Fetch real worker data for agent collaboration view
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await apiFetch("/api/workers");
        if (!response.ok) return;
        const result = await response.json();
        if (result.success && result.data?.workers) {
          const workers = result.data.workers;
          // Transform workers to agent format for AgentCollaborationView
          const agents = workers.map((w: WorkerApiData) => ({
            id: w.id,
            name: w.assignedWorkstream || `Worker ${w.id.slice(0, 6)}`,
            role: w.assignedWorkstream === "architect" ? "architect" as const
              : w.assignedWorkstream === "qa" ? "qa" as const
              : w.assignedWorkstream === "devops" ? "devops" as const
              : "developer" as const,
            status: w.status === "idle" ? "idle" as const
              : w.status === "busy" ? "working" as const
              : w.status === "error" || w.status === "crashed" ? "blocked" as const
              : "thinking" as const,
            currentTask: w.currentTask?.command,
            confidence: w.metrics?.successRate || 75,
            collaboratingWith: [],
            messagesInQueue: 0,
            lastActivity: w.lastActivity ? new Date(w.lastActivity) : new Date(),
            performance: {
              tasksCompleted: w.metrics?.tasksCompleted || 0,
              successRate: w.metrics?.successRate || 0,
              avgResponseTime: w.metrics?.avgTaskDuration || 0,
            },
          }));
          setWorkerAgents(agents);

          // Build edges from consecutive workers
          const edges = agents.slice(0, -1).map((a, i) => ({
            from: a.id,
            to: agents[i + 1].id,
            type: "handoff" as const,
            isActive: a.status === "working",
            strength: 0.5,
          }));
          setWorkerEdges(edges);
        }
      } catch {
        // Worker pool may not be initialized - that's fine
      }
    };
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 5000);
    return () => clearInterval(interval);
  }, []);

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
              aria-label={isExecuting ? "Command executing" : "No commands executing"}
              aria-valuenow={isExecuting ? undefined : 0}
              className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-900"
            >
              <AnimatePresence>
                {isExecuting && (
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

          {/* Dashboard error banner */}
          {dashboardError && (
            <div className="mx-6 mt-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between" role="alert">
              <span className="text-sm text-red-400">Failed to load dashboard data: {dashboardError}</span>
              <button onClick={refreshDashboard} className="text-xs text-red-300 hover:text-white px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 transition-colors">Retry</button>
            </div>
          )}

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
                projectState={projectState as ProjectState}
                agentActivity={[]}
                onModeChange={setMode}
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
                <span className="ml-3 text-xs font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 align-middle">
                  Preview
                </span>
              </h1>
              <AgentCollaborationView
                agents={workerAgents}
                edges={workerEdges}
                viewMode="network"
              />
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Agent Details</h2>
                <AgentCollaborationView
                  agents={workerAgents}
                  edges={workerEdges}
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

      {/* Command center -- shifts up when output drawer is open */}
      <CommandCenter
        onCommandExecute={handleCommandExecute}
        availableCommands={availableCommands}
        projectContext={{
          name: "NXTG-Forge",
          phase: projectState.phase,
          activeAgents: workerAgents.filter((a) => a.status !== "idle").length,
          pendingTasks: projectState.blockers.length,
          healthScore: projectState.healthScore,
          lastActivity: new Date(),
        }}
        isExecuting={isExecuting}
        isLoadingCommands={commandsLoading}
      />

      {/* Command output drawer -- bottom slide-up panel for full output */}
      <CommandOutputDrawer commandOutput={commandOutput} />
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

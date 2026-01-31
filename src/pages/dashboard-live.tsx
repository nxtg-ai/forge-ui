import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChiefOfStaffDashboard } from "../components/ChiefOfStaffDashboard";
import { CommandCenter } from "../components/CommandCenter";
import { LiveActivityFeed } from "../components/real-time/LiveActivityFeed";
import { AgentCollaborationView } from "../components/real-time/AgentCollaborationView";
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
} from "lucide-react";

// Dashboard with real-time integration
const LiveDashboard: React.FC = () => {
  const { toast } = useToast();

  // State management
  const [viewMode, setViewMode] = useState<"overview" | "agents" | "activity">(
    "overview",
  );
  const [engagementMode, setEngagementMode] = useState<
    "ceo" | "vp" | "engineer" | "builder" | "founder"
  >("engineer");
  const [isExecuting, setIsExecuting] = useState(false);

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

  const [projectState, setProjectState] = useState({
    phase: "building" as const,
    progress: 65,
    blockers: [],
    recentDecisions: [],
    activeAgents: [],
    healthScore: 87,
  });

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

  // Process incoming WebSocket messages
  useEffect(() => {
    messages.forEach((msg) => {
      handleRealtimeMessage(msg);
    });
  }, [messages]);

  const handleRealtimeMessage = (message: any) => {
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
  };

  // Optimistic updates for commands
  const {
    value: commandQueue,
    update: updateCommandQueue,
    isUpdating: isCommandExecuting,
  } = useOptimisticUpdate([], async (commands) => {
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

  // Command execution handler
  const handleCommandExecute = async (command: string, args?: any) => {
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
    } catch (error) {
      toast.error(`${command} failed`, {
        message: "An error occurred while executing the command",
        details: error.message,
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
  };

  // Mock data updates
  const updateAgentState = (agent: any) => {
    setProjectState((prev) => ({
      ...prev,
      activeAgents: prev.activeAgents.map((a) =>
        a.id === agent.id ? { ...a, ...agent } : a,
      ),
    }));
  };

  const updateProjectProgress = (progress: number) => {
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
  };

  const handleNewBlocker = (blocker: any) => {
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
  };

  const handleTaskCompleted = (task: any) => {
    toast.success(`Task completed: ${task.name}`, {
      duration: 3000,
    });
  };

  // Mock available commands
  const availableCommands = [
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
  ];

  // Mock agents data
  const mockAgents = [
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
  ];

  const mockEdges = [
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
  ];

  return (
    <div
      data-testid="live-dashboard-container"
      className="min-h-screen bg-gray-950"
    >
      {/* Status bar */}
      <div
        data-testid="live-dashboard-status-bar"
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

      {/* View mode selector */}
      <div
        data-testid="live-dashboard-view-selector"
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
      >
        <div className="flex gap-1 p-1 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-800">
          <button
            data-testid="live-dashboard-view-overview"
            onClick={() => setViewMode("overview")}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                viewMode === "overview"
                  ? "bg-gray-800 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }
            `}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            data-testid="live-dashboard-view-agents"
            onClick={() => setViewMode("agents")}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                viewMode === "agents"
                  ? "bg-gray-800 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }
            `}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Agents
          </button>
          <button
            data-testid="live-dashboard-view-activity"
            onClick={() => setViewMode("activity")}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                viewMode === "activity"
                  ? "bg-gray-800 text-gray-100"
                  : "text-gray-400 hover:text-gray-200"
              }
            `}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Activity
          </button>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="fixed top-4 right-4 z-40">
        <div
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
              className="p-1 hover:bg-gray-800 rounded transition-all"
            >
              <RefreshCw
                className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`}
              />
            </button>
          )}
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
  );
};

// Wrap with providers
const DashboardPage: React.FC = () => {
  return (
    <ToastProvider>
      <LiveDashboard />
    </ToastProvider>
  );
};

export default DashboardPage;

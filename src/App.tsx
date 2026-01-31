/**
 * NXTG-Forge Integrated Application
 * Full UI-Backend Integration with Real-time Updates
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  VisionCapture,
  ChiefOfStaffDashboard,
  ArchitectDiscussion,
  CommandCenter,
  VisionDisplay,
  YoloMode,
  ProjectSwitcher,
  ProjectsManagement,
} from "./components";
import { MCPSelectionView } from "./components/onboarding/MCPSelectionView";
import TerminalView from "./pages/terminal-view";
import InfinityTerminalView from "./pages/infinity-terminal-view";
import {
  useVision,
  useProjectState,
  useAgentActivities,
  useCommandExecution,
  useArchitectureDecisions,
  useYoloMode,
  useForgeIntegration,
} from "./hooks/useForgeIntegration";
import { apiClient } from "./services/api-client";
import type {
  EngagementMode,
  Architect,
  Command,
  AutomationLevel,
} from "./components/types";
import type { Runspace } from "./core/runspace";

// Loading component
const LoadingOverlay: React.FC<{ message?: string }> = ({
  message = "Connecting to Forge backend...",
}) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md">
      <div className="flex items-center space-x-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <div>
          <h3 className="text-lg font-semibold text-white">
            Initializing Forge
          </h3>
          <p className="text-sm text-gray-400 mt-1">{message}</p>
        </div>
      </div>
    </div>
  </div>
);

// Error boundary component
const ErrorDisplay: React.FC<{ errors: string[] }> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50">
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
        <h4 className="text-red-400 font-semibold mb-2">Connection Issues</h4>
        {errors.map((error, idx) => (
          <p key={idx} className="text-sm text-red-300/80">
            {error}
          </p>
        ))}
      </div>
    </div>
  );
};

// Main integrated app component
function IntegratedApp() {
  // Use integrated hooks for backend connection
  const forge = useForgeIntegration();

  // Local state management
  const [currentView, setCurrentView] = useState<
    | "vision-capture"
    | "mcp-selection"
    | "dashboard"
    | "architect"
    | "command"
    | "vision-display"
    | "yolo"
    | "terminal"
    | "infinity-terminal"
  >("dashboard");
  const [engagementMode, setEngagementMode] =
    useState<EngagementMode>("founder");
  const [automationLevel, setAutomationLevel] =
    useState<AutomationLevel>("conservative");
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(
    null,
  );
  const [visionSkipped, setVisionSkipped] = useState(false);
  const [capturedVision, setCapturedVision] = useState<any>(null);
  const [mcpSuggestions, setMcpSuggestions] = useState<any>(null);
  const [loadingMcpSuggestions, setLoadingMcpSuggestions] = useState(false);

  // Runspace state for multi-project support
  const [runspaces, setRunspaces] = useState<Runspace[]>([]);
  const [activeRunspace, setActiveRunspace] = useState<Runspace | null>(null);
  const [loadingRunspaces, setLoadingRunspaces] = useState(false);
  const [showProjectsManagement, setShowProjectsManagement] = useState(false);

  // Handle vision capture
  const handleVisionCapture = useCallback(
    async (visionData: any) => {
      // Save vision data
      setCapturedVision(visionData);

      // Capture vision in backend
      const visionText = `Mission: ${visionData.mission}\nGoals: ${visionData.goals.join(", ")}\nConstraints: ${visionData.constraints.join(", ")}\nMetrics: ${visionData.successMetrics.join(", ")}\nTimeframe: ${visionData.timeframe}`;
      await forge.vision.captureVision(visionText);

      // Fetch MCP suggestions
      setLoadingMcpSuggestions(true);
      try {
        const response = await fetch(
          `/api/mcp/suggestions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vision: visionData }),
          },
        );
        const result = await response.json();

        if (result.success) {
          setMcpSuggestions(result.data);
          setCurrentView("mcp-selection");
        } else {
          console.error("Failed to get MCP suggestions:", result.error);
          setCurrentView("dashboard");
        }
      } catch (error) {
        console.error("Error fetching MCP suggestions:", error);
        setCurrentView("dashboard");
      } finally {
        setLoadingMcpSuggestions(false);
      }
    },
    [forge.vision],
  );

  // Handle skip vision (for testing)
  const handleSkipVision = useCallback(() => {
    setVisionSkipped(true);
    setCurrentView("dashboard");
  }, []);

  // Handle MCP selection completion
  const handleMcpSelectionComplete = useCallback(
    async (selectedIds: string[]) => {
      console.log("Selected MCP servers:", selectedIds);

      try {
        // Send selected MCPs to backend for configuration
        const response = await fetch(
          `/api/mcp/configure`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedServers: selectedIds }),
          },
        );
        const result = await response.json();

        if (result.success) {
          console.log("MCP configuration generated:", result.data);
          // TODO: Trigger /[FRG]-init with MCP config
        }
      } catch (error) {
        console.error("Error configuring MCPs:", error);
      }

      // Navigate to dashboard
      setCurrentView("dashboard");
    },
    [],
  );

  // Handle MCP selection skip
  const handleMcpSkip = useCallback(() => {
    console.log("User skipped MCP selection");
    setCurrentView("dashboard");
  }, []);

  // Handle command execution
  const handleCommandExecution = useCallback(
    async (command: Command) => {
      return await forge.commandExecution.executeCommand(command);
    },
    [forge.commandExecution],
  );

  // Handle architecture decision approval
  const handleDecisionApproval = useCallback(
    async (decisionId: string) => {
      return await forge.architectureDecisions.approveDecision(decisionId);
    },
    [forge.architectureDecisions],
  );

  // Handle YOLO mode activation
  const handleYoloModeToggle = useCallback((active: boolean) => {
    if (active) {
      setEngagementMode("founder");
      setAutomationLevel("aggressive");
    } else {
      setEngagementMode("engineer");
      setAutomationLevel("conservative");
    }
  }, []);

  // Fetch runspaces on mount
  useEffect(() => {
    const fetchRunspaces = async () => {
      try {
        setLoadingRunspaces(true);
        const response = await fetch(`/api/runspaces`);
        const result = await response.json();

        if (result.success) {
          setRunspaces(result.data.runspaces || []);
          if (result.data.activeRunspaceId) {
            const active = result.data.runspaces.find(
              (r: Runspace) => r.id === result.data.activeRunspaceId,
            );
            setActiveRunspace(active || null);
          }
        }
      } catch (error) {
        console.error("Error fetching runspaces:", error);
      } finally {
        setLoadingRunspaces(false);
      }
    };

    fetchRunspaces();
  }, []);

  // Handle runspace switch
  const handleRunspaceSwitch = useCallback(async (runspaceId: string) => {
    try {
      const response = await fetch(
        `/api/runspaces/${runspaceId}/switch`,
        {
          method: "POST",
        },
      );
      const result = await response.json();

      if (result.success) {
        setActiveRunspace(result.data);
        // Refresh runspaces list
        const listResponse = await fetch(`/api/runspaces`);
        const listResult = await listResponse.json();
        if (listResult.success) {
          setRunspaces(listResult.data.runspaces || []);
        }
      }
    } catch (error) {
      console.error("Error switching runspace:", error);
    }
  }, []);

  // Handle new project creation
  const handleNewProject = useCallback(() => {
    // Navigate to vision capture for new project
    setCurrentView("vision-capture");
  }, []);

  // Handle manage projects
  const handleManageProjects = useCallback(() => {
    setShowProjectsManagement(true);
  }, []);

  // Runspace management handlers
  const handleRunspaceStart = useCallback(async (runspaceId: string) => {
    try {
      await apiClient.post(`/api/runspaces/${runspaceId}/start`, {});
      await loadRunspaces();
    } catch (error) {
      console.error("Failed to start runspace:", error);
    }
  }, []);

  const handleRunspaceStop = useCallback(async (runspaceId: string) => {
    try {
      await apiClient.post(`/api/runspaces/${runspaceId}/stop`, {});
      await loadRunspaces();
    } catch (error) {
      console.error("Failed to stop runspace:", error);
    }
  }, []);

  const handleRunspaceDelete = useCallback(async (runspaceId: string) => {
    try {
      await apiClient.delete(`/api/runspaces/${runspaceId}`, {});
      await loadRunspaces();
    } catch (error) {
      console.error("Failed to delete runspace:", error);
      throw error;
    }
  }, []);

  const loadRunspaces = useCallback(async () => {
    try {
      setLoadingRunspaces(true);
      const response = await apiClient.get("/api/runspaces");
      if (response.success && response.data) {
        setRunspaces(response.data.runspaces || []);
        if (response.data.activeRunspaceId) {
          const active = (response.data.runspaces || []).find(
            (r: Runspace) => r.id === response.data.activeRunspaceId,
          );
          setActiveRunspace(active || null);
        }
      }
    } catch (error) {
      console.error("Failed to load runspaces:", error);
    } finally {
      setLoadingRunspaces(false);
    }
  }, []);

  // Handle engagement mode changes
  const handleModeChange = useCallback(
    (mode: EngagementMode) => {
      setEngagementMode(mode);

      // Send mode change to backend
      forge.projectState.projectState &&
        apiClient.sendWSMessage("state.update", {
          engagementMode: mode,
        });
    },
    [forge.projectState.projectState],
  );

  // Architecture discussion handlers
  const architects: Architect[] = [
    {
      id: "lead-architect",
      name: "Lead Architect",
      role: "System Architecture & Integration",
      avatar: "🏛️",
      status: "available",
      expertise: ["system-design", "scalability", "integration"],
      currentFocus: "Analyzing system boundaries",
    },
    {
      id: "security-architect",
      name: "Security Architect",
      role: "Security & Compliance",
      avatar: "🔒",
      status: "available",
      expertise: ["security", "compliance", "encryption"],
      currentFocus: "Reviewing authentication flow",
    },
    {
      id: "data-architect",
      name: "Data Architect",
      role: "Data Flow & Storage",
      avatar: "💾",
      status: "busy",
      expertise: ["database", "caching", "data-flow"],
      currentFocus: "Optimizing query patterns",
    },
  ];

  // Show loading state
  if (forge.isLoading) {
    return <LoadingOverlay />;
  }

  // Get data from hooks with safe defaults
  const { vision, projectState, agentActivities } = forge;
  const visionData = vision.vision || {
    mission: "No vision defined yet",
    goals: [],
    constraints: [],
    successMetrics: [],
    timeframe: "Not set",
  };
  const currentProjectState = projectState.projectState || {
    phase: "planning" as const,
    progress: 0,
    blockers: [],
    recentDecisions: [],
    activeAgents: [],
    healthScore: 100,
  };
  const activities = agentActivities.activities || [];

  // Show vision capture if no real vision exists (empty or default message)
  const hasNoVision =
    !visionData.mission ||
    visionData.mission === "No vision defined yet" ||
    visionData.mission.trim() === "";

  if (hasNoVision && !visionSkipped && currentView !== "vision-capture") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Welcome to NXTG-Forge
          </h2>
          <p className="text-gray-400 mb-6">
            Let's start by capturing your vision for this project
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setCurrentView("vision-capture")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Capture Vision
            </button>
            <button
              onClick={handleSkipVision}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Skip for Now
            </button>
          </div>
        </div>
        <ErrorDisplay errors={forge.errors} />
      </div>
    );
  }

  return (
    <div
      data-testid="app-container"
      className="min-h-screen bg-black text-white"
    >
      {/* Navigation Header */}
      <header
        data-testid="app-header"
        className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NXTG-Forge
              </h1>

              {/* Project Switcher for multi-project support */}
              <ProjectSwitcher
                currentRunspace={activeRunspace}
                runspaces={runspaces}
                onSwitch={handleRunspaceSwitch}
                onNew={handleNewProject}
                onManage={handleManageProjects}
              />

              <nav className="flex space-x-4">
                {[
                  { id: "dashboard", label: "Dashboard", icon: "📊" },
                  { id: "vision-display", label: "Vision", icon: "🎯" },
                  { id: "infinity-terminal", label: "Terminal", icon: "♾️" },
                  { id: "command", label: "Command", icon: "⚡" },
                  { id: "architect", label: "Architect", icon: "🏛️" },
                  { id: "yolo", label: "YOLO", icon: "🚀" },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    data-testid={`app-nav-btn-${nav.id}`}
                    onClick={() => setCurrentView(nav.id as any)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === nav.id
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    <span className="mr-2">{nav.icon}</span>
                    {nav.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <div
                data-testid="app-connection-status"
                className="flex items-center space-x-2"
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    forge.isConnected ? "bg-green-500" : "bg-red-500"
                  } animate-pulse`}
                />
                <span className="text-sm text-gray-400">
                  {forge.isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {/* Mode Indicator */}
              <div className="px-3 py-1 bg-gray-800 rounded-full">
                <span className="text-xs text-gray-400">Mode: </span>
                <span className="text-xs font-semibold text-blue-400">
                  {engagementMode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vision Capture View */}
        {currentView === "vision-capture" && (
          <VisionCapture onVisionSubmit={handleVisionCapture} mode="initial" />
        )}

        {/* MCP Selection View */}
        {currentView === "mcp-selection" && mcpSuggestions && (
          <MCPSelectionView
            suggestions={mcpSuggestions}
            onSelectionComplete={handleMcpSelectionComplete}
            onSkip={handleMcpSkip}
          />
        )}

        {/* Loading MCP Suggestions */}
        {loadingMcpSuggestions && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Analyzing Your Project...
              </h2>
              <p className="text-gray-400">
                Our AI is selecting the perfect MCP servers for your vision
              </p>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {currentView === "dashboard" && (
          <ChiefOfStaffDashboard
            visionData={visionData}
            projectState={currentProjectState}
            agentActivity={activities}
            onModeChange={handleModeChange}
            currentMode={engagementMode}
          />
        )}

        {/* Vision Display View */}
        {currentView === "vision-display" && (
          <VisionDisplay
            vision={visionData}
            progress={{
              overallProgress: currentProjectState.progress,
              phase: currentProjectState.phase,
              daysElapsed: 0,
              estimatedDaysRemaining: 30,
              velocity: 1.0,
              blockers: (currentProjectState.blockers || []).length,
            }}
            isLocked={false}
            onVisionUpdate={forge.vision.updateVision}
          />
        )}

        {/* Command Center View */}
        {currentView === "command" && (
          <CommandCenter
            onCommandExecute={(commandId: string) => {
              console.log("Executing command:", commandId);
              // Handle command execution through forge integration
              handleCommandExecution({
                id: commandId,
                name: commandId,
                description: "",
                category: "forge",
                icon: null,
              } as Command);
            }}
            availableCommands={
              [
                {
                  id: "status",
                  name: "Status Report",
                  description: "Get current project status",
                  category: "forge",
                  icon: null,
                },
                {
                  id: "feature",
                  name: "New Feature",
                  description: "Start implementing a new feature",
                  category: "forge",
                  requiresConfirmation: true,
                  icon: null,
                },
                {
                  id: "test",
                  name: "Run Tests",
                  description: "Execute all test suites",
                  category: "test",
                  icon: null,
                },
                {
                  id: "deploy",
                  name: "Deploy",
                  description: "Deploy to production",
                  category: "deploy",
                  requiresConfirmation: true,
                  icon: null,
                },
                {
                  id: "analyze",
                  name: "Analyze Code",
                  description: "Run static code analysis",
                  category: "analyze",
                  icon: null,
                },
              ] as Command[]
            }
            projectContext={{
              name: "NXTG-Forge Project",
              phase: currentProjectState.phase,
              activeAgents: (currentProjectState.activeAgents || []).length,
              pendingTasks: 0,
              healthScore: currentProjectState.healthScore,
              lastActivity: new Date(),
            }}
            isExecuting={forge.commandExecution.executing || false}
          />
        )}

        {/* Architect Discussion View */}
        {currentView === "architect" && (
          <ArchitectDiscussion
            topic="System Architecture Design"
            participants={architects.map((a) => ({
              id: a.id,
              name: a.name,
              specialty: a.role,
              avatar: a.avatar,
              confidence: 85,
            }))}
            onDecision={(decision) => {
              console.log("Architecture decision made:", decision);
              // Handle the decision through forge integration
              forge.architectureDecisions.proposeDecision({
                ...decision,
                id: `decision-${Date.now()}`,
              });
            }}
            humanRole="observer"
          />
        )}

        {/* YOLO Mode View */}
        {currentView === "yolo" && (
          <YoloMode
            isActive={
              engagementMode === "founder" && automationLevel === "aggressive"
            }
            onToggle={handleYoloModeToggle}
            automationLevel={automationLevel}
            onAutomationLevelChange={setAutomationLevel}
            statistics={
              forge.yoloMode.statistics || {
                totalActions: 0,
                successRate: 0,
                averageTime: 0,
                savedHours: 0,
              }
            }
            recentActions={forge.yoloMode.history || []}
          />
        )}

        {/* Terminal View (Legacy) */}
        {currentView === "terminal" && <TerminalView />}

        {/* Infinity Terminal View (Persistent Sessions) */}
        {currentView === "infinity-terminal" && <InfinityTerminalView />}
      </main>

      {/* Error Display */}
      <ErrorDisplay errors={forge.errors} />

      {/* Real-time Activity Feed (floating) */}
      {(activities || []).length > 0 && currentView === "dashboard" && (
        <div className="fixed bottom-4 left-4 max-w-sm bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Live Activity
          </h4>
          <div className="space-y-2">
            {(activities || []).slice(0, 5).map((activity, idx) => (
              <div
                key={activity.id || idx}
                className="flex items-start space-x-2"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full mt-1 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs text-white">{activity.agent}</p>
                  <p className="text-xs text-gray-400">{activity.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Management Modal */}
      <ProjectsManagement
        isOpen={showProjectsManagement}
        onClose={() => setShowProjectsManagement(false)}
        runspaces={runspaces}
        activeRunspaceId={activeRunspace?.id || null}
        onRefresh={loadRunspaces}
        onSwitch={handleRunspaceSwitch}
        onStart={handleRunspaceStart}
        onStop={handleRunspaceStop}
        onDelete={handleRunspaceDelete}
      />
    </div>
  );
}

export default IntegratedApp;

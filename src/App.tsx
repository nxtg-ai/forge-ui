/**
 * NXTG-Forge Integrated Application
 * Full UI-Backend Integration with Real-time Updates
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import {
  BarChart3,
  Target,
  Infinity,
  Zap,
  Building2,
  Rocket,
  Shield,
  Database,
} from "lucide-react";
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
import { BetaFeedback, BetaBanner, Changelog } from "./components/feedback";
import TerminalView from "./pages/terminal-view";
import InfinityTerminalView from "./pages/infinity-terminal-view";

// Lazy load heavy pages for better initial load performance
const DashboardLive = lazy(() => import("./pages/dashboard-live"));
const VisionPage = lazy(() => import("./pages/vision-view"));
const ArchitectPage = lazy(() => import("./pages/architect-view"));
const ArchitectDemo = lazy(() => import("./pages/architect-demo"));
const CommandPage = lazy(() => import("./pages/command-view"));
const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));
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
import { apiFetch } from "./utils/api-fetch";
import type {
  EngagementMode,
  Architect,
  Command,
  AutomationLevel,
  AgentActivity,
  VisionData,
  ProjectState,
  YoloStatistics,
  AutomatedAction,
} from "./components/types";
import type { Runspace } from "./core/runspace";
import { EngagementProvider, useEngagement } from "./contexts/EngagementContext";
import { LayoutProvider, useLayout } from "./contexts/LayoutContext";
import { AppHeader } from "./components/layout";
import { logger } from "./utils/browser-logger";

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

// Lazy load fallback component
const LazyLoadFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-400">Loading page...</p>
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

// Note: AppHeaderStatus removed - now handled by unified AppHeader component

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
    | "architect-demo"
    | "command"
    | "vision-display"
    | "yolo"
    | "terminal"
    | "infinity-terminal"
    | "marketing"
  >("dashboard");
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(
    null,
  );
  const [visionSkipped, setVisionSkipped] = useState(false);
  const [capturedVision, setCapturedVision] = useState<VisionData | null>(null);
  const [mcpSuggestions, setMcpSuggestions] = useState<Record<string, unknown> | null>(null);
  const [loadingMcpSuggestions, setLoadingMcpSuggestions] = useState(false);

  // Runspace state for multi-project support
  const [runspaces, setRunspaces] = useState<Runspace[]>([]);
  const [activeRunspace, setActiveRunspace] = useState<Runspace | null>(null);
  const [loadingRunspaces, setLoadingRunspaces] = useState(false);
  const [showProjectsManagement, setShowProjectsManagement] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Handle vision capture
  const handleVisionCapture = useCallback(
    async (visionData: VisionData) => {
      // Save vision data
      setCapturedVision(visionData);

      // Capture vision in backend
      const visionText = `Mission: ${visionData.mission}\nGoals: ${visionData.goals.join(", ")}\nConstraints: ${visionData.constraints.join(", ")}\nMetrics: ${visionData.successMetrics.join(", ")}\nTimeframe: ${visionData.timeframe}`;
      await forge.vision.captureVision(visionText);

      // Fetch MCP suggestions
      setLoadingMcpSuggestions(true);
      try {
        const response = await apiFetch(
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
          logger.error("Failed to get MCP suggestions:", result.error);
          setCurrentView("dashboard");
        }
      } catch (error) {
        logger.error("Error fetching MCP suggestions:", error);
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
      logger.debug("Selected MCP servers:", selectedIds);

      try {
        // Send selected MCPs to backend for configuration
        const response = await apiFetch(
          `/api/mcp/configure`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedServers: selectedIds }),
          },
        );
        const result = await response.json();

        if (result.success) {
          logger.debug("MCP configuration generated:", result.data);
          // MCP config is written to .claude/mcp.json
          // User can run /[FRG]-init to complete setup
        }
      } catch (error) {
        logger.error("Error configuring MCPs:", error);
      }

      // Navigate to dashboard
      setCurrentView("dashboard");
    },
    [],
  );

  // Handle MCP selection skip
  const handleMcpSkip = useCallback(() => {
    logger.debug("User skipped MCP selection");
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

  // YOLO mode will be managed via EngagementContext now
  // This handler is kept for backward compatibility but will be removed
  const handleYoloModeToggle = useCallback((active: boolean) => {
    logger.warn("handleYoloModeToggle is deprecated. Use EngagementContext instead.");
  }, []);

  // Fetch runspaces on mount
  useEffect(() => {
    const fetchRunspaces = async () => {
      try {
        setLoadingRunspaces(true);
        const response = await apiFetch(`/api/runspaces`);
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
        logger.error("Error fetching runspaces:", error);
      } finally {
        setLoadingRunspaces(false);
      }
    };

    fetchRunspaces();
  }, []);

  // Handle runspace switch
  const handleRunspaceSwitch = useCallback(async (runspaceId: string) => {
    try {
      const response = await apiFetch(
        `/api/runspaces/${runspaceId}/switch`,
        {
          method: "POST",
        },
      );
      const result = await response.json();

      if (result.success) {
        setActiveRunspace(result.data);
        // Refresh runspaces list
        const listResponse = await apiFetch(`/api/runspaces`);
        const listResult = await listResponse.json();
        if (listResult.success) {
          setRunspaces(listResult.data.runspaces || []);
        }
      }
    } catch (error) {
      logger.error("Error switching runspace:", error);
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
      logger.error("Failed to start runspace:", error);
    }
  }, []);

  const handleRunspaceStop = useCallback(async (runspaceId: string) => {
    try {
      await apiClient.post(`/api/runspaces/${runspaceId}/stop`, {});
      await loadRunspaces();
    } catch (error) {
      logger.error("Failed to stop runspace:", error);
    }
  }, []);

  const handleRunspaceDelete = useCallback(async (runspaceId: string) => {
    try {
      await apiClient.delete(`/api/runspaces/${runspaceId}`, {});
      await loadRunspaces();
    } catch (error) {
      logger.error("Failed to delete runspace:", error);
      throw error;
    }
  }, []);

  const loadRunspaces = useCallback(async () => {
    try {
      setLoadingRunspaces(true);
      const response = await apiClient.get<{ runspaces: Runspace[]; activeRunspaceId?: string }>("/api/runspaces");
      if (response.success && response.data) {
        setRunspaces(response.data.runspaces || []);
        if (response.data.activeRunspaceId) {
          const active = (response.data.runspaces || []).find(
            (r) => r.id === response.data?.activeRunspaceId,
          );
          setActiveRunspace(active || null);
        }
      }
    } catch (error) {
      logger.error("Failed to load runspaces:", error);
    } finally {
      setLoadingRunspaces(false);
    }
  }, []);

  // Engagement mode changes now handled by EngagementContext
  const handleModeChange = useCallback(
    (mode: EngagementMode) => {
      // EngagementContext will handle this
      // This is just a bridge for components not yet using context
      logger.warn("handleModeChange called - consider using EngagementContext.setMode directly");
    },
    [],
  );

  // Architecture discussion handlers
  const architects: Architect[] = [
    {
      id: "lead-architect",
      name: "Lead Architect",
      role: "System Architecture & Integration",
      avatar: <Building2 className="w-5 h-5" />,
      status: "available",
      expertise: ["system-design", "scalability", "integration"],
      currentFocus: "Analyzing system boundaries",
    },
    {
      id: "security-architect",
      name: "Security Architect",
      role: "Security & Compliance",
      avatar: <Shield className="w-5 h-5" />,
      status: "available",
      expertise: ["security", "compliance", "encryption"],
      currentFocus: "Reviewing authentication flow",
    },
    {
      id: "data-architect",
      name: "Data Architect",
      role: "Data Flow & Storage",
      avatar: <Database className="w-5 h-5" />,
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
        <ErrorDisplay errors={forge.errors.filter((e): e is string => typeof e === 'string')} />
      </div>
    );
  }

  return (
    <LayoutProvider>
      <EngagementProvider
        onModeChange={(mode, automation) => {
          // Sync to backend when mode changes
          if (forge.projectState.projectState) {
            apiClient.sendWSMessage("state.update", {
              engagementMode: mode,
              automationLevel: automation,
            });
          }
        }}
      >
        <AppContent
        currentView={currentView}
        setCurrentView={(view: string) => setCurrentView(view as typeof currentView)}
        selectedArchitect={selectedArchitect}
        setSelectedArchitect={setSelectedArchitect}
        visionSkipped={visionSkipped}
        setVisionSkipped={setVisionSkipped}
        capturedVision={capturedVision}
        setCapturedVision={setCapturedVision}
        mcpSuggestions={mcpSuggestions}
        setMcpSuggestions={setMcpSuggestions}
        loadingMcpSuggestions={loadingMcpSuggestions}
        setLoadingMcpSuggestions={setLoadingMcpSuggestions}
        runspaces={runspaces}
        activeRunspace={activeRunspace}
        loadingRunspaces={loadingRunspaces}
        showProjectsManagement={showProjectsManagement}
        setShowProjectsManagement={setShowProjectsManagement}
        handleVisionCapture={handleVisionCapture}
        handleSkipVision={handleSkipVision}
        handleMcpSelectionComplete={handleMcpSelectionComplete}
        handleMcpSkip={handleMcpSkip}
        handleCommandExecution={handleCommandExecution}
        handleDecisionApproval={handleDecisionApproval}
        handleYoloModeToggle={handleYoloModeToggle}
        handleRunspaceSwitch={handleRunspaceSwitch}
        handleNewProject={handleNewProject}
        handleManageProjects={handleManageProjects}
        handleRunspaceStart={handleRunspaceStart}
        handleRunspaceStop={handleRunspaceStop}
        handleRunspaceDelete={handleRunspaceDelete}
        loadRunspaces={loadRunspaces}
        handleModeChange={handleModeChange}
        architects={architects}
        forge={forge}
        showChangelog={showChangelog}
        setShowChangelog={setShowChangelog}
        feedbackModalOpen={feedbackModalOpen}
        setFeedbackModalOpen={setFeedbackModalOpen}
        />
      </EngagementProvider>
    </LayoutProvider>
  );
}

// Props interface for AppContent
interface AppContentProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedArchitect: Architect | null;
  setSelectedArchitect: (architect: Architect | null) => void;
  visionSkipped: boolean;
  setVisionSkipped: (skipped: boolean) => void;
  capturedVision: VisionData | null;
  setCapturedVision: (vision: VisionData | null) => void;
  mcpSuggestions: Record<string, unknown> | null;
  setMcpSuggestions: (suggestions: Record<string, unknown> | null) => void;
  loadingMcpSuggestions: boolean;
  setLoadingMcpSuggestions: (loading: boolean) => void;
  runspaces: Runspace[];
  activeRunspace: Runspace | null;
  loadingRunspaces: boolean;
  showProjectsManagement: boolean;
  setShowProjectsManagement: (show: boolean) => void;
  handleVisionCapture: (vision: VisionData) => Promise<void>;
  handleSkipVision: () => void;
  handleMcpSelectionComplete: (selectedIds: string[]) => Promise<void>;
  handleMcpSkip: () => void;
  handleCommandExecution: (command: Command) => Promise<boolean>;
  handleDecisionApproval: (decisionId: string) => Promise<boolean>;
  handleYoloModeToggle: (active: boolean) => void;
  handleRunspaceSwitch: (runspaceId: string) => Promise<void>;
  handleNewProject: () => void;
  handleManageProjects: () => void;
  handleRunspaceStart: (runspaceId: string) => Promise<void>;
  handleRunspaceStop: (runspaceId: string) => Promise<void>;
  handleRunspaceDelete: (runspaceId: string) => Promise<void>;
  loadRunspaces: () => Promise<void>;
  handleModeChange: (mode: EngagementMode) => void;
  architects: Architect[];
  forge: ReturnType<typeof useForgeIntegration>;
  showChangelog: boolean;
  setShowChangelog: (show: boolean) => void;
  feedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
}

// Separate component to use EngagementContext
const AppContent: React.FC<AppContentProps> = (props) => {
  const {
    currentView,
    setCurrentView,
    handleRunspaceSwitch,
    handleNewProject,
    handleManageProjects,
    handleVisionCapture,
    handleSkipVision,
    handleMcpSelectionComplete,
    handleMcpSkip,
    handleCommandExecution,
    handleYoloModeToggle,
    handleModeChange,
    architects,
    forge,
    activeRunspace,
    runspaces,
    visionSkipped,
    capturedVision,
    mcpSuggestions,
    loadingMcpSuggestions,
    showProjectsManagement,
    handleRunspaceStart,
    handleRunspaceStop,
    handleRunspaceDelete,
    loadRunspaces,
    showChangelog,
    setShowChangelog,
    feedbackModalOpen,
    setFeedbackModalOpen,
  } = props;

  // Use engagement context
  const { mode: engagementMode, automationLevel, setAutomationLevel } = useEngagement();

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

  // Show vision capture if no real vision exists
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
        <ErrorDisplay errors={forge.errors.filter((e): e is string => typeof e === 'string')} />
      </div>
    );
  }

  return (
    <div
      data-testid="app-container"
      className="flex flex-col min-h-screen bg-black text-white"
    >
      {/* Beta Banner */}
      {currentView !== "marketing" && (
        <BetaBanner onFeedbackClick={() => setFeedbackModalOpen(true)} />
      )}

      {/* Unified Navigation Header - hidden on marketing view only */}
      {currentView !== "marketing" && (
        <AppHeader
          currentView={currentView}
          onNavigate={(viewId) => setCurrentView(viewId)}
          currentRunspace={activeRunspace}
          runspaces={runspaces}
          onRunspaceSwitch={handleRunspaceSwitch}
          onNewProject={handleNewProject}
          onManageProjects={handleManageProjects}
          showNavigation={true}
          showProjectSwitcher={true}
          showConnectionStatus={true}
          showEngagementSelector={true}
          isConnected={forge.isConnected}
        />
      )}

      {/* Main Content - constrained width for non-panel views */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
        ["infinity-terminal", "marketing", "dashboard", "vision-display", "command", "architect"].includes(currentView) ? "hidden" : ""
      }`}>
        {/* Vision Capture View */}
        {currentView === "vision-capture" && (
          <VisionCapture onVisionSubmit={handleVisionCapture} mode="initial" />
        )}

        {/* MCP Selection View */}
        {currentView === "mcp-selection" && mcpSuggestions && 'essential' in mcpSuggestions && (
          <MCPSelectionView
            suggestions={mcpSuggestions as unknown as import('./orchestration/mcp-suggestion-engine').MCPSuggestion}
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

        {/* Lazy-loaded non-panel pages */}
        <Suspense fallback={<LazyLoadFallback />}>
          {/* Architect Demo - For marketing videos */}
          {currentView === "architect-demo" && <ArchitectDemo />}

          {/* YOLO Mode View */}
          {currentView === "yolo" && (
            <YoloModeWithEngagement
              onToggle={handleYoloModeToggle}
              statistics={
                forge.yoloMode.statistics || {
                  actionsToday: 0,
                  successRate: 0,
                  timesSaved: 0,
                  issuesFixed: 0,
                  performanceGain: 0,
                  costSaved: 0,
                }
              }
              recentActions={forge.yoloMode.history || []}
            />
          )}
        </Suspense>

        {/* Terminal View (Legacy) */}
        {currentView === "terminal" && <TerminalView />}
      </main>

      {/* Full-width AppShell views - rendered outside constrained main */}
      <Suspense fallback={<LazyLoadFallback />}>
        {currentView === "dashboard" && <DashboardLive />}
        {currentView === "vision-display" && <VisionPage />}
        {currentView === "command" && <CommandPage />}
        {currentView === "architect" && <ArchitectPage />}
      </Suspense>

      {/* Infinity Terminal View - full-width with own AppShell */}
      {currentView === "infinity-terminal" && (
        <InfinityTerminalView onNavigate={(viewId) => setCurrentView(viewId)} />
      )}

      {/* Marketing Landing Page - full-width standalone layout */}
      {currentView === "marketing" && (
        <Suspense fallback={<LazyLoadFallback />}>
          <LandingPage />
        </Suspense>
      )}

      {/* Projects Management Modal */}
      <ProjectsManagement
        isOpen={showProjectsManagement}
        onClose={() => props.setShowProjectsManagement(false)}
        runspaces={runspaces}
        activeRunspaceId={activeRunspace?.id || null}
        onRefresh={loadRunspaces}
        onSwitch={handleRunspaceSwitch}
        onStart={handleRunspaceStart}
        onStop={handleRunspaceStop}
        onDelete={handleRunspaceDelete}
      />

      {/* Error Display */}
      <ErrorDisplay errors={forge.errors.filter((e): e is string => typeof e === 'string')} />

      {/* Beta Feedback Components */}
      {feedbackModalOpen && (
        <BetaFeedback onClose={() => setFeedbackModalOpen(false)} />
      )}
      <Changelog isOpen={showChangelog} onClose={() => setShowChangelog(false)} />

      {/* Floating Beta Feedback Button - only show when modal is closed */}
      {!feedbackModalOpen && currentView !== "infinity-terminal" && currentView !== "marketing" && (
        <BetaFeedback onClose={() => setFeedbackModalOpen(false)} />
      )}

      {/* Real-time Activity Feed (floating) */}
      {(activities || []).length > 0 && currentView === "dashboard" && (
        <div className="fixed bottom-4 left-4 max-w-sm bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Live Activity
          </h4>
          <div className="space-y-2">
            {(activities || []).slice(0, 5).map((activity: AgentActivity, idx: number) => (
              <div
                key={activity.agentId || idx}
                className="flex items-start space-x-2"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full mt-1 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs text-white">{activity.agentId}</p>
                  <p className="text-xs text-gray-400">{activity.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Dashboard wrapper that uses engagement context
const DashboardWithEngagement: React.FC<{
  visionData: import('./components/types').VisionData;
  projectState: ProjectState;
  agentActivity: AgentActivity[];
}> = ({ visionData, projectState, agentActivity }) => {
  const { mode, setMode } = useEngagement();

  // Convert VisionData goals to string[] if needed
  const normalizedVisionData: import('./components/types').VisionData = {
    ...visionData,
    goals: Array.isArray(visionData.goals)
      ? visionData.goals.map(g => typeof g === 'string' ? g : g.title)
      : [],
    successMetrics: Array.isArray(visionData.successMetrics)
      ? visionData.successMetrics.map(m => typeof m === 'string' ? m : m.name)
      : [],
  };

  return (
    <ChiefOfStaffDashboard
      visionData={normalizedVisionData as any}
      projectState={projectState}
      agentActivity={agentActivity}
      onModeChange={setMode}
      currentMode={mode}
    />
  );
};

// YOLO Mode wrapper that uses engagement context
const YoloModeWithEngagement: React.FC<{
  onToggle: (active: boolean) => void;
  statistics: YoloStatistics;
  recentActions: AutomatedAction[];
}> = ({ onToggle, statistics, recentActions }) => {
  const { mode, automationLevel, setMode, setAutomationLevel } = useEngagement();

  const isActive = mode === "founder" && automationLevel === "aggressive";

  const handleToggle = (active: boolean) => {
    if (active) {
      setMode("founder");
      setAutomationLevel("aggressive");
    } else {
      setMode("engineer");
      setAutomationLevel("conservative");
    }
    onToggle(active);
  };

  return (
    <YoloMode
      enabled={isActive}
      onToggle={handleToggle}
      automationLevel={automationLevel}
      onLevelChange={setAutomationLevel}
      statistics={statistics}
      recentActions={recentActions}
    />
  );
};

export default IntegratedApp;

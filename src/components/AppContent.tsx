import React, { Suspense, lazy } from "react";
import { MCPSelectionView } from "./onboarding/MCPSelectionView";
import { BetaFeedback, BetaBanner, Changelog } from "./feedback";
import TerminalView from "../pages/terminal-view";
import InfinityTerminalView from "../pages/infinity-terminal-view";
import { useEngagement } from "../contexts/EngagementContext";
import { AppHeader } from "./layout";
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
} from "./types";
import type { Runspace } from "../core/runspace";
import type { useForgeIntegration } from "../hooks/useForgeIntegration";
import { YoloModeWithEngagement } from "./AppWizard";

// Lazy load heavy pages for better initial load performance
const DashboardLive = lazy(() => import("../pages/dashboard-live"));
const VisionPage = lazy(() => import("../pages/vision-view"));
const ArchitectPage = lazy(() => import("../pages/architect-view"));
const ArchitectDemo = lazy(() => import("../pages/architect-demo"));
const CommandPage = lazy(() => import("../pages/command-view"));
const LandingPage = lazy(() => import("../pages/marketing/LandingPage"));
const VisionCapture = lazy(() => import("./VisionCapture").then(m => ({ default: m.VisionCapture })));
const ProjectsManagement = lazy(() => import("./ProjectsManagement").then(m => ({ default: m.ProjectsManagement })));

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
export const ErrorDisplay: React.FC<{ errors: string[] }> = ({ errors }) => {
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

// Props interface for AppContent
export interface AppContentProps {
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
export const AppContent: React.FC<AppContentProps> = (props) => {
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
  const { agentActivities } = forge;
  const activities = agentActivities.activities || [];

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
          <Suspense fallback={<LazyLoadFallback />}>
            <VisionCapture onVisionSubmit={handleVisionCapture} mode="initial" />
          </Suspense>
        )}

        {/* MCP Selection View */}
        {currentView === "mcp-selection" && mcpSuggestions && 'essential' in mcpSuggestions && (
          <MCPSelectionView
            suggestions={mcpSuggestions as unknown as import('../orchestration/mcp-suggestion-engine').MCPSuggestion}
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
      <Suspense fallback={null}>
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
      </Suspense>

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

/**
 * NXTG-Forge Integrated Application
 * Full UI-Backend Integration with Real-time Updates
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Shield,
  Database,
} from "lucide-react";
import {
  useForgeIntegration,
} from "./hooks/useForgeIntegration";
import { apiClient } from "./services/api-client";
import { apiFetch } from "./utils/api-fetch";
import type {
  EngagementMode,
  Architect,
  Command,
  VisionData,
} from "./components/types";
import type { Runspace } from "./core/runspace";
import { EngagementProvider } from "./contexts/EngagementContext";
import { LayoutProvider } from "./contexts/LayoutContext";
import { logger } from "./utils/browser-logger";
import { AppContent, ErrorDisplay } from "./components/AppContent";

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
  const { vision } = forge;
  const visionData = vision.vision || {
    mission: "No vision defined yet",
    goals: [],
    constraints: [],
    successMetrics: [],
    timeframe: "Not set",
  };

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

export default IntegratedApp;

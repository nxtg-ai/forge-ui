/**
 * NXTG-Forge Integrated Application
 * Full UI-Backend Integration with Real-time Updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  VisionCapture,
  ChiefOfStaffDashboard,
  ArchitectDiscussion,
  CommandCenter,
  VisionDisplay,
  YoloMode
} from './components';
import {
  useVision,
  useProjectState,
  useAgentActivities,
  useCommandExecution,
  useArchitectureDecisions,
  useYoloMode,
  useForgeIntegration
} from './hooks/useForgeIntegration';
import type {
  EngagementMode,
  Architect,
  Command,
  AutomationLevel
} from './components/types';

// Loading component
const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Connecting to Forge backend...' }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md">
      <div className="flex items-center space-x-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <div>
          <h3 className="text-lg font-semibold text-white">Initializing Forge</h3>
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
          <p key={idx} className="text-sm text-red-300/80">{error}</p>
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
    'vision-capture' | 'dashboard' | 'architect' | 'command' | 'vision-display' | 'yolo'
  >('dashboard');
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('guided');
  const [automationLevel, setAutomationLevel] = useState<AutomationLevel>('conservative');
  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null);

  // Handle vision capture
  const handleVisionCapture = useCallback(async (visionText: string) => {
    const success = await forge.vision.captureVision(visionText);
    if (success) {
      setCurrentView('dashboard');
    }
  }, [forge.vision]);

  // Handle command execution
  const handleCommandExecution = useCallback(async (command: Command) => {
    return await forge.commandExecution.executeCommand(command);
  }, [forge.commandExecution]);

  // Handle architecture decision approval
  const handleDecisionApproval = useCallback(async (decisionId: string) => {
    return await forge.architectureDecisions.approveDecision(decisionId);
  }, [forge.architectureDecisions]);

  // Handle YOLO mode activation
  const handleYoloModeToggle = useCallback((active: boolean) => {
    if (active) {
      setEngagementMode('autonomous');
      setAutomationLevel('aggressive');
    } else {
      setEngagementMode('guided');
      setAutomationLevel('conservative');
    }
  }, []);

  // Handle engagement mode changes
  const handleModeChange = useCallback((mode: EngagementMode) => {
    setEngagementMode(mode);

    // Send mode change to backend
    forge.projectState.projectState && apiClient.sendWSMessage('state.update', {
      engagementMode: mode
    });
  }, [forge.projectState.projectState]);

  // Architecture discussion handlers
  const architects: Architect[] = [
    {
      id: 'lead-architect',
      name: 'Lead Architect',
      role: 'System Architecture & Integration',
      avatar: '🏛️',
      status: 'available',
      expertise: ['system-design', 'scalability', 'integration'],
      currentFocus: 'Analyzing system boundaries'
    },
    {
      id: 'security-architect',
      name: 'Security Architect',
      role: 'Security & Compliance',
      avatar: '🔒',
      status: 'available',
      expertise: ['security', 'compliance', 'encryption'],
      currentFocus: 'Reviewing authentication flow'
    },
    {
      id: 'data-architect',
      name: 'Data Architect',
      role: 'Data Flow & Storage',
      avatar: '💾',
      status: 'busy',
      expertise: ['database', 'caching', 'data-flow'],
      currentFocus: 'Optimizing query patterns'
    }
  ];

  // Show loading state
  if (forge.isLoading) {
    return <LoadingOverlay />;
  }

  // Get data from hooks
  const { vision, projectState, agentActivities } = forge;
  const visionData = vision.vision;
  const currentProjectState = projectState.projectState;
  const activities = agentActivities.activities;

  // Show error state if no critical data
  if (!visionData || !currentProjectState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Forge Not Initialized
          </h2>
          <button
            onClick={() => setCurrentView('vision-capture')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Capture Vision to Start
          </button>
        </div>
        <ErrorDisplay errors={forge.errors} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NXTG-Forge
              </h1>
              <nav className="flex space-x-4">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { id: 'vision-display', label: 'Vision', icon: '🎯' },
                  { id: 'command', label: 'Command', icon: '⚡' },
                  { id: 'architect', label: 'Architect', icon: '🏛️' },
                  { id: 'yolo', label: 'YOLO', icon: '🚀' }
                ].map(nav => (
                  <button
                    key={nav.id}
                    onClick={() => setCurrentView(nav.id as any)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === nav.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
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
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  forge.isConnected ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`} />
                <span className="text-sm text-gray-400">
                  {forge.isConnected ? 'Connected' : 'Disconnected'}
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
        {currentView === 'vision-capture' && (
          <VisionCapture onVisionCapture={handleVisionCapture} />
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <ChiefOfStaffDashboard
            visionData={visionData}
            projectState={currentProjectState}
            agentActivity={activities}
            onModeChange={handleModeChange}
            currentMode={engagementMode}
          />
        )}

        {/* Vision Display View */}
        {currentView === 'vision-display' && (
          <VisionDisplay
            visionData={visionData}
            progress={{
              overall: currentProjectState.progress,
              phases: [
                { name: 'Planning', status: 'completed', progress: 100 },
                { name: 'Architecture', status: 'in-progress', progress: 75 },
                { name: 'Implementation', status: 'in-progress', progress: 45 },
                { name: 'Testing', status: 'pending', progress: 20 },
                { name: 'Deployment', status: 'pending', progress: 0 }
              ],
              timeline: {
                start: new Date(),
                estimated: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                milestones: []
              }
            }}
            isEditable={engagementMode === 'interactive'}
            onUpdate={forge.vision.updateVision}
          />
        )}

        {/* Command Center View */}
        {currentView === 'command' && (
          <CommandCenter
            commands={forge.commandExecution.history}
            suggestions={[]}
            onExecute={handleCommandExecution}
            isExecuting={forge.commandExecution.executing}
            projectContext={{
              phase: currentProjectState.phase,
              activeAgents: currentProjectState.activeAgents.length,
              recentActivity: activities.slice(0, 5).map(a => a.action).join(', '),
              healthScore: currentProjectState.healthScore,
              currentFocus: 'Integration and testing'
            }}
          />
        )}

        {/* Architect Discussion View */}
        {currentView === 'architect' && (
          <ArchitectDiscussion
            architects={architects}
            decisions={forge.architectureDecisions.decisions}
            onSelectArchitect={setSelectedArchitect}
            onProposeDecision={forge.architectureDecisions.proposeDecision}
            onApproveDecision={handleDecisionApproval}
            selectedArchitect={selectedArchitect}
          />
        )}

        {/* YOLO Mode View */}
        {currentView === 'yolo' && (
          <YoloMode
            isActive={engagementMode === 'autonomous' && automationLevel === 'aggressive'}
            onToggle={handleYoloModeToggle}
            automationLevel={automationLevel}
            onAutomationLevelChange={setAutomationLevel}
            statistics={forge.yoloMode.statistics || {
              totalActions: 0,
              successRate: 0,
              averageTime: 0,
              savedHours: 0
            }}
            recentActions={forge.yoloMode.history}
          />
        )}
      </main>

      {/* Error Display */}
      <ErrorDisplay errors={forge.errors} />

      {/* Real-time Activity Feed (floating) */}
      {activities.length > 0 && currentView === 'dashboard' && (
        <div className="fixed bottom-4 left-4 max-w-sm bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Live Activity</h4>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity, idx) => (
              <div key={activity.id || idx} className="flex items-start space-x-2">
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
    </div>
  );
}

export default IntegratedApp;
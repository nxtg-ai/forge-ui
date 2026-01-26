import React, { useState, useEffect } from 'react';
import {
  VisionCapture,
  ChiefOfStaffDashboard,
  ArchitectDiscussion,
  CommandCenter,
  VisionDisplay,
  YoloMode
} from './components';
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  EngagementMode,
  Architect,
  ArchitectureDecision,
  Command,
  ProjectContext,
  Goal,
  Metric,
  ProgressData,
  AutomationLevel,
  AutomatedAction,
  YoloStatistics
} from './components/types';

// Mock data for demonstration
const mockVisionData: VisionData = {
  mission: "Build a platform that eliminates developer burnout through intelligent automation",
  goals: [
    {
      id: '1',
      title: 'Reduce Cognitive Load',
      description: 'Implement AI-driven task management that reduces mental overhead by 80%',
      status: 'in-progress',
      progress: 65,
      dependencies: []
    },
    {
      id: '2',
      title: 'Accelerate Development',
      description: 'Achieve 3x development velocity through intelligent code generation',
      status: 'in-progress',
      progress: 40,
      dependencies: ['1']
    },
    {
      id: '3',
      title: 'Ensure Quality',
      description: 'Maintain 99% code quality through automated testing and review',
      status: 'pending',
      progress: 20,
      dependencies: ['2']
    }
  ] as Goal[],
  constraints: [
    'Must integrate with existing CI/CD pipelines',
    'Zero disruption to current workflows',
    'Enterprise-grade security required'
  ],
  successMetrics: [
    {
      id: '1',
      name: 'Dev Velocity',
      current: 2.1,
      target: 3,
      unit: 'x',
      trend: 'up'
    },
    {
      id: '2',
      name: 'Cognitive Load',
      current: 45,
      target: 20,
      unit: '%',
      trend: 'down'
    },
    {
      id: '3',
      name: 'Code Quality',
      current: 94,
      target: 99,
      unit: '%',
      trend: 'up'
    }
  ] as Metric[],
  timeframe: '2 weeks for MVP, 2 months for production',
  createdAt: new Date(),
  lastUpdated: new Date(),
  version: 1
};

const mockProjectState: ProjectState = {
  phase: 'building',
  progress: 42,
  blockers: [
    {
      id: '1',
      severity: 'high',
      title: 'Database migration pending approval',
      agent: 'DevOps Agent',
      needsHuman: true
    }
  ],
  recentDecisions: [
    {
      id: '1',
      type: 'architecture',
      title: 'Adopted microservices with event-driven communication',
      madeBy: 'Lead Architect',
      timestamp: new Date(),
      impact: 'high'
    }
  ],
  activeAgents: [
    {
      id: 'orchestrator',
      name: 'Chief Orchestrator',
      role: 'Coordination',
      status: 'working',
      currentTask: 'Managing team alignment and vision execution',
      confidence: 92
    },
    {
      id: 'architect',
      name: 'System Architect',
      role: 'Design',
      status: 'thinking',
      currentTask: 'Designing authentication system',
      confidence: 87
    },
    {
      id: 'developer',
      name: 'Code Builder',
      role: 'Implementation',
      status: 'working',
      currentTask: 'Implementing user service',
      confidence: 95
    }
  ],
  healthScore: 78
};

const mockCommands: Command[] = [
  {
    id: 'status',
    name: 'Project Status',
    description: 'View comprehensive project status',
    category: 'forge',
    hotkey: '⌘S',
    icon: '📊'
  },
  {
    id: 'feature',
    name: 'New Feature',
    description: 'Start implementing a new feature',
    category: 'forge',
    hotkey: '⌘N',
    icon: '✨'
  },
  {
    id: 'test',
    name: 'Run Tests',
    description: 'Execute test suite with coverage',
    category: 'test',
    icon: '🧪'
  },
  {
    id: 'deploy',
    name: 'Deploy',
    description: 'Deploy to staging or production',
    category: 'deploy',
    requiresConfirmation: true,
    icon: '🚀'
  }
];

const mockArchitects: Architect[] = [
  {
    id: 'lead',
    name: 'Lead Architect',
    specialty: 'System Design',
    avatar: 'LA',
    confidence: 92
  },
  {
    id: 'security',
    name: 'Security Architect',
    specialty: 'Security & Compliance',
    avatar: 'SA',
    confidence: 88
  },
  {
    id: 'data',
    name: 'Data Architect',
    specialty: 'Data & Storage',
    avatar: 'DA',
    confidence: 85
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<'onboarding' | 'dashboard' | 'discussion'>('dashboard');
  const [visionData, setVisionData] = useState<VisionData | null>(mockVisionData);
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('founder');
  const [yoloEnabled, setYoloEnabled] = useState(false);
  const [automationLevel, setAutomationLevel] = useState<AutomationLevel>('balanced');
  const [isExecuting, setIsExecuting] = useState(false);

  // Mock agent activities
  const mockActivities: AgentActivity[] = [
    {
      agentId: 'orchestrator',
      action: 'Analyzed project requirements and aligned team objectives',
      timestamp: new Date(),
      visibility: 'ceo'
    },
    {
      agentId: 'architect',
      action: 'Proposed microservices architecture with event-driven communication',
      timestamp: new Date(),
      visibility: 'vp'
    },
    {
      agentId: 'developer',
      action: 'Implemented UserService with full CRUD operations',
      timestamp: new Date(),
      visibility: 'engineer'
    },
    {
      agentId: 'qa',
      action: 'Generated 47 unit tests with 94% coverage',
      timestamp: new Date(),
      visibility: 'builder'
    }
  ];

  // Mock progress data
  const mockProgress: ProgressData = {
    overallProgress: 42,
    phase: 'Building',
    daysElapsed: 3,
    estimatedDaysRemaining: 11,
    velocity: 2.1,
    blockers: 1
  };

  // Mock YOLO statistics
  const mockYoloStats: YoloStatistics = {
    actionsToday: 23,
    successRate: 92,
    timesSaved: 147,
    issuesFixed: 18,
    performanceGain: 27,
    costSaved: 1250
  };

  // Mock automated actions
  const mockAutomatedActions: AutomatedAction[] = [
    {
      id: '1',
      type: 'fix',
      title: 'Fixed TypeScript compilation error',
      description: 'Resolved missing type definition in UserService',
      impact: 'low',
      status: 'completed',
      timestamp: new Date(),
      confidence: 98,
      automated: true
    },
    {
      id: '2',
      type: 'optimize',
      title: 'Optimized database queries',
      description: 'Added indexes and query optimization for 3x speed improvement',
      impact: 'high',
      status: 'completed',
      timestamp: new Date(),
      confidence: 94,
      automated: true
    },
    {
      id: '3',
      type: 'refactor',
      title: 'Refactored authentication module',
      description: 'Improved code structure and reduced complexity',
      impact: 'medium',
      status: 'executing',
      timestamp: new Date(),
      confidence: 87,
      automated: true
    }
  ];

  const handleVisionSubmit = (vision: VisionData) => {
    setVisionData(vision);
    setCurrentView('dashboard');
  };

  const handleCommandExecute = (command: string, args?: any) => {
    setIsExecuting(true);
    console.log(`Executing command: ${command}`, args);

    // Simulate command execution
    setTimeout(() => {
      setIsExecuting(false);

      // Handle specific commands
      if (command === 'discussion') {
        setCurrentView('discussion');
      }
    }, 2000);
  };

  const handleArchitectDecision = (decision: ArchitectureDecision) => {
    console.log('Architecture decision made:', decision);
    setCurrentView('dashboard');
  };

  // Show onboarding if no vision
  if (!visionData && currentView === 'onboarding') {
    return (
      <VisionCapture
        onVisionSubmit={handleVisionSubmit}
        mode="initial"
      />
    );
  }

  // Show architect discussion
  if (currentView === 'discussion') {
    return (
      <ArchitectDiscussion
        topic="Authentication System Architecture"
        participants={mockArchitects}
        onDecision={handleArchitectDecision}
        humanRole={engagementMode === 'founder' ? 'arbiter' : 'observer'}
      />
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gray-950">
      <ChiefOfStaffDashboard
        visionData={visionData!}
        projectState={mockProjectState}
        agentActivity={mockActivities}
        onModeChange={setEngagementMode}
        currentMode={engagementMode}
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Vision Display */}
        <VisionDisplay
          vision={visionData!}
          progress={mockProgress}
          compactMode={engagementMode === 'ceo'}
        />

        {/* YOLO Mode Control */}
        <YoloMode
          enabled={yoloEnabled}
          onToggle={setYoloEnabled}
          automationLevel={automationLevel}
          onLevelChange={setAutomationLevel}
          recentActions={mockAutomatedActions}
          statistics={mockYoloStats}
        />

        {/* Example Buttons for Testing */}
        <div className="flex gap-4 p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
          <button
            onClick={() => setCurrentView('onboarding')}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white transition-all"
          >
            Update Vision
          </button>
          <button
            onClick={() => setCurrentView('discussion')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-all"
          >
            View Discussion
          </button>
          <button
            onClick={() => handleCommandExecute('status')}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white transition-all"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Command Center (floating) */}
      <CommandCenter
        onCommandExecute={handleCommandExecute}
        availableCommands={mockCommands}
        projectContext={{
          name: 'NXTG-Forge',
          phase: mockProjectState.phase,
          activeAgents: mockProjectState.activeAgents.length,
          pendingTasks: 12,
          healthScore: mockProjectState.healthScore,
          lastActivity: new Date()
        }}
        isExecuting={isExecuting}
      />
    </div>
  );
}
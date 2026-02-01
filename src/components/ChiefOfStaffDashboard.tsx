import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Users,
  Target,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  MessageSquare,
  GitBranch,
  Shield,
  Sparkles,
  Command,
  ChevronRight,
  BarChart3,
  Eye,
  EyeOff,
  Cpu,
  Database,
  Network,
  Terminal,
  Code2,
  Layers,
} from "lucide-react";
import { ProgressBar } from "./ui/ProgressBar";

interface DashboardProps {
  visionData: VisionData;
  projectState: ProjectState;
  agentActivity: AgentActivity[];
  onModeChange: (mode: EngagementMode) => void;
  currentMode: EngagementMode;
}

interface VisionData {
  mission: string;
  goals: string[];
  constraints: string[];
  successMetrics: string[];
  timeframe: string;
}

interface ProjectState {
  phase: "planning" | "architecting" | "building" | "testing" | "deploying";
  progress: number;
  blockers: Blocker[];
  recentDecisions: Decision[];
  activeAgents: Agent[];
  healthScore: number;
}

interface Blocker {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  agent: string;
  needsHuman: boolean;
}

interface Decision {
  id: string;
  type: "architecture" | "implementation" | "deployment";
  title: string;
  madeBy: string;
  timestamp: Date;
  impact: "high" | "medium" | "low";
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "idle" | "thinking" | "working" | "blocked" | "discussing";
  currentTask: string;
  confidence: number;
}

interface AgentActivity {
  agentId: string;
  action: string;
  timestamp: Date;
  visibility: "ceo" | "vp" | "engineer" | "builder" | "founder";
}

type EngagementMode = "ceo" | "vp" | "engineer" | "builder" | "founder";

export const ChiefOfStaffDashboard: React.FC<DashboardProps> = ({
  visionData,
  projectState,
  agentActivity,
  onModeChange,
  currentMode,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [autoMode, setAutoMode] = useState(true);

  // Filter activities based on current engagement mode
  const visibleActivities = agentActivity.filter((activity) => {
    const visibilityLevels: Record<EngagementMode, EngagementMode[]> = {
      ceo: ["ceo"],
      vp: ["ceo", "vp"],
      engineer: ["ceo", "vp", "engineer"],
      builder: ["ceo", "vp", "engineer", "builder"],
      founder: ["ceo", "vp", "engineer", "builder", "founder"],
    };
    return visibilityLevels[currentMode].includes(activity.visibility);
  });

  const modeConfig: Record<
    EngagementMode,
    { label: string; icon: React.ReactNode; color: string; description: string }
  > = {
    ceo: {
      label: "CEO",
      icon: <Target className="w-4 h-4" />,
      color: "purple",
      description: "High-level progress only",
    },
    vp: {
      label: "VP",
      icon: <BarChart3 className="w-4 h-4" />,
      color: "blue",
      description: "Strategic oversight",
    },
    engineer: {
      label: "Engineer",
      icon: <Code2 className="w-4 h-4" />,
      color: "green",
      description: "Technical details",
    },
    builder: {
      label: "Builder",
      icon: <Terminal className="w-4 h-4" />,
      color: "orange",
      description: "Implementation focus",
    },
    founder: {
      label: "Founder",
      icon: <Brain className="w-4 h-4" />,
      color: "red",
      description: "Complete visibility",
    },
  };

  const phaseProgress = {
    planning: 20,
    architecting: 40,
    building: 60,
    testing: 80,
    deploying: 100,
  };

  const getHealthColor = (score: number) => {
    if (score >= 80)
      return "text-green-400 bg-green-500/10 border-green-500/20";
    if (score >= 60)
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const getAgentStatusColor = (status: Agent["status"]) => {
    const colors = {
      idle: "bg-gray-500",
      thinking: "bg-yellow-500",
      working: "bg-green-500",
      blocked: "bg-red-500",
      discussing: "bg-blue-500",
    };
    return colors[status];
  };

  return (
    <div
      className="min-h-screen bg-gray-950 text-gray-100"
      data-testid="dashboard-container"
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Vision Reminder Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20"
          data-testid="dashboard-vision-card"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2
                className="text-lg font-semibold mb-2 text-purple-100"
                data-testid="dashboard-mission-title"
              >
                Mission
              </h2>
              <p
                className="text-gray-300 mb-4"
                data-testid="dashboard-mission-text"
              >
                {visionData.mission}
              </p>

              {(currentMode === "founder" || currentMode === "ceo") && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Timeframe:</span>
                    <span className="ml-2 text-gray-300">
                      {visionData.timeframe}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Goals:</span>
                    <span className="ml-2 text-gray-300">
                      {visionData.goals.length} defined
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Metrics:</span>
                    <span className="ml-2 text-gray-300">
                      {visionData.successMetrics.length} tracked
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Project Progress */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            data-testid="dashboard-progress-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-lg font-semibold flex items-center gap-2"
                data-testid="dashboard-progress-title"
              >
                <Activity className="w-5 h-5 text-blue-400" />
                Project Progress
              </h3>
              <div
                className="text-2xl font-bold text-blue-400"
                data-testid="dashboard-progress-value"
              >
                {projectState.progress}%
              </div>
            </div>

            {/* Phase Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {Object.entries(phaseProgress).map(([phase, progress]) => (
                  <div
                    key={phase}
                    className={`
                      text-xs font-medium capitalize
                      ${projectState.phase === phase ? "text-blue-400" : "text-gray-500"}
                    `}
                  >
                    {phase}
                  </div>
                ))}
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${phaseProgress[projectState.phase] ?? 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Active Agents */}
            {currentMode !== "ceo" && (
              <div className="space-y-3" data-testid="dashboard-active-agents">
                <h4
                  className="text-sm font-medium text-gray-400"
                  data-testid="dashboard-agents-title"
                >
                  Active Agents
                </h4>
                {(projectState.activeAgents || []).map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 cursor-pointer transition-all"
                    data-testid={`dashboard-agent-card-${agent.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${getAgentStatusColor(agent.status)} animate-pulse`}
                      />
                      <div>
                        <div className="font-medium text-sm">{agent.name}</div>
                        <div className="text-xs text-gray-500">
                          {agent.currentTask}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">
                        {agent.confidence}% confident
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Health & Blockers */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Health Score */}
            <div
              className={`p-6 rounded-2xl border ${getHealthColor(projectState.healthScore)}`}
              data-testid="dashboard-health-card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  data-testid="dashboard-health-title"
                >
                  System Health
                </h3>
                <Shield className="w-5 h-5" />
              </div>
              <div
                className="text-4xl font-bold mb-2"
                data-testid="dashboard-health-score"
              >
                {projectState.healthScore}%
              </div>
              <div className="text-sm opacity-75">
                {projectState.healthScore >= 80
                  ? "All systems optimal"
                  : projectState.healthScore >= 60
                    ? "Minor issues detected"
                    : "Attention required"}
              </div>
            </div>

            {/* Blockers */}
            {(projectState.blockers || []).length > 0 && (
              <div
                className="p-6 rounded-2xl bg-red-900/10 border border-red-500/20"
                data-testid="dashboard-blockers-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-lg font-semibold text-red-400"
                    data-testid="dashboard-blockers-title"
                  >
                    Blockers
                  </h3>
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div
                  className="space-y-2"
                  data-testid="dashboard-blockers-list"
                >
                  {(projectState.blockers || [])
                    .slice(0, currentMode === "ceo" ? 1 : 3)
                    .map((blocker) => (
                      <div
                        key={blocker.id}
                        className="p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                        data-testid={`dashboard-blocker-${blocker.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              {blocker.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {blocker.agent} • {blocker.severity}
                            </div>
                          </div>
                          {blocker.needsHuman && (
                            <div className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                              Needs input
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Activity Stream (varies by mode) */}
        {currentMode !== "ceo" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            data-testid="dashboard-activity-stream"
          >
            <div className="flex items-center justify-between mb-6">
              <h3
                className="text-lg font-semibold flex items-center gap-2"
                data-testid="dashboard-activity-title"
              >
                <MessageSquare className="w-5 h-5 text-green-400" />
                Agent Activity
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-1"
                data-testid="dashboard-toggle-details-btn"
              >
                {showDetails ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showDetails ? "Hide" : "Show"} Details
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {visibleActivities
                  .slice(0, showDetails ? undefined : 5)
                  .map((activity, idx) => (
                    <motion.div
                      key={`${activity.agentId}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-900 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium text-blue-400">
                            {activity.agentId}
                          </span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-gray-300">
                            {activity.action}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Recent Decisions (for VP and above) */}
        {(currentMode === "vp" || currentMode === "founder") &&
          (projectState.recentDecisions || []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 p-6 rounded-2xl bg-gray-900/50 border border-gray-800"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-purple-400" />
                Recent Strategic Decisions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(projectState.recentDecisions || [])
                  .slice(0, 4)
                  .map((decision) => (
                    <div
                      key={decision.id}
                      className="p-4 rounded-xl bg-gray-900 border border-gray-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${
                        decision.type === "architecture"
                          ? "bg-purple-500/20 text-purple-400"
                          : decision.type === "implementation"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                      }
                    `}
                        >
                          {decision.type}
                        </div>
                        <div
                          className={`
                      text-xs
                      ${
                        decision.impact === "high"
                          ? "text-red-400"
                          : decision.impact === "medium"
                            ? "text-yellow-400"
                            : "text-gray-400"
                      }
                    `}
                        >
                          {decision.impact} impact
                        </div>
                      </div>
                      <h4 className="font-medium mb-1">{decision.title}</h4>
                      <div className="text-xs text-gray-500">
                        by {decision.madeBy} •{" "}
                        {new Date(decision.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
      </div>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-800 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getAgentStatusColor(selectedAgent.status)}`}
                  />
                  <h2 className="text-2xl font-bold">{selectedAgent.name}</h2>
                  <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                    {selectedAgent.role}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Current Task</div>
                  <div className="p-3 rounded-lg bg-gray-800">
                    {selectedAgent.currentTask}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className="capitalize">{selectedAgent.status}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Confidence Level
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={selectedAgent.confidence}
                      max={100}
                      className="flex-1 h-2"
                      fillColor="bg-gradient-to-r from-blue-500 to-green-500"
                      animated={false}
                    />
                    <span className="text-sm font-medium">
                      {selectedAgent.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

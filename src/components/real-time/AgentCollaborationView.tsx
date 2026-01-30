import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Brain,
  Zap,
  Shield,
  MessageSquare,
  GitBranch,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Network,
  Cpu,
  Database,
  Cloud,
  Terminal,
  Code2,
} from "lucide-react";
import { ProgressBar } from "../ui/ProgressBar";

interface Agent {
  id: string;
  name: string;
  role: "architect" | "developer" | "qa" | "devops" | "orchestrator";
  status: "idle" | "thinking" | "working" | "blocked" | "discussing";
  currentTask?: string;
  confidence: number;
  collaboratingWith: string[];
  messagesInQueue: number;
  lastActivity: Date;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

interface CollaborationEdge {
  from: string;
  to: string;
  type: "data" | "decision" | "review" | "handoff";
  isActive: boolean;
  strength: number;
}

interface AgentCollaborationViewProps {
  agents: Agent[];
  edges: CollaborationEdge[];
  onAgentClick?: (agent: Agent) => void;
  viewMode?: "network" | "list" | "metrics";
}

export const AgentCollaborationView: React.FC<AgentCollaborationViewProps> = ({
  agents,
  edges,
  onAgentClick,
  viewMode = "network",
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set());

  // Simulate typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const workingAgents = agents.filter(
        (a) => a.status === "thinking" || a.status === "discussing",
      );
      setTypingAgents(new Set(workingAgents.map((a) => a.id)));
    }, 1000);

    return () => clearInterval(interval);
  }, [agents]);

  const roleConfig = {
    architect: {
      color: "from-purple-500 to-indigo-500",
      icon: <Brain className="w-5 h-5 text-white" />,
      position: { x: 200, y: 100 },
    },
    developer: {
      color: "from-blue-500 to-cyan-500",
      icon: <Code2 className="w-5 h-5 text-white" />,
      position: { x: 100, y: 200 },
    },
    qa: {
      color: "from-green-500 to-emerald-500",
      icon: <Shield className="w-5 h-5 text-white" />,
      position: { x: 300, y: 200 },
    },
    devops: {
      color: "from-orange-500 to-red-500",
      icon: <Cloud className="w-5 h-5 text-white" />,
      position: { x: 150, y: 300 },
    },
    orchestrator: {
      color: "from-yellow-500 to-amber-500",
      icon: <Network className="w-5 h-5 text-white" />,
      position: { x: 200, y: 200 },
    },
  };

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "idle":
        return "bg-gray-500";
      case "thinking":
        return "bg-yellow-500";
      case "working":
        return "bg-green-500";
      case "blocked":
        return "bg-red-500";
      case "discussing":
        return "bg-blue-500";
    }
  };

  // Calculate agent positions in network view
  const agentPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 250;
    const centerY = 250;
    const radius = 150;

    agents.forEach((agent, index) => {
      if (agent.role === "orchestrator") {
        positions[agent.id] = { x: centerX, y: centerY };
      } else {
        const angle = (index * 2 * Math.PI) / (agents.length - 1);
        positions[agent.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      }
    });

    return positions;
  }, [agents]);

  const renderNetworkView = () => (
    <div
      data-testid="agent-collab-network-view"
      className="relative w-full h-[500px] bg-gray-900/30 rounded-2xl border border-gray-800 overflow-hidden"
    >
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#1f2937"
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Collaboration edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="edge-gradient-active">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="edge-gradient-inactive">
            <stop offset="0%" stopColor="#6B7280" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6B7280" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {edges.map((edge, index) => {
          const fromPos = agentPositions[edge.from];
          const toPos = agentPositions[edge.to];
          if (!fromPos || !toPos) return null;

          return (
            <g
              key={`${edge.from}-${edge.to}-${index}`}
              data-testid={`agent-collab-edge-${edge.from}-${edge.to}`}
            >
              <motion.line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={
                  edge.isActive
                    ? "url(#edge-gradient-active)"
                    : "url(#edge-gradient-inactive)"
                }
                strokeWidth={edge.isActive ? 2 : 1}
                strokeDasharray={edge.type === "handoff" ? "5,5" : "0"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: edge.isActive ? 1 : 0.3,
                }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />

              {/* Animated particles for active connections */}
              {edge.isActive && (
                <motion.circle
                  r="3"
                  fill="#3B82F6"
                  initial={{ offsetDistance: "0%" }}
                  animate={{ offsetDistance: "100%" }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    path={`M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`}
                  />
                </motion.circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Agent nodes */}
      {agents.map((agent, index) => {
        const position = agentPositions[agent.id];
        const config = roleConfig[agent.role];
        const isSelected = selectedAgent === agent.id;
        const isHovered = hoveredAgent === agent.id;
        const isTyping = typingAgents.has(agent.id);

        return (
          <motion.div
            key={agent.id}
            data-testid={`agent-collab-node-${agent.id}`}
            className="absolute cursor-pointer"
            style={
              {
                "--agent-x": `${position.x - 30}px`,
                "--agent-y": `${position.y - 30}px`,
                left: "var(--agent-x)",
                top: "var(--agent-y)",
              } as React.CSSProperties
            }
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, type: "spring" }}
            onMouseEnter={() => setHoveredAgent(agent.id)}
            onMouseLeave={() => setHoveredAgent(null)}
            onClick={() => {
              setSelectedAgent(agent.id);
              onAgentClick?.(agent);
            }}
          >
            {/* Pulse effect for active agents */}
            {agent.status === "working" && (
              <motion.div
                className="absolute -inset-4 rounded-full bg-green-500/20"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            )}

            {/* Selection ring */}
            {isSelected && (
              <motion.div
                className="absolute -inset-2 rounded-full border-2 border-blue-400"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              />
            )}

            {/* Agent avatar */}
            <motion.div
              className={`
                relative w-14 h-14 rounded-full bg-gradient-to-br ${config.color}
                flex items-center justify-center shadow-lg
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {config.icon}

              {/* Status indicator */}
              <div
                className={`
                absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-950
                ${getStatusColor(agent.status)}
                ${agent.status !== "idle" ? "animate-pulse" : ""}
              `}
              />

              {/* Message queue badge */}
              {agent.messagesInQueue > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {agent.messagesInQueue}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Typing indicator */}
            {isTyping && (
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-0.5 px-2 py-1 bg-gray-800 rounded-full">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      animate={{
                        y: [0, -4, 0],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hover tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div className="px-3 py-2 bg-gray-900 rounded-lg border border-gray-700 shadow-xl whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-100">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-400">{agent.role}</div>
                    {agent.currentTask && (
                      <div className="text-xs text-blue-400 mt-1">
                        {agent.currentTask}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-xs text-gray-500">Confidence:</div>
                      <ProgressBar
                        value={agent.confidence}
                        max={100}
                        className="flex-1 h-1"
                        bgColor="bg-gray-700"
                        fillColor={
                          agent.confidence >= 80
                            ? "bg-green-500"
                            : agent.confidence >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }
                        animated={false}
                      />
                      <span className="text-xs text-gray-400">
                        {agent.confidence}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Central metrics */}
      <div className="absolute top-4 left-4 px-3 py-2 bg-gray-900/90 rounded-lg border border-gray-800">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-400">Active:</span>
            <span className="text-gray-200 font-medium">
              {agents.filter((a) => a.status === "working").length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-gray-400">Thinking:</span>
            <span className="text-gray-200 font-medium">
              {agents.filter((a) => a.status === "thinking").length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">Blocked:</span>
            <span className="text-gray-200 font-medium">
              {agents.filter((a) => a.status === "blocked").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div data-testid="agent-collab-list-view" className="space-y-2">
      {agents.map((agent, index) => (
        <motion.div
          key={agent.id}
          data-testid={`agent-collab-list-item-${agent.id}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onAgentClick?.(agent)}
          className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`
                w-10 h-10 rounded-lg bg-gradient-to-br ${roleConfig[agent.role].color}
                flex items-center justify-center
              `}
              >
                {roleConfig[agent.role].icon}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <div
                    className={`
                    w-2 h-2 rounded-full ${getStatusColor(agent.status)}
                    ${agent.status !== "idle" ? "animate-pulse" : ""}
                  `}
                  />
                  <span className="text-xs text-gray-500 capitalize">
                    {agent.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {agent.currentTask || "No active task"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Collaborators */}
              {agent.collaboratingWith.length > 0 && (
                <div className="flex -space-x-2">
                  {agent.collaboratingWith.slice(0, 3).map((id, i) => {
                    const collaborator = agents.find((a) => a.id === id);
                    if (!collaborator) return null;
                    return (
                      <div
                        key={i}
                        className={`
                          w-6 h-6 rounded-full bg-gradient-to-br ${roleConfig[collaborator.role].color}
                          border-2 border-gray-900 flex items-center justify-center
                        `}
                        title={collaborator.name}
                      >
                        <span className="text-xs text-white font-bold">
                          {collaborator.name[0]}
                        </span>
                      </div>
                    );
                  })}
                  {agent.collaboratingWith.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center">
                      <span className="text-xs text-gray-400">
                        +{agent.collaboratingWith.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Confidence meter */}
              <div className="flex items-center gap-2">
                <ProgressBar
                  value={agent.confidence}
                  max={100}
                  className="w-24 h-1.5"
                  fillColor={
                    agent.confidence >= 80
                      ? "bg-green-500"
                      : agent.confidence >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }
                  animated={false}
                />
                <span className="text-xs text-gray-500">
                  {agent.confidence}%
                </span>
              </div>

              {/* Performance indicators */}
              <div className="flex items-center gap-3 text-xs">
                <div className="text-center">
                  <div className="text-gray-400">Tasks</div>
                  <div className="font-medium">
                    {agent.performance.tasksCompleted}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Success</div>
                  <div className="font-medium">
                    {agent.performance.successRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div data-testid="agent-collab-container" className="space-y-4">
      {viewMode === "network" && renderNetworkView()}
      {viewMode === "list" && renderListView()}
    </div>
  );
};

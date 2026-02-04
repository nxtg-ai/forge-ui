/**
 * Architect Demo Page - Marketing/Demo Version
 * Simulated AI discussion for showcasing capabilities
 *
 * This is the DEMO version kept for marketing videos.
 * For real architecture decisions, use architect-view.tsx
 *
 * Features:
 * - Simulated multi-agent architecture discussion
 * - Auto-typing effect for AI responses
 * - Visual demonstration of consensus building
 * - Perfect for demos and marketing materials
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../components/ui/SafeAnimatePresence";
import {
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCode,
  GitBranch,
  Database,
  Cloud,
  Shield,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ChevronRight,
  Clock,
  ArrowRight,
  Layers,
  Package,
  Settings,
  Building2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ProgressBar } from "../components/ui/ProgressBar";

// ============= Types =============

interface Architect {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  confidence: number;
}

interface Message {
  id: string;
  architectId: string;
  content: string;
  type: "proposal" | "concern" | "agreement" | "question" | "decision";
  timestamp: Date;
  attachments?: Attachment[];
}

interface Attachment {
  type: "diagram" | "code" | "reference";
  title: string;
  content: string;
}

interface ArchitectureDecision {
  approach: string;
  rationale: string;
  tradeoffs: string[];
  consensus: number;
  signedOffBy: string[];
}

// ============= Demo Configuration =============

const DEMO_ARCHITECTS: Architect[] = [
  {
    id: "sys-arch",
    name: "System Architect",
    specialty: "Distributed Systems",
    avatar: "SA",
    confidence: 92,
  },
  {
    id: "sec-arch",
    name: "Security Architect",
    specialty: "Security & Compliance",
    avatar: "SC",
    confidence: 88,
  },
  {
    id: "data-arch",
    name: "Data Architect",
    specialty: "Data Flow & Storage",
    avatar: "DA",
    confidence: 85,
  },
  {
    id: "cloud-arch",
    name: "Cloud Architect",
    specialty: "Infrastructure & DevOps",
    avatar: "CA",
    confidence: 90,
  },
];

const DEMO_DISCUSSION_SCRIPT: Omit<Message, "id" | "timestamp">[] = [
  {
    architectId: "sys-arch",
    content: "I've analyzed the requirements for the Order Management System. Based on our constraints, I propose an event-driven microservices architecture with CQRS pattern for the core domain.",
    type: "proposal",
    attachments: [
      { type: "diagram", title: "System Architecture", content: "architecture-v1.svg" },
    ],
  },
  {
    architectId: "sec-arch",
    content: "I have security concerns about event propagation. We need to ensure events are encrypted in transit and at rest. Have we considered using mutual TLS for service-to-service communication?",
    type: "concern",
  },
  {
    architectId: "data-arch",
    content: "The CQRS approach aligns well with our read-heavy workload. I suggest we use PostgreSQL for the command side and Elasticsearch for the query side. This gives us ACID transactions where needed and fast search capabilities.",
    type: "agreement",
    attachments: [
      { type: "code", title: "Event Store Schema", content: "CREATE TABLE events..." },
    ],
  },
  {
    architectId: "cloud-arch",
    content: "From an infrastructure perspective, I recommend Kubernetes for orchestration with Istio service mesh. This gives us automatic mTLS, observability, and traffic management out of the box.",
    type: "agreement",
  },
  {
    architectId: "sec-arch",
    content: "The Istio service mesh addresses my mTLS concerns. I approve this approach with the addition of OPA policies for fine-grained authorization.",
    type: "agreement",
  },
  {
    architectId: "sys-arch",
    content: "Excellent consensus! Let me summarize the agreed approach...",
    type: "decision",
  },
];

const DEMO_DECISION: ArchitectureDecision = {
  approach: "Event-Driven Microservices with CQRS on Kubernetes/Istio",
  rationale: "Balances immediate delivery with future scalability while maintaining security and observability requirements",
  tradeoffs: [
    "Higher initial complexity vs. long-term flexibility",
    "Eventual consistency vs. immediate consistency",
    "Team learning curve vs. industry best practices",
    "Infrastructure cost vs. operational benefits",
  ],
  consensus: 94,
  signedOffBy: ["System Architect", "Security Architect", "Data Architect", "Cloud Architect"],
};

// ============= Demo Component =============

const ArchitectDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<
    "idle" | "analysis" | "discussion" | "consensus" | "signoff"
  >("idle");
  const [decision, setDecision] = useState<ArchitectureDecision | null>(null);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [humanRole] = useState<"observer" | "participant" | "arbiter">("observer");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = async (message: Omit<Message, "id" | "timestamp">) => {
    setIsTyping(message.architectId);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(null);
    scrollToBottom();
  };

  const runDemo = async () => {
    if (isRunning) return;

    // Reset state
    setMessages([]);
    setDecision(null);
    setCurrentMessageIndex(0);
    setIsRunning(true);
    setCurrentPhase("analysis");

    // Play through the script
    for (let i = 0; i < DEMO_DISCUSSION_SCRIPT.length; i++) {
      if (i >= DEMO_DISCUSSION_SCRIPT.length) break;

      const script = DEMO_DISCUSSION_SCRIPT[i];
      setCurrentMessageIndex(i);

      // Update phase based on progress
      if (i === 0) setCurrentPhase("analysis");
      else if (i < 3) setCurrentPhase("discussion");
      else if (i < 5) setCurrentPhase("consensus");
      else setCurrentPhase("signoff");

      await addMessage(script);
      await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    }

    // Show final decision
    setDecision(DEMO_DECISION);
    setCurrentPhase("signoff");
    setIsRunning(false);
  };

  const resetDemo = () => {
    setMessages([]);
    setDecision(null);
    setCurrentPhase("idle");
    setCurrentMessageIndex(0);
    setIsRunning(false);
    setIsTyping(null);
  };

  const phaseIndicators = [
    { phase: "analysis", label: "Analysis", icon: <Brain className="w-4 h-4" /> },
    { phase: "discussion", label: "Discussion", icon: <MessageSquare className="w-4 h-4" /> },
    { phase: "consensus", label: "Consensus", icon: <Users className="w-4 h-4" /> },
    { phase: "signoff", label: "Sign-off", icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const getMessageIcon = (type: Message["type"]) => {
    const icons = {
      proposal: <FileCode className="w-4 h-4 text-blue-400" />,
      concern: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
      agreement: <ThumbsUp className="w-4 h-4 text-green-400" />,
      question: <MessageSquare className="w-4 h-4 text-purple-400" />,
      decision: <CheckCircle className="w-4 h-4 text-green-400" />,
    };
    return icons[type];
  };

  return (
    <div
      data-testid="architect-demo-container"
      className="min-h-screen bg-gray-950 text-gray-100 p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          data-testid="architect-demo-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Architecture Discussion Demo
                </h1>
              </div>
              <p className="text-gray-400">
                Watch AI architects collaborate on system design decisions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isRunning && currentPhase === "idle" && (
                <button
                  onClick={runDemo}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500
                             text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
                  data-testid="demo-start-btn"
                >
                  <Play className="w-5 h-5" />
                  Start Demo
                </button>
              )}
              {(isRunning || currentPhase !== "idle") && (
                <button
                  onClick={resetDemo}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300
                             flex items-center gap-2 hover:bg-gray-700 transition-all"
                  data-testid="demo-reset-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
              <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <div className="text-sm font-medium text-purple-300">
                  Demo Mode
                </div>
              </div>
            </div>
          </div>

          {/* Phase Progress */}
          {currentPhase !== "idle" && (
            <div className="flex items-center justify-between mb-8">
              {phaseIndicators.map((indicator, idx) => (
                <div key={indicator.phase} className="flex items-center flex-1">
                  <div
                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${
                      currentPhase === indicator.phase
                        ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                        : phaseIndicators.findIndex((p) => p.phase === currentPhase) > idx
                          ? "text-green-400"
                          : "text-gray-600"
                    }
                  `}
                  >
                    {indicator.icon}
                    <span className="text-sm font-medium">{indicator.label}</span>
                  </div>
                  {idx < phaseIndicators.length - 1 && (
                    <ArrowRight
                      className={`
                      w-4 h-4 mx-2
                      ${
                        phaseIndicators.findIndex((p) => p.phase === currentPhase) > idx
                          ? "text-green-400"
                          : "text-gray-700"
                      }
                    `}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Idle State */}
        {currentPhase === "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-300 mb-3">
              AI Architecture Discussion Demo
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto mb-6">
              Watch as four AI architects collaborate to design a distributed system.
              They analyze requirements, discuss tradeoffs, and reach consensus
              on the best approach.
            </p>
            <button
              onClick={runDemo}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500
                         text-white font-semibold text-lg flex items-center gap-3 mx-auto
                         hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
            >
              <Play className="w-6 h-6" />
              Watch the Demo
            </button>
          </motion.div>
        )}

        {/* Active Discussion */}
        {currentPhase !== "idle" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Participants Panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  AI Architects
                </h3>
                <div className="space-y-3">
                  {DEMO_ARCHITECTS.map((architect) => (
                    <div
                      key={architect.id}
                      className={`
                        p-3 rounded-xl border transition-all
                        ${isTyping === architect.id
                          ? "bg-purple-500/10 border-purple-500/30"
                          : "bg-gray-900 border-gray-800"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {architect.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{architect.name}</div>
                          <div className="text-xs text-gray-500">{architect.specialty}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <ProgressBar
                          value={architect.confidence}
                          max={100}
                          className="flex-1 h-1"
                          fillColor="bg-gradient-to-r from-blue-500 to-green-500"
                          animated={false}
                        />
                        <span className="text-gray-400">{architect.confidence}%</span>
                      </div>
                      {isTyping === architect.id && (
                        <div className="mt-2 text-xs text-purple-400 italic flex items-center gap-1">
                          <span className="animate-pulse">Analyzing...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Discussion Thread */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3"
            >
              <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">Discussion Thread</h3>

                <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 pr-2">
                  <AnimatePresence>
                    {messages.map((message, idx) => {
                      const architect = DEMO_ARCHITECTS.find((p) => p.id === message.architectId);

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {architect?.avatar}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{architect?.name}</span>
                              {getMessageIcon(message.type)}
                              <span className="text-xs text-gray-500">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-gray-300 text-sm">{message.content}</div>

                            {message.attachments && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {message.attachments.map((attachment, aidx) => (
                                  <div
                                    key={aidx}
                                    className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs flex items-center gap-1"
                                  >
                                    {attachment.type === "diagram" && <Layers className="w-3 h-3" />}
                                    {attachment.type === "code" && <FileCode className="w-3 h-3" />}
                                    {attachment.type === "reference" && <GitBranch className="w-3 h-3" />}
                                    {attachment.title}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>
                      {DEMO_ARCHITECTS.find((a) => a.id === isTyping)?.name} is thinking...
                    </span>
                  </div>
                )}
              </div>

              {/* Decision Summary */}
              {decision && currentPhase === "signoff" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Architecture Decision Reached
                    </h3>
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                      {decision.consensus}% Consensus
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Approach</div>
                      <div className="font-medium text-lg">{decision.approach}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-1">Rationale</div>
                      <div className="text-gray-300">{decision.rationale}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-1">Trade-offs</div>
                      <ul className="space-y-1">
                        {decision.tradeoffs.map((tradeoff, idx) => (
                          <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-gray-600">-</span>
                            {tradeoff}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-2">Signed off by</div>
                      <div className="flex flex-wrap gap-2">
                        {decision.signedOffBy.map((name) => (
                          <div
                            key={name}
                            className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-all"
                        data-testid="demo-proceed-btn"
                      >
                        Proceed with Implementation
                      </button>
                      <button
                        onClick={runDemo}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-all flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Replay Demo
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-gray-500 text-sm"
        >
          <p>
            This is a demonstration of NXTG-Forge's AI architecture decision capabilities.
            <br />
            For real architecture decisions, use the live Architect page.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ArchitectDemo;

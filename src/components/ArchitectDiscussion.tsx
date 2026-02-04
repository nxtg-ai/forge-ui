import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "./ui/SafeAnimatePresence";
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
} from "lucide-react";
import { ProgressBar } from "./ui/ProgressBar";

interface ArchitectDiscussionProps {
  topic: string;
  participants: Architect[];
  onDecision: (decision: ArchitectureDecision) => void;
  humanRole: "observer" | "participant" | "arbiter";
}

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

export const ArchitectDiscussion: React.FC<ArchitectDiscussionProps> = ({
  topic,
  participants,
  onDecision,
  humanRole,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<
    "analysis" | "discussion" | "consensus" | "signoff"
  >("analysis");
  const [decision, setDecision] = useState<ArchitectureDecision | null>(null);
  const [humanInput, setHumanInput] = useState("");
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Simulate architect discussion
  useEffect(() => {
    const simulateDiscussion = async () => {
      // Phase 1: Analysis
      await addMessage({
        id: "1",
        architectId: participants[0].id,
        content: `I've analyzed the requirements for ${topic}. Based on our constraints, I propose a microservices architecture with event-driven communication.`,
        type: "proposal",
        timestamp: new Date(),
        attachments: [
          {
            type: "diagram",
            title: "System Architecture",
            content: "microservices-diagram.svg",
          },
        ],
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await addMessage({
        id: "2",
        architectId: participants[1].id,
        content:
          "I have concerns about the operational complexity. Have we considered a modular monolith first? We can extract services later.",
        type: "concern",
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      setCurrentPhase("discussion");

      await addMessage({
        id: "3",
        architectId: participants[2].id,
        content:
          "The event-driven approach aligns with our scalability requirements. I suggest using CQRS with event sourcing for the critical domains.",
        type: "agreement",
        timestamp: new Date(),
        attachments: [
          {
            type: "code",
            title: "Event Store Interface",
            content: "interface EventStore { ... }",
          },
        ],
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      setCurrentPhase("consensus");

      // Build consensus
      const finalDecision: ArchitectureDecision = {
        approach: "Hybrid: Modular monolith with extraction-ready boundaries",
        rationale: "Balances immediate delivery with future scalability",
        tradeoffs: [
          "Higher initial complexity vs. long-term flexibility",
          "Performance overhead vs. maintainability",
          "Team learning curve vs. industry best practices",
        ],
        consensus: 87,
        signedOffBy: participants.map((p) => p.name),
      };

      setDecision(finalDecision);
      setCurrentPhase("signoff");
    };

    simulateDiscussion();
  }, [participants, topic]);

  const addMessage = async (message: Message) => {
    setIsTyping(message.architectId);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMessages((prev) => [...prev, message]);
    setIsTyping(null);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleHumanInput = () => {
    if (humanInput.trim() && humanRole === "participant") {
      addMessage({
        id: `human-${Date.now()}`,
        architectId: "human",
        content: humanInput,
        type: "question",
        timestamp: new Date(),
      });
      setHumanInput("");
    }
  };

  const phaseIndicators = [
    {
      phase: "analysis",
      label: "Analysis",
      icon: <Brain className="w-4 h-4" />,
    },
    {
      phase: "discussion",
      label: "Discussion",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      phase: "consensus",
      label: "Consensus",
      icon: <Users className="w-4 h-4" />,
    },
    {
      phase: "signoff",
      label: "Sign-off",
      icon: <CheckCircle className="w-4 h-4" />,
    },
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
      data-testid="architect-discussion-container"
      className="min-h-screen bg-gray-950 text-gray-100 p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          data-testid="architect-discussion-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Architecture Discussion
              </h1>
              <p className="text-gray-400">{topic}</p>
            </div>
            {humanRole === "arbiter" && (
              <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <div className="text-sm font-medium text-purple-300">
                  You have final say
                </div>
              </div>
            )}
          </div>

          {/* Phase Progress */}
          <div className="flex items-center justify-between mb-8">
            {phaseIndicators.map((indicator, idx) => (
              <div key={indicator.phase} className="flex items-center flex-1">
                <div
                  className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                  ${
                    currentPhase === indicator.phase
                      ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                      : phaseIndicators.findIndex(
                            (p) => p.phase === currentPhase,
                          ) > idx
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
                      phaseIndicators.findIndex(
                        (p) => p.phase === currentPhase,
                      ) > idx
                        ? "text-green-400"
                        : "text-gray-700"
                    }
                  `}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

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
                Architects
              </h3>
              <div
                data-testid="architect-discussion-participants"
                className="space-y-3"
              >
                {participants.map((architect) => (
                  <div
                    key={architect.id}
                    data-testid={`architect-discussion-participant-${architect.id}`}
                    className="p-3 rounded-xl bg-gray-900 border border-gray-800"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {architect.avatar}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {architect.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {architect.specialty}
                        </div>
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
                      <span className="text-gray-400">
                        {architect.confidence}%
                      </span>
                    </div>
                    {isTyping === architect.id && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Thinking...
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

              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                <AnimatePresence>
                  {messages.map((message, idx) => {
                    const architect =
                      message.architectId === "human"
                        ? { name: "You", avatar: "H" }
                        : participants.find(
                            (p) => p.id === message.architectId,
                          );

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {architect?.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {architect?.name}
                            </span>
                            {getMessageIcon(message.type)}
                            <span className="text-xs text-gray-500">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-gray-300 text-sm">
                            {message.content}
                          </div>

                          {message.attachments && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {message.attachments.map((attachment, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs flex items-center gap-1"
                                >
                                  {attachment.type === "diagram" && (
                                    <Layers className="w-3 h-3" />
                                  )}
                                  {attachment.type === "code" && (
                                    <FileCode className="w-3 h-3" />
                                  )}
                                  {attachment.type === "reference" && (
                                    <GitBranch className="w-3 h-3" />
                                  )}
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

              {/* Human Input (if participant) */}
              {humanRole === "participant" && (
                <div className="flex gap-2 pt-4 border-t border-gray-800">
                  <input
                    data-testid="architect-discussion-message-input"
                    type="text"
                    value={humanInput}
                    onChange={(e) => setHumanInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleHumanInput()}
                    placeholder="Add your thoughts..."
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    data-testid="architect-discussion-send-btn"
                    onClick={handleHumanInput}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-all"
                  >
                    Send
                  </button>
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
                    Architecture Decision
                  </h3>
                  <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                    {decision.consensus}% Consensus
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Approach</div>
                    <div className="font-medium">{decision.approach}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-1">Rationale</div>
                    <div className="text-gray-300">{decision.rationale}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-1">Trade-offs</div>
                    <ul className="space-y-1">
                      {decision.tradeoffs.map((tradeoff, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-300 flex items-start gap-2"
                        >
                          <span className="text-gray-600">•</span>
                          {tradeoff}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">
                      Signed off by
                    </div>
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
                      data-testid="architect-discussion-approve-btn"
                      onClick={() => onDecision(decision)}
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-all"
                    >
                      Proceed with Implementation
                    </button>
                    {humanRole === "arbiter" && (
                      <button
                        data-testid="architect-discussion-revise-btn"
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-all"
                      >
                        Request Revision
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

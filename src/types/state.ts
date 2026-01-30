/**
 * State Management Type Definitions
 * System state and context schemas
 */

import { z } from "zod";
import { CanonicalVisionSchema } from "./vision";

// Task status
export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  BLOCKED = "blocked",
  CANCELLED = "cancelled",
}

// Task schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.nativeEnum(TaskStatus),
  assignedAgent: z.string().optional(),
  dependencies: z.array(z.string()),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedDuration: z.number().optional(), // minutes
  actualDuration: z.number().optional(), // minutes
  priority: z.number().min(1).max(10),
  artifacts: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Agent state schema
export const AgentStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["idle", "busy", "blocked", "error", "offline"]),
  currentTask: z.string().optional(),
  taskQueue: z.array(z.string()),
  capabilities: z.array(z.string()),
  performance: z.object({
    tasksCompleted: z.number(),
    averageDuration: z.number(),
    successRate: z.number(),
    lastActive: z.date(),
  }),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Conversation context schema
export const ConversationContextSchema = z.object({
  sessionId: z.string(),
  startedAt: z.date(),
  lastInteraction: z.date(),
  messageCount: z.number(),
  currentTopic: z.string().optional(),
  userRole: z.enum(["ceo", "vp", "engineer", "builder", "founder"]).optional(),
  recentMessages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.date(),
    }),
  ),
  contextTags: z.array(z.string()),
});

// Progress graph node
export const ProgressNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["goal", "milestone", "task", "subtask"]),
  title: z.string(),
  status: z.nativeEnum(TaskStatus),
  progress: z.number().min(0).max(100),
  dependencies: z.array(z.string()),
  children: z.array(z.string()),
});

// System state schema
export const SystemStateSchema = z.object({
  version: z.string(),
  timestamp: z.date(),
  vision: CanonicalVisionSchema,
  currentTasks: z.array(TaskSchema),
  agentStates: z.record(z.string(), AgentStateSchema),
  conversationContext: ConversationContextSchema,
  progressGraph: z.array(ProgressNodeSchema),
  metadata: z.object({
    sessionId: z.string(),
    environment: z.string(),
    gitBranch: z.string().optional(),
    gitCommit: z.string().optional(),
    projectPath: z.string(),
    currentPhase: z.string().optional(),
  }),
});

// Context node for graph
export const ContextNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["vision", "goal", "feature", "task", "artifact"]),
  title: z.string(),
  data: z.any(),
});

// Context edge for graph
export const ContextEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(["implements", "depends-on", "blocks", "relates-to"]),
  weight: z.number().optional(),
});

// Context graph schema
export const ContextGraphSchema = z.object({
  nodes: z.array(ContextNodeSchema),
  edges: z.array(ContextEdgeSchema),
});

// Situation report schema
export const SituationReportSchema = z.object({
  timestamp: z.date(),
  summary: z.string(),
  activeGoals: z.array(z.string()),
  tasksInProgress: z.number(),
  tasksCompleted: z.number(),
  blockingIssues: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      impact: z.enum(["low", "medium", "high"]),
      suggestedAction: z.string(),
    }),
  ),
  nextActions: z.array(z.string()),
  estimatedCompletion: z.date().optional(),
});

// Task checkpoint schema for progress tracking
export const TaskCheckpointSchema = z.object({
  taskId: z.string(),
  timestamp: z.date(),
  progress: z.number().min(0).max(100),
  artifacts: z.object({
    filesCreated: z.array(z.string()),
    filesModified: z.array(z.string()),
    commandsRun: z.array(z.string()),
  }),
  nextAction: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
});

// Checkpoint state schema
export const CheckpointStateSchema = z.object({
  checkpoints: z.map(z.string(), TaskCheckpointSchema),
  lastCheckpoint: z.date().nullable(),
});

// Type exports
export type Task = z.infer<typeof TaskSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
export type ConversationContext = z.infer<typeof ConversationContextSchema>;
export type ProgressNode = z.infer<typeof ProgressNodeSchema>;
export type SystemState = z.infer<typeof SystemStateSchema>;
export type ContextNode = z.infer<typeof ContextNodeSchema>;
export type ContextEdge = z.infer<typeof ContextEdgeSchema>;
export type ContextGraph = z.infer<typeof ContextGraphSchema>;
export type SituationReport = z.infer<typeof SituationReportSchema>;
export type TaskCheckpoint = z.infer<typeof TaskCheckpointSchema>;
export type CheckpointState = z.infer<typeof CheckpointStateSchema>;

// Context path for navigation
export interface ContextPath {
  path: string[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
  }>;
}

// State metadata
export interface StateMetadata {
  version: string;
  savedAt: Date;
  savedBy: string;
  checksum: string;
  compressed: boolean;
  sizeBytes: number;
}

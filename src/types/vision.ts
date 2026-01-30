/**
 * Vision Type Definitions
 * Canonical vision management schemas for NXTG-Forge
 */

import { z } from "zod";

// Engagement modes for different user personas
export type EngagementMode = "ceo" | "vp" | "engineer" | "builder" | "founder";

// Priority levels for strategic goals
export enum Priority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

// Strategic goal schema
export const StrategicGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.nativeEnum(Priority),
  deadline: z.date().optional(),
  metrics: z.array(z.string()),
  status: z.enum(["not-started", "in-progress", "completed", "blocked"]),
  progress: z.number().min(0).max(100),
});

// Canonical vision schema
export const CanonicalVisionSchema = z.object({
  version: z.string(),
  created: z.date(),
  updated: z.date(),
  mission: z.string(),
  principles: z.array(z.string()),
  strategicGoals: z.array(StrategicGoalSchema),
  currentFocus: z.string(),
  successMetrics: z.record(z.string(), z.union([z.string(), z.number()])),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Vision event for event sourcing
export const VisionEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  type: z.enum([
    "created",
    "updated",
    "goal-added",
    "goal-completed",
    "focus-changed",
  ]),
  actor: z.string(),
  data: z.any(),
  previousVersion: z.string().optional(),
  newVersion: z.string(),
});

// Alignment check result
export const AlignmentResultSchema = z.object({
  aligned: z.boolean(),
  score: z.number().min(0).max(1),
  violations: z.array(
    z.object({
      principle: z.string(),
      reason: z.string(),
      severity: z.enum(["minor", "major", "critical"]),
    }),
  ),
  suggestions: z.array(z.string()),
});

// Decision schema for alignment checking
export const DecisionSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
  alternatives: z.array(z.string()).optional(),
});

// Type exports
export type StrategicGoal = z.infer<typeof StrategicGoalSchema>;
export type CanonicalVision = z.infer<typeof CanonicalVisionSchema>;
export type VisionEvent = z.infer<typeof VisionEventSchema>;
export type AlignmentResult = z.infer<typeof AlignmentResultSchema>;
export type Decision = z.infer<typeof DecisionSchema>;

// Vision update payload
export interface VisionUpdate {
  mission?: string;
  principles?: string[];
  strategicGoals?: StrategicGoal[];
  currentFocus?: string;
  successMetrics?: Record<string, string | number>;
}

// Vision propagation result
export interface PropagationResult {
  success: boolean;
  agentsNotified: string[];
  failures: Array<{
    agentId: string;
    error: string;
  }>;
}

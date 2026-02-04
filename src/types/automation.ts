/**
 * Automation Type Definitions
 * YOLO mode and automation framework schemas
 */

import { z } from "zod";

// Automation levels
export enum AutomationLevel {
  CONSERVATIVE = 1, // Ask before doing
  BALANCED = 2, // Ask for major, auto minor
  AGGRESSIVE = 3, // Auto most, notify after
  MAXIMUM = 4, // Proactive anticipation
}

// Action types
export enum ActionType {
  CREATE_FILE = "create-file",
  UPDATE_FILE = "update-file",
  DELETE_FILE = "delete-file",
  RUN_COMMAND = "run-command",
  GIT_COMMIT = "git-commit",
  GIT_PUSH = "git-push",
  INSTALL_DEPENDENCY = "install-dependency",
  RUN_TEST = "run-test",
  DEPLOY = "deploy",
  REFACTOR = "refactor",
}

// Risk levels for actions
export enum RiskLevel {
  LOW = "low", // Safe, reversible
  MEDIUM = "medium", // Potentially impactful
  HIGH = "high", // Destructive or irreversible
  CRITICAL = "critical", // System-wide impact
}

// Action schema
export const ActionSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ActionType),
  description: z.string(),
  risk: z.nativeEnum(RiskLevel),
  parameters: z.record(z.string(), z.any()),
  requiresApproval: z.boolean(),
  reversible: z.boolean(),
  rollbackAction: z.string().optional(),
  estimatedDuration: z.number(), // milliseconds
  confidence: z.number().min(0).max(1),
});

// Automation result schema
export const AutomationResultSchema = z.object({
  actionId: z.string(),
  success: z.boolean(),
  executed: z.boolean(),
  skipped: z.boolean(),
  requiresHumanIntervention: z.boolean(),
  result: z.any().optional(),
  error: z.string().optional(),
  duration: z.number(),
  confidence: z.number(),
  rollbackAvailable: z.boolean(),
});

// Correction schema for learning
export const CorrectionSchema = z.object({
  actionId: z.string(),
  originalAction: ActionSchema,
  correctedAction: ActionSchema.optional(),
  reason: z.string(),
  shouldHaveExecuted: z.boolean(),
  timestamp: z.date(),
});

// Automation statistics
export const AutomationStatsSchema = z.object({
  totalActions: z.number(),
  autoExecuted: z.number(),
  skipped: z.number(),
  requiresApproval: z.number(),
  successful: z.number(),
  failed: z.number(),
  rolledBack: z.number(),
  averageConfidence: z.number(),
  averageDuration: z.number(),
  byType: z.record(
    z.nativeEnum(ActionType),
    z.object({
      count: z.number(),
      successRate: z.number(),
      averageDuration: z.number(),
    }),
  ),
  byRisk: z.record(
    z.nativeEnum(RiskLevel),
    z.object({
      count: z.number(),
      autoApprovalRate: z.number(),
    }),
  ),
});

// Confidence thresholds
export const ConfidenceThresholdsSchema = z.object({
  autoExecute: z.number().min(0).max(1),
  askHuman: z.number().min(0).max(1),
  skip: z.number().min(0).max(1),
});

// Automation policy
export const AutomationPolicySchema = z.object({
  level: z.nativeEnum(AutomationLevel),
  thresholds: ConfidenceThresholdsSchema,
  allowedActions: z.array(z.nativeEnum(ActionType)),
  blockedActions: z.array(z.nativeEnum(ActionType)),
  maxRisk: z.nativeEnum(RiskLevel),
  requireApprovalFor: z.array(z.nativeEnum(ActionType)),
  learningEnabled: z.boolean(),
  proactiveMode: z.boolean(),
});

// Learning model entry
export const LearningEntrySchema = z.object({
  id: z.string(),
  context: z.string(),
  action: ActionSchema,
  outcome: z.enum(["success", "failure", "corrected"]),
  correction: CorrectionSchema.optional(),
  confidence: z.number(),
  timestamp: z.date(),
});

// Type exports
export type Action = z.infer<typeof ActionSchema>;
export type AutomationResult = z.infer<typeof AutomationResultSchema>;
export type Correction = z.infer<typeof CorrectionSchema>;
export type AutomationStats = z.infer<typeof AutomationStatsSchema>;
export type ConfidenceThresholds = z.infer<typeof ConfidenceThresholdsSchema>;
export type AutomationPolicy = z.infer<typeof AutomationPolicySchema>;
export type LearningEntry = z.infer<typeof LearningEntrySchema>;

// Rollback context
export interface RollbackContext {
  actionId: string;
  originalState: Record<string, unknown>;
  changedFiles: string[];
  commands: string[];
  timestamp: Date;
}

// Automation decision
export interface AutomationDecision {
  shouldExecute: boolean;
  confidence: number;
  reason: string;
  requiresApproval: boolean;
  alternatives?: Action[];
}

// Proactive suggestion
export interface ProactiveSuggestion {
  id: string;
  context: string;
  suggestedAction: Action;
  rationale: string;
  confidence: number;
  benefits: string[];
  risks: string[];
}

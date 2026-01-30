/**
 * Approval System Types
 *
 * Real approval queue to replace fake approvals in coordination.ts
 * MVP: In-memory queue, basic approve/reject/list API
 * Future: Persistence, WebSocket notifications, timeout handling
 */

import { z } from "zod";

/**
 * Impact level of a decision
 */
export enum DecisionImpact {
  LOW = "low", // Code formatting, linting, minor fixes
  MEDIUM = "medium", // New features, refactoring, API changes
  HIGH = "high", // Architecture changes, breaking changes, deployments
  CRITICAL = "critical", // Production deployments, data migrations, security
}

/**
 * Risk level of a decision
 */
export enum DecisionRisk {
  LOW = "low", // Easily reversible, well-tested
  MEDIUM = "medium", // Some risk, but rollback possible
  HIGH = "high", // Hard to reverse, needs careful review
  CRITICAL = "critical", // Irreversible or cascading impact
}

/**
 * Approval request status
 */
export enum ApprovalStatus {
  PENDING = "pending", // Waiting for decision
  APPROVED = "approved", // Approved by approver
  REJECTED = "rejected", // Rejected by approver
  TIMEOUT = "timeout", // Expired without decision
  CANCELLED = "cancelled", // Requester cancelled
}

/**
 * Who can approve decisions
 */
export enum ApproverRole {
  CEO = "ceo", // CEO-LOOP agent (auto-approve authority)
  ARCHITECT = "architect", // nxtg-master-architect
  DESIGNER = "designer", // nxtg-design-vanguard
  HUMAN = "human", // Actual human user (highest authority)
}

/**
 * Decision context - what is being decided
 */
export interface DecisionContext {
  taskId: string; // Associated task
  agentId: string; // Requesting agent
  action: string; // What the agent wants to do
  rationale: string; // Why the agent wants to do it
  filesAffected?: string[]; // Files that will be changed
  visionAlignment?: number; // 0-100 score
  estimatedEffort?: string; // Time estimate
  dependencies?: string[]; // What this depends on
}

/**
 * Approval request - what needs to be decided
 */
export interface ApprovalRequest {
  id: string; // Unique request ID
  timestamp: Date; // When requested
  context: DecisionContext; // What's being decided
  impact: DecisionImpact; // Impact level
  risk: DecisionRisk; // Risk level
  requiredApprover?: ApproverRole; // Specific approver needed
  timeoutMinutes?: number; // Auto-reject after timeout (default: 5)
  status: ApprovalStatus; // Current status

  // Response fields (populated when decided)
  approver?: ApproverRole; // Who approved/rejected
  approvedAt?: Date; // When decided
  decision?: boolean; // True = approved, false = rejected
  feedback?: string; // Approver's reasoning
}

/**
 * Approval result - what came back
 */
export interface ApprovalResult {
  approved: boolean; // Was it approved?
  approver: ApproverRole; // Who decided
  reason: string; // Why
  timestamp: Date; // When
  feedback?: string; // Additional guidance
}

/**
 * Queue statistics
 */
export interface QueueStats {
  pending: number;
  approved: number;
  rejected: number;
  timeout: number;
  avgResponseTimeMs: number;
  autoApprovalRate: number; // % approved by CEO-LOOP
}

// Zod schemas for validation
export const DecisionContextSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  action: z.string(),
  rationale: z.string(),
  filesAffected: z.array(z.string()).optional(),
  visionAlignment: z.number().min(0).max(100).optional(),
  estimatedEffort: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
});

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  context: DecisionContextSchema,
  impact: z.nativeEnum(DecisionImpact),
  risk: z.nativeEnum(DecisionRisk),
  requiredApprover: z.nativeEnum(ApproverRole).optional(),
  timeoutMinutes: z.number().positive().optional(),
  status: z.nativeEnum(ApprovalStatus),
  approver: z.nativeEnum(ApproverRole).optional(),
  approvedAt: z.date().optional(),
  decision: z.boolean().optional(),
  feedback: z.string().optional(),
});

export const ApprovalResultSchema = z.object({
  approved: z.boolean(),
  approver: z.nativeEnum(ApproverRole),
  reason: z.string(),
  timestamp: z.date(),
  feedback: z.string().optional(),
});

/**
 * Type guards
 */
export function isApprovalRequest(obj: unknown): obj is ApprovalRequest {
  return ApprovalRequestSchema.safeParse(obj).success;
}

export function isApprovalResult(obj: unknown): obj is ApprovalResult {
  return ApprovalResultSchema.safeParse(obj).success;
}

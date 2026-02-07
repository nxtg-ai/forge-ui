/**
 * Type definitions for Architect View components
 */

import type { ArchitectureDecision } from "../../components/types";

export interface ArchitectDecision extends ArchitectureDecision {
  id: string;
  title: string;
  description: string;
  approach: string;
  rationale: string;
  tradeoffs: string[];
  impact: "low" | "medium" | "high" | "critical";
  status: "proposed" | "discussing" | "approved" | "rejected" | "implemented";
  proposedBy: string;
  proposedAt: Date;
  approvedBy?: string[];
  consensus: number;
  votes?: { approve: number; reject: number; abstain: number };
  relatedDecisions?: string[];
  tags?: string[];
}

export interface ImpactAnalysis {
  performance: number;
  scalability: number;
  maintainability: number;
  security: number;
  cost: number;
  timeline: number;
  risks: string[];
  opportunities: string[];
}

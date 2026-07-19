/**
 * Command View Types
 * Shared type definitions for the command center
 */

import type { Command as CommandType } from "../../components/types";
import type { HealthSource } from "../../services/status-service";

export interface ExecutedCommand {
  id: string;
  command: CommandType;
  status: "pending" | "running" | "success" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface CommandCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  commands: CommandType[];
}

/**
 * Live project context for the command palette's context bar.
 *
 * Every field is nullable ON PURPOSE: when the backend is unreachable the UI
 * must render an explicit "unavailable" state rather than a plausible-looking
 * number. Fabricated metrics are a contracts/dx-journeys.md anti-pattern —
 * this shape makes "we don't know" representable so it cannot be faked.
 */
export interface ProjectContext {
  name: string | null;
  phase: string | null;
  activeAgents: number | null;
  pendingTasks: number | null;
  healthScore: number | null;
  /**
   * Provenance of healthScore. "estimate" means the orchestrator was
   * unreachable and the number MUST be labeled as non-canonical in the UI
   * (DIRECTIVE-NXTG-20260718-04 item 2, as amended to source labeling).
   */
  healthSource: HealthSource | null;
  lastActivity: Date | null;
}

/**
 * Command View Types
 * Shared type definitions for the command center
 */

import type { Command as CommandType } from "../../components/types";

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

export interface ProjectContext {
  name: string;
  phase: string;
  activeAgents: number;
  pendingTasks: number;
  healthScore: number;
  lastActivity: Date;
}

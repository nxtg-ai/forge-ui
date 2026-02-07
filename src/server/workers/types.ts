/**
 * Agent Worker Pool Types
 * Type definitions for the parallel agent execution system
 */

import type { SpawnConfig } from "../../adapters/backend";

export type WorkerStatus =
  | "idle"
  | "busy"
  | "error"
  | "crashed"
  | "starting"
  | "stopping";
export type TaskPriority = "high" | "medium" | "low" | "background";
export type TaskStatus =
  | "queued"
  | "assigned"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";
export type TaskType = "claude-code" | "shell" | "script" | "agent";

/**
 * Agent Task - Work item for workers
 */
export interface AgentTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  workstreamId?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number; // ms, default 3600000 (1 hour)
  retryCount?: number;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>; // Task-specific payload data
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Task Result - Output from completed task
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  exitCode?: number;
  stdout: string;
  stderr: string;
  duration: number; // ms
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Worker Metrics - Resource usage
 */
export interface WorkerMetrics {
  cpuPercent: number;
  memoryMB: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskDuration: number;
  uptime: number; // ms
  lastHeartbeat: Date;
}

/**
 * Worker Info - Worker state summary
 */
export interface WorkerInfo {
  id: string;
  pid: number;
  status: WorkerStatus;
  currentTask?: AgentTask;
  assignedWorkstream?: string;
  metrics: WorkerMetrics;
  startedAt: Date;
  lastActivity: Date;
}

/**
 * Agent Context - Isolated execution environment
 */
export interface AgentContext {
  workerId: string;
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  resourceLimits: ResourceLimits;
}

/**
 * Resource Limits - Per-worker constraints
 */
export interface ResourceLimits {
  memoryMB: number;
  cpuPercent: number;
  maxProcesses: number;
  maxOpenFiles: number;
  timeoutMs: number;
}

/**
 * Pool Configuration
 */
export interface PoolConfig {
  minWorkers: number;
  maxWorkers: number;
  initialWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpStep: number;
  scaleDownStep: number;
  scaleInterval: number; // ms
  cooldownPeriod: number; // ms
  healthCheckInterval: number; // ms
  taskTimeout: number; // ms
  workerStartTimeout: number; // ms
  spawnConfig?: SpawnConfig;
}

/**
 * Pool Metrics - Aggregate statistics
 */
export interface PoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  errorWorkers: number;
  tasksQueued: number;
  tasksRunning: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgTaskDuration: number;
  avgQueueWaitTime: number;
  utilization: number; // 0-1
  uptime: number; // ms
}

/**
 * Pool Status - Overall health
 */
export interface PoolStatus {
  status: "running" | "scaling" | "degraded" | "stopped" | "starting";
  metrics: PoolMetrics;
  workers: WorkerInfo[];
  lastScaleOperation?: {
    direction: "up" | "down";
    count: number;
    timestamp: Date;
  };
}

/**
 * IPC Message - Communication between pool and workers
 */
export interface IPCMessage {
  type: "task" | "result" | "heartbeat" | "log" | "error" | "control" | "ready";
  id: string;
  timestamp: number;
  payload: unknown;
}

/**
 * Task Assignment - Worker ↔ Task binding
 */
export interface TaskAssignment {
  taskId: string;
  workerId: string;
  assignedAt: Date;
  status: TaskStatus;
}

/**
 * Health Status
 */
export interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  issues: string[];
  metrics: {
    cpuPercent: number;
    memoryMB: number;
    responseTimeMs: number;
  };
}

/**
 * Pool Events
 */
export type PoolEvent =
  | { type: "worker.started"; workerId: string; pid: number }
  | { type: "worker.stopped"; workerId: string; reason: string }
  | { type: "worker.error"; workerId: string; error: string }
  | { type: "worker.status"; workerId: string; status: WorkerStatus }
  | { type: "task.queued"; task: AgentTask }
  | { type: "task.assigned"; taskId: string; workerId: string }
  | { type: "task.started"; taskId: string; workerId: string }
  | { type: "task.completed"; taskId: string; result: TaskResult }
  | { type: "task.failed"; taskId: string; error: string }
  | { type: "task.cancelled"; taskId: string }
  | { type: "pool.scaled"; direction: "up" | "down"; count: number }
  | { type: "pool.status"; status: PoolStatus };

/**
 * Default configuration
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  minWorkers: 2,
  maxWorkers: 20,
  initialWorkers: 5,
  scaleUpThreshold: 0.8,
  scaleDownThreshold: 0.2,
  scaleUpStep: 2,
  scaleDownStep: 1,
  scaleInterval: 30000,
  cooldownPeriod: 60000,
  healthCheckInterval: 30000,
  taskTimeout: 3600000, // 1 hour
  workerStartTimeout: 10000, // 10s
};

/**
 * Default resource limits
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  memoryMB: 512,
  cpuPercent: 25,
  maxProcesses: 50,
  maxOpenFiles: 1024,
  timeoutMs: 3600000,
};

/**
 * Environment whitelist
 */
export const ENV_WHITELIST = [
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "TERM",
  "LANG",
  "LC_ALL",
  /^FORGE_/,
  /^CLAUDE_/,
  /^NODE_/,
  /^NPM_/,
];

/**
 * Blocked commands (security)
 */
export const BLOCKED_COMMANDS = [
  /^rm\s+-rf\s+\/$/,
  /^rm\s+-rf\s+\/\*$/,
  /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;?\s*:/, // Fork bomb
  /^mkfs\s+/,
  /^dd\s+if=\/dev\//,
  />\s*\/dev\/sd/,
];

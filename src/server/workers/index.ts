/**
 * Agent Worker Pool Module
 * Parallel agent execution system for NXTG-Forge
 */

export { AgentWorkerPool } from "./AgentWorkerPool";
export { AgentWorker } from "./AgentWorker";
export { TaskQueue } from "./TaskQueue";

export type {
  // Worker types
  WorkerStatus,
  WorkerInfo,
  WorkerMetrics,
  AgentContext,
  ResourceLimits,
  HealthStatus,

  // Task types
  AgentTask,
  TaskResult,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskAssignment,

  // Pool types
  PoolConfig,
  PoolMetrics,
  PoolStatus,
  PoolEvent,

  // Communication
  IPCMessage,
} from "./types";

export {
  DEFAULT_POOL_CONFIG,
  DEFAULT_RESOURCE_LIMITS,
  ENV_WHITELIST,
  BLOCKED_COMMANDS,
} from "./types";

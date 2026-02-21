/**
 * AI CLI Adapter Interface
 *
 * This interface abstracts the underlying AI CLI tool (Claude Code, Codex, Gemini)
 * allowing NXTG-Forge to be tool-agnostic and future-proof.
 *
 * All interactions with the AI CLI go through this adapter layer.
 *
 * Design principles:
 * - Tool-agnostic: Works with any AI CLI (Claude Code, Codex, Gemini, etc.)
 * - Type-safe: Full TypeScript coverage with strict types
 * - Error-handling: Uses Result types for predictable error flow
 * - Production-ready: Validation, timeouts, retries built in
 */

import { Result } from '../utils/result';
import { getLogger } from '../utils/logger';

const logger = getLogger('adapter-interface');

/**
 * Capability that an adapter can provide
 */
export interface AdapterCapability {
  /** Canonical capability name (e.g., 'file_read', 'shell_execute') */
  name: string;
  /** Whether this capability is available in the current environment */
  available: boolean;
  /** The native tool name if applicable (e.g., 'Read' for Claude Code) */
  nativeToolName?: string;
  /** Additional metadata about the capability */
  metadata?: Record<string, unknown>;
}

/**
 * Request to execute a task via an agent
 */
export interface TaskRequest {
  /** The agent identifier */
  agentId: string;
  /** What the task should accomplish */
  objective: string;
  /** Context to pass to the agent */
  context: Record<string, unknown>;
  /** Optional constraints for the task */
  constraints?: string[];
  /** Timeout in milliseconds */
  timeout?: number;
  /** Priority level (1-10, higher = more important) */
  priority?: number;
}

/**
 * Result of a task execution
 */
export interface TaskResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Output from the task */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Artifacts produced by the task */
  artifacts?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for shell execution
 */
export interface ShellOptions {
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether to capture stderr */
  captureStderr?: boolean;
}

/**
 * Result of shell execution
 */
export interface ShellResult {
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code */
  exitCode: number;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Handle to a spawned agent
 */
export interface AgentHandle {
  /** Unique identifier for this agent instance */
  id: string;
  /** The agent type/role */
  agentId: string;
  /** Current status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  /** Method to wait for completion */
  wait(): Promise<TaskResult>;
  /** Method to cancel the agent */
  cancel(): Promise<void>;
}

/**
 * Memory content structure
 */
export interface MemoryContent {
  /** Key-value pairs of memory entries */
  entries: Record<string, string>;
  /** Timestamp of last update */
  lastUpdated: Date;
  /** Source of the memory (native, forge, etc.) */
  source: string;
}

/**
 * Handle to an active session
 */
export interface SessionHandle {
  /** Unique session identifier */
  id: string;
  /** When the session started */
  startedAt: Date;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * The main AI CLI adapter interface
 *
 * Implementations of this interface bridge NXTG-Forge to specific AI CLI tools.
 */
export interface AICliAdapter {
  /** Adapter name (e.g., 'claude-code', 'codex', 'gemini') */
  readonly name: string;

  /** Adapter version */
  readonly version: string;

  // ============================================================
  // CAPABILITY DETECTION
  // ============================================================

  /**
   * Check if this adapter is available in the current environment
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the list of capabilities this adapter provides
   */
  getCapabilities(): Promise<AdapterCapability[]>;

  /**
   * Check if a specific capability is available
   */
  hasCapability(name: string): Promise<boolean>;

  // ============================================================
  // TASK EXECUTION
  // ============================================================

  /**
   * Execute a task through an agent
   */
  executeTask(task: TaskRequest): Promise<TaskResult>;

  /**
   * Execute multiple tasks in parallel
   */
  executeParallel(tasks: TaskRequest[]): Promise<TaskResult[]>;

  // ============================================================
  // FILE OPERATIONS
  // ============================================================

  /**
   * Read a file's contents
   */
  readFile(path: string): Promise<string>;

  /**
   * Write content to a file
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Search for files matching a pattern
   */
  globFiles(pattern: string, cwd?: string): Promise<string[]>;

  /**
   * Search file contents with regex
   */
  grepFiles(pattern: string, path?: string): Promise<string[]>;

  // ============================================================
  // SHELL EXECUTION
  // ============================================================

  /**
   * Execute a shell command
   */
  executeShell(command: string, options?: ShellOptions): Promise<ShellResult>;

  // ============================================================
  // AGENT SPAWNING
  // ============================================================

  /**
   * Spawn a sub-agent to handle a task
   */
  spawnAgent(agentId: string, prompt: string): Promise<AgentHandle>;

  /**
   * Get the status of a spawned agent
   */
  getAgentStatus(handle: AgentHandle): Promise<AgentHandle>;

  // ============================================================
  // MEMORY ACCESS
  // ============================================================

  /**
   * Get the current memory contents
   */
  getMemory(): Promise<MemoryContent>;

  /**
   * Update memory contents
   */
  setMemory(content: Partial<MemoryContent>): Promise<void>;

  /**
   * Get the native memory path (for integration)
   */
  getNativeMemoryPath(): Promise<string | null>;

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Start a new session
   */
  startSession(): Promise<SessionHandle>;

  /**
   * End an active session
   */
  endSession(handle: SessionHandle): Promise<void>;

  /**
   * Get current session info
   */
  getCurrentSession(): Promise<SessionHandle | null>;
}

/**
 * Base class for adapter implementations with common functionality
 */
export abstract class BaseAdapter implements AICliAdapter {
  abstract readonly name: string;
  abstract readonly version: string;

  abstract isAvailable(): Promise<boolean>;
  abstract getCapabilities(): Promise<AdapterCapability[]>;
  abstract executeTask(task: TaskRequest): Promise<TaskResult>;
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract executeShell(command: string, options?: ShellOptions): Promise<ShellResult>;
  abstract spawnAgent(agentId: string, prompt: string): Promise<AgentHandle>;
  abstract getMemory(): Promise<MemoryContent>;
  abstract setMemory(content: Partial<MemoryContent>): Promise<void>;
  abstract startSession(): Promise<SessionHandle>;
  abstract endSession(handle: SessionHandle): Promise<void>;

  async hasCapability(name: string): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    const cap = capabilities.find(c => c.name === name);
    return cap?.available ?? false;
  }

  async executeParallel(tasks: TaskRequest[]): Promise<TaskResult[]> {
    // Default implementation: execute all tasks concurrently
    return Promise.all(tasks.map(task => this.executeTask(task)));
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async globFiles(pattern: string, _cwd?: string): Promise<string[]> {
    // Default implementation - subclasses should override with native implementation
    logger.warn(`globFiles not natively implemented in ${this.name}, using fallback`);
    return [];
  }

  async grepFiles(pattern: string, _path?: string): Promise<string[]> {
    // Default implementation - subclasses should override with native implementation
    logger.warn(`grepFiles not natively implemented in ${this.name}, using fallback`);
    return [];
  }

  async getAgentStatus(handle: AgentHandle): Promise<AgentHandle> {
    // Default implementation just returns the handle
    return handle;
  }

  async getNativeMemoryPath(): Promise<string | null> {
    // Default: no native memory path
    return null;
  }

  async getCurrentSession(): Promise<SessionHandle | null> {
    // Default: no session tracking
    return null;
  }
}

/**
 * Capability name constants for consistency
 */
export const CAPABILITIES = {
  FILE_READ: 'file_read',
  FILE_WRITE: 'file_write',
  FILE_EDIT: 'file_edit',
  SHELL_EXECUTE: 'shell_execute',
  SPAWN_SUBTASK: 'spawn_subtask',
  SEARCH_GREP: 'search_grep',
  SEARCH_GLOB: 'search_glob',
  MEMORY_READ: 'memory_read',
  MEMORY_WRITE: 'memory_write',
  SESSION_MANAGE: 'session_manage',
} as const;

export type CapabilityName = typeof CAPABILITIES[keyof typeof CAPABILITIES];

/**
 * Custom error types for adapter layer
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly adapterName?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class AdapterNotAvailableError extends AdapterError {
  constructor(adapterName: string, details?: unknown) {
    super(
      `Adapter '${adapterName}' is not available in this environment`,
      'ADAPTER_NOT_AVAILABLE',
      adapterName,
      details
    );
    this.name = 'AdapterNotAvailableError';
  }
}

export class AdapterTimeoutError extends AdapterError {
  constructor(adapterName: string, operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      'ADAPTER_TIMEOUT',
      adapterName,
      { operation, timeout }
    );
    this.name = 'AdapterTimeoutError';
  }
}

export class AdapterValidationError extends AdapterError {
  constructor(message: string, adapterName?: string, details?: unknown) {
    super(message, 'ADAPTER_VALIDATION_ERROR', adapterName, details);
    this.name = 'AdapterValidationError';
  }
}

export class AdapterExecutionError extends AdapterError {
  constructor(message: string, adapterName?: string, details?: unknown) {
    super(message, 'ADAPTER_EXECUTION_ERROR', adapterName, details);
    this.name = 'AdapterExecutionError';
  }
}

/**
 * Validation helpers
 */
export const AdapterValidation = {
  /**
   * Validate task request
   */
  validateTaskRequest(task: TaskRequest): Result<true, AdapterValidationError> {
    if (!task.agentId || task.agentId.trim().length === 0) {
      return Result.err(
        new AdapterValidationError('agentId is required and cannot be empty')
      );
    }

    if (!task.objective || task.objective.trim().length === 0) {
      return Result.err(
        new AdapterValidationError('objective is required and cannot be empty')
      );
    }

    if (task.timeout !== undefined && task.timeout <= 0) {
      return Result.err(
        new AdapterValidationError('timeout must be positive')
      );
    }

    if (task.priority !== undefined && (task.priority < 1 || task.priority > 10)) {
      return Result.err(
        new AdapterValidationError('priority must be between 1 and 10')
      );
    }

    return Result.ok(true as const);
  },

  /**
   * Validate file path
   */
  validateFilePath(filePath: string): Result<true, AdapterValidationError> {
    if (!filePath || filePath.trim().length === 0) {
      return Result.err(
        new AdapterValidationError('filePath is required and cannot be empty')
      );
    }

    // Basic security check: prevent path traversal attempts
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('../') || normalized.includes('..\\')) {
      return Result.err(
        new AdapterValidationError('Path traversal not allowed', undefined, { filePath })
      );
    }

    return Result.ok(true as const);
  },

  /**
   * Validate shell command
   */
  validateShellCommand(command: string): Result<true, AdapterValidationError> {
    if (!command || command.trim().length === 0) {
      return Result.err(
        new AdapterValidationError('command is required and cannot be empty')
      );
    }

    // Basic security check: prevent command injection patterns
    const dangerousPatterns = [
      /;\s*rm\s+-rf/i,
      /\|\s*rm\s+-rf/i,
      /&&\s*rm\s+-rf/i,
      /;\s*:()\s*{\s*:\|:&\s*}/,  // Fork bomb
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return Result.err(
          new AdapterValidationError(
            'Command contains potentially dangerous pattern',
            undefined,
            { command, pattern: pattern.toString() }
          )
        );
      }
    }

    return Result.ok(true as const);
  },
};

/**
 * Mock Adapter
 *
 * A mock implementation of the AI CLI adapter for testing
 * and development without requiring an actual AI CLI tool.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  BaseAdapter,
  AdapterCapability,
  TaskRequest,
  TaskResult,
  ShellOptions,
  ShellResult,
  AgentHandle,
  MemoryContent,
  SessionHandle,
  CAPABILITIES,
} from './interface';

/**
 * Mock adapter for testing and development
 */
export class MockAdapter extends BaseAdapter {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private mockMemory: Record<string, string> = {};
  private currentSession: SessionHandle | null = null;
  private taskHistory: TaskRequest[] = [];
  private shellHistory: Array<{ command: string; result: ShellResult }> = [];

  // Configuration for mock behavior
  private config = {
    simulateDelay: true,
    delayMs: 100,
    failureRate: 0, // 0-1, chance of random failures
    verbose: false,
  };

  /**
   * Configure mock behavior
   */
  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }

  /**
   * Mock adapter is always available (it's a fallback)
   */
  async isAvailable(): Promise<boolean> {
    // Only return true if explicitly enabled or no other adapter is available
    return process.env.FORGE_MOCK_ADAPTER === 'true' ||
           process.env.NODE_ENV === 'test';
  }

  /**
   * Return all capabilities as available (for testing)
   */
  async getCapabilities(): Promise<AdapterCapability[]> {
    return [
      { name: CAPABILITIES.FILE_READ, available: true, nativeToolName: 'MockRead' },
      { name: CAPABILITIES.FILE_WRITE, available: true, nativeToolName: 'MockWrite' },
      { name: CAPABILITIES.FILE_EDIT, available: true, nativeToolName: 'MockEdit' },
      { name: CAPABILITIES.SHELL_EXECUTE, available: true, nativeToolName: 'MockBash' },
      { name: CAPABILITIES.SPAWN_SUBTASK, available: true, nativeToolName: 'MockTask' },
      { name: CAPABILITIES.SEARCH_GREP, available: true, nativeToolName: 'MockGrep' },
      { name: CAPABILITIES.SEARCH_GLOB, available: true, nativeToolName: 'MockGlob' },
      { name: CAPABILITIES.MEMORY_READ, available: true },
      { name: CAPABILITIES.MEMORY_WRITE, available: true },
      { name: CAPABILITIES.SESSION_MANAGE, available: true },
    ];
  }

  /**
   * Mock task execution
   */
  async executeTask(task: TaskRequest): Promise<TaskResult> {
    await this.simulateDelay();

    this.taskHistory.push(task);

    if (this.config.verbose) {
      console.log(`[MockAdapter] Executing task: ${task.agentId} - ${task.objective}`);
    }

    // Simulate random failures if configured
    if (Math.random() < this.config.failureRate) {
      return {
        success: false,
        error: 'Simulated failure',
        duration: this.config.delayMs,
      };
    }

    return {
      success: true,
      output: `Mock task completed: ${task.objective}`,
      duration: this.config.delayMs,
      metadata: {
        agentId: task.agentId,
        mock: true,
      },
    };
  }

  /**
   * Read file (uses real fs for actual file operations)
   */
  async readFile(filePath: string): Promise<string> {
    await this.simulateDelay();

    if (this.config.verbose) {
      console.log(`[MockAdapter] Reading file: ${filePath}`);
    }

    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write file (uses real fs for actual file operations)
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    await this.simulateDelay();

    if (this.config.verbose) {
      console.log(`[MockAdapter] Writing file: ${filePath}`);
    }

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Execute shell command (actually executes for realistic testing)
   */
  async executeShell(command: string, options?: ShellOptions): Promise<ShellResult> {
    await this.simulateDelay();

    if (this.config.verbose) {
      console.log(`[MockAdapter] Executing shell: ${command}`);
    }

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const startTime = Date.now();

    try {
      const result = await execAsync(command, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        timeout: options?.timeout,
      });

      const shellResult: ShellResult = {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        duration: Date.now() - startTime,
      };

      this.shellHistory.push({ command, result: shellResult });
      return shellResult;
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; code?: number };
      const shellResult: ShellResult = {
        success: false,
        stdout: execError.stdout || '',
        stderr: execError.stderr || String(error),
        exitCode: execError.code || 1,
        duration: Date.now() - startTime,
      };

      this.shellHistory.push({ command, result: shellResult });
      return shellResult;
    }
  }

  /**
   * Mock agent spawning
   */
  async spawnAgent(agentId: string, prompt: string): Promise<AgentHandle> {
    await this.simulateDelay();

    if (this.config.verbose) {
      console.log(`[MockAdapter] Spawning agent: ${agentId}`);
    }

    const handle: AgentHandle = {
      id: crypto.randomBytes(8).toString('hex'),
      agentId,
      status: 'running',
      wait: async () => {
        await this.simulateDelay();
        handle.status = 'completed';
        return {
          success: true,
          output: `Mock agent ${agentId} completed: ${prompt.substring(0, 50)}...`,
        };
      },
      cancel: async () => {
        handle.status = 'cancelled';
      },
    };

    return handle;
  }

  /**
   * Get mock memory
   */
  async getMemory(): Promise<MemoryContent> {
    return {
      entries: { ...this.mockMemory },
      lastUpdated: new Date(),
      source: 'mock',
    };
  }

  /**
   * Set mock memory
   */
  async setMemory(content: Partial<MemoryContent>): Promise<void> {
    if (content.entries) {
      Object.assign(this.mockMemory, content.entries);
    }
  }

  /**
   * Start mock session
   */
  async startSession(): Promise<SessionHandle> {
    this.currentSession = {
      id: crypto.randomBytes(8).toString('hex'),
      startedAt: new Date(),
      metadata: {
        adapter: 'mock',
        mock: true,
      },
    };
    return this.currentSession;
  }

  /**
   * End mock session
   */
  async endSession(_handle: SessionHandle): Promise<void> {
    this.currentSession = null;
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<SessionHandle | null> {
    return this.currentSession;
  }

  // ============================================================
  // TEST HELPERS
  // ============================================================

  /**
   * Get task history (for testing assertions)
   */
  getTaskHistory(): TaskRequest[] {
    return [...this.taskHistory];
  }

  /**
   * Get shell history (for testing assertions)
   */
  getShellHistory(): Array<{ command: string; result: ShellResult }> {
    return [...this.shellHistory];
  }

  /**
   * Clear all history (for test isolation)
   */
  clearHistory(): void {
    this.taskHistory = [];
    this.shellHistory = [];
  }

  /**
   * Reset adapter state (for test isolation)
   */
  reset(): void {
    this.mockMemory = {};
    this.currentSession = null;
    this.taskHistory = [];
    this.shellHistory = [];
    this.config = {
      simulateDelay: true,
      delayMs: 100,
      failureRate: 0,
      verbose: false,
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async simulateDelay(): Promise<void> {
    if (this.config.simulateDelay && this.config.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayMs));
    }
  }
}

/**
 * Create a configured mock adapter for testing
 */
export function createMockAdapter(options?: {
  simulateDelay?: boolean;
  delayMs?: number;
  failureRate?: number;
  verbose?: boolean;
}): MockAdapter {
  const adapter = new MockAdapter();
  if (options) {
    adapter.configure(options);
  }
  return adapter;
}

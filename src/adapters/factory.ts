/**
 * Adapter Factory
 *
 * Manages registration and discovery of AI CLI adapters.
 * Provides a single point of access to the active adapter.
 *
 * Design:
 * - Singleton pattern for global adapter access
 * - Auto-detection of available adapters
 * - Graceful fallback to mock adapter
 * - Type-safe with Result types for error handling
 */

import { Result } from '../utils/result';
import { AICliAdapter, AdapterNotAvailableError } from './interface';
import { ClaudeCodeAdapter } from './claude-code';
import { MockAdapter } from './mock';

/**
 * Factory for creating and managing AI CLI adapters
 */
export class AdapterFactory {
  private adapters: AICliAdapter[] = [];
  private activeAdapter: AICliAdapter | null = null;
  private initialized = false;

  /**
   * Register an adapter with the factory
   */
  register(adapter: AICliAdapter): void {
    // Prevent duplicates
    if (this.adapters.some(a => a.name === adapter.name)) {
      console.warn(`Adapter ${adapter.name} already registered, skipping`);
      return;
    }
    this.adapters.push(adapter);
  }

  /**
   * Get all registered adapters
   */
  getRegisteredAdapters(): AICliAdapter[] {
    return [...this.adapters];
  }

  /**
   * Get the first available adapter
   */
  async getActiveAdapter(): Promise<AICliAdapter | null> {
    if (this.activeAdapter) {
      return this.activeAdapter;
    }

    for (const adapter of this.adapters) {
      try {
        if (await adapter.isAvailable()) {
          this.activeAdapter = adapter;
          console.log(`[AdapterFactory] Using adapter: ${adapter.name} v${adapter.version}`);
          return adapter;
        }
      } catch (error) {
        console.warn(`[AdapterFactory] Error checking adapter ${adapter.name}:`, error);
      }
    }

    return null;
  }

  /**
   * Get a specific adapter by name
   */
  getAdapter(name: string): AICliAdapter | undefined {
    return this.adapters.find(a => a.name === name);
  }

  /**
   * Force use of a specific adapter
   */
  setActiveAdapter(name: string): boolean {
    const adapter = this.getAdapter(name);
    if (adapter) {
      this.activeAdapter = adapter;
      return true;
    }
    return false;
  }

  /**
   * Clear the active adapter (for testing)
   */
  clearActiveAdapter(): void {
    this.activeAdapter = null;
  }

  /**
   * Initialize with default adapters
   */
  async initialize(): Promise<AICliAdapter | null> {
    if (this.initialized) {
      return this.getActiveAdapter();
    }

    // Register default adapters in priority order
    this.register(new ClaudeCodeAdapter());
    this.register(new MockAdapter());

    this.initialized = true;

    // Return the active adapter
    return this.getActiveAdapter();
  }

  /**
   * Check if any adapter is available
   */
  async hasAvailableAdapter(): Promise<boolean> {
    const adapter = await this.getActiveAdapter();
    return adapter !== null;
  }
}

// Singleton instance
let factoryInstance: AdapterFactory | null = null;

/**
 * Get the global adapter factory instance
 */
export function getAdapterFactory(): AdapterFactory {
  if (!factoryInstance) {
    factoryInstance = new AdapterFactory();
  }
  return factoryInstance;
}

/**
 * Initialize the adapter factory and return the active adapter
 * This is the main entry point for getting an adapter
 */
export async function initializeAdapters(): Promise<AICliAdapter | null> {
  const factory = getAdapterFactory();
  return factory.initialize();
}

/**
 * Get the current active adapter
 * Returns null if no adapter is available
 */
export async function getActiveAdapter(): Promise<AICliAdapter | null> {
  const factory = getAdapterFactory();
  return factory.getActiveAdapter();
}

/**
 * Execute a task through the active adapter
 * Returns Result type for predictable error handling
 */
export async function executeTask(
  agentId: string,
  objective: string,
  context: Record<string, unknown> = {},
  options: { constraints?: string[]; timeout?: number; priority?: number } = {}
): Promise<Result<{ success: boolean; output?: string; error?: string }, AdapterNotAvailableError>> {
  const adapter = await getActiveAdapter();

  if (!adapter) {
    return Result.err(
      new AdapterNotAvailableError('any', { reason: 'No adapter detected' })
    );
  }

  try {
    const result = await adapter.executeTask({
      agentId,
      objective,
      context,
      constraints: options.constraints,
      timeout: options.timeout,
      priority: options.priority,
    });

    return Result.ok(result);
  } catch (error) {
    return Result.ok({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read a file through the active adapter
 * Returns Result type for predictable error handling
 */
export async function readFile(filePath: string): Promise<Result<string, Error>> {
  const adapter = await getActiveAdapter();

  if (!adapter) {
    return Result.err(new AdapterNotAvailableError('any'));
  }

  try {
    const content = await adapter.readFile(filePath);
    return Result.ok(content);
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Write a file through the active adapter
 * Returns Result type for predictable error handling
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<Result<void, Error>> {
  const adapter = await getActiveAdapter();

  if (!adapter) {
    return Result.err(new AdapterNotAvailableError('any'));
  }

  try {
    await adapter.writeFile(filePath, content);
    return Result.ok(undefined);
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Execute a shell command through the active adapter
 * Returns Result type for predictable error handling
 */
export async function executeShell(
  command: string,
  options?: { cwd?: string; timeout?: number }
): Promise<Result<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration?: number;
}, Error>> {
  const adapter = await getActiveAdapter();

  if (!adapter) {
    return Result.err(new AdapterNotAvailableError('any'));
  }

  try {
    const result = await adapter.executeShell(command, options);
    return Result.ok(result);
  } catch (error) {
    return Result.err(error instanceof Error ? error : new Error(String(error)));
  }
}

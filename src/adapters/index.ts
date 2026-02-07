/**
 * Adapter Module
 *
 * Exports all adapter-related types and implementations.
 * This is the main entry point for the adapter layer.
 */

// Interface and base types
export {
  AICliAdapter,
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
  type CapabilityName,
} from './interface';

// Implementations
export { ClaudeCodeAdapter, claudeCodeAdapter } from './claude-code';
export { MockAdapter, createMockAdapter } from './mock';

// Factory and utilities
export {
  AdapterFactory,
  getAdapterFactory,
  initializeAdapters,
  getActiveAdapter,
  executeTask,
  readFile,
  writeFile,
  executeShell,
} from './factory';

// Backend interface and implementations
export type { AgentBackend, SpawnConfig } from './backend';
export {
  ClaudeCodeBackend,
  CodexBackend,
  GeminiBackend,
  NodeWorkerBackend,
} from './backend';

// Backend detection
export { detectBackend } from './backend-detector';

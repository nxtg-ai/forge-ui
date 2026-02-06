/**
 * React Hooks for UI-Backend Integration
 * Centralized export for all integration hooks
 *
 * NOTE: For data hooks (vision, agents, commands, etc.), use hooks from
 * useForgeIntegration.ts instead. This file only exports specialized hooks.
 */

// File-based state management (reads from .claude/state/)
export { useProjectState } from "./useProjectState";
export type {
  UseProjectStateOptions,
  UseProjectStateReturn,
} from "./useProjectState";

// WebSocket connection management
export { useRealtimeConnection } from "./useRealtimeConnection";

// Keyboard shortcut utilities
export {
  useKeyboardShortcuts,
  useKeyboardShortcut,
  usePressedKeys,
  formatShortcut,
  isShortcutAvailable,
} from "./useKeyboardShortcuts";
export type { ShortcutConfig, UseKeyboardShortcutsOptions } from "./useKeyboardShortcuts";

// Dashboard data aggregation
export { useDashboardData } from "./useDashboardData";
export type { DashboardData, VisionData } from "./useDashboardData";

// For API-based data hooks, import from useForgeIntegration:
// import {
//   useVision,
//   useAgentActivities,
//   useCommandExecution,
//   useArchitectureDecisions,
//   useYoloMode,
//   useForgeIntegration,
// } from './hooks/useForgeIntegration';

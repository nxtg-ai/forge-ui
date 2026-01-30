/**
 * React Hooks for UI-Backend Integration
 * Centralized export for all integration hooks
 */

export { useProjectState } from "./useProjectState";
export type {
  UseProjectStateOptions,
  UseProjectStateReturn,
} from "./useProjectState";

export { useAgentActivity } from "./useAgentActivity";
export type {
  UseAgentActivityOptions,
  UseAgentActivityReturn,
} from "./useAgentActivity";

export { useVision } from "./useVision";
export type { UseVisionOptions, UseVisionReturn } from "./useVision";

export { useCommands } from "./useCommands";
export type {
  UseCommandsOptions,
  UseCommandsReturn,
  CommandExecution,
} from "./useCommands";

export { useAutomation } from "./useAutomation";
export type {
  UseAutomationOptions,
  UseAutomationReturn,
} from "./useAutomation";

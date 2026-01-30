/**
 * Command System Type Definitions
 * Command palette and command execution types
 */

export interface Command {
  id: string;
  name: string;
  description: string;
  category: CommandCategory;
  icon?: string;
  shortcut?: string[];
  aliases?: string[];
  action: CommandAction;
  requiresConfirmation?: boolean;
  dangerLevel?: "safe" | "moderate" | "dangerous";
  availability?: CommandAvailability;
  parameters?: CommandParameter[];
  recent?: boolean;
  frequency?: number; // Usage frequency for ranking
}

export type CommandCategory =
  | "navigation"
  | "file"
  | "git"
  | "agent"
  | "vision"
  | "build"
  | "test"
  | "deploy"
  | "debug"
  | "settings"
  | "help";

export interface CommandAction {
  type: "function" | "route" | "external" | "composite";
  handler: string | (() => void) | (() => Promise<void>);
  payload?: any;
}

export interface CommandAvailability {
  condition?: () => boolean;
  requiresProject?: boolean;
  requiresGit?: boolean;
  requiresAgent?: string[];
  minimumAutomationLevel?: number;
}

export interface CommandParameter {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "select"
    | "multiselect"
    | "file"
    | "directory";
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: Array<{
    value: any;
    label: string;
    description?: string;
  }>;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: any) => boolean | string;
  };
}

export interface CommandExecution {
  commandId: string;
  timestamp: Date;
  parameters?: Record<string, any>;
  result?: CommandResult;
  duration?: number;
  source: "palette" | "shortcut" | "menu" | "api";
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  filteredCommands: Command[];
  recentCommands: Command[];
  category?: CommandCategory;
  mode: "search" | "execute" | "confirm";
  currentCommand?: Command;
  parameters?: Record<string, any>;
}

export interface CommandHistory {
  executions: CommandExecution[];
  favorites: string[]; // Command IDs
  shortcuts: Record<string, string>; // Custom shortcuts
  statistics: {
    totalExecutions: number;
    byCategory: Record<CommandCategory, number>;
    byCommand: Record<string, number>;
    averageExecutionTime: number;
  };
}

export interface CommandSuggestion {
  command: Command;
  score: number;
  reason: "recent" | "frequent" | "contextual" | "search";
  highlight?: {
    start: number;
    end: number;
  }[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  command: Command;
  position: number;
  visible: boolean;
}

export interface CommandContext {
  currentFile?: string;
  currentDirectory?: string;
  selectedText?: string;
  clipboard?: string;
  git?: {
    branch: string;
    hasChanges: boolean;
    ahead: number;
    behind: number;
  };
  agents?: {
    active: string[];
    available: string[];
  };
  vision?: {
    hasVision: boolean;
    versionId: string;
  };
}

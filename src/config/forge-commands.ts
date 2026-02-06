/**
 * NXTG-Forge Command Registry
 * Defines all available FRG commands with metadata
 *
 * Source: .claude/commands/[FRG]-*.md files
 */

import {
  Activity,
  Zap,
  Shield,
  Network,
  FileCode,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Archive,
  RotateCcw,
  Package,
  Play,
  Settings,
  Users,
  Rocket,
  Target,
  FileText,
  Search,
  CheckCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ForgeCommand {
  id: string;
  name: string;
  description: string;
  category: "forge" | "git" | "test" | "deploy" | "analyze";
  icon: LucideIcon;
  hotkey?: string;
  requiresConfirmation?: boolean;
  severity?: "safe" | "warning" | "danger";
}

/**
 * All 19 NXTG-Forge commands mapped from .claude/commands/[FRG]-*.md
 */
export const FORGE_COMMANDS: ForgeCommand[] = [
  // Core Status & Analysis Commands
  {
    id: "frg-status",
    name: "Status Report",
    description: "Display complete project state (zero-context-friendly)",
    category: "forge",
    icon: Activity,
    hotkey: "s",
    severity: "safe",
  },
  {
    id: "frg-status-enhanced",
    name: "Enhanced Status",
    description: "Detailed status with performance metrics and insights",
    category: "forge",
    icon: BarChart3,
    severity: "safe",
  },
  {
    id: "frg-gap-analysis",
    name: "Gap Analysis",
    description: "Analyze project gaps across testing, docs, security, and architecture",
    category: "analyze",
    icon: Search,
    hotkey: "g",
    severity: "safe",
  },
  {
    id: "frg-report",
    name: "Session Report",
    description: "Generate session activity report with metrics",
    category: "analyze",
    icon: FileText,
    severity: "safe",
  },

  // Testing Commands
  {
    id: "frg-test",
    name: "Run Tests",
    description: "Execute project tests with detailed analysis and reporting",
    category: "test",
    icon: Shield,
    hotkey: "t",
    severity: "safe",
  },

  // Feature & Development Commands
  {
    id: "frg-feature",
    name: "New Feature",
    description: "Add a new feature with full agent orchestration",
    category: "forge",
    icon: Zap,
    hotkey: "f",
    severity: "safe",
  },
  {
    id: "frg-spec",
    name: "Generate Spec",
    description: "Create detailed specification for a feature or component",
    category: "forge",
    icon: FileCode,
    severity: "safe",
  },

  // State Management Commands
  {
    id: "frg-checkpoint",
    name: "Checkpoint",
    description: "Save current project state with metadata",
    category: "git",
    icon: Archive,
    hotkey: "c",
    severity: "safe",
  },
  {
    id: "frg-restore",
    name: "Restore",
    description: "Restore from a saved checkpoint",
    category: "git",
    icon: RotateCcw,
    requiresConfirmation: true,
    severity: "warning",
  },

  // Deployment Commands
  {
    id: "frg-deploy",
    name: "Deploy",
    description: "Deploy with pre-flight validation and safety checks",
    category: "deploy",
    icon: Rocket,
    hotkey: "d",
    requiresConfirmation: true,
    severity: "danger",
  },

  // Optimization & Integration Commands
  {
    id: "frg-optimize",
    name: "Optimize",
    description: "Analyze and optimize code performance and bundle size",
    category: "analyze",
    icon: Target,
    severity: "safe",
  },
  {
    id: "frg-integrate",
    name: "Integrate",
    description: "Integrate external service or API",
    category: "forge",
    icon: Network,
    severity: "safe",
  },
  {
    id: "frg-upgrade",
    name: "Upgrade",
    description: "Upgrade dependencies with compatibility checking",
    category: "forge",
    icon: Package,
    requiresConfirmation: true,
    severity: "warning",
  },

  // Agent Management Commands
  {
    id: "frg-agent-assign",
    name: "Assign Agent",
    description: "Assign an agent to a specific task or workstream",
    category: "forge",
    icon: Users,
    severity: "safe",
  },

  // Initialization & Setup Commands
  {
    id: "frg-init",
    name: "Initialize Forge",
    description: "Initialize NXTG-Forge in a project",
    category: "forge",
    icon: Settings,
    requiresConfirmation: true,
    severity: "warning",
  },
  {
    id: "frg-enable-forge",
    name: "Enable Forge",
    description: "Enable Forge mode for existing Claude Code project",
    category: "forge",
    icon: Play,
    requiresConfirmation: true,
    severity: "warning",
  },

  // Documentation Commands
  {
    id: "frg-docs-status",
    name: "Docs Status",
    description: "Check documentation coverage and quality",
    category: "analyze",
    icon: FileText,
    severity: "safe",
  },
  {
    id: "frg-docs-update",
    name: "Update Docs",
    description: "Update documentation to match current code",
    category: "forge",
    icon: FileText,
    severity: "safe",
  },
  {
    id: "frg-docs-audit",
    name: "Audit Docs",
    description: "Comprehensive documentation audit with recommendations",
    category: "analyze",
    icon: Search,
    severity: "safe",
  },
];

/**
 * Get command by ID
 */
export function getCommandById(id: string): ForgeCommand | undefined {
  return FORGE_COMMANDS.find((cmd) => cmd.id === id);
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(
  category: ForgeCommand["category"],
): ForgeCommand[] {
  return FORGE_COMMANDS.filter((cmd) => cmd.category === category);
}

/**
 * Get commands with hotkeys
 */
export function getCommandsWithHotkeys(): ForgeCommand[] {
  return FORGE_COMMANDS.filter((cmd) => cmd.hotkey);
}

/**
 * Search commands by name or description
 */
export function searchCommands(query: string): ForgeCommand[] {
  const lowercaseQuery = query.toLowerCase();
  return FORGE_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowercaseQuery) ||
      cmd.description.toLowerCase().includes(lowercaseQuery) ||
      cmd.id.toLowerCase().includes(lowercaseQuery),
  );
}

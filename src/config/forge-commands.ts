/**
 * NXTG-Forge Command Registry
 *
 * The commands the dashboard's command center lists (GET /api/commands) and
 * runs (POST /api/commands/execute). Each id here must have a handler in
 * EXECUTABLE_COMMANDS (src/server/routes/commands.ts), and each handler must
 * have an entry here; src/server/routes/__tests__/commands-list-matches-execute.test.ts
 * fails when the two differ.
 *
 * The Forge slash commands (/frg-*) themselves ship in forge-plugin.
 */

/**
 * Icon names the client can render: keys of ICON_MAP in src/utils/icon-mapper.tsx.
 */
export type CommandIconName =
  | "Activity"
  | "AlertTriangle"
  | "BarChart3"
  | "CheckCircle"
  | "FileCode"
  | "FileText"
  | "GitBranch"
  | "Network"
  | "Package"
  | "Rocket"
  | "Search"
  | "Shield"
  | "Zap";

export interface ForgeCommand {
  id: string;
  name: string;
  description: string;
  category: "forge" | "git" | "test" | "deploy" | "analyze";
  /** Sent to the client as iconName; see CommandIconName. */
  iconName: CommandIconName;
  hotkey?: string;
  requiresConfirmation?: boolean;
  severity?: "safe" | "warning" | "danger";
}

/**
 * The 14 commands POST /api/commands/execute can run.
 */
export const FORGE_COMMANDS: ForgeCommand[] = [
  // Forge commands
  {
    id: "frg-status",
    name: "Status Report",
    description: "Display complete project state (zero-context-friendly)",
    category: "forge",
    iconName: "Activity",
    hotkey: "s",
    severity: "safe",
  },
  {
    id: "frg-gap-analysis",
    name: "Gap Analysis",
    description: "Test run summary, plus source and doc file counts",
    category: "analyze",
    iconName: "Search",
    hotkey: "g",
    severity: "safe",
  },
  {
    id: "frg-test",
    name: "Run Tests",
    description: "Run the Vitest suite (npx vitest run)",
    category: "test",
    iconName: "Shield",
    hotkey: "t",
    severity: "safe",
  },
  {
    id: "frg-feature",
    name: "New Feature",
    description: "Points you to the Infinity Terminal, where /frg-feature runs",
    category: "forge",
    iconName: "Zap",
    hotkey: "f",
    severity: "safe",
  },
  {
    id: "frg-deploy",
    name: "Build Check",
    description: "Type check (tsc --noEmit), then a production build (vite build). Does not deploy.",
    category: "deploy",
    iconName: "Rocket",
    hotkey: "d",
    requiresConfirmation: true,
    severity: "warning",
  },

  // Git commands
  {
    id: "git-status",
    name: "Git Status",
    description: "Branch, commits ahead of the remote, changed files and the last 5 commits",
    category: "git",
    iconName: "GitBranch",
    severity: "safe",
  },
  {
    id: "git-diff",
    name: "Git Diff",
    description: "Staged and unstaged change summary (git diff --stat)",
    category: "git",
    iconName: "FileCode",
    severity: "safe",
  },
  {
    id: "git-log",
    name: "Git Log",
    description: "The last 20 commits as a graph",
    category: "git",
    iconName: "FileText",
    severity: "safe",
  },

  // Analysis commands
  {
    id: "analyze-types",
    name: "Type Check",
    description: "Count TypeScript errors (tsc --noEmit)",
    category: "analyze",
    iconName: "Shield",
    severity: "safe",
  },
  {
    id: "analyze-lint",
    name: "Lint",
    description: "Run ESLint on src",
    category: "analyze",
    iconName: "AlertTriangle",
    severity: "safe",
  },
  {
    id: "analyze-deps",
    name: "Outdated Dependencies",
    description: "List outdated packages (npm outdated)",
    category: "analyze",
    iconName: "Package",
    severity: "safe",
  },
  {
    id: "analyze-bundle",
    name: "Bundle Size",
    description: "Production build and its output sizes (vite build)",
    category: "analyze",
    iconName: "BarChart3",
    severity: "safe",
  },

  // Test and system commands
  {
    id: "test-coverage",
    name: "Test Coverage",
    description: "Run the Vitest suite with coverage",
    category: "test",
    iconName: "CheckCircle",
    severity: "safe",
  },
  {
    id: "system-info",
    name: "System Info",
    description: "Node, npm and Git versions, platform, memory, CPUs, uptime and disk",
    category: "analyze",
    iconName: "Network",
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

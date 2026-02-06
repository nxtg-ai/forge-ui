/**
 * MCP Suggestion Engine
 *
 * AI-powered MCP server recommendation system that:
 * 1. Analyzes project vision and requirements
 * 2. Suggests relevant MCP servers with detailed reasoning
 * 3. Presents user-friendly selection interface
 * 4. Auto-configures selected servers
 */

import { exec } from "child_process";
import { promisify } from "util";
import { Logger } from "../utils/logger";

const log = Logger.getInstance("MCPSuggestionEngine");

const execAsync = promisify(exec);

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category:
    | "database"
    | "api"
    | "productivity"
    | "development"
    | "automation"
    | "design";
  useCase: string;
  benefits: string[];
  command: string;
  args?: string[];
  env?: Record<string, string>;
  setup: string;
  examples: string[];
  priority: "essential" | "recommended" | "optional";
  relevanceScore: number;
  reasoning: string;
}

export interface MCPSuggestion {
  essential: MCPServer[];
  recommended: MCPServer[];
  optional: MCPServer[];
  totalEstimatedSetupTime: string;
}

export interface VisionContext {
  mission: string;
  goals: string[];
  techStack: {
    backend?: string;
    frontend?: string;
    database?: string;
    infrastructure?: string;
  };
  features: string[];
  integrations: string[];
  industry?: string;
}

/**
 * Official MCP Server Registry
 * Based on github.com/modelcontextprotocol/servers
 */
const MCP_REGISTRY: Record<
  string,
  Omit<MCPServer, "priority" | "relevanceScore" | "reasoning">
> = {
  github: {
    id: "github",
    name: "GitHub MCP Server",
    description: "Connect to GitHub REST API for repository management",
    category: "development",
    useCase: "Manage repos, issues, PRs, and CI/CD workflows from Claude",
    benefits: [
      "Read and create issues/PRs directly from Claude",
      "Trigger GitHub Actions workflows",
      "Analyze commits and code reviews",
      "Manage repository settings",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_TOKEN: "${GITHUB_TOKEN}",
    },
    setup: "Requires GitHub Personal Access Token with repo permissions",
    examples: [
      'Claude can create a PR: "Create a PR for the authentication feature"',
      'View issues: "Show me all open bugs labeled high-priority"',
      'Trigger deploy: "Run the production deployment workflow"',
    ],
  },

  postgres: {
    id: "postgres",
    name: "PostgreSQL MCP Server",
    description: "Query and manage PostgreSQL databases naturally",
    category: "database",
    useCase: "Natural language database queries and schema management",
    benefits: [
      "Query databases with natural language",
      "Generate SQL from descriptions",
      "Analyze database schema",
      "Debug slow queries",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    env: {
      DATABASE_URL: "${DATABASE_URL}",
    },
    setup: "Requires PostgreSQL connection string",
    examples: [
      '"Show me all users who signed up this week"',
      '"Explain this slow query and suggest optimizations"',
      '"Generate migration to add email verification"',
    ],
  },

  filesystem: {
    id: "filesystem",
    name: "File System MCP Server",
    description: "Secure file and directory operations",
    category: "development",
    useCase: "File management with safety guardrails",
    benefits: [
      "Read/write files with permission controls",
      "Search across project files",
      "Batch file operations",
      "Safe file manipulation",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem"],
    setup: "Specify allowed directories for security",
    examples: [
      '"Find all TODO comments in the codebase"',
      '"Create a new component file with boilerplate"',
      '"Rename all test files to use .test.ts extension"',
    ],
  },

  playwright: {
    id: "playwright",
    name: "Playwright MCP Server",
    description: "Web automation and E2E testing",
    category: "development",
    useCase: "Browser automation for testing and debugging",
    benefits: [
      "Generate E2E tests automatically",
      "Debug web applications",
      "Automate repetitive web tasks",
      "Accessibility testing",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-playwright"],
    setup: "Playwright will be installed automatically",
    examples: [
      '"Create an E2E test for the login flow"',
      '"Test the checkout process and take screenshots"',
      '"Check accessibility of the dashboard page"',
    ],
  },

  "sequential-thinking": {
    id: "sequential-thinking",
    name: "Sequential Thinking MCP Server",
    description: "Enhanced problem-solving with structured reasoning",
    category: "development",
    useCase: "Complex problem-solving with step-by-step reasoning",
    benefits: [
      "Break down complex problems methodically",
      "Revise approach when needed",
      "Maintain context across reasoning chains",
      "More accurate solutions",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    setup: "No additional setup required",
    examples: [
      '"Debug this complex async race condition"',
      '"Design the architecture for a distributed system"',
      '"Optimize this algorithm for large datasets"',
    ],
  },

  slack: {
    id: "slack",
    name: "Slack MCP Server",
    description: "Slack workspace integration",
    category: "productivity",
    useCase: "Send notifications and manage Slack channels",
    benefits: [
      "Send deployment notifications",
      "Post error alerts to channels",
      "Search Slack history",
      "Manage channels and users",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: "${SLACK_BOT_TOKEN}",
      SLACK_TEAM_ID: "${SLACK_TEAM_ID}",
    },
    setup: "Requires Slack Bot Token",
    examples: [
      '"Send deployment success message to #releases"',
      '"Search Slack for discussions about authentication"',
      '"Post build failure to #dev-alerts"',
    ],
  },

  "google-drive": {
    id: "google-drive",
    name: "Google Drive MCP Server",
    description: "Access and manage Google Drive files",
    category: "productivity",
    useCase: "Read specs, docs, and collaborate on Google Drive",
    benefits: [
      "Access project specs from Drive",
      "Search documents",
      "Generate docs from code",
      "Sync documentation",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
    env: {
      GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID}",
      GOOGLE_CLIENT_SECRET: "${GOOGLE_CLIENT_SECRET}",
    },
    setup: "Requires Google OAuth credentials",
    examples: [
      '"Read the PRD from Google Drive"',
      '"Generate API documentation and save to Drive"',
      '"Search Drive for architecture diagrams"',
    ],
  },

  notion: {
    id: "notion",
    name: "Notion MCP Server",
    description: "Notion workspace integration",
    category: "productivity",
    useCase: "Project management and documentation in Notion",
    benefits: [
      "Sync documentation to Notion",
      "Create project tasks",
      "Read project specs from Notion",
      "Update project status",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-notion"],
    env: {
      NOTION_API_KEY: "${NOTION_API_KEY}",
    },
    setup: "Requires Notion Integration Token",
    examples: [
      '"Create a Notion page for this feature spec"',
      '"Update project status to In Progress"',
      '"Read requirements from Notion database"',
    ],
  },

  figma: {
    id: "figma",
    name: "Figma MCP Server",
    description: "Figma design integration",
    category: "design",
    useCase: "Design-to-code workflow",
    benefits: [
      "Generate code from Figma designs",
      "Extract design tokens",
      "Sync component library",
      "Validate implementation against design",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-figma"],
    env: {
      FIGMA_ACCESS_TOKEN: "${FIGMA_ACCESS_TOKEN}",
    },
    setup: "Requires Figma Personal Access Token",
    examples: [
      '"Generate React components from this Figma frame"',
      '"Extract color palette from design system"',
      '"Compare implementation with Figma specs"',
    ],
  },

  memory: {
    id: "memory",
    name: "Memory Bank MCP Server",
    description: "Persistent context and memory across sessions",
    category: "development",
    useCase: "Maintain long-term project context",
    benefits: [
      "Remember project decisions",
      "Retain coding patterns",
      "Recall previous discussions",
      "Build institutional knowledge",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    setup: "Stores data in local SQLite database",
    examples: [
      '"Remember: we use Zod for validation in this project"',
      '"What did we decide about the authentication approach?"',
      '"Recall the performance optimization we discussed"',
    ],
  },

  zapier: {
    id: "zapier",
    name: "Zapier MCP Server",
    description: "Automate workflows across 5000+ apps",
    category: "automation",
    useCase: "Cross-app workflow automation",
    benefits: [
      "Trigger Zapier workflows",
      "Connect to 5000+ apps",
      "Automate complex workflows",
      "No-code integrations",
    ],
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-zapier"],
    env: {
      ZAPIER_NLA_API_KEY: "${ZAPIER_NLA_API_KEY}",
    },
    setup: "Requires Zapier NLA API key",
    examples: [
      '"When build fails, create Jira ticket and notify Slack"',
      '"On deployment success, update status page"',
      '"Sync new users to CRM"',
    ],
  },
};

export class MCPSuggestionEngine {
  constructor() {
    // No API key needed - we use Claude Code CLI with user's subscription
  }

  /**
   * Analyze project vision and suggest relevant MCP servers
   */
  async suggestMCPs(vision: VisionContext): Promise<MCPSuggestion> {
    log.info("Analyzing project vision...");

    // Step 1: AI analyzes vision and scores each MCP
    const scoredServers = await this.scoreServers(vision);

    // Step 2: Categorize by priority
    const essential = scoredServers.filter((s) => s.priority === "essential");
    const recommended = scoredServers.filter(
      (s) => s.priority === "recommended",
    );
    const optional = scoredServers.filter((s) => s.priority === "optional");

    // Step 3: Calculate setup time
    const totalEstimatedSetupTime = this.calculateSetupTime(
      essential,
      recommended,
    );

    return {
      essential,
      recommended,
      optional,
      totalEstimatedSetupTime,
    };
  }

  private async scoreServers(vision: VisionContext): Promise<MCPServer[]> {
    const prompt = `Analyze this project vision and score the relevance of each MCP server (0-100):

Vision:
${JSON.stringify(vision, null, 2)}

Available MCP Servers:
${Object.values(MCP_REGISTRY)
  .map((mcp) => `- ${mcp.name}: ${mcp.description}`)
  .join("\n")}

For each MCP server, provide:
1. relevanceScore (0-100): How relevant is this MCP for the project?
2. priority: "essential" (must-have), "recommended" (nice-to-have), or "optional" (future consideration)
3. reasoning: 2-3 sentences explaining WHY this MCP would benefit the project

Response format (JSON ONLY - no other text):
{
  "scores": {
    "github": {
      "relevanceScore": 95,
      "priority": "essential",
      "reasoning": "..."
    },
    ...
  }
}

Consider:
- Tech stack alignment (does it work with their backend/frontend?)
- Feature requirements (which MCPs enable their specific features?)
- Industry best practices (healthcare needs HIPAA audit trails → PostgreSQL server)
- Team productivity (reduce manual work)
- Integration complexity vs benefit

IMPORTANT: Return ONLY the JSON object, no additional commentary.
`;

    try {
      // Use Claude Code CLI (user's Pro Max subscription)
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n");
      const { stdout } = await execAsync(
        `echo "${escapedPrompt}" | claude --dangerously-skip-permissions`,
      );

      const analysisText = stdout.trim();
      const analysis = JSON.parse(this.extractJSON(analysisText));

      // Merge scores with registry data
      return Object.entries(analysis.scores)
        .map(([id, score]: [string, any]) => ({
          ...MCP_REGISTRY[id],
          priority: score.priority,
          relevanceScore: score.relevanceScore,
          reasoning: score.reasoning,
        }))
        .filter((mcp) => mcp.relevanceScore > 30) // Only show relevant ones
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      log.error("Error calling Claude Code CLI", error);
      throw new Error(
        `Failed to analyze vision: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private extractJSON(text: string): string {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text;
  }

  private calculateSetupTime(
    essential: MCPServer[],
    recommended: MCPServer[],
  ): string {
    const count = essential.length + recommended.length;
    const minutes = count * 2; // ~2 min per MCP
    return `~${minutes} minutes`;
  }

  /**
   * Generate .claude/mcp.json configuration
   */
  generateMCPConfig(selectedServers: string[]): string {
    const servers: Record<string, any> = {};

    for (const serverId of selectedServers) {
      const mcp = MCP_REGISTRY[serverId];
      if (!mcp) continue;

      servers[serverId] = {
        command: mcp.command,
        args: mcp.args || [],
        ...(mcp.env && { env: mcp.env }),
      };
    }

    return JSON.stringify({ servers }, null, 2);
  }

  /**
   * Generate setup instructions for user
   */
  generateSetupGuide(selectedServers: string[]): string {
    let guide = "# MCP Server Setup Guide\n\n";

    for (const serverId of selectedServers) {
      const mcp = MCP_REGISTRY[serverId];
      if (!mcp) continue;

      guide += `## ${mcp.name}\n\n`;
      guide += `${mcp.description}\n\n`;
      guide += `**Setup:** ${mcp.setup}\n\n`;

      if (mcp.env) {
        guide += "**Required Environment Variables:**\n";
        for (const [key, value] of Object.entries(mcp.env)) {
          guide += `- \`${key}\`: ${value}\n`;
        }
        guide += "\n";
      }

      guide += "**Example Usage:**\n";
      for (const example of mcp.examples) {
        guide += `- ${example}\n`;
      }
      guide += "\n---\n\n";
    }

    return guide;
  }
}

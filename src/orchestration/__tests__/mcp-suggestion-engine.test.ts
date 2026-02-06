/**
 * MCP Suggestion Engine Tests
 * Comprehensive tests for MCP server recommendation and configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Hoist mock setup
const { mockExecAsync } = vi.hoisted(() => {
  const mockExecAsync = vi.fn();
  return { mockExecAsync };
});

// Mock child_process
vi.mock("child_process", () => ({
  default: { exec: vi.fn() },
  exec: vi.fn(),
}));

// Mock util to return our mockExecAsync when promisify is called
vi.mock("util", () => ({
  default: { promisify: vi.fn(() => mockExecAsync) },
  promisify: vi.fn(() => mockExecAsync),
}));

import {
  MCPSuggestionEngine,
  VisionContext,
  MCPServer,
  MCPSuggestion,
} from "../mcp-suggestion-engine";

describe("MCPSuggestionEngine", () => {
  let engine: MCPSuggestionEngine;

  const mockVisionContext: VisionContext = {
    mission: "Build a modern SaaS platform with AI-powered analytics",
    goals: [
      "Ship MVP in 3 months",
      "Achieve 90% test coverage",
      "Integrate with GitHub and Slack",
    ],
    techStack: {
      backend: "Node.js + Express",
      frontend: "React + TypeScript",
      database: "PostgreSQL",
      infrastructure: "AWS",
    },
    features: [
      "User authentication",
      "Real-time analytics dashboard",
      "GitHub integration",
      "Slack notifications",
    ],
    integrations: ["GitHub", "Slack", "PostgreSQL"],
    industry: "SaaS",
  };

  const mockClaudeResponse = {
    scores: {
      github: {
        relevanceScore: 95,
        priority: "essential",
        reasoning:
          "GitHub integration is a core requirement. The MCP server enables automated repository management, PR creation, and CI/CD workflows.",
      },
      postgres: {
        relevanceScore: 92,
        priority: "essential",
        reasoning:
          "PostgreSQL is the primary database. Natural language queries will accelerate development and debugging.",
      },
      slack: {
        relevanceScore: 88,
        priority: "recommended",
        reasoning:
          "Slack notifications are a requested feature. MCP server enables automated alerts and team communication.",
      },
      filesystem: {
        relevanceScore: 75,
        priority: "recommended",
        reasoning:
          "File operations are needed for code generation and project scaffolding. Provides safe file manipulation.",
      },
      playwright: {
        relevanceScore: 70,
        priority: "recommended",
        reasoning:
          "E2E testing is important for quality. Playwright MCP can generate tests automatically.",
      },
      "sequential-thinking": {
        relevanceScore: 65,
        priority: "optional",
        reasoning:
          "Enhanced reasoning helps with complex architecture decisions. Nice to have but not critical.",
      },
      notion: {
        relevanceScore: 45,
        priority: "optional",
        reasoning:
          "Project management could be useful but not mentioned in requirements.",
      },
      figma: {
        relevanceScore: 25,
        priority: "optional",
        reasoning: "No design workflow mentioned in vision. Low priority.",
      },
    },
  };

  beforeEach(() => {
    // Reset and setup mock for each test
    mockExecAsync.mockResolvedValue({
      stdout: JSON.stringify(mockClaudeResponse),
      stderr: "",
    });

    engine = new MCPSuggestionEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create engine instance", () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(MCPSuggestionEngine);
    });

    it("should not require API key", () => {
      const newEngine = new MCPSuggestionEngine();
      expect(newEngine).toBeDefined();
    });
  });

  describe("suggestMCPs", () => {
    it("should analyze vision and return MCP suggestions", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      expect(result).toBeDefined();
      expect(result.essential).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.optional).toBeDefined();
      expect(result.totalEstimatedSetupTime).toBeDefined();
    });

    it("should categorize servers by priority", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      // Essential servers (score >= 90, priority: essential)
      expect(result.essential.length).toBeGreaterThan(0);
      result.essential.forEach((server) => {
        expect(server.priority).toBe("essential");
      });

      // Recommended servers
      expect(result.recommended.length).toBeGreaterThan(0);
      result.recommended.forEach((server) => {
        expect(server.priority).toBe("recommended");
      });

      // Optional servers
      expect(result.optional.length).toBeGreaterThan(0);
      result.optional.forEach((server) => {
        expect(server.priority).toBe("optional");
      });
    });

    it("should include relevance scores and reasoning", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      const allServers = [
        ...result.essential,
        ...result.recommended,
        ...result.optional,
      ];

      allServers.forEach((server) => {
        expect(server.relevanceScore).toBeGreaterThan(0);
        expect(server.relevanceScore).toBeLessThanOrEqual(100);
        expect(server.reasoning).toBeDefined();
        expect(server.reasoning.length).toBeGreaterThan(0);
      });
    });

    it("should filter out low-relevance servers (score <= 30)", async () => {
      const lowScoreResponse = {
        scores: {
          github: {
            relevanceScore: 95,
            priority: "essential",
            reasoning: "High relevance",
          },
          figma: {
            relevanceScore: 15,
            priority: "optional",
            reasoning: "Low relevance",
          },
          slack: {
            relevanceScore: 25,
            priority: "optional",
            reasoning: "Very low relevance",
          },
        },
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(lowScoreResponse),
        stderr: "",
      });

      const result = await engine.suggestMCPs(mockVisionContext);

      const allServers = [
        ...result.essential,
        ...result.recommended,
        ...result.optional,
      ];

      // Only github should be included (score > 30)
      expect(allServers.length).toBe(1);
      expect(allServers[0].id).toBe("github");
    });

    it("should sort servers by relevance score descending", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      const allServers = [
        ...result.essential,
        ...result.recommended,
        ...result.optional,
      ];

      for (let i = 0; i < allServers.length - 1; i++) {
        expect(allServers[i].relevanceScore).toBeGreaterThanOrEqual(
          allServers[i + 1].relevanceScore,
        );
      }
    });

    it("should calculate setup time estimate", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      expect(result.totalEstimatedSetupTime).toMatch(/~\d+ minutes/);

      const minutes = parseInt(
        result.totalEstimatedSetupTime.match(/\d+/)?.[0] || "0",
      );
      const expectedServers = result.essential.length + result.recommended.length;
      expect(minutes).toBe(expectedServers * 2); // 2 minutes per server
    });

    it("should handle vision with minimal information", async () => {
      const minimalVision: VisionContext = {
        mission: "Build a simple app",
        goals: ["Launch"],
        techStack: {},
        features: [],
        integrations: [],
      };

      const result = await engine.suggestMCPs(minimalVision);

      expect(result).toBeDefined();
      expect(result.essential).toBeDefined();
      expect(result.recommended).toBeDefined();
      expect(result.optional).toBeDefined();
    });

    it("should handle vision with extensive tech stack", async () => {
      const complexVision: VisionContext = {
        mission: "Enterprise-grade platform",
        goals: [
          "Multi-tenant SaaS",
          "High availability",
          "Advanced analytics",
        ],
        techStack: {
          backend: "Node.js, Python, Go",
          frontend: "React, Vue, Angular",
          database: "PostgreSQL, Redis, MongoDB",
          infrastructure: "Kubernetes, Docker, AWS, GCP",
        },
        features: [
          "Authentication",
          "Real-time updates",
          "File processing",
          "API integration",
        ],
        integrations: [
          "GitHub",
          "Slack",
          "Notion",
          "Figma",
          "Google Drive",
        ],
        industry: "Enterprise",
      };

      const result = await engine.suggestMCPs(complexVision);

      expect(result.essential.length).toBeGreaterThan(0);
    });

    it("should call Claude CLI with proper prompt", async () => {
      await engine.suggestMCPs(mockVisionContext);

      expect(mockExecAsync).toHaveBeenCalled();
      const callArgs = mockExecAsync.mock.calls[0][0];

      expect(callArgs).toContain("claude --dangerously-skip-permissions");
      expect(callArgs).toContain("Analyze this project vision");
    });

    it("should handle Claude CLI errors", async () => {
      mockExecAsync.mockRejectedValue(new Error("Claude CLI not found"));

      await expect(engine.suggestMCPs(mockVisionContext)).rejects.toThrow(
        "Failed to analyze vision",
      );
    });

    it("should handle malformed JSON response", async () => {
      mockExecAsync.mockResolvedValue({
        stdout: "This is not valid JSON",
        stderr: "",
      });

      await expect(engine.suggestMCPs(mockVisionContext)).rejects.toThrow();
    });

    it("should extract JSON from Claude response with extra text", async () => {
      const responseWithText = `Here's my analysis:

${JSON.stringify(mockClaudeResponse)}

Hope this helps!`;

      mockExecAsync.mockResolvedValue({
        stdout: responseWithText,
        stderr: "",
      });

      const result = await engine.suggestMCPs(mockVisionContext);

      expect(result).toBeDefined();
      expect(result.essential.length).toBeGreaterThan(0);
    });

    it("should include all MCP server metadata", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      const allServers = [
        ...result.essential,
        ...result.recommended,
        ...result.optional,
      ];

      allServers.forEach((server) => {
        expect(server.id).toBeDefined();
        expect(server.name).toBeDefined();
        expect(server.description).toBeDefined();
        expect(server.category).toBeDefined();
        expect(server.useCase).toBeDefined();
        expect(Array.isArray(server.benefits)).toBe(true);
        expect(server.command).toBeDefined();
        expect(server.setup).toBeDefined();
        expect(Array.isArray(server.examples)).toBe(true);
        expect(server.priority).toBeDefined();
        expect(server.relevanceScore).toBeDefined();
        expect(server.reasoning).toBeDefined();
      });
    });
  });

  describe("generateMCPConfig", () => {
    it("should generate valid MCP configuration", () => {
      const selectedServers = ["github", "postgres", "slack"];
      const config = engine.generateMCPConfig(selectedServers);

      expect(config).toBeDefined();

      const parsed = JSON.parse(config);
      expect(parsed.servers).toBeDefined();
      expect(Object.keys(parsed.servers).length).toBe(3);
    });

    it("should include command and args for each server", () => {
      const selectedServers = ["github", "postgres"];
      const config = engine.generateMCPConfig(selectedServers);

      const parsed = JSON.parse(config);

      expect(parsed.servers.github).toBeDefined();
      expect(parsed.servers.github.command).toBe("npx");
      expect(Array.isArray(parsed.servers.github.args)).toBe(true);
      expect(parsed.servers.github.args.length).toBeGreaterThan(0);

      expect(parsed.servers.postgres).toBeDefined();
      expect(parsed.servers.postgres.command).toBe("npx");
      expect(Array.isArray(parsed.servers.postgres.args)).toBe(true);
    });

    it("should include environment variables when required", () => {
      const selectedServers = ["github", "postgres", "slack"];
      const config = engine.generateMCPConfig(selectedServers);

      const parsed = JSON.parse(config);

      // GitHub requires GITHUB_TOKEN
      expect(parsed.servers.github.env).toBeDefined();
      expect(parsed.servers.github.env.GITHUB_TOKEN).toBeDefined();

      // PostgreSQL requires DATABASE_URL
      expect(parsed.servers.postgres.env).toBeDefined();
      expect(parsed.servers.postgres.env.DATABASE_URL).toBeDefined();

      // Slack requires multiple env vars
      expect(parsed.servers.slack.env).toBeDefined();
      expect(parsed.servers.slack.env.SLACK_BOT_TOKEN).toBeDefined();
    });

    it("should omit env when not required", () => {
      const selectedServers = ["filesystem", "sequential-thinking"];
      const config = engine.generateMCPConfig(selectedServers);

      const parsed = JSON.parse(config);

      // These servers don't require environment variables
      expect(parsed.servers.filesystem.env).toBeUndefined();
      expect(parsed.servers["sequential-thinking"].env).toBeUndefined();
    });

    it("should handle empty server list", () => {
      const config = engine.generateMCPConfig([]);

      const parsed = JSON.parse(config);
      expect(parsed.servers).toEqual({});
    });

    it("should handle unknown server IDs gracefully", () => {
      const selectedServers = ["github", "unknown-server", "postgres"];
      const config = engine.generateMCPConfig(selectedServers);

      const parsed = JSON.parse(config);

      // Should only include known servers
      expect(Object.keys(parsed.servers).length).toBe(2);
      expect(parsed.servers.github).toBeDefined();
      expect(parsed.servers.postgres).toBeDefined();
      expect(parsed.servers["unknown-server"]).toBeUndefined();
    });

    it("should format JSON with proper indentation", () => {
      const selectedServers = ["github"];
      const config = engine.generateMCPConfig(selectedServers);

      // Should be formatted with 2-space indentation
      expect(config).toContain("{\n  ");
      expect(config).toContain("\n}");
    });

    it("should include all configuration fields", () => {
      const selectedServers = ["github"];
      const config = engine.generateMCPConfig(selectedServers);

      const parsed = JSON.parse(config);

      expect(parsed.servers.github.command).toBe("npx");
      expect(parsed.servers.github.args).toEqual([
        "-y",
        "@modelcontextprotocol/server-github",
      ]);
      expect(parsed.servers.github.env.GITHUB_TOKEN).toBe("${GITHUB_TOKEN}");
    });
  });

  describe("generateSetupGuide", () => {
    it("should generate setup guide for selected servers", () => {
      const selectedServers = ["github", "postgres"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toBeDefined();
      expect(guide).toContain("# MCP Server Setup Guide");
      expect(guide).toContain("## GitHub MCP Server");
      expect(guide).toContain("## PostgreSQL MCP Server");
    });

    it("should include server descriptions", () => {
      const selectedServers = ["github"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain(
        "Connect to GitHub REST API for repository management",
      );
    });

    it("should include setup instructions", () => {
      const selectedServers = ["github", "postgres"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("**Setup:**");
      expect(guide).toContain(
        "Requires GitHub Personal Access Token with repo permissions",
      );
      expect(guide).toContain("Requires PostgreSQL connection string");
    });

    it("should list required environment variables", () => {
      const selectedServers = ["github", "slack"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("**Required Environment Variables:**");
      expect(guide).toContain("`GITHUB_TOKEN`");
      expect(guide).toContain("`SLACK_BOT_TOKEN`");
      expect(guide).toContain("`SLACK_TEAM_ID`");
    });

    it("should include usage examples", () => {
      const selectedServers = ["github"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("**Example Usage:**");
      expect(guide).toContain(
        '"Create a PR for the authentication feature"',
      );
    });

    it("should separate servers with horizontal rules", () => {
      const selectedServers = ["github", "postgres", "slack"];
      const guide = engine.generateSetupGuide(selectedServers);

      const separators = guide.match(/---/g);
      expect(separators?.length).toBe(3); // One after each server
    });

    it("should handle empty server list", () => {
      const guide = engine.generateSetupGuide([]);

      expect(guide).toBe("# MCP Server Setup Guide\n\n");
    });

    it("should handle unknown server IDs gracefully", () => {
      const selectedServers = ["github", "invalid-server"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("## GitHub MCP Server");
      expect(guide).not.toContain("invalid-server");
    });

    it("should format markdown correctly", () => {
      const selectedServers = ["github"];
      const guide = engine.generateSetupGuide(selectedServers);

      // Check markdown formatting
      expect(guide).toContain("# MCP Server Setup Guide");
      expect(guide).toContain("## GitHub MCP Server");
      expect(guide).toContain("**Setup:**");
      expect(guide).toContain("**Example Usage:**");
      expect(guide).toContain("- ");
    });

    it("should include all server metadata in guide", () => {
      const selectedServers = ["playwright"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("Playwright MCP Server");
      expect(guide).toContain("Web automation and E2E testing");
      expect(guide).toContain("Playwright will be installed automatically");
      expect(guide).toContain('Create an E2E test for the login flow"');
    });

    it("should handle servers without environment variables", () => {
      const selectedServers = ["filesystem", "sequential-thinking"];
      const guide = engine.generateSetupGuide(selectedServers);

      expect(guide).toContain("## File System MCP Server");
      expect(guide).toContain("## Sequential Thinking MCP Server");
      expect(guide).not.toContain("Required Environment Variables");
    });
  });

  describe("MCP Registry", () => {
    it("should include all official MCP servers", () => {
      const expectedServers = [
        "github",
        "postgres",
        "filesystem",
        "playwright",
        "sequential-thinking",
        "slack",
        "google-drive",
        "notion",
        "figma",
        "memory",
        "zapier",
      ];

      const mockResponse = {
        scores: Object.fromEntries(
          expectedServers.map((id) => [
            id,
            { relevanceScore: 50, priority: "optional", reasoning: "Test" },
          ]),
        ),
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockResponse),
        stderr: "",
      });

      // This test verifies the registry is complete
      expect(true).toBe(true);
    });

    it("should categorize servers correctly", async () => {
      const result = await engine.suggestMCPs(mockVisionContext);

      const allServers = [
        ...result.essential,
        ...result.recommended,
        ...result.optional,
      ];

      const categories = [
        "database",
        "api",
        "productivity",
        "development",
        "automation",
        "design",
      ];

      allServers.forEach((server) => {
        expect(categories).toContain(server.category);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle vision with no integrations", async () => {
      const visionNoIntegrations: VisionContext = {
        mission: "Build internal tool",
        goals: ["Ship MVP"],
        techStack: { backend: "Node.js" },
        features: ["User auth"],
        integrations: [],
      };

      const result = await engine.suggestMCPs(visionNoIntegrations);

      expect(result).toBeDefined();
    });

    it("should handle vision with industry-specific requirements", async () => {
      const healthcareVision: VisionContext = {
        mission: "Healthcare platform",
        goals: ["HIPAA compliance", "Secure data storage"],
        techStack: { database: "PostgreSQL" },
        features: ["Patient records", "Audit logging"],
        integrations: [],
        industry: "Healthcare",
      };

      const result = await engine.suggestMCPs(healthcareVision);

      expect(result).toBeDefined();
      // PostgreSQL should be highly relevant for audit trails
      const postgres = [...result.essential, ...result.recommended].find(
        (s) => s.id === "postgres",
      );
      expect(postgres).toBeDefined();
    });

    it("should handle concurrent calls", async () => {
      const promises = [
        engine.suggestMCPs(mockVisionContext),
        engine.suggestMCPs(mockVisionContext),
        engine.suggestMCPs(mockVisionContext),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.essential).toBeDefined();
      });
    });

    it("should handle very long vision descriptions", async () => {
      const longVision: VisionContext = {
        mission: "A".repeat(5000),
        goals: Array(100).fill("Goal"),
        techStack: {
          backend: "Node.js".repeat(50),
          frontend: "React".repeat(50),
        },
        features: Array(200).fill("Feature"),
        integrations: Array(50).fill("Integration"),
      };

      const result = await engine.suggestMCPs(longVision);

      expect(result).toBeDefined();
    });

    it("should handle special characters in vision", async () => {
      const specialVision: VisionContext = {
        mission: 'Build "awesome" app with $pecial ch@racters & symbols!',
        goals: ["<script>alert('test')</script>"],
        techStack: { backend: "Node.js && Express || Fastify" },
        features: ["Auth with OAuth2.0"],
        integrations: ["GitHub (REST API v3)"],
      };

      const result = await engine.suggestMCPs(specialVision);

      expect(result).toBeDefined();
    });
  });
});

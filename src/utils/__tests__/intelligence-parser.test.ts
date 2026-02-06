/**
 * Intelligence Parser Tests
 * Unit tests for intelligence content parser
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs before importing the module
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("os", () => ({
  homedir: vi.fn(),
}));

import {
  parseMemoryMd,
  parseGovernanceJson,
  getAllIntelligenceCards,
  getCompactIntelligenceCards,
  type IntelligenceCard,
  type IntelligenceCardBudget,
} from "../intelligence-parser";
import * as fs from "fs/promises";
import * as os from "os";

describe("Intelligence Parser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseMemoryMd", () => {
    it("should parse simple markdown sections", async () => {
      const content = `
## Rule 1: Test Rule
This is a test rule that must be followed.
Never do the wrong thing.

## Decision: Architecture Choice
We decided to use TypeScript for the project.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards).toHaveLength(2);
      expect(cards[0].category).toBe("rule");
      expect(cards[0].priority).toBe("critical");
      expect(cards[1].category).toBe("decision");
      expect(cards[1].priority).toBe("high");
    });

    it("should extract tags from content", async () => {
      const content = `
## Critical Rule
This is about claude code and nxtg-forge memory system on 2026-02-05.
Uses typescript for agents and governance.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].tags).toContain("critical");
      expect(cards[0].tags).toContain("rule");
      expect(cards[0].tags).toContain("2026-02-05");
      expect(cards[0].tags).toContain("claude-code");
      expect(cards[0].tags).toContain("nxtg-forge");
      expect(cards[0].tags).toContain("typescript");
      expect(cards[0].tags).toContain("agents");
      expect(cards[0].tags).toContain("memory");
      expect(cards[0].tags).toContain("governance");
    });

    it("should skip sections with insufficient content", async () => {
      const content = `
## Valid Section
This section has enough content to be included in the cards.

## Too Short
Short.

## Another Valid Section
This section also has sufficient content to meet the minimum requirement.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards).toHaveLength(2);
      expect(cards.every((c) => c.content.length >= 20)).toBe(true);
    });

    it("should handle file not found gracefully", async () => {
      const error: any = new Error("File not found");
      error.code = "ENOENT";
      (fs.readFile as any).mockRejectedValue(error);

      const cards = await parseMemoryMd("/nonexistent/MEMORY.md");

      expect(cards).toEqual([]);
    });

    it("should propagate other errors", async () => {
      const error = new Error("Permission denied");
      (fs.readFile as any).mockRejectedValue(error);

      await expect(parseMemoryMd("/path/to/MEMORY.md")).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should distill long content", async () => {
      const longContent = `
## Long Section
This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence. This is the fifth sentence. And this continues for many more sentences that should be truncated to keep the distilled content manageable.
`;

      (fs.readFile as any).mockResolvedValue(longContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].content.split(". ").length).toBeLessThanOrEqual(4); // 3 sentences + period
    });

    it("should truncate very long sentences", async () => {
      const longSentence = "x".repeat(500);
      const content = `
## Section
${longSentence}
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].content.length).toBeLessThanOrEqual(250);
      expect(cards[0].content).toMatch(/\.\.\.$/);
    });

    it("should handle heading levels", async () => {
      const content = `
## Level 2 Heading
Content for level 2.

### Level 3 Heading
Content for level 3.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards).toHaveLength(2);
    });

    it("should generate unique IDs", async () => {
      const content = `
## Section 1
Content for section 1.

## Section 2
Content for section 2.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      const ids = cards.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should set lastUpdated from file mtime", async () => {
      const content = `
## Test Section
This is test content.
`;
      const testDate = new Date("2026-02-05T10:30:00Z");

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: testDate,
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].lastUpdated).toBe(testDate.toISOString());
    });

    it("should estimate tokens correctly", async () => {
      const content = `
## Token Test
This section has exactly ten words in it for testing.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      // 10 words * 1.3 = 13 tokens (rounded up)
      expect(cards[0].estimatedTokens).toBeGreaterThan(0);
      expect(cards[0].estimatedTokens).toBeLessThan(50);
    });
  });

  describe("parseGovernanceJson", () => {
    it("should parse constitution directive", async () => {
      const governance = {
        constitution: {
          directive: "Dog-Food or Die: Use Claude Code native capabilities",
          updatedAt: "2026-01-15T00:00:00Z",
        },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      expect(cards).toHaveLength(1);
      expect(cards[0].title).toBe("Constitution Directive");
      expect(cards[0].category).toBe("architecture");
      expect(cards[0].priority).toBe("critical");
      expect(cards[0].tags).toContain("constitution");
    });

    it("should parse vision statement", async () => {
      const governance = {
        constitution: {
          vision: [
            "Be the best development tool",
            "Maximize developer productivity",
            "Enable parallel agent workflows",
          ],
          updatedAt: "2026-01-15T00:00:00Z",
        },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      expect(cards[0].title).toBe("Vision Statement");
      expect(cards[0].content).toContain("Be the best development tool");
      expect(cards[0].tags).toContain("vision");
      expect(cards[0].priority).toBe("high");
    });

    it("should parse blocked workstreams", async () => {
      const governance = {
        constitution: {
          updatedAt: "2026-01-15T00:00:00Z",
        },
        workstreams: [
          {
            id: "ws-1",
            name: "Feature X",
            description: "Blocked on external dependency",
            status: "blocked",
          },
          {
            id: "ws-2",
            name: "Feature Y",
            description: "In progress",
            status: "active",
          },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      const blockedCards = cards.filter((c) => c.tags.includes("blocked"));
      expect(blockedCards).toHaveLength(1);
      expect(blockedCards[0].title).toBe("BLOCKED: Feature X");
      expect(blockedCards[0].priority).toBe("critical");
    });

    it("should parse critical sentinel logs", async () => {
      const governance = {
        constitution: {
          updatedAt: "2026-01-15T00:00:00Z",
        },
        sentinelLog: [
          {
            id: "log-1",
            message: "Critical error detected",
            severity: "critical",
            timestamp: Date.parse("2026-01-15"),
          },
          {
            id: "log-2",
            message: "Warning message",
            severity: "warning",
            timestamp: Date.parse("2026-01-16"),
          },
          {
            id: "log-3",
            message: "Another critical error",
            severity: "critical",
            timestamp: Date.parse("2026-01-17"),
          },
        ],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      const sentinelCards = cards.filter((c) => c.tags.includes("sentinel"));
      expect(sentinelCards).toHaveLength(2); // Only critical ones
      expect(sentinelCards[0].category).toBe("rule");
    });

    it("should limit sentinel logs to last 5", async () => {
      const sentinelLog = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        message: `Critical message ${i}`,
        severity: "critical",
        timestamp: Date.parse("2026-01-15") + i * 1000,
      }));

      const governance = {
        constitution: { updatedAt: "2026-01-15T00:00:00Z" },
        sentinelLog,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      const sentinelCards = cards.filter((c) => c.tags.includes("sentinel"));
      expect(sentinelCards.length).toBeLessThanOrEqual(5);
    });

    it("should handle missing governance file", async () => {
      const error: any = new Error("File not found");
      error.code = "ENOENT";
      (fs.readFile as any).mockRejectedValue(error);

      const cards = await parseGovernanceJson("/nonexistent/governance.json");

      expect(cards).toEqual([]);
    });

    it("should handle invalid JSON", async () => {
      (fs.readFile as any).mockResolvedValue("{ invalid json }");

      await expect(
        parseGovernanceJson("/path/to/governance.json")
      ).rejects.toThrow();
    });

    it("should use current date if updatedAt missing", async () => {
      const governance = {
        constitution: {
          directive: "Test directive",
        },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(governance));

      const cards = await parseGovernanceJson("/path/to/governance.json");

      expect(cards[0].lastUpdated).toBeDefined();
      const cardDate = new Date(cards[0].lastUpdated);
      const now = new Date();
      const diff = now.getTime() - cardDate.getTime();
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });

    it("should handle empty governance object", async () => {
      (fs.readFile as any).mockResolvedValue("{}");

      const cards = await parseGovernanceJson("/path/to/governance.json");

      expect(cards).toEqual([]);
    });
  });

  describe("getAllIntelligenceCards", () => {
    beforeEach(() => {
      (os.homedir as any).mockReturnValue("/home/test");
    });

    it("should combine cards from all sources", async () => {
      const memoryContent = `
## Test Rule
This is a test rule.
`;

      const governance = {
        constitution: {
          directive: "Test directive",
          updatedAt: "2026-01-15T00:00:00Z",
        },
      };

      (fs.readFile as any)
        .mockResolvedValueOnce(memoryContent)
        .mockResolvedValueOnce(JSON.stringify(governance));

      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getAllIntelligenceCards("/project/root");

      expect(budget.cards.length).toBeGreaterThan(0);
      expect(budget.cardCount).toBe(budget.cards.length);
    });

    it("should sort cards by priority", async () => {
      const memoryContent = `
## Pattern
This is a pattern (medium priority).

## Critical Rule
This is critical.

## Discovery
This is a discovery.

## Decision
This is a decision (high priority).
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getAllIntelligenceCards("/project/root");

      // Should be sorted: critical, high, medium, low
      const priorities = budget.cards.map((c) => c.priority);
      const sortedPriorities = [...priorities].sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a] - order[b];
      });

      expect(priorities).toEqual(sortedPriorities);
    });

    it("should calculate total tokens", async () => {
      const memoryContent = `
## Section 1
This has ten words in it for testing purposes.

## Section 2
This also has ten words for token calculation testing.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getAllIntelligenceCards("/project/root");

      expect(budget.totalTokens).toBeGreaterThan(0);
      const manualTotal = budget.cards.reduce(
        (sum, c) => sum + c.estimatedTokens,
        0
      );
      expect(budget.totalTokens).toBe(manualTotal);
    });

    it("should count categories", async () => {
      const memoryContent = `
## Rule: First Rule
This is rule 1 that must be followed.

## Rule: Second Rule
This is rule 2 that never should be broken.

## Decision: Important Decision
This is a decision we made about the project.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getAllIntelligenceCards("/project/root");

      expect(budget.categoryCounts.rule).toBe(2);
      expect(budget.categoryCounts.decision).toBe(1);
    });

    it("should count priorities", async () => {
      const memoryContent = `
## Critical Rule
Critical content.

## Must Follow
Must follow this rule.

## Discovery
Some discovery.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getAllIntelligenceCards("/project/root");

      expect(budget.priorityCounts.critical).toBeGreaterThan(0);
    });

    it("should handle empty sources", async () => {
      const error: any = new Error("File not found");
      error.code = "ENOENT";
      (fs.readFile as any).mockRejectedValue(error);

      const budget = await getAllIntelligenceCards("/project/root");

      expect(budget.cards).toEqual([]);
      expect(budget.totalTokens).toBe(0);
      expect(budget.cardCount).toBe(0);
    });
  });

  describe("getCompactIntelligenceCards", () => {
    beforeEach(() => {
      (os.homedir as any).mockReturnValue("/home/test");
    });

    it("should filter to critical and high priority only", async () => {
      const memoryContent = `
## Critical Rule
This is critical.

## Pattern
This is a pattern.

## Decision
This is a decision.

## Discovery
This is a discovery.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const budget = await getCompactIntelligenceCards("/project/root");

      const priorities = budget.cards.map((c) => c.priority);
      expect(priorities.every((p) => p === "critical" || p === "high")).toBe(
        true
      );
    });

    it("should recalculate statistics for filtered cards", async () => {
      const memoryContent = `
## Critical Rule
This is critical.

## Pattern
This is a pattern (should be filtered).

## Must Follow
This is another critical rule.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const compact = await getCompactIntelligenceCards("/project/root");

      expect(compact.cardCount).toBe(compact.cards.length);
      expect(compact.totalTokens).toBe(
        compact.cards.reduce((sum, c) => sum + c.estimatedTokens, 0)
      );
    });

    it("should have fewer or equal cards than full budget", async () => {
      const memoryContent = `
## Critical Rule
This is critical.

## Pattern
This is a pattern.

## Decision
This is a decision.
`;

      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const full = await getAllIntelligenceCards("/project/root");

      // Reset mocks for second call
      (fs.readFile as any).mockResolvedValueOnce(memoryContent);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const compact = await getCompactIntelligenceCards("/project/root");

      expect(compact.cardCount).toBeLessThanOrEqual(full.cardCount);
      expect(compact.totalTokens).toBeLessThanOrEqual(full.totalTokens);
    });
  });

  describe("Category determination", () => {
    it("should identify rules", async () => {
      const content = `
## Rule: Always validate
Must validate all inputs. Never skip validation.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].category).toBe("rule");
    });

    it("should identify decisions", async () => {
      const content = `
## Decision: Use TypeScript
We decided to use TypeScript for this choice.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].category).toBe("decision");
    });

    it("should identify patterns", async () => {
      const content = `
## Pattern: Error Handling
This describes a common pattern we use.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].category).toBe("pattern");
    });

    it("should identify discoveries", async () => {
      const content = `
## Discovery: Performance Issue
We discovered that the cache was causing slowdowns.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].category).toBe("discovery");
    });

    it("should identify architecture", async () => {
      const content = `
## Architecture: Microservices
Our architecture is based on microservices pattern.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].category).toBe("architecture");
    });
  });

  describe("Priority determination", () => {
    it("should mark blocking issues as critical", async () => {
      const content = `
## Test Section
This is blocking progress on the entire project.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].priority).toBe("critical");
    });

    it("should mark must rules as critical", async () => {
      const content = `
## Important Rule
You must follow this rule at all times.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].priority).toBe("critical");
    });

    it("should default to low for generic sections", async () => {
      const content = `
## Some Information
This is just some general information about the project.
`;

      (fs.readFile as any).mockResolvedValue(content);
      (fs.stat as any).mockResolvedValue({
        mtime: new Date("2026-01-15"),
      });

      const cards = await parseMemoryMd("/path/to/MEMORY.md");

      expect(cards[0].priority).toBe("low");
    });
  });
});

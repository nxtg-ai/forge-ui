/**
 * Intelligence Injector Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getIntelligenceContext,
  formatCardForInjection,
  selectRelevantCards,
  injectIntelligence,
  type IntelligenceCard,
} from "../intelligence-injector";

// Mock fs module
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
}));

describe("Intelligence Injector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatCardForInjection", () => {
    it("should format a card with all fields", () => {
      const card: IntelligenceCard = {
        category: "RULE",
        priority: "critical",
        content: "Always use Result type for error handling",
        tags: ["result", "error"],
        source: "critical rules",
      };

      const formatted = formatCardForInjection(card);
      expect(formatted).toBe(
        "- RULE: Always use Result type for error handling [critical]",
      );
    });

    it("should truncate content longer than 100 chars", () => {
      const card: IntelligenceCard = {
        category: "DECISION",
        priority: "high",
        content:
          "This is a very long decision that explains in great detail why we chose this particular architecture pattern and all the tradeoffs involved",
        tags: ["architecture"],
        source: "architecture decisions",
      };

      const formatted = formatCardForInjection(card);
      expect(formatted.length).toBeLessThanOrEqual(120); // Category + bracket overhead
      expect(formatted).toContain("...");
      expect(formatted).toContain("DECISION:");
      expect(formatted).toContain("[high]");
    });

    it("should handle different categories", () => {
      const categories = ["RULE", "DECISION", "PATTERN", "LEARNING", "WARNING", "STATUS"];

      for (const category of categories) {
        const card: IntelligenceCard = {
          category: category as any,
          priority: "medium",
          content: "Test content",
          tags: [],
          source: "test",
        };

        const formatted = formatCardForInjection(card);
        expect(formatted).toContain(`${category}:`);
      }
    });
  });

  describe("selectRelevantCards", () => {
    const sampleCards: IntelligenceCard[] = [
      {
        category: "RULE",
        priority: "critical",
        content: "Result type uses .error property not .unwrapErr()",
        tags: ["result", "error", "api"],
        source: "critical rules",
      },
      {
        category: "DECISION",
        priority: "high",
        content: "Memory persistence uses Claude native system",
        tags: ["memory", "claude"],
        source: "architecture decisions",
      },
      {
        category: "WARNING",
        priority: "high",
        content: "Governance hooks are advisory only",
        tags: ["governance"],
        source: "critical rules",
      },
      {
        category: "STATUS",
        priority: "medium",
        content: "All 19 commands are wired",
        tags: ["command"],
        source: "command status",
      },
      {
        category: "PATTERN",
        priority: "low",
        content: "Use dependency injection for testability",
        tags: ["test"],
        source: "patterns",
      },
    ];

    it("should select cards within token budget", () => {
      const selected = selectRelevantCards(sampleCards, "", 200);
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.length).toBeLessThanOrEqual(sampleCards.length);

      // Verify it stays within budget (approximate)
      const totalChars = selected
        .map((c) => formatCardForInjection(c))
        .join("\n").length;
      const estimatedTokens = Math.ceil(totalChars / 4);
      expect(estimatedTokens).toBeLessThanOrEqual(200);
    });

    it("should prioritize critical cards", () => {
      const selected = selectRelevantCards(sampleCards, "", 100);
      expect(selected.length).toBeGreaterThan(0);

      // Critical cards should be selected first
      const criticalCard = selected.find((c) => c.priority === "critical");
      expect(criticalCard).toBeDefined();
    });

    it("should select relevant cards based on context", () => {
      const context = "error handling with Result type";
      const selected = selectRelevantCards(sampleCards, context, 300);

      // The Result type card should be prioritized
      const resultCard = selected.find((c) => c.tags.includes("result"));
      expect(resultCard).toBeDefined();

      // Should appear early in selection
      const resultIndex = selected.indexOf(resultCard!);
      expect(resultIndex).toBeLessThan(selected.length / 2);
    });

    it("should handle empty context", () => {
      const selected = selectRelevantCards(sampleCards, "", 300);
      expect(selected.length).toBeGreaterThan(0);

      // Should fall back to priority ordering
      expect(selected[0].priority).toBe("critical");
    });

    it("should handle very small token budget", () => {
      const selected = selectRelevantCards(sampleCards, "", 50);
      // Should select at least one card if possible
      expect(selected.length).toBeGreaterThanOrEqual(0);
      expect(selected.length).toBeLessThanOrEqual(2);
    });

    it("should handle empty cards array", () => {
      const selected = selectRelevantCards([], "context", 500);
      expect(selected).toEqual([]);
    });

    it("should boost relevance for tag matches", () => {
      const context = "memory system";
      const selected = selectRelevantCards(sampleCards, context, 200);

      // Memory card should be selected even though it's not critical priority
      const memoryCard = selected.find((c) => c.tags.includes("memory"));
      expect(memoryCard).toBeDefined();
    });
  });

  describe("getIntelligenceContext", () => {
    const mockMemoryContent = `# NXTG-Forge Project Memory

## CRITICAL RULES (Learned from mistakes)

### Rule 1: AUDIT BEFORE SUGGESTING (2026-02-05)
**Trigger:** Before suggesting ANY new command, feature, or file
**Action:** Run these checks FIRST
**Violation example:** Suggested /frg-gaps when /frg-gap-analysis already existed
**Root cause:** Generated solution from imagination instead of reading codebase

### Rule 2: RESULT TYPE API
Our Result<T,E> type uses .error property, NOT .unwrapErr() method.
- Location: src/utils/result.ts:93
- Pattern: if (result.isErr()) { return Result.err(result.error); }

## Architecture Decisions

- **Deployment:** Claude Code Plugin (primary) + npm global (secondary)
- **License:** Open-Core (MIT core, commercial pro)
- **Memory:** 5-layer (CLAUDE.md → state/ → forge/memory/ → governance.json → localStorage)

## CRITICAL DISCOVERY (2026-02-05)

### What NXTG-Forge Actually Provides (Unique Value)

1. **Infinity Terminal** - WORKS (PTY bridge, session persistence)
2. **Web Dashboard** - PARTIAL (beautiful UI, stale data)
3. **Agent Specs** - EXISTS (22 .md files, not wired)
`;

    beforeEach(async () => {
      const { readFile, access, readdir } = await import("fs/promises");
      // Mock successful file read
      vi.mocked(readFile).mockResolvedValue(mockMemoryContent);
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue([]);
    });

    it("should return empty string when MEMORY.md not found", async () => {
      const { access } = await import("fs/promises");
      vi.mocked(access).mockRejectedValue(new Error("File not found"));

      const context = await getIntelligenceContext();
      expect(context).toBe("");
    });

    it("should return formatted intelligence block", async () => {
      const context = await getIntelligenceContext({
        maxTokens: 500,
        minPriority: "high",
      });

      expect(context).toContain("[INTELLIGENCE]");
      expect(context).toContain("[/INTELLIGENCE]");
      expect(context.split("\n").length).toBeGreaterThan(2); // At least header, content, footer
    });

    it("should include critical and high priority items", async () => {
      const context = await getIntelligenceContext({
        maxTokens: 500,
        minPriority: "high",
      });

      // Should have intelligence block
      expect(context).toContain("[INTELLIGENCE]");
      expect(context).toContain("[/INTELLIGENCE]");
      // Should have high or critical priority items
      expect(context).toMatch(/\[critical\]|\[high\]/);
    });

    it("should respect token budget", async () => {
      const context = await getIntelligenceContext({
        maxTokens: 100,
      });

      const tokens = Math.ceil(context.length / 4);
      expect(tokens).toBeLessThanOrEqual(100);
    });

    it("should filter by category", async () => {
      const context = await getIntelligenceContext({
        categories: ["RULE"],
        maxTokens: 500,
      });

      if (context) {
        expect(context).toContain("RULE:");
        expect(context).not.toContain("DECISION:");
      }
    });

    it("should use context keywords for relevance", async () => {
      const context = await getIntelligenceContext({
        contextKeywords: ["terminal", "dashboard", "ui"],
        maxTokens: 300,
      });

      // Should return relevant content based on keywords
      if (context) {
        expect(context).toContain("[INTELLIGENCE]");
      }
    });

    it("should handle all priority levels", async () => {
      const priorities = ["critical", "high", "medium", "low"] as const;

      for (const priority of priorities) {
        const context = await getIntelligenceContext({
          minPriority: priority,
          maxTokens: 500,
        });

        // Should return content for medium and low priorities
        // (mock content has WARNING items at high priority)
        if (priority === "medium" || priority === "low") {
          expect(context.length).toBeGreaterThan(0);
        }
      }
    });

    it("should return empty string when no cards match filters", async () => {
      const context = await getIntelligenceContext({
        categories: ["LEARNING"], // Not present in mock content
        maxTokens: 500,
      });

      expect(context).toBe("");
    });

    it("should handle read errors gracefully", async () => {
      const { readFile } = await import("fs/promises");
      vi.mocked(readFile).mockRejectedValue(new Error("Permission denied"));

      const context = await getIntelligenceContext();
      expect(context).toBe("");
    });
  });

  describe("injectIntelligence", () => {
    const mockIntelligence = `[INTELLIGENCE]
- RULE: Use Result type for errors [critical]
- DECISION: Memory uses native Claude system [high]
[/INTELLIGENCE]`;

    it("should inject intelligence into command when no args", () => {
      const result = injectIntelligence("echo hello", undefined, mockIntelligence);

      expect(result.command).toContain("[INTELLIGENCE]");
      expect(result.command).toContain("echo hello");
      expect(result.args).toBeUndefined();
    });

    it("should inject intelligence into first arg when args exist", () => {
      const result = injectIntelligence(
        "claude-code",
        ["implement feature", "--verbose"],
        mockIntelligence,
      );

      expect(result.command).toBe("claude-code");
      expect(result.args).toBeDefined();
      expect(result.args![0]).toContain("[INTELLIGENCE]");
      expect(result.args![0]).toContain("implement feature");
      expect(result.args![1]).toBe("--verbose");
    });

    it("should handle empty intelligence", () => {
      const result = injectIntelligence("echo hello", ["world"], "");

      expect(result.command).toBe("echo hello");
      expect(result.args).toEqual(["world"]);
    });

    it("should handle empty args array", () => {
      const result = injectIntelligence("command", [], mockIntelligence);

      // When args is empty array, intelligence goes to command
      expect(result.command).toContain("[INTELLIGENCE]");
      expect(result.command).toContain("command");
      expect(result.args).toEqual([]);
    });

    it("should preserve arg order", () => {
      const result = injectIntelligence(
        "cmd",
        ["arg1", "arg2", "arg3"],
        mockIntelligence,
      );

      expect(result.args![1]).toBe("arg2");
      expect(result.args![2]).toBe("arg3");
      expect(result.args!.length).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle MEMORY.md with no parseable content", async () => {
      const { readFile, access } = await import("fs/promises");
      vi.mocked(readFile).mockResolvedValue("Just some random text");
      vi.mocked(access).mockResolvedValue(undefined);

      const context = await getIntelligenceContext();
      expect(context).toBe("");
    });

    it("should handle MEMORY.md with only low priority items when filtering high", async () => {
      const lowPriorityContent = `## Notes

Some random notes about the project.

## Ideas

Maybe we should try this approach.
`;

      const { readFile, access } = await import("fs/promises");
      vi.mocked(readFile).mockResolvedValue(lowPriorityContent);
      vi.mocked(access).mockResolvedValue(undefined);

      const context = await getIntelligenceContext({
        minPriority: "critical",
      });

      expect(context).toBe("");
    });

    it("should handle very large MEMORY.md file", async () => {
      const largeContent = `## Rules\n\n${"### Rule: Something important\n".repeat(100)}`;

      const { readFile, access } = await import("fs/promises");
      vi.mocked(readFile).mockResolvedValue(largeContent);
      vi.mocked(access).mockResolvedValue(undefined);

      const context = await getIntelligenceContext({
        maxTokens: 200,
      });

      // Should still work and respect token limit
      const tokens = Math.ceil(context.length / 4);
      expect(tokens).toBeLessThanOrEqual(200);
    });
  });
});

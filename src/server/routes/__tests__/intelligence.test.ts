/**
 * Intelligence Routes Tests - Comprehensive test coverage for intelligence.ts
 *
 * Tests intelligence card API endpoints that parse MEMORY.md and governance.json
 * into structured intelligence cards for agent context injection.
 *
 * Test coverage includes:
 * - GET /api/memory/intelligence endpoint (full cards)
 * - GET /api/memory/intelligence/compact endpoint (critical/high priority only)
 * - Response structure validation
 * - Card structure and field validation
 * - Priority filtering (compact endpoint)
 * - Error handling and edge cases
 * - Timestamp consistency
 * - Token budget calculations
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import intelligenceRouter from "../intelligence";
import * as intelligenceParser from "../../../utils/intelligence-parser";

// Mock the intelligence parser module
vi.mock("../../../utils/intelligence-parser", () => ({
  getAllIntelligenceCards: vi.fn(),
  getCompactIntelligenceCards: vi.fn(),
}));

// Mock logger
vi.mock("../../../utils/logger", () => ({
  getLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe("Intelligence Routes", () => {
  let app: express.Application;

  const mockFullBudget: intelligenceParser.IntelligenceCardBudget = {
    cards: [
      {
        id: "rule-001",
        title: "Critical Test Rule",
        category: "rule",
        content: "Always test before claiming code works",
        priority: "critical",
        estimatedTokens: 150,
        source: "native-memory",
        tags: ["critical", "testing"],
        lastUpdated: "2026-02-07T12:00:00Z",
      },
      {
        id: "decision-001",
        title: "Architecture Decision",
        category: "decision",
        content: "Use MIT license for open source",
        priority: "high",
        estimatedTokens: 100,
        source: "governance",
        tags: ["architecture", "license"],
        lastUpdated: "2026-02-06T10:00:00Z",
      },
      {
        id: "pattern-001",
        title: "Low Priority Pattern",
        category: "pattern",
        content: "Code style preferences",
        priority: "low",
        estimatedTokens: 50,
        source: "project-state",
        tags: ["style"],
        lastUpdated: "2026-02-05T08:00:00Z",
      },
    ],
    totalTokens: 300,
    cardCount: 3,
    categoryCounts: {
      rule: 1,
      decision: 1,
      pattern: 1,
    },
    priorityCounts: {
      critical: 1,
      high: 1,
      low: 1,
    },
  };

  const mockCompactBudget: intelligenceParser.IntelligenceCardBudget = {
    cards: [
      {
        id: "rule-001",
        title: "Critical Test Rule",
        category: "rule",
        content: "Always test before claiming code works",
        priority: "critical",
        estimatedTokens: 150,
        source: "native-memory",
        tags: ["critical", "testing"],
        lastUpdated: "2026-02-07T12:00:00Z",
      },
      {
        id: "decision-001",
        title: "Architecture Decision",
        category: "decision",
        content: "Use MIT license for open source",
        priority: "high",
        estimatedTokens: 100,
        source: "governance",
        tags: ["architecture", "license"],
        lastUpdated: "2026-02-06T10:00:00Z",
      },
    ],
    totalTokens: 250,
    cardCount: 2,
    categoryCounts: {
      rule: 1,
      decision: 1,
    },
    priorityCounts: {
      critical: 1,
      high: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create express app with intelligence routes
    app = express();
    app.use(express.json());
    app.use("/api/memory", intelligenceRouter);

    // Set up default mocks
    vi.mocked(intelligenceParser.getAllIntelligenceCards).mockResolvedValue(mockFullBudget);
    vi.mocked(intelligenceParser.getCompactIntelligenceCards).mockResolvedValue(mockCompactBudget);
  });

  describe("GET /api/memory/intelligence", () => {
    it("returns successful response with correct structure", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200)
        .expect("Content-Type", /json/);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("timestamp");
      expect(typeof res.body.timestamp).toBe("string");
    });

    it("returns intelligence budget with all expected fields", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { data } = res.body;
      expect(data).toHaveProperty("cards");
      expect(data).toHaveProperty("totalTokens");
      expect(data).toHaveProperty("cardCount");
      expect(data).toHaveProperty("categoryCounts");
      expect(data).toHaveProperty("priorityCounts");
    });

    it("returns array of intelligence cards", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { cards } = res.body.data;
      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBe(3);
    });

    it("returns cards with complete structure", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { cards } = res.body.data;
      cards.forEach((card: any) => {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("title");
        expect(card).toHaveProperty("category");
        expect(card).toHaveProperty("content");
        expect(card).toHaveProperty("priority");
        expect(card).toHaveProperty("estimatedTokens");
        expect(card).toHaveProperty("source");
        expect(card).toHaveProperty("tags");
        expect(card).toHaveProperty("lastUpdated");

        // Validate types
        expect(typeof card.id).toBe("string");
        expect(typeof card.title).toBe("string");
        expect(typeof card.category).toBe("string");
        expect(typeof card.content).toBe("string");
        expect(typeof card.priority).toBe("string");
        expect(typeof card.estimatedTokens).toBe("number");
        expect(typeof card.source).toBe("string");
        expect(Array.isArray(card.tags)).toBe(true);
        expect(typeof card.lastUpdated).toBe("string");
      });
    });

    it("returns valid category values", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const validCategories = ["rule", "decision", "pattern", "discovery", "architecture"];
      const { cards } = res.body.data;

      cards.forEach((card: any) => {
        expect(validCategories).toContain(card.category);
      });
    });

    it("returns valid priority values", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const validPriorities = ["critical", "high", "medium", "low"];
      const { cards } = res.body.data;

      cards.forEach((card: any) => {
        expect(validPriorities).toContain(card.priority);
      });
    });

    it("returns valid source values", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const validSources = ["native-memory", "governance", "project-state"];
      const { cards } = res.body.data;

      cards.forEach((card: any) => {
        expect(validSources).toContain(card.source);
      });
    });

    it("returns correct token budget calculation", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { data } = res.body;
      expect(data.totalTokens).toBe(300);
      expect(data.cardCount).toBe(3);
    });

    it("returns correct category counts", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { categoryCounts } = res.body.data;
      expect(categoryCounts.rule).toBe(1);
      expect(categoryCounts.decision).toBe(1);
      expect(categoryCounts.pattern).toBe(1);
    });

    it("returns correct priority counts", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { priorityCounts } = res.body.data;
      expect(priorityCounts.critical).toBe(1);
      expect(priorityCounts.high).toBe(1);
      expect(priorityCounts.low).toBe(1);
    });

    it("returns ISO 8601 formatted timestamp", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it("returns valid ISO 8601 timestamps for card updates", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { cards } = res.body.data;
      cards.forEach((card: any) => {
        expect(card.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const updated = new Date(card.lastUpdated);
        expect(updated.getTime()).toBeGreaterThan(0);
      });
    });

    it("calls getAllIntelligenceCards with project root", async () => {
      await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      expect(intelligenceParser.getAllIntelligenceCards).toHaveBeenCalledWith(process.cwd());
    });

    it("handles parser errors gracefully", async () => {
      const errorMessage = "Failed to read MEMORY.md";
      vi.mocked(intelligenceParser.getAllIntelligenceCards).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe(errorMessage);
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(intelligenceParser.getAllIntelligenceCards).mockRejectedValueOnce(
        "string error"
      );

      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unknown error");
    });

    it("includes all priority levels in full budget", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      const { cards } = res.body.data;
      const priorities = cards.map((c: any) => c.priority);

      expect(priorities).toContain("critical");
      expect(priorities).toContain("high");
      expect(priorities).toContain("low");
    });
  });

  describe("GET /api/memory/intelligence/compact", () => {
    it("returns successful response with correct structure", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200)
        .expect("Content-Type", /json/);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("timestamp");
    });

    it("returns fewer cards than full endpoint", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { cardCount } = res.body.data;
      expect(cardCount).toBe(2);
      expect(cardCount).toBeLessThan(mockFullBudget.cardCount);
    });

    it("returns only critical and high priority cards", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { cards } = res.body.data;
      cards.forEach((card: any) => {
        expect(["critical", "high"]).toContain(card.priority);
      });
    });

    it("excludes low and medium priority cards", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { cards } = res.body.data;
      const priorities = cards.map((c: any) => c.priority);

      expect(priorities).not.toContain("low");
      expect(priorities).not.toContain("medium");
    });

    it("returns lower token budget than full endpoint", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { totalTokens } = res.body.data;
      expect(totalTokens).toBe(250);
      expect(totalTokens).toBeLessThan(mockFullBudget.totalTokens);
    });

    it("calls getCompactIntelligenceCards with project root", async () => {
      await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      expect(intelligenceParser.getCompactIntelligenceCards).toHaveBeenCalledWith(process.cwd());
    });

    it("handles parser errors gracefully", async () => {
      const errorMessage = "Failed to parse governance.json";
      vi.mocked(intelligenceParser.getCompactIntelligenceCards).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe(errorMessage);
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(intelligenceParser.getCompactIntelligenceCards).mockRejectedValueOnce(
        { message: "object error" }
      );

      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Unknown error");
    });

    it("returns correct priority counts for compact budget", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { priorityCounts } = res.body.data;
      expect(priorityCounts.critical).toBe(1);
      expect(priorityCounts.high).toBe(1);
      expect(priorityCounts.low).toBeUndefined();
    });

    it("maintains card structure integrity", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { cards } = res.body.data;
      cards.forEach((card: any) => {
        expect(card).toHaveProperty("id");
        expect(card).toHaveProperty("title");
        expect(card).toHaveProperty("category");
        expect(card).toHaveProperty("content");
        expect(card).toHaveProperty("priority");
        expect(card).toHaveProperty("estimatedTokens");
        expect(card).toHaveProperty("source");
        expect(card).toHaveProperty("tags");
        expect(card).toHaveProperty("lastUpdated");
      });
    });

    it("optimizes for agent context injection", async () => {
      const res = await request(app)
        .get("/api/memory/intelligence/compact")
        .expect(200);

      const { data } = res.body;

      // Should have lower token count for fitting in context windows
      expect(data.totalTokens).toBeLessThan(1000);

      // Should have fewer cards
      expect(data.cardCount).toBeLessThan(5);
    });
  });

  describe("Endpoint comparison", () => {
    it("full endpoint returns more cards than compact", async () => {
      const fullRes = await request(app).get("/api/memory/intelligence");
      const compactRes = await request(app).get("/api/memory/intelligence/compact");

      expect(fullRes.body.data.cardCount).toBeGreaterThan(compactRes.body.data.cardCount);
    });

    it("full endpoint returns higher token count than compact", async () => {
      const fullRes = await request(app).get("/api/memory/intelligence");
      const compactRes = await request(app).get("/api/memory/intelligence/compact");

      expect(fullRes.body.data.totalTokens).toBeGreaterThan(compactRes.body.data.totalTokens);
    });

    it("both endpoints return valid timestamps", async () => {
      const fullRes = await request(app).get("/api/memory/intelligence");
      const compactRes = await request(app).get("/api/memory/intelligence/compact");

      expect(fullRes.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(compactRes.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("both endpoints use same card structure", async () => {
      const fullRes = await request(app).get("/api/memory/intelligence");
      const compactRes = await request(app).get("/api/memory/intelligence/compact");

      const fullCard = fullRes.body.data.cards[0];
      const compactCard = compactRes.body.data.cards[0];

      // Same keys
      expect(Object.keys(fullCard).sort()).toEqual(Object.keys(compactCard).sort());
    });
  });

  describe("Error handling edge cases", () => {
    it("handles empty budget gracefully", async () => {
      const emptyBudget: intelligenceParser.IntelligenceCardBudget = {
        cards: [],
        totalTokens: 0,
        cardCount: 0,
        categoryCounts: {},
        priorityCounts: {},
      };

      vi.mocked(intelligenceParser.getAllIntelligenceCards).mockResolvedValueOnce(emptyBudget);

      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(200);

      expect(res.body.data.cardCount).toBe(0);
      expect(res.body.data.cards.length).toBe(0);
    });

    it("handles concurrent requests correctly", async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get("/api/memory/intelligence")
      );

      const responses = await Promise.all(requests);

      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });

    it("includes timestamp even on error", async () => {
      vi.mocked(intelligenceParser.getAllIntelligenceCards).mockRejectedValueOnce(
        new Error("test error")
      );

      const res = await request(app)
        .get("/api/memory/intelligence")
        .expect(500);

      expect(res.body).toHaveProperty("timestamp");
      expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});

/**
 * Memory Routes Tests - Comprehensive test coverage for memory.ts
 *
 * Tests memory seed data API endpoint that provides initial memory items
 * for browser localStorage initialization.
 *
 * Test coverage includes:
 * - GET /api/memory/seed endpoint
 * - Response structure validation (success, items, count)
 * - Memory item structure (id, content, tags, category, timestamps)
 * - UUID format validation
 * - ISO 8601 timestamp validation
 * - Expected seed data content verification
 * - Category classification (instruction, learning, decision, context)
 * - Tag presence and structure
 * - Edge cases and data integrity
 */

import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import memoryRouter from "../memory";

describe("Memory Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Create express app with memory routes
    app = express();
    app.use(express.json());
    app.use("/api/memory", memoryRouter);
  });

  describe("GET /api/memory/seed", () => {
    it("returns successful response with correct structure", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200)
        .expect("Content-Type", /json/);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("count");
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("returns correct count matching items length", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      expect(res.body.count).toBe(res.body.items.length);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it("returns at least 7 seed items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      // Based on the source, there are exactly 7 seed items
      expect(res.body.items.length).toBeGreaterThanOrEqual(7);
    });

    it("returns items with complete required structure", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("content");
        expect(item).toHaveProperty("tags");
        expect(item).toHaveProperty("category");
        expect(item).toHaveProperty("created");
        expect(item).toHaveProperty("updated");

        // Validate types
        expect(typeof item.id).toBe("string");
        expect(typeof item.content).toBe("string");
        expect(Array.isArray(item.tags)).toBe(true);
        expect(typeof item.category).toBe("string");
        expect(typeof item.created).toBe("string");
        expect(typeof item.updated).toBe("string");
      });
    });

    it("returns valid UUIDs for all item IDs", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      res.body.items.forEach((item: any) => {
        expect(item.id).toMatch(uuidRegex);
      });
    });

    it("returns unique UUIDs for each item", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const ids = res.body.items.map((item: any) => item.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("returns valid ISO 8601 timestamps", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        // Parse dates and verify they're valid
        const createdDate = new Date(item.created);
        const updatedDate = new Date(item.updated);

        expect(createdDate.getTime()).toBeGreaterThan(0);
        expect(updatedDate.getTime()).toBeGreaterThan(0);
        expect(isNaN(createdDate.getTime())).toBe(false);
        expect(isNaN(updatedDate.getTime())).toBe(false);

        // Verify ISO 8601 format
        expect(item.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(item.updated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    it("returns timestamps from 2026 (expected seed date range)", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        const year = new Date(item.created).getFullYear();
        expect(year).toBe(2026);
      });
    });

    it("includes Dog-Food or Die principle", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasDogFood = contents.some((c: string) =>
        c.includes("Dog-Food or Die") && c.includes("Claude Code")
      );

      expect(hasDogFood).toBe(true);
    });

    it("includes TypeScript guidance", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasTypeScriptGuidance = contents.some((c: string) =>
        c.includes("TypeScript IS appropriate") && c.includes("UI abstractions")
      );

      expect(hasTypeScriptGuidance).toBe(true);
    });

    it("includes parallel agent execution guidance", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasParallelGuidance = contents.some((c: string) =>
        c.includes("PARALLEL") && c.includes("up to 20")
      );

      expect(hasParallelGuidance).toBe(true);
    });

    it("includes real logs requirement", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasRealLogs = contents.some((c: string) =>
        c.includes("REAL web logs") && c.includes("No mocked")
      );

      expect(hasRealLogs).toBe(true);
    });

    it("includes CEO-LOOP decision pattern", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasCEOLoop = contents.some((c: string) =>
        c.includes("CEO-LOOP") && c.includes("EXECUTE immediately")
      );

      expect(hasCEOLoop).toBe(true);
    });

    it("includes Week 1 milestone", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasWeek1 = contents.some((c: string) =>
        c.includes("Week 1 COMPLETE") && c.includes("5 critical gaps")
      );

      expect(hasWeek1).toBe(true);
    });

    it("includes OOM incident learning", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const hasOOMIncident = contents.some((c: string) =>
        c.includes("OOM crash") && c.includes("4GB heap")
      );

      expect(hasOOMIncident).toBe(true);
    });

    it("categorizes items correctly", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const categories = res.body.items.map((item: any) => item.category);
      const uniqueCategories = new Set(categories);

      // Verify all expected categories are present
      expect(uniqueCategories.has("instruction")).toBe(true);
      expect(uniqueCategories.has("learning")).toBe(true);
      expect(uniqueCategories.has("decision")).toBe(true);
      expect(uniqueCategories.has("context")).toBe(true);
    });

    it("returns instruction category items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const instructions = res.body.items.filter(
        (item: any) => item.category === "instruction"
      );

      expect(instructions.length).toBeGreaterThan(0);

      // Verify instruction items have appropriate tags
      instructions.forEach((item: any) => {
        expect(item.tags.length).toBeGreaterThan(0);
        expect(typeof item.content).toBe("string");
        expect(item.content.length).toBeGreaterThan(10);
      });
    });

    it("returns learning category items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const learnings = res.body.items.filter(
        (item: any) => item.category === "learning"
      );

      expect(learnings.length).toBeGreaterThan(0);
    });

    it("returns decision category items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const decisions = res.body.items.filter(
        (item: any) => item.category === "decision"
      );

      expect(decisions.length).toBeGreaterThan(0);
    });

    it("returns context category items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contexts = res.body.items.filter(
        (item: any) => item.category === "context"
      );

      expect(contexts.length).toBeGreaterThan(0);
    });

    it("includes appropriate tags for each item", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        expect(Array.isArray(item.tags)).toBe(true);
        expect(item.tags.length).toBeGreaterThan(0);

        // Verify tags are non-empty strings
        item.tags.forEach((tag: any) => {
          expect(typeof tag).toBe("string");
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });

    it("includes expected tag types", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const allTags = res.body.items.flatMap((item: any) => item.tags);
      const uniqueTags = new Set(allTags);

      // Verify presence of key tags from the seed data
      expect(uniqueTags.has("critical")).toBe(true);
      expect(uniqueTags.has("dog-food")).toBe(true);
      expect(uniqueTags.has("week-1")).toBe(true);
      expect(uniqueTags.has("agents")).toBe(true);
      expect(uniqueTags.has("typescript")).toBe(true);
      expect(uniqueTags.has("testing")).toBe(true);
      expect(uniqueTags.has("ceo-loop")).toBe(true);
    });

    it("has non-empty content for all items", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        expect(item.content.length).toBeGreaterThan(0);
        expect(item.content.trim()).not.toBe("");
      });
    });

    it("has substantive content (not just placeholders)", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        // Content should be meaningful (at least 20 characters)
        expect(item.content.length).toBeGreaterThan(20);

        // Should not contain placeholder text
        expect(item.content.toLowerCase()).not.toContain("lorem ipsum");
        expect(item.content.toLowerCase()).not.toContain("placeholder");
        expect(item.content.toLowerCase()).not.toContain("todo");
      });
    });

    it("returns consistent data across multiple requests", async () => {
      const res1 = await request(app).get("/api/memory/seed");
      const res2 = await request(app).get("/api/memory/seed");

      // Note: IDs will be different due to crypto.randomUUID()
      expect(res1.body.count).toBe(res2.body.count);
      expect(res1.body.items.length).toBe(res2.body.items.length);

      // Content should be the same (same order and content)
      res1.body.items.forEach((item1: any, index: number) => {
        const item2 = res2.body.items[index];
        expect(item1.content).toBe(item2.content);
        expect(item1.category).toBe(item2.category);
        expect(item1.tags).toEqual(item2.tags);
        expect(item1.created).toBe(item2.created);
        expect(item1.updated).toBe(item2.updated);
      });
    });

    it("returns same IDs across requests (generated at module load)", async () => {
      const res1 = await request(app).get("/api/memory/seed");
      const res2 = await request(app).get("/api/memory/seed");

      // IDs are generated when the module loads, so they remain consistent
      res1.body.items.forEach((item1: any, index: number) => {
        const item2 = res2.body.items[index];
        expect(item1.id).toBe(item2.id);
      });
    });

    it("handles multiple concurrent requests", async () => {
      // Fire multiple requests in parallel
      const requests = Array.from({ length: 5 }, () =>
        request(app).get("/api/memory/seed")
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBeGreaterThan(0);
      });
    });

    it("returns items with both created and updated timestamps", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      res.body.items.forEach((item: any) => {
        const created = new Date(item.created);
        const updated = new Date(item.updated);

        // Both timestamps should exist
        expect(created).toBeInstanceOf(Date);
        expect(updated).toBeInstanceOf(Date);

        // Updated should be >= created (or equal for seed data)
        expect(updated.getTime()).toBeGreaterThanOrEqual(created.getTime());
      });
    });

    it("validates content includes actionable guidance", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const instructions = res.body.items.filter(
        (item: any) => item.category === "instruction"
      );

      // Instructions should have imperative language or clear directives
      instructions.forEach((item: any) => {
        const content = item.content.toLowerCase();
        const hasDirective =
          content.includes("use") ||
          content.includes("don't") ||
          content.includes("must") ||
          content.includes("run") ||
          content.includes("maximize");

        expect(hasDirective).toBe(true);
      });
    });

    it("validates learning items describe incidents or patterns", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const learnings = res.body.items.filter(
        (item: any) => item.category === "learning"
      );

      // Learnings should describe what was learned
      learnings.forEach((item: any) => {
        expect(item.content.length).toBeGreaterThan(30);
        expect(typeof item.content).toBe("string");
      });
    });

    it("validates no duplicate content", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      const contents = res.body.items.map((item: any) => item.content);
      const uniqueContents = new Set(contents);

      expect(uniqueContents.size).toBe(contents.length);
    });

    it("provides seed data suitable for localStorage initialization", async () => {
      const res = await request(app)
        .get("/api/memory/seed")
        .expect(200);

      // Verify structure is JSON-serializable and reasonable size
      const jsonString = JSON.stringify(res.body.items);
      expect(jsonString.length).toBeLessThan(50000); // Reasonable for localStorage

      // Should be parseable back
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(res.body.items);
    });
  });
});

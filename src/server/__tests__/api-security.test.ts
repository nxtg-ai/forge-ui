/**
 * API Server Security Tests
 * Tests for security features in API server including input validation,
 * request validation, and malformed JSON handling
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { z } from "zod";

// Create a minimal test app that mimics the security middleware
function createTestApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Validation middleware
  function validateRequest(schema: z.ZodSchema) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: "Invalid request data",
            details: error.errors,
            timestamp: new Date().toISOString(),
          });
        }
        next(error);
      }
    };
  }

  // Schemas
  const sentinelSchema = z.object({
    type: z.string().min(1),
    source: z.string().min(1),
    message: z.string().min(1),
  });

  const workerTaskSchema = z.object({
    type: z.string().min(1).max(100),
    command: z.string().min(1).max(200),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  });

  const feedbackSchema = z.object({
    rating: z.number().int().min(1).max(5),
    category: z.string().min(1).max(100),
    description: z.string().min(1).max(5000),
    url: z.string().max(500).optional(),
    userAgent: z.string().max(500).optional(),
  });

  // Test endpoints
  app.post("/api/governance/sentinel", validateRequest(sentinelSchema), (req, res) => {
    res.json({ success: true, message: "Sentinel log entry added" });
  });

  app.post("/api/workers/tasks", validateRequest(workerTaskSchema), (req, res) => {
    res.json({ success: true, data: { taskId: "test-task-id" } });
  });

  app.post("/api/feedback", validateRequest(feedbackSchema), (req, res) => {
    res.json({ success: true, data: { id: "feedback-id" } });
  });

  // Malformed JSON handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON",
        timestamp: new Date().toISOString(),
      });
    }
    next(err);
  });

  return app;
}

describe("API Server Security", () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("Governance Sentinel Endpoint Validation", () => {
    it("should accept valid sentinel log entry", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "decision",
          source: "ceo-loop",
          message: "Approved architecture change",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Sentinel log entry added");
    });

    it("should reject sentinel entry missing type field", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          source: "ceo-loop",
          message: "Missing type field",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject sentinel entry missing source field", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "decision",
          message: "Missing source field",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject sentinel entry missing message field", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "decision",
          source: "ceo-loop",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject sentinel entry with empty type", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "",
          source: "ceo-loop",
          message: "Empty type field",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject sentinel entry with empty source", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "decision",
          source: "",
          message: "Empty source field",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject sentinel entry with empty message", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .send({
          type: "decision",
          source: "ceo-loop",
          message: "",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });
  });

  describe("Worker Task Endpoint Validation", () => {
    it("should accept valid worker task", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
          command: "review-pr",
          priority: "high",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();
    });

    it("should reject task missing type field", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          command: "review-pr",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task missing command field", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with empty type", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "",
          command: "review-pr",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with empty command", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
          command: "",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with type exceeding max length", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "a".repeat(101), // Exceeds 100 char limit
          command: "review-pr",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with command exceeding max length", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
          command: "a".repeat(201), // Exceeds 200 char limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with invalid priority", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
          command: "review-pr",
          priority: "ultra-mega-high", // Not in enum
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should accept task with valid priority values", async () => {
      const priorities = ["low", "medium", "high", "critical"];

      for (const priority of priorities) {
        const response = await request(app)
          .post("/api/workers/tasks")
          .send({
            type: "code-review",
            command: "review-pr",
            priority,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it("should accept task without optional priority field", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "code-review",
          command: "review-pr",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Feedback Endpoint Validation", () => {
    it("should accept valid feedback", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 5,
          category: "feature-request",
          description: "Great feature, would love to see X added",
          url: "/dashboard",
          userAgent: "Mozilla/5.0",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it("should reject feedback missing rating field", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          category: "bug",
          description: "Found a bug",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback missing category field", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          description: "Missing category",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback missing description field", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 3,
          category: "bug",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with rating below 1", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 0,
          category: "bug",
          description: "Invalid rating",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with rating above 5", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 6,
          category: "bug",
          description: "Invalid rating",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with non-integer rating", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 3.5,
          category: "bug",
          description: "Non-integer rating",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with empty category", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "",
          description: "Empty category",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with empty description", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "bug",
          description: "",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with category exceeding max length", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "a".repeat(101), // Exceeds 100 char limit
          description: "Valid description",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with description exceeding max length", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "bug",
          description: "a".repeat(5001), // Exceeds 5000 char limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with url exceeding max length", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "bug",
          description: "Valid description",
          url: "a".repeat(501), // Exceeds 500 char limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject feedback with userAgent exceeding max length", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 4,
          category: "bug",
          description: "Valid description",
          userAgent: "a".repeat(501), // Exceeds 500 char limit
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should accept feedback without optional fields", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 5,
          category: "feature-request",
          description: "Great feature",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should accept all valid rating values", async () => {
      const ratings = [1, 2, 3, 4, 5];

      for (const rating of ratings) {
        const response = await request(app)
          .post("/api/feedback")
          .send({
            rating,
            category: "test",
            description: `Testing rating ${rating}`,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe("Malformed JSON Handling", () => {
    it("should reject request with malformed JSON", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .set("Content-Type", "application/json")
        .send("{invalid json")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid JSON");
    });

    it("should reject request with incomplete JSON", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .set("Content-Type", "application/json")
        .send('{"type": "test", "command"')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid JSON");
    });

    it("should reject request with trailing comma", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .set("Content-Type", "application/json")
        .send('{"rating": 5, "category": "test", "description": "test",}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid JSON");
    });

    it("should reject request with unquoted keys", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .set("Content-Type", "application/json")
        .send("{type: 'test', source: 'test', message: 'test'}")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid JSON");
    });

    it("should reject request with single quotes instead of double quotes", async () => {
      const response = await request(app)
        .post("/api/governance/sentinel")
        .set("Content-Type", "application/json")
        .send("{'type': 'test', 'source': 'test', 'message': 'test'}")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid JSON");
    });
  });

  describe("Request Body Size Limits", () => {
    it("should accept request within size limit", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: 5,
          category: "test",
          description: "a".repeat(1000), // Well within 1MB limit
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Type Coercion Security", () => {
    it("should reject feedback with rating as string", async () => {
      const response = await request(app)
        .post("/api/feedback")
        .send({
          rating: "5", // Should be number
          category: "test",
          description: "Testing type coercion",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });

    it("should reject task with wrong type for priority", async () => {
      const response = await request(app)
        .post("/api/workers/tasks")
        .send({
          type: "test",
          command: "test-command",
          priority: 123, // Should be string enum
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid request data");
    });
  });
});

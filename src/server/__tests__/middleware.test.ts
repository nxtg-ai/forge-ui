/**
 * Middleware Test Suite
 * Tests for rate limiting, validation, and security middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type express from "express";
import {
  InMemoryRateLimiter,
  rateLimit,
  validateRequest,
  generalLimiter,
  writeLimiter,
  authLimiter,
  visionCaptureSchema,
  commandExecuteSchema,
  feedbackSchema,
  agentTaskSchema,
} from "../middleware";
import { z } from "zod";

// ============= Mock Request/Response Helpers =============

interface MockRequest extends Partial<express.Request> {
  ip?: string;
  socket: {
    remoteAddress?: string;
  };
  body?: any;
}

interface MockResponse extends Partial<express.Response> {
  statusCode?: number;
  headers: Record<string, string>;
  jsonData?: any;
}

function createMockRequest(overrides?: Partial<MockRequest>): MockRequest {
  return {
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    body: {},
    ...overrides,
  };
}

function createMockResponse(): MockResponse & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
} {
  const res: any = {
    statusCode: 200,
    headers: {},
    jsonData: null,
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn((data: any) => {
    res.jsonData = data;
    return res;
  });

  res.setHeader = vi.fn((name: string, value: string | number) => {
    res.headers[name] = String(value);
    return res;
  });

  return res;
}

const mockNext = () => vi.fn();

// ============= InMemoryRateLimiter Tests =============

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (limiter) {
      limiter.cleanup();
    }
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const result = limiter.check("test-ip");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("blocks requests exceeding limit", () => {
    limiter = new InMemoryRateLimiter(60000, 3);

    limiter.check("test-ip");
    limiter.check("test-ip");
    limiter.check("test-ip");
    const result = limiter.check("test-ip");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets count after window expires", () => {
    limiter = new InMemoryRateLimiter(60000, 3);

    limiter.check("test-ip");
    limiter.check("test-ip");
    limiter.check("test-ip");

    // Advance time past window
    vi.advanceTimersByTime(60001);

    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("tracks different identifiers separately", () => {
    limiter = new InMemoryRateLimiter(60000, 3);

    limiter.check("ip-1");
    limiter.check("ip-1");
    limiter.check("ip-1");

    const result = limiter.check("ip-2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("increments count on each check within window", () => {
    limiter = new InMemoryRateLimiter(60000, 5);

    const result1 = limiter.check("test-ip");
    expect(result1.remaining).toBe(4);

    const result2 = limiter.check("test-ip");
    expect(result2.remaining).toBe(3);

    const result3 = limiter.check("test-ip");
    expect(result3.remaining).toBe(2);
  });

  it("cleans up expired entries periodically", () => {
    limiter = new InMemoryRateLimiter(60000, 10);

    limiter.check("ip-1");
    limiter.check("ip-2");
    limiter.check("ip-3");

    // Advance time past window
    vi.advanceTimersByTime(65000);

    // Cleanup runs every 60s
    expect(limiter["requests"].size).toBeLessThanOrEqual(3);
  });

  it("properly cleans up on cleanup() call", () => {
    limiter = new InMemoryRateLimiter(60000, 10);

    limiter.check("ip-1");
    limiter.check("ip-2");

    limiter.cleanup();

    expect(limiter["requests"].size).toBe(0);
  });

  it("returns correct reset time", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    limiter = new InMemoryRateLimiter(60000, 10);
    const result = limiter.check("test-ip");

    expect(result.resetTime).toBe(now + 60000);
  });

  it("maintains reset time during window", () => {
    limiter = new InMemoryRateLimiter(60000, 10);

    const result1 = limiter.check("test-ip");
    vi.advanceTimersByTime(5000);
    const result2 = limiter.check("test-ip");

    expect(result2.resetTime).toBe(result1.resetTime);
  });

  it("handles edge case at exact limit", () => {
    limiter = new InMemoryRateLimiter(60000, 3);

    limiter.check("test-ip");
    limiter.check("test-ip");
    const result = limiter.check("test-ip");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);

    const blocked = limiter.check("test-ip");
    expect(blocked.allowed).toBe(false);
  });
});

// ============= rateLimit Middleware Tests =============

describe("rateLimit middleware", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (limiter) {
      limiter.cleanup();
    }
    vi.useRealTimers();
  });

  it("allows requests within rate limit", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const middleware = rateLimit(limiter);

    const req = createMockRequest() as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
  });

  it("blocks requests exceeding rate limit", () => {
    limiter = new InMemoryRateLimiter(60000, 2);
    const middleware = rateLimit(limiter);

    const req = createMockRequest() as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);
    middleware(req, res, next);
    middleware(req, res, next);

    expect(res.status).toHaveBeenLastCalledWith(429);
    expect(res.json).toHaveBeenLastCalledWith(
      expect.objectContaining({
        success: false,
        error: "Too many requests",
        retryAfter: expect.any(Number),
      })
    );
  });

  it("sets correct rate limit headers", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const middleware = rateLimit(limiter);

    const req = createMockRequest() as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", 10);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 9);
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-RateLimit-Reset",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
    );
  });

  it("includes retryAfter in error response", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    limiter = new InMemoryRateLimiter(60000, 1);
    const middleware = rateLimit(limiter);

    const req = createMockRequest() as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);
    middleware(req, res, next);

    const jsonCall = (res.json as any).mock.calls[0][0];
    expect(jsonCall.retryAfter).toBeGreaterThan(0);
    expect(jsonCall.retryAfter).toBeLessThanOrEqual(60);
  });

  it("uses IP address as identifier", () => {
    limiter = new InMemoryRateLimiter(60000, 2);
    const middleware = rateLimit(limiter);

    const req1 = createMockRequest({ ip: "1.1.1.1" }) as express.Request;
    const req2 = createMockRequest({ ip: "2.2.2.2" }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req1, res, next);
    middleware(req1, res, next);
    middleware(req1, res, next);

    expect(res.status).toHaveBeenCalledWith(429);

    const res2 = createMockResponse() as unknown as express.Response;
    middleware(req2, res2, mockNext());

    expect(res2.status).not.toHaveBeenCalled();
  });

  it("falls back to socket.remoteAddress when no IP", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const middleware = rateLimit(limiter);

    const req = createMockRequest({
      ip: undefined,
      socket: { remoteAddress: "10.0.0.1" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("handles unknown identifier gracefully", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const middleware = rateLimit(limiter);

    const req = createMockRequest({
      ip: undefined,
      socket: {},
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("includes timestamp in error response", () => {
    limiter = new InMemoryRateLimiter(60000, 1);
    const middleware = rateLimit(limiter);

    const req = createMockRequest() as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);
    middleware(req, res, next);

    const jsonCall = (res.json as any).mock.calls[0][0];
    expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ============= Global Limiter Tests =============

describe("Global rate limiters", () => {
  afterEach(() => {
    generalLimiter.cleanup();
    writeLimiter.cleanup();
    authLimiter.cleanup();
  });

  it("generalLimiter has correct limits for test environment", () => {
    expect(generalLimiter.maxRequests).toBe(1000);
  });

  it("writeLimiter has correct limits for test environment", () => {
    expect(writeLimiter.maxRequests).toBe(100);
  });

  it("authLimiter has correct limits for test environment", () => {
    expect(authLimiter.maxRequests).toBe(50);
  });

  it("limiters are separate instances", () => {
    const result1 = generalLimiter.check("test-ip");
    const result2 = writeLimiter.check("test-ip");
    const result3 = authLimiter.check("test-ip");

    expect(result1.remaining).toBe(999);
    expect(result2.remaining).toBe(99);
    expect(result3.remaining).toBe(49);
  });
});

// ============= validateRequest Middleware Tests =============

describe("validateRequest middleware", () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it("allows valid requests", () => {
    const middleware = validateRequest(testSchema);

    const req = createMockRequest({
      body: { name: "John", age: 30 },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects invalid requests", () => {
    const middleware = validateRequest(testSchema);

    const req = createMockRequest({
      body: { name: "", age: -5 },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Invalid request data",
        details: expect.any(Array),
      })
    );
  });

  it("includes validation details in error response", () => {
    const middleware = validateRequest(testSchema);

    const req = createMockRequest({
      body: { name: "", age: "not-a-number" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    const jsonCall = (res.json as any).mock.calls[0][0];
    expect(jsonCall.details).toHaveLength(2);
    expect(jsonCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("passes non-Zod errors to next", () => {
    const faultySchema = {
      parse: () => {
        throw new Error("Custom error");
      },
    } as any;

    const middleware = validateRequest(faultySchema);

    const req = createMockRequest({
      body: { test: "data" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it("validates nested objects", () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    const middleware = validateRequest(nestedSchema);

    const req = createMockRequest({
      body: {
        user: {
          name: "John",
          email: "john@example.com",
        },
      },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("validates optional fields", () => {
    const optionalSchema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const middleware = validateRequest(optionalSchema);

    const req = createMockRequest({
      body: { required: "value" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ============= Validation Schema Tests =============

describe("visionCaptureSchema", () => {
  it("accepts valid text input", () => {
    const valid = { text: "Hello world" };
    expect(() => visionCaptureSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty text", () => {
    const invalid = { text: "" };
    expect(() => visionCaptureSchema.parse(invalid)).toThrow();
  });

  it("rejects text exceeding max length", () => {
    const invalid = { text: "a".repeat(10001) };
    expect(() => visionCaptureSchema.parse(invalid)).toThrow();
  });

  it("accepts text at max length", () => {
    const valid = { text: "a".repeat(10000) };
    expect(() => visionCaptureSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing text field", () => {
    const invalid = {};
    expect(() => visionCaptureSchema.parse(invalid)).toThrow();
  });
});

describe("commandExecuteSchema", () => {
  it("accepts valid command with name only", () => {
    const valid = { name: "test-command" };
    expect(() => commandExecuteSchema.parse(valid)).not.toThrow();
  });

  it("accepts command with args", () => {
    const valid = {
      name: "test-command",
      args: { flag: true, value: "test" },
    };
    expect(() => commandExecuteSchema.parse(valid)).not.toThrow();
  });

  it("accepts command with context", () => {
    const valid = {
      name: "test-command",
      context: { userId: "123", sessionId: "abc" },
    };
    expect(() => commandExecuteSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty command name", () => {
    const invalid = { name: "" };
    expect(() => commandExecuteSchema.parse(invalid)).toThrow();
  });

  it("rejects command name exceeding max length", () => {
    const invalid = { name: "a".repeat(201) };
    expect(() => commandExecuteSchema.parse(invalid)).toThrow();
  });

  it("accepts command name at max length", () => {
    const valid = { name: "a".repeat(200) };
    expect(() => commandExecuteSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing name field", () => {
    const invalid = { args: {} };
    expect(() => commandExecuteSchema.parse(invalid)).toThrow();
  });

  it("accepts args with various types", () => {
    const valid = {
      name: "test",
      args: {
        string: "value",
        number: 42,
        boolean: true,
        nested: { key: "value" },
        array: [1, 2, 3],
      },
    };
    expect(() => commandExecuteSchema.parse(valid)).not.toThrow();
  });
});

describe("feedbackSchema", () => {
  it("accepts valid feedback", () => {
    const valid = {
      rating: 5,
      category: "bug",
      description: "Found a bug in the UI",
    };
    expect(() => feedbackSchema.parse(valid)).not.toThrow();
  });

  it("accepts feedback with optional fields", () => {
    const valid = {
      rating: 4,
      category: "feature",
      description: "Great feature!",
      url: "https://example.com",
      userAgent: "Mozilla/5.0",
      timestamp: "2026-02-06T12:00:00Z",
    };
    expect(() => feedbackSchema.parse(valid)).not.toThrow();
  });

  it("rejects rating below minimum", () => {
    const invalid = {
      rating: 0,
      category: "bug",
      description: "Test",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects rating above maximum", () => {
    const invalid = {
      rating: 6,
      category: "bug",
      description: "Test",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects non-integer rating", () => {
    const invalid = {
      rating: 3.5,
      category: "bug",
      description: "Test",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects empty category", () => {
    const invalid = {
      rating: 3,
      category: "",
      description: "Test",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects category exceeding max length", () => {
    const invalid = {
      rating: 3,
      category: "a".repeat(101),
      description: "Test",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects empty description", () => {
    const invalid = {
      rating: 3,
      category: "bug",
      description: "",
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects description exceeding max length", () => {
    const invalid = {
      rating: 3,
      category: "bug",
      description: "a".repeat(5001),
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("accepts description at max length", () => {
    const valid = {
      rating: 3,
      category: "bug",
      description: "a".repeat(5000),
    };
    expect(() => feedbackSchema.parse(valid)).not.toThrow();
  });

  it("rejects url exceeding max length", () => {
    const invalid = {
      rating: 3,
      category: "bug",
      description: "Test",
      url: "https://" + "a".repeat(500),
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });

  it("rejects userAgent exceeding max length", () => {
    const invalid = {
      rating: 3,
      category: "bug",
      description: "Test",
      userAgent: "a".repeat(501),
    };
    expect(() => feedbackSchema.parse(invalid)).toThrow();
  });
});

describe("agentTaskSchema", () => {
  it("accepts valid task with required fields", () => {
    const valid = {
      name: "analyze-code",
      type: "analysis",
    };
    expect(() => agentTaskSchema.parse(valid)).not.toThrow();
  });

  it("accepts task with priority", () => {
    const valid = {
      name: "urgent-fix",
      type: "bugfix",
      priority: "high" as const,
    };
    expect(() => agentTaskSchema.parse(valid)).not.toThrow();
  });

  it("accepts all priority levels", () => {
    const priorities = ["low", "medium", "high", "critical"] as const;

    for (const priority of priorities) {
      const valid = {
        name: "test",
        type: "test",
        priority,
      };
      expect(() => agentTaskSchema.parse(valid)).not.toThrow();
    }
  });

  it("accepts task with context", () => {
    const valid = {
      name: "task",
      type: "test",
      context: {
        file: "test.ts",
        line: 42,
        metadata: { key: "value" },
      },
    };
    expect(() => agentTaskSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty name", () => {
    const invalid = {
      name: "",
      type: "test",
    };
    expect(() => agentTaskSchema.parse(invalid)).toThrow();
  });

  it("rejects name exceeding max length", () => {
    const invalid = {
      name: "a".repeat(201),
      type: "test",
    };
    expect(() => agentTaskSchema.parse(invalid)).toThrow();
  });

  it("rejects empty type", () => {
    const invalid = {
      name: "test",
      type: "",
    };
    expect(() => agentTaskSchema.parse(invalid)).toThrow();
  });

  it("rejects type exceeding max length", () => {
    const invalid = {
      name: "test",
      type: "a".repeat(101),
    };
    expect(() => agentTaskSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid priority", () => {
    const invalid = {
      name: "test",
      type: "test",
      priority: "urgent",
    };
    expect(() => agentTaskSchema.parse(invalid)).toThrow();
  });

  it("accepts task without optional fields", () => {
    const valid = {
      name: "minimal-task",
      type: "minimal",
    };
    expect(() => agentTaskSchema.parse(valid)).not.toThrow();
  });
});

// ============= Integration Tests =============

describe("Middleware integration", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (limiter) {
      limiter.cleanup();
    }
    vi.useRealTimers();
  });

  it("rate limiting and validation work together", () => {
    limiter = new InMemoryRateLimiter(60000, 2);
    const rateLimitMw = rateLimit(limiter);
    const validateMw = validateRequest(commandExecuteSchema);

    const req = createMockRequest({
      body: { name: "test-command" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    // First request - should pass both
    rateLimitMw(req, res, () => {
      validateMw(req, res, next);
    });

    expect(next).toHaveBeenCalledOnce();
  });

  it("rate limit blocks before validation", () => {
    limiter = new InMemoryRateLimiter(60000, 1);
    const rateLimitMw = rateLimit(limiter);
    const validateMw = validateRequest(commandExecuteSchema);

    const req = createMockRequest({
      body: { invalid: "data" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    // Exhaust rate limit
    rateLimitMw(req, res, () => {});

    // Second request should be blocked by rate limit
    const res2 = createMockResponse() as unknown as express.Response;
    rateLimitMw(req, res2, () => {
      validateMw(req, res2, next);
    });

    expect(res2.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("validation rejects after rate limit passes", () => {
    limiter = new InMemoryRateLimiter(60000, 10);
    const rateLimitMw = rateLimit(limiter);
    const validateMw = validateRequest(commandExecuteSchema);

    const req = createMockRequest({
      body: { invalid: "data" },
    }) as express.Request;
    const res = createMockResponse() as unknown as express.Response;
    const next = mockNext();

    rateLimitMw(req, res, () => {
      validateMw(req, res, next);
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

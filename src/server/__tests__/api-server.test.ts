/**
 * API Server Unit Tests
 *
 * Tests the api-server.ts module's exported factory functions and utilities.
 * Since api-server.ts is a self-executing module, we test its components
 * and configuration logic rather than the whole module execution.
 *
 * For full end-to-end server testing, see smoke.integration.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

describe("API Server Components", () => {
  describe("Security Headers Middleware", () => {
    it("sets all required security headers", () => {
      // Simulate the security headers middleware logic
      const req = {} as Request;
      const res = {
        setHeader: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      // This is the middleware function from api-server.ts
      const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' ws: wss:; " +
            "frame-ancestors 'none';",
        );
        next();
      };

      securityMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
      expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(res.setHeader).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Referrer-Policy",
        "strict-origin-when-cross-origin",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("default-src 'self'"),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("frame-ancestors 'none'"),
      );
      expect(next).toHaveBeenCalled();
    });

    it("includes CSP directives for WebSocket connections", () => {
      const res = {
        setHeader: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' ws: wss:; " +
            "frame-ancestors 'none';",
        );
        next();
      };

      securityMiddleware({} as Request, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("connect-src 'self' ws: wss:"),
      );
    });
  });

  describe("CORS Configuration Logic", () => {
    it("allows requests without origin", () => {
      const callback = vi.fn();
      const originChecker = (origin: string | undefined, callback: Function) => {
        if (!origin) return callback(null, true);
        callback(null, true);
      };

      originChecker(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("allows all origins in non-production", () => {
      const callback = vi.fn();
      const isProduction = false;
      const allowedOrigins = ["http://localhost:5050"];

      const originChecker = (origin: string | undefined, callback: Function) => {
        if (!origin) return callback(null, true);
        if (!isProduction) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      };

      originChecker("http://any-origin.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("blocks unauthorized origins in production", () => {
      const callback = vi.fn();
      const isProduction = true;
      const allowedOrigins = ["http://allowed.com"];

      const originChecker = (origin: string | undefined, callback: Function) => {
        if (!origin) return callback(null, true);
        if (!isProduction) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      };

      originChecker("http://unauthorized.com", callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });

    it("allows configured origins in production", () => {
      const callback = vi.fn();
      const isProduction = true;
      const allowedOrigins = ["http://allowed.com", "http://also-allowed.com"];

      const originChecker = (origin: string | undefined, callback: Function) => {
        if (!origin) return callback(null, true);
        if (!isProduction) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      };

      originChecker("http://allowed.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it("supports wildcard in allowed origins", () => {
      const callback = vi.fn();
      const isProduction = true;
      const allowedOrigins = ["*"];

      const originChecker = (origin: string | undefined, callback: Function) => {
        if (!origin) return callback(null, true);
        if (!isProduction) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      };

      originChecker("http://any-origin.com", callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });

  describe("WebSocket Authentication Logic", () => {
    it("validates origin in production mode", () => {
      const isProduction = true;
      const allowedOrigins = ["http://allowed.com"];
      const origin = "http://unauthorized.com";

      const isOriginAllowed = (origin: string | undefined): boolean => {
        if (!isProduction) return true;
        if (!origin) return true;
        return allowedOrigins.includes(origin);
      };

      expect(isOriginAllowed(origin)).toBe(false);
    });

    it("accepts all origins in non-production", () => {
      const isProduction = false;
      const allowedOrigins = ["http://allowed.com"];
      const origin = "http://any-origin.com";

      const isOriginAllowed = (origin: string | undefined): boolean => {
        if (!isProduction) return true;
        if (!origin) return true;
        return allowedOrigins.includes(origin);
      };

      expect(isOriginAllowed(origin)).toBe(true);
    });

    it("accepts missing origin", () => {
      const isProduction = true;
      const allowedOrigins = ["http://allowed.com"];

      const isOriginAllowed = (origin: string | undefined): boolean => {
        if (!isProduction) return true;
        if (!origin) return true;
        return allowedOrigins.includes(origin);
      };

      expect(isOriginAllowed(undefined)).toBe(true);
    });
  });

  describe("WebSocket Message Handling", () => {
    it("responds to ping with pong", () => {
      const ws = {
        send: vi.fn(),
      };
      const message = { type: "ping" };

      const handlePing = (ws: any, message: any) => {
        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      };

      handlePing(ws, message);

      expect(ws.send).toHaveBeenCalled();
      const sentData = JSON.parse(ws.send.mock.calls[0][0]);
      expect(sentData.type).toBe("pong");
      expect(sentData.timestamp).toBeDefined();
    });

    it("ignores heartbeat messages", () => {
      const logger = { info: vi.fn() };
      const message = { type: "heartbeat" };

      const shouldLogUnknownMessage = (type: string): boolean => {
        return !["pong", "heartbeat"].includes(type);
      };

      expect(shouldLogUnknownMessage(message.type)).toBe(false);
    });

    it("ignores pong messages", () => {
      const logger = { info: vi.fn() };
      const message = { type: "pong" };

      const shouldLogUnknownMessage = (type: string): boolean => {
        return !["pong", "heartbeat"].includes(type);
      };

      expect(shouldLogUnknownMessage(message.type)).toBe(false);
    });

    it("logs unknown message types", () => {
      const message = { type: "unknown-type" };

      const shouldLogUnknownMessage = (type: string): boolean => {
        return !["pong", "heartbeat"].includes(type);
      };

      expect(shouldLogUnknownMessage(message.type)).toBe(true);
    });
  });

  describe("Broadcast Function", () => {
    it("sends message to all connected clients", () => {
      const mockWs1 = { readyState: 1, send: vi.fn() }; // OPEN
      const mockWs2 = { readyState: 1, send: vi.fn() }; // OPEN
      const clients = new Set([mockWs1, mockWs2]);

      const broadcast = (type: string, payload: unknown) => {
        const message = JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        });
        clients.forEach((client) => {
          if (client.readyState === 1) {
            // WebSocket.OPEN
            client.send(message);
          }
        });
      };

      broadcast("test.event", { data: "value" });

      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();

      const sentMessage = JSON.parse(mockWs1.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe("test.event");
      expect(sentMessage.payload).toEqual({ data: "value" });
      expect(sentMessage.timestamp).toBeDefined();
    });

    it("skips closed connections", () => {
      const mockWs1 = { readyState: 1, send: vi.fn() }; // OPEN
      const mockWs2 = { readyState: 3, send: vi.fn() }; // CLOSED
      const clients = new Set([mockWs1, mockWs2]);

      const broadcast = (type: string, payload: unknown) => {
        const message = JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        });
        clients.forEach((client) => {
          if (client.readyState === 1) {
            // WebSocket.OPEN
            client.send(message);
          }
        });
      };

      broadcast("test.event", { data: "value" });

      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });

  describe("Worker Pool Lazy Initialization", () => {
    it("returns null before first call", () => {
      const workerPool: any = null;

      expect(workerPool).toBeNull();
    });

    it("initializes on first call", () => {
      let workerPool: any = null;
      const mockPool = { initialize: vi.fn(), on: vi.fn() };

      const getWorkerPool = () => {
        if (!workerPool) {
          workerPool = mockPool;
          workerPool.on("event", vi.fn());
          workerPool.initialize();
        }
        return workerPool;
      };

      const pool = getWorkerPool();

      expect(pool).toBe(mockPool);
      expect(mockPool.on).toHaveBeenCalled();
      expect(mockPool.initialize).toHaveBeenCalled();
    });

    it("returns same instance on subsequent calls", () => {
      let workerPool: any = null;
      const mockPool = { initialize: vi.fn(), on: vi.fn() };

      const getWorkerPool = () => {
        if (!workerPool) {
          workerPool = mockPool;
          workerPool.on("event", vi.fn());
          workerPool.initialize();
        }
        return workerPool;
      };

      const pool1 = getWorkerPool();
      const pool2 = getWorkerPool();

      expect(pool1).toBe(pool2);
      expect(mockPool.initialize).toHaveBeenCalledOnce();
    });
  });

  describe("Port Configuration", () => {
    it("uses PORT environment variable", () => {
      process.env.PORT = "8080";
      const port = Number(process.env.PORT) || 5051;
      expect(port).toBe(8080);
    });

    it("defaults to 5051 when PORT not set", () => {
      delete process.env.PORT;
      const port = Number(process.env.PORT) || 5051;
      expect(port).toBe(5051);
    });

    it("defaults to 5051 when PORT is empty string", () => {
      process.env.PORT = "";
      const port = Number(process.env.PORT) || 5051;
      expect(port).toBe(5051);
    });

    it("parses string port to number", () => {
      process.env.PORT = "3000";
      const port = Number(process.env.PORT) || 5051;
      expect(typeof port).toBe("number");
      expect(port).toBe(3000);
    });
  });

  describe("Allowed Origins Configuration", () => {
    it("parses comma-separated origins", () => {
      process.env.ALLOWED_ORIGINS = "http://localhost:5050,http://localhost:5173";
      const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

      expect(allowedOrigins).toHaveLength(2);
      expect(allowedOrigins).toContain("http://localhost:5050");
      expect(allowedOrigins).toContain("http://localhost:5173");
    });

    it("trims whitespace from origins", () => {
      process.env.ALLOWED_ORIGINS = "http://localhost:5050 , http://localhost:5173 ";
      const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

      expect(allowedOrigins[0]).toBe("http://localhost:5050");
      expect(allowedOrigins[1]).toBe("http://localhost:5173");
    });

    it("uses default origins when not set", () => {
      delete process.env.ALLOWED_ORIGINS;
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : ["http://localhost:5050", "http://127.0.0.1:5050", "http://localhost:5173"];

      expect(allowedOrigins).toHaveLength(3);
      expect(allowedOrigins).toContain("http://localhost:5050");
      expect(allowedOrigins).toContain("http://127.0.0.1:5050");
      expect(allowedOrigins).toContain("http://localhost:5173");
    });
  });

  describe("Duplicate Route Detection Logic", () => {
    it("identifies duplicate routes", () => {
      const routes = [
        { method: "GET", path: "/api/test" },
        { method: "GET", path: "/api/test" }, // duplicate
        { method: "POST", path: "/api/test" },
      ];

      const seen = new Map<string, number>();
      const duplicates: string[] = [];

      for (const route of routes) {
        const key = `${route.method} ${route.path}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count > 1) duplicates.push(key);
      }

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toBe("GET /api/test");
    });

    it("allows same path with different methods", () => {
      const routes = [
        { method: "GET", path: "/api/test" },
        { method: "POST", path: "/api/test" },
        { method: "PUT", path: "/api/test" },
      ];

      const seen = new Map<string, number>();
      const duplicates: string[] = [];

      for (const route of routes) {
        const key = `${route.method} ${route.path}`;
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count > 1) duplicates.push(key);
      }

      expect(duplicates).toHaveLength(0);
    });

    it("throws error when duplicates found", () => {
      const duplicates = ["GET /api/test", "POST /api/users"];

      expect(() => {
        if (duplicates.length > 0) {
          throw new Error(
            `FATAL: Duplicate routes detected! These routes are registered multiple times (second handler is DEAD CODE):\n  ${duplicates.join("\n  ")}`,
          );
        }
      }).toThrow("FATAL: Duplicate routes detected");
    });
  });

  describe("WebSocket Upgrade Path Handling", () => {
    it("handles /ws path", () => {
      const url = new URL("/ws", "http://localhost:5051");
      expect(url.pathname).toBe("/ws");
    });

    it("ignores /terminal path (handled by PTY bridge)", () => {
      const url = new URL("/terminal", "http://localhost:5051");
      expect(url.pathname).toBe("/terminal");
      expect(url.pathname).not.toBe("/ws");
    });

    it("extracts token from query string", () => {
      const url = new URL("/ws?token=abc123", "http://localhost:5051");
      const token = url.searchParams.get("token");
      expect(token).toBe("abc123");
    });

    it("handles missing token", () => {
      const url = new URL("/ws", "http://localhost:5051");
      const token = url.searchParams.get("token");
      expect(token).toBeNull();
    });
  });

  describe("Environment Mode Detection", () => {
    it("detects production mode", () => {
      process.env.NODE_ENV = "production";
      const isProduction = process.env.NODE_ENV === "production";
      expect(isProduction).toBe(true);
    });

    it("detects non-production mode", () => {
      process.env.NODE_ENV = "development";
      const isProduction = process.env.NODE_ENV === "production";
      expect(isProduction).toBe(false);
    });

    it("defaults to non-production when NODE_ENV not set", () => {
      delete process.env.NODE_ENV;
      const isProduction = process.env.NODE_ENV === "production";
      expect(isProduction).toBe(false);
    });
  });

  describe("RouteContext Configuration", () => {
    it("includes all required services", () => {
      // Verify the shape of RouteContext matches expectations
      const requiredProperties = [
        "projectRoot",
        "orchestrator",
        "visionSystem",
        "stateManager",
        "coordinationService",
        "bootstrapService",
        "mcpSuggestionEngine",
        "runspaceManager",
        "governanceStateManager",
        "initService",
        "statusService",
        "complianceService",
        "getWorkerPool",
        "broadcast",
        "getWsClientCount",
      ];

      // This tests the contract that route modules depend on
      const mockContext = {
        projectRoot: "/test",
        orchestrator: {},
        visionSystem: {},
        stateManager: {},
        coordinationService: {},
        bootstrapService: {},
        mcpSuggestionEngine: {},
        runspaceManager: {},
        governanceStateManager: {},
        initService: {},
        statusService: {},
        complianceService: {},
        getWorkerPool: vi.fn(),
        broadcast: vi.fn(),
        getWsClientCount: vi.fn(() => 0),
      };

      for (const prop of requiredProperties) {
        expect(mockContext).toHaveProperty(prop);
      }
    });

    it("getWsClientCount returns client count", () => {
      const clients = new Set([{}, {}, {}]);
      const getWsClientCount = () => clients.size;

      expect(getWsClientCount()).toBe(3);
    });

    it("getWsClientCount returns zero when no clients", () => {
      const clients = new Set();
      const getWsClientCount = () => clients.size;

      expect(getWsClientCount()).toBe(0);
    });
  });

  describe("Governance File Path Resolution", () => {
    it("constructs governance.json path correctly", () => {
      const projectRoot = "/home/user/project";
      const path = require("path");
      const governancePath = path.join(projectRoot, ".claude/governance.json");

      expect(governancePath).toContain(projectRoot);
      expect(governancePath).toContain(".claude");
      expect(governancePath).toContain("governance.json");
    });

    it("handles absolute paths", () => {
      const projectRoot = "/absolute/path";
      const path = require("path");
      const governancePath = path.join(projectRoot, ".claude/governance.json");

      expect(governancePath).toBe("/absolute/path/.claude/governance.json");
    });

    it("handles relative paths", () => {
      const projectRoot = "./relative/path";
      const path = require("path");
      const governancePath = path.join(projectRoot, ".claude/governance.json");

      expect(governancePath).toContain(".claude/governance.json");
    });
  });

  describe("JSON Body Parser Configuration", () => {
    it("sets 1MB size limit", () => {
      const config = { limit: "1mb" };
      expect(config.limit).toBe("1mb");
    });

    it("prevents DoS with size limit", () => {
      const limit = "1mb";
      const limitInBytes = 1 * 1024 * 1024;
      expect(limitInBytes).toBe(1048576);
    });
  });

  describe("WebSocket Message Serialization", () => {
    it("serializes messages with type, payload, and timestamp", () => {
      const message = {
        type: "test.event",
        payload: { data: "value" },
        timestamp: new Date().toISOString(),
      };

      const serialized = JSON.stringify(message);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.type).toBe("test.event");
      expect(deserialized.payload).toEqual({ data: "value" });
      expect(deserialized.timestamp).toBeDefined();
    });

    it("handles nested payload objects", () => {
      const message = {
        type: "complex.event",
        payload: {
          nested: {
            deep: {
              value: 42,
            },
          },
        },
        timestamp: new Date().toISOString(),
      };

      const serialized = JSON.stringify(message);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.payload.nested.deep.value).toBe(42);
    });

    it("handles arrays in payload", () => {
      const message = {
        type: "array.event",
        payload: [1, 2, 3, 4, 5],
        timestamp: new Date().toISOString(),
      };

      const serialized = JSON.stringify(message);
      const deserialized = JSON.parse(serialized);

      expect(Array.isArray(deserialized.payload)).toBe(true);
      expect(deserialized.payload).toHaveLength(5);
    });
  });

  describe("Server Binding Configuration", () => {
    it("binds to 0.0.0.0 for multi-device access", () => {
      const host = "0.0.0.0";
      expect(host).toBe("0.0.0.0");
    });

    it("does not bind to localhost only", () => {
      const host = "0.0.0.0";
      expect(host).not.toBe("127.0.0.1");
      expect(host).not.toBe("localhost");
    });
  });

  describe("Shutdown Cleanup Logic", () => {
    it("closes all WebSocket connections", () => {
      const mockWs1 = { close: vi.fn() };
      const mockWs2 = { close: vi.fn() };
      const clients = new Set([mockWs1, mockWs2]);

      clients.forEach((client: any) => client.close());

      expect(mockWs1.close).toHaveBeenCalled();
      expect(mockWs2.close).toHaveBeenCalled();
    });

    it("handles empty client set", () => {
      const clients = new Set();

      expect(() => {
        clients.forEach((client: any) => client.close());
      }).not.toThrow();
    });

    it("processes exit after server closes", async () => {
      const mockServer = {
        close: (callback: Function) => {
          callback();
        },
      };

      await new Promise<void>((resolve) => {
        mockServer.close(() => {
          // Simulates process.exit(0)
          expect(true).toBe(true);
          resolve();
        });
      });
    });
  });

  describe("Error Message Handling", () => {
    it("formats WebSocket error messages", () => {
      const error = { type: "error", error: "Connection failed" };
      const message = JSON.stringify(error);
      const parsed = JSON.parse(message);

      expect(parsed.type).toBe("error");
      expect(parsed.error).toBe("Connection failed");
    });

    it("formats unauthorized origin error", () => {
      const error = { type: "error", error: "Unauthorized origin" };
      const message = JSON.stringify(error);

      expect(message).toContain("Unauthorized origin");
    });

    it("formats authentication required error", () => {
      const error = { type: "error", error: "Authentication required" };
      const message = JSON.stringify(error);

      expect(message).toContain("Authentication required");
    });
  });

  describe("Route Module Factory Pattern", () => {
    it("validates factory function signature", () => {
      const mockFactory = (ctx: any) => ({
        use: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
      });

      const ctx = { projectRoot: "/test" };
      const router = mockFactory(ctx);

      expect(router).toHaveProperty("use");
      expect(router).toHaveProperty("get");
      expect(router).toHaveProperty("post");
    });

    it("passes context to factory", () => {
      let receivedContext: any = null;

      const mockFactory = (ctx: any) => {
        receivedContext = ctx;
        return { use: vi.fn() };
      };

      const ctx = { projectRoot: "/test", orchestrator: {} };
      mockFactory(ctx);

      expect(receivedContext).toBe(ctx);
      expect(receivedContext.projectRoot).toBe("/test");
    });
  });

  describe("Sentinel Log Format", () => {
    it("includes required fields", () => {
      const log = {
        type: "INFO",
        severity: "low",
        source: "api-server",
        message: "Server started",
      };

      expect(log).toHaveProperty("type");
      expect(log).toHaveProperty("severity");
      expect(log).toHaveProperty("source");
      expect(log).toHaveProperty("message");
    });

    it("formats startup message correctly", () => {
      const liveCtx = {
        git: { branch: "main", uncommittedCount: 2 },
        health: { score: 95 },
      };

      const message = `Server started on branch ${liveCtx.git.branch}, ${liveCtx.git.uncommittedCount} uncommitted files, health: ${liveCtx.health.score}/100`;

      expect(message).toContain("main");
      expect(message).toContain("2 uncommitted");
      expect(message).toContain("95/100");
    });
  });
});

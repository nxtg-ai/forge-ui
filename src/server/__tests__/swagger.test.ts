/**
 * Swagger Router Test Suite
 * Tests for OpenAPI spec serving and Swagger UI endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type express from "express";
import swaggerRouter from "../swagger";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ============= Mock Request/Response Helpers =============

interface MockRequest extends Partial<express.Request> {
  path?: string;
  method?: string;
  query?: Record<string, any>;
}

interface MockResponse extends Partial<express.Response> {
  statusCode?: number;
  headers: Record<string, string>;
  jsonData?: any;
  sentData?: any;
  sentFilePath?: string;
  redirectPath?: string;
}

function createMockRequest(overrides?: Partial<MockRequest>): MockRequest {
  return {
    path: "/",
    method: "GET",
    query: {},
    ...overrides,
  };
}

function createMockResponse(): MockResponse & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  sendFile: ReturnType<typeof vi.fn>;
  type: ReturnType<typeof vi.fn>;
  redirect: ReturnType<typeof vi.fn>;
} {
  const res: any = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    sentData: null,
    sentFilePath: null,
    redirectPath: null,
  };

  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = vi.fn((data: any) => {
    res.jsonData = data;
    return res;
  });

  res.send = vi.fn((data: any) => {
    res.sentData = data;
    return res;
  });

  res.sendFile = vi.fn((filePath: string) => {
    res.sentFilePath = filePath;
    return res;
  });

  res.type = vi.fn((contentType: string) => {
    res.headers["content-type"] = contentType;
    return res;
  });

  res.redirect = vi.fn((redirectPath: string) => {
    res.redirectPath = redirectPath;
    return res;
  });

  return res;
}

const mockNext = () => vi.fn();

// ============= Mock Setup =============

// Mock the file system module with full implementation
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock yaml module - use importOriginal to get the real dump function
vi.mock("js-yaml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("js-yaml")>();
  return {
    ...actual,
    load: vi.fn(),
  };
});

// Sample OpenAPI spec for testing
const mockOpenApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "NXTG-Forge API",
    version: "3.0.0",
    description: "AI-Orchestrated Development System API",
  },
  servers: [
    {
      url: "http://localhost:5051",
      description: "Development server",
    },
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "Health check endpoint",
        responses: {
          "200": {
            description: "Service is healthy",
          },
        },
      },
    },
    "/api/commands/execute": {
      post: {
        summary: "Execute a Forge command",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  command: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Command executed successfully",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};

// ============= Swagger Router Tests =============

describe("Swagger Router", () => {
  let dynamicSwaggerRouter: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module cache to force fresh import and clear cached spec
    vi.resetModules();
    // Dynamically import to get fresh instance
    const module = await import("../swagger");
    dynamicSwaggerRouter = module.default;
  });

  describe("GET /api/docs/openapi.json", () => {
    it("serves OpenAPI spec as JSON successfully", async () => {
      // Mock file system to return spec exists
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const req = createMockRequest({ path: "/api/docs/openapi.json" });
      const res = createMockResponse();
      const next = mockNext();

      // Find the route handler
      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      expect(route).toBeDefined();

      // Execute the handler
      await route.route.stack[0].handle(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockOpenApiSpec);
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 error when OpenAPI spec file is missing", async () => {
      // Mock file system to return spec does not exist
      (fs.existsSync as any).mockReturnValue(false);

      const req = createMockRequest({ path: "/api/docs/openapi.json" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Failed to load OpenAPI spec",
          message: expect.stringContaining("OpenAPI spec not found"),
        })
      );
    });

    it("returns 500 error when YAML parsing fails", async () => {
      // Mock file system to return spec exists but YAML parsing fails
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue("invalid: yaml: content:");
      (yaml.load as any).mockImplementation(() => {
        throw new Error("YAML parsing error");
      });

      const req = createMockRequest({ path: "/api/docs/openapi.json" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Failed to load OpenAPI spec",
          message: "YAML parsing error",
        })
      );
    });

    it("caches the OpenAPI spec on subsequent requests", async () => {
      // Setup mock for successful load
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const req1 = createMockRequest({ path: "/api/docs/openapi.json" });
      const res1 = createMockResponse();
      const next1 = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      // First request
      await route.route.stack[0].handle(req1, res1, next1);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      expect(yaml.load).toHaveBeenCalledTimes(1);

      // Second request
      const req2 = createMockRequest({ path: "/api/docs/openapi.json" });
      const res2 = createMockResponse();
      const next2 = mockNext();

      await route.route.stack[0].handle(req2, res2, next2);

      // Should use cache, not read file again
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      expect(yaml.load).toHaveBeenCalledTimes(1);
      expect(res2.json).toHaveBeenCalledWith(mockOpenApiSpec);
    });
  });

  describe("GET /api/docs/openapi.yaml", () => {
    it("serves OpenAPI spec YAML file successfully", async () => {
      const expectedPath = path.join(
        process.cwd(),
        "docs/api/openapi.yaml"
      );
      (fs.existsSync as any).mockReturnValue(true);

      const req = createMockRequest({ path: "/api/docs/openapi.yaml" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.yaml" &&
          layer.route?.methods?.get
      );

      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res, next);

      expect(res.type).toHaveBeenCalledWith("text/yaml");
      expect(res.sendFile).toHaveBeenCalledWith(expectedPath);
    });

    it("returns 404 when YAML file does not exist", async () => {
      (fs.existsSync as any).mockReturnValue(false);

      const req = createMockRequest({ path: "/api/docs/openapi.yaml" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.yaml" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "OpenAPI spec not found",
      });
    });

    it("handles errors when serving YAML file", async () => {
      (fs.existsSync as any).mockImplementation(() => {
        throw new Error("File system error");
      });

      const req = createMockRequest({ path: "/api/docs/openapi.yaml" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.yaml" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Failed to load OpenAPI spec",
          message: "File system error",
        })
      );
    });

    it("handles non-Error exceptions gracefully", async () => {
      (fs.existsSync as any).mockImplementation(() => {
        throw "String error"; // Non-Error exception
      });

      const req = createMockRequest({ path: "/api/docs/openapi.yaml" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.yaml" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Failed to load OpenAPI spec",
          message: "Unknown error",
        })
      );
    });
  });

  describe("GET /api/docs", () => {
    it("serves Swagger UI HTML page", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res, next);

      expect(res.type).toHaveBeenCalledWith("html");
      expect(res.send).toHaveBeenCalled();

      const htmlContent = res.sentData;
      expect(htmlContent).toContain("<!DOCTYPE html>");
      expect(htmlContent).toContain("NXTG-Forge API Documentation");
      expect(htmlContent).toContain("swagger-ui");
    });

    it("includes correct Swagger UI configuration", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const htmlContent = res.sentData;

      // Check for correct OpenAPI spec URL
      expect(htmlContent).toContain('url: "/api/docs/openapi.json"');

      // Check for UI configuration
      expect(htmlContent).toContain("deepLinking: true");
      expect(htmlContent).toContain('docExpansion: "list"');
      expect(htmlContent).toContain("filter: true");
      expect(htmlContent).toContain("tryItOutEnabled: true");
    });

    it("includes custom NXTG-Forge branding", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const htmlContent = res.sentData;

      // Check for branding
      expect(htmlContent).toContain("NXTG-Forge API");
      expect(htmlContent).toContain("AI-Orchestrated Development System");
      expect(htmlContent).toContain("v3.0.0");
      expect(htmlContent).toContain("🔥");
    });

    it("includes custom CSS styling", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const htmlContent = res.sentData;

      // Check for custom colors
      expect(htmlContent).toContain("#1a1a2e"); // Background color
      expect(htmlContent).toContain("#00d4ff"); // Accent color
      expect(htmlContent).toContain("#e94560"); // Primary color
      expect(htmlContent).toContain("#16213e"); // Secondary color

      // Check for styled elements
      expect(htmlContent).toContain(".swagger-ui");
      expect(htmlContent).toContain(".custom-header");
      expect(htmlContent).toContain(".opblock");
    });

    it("loads Swagger UI resources from CDN", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const htmlContent = res.sentData;

      // Check for CDN resources
      expect(htmlContent).toContain(
        "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      );
      expect(htmlContent).toContain(
        "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
      );
    });

    it("has proper HTML structure and meta tags", async () => {
      const req = createMockRequest({ path: "/api/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs" && layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const htmlContent = res.sentData;

      // Check HTML structure
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('<meta charset="UTF-8">');
      expect(htmlContent).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
      expect(htmlContent).toContain("<title>NXTG-Forge API Documentation</title>");
      expect(htmlContent).toContain('<div id="swagger-ui"></div>');
    });
  });

  describe("GET /docs", () => {
    it("redirects to /api/docs", async () => {
      const req = createMockRequest({ path: "/docs" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/docs" && layer.route?.methods?.get
      );

      expect(route).toBeDefined();

      await route.route.stack[0].handle(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith("/api/docs");
    });
  });

  describe("Router configuration", () => {
    it("has all required routes registered", () => {
      const router = dynamicSwaggerRouter;
      const routes = router.stack
        ?.filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/api/docs/openapi.json",
            methods: ["get"],
          }),
          expect.objectContaining({
            path: "/api/docs/openapi.yaml",
            methods: ["get"],
          }),
          expect.objectContaining({
            path: "/api/docs",
            methods: ["get"],
          }),
          expect.objectContaining({
            path: "/docs",
            methods: ["get"],
          }),
        ])
      );
    });

    it("exports an Express Router instance", () => {
      expect(swaggerRouter).toBeDefined();
      expect(typeof swaggerRouter).toBe("function");
      expect(swaggerRouter.stack).toBeDefined();
    });
  });

  describe("OpenAPI spec structure validation", () => {
    it("validates spec has required OpenAPI 3.0 fields", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const req = createMockRequest({ path: "/api/docs/openapi.json" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const spec = res.jsonData;
      expect(spec).toHaveProperty("openapi");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("paths");
    });

    it("serves spec with correct metadata", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const req = createMockRequest({ path: "/api/docs/openapi.json" });
      const res = createMockResponse();
      const next = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req, res, next);

      const spec = res.jsonData;
      expect(spec.info.title).toBe("NXTG-Forge API");
      expect(spec.info.version).toBe("3.0.0");
    });
  });

  describe("Edge cases and error handling", () => {
    it("handles multiple sequential errors gracefully", async () => {
      // First request fails
      (fs.existsSync as any).mockReturnValue(false);

      const req1 = createMockRequest({ path: "/api/docs/openapi.json" });
      const res1 = createMockResponse();
      const next1 = mockNext();

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      await route.route.stack[0].handle(req1, res1, next1);
      expect(res1.statusCode).toBe(500);

      // Second request succeeds
      vi.clearAllMocks();
      vi.resetModules();
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const req2 = createMockRequest({ path: "/api/docs/openapi.json" });
      const res2 = createMockResponse();
      const next2 = mockNext();

      await route.route.stack[0].handle(req2, res2, next2);
      expect(res2.json).toHaveBeenCalledWith(mockOpenApiSpec);
    });

    it("handles concurrent requests correctly", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        yaml.dump(mockOpenApiSpec)
      );
      (yaml.load as any).mockReturnValue(mockOpenApiSpec);

      const router = dynamicSwaggerRouter;
      const route = router.stack?.find(
        (layer: any) =>
          layer.route?.path === "/api/docs/openapi.json" &&
          layer.route?.methods?.get
      );

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => {
        const req = createMockRequest({ path: "/api/docs/openapi.json" });
        const res = createMockResponse();
        const next = mockNext();
        return route.route.stack[0].handle(req, res, next);
      });

      await Promise.all(requests);

      // Should only read file once due to caching
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });
});

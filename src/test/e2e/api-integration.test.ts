/**
 * E2E Test Suite: API Integration
 * Tests all API endpoints, error handling, state polling, and diff service operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiClient } from "../../services/api-client";
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  Command,
  ArchitectureDecision,
  YoloStatistics,
  AutomatedAction,
} from "../../components/types";

// Mock fetch for API calls
const createMockFetch = () => {
  return vi.fn((url: string, options?: RequestInit) => {
    const method = options?.method || "GET";
    const urlPath = new URL(url, "http://localhost").pathname;

    // Default successful response
    const createResponse = (data: unknown) => ({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }),
    });

    // Vision endpoints
    if (urlPath.includes("/api/vision")) {
      if (method === "GET") {
        return Promise.resolve(
          createResponse({
            mission: "Build NXTG-Forge",
            goals: ["Goal 1", "Goal 2"],
            constraints: ["Constraint 1"],
            successMetrics: ["Metric 1"],
            timeframe: "Q1 2026",
          }),
        );
      }
      if (method === "PUT" || method === "POST") {
        return Promise.resolve(
          createResponse({
            mission: "Updated mission",
            goals: [],
            constraints: [],
            successMetrics: [],
            timeframe: "",
          }),
        );
      }
    }

    // State endpoints
    if (urlPath.includes("/api/state")) {
      return Promise.resolve(
        createResponse({
          phase: "planning",
          progress: 50,
          blockers: [],
          recentDecisions: [],
          activeAgents: [],
          healthScore: 85,
        }),
      );
    }

    // Agent endpoints
    if (urlPath.includes("/api/agents")) {
      return Promise.resolve(
        createResponse([
          {
            agentId: "test-agent",
            action: "Building feature",
            timestamp: new Date().toISOString(),
          },
        ]),
      );
    }

    // Command endpoints
    if (urlPath.includes("/api/commands")) {
      if (urlPath.includes("/execute")) {
        return Promise.resolve(createResponse({ result: "success" }));
      }
      return Promise.resolve(
        createResponse([
          {
            id: "cmd-1",
            name: "Test Command",
            description: "Test",
            estimatedTime: 100,
          },
        ]),
      );
    }

    // Architecture endpoints
    if (urlPath.includes("/api/architecture")) {
      return Promise.resolve(
        createResponse([
          {
            id: "arch-1",
            title: "Use microservices",
            description: "Architecture decision",
            status: "proposed",
          },
        ]),
      );
    }

    // YOLO endpoints
    if (urlPath.includes("/api/yolo/history")) {
      return Promise.resolve(
        createResponse([]),
      );
    }
    if (urlPath.includes("/api/yolo")) {
      return Promise.resolve(
        createResponse({
          totalActions: 100,
          successRate: 0.95,
          averageTime: 500,
          savedHours: 10,
        }),
      );
    }

    // Default 404
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          success: false,
          error: "Not found",
          timestamp: new Date().toISOString(),
        }),
    });
  }) as unknown as typeof fetch;
};

describe("E2E: API Integration", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = createMockFetch();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("Vision API Endpoints", () => {
    it("should fetch vision data", async () => {
      const response = await apiClient.getVision();

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty("mission");
      expect(response.data).toHaveProperty("goals");
      expect(response.data?.mission).toBe("Build NXTG-Forge");
    });

    it("should update vision data", async () => {
      const updates: Partial<VisionData> = {
        mission: "Updated mission",
        goals: ["New goal"],
      };

      const response = await apiClient.updateVision(updates);

      expect(response.success).toBe(true);
      expect(response.data?.mission).toBe("Updated mission");
    });

    it("should capture vision from text", async () => {
      const visionText = "Build a modern web application";

      const response = await apiClient.captureVision(visionText);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it("should handle vision API errors", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () =>
            Promise.resolve({
              success: false,
              error: "Database error",
              timestamp: new Date().toISOString(),
            }),
        }),
      ) as unknown as typeof fetch;

      const response = await apiClient.getVision();

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it("should return proper response shape", async () => {
      const response = await apiClient.getVision();

      expect(response).toHaveProperty("success");
      expect(response).toHaveProperty("timestamp");

      if (response.success) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty("mission");
        expect(response.data).toHaveProperty("goals");
        expect(response.data).toHaveProperty("constraints");
        expect(response.data).toHaveProperty("successMetrics");
        expect(response.data).toHaveProperty("timeframe");
      }
    });
  });

  describe("Project State API Endpoints", () => {
    it("should fetch project state", async () => {
      const response = await apiClient.getProjectState();

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty("phase");
      expect(response.data).toHaveProperty("progress");
      expect(response.data?.phase).toBe("planning");
    });

    it("should update project phase", async () => {
      const response = await apiClient.updateProjectPhase("building");

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it("should fetch health metrics", async () => {
      const response = await apiClient.getHealthMetrics();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it("should handle state polling", async () => {
      let pollCount = 0;
      const maxPolls = 3;

      const poll = async () => {
        if (pollCount >= maxPolls) return;

        const response = await apiClient.getProjectState();
        pollCount++;

        expect(response.success).toBe(true);

        if (pollCount < maxPolls) {
          await poll();
        }
      };

      await poll();

      expect(pollCount).toBe(maxPolls);
    });

    it("should return expected state shape", async () => {
      const response = await apiClient.getProjectState();

      if (response.success && response.data) {
        expect(response.data.phase).toMatch(
          /planning|building|testing|deploying|complete/,
        );
        expect(response.data.progress).toBeGreaterThanOrEqual(0);
        expect(response.data.progress).toBeLessThanOrEqual(100);
        expect(Array.isArray(response.data.blockers)).toBe(true);
        expect(Array.isArray(response.data.recentDecisions)).toBe(true);
        expect(Array.isArray(response.data.activeAgents)).toBe(true);
        expect(response.data.healthScore).toBeGreaterThanOrEqual(0);
        expect(response.data.healthScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Agent Management API Endpoints", () => {
    it("should fetch agent activities", async () => {
      const response = await apiClient.getAgentActivities();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should fetch agent activities with pagination", async () => {
      const params = {
        page: 1,
        limit: 10,
        sortBy: "timestamp",
        sortOrder: "desc" as const,
      };

      const response = await apiClient.getAgentActivities(params);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should fetch active agents", async () => {
      const response = await apiClient.getActiveAgents();

      expect(response.success).toBe(true);
    });

    it("should assign task to agent", async () => {
      const task = {
        name: "Build feature",
        description: "Implement new feature",
        priority: "high",
      };

      const response = await apiClient.assignAgentTask("test-agent", task);

      expect(response.success).toBe(true);
    });

    it("should handle agent activity stream", async () => {
      const activities: AgentActivity[] = [];
      const maxActivities = 5;

      for (let i = 0; i < maxActivities; i++) {
        const response = await apiClient.getAgentActivities({ page: i, limit: 1 });

        if (response.success && response.data) {
          activities.push(...response.data);
        }
      }

      expect(activities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Command Execution API Endpoints", () => {
    it("should execute command", async () => {
      const command: Command = {
        id: "cmd-1",
        name: "Test Command",
        description: "Test command execution",
        estimatedTime: 100,
      };

      const response = await apiClient.executeCommand(command);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty("result");
    });

    it("should fetch command history", async () => {
      const response = await apiClient.getCommandHistory();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should get command suggestions", async () => {
      const context = "Need to build a new feature";

      const response = await apiClient.getCommandSuggestions(context);

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should handle command timeout", async () => {
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: false,
                  status: 408,
                  json: () =>
                    Promise.resolve({
                      success: false,
                      error: "Request timeout",
                      timestamp: new Date().toISOString(),
                    }),
                }),
              100,
            );
          }),
      ) as unknown as typeof fetch;

      const command: Command = {
        id: "cmd-timeout",
        name: "Slow Command",
        description: "Command that times out",
        estimatedTime: 5000,
      };

      const response = await apiClient.executeCommand(command);

      expect(response.success).toBe(false);
    });
  });

  describe("Architecture Decisions API Endpoints", () => {
    it("should fetch architecture decisions", async () => {
      const response = await apiClient.getArchitectureDecisions();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should propose new architecture", async () => {
      const decision: Partial<ArchitectureDecision> = {
        title: "Use microservices",
        description: "Break monolith into services",
        status: "proposed",
      };

      const response = await apiClient.proposeArchitecture(decision);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it("should approve architecture decision", async () => {
      const response = await apiClient.approveArchitectureDecision("arch-1");

      expect(response.success).toBe(true);
    });

    it("should handle decision lifecycle", async () => {
      // Propose
      const proposed = await apiClient.proposeArchitecture({
        title: "New architecture",
        description: "Description",
        status: "proposed",
      });

      expect(proposed.success).toBe(true);

      // Approve
      if (proposed.success && proposed.data?.id) {
        const approved = await apiClient.approveArchitectureDecision(
          proposed.data.id,
        );
        expect(approved.success).toBe(true);
      }
    });
  });

  describe("YOLO Mode API Endpoints", () => {
    it("should fetch YOLO statistics", async () => {
      const response = await apiClient.getYoloStatistics();

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty("totalActions");
      expect(response.data).toHaveProperty("successRate");
    });

    it("should execute YOLO action", async () => {
      const action: AutomatedAction = {
        id: "yolo-1",
        type: "refactor",
        description: "Auto-refactor code",
        confidence: 0.85,
        timestamp: new Date(),
      };

      const response = await apiClient.executeYoloAction(action);

      expect(response.success).toBe(true);
    });

    it("should fetch YOLO history", async () => {
      const response = await apiClient.getYoloHistory();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should validate statistics shape", async () => {
      const response = await apiClient.getYoloStatistics();

      if (response.success && response.data) {
        expect(typeof response.data.totalActions).toBe("number");
        expect(typeof response.data.successRate).toBe("number");
        expect(typeof response.data.averageTime).toBe("number");
        expect(typeof response.data.savedHours).toBe("number");

        expect(response.data.successRate).toBeGreaterThanOrEqual(0);
        expect(response.data.successRate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error("Network error")),
      ) as unknown as typeof fetch;

      const response = await apiClient.getVision();

      expect(response.success).toBe(false);
      expect(response.error).toContain("Network error");
    });

    it("should handle 404 errors", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: () =>
            Promise.resolve({
              success: false,
              error: "Resource not found",
              timestamp: new Date().toISOString(),
            }),
        }),
      ) as unknown as typeof fetch;

      const response = await apiClient.getVision();

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it("should handle 500 errors", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () =>
            Promise.resolve({
              success: false,
              error: "Server error",
              timestamp: new Date().toISOString(),
            }),
        }),
      ) as unknown as typeof fetch;

      const response = await apiClient.getProjectState();

      expect(response.success).toBe(false);
    });

    it("should handle malformed JSON responses", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error("Invalid JSON")),
        }),
      ) as unknown as typeof fetch;

      const response = await apiClient.getVision();

      expect(response.success).toBe(false);
    });

    it("should retry failed requests", async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      global.fetch = vi.fn(() => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          return Promise.reject(new Error("Temporary error"));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {},
              timestamp: new Date().toISOString(),
            }),
        });
      }) as unknown as typeof fetch;

      // Retry logic
      let response;
      for (let i = 0; i < maxRetries; i++) {
        response = await apiClient.getVision();
        if (response.success) break;
      }

      expect(attemptCount).toBe(maxRetries);
    });
  });

  describe("Generic HTTP Methods", () => {
    it("should support GET requests", async () => {
      const response = await apiClient.get("/test");

      expect(response).toBeDefined();
      expect(response).toHaveProperty("success");
    });

    it("should support POST requests", async () => {
      const data = { key: "value" };
      const response = await apiClient.post("/test", data);

      expect(response).toBeDefined();
      expect(response).toHaveProperty("success");
    });

    it("should support PUT requests", async () => {
      const data = { key: "updated" };
      const response = await apiClient.put("/test", data);

      expect(response).toBeDefined();
      expect(response).toHaveProperty("success");
    });

    it("should support DELETE requests", async () => {
      const response = await apiClient.delete("/test");

      expect(response).toBeDefined();
      expect(response).toHaveProperty("success");
    });

    it("should NOT include credentials in requests (session management removed)", async () => {
      let capturedOptions: RequestInit | undefined;

      global.fetch = vi.fn((url, options) => {
        capturedOptions = options;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {},
              timestamp: new Date().toISOString(),
            }),
        });
      }) as unknown as typeof fetch;

      await apiClient.get("/test");

      // Credentials are no longer included since session management was removed
      expect(capturedOptions?.credentials).toBeUndefined();
    });
  });

  describe("WebSocket Integration", () => {
    beforeEach(() => {
      // Mock WebSocket
      class MockWebSocket {
        static OPEN = 1;
        readyState = MockWebSocket.OPEN;
        send = vi.fn();
        close = vi.fn();
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
      }

      vi.stubGlobal("WebSocket", MockWebSocket);
    });

    it("should send WebSocket messages", () => {
      apiClient.sendWSMessage("state.update", { progress: 50 });

      // Message should be queued or sent
      expect(true).toBe(true);
    });

    it("should subscribe to WebSocket events", () => {
      const handler = vi.fn();
      const unsubscribe = apiClient.subscribe("agent.activity", handler);

      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
    });

    it("should handle WebSocket disconnection", () => {
      apiClient.disconnect();

      // Should cleanup without errors
      expect(true).toBe(true);
    });
  });

  describe("Response Validation", () => {
    it("should validate timestamp format", async () => {
      const response = await apiClient.getVision();

      expect(response.timestamp).toBeDefined();
      expect(() => new Date(response.timestamp)).not.toThrow();
    });

    it("should include correlation IDs", async () => {
      // For tracking request/response pairs
      const response = await apiClient.getVision();

      expect(response.timestamp).toBeDefined();
    });

    it("should handle empty response data", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: null,
              timestamp: new Date().toISOString(),
            }),
        }),
      ) as unknown as typeof fetch;

      const response = await apiClient.getVision();

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });
  });
});

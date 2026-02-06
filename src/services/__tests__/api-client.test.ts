/**
 * API Client Tests
 * Comprehensive tests for API communication and WebSocket handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient } from "../api-client";
import type { VisionData, ProjectState, Command } from "../../components/types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock ws-manager module
vi.mock("../ws-manager", () => ({
  wsManager: {
    subscribe: vi.fn((eventType: string, handler: (data: unknown) => void) => {
      return () => {}; // Return unsubscribe function
    }),
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getState: vi.fn(() => ({
      status: "connected",
      reconnectAttempt: 0,
      latency: 0,
    })),
  },
}));

describe("ApiClient", () => {
  let client: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient();
  });

  afterEach(() => {
    client.disconnect();
  });

  describe("HTTP Methods", () => {
    describe("get", () => {
      it("should make GET request", async () => {
        const mockData = { success: true, data: { test: "value" }, timestamp: new Date().toISOString() };
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockData,
        } as Response);

        const result = await client.get("/test");

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/test"),
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          }),
        );
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ test: "value" });
      });

      it("should handle GET errors", async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ error: "Resource not found" }),
        } as Response);

        const result = await client.get("/nonexistent");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Resource not found");
      });
    });

    describe("post", () => {
      it("should make POST request with body", async () => {
        const mockData = { success: true, data: { id: "123" }, timestamp: new Date().toISOString() };
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockData,
        } as Response);

        const payload = { name: "test", value: 42 };
        const result = await client.post("/create", payload);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/create"),
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(payload),
          }),
        );
        expect(result.success).toBe(true);
      });

      it("should handle POST errors", async () => {
        vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

        const result = await client.post("/create", {});

        expect(result.success).toBe(false);
        expect(result.error).toContain("Network error");
      });
    });

    describe("put", () => {
      it("should make PUT request", async () => {
        const mockData = { success: true, timestamp: new Date().toISOString() };
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockData,
        } as Response);

        const payload = { updated: true };
        await client.put("/update/123", payload);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/update/123"),
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify(payload),
          }),
        );
      });
    });

    describe("delete", () => {
      it("should make DELETE request", async () => {
        const mockData = { success: true, timestamp: new Date().toISOString() };
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockData,
        } as Response);

        await client.delete("/delete/123");

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/delete/123"),
          expect.objectContaining({
            method: "DELETE",
          }),
        );
      });

      it("should include body in DELETE request when provided", async () => {
        const mockData = { success: true, timestamp: new Date().toISOString() };
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          json: async () => mockData,
        } as Response);

        const payload = { reason: "no longer needed" };
        await client.delete("/delete/123", payload);

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/delete/123"),
          expect.objectContaining({
            method: "DELETE",
            body: JSON.stringify(payload),
          }),
        );
      });
    });
  });

  describe("Vision Management", () => {
    it("should get vision data", async () => {
      const visionData: VisionData = {
        directive: "Build amazing software",
        goals: ["Goal 1", "Goal 2"],
        constraints: ["Constraint 1"],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: visionData, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getVision();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(visionData);
    });

    it("should update vision", async () => {
      const updatedVision: Partial<VisionData> = {
        directive: "Updated directive",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: updatedVision, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.updateVision(updatedVision);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vision"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updatedVision),
        }),
      );
    });

    it("should capture vision", async () => {
      const visionText = "I want to build a todo app";

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {}, timestamp: new Date().toISOString() }),
      } as Response);

      await client.captureVision(visionText);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/vision/capture"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ text: visionText }),
        }),
      );
    });
  });

  describe("Project State", () => {
    it("should get project state", async () => {
      const projectState: ProjectState = {
        phase: "building",
        progress: 50,
        blockers: [],
        recentDecisions: [],
        activeAgents: [],
        healthScore: 85,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: projectState, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getProjectState();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(projectState);
    });

    it("should update project phase", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {}, timestamp: new Date().toISOString() }),
      } as Response);

      await client.updateProjectPhase("testing");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/state/phase"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ phase: "testing" }),
        }),
      );
    });

    it("should get health metrics", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: 90, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getHealthMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toBe(90);
    });
  });

  describe("Agent Management", () => {
    it("should get agent activities", async () => {
      const activities = [
        { id: "1", agent: "builder", action: "Building", timestamp: new Date() },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: activities, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getAgentActivities();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(activities);
    });

    it("should get active agents", async () => {
      const agents = [
        { id: "agent-1", name: "Builder", role: "builder", status: "working" as const, currentTask: "Building", confidence: 0.9 },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: agents, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getActiveAgents();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(agents);
    });

    it("should assign task to agent", async () => {
      const task = { description: "Build feature X", priority: "high" };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { taskId: "task-123" }, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.assignAgentTask("agent-1", task);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/agents/agent-1/tasks"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(task),
        }),
      );
      expect(result.data?.taskId).toBe("task-123");
    });
  });

  describe("Command Execution", () => {
    it("should execute command", async () => {
      const command: Command = {
        id: "cmd-1",
        name: "test-command",
        args: {},
        timestamp: new Date(),
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { result: "executed" }, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.executeCommand(command);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/commands/execute"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ command: command.id }),
        }),
      );
    });

    it("should get command history", async () => {
      const history: Command[] = [
        { id: "cmd-1", name: "test", args: {}, timestamp: new Date() },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: history, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getCommandHistory();

      expect(result.data).toEqual(history);
    });

    it("should get command suggestions", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
      } as Response);

      await client.getCommandSuggestions("build app");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/commands/suggestions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ context: "build app" }),
        }),
      );
    });
  });

  describe("Architecture Decisions", () => {
    it("should get architecture decisions", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
      } as Response);

      await client.getArchitectureDecisions();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/architecture/decisions"),
        expect.any(Object),
      );
    });

    it("should propose architecture", async () => {
      const decision = {
        title: "Use microservices",
        description: "Split into multiple services",
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: decision, timestamp: new Date().toISOString() }),
      } as Response);

      await client.proposeArchitecture(decision);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/architecture/propose"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(decision),
        }),
      );
    });

    it("should approve architecture decision", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {}, timestamp: new Date().toISOString() }),
      } as Response);

      await client.approveArchitectureDecision("decision-123");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/architecture/decisions/decision-123/approve"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("YOLO Mode", () => {
    it("should get YOLO statistics", async () => {
      const stats = {
        totalActions: 42,
        successRate: 0.95,
        activeMode: true,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: stats, timestamp: new Date().toISOString() }),
      } as Response);

      const result = await client.getYoloStatistics();

      expect(result.data).toEqual(stats);
    });

    it("should execute YOLO action", async () => {
      const action = {
        id: "action-1",
        type: "automated",
        description: "Auto-fix",
        timestamp: new Date(),
        status: "pending" as const,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { actionId: "action-1" }, timestamp: new Date().toISOString() }),
      } as Response);

      await client.executeYoloAction(action);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/yolo/execute"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(action),
        }),
      );
    });

    it("should get YOLO history", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: new Date().toISOString() }),
      } as Response);

      await client.getYoloHistory();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/yolo/history"),
        expect.any(Object),
      );
    });
  });

  describe("WebSocket Management (delegated to wsManager)", () => {
    it("should delegate subscribe to wsManager", async () => {
      const { wsManager } = await import("../ws-manager");
      const handler = vi.fn();

      const unsubscribe = client.subscribe("agent.activity", handler);

      expect(wsManager.subscribe).toHaveBeenCalledWith("agent.activity", handler);
      expect(typeof unsubscribe).toBe("function");
    });

    it("should delegate sendWSMessage to wsManager", async () => {
      const { wsManager } = await import("../ws-manager");

      client.sendWSMessage("command.executed", { commandId: "test" });

      expect(wsManager.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "command.executed",
          payload: { commandId: "test" },
          timestamp: expect.any(String),
          correlationId: expect.any(String),
        }),
      );
    });

    it("should handle disconnect as no-op", () => {
      // disconnect() is now a no-op since wsManager manages lifecycle
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await client.get("/test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle non-ok HTTP responses", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error" }),
      } as Response);

      const result = await client.get("/test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server error");
    });

    it("should handle malformed JSON responses", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const result = await client.get("/test");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should NOT include credentials in requests (session management removed)", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, timestamp: new Date().toISOString() }),
      } as Response);

      await client.get("/test");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      // Verify credentials are NOT included
      const callArgs = vi.mocked(fetch).mock.calls[0];
      const options = callArgs[1] as RequestInit;
      expect(options.credentials).toBeUndefined();
    });
  });
});

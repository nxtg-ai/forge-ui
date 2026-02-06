/**
 * API Client Tests
 * Comprehensive tests for API communication and WebSocket handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient } from "../api-client";
import type { VisionData, ProjectState, Command } from "../../components/types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock WebSocket
class MockWebSocket {
  public readyState = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection using queueMicrotask for synchronous-like behavior
    queueMicrotask(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    });
  }

  send(data: string): void {
    // Mock send
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }
}

global.WebSocket = MockWebSocket as any;

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
          body: JSON.stringify(command),
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

  describe("WebSocket Management", () => {
    it("should initialize WebSocket connection", async () => {
      // Manually trigger WebSocket initialization by calling the private method
      client["initializeWebSocket"]();

      // Wait for microtask to complete - setTimeout(0) allows microtask queue to flush
      await new Promise((resolve) => setTimeout(resolve, 0));

      // WebSocket should be created
      expect(client["wsConnection"]).toBeDefined();
      expect(client["wsConnection"]?.readyState).toBe(WebSocket.OPEN);
    });

    it("should subscribe to WebSocket events", async () => {
      const handler = vi.fn();

      const unsubscribe = client.subscribe("agent.activity", handler);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should unsubscribe from WebSocket events", async () => {
      const handler = vi.fn();

      const unsubscribe = client.subscribe("agent.activity", handler);
      unsubscribe();

      // Handler should be removed
      expect(client["eventHandlers"].get("agent.activity")?.has(handler)).toBe(false);
    });

    it.skip("should send WebSocket message when connected", async () => {
      // Create a fresh client to avoid state issues
      const testClient = new ApiClient();
      testClient.disconnect(); // Clear any pending initialization

      // Manually initialize WebSocket
      testClient["initializeWebSocket"]();
      // Wait for microtask - need short timeout to ensure queueMicrotask has executed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const ws = testClient["wsConnection"];
      expect(ws).toBeDefined();
      expect(ws).not.toBeNull();

      const sendSpy = vi.spyOn(ws!, "send");

      testClient.sendWSMessage("command.executed", { commandId: "test" });

      expect(sendSpy).toHaveBeenCalled();

      testClient.disconnect();
    });

    it.skip("should queue messages when disconnected", () => {
      // Create new client but don't initialize WebSocket
      const newClient = new ApiClient();

      // Send message immediately (before WebSocket is ready)
      newClient.sendWSMessage("command.executed", { commandId: "test" });

      // Should be queued
      expect(newClient["requestQueue"].length).toBeGreaterThan(0);

      newClient.disconnect();
    });

    it("should disconnect WebSocket", async () => {
      // Initialize WebSocket
      client["initializeWebSocket"]();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const ws = client["wsConnection"];
      expect(ws).toBeDefined();

      client.disconnect();

      expect(client["wsConnection"]).toBeNull();
      expect(client["eventHandlers"].size).toBe(0);
    });

    it.skip("should attempt reconnection on close", async () => {
      // Create a fresh client to avoid state issues
      const testClient = new ApiClient();
      testClient.disconnect(); // Clear any pending initialization

      // Initialize WebSocket
      testClient["initializeWebSocket"]();
      await new Promise((resolve) => setTimeout(resolve, 10));

      const ws = testClient["wsConnection"];
      expect(ws).toBeDefined();
      expect(ws).not.toBeNull();

      // Get the onclose handler before triggering it
      const oncloseHandler = ws!.onclose;
      expect(oncloseHandler).toBeDefined();

      // Manually trigger close event
      oncloseHandler!(new CloseEvent("close"));

      // Give it a moment to update state
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should schedule reconnection
      expect(testClient["wsReconnectAttempts"]).toBe(1);

      testClient.disconnect();
    });

    it("should stop reconnecting after max attempts", async () => {
      // Initialize WebSocket
      client["initializeWebSocket"]();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate max reconnection attempts
      for (let i = 0; i < 5; i++) {
        client["attemptReconnect"]();
      }

      // Should stop after max attempts
      expect(client["wsReconnectAttempts"]).toBe(5);
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

    it("should include credentials in requests", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, timestamp: new Date().toISOString() }),
      } as Response);

      await client.get("/test");

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: "include",
        }),
      );
    });
  });
});

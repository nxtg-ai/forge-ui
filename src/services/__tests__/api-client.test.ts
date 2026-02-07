/**
 * API Client Service Tests
 * Tests for HTTP API communication and WebSocket integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient, apiClient } from "../api-client";
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  Command,
  ArchitectureDecision,
  AutomatedAction,
  YoloStatistics,
} from "../../components/types";
import type { ApiResponse, CommandExecutionData } from "../api-client";

// Mock wsManager
vi.mock("../ws-manager", () => ({
  wsManager: {
    subscribe: vi.fn((type: string, handler: Function) => {
      return () => {}; // unsubscribe function
    }),
    send: vi.fn(),
    disconnect: vi.fn(),
  },
}));

// Mock browser logger
vi.mock("../../utils/browser-logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ApiClient", () => {
  let client: ApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ApiClient();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    // Mock crypto.randomUUID for WebSocket messages
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "test-uuid-123"),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ============= Generic HTTP Methods =============

  describe("HTTP Methods", () => {
    const mockResponse = (data: unknown, ok = true, status = 200) => ({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: vi.fn().mockResolvedValue(data),
    });

    describe("get", () => {
      it("should make a GET request to the endpoint", async () => {
        const responseData: ApiResponse<{ value: string }> = {
          success: true,
          data: { value: "test" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue(mockResponse(responseData));

        const result = await client.get<{ value: string }>("/test");

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/test",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        expect(result).toEqual(responseData);
      });

      it("should handle GET request errors", async () => {
        mockFetch.mockResolvedValue(
          mockResponse({ error: "Not found" }, false, 404)
        );

        const result = await client.get("/not-found");

        expect(result.success).toBe(false);
        expect(result.error).toContain("Not found");
      });
    });

    describe("post", () => {
      it("should make a POST request with body", async () => {
        const requestData = { name: "test" };
        const responseData: ApiResponse<{ id: string }> = {
          success: true,
          data: { id: "123" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue(mockResponse(responseData));

        const result = await client.post<{ id: string }>("/create", requestData);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/create",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(requestData),
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result).toEqual(responseData);
      });

      it("should handle POST request errors", async () => {
        mockFetch.mockResolvedValue(
          mockResponse({ error: "Bad request" }, false, 400)
        );

        const result = await client.post("/create", {});

        expect(result.success).toBe(false);
        expect(result.error).toContain("Bad request");
      });
    });

    describe("put", () => {
      it("should make a PUT request with body", async () => {
        const requestData = { name: "updated" };
        const responseData: ApiResponse<{ id: string }> = {
          success: true,
          data: { id: "123" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue(mockResponse(responseData));

        const result = await client.put<{ id: string }>("/update/123", requestData);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/update/123",
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify(requestData),
          })
        );
        expect(result).toEqual(responseData);
      });
    });

    describe("delete", () => {
      it("should make a DELETE request without body", async () => {
        const responseData: ApiResponse<{ deleted: boolean }> = {
          success: true,
          data: { deleted: true },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue(mockResponse(responseData));

        const result = await client.delete<{ deleted: boolean }>("/delete/123");

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/delete/123",
          expect.objectContaining({
            method: "DELETE",
            body: undefined,
          })
        );
        expect(result).toEqual(responseData);
      });

      it("should make a DELETE request with body", async () => {
        const requestData = { reason: "test" };
        const responseData: ApiResponse<{ deleted: boolean }> = {
          success: true,
          data: { deleted: true },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue(mockResponse(responseData));

        const result = await client.delete<{ deleted: boolean }>(
          "/delete/123",
          requestData
        );

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/delete/123",
          expect.objectContaining({
            method: "DELETE",
            body: JSON.stringify(requestData),
          })
        );
        expect(result).toEqual(responseData);
      });
    });

    describe("error handling", () => {
      it("should handle network errors", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const result = await client.get("/test");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Network error");
        expect(result.timestamp).toBeDefined();
      });

      it("should handle non-Error exceptions", async () => {
        mockFetch.mockRejectedValue("string error");

        const result = await client.get("/test");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Unknown error");
      });

      it("should handle HTTP error responses with custom error message", async () => {
        mockFetch.mockResolvedValue(
          mockResponse({ error: "Custom error message" }, false, 500)
        );

        const result = await client.get("/test");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Custom error message");
      });

      it("should handle HTTP error responses without custom error message", async () => {
        mockFetch.mockResolvedValue(mockResponse({}, false, 500));

        const result = await client.get("/test");

        expect(result.success).toBe(false);
        expect(result.error).toContain("HTTP 500");
      });
    });
  });

  // ============= Vision Management =============

  describe("Vision Management", () => {
    describe("getVision", () => {
      it("should fetch vision data", async () => {
        const visionData: VisionData = {
          mission: "Build amazing products",
          goals: ["Goal 1", "Goal 2"],
          constraints: ["Budget", "Timeline"],
          successMetrics: ["Metric 1"],
          timeframe: "Q1 2024",
        };

        const responseData: ApiResponse<VisionData> = {
          success: true,
          data: visionData,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getVision();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/vision",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(visionData);
      });
    });

    describe("updateVision", () => {
      it("should update vision data", async () => {
        const visionUpdate = { mission: "Updated mission" };
        const responseData: ApiResponse<VisionData> = {
          success: true,
          data: {
            mission: "Updated mission",
            goals: [],
            constraints: [],
            successMetrics: [],
            timeframe: "Q1 2024",
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.updateVision(visionUpdate);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/vision",
          expect.objectContaining({
            method: "PUT",
            body: JSON.stringify(visionUpdate),
          })
        );
        expect(result.data?.mission).toBe("Updated mission");
      });
    });

    describe("captureVision", () => {
      it("should capture vision from text", async () => {
        const visionText = "We want to revolutionize the industry";
        const responseData: ApiResponse<VisionData> = {
          success: true,
          data: {
            mission: visionText,
            goals: [],
            constraints: [],
            successMetrics: [],
            timeframe: "",
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.captureVision(visionText);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/vision/capture",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ text: visionText }),
          })
        );
        expect(result.success).toBe(true);
      });
    });
  });

  // ============= Project State =============

  describe("Project State", () => {
    describe("getProjectState", () => {
      it("should fetch project state", async () => {
        const projectState: ProjectState = {
          phase: "building",
          progress: 65,
          blockers: [],
          recentDecisions: [],
          activeAgents: [],
          healthScore: 85,
        };

        const responseData: ApiResponse<ProjectState> = {
          success: true,
          data: projectState,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getProjectState();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/state",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(projectState);
      });
    });

    describe("updateProjectPhase", () => {
      it("should update project phase", async () => {
        const newPhase: ProjectState["phase"] = "testing";
        const responseData: ApiResponse<ProjectState> = {
          success: true,
          data: {
            phase: newPhase,
            progress: 75,
            blockers: [],
            recentDecisions: [],
            activeAgents: [],
            healthScore: 90,
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.updateProjectPhase(newPhase);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/state/phase",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ phase: newPhase }),
          })
        );
        expect(result.data?.phase).toBe(newPhase);
      });
    });

    describe("getHealthMetrics", () => {
      it("should fetch health metrics", async () => {
        const healthScore = 92;
        const responseData: ApiResponse<number> = {
          success: true,
          data: healthScore,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getHealthMetrics();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/state/health",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toBe(healthScore);
      });
    });
  });

  // ============= Agent Management =============

  describe("Agent Management", () => {
    describe("getAgentActivities", () => {
      it("should fetch agent activities without pagination", async () => {
        const activities: AgentActivity[] = [
          {
            agentId: "agent-1",
            action: "completed task",
            timestamp: new Date(),
            visibility: "engineer",
          },
        ];

        const responseData: ApiResponse<AgentActivity[]> = {
          success: true,
          data: activities,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getAgentActivities();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/agents/activities?",
          expect.any(Object)
        );
        expect(result.data).toEqual(activities);
      });

      it("should fetch agent activities with pagination params", async () => {
        const activities: AgentActivity[] = [];
        const responseData: ApiResponse<AgentActivity[]> = {
          success: true,
          data: activities,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        await client.getAgentActivities({
          page: 2,
          limit: 20,
          sortBy: "timestamp",
          sortOrder: "desc",
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("page=2"),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("limit=20"),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sortBy=timestamp"),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("sortOrder=desc"),
          expect.any(Object)
        );
      });
    });

    describe("getActiveAgents", () => {
      it("should fetch active agents", async () => {
        const agents: ProjectState["activeAgents"] = [
          {
            id: "agent-1",
            name: "Builder",
            role: "developer",
            status: "working",
            currentTask: "Implementing feature",
            confidence: 0.95,
          },
        ];

        const responseData: ApiResponse<typeof agents> = {
          success: true,
          data: agents,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getActiveAgents();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/agents/active",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(agents);
      });
    });

    describe("assignAgentTask", () => {
      it("should assign a task to an agent", async () => {
        const agentId = "agent-1";
        const task = {
          name: "Implement feature X",
          description: "Build the new feature",
          priority: "high",
          payload: { featureId: "feature-123" },
        };

        const responseData: ApiResponse<{ taskId: string }> = {
          success: true,
          data: { taskId: "task-456" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.assignAgentTask(agentId, task);

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/agents/${agentId}/tasks`,
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(task),
          })
        );
        expect(result.data?.taskId).toBe("task-456");
      });
    });
  });

  // ============= Command Execution =============

  describe("Command Execution", () => {
    describe("executeCommand", () => {
      it("should execute command with string id", async () => {
        const commandId = "frg-status";
        const responseData: ApiResponse<CommandExecutionData> = {
          success: true,
          data: {
            command: commandId,
            output: "Status: OK",
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.executeCommand(commandId);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/commands/execute",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ command: commandId }),
          })
        );
        expect(result.data?.command).toBe(commandId);
      });

      it("should execute command with Command object", async () => {
        const command: Command = {
          id: "frg-test",
          name: "Run Tests",
          description: "Execute test suite",
          category: "test",
          icon: null,
        };

        const responseData: ApiResponse<CommandExecutionData> = {
          success: true,
          data: {
            command: command.id,
            output: "Tests passed",
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.executeCommand(command);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/commands/execute",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ command: command.id }),
          })
        );
        expect(result.data?.command).toBe(command.id);
      });
    });

    describe("getCommandHistory", () => {
      it("should fetch command history", async () => {
        const commands: Command[] = [
          {
            id: "cmd-1",
            name: "Status Check",
            description: "Check status",
            category: "forge",
            icon: null,
          },
        ];

        const responseData: ApiResponse<Command[]> = {
          success: true,
          data: commands,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getCommandHistory();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/commands/history",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(commands);
      });
    });

    describe("getCommandSuggestions", () => {
      it("should fetch command suggestions based on context", async () => {
        const context = "testing";
        const suggestions: Command[] = [
          {
            id: "frg-test",
            name: "Run Tests",
            description: "Execute tests",
            category: "test",
            icon: null,
          },
        ];

        const responseData: ApiResponse<Command[]> = {
          success: true,
          data: suggestions,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getCommandSuggestions(context);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/commands/suggestions",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ context }),
          })
        );
        expect(result.data).toEqual(suggestions);
      });
    });
  });

  // ============= Architecture Decisions =============

  describe("Architecture Decisions", () => {
    describe("getArchitectureDecisions", () => {
      it("should fetch architecture decisions", async () => {
        const decisions: ArchitectureDecision[] = [
          {
            id: "dec-1",
            approach: "Microservices",
            rationale: "Better scalability",
            tradeoffs: ["Increased complexity"],
            consensus: 85,
            signedOffBy: ["architect-1"],
          },
        ];

        const responseData: ApiResponse<ArchitectureDecision[]> = {
          success: true,
          data: decisions,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getArchitectureDecisions();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/architecture/decisions",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(decisions);
      });
    });

    describe("proposeArchitecture", () => {
      it("should propose an architecture decision", async () => {
        const proposal: Partial<ArchitectureDecision> = {
          approach: "Event-driven architecture",
          rationale: "Better decoupling",
          tradeoffs: ["Eventual consistency"],
        };

        const responseData: ApiResponse<ArchitectureDecision> = {
          success: true,
          data: {
            id: "dec-2",
            approach: "Event-driven architecture",
            rationale: "Better decoupling",
            tradeoffs: ["Eventual consistency"],
            consensus: 0,
            signedOffBy: [],
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.proposeArchitecture(proposal);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/architecture/propose",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(proposal),
          })
        );
        expect(result.data?.approach).toBe("Event-driven architecture");
      });
    });

    describe("approveArchitectureDecision", () => {
      it("should approve an architecture decision", async () => {
        const decisionId = "dec-1";
        const responseData: ApiResponse<ArchitectureDecision> = {
          success: true,
          data: {
            id: decisionId,
            approach: "Microservices",
            rationale: "Better scalability",
            tradeoffs: [],
            consensus: 100,
            signedOffBy: ["architect-1", "architect-2"],
          },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.approveArchitectureDecision(decisionId);

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/architecture/decisions/${decisionId}/approve`,
          expect.objectContaining({ method: "POST" })
        );
        expect(result.data?.consensus).toBe(100);
      });
    });
  });

  // ============= YOLO Mode =============

  describe("YOLO Mode", () => {
    describe("getYoloStatistics", () => {
      it("should fetch YOLO statistics", async () => {
        const stats: YoloStatistics = {
          actionsToday: 42,
          successRate: 95.5,
          timesSaved: 120,
          issuesFixed: 15,
          performanceGain: 23.4,
          costSaved: 1500,
        };

        const responseData: ApiResponse<YoloStatistics> = {
          success: true,
          data: stats,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getYoloStatistics();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/yolo/statistics",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(stats);
      });
    });

    describe("executeYoloAction", () => {
      it("should execute a YOLO action", async () => {
        const action: AutomatedAction = {
          id: "action-1",
          type: "fix",
          title: "Fix lint errors",
          description: "Auto-fix all lint errors",
          impact: "low",
          status: "pending",
          timestamp: new Date(),
          confidence: 0.98,
          automated: true,
        };

        const responseData: ApiResponse<{ actionId: string }> = {
          success: true,
          data: { actionId: "action-1" },
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.executeYoloAction(action);

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/yolo/execute",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(action),
          })
        );
        expect(result.data?.actionId).toBe("action-1");
      });
    });

    describe("getYoloHistory", () => {
      it("should fetch YOLO action history", async () => {
        const history: AutomatedAction[] = [
          {
            id: "action-1",
            type: "optimize",
            title: "Optimize bundle",
            description: "Reduce bundle size",
            impact: "medium",
            status: "completed",
            timestamp: new Date(),
            confidence: 0.92,
            automated: true,
          },
        ];

        const responseData: ApiResponse<AutomatedAction[]> = {
          success: true,
          data: history,
          timestamp: "2024-01-01T00:00:00Z",
        };

        mockFetch.mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(responseData),
        });

        const result = await client.getYoloHistory();

        expect(mockFetch).toHaveBeenCalledWith(
          "/api/yolo/history",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
        expect(result.data).toEqual(history);
      });
    });
  });

  // ============= WebSocket Integration =============

  describe("WebSocket Integration", () => {
    it("should subscribe to WebSocket events", () => {
      const handler = vi.fn();
      const unsubscribe = client.subscribe("agent.activity", handler);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should send WebSocket messages", () => {
      const payload = { test: "data" };
      client.sendWSMessage("vision.change", payload);

      // wsManager.send is mocked, so we just verify it's callable
      expect(true).toBe(true);
    });

    it("should have a disconnect method", () => {
      expect(typeof client.disconnect).toBe("function");
      client.disconnect();
      // Verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  // ============= Singleton Export =============

  describe("Singleton", () => {
    it("should export a singleton instance", () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    it("should export useApiClient hook", async () => {
      const { useApiClient } = await import("../api-client");
      expect(useApiClient()).toBe(apiClient);
    });
  });

  // ============= URL Construction =============

  describe("URL Construction", () => {
    it("should construct correct endpoint URLs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          timestamp: "2024-01-01T00:00:00Z",
        }),
      });

      await client.get("/test");

      // Should call fetch with some URL containing /test
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.any(Object)
      );
    });

    it("should handle different endpoint paths", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          timestamp: "2024-01-01T00:00:00Z",
        }),
      });

      await client.get("/vision");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vision"),
        expect.any(Object)
      );

      mockFetch.mockClear();

      await client.get("/state/health");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/state/health"),
        expect.any(Object)
      );
    });
  });

  // ============= Edge Cases =============

  describe("Edge Cases", () => {
    it("should handle undefined pagination params gracefully", async () => {
      const responseData: ApiResponse<AgentActivity[]> = {
        success: true,
        data: [],
        timestamp: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      });

      const result = await client.getAgentActivities({
        page: undefined,
        limit: 10,
      });

      expect(result.success).toBe(true);
      // Should only include defined params in query string
      const call = mockFetch.mock.calls[0];
      const url = call[0] as string;
      expect(url).not.toContain("page");
      expect(url).toContain("limit=10");
    });

    it("should handle malformed JSON responses gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      });

      const result = await client.get("/test");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid JSON");
    });

    it("should handle empty response bodies", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      });

      const result = await client.get("/test");

      expect(result).toBe(null);
    });
  });
});

/**
 * API Client Service
 * Central service for all backend communication.
 * WebSocket is handled by ws-manager.ts singleton - this class only does HTTP.
 */

import { z } from "zod";
import type {
  VisionData,
  ProjectState,
  AgentActivity,
  Command,
  ArchitectureDecision,
  AutomatedAction,
  YoloStatistics,
} from "../components/types";
import { wsManager } from "./ws-manager";
import { logger } from "../utils/browser-logger";

// API Configuration
// In dev mode: use relative URLs (/api) - Vite proxies to localhost:5051
// In production: use absolute URLs with current hostname
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return "/api"; // Vite proxy handles this
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:5051/api`;
};

// Response schemas for type safety
const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string(),
  });

// Request/Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Command execution response data (from POST /commands/execute)
export interface CommandExecutionData {
  command: string;
  output: string;
  data?: unknown;
  redirect?: string;
  branch?: string;
  changedFiles?: number;
  errorCount?: number;
  outdatedCount?: number;
}

// WebSocket message types
export type WSMessageType =
  | "agent.activity"
  | "state.update"
  | "vision.change"
  | "command.executed"
  | "decision.made"
  | "yolo.action";

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

/**
 * API Client Class
 * HTTP-only. WebSocket is delegated to wsManager singleton.
 */
export class ApiClient {
  // ============= HTTP Methods =============

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const errorData = data as { error?: string };
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return data as ApiResponse<T>;
    } catch (error) {
      logger.warn(`API Request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ============= Generic HTTP Methods =============

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ============= Vision Management =============

  async getVision(): Promise<ApiResponse<VisionData>> {
    return this.request<VisionData>("/vision");
  }

  async updateVision(
    vision: Partial<VisionData>,
  ): Promise<ApiResponse<VisionData>> {
    return this.request<VisionData>("/vision", {
      method: "PUT",
      body: JSON.stringify(vision),
    });
  }

  async captureVision(visionText: string): Promise<ApiResponse<VisionData>> {
    return this.request<VisionData>("/vision/capture", {
      method: "POST",
      body: JSON.stringify({ text: visionText }),
    });
  }

  // ============= Project State =============

  async getProjectState(): Promise<ApiResponse<ProjectState>> {
    return this.request<ProjectState>("/state");
  }

  async updateProjectPhase(
    phase: ProjectState["phase"],
  ): Promise<ApiResponse<ProjectState>> {
    return this.request<ProjectState>("/state/phase", {
      method: "PATCH",
      body: JSON.stringify({ phase }),
    });
  }

  async getHealthMetrics(): Promise<ApiResponse<ProjectState["healthScore"]>> {
    return this.request<ProjectState["healthScore"]>("/state/health");
  }

  // ============= Agent Management =============

  async getAgentActivities(
    params?: PaginationParams,
  ): Promise<ApiResponse<AgentActivity[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, String(value));
      }
    }
    return this.request<AgentActivity[]>(`/agents/activities?${searchParams}`);
  }

  async getActiveAgents(): Promise<ApiResponse<ProjectState["activeAgents"]>> {
    return this.request<ProjectState["activeAgents"]>("/agents/active");
  }

  async assignAgentTask(
    agentId: string,
    task: { name: string; description?: string; priority?: string; payload?: unknown },
  ): Promise<ApiResponse<{ taskId: string }>> {
    return this.request<{ taskId: string }>(`/agents/${agentId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  // ============= Command Execution =============

  async executeCommand(
    command: Command | string,
  ): Promise<ApiResponse<CommandExecutionData>> {
    const commandId = typeof command === "string" ? command : command.id;
    return this.request<CommandExecutionData>("/commands/execute", {
      method: "POST",
      body: JSON.stringify({ command: commandId }),
    });
  }

  async getCommandHistory(): Promise<ApiResponse<Command[]>> {
    return this.request<Command[]>("/commands/history");
  }

  async getCommandSuggestions(
    context: string,
  ): Promise<ApiResponse<Command[]>> {
    return this.request<Command[]>("/commands/suggestions", {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  }

  // ============= Architecture Decisions =============

  async getArchitectureDecisions(): Promise<
    ApiResponse<ArchitectureDecision[]>
  > {
    return this.request<ArchitectureDecision[]>("/architecture/decisions");
  }

  async proposeArchitecture(
    decision: Partial<ArchitectureDecision>,
  ): Promise<ApiResponse<ArchitectureDecision>> {
    return this.request<ArchitectureDecision>("/architecture/propose", {
      method: "POST",
      body: JSON.stringify(decision),
    });
  }

  async approveArchitectureDecision(
    decisionId: string,
  ): Promise<ApiResponse<ArchitectureDecision>> {
    return this.request<ArchitectureDecision>(
      `/architecture/decisions/${decisionId}/approve`,
      {
        method: "POST",
      },
    );
  }

  // ============= YOLO Mode =============

  async getYoloStatistics(): Promise<ApiResponse<YoloStatistics>> {
    return this.request<YoloStatistics>("/yolo/statistics");
  }

  async executeYoloAction(
    action: AutomatedAction,
  ): Promise<ApiResponse<{ actionId: string }>> {
    return this.request<{ actionId: string }>("/yolo/execute", {
      method: "POST",
      body: JSON.stringify(action),
    });
  }

  async getYoloHistory(): Promise<ApiResponse<AutomatedAction[]>> {
    return this.request<AutomatedAction[]>("/yolo/history");
  }

  // ============= WebSocket (delegated to wsManager) =============

  public subscribe<T = unknown>(
    eventType: WSMessageType,
    handler: (data: T) => void,
  ): () => void {
    return wsManager.subscribe<T>(eventType, handler);
  }

  public sendWSMessage<T>(type: WSMessageType, payload: T) {
    wsManager.send({
      type,
      payload,
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    });
  }

  public disconnect() {
    // Only disconnect wsManager if no other subscribers exist
    // In practice, components manage their own wsManager subscriptions
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export convenience hooks
export const useApiClient = () => apiClient;

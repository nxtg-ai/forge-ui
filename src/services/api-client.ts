/**
 * API Client Service
 * Central service for all backend communication
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

// API Configuration
// In dev mode: use relative URLs (/api) - Vite proxies to localhost:5051
// In production: use absolute URLs with current hostname
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return '/api';  // Vite proxy handles this
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:5051/api`;
};

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  // WebSocket needs absolute URL - use current host and Vite's port (5050) which proxies to 5051
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5050';
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${host}/ws`;
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

// WebSocket message types
export type WSMessageType =
  | "agent.activity"
  | "state.update"
  | "vision.change"
  | "command.executed"
  | "decision.made"
  | "yolo.action";

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

/**
 * API Client Class
 */
export class ApiClient {
  private wsConnection: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventHandlers: Map<WSMessageType, Set<(data: any) => void>> =
    new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor() {
    this.initializeWebSocket();
  }

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
        credentials: "include", // For session management
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return data as ApiResponse<T>;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
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
    const queryString = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return this.request<AgentActivity[]>(`/agents/activities?${queryString}`);
  }

  async getActiveAgents(): Promise<ApiResponse<ProjectState["activeAgents"]>> {
    return this.request<ProjectState["activeAgents"]>("/agents/active");
  }

  async assignAgentTask(
    agentId: string,
    task: any,
  ): Promise<ApiResponse<{ taskId: string }>> {
    return this.request<{ taskId: string }>(`/agents/${agentId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  // ============= Command Execution =============

  async executeCommand(
    command: Command,
  ): Promise<ApiResponse<{ result: any }>> {
    return this.request<{ result: any }>("/commands/execute", {
      method: "POST",
      body: JSON.stringify(command),
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

  // ============= WebSocket Management =============

  private initializeWebSocket() {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.wsConnection = new WebSocket(getWsUrl());

      this.wsConnection.onopen = () => {
        console.log("WebSocket connected");
        this.wsReconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.processQueuedRequests();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleWSMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.wsConnection.onclose = () => {
        console.log("WebSocket closed");
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max WebSocket reconnection attempts reached");
      return;
    }

    this.wsReconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts - 1),
      30000,
    );

    console.log(
      `Attempting WebSocket reconnection ${this.wsReconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    setTimeout(() => {
      this.initializeWebSocket();
    }, delay);
  }

  private handleWSMessage(message: WSMessage) {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(
            `Error in WebSocket handler for ${message.type}:`,
            error,
          );
        }
      });
    }
  }

  public subscribe(
    eventType: WSMessageType,
    handler: (data: any) => void,
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  public sendWSMessage<T>(type: WSMessageType, payload: T) {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      const message: WSMessage<T> = {
        type,
        payload,
        timestamp: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
      };

      this.wsConnection.send(JSON.stringify(message));
    } else {
      // Queue the message for later
      this.requestQueue.push(async () => {
        this.sendWSMessage(type, payload);
      });
    }
  }

  private async processQueuedRequests() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error("Failed to process queued request:", error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // ============= Cleanup =============

  public disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.eventHandlers.clear();
    this.requestQueue = [];
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export convenience hooks
export const useApiClient = () => apiClient;

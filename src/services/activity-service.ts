/**
 * Agent Activity Service
 * Stream and manage live agent execution events
 */

import { z } from "zod";
import { BaseService, ServiceConfig } from "./base-service";
import { Result, IntegrationError } from "../utils/result";
import { Agent, AgentActivity, EngagementMode } from "../components/types";

/**
 * Activity event types
 */
export enum ActivityEventType {
  AGENT_STARTED = "agent_started",
  AGENT_COMPLETED = "agent_completed",
  AGENT_FAILED = "agent_failed",
  AGENT_BLOCKED = "agent_blocked",
  TASK_ASSIGNED = "task_assigned",
  TASK_COMPLETED = "task_completed",
  DECISION_MADE = "decision_made",
  DISCUSSION_STARTED = "discussion_started",
  DISCUSSION_ENDED = "discussion_ended",
  INSIGHT_GENERATED = "insight_generated",
  ERROR_OCCURRED = "error_occurred",
}

/**
 * Activity event
 */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  agentId: string;
  agentName: string;
  timestamp: Date;
  data: Record<string, unknown>;
  visibility: EngagementMode[];
  importance: "low" | "medium" | "high" | "critical";
  category: "execution" | "communication" | "decision" | "error";
}

/**
 * Activity filter options
 */
export interface ActivityFilter {
  agentIds?: string[];
  types?: ActivityEventType[];
  visibility?: EngagementMode;
  importance?: ("low" | "medium" | "high" | "critical")[];
  categories?: ("execution" | "communication" | "decision" | "error")[];
  startTime?: Date;
  endTime?: Date;
}

/**
 * Activity statistics
 */
export interface ActivityStatistics {
  totalEvents: number;
  eventsPerAgent: Record<string, number>;
  eventsPerType: Record<ActivityEventType, number>;
  averageEventsPerMinute: number;
  mostActiveAgent: string;
  criticalEvents: number;
  errorRate: number;
}

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageTaskDuration: number;
  successRate: number;
  blockerCount: number;
  decisionsInfluenced: number;
  confidenceScore: number;
}

/**
 * Activity Service configuration
 */
export interface ActivityServiceConfig extends ServiceConfig {
  maxEventHistory?: number;
  persistActivity?: boolean;
  activityLogPath?: string;
  streamBufferSize?: number;
}

/**
 * Agent activity monitoring service
 */
export class ActivityService extends BaseService {
  private activityHistory: ActivityEvent[] = [];
  private activeAgents = new Map<string, Agent>();
  private agentPerformance = new Map<string, AgentPerformance>();
  private streamSubscribers = new Map<string, (event: ActivityEvent) => void>();
  private eventBuffer: ActivityEvent[] = [];

  constructor(config: ActivityServiceConfig = { name: "ActivityService" }) {
    super(config);

    this.config = {
      maxEventHistory: 1000,
      persistActivity: true,
      activityLogPath: ".claude/activity.log",
      streamBufferSize: 100,
      ...config,
    };
  }

  /**
   * Perform service initialization
   */
  protected async performInitialization(): Promise<void> {
    // Load historical activity if persistence is enabled
    if ((this.config as ActivityServiceConfig).persistActivity) {
      await this.loadActivityHistory();
    }

    // Initialize performance tracking
    this.initializePerformanceTracking();
  }

  /**
   * Perform service cleanup
   */
  protected async performDisposal(): Promise<void> {
    // Persist final activity state
    if ((this.config as ActivityServiceConfig).persistActivity) {
      await this.persistActivityHistory();
    }

    this.activityHistory = [];
    this.activeAgents.clear();
    this.agentPerformance.clear();
    this.streamSubscribers.clear();
    this.eventBuffer = [];
  }

  /**
   * Record an activity event
   */
  async recordActivity(
    event: Omit<ActivityEvent, "id" | "timestamp">,
  ): Promise<Result<ActivityEvent, IntegrationError>> {
    try {
      // Create full event
      const fullEvent: ActivityEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: new Date(),
      };

      // Validate event
      const validationResult = this.validateActivityEvent(fullEvent);
      if (validationResult.isErr()) {
        return Result.err(validationResult.error);
      }

      // Add to history
      this.addToHistory(fullEvent);

      // Update agent performance
      this.updateAgentPerformance(fullEvent);

      // Stream to subscribers
      this.streamEvent(fullEvent);

      // Emit event
      this.emit("activity", fullEvent);

      return Result.ok(fullEvent);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to record activity: ${error instanceof Error ? error.message : String(error)}`,
          "RECORD_ERROR",
        ),
      );
    }
  }

  /**
   * Get activity history with optional filtering
   */
  getActivityHistory(filter?: ActivityFilter): ActivityEvent[] {
    let events = [...this.activityHistory];

    if (filter) {
      // Filter by agent IDs
      if (filter.agentIds && filter.agentIds.length > 0) {
        events = events.filter((e) => filter.agentIds!.includes(e.agentId));
      }

      // Filter by event types
      if (filter.types && filter.types.length > 0) {
        events = events.filter((e) => filter.types!.includes(e.type));
      }

      // Filter by visibility
      if (filter.visibility) {
        events = events.filter((e) =>
          e.visibility.includes(filter.visibility!),
        );
      }

      // Filter by importance
      if (filter.importance && filter.importance.length > 0) {
        events = events.filter((e) =>
          filter.importance!.includes(e.importance),
        );
      }

      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        events = events.filter((e) => filter.categories!.includes(e.category));
      }

      // Filter by time range
      if (filter.startTime) {
        events = events.filter((e) => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        events = events.filter((e) => e.timestamp <= filter.endTime!);
      }
    }

    return events;
  }

  /**
   * Subscribe to activity stream
   */
  subscribeToStream(
    subscriberId: string,
    callback: (event: ActivityEvent) => void,
    filter?: ActivityFilter,
  ): () => void {
    // Create filtered callback if needed
    const filteredCallback = filter
      ? (event: ActivityEvent) => {
          if (this.matchesFilter(event, filter)) {
            callback(event);
          }
        }
      : callback;

    this.streamSubscribers.set(subscriberId, filteredCallback);

    // Return unsubscribe function
    return () => {
      this.streamSubscribers.delete(subscriberId);
    };
  }

  /**
   * Get activity statistics
   */
  getStatistics(filter?: ActivityFilter): ActivityStatistics {
    const events = this.getActivityHistory(filter);

    // Calculate events per agent
    const eventsPerAgent: Record<string, number> = {};
    events.forEach((event) => {
      eventsPerAgent[event.agentId] = (eventsPerAgent[event.agentId] || 0) + 1;
    });

    // Calculate events per type
    const eventsPerType: Record<ActivityEventType, number> = Object.values(ActivityEventType).reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<ActivityEventType, number>
    );
    events.forEach((event) => {
      eventsPerType[event.type] = (eventsPerType[event.type] || 0) + 1;
    });

    // Calculate average events per minute
    let averageEventsPerMinute = 0;
    if (events.length > 1) {
      const timeRange =
        events[events.length - 1].timestamp.getTime() -
        events[0].timestamp.getTime();
      const minutes = timeRange / 60000;
      averageEventsPerMinute = minutes > 0 ? events.length / minutes : 0;
    }

    // Find most active agent
    const mostActiveAgent =
      Object.entries(eventsPerAgent).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "";

    // Count critical events
    const criticalEvents = events.filter(
      (e) => e.importance === "critical",
    ).length;

    // Calculate error rate
    const errorEvents = events.filter((e) => e.category === "error").length;
    const errorRate = events.length > 0 ? errorEvents / events.length : 0;

    return {
      totalEvents: events.length,
      eventsPerAgent,
      eventsPerType,
      averageEventsPerMinute,
      mostActiveAgent,
      criticalEvents,
      errorRate,
    };
  }

  /**
   * Get agent performance metrics
   */
  getAgentPerformance(
    agentId: string,
  ): Result<AgentPerformance, IntegrationError> {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) {
      return Result.err(
        new IntegrationError(
          `No performance data for agent ${agentId}`,
          "NO_PERFORMANCE_DATA",
        ),
      );
    }
    return Result.ok(performance);
  }

  /**
   * Get all agent performances
   */
  getAllAgentPerformances(): AgentPerformance[] {
    return Array.from(this.agentPerformance.values());
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agent: Agent,
  ): Promise<Result<void, IntegrationError>> {
    try {
      this.activeAgents.set(agent.id, agent);

      // Record status change as activity
      await this.recordActivity({
        type: this.mapStatusToEventType(agent.status),
        agentId: agent.id,
        agentName: agent.name,
        data: {
          status: agent.status,
          currentTask: agent.currentTask,
          confidence: agent.confidence,
        },
        visibility: ["engineer", "builder", "founder"],
        importance: agent.status === "blocked" ? "high" : "medium",
        category: "execution",
      });

      this.emit("agentStatusUpdate", agent);
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to update agent status: ${error instanceof Error ? error.message : String(error)}`,
          "STATUS_UPDATE_ERROR",
        ),
      );
    }
  }

  /**
   * Get active agents
   */
  getActiveAgents(): Agent[] {
    return Array.from(this.activeAgents.values());
  }

  /**
   * Clear activity history
   */
  clearHistory(): void {
    this.activityHistory = [];
    this.eventBuffer = [];
    this.emit("historyCleared");
  }

  /**
   * Export activity log
   */
  async exportActivityLog(
    format: "json" | "csv" = "json",
  ): Promise<Result<string, IntegrationError>> {
    try {
      if (format === "json") {
        return Result.ok(JSON.stringify(this.activityHistory, null, 2));
      } else {
        // CSV export
        const headers = [
          "ID",
          "Type",
          "Agent ID",
          "Agent Name",
          "Timestamp",
          "Importance",
          "Category",
        ];
        const rows = this.activityHistory.map((event) => [
          event.id,
          event.type,
          event.agentId,
          event.agentName,
          event.timestamp.toISOString(),
          event.importance,
          event.category,
        ]);

        const csv = [
          headers.join(","),
          ...rows.map((row) => row.join(",")),
        ].join("\n");

        return Result.ok(csv);
      }
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to export activity log: ${error instanceof Error ? error.message : String(error)}`,
          "EXPORT_ERROR",
        ),
      );
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: ActivityEvent): void {
    const config = this.config as ActivityServiceConfig;

    this.activityHistory.push(event);

    // Trim history if needed
    if (this.activityHistory.length > (config.maxEventHistory ?? 1000)) {
      this.activityHistory.shift();
    }

    // Add to buffer
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > (config.streamBufferSize ?? 100)) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentPerformance(event: ActivityEvent): void {
    let performance = this.agentPerformance.get(event.agentId);

    if (!performance) {
      performance = {
        agentId: event.agentId,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageTaskDuration: 0,
        successRate: 0,
        blockerCount: 0,
        decisionsInfluenced: 0,
        confidenceScore: 0.5,
      };
      this.agentPerformance.set(event.agentId, performance);
    }

    // Update metrics based on event type
    switch (event.type) {
      case ActivityEventType.TASK_COMPLETED:
        performance.tasksCompleted++;
        break;
      case ActivityEventType.AGENT_FAILED:
        performance.tasksFailed++;
        break;
      case ActivityEventType.AGENT_BLOCKED:
        performance.blockerCount++;
        break;
      case ActivityEventType.DECISION_MADE:
        performance.decisionsInfluenced++;
        break;
    }

    // Recalculate success rate
    const totalTasks = performance.tasksCompleted + performance.tasksFailed;
    performance.successRate =
      totalTasks > 0 ? performance.tasksCompleted / totalTasks : 0;

    // Update confidence score (simplified calculation)
    performance.confidenceScore = Math.min(1, performance.successRate * 1.2);
  }

  /**
   * Stream event to subscribers
   */
  private streamEvent(event: ActivityEvent): void {
    this.streamSubscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Stream subscriber error:", error);
      }
    });
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: ActivityEvent, filter: ActivityFilter): boolean {
    if (filter.agentIds && !filter.agentIds.includes(event.agentId)) {
      return false;
    }

    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }

    if (filter.visibility && !event.visibility.includes(filter.visibility)) {
      return false;
    }

    if (filter.importance && !filter.importance.includes(event.importance)) {
      return false;
    }

    if (filter.categories && !filter.categories.includes(event.category)) {
      return false;
    }

    if (filter.startTime && event.timestamp < filter.startTime) {
      return false;
    }

    if (filter.endTime && event.timestamp > filter.endTime) {
      return false;
    }

    return true;
  }

  /**
   * Map agent status to event type
   */
  private mapStatusToEventType(status: Agent["status"]): ActivityEventType {
    switch (status) {
      case "working":
        return ActivityEventType.AGENT_STARTED;
      case "blocked":
        return ActivityEventType.AGENT_BLOCKED;
      case "discussing":
        return ActivityEventType.DISCUSSION_STARTED;
      default:
        return ActivityEventType.AGENT_STARTED;
    }
  }

  /**
   * Validate activity event
   */
  private validateActivityEvent(
    event: ActivityEvent,
  ): Result<void, IntegrationError> {
    const ActivityEventSchema = z.object({
      id: z.string(),
      type: z.nativeEnum(ActivityEventType),
      agentId: z.string(),
      agentName: z.string(),
      timestamp: z.date(),
      data: z.record(z.string(), z.unknown()),
      visibility: z.array(
        z.enum(["ceo", "vp", "engineer", "builder", "founder"]),
      ),
      importance: z.enum(["low", "medium", "high", "critical"]),
      category: z.enum(["execution", "communication", "decision", "error"]),
    });

    const result = this.validate(event, ActivityEventSchema);
    if (result.isErr()) {
      return Result.err(
        new IntegrationError(
          `Invalid activity event: ${result.error.message}`,
          "VALIDATION_ERROR",
          result.error.details,
        ),
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Load activity history from persistence
   * Note: Activity history is session-scoped by design; persistence
   * can be added when cross-session history is needed.
   */
  private async loadActivityHistory(): Promise<void> {
    // Session-scoped: starts fresh each session
  }

  /**
   * Persist activity history
   * Note: Activity data is transient by design; enable persistence
   * when audit trail requirements are defined.
   */
  private async persistActivityHistory(): Promise<void> {
    // No-op: activity data is session-scoped
  }

  /**
   * Initialize performance tracking
   * Note: Performance metrics are calculated on-demand from activity data.
   */
  private initializePerformanceTracking(): void {
    // Metrics computed dynamically from activity history
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

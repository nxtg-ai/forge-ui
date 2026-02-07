/**
 * Agent Coordination Protocol
 * Inter-agent communication and coordination system
 */

import { EventEmitter } from "events";
import * as crypto from "crypto";
import { Logger } from "../utils/logger";
import { Task } from "../types/state";
import {
  Agent,
  Message,
  MessageType,
  SignOffRequest,
  SignOffResult,
  Artifact,
  AgentResponse,
} from "../types/agents";
import { approvalQueue } from "../services/approval-queue";
import {
  DecisionImpact,
  DecisionRisk,
  ApproverRole,
  ApprovalStatus,
} from "../types/approval";
import { AgentActivity } from "../types/dashboard";

const logger = new Logger("AgentCoordination");

/**
 * Parameters for querying agent activities
 */
export interface AgentActivityParams {
  agentId?: string;
  limit?: number;
  page?: number;
  since?: Date;
  status?: AgentActivity["status"];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Architecture decision for review/approval
 */
export interface ArchitectureDecision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  impact: "low" | "medium" | "high";
  status: "proposed" | "approved" | "rejected" | "implemented";
  timestamp: Date;
  proposedBy?: string;
  approvedBy?: string;
}

/**
 * Input for proposing a new architecture decision
 */
export interface ArchitectureDecisionProposal {
  title: string;
  description: string;
  rationale: string;
  impact: "low" | "medium" | "high";
  proposedBy?: string;
}

/**
 * Result from task assignment
 */
export interface TaskAssignmentResult {
  taskId: string;
  agentId: string;
  status: "assigned" | "queued" | "failed" | "completed";
  result?: string;
}

// Message priority levels
export enum MessagePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  CRITICAL = 10,
}

// Coordination status
export enum CoordinationStatus {
  IDLE = "idle",
  COORDINATING = "coordinating",
  WAITING = "waiting",
  COMPLETE = "complete",
  ERROR = "error",
}

// Message queue entry
interface QueueEntry {
  message: Message;
  priority: number;
  timestamp: Date;
  retries: number;
}

export class AgentCoordinationProtocol extends EventEmitter {
  private messageQueue: Map<string, QueueEntry[]> = new Map();
  private activeMessages: Map<string, Message> = new Map();
  private signOffRequests: Map<string, SignOffRequest> = new Map();
  private approvalRequestIds: Map<string, string> = new Map(); // artifactId -> approvalRequestId
  private agentRegistry: Map<string, Agent> = new Map();
  private status: CoordinationStatus = CoordinationStatus.IDLE;
  private messageHandlers: Map<string, (message: Message) => Promise<AgentResponse>> =
    new Map();
  private processorInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.startMessageProcessor();
  }

  /**
   * Stop the message processor and clean up resources
   */
  destroy(): void {
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }
    this.removeAllListeners();
  }

  /**
   * Start message processing loop
   */
  private startMessageProcessor(): void {
    this.processorInterval = setInterval(() => {
      this.processMessageQueues();
    }, 100); // Process every 100ms
  }

  /**
   * Process message queues for all agents
   */
  private async processMessageQueues(): Promise<void> {
    for (const [agentId, queue] of this.messageQueue.entries()) {
      if (queue.length > 0) {
        // Sort by priority (highest first)
        queue.sort((a, b) => b.priority - a.priority);

        // Process highest priority message
        const entry = queue.shift();
        if (entry) {
          await this.deliverMessage(entry.message);
        }
      }
    }
  }

  /**
   * Register an agent with the protocol
   */
  registerAgent(
    agent: Agent,
    handler?: (message: Message) => Promise<AgentResponse>,
  ): void {
    this.agentRegistry.set(agent.id, agent);
    if (handler) {
      this.messageHandlers.set(agent.id, handler);
    }
    this.messageQueue.set(agent.id, []);
    logger.info(`Agent ${agent.id} registered`);
  }

  /**
   * Send message to specific agent
   */
  async sendMessage(agentId: string, message: Message): Promise<void> {
    if (!this.agentRegistry.has(agentId)) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Add to queue
    const queue = this.messageQueue.get(agentId) || [];
    queue.push({
      message,
      priority: message.priority || MessagePriority.NORMAL,
      timestamp: new Date(),
      retries: 0,
    });
    this.messageQueue.set(agentId, queue);

    logger.debug(`Message queued for agent ${agentId}`, {
      messageId: message.id,
      type: message.type,
    });

    this.emit("messageSent", message);
  }

  /**
   * Broadcast message to all agents
   */
  async broadcast(message: Message): Promise<void> {
    const broadcastMessage = {
      ...message,
      type: MessageType.BROADCAST as MessageType,
    };

    const promises = Array.from(this.agentRegistry.keys()).map((agentId) =>
      this.sendMessage(agentId, { ...broadcastMessage, to: agentId }),
    );

    await Promise.all(promises);

    logger.info("Message broadcast to all agents", {
      messageId: message.id,
      agentCount: this.agentRegistry.size,
    });

    this.emit("messageBroadcast", broadcastMessage);
  }

  /**
   * Request sign-off from agent
   */
  async requestSignOff(
    agentId: string,
    artifact: Artifact,
  ): Promise<SignOffResult> {
    const request: SignOffRequest = {
      artifactId: artifact.id,
      artifactType: artifact.type,
      description: `Sign-off request for ${artifact.type} artifact`,
      checkpoints: [],
      requestedBy: "orchestrator",
      deadline: new Date(Date.now() + 300000), // 5 minutes
    };

    // Store request
    this.signOffRequests.set(request.artifactId, request);

    // Map agent ID to approver role
    const approverRole = this.mapAgentToApproverRole(agentId);

    // Create approval request in the real queue
    const approvalRequest = await approvalQueue.requestApproval(
      {
        taskId: artifact.id,
        agentId: "orchestrator",
        action: `Sign-off for ${artifact.type}`,
        rationale: request.description,
        filesAffected: artifact.files || [],
      },
      DecisionImpact.MEDIUM,
      DecisionRisk.MEDIUM,
      {
        requiredApprover: approverRole,
        timeoutMinutes: 5,
      },
    );

    // Track the approval request ID
    this.approvalRequestIds.set(artifact.id, approvalRequest.id);

    // Create sign-off message
    const message: Message = {
      id: crypto.randomBytes(8).toString("hex"),
      from: "orchestrator",
      to: agentId,
      type: MessageType.SIGN_OFF,
      subject: "Sign-off Request",
      payload: request,
      timestamp: new Date(),
      priority: MessagePriority.HIGH,
    };

    // Send message to notify agent
    await this.sendMessage(agentId, message);

    // Wait for real approval response (with timeout)
    return await this.waitForSignOff(request.artifactId, 300000);
  }

  /**
   * Map agent ID to approver role
   */
  private mapAgentToApproverRole(agentId: string): ApproverRole | undefined {
    if (agentId.includes("architect")) {
      return ApproverRole.ARCHITECT;
    } else if (agentId.includes("designer") || agentId.includes("vanguard")) {
      return ApproverRole.DESIGNER;
    } else if (agentId.includes("ceo") || agentId.includes("CEO-LOOP")) {
      return ApproverRole.CEO;
    }
    // Default: no specific approver required
    return undefined;
  }

  /**
   * Wait for sign-off response
   */
  private async waitForSignOff(
    artifactId: string,
    timeout: number,
  ): Promise<SignOffResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Sign-off timeout for artifact ${artifactId}`));
      }, timeout);

      const checkSignOff = () => {
        // Check if sign-off received (simplified)
        const signOff = this.getSignOffResult(artifactId);
        if (signOff) {
          clearTimeout(timeoutId);
          resolve(signOff);
        } else {
          setTimeout(checkSignOff, 1000); // Check every second
        }
      };

      checkSignOff();
    });
  }

  /**
   * Get sign-off result from real approval queue
   */
  private getSignOffResult(artifactId: string): SignOffResult | null {
    const approvalRequestId = this.approvalRequestIds.get(artifactId);
    if (!approvalRequestId) {
      return null;
    }

    const approvalRequest = approvalQueue.getRequest(approvalRequestId);
    if (!approvalRequest) {
      return null;
    }

    // Check if decision has been made
    if (approvalRequest.status === ApprovalStatus.PENDING) {
      return null; // Still waiting
    }

    // Map approval result to sign-off result
    if (approvalRequest.status === ApprovalStatus.APPROVED) {
      return {
        approved: true,
        reviewer: approvalRequest.approver || "unknown",
        timestamp: approvalRequest.approvedAt || new Date(),
        comments: approvalRequest.feedback || "Approved",
        suggestions: [],
      };
    } else if (approvalRequest.status === ApprovalStatus.REJECTED) {
      return {
        approved: false,
        reviewer: approvalRequest.approver || "unknown",
        timestamp: approvalRequest.approvedAt || new Date(),
        comments: approvalRequest.feedback || "Rejected",
        suggestions: [],
      };
    } else if (approvalRequest.status === ApprovalStatus.TIMEOUT) {
      return {
        approved: false,
        reviewer: "system",
        timestamp: approvalRequest.approvedAt || new Date(),
        comments: "Request timed out without decision",
        suggestions: [],
      };
    } else if (approvalRequest.status === ApprovalStatus.CANCELLED) {
      return {
        approved: false,
        reviewer: "system",
        timestamp: new Date(),
        comments: "Request was cancelled",
        suggestions: [],
      };
    }

    return null;
  }

  /**
   * Coordinate parallel work among agents
   */
  async coordinateParallel(agents: Agent[], task: Task): Promise<unknown> {
    this.status = CoordinationStatus.COORDINATING;
    logger.info(`Coordinating parallel work for ${agents.length} agents`);

    const subtasks = this.divideTask(task, agents.length);
    const promises = agents.map((agent, index) =>
      this.assignTaskToAgent(agent, subtasks[index]),
    );

    try {
      const results = await Promise.all(promises);
      this.status = CoordinationStatus.COMPLETE;
      return {
        success: true,
        results,
        duration: 0, // Would calculate actual duration
      };
    } catch (error) {
      this.status = CoordinationStatus.ERROR;
      throw error;
    }
  }

  /**
   * Execute task with agent
   */
  async executeTask(agent: Agent, task: Task): Promise<AgentResponse> {
    const startTime = Date.now();
    logger.info(`Executing task ${task.id} with agent ${agent.id}`);

    // Create task message
    const message: Message = {
      id: crypto.randomBytes(8).toString("hex"),
      from: "orchestrator",
      to: agent.id,
      type: MessageType.REQUEST,
      subject: `Execute task: ${task.title}`,
      payload: task,
      timestamp: new Date(),
      priority: task.priority,
    };

    // Send to agent
    await this.sendMessage(agent.id, message);

    // Simulate agent execution (in production, would wait for actual response)
    await this.simulateAgentExecution(agent, task);

    return {
      success: true,
      result: { taskCompleted: task.id },
      artifacts: [`artifact-${task.id}`],
      duration: Date.now() - startTime,
    };
  }

  /**
   * Deliver message to agent
   */
  private async deliverMessage(message: Message): Promise<void> {
    const handler = this.messageHandlers.get(message.to);

    if (handler) {
      try {
        const response = await handler(message);
        this.handleMessageResponse(message, response);
      } catch (error) {
        logger.error(`Failed to deliver message to ${message.to}`, error);
        this.retryMessage(message);
      }
    } else {
      // Default handling
      logger.debug(`No handler for agent ${message.to}, using default`);
      this.emit("messageReceived", message);
    }
  }

  /**
   * Handle message response
   */
  private handleMessageResponse(originalMessage: Message, response: AgentResponse): void {
    if (originalMessage.replyTo) {
      // This is a response to another message
      this.emit("responseReceived", {
        originalId: originalMessage.replyTo,
        response,
      });
    }

    // Store response if needed
    this.activeMessages.delete(originalMessage.id);
  }

  /**
   * Retry failed message
   */
  private retryMessage(message: Message): void {
    const queue = this.messageQueue.get(message.to) || [];
    const entry = queue.find((e) => e.message.id === message.id);

    if (entry && entry.retries < 3) {
      entry.retries++;
      entry.timestamp = new Date();
      logger.info(`Retrying message ${message.id} (attempt ${entry.retries})`);
    } else {
      logger.error(`Message ${message.id} failed after max retries`);
      this.emit("messageFailed", message);
    }
  }

  /**
   * Divide task into subtasks
   */
  private divideTask(task: Task, count: number): Task[] {
    const subtasks: Task[] = [];
    for (let i = 0; i < count; i++) {
      subtasks.push({
        ...task,
        id: `${task.id}-sub-${i}`,
        title: `${task.title} (Part ${i + 1}/${count})`,
      });
    }
    return subtasks;
  }

  /**
   * Assign task to agent
   */
  private async assignTaskToAgent(agent: Agent, task: Task): Promise<TaskAssignmentResult> {
    const message: Message = {
      id: crypto.randomBytes(8).toString("hex"),
      from: "orchestrator",
      to: agent.id,
      type: MessageType.REQUEST,
      subject: "Task Assignment",
      payload: task,
      timestamp: new Date(),
    };

    await this.sendMessage(agent.id, message);

    // Simulate execution
    return await this.simulateAgentExecution(agent, task);
  }

  /**
   * Simulate agent execution (for testing)
   */
  private async simulateAgentExecution(agent: Agent, task: Task): Promise<TaskAssignmentResult> {
    // Simulate processing time based on task complexity
    const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    return {
      agentId: agent.id,
      taskId: task.id,
      status: "completed",
      result: `Task ${task.id} completed by ${agent.name}`,
    };
  }

  /**
   * Get coordination status
   */
  getStatus(): CoordinationStatus {
    return this.status;
  }

  /**
   * Get message queue stats
   */
  getQueueStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalQueued: 0,
      byAgent: {},
    };

    for (const [agentId, queue] of this.messageQueue.entries()) {
      stats.byAgent[agentId] = queue.length;
      stats.totalQueued += queue.length;
    }

    return stats;
  }

  /**
   * Clear message queue for agent
   */
  clearQueue(agentId?: string): void {
    if (agentId) {
      this.messageQueue.set(agentId, []);
    } else {
      // Clear all queues
      for (const id of this.messageQueue.keys()) {
        this.messageQueue.set(id, []);
      }
    }
    logger.info(
      `Message queue cleared ${agentId ? `for ${agentId}` : "for all agents"}`,
    );
  }

  // API compatibility methods
  async getAgentActivities(params: AgentActivityParams): Promise<AgentActivity[]> {
    return [];
  }

  async getActiveAgents(): Promise<Agent[]> {
    return Array.from(this.agentRegistry.values());
  }

  async assignTask(agentId: string, task: Task): Promise<TaskAssignmentResult> {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return await this.assignTaskToAgent(agent, task);
  }

  async getArchitectureDecisions(): Promise<ArchitectureDecision[]> {
    return [];
  }

  async proposeArchitectureDecision(decision: ArchitectureDecisionProposal): Promise<ArchitectureDecision> {
    return {
      id: crypto.randomBytes(8).toString("hex"),
      ...decision,
      status: "proposed",
      timestamp: new Date(),
    };
  }

  async approveArchitectureDecision(decisionId: string): Promise<Partial<ArchitectureDecision>> {
    return {
      id: decisionId,
      status: "approved",
      timestamp: new Date(),
    };
  }

  isHealthy(): boolean {
    return this.status !== CoordinationStatus.ERROR;
  }

  async initialize(): Promise<void> {
    logger.info("AgentCoordinationProtocol initialized");
  }
}

// Export alias for API compatibility
export const CoordinationService = AgentCoordinationProtocol;

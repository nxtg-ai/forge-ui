/**
 * Approval Queue Service
 *
 * Real approval system to replace fake approvals
 * MVP: In-memory queue with basic operations
 *
 * Features:
 * - Request approval with context
 * - Approve/reject decisions
 * - Query pending/completed approvals
 * - Auto-timeout for stale requests
 * - Statistics tracking
 *
 * Future enhancements:
 * - Persistence (SQLite)
 * - WebSocket notifications
 * - Priority queue
 * - Batch approvals
 */

import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";
import {
  ApprovalRequest,
  ApprovalResult,
  ApprovalStatus,
  DecisionContext,
  DecisionImpact,
  DecisionRisk,
  ApproverRole,
  QueueStats,
} from "../types/approval";

/**
 * Approval Queue Service
 */
export class ApprovalQueueService extends EventEmitter {
  private queue: Map<string, ApprovalRequest> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private stats = {
    totalRequests: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalTimeout: 0,
    responseTimes: [] as number[],
  };

  /**
   * Request approval for a decision
   */
  async requestApproval(
    context: DecisionContext,
    impact: DecisionImpact,
    risk: DecisionRisk,
    options?: {
      requiredApprover?: ApproverRole;
      timeoutMinutes?: number;
    },
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: uuidv4(),
      timestamp: new Date(),
      context,
      impact,
      risk,
      requiredApprover: options?.requiredApprover,
      timeoutMinutes: options?.timeoutMinutes ?? 5, // Default 5 min timeout
      status: ApprovalStatus.PENDING,
    };

    // Add to queue
    this.queue.set(request.id, request);
    this.stats.totalRequests++;

    // Set timeout
    const timeoutMs = request.timeoutMinutes! * 60 * 1000;
    const timeout = setTimeout(() => {
      this.handleTimeout(request.id);
    }, timeoutMs);
    this.timeouts.set(request.id, timeout);

    // Emit event
    this.emit("approval-requested", request);

    return request;
  }

  /**
   * Approve a request
   */
  async approve(
    requestId: string,
    approver: ApproverRole,
    reason: string,
    feedback?: string,
  ): Promise<ApprovalResult> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Request ${requestId} is not pending (status: ${request.status})`,
      );
    }

    // Update request
    request.status = ApprovalStatus.APPROVED;
    request.approver = approver;
    request.approvedAt = new Date();
    request.decision = true;
    request.feedback = feedback;

    // Clear timeout
    this.clearTimeout(requestId);

    // Update stats
    this.stats.totalApproved++;
    this.trackResponseTime(request);

    // Emit event
    const result: ApprovalResult = {
      approved: true,
      approver,
      reason,
      timestamp: request.approvedAt,
      feedback,
    };
    this.emit("approval-decided", request, result);

    return result;
  }

  /**
   * Reject a request
   */
  async reject(
    requestId: string,
    approver: ApproverRole,
    reason: string,
    feedback?: string,
  ): Promise<ApprovalResult> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Request ${requestId} is not pending (status: ${request.status})`,
      );
    }

    // Update request
    request.status = ApprovalStatus.REJECTED;
    request.approver = approver;
    request.approvedAt = new Date();
    request.decision = false;
    request.feedback = feedback;

    // Clear timeout
    this.clearTimeout(requestId);

    // Update stats
    this.stats.totalRejected++;
    this.trackResponseTime(request);

    // Emit event
    const result: ApprovalResult = {
      approved: false,
      approver,
      reason,
      timestamp: request.approvedAt,
      feedback,
    };
    this.emit("approval-decided", request, result);

    return result;
  }

  /**
   * Get pending approvals
   */
  getPending(approver?: ApproverRole): ApprovalRequest[] {
    const pending = Array.from(this.queue.values()).filter(
      (req) => req.status === ApprovalStatus.PENDING,
    );

    if (approver) {
      return pending.filter(
        (req) => !req.requiredApprover || req.requiredApprover === approver,
      );
    }

    return pending;
  }

  /**
   * Get specific request
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.queue.get(requestId);
  }

  /**
   * Get all requests (for audit/history)
   */
  getAllRequests(): ApprovalRequest[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const pending = this.getPending().length;
    const avgResponseTime =
      this.stats.responseTimes.length > 0
        ? this.stats.responseTimes.reduce((a, b) => a + b, 0) /
          this.stats.responseTimes.length
        : 0;

    const autoApprovalRate =
      this.stats.totalRequests > 0
        ? (this.stats.totalApproved / this.stats.totalRequests) * 100
        : 0;

    return {
      pending,
      approved: this.stats.totalApproved,
      rejected: this.stats.totalRejected,
      timeout: this.stats.totalTimeout,
      avgResponseTimeMs: avgResponseTime,
      autoApprovalRate,
    };
  }

  /**
   * Cancel a pending request
   */
  async cancel(requestId: string): Promise<void> {
    const request = this.queue.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Request ${requestId} is not pending`);
    }

    request.status = ApprovalStatus.CANCELLED;
    this.clearTimeout(requestId);

    this.emit("approval-cancelled", request);
  }

  /**
   * Clear old completed requests (cleanup)
   */
  clearCompleted(olderThanMinutes = 60): number {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    let cleared = 0;

    for (const [id, request] of this.queue.entries()) {
      if (
        request.status !== ApprovalStatus.PENDING &&
        request.approvedAt &&
        request.approvedAt < cutoff
      ) {
        this.queue.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Handle timeout
   */
  private handleTimeout(requestId: string): void {
    const request = this.queue.get(requestId);
    if (!request || request.status !== ApprovalStatus.PENDING) {
      return;
    }

    request.status = ApprovalStatus.TIMEOUT;
    request.approvedAt = new Date();
    request.decision = false;
    request.feedback = "Request timed out without decision";

    this.stats.totalTimeout++;
    this.emit("approval-timeout", request);
  }

  /**
   * Clear timeout for request
   */
  private clearTimeout(requestId: string): void {
    const timeout = this.timeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(requestId);
    }
  }

  /**
   * Track response time
   */
  private trackResponseTime(request: ApprovalRequest): void {
    if (request.approvedAt) {
      const responseTime =
        request.approvedAt.getTime() - request.timestamp.getTime();
      this.stats.responseTimes.push(responseTime);

      // Keep only last 100 response times
      if (this.stats.responseTimes.length > 100) {
        this.stats.responseTimes.shift();
      }
    }
  }

  /**
   * Cleanup all timeouts (for graceful shutdown)
   */
  destroy(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const approvalQueue = new ApprovalQueueService();

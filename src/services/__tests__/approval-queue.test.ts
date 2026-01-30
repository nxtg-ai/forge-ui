/**
 * Approval Queue Service Tests
 * Comprehensive unit tests for the real approval queue system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApprovalQueueService } from "../approval-queue";
import {
  DecisionImpact,
  DecisionRisk,
  ApprovalStatus,
  ApproverRole,
  DecisionContext,
} from "../../types/approval";

describe("ApprovalQueueService", () => {
  let service: ApprovalQueueService;

  beforeEach(() => {
    service = new ApprovalQueueService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe("requestApproval", () => {
    it("should create approval request with unique ID", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Create new component",
        rationale: "Needed for feature X",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.LOW,
      );

      expect(request.id).toBeDefined();
      expect(request.status).toBe(ApprovalStatus.PENDING);
      expect(request.context).toEqual(context);
      expect(request.impact).toBe(DecisionImpact.MEDIUM);
      expect(request.risk).toBe(DecisionRisk.LOW);
      expect(request.timestamp).toBeInstanceOf(Date);
    });

    it("should emit approval-requested event", async () => {
      const handler = vi.fn();
      service.on("approval-requested", handler);

      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test action",
        rationale: "Testing",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      expect(handler).toHaveBeenCalledWith(request);
    });

    it("should use default timeout of 5 minutes", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      expect(request.timeoutMinutes).toBe(5);
    });

    it("should accept custom timeout", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.HIGH,
        DecisionRisk.HIGH,
        { timeoutMinutes: 30 },
      );

      expect(request.timeoutMinutes).toBe(30);
    });

    it("should accept required approver role", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Architecture change",
        rationale: "Needs architect approval",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.HIGH,
        DecisionRisk.MEDIUM,
        { requiredApprover: ApproverRole.ARCHITECT },
      );

      expect(request.requiredApprover).toBe(ApproverRole.ARCHITECT);
    });

    it("should increment total requests stat", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const statsBefore = service.getStats();
      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const statsAfter = service.getStats();

      expect(
        statsAfter.approved + statsAfter.rejected + statsAfter.pending,
      ).toBe(
        statsBefore.approved + statsBefore.rejected + statsBefore.pending + 1,
      );
    });
  });

  describe("approve", () => {
    it("should approve pending request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const result = await service.approve(
        request.id,
        ApproverRole.CEO,
        "Approved for testing",
      );

      expect(result.approved).toBe(true);
      expect(result.approver).toBe(ApproverRole.CEO);
      expect(result.reason).toBe("Approved for testing");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should update request status to APPROVED", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(request.id, ApproverRole.CEO, "Looks good");

      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.APPROVED);
      expect(updated?.decision).toBe(true);
      expect(updated?.approver).toBe(ApproverRole.CEO);
      expect(updated?.approvedAt).toBeInstanceOf(Date);
    });

    it("should emit approval-decided event", async () => {
      const handler = vi.fn();
      service.on("approval-decided", handler);

      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const result = await service.approve(
        request.id,
        ApproverRole.CEO,
        "Approved",
      );

      expect(handler).toHaveBeenCalled();
      const [emittedRequest, emittedResult] = handler.mock.calls[0];
      expect(emittedRequest.id).toBe(request.id);
      expect(emittedResult.approved).toBe(true);
    });

    it("should clear timeout when approved", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
        { timeoutMinutes: 0.01 }, // 0.6 seconds
      );

      await service.approve(request.id, ApproverRole.CEO, "Quick approval");

      // Wait longer than timeout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should not have timed out
      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.APPROVED);
    });

    it("should accept optional feedback", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.LOW,
      );

      const result = await service.approve(
        request.id,
        ApproverRole.ARCHITECT,
        "Approved",
        "Consider using a factory pattern here",
      );

      expect(result.feedback).toBe("Consider using a factory pattern here");

      const updated = service.getRequest(request.id);
      expect(updated?.feedback).toBe("Consider using a factory pattern here");
    });

    it("should throw error for non-existent request", async () => {
      await expect(
        service.approve("non-existent-id", ApproverRole.CEO, "Test"),
      ).rejects.toThrow("Approval request non-existent-id not found");
    });

    it("should throw error for non-pending request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(request.id, ApproverRole.CEO, "First approval");

      await expect(
        service.approve(request.id, ApproverRole.CEO, "Second approval"),
      ).rejects.toThrow("is not pending");
    });

    it("should increment approved stat", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const statsBefore = service.getStats();
      await service.approve(request.id, ApproverRole.CEO, "Approved");
      const statsAfter = service.getStats();

      expect(statsAfter.approved).toBe(statsBefore.approved + 1);
    });
  });

  describe("reject", () => {
    it("should reject pending request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.HIGH,
        DecisionRisk.HIGH,
      );

      const result = await service.reject(
        request.id,
        ApproverRole.HUMAN,
        "Too risky for current sprint",
      );

      expect(result.approved).toBe(false);
      expect(result.approver).toBe(ApproverRole.HUMAN);
      expect(result.reason).toBe("Too risky for current sprint");
    });

    it("should update request status to REJECTED", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.CRITICAL,
        DecisionRisk.CRITICAL,
      );

      await service.reject(request.id, ApproverRole.HUMAN, "Not now");

      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.REJECTED);
      expect(updated?.decision).toBe(false);
    });

    it("should emit approval-decided event", async () => {
      const handler = vi.fn();
      service.on("approval-decided", handler);

      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.MEDIUM,
      );

      await service.reject(
        request.id,
        ApproverRole.CEO,
        "Not aligned with vision",
      );

      expect(handler).toHaveBeenCalled();
      const [, emittedResult] = handler.mock.calls[0];
      expect(emittedResult.approved).toBe(false);
    });

    it("should increment rejected stat", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const statsBefore = service.getStats();
      await service.reject(request.id, ApproverRole.CEO, "Rejected");
      const statsAfter = service.getStats();

      expect(statsAfter.rejected).toBe(statsBefore.rejected + 1);
    });
  });

  describe("timeout handling", () => {
    it("should timeout request after specified minutes", async () => {
      const handler = vi.fn();
      service.on("approval-timeout", handler);

      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
        { timeoutMinutes: 0.01 }, // 0.6 seconds
      );

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(handler).toHaveBeenCalled();

      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.TIMEOUT);
      expect(updated?.decision).toBe(false);
      expect(updated?.feedback).toContain("timed out");
    });

    it("should increment timeout stat", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
        { timeoutMinutes: 0.01 },
      );

      const statsBefore = service.getStats();

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statsAfter = service.getStats();
      expect(statsAfter.timeout).toBe(statsBefore.timeout + 1);
    });

    it("should not timeout already decided request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
        { timeoutMinutes: 0.01 },
      );

      // Approve before timeout
      await service.approve(request.id, ApproverRole.CEO, "Quick decision");

      // Wait for would-be timeout
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.APPROVED);
    });
  });

  describe("getPending", () => {
    it("should return all pending requests", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.LOW,
      );

      const pending = service.getPending();
      expect(pending.length).toBe(2);
      expect(pending.every((r) => r.status === ApprovalStatus.PENDING)).toBe(
        true,
      );
    });

    it("should filter by approver role", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      await service.requestApproval(
        context,
        DecisionImpact.HIGH,
        DecisionRisk.MEDIUM,
        {
          requiredApprover: ApproverRole.ARCHITECT,
        },
      );
      await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.MEDIUM,
        {
          requiredApprover: ApproverRole.DESIGNER, // Different approver
        },
      );

      const architectPending = service.getPending(ApproverRole.ARCHITECT);
      // Should return: 1 without required approver + 1 with ARCHITECT required = 2
      expect(architectPending.length).toBe(2);

      // One should have ARCHITECT as required approver
      expect(
        architectPending.some(
          (r) => r.requiredApprover === ApproverRole.ARCHITECT,
        ),
      ).toBe(true);

      // Should NOT include DESIGNER-required request
      expect(
        architectPending.some(
          (r) => r.requiredApprover === ApproverRole.DESIGNER,
        ),
      ).toBe(false);
    });

    it("should include requests without required approver when filtering", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const ceoPending = service.getPending(ApproverRole.CEO);
      expect(ceoPending.length).toBe(1); // Should include requests without specific approver
    });

    it("should not include approved/rejected/cancelled requests", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const req1 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req2 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req3 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(req1.id, ApproverRole.CEO, "Approved");
      await service.reject(req2.id, ApproverRole.CEO, "Rejected");
      await service.cancel(req3.id);

      const pending = service.getPending();
      expect(pending.length).toBe(0);
    });
  });

  describe("cancel", () => {
    it("should cancel pending request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.LOW,
      );

      await service.cancel(request.id);

      const updated = service.getRequest(request.id);
      expect(updated?.status).toBe(ApprovalStatus.CANCELLED);
    });

    it("should emit approval-cancelled event", async () => {
      const handler = vi.fn();
      service.on("approval-cancelled", handler);

      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.cancel(request.id);

      expect(handler).toHaveBeenCalled();
    });

    it("should throw error for non-pending request", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(request.id, ApproverRole.CEO, "Approved");

      await expect(service.cancel(request.id)).rejects.toThrow(
        "is not pending",
      );
    });
  });

  describe("getStats", () => {
    it("should calculate correct stats", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const req1 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req2 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req3 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(req1.id, ApproverRole.CEO, "Approved");
      await service.reject(req2.id, ApproverRole.CEO, "Rejected");
      await service.cancel(req3.id);

      const stats = service.getStats();
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it("should calculate average response time", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const req1 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await service.approve(req1.id, ApproverRole.CEO, "Approved");

      const stats = service.getStats();
      expect(stats.avgResponseTimeMs).toBeGreaterThan(0);
    });

    it("should calculate auto-approval rate", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const req1 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req2 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(req1.id, ApproverRole.CEO, "Auto-approved");
      await service.approve(req2.id, ApproverRole.HUMAN, "Manual approval");

      const stats = service.getStats();
      expect(stats.autoApprovalRate).toBe(100); // 2/2 = 100%
    });
  });

  describe("clearCompleted", () => {
    it("should remove old completed requests", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(request.id, ApproverRole.CEO, "Approved");

      // Manually set approvedAt to old date
      const req = service.getRequest(request.id);
      if (req) {
        req.approvedAt = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago
      }

      const cleared = service.clearCompleted(60); // Clear older than 1 hour
      expect(cleared).toBe(1);
      expect(service.getRequest(request.id)).toBeUndefined();
    });

    it("should not remove pending requests", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const request = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      const cleared = service.clearCompleted(0);
      expect(cleared).toBe(0);
      expect(service.getRequest(request.id)).toBeDefined();
    });
  });

  describe("destroy", () => {
    it("should clear all timeouts", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
        {
          timeoutMinutes: 1,
        },
      );

      service.destroy();

      // Verify no timeout fires
      const handler = vi.fn();
      service.on("approval-timeout", handler);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handler).not.toHaveBeenCalled();
    });

    it("should remove all listeners", () => {
      const handler = vi.fn();
      service.on("approval-requested", handler);

      service.destroy();

      expect(service.listenerCount("approval-requested")).toBe(0);
    });
  });

  describe("getAllRequests", () => {
    it("should return all requests", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      await service.requestApproval(
        context,
        DecisionImpact.MEDIUM,
        DecisionRisk.MEDIUM,
      );

      const all = service.getAllRequests();
      expect(all.length).toBe(2);
    });

    it("should include all statuses", async () => {
      const context: DecisionContext = {
        taskId: "task-1",
        agentId: "builder",
        action: "Test",
        rationale: "Test",
      };

      const req1 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );
      const req2 = await service.requestApproval(
        context,
        DecisionImpact.LOW,
        DecisionRisk.LOW,
      );

      await service.approve(req1.id, ApproverRole.CEO, "Approved");

      const all = service.getAllRequests();
      expect(all.some((r) => r.status === ApprovalStatus.APPROVED)).toBe(true);
      expect(all.some((r) => r.status === ApprovalStatus.PENDING)).toBe(true);
    });
  });
});

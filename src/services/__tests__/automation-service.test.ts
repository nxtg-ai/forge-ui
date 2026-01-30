/**
 * Automation Service Tests
 * Unit tests for YOLO mode automation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AutomationService,
  AutomationRule,
  AutomationContext,
} from "../automation-service";
import { AutomatedAction, AutomationLevel } from "../../components/types";

describe("AutomationService", () => {
  let service: AutomationService;

  beforeEach(() => {
    service = new AutomationService({
      name: "TestAutomation",
      defaultLevel: "balanced",
    });
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe("initialization", () => {
    it("should initialize with default rules", async () => {
      const result = await service.initialize();
      expect(result.isOk()).toBe(true);

      const rules = service.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.id === "auto-fix-tests")).toBe(true);
    });

    it("should set default automation level", () => {
      expect(service.getAutomationLevel()).toBe("balanced");

      const customService = new AutomationService({
        name: "Custom",
        defaultLevel: "aggressive",
      });
      expect(customService.getAutomationLevel()).toBe("aggressive");
    });
  });

  describe("automation levels", () => {
    it("should change automation level", () => {
      service.setAutomationLevel("conservative");
      expect(service.getAutomationLevel()).toBe("conservative");

      service.setAutomationLevel("maximum");
      expect(service.getAutomationLevel()).toBe("maximum");
    });

    it("should emit level change event", () => {
      const handler = vi.fn();
      service.on("automationLevelChanged", handler);

      service.setAutomationLevel("aggressive");
      expect(handler).toHaveBeenCalledWith("aggressive");
    });
  });

  describe("action execution", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should execute low-confidence action in dry run", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "fix",
        title: "Fix test",
        description: "Fix failing test",
        impact: "low",
        confidence: 0.8,
        automated: true,
      };

      const result = await service.executeAction(action, { dryRun: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executed).toBe(true);
        expect(result.value.result?.command).toContain("[DRY RUN]");
      }
    });

    it("should skip action below minimum confidence", async () => {
      service.setAutomationLevel("conservative"); // High thresholds

      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "optimize",
        title: "Optimize",
        description: "Performance optimization",
        impact: "medium",
        confidence: 0.5, // Below conservative minimum
        automated: true,
      };

      const result = await service.executeAction(action);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executed).toBe(false);
        expect(result.value.skipped).toBe(true);
        expect(result.value.skipReason).toContain("below minimum threshold");
      }
    });

    it("should request confirmation for medium confidence", async () => {
      const handler = vi.fn();
      service.on("confirmationRequired", handler);

      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "update",
        title: "Update deps",
        description: "Update dependencies",
        impact: "medium",
        confidence: 0.6, // In caution range for balanced
        automated: true,
      };

      const result = await service.executeAction(action);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.skipped).toBe(true);
        expect(result.value.skipReason).toContain("Confirmation required");
      }
      expect(handler).toHaveBeenCalled();
    });

    it("should execute high-confidence action automatically", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "refactor",
        title: "Format code",
        description: "Apply formatting",
        impact: "low",
        confidence: 0.95, // High confidence
        automated: true,
      };

      const result = await service.executeAction(action, { dryRun: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executed).toBe(true);
        expect(result.value.action.status).toBe("completed");
      }
    });

    it("should respect rate limiting", async () => {
      const testService = new AutomationService({
        name: "RateLimited",
        maxActionsPerMinute: 2,
      });
      await testService.initialize();

      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "fix",
        title: "Fix",
        description: "Fix issue",
        impact: "low",
        confidence: 0.9,
        automated: true,
      };

      // Execute 2 actions (within limit)
      const result1 = await testService.executeAction(action, { dryRun: true });
      const result2 = await testService.executeAction(action, { dryRun: true });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      // Third should fail due to rate limit
      const result3 = await testService.executeAction(action, { dryRun: true });
      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        expect(result3.error.code).toBe("RATE_LIMIT");
      }

      await testService.dispose();
    });
  });

  describe("rollback functionality", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should create rollback snapshot", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "update",
        title: "Update",
        description: "Update files",
        impact: "medium",
        confidence: 0.9,
        automated: true,
      };

      const result = await service.executeAction(action, { dryRun: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.rollbackSnapshot).toBeDefined();
        expect(result.value.rollbackSnapshot?.actionId).toBe(
          result.value.action.id,
        );
      }
    });

    it("should rollback action", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "fix",
        title: "Fix",
        description: "Fix bug",
        impact: "low",
        confidence: 0.9,
        automated: true,
      };

      const execResult = await service.executeAction(action, { dryRun: true });
      expect(execResult.isOk()).toBe(true);

      if (execResult.isOk()) {
        const rollbackResult = await service.rollback(
          execResult.value.action.id,
        );
        expect(rollbackResult.isOk()).toBe(true);

        const history = service.getActionHistory();
        const rolledBack = history.find(
          (a) => a.id === execResult.value.action.id,
        );
        expect(rolledBack?.status).toBe("reverted");
      }
    });

    it("should handle rollback errors", async () => {
      const result = await service.rollback("non-existent-id");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NO_SNAPSHOT");
      }
    });
  });

  describe("automation rules", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should add custom rule", () => {
      const rule: AutomationRule = {
        id: "custom-rule",
        name: "Custom Rule",
        description: "Test rule",
        pattern: /custom/i,
        action: async () => ({
          id: "",
          type: "fix",
          title: "Custom fix",
          description: "Custom action",
          impact: "low",
          status: "pending",
          timestamp: new Date(),
          confidence: 0.8,
          automated: true,
        }),
      };

      service.addRule(rule);
      const rules = service.getRules();
      expect(rules.some((r) => r.id === "custom-rule")).toBe(true);
    });

    it("should remove rule", () => {
      const rule: AutomationRule = {
        id: "temp-rule",
        name: "Temp Rule",
        description: "Temporary",
        pattern: "temp",
        action: async () => ({}) as any,
      };

      service.addRule(rule);
      expect(service.getRules().some((r) => r.id === "temp-rule")).toBe(true);

      const removed = service.removeRule("temp-rule");
      expect(removed).toBe(true);
      expect(service.getRules().some((r) => r.id === "temp-rule")).toBe(false);
    });

    it("should apply confidence modifier from rule", async () => {
      const rule: AutomationRule = {
        id: "modified-rule",
        name: "Modified",
        description: "Rule with modifier",
        pattern: "test",
        action: async () => ({
          id: "",
          type: "fix",
          title: "Fix",
          description: "Fix with modifier",
          impact: "low",
          status: "pending",
          timestamp: new Date(),
          confidence: 1.0, // Start with max confidence
          automated: true,
        }),
        confidenceModifier: 0.5, // Reduce by half
      };

      service.addRule(rule);

      const suggestions = await service.analyzeSituation({
        context: "test case",
      });
      expect(suggestions.isOk()).toBe(true);
      if (suggestions.isOk()) {
        const modified = suggestions.value.find(
          (a) => a.description === "Fix with modifier",
        );
        expect(modified?.confidence).toBe(0.5);
      }
    });

    it("should respect rule execution limits", async () => {
      const rule: AutomationRule = {
        id: "limited-rule",
        name: "Limited",
        description: "Rate limited rule",
        pattern: "always",
        action: async () => ({}) as any,
        maxExecutionsPerHour: 1,
      };

      service.addRule(rule);

      // First analysis should include the rule
      const first = await service.analyzeSituation({ match: "always" });
      expect(first.isOk()).toBe(true);

      // Simulate execution count
      (service as any).executionCounts.set("limited-rule", 1);

      // Second analysis should exclude the rule
      const second = await service.analyzeSituation({ match: "always" });
      expect(second.isOk()).toBe(true);
      if (second.isOk()) {
        expect(second.value.length).toBe(0);
      }
    });
  });

  describe("situation analysis", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should analyze and suggest actions", async () => {
      const context = {
        error: "test failure",
        type: "unit_test",
        file: "example.test.ts",
      };

      const result = await service.analyzeSituation(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);
        // Should match test fix rule
        expect(result.value.some((a) => a.type === "fix")).toBe(true);
      }
    });

    it("should sort suggestions by confidence", async () => {
      const context = {
        issues: "slow performance and failing tests",
      };

      const result = await service.analyzeSituation(context);

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.length > 1) {
        for (let i = 1; i < result.value.length; i++) {
          expect(result.value[i - 1].confidence).toBeGreaterThanOrEqual(
            result.value[i].confidence,
          );
        }
      }
    });
  });

  describe("statistics tracking", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should track successful actions", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "fix",
        title: "Fix",
        description: "Fix issue",
        impact: "low",
        confidence: 0.9,
        automated: true,
      };

      await service.executeAction(action, { dryRun: true });

      const stats = service.getStatistics();
      expect(stats.actionsToday).toBe(1);
      expect(stats.issuesFixed).toBe(1);
    });

    it("should calculate success rate", async () => {
      const successAction: Omit<
        AutomatedAction,
        "id" | "status" | "timestamp"
      > = {
        type: "fix",
        title: "Success",
        description: "Will succeed",
        impact: "low",
        confidence: 0.9,
        automated: true,
      };

      // Execute successful action
      await service.executeAction(successAction, { dryRun: true });

      const stats = service.getStatistics();
      expect(stats.successRate).toBe(100);
    });

    it("should estimate time and cost saved", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "optimize",
        title: "Optimize",
        description: "Quick optimization",
        impact: "medium",
        confidence: 0.9,
        automated: true,
      };

      await service.executeAction(action, { dryRun: true });

      const stats = service.getStatistics();
      expect(stats.timesSaved).toBeGreaterThanOrEqual(0);
      expect(stats.costSaved).toBeGreaterThanOrEqual(0);
      expect(stats.performanceGain).toBeGreaterThan(0);
    });
  });

  describe("history management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should maintain action history", async () => {
      const action: Omit<AutomatedAction, "id" | "status" | "timestamp"> = {
        type: "fix",
        title: "Historical",
        description: "For history",
        impact: "low",
        confidence: 0.9,
        automated: true,
      };

      await service.executeAction(action, { dryRun: true });

      const history = service.getActionHistory();
      expect(history.length).toBe(1);
      expect(history[0].title).toBe("Historical");
    });

    it("should limit history size", async () => {
      const history = service.getActionHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should clear history", () => {
      service.clearHistory();

      const history = service.getActionHistory();
      expect(history).toHaveLength(0);

      const stats = service.getStatistics();
      expect(stats.actionsToday).toBe(0);
    });
  });
});

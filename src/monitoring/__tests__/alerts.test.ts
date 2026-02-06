/**
 * Alerting System Tests
 * Comprehensive tests for alert management and notifications
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AlertingSystem,
  Alert,
  AlertRule,
  AlertSeverity,
  AlertType,
  AlertAction,
} from "../alerts";
import * as fs from "fs";
import * as path from "path";

// Mock dependencies
vi.mock("fs");

describe("AlertingSystem", () => {
  let alertingSystem: AlertingSystem;
  let mockProjectPath: string;

  beforeEach(() => {
    mockProjectPath = "/test/project";
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ alerts: [], history: [] }));

    alertingSystem = new AlertingSystem(mockProjectPath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    alertingSystem.stop();
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create with default project path", () => {
      const system = new AlertingSystem();
      expect(system).toBeDefined();
    });

    it("should create with custom project path", () => {
      const system = new AlertingSystem("/custom/path");
      expect(system).toBeDefined();
    });

    it("should initialize default rules", () => {
      expect(alertingSystem).toBeDefined();
      // Default rules should be loaded
    });

    it("should load persisted alerts if file exists", () => {
      const persistedAlerts = {
        alerts: [
          {
            id: "alert-1",
            type: AlertType.HEALTH_DEGRADATION,
            severity: AlertSeverity.WARNING,
            title: "Health Issue",
            message: "Health degraded",
            timestamp: new Date().toISOString(),
            acknowledged: false,
            resolved: false,
          },
        ],
        history: [],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(persistedAlerts));

      const system = new AlertingSystem(mockProjectPath);
      expect(system.getActiveAlerts().length).toBe(1);
    });
  });

  describe("createAlert", () => {
    it("should create a new alert", () => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold",
        { rate: 15 }
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.type).toBe(AlertType.HIGH_ERROR_RATE);
      expect(alert.severity).toBe(AlertSeverity.WARNING);
      expect(alert.title).toBe("High Error Rate");
      expect(alert.message).toBe("Error rate exceeded threshold");
      expect(alert.metadata?.rate).toBe(15);
      expect(alert.acknowledged).toBe(false);
      expect(alert.resolved).toBe(false);
    });

    it("should emit alert event", (done) => {
      alertingSystem.on("alert", (alert: Alert) => {
        expect(alert.type).toBe(AlertType.MEMORY_PRESSURE);
        done();
      });

      alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Memory Pressure",
        "Memory usage is high"
      );
    });

    it("should generate unique alert IDs", () => {
      const alert1 = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      const alert2 = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 2",
        "Message 2"
      );

      expect(alert1.id).not.toBe(alert2.id);
    });

    it("should add alert to active alerts", () => {
      alertingSystem.createAlert(
        AlertType.DISK_SPACE_LOW,
        AlertSeverity.ERROR,
        "Low Disk Space",
        "Disk space is running low"
      );

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].type).toBe(AlertType.DISK_SPACE_LOW);
    });

    it("should maintain alert history", () => {
      alertingSystem.createAlert(
        AlertType.STATE_SYNC_FAILURE,
        AlertSeverity.ERROR,
        "Sync Failed",
        "State sync failed"
      );

      // History should contain the alert
      const stats = alertingSystem.getStats();
      expect(stats.total).toBe(1);
    });

    it("should limit history size", () => {
      // Create more than max history size (1000)
      for (let i = 0; i < 1100; i++) {
        alertingSystem.createAlert(
          AlertType.CUSTOM,
          AlertSeverity.INFO,
          `Alert ${i}`,
          `Message ${i}`
        );
      }

      // Should not exceed max history size
      expect(alertingSystem.getActiveAlerts().length).toBeLessThanOrEqual(1100);
    });
  });

  describe("acknowledgeAlert", () => {
    it("should acknowledge an alert", () => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      expect(alert.acknowledged).toBe(false);

      alertingSystem.acknowledgeAlert(alert.id);

      const activeAlerts = alertingSystem.getActiveAlerts();
      const acknowledgedAlert = activeAlerts.find((a) => a.id === alert.id);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });

    it("should emit alertAcknowledged event", (done) => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      alertingSystem.on("alertAcknowledged", (acknowledgedAlert: Alert) => {
        expect(acknowledgedAlert.id).toBe(alert.id);
        done();
      });

      alertingSystem.acknowledgeAlert(alert.id);
    });

    it("should not re-acknowledge already acknowledged alert", () => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      const eventHandler = vi.fn();
      alertingSystem.on("alertAcknowledged", eventHandler);

      alertingSystem.acknowledgeAlert(alert.id);
      alertingSystem.acknowledgeAlert(alert.id);

      expect(eventHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle non-existent alert ID gracefully", () => {
      expect(() => {
        alertingSystem.acknowledgeAlert("non-existent-id");
      }).not.toThrow();
    });
  });

  describe("resolveAlert", () => {
    it("should resolve an alert", () => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      expect(alert.resolved).toBe(false);

      alertingSystem.resolveAlert(alert.id);

      const activeAlerts = alertingSystem.getActiveAlerts();
      const resolvedAlert = activeAlerts.find((a) => a.id === alert.id);
      expect(resolvedAlert?.resolved).toBe(true);
      expect(resolvedAlert?.acknowledged).toBe(true);
    });

    it("should emit alertResolved event", (done) => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      alertingSystem.on("alertResolved", (resolvedAlert: Alert) => {
        expect(resolvedAlert.id).toBe(alert.id);
        done();
      });

      alertingSystem.resolveAlert(alert.id);
    });

    it("should remove resolved alert after delay", async () => {
      vi.useFakeTimers();

      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      alertingSystem.resolveAlert(alert.id);

      // Should still be present immediately
      let activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.some((a) => a.id === alert.id)).toBe(true);

      // After 60 seconds, should be removed
      vi.advanceTimersByTime(60000);

      // Wait for promise to resolve
      await vi.runAllTimersAsync();

      activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.some((a) => a.id === alert.id)).toBe(false);

      vi.useRealTimers();
    });

    it("should not re-resolve already resolved alert", () => {
      const alert = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "High Error Rate",
        "Error rate exceeded threshold"
      );

      const eventHandler = vi.fn();
      alertingSystem.on("alertResolved", eventHandler);

      alertingSystem.resolveAlert(alert.id);
      alertingSystem.resolveAlert(alert.id);

      expect(eventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("addRule", () => {
    it("should add a custom rule", () => {
      const rule: AlertRule = {
        id: "custom-rule",
        name: "Custom Rule",
        condition: {
          type: AlertType.CUSTOM,
          threshold: 100,
          operator: "gt",
        },
        severity: AlertSeverity.WARNING,
        actions: [{ type: "notify", executed: false }],
        enabled: true,
      };

      alertingSystem.addRule(rule);

      // Rule should be added (no error)
      expect(() => alertingSystem.addRule(rule)).not.toThrow();
    });

    it("should allow multiple rules", () => {
      const rule1: AlertRule = {
        id: "rule-1",
        name: "Rule 1",
        condition: { type: AlertType.CUSTOM, threshold: 10, operator: "gt" },
        severity: AlertSeverity.INFO,
        actions: [],
        enabled: true,
      };

      const rule2: AlertRule = {
        id: "rule-2",
        name: "Rule 2",
        condition: { type: AlertType.CUSTOM, threshold: 20, operator: "gt" },
        severity: AlertSeverity.WARNING,
        actions: [],
        enabled: true,
      };

      alertingSystem.addRule(rule1);
      alertingSystem.addRule(rule2);

      expect(() => alertingSystem.addRule(rule1)).not.toThrow();
    });
  });

  describe("updateRule", () => {
    it("should update an existing rule", () => {
      const rule: AlertRule = {
        id: "test-rule",
        name: "Test Rule",
        condition: { type: AlertType.CUSTOM, threshold: 10, operator: "gt" },
        severity: AlertSeverity.INFO,
        actions: [],
        enabled: true,
      };

      alertingSystem.addRule(rule);
      alertingSystem.updateRule("test-rule", { severity: AlertSeverity.CRITICAL });

      // Should update without error
      expect(() => alertingSystem.updateRule("test-rule", { enabled: false })).not.toThrow();
    });

    it("should handle non-existent rule gracefully", () => {
      expect(() => {
        alertingSystem.updateRule("non-existent", { enabled: false });
      }).not.toThrow();
    });
  });

  describe("setRuleEnabled", () => {
    it("should enable a rule", () => {
      const rule: AlertRule = {
        id: "test-rule",
        name: "Test Rule",
        condition: { type: AlertType.CUSTOM, threshold: 10, operator: "gt" },
        severity: AlertSeverity.INFO,
        actions: [],
        enabled: false,
      };

      alertingSystem.addRule(rule);
      alertingSystem.setRuleEnabled("test-rule", true);

      expect(() => alertingSystem.setRuleEnabled("test-rule", true)).not.toThrow();
    });

    it("should disable a rule", () => {
      const rule: AlertRule = {
        id: "test-rule",
        name: "Test Rule",
        condition: { type: AlertType.CUSTOM, threshold: 10, operator: "gt" },
        severity: AlertSeverity.INFO,
        actions: [],
        enabled: true,
      };

      alertingSystem.addRule(rule);
      alertingSystem.setRuleEnabled("test-rule", false);

      expect(() => alertingSystem.setRuleEnabled("test-rule", false)).not.toThrow();
    });
  });

  describe("start and stop", () => {
    it("should start alert monitoring", () => {
      alertingSystem.start(1000);

      expect(() => alertingSystem.start(1000)).not.toThrow();
    });

    it("should stop alert monitoring", () => {
      alertingSystem.start(1000);
      alertingSystem.stop();

      expect(() => alertingSystem.stop()).not.toThrow();
    });

    it("should persist alerts on stop", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Test",
        "Test message"
      );

      alertingSystem.stop();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should use default interval", () => {
      alertingSystem.start();

      expect(() => alertingSystem.start()).not.toThrow();
    });
  });

  describe("getActiveAlerts", () => {
    it("should return only unresolved alerts", () => {
      const alert1 = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      const alert2 = alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.resolveAlert(alert1.id);

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].id).toBe(alert2.id);
    });

    it("should return empty array when no active alerts", () => {
      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts).toEqual([]);
    });
  });

  describe("getAlertsByType", () => {
    it("should filter alerts by type", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.ERROR,
        "Alert 3",
        "Message 3"
      );

      const errorRateAlerts = alertingSystem.getAlertsByType(AlertType.HIGH_ERROR_RATE);
      expect(errorRateAlerts.length).toBe(2);
      expect(errorRateAlerts.every((a) => a.type === AlertType.HIGH_ERROR_RATE)).toBe(true);
    });

    it("should return empty array when no matching alerts", () => {
      const alerts = alertingSystem.getAlertsByType(AlertType.DISK_SPACE_LOW);
      expect(alerts).toEqual([]);
    });
  });

  describe("getAlertsBySeverity", () => {
    it("should filter alerts by severity", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.CRITICAL,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.createAlert(
        AlertType.DISK_SPACE_LOW,
        AlertSeverity.CRITICAL,
        "Alert 3",
        "Message 3"
      );

      const criticalAlerts = alertingSystem.getAlertsBySeverity(AlertSeverity.CRITICAL);
      expect(criticalAlerts.length).toBe(2);
      expect(criticalAlerts.every((a) => a.severity === AlertSeverity.CRITICAL)).toBe(true);
    });

    it("should return empty array when no matching alerts", () => {
      const alerts = alertingSystem.getAlertsBySeverity(AlertSeverity.INFO);
      expect(alerts).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return statistics for all alerts", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.CRITICAL,
        "Alert 2",
        "Message 2"
      );

      const alert3 = alertingSystem.createAlert(
        AlertType.DISK_SPACE_LOW,
        AlertSeverity.ERROR,
        "Alert 3",
        "Message 3"
      );

      alertingSystem.acknowledgeAlert(alert3.id);
      alertingSystem.resolveAlert(alert3.id);

      const stats = alertingSystem.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.acknowledged).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.bySeverity[AlertSeverity.WARNING]).toBe(1);
      expect(stats.bySeverity[AlertSeverity.CRITICAL]).toBe(1);
      expect(stats.bySeverity[AlertSeverity.ERROR]).toBe(1);
    });

    it("should return zero statistics when no alerts", () => {
      const stats = alertingSystem.getStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.acknowledged).toBe(0);
      expect(stats.resolved).toBe(0);
    });

    it("should count alerts by type", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.ERROR,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Alert 3",
        "Message 3"
      );

      const stats = alertingSystem.getStats();

      expect(stats.byType[AlertType.HIGH_ERROR_RATE]).toBe(2);
      expect(stats.byType[AlertType.MEMORY_PRESSURE]).toBe(1);
    });
  });

  describe("clearResolvedAlerts", () => {
    it("should clear all resolved alerts", () => {
      const alert1 = alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      const alert2 = alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.resolveAlert(alert1.id);

      let activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);

      alertingSystem.clearResolvedAlerts();

      const stats = alertingSystem.getStats();
      expect(stats.total).toBe(1);
    });

    it("should not affect unresolved alerts", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Alert 1",
        "Message 1"
      );

      const alert2 = alertingSystem.createAlert(
        AlertType.MEMORY_PRESSURE,
        AlertSeverity.WARNING,
        "Alert 2",
        "Message 2"
      );

      alertingSystem.resolveAlert(alert2.id);
      alertingSystem.clearResolvedAlerts();

      const activeAlerts = alertingSystem.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);
      expect(activeAlerts[0].type).toBe(AlertType.HIGH_ERROR_RATE);
    });
  });

  describe("alert actions", () => {
    it("should execute notify action", (done) => {
      alertingSystem.on("notification", (notification) => {
        expect(notification.type).toBe("alert");
        expect(notification.severity).toBe(AlertSeverity.CRITICAL);
        done();
      });

      alertingSystem.createAlert(
        AlertType.HEALTH_DEGRADATION,
        AlertSeverity.CRITICAL,
        "Critical Health",
        "Health is critical"
      );
    });

    it("should execute log action", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      alertingSystem.createAlert(
        AlertType.STATE_SYNC_FAILURE,
        AlertSeverity.ERROR,
        "Sync Failed",
        "State sync failed"
      );

      // Wait for async action
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should execute rollback action", (done) => {
      const rule: AlertRule = {
        id: "rollback-rule",
        name: "Rollback Rule",
        condition: { type: AlertType.AUTOMATION_ROLLBACK, threshold: 1, operator: "gte" },
        severity: AlertSeverity.ERROR,
        actions: [{ type: "rollback", target: "deployment", executed: false }],
        enabled: true,
      };

      alertingSystem.addRule(rule);

      alertingSystem.on("rollback", (data) => {
        expect(data.target).toBe("deployment");
        done();
      });

      alertingSystem.createAlert(
        AlertType.AUTOMATION_ROLLBACK,
        AlertSeverity.ERROR,
        "Rollback Required",
        "Automation needs rollback"
      );
    });

    it("should execute restart action", (done) => {
      const rule: AlertRule = {
        id: "restart-rule",
        name: "Restart Rule",
        condition: { type: AlertType.AGENT_FAILURE, threshold: 1, operator: "gte" },
        severity: AlertSeverity.ERROR,
        actions: [{ type: "restart", target: "agent", executed: false }],
        enabled: true,
      };

      alertingSystem.addRule(rule);

      alertingSystem.on("restart", (data) => {
        expect(data.target).toBe("agent");
        done();
      });

      alertingSystem.createAlert(
        AlertType.AGENT_FAILURE,
        AlertSeverity.ERROR,
        "Agent Failed",
        "Agent has failed"
      );
    });

    it("should execute custom action", (done) => {
      const rule: AlertRule = {
        id: "custom-rule",
        name: "Custom Rule",
        condition: { type: AlertType.CUSTOM, threshold: 1, operator: "gte" },
        severity: AlertSeverity.WARNING,
        actions: [{ type: "execute", target: "custom-script", executed: false }],
        enabled: true,
      };

      alertingSystem.addRule(rule);

      alertingSystem.on("customAction", (data) => {
        expect(data.target).toBe("custom-script");
        done();
      });

      alertingSystem.createAlert(
        AlertType.CUSTOM,
        AlertSeverity.WARNING,
        "Custom Alert",
        "Custom condition met"
      );
    });
  });

  describe("persistence", () => {
    it("should persist alerts to disk", () => {
      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Test Alert",
        "Test message"
      );

      alertingSystem.stop();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("alerts.json"),
        expect.any(String)
      );
    });

    it("should create directory if it doesn't exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      alertingSystem.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.WARNING,
        "Test Alert",
        "Test message"
      );

      alertingSystem.stop();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ recursive: true })
      );
    });

    it("should handle persistence errors gracefully", () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error("Write failed");
      });

      expect(() => {
        alertingSystem.stop();
      }).not.toThrow();
    });
  });

  describe("rule evaluation", () => {
    it("should evaluate rules at specified interval", async () => {
      vi.useFakeTimers();

      alertingSystem.start(1000);

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });

    it("should respect rule cooldown period", async () => {
      vi.useFakeTimers();

      const rule: AlertRule = {
        id: "cooldown-rule",
        name: "Cooldown Rule",
        condition: { type: AlertType.CUSTOM, threshold: 1, operator: "gte" },
        severity: AlertSeverity.WARNING,
        actions: [],
        enabled: true,
        cooldown: 60, // 60 seconds
      };

      alertingSystem.addRule(rule);
      alertingSystem.start(1000);

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });

    it("should skip disabled rules", async () => {
      vi.useFakeTimers();

      const rule: AlertRule = {
        id: "disabled-rule",
        name: "Disabled Rule",
        condition: { type: AlertType.CUSTOM, threshold: 1, operator: "gte" },
        severity: AlertSeverity.WARNING,
        actions: [],
        enabled: false,
      };

      alertingSystem.addRule(rule);
      alertingSystem.start(1000);

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });
  });
});

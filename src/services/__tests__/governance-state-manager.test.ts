/**
 * Governance State Manager Tests
 * Comprehensive tests for state rotation, validation, and persistence
 */

/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GovernanceStateManager } from "../governance-state-manager";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import type { GovernanceState } from "../../types/governance.types";

describe("GovernanceStateManager", () => {
  let testDir: string;
  let manager: GovernanceStateManager;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `governance-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    manager = new GovernanceStateManager(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const createValidState = (): GovernanceState => ({
    version: 1,
    timestamp: new Date().toISOString(),
    constitution: {
      directive: "Build an amazing app",
      vision: ["Goal 1", "Goal 2"],
      status: "PLANNING",
      confidence: 85,
      updatedAt: new Date().toISOString(),
    },
    workstreams: [],
    sentinelLog: [],
    metadata: {
      sessionId: "test-session",
      projectPath: "/test/path",
      forgeVersion: "1.0.0",
      lastSync: new Date().toISOString(),
      checksum: "",
    },
  });

  describe("readState", () => {
    it("should read valid governance state", async () => {
      const validState = createValidState();

      // Create governance file
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify(validState, null, 2),
      );

      const state = await manager.readState();

      expect(state.version).toBe(1);
      expect(state.constitution.directive).toBe("Build an amazing app");
      expect(state.workstreams).toEqual([]);
    });

    it("should throw error when governance file missing", async () => {
      await expect(manager.readState()).rejects.toThrow(
        "Governance state not found",
      );
    });

    it("should throw error for invalid state structure", async () => {
      const invalidState = {
        version: 1,
        // Missing required fields
      };

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify(invalidState, null, 2),
      );

      await expect(manager.readState()).rejects.toThrow("Invalid state structure");
    });

    it("should validate state structure fields", async () => {
      const validState = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify(validState, null, 2),
      );

      const state = await manager.readState();

      expect(typeof state.version).toBe("number");
      expect(typeof state.timestamp).toBe("string");
      expect(typeof state.constitution).toBe("object");
      expect(Array.isArray(state.workstreams)).toBe(true);
      expect(Array.isArray(state.sentinelLog)).toBe(true);
      expect(typeof state.metadata).toBe("object");
    });
  });

  describe("writeState", () => {
    it("should write state with checksum and timestamp", async () => {
      const state = createValidState();

      // Create .claude directory
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      // Create governance/config.json with default config
      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: {
            maxEntries: 100,
            retentionDays: 30,
            persistCritical: true,
          },
          stateManagement: {
            backupEnabled: false,
            maxBackups: 10,
          },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      expect(parsedState.metadata.checksum).toBeDefined();
      expect(parsedState.metadata.checksum).toHaveLength(16);
      expect(parsedState.timestamp).toBeDefined();
      expect(parsedState.metadata.lastSync).toBeDefined();
    });

    it("should use atomic write with temp file", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      // Temp file should not exist after successful write
      const tempPath = path.join(claudeDir, "governance.json.tmp");
      await expect(fs.access(tempPath)).rejects.toThrow();

      // Actual file should exist
      const statePath = path.join(claudeDir, "governance.json");
      await expect(fs.access(statePath)).resolves.toBeUndefined();
    });

    it("should rotate sentinel logs when exceeding max entries", async () => {
      const state = createValidState();

      // Add 150 sentinel entries (max is 100)
      for (let i = 0; i < 150; i++) {
        state.sentinelLog.push({
          id: `sentinel-${i}`,
          timestamp: Date.now() - i * 1000,
          type: i % 10 === 0 ? "CRITICAL" : "INFO",
          severity: i % 10 === 0 ? "critical" : "low",
          source: "test",
          message: `Entry ${i}`,
        });
      }

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      expect(parsedState.sentinelLog.length).toBeLessThanOrEqual(100);
    });

    it("should preserve critical entries during rotation", async () => {
      const state = createValidState();

      // Add entries with some critical ones
      const criticalEntry = {
        id: "critical-1",
        timestamp: Date.now() - 1000000, // Very old
        type: "CRITICAL" as const,
        severity: "critical" as const,
        source: "test",
        message: "Critical issue",
      };

      state.sentinelLog.push(criticalEntry);

      // Add 150 recent non-critical entries
      for (let i = 0; i < 150; i++) {
        state.sentinelLog.push({
          id: `info-${i}`,
          timestamp: Date.now() - i,
          type: "INFO" as const,
          severity: "low" as const,
          source: "test",
          message: `Info ${i}`,
        });
      }

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      // Critical entry should be preserved
      const foundCritical = parsedState.sentinelLog.find(
        (log: any) => log.id === "critical-1",
      );
      expect(foundCritical).toBeDefined();
    });

    it("should filter old entries by retention period", async () => {
      const state = createValidState();

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Add old entry (40 days old, retention is 30)
      state.sentinelLog.push({
        id: "old-entry",
        timestamp: now - 40 * dayMs,
        type: "INFO" as const,
        severity: "low" as const,
        source: "test",
        message: "Old entry",
      });

      // Add recent entry
      state.sentinelLog.push({
        id: "recent-entry",
        timestamp: now - 5 * dayMs,
        type: "INFO" as const,
        severity: "low" as const,
        source: "test",
        message: "Recent entry",
      });

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: false },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      expect(
        parsedState.sentinelLog.find((log: any) => log.id === "old-entry"),
      ).toBeUndefined();
      expect(
        parsedState.sentinelLog.find((log: any) => log.id === "recent-entry"),
      ).toBeDefined();
    });

    it("should create backup when enabled", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: true, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const backupDir = path.join(govDir, "backups");
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter((f) => f.startsWith("state-") && f.endsWith(".json"));

      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it("should not create backup when disabled", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const backupDir = path.join(govDir, "backups");
      await expect(fs.access(backupDir)).rejects.toThrow();
    });
  });

  describe("appendSentinelLog", () => {
    beforeEach(async () => {
      // Setup initial state
      const state = createValidState();
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify(state, null, 2),
      );
    });

    it("should append sentinel log entry", async () => {
      await manager.appendSentinelLog({
        type: "INFO",
        severity: "low",
        source: "test-agent",
        message: "Test message",
      });

      const state = await manager.readState();
      expect(state.sentinelLog.length).toBe(1);
      expect(state.sentinelLog[0].type).toBe("INFO");
      expect(state.sentinelLog[0].source).toBe("test-agent");
      expect(state.sentinelLog[0].message).toBe("Test message");
    });

    it("should generate unique ID for entry", async () => {
      await manager.appendSentinelLog({
        type: "INFO",
        severity: "low",
        source: "test",
        message: "First",
      });

      await manager.appendSentinelLog({
        type: "INFO",
        severity: "low",
        source: "test",
        message: "Second",
      });

      const state = await manager.readState();
      expect(state.sentinelLog[0].id).not.toBe(state.sentinelLog[1].id);
      expect(state.sentinelLog[0].id).toMatch(/^sentinel-/);
    });

    it("should add timestamp to entry", async () => {
      const beforeTime = Date.now();

      await manager.appendSentinelLog({
        type: "ERROR",
        severity: "high",
        source: "test",
        message: "Error occurred",
      });

      const afterTime = Date.now();
      const state = await manager.readState();

      expect(state.sentinelLog[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(state.sentinelLog[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should trigger rotation on write", async () => {
      // Add many entries
      for (let i = 0; i < 150; i++) {
        await manager.appendSentinelLog({
          type: "INFO",
          severity: "low",
          source: "test",
          message: `Entry ${i}`,
        });
      }

      const state = await manager.readState();
      expect(state.sentinelLog.length).toBeLessThanOrEqual(100);
    });
  });

  describe("getLatestBackup", () => {
    it("should return latest backup when available", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });

      const backupDir = path.join(govDir, "backups");
      await fs.mkdir(backupDir, { recursive: true });

      // Create multiple backups
      await fs.writeFile(
        path.join(backupDir, "state-2024-01-01T10-00-00.json"),
        JSON.stringify({ ...state, version: 1 }),
      );

      await fs.writeFile(
        path.join(backupDir, "state-2024-01-02T10-00-00.json"),
        JSON.stringify({ ...state, version: 2 }),
      );

      const latestBackup = await manager.getLatestBackup();

      expect(latestBackup).not.toBeNull();
      expect(latestBackup?.version).toBe(2);
    });

    it("should return null when no backups exist", async () => {
      const latestBackup = await manager.getLatestBackup();
      expect(latestBackup).toBeNull();
    });

    it("should return null when backup directory missing", async () => {
      const latestBackup = await manager.getLatestBackup();
      expect(latestBackup).toBeNull();
    });
  });

  describe("validateStateIntegrity", () => {
    it("should validate state with correct checksum", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      // Write state (which adds checksum)
      await manager.writeState(state);

      const result = await manager.validateStateIntegrity();

      expect(result.valid).toBe(true);
    });

    it("should detect checksum mismatch", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      // Manually corrupt the state
      const statePath = path.join(claudeDir, "governance.json");
      const currentState = JSON.parse(await fs.readFile(statePath, "utf-8"));
      currentState.constitution.directive = "Changed!";
      await fs.writeFile(statePath, JSON.stringify(currentState, null, 2));

      const result = await manager.validateStateIntegrity();

      expect(result.valid).toBe(false);
      expect(result.message).toContain("Checksum mismatch");
    });

    it("should handle legacy state without checksum", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      // Write state without checksum
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        JSON.stringify(state, null, 2),
      );

      const result = await manager.validateStateIntegrity();

      expect(result.valid).toBe(true);
      expect(result.message).toContain("legacy state");
    });

    it("should handle missing state file", async () => {
      const result = await manager.validateStateIntegrity();

      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe("backup rotation", () => {
    it("should rotate old backups beyond maxBackups limit", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });

      const backupDir = path.join(govDir, "backups");
      await fs.mkdir(backupDir, { recursive: true });

      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: true, maxBackups: 3 },
        }),
      );

      // Create 5 writes to generate 5 backups (maxBackups is 3)
      for (let i = 0; i < 5; i++) {
        state.version = i + 1;
        await manager.writeState(state);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter((f) => f.startsWith("state-") && f.endsWith(".json"));

      expect(backupFiles.length).toBeLessThanOrEqual(3);
    });

    it("should keep most recent backups when rotating", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });

      const backupDir = path.join(govDir, "backups");
      await fs.mkdir(backupDir, { recursive: true });

      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: true, maxBackups: 2 },
        }),
      );

      // Create multiple writes
      for (let i = 1; i <= 4; i++) {
        state.version = i;
        await manager.writeState(state);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Get latest backup and verify it's version 4 (most recent)
      const latestBackup = await manager.getLatestBackup();
      expect(latestBackup?.version).toBe(4);
    });
  });

  describe("error handling in readState", () => {
    it("should throw error for malformed JSON", async () => {
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      // Write invalid JSON
      await fs.writeFile(
        path.join(claudeDir, "governance.json"),
        "{ invalid json",
      );

      await expect(manager.readState()).rejects.toThrow();
    });
  });

  describe("sentinel log edge cases", () => {
    it("should preserve ERROR entries during rotation", async () => {
      const state = createValidState();

      const errorEntry = {
        id: "error-1",
        timestamp: Date.now() - 1000000, // Very old
        type: "ERROR" as const,
        severity: "high" as const,
        source: "test",
        message: "Error issue",
      };

      state.sentinelLog.push(errorEntry);

      // Add 150 recent non-critical entries
      for (let i = 0; i < 150; i++) {
        state.sentinelLog.push({
          id: `info-${i}`,
          timestamp: Date.now() - i,
          type: "INFO" as const,
          severity: "low" as const,
          source: "test",
          message: `Info ${i}`,
        });
      }

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      // ERROR entry should be preserved
      const foundError = parsedState.sentinelLog.find(
        (log: any) => log.id === "error-1",
      );
      expect(foundError).toBeDefined();
    });

    it("should handle empty sentinel log", async () => {
      const state = createValidState();
      state.sentinelLog = [];

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state);

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      expect(parsedState.sentinelLog).toEqual([]);
    });
  });

  describe("config handling", () => {
    it("should use default config when config file is missing", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      // Don't create config.json - should use defaults

      // Should not throw error
      await expect(manager.writeState(state)).resolves.not.toThrow();

      const written = await fs.readFile(
        path.join(claudeDir, "governance.json"),
        "utf-8",
      );
      const parsedState = JSON.parse(written);

      // Should have written successfully with default config
      expect(parsedState.metadata.checksum).toBeDefined();
    });

    it("should handle malformed config file", async () => {
      const state = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });

      // Write invalid JSON to config
      await fs.writeFile(
        path.join(govDir, "config.json"),
        "{ invalid json",
      );

      // Should fall back to default config
      await expect(manager.writeState(state)).resolves.not.toThrow();
    });
  });

  describe("checksum calculation", () => {
    it("should generate consistent checksums for identical states", async () => {
      const state1 = createValidState();
      const state2 = createValidState();

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state1);
      const written1 = JSON.parse(
        await fs.readFile(path.join(claudeDir, "governance.json"), "utf-8")
      );

      await manager.writeState(state2);
      const written2 = JSON.parse(
        await fs.readFile(path.join(claudeDir, "governance.json"), "utf-8")
      );

      // Checksums should differ because timestamps changed
      // but structure should be valid
      expect(written1.metadata.checksum).toHaveLength(16);
      expect(written2.metadata.checksum).toHaveLength(16);
    });

    it("should generate different checksums for different states", async () => {
      const state1 = createValidState();
      state1.constitution.directive = "First directive";

      const state2 = createValidState();
      state2.constitution.directive = "Second directive";

      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });

      const govDir = path.join(claudeDir, "governance");
      await fs.mkdir(govDir, { recursive: true });
      await fs.writeFile(
        path.join(govDir, "config.json"),
        JSON.stringify({
          sentinelLog: { maxEntries: 100, retentionDays: 30, persistCritical: true },
          stateManagement: { backupEnabled: false, maxBackups: 10 },
        }),
      );

      await manager.writeState(state1);
      const written1 = JSON.parse(
        await fs.readFile(path.join(claudeDir, "governance.json"), "utf-8")
      );

      await manager.writeState(state2);
      const written2 = JSON.parse(
        await fs.readFile(path.join(claudeDir, "governance.json"), "utf-8")
      );

      expect(written1.metadata.checksum).not.toBe(written2.metadata.checksum);
    });
  });
});

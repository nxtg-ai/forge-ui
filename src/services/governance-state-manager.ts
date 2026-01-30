/**
 * Governance State Manager
 * Handles state rotation, validation, and persistence
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type {
  GovernanceState,
  GovernanceConfig,
  SentinelEntry,
} from "../types/governance.types.js";

export class GovernanceStateManager {
  private projectRoot: string;
  private statePath: string;
  private configPath: string;
  private backupDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.statePath = path.join(projectRoot, ".claude/governance.json");
    this.configPath = path.join(projectRoot, ".claude/governance/config.json");
    this.backupDir = path.join(projectRoot, ".claude/governance/backups");
  }

  /**
   * Read governance state with validation
   */
  async readState(): Promise<GovernanceState> {
    try {
      const data = await fs.readFile(this.statePath, "utf-8");
      const state: GovernanceState = JSON.parse(data);

      // Validate state integrity
      if (this.isValidState(state)) {
        return state;
      } else {
        throw new Error("Invalid state structure");
      }
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw new Error("Governance state not found");
      }
      throw error;
    }
  }

  /**
   * Write governance state with rotation and backup
   */
  async writeState(state: GovernanceState): Promise<void> {
    // Load config to get rotation settings
    const config = await this.readConfig();

    // Rotate sentinel logs if needed
    const rotatedState = this.rotateSentinelLogs(state, config);

    // Add checksum for integrity
    rotatedState.metadata.checksum = this.calculateChecksum(rotatedState);

    // Update timestamp
    rotatedState.timestamp = new Date().toISOString();
    rotatedState.metadata.lastSync = rotatedState.timestamp;

    // Atomic write using temp file
    const tempPath = `${this.statePath}.tmp`;
    await fs.writeFile(
      tempPath,
      JSON.stringify(rotatedState, null, 2),
      "utf-8",
    );
    await fs.rename(tempPath, this.statePath);

    // Create backup if enabled
    if (config.stateManagement.backupEnabled) {
      await this.createBackup(rotatedState);
    }
  }

  /**
   * Rotate sentinel logs to prevent unbounded growth
   */
  private rotateSentinelLogs(
    state: GovernanceState,
    config: GovernanceConfig,
  ): GovernanceState {
    const maxEntries = config.sentinelLog.maxEntries;
    const retentionDays = config.sentinelLog.retentionDays;
    const persistCritical = config.sentinelLog.persistCritical;

    let logs = [...state.sentinelLog];

    // Filter by retention period
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    logs = logs.filter((log) => {
      const isRecent = log.timestamp > cutoffTime;
      const isCritical =
        persistCritical && (log.type === "CRITICAL" || log.type === "ERROR");
      return isRecent || isCritical;
    });

    // Limit to max entries (keep most recent)
    if (logs.length > maxEntries) {
      // Always keep critical entries
      const critical = logs.filter(
        (log) => log.type === "CRITICAL" || log.type === "ERROR",
      );
      const nonCritical = logs.filter(
        (log) => log.type !== "CRITICAL" && log.type !== "ERROR",
      );

      // Take most recent non-critical entries
      const recentNonCritical = nonCritical.slice(
        -(maxEntries - critical.length),
      );

      logs = [...critical, ...recentNonCritical].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
    }

    return {
      ...state,
      sentinelLog: logs,
    };
  }

  /**
   * Create timestamped backup of current state
   */
  private async createBackup(state: GovernanceState): Promise<void> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Create backup filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];
      const backupPath = path.join(this.backupDir, `state-${timestamp}.json`);

      // Write backup
      await fs.writeFile(backupPath, JSON.stringify(state, null, 2), "utf-8");

      // Rotate old backups
      await this.rotateBackups();
    } catch (error) {
      // Non-critical error, log but don't throw
      console.error("Failed to create backup:", error);
    }
  }

  /**
   * Remove old backups beyond retention limit
   */
  private async rotateBackups(): Promise<void> {
    try {
      const config = await this.readConfig();
      const maxBackups = config.stateManagement.maxBackups;

      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter((f) => f.startsWith("state-") && f.endsWith(".json"))
        .sort()
        .reverse(); // Most recent first

      // Delete old backups beyond max
      if (backupFiles.length > maxBackups) {
        const toDelete = backupFiles.slice(maxBackups);
        await Promise.all(
          toDelete.map((file) => fs.unlink(path.join(this.backupDir, file))),
        );
      }
    } catch (error) {
      console.error("Failed to rotate backups:", error);
    }
  }

  /**
   * Calculate checksum for state integrity validation
   */
  private calculateChecksum(state: GovernanceState): string {
    // Remove checksum field before calculating
    const { metadata, ...stateWithoutChecksum } = state;
    const { checksum, ...metadataWithoutChecksum } = metadata;

    const stateForHash = {
      ...stateWithoutChecksum,
      metadata: metadataWithoutChecksum,
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(stateForHash))
      .digest("hex")
      .substring(0, 16); // Use first 16 chars for brevity
  }

  /**
   * Validate state structure
   */
  private isValidState(state: any): state is GovernanceState {
    return (
      typeof state === "object" &&
      state !== null &&
      typeof state.version === "number" &&
      typeof state.timestamp === "string" &&
      typeof state.constitution === "object" &&
      Array.isArray(state.workstreams) &&
      Array.isArray(state.sentinelLog) &&
      typeof state.metadata === "object"
    );
  }

  /**
   * Read governance config
   */
  private async readConfig(): Promise<GovernanceConfig> {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      // Return default config if file doesn't exist
      const { DEFAULT_GOVERNANCE_CONFIG } =
        await import("../types/governance.types.js");
      return DEFAULT_GOVERNANCE_CONFIG;
    }
  }

  /**
   * Append sentinel log entry with automatic rotation
   */
  async appendSentinelLog(
    entry: Omit<SentinelEntry, "id" | "timestamp">,
  ): Promise<void> {
    const state = await this.readState();

    const newEntry: SentinelEntry = {
      id: `sentinel-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      ...entry,
    };

    state.sentinelLog.push(newEntry);

    await this.writeState(state);
  }

  /**
   * Get most recent backup if available
   */
  async getLatestBackup(): Promise<GovernanceState | null> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter((f) => f.startsWith("state-") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (backupFiles.length === 0) {
        return null;
      }

      const latestBackup = path.join(this.backupDir, backupFiles[0]);
      const data = await fs.readFile(latestBackup, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate state integrity using checksum
   */
  async validateStateIntegrity(): Promise<{
    valid: boolean;
    message?: string;
  }> {
    try {
      const state = await this.readState();

      if (!state.metadata.checksum) {
        return { valid: true, message: "No checksum available (legacy state)" };
      }

      const calculatedChecksum = this.calculateChecksum(state);

      if (calculatedChecksum === state.metadata.checksum) {
        return { valid: true };
      } else {
        return {
          valid: false,
          message: `Checksum mismatch: expected ${state.metadata.checksum}, got ${calculatedChecksum}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

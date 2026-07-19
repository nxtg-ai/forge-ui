/**
 * Governance State Manager
 * Handles state rotation, validation, and persistence
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getLogger } from "../utils/logger";

const logger = getLogger("governance-state-manager");
import type {
  GovernanceState,
  GovernanceConfig,
  SentinelEntry,
} from "../types/governance.types.js";

export class GovernanceStateManager {
  private projectRoot: string;
  /**
   * Versioned constitution — `.claude/governance.json`. Human-authored,
   * committed, and NOT rewritten by runtime activity.
   */
  private statePath: string;
  /**
   * Runtime state — `.forge/governance-runtime.json`. Grows on every server
   * start and hook fire (sentinelLog, timestamps, workstream progress), so it
   * lives on an untracked path. Keeping it inside the versioned file made the
   * git tree dirty on every run (DIRECTIVE-NXTG-20260718-04 item 3).
   */
  private runtimePath: string;
  private configPath: string;
  private backupDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.statePath = path.join(projectRoot, ".claude/governance.json");
    this.runtimePath = path.join(projectRoot, ".forge/governance-runtime.json");
    this.configPath = path.join(projectRoot, ".claude/governance/config.json");
    this.backupDir = path.join(projectRoot, ".claude/governance/backups");
  }

  /** Fields owned by the runtime file; everything else stays versioned. */
  private splitState(state: GovernanceState): {
    versioned: Pick<GovernanceState, "version" | "constitution">;
    runtime: Omit<GovernanceState, "version" | "constitution">;
  } {
    const { version, constitution, ...runtime } = state;
    return { versioned: { version, constitution }, runtime };
  }

  /**
   * Create a valid initial governance state with sensible defaults.
   * Used to seed governance.json when it's missing or empty.
   */
  createInitialState(): GovernanceState {
    const now = new Date().toISOString();
    return {
      version: 1,
      timestamp: now,
      constitution: {
        directive: "Build and ship NXTG-Forge — AI-powered development governance",
        vision: [
          "Multi-agent orchestration via MCP",
          "Real-time governance dashboard",
          "Quality gates that guide, not block",
        ],
        status: "EXECUTION",
        confidence: 75,
      },
      workstreams: [],
      sentinelLog: [],
      metadata: {
        sessionId: `session-${Date.now()}`,
        projectPath: this.projectRoot,
        forgeVersion: "3.0.0",
        lastSync: now,
      },
    };
  }

  /** Switch to a different project root (for multi-project support) */
  setProjectRoot(newRoot: string): void {
    this.projectRoot = newRoot;
    this.statePath = path.join(newRoot, ".claude/governance.json");
    this.runtimePath = path.join(newRoot, ".forge/governance-runtime.json");
    this.configPath = path.join(newRoot, ".claude/governance/config.json");
    this.backupDir = path.join(newRoot, ".claude/governance/backups");
  }

  /**
   * Read governance state with validation
   */
  async readState(): Promise<GovernanceState> {
    try {
      const data = await fs.readFile(this.statePath, "utf-8");

      // Treat empty file same as missing
      if (!data.trim()) {
        throw new Error("Governance state not found");
      }

      const versioned: GovernanceState = JSON.parse(data);

      // Overlay runtime state from the untracked file. When it is absent we
      // fall back to whatever the versioned file still carries, which
      // transparently migrates projects written under the old single-file
      // layout — their first write moves those fields across.
      const runtime = await this.readRuntimeState();
      const state: GovernanceState = { ...versioned, ...runtime };

      // Validate state integrity
      if (this.isValidState(state)) {
        return state;
      } else {
        throw new Error("Invalid state structure");
      }
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === "ENOENT" ||
        (error instanceof Error && error.message === "Governance state not found")
      ) {
        throw new Error("Governance state not found");
      }
      throw error;
    }
  }

  /**
   * True when the versioned half differs from what is on disk — including the
   * legacy case where the tracked file still carries runtime fields that this
   * write will strip (a one-time migration).
   */
  private async versionedStateChanged(
    versioned: Pick<GovernanceState, "version" | "constitution">,
  ): Promise<boolean> {
    try {
      const onDisk = await fs.readFile(this.statePath, "utf-8");
      // Compare CONTENT, not bytes. A raw string compare treats cosmetic
      // differences — a trailing newline from `jq`, a different key order —
      // as a change and rewrites the tracked file on every boot, which is the
      // exact tree-dirtying this split exists to stop.
      return (
        this.canonicalStringify(JSON.parse(onDisk)) !==
        this.canonicalStringify(versioned)
      );
    } catch {
      return true; // missing, empty, or unparseable — write it
    }
  }

  /**
   * Read the untracked runtime half. Returns an empty object when it does not
   * exist yet (fresh project, or one still on the legacy single-file layout)
   * so the caller can fall back to the versioned file's fields.
   */
  private async readRuntimeState(): Promise<
    Partial<Omit<GovernanceState, "version" | "constitution">>
  > {
    try {
      const data = await fs.readFile(this.runtimePath, "utf-8");
      if (!data.trim()) return {};
      return JSON.parse(data);
    } catch {
      // Missing or unparseable runtime state is not fatal — governance still
      // reads from the versioned constitution.
      return {};
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

    // Update timestamp
    rotatedState.timestamp = new Date().toISOString();
    rotatedState.metadata.lastSync = rotatedState.timestamp;

    // Add checksum for integrity (must be after all mutations)
    rotatedState.metadata.checksum = this.calculateChecksum(rotatedState);

    const { versioned, runtime } = this.splitState(rotatedState);

    // Runtime half → untracked path. Atomic write via temp file.
    await fs.mkdir(path.dirname(this.runtimePath), { recursive: true });
    const runtimeTemp = `${this.runtimePath}.tmp`;
    await fs.writeFile(runtimeTemp, JSON.stringify(runtime, null, 2), "utf-8");
    await fs.rename(runtimeTemp, this.runtimePath);

    // Versioned half → written ONLY when it actually changed. Runtime activity
    // must never dirty the git tree, so an unchanged constitution is left
    // byte-identical rather than rewritten with a new timestamp.
    if (await this.versionedStateChanged(versioned)) {
      const tempPath = `${this.statePath}.tmp`;
      // Trailing newline keeps the file POSIX-clean and stable against tools
      // (jq, editors) that add one.
      await fs.writeFile(
        tempPath,
        JSON.stringify(versioned, null, 2) + "\n",
        "utf-8",
      );
      await fs.rename(tempPath, this.statePath);
    }

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
      logger.error(`Failed to create backup: ${error}`);
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
      logger.error(`Failed to rotate backups: ${error}`);
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
      .update(this.canonicalStringify(stateForHash))
      .digest("hex")
      .substring(0, 16); // Use first 16 chars for brevity
  }

  /**
   * JSON.stringify with deterministic key ordering.
   *
   * Plain stringify is key-ORDER sensitive, so the same logical state hashed
   * to different checksums depending on how the object was assembled. That
   * surfaced when state began round-tripping through two files: the merged
   * `{...versioned, ...runtime}` object carries a different key order than the
   * one that was written, which failed integrity validation even though not a
   * single value had changed. Sorting keys makes the checksum a function of
   * CONTENT alone.
   */
  private canonicalStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.canonicalStringify(v)).join(",")}]`;
    }
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${this.canonicalStringify(
            (value as Record<string, unknown>)[k],
          )}`,
      );
    return `{${entries.join(",")}}`;
  }

  /**
   * Validate state structure
   */
  private isValidState(state: unknown): state is GovernanceState {
    return (
      typeof state === "object" &&
      state !== null &&
      typeof (state as GovernanceState).version === "number" &&
      typeof (state as GovernanceState).timestamp === "string" &&
      typeof (state as GovernanceState).constitution === "object" &&
      Array.isArray((state as GovernanceState).workstreams) &&
      Array.isArray((state as GovernanceState).sentinelLog) &&
      typeof (state as GovernanceState).metadata === "object"
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
    let state: GovernanceState;
    try {
      state = await this.readState();
    } catch {
      // State missing or corrupt — seed it first
      logger.info("Governance state not found during appendSentinelLog, seeding initial state");
      state = this.createInitialState();
    }

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

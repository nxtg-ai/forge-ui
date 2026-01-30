/**
 * Checkpoint Manager
 * Simple file-based task state persistence for recovery
 */

import { promises as fs } from "fs";
import * as path from "path";
import { Result, Ok, Err } from "../utils/result";
import { Logger } from "../utils/logger";
import { Task } from "../types/state";

const logger = new Logger("CheckpointManager");

/**
 * Task checkpoint for recovery
 */
export interface TaskCheckpoint {
  taskId: string;
  timestamp: Date;
  task: Task;
  executionState: {
    step: number;
    totalSteps: number;
    currentAction: string;
    artifacts: string[];
    errors: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Manages task checkpoints for recovery
 */
export class CheckpointManager {
  private checkpointDir: string;

  constructor(projectPath?: string) {
    const basePath = projectPath || process.cwd();
    this.checkpointDir = path.join(basePath, ".forge", "checkpoints");
  }

  /**
   * Initialize checkpoint directory
   */
  async initialize(): Promise<Result<void, string>> {
    try {
      await fs.mkdir(this.checkpointDir, { recursive: true });
      logger.info("Checkpoint manager initialized", {
        dir: this.checkpointDir,
      });
      return new Ok(undefined);
    } catch (error) {
      const message = `Failed to initialize checkpoint directory: ${error}`;
      logger.error(message, error);
      return new Err(message);
    }
  }

  /**
   * Save task checkpoint
   */
  async saveCheckpoint(
    taskId: string,
    checkpoint: TaskCheckpoint,
  ): Promise<Result<void, string>> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.checkpointDir, { recursive: true });

      const filePath = this.getCheckpointPath(taskId);
      const data = JSON.stringify(checkpoint, null, 2);

      await fs.writeFile(filePath, data, "utf-8");

      logger.debug("Checkpoint saved", { taskId, path: filePath });
      return new Ok(undefined);
    } catch (error) {
      const message = `Failed to save checkpoint for task ${taskId}: ${error}`;
      logger.error(message, error);
      return new Err(message);
    }
  }

  /**
   * Restore task checkpoint
   */
  async restoreFromCheckpoint(
    taskId: string,
  ): Promise<Result<TaskCheckpoint, string>> {
    try {
      const filePath = this.getCheckpointPath(taskId);

      const content = await fs.readFile(filePath, "utf-8");
      const checkpoint = JSON.parse(content) as TaskCheckpoint;

      // Parse dates
      checkpoint.timestamp = new Date(checkpoint.timestamp);
      if (checkpoint.task.createdAt) {
        checkpoint.task.createdAt = new Date(checkpoint.task.createdAt);
      }
      if (checkpoint.task.startedAt) {
        checkpoint.task.startedAt = new Date(checkpoint.task.startedAt);
      }
      if (checkpoint.task.completedAt) {
        checkpoint.task.completedAt = new Date(checkpoint.task.completedAt);
      }

      logger.info("Checkpoint restored", { taskId });
      return new Ok(checkpoint);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        const message = `No checkpoint found for task ${taskId}`;
        logger.debug(message);
        return new Err(message);
      }

      const message = `Failed to restore checkpoint for task ${taskId}: ${error}`;
      logger.error(message, error);
      return new Err(message);
    }
  }

  /**
   * List all available checkpoints
   */
  async listCheckpoints(): Promise<TaskCheckpoint[]> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpoints: TaskCheckpoint[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(this.checkpointDir, file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const checkpoint = JSON.parse(content) as TaskCheckpoint;

          // Parse timestamp
          checkpoint.timestamp = new Date(checkpoint.timestamp);

          checkpoints.push(checkpoint);
        } catch (error) {
          logger.warn(`Failed to read checkpoint file ${file}`, error);
        }
      }

      // Sort by timestamp descending
      checkpoints.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      logger.debug("Listed checkpoints", { count: checkpoints.length });
      return checkpoints;
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return [];
      }

      logger.error("Failed to list checkpoints", error);
      return [];
    }
  }

  /**
   * Clear checkpoint for a task
   */
  async clearCheckpoint(taskId: string): Promise<void> {
    try {
      const filePath = this.getCheckpointPath(taskId);
      await fs.unlink(filePath);
      logger.debug("Checkpoint cleared", { taskId });
    } catch (error) {
      if ((error as any).code !== "ENOENT") {
        logger.warn(`Failed to clear checkpoint for task ${taskId}`, error);
      }
    }
  }

  /**
   * Clear all checkpoints
   */
  async clearAllCheckpoints(): Promise<Result<number, string>> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      let cleared = 0;

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(this.checkpointDir, file);
        try {
          await fs.unlink(filePath);
          cleared++;
        } catch (error) {
          logger.warn(`Failed to delete checkpoint file ${file}`, error);
        }
      }

      logger.info(`Cleared ${cleared} checkpoints`);
      return new Ok(cleared);
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        return new Ok(0);
      }

      const message = `Failed to clear checkpoints: ${error}`;
      logger.error(message, error);
      return new Err(message);
    }
  }

  /**
   * Get checkpoint file path for a task
   */
  private getCheckpointPath(taskId: string): string {
    // Sanitize taskId for filename
    const sanitized = taskId.replace(/[^a-zA-Z0-9-_]/g, "_");
    return path.join(this.checkpointDir, `${sanitized}.json`);
  }

  /**
   * Check if checkpoint exists for task
   */
  async hasCheckpoint(taskId: string): Promise<boolean> {
    try {
      const filePath = this.getCheckpointPath(taskId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get checkpoint age in milliseconds
   */
  async getCheckpointAge(taskId: string): Promise<Result<number, string>> {
    const result = await this.restoreFromCheckpoint(taskId);

    if (result.isErr()) {
      return new Err(result.error);
    }

    const age = Date.now() - result.value.timestamp.getTime();
    return new Ok(age);
  }

  /**
   * Clean up old checkpoints
   */
  async cleanupOldCheckpoints(
    maxAgeMs: number,
  ): Promise<Result<number, string>> {
    try {
      const checkpoints = await this.listCheckpoints();
      let cleaned = 0;

      const now = Date.now();

      for (const checkpoint of checkpoints) {
        const age = now - checkpoint.timestamp.getTime();

        if (age > maxAgeMs) {
          await this.clearCheckpoint(checkpoint.taskId);
          cleaned++;
        }
      }

      logger.info(`Cleaned up ${cleaned} old checkpoints`);
      return new Ok(cleaned);
    } catch (error) {
      const message = `Failed to cleanup old checkpoints: ${error}`;
      logger.error(message, error);
      return new Err(message);
    }
  }
}

/**
 * Agent Worker - Individual worker process wrapper
 * Manages lifecycle and communication with a single worker
 */

import { ChildProcess, fork, spawn } from "child_process";
import { EventEmitter } from "events";
import * as path from "path";
import * as fs from "fs/promises";
import {
  WorkerStatus,
  WorkerInfo,
  WorkerMetrics,
  AgentTask,
  TaskResult,
  AgentContext,
  ResourceLimits,
  IPCMessage,
  HealthStatus,
  DEFAULT_RESOURCE_LIMITS,
  ENV_WHITELIST,
  BLOCKED_COMMANDS,
} from "./types";
import { getLogger } from "../../utils/logger";

const logger = getLogger('agent-worker');

export class AgentWorker extends EventEmitter {
  readonly id: string;
  private process: ChildProcess | null = null;
  private _status: WorkerStatus = "idle";
  private _currentTask: AgentTask | null = null;
  private _metrics: WorkerMetrics;
  private context: AgentContext;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private taskTimeout: NodeJS.Timeout | null = null;
  private startedAt: Date;
  private lastActivity: Date;
  private pendingResponses: Map<
    string,
    { resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  > = new Map();

  constructor(
    id: string,
    resourceLimits: ResourceLimits = DEFAULT_RESOURCE_LIMITS,
  ) {
    super();
    this.id = id;
    this.startedAt = new Date();
    this.lastActivity = new Date();

    this._metrics = {
      cpuPercent: 0,
      memoryMB: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      avgTaskDuration: 0,
      uptime: 0,
      lastHeartbeat: new Date(),
    };

    this.context = {
      workerId: id,
      workingDirectory: path.join(
        process.cwd(),
        ".claude",
        "agent-workers",
        id,
      ),
      environmentVariables: this.filterEnvironment(process.env),
      resourceLimits,
    };
  }

  get status(): WorkerStatus {
    return this._status;
  }

  get pid(): number {
    return this.process?.pid || 0;
  }

  get currentTask(): AgentTask | null {
    return this._currentTask;
  }

  get metrics(): WorkerMetrics {
    return {
      ...this._metrics,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  /**
   * Get worker info summary
   */
  getInfo(): WorkerInfo {
    return {
      id: this.id,
      pid: this.pid,
      status: this._status,
      currentTask: this._currentTask || undefined,
      metrics: this.metrics,
      startedAt: this.startedAt,
      lastActivity: this.lastActivity,
    };
  }

  /**
   * Spawn worker process
   */
  async spawn(): Promise<void> {
    if (this.process) {
      throw new Error(`Worker ${this.id} already spawned`);
    }

    this._status = "starting";
    this.emit("status", this._status);

    // Create working directory
    await fs.mkdir(this.context.workingDirectory, { recursive: true });

    // Fork worker process
    const workerScript = path.join(__dirname, "worker-process.js");

    // Check if compiled JS exists, otherwise use TS with tsx
    const scriptExists = await fs
      .access(workerScript)
      .then(() => true)
      .catch(() => false);

    if (scriptExists) {
      this.process = fork(workerScript, [], {
        cwd: this.context.workingDirectory,
        env: {
          ...this.context.environmentVariables,
          WORKER_ID: this.id,
          WORKER_DIR: this.context.workingDirectory,
        },
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      });
    } else {
      // Development mode - use tsx
      const tsScript = path.join(__dirname, "worker-process.ts");
      this.process = fork(tsScript, [], {
        cwd: this.context.workingDirectory,
        env: {
          ...this.context.environmentVariables,
          WORKER_ID: this.id,
          WORKER_DIR: this.context.workingDirectory,
        },
        execArgv: ["--import", "tsx"],
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      });
    }

    // Set up event handlers
    this.setupProcessHandlers();

    // Wait for ready signal
    await this.waitForReady();

    this._status = "idle";
    this.emit("status", this._status);
    this.startHeartbeat();
  }

  /**
   * Terminate worker process
   */
  async terminate(): Promise<void> {
    this._status = "stopping";
    this.emit("status", this._status);

    this.stopHeartbeat();
    this.clearTaskTimeout();

    if (this.process) {
      // Send graceful shutdown signal
      this.sendMessage({
        type: "control",
        id: "shutdown",
        timestamp: Date.now(),
        payload: "shutdown",
      });

      // Wait for graceful exit or force kill
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 5000);

        this.process?.once("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }

    this._status = "idle";
  }

  /**
   * Restart worker process
   */
  async restart(): Promise<void> {
    await this.terminate();
    await this.spawn();
  }

  /**
   * Execute task
   */
  async execute(task: AgentTask): Promise<TaskResult> {
    if (this._status !== "idle") {
      throw new Error(
        `Worker ${this.id} is not idle (status: ${this._status})`,
      );
    }

    // Validate command
    if (this.isBlockedCommand(task.command)) {
      return {
        taskId: task.id,
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "Command blocked by security policy",
        duration: 0,
        error: "BLOCKED_COMMAND",
      };
    }

    this._currentTask = task;
    this._status = "busy";
    this.lastActivity = new Date();
    this.emit("status", this._status);
    this.emit("task.started", task);

    const startTime = Date.now();

    try {
      // Set task timeout
      const timeout = task.timeout || this.context.resourceLimits.timeoutMs;
      this.setTaskTimeout(task.id, timeout);

      // Send task to worker
      const result = await this.sendTaskAndWait(task);

      this.clearTaskTimeout();

      const duration = Date.now() - startTime;

      // Update metrics
      if (result.success) {
        this._metrics.tasksCompleted++;
        this._metrics.avgTaskDuration =
          (this._metrics.avgTaskDuration * (this._metrics.tasksCompleted - 1) +
            duration) /
          this._metrics.tasksCompleted;
      } else {
        this._metrics.tasksFailed++;
      }

      this._currentTask = null;
      this._status = "idle";
      this.emit("status", this._status);
      this.emit("task.completed", { taskId: task.id, result });

      return { ...result, duration };
    } catch (error) {
      this.clearTaskTimeout();
      this._metrics.tasksFailed++;

      const duration = Date.now() - startTime;
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        duration,
        error: "EXECUTION_ERROR",
      };

      this._currentTask = null;
      this._status = "error";
      this.emit("status", this._status);
      this.emit("task.failed", { taskId: task.id, error: result.error });

      return result;
    }
  }

  /**
   * Abort current task
   */
  async abort(): Promise<void> {
    if (!this._currentTask) return;

    this.sendMessage({
      type: "control",
      id: `abort-${this._currentTask.id}`,
      timestamp: Date.now(),
      payload: { action: "abort", taskId: this._currentTask.id },
    });

    // Cancel any pending response
    const pending = this.pendingResponses.get(this._currentTask.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Task aborted"));
      this.pendingResponses.delete(this._currentTask.id);
    }

    this._currentTask = null;
    this._status = "idle";
    this.emit("status", this._status);
  }

  /**
   * Check worker health
   */
  async checkHealth(): Promise<HealthStatus> {
    const issues: string[] = [];

    if (!this.process || this.process.exitCode !== null) {
      issues.push("Process not running");
    }

    const timeSinceHeartbeat =
      Date.now() - this._metrics.lastHeartbeat.getTime();
    if (timeSinceHeartbeat > 60000) {
      issues.push(`No heartbeat for ${Math.round(timeSinceHeartbeat / 1000)}s`);
    }

    if (this._metrics.memoryMB > this.context.resourceLimits.memoryMB) {
      issues.push(
        `Memory usage ${this._metrics.memoryMB}MB exceeds limit ${this.context.resourceLimits.memoryMB}MB`,
      );
    }

    return {
      healthy: issues.length === 0,
      lastCheck: new Date(),
      issues,
      metrics: {
        cpuPercent: this._metrics.cpuPercent,
        memoryMB: this._metrics.memoryMB,
        responseTimeMs: timeSinceHeartbeat,
      },
    };
  }

  // Private methods

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.on("message", (msg: IPCMessage) => {
      this.handleMessage(msg);
    });

    this.process.on("exit", (code, signal) => {
      logger.info(`Worker ${this.id} exited: code=${code}, signal=${signal}`);
      this._status = "crashed";
      this.emit("status", this._status);
      this.emit("crashed", { code, signal });
    });

    this.process.on("error", (error) => {
      logger.error(`Worker ${this.id} error:`, error);
      this._status = "error";
      this.emit("status", this._status);
      this.emit("error", error);
    });

    // Capture stdout/stderr
    this.process.stdout?.on("data", (data) => {
      this.emit("stdout", data.toString());
    });

    this.process.stderr?.on("data", (data) => {
      this.emit("stderr", data.toString());
    });
  }

  private handleMessage(msg: IPCMessage): void {
    this.lastActivity = new Date();

    switch (msg.type) {
      case "ready":
        this.emit("ready");
        break;

      case "heartbeat":
        this._metrics.lastHeartbeat = new Date();
        if (typeof msg.payload === "object" && msg.payload !== null) {
          const payload = msg.payload as { cpu?: number; memory?: number };
          this._metrics.cpuPercent = payload.cpu || 0;
          this._metrics.memoryMB = payload.memory || 0;
        }
        break;

      case "result":
        const pending = this.pendingResponses.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(msg.payload);
          this.pendingResponses.delete(msg.id);
        }
        break;

      case "log":
        this.emit("log", msg.payload);
        break;

      case "error":
        this.emit("workerError", msg.payload);
        break;
    }
  }

  private sendMessage(msg: IPCMessage): void {
    if (this.process && this.process.connected) {
      this.process.send(msg);
    }
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${this.id} failed to start within timeout`));
      }, this.context.resourceLimits.timeoutMs);

      this.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async sendTaskAndWait(task: AgentTask): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(task.id);
        reject(new Error("Task execution timeout"));
      }, task.timeout || this.context.resourceLimits.timeoutMs);

      this.pendingResponses.set(task.id, { resolve, reject, timeout });

      this.sendMessage({
        type: "task",
        id: task.id,
        timestamp: Date.now(),
        payload: task,
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({
        type: "heartbeat",
        id: `hb-${Date.now()}`,
        timestamp: Date.now(),
        payload: null,
      });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setTaskTimeout(taskId: string, timeout: number): void {
    this.taskTimeout = setTimeout(() => {
      this.emit("task.timeout", taskId);
      this.abort();
    }, timeout);
  }

  private clearTaskTimeout(): void {
    if (this.taskTimeout) {
      clearTimeout(this.taskTimeout);
      this.taskTimeout = null;
    }
  }

  private filterEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) continue;

      const allowed = ENV_WHITELIST.some((pattern) => {
        if (typeof pattern === "string") {
          return key === pattern;
        }
        return pattern.test(key);
      });

      if (allowed) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  private isBlockedCommand(command: string): boolean {
    return BLOCKED_COMMANDS.some((pattern) => pattern.test(command));
  }
}

export default AgentWorker;

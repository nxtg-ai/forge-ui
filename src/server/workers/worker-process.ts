/**
 * Worker Process - Entry point for forked worker processes
 * Executes tasks in isolation and communicates via IPC
 */

import { spawn, ChildProcess } from "child_process";
import * as os from "os";
import { IPCMessage, AgentTask, TaskResult } from "./types";

const WORKER_ID = process.env.WORKER_ID || "unknown";
const WORKER_DIR = process.env.WORKER_DIR || process.cwd();

let currentTask: AgentTask | null = null;
let currentProcess: ChildProcess | null = null;
let aborted = false;

/**
 * Send message to parent
 */
function send(msg: IPCMessage): void {
  if (process.send) {
    process.send(msg);
  }
}

/**
 * Log to parent
 */
function log(level: string, message: string): void {
  send({
    type: "log",
    id: `log-${Date.now()}`,
    timestamp: Date.now(),
    payload: { level, message, workerId: WORKER_ID },
  });
}

/**
 * Get process metrics
 */
function getMetrics(): { cpu: number; memory: number } {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
    memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
  };
}

/**
 * Execute a shell command
 */
async function executeShellCommand(task: AgentTask): Promise<TaskResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";

    const args = task.args || [];
    const env = { ...process.env, ...task.env };
    const cwd = task.cwd || WORKER_DIR;

    // Spawn the command
    const child = spawn(task.command, args, {
      cwd,
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    currentProcess = child;

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      log("debug", `[stdout] ${data.toString().trim()}`);
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      log("debug", `[stderr] ${data.toString().trim()}`);
    });

    child.on("close", (code) => {
      currentProcess = null;
      const duration = Date.now() - startTime;

      resolve({
        taskId: task.id,
        success: code === 0 && !aborted,
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration,
        error: aborted ? "ABORTED" : code !== 0 ? "NON_ZERO_EXIT" : undefined,
      });
    });

    child.on("error", (error) => {
      currentProcess = null;
      const duration = Date.now() - startTime;

      resolve({
        taskId: task.id,
        success: false,
        exitCode: 1,
        stdout: stdout.trim(),
        stderr: error.message,
        duration,
        error: "SPAWN_ERROR",
      });
    });
  });
}

/**
 * Execute a Claude Code command
 */
async function executeClaudeCode(task: AgentTask): Promise<TaskResult> {
  // Claude Code tasks are shell commands that invoke the claude CLI
  const claudeTask: AgentTask = {
    ...task,
    command: "claude",
    args: [task.command, ...(task.args || [])],
  };

  return executeShellCommand(claudeTask);
}

/**
 * Execute task based on type
 */
async function executeTask(task: AgentTask): Promise<TaskResult> {
  log("info", `Executing task ${task.id}: ${task.type} - ${task.command}`);
  aborted = false;

  try {
    switch (task.type) {
      case "shell":
      case "script":
        return await executeShellCommand(task);

      case "claude-code":
      case "agent":
        return await executeClaudeCode(task);

      default:
        return {
          taskId: task.id,
          success: false,
          exitCode: 1,
          stdout: "",
          stderr: `Unknown task type: ${task.type}`,
          duration: 0,
          error: "INVALID_TASK_TYPE",
        };
    }
  } catch (error) {
    return {
      taskId: task.id,
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      duration: 0,
      error: "EXECUTION_ERROR",
    };
  }
}

/**
 * Handle abort request
 */
function handleAbort(taskId: string): void {
  if (currentTask?.id === taskId) {
    aborted = true;
    if (currentProcess) {
      currentProcess.kill("SIGTERM");
      setTimeout(() => {
        if (currentProcess) {
          currentProcess.kill("SIGKILL");
        }
      }, 5000);
    }
  }
}

/**
 * Handle incoming messages from parent
 */
process.on("message", async (msg: IPCMessage) => {
  switch (msg.type) {
    case "task":
      currentTask = msg.payload as AgentTask;
      const result = await executeTask(currentTask);
      currentTask = null;

      send({
        type: "result",
        id: msg.id,
        timestamp: Date.now(),
        payload: result,
      });
      break;

    case "heartbeat":
      send({
        type: "heartbeat",
        id: msg.id,
        timestamp: Date.now(),
        payload: getMetrics(),
      });
      break;

    case "control":
      const payload = msg.payload as
        | { action?: string; taskId?: string }
        | string;
      if (payload === "shutdown") {
        log("info", "Received shutdown signal");
        process.exit(0);
      } else if (
        typeof payload === "object" &&
        payload.action === "abort" &&
        payload.taskId
      ) {
        handleAbort(payload.taskId);
      }
      break;
  }
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  send({
    type: "error",
    id: `error-${Date.now()}`,
    timestamp: Date.now(),
    payload: { error: error.message, stack: error.stack },
  });
});

process.on("unhandledRejection", (reason) => {
  send({
    type: "error",
    id: `error-${Date.now()}`,
    timestamp: Date.now(),
    payload: { error: String(reason) },
  });
});

// Signal ready
log("info", `Worker ${WORKER_ID} started`);
send({
  type: "ready",
  id: "ready",
  timestamp: Date.now(),
  payload: { workerId: WORKER_ID, pid: process.pid },
});

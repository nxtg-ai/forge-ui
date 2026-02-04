/**
 * Command Service
 * Execute /[FRG]-* commands and stream results
 */

import { z } from "zod";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { BaseService, ServiceConfig } from "./base-service";
import { Result, IntegrationError } from "../utils/result";

const execAsync = promisify(exec);

/**
 * Command execution options
 */
export interface CommandOptions {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  stream?: boolean;
}

/**
 * Command execution result
 */
export interface CommandResult {
  commandId: string;
  command: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  output: string[];
  error?: string;
  exitCode?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Command stream event
 */
export interface CommandStreamEvent {
  commandId: string;
  type: "stdout" | "stderr" | "exit" | "error";
  data: string | number;
  timestamp: Date;
}

/**
 * Available Forge commands
 */
export enum ForgeCommand {
  INIT = "[FRG]-init",
  STATUS = "[FRG]-status",
  FEATURE = "[FRG]-feature",
  TEST = "[FRG]-test",
  DEPLOY = "[FRG]-deploy",
  OPTIMIZE = "[FRG]-optimize",
  REPORT = "[FRG]-report",
  ENABLE_FORGE = "[FRG]-enable-forge",
  STATUS_ENHANCED = "[FRG]-status-enhanced",
}

/**
 * Command metadata
 */
export interface CommandMetadata {
  name: string;
  description: string;
  category: "forge" | "git" | "test" | "deploy" | "analyze";
  requiresConfirmation?: boolean;
  dangerLevel?: "safe" | "moderate" | "dangerous";
}

/**
 * Command Service configuration
 */
export interface CommandServiceConfig extends ServiceConfig {
  maxConcurrentCommands?: number;
  commandTimeout?: number;
  outputBufferSize?: number;
}

/**
 * Command execution and management service
 */
export class CommandService extends BaseService {
  private activeCommands = new Map<string, ChildProcess>();
  private commandResults = new Map<string, CommandResult>();
  private commandMetadata = new Map<string, CommandMetadata>();
  private outputBuffers = new Map<string, string[]>();

  constructor(config: CommandServiceConfig = { name: "CommandService" }) {
    super({
      ...config,
      timeout: config.commandTimeout ?? 60000,
    });

    this.config = {
      maxConcurrentCommands: 5,
      outputBufferSize: 1000,
      ...config,
    };

    this.initializeCommandMetadata();
  }

  /**
   * Initialize command metadata
   */
  private initializeCommandMetadata(): void {
    const commands: Array<[string, CommandMetadata]> = [
      [
        ForgeCommand.INIT,
        {
          name: ForgeCommand.INIT,
          description: "Initialize NXTG-Forge in your project",
          category: "forge",
          dangerLevel: "safe",
        },
      ],
      [
        ForgeCommand.STATUS,
        {
          name: ForgeCommand.STATUS,
          description: "Display project status and Forge configuration",
          category: "forge",
          dangerLevel: "safe",
        },
      ],
      [
        ForgeCommand.FEATURE,
        {
          name: ForgeCommand.FEATURE,
          description: "Implement a new feature with full orchestration",
          category: "forge",
          dangerLevel: "moderate",
        },
      ],
      [
        ForgeCommand.TEST,
        {
          name: ForgeCommand.TEST,
          description: "Run tests with comprehensive reporting",
          category: "test",
          dangerLevel: "safe",
        },
      ],
      [
        ForgeCommand.DEPLOY,
        {
          name: ForgeCommand.DEPLOY,
          description: "Deploy application with automated checks",
          category: "deploy",
          requiresConfirmation: true,
          dangerLevel: "dangerous",
        },
      ],
      [
        ForgeCommand.OPTIMIZE,
        {
          name: ForgeCommand.OPTIMIZE,
          description: "Optimize code performance and structure",
          category: "analyze",
          dangerLevel: "moderate",
        },
      ],
      [
        ForgeCommand.REPORT,
        {
          name: ForgeCommand.REPORT,
          description: "Display comprehensive session activity report",
          category: "analyze",
          dangerLevel: "safe",
        },
      ],
      [
        ForgeCommand.ENABLE_FORGE,
        {
          name: ForgeCommand.ENABLE_FORGE,
          description: "Activate forge command center with orchestrator",
          category: "forge",
          dangerLevel: "safe",
        },
      ],
      [
        ForgeCommand.STATUS_ENHANCED,
        {
          name: ForgeCommand.STATUS_ENHANCED,
          description: "Enhanced status display with real-time dashboard",
          category: "forge",
          dangerLevel: "safe",
        },
      ],
    ];

    commands.forEach(([name, metadata]) => {
      this.commandMetadata.set(name, metadata);
    });
  }

  /**
   * Perform service initialization
   */
  protected async performInitialization(): Promise<void> {
    // Check for required commands availability
    const checkResult = await this.checkCommandAvailability();
    if (checkResult.isErr()) {
      throw checkResult.error;
    }
  }

  /**
   * Perform service cleanup
   */
  protected async performDisposal(): Promise<void> {
    // Cancel all active commands
    for (const [commandId, process] of this.activeCommands) {
      process.kill("SIGTERM");
      const result = this.commandResults.get(commandId);
      if (result) {
        result.status = "cancelled";
        result.endTime = new Date();
      }
    }

    this.activeCommands.clear();
    this.commandResults.clear();
    this.outputBuffers.clear();
  }

  /**
   * Execute a command
   */
  async execute(
    command: string,
    options?: CommandOptions,
  ): Promise<Result<CommandResult, IntegrationError>> {
    // Generate unique command ID
    const commandId = this.generateCommandId();

    // Validate command
    const validationResult = this.validateCommand(command);
    if (validationResult.isErr()) {
      return Result.err(validationResult.error);
    }

    // Check concurrent command limit
    const config = this.config as CommandServiceConfig;
    if (this.activeCommands.size >= (config.maxConcurrentCommands ?? 5)) {
      return Result.err(
        new IntegrationError(
          "Maximum concurrent commands reached",
          "COMMAND_LIMIT_EXCEEDED",
        ),
      );
    }

    // Initialize command result
    const result: CommandResult = {
      commandId,
      command,
      status: "pending",
      output: [],
      startTime: new Date(),
    };

    this.commandResults.set(commandId, result);
    this.outputBuffers.set(commandId, []);

    try {
      if (options?.stream) {
        return await this.executeStreaming(commandId, command, options);
      } else {
        return await this.executeBlocking(commandId, command, options);
      }
    } catch (error) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      return Result.err(
        new IntegrationError(
          `Command execution failed: ${result.error}`,
          "COMMAND_ERROR",
          { commandId, command },
        ),
      );
    }
  }

  /**
   * Execute command with blocking (wait for completion)
   */
  private async executeBlocking(
    commandId: string,
    command: string,
    options?: CommandOptions,
  ): Promise<Result<CommandResult, IntegrationError>> {
    const result = this.commandResults.get(commandId)!;
    result.status = "running";

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, ...options?.env },
        cwd: options?.cwd,
        timeout: options?.timeout ?? this.config.timeout,
      });

      // Update result
      result.status = "completed";
      result.output = stdout.split("\n").filter((line) => line.length > 0);
      if (stderr) {
        result.output.push(
          ...stderr.split("\n").filter((line) => line.length > 0),
        );
      }
      result.exitCode = 0;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      this.emit("commandComplete", result);
      return Result.ok(result);
    } catch (error: unknown) {
      result.status = "failed";
      result.error = error instanceof Error ? error.message : String(error);
      result.exitCode = (error as NodeJS.ErrnoException).code ?
        parseInt((error as NodeJS.ErrnoException).code ?? "-1", 10) : -1;

      const execError = error as { stdout?: string; stderr?: string };
      result.output =
        execError.stdout?.split("\n").filter((line: string) => line.length > 0) ??
        [];
      if (execError.stderr) {
        result.output.push(
          ...execError.stderr.split("\n").filter((line: string) => line.length > 0),
        );
      }
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      this.emit("commandFailed", result);
      return Result.ok(result); // Return result even on failure for error details
    }
  }

  /**
   * Execute command with streaming output
   */
  private async executeStreaming(
    commandId: string,
    command: string,
    options?: CommandOptions,
  ): Promise<Result<CommandResult, IntegrationError>> {
    return new Promise((resolve) => {
      const result = this.commandResults.get(commandId)!;
      result.status = "running";

      // Parse command and args
      const [cmd, ...args] = command.split(" ");
      const allArgs = [...args, ...(options?.args ?? [])];

      // Spawn child process
      const childProcess = spawn(cmd, allArgs, {
        env: { ...process.env, ...options?.env },
        cwd: options?.cwd,
        shell: true,
      });

      this.activeCommands.set(commandId, childProcess);

      // Set timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          childProcess.kill("SIGTERM");
          result.status = "failed";
          result.error = "Command timed out";
          result.endTime = new Date();
          result.duration =
            result.endTime.getTime() - result.startTime.getTime();

          this.activeCommands.delete(commandId);
          this.emit("commandTimeout", result);
          resolve(Result.ok(result));
        }, options.timeout);
      }

      // Handle stdout
      childProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        const lines = output.split("\n").filter((line) => line.length > 0);

        lines.forEach((line) => {
          this.addOutput(commandId, line);
          this.emit("commandStream", {
            commandId,
            type: "stdout",
            data: line,
            timestamp: new Date(),
          } as CommandStreamEvent);
        });
      });

      // Handle stderr
      childProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        const lines = output.split("\n").filter((line) => line.length > 0);

        lines.forEach((line) => {
          this.addOutput(commandId, line);
          this.emit("commandStream", {
            commandId,
            type: "stderr",
            data: line,
            timestamp: new Date(),
          } as CommandStreamEvent);
        });
      });

      // Handle process exit
      childProcess.on("exit", (code: number | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        result.status = code === 0 ? "completed" : "failed";
        result.exitCode = code ?? -1;
        result.output = this.outputBuffers.get(commandId) ?? [];
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();

        this.activeCommands.delete(commandId);
        this.emit("commandStream", {
          commandId,
          type: "exit",
          data: code ?? -1,
          timestamp: new Date(),
        } as CommandStreamEvent);

        if (result.status === "completed") {
          this.emit("commandComplete", result);
        } else {
          this.emit("commandFailed", result);
        }

        resolve(Result.ok(result));
      });

      // Handle process error
      childProcess.on("error", (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        result.status = "failed";
        result.error = error.message;
        result.output = this.outputBuffers.get(commandId) ?? [];
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();

        this.activeCommands.delete(commandId);
        this.emit("commandStream", {
          commandId,
          type: "error",
          data: error.message,
          timestamp: new Date(),
        } as CommandStreamEvent);
        this.emit("commandFailed", result);

        resolve(Result.ok(result));
      });
    });
  }

  /**
   * Cancel a running command
   */
  async cancel(commandId: string): Promise<Result<void, IntegrationError>> {
    const process = this.activeCommands.get(commandId);
    if (!process) {
      return Result.err(
        new IntegrationError(
          "Command not found or not running",
          "COMMAND_NOT_FOUND",
        ),
      );
    }

    try {
      process.kill("SIGTERM");
      this.activeCommands.delete(commandId);

      const result = this.commandResults.get(commandId);
      if (result) {
        result.status = "cancelled";
        result.endTime = new Date();
        result.duration = result.endTime.getTime() - result.startTime.getTime();
        this.emit("commandCancelled", result);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          `Failed to cancel command: ${error instanceof Error ? error.message : String(error)}`,
          "CANCEL_ERROR",
        ),
      );
    }
  }

  /**
   * Get command result
   */
  getResult(commandId: string): Result<CommandResult, IntegrationError> {
    const result = this.commandResults.get(commandId);
    if (!result) {
      return Result.err(
        new IntegrationError("Command result not found", "RESULT_NOT_FOUND"),
      );
    }
    return Result.ok(result);
  }

  /**
   * Get all command results
   */
  getAllResults(): CommandResult[] {
    return Array.from(this.commandResults.values());
  }

  /**
   * Get active commands
   */
  getActiveCommands(): CommandResult[] {
    return Array.from(this.commandResults.values()).filter(
      (result) => result.status === "running",
    );
  }

  /**
   * Get command metadata
   */
  getCommandMetadata(command: string): CommandMetadata | undefined {
    return this.commandMetadata.get(command);
  }

  /**
   * Get all available commands
   */
  getAvailableCommands(): CommandMetadata[] {
    return Array.from(this.commandMetadata.values());
  }

  /**
   * Stream command output
   */
  streamOutput(
    commandId: string,
    callback: (event: CommandStreamEvent) => void,
  ): () => void {
    const handler = (event: CommandStreamEvent) => {
      if (event.commandId === commandId) {
        callback(event);
      }
    };

    this.on("commandStream", handler);
    return () => this.off("commandStream", handler);
  }

  /**
   * Add output to buffer
   */
  private addOutput(commandId: string, line: string): void {
    const buffer = this.outputBuffers.get(commandId);
    if (!buffer) return;

    const config = this.config as CommandServiceConfig;
    buffer.push(line);

    // Trim buffer if too large
    if (buffer.length > (config.outputBufferSize ?? 1000)) {
      buffer.shift();
    }
  }

  /**
   * Validate command
   */
  private validateCommand(command: string): Result<void, IntegrationError> {
    if (!command || command.trim().length === 0) {
      return Result.err(
        new IntegrationError("Command cannot be empty", "INVALID_COMMAND"),
      );
    }

    // Check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /format\s+/,
      /del\s+\/s\s+\/q/,
      />\/dev\/sda/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return Result.err(
          new IntegrationError(
            "Dangerous command detected",
            "DANGEROUS_COMMAND",
          ),
        );
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Check command availability
   */
  private async checkCommandAvailability(): Promise<
    Result<void, IntegrationError>
  > {
    // Check if forge commands are available
    try {
      // This would check actual command availability
      // For now, assume commands are available
      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        new IntegrationError(
          "Failed to check command availability",
          "AVAILABILITY_CHECK_ERROR",
        ),
      );
    }
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

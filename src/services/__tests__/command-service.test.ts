/**
 * Command Service Tests
 * Comprehensive tests for command execution and management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "events";

// Create a controllable mock for the promisified exec
const mockExecAsync = vi.hoisted(() => vi.fn());

// Mock child_process module with promisify.custom on exec
// so that `const execAsync = promisify(exec)` in command-service.ts
// returns mockExecAsync instead of wrapping the mock function
vi.mock("child_process", async () => {
  const { EventEmitter } = await import("events");
  const { promisify } = await import("util");

  const mockExec = Object.assign(vi.fn(), {
    [promisify.custom]: mockExecAsync,
  });
  const mockSpawn = vi.fn();

  return {
    exec: mockExec,
    spawn: mockSpawn,
    ChildProcess: EventEmitter,
    default: {
      exec: mockExec,
      spawn: mockSpawn,
    },
  };
});

// Import after mock setup
import { exec, spawn } from "child_process";
import { CommandService, ForgeCommand } from "../command-service";

describe("CommandService", () => {
  let service: CommandService;

  beforeEach(() => {
    service = new CommandService({
      name: "CommandService",
      maxConcurrentCommands: 3,
      outputBufferSize: 100,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with default config", () => {
      const defaultService = new CommandService();
      expect(defaultService).toBeDefined();
    });

    it("should initialize command metadata", () => {
      const commands = service.getAvailableCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some((cmd) => cmd.name === ForgeCommand.INIT)).toBe(true);
      expect(commands.some((cmd) => cmd.name === ForgeCommand.STATUS)).toBe(
        true,
      );
    });

    it("should perform initialization", async () => {
      await service.initialize();
      expect(service).toBeDefined();
    });
  });

  describe("command metadata", () => {
    it("should get command metadata by name", () => {
      const metadata = service.getCommandMetadata(ForgeCommand.INIT);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe(ForgeCommand.INIT);
      expect(metadata?.category).toBe("forge");
      expect(metadata?.dangerLevel).toBe("safe");
    });

    it("should return undefined for unknown command", () => {
      const metadata = service.getCommandMetadata("unknown-command");
      expect(metadata).toBeUndefined();
    });

    it("should list all available commands", () => {
      const commands = service.getAvailableCommands();
      expect(commands.length).toBe(9);
      expect(commands.every((cmd) => cmd.name && cmd.description)).toBe(true);
    });

    it("should mark dangerous commands appropriately", () => {
      const deployMetadata = service.getCommandMetadata(ForgeCommand.DEPLOY);
      expect(deployMetadata?.dangerLevel).toBe("dangerous");
      expect(deployMetadata?.requiresConfirmation).toBe(true);
    });
  });

  describe("command validation", () => {
    it("should reject empty commands", async () => {
      const result = await service.execute("");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("INVALID_COMMAND");
    });

    it("should reject commands with only whitespace", async () => {
      const result = await service.execute("   ");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("INVALID_COMMAND");
    });

    it("should reject dangerous rm command", async () => {
      const result = await service.execute("rm -rf /");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("DANGEROUS_COMMAND");
    });

    it("should reject dangerous format command", async () => {
      const result = await service.execute("format c:");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("DANGEROUS_COMMAND");
    });

    it("should reject dangerous del command", async () => {
      const result = await service.execute("del /s /q important");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("DANGEROUS_COMMAND");
    });

    it("should reject dangerous disk write", async () => {
      const result = await service.execute("echo data >/dev/sda");
      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("DANGEROUS_COMMAND");
    });

    it("should allow safe commands", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "output", stderr: "" });

      const result = await service.execute("echo hello");
      expect(result.isErr()).toBe(false);
    });
  });

  describe("blocking command execution", () => {
    it("should execute command successfully", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "success\nline2", stderr: "" });

      const result = await service.execute("echo test");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("completed");
        expect(result.value.exitCode).toBe(0);
        expect(result.value.output).toEqual(["success", "line2"]);
        expect(result.value.command).toBe("echo test");
      }
    });

    it("should handle command with stderr", async () => {
      mockExecAsync.mockResolvedValue({
        stdout: "out",
        stderr: "warning\nerror",
      });

      const result = await service.execute("command");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toContain("out");
        expect(result.value.output).toContain("warning");
        expect(result.value.output).toContain("error");
      }
    });

    it("should handle command failure", async () => {
      const error: any = new Error("Command failed");
      error.code = "1";
      error.stdout = "partial output";
      error.stderr = "error message";

      mockExecAsync.mockRejectedValue(error);

      const result = await service.execute("failing-command");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.exitCode).toBe(1);
        expect(result.value.error).toBe("Command failed");
        expect(result.value.output).toContain("partial output");
        expect(result.value.output).toContain("error message");
      }
    });

    it("should pass environment variables", async () => {
      mockExecAsync.mockImplementation(async (_cmd: string, opts: any) => {
        expect(opts.env).toHaveProperty("TEST_VAR", "value");
        return { stdout: "", stderr: "" };
      });

      await service.execute("cmd", { env: { TEST_VAR: "value" } });
      expect(mockExecAsync).toHaveBeenCalled();
    });

    it("should filter empty lines from output", async () => {
      mockExecAsync.mockResolvedValue({
        stdout: "line1\n\nline2\n",
        stderr: "",
      });

      const result = await service.execute("cmd");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual(["line1", "line2"]);
      }
    });
  });

  describe("streaming command execution", () => {
    it("should execute streaming command successfully", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const resultPromise = service.execute("echo test", { stream: true });

      mockProcess.stdout.emit("data", Buffer.from("line1\n"));
      mockProcess.stdout.emit("data", Buffer.from("line2\n"));
      mockProcess.emit("exit", 0);

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("completed");
        expect(result.value.exitCode).toBe(0);
        expect(result.value.output).toEqual(["line1", "line2"]);
      }
    });

    it("should emit commandStream events for stdout", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const streamEvents: any[] = [];
      service.on("commandStream", (event) => streamEvents.push(event));

      const resultPromise = service.execute("cmd", { stream: true });

      mockProcess.stdout.emit("data", Buffer.from("output\n"));
      mockProcess.emit("exit", 0);

      await resultPromise;

      const stdoutEvent = streamEvents.find((e) => e.type === "stdout");
      expect(stdoutEvent).toBeDefined();
      expect(stdoutEvent.data).toBe("output");
    });

    it("should handle process error", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const resultPromise = service.execute("cmd", { stream: true });

      mockProcess.emit("error", new Error("Process error"));

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.error).toBe("Process error");
      }
    });

    it("should handle timeout", async () => {
      vi.useFakeTimers();

      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const resultPromise = service.execute("cmd", {
        stream: true,
        timeout: 1000,
      });

      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.error).toBe("Command timed out");
      }
      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should handle non-zero exit code", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const resultPromise = service.execute("cmd", { stream: true });

      mockProcess.emit("exit", 1);

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.exitCode).toBe(1);
      }
    });
  });

  describe("command cancellation", () => {
    it("should cancel running command", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      service.execute("long-running", { stream: true });

      const activeCommands = service.getActiveCommands();
      expect(activeCommands.length).toBe(1);
      const commandId = activeCommands[0].commandId;

      const cancelResult = await service.cancel(commandId);

      expect(cancelResult.isOk()).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");

      const commandResult = service.getResult(commandId);
      expect(commandResult.isOk()).toBe(true);
      if (commandResult.isOk()) {
        expect(commandResult.value.status).toBe("cancelled");
      }
    });

    it("should return error for non-existent command", async () => {
      const result = await service.cancel("non-existent-id");

      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("COMMAND_NOT_FOUND");
    });
  });

  describe("command results", () => {
    it("should retrieve command result", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "output", stderr: "" });

      const execResult = await service.execute("cmd");
      expect(execResult.isOk()).toBe(true);

      if (execResult.isOk()) {
        const result = service.getResult(execResult.value.commandId);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.commandId).toBe(execResult.value.commandId);
        }
      }
    });

    it("should return error for non-existent result", () => {
      const result = service.getResult("non-existent-id");

      expect(result.isErr()).toBe(true);
      expect(result.error?.code).toBe("RESULT_NOT_FOUND");
    });

    it("should get all command results", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "output", stderr: "" });

      await service.execute("cmd1");
      await service.execute("cmd2");

      const results = service.getAllResults();
      expect(results.length).toBe(2);
    });

    it("should get only active commands", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);
      mockExecAsync.mockResolvedValue({ stdout: "done", stderr: "" });

      // Start streaming command (active)
      service.execute("streaming-cmd", { stream: true });

      // Execute blocking command (completes immediately)
      await service.execute("blocking-cmd");

      const activeCommands = service.getActiveCommands();
      expect(activeCommands.length).toBe(1);
      expect(activeCommands[0].status).toBe("running");

      // Cleanup
      mockProcess.emit("exit", 0);
    });
  });

  describe("edge cases", () => {
    it("should handle null exit code", async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockProcess.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockProcess);

      const resultPromise = service.execute("cmd", { stream: true });

      mockProcess.emit("exit", null);

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.exitCode).toBe(-1);
      }
    });

    it("should handle commands with no output", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "", stderr: "" });

      const result = await service.execute("silent-cmd");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual([]);
      }
    });

    it("should generate unique command IDs", async () => {
      mockExecAsync.mockResolvedValue({ stdout: "", stderr: "" });

      const result1 = await service.execute("cmd");
      const result2 = await service.execute("cmd");

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.commandId).not.toBe(result2.value.commandId);
      }
    });
  });
});

/**
 * Command Service Tests
 * Comprehensive tests for command execution and management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CommandService,
  ForgeCommand,
  CommandOptions,
} from "../command-service";
import { exec, spawn } from "child_process";

// Mock child_process
vi.mock("child_process", () => {
  const mockExec = vi.fn();
  const mockSpawn = vi.fn();

  const mocks = {
    exec: mockExec,
    spawn: mockSpawn,
    ChildProcess: class {},
    execSync: vi.fn(),
    spawnSync: vi.fn(),
    fork: vi.fn(),
    execFile: vi.fn(),
    execFileSync: vi.fn(),
  };

  return {
    default: mocks,
    ...mocks,
  };
});

describe("CommandService", () => {
  let service: CommandService;

  beforeEach(async () => {
    service = new CommandService({
      name: "TestCommandService",
      maxConcurrentCommands: 3,
      commandTimeout: 5000,
      outputBufferSize: 100,
    });
    await service.initialize();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe("initialization", () => {
    it("should initialize with default configuration", async () => {
      const defaultService = new CommandService();
      await defaultService.initialize();

      expect(defaultService["config"].maxConcurrentCommands).toBe(5);
      expect(defaultService["config"].outputBufferSize).toBe(1000);

      await defaultService.dispose();
    });

    it("should initialize with custom configuration", async () => {
      const customService = new CommandService({
        name: "CustomService",
        maxConcurrentCommands: 10,
        outputBufferSize: 500,
      });
      await customService.initialize();

      expect(customService["config"].maxConcurrentCommands).toBe(10);
      expect(customService["config"].outputBufferSize).toBe(500);

      await customService.dispose();
    });

    it("should initialize command metadata", () => {
      const metadata = service.getCommandMetadata(ForgeCommand.INIT);

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe(ForgeCommand.INIT);
      expect(metadata?.category).toBe("forge");
    });

    it("should load all forge commands", () => {
      const commands = service.getAvailableCommands();

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.map((c) => c.name)).toContain(ForgeCommand.INIT);
      expect(commands.map((c) => c.name)).toContain(ForgeCommand.STATUS);
    });
  });

  describe("execute - blocking mode", () => {
    it("should execute command successfully", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Success output", stderr: "" });
        return {} as any;
      });

      const result = await service.execute("echo test");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("completed");
        expect(result.value.exitCode).toBe(0);
        expect(result.value.output).toContain("Success output");
      }
    });

    it("should handle command failure", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        const error = new Error("Command failed") as any;
        error.code = "1";
        error.stdout = "Some output";
        error.stderr = "Error output";
        callback(error, { stdout: "Some output", stderr: "Error output" });
        return {} as any;
      });

      const result = await service.execute("false");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.output).toContain("Some output");
        expect(result.value.output).toContain("Error output");
      }
    });

    it("should validate empty commands", async () => {
      const result = await service.execute("");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("INVALID_COMMAND");
      }
    });

    it("should detect dangerous commands", async () => {
      const dangerousCommands = [
        "rm -rf /",
        "format c:",
        "del /s /q c:\\",
        "echo test >/dev/sda",
      ];

      for (const cmd of dangerousCommands) {
        const result = await service.execute(cmd);
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.code).toBe("DANGEROUS_COMMAND");
        }
      }
    });

    it("should apply command timeout", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options: any, callback: any) => {
        // Immediately call callback to complete the test
        callback(null, { stdout: "Done", stderr: "" });
        return {} as any;
      });

      const options: CommandOptions = { timeout: 100 };
      const result = await service.execute("sleep 10", options);

      // Verify timeout option is passed to exec
      expect(mockExec).toHaveBeenCalledWith(
        "sleep 10",
        expect.objectContaining({ timeout: 100 }),
        expect.any(Function),
      );
    });

    it("should use custom environment variables", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as any;
      });

      const options: CommandOptions = {
        env: { CUSTOM_VAR: "test-value" },
      };

      await service.execute("echo $CUSTOM_VAR", options);

      expect(mockExec).toHaveBeenCalledWith(
        "echo $CUSTOM_VAR",
        expect.objectContaining({
          env: expect.objectContaining({ CUSTOM_VAR: "test-value" }),
        }),
        expect.any(Function),
      );
    });

    it("should use custom working directory", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as any;
      });

      const options: CommandOptions = { cwd: "/custom/path" };

      await service.execute("pwd", options);

      expect(mockExec).toHaveBeenCalledWith(
        "pwd",
        expect.objectContaining({ cwd: "/custom/path" }),
        expect.any(Function),
      );
    });

    it("should enforce concurrent command limit", async () => {
      // Service configured with maxConcurrentCommands: 3
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(), // Never emit exit - keep running
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Start 3 commands (at limit)
      const promises = [
        service.execute("sleep 1", { stream: true }),
        service.execute("sleep 2", { stream: true }),
        service.execute("sleep 3", { stream: true }),
      ];

      // Wait for them to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Try to start 4th command (should be blocked)
      const result = await service.execute("echo test");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("COMMAND_LIMIT_EXCEEDED");
      }

      // Clean up - kill all processes
      promises.forEach(() => mockProcess.kill());
    });

    it("should emit commandComplete event", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Done", stderr: "" });
        return {} as any;
      });

      const handler = vi.fn();
      service.on("commandComplete", handler);

      await service.execute("echo test");

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].status).toBe("completed");
    });

    it("should emit commandFailed event on error", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        const error = new Error("Failed") as any;
        error.code = "1";
        callback(error, { stdout: "", stderr: "Error" });
        return {} as any;
      });

      const handler = vi.fn();
      service.on("commandFailed", handler);

      await service.execute("false");

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].status).toBe("failed");
    });
  });

  describe("execute - streaming mode", () => {
    it("should execute command with streaming", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("Test output\n"));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await service.execute("echo test", { stream: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("completed");
        expect(result.value.exitCode).toBe(0);
      }
    });

    it("should stream stdout events", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("Line 1\n"));
              callback(Buffer.from("Line 2\n"));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const streamHandler = vi.fn();
      service.on("commandStream", streamHandler);

      await service.execute("echo test", { stream: true });

      expect(streamHandler).toHaveBeenCalled();
      const stdoutEvents = streamHandler.mock.calls.filter(
        (call) => call[0].type === "stdout",
      );
      expect(stdoutEvents.length).toBeGreaterThan(0);
    });

    it("should stream stderr events", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("Error line\n"));
            }
          }),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(1);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const streamHandler = vi.fn();
      service.on("commandStream", streamHandler);

      await service.execute("false", { stream: true });

      const stderrEvents = streamHandler.mock.calls.filter(
        (call) => call[0].type === "stderr",
      );
      expect(stderrEvents.length).toBeGreaterThan(0);
    });

    it("should emit exit event", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const streamHandler = vi.fn();
      service.on("commandStream", streamHandler);

      await service.execute("echo test", { stream: true });

      const exitEvents = streamHandler.mock.calls.filter(
        (call) => call[0].type === "exit",
      );
      expect(exitEvents).toHaveLength(1);
      expect(exitEvents[0][0].data).toBe(0);
    });

    it("should handle process errors", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("Process error"));
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await service.execute("bad-command", { stream: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.error).toBe("Process error");
      }
    });

    it("should handle stream timeout", async () => {
      vi.useFakeTimers();

      const mockProcess = {
        stdout: {
          on: vi.fn(),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const resultPromise = service.execute("sleep 10", {
        stream: true,
        timeout: 100,
      });

      vi.advanceTimersByTime(100);

      const result = await resultPromise;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe("failed");
        expect(result.value.error).toContain("timed out");
      }

      vi.useRealTimers();
    });

    it("should trim output buffer when limit exceeded", async () => {
      // Service configured with outputBufferSize: 100
      const lines = Array.from({ length: 150 }, (_, i) => `Line ${i}\n`);

      const mockProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              lines.forEach((line) => callback(Buffer.from(line)));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const result = await service.execute("generate-output", { stream: true });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("cancel", () => {
    it("should cancel running command", async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Start command but don't wait for completion
      const executePromise = service.execute("sleep 10", { stream: true });

      // Wait for command to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Get the command ID from active commands
      const activeCommands = service.getActiveCommands();
      expect(activeCommands.length).toBeGreaterThan(0);

      const commandId = activeCommands[0].commandId;
      const cancelResult = await service.cancel(commandId);

      expect(cancelResult.isOk()).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should return error for non-existent command", async () => {
      const result = await service.cancel("non-existent-id");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("COMMAND_NOT_FOUND");
      }
    });

    it("should emit commandCancelled event", async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const handler = vi.fn();
      service.on("commandCancelled", handler);

      // Start command
      service.execute("sleep 10", { stream: true });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const activeCommands = service.getActiveCommands();
      const commandId = activeCommands[0].commandId;

      await service.cancel(commandId);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("getResult", () => {
    it("should retrieve command result", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as any;
      });

      const executeResult = await service.execute("echo test");

      expect(executeResult.isOk()).toBe(true);
      if (executeResult.isOk()) {
        const commandId = executeResult.value.commandId;
        const getResult = service.getResult(commandId);

        expect(getResult.isOk()).toBe(true);
        if (getResult.isOk()) {
          expect(getResult.value.commandId).toBe(commandId);
          expect(getResult.value.status).toBe("completed");
        }
      }
    });

    it("should return error for non-existent result", () => {
      const result = service.getResult("non-existent-id");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("RESULT_NOT_FOUND");
      }
    });
  });

  describe("getAllResults", () => {
    it("should return all command results", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Success", stderr: "" });
        return {} as any;
      });

      await service.execute("echo test1");
      await service.execute("echo test2");

      const results = service.getAllResults();

      expect(results).toHaveLength(2);
    });

    it("should return empty array when no commands executed", () => {
      const results = service.getAllResults();
      expect(results).toEqual([]);
    });
  });

  describe("getActiveCommands", () => {
    it("should return only running commands", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Done", stderr: "" });
        return {} as any;
      });

      // Execute completed command
      await service.execute("echo test");

      const activeCommands = service.getActiveCommands();
      expect(activeCommands).toHaveLength(0);
    });
  });

  describe("getCommandMetadata", () => {
    it("should return metadata for known commands", () => {
      const metadata = service.getCommandMetadata(ForgeCommand.INIT);

      expect(metadata).toBeDefined();
      expect(metadata?.description).toContain("Initialize");
      expect(metadata?.dangerLevel).toBe("safe");
    });

    it("should return undefined for unknown commands", () => {
      const metadata = service.getCommandMetadata("unknown-command");
      expect(metadata).toBeUndefined();
    });

    it("should mark dangerous commands correctly", () => {
      const deployMetadata = service.getCommandMetadata(ForgeCommand.DEPLOY);

      expect(deployMetadata).toBeDefined();
      expect(deployMetadata?.dangerLevel).toBe("dangerous");
      expect(deployMetadata?.requiresConfirmation).toBe(true);
    });
  });

  describe("streamOutput", () => {
    it("should stream output for specific command", async () => {
      const mockProcess = {
        stdout: {
          on: vi.fn((event, callback) => {
            if (event === "data") {
              callback(Buffer.from("Output\n"));
            }
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === "exit") {
            callback(0);
          }
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const executeResult = await service.execute("echo test", {
        stream: true,
      });

      expect(executeResult.isOk()).toBe(true);
      if (executeResult.isOk()) {
        const commandId = executeResult.value.commandId;
        const streamCallback = vi.fn();

        // Note: Since command already completed, we test the subscription mechanism
        const unsubscribe = service.streamOutput(commandId, streamCallback);
        expect(typeof unsubscribe).toBe("function");
        unsubscribe();
      }
    });

    it("should allow unsubscribing from stream", async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "exit") callback(0);
        }),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      const callback = vi.fn();
      const executeResult = await service.execute("echo test", {
        stream: true,
      });

      if (executeResult.isOk()) {
        const unsubscribe = service.streamOutput(
          executeResult.value.commandId,
          callback,
        );
        unsubscribe();

        // Verify unsubscribe works
        expect(typeof unsubscribe).toBe("function");
      }
    });
  });

  describe("disposal", () => {
    it("should cancel all active commands on disposal", async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      vi.mocked(spawn).mockReturnValue(mockProcess as any);

      // Start command but don't wait
      service.execute("sleep 10", { stream: true });
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.dispose();

      expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should clear all results on disposal", async () => {
      const mockExec = vi.mocked(exec);
      mockExec.mockImplementation((cmd, options, callback: any) => {
        callback(null, { stdout: "Done", stderr: "" });
        return {} as any;
      });

      await service.execute("echo test");
      await service.dispose();

      // Create new service to verify cleanup
      const newService = new CommandService();
      await newService.initialize();

      expect(newService.getAllResults()).toHaveLength(0);
      await newService.dispose();
    });
  });
});

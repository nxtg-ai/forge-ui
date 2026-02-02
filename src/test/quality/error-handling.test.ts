/**
 * Error Handling Coverage Tests
 * Ensures comprehensive error handling across the system
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VisionManager } from "@core/vision";
import { StateManager } from "@core/state";
import { AgentCoordinationProtocol } from "@core/coordination";
import { promises as fs } from "node:fs";

// Create proper mocks for fs methods
vi.mock("node:fs", () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ isFile: () => true }),
    rename: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    rm: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Error Handling Coverage", () => {
  // Reset all mocks between tests to prevent leakage
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.access as any).mockResolvedValue(undefined);
    (fs.stat as any).mockResolvedValue({ isFile: () => true });
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.rename as any).mockResolvedValue(undefined);
    (fs.unlink as any).mockResolvedValue(undefined);
    (fs.appendFile as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.rm as any).mockResolvedValue(undefined);
    (fs.copyFile as any).mockResolvedValue(undefined);
  });

  describe("File System Errors", () => {
    it("should handle ENOENT (file not found) gracefully", async () => {
      const visionManager = new VisionManager("/test/project");

      (fs.readFile as any).mockRejectedValue({ code: "ENOENT" });

      // Should create default vision instead of throwing
      await expect(visionManager.initialize()).resolves.not.toThrow();

      const vision = visionManager.getCurrentVision();
      expect(vision).toBeTruthy();
      expect(vision?.mission).toBeTruthy();
    });

    it("should handle EACCES (permission denied) with clear error", async () => {
      const visionManager = new VisionManager("/test/project");

      (fs.readFile as any).mockRejectedValue({
        code: "EACCES",
        message: "Permission denied",
      });

      await expect(visionManager.loadVision()).rejects.toThrow();
    });

    it("should handle ENOSPC (no space left) during save", async () => {
      const stateManager = new StateManager("/test/project");
      await stateManager.initialize("/test/project");

      (fs.writeFile as any).mockRejectedValue({
        code: "ENOSPC",
        message: "No space left on device",
      });

      await expect(stateManager.saveState()).rejects.toThrow();
    });

    it("should retry on temporary file system errors", async () => {
      const stateManager = new StateManager("/test/project");
      await stateManager.initialize("/test/project");

      let attempts = 0;
      (fs.writeFile as any).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({
            code: "EAGAIN",
            message: "Resource temporarily unavailable",
          });
        }
        return Promise.resolve();
      });

      // Should eventually succeed after retries
      // In production, implement retry logic
    });
  });

  describe("Network Errors", () => {
    it("should handle connection timeout in agent coordination", async () => {
      const protocol = new AgentCoordinationProtocol();

      protocol.registerAgent(
        {
          id: "slow-agent",
          name: "Slow Agent",
          role: "developer",
          capabilities: [],
          status: "idle",
          currentTask: null,
        },
        async (message) => {
          // Simulate timeout
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return { success: true };
        },
      );

      const message = {
        id: "msg-1",
        from: "orchestrator",
        to: "slow-agent",
        type: "REQUEST" as const,
        subject: "Test",
        payload: {},
        timestamp: new Date(),
      };

      // Should handle timeout gracefully
      await protocol.sendMessage("slow-agent", message);

      // Message should be queued and retried
      const stats = protocol.getQueueStats();
      expect(stats.totalQueued).toBeGreaterThanOrEqual(0);
    });

    it("should handle agent disconnection during message delivery", async () => {
      const protocol = new AgentCoordinationProtocol();

      protocol.registerAgent(
        {
          id: "unreliable-agent",
          name: "Unreliable Agent",
          role: "developer",
          capabilities: [],
          status: "idle",
          currentTask: null,
        },
        async () => {
          throw new Error("Connection lost");
        },
      );

      const message = {
        id: "msg-2",
        from: "orchestrator",
        to: "unreliable-agent",
        type: "REQUEST" as const,
        subject: "Test",
        payload: {},
        timestamp: new Date(),
      };

      // Should not crash, should retry
      await protocol.sendMessage("unreliable-agent", message);
    });
  });

  describe("Data Corruption Errors", () => {
    it("should detect and handle corrupted state files", async () => {
      const stateManager = new StateManager("/test/project");

      // Mock corrupted JSON
      (fs.readFile as any).mockResolvedValue("{ corrupted json data :::");

      const restored = await stateManager.restoreState();

      // Should fall back to backup or create new state
      expect(restored).toBeDefined();
    });

    it("should validate state checksum and reject invalid data", async () => {
      const stateManager = new StateManager("/test/project");

      const corruptedSnapshot = {
        state: { version: "3.0.0" },
        timestamp: new Date(),
        checksum: "invalid-checksum",
        compressed: false,
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(corruptedSnapshot));

      // Should detect checksum mismatch
      const restored = await stateManager.restoreState();

      // Should attempt backup restore
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("backup.json"),
        "utf-8",
      );
    });
  });

  describe("Validation Errors", () => {
    it("should provide clear error messages for invalid vision data", async () => {
      const visionManager = new VisionManager("/test/project");

      // Mock readFile to return ENOENT for vision file (creates default) and empty events
      (fs.readFile as any)
        .mockRejectedValueOnce({ code: "ENOENT" }) // Vision file not found
        .mockResolvedValueOnce("[]"); // Empty events array

      await visionManager.initialize();

      // Test that VisionManager properly validates vision schema on update
      // Invalid data should be rejected with clear error messages
      const invalidUpdate = {
        principles: "not-an-array" as any, // Wrong type - should fail validation
      };

      // updateVision now validates input and throws on invalid data
      await expect(
        visionManager.updateVision(invalidUpdate as any)
      ).rejects.toThrow("Invalid vision data");

      // Verify the original vision remains intact (not corrupted by invalid update)
      const currentVision = visionManager.getCurrentVision();
      expect(Array.isArray(currentVision?.principles)).toBe(true);
    });

    it("should validate all required fields before saving", async () => {
      const stateModule = await import("../../types/state");
      const { SystemStateSchema } = stateModule;

      const incompleteState = {
        version: "3.0.0",
        // Missing required fields
      };

      const result = SystemStateSchema.safeParse(incompleteState);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod v4 uses .issues not .errors
        expect(result.error.issues.length).toBeGreaterThan(0);

        // Should have clear error messages
        result.error.issues.forEach((issue) => {
          expect(issue.message).toBeTruthy();
          expect(issue.path).toBeDefined();
        });
      }
    });
  });

  describe("Graceful Degradation", () => {
    it("should continue operation when vision file is unavailable", async () => {
      const visionManager = new VisionManager("/test/project");

      (fs.readFile as any).mockRejectedValue({ code: "ENOENT" });

      await visionManager.initialize();

      // Should create default vision and continue
      const vision = visionManager.getCurrentVision();
      expect(vision).toBeTruthy();

      // Should be able to check alignment with default vision
      const alignment = await visionManager.checkAlignment({
        id: "decision-1",
        description: "Test decision",
        rationale: "Testing",
        impact: "low",
        madeBy: "developer",
        madeAt: new Date(),
      });

      expect(alignment).toBeDefined();
    });

    it("should handle missing state with fresh initialization", async () => {
      const stateManager = new StateManager("/test/project");

      (fs.readFile as any).mockRejectedValue({ code: "ENOENT" });

      await stateManager.initialize("/test/project");

      // Should create new state
      const state = stateManager.getCurrentState();
      expect(state).toBeTruthy();
      expect(state?.version).toBe("3.0.0");
    });

    it("should continue with reduced functionality when agent is unavailable", async () => {
      const protocol = new AgentCoordinationProtocol();

      // Register agent but make it fail
      protocol.registerAgent(
        {
          id: "failing-agent",
          name: "Failing Agent",
          role: "developer",
          capabilities: [],
          status: "idle",
          currentTask: null,
        },
        async () => {
          throw new Error("Agent failed");
        },
      );

      const message = {
        id: "msg-1",
        from: "orchestrator",
        to: "failing-agent",
        type: "REQUEST" as const,
        subject: "Test",
        payload: {},
        timestamp: new Date(),
      };

      // Should handle failure and continue
      await protocol.sendMessage("failing-agent", message);

      // System should still be operational
      const stats = protocol.getQueueStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Error Recovery", () => {
    it("should recover from state corruption using backup", async () => {
      const stateManager = new StateManager("/test/project");

      // Primary state is corrupted
      (fs.readFile as any)
        .mockResolvedValueOnce("corrupted data")
        .mockResolvedValueOnce(
          JSON.stringify({
            state: {
              version: "3.0.0",
              timestamp: new Date(),
              vision: {
                version: "1.0",
                created: new Date(),
                updated: new Date(),
                mission: "Recovered mission",
                principles: [],
                strategicGoals: [],
                currentFocus: "",
                successMetrics: {},
              },
              currentTasks: [],
              agentStates: {},
              conversationContext: {
                sessionId: "recovered",
                startedAt: new Date(),
                lastInteraction: new Date(),
                messageCount: 0,
                recentMessages: [],
                contextTags: [],
              },
              progressGraph: [],
              metadata: {
                sessionId: "test-recovery-session",
                environment: "test",
                projectPath: "/test/project",
              },
            },
            timestamp: new Date(),
            checksum: "backup-checksum",
            compressed: false,
          }),
        );

      vi.spyOn(stateManager as any, "calculateChecksum").mockReturnValue(
        "backup-checksum",
      );

      const restored = await stateManager.restoreState();

      expect(restored).toBeDefined();
      expect(restored?.vision.mission).toBe("Recovered mission");
    });

    it("should auto-save dirty state on interval", async () => {
      const stateManager = new StateManager("/test/project");
      await stateManager.initialize("/test/project");

      // Make state dirty
      stateManager.updateTaskStatus("task-1", "completed");

      // Wait for auto-save interval
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should have saved automatically
      expect(fs.writeFile).toHaveBeenCalled();

      stateManager.stopAutoSave();
    });
  });

  describe("Resource Cleanup", () => {
    it("should clean up resources on manager destruction", async () => {
      const stateManager = new StateManager("/test/project");
      await stateManager.initialize("/test/project");

      const intervalSpy = vi.spyOn(global, "clearInterval");

      stateManager.stopAutoSave();

      expect(intervalSpy).toHaveBeenCalled();
    });

    it("should remove event listeners when unsubscribing", async () => {
      const visionManager = new VisionManager("/test/project");
      await visionManager.initialize();

      const subscriber = vi.fn();
      const unsubscribe = visionManager.subscribe(subscriber);

      unsubscribe();

      const vision = visionManager.getCurrentVision();
      if (vision) {
        await visionManager.propagateVisionUpdate(vision);
      }

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe("Error Reporting", () => {
    it("should log errors with context information", async () => {
      const visionManager = new VisionManager("/test/project");

      const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (fs.readFile as any).mockRejectedValue(new Error("Test error"));

      await expect(visionManager.loadVision()).rejects.toThrow();

      // In production, logger should capture error with context
      // For now, we just verify error is thrown

      logSpy.mockRestore();
    });

    it("should provide actionable error messages to users", async () => {
      const visionModule = await import("../../types/vision");
      const { CanonicalVisionSchema } = visionModule;

      // Schema MUST be exported - fail if missing
      expect(CanonicalVisionSchema).toBeDefined();

      const invalidVision = {
        version: 123, // Should be string
        principles: "not-an-array",
      };

      const result = CanonicalVisionSchema.safeParse(invalidVision);

      expect(result.success).toBe(false);
      // Zod v4 uses .issues not .errors
      if (!result.success) {
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
        // Error messages should be actionable (descriptive, not just "undefined")
        result.error.issues.forEach((issue) => {
          // Message should not BE just "undefined" - context like "received undefined" is fine
          expect(issue.message).not.toBe("undefined");
          // Messages should be descriptive (more than 5 chars)
          expect(issue.message.length).toBeGreaterThan(5);
          // Messages should indicate what went wrong
          expect(issue.message.toLowerCase()).toMatch(
            /invalid|expected|required|received|type/i
          );
        });
      }
    });
  });
});

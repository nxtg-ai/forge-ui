/**
 * Forge Orchestrator Tests
 *
 * Tests the thin facade that API routes and WebSocket handler call.
 * The execution engine was removed as dead code (Claude Agent Teams replaced it).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetaOrchestrator, ForgeOrchestrator } from "../orchestrator";

describe("ForgeOrchestrator", () => {
  let orchestrator: MetaOrchestrator;

  beforeEach(() => {
    orchestrator = new MetaOrchestrator();
  });

  describe("Initialization", () => {
    it("should initialize without error", async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });

    it("should accept constructor args for backward compat", () => {
      const o = new MetaOrchestrator({}, {});
      expect(o.isHealthy()).toBe(true);
    });

    it("should export ForgeOrchestrator as alias", () => {
      expect(ForgeOrchestrator).toBe(MetaOrchestrator);
      const o = new ForgeOrchestrator();
      expect(o).toBeInstanceOf(MetaOrchestrator);
    });
  });

  describe("Health", () => {
    it("should report healthy", () => {
      expect(orchestrator.isHealthy()).toBe(true);
    });
  });

  describe("Command Execution", () => {
    it("should execute command and return success", async () => {
      const result = await orchestrator.executeCommand({ action: "test" });
      expect(result.success).toBe(true);
      expect(result.output).toContain("test");
    });

    it("should track command history", async () => {
      await orchestrator.executeCommand({ action: "cmd1" });
      await orchestrator.executeCommand({ action: "cmd2" });

      const history = await orchestrator.getCommandHistory();
      expect(history).toHaveLength(2);
      expect(history[0].command).toEqual({ action: "cmd1" });
      expect(history[1].command).toEqual({ action: "cmd2" });
    });

    it("should return command suggestions", async () => {
      const suggestions = await orchestrator.getCommandSuggestions({});
      expect(suggestions).toContain("/[FRG]-init");
      expect(suggestions).toContain("/[FRG]-status");
      expect(suggestions.length).toBe(5);
    });
  });

  describe("YOLO Mode (API compat)", () => {
    it("should return YOLO statistics", async () => {
      const stats = await orchestrator.getYoloStatistics();
      expect(stats).toHaveProperty("actionsToday");
      expect(stats).toHaveProperty("successRate");
    });

    it("should execute YOLO action", async () => {
      const result = await orchestrator.executeYoloAction({ type: "test" });
      expect(result.success).toBe(true);
      expect(result.actionId).toBeDefined();
    });

    it("should return empty YOLO history", async () => {
      const history = await orchestrator.getYoloHistory();
      expect(history).toEqual([]);
    });
  });
});

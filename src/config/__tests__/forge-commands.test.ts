/**
 * Tests for Forge Commands Registry
 */

import { describe, it, expect } from "vitest";
import {
  FORGE_COMMANDS,
  getCommandById,
  getCommandsByCategory,
  getCommandsWithHotkeys,
  searchCommands,
} from "../forge-commands";

describe("FORGE_COMMANDS", () => {
  it("should have exactly 19 commands", () => {
    expect(FORGE_COMMANDS).toHaveLength(19);
  });

  it("should have all required fields for each command", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      expect(cmd).toHaveProperty("id");
      expect(cmd).toHaveProperty("name");
      expect(cmd).toHaveProperty("description");
      expect(cmd).toHaveProperty("category");
      expect(cmd).toHaveProperty("icon");
      expect(cmd.id).toMatch(/^frg-/);
    });
  });

  it("should have all expected command IDs", () => {
    const expectedIds = [
      "frg-status",
      "frg-status-enhanced",
      "frg-gap-analysis",
      "frg-report",
      "frg-test",
      "frg-feature",
      "frg-spec",
      "frg-checkpoint",
      "frg-restore",
      "frg-deploy",
      "frg-optimize",
      "frg-integrate",
      "frg-upgrade",
      "frg-agent-assign",
      "frg-init",
      "frg-enable-forge",
      "frg-docs-status",
      "frg-docs-update",
      "frg-docs-audit",
    ];

    const actualIds = FORGE_COMMANDS.map((cmd) => cmd.id).sort();
    expect(actualIds).toEqual(expectedIds.sort());
  });

  it("should have valid categories", () => {
    const validCategories = ["forge", "git", "test", "deploy", "analyze"];
    FORGE_COMMANDS.forEach((cmd) => {
      expect(validCategories).toContain(cmd.category);
    });
  });

  it("should mark dangerous commands with requiresConfirmation", () => {
    const dangerousCommands = [
      "frg-restore",
      "frg-deploy",
      "frg-upgrade",
      "frg-init",
      "frg-enable-forge",
    ];

    dangerousCommands.forEach((cmdId) => {
      const cmd = getCommandById(cmdId);
      expect(cmd?.requiresConfirmation).toBe(true);
    });
  });
});

describe("getCommandById", () => {
  it("should find command by ID", () => {
    const cmd = getCommandById("frg-status");
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe("Status Report");
  });

  it("should return undefined for non-existent ID", () => {
    const cmd = getCommandById("non-existent");
    expect(cmd).toBeUndefined();
  });
});

describe("getCommandsByCategory", () => {
  it("should return all forge commands", () => {
    const forgeCommands = getCommandsByCategory("forge");
    expect(forgeCommands.length).toBeGreaterThan(0);
    forgeCommands.forEach((cmd) => {
      expect(cmd.category).toBe("forge");
    });
  });

  it("should return all analyze commands", () => {
    const analyzeCommands = getCommandsByCategory("analyze");
    expect(analyzeCommands.length).toBeGreaterThan(0);
    analyzeCommands.forEach((cmd) => {
      expect(cmd.category).toBe("analyze");
    });
  });

  it("should return exactly 1 test command", () => {
    const testCommands = getCommandsByCategory("test");
    expect(testCommands).toHaveLength(1);
    expect(testCommands[0].id).toBe("frg-test");
  });

  it("should return exactly 1 deploy command", () => {
    const deployCommands = getCommandsByCategory("deploy");
    expect(deployCommands).toHaveLength(1);
    expect(deployCommands[0].id).toBe("frg-deploy");
  });
});

describe("getCommandsWithHotkeys", () => {
  it("should return only commands with hotkeys", () => {
    const commandsWithHotkeys = getCommandsWithHotkeys();
    expect(commandsWithHotkeys.length).toBeGreaterThan(0);
    commandsWithHotkeys.forEach((cmd) => {
      expect(cmd.hotkey).toBeDefined();
      expect(typeof cmd.hotkey).toBe("string");
    });
  });

  it("should include expected hotkey commands", () => {
    const commandsWithHotkeys = getCommandsWithHotkeys();
    const ids = commandsWithHotkeys.map((cmd) => cmd.id);

    expect(ids).toContain("frg-status"); // hotkey: s
    expect(ids).toContain("frg-test"); // hotkey: t
    expect(ids).toContain("frg-feature"); // hotkey: f
  });
});

describe("searchCommands", () => {
  it("should find commands by name", () => {
    const results = searchCommands("status");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((cmd) => cmd.id === "frg-status")).toBe(true);
  });

  it("should find commands by description", () => {
    const results = searchCommands("test");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((cmd) => cmd.id === "frg-test")).toBe(true);
  });

  it("should find commands by ID", () => {
    const results = searchCommands("frg-gap");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((cmd) => cmd.id === "frg-gap-analysis")).toBe(true);
  });

  it("should be case-insensitive", () => {
    const resultsLower = searchCommands("deploy");
    const resultsUpper = searchCommands("DEPLOY");
    expect(resultsLower).toEqual(resultsUpper);
  });

  it("should return empty array for no matches", () => {
    const results = searchCommands("xyz123notfound");
    expect(results).toHaveLength(0);
  });
});

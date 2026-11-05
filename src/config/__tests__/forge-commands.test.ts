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
import { getIconByName } from "../../utils/icon-mapper";
import { HelpCircle } from "lucide-react";

describe("FORGE_COMMANDS", () => {
  it("should have exactly 14 commands", () => {
    expect(FORGE_COMMANDS).toHaveLength(14);
  });

  it("should have all required fields for each command", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      expect(cmd).toHaveProperty("id");
      expect(cmd).toHaveProperty("name");
      expect(cmd).toHaveProperty("description");
      expect(cmd).toHaveProperty("category");
      expect(cmd).toHaveProperty("iconName");
      expect(cmd.id).toMatch(/^(frg|git|analyze|test|system)-[a-z-]+$/);
    });
  });

  it("should have all expected command IDs", () => {
    const expectedIds = [
      "frg-status",
      "frg-gap-analysis",
      "frg-test",
      "frg-feature",
      "frg-deploy",
      "git-status",
      "git-diff",
      "git-log",
      "analyze-types",
      "analyze-lint",
      "analyze-deps",
      "analyze-bundle",
      "test-coverage",
      "system-info",
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
    const dangerousCommands = ["frg-deploy"];

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

  it("should return exactly 2 test commands", () => {
    const testCommands = getCommandsByCategory("test");
    expect(testCommands.map((cmd) => cmd.id)).toEqual([
      "frg-test",
      "test-coverage",
    ]);
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

describe("Additional command validation", () => {
  it("should have unique command IDs", () => {
    const ids = FORGE_COMMANDS.map((cmd) => cmd.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("should have unique hotkeys", () => {
    const hotkeys = FORGE_COMMANDS.filter((cmd) => cmd.hotkey).map(
      (cmd) => cmd.hotkey,
    );
    const uniqueHotkeys = new Set(hotkeys);
    expect(hotkeys.length).toBe(uniqueHotkeys.size);
  });

  it("should have valid severity values", () => {
    const validSeverities = ["safe", "warning", "danger"];
    FORGE_COMMANDS.forEach((cmd) => {
      if (cmd.severity) {
        expect(validSeverities).toContain(cmd.severity);
      }
    });
  });

  it("should have danger severity with requiresConfirmation", () => {
    const dangerCommands = FORGE_COMMANDS.filter(
      (cmd) => cmd.severity === "danger",
    );
    dangerCommands.forEach((cmd) => {
      expect(cmd.requiresConfirmation).toBe(true);
    });
  });

  it("should have icon names the client can render", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      // HelpCircle is the client fallback for an unknown icon name
      expect(getIconByName(cmd.iconName)).not.toBe(HelpCircle);
    });
  });

  it("should have non-empty names", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      expect(cmd.name.length).toBeGreaterThan(0);
    });
  });

  it("should have non-empty descriptions", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      expect(cmd.description.length).toBeGreaterThan(0);
    });
  });

  it("should have exactly 6 analyze commands", () => {
    const analyzeCommands = getCommandsByCategory("analyze");
    expect(analyzeCommands).toHaveLength(6);
  });

  it("should have exactly 3 git commands", () => {
    const gitCommands = getCommandsByCategory("git");
    expect(gitCommands.map((cmd) => cmd.id)).toEqual([
      "git-status",
      "git-diff",
      "git-log",
    ]);
  });

  it("should have expected hotkey mappings", () => {
    const hotkeyMap: Record<string, string> = {};
    FORGE_COMMANDS.forEach((cmd) => {
      if (cmd.hotkey) {
        hotkeyMap[cmd.hotkey] = cmd.id;
      }
    });

    expect(hotkeyMap["s"]).toBe("frg-status");
    expect(hotkeyMap["g"]).toBe("frg-gap-analysis");
    expect(hotkeyMap["t"]).toBe("frg-test");
    expect(hotkeyMap["f"]).toBe("frg-feature");
    expect(hotkeyMap["d"]).toBe("frg-deploy");
    expect(Object.keys(hotkeyMap).sort()).toEqual(["d", "f", "g", "s", "t"]);
  });

  it("should have short hotkeys (1 character)", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      if (cmd.hotkey) {
        expect(cmd.hotkey.length).toBe(1);
      }
    });
  });

  it("should mark only the build check as requiring confirmation", () => {
    const confirmationRequired = FORGE_COMMANDS.filter(
      (cmd) => cmd.requiresConfirmation,
    ).map((cmd) => cmd.id);
    expect(confirmationRequired).toEqual(["frg-deploy"]);
  });

  it("should have forge category commands", () => {
    const forgeCommands = getCommandsByCategory("forge");
    const forgeIds = forgeCommands.map((cmd) => cmd.id);
    expect(forgeIds).toEqual(["frg-status", "frg-feature"]);
  });

  it("should search partial matches", () => {
    const results = searchCommands("analy");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((cmd) => cmd.id.includes("analyze"))).toBe(true);
  });

  it("should find commands with common words", () => {
    const statusResults = searchCommands("status");
    expect(statusResults.length).toBeGreaterThanOrEqual(2); // frg-status and git-status

    const gitResults = searchCommands("git");
    expect(gitResults.length).toBeGreaterThanOrEqual(3); // git-status, git-diff, git-log
  });

  it("should have consistent ID format", () => {
    FORGE_COMMANDS.forEach((cmd) => {
      expect(cmd.id).toMatch(/^(frg|git|analyze|test|system)-[a-z-]+$/);
    });
  });

  it("should have categories matching expected structure", () => {
    const categoryCounts = FORGE_COMMANDS.reduce(
      (acc, cmd) => {
        acc[cmd.category] = (acc[cmd.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    expect(categoryCounts.forge).toBeGreaterThan(0);
    expect(categoryCounts.analyze).toBeGreaterThan(0);
    expect(categoryCounts.test).toBe(2);
    expect(categoryCounts.deploy).toBe(1);
    expect(categoryCounts.git).toBe(3);
  });
});

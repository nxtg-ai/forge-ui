/**
 * Tests for useCommandOutput Hook
 *
 * Test coverage:
 * - Initial state (empty entries, not visible, correct default height)
 * - startCommand() creates a pending entry and returns an ID
 * - completeCommand() updates an entry with output, status, and duration
 * - History is capped at maxEntries (default 20)
 * - dismiss() removes an entry
 * - clear() removes all entries
 * - toggle(), expand(), collapse() change height state
 * - selectEntry() changes the active entry
 * - cycleHeight() cycles through collapsed → half → expanded → collapsed
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandOutput } from "../useCommandOutput";

describe("useCommandOutput", () => {
  describe("Initial State", () => {
    it("initializes with empty entries", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.entries).toEqual([]);
      expect(result.current.activeEntry).toBeNull();
      expect(result.current.activeEntryId).toBeNull();
    });

    it("initializes with collapsed height", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.drawerHeight).toBe("collapsed");
    });

    it("initializes as not visible", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.isVisible).toBe(false);
    });

    it("initializes with no running commands", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.hasRunning).toBe(false);
    });
  });

  describe("startCommand()", () => {
    it("creates a new entry with running status", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      expect(result.current.entries).toHaveLength(1);
      const entry = result.current.entries[0];
      expect(entry.command).toBe("frg-test");
      expect(entry.status).toBe("running");
      expect(entry.output).toBe("");
      expect(entry.finishedAt).toBeNull();
      expect(entry.duration).toBeNull();
    });

    it("returns a unique command ID", () => {
      const { result } = renderHook(() => useCommandOutput());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.startCommand("frg-test");
        id2 = result.current.startCommand("frg-status");
      });

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cmd-\d+-[a-z0-9]+$/);
    });

    it("sets the new entry as active", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      expect(result.current.activeEntryId).toBe(commandId);
      expect(result.current.activeEntry?.command).toBe("frg-test");
    });

    it("makes the drawer visible", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.isVisible).toBe(false);

      act(() => {
        result.current.startCommand("frg-test");
      });

      expect(result.current.isVisible).toBe(true);
    });

    it("expands drawer from collapsed to half", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.drawerHeight).toBe("collapsed");

      act(() => {
        result.current.startCommand("frg-test");
      });

      expect(result.current.drawerHeight).toBe("half");
    });

    it("does not collapse drawer if already expanded", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.setDrawerHeight("expanded");
        result.current.startCommand("frg-test");
      });

      expect(result.current.drawerHeight).toBe("expanded");
    });

    it("adds entries to the beginning of the list", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("first");
        result.current.startCommand("second");
        result.current.startCommand("third");
      });

      expect(result.current.entries[0].command).toBe("third");
      expect(result.current.entries[1].command).toBe("second");
      expect(result.current.entries[2].command).toBe("first");
    });

    it("caps history at 20 entries", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        // Add 25 commands
        for (let i = 0; i < 25; i++) {
          result.current.startCommand(`command-${i}`);
        }
      });

      expect(result.current.entries).toHaveLength(20);
      // Most recent should be command-24
      expect(result.current.entries[0].command).toBe("command-24");
      // Oldest should be command-5 (command-0 to command-4 were dropped)
      expect(result.current.entries[19].command).toBe("command-5");
    });

    it("sets startedAt timestamp", () => {
      const { result } = renderHook(() => useCommandOutput());
      const beforeStart = new Date();

      act(() => {
        result.current.startCommand("frg-test");
      });

      const entry = result.current.entries[0];
      expect(entry.startedAt).toBeInstanceOf(Date);
      expect(entry.startedAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(entry.startedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });

  describe("completeCommand()", () => {
    it("updates entry with output and success status", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      act(() => {
        result.current.completeCommand(commandId, "Test passed!", "success");
      });

      const entry = result.current.entries[0];
      expect(entry.status).toBe("success");
      expect(entry.output).toBe("Test passed!");
      expect(entry.finishedAt).toBeInstanceOf(Date);
      expect(entry.duration).toBeGreaterThanOrEqual(0);
    });

    it("updates entry with error status", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      act(() => {
        result.current.completeCommand(commandId, "Error: test failed", "error");
      });

      const entry = result.current.entries[0];
      expect(entry.status).toBe("error");
      expect(entry.output).toBe("Error: test failed");
    });

    it("calculates duration correctly", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      // Wait a bit
      const delay = 50;
      act(() => {
        const start = Date.now();
        while (Date.now() - start < delay) {
          // busy wait
        }
      });

      act(() => {
        result.current.completeCommand(commandId, "Done", "success");
      });

      const entry = result.current.entries[0];
      expect(entry.duration).toBeGreaterThanOrEqual(delay - 10); // Allow 10ms margin
    });

    it("updates entry with metadata", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      const metadata = {
        passed: 10,
        failed: 2,
        skipped: 1,
        totalTests: 13,
      };

      act(() => {
        result.current.completeCommand(commandId, "Tests complete", "success", metadata);
      });

      const entry = result.current.entries[0];
      expect(entry.metadata).toEqual(metadata);
    });

    it("does not affect other entries", () => {
      const { result } = renderHook(() => useCommandOutput());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.startCommand("first");
        id2 = result.current.startCommand("second");
      });

      act(() => {
        result.current.completeCommand(id2, "Second done", "success");
      });

      const firstEntry = result.current.entries.find((e) => e.id === id1);
      const secondEntry = result.current.entries.find((e) => e.id === id2);

      expect(firstEntry?.status).toBe("running");
      expect(secondEntry?.status).toBe("success");
    });

    it("handles completing a non-existent command gracefully", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      // Should not throw
      act(() => {
        result.current.completeCommand("nonexistent-id", "output", "success");
      });

      // Entry should remain unchanged
      expect(result.current.entries[0].status).toBe("running");
    });
  });

  describe("appendOutput()", () => {
    it("appends output to running command", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("frg-test");
      });

      act(() => {
        result.current.appendOutput(commandId, "Line 1\n");
        result.current.appendOutput(commandId, "Line 2\n");
        result.current.appendOutput(commandId, "Line 3\n");
      });

      const entry = result.current.entries[0];
      expect(entry.output).toBe("Line 1\nLine 2\nLine 3\n");
    });

    it("handles appending to non-existent command gracefully", () => {
      const { result } = renderHook(() => useCommandOutput());

      // Should not throw
      act(() => {
        result.current.appendOutput("nonexistent-id", "output");
      });

      expect(result.current.entries).toHaveLength(0);
    });
  });

  describe("selectEntry()", () => {
    it("changes the active entry", () => {
      const { result } = renderHook(() => useCommandOutput());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.startCommand("first");
        id2 = result.current.startCommand("second");
      });

      // Second is active by default (most recent)
      expect(result.current.activeEntryId).toBe(id2);

      act(() => {
        result.current.selectEntry(id1);
      });

      expect(result.current.activeEntryId).toBe(id1);
      expect(result.current.activeEntry?.command).toBe("first");
    });

    it("makes the drawer visible", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("test");
        result.current.setIsVisible(false);
      });

      expect(result.current.isVisible).toBe(false);

      act(() => {
        result.current.selectEntry(commandId);
      });

      expect(result.current.isVisible).toBe(true);
    });

    it("expands drawer from collapsed to half", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("test");
        result.current.dismiss(); // Collapse
      });

      expect(result.current.drawerHeight).toBe("collapsed");

      act(() => {
        result.current.selectEntry(commandId);
      });

      expect(result.current.drawerHeight).toBe("half");
    });

    it("does not change drawer height if already open", () => {
      const { result } = renderHook(() => useCommandOutput());

      let id1: string;
      let id2: string;

      act(() => {
        id1 = result.current.startCommand("first");
        id2 = result.current.startCommand("second");
        result.current.setDrawerHeight("expanded");
      });

      act(() => {
        result.current.selectEntry(id1);
      });

      expect(result.current.drawerHeight).toBe("expanded");
    });
  });

  describe("clearHistory()", () => {
    it("removes all entries", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("first");
        result.current.startCommand("second");
        result.current.startCommand("third");
      });

      expect(result.current.entries).toHaveLength(3);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.entries).toEqual([]);
    });

    it("clears active entry", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      expect(result.current.activeEntryId).toBeTruthy();

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.activeEntryId).toBeNull();
      expect(result.current.activeEntry).toBeNull();
    });

    it("hides the drawer", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it("collapses the drawer", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.setDrawerHeight("expanded");
      });

      expect(result.current.drawerHeight).toBe("expanded");

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.drawerHeight).toBe("collapsed");
    });
  });

  describe("dismiss()", () => {
    it("collapses the drawer", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.setDrawerHeight("expanded");
      });

      expect(result.current.drawerHeight).toBe("expanded");

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.drawerHeight).toBe("collapsed");
    });

    it("does not clear entries", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.entries).toHaveLength(1);
    });

    it("does not change visibility", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.isVisible).toBe(true);
    });
  });

  describe("toggle()", () => {
    it("expands drawer when collapsed", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.dismiss(); // Collapse
      });

      expect(result.current.drawerHeight).toBe("collapsed");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.drawerHeight).toBe("half");
      expect(result.current.isVisible).toBe(true);
    });

    it("collapses drawer when expanded", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.setDrawerHeight("expanded");
      });

      expect(result.current.drawerHeight).toBe("expanded");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.drawerHeight).toBe("collapsed");
    });

    it("expands drawer when not visible", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.setIsVisible(false);
      });

      expect(result.current.isVisible).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isVisible).toBe(true);
      expect(result.current.drawerHeight).toBe("half");
    });
  });

  describe("cycleHeight()", () => {
    it("cycles collapsed → half → expanded → collapsed", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
        result.current.setDrawerHeight("collapsed");
      });

      expect(result.current.drawerHeight).toBe("collapsed");

      act(() => {
        result.current.cycleHeight();
      });

      expect(result.current.drawerHeight).toBe("half");

      act(() => {
        result.current.cycleHeight();
      });

      expect(result.current.drawerHeight).toBe("expanded");

      act(() => {
        result.current.cycleHeight();
      });

      expect(result.current.drawerHeight).toBe("collapsed");
    });
  });

  describe("setDrawerHeight()", () => {
    it("directly sets drawer height", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.setDrawerHeight("expanded");
      });

      expect(result.current.drawerHeight).toBe("expanded");

      act(() => {
        result.current.setDrawerHeight("half");
      });

      expect(result.current.drawerHeight).toBe("half");

      act(() => {
        result.current.setDrawerHeight("collapsed");
      });

      expect(result.current.drawerHeight).toBe("collapsed");
    });
  });

  describe("setIsVisible()", () => {
    it("directly sets visibility", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.setIsVisible(true);
      });

      expect(result.current.isVisible).toBe(true);

      act(() => {
        result.current.setIsVisible(false);
      });

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe("hasRunning", () => {
    it("returns false when no commands are running", () => {
      const { result } = renderHook(() => useCommandOutput());

      expect(result.current.hasRunning).toBe(false);

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("test");
        result.current.completeCommand(commandId, "Done", "success");
      });

      expect(result.current.hasRunning).toBe(false);
    });

    it("returns true when a command is running", () => {
      const { result } = renderHook(() => useCommandOutput());

      act(() => {
        result.current.startCommand("test");
      });

      expect(result.current.hasRunning).toBe(true);
    });

    it("updates when command completes", () => {
      const { result } = renderHook(() => useCommandOutput());

      let commandId: string;
      act(() => {
        commandId = result.current.startCommand("test");
      });

      expect(result.current.hasRunning).toBe(true);

      act(() => {
        result.current.completeCommand(commandId, "Done", "success");
      });

      expect(result.current.hasRunning).toBe(false);
    });
  });
});

/**
 * Tests for useKeyboardShortcuts Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useKeyboardShortcuts,
  useKeyboardShortcut,
  formatShortcut,
  isShortcutAvailable,
} from "../useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useKeyboardShortcuts", () => {
    it("should trigger callback when shortcut is pressed", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            modifiers: ["ctrl"],
            callback,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not trigger callback when wrong key is pressed", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            modifiers: ["ctrl"],
            callback,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "j",
          ctrlKey: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should not trigger callback when wrong modifiers are pressed", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            modifiers: ["ctrl"],
            callback,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          altKey: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle shortcuts without modifiers", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "?",
            callback,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "?",
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not trigger when disabled", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts(
          [
            {
              key: "k",
              callback,
            },
          ],
          { enabled: false }
        )
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should not trigger when individual shortcut is disabled", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            callback,
            enabled: false,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
        });
        window.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple modifiers", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "a",
            modifiers: ["ctrl", "shift"],
            callback,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "a",
          ctrlKey: true,
          shiftKey: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should prevent default when preventDefault is true", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            callback,
            preventDefault: true,
          },
        ])
      );

      const event = new KeyboardEvent("keydown", {
        key: "k",
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("should ignore shortcuts in input elements by default", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            callback,
          },
        ])
      );

      // Create input element
      const input = document.createElement("input");
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          bubbles: true,
        });
        Object.defineProperty(event, "target", { value: input });
        input.dispatchEvent(event);
      });

      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("should allow Escape in input elements", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "Escape",
            callback,
          },
        ])
      );

      // Create input element
      const input = document.createElement("input");
      document.body.appendChild(input);

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        });
        Object.defineProperty(event, "target", { value: input });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      document.body.removeChild(input);
    });

    it("should only trigger first matching shortcut", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            callback: callback1,
          },
          {
            key: "k",
            callback: callback2,
          },
        ])
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
        });
        window.dispatchEvent(event);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should cleanup event listeners on unmount", () => {
      const callback = vi.fn();
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useKeyboardShortcuts([
          {
            key: "k",
            callback,
          },
        ])
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });
  });

  describe("useKeyboardShortcut", () => {
    it("should register single shortcut", () => {
      const callback = vi.fn();

      renderHook(() => useKeyboardShortcut("k", callback));

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should register shortcut with modifiers", () => {
      const callback = vi.fn();

      renderHook(() =>
        useKeyboardShortcut("k", callback, {
          modifiers: ["ctrl"],
        })
      );

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("formatShortcut", () => {
    it("should format simple key", () => {
      expect(formatShortcut("k")).toBe("K");
    });

    it("should format key with single modifier", () => {
      expect(formatShortcut("k", ["ctrl"])).toBe("Ctrl+K");
    });

    it("should format key with multiple modifiers", () => {
      expect(formatShortcut("a", ["ctrl", "shift"])).toBe("Ctrl+Shift+A");
    });

    it("should format meta key with symbol", () => {
      expect(formatShortcut("k", ["meta"])).toBe("⌘+K");
    });

    it("should format special keys", () => {
      expect(formatShortcut("Escape")).toBe("Escape");
      expect(formatShortcut("Tab")).toBe("Tab");
    });
  });

  describe("isShortcutAvailable", () => {
    it("should return true for custom shortcuts", () => {
      expect(isShortcutAvailable("k", ["ctrl"])).toBe(true);
      expect(isShortcutAvailable("?")).toBe(true);
    });

    it("should return false for browser shortcuts", () => {
      expect(isShortcutAvailable("t", ["ctrl"])).toBe(false); // New tab
      expect(isShortcutAvailable("w", ["ctrl"])).toBe(false); // Close tab
    });

    it("should allow overriding some browser shortcuts", () => {
      expect(isShortcutAvailable("r", ["ctrl"])).toBe(true); // Reload (we can override)
      expect(isShortcutAvailable("s", ["ctrl"])).toBe(true); // Save (we can override)
    });
  });
});

/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcut registration and management
 * Supports key combinations with modifiers (Ctrl, Alt, Shift, Meta)
 * Handles conflicts and provides enable/disable functionality
 */

import { useEffect, useRef, useCallback, useState } from "react";

export interface ShortcutConfig {
  key: string;
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
  callback: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
  enabled?: boolean;
  category?: string;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputElements?: boolean;
}

/**
 * Register global keyboard shortcuts
 *
 * @param shortcuts - Array of shortcut configurations
 * @param options - Global options for all shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     modifiers: ['ctrl'],
 *     callback: () => openCommandPalette(),
 *     description: 'Open command palette',
 *   },
 *   {
 *     key: '?',
 *     callback: () => toggleHelp(),
 *     description: 'Show help',
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputElements = true,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input elements
      if (ignoreInputElements) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (isInput) {
          // Still allow escape and other safe keys
          if (event.key !== "Escape" && event.key !== "Tab") {
            return;
          }
        }
      }

      // Check each registered shortcut
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifiersMatch = checkModifiers(event, shortcut.modifiers);

        if (keyMatches && modifiersMatch) {
          if (shortcut.preventDefault ?? preventDefault) {
            event.preventDefault();
          }

          shortcut.callback(event);
          break; // Only trigger first matching shortcut
        }
      }
    },
    [enabled, preventDefault, ignoreInputElements]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Check if the required modifiers match the event
 */
function checkModifiers(
  event: KeyboardEvent,
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[]
): boolean {
  if (!modifiers || modifiers.length === 0) {
    // No modifiers required - ensure none are pressed
    return !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
  }

  const requiredCtrl = modifiers.includes("ctrl");
  const requiredAlt = modifiers.includes("alt");
  const requiredShift = modifiers.includes("shift");
  const requiredMeta = modifiers.includes("meta");

  return (
    event.ctrlKey === requiredCtrl &&
    event.altKey === requiredAlt &&
    event.shiftKey === requiredShift &&
    event.metaKey === requiredMeta
  );
}

/**
 * Hook for a single keyboard shortcut
 *
 * @param key - The key to listen for
 * @param callback - Function to call when shortcut is triggered
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * useKeyboardShortcut('?', () => setShowHelp(true), {
 *   description: 'Show help',
 * });
 *
 * useKeyboardShortcut('k', openCommandPalette, {
 *   modifiers: ['ctrl'],
 *   description: 'Open command palette',
 * });
 * ```
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: Omit<ShortcutConfig, "key" | "callback"> & UseKeyboardShortcutsOptions = {}
) {
  const {
    modifiers,
    description,
    preventDefault = true,
    enabled = true,
    category,
    ignoreInputElements = true,
  } = options;

  useKeyboardShortcuts(
    [
      {
        key,
        modifiers,
        callback,
        description,
        preventDefault,
        enabled,
        category,
      },
    ],
    { enabled, preventDefault, ignoreInputElements }
  );
}

/**
 * Format shortcut for display
 *
 * @example
 * ```tsx
 * formatShortcut('k', ['ctrl']) // "Ctrl+K"
 * formatShortcut('?') // "?"
 * ```
 */
export function formatShortcut(key: string, modifiers?: string[]): string {
  const parts: string[] = [];

  if (modifiers) {
    for (const mod of modifiers) {
      switch (mod) {
        case "ctrl":
          parts.push("Ctrl");
          break;
        case "alt":
          parts.push("Alt");
          break;
        case "shift":
          parts.push("Shift");
          break;
        case "meta":
          parts.push("⌘");
          break;
      }
    }
  }

  parts.push(key.length === 1 ? key.toUpperCase() : key);

  return parts.join("+");
}

/**
 * Check if shortcut is available (not conflicting with browser defaults)
 */
export function isShortcutAvailable(
  key: string,
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[]
): boolean {
  // Critical browser shortcuts to avoid (cannot be overridden reliably)
  const criticalBrowserShortcuts = new Set([
    "ctrl+t", // New tab
    "ctrl+w", // Close tab
    "ctrl+shift+t", // Reopen tab
    "ctrl+tab", // Next tab
    "ctrl+shift+tab", // Previous tab
    "ctrl+shift+r", // Hard reload
    "ctrl+p", // Print
    "ctrl+o", // Open
    "ctrl+h", // History
    "ctrl+shift+delete", // Clear browsing data
  ]);

  // Safe to override - we can preventDefault on these
  // ctrl+r (reload), ctrl+s (save), ctrl+f (find)

  const shortcutString = formatShortcut(key, modifiers).toLowerCase();

  return !criticalBrowserShortcuts.has(shortcutString);
}

/**
 * Hook to track pressed keys (useful for debugging)
 */
export function usePressedKeys() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => new Set([...prev, e.key]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.key);
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return pressedKeys;
}

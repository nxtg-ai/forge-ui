/**
 * Engagement Context - Global engagement mode management
 *
 * Provides centralized engagement mode and automation level state management
 * with localStorage persistence and WebSocket synchronization.
 *
 * Features:
 * - Engagement mode: CEO, VP, Engineer, Builder, Founder
 * - Automation levels: Conservative, Balanced, Aggressive
 * - localStorage persistence
 * - WebSocket sync when mode changes
 * - Computed visibility levels for filtering content
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { EngagementMode, AutomationLevel } from "../components/types";
import { logger } from "../utils/browser-logger";

// Visibility hierarchy: CEO sees least, Founder sees everything
const VISIBILITY_HIERARCHY: Record<EngagementMode, number> = {
  ceo: 1,
  vp: 2,
  engineer: 3,
  builder: 4,
  founder: 5,
};

interface EngagementContextValue {
  // Core state
  mode: EngagementMode;
  setMode: (mode: EngagementMode) => void;
  automationLevel: AutomationLevel;
  setAutomationLevel: (level: AutomationLevel) => void;

  // Computed helpers
  visibilityLevels: EngagementMode[];
  isMinimalMode: boolean; // CEO mode - minimal details
  isFullAccessMode: boolean; // Founder mode - full access
  canSee: (requiredMode: EngagementMode) => boolean;
}

const EngagementContext = createContext<EngagementContextValue | null>(null);

// Storage keys
const MODE_STORAGE_KEY = "nxtg-forge-engagement-mode";
const AUTOMATION_STORAGE_KEY = "nxtg-forge-automation-level";

interface EngagementProviderProps {
  children: React.ReactNode;
  onModeChange?: (mode: EngagementMode, automationLevel: AutomationLevel) => void;
}

export const EngagementProvider: React.FC<EngagementProviderProps> = ({
  children,
  onModeChange
}) => {
  // Load from localStorage on mount
  const [mode, setModeState] = useState<EngagementMode>(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return (saved as EngagementMode) || "engineer";
  });

  const [automationLevel, setAutomationLevelState] = useState<AutomationLevel>(() => {
    const saved = localStorage.getItem(AUTOMATION_STORAGE_KEY);
    return (saved as AutomationLevel) || "conservative";
  });

  // Persist to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(AUTOMATION_STORAGE_KEY, automationLevel);
  }, [automationLevel]);

  // Notify parent when mode or automation level changes
  useEffect(() => {
    if (onModeChange) {
      onModeChange(mode, automationLevel);
    }
  }, [mode, automationLevel, onModeChange]);

  // Mode setter with WebSocket sync
  const setMode = useCallback((newMode: EngagementMode) => {
    setModeState(newMode);

    // Send to WebSocket if available
    try {
      if (window.WebSocket && window.__forgeWS) {
        const ws = window.__forgeWS;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "engagement.mode.changed",
            payload: { mode: newMode, timestamp: new Date().toISOString() },
          }));
        }
      }
    } catch (error) {
      logger.warn("Failed to sync engagement mode to WebSocket:", error);
    }
  }, []);

  // Automation level setter with WebSocket sync
  const setAutomationLevel = useCallback((newLevel: AutomationLevel) => {
    setAutomationLevelState(newLevel);

    // Send to WebSocket if available
    try {
      if (window.WebSocket && window.__forgeWS) {
        const ws = window.__forgeWS;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "engagement.automation.changed",
            payload: { level: newLevel, timestamp: new Date().toISOString() },
          }));
        }
      }
    } catch (error) {
      logger.warn("Failed to sync automation level to WebSocket:", error);
    }
  }, []);

  // Computed: Get all modes that the current mode can see
  const visibilityLevels: EngagementMode[] = React.useMemo(() => {
    const currentLevel = VISIBILITY_HIERARCHY[mode];
    return Object.entries(VISIBILITY_HIERARCHY)
      .filter(([_, level]) => level <= currentLevel)
      .map(([mode]) => mode as EngagementMode);
  }, [mode]);

  // Computed: Check if current mode is CEO (minimal detail mode)
  const isMinimalMode = mode === "ceo";

  // Computed: Check if current mode is Founder (full access mode)
  const isFullAccessMode = mode === "founder";

  // Helper: Check if current mode can see content meant for a specific mode
  const canSee = useCallback(
    (requiredMode: EngagementMode): boolean => {
      return VISIBILITY_HIERARCHY[mode] >= VISIBILITY_HIERARCHY[requiredMode];
    },
    [mode]
  );

  const value: EngagementContextValue = {
    mode,
    setMode,
    automationLevel,
    setAutomationLevel,
    visibilityLevels,
    isMinimalMode,
    isFullAccessMode,
    canSee,
  };

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
};

/**
 * Hook to access engagement context
 *
 * @throws Error if used outside of EngagementProvider
 *
 * @example
 * ```tsx
 * const { mode, setMode, canSee } = useEngagement();
 *
 * // Change mode
 * setMode("founder");
 *
 * // Check visibility
 * if (canSee("engineer")) {
 *   // Show engineer-level details
 * }
 * ```
 */
export const useEngagement = (): EngagementContextValue => {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error("useEngagement must be used within an EngagementProvider");
  }
  return context;
};

/**
 * Hook variant that returns null instead of throwing
 * Useful for optional engagement context usage
 */
export const useEngagementOptional = (): EngagementContextValue | null => {
  return useContext(EngagementContext);
};

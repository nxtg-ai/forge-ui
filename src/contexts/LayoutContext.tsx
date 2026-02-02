/**
 * Layout Context - Global layout state management
 *
 * Provides centralized panel visibility state management with localStorage
 * persistence and integration with responsive layout system.
 *
 * Features:
 * - Panel visibility: Context Panel, Governance Panel, Footer
 * - localStorage persistence across sessions
 * - Integration with useResponsiveLayout for breakpoint info
 * - Toggle and direct setter functions
 * - Responsive layout configuration from useResponsiveLayout
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useResponsiveLayout } from "../components/infinity-terminal/hooks/useResponsiveLayout";
import type { LayoutConfig } from "../components/infinity-terminal/hooks/useResponsiveLayout";

// Storage keys
const CONTEXT_PANEL_STORAGE_KEY = "nxtg-forge-context-panel-visible";
const GOVERNANCE_PANEL_STORAGE_KEY = "nxtg-forge-governance-panel-visible";
const FOOTER_STORAGE_KEY = "nxtg-forge-footer-visible";

interface LayoutContextValue {
  // Panel visibility state
  contextPanelVisible: boolean;
  governancePanelVisible: boolean;
  footerVisible: boolean;

  // Toggle functions
  toggleContextPanel: () => void;
  toggleGovernancePanel: () => void;
  toggleFooter: () => void;

  // Direct setter functions
  setContextPanelVisible: (visible: boolean) => void;
  setGovernancePanelVisible: (visible: boolean) => void;
  setFooterVisible: (visible: boolean) => void;

  // Layout info from useResponsiveLayout
  layout: LayoutConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface LayoutProviderProps {
  children: React.ReactNode;
  defaultContextPanelVisible?: boolean;
  defaultGovernancePanelVisible?: boolean;
  defaultFooterVisible?: boolean;
  onPanelChange?: (panelName: string, visible: boolean) => void;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  defaultContextPanelVisible = false,
  defaultGovernancePanelVisible = true,
  defaultFooterVisible = true,
  onPanelChange,
}) => {
  // Load from localStorage on mount, fallback to defaults
  const [contextPanelVisible, setContextPanelVisibleState] = useState<boolean>(() => {
    const saved = localStorage.getItem(CONTEXT_PANEL_STORAGE_KEY);
    return saved !== null ? saved === "true" : defaultContextPanelVisible;
  });

  const [governancePanelVisible, setGovernancePanelVisibleState] = useState<boolean>(() => {
    const saved = localStorage.getItem(GOVERNANCE_PANEL_STORAGE_KEY);
    return saved !== null ? saved === "true" : defaultGovernancePanelVisible;
  });

  const [footerVisible, setFooterVisibleState] = useState<boolean>(() => {
    const saved = localStorage.getItem(FOOTER_STORAGE_KEY);
    return saved !== null ? saved === "true" : defaultFooterVisible;
  });

  // Store callback in ref to avoid dependency issues
  const onPanelChangeRef = useRef(onPanelChange);
  useEffect(() => {
    onPanelChangeRef.current = onPanelChange;
  });

  // Get responsive layout info
  const responsiveLayout = useResponsiveLayout({
    defaultHUDVisible: governancePanelVisible,
    defaultSidebarVisible: contextPanelVisible,
  });

  // Persist to localStorage whenever panel visibility changes
  useEffect(() => {
    localStorage.setItem(CONTEXT_PANEL_STORAGE_KEY, String(contextPanelVisible));
  }, [contextPanelVisible]);

  useEffect(() => {
    localStorage.setItem(GOVERNANCE_PANEL_STORAGE_KEY, String(governancePanelVisible));
  }, [governancePanelVisible]);

  useEffect(() => {
    localStorage.setItem(FOOTER_STORAGE_KEY, String(footerVisible));
  }, [footerVisible]);

  // Notify parent when panel visibility changes (using ref to avoid infinite loops)
  useEffect(() => {
    onPanelChangeRef.current?.("context", contextPanelVisible);
  }, [contextPanelVisible]);

  useEffect(() => {
    onPanelChangeRef.current?.("governance", governancePanelVisible);
  }, [governancePanelVisible]);

  useEffect(() => {
    onPanelChangeRef.current?.("footer", footerVisible);
  }, [footerVisible]);

  // Toggle functions
  const toggleContextPanel = useCallback(() => {
    setContextPanelVisibleState((prev) => !prev);
  }, []);

  const toggleGovernancePanel = useCallback(() => {
    setGovernancePanelVisibleState((prev) => !prev);
  }, []);

  const toggleFooter = useCallback(() => {
    setFooterVisibleState((prev) => !prev);
  }, []);

  // Direct setter functions
  const setContextPanelVisible = useCallback((visible: boolean) => {
    setContextPanelVisibleState(visible);
  }, []);

  const setGovernancePanelVisible = useCallback((visible: boolean) => {
    setGovernancePanelVisibleState(visible);
  }, []);

  const setFooterVisible = useCallback((visible: boolean) => {
    setFooterVisibleState(visible);
  }, []);

  const value: LayoutContextValue = {
    contextPanelVisible,
    governancePanelVisible,
    footerVisible,
    toggleContextPanel,
    toggleGovernancePanel,
    toggleFooter,
    setContextPanelVisible,
    setGovernancePanelVisible,
    setFooterVisible,
    layout: responsiveLayout.layout,
    isMobile: responsiveLayout.layout.isMobile,
    isTablet: responsiveLayout.layout.isTablet,
    isDesktop: responsiveLayout.layout.isDesktop,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Hook to access layout context
 *
 * @throws Error if used outside of LayoutProvider
 *
 * @example
 * ```tsx
 * const {
 *   contextPanelVisible,
 *   toggleContextPanel,
 *   layout,
 *   isMobile
 * } = useLayout();
 *
 * // Toggle panel visibility
 * <button onClick={toggleContextPanel}>
 *   Toggle Context Panel
 * </button>
 *
 * // Check device type
 * if (isMobile) {
 *   // Render mobile layout
 * }
 *
 * // Access layout config
 * const { breakpoint, width } = layout;
 * ```
 */
export const useLayout = (): LayoutContextValue => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};

/**
 * Hook variant that returns null instead of throwing
 * Useful for optional layout context usage
 */
export const useLayoutOptional = (): LayoutContextValue | null => {
  return useContext(LayoutContext);
};

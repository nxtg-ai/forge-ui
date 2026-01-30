/**
 * Responsive Layout Hook for Infinity Terminal
 * Handles breakpoint detection and layout management
 */

import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface LayoutConfig {
  breakpoint: Breakpoint;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  showSidebar: boolean;
  sidebarWidth: number;
  showHUD: boolean;
  hudWidth: number;
  terminalHeight: string;
  paneLayout: 'single' | 'split-vertical' | 'split-horizontal' | 'multi';
}

// Tailwind-compatible breakpoints
const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface UseResponsiveLayoutOptions {
  defaultHUDVisible?: boolean;
  defaultSidebarVisible?: boolean;
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
}

export function useResponsiveLayout(options: UseResponsiveLayoutOptions = {}) {
  const {
    defaultHUDVisible = true,
    defaultSidebarVisible = true,
    onBreakpointChange,
  } = options;

  const [hudVisible, setHudVisible] = useState(defaultHUDVisible);
  const [sidebarVisible, setSidebarVisible] = useState(defaultSidebarVisible);

  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, []);

  const calculateLayout = useCallback((width: number): LayoutConfig => {
    const breakpoint = getBreakpoint(width);
    const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
    const isTablet = breakpoint === 'md' || breakpoint === 'lg';
    const isDesktop = breakpoint === 'xl' || breakpoint === '2xl';

    let config: LayoutConfig = {
      breakpoint,
      width,
      isMobile,
      isTablet,
      isDesktop,
      showSidebar: false,
      sidebarWidth: 0,
      showHUD: false,
      hudWidth: 0,
      terminalHeight: '100%',
      paneLayout: 'single',
    };

    if (isMobile) {
      // Mobile: Single pane, bottom sheet for HUD
      config = {
        ...config,
        showSidebar: false,
        sidebarWidth: 0,
        showHUD: hudVisible,
        hudWidth: width, // Full width bottom sheet
        terminalHeight: hudVisible ? '60vh' : '100%',
        paneLayout: 'single',
      };
    } else if (isTablet) {
      // Tablet: 2-pane layout
      config = {
        ...config,
        showSidebar: sidebarVisible,
        sidebarWidth: sidebarVisible ? 200 : 0,
        showHUD: hudVisible,
        hudWidth: hudVisible ? 280 : 0,
        terminalHeight: '100%',
        paneLayout: 'split-vertical',
      };
    } else {
      // Desktop: Full 3-pane layout
      config = {
        ...config,
        showSidebar: sidebarVisible,
        sidebarWidth: sidebarVisible ? 240 : 0,
        showHUD: hudVisible,
        hudWidth: hudVisible ? 384 : 0,
        terminalHeight: '100%',
        paneLayout: 'multi',
      };
    }

    return config;
  }, [getBreakpoint, hudVisible, sidebarVisible]);

  const [layout, setLayout] = useState<LayoutConfig>(() =>
    calculateLayout(typeof window !== 'undefined' ? window.innerWidth : 1280)
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newLayout = calculateLayout(window.innerWidth);
      setLayout(prev => {
        if (prev.breakpoint !== newLayout.breakpoint) {
          onBreakpointChange?.(newLayout.breakpoint);
        }
        return newLayout;
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, [calculateLayout, onBreakpointChange]);

  // Toggle functions
  const toggleHUD = useCallback(() => {
    setHudVisible(prev => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  const setHUD = useCallback((visible: boolean) => {
    setHudVisible(visible);
  }, []);

  const setSidebar = useCallback((visible: boolean) => {
    setSidebarVisible(visible);
  }, []);

  // Recalculate layout when visibility changes
  useEffect(() => {
    setLayout(calculateLayout(window.innerWidth));
  }, [hudVisible, sidebarVisible, calculateLayout]);

  // Get CSS classes for responsive styling
  const getResponsiveClasses = useCallback(() => {
    const { isMobile, isTablet, isDesktop } = layout;

    return {
      container: [
        'flex',
        isMobile ? 'flex-col' : 'flex-row',
        isDesktop ? 'h-screen' : 'min-h-screen',
      ].join(' '),

      terminal: [
        'flex-1',
        'min-w-0',
        isMobile ? 'order-first' : '',
      ].join(' '),

      sidebar: [
        'flex-shrink-0',
        isMobile ? 'w-full' : `w-[${layout.sidebarWidth}px]`,
        isMobile ? 'order-last' : 'order-first',
        isMobile ? 'h-auto' : 'h-full',
      ].join(' '),

      hud: [
        'flex-shrink-0',
        isMobile ? 'w-full fixed bottom-0 left-0 right-0' : `w-[${layout.hudWidth}px]`,
        isMobile ? 'h-[40vh]' : 'h-full',
        isMobile ? 'z-40' : '',
      ].join(' '),
    };
  }, [layout]);

  return {
    layout,
    hudVisible,
    sidebarVisible,
    toggleHUD,
    toggleSidebar,
    setHUD,
    setSidebar,
    getResponsiveClasses,
    breakpoints: BREAKPOINTS,
  };
}

export type UseResponsiveLayoutReturn = ReturnType<typeof useResponsiveLayout>;

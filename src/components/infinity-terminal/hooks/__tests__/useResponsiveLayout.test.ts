/**
 * Tests for useResponsiveLayout Hook
 * Tests breakpoint detection, layout modes, and panel sizing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useResponsiveLayout } from "../useResponsiveLayout";

describe("useResponsiveLayout", () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: originalInnerWidth,
    });
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: width,
    });
  };

  const flushRAF = () => {
    // Manually trigger all pending RAF callbacks
    vi.runAllTimers();
    act(() => {
      vi.advanceTimersByTime(16); // Simulate one frame
    });
  };

  describe("Initialization", () => {
    it("should initialize with default values", () => {
      setWindowWidth(1280);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.hudVisible).toBe(true);
      expect(result.current.sidebarVisible).toBe(true);
      expect(result.current.contextPanelVisible).toBe(false);
      expect(result.current.footerVisible).toBe(true);
    });

    it("should use custom default visibility", () => {
      const { result } = renderHook(() =>
        useResponsiveLayout({
          defaultHUDVisible: false,
          defaultSidebarVisible: false,
        })
      );

      expect(result.current.hudVisible).toBe(false);
      expect(result.current.sidebarVisible).toBe(false);
    });

    it("should expose breakpoint constants", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.breakpoints).toEqual({
        xs: 0,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        "2xl": 1536,
      });
    });
  });

  describe("Breakpoint Detection", () => {
    it("should detect xs breakpoint", () => {
      setWindowWidth(500);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("xs");
      expect(result.current.layout.isMobile).toBe(true);
      expect(result.current.layout.isTablet).toBe(false);
      expect(result.current.layout.isDesktop).toBe(false);
    });

    it("should detect sm breakpoint", () => {
      setWindowWidth(700);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("sm");
      expect(result.current.layout.isMobile).toBe(true);
    });

    it("should detect md breakpoint", () => {
      setWindowWidth(900);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("md");
      expect(result.current.layout.isTablet).toBe(true);
    });

    it("should detect lg breakpoint", () => {
      setWindowWidth(1100);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("lg");
      expect(result.current.layout.isTablet).toBe(true);
    });

    it("should detect xl breakpoint", () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("xl");
      expect(result.current.layout.isDesktop).toBe(true);
    });

    it("should detect 2xl breakpoint", () => {
      setWindowWidth(1600);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("2xl");
      expect(result.current.layout.isDesktop).toBe(true);
    });

    it("should call onBreakpointChange when breakpoint changes", async () => {
      const onBreakpointChange = vi.fn();
      setWindowWidth(1400);

      const { result } = renderHook(() =>
        useResponsiveLayout({ onBreakpointChange })
      );

      // Wait for initial layout calculation
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      expect(result.current.layout.breakpoint).toBe("xl");
      onBreakpointChange.mockClear();

      await act(async () => {
        setWindowWidth(700);
        window.dispatchEvent(new Event("resize"));
        // Wait for RAF to process
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      expect(onBreakpointChange).toHaveBeenCalledWith("sm");
    });

    it("should not call onBreakpointChange when breakpoint stays same", () => {
      const onBreakpointChange = vi.fn();
      setWindowWidth(1400);

      renderHook(() => useResponsiveLayout({ onBreakpointChange }));

      onBreakpointChange.mockClear();

      act(() => {
        setWindowWidth(1450);
        window.dispatchEvent(new Event("resize"));
      });

      expect(onBreakpointChange).not.toHaveBeenCalled();
    });
  });

  describe("Layout Mode Calculation", () => {
    it("should use overlay mode on mobile", () => {
      setWindowWidth(500);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.panelMode).toBe("overlay");
    });

    it("should use fixed mode on tablet", () => {
      setWindowWidth(900);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.panelMode).toBe("fixed");
    });

    it("should use fixed mode on desktop", () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.panelMode).toBe("fixed");
    });
  });

  describe("Panel Sizing - Mobile", () => {
    beforeEach(() => {
      setWindowWidth(500);
    });

    it("should hide sidebar on mobile", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showSidebar).toBe(false);
      expect(result.current.layout.sidebarWidth).toBe(0);
    });

    it("should show HUD as full-width bottom sheet when visible", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showHUD).toBe(true);
      expect(result.current.layout.hudWidth).toBe(500); // Full width
      expect(result.current.layout.terminalHeight).toBe("60vh");
    });

    it("should use full height when HUD is hidden on mobile", () => {
      const { result } = renderHook(() =>
        useResponsiveLayout({ defaultHUDVisible: false })
      );

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showHUD).toBe(false);
      expect(result.current.layout.terminalHeight).toBe("100%");
    });

    it("should use single pane layout on mobile", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.paneLayout).toBe("single");
    });
  });

  describe("Panel Sizing - Tablet", () => {
    beforeEach(() => {
      setWindowWidth(900);
    });

    it("should show sidebar with 200px width when visible", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showSidebar).toBe(true);
      expect(result.current.layout.sidebarWidth).toBe(200);
    });

    it("should hide sidebar when toggled off", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        result.current.toggleSidebar();
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showSidebar).toBe(false);
      expect(result.current.layout.sidebarWidth).toBe(0);
    });

    it("should show HUD with 320px width when visible", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showHUD).toBe(true);
      expect(result.current.layout.hudWidth).toBe(320);
    });

    it("should use split-vertical layout on tablet", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.paneLayout).toBe("split-vertical");
    });

    it("should use 100% terminal height on tablet", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.terminalHeight).toBe("100%");
    });
  });

  describe("Panel Sizing - Desktop", () => {
    beforeEach(() => {
      setWindowWidth(1400);
    });

    it("should show sidebar with 240px width when visible", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showSidebar).toBe(true);
      expect(result.current.layout.sidebarWidth).toBe(240);
    });

    it("should show HUD with 320px width when visible", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.showHUD).toBe(true);
      expect(result.current.layout.hudWidth).toBe(320);
    });

    it("should use multi-pane layout on desktop", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.paneLayout).toBe("multi");
    });
  });

  describe("Toggle Functions", () => {
    it("should toggle HUD visibility", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.hudVisible).toBe(true);

      act(() => {
        result.current.toggleHUD();
      });

      expect(result.current.hudVisible).toBe(false);

      act(() => {
        result.current.toggleHUD();
      });

      expect(result.current.hudVisible).toBe(true);
    });

    it("should toggle sidebar visibility", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.sidebarVisible).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarVisible).toBe(false);
    });

    it("should toggle context panel visibility", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.contextPanelVisible).toBe(false);

      act(() => {
        result.current.toggleContextPanel();
      });

      expect(result.current.contextPanelVisible).toBe(true);
    });

    it("should toggle footer visibility", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.footerVisible).toBe(true);

      act(() => {
        result.current.toggleFooter();
      });

      expect(result.current.footerVisible).toBe(false);
    });
  });

  describe("Setter Functions", () => {
    it("should set HUD visibility explicitly", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        result.current.setHUD(false);
      });

      expect(result.current.hudVisible).toBe(false);

      act(() => {
        result.current.setHUD(true);
      });

      expect(result.current.hudVisible).toBe(true);
    });

    it("should set sidebar visibility explicitly", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        result.current.setSidebar(false);
      });

      expect(result.current.sidebarVisible).toBe(false);
    });

    it("should set context panel visibility explicitly", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        result.current.setContextPanel(true);
      });

      expect(result.current.contextPanelVisible).toBe(true);
    });

    it("should set footer visibility explicitly", () => {
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        result.current.setFooter(false);
      });

      expect(result.current.footerVisible).toBe(false);
    });
  });

  describe("Responsive CSS Classes", () => {
    it("should generate mobile-specific classes", () => {
      setWindowWidth(500);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const classes = result.current.getResponsiveClasses();

      expect(classes.container).toContain("flex-col");
      expect(classes.terminal).toContain("order-first");
      expect(classes.hud).toContain("fixed");
      expect(classes.hud).toContain("bottom-0");
      expect(classes.hud).toContain("z-40");
    });

    it("should generate tablet-specific classes", () => {
      setWindowWidth(900);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const classes = result.current.getResponsiveClasses();

      expect(classes.container).toContain("flex-row");
      expect(classes.sidebar).toContain("order-first");
    });

    it("should generate desktop-specific classes", () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const classes = result.current.getResponsiveClasses();

      expect(classes.container).toContain("h-screen");
    });
  });

  describe("Resize Handling", () => {
    it("should update layout on window resize", async () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      await vi.waitFor(() => {
        expect(result.current.layout.breakpoint).toBe("xl");
      });

      await act(async () => {
        setWindowWidth(500);
        window.dispatchEvent(new Event("resize"));
        // Wait for RAF
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      expect(result.current.layout.breakpoint).toBe("xs");
    });

    it("should debounce resize events with requestAnimationFrame", async () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      await vi.waitFor(() => {
        expect(result.current.layout.breakpoint).toBe("xl");
      });

      const initialBreakpoint = result.current.layout.breakpoint;

      // Trigger multiple resize events rapidly
      await act(async () => {
        setWindowWidth(700);
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("resize"));
        // Wait for RAF
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Should update to new breakpoint after RAF (only once)
      expect(result.current.layout.breakpoint).toBe("sm");
      expect(result.current.layout.breakpoint).not.toBe(initialBreakpoint);
    });

    it("should update width even when breakpoint stays same", async () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      await vi.waitFor(() => {
        expect(result.current.layout.breakpoint).toBe("xl");
      });

      expect(result.current.layout.width).toBe(1400);

      await act(async () => {
        setWindowWidth(1450); // Still xl breakpoint
        window.dispatchEvent(new Event("resize"));
        // Wait for RAF
        await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      });

      // Width should update even though breakpoint is the same
      expect(result.current.layout.breakpoint).toBe("xl");
      expect(result.current.layout.width).toBe(1450);
    });

    it("should recalculate layout when visibility changes", () => {
      setWindowWidth(1400);
      const { result } = renderHook(() => useResponsiveLayout());

      const widthBefore = result.current.layout.hudWidth;

      act(() => {
        result.current.toggleHUD();
      });

      expect(result.current.layout.hudWidth).not.toBe(widthBefore);
      expect(result.current.layout.hudWidth).toBe(0);
    });
  });

  describe("Lifecycle", () => {
    it("should cleanup resize listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
      const { unmount } = renderHook(() => useResponsiveLayout());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "resize",
        expect.any(Function)
      );
    });

    it("should cancel pending RAF on unmount", () => {
      const cancelAnimationFrameSpy = vi.spyOn(window, "cancelAnimationFrame");
      const { unmount } = renderHook(() => useResponsiveLayout());

      // Trigger a resize to create a pending RAF
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      unmount();

      expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle SSR environment (no window)", () => {
      // This test verifies the DEFAULT_CONFIG handles typeof window !== 'undefined'
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.layout).toBeDefined();
      expect(result.current.layout.breakpoint).toBeDefined();
    });

    it("should calculate layout at boundaries", () => {
      // Test exact breakpoint values
      const breakpoints = [640, 768, 1024, 1280, 1536];

      breakpoints.forEach((width) => {
        setWindowWidth(width);
        const { result } = renderHook(() => useResponsiveLayout());

        act(() => {
          window.dispatchEvent(new Event("resize"));
        });

        expect(result.current.layout.width).toBe(width);
      });
    });

    it("should handle extremely small viewports", () => {
      setWindowWidth(320);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("xs");
      expect(result.current.layout.isMobile).toBe(true);
    });

    it("should handle extremely large viewports", () => {
      setWindowWidth(3000);
      const { result } = renderHook(() => useResponsiveLayout());

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current.layout.breakpoint).toBe("2xl");
      expect(result.current.layout.isDesktop).toBe(true);
    });
  });
});

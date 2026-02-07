/**
 * Tests for useResizablePanels Hook
 *
 * Tests drag-to-resize panel width management with localStorage persistence.
 * Default layout: 25% | 50% | 25%
 *
 * Test coverage includes:
 * - Initial state and defaults
 * - localStorage persistence (load and save)
 * - Drag start/stop behavior
 * - Mouse move calculations and constraints
 * - Min/max width enforcement
 * - Center panel minimum width
 * - Window resize event dispatching
 * - Reset functionality
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useResizablePanels } from "../useResizablePanels";

const STORAGE_KEY = "nxtg-forge-panel-widths";

describe("useResizablePanels", () => {
  let mockContainer: HTMLDivElement;
  let resizeEventSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Create mock container element
    mockContainer = document.createElement("div");
    Object.defineProperty(mockContainer, "getBoundingClientRect", {
      value: vi.fn(() => ({
        left: 0,
        width: 1000,
        top: 0,
        right: 1000,
        bottom: 500,
        height: 500,
      })),
    });

    // Spy on window resize events
    resizeEventSpy = vi.fn();
    window.addEventListener("resize", resizeEventSpy);

    // Reset document.body styles
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.removeEventListener("resize", resizeEventSpy);
  });

  describe("Initialization", () => {
    it("initializes with default widths", () => {
      const { result } = renderHook(() => useResizablePanels());

      expect(result.current.leftWidth).toBe(25);
      expect(result.current.rightWidth).toBe(25);
      expect(result.current.isDragging).toBe(false);
    });

    it("accepts custom default widths", () => {
      const { result } = renderHook(() =>
        useResizablePanels({
          defaultLeft: 30,
          defaultRight: 20,
        })
      );

      expect(result.current.leftWidth).toBe(30);
      expect(result.current.rightWidth).toBe(20);
    });

    it("provides container ref", () => {
      const { result } = renderHook(() => useResizablePanels());

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull();
    });

    it("provides drag start handlers", () => {
      const { result } = renderHook(() => useResizablePanels());

      expect(typeof result.current.startLeftDrag).toBe("function");
      expect(typeof result.current.startRightDrag).toBe("function");
    });

    it("provides reset function", () => {
      const { result } = renderHook(() => useResizablePanels());

      expect(typeof result.current.resetWidths).toBe("function");
    });
  });

  describe("localStorage persistence", () => {
    it("loads widths from localStorage on mount", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ left: 35, right: 30 })
      );

      const { result } = renderHook(() => useResizablePanels());

      expect(result.current.leftWidth).toBe(35);
      expect(result.current.rightWidth).toBe(30);
    });

    it("saves widths to localStorage when changed", async () => {
      const { result } = renderHook(() => useResizablePanels());

      // Assign container ref
      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Start drag
      act(() => {
        const mockEvent = new MouseEvent("mousedown", {
          clientX: 250,
        }) as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Move mouse to 300px (30%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 300,
        });
        window.dispatchEvent(moveEvent);
      });

      // End drag
      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      // Check localStorage
      await waitFor(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed.left).toBe(30);
      });
    });

    it("ignores corrupt localStorage data", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json");

      const { result } = renderHook(() =>
        useResizablePanels({
          defaultLeft: 25,
          defaultRight: 25,
        })
      );

      expect(result.current.leftWidth).toBe(25);
      expect(result.current.rightWidth).toBe(25);
    });

    it("ignores localStorage with invalid structure", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ left: "not a number", right: 25 })
      );

      const { result } = renderHook(() => useResizablePanels());

      expect(result.current.leftWidth).toBe(25);
      expect(result.current.rightWidth).toBe(25);
    });

    it("ignores localStorage with missing fields", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ left: 30 }) // missing 'right'
      );

      const { result } = renderHook(() => useResizablePanels());

      expect(result.current.leftWidth).toBe(25);
      expect(result.current.rightWidth).toBe(25);
    });
  });

  describe("Drag behavior - left panel", () => {
    it("starts left drag correctly", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      expect(result.current.isDragging).toBe(true);
      expect(document.body.style.cursor).toBe("col-resize");
      expect(document.body.style.userSelect).toBe("none");
    });

    it("prevents default on drag start", () => {
      const { result } = renderHook(() => useResizablePanels());

      const mockEvent = new MouseEvent("mousedown") as any;
      mockEvent.preventDefault = vi.fn();

      act(() => {
        result.current.startLeftDrag(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("updates left width on mouse move", () => {
      const { result } = renderHook(() => useResizablePanels());

      // Assign container
      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      // Start drag
      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Move to 300px = 30% of 1000px container
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 300,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.leftWidth).toBe(30);
    });

    it("respects minimum width constraint", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ minWidth: 15 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Try to drag to 50px = 5% (below minWidth of 15%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 50,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.leftWidth).toBe(15);
    });

    it("respects maximum width constraint", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ maxWidth: 40 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Try to drag to 500px = 50% (above maxWidth of 40%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 500,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.leftWidth).toBe(40);
    });

    it("respects minimum center panel width", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ minCenter: 30 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Try to drag to 500px = 50%, but maxWidth (45%) limits it to 45%
      // With right=25%, center would be 30% (exactly minCenter 30%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 500,
        });
        window.dispatchEvent(moveEvent);
      });

      // Should be clamped to maxWidth 45% (default), resulting in center=30%
      expect(result.current.leftWidth).toBe(45);
      const centerWidth = 100 - result.current.leftWidth - result.current.rightWidth;
      expect(centerWidth).toBe(30);
    });

    it("ends drag on mouse up", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      expect(result.current.isDragging).toBe(false);
      expect(document.body.style.cursor).toBe("");
      expect(document.body.style.userSelect).toBe("");
    });
  });

  describe("Drag behavior - right panel", () => {
    it("starts right drag correctly", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startRightDrag(mockEvent);
      });

      expect(result.current.isDragging).toBe(true);
      expect(document.body.style.cursor).toBe("col-resize");
    });

    it("updates right width on mouse move", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startRightDrag(mockEvent);
      });

      // Move to 700px = 70% from left, so 30% from right
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 700,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.rightWidth).toBe(30);
    });

    it("respects minimum width for right panel", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ minWidth: 20 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startRightDrag(mockEvent);
      });

      // Try to drag to 950px = 5% from right (below minWidth 20%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 950,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.rightWidth).toBe(20);
    });

    it("respects maximum width for right panel", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ maxWidth: 35 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startRightDrag(mockEvent);
      });

      // Try to drag to 500px = 50% from right (above maxWidth 35%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 500,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.rightWidth).toBe(35);
    });

    it("respects minimum center width for right panel", () => {
      const { result } = renderHook(() =>
        useResizablePanels({ minCenter: 40 })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startRightDrag(mockEvent);
      });

      // Try to drag to 400px = 60% from right, but with left=25%, center would be 15%
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 400,
        });
        window.dispatchEvent(moveEvent);
      });

      // Should stay at initial 25%
      expect(result.current.rightWidth).toBe(25);
    });
  });

  describe("Window resize events", () => {
    it("dispatches resize event on drag move (throttled)", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      resizeEventSpy.mockClear();

      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 300,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(resizeEventSpy).toHaveBeenCalled();
    });

    it("dispatches resize event on drag end", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      resizeEventSpy.mockClear();

      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      expect(resizeEventSpy).toHaveBeenCalled();
    });

    it("dispatches resize event on reset", () => {
      const { result } = renderHook(() => useResizablePanels());

      resizeEventSpy.mockClear();

      act(() => {
        result.current.resetWidths();
      });

      expect(resizeEventSpy).toHaveBeenCalled();
    });
  });

  describe("Reset functionality", () => {
    it("resets to default widths", () => {
      const { result } = renderHook(() =>
        useResizablePanels({
          defaultLeft: 30,
          defaultRight: 20,
        })
      );

      // Change widths
      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 400,
        });
        window.dispatchEvent(moveEvent);
      });

      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      // Reset
      act(() => {
        result.current.resetWidths();
      });

      expect(result.current.leftWidth).toBe(30);
      expect(result.current.rightWidth).toBe(20);
    });

    it("saves reset widths to localStorage", async () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        result.current.resetWidths();
      });

      await waitFor(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(saved!);
        expect(parsed.left).toBe(25);
        expect(parsed.right).toBe(25);
      });
    });
  });

  describe("Edge cases", () => {
    it("ignores mouse move when not dragging", () => {
      const { result } = renderHook(() => useResizablePanels());

      const initialLeft = result.current.leftWidth;

      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 500,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.leftWidth).toBe(initialLeft);
    });

    it("ignores mouse move when container ref is not set", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      const initialLeft = result.current.leftWidth;

      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 500,
        });
        window.dispatchEvent(moveEvent);
      });

      expect(result.current.leftWidth).toBe(initialLeft);
    });

    it("handles mouse up when not dragging gracefully", () => {
      const { result } = renderHook(() => useResizablePanels());

      act(() => {
        const upEvent = new MouseEvent("mouseup");
        window.dispatchEvent(upEvent);
      });

      expect(result.current.isDragging).toBe(false);
    });

    it("cleans up event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useResizablePanels());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousemove",
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mouseup",
        expect.any(Function)
      );
    });

    it("handles zero-width container gracefully", () => {
      const { result } = renderHook(() => useResizablePanels());

      const zeroWidthContainer = document.createElement("div");
      Object.defineProperty(zeroWidthContainer, "getBoundingClientRect", {
        value: vi.fn(() => ({
          left: 0,
          width: 0,
          top: 0,
          right: 0,
          bottom: 0,
          height: 0,
        })),
      });

      act(() => {
        result.current.containerRef.current = zeroWidthContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Should not crash
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 100,
        });
        window.dispatchEvent(moveEvent);
      });
    });
  });

  describe("Calculated center width", () => {
    it("maintains correct center width calculation", () => {
      const { result } = renderHook(() => useResizablePanels());

      const centerWidth = 100 - result.current.leftWidth - result.current.rightWidth;
      expect(centerWidth).toBe(50); // 100 - 25 - 25
    });

    it("prevents center from shrinking below minimum", () => {
      const { result } = renderHook(() =>
        useResizablePanels({
          defaultLeft: 25,
          defaultRight: 25,
          minCenter: 40,
        })
      );

      act(() => {
        result.current.containerRef.current = mockContainer;
      });

      act(() => {
        const mockEvent = new MouseEvent("mousedown") as any;
        mockEvent.preventDefault = vi.fn();
        result.current.startLeftDrag(mockEvent);
      });

      // Try to expand left to 40%, which would make center 35% (below minCenter 40%)
      act(() => {
        const moveEvent = new MouseEvent("mousemove", {
          clientX: 400,
        });
        window.dispatchEvent(moveEvent);
      });

      // Should reject the change and stay at 25%
      expect(result.current.leftWidth).toBe(25);
      const centerWidth = 100 - result.current.leftWidth - result.current.rightWidth;
      expect(centerWidth).toBe(50); // 100 - 25 - 25
    });
  });
});

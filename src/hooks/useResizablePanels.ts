/**
 * useResizablePanels - Drag-to-resize panel width management
 *
 * Manages percentage-based column widths with drag handles.
 * Default layout: 25% | 50% | 25%
 * Persists user's preferred widths to localStorage.
 */
import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "nxtg-forge-panel-widths";

interface PanelWidths {
  left: number;
  right: number;
}

interface UseResizablePanelsOptions {
  defaultLeft?: number;
  defaultRight?: number;
  minWidth?: number;
  maxWidth?: number;
  minCenter?: number;
}

export function useResizablePanels({
  defaultLeft = 25,
  defaultRight = 25,
  minWidth = 10,
  maxWidth = 45,
  minCenter = 20,
}: UseResizablePanelsOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"left" | "right" | null>(null);
  const lastResizeRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const [widths, setWidths] = useState<PanelWidths>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.left === "number" &&
          typeof parsed.right === "number"
        ) {
          return { left: parsed.left, right: parsed.right };
        }
      }
    } catch {
      /* ignore corrupt data */
    }
    return { left: defaultLeft, right: defaultRight };
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  const startDrag = useCallback(
    (side: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = side;
      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;

      setWidths((prev) => {
        if (draggingRef.current === "left") {
          const newLeft = Math.max(minWidth, Math.min(maxWidth, pct));
          if (100 - newLeft - prev.right < minCenter) return prev;
          return { ...prev, left: newLeft };
        } else {
          const newRight = Math.max(minWidth, Math.min(maxWidth, 100 - pct));
          if (100 - prev.left - newRight < minCenter) return prev;
          return { ...prev, right: newRight };
        }
      });

      // Throttled resize dispatch for terminal fit
      const now = Date.now();
      if (now - lastResizeRef.current > 60) {
        window.dispatchEvent(new Event("resize"));
        lastResizeRef.current = now;
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.dispatchEvent(new Event("resize"));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth, minCenter]);

  const resetWidths = useCallback(() => {
    setWidths({ left: defaultLeft, right: defaultRight });
    window.dispatchEvent(new Event("resize"));
  }, [defaultLeft, defaultRight]);

  return {
    leftWidth: widths.left,
    rightWidth: widths.right,
    containerRef,
    startLeftDrag: startDrag("left"),
    startRightDrag: startDrag("right"),
    isDragging,
    resetWidths,
  };
}

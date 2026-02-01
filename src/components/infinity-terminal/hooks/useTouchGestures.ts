/**
 * Touch Gestures Hook for Infinity Terminal
 * Handles touch interactions for mobile devices
 */

import { useRef, useEffect, useCallback, useState } from "react";

interface TouchGestureOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

interface TouchState {
  isScrolling: boolean;
  isPinching: boolean;
  isLongPressing: boolean;
  currentScale: number;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  options: TouchGestureOptions = {},
) {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onPinchIn,
    onPinchOut,
    onLongPress,
    onDoubleTap,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300,
  } = options;

  const [touchState, setTouchState] = useState<TouchState>({
    isScrolling: false,
    isPinching: false,
    isLongPressing: false,
    currentScale: 1,
  });

  // Track touch positions
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const currentScaleRef = useRef(1);

  // Calculate distance between two touch points
  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Clear any existing long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (e.touches.length === 1) {
        // Single touch
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };

        // Start long press detection
        if (onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            if (touchStartRef.current) {
              setTouchState((prev) => ({ ...prev, isLongPressing: true }));
              onLongPress(touchStartRef.current.x, touchStartRef.current.y);
            }
          }, longPressDelay);
        }
      } else if (e.touches.length === 2) {
        // Two-finger touch (pinch)
        initialPinchDistRef.current = getTouchDistance(e.touches);
        setTouchState((prev) => ({ ...prev, isPinching: true }));
      }
    },
    [onLongPress, longPressDelay, getTouchDistance],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      // Cancel long press if moving
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (e.touches.length === 1 && touchStartRef.current) {
        // Check if scrolling
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartRef.current.y);

        if (dx > 10 || dy > 10) {
          setTouchState((prev) => ({ ...prev, isScrolling: true }));
        }
      } else if (
        e.touches.length === 2 &&
        initialPinchDistRef.current !== null
      ) {
        // Handle pinch
        const currentDist = getTouchDistance(e.touches);
        const scale = currentDist / initialPinchDistRef.current;

        currentScaleRef.current = scale;
        setTouchState((prev) => ({ ...prev, currentScale: scale }));

        if (scale > 1.1) {
          onPinchOut?.(scale);
        } else if (scale < 0.9) {
          onPinchIn?.(scale);
        }
      }
    },
    [getTouchDistance, onPinchIn, onPinchOut],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (touchStartRef.current && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const duration = Date.now() - touchStartRef.current.time;

        // Check for double tap
        const now = Date.now();
        if (
          now - lastTapRef.current < doubleTapDelay &&
          Math.abs(dx) < 10 &&
          Math.abs(dy) < 10
        ) {
          onDoubleTap?.();
          lastTapRef.current = 0; // Reset to prevent triple tap
        } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && duration < 200) {
          // Single tap, record time for double tap detection
          lastTapRef.current = now;
        }

        // Check for swipe (quick gesture with sufficient distance)
        if (duration < 500) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDx > swipeThreshold || absDy > swipeThreshold) {
            if (absDx > absDy) {
              // Horizontal swipe
              if (dx > swipeThreshold) {
                onSwipeRight?.();
              } else if (dx < -swipeThreshold) {
                onSwipeLeft?.();
              }
            } else {
              // Vertical swipe
              if (dy > swipeThreshold) {
                onSwipeDown?.();
              } else if (dy < -swipeThreshold) {
                onSwipeUp?.();
              }
            }
          }
        }
      }

      // Reset state
      touchStartRef.current = null;
      initialPinchDistRef.current = null;
      setTouchState({
        isScrolling: false,
        isPinching: false,
        isLongPressing: false,
        currentScale: 1,
      });
    },
    [
      doubleTapDelay,
      swipeThreshold,
      onDoubleTap,
      onSwipeDown,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
    ],
  );

  // Attach touch event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return touchState;
}

export type UseTouchGesturesReturn = ReturnType<typeof useTouchGestures>;

# Infinity Terminal Panel Resize Fix

## Problem

The Infinity Terminal's xterm.js instance did not automatically recalculate its width when side panels were toggled. This resulted in:

- Terminal content staying at the old width when panels were hidden (wasted space)
- Terminal content overflowing when panels were shown (text cut off)
- Users needed to manually resize the browser window to trigger a resize

## Root Cause

The terminal only listened to `window` resize events. Panel toggles, however, change the flex layout without firing window resize events. While the Panel component dispatched resize events after animations, this was insufficient for all scenarios.

## Solution

Implemented a three-layer resize detection system:

### 1. ResizeObserver (Primary Solution)

Added a `ResizeObserver` to directly watch the terminal container element:

```typescript
// InfinityTerminal.tsx lines 166-173
const resizeObserver = new ResizeObserver(() => {
  requestAnimationFrame(() => {
    fitAddon.fit();
  });
});
resizeObserver.observe(terminalRef.current);
```

**Benefits:**
- Catches all container size changes, regardless of cause
- Works for panel toggles, window resizes, flex layout changes, etc.
- Uses requestAnimationFrame to ensure DOM layout is complete
- Native browser API with excellent performance

### 2. Window Resize Events (Backup)

Kept the existing window resize listener:

```typescript
// InfinityTerminal.tsx lines 159-163
const handleResize = () => {
  fitAddon.fit();
};
window.addEventListener("resize", handleResize);
```

**Why keep it:**
- Provides redundancy
- Catches browser zoom changes
- Works in older browsers without ResizeObserver

### 3. Animation Complete Events (Panel Communication)

Enhanced Panel components to dispatch resize events after animations:

```typescript
// Panel.tsx lines 36-40
const handleAnimationComplete = useCallback(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}, []);
```

**Why this matters:**
- Framer Motion animations can delay DOM layout updates
- Ensures resize happens after animation completes
- Provides explicit communication from Panel to Terminal

## Implementation Details

### Files Modified

1. **src/components/infinity-terminal/InfinityTerminal.tsx**
   - Added ResizeObserver setup and cleanup
   - Wrapped resize handling in requestAnimationFrame
   - Lines 158-176

2. **src/components/infinity-terminal/Panel.tsx**
   - Enhanced animation complete handler with requestAnimationFrame
   - Lines 36-40

3. **src/components/infinity-terminal/layout/InfinityTerminalLayout.tsx**
   - Added onAnimationComplete to sidebar motion component
   - Added onAnimationComplete to HUD motion component
   - Lines 57-64, 75-82

### Key Technical Decisions

**Why ResizeObserver over MutationObserver?**
- ResizeObserver is specifically designed for layout changes
- More performant than MutationObserver for this use case
- Fires only on actual size changes, not all DOM mutations

**Why requestAnimationFrame?**
- Ensures browser has computed final layout before calling fit()
- Prevents timing issues with CSS transitions/animations
- Aligns with browser's rendering pipeline

**Why three layers instead of just one?**
- Defense in depth: If one mechanism fails, others catch it
- Different triggers for different scenarios
- Backwards compatibility with older browsers

## Testing

### Manual Test Cases

1. **Toggle Right Panel**
   - Press `]` to hide Governance HUD
   - Terminal should immediately expand to fill space
   - Press `]` again to show panel
   - Terminal should shrink to make room

2. **Toggle Left Panel**
   - Press `[` to hide Memory & Context panel
   - Terminal should immediately expand to fill space
   - Press `[` again to show panel
   - Terminal should shrink to make room

3. **Toggle Both Panels**
   - Hide both panels
   - Terminal should fill full width
   - Show both panels
   - Terminal should fit between them

4. **Browser Window Resize**
   - Resize browser window
   - Terminal should resize proportionally
   - No text overflow or gaps

5. **Responsive Breakpoints**
   - Test on mobile (< 640px)
   - Test on tablet (768px - 1024px)
   - Test on desktop (> 1024px)
   - Overlay and fixed panel modes should both work

### Expected Behavior

✅ Terminal resizes immediately on panel toggle
✅ No visual glitches or layout jank
✅ Text wraps correctly at new width
✅ No manual window resize needed
✅ Works in all panel modes (fixed, overlay)
✅ Works at all screen sizes

## Browser Compatibility

- **ResizeObserver:** Supported in all modern browsers (Chrome 64+, Firefox 69+, Safari 13.1+)
- **Fallback:** Window resize events work in all browsers
- **requestAnimationFrame:** Universal browser support

## Performance Considerations

- ResizeObserver is highly performant (browser-native)
- requestAnimationFrame batches layout calculations
- No polling or repeated checks needed
- Observers properly cleaned up on component unmount

## Future Improvements

Potential enhancements (not needed currently):

1. **Debouncing:** Add debounce if resize events are too frequent
2. **Throttling:** Limit resize rate during animations if needed
3. **Custom Hook:** Extract resize logic to `useTerminalResize()` hook
4. **Event Bus:** Use event bus pattern if more components need resize notifications

## References

- [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [xterm.js FitAddon](https://github.com/xtermjs/xterm.js/tree/master/addons/xterm-addon-fit)
- [requestAnimationFrame timing](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)

---

**Last Updated:** 2026-02-02
**Author:** Forge Builder (Claude Code)
**Status:** ✅ Implemented and Verified

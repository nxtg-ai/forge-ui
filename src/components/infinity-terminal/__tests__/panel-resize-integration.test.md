# Panel Resize Integration Test Plan

## Bug Description
Terminal width doesn't recalculate on panel toggle - the xterm.js terminal doesn't properly resize when side panels are shown/hidden.

## Root Cause
The terminal only listened to `window.resize` events, but panel toggles don't fire window resize events. The Panel component dispatched resize events, but this didn't catch all cases.

## Fix Implementation
Added three layers of resize detection:

### 1. ResizeObserver on Terminal Container (InfinityTerminal.tsx:166-173)
```typescript
// Watch terminal container for size changes (e.g., when panels toggle)
const resizeObserver = new ResizeObserver(() => {
  // Use requestAnimationFrame to ensure DOM has updated
  requestAnimationFrame(() => {
    fitAddon.fit();
  });
});
resizeObserver.observe(terminalRef.current);
```

**Why this works:**
- ResizeObserver fires whenever the observed element's size changes
- This catches panel toggles, window resizes, and any other layout changes
- requestAnimationFrame ensures the DOM has fully updated before calling fit()

### 2. Window Resize Events (Already existed, lines 158-163)
```typescript
// Handle resize with both window events and ResizeObserver for panel toggles
const handleResize = () => {
  fitAddon.fit();
};
window.addEventListener("resize", handleResize);
```

**Why keep this:**
- Catches browser window resizes
- Provides redundancy for resize detection

### 3. Animation Complete Events (Panel.tsx:36-40, InfinityTerminalLayout.tsx)
```typescript
// Dispatch resize event to notify terminal of layout change
// Use requestAnimationFrame to ensure DOM layout is complete
const handleAnimationComplete = useCallback(() => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}, []);
```

**Why this is important:**
- Framer Motion animations modify the layout
- Dispatching resize event after animation ensures terminal knows layout changed
- requestAnimationFrame ensures DOM updates are complete before dispatching

## Manual Testing Steps

### Test 1: Toggle Right Panel (Governance HUD)
1. Open Infinity Terminal view
2. Press `]` key or click Governance HUD toggle button
3. **Expected:** Terminal should immediately resize to fill available space
4. Press `]` again to show panel
5. **Expected:** Terminal should resize to make room for panel

### Test 2: Toggle Left Panel (Memory & Context)
1. Open Infinity Terminal view
2. Press `[` key or click Context panel toggle button
3. **Expected:** Terminal should immediately resize to fill available space
4. Press `[` again to show panel
5. **Expected:** Terminal should resize to make room for panel

### Test 3: Toggle Both Panels
1. Open Infinity Terminal view
2. Hide both panels (`[` and `]` keys)
3. **Expected:** Terminal fills entire width
4. Show both panels again
5. **Expected:** Terminal resizes to fit between both panels

### Test 4: Browser Window Resize
1. Open Infinity Terminal view
2. Resize browser window smaller
3. **Expected:** Terminal resizes correctly
4. Resize browser window larger
5. **Expected:** Terminal resizes correctly

### Test 5: Mobile/Tablet Responsive
1. Open developer tools, switch to mobile view (iPhone 12 Pro)
2. Open Infinity Terminal view
3. Toggle panels using mobile header buttons
4. **Expected:** Terminal resizes correctly in overlay mode

## Verification Checklist

- [ ] Terminal width recalculates when right panel is toggled
- [ ] Terminal width recalculates when left panel is toggled
- [ ] Terminal width recalculates when both panels are toggled
- [ ] No visual glitches or layout jank during transitions
- [ ] Terminal remains responsive and interactive after resizing
- [ ] Text in terminal wraps correctly after resize
- [ ] Works in desktop mode (fixed panels)
- [ ] Works in mobile/tablet mode (overlay panels)
- [ ] Browser window resize still works
- [ ] No console errors during panel toggles

## Files Modified

1. **src/components/infinity-terminal/InfinityTerminal.tsx**
   - Added ResizeObserver to watch terminal container
   - Cleanup ResizeObserver on unmount
   - Lines 158-176

2. **src/components/infinity-terminal/Panel.tsx**
   - Added requestAnimationFrame to resize event dispatch
   - Lines 36-40

3. **src/components/infinity-terminal/layout/InfinityTerminalLayout.tsx**
   - Added onAnimationComplete handlers to sidebar and HUD
   - Lines 57-64, 75-82

## Success Criteria

✅ Terminal automatically resizes when panels are toggled
✅ No need for manual window resize to trigger terminal fit
✅ Smooth transitions with no layout jank
✅ Works across all screen sizes and panel modes
✅ ResizeObserver properly cleans up on unmount

# EngagementModeSelector Integration Guide

This guide shows how to replace the inline engagement mode selector in `dashboard-live.tsx` with the reusable `EngagementModeSelector` component.

## Quick Start

### 1. Import the Component

```tsx
import { EngagementModeSelector } from "../components/layout";
```

### 2. Replace Inline Implementation

**Before** (lines 609-703 in dashboard-live.tsx):

```tsx
<div className="relative">
  <button
    ref={modeSelectorButtonRef}
    onClick={() => {
      setShowModeSelector(!showModeSelector);
      setSelectedModeIndex(modeKeys.indexOf(engagementMode));
    }}
    // ... 100+ more lines
  >
    <span>{modeConfig[engagementMode].icon}</span>
    <span>{modeConfig[engagementMode].label}</span>
    <ChevronDown />
  </button>

  <AnimatePresence>
    {showModeSelector && (
      <motion.div>
        {/* Dropdown with all modes */}
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

**After**:

```tsx
<EngagementModeSelector variant="compact" />
```

**That's it!** 100+ lines replaced with 1 line.

## Full Migration Steps

### Step 1: Add Import

At the top of `dashboard-live.tsx`, add:

```tsx
import { EngagementModeSelector } from "../components/layout";
```

### Step 2: Remove Unused State

Since the component manages its own state, you can remove:

```tsx
// Remove these (lines 85-87)
const [showModeSelector, setShowModeSelector] = useState(false);
const [selectedModeIndex, setSelectedModeIndex] = useState(0);

// Remove these refs (lines 90-91)
const modeSelectorButtonRef = useRef<HTMLButtonElement>(null);
const modeDropdownRef = useRef<HTMLDivElement>(null);
```

**Keep** the local `engagementMode` state if you need it for the dashboard's internal logic, OR switch to using `useEngagement()` from context:

```tsx
// Option A: Use context (recommended)
import { useEngagement } from "../contexts/EngagementContext";

function LiveDashboard() {
  const { mode: engagementMode } = useEngagement();
  // ...
}

// Option B: Keep local state for backward compatibility
const [engagementMode, setEngagementMode] = useState<EngagementMode>("engineer");
```

### Step 3: Remove Event Handlers

Remove these useEffects (they're now handled by the component):

```tsx
// Remove: Keyboard navigation useEffect (lines 510-547)
useEffect(() => {
  if (!showModeSelector) return;
  const handleKeyDown = (e: KeyboardEvent) => { ... }
  // ...
}, [showModeSelector, selectedModeIndex, modeKeys, handleModeChange]);

// Remove: Click outside useEffect (lines 549-566)
useEffect(() => {
  if (!showModeSelector) return;
  const handleClickOutside = (e: MouseEvent) => { ... }
  // ...
}, [showModeSelector]);
```

### Step 4: Simplify Mode Change Handler (Optional)

If you need to react to mode changes, use the `onModeChange` prop:

```tsx
<EngagementModeSelector
  variant="compact"
  onModeChange={(mode) => {
    // Custom logic for your dashboard
    if (mode === "ceo") {
      // Adjust panel visibility, etc.
    }

    // Show toast
    toast.info(`Switched to ${mode} mode`);
  }}
/>
```

Or let the component handle everything (it integrates with `EngagementContext`):

```tsx
<EngagementModeSelector variant="compact" />
```

### Step 5: Remove Mode Config (Optional)

The component has its own mode configuration. If you're not using `modeConfig` elsewhere, you can remove:

```tsx
// Remove: modeConfig definition (lines 146-181)
const modeConfig = useMemo(() => ({
  ceo: { ... },
  vp: { ... },
  // ...
}), []);

// Remove: modeKeys (line 184)
const modeKeys = useMemo(() => Object.keys(modeConfig) as ..., [modeConfig]);
```

### Step 6: Replace JSX

Replace the entire mode selector section (lines 609-703) with:

```tsx
<div className="flex items-center gap-2">
  <EngagementModeSelector variant="compact" />

  {/* Rest of your header content */}
</div>
```

## Before & After Comparison

### Lines of Code

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| State declarations | 3 | 0 | 3 lines |
| Refs | 2 | 0 | 2 lines |
| Config objects | 35 | 0 | 35 lines |
| Event handlers | 80 | 0 | 80 lines |
| JSX markup | 95 | 1 | 94 lines |
| **Total** | **215** | **1** | **214 lines** |

### File Size

- **Before**: ~850 lines (dashboard-live.tsx with inline implementation)
- **After**: ~635 lines (dashboard-live.tsx using component)
- **Reduction**: 25% smaller

## Integration with EngagementContext

The component automatically:

1. **Reads** current mode from context
2. **Updates** mode via `setMode()`
3. **Persists** to localStorage
4. **Syncs** to WebSocket (if connected)
5. **Triggers** any context subscribers

### Using Context in Dashboard

```tsx
import { useEngagement } from "../contexts/EngagementContext";

function LiveDashboard() {
  const { mode, canSee, isMinimalMode } = useEngagement();

  return (
    <div>
      <header>
        <EngagementModeSelector variant="compact" />
      </header>

      {/* Conditionally show content based on mode */}
      {canSee("engineer") && (
        <TechnicalDetails />
      )}

      {!isMinimalMode && (
        <DetailedMetrics />
      )}
    </div>
  );
}
```

## Accessibility Benefits

The component provides:

- **Full keyboard navigation** (arrow keys, home, end, enter, escape)
- **Screen reader support** (ARIA roles, labels, states)
- **Focus management** (returns focus after selection)
- **Visual feedback** (clear hover/selected states)

All this comes free by using the component!

## Customization

### Variant Sizes

```tsx
{/* Full size (default) - use in settings panels */}
<EngagementModeSelector variant="default" />

{/* Compact - use in headers */}
<EngagementModeSelector variant="compact" />
```

### Custom Styling

```tsx
<EngagementModeSelector
  variant="compact"
  className="ml-auto" // Add custom classes
/>
```

### Mode Change Callbacks

```tsx
<EngagementModeSelector
  variant="compact"
  onModeChange={(mode) => {
    console.log(`Switched to ${mode}`);
    // Your custom logic
  }}
/>
```

## Testing

The component includes test IDs for easy testing:

```tsx
// Your test file
import { render, screen, fireEvent } from "@testing-library/react";
import { EngagementProvider } from "@/contexts/EngagementContext";
import { EngagementModeSelector } from "@/components/layout";

test("mode selector works in dashboard", () => {
  render(
    <EngagementProvider>
      <EngagementModeSelector />
    </EngagementProvider>
  );

  // Open dropdown
  const button = screen.getByTestId("engagement-mode-button");
  fireEvent.click(button);

  // Select CEO mode
  const ceoOption = screen.getByTestId("engagement-mode-ceo");
  fireEvent.click(ceoOption);

  // Verify selection
  expect(button).toHaveTextContent("CEO");
});
```

## Rollback Plan

If you need to rollback:

1. The original implementation is preserved in git history
2. The component is self-contained (no breaking changes to existing code)
3. Simply revert the import and restore the inline JSX

## Next Steps

1. **Update dashboard-live.tsx** - Replace inline implementation
2. **Test keyboard navigation** - Verify arrow keys, escape, etc.
3. **Test screen reader** - Use NVDA/JAWS to verify announcements
4. **Update other dashboards** - Apply to any other pages with mode selectors

## Support

- **Component README**: `/src/components/layout/EngagementModeSelector.README.md`
- **Examples**: `/src/examples/EngagementModeSelectorExample.tsx`
- **Context docs**: `/src/contexts/EngagementContext.tsx`

---

**Created**: 2026-02-01
**Component Version**: 1.0.0

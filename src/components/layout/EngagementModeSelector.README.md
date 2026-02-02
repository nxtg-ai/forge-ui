# EngagementModeSelector Component

A polished, accessible dropdown component for switching between engagement modes in the NXTG-Forge dashboard.

## Features

- **Full Keyboard Navigation**: Arrow keys, Enter, Escape, Home, End, Space
- **ARIA Compliance**: Complete screen reader support with roles, labels, and state
- **Click-Outside-to-Close**: Intuitive UX behavior
- **Focus Management**: Returns focus to trigger button after selection
- **Visual Feedback**: Clear selected and hover states
- **Compact Variant**: Optimized for header use
- **Context Integration**: Uses `EngagementContext` for global state

## Usage

### Basic Usage

```tsx
import { EngagementModeSelector } from "@/components/layout";

function Dashboard() {
  return (
    <header>
      <EngagementModeSelector />
    </header>
  );
}
```

### Compact Variant (for headers)

```tsx
<EngagementModeSelector variant="compact" />
```

### With Change Callback

```tsx
<EngagementModeSelector
  onModeChange={(mode) => {
    console.log(`Switched to ${mode} mode`);
    // Additional logic here
  }}
/>
```

### With Custom Styling

```tsx
<EngagementModeSelector
  className="ml-auto"
  variant="compact"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "compact"` | `"default"` | Visual size variant |
| `className` | `string` | `""` | Additional CSS classes |
| `onModeChange` | `(mode: EngagementMode) => void` | - | Optional callback when mode changes |

## Engagement Modes

The component supports 5 engagement modes:

| Mode | Icon | Description |
|------|------|-------------|
| **CEO** | 🎯 Target | Health + Progress + Critical blockers only |
| **VP** | 📊 BarChart | Strategic oversight + Recent decisions + Top 3 blockers |
| **Engineer** | 💻 Code | Full agent activity + Technical details |
| **Builder** | ⚡ Terminal | Implementation tasks + All details |
| **Founder** | 🧠 Brain | Everything visible, no filters |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Open dropdown (when button focused) |
| `ArrowDown` | Open dropdown or move to next option |
| `ArrowUp` | Move to previous option |
| `Home` | Jump to first option |
| `End` | Jump to last option |
| `Enter` / `Space` | Select highlighted option |
| `Escape` | Close dropdown and return focus |

## Accessibility

### ARIA Support

- `role="listbox"` on dropdown
- `role="option"` on each mode option
- `aria-haspopup="listbox"` on trigger button
- `aria-expanded` reflects open/closed state
- `aria-selected` indicates selected mode
- `aria-label` provides descriptive labels for screen readers

### Focus Management

- Focus returns to trigger button after selection
- Visual focus indicators (ring) for keyboard navigation
- Tab order preserved with native HTML elements

### Screen Reader Announcements

Each mode option announces:
- Mode name
- Full description
- Selected state

Example: "CEO mode: Health + Progress + Critical blockers only. Selected."

## Integration with EngagementContext

The component uses the `EngagementContext` for state management:

```tsx
const { mode, setMode } = useEngagement();
```

- **Reads** current mode from context
- **Updates** mode via `setMode()`
- **Persists** to localStorage via context
- **Syncs** to WebSocket via context

## Visual States

### Button States

- **Default**: Gray background, gray border
- **Open**: Purple background, purple border
- **Hover**: Lighter gray border

### Dropdown Options

- **Default**: Transparent background
- **Hover**: Gray background
- **Keyboard Selected**: Gray background + purple ring
- **Active Mode**: Purple background + border + checkmark

## Animation

Uses Framer Motion for smooth transitions:

- Dropdown: Fade in/out with vertical slide
- Icon rotation: Chevron rotates 180° when open
- Transition duration: ~200ms

## Dependencies

```json
{
  "framer-motion": "^11.x",
  "lucide-react": "^0.x",
  "react": "^18.x"
}
```

## File Structure

```
src/components/layout/
├── EngagementModeSelector.tsx    # Main component
├── EngagementModeSelector.README.md
└── index.ts                       # Barrel export
```

## Example: Replacing Dashboard Implementation

### Before (inline implementation)

```tsx
// dashboard-live.tsx (lines 594-703)
<div className="relative">
  <button onClick={() => setShowModeSelector(!showModeSelector)}>
    {/* 100+ lines of inline code */}
  </button>
  {showModeSelector && (
    <div>
      {/* Dropdown implementation */}
    </div>
  )}
</div>
```

### After (using component)

```tsx
import { EngagementModeSelector } from "@/components/layout";

<EngagementModeSelector variant="compact" />
```

**Result**: 100+ lines replaced with 1 line!

## Testing

The component includes comprehensive test IDs:

```tsx
data-testid="engagement-mode-button"
data-testid="engagement-mode-dropdown"
data-testid="engagement-mode-ceo"
data-testid="engagement-mode-vp"
data-testid="engagement-mode-engineer"
data-testid="engagement-mode-builder"
data-testid="engagement-mode-founder"
```

### Example Test

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { EngagementModeSelector } from "./EngagementModeSelector";

test("opens dropdown on click", () => {
  render(<EngagementModeSelector />);

  const button = screen.getByTestId("engagement-mode-button");
  fireEvent.click(button);

  expect(screen.getByTestId("engagement-mode-dropdown")).toBeInTheDocument();
});

test("selects mode on click", () => {
  const handleChange = jest.fn();
  render(<EngagementModeSelector onModeChange={handleChange} />);

  const button = screen.getByTestId("engagement-mode-button");
  fireEvent.click(button);

  const ceoOption = screen.getByTestId("engagement-mode-ceo");
  fireEvent.click(ceoOption);

  expect(handleChange).toHaveBeenCalledWith("ceo");
});
```

## Design Decisions

### Why Extract?

1. **Reusability**: Can be used in multiple headers/layouts
2. **Maintainability**: Single source of truth for mode selector
3. **Testability**: Easier to test in isolation
4. **Accessibility**: Centralized ARIA implementation
5. **Consistency**: Same behavior across all uses

### Why Framer Motion?

- Smooth animations out of the box
- Exit animations (AnimatePresence)
- Already used in the project
- Minimal bundle size impact

### Why External Mode Config?

The `MODE_CONFIG` is defined inside the component (not imported) because:

1. **Encapsulation**: Mode config is specific to this component
2. **Type Safety**: TypeScript ensures all modes are defined
3. **Single File**: Everything needed is in one place
4. **No Coupling**: Doesn't depend on page-level config

If mode config needs to be shared across components in the future, it can be extracted to a shared constants file.

## Future Enhancements

Potential improvements:

- [ ] Add tooltip on hover showing mode description
- [ ] Add transition animation between modes
- [ ] Support custom mode configurations
- [ ] Add search/filter for modes (if list grows)
- [ ] Support grouping modes by category
- [ ] Add mode icons in button (not just dropdown)
- [ ] Support custom render for mode options

## Related Documentation

- [Engagement Context](../../contexts/EngagementContext.tsx)
- [Keyboard Shortcuts Integration](../../../docs/keyboard-shortcuts-integration.md)
- [Loading States](./LOADING-STATES-QUICK-REF.md)

---

**Last Updated**: 2026-02-01
**Component Version**: 1.0.0

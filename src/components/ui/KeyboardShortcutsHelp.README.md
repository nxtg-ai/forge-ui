# Keyboard Shortcuts Help Component

A comprehensive keyboard shortcuts system for NXTG-Forge, featuring a beautiful modal overlay and global shortcut registration.

## Components

### KeyboardShortcutsHelp

A modal overlay that displays all available keyboard shortcuts, organized by category with search functionality.

**Features:**
- Categorized shortcuts (Navigation, Actions, Mode, Terminal, General)
- Real-time search/filter
- Framer Motion animations
- Focus trap and accessibility
- Dark theme with purple accents
- Keyboard-style key display
- Escape to close

**Usage:**

```tsx
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcuts';

function App() {
  const [showHelp, setShowHelp] = useState(false);

  // Register '?' to open help
  useKeyboardShortcut('?', () => setShowHelp(true));

  return (
    <>
      {/* Your app content */}

      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}
```

### Custom Shortcuts

You can add custom shortcuts to the help modal:

```tsx
const customShortcuts = [
  {
    key: 'g',
    modifiers: ['ctrl', 'shift'],
    description: 'Go to dashboard',
    category: 'navigation',
  },
];

<KeyboardShortcutsHelp
  isOpen={showHelp}
  onClose={() => setShowHelp(false)}
  customShortcuts={customShortcuts}
/>
```

## Hooks

### useKeyboardShortcuts

Register multiple keyboard shortcuts at once.

```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function Dashboard() {
  useKeyboardShortcuts([
    {
      key: '1',
      callback: () => setViewMode('compact'),
      description: 'Switch to compact view',
    },
    {
      key: 'k',
      modifiers: ['ctrl'],
      callback: () => openCommandPalette(),
      description: 'Open command palette',
    },
  ]);
}
```

### useKeyboardShortcut

Register a single keyboard shortcut (simpler API).

```tsx
import { useKeyboardShortcut } from './hooks/useKeyboardShortcuts';

function Component() {
  useKeyboardShortcut('?', () => setShowHelp(true), {
    description: 'Show help',
  });

  useKeyboardShortcut('k', openCommandPalette, {
    modifiers: ['ctrl'],
    description: 'Open command palette',
  });
}
```

## Configuration Options

### ShortcutConfig

```typescript
interface ShortcutConfig {
  key: string;                    // The key to listen for
  modifiers?: string[];           // ['ctrl', 'alt', 'shift', 'meta']
  callback: (e: KeyboardEvent) => void;
  description?: string;           // For help modal
  preventDefault?: boolean;       // Default: true
  enabled?: boolean;              // Default: true
  category?: string;              // For help modal grouping
}
```

### UseKeyboardShortcutsOptions

```typescript
interface UseKeyboardShortcutsOptions {
  enabled?: boolean;              // Default: true
  preventDefault?: boolean;       // Default: true
  ignoreInputElements?: boolean;  // Default: true (skip when typing)
}
```

## Default Shortcuts

The help modal comes with these default shortcuts:

### Navigation
- `1` - Switch to Compact view
- `2` - Switch to Balanced view
- `3` - Switch to Immersive view
- `[` - Toggle left panel
- `]` - Toggle right panel
- `Ctrl+Tab` - Cycle through panels

### Actions
- `Ctrl+K` - Open command palette
- `R` - Refresh current view
- `E` - Expand/collapse current panel
- `Ctrl+F` - Search/filter
- `Ctrl+N` - New item/project
- `Ctrl+S` - Save

### Mode
- `M` - Toggle mode selector
- `Ctrl+D` - Toggle dark mode

### Terminal
- `Ctrl+T` - Toggle terminal
- `Ctrl+C` - Clear terminal
- `Ctrl+L` - Clear scrollback

### General
- `?` - Show help
- `Escape` - Close modal/cancel

## Utilities

### formatShortcut

Format a shortcut for display:

```typescript
import { formatShortcut } from './hooks/useKeyboardShortcuts';

formatShortcut('k', ['ctrl']); // "Ctrl+K"
formatShortcut('?');            // "?"
```

### isShortcutAvailable

Check if a shortcut conflicts with critical browser shortcuts:

```typescript
import { isShortcutAvailable } from './hooks/useKeyboardShortcuts';

isShortcutAvailable('k', ['ctrl']); // true (safe)
isShortcutAvailable('t', ['ctrl']); // false (new tab)
isShortcutAvailable('r', ['ctrl']); // true (we can override reload)
```

## Accessibility

- Full keyboard navigation
- Focus trap when modal is open
- ARIA labels and roles
- Screen reader friendly
- Respects user input contexts (doesn't interfere with typing)

## Styling

The component uses Tailwind CSS with the following color scheme:
- Background: `gray-900`
- Borders: `gray-700`
- Text: `white`, `gray-300`, `gray-400`
- Accent: `purple-400` to `purple-600`
- Keys: `gray-800` background with `gray-700` border

## Best Practices

1. **Use common conventions**: `Ctrl+K` for command palette, `?` for help
2. **Avoid browser conflicts**: Use `isShortcutAvailable()` to check
3. **Provide descriptions**: Always include for help modal
4. **Group by category**: Use consistent categories
5. **Test with inputs**: Ensure shortcuts don't interfere with typing
6. **Document thoroughly**: Add all shortcuts to help modal

## Example Integration

See `KeyboardShortcutsHelp.example.tsx` for a complete working example with:
- View mode switching (1, 2, 3)
- Panel toggles ([, ])
- Help modal (?)
- Command palette (Ctrl+K)
- Full visual demo

## Testing

The hook includes comprehensive tests covering:
- Basic shortcut triggering
- Modifier combinations
- Enable/disable functionality
- Input element handling
- Cleanup on unmount
- Browser conflict detection

Run tests:
```bash
npm test -- src/hooks/__tests__/useKeyboardShortcuts.test.ts
```

## Performance

- Event listeners are cleaned up on unmount
- Only one global keydown listener per hook instance
- Efficient shortcut matching with early returns
- No re-renders unless state changes

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Tested with React 19
- Requires Framer Motion for animations
- Uses native KeyboardEvent API

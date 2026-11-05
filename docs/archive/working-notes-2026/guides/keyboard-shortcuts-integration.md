# Keyboard Shortcuts Integration Guide

This guide shows how to integrate the keyboard shortcuts system into the NXTG-Forge dashboard.

## Quick Start

### 1. Add to Main App Component

```tsx
// src/App.tsx
import { useState } from 'react';
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [showHelp, setShowHelp] = useState(false);
  const [viewMode, setViewMode] = useState('balanced');

  // Register global shortcuts
  useKeyboardShortcuts([
    // Help modal
    {
      key: '?',
      callback: () => setShowHelp(prev => !prev),
      description: 'Show keyboard shortcuts help',
      category: 'general',
    },

    // View modes
    {
      key: '1',
      callback: () => setViewMode('compact'),
      description: 'Switch to Compact view',
      category: 'navigation',
    },
    {
      key: '2',
      callback: () => setViewMode('balanced'),
      description: 'Switch to Balanced view',
      category: 'navigation',
    },
    {
      key: '3',
      callback: () => setViewMode('immersive'),
      description: 'Switch to Immersive view',
      category: 'navigation',
    },
  ]);

  return (
    <div className="app">
      {/* Your existing app content */}

      {/* Add help modal */}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
```

### 2. Add Help Button to Header

```tsx
// In your header/navbar component
import { HelpCircle } from 'lucide-react';

function Header() {
  return (
    <header>
      {/* Other header content */}

      <button
        onClick={() => setShowHelp(true)}
        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        title="Keyboard shortcuts (Press ?)"
      >
        <HelpCircle className="w-5 h-5 text-gray-400" />
      </button>
    </header>
  );
}
```

## Integration Points

### Dashboard Component

Add shortcuts for common dashboard actions:

```tsx
// In your Dashboard component
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function Dashboard() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useKeyboardShortcuts([
    {
      key: '[',
      callback: () => setLeftPanelOpen(prev => !prev),
      description: 'Toggle left panel',
      category: 'navigation',
    },
    {
      key: ']',
      callback: () => setRightPanelOpen(prev => !prev),
      description: 'Toggle right panel',
      category: 'navigation',
    },
    {
      key: 'r',
      callback: () => refreshDashboard(),
      description: 'Refresh dashboard',
      category: 'actions',
    },
  ]);

  // Your dashboard render
}
```

### Terminal Component

Add terminal-specific shortcuts:

```tsx
// In your Terminal component
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function Terminal() {
  const [isOpen, setIsOpen] = useState(true);
  const terminalRef = useRef();

  useKeyboardShortcuts([
    {
      key: 't',
      modifiers: ['ctrl'],
      callback: () => setIsOpen(prev => !prev),
      description: 'Toggle terminal',
      category: 'terminal',
    },
    {
      key: 'c',
      modifiers: ['ctrl'],
      callback: () => terminalRef.current?.clear(),
      description: 'Clear terminal',
      category: 'terminal',
    },
  ]);
}
```

### Command Palette

Open command palette with Ctrl+K:

```tsx
// In your CommandPalette component
import { useKeyboardShortcut } from './hooks/useKeyboardShortcuts';

function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcut('k', () => setIsOpen(true), {
    modifiers: ['ctrl'],
    description: 'Open command palette',
    category: 'actions',
  });

  // Your command palette render
}
```

## Customization

### Custom Shortcuts

Add project-specific shortcuts to the help modal:

```tsx
const customShortcuts = [
  {
    key: 'g',
    modifiers: ['ctrl', 'shift'],
    description: 'Go to Git view',
    category: 'navigation',
  },
  {
    key: 'd',
    modifiers: ['ctrl'],
    description: 'Toggle debug mode',
    category: 'mode',
  },
];

<KeyboardShortcutsHelp
  isOpen={showHelp}
  onClose={() => setShowHelp(false)}
  customShortcuts={customShortcuts}
/>
```

### Styling

The component uses Tailwind classes. Customize by:

1. Modifying the component directly
2. Using Tailwind's configuration
3. Adding custom CSS classes

### Categories

Available categories:
- `navigation` - Moving between views and panels
- `actions` - Common operations
- `mode` - Display and theme settings
- `terminal` - Terminal control
- `general` - System-wide shortcuts

Create custom categories by adding them to `CATEGORY_INFO` in the component.

## Best Practices

### 1. Group Related Shortcuts

```tsx
// Group view-related shortcuts together
const viewShortcuts = [
  { key: '1', callback: () => setView('compact'), ... },
  { key: '2', callback: () => setView('balanced'), ... },
  { key: '3', callback: () => setView('immersive'), ... },
];

useKeyboardShortcuts(viewShortcuts);
```

### 2. Use Descriptive Names

```tsx
// Good
description: 'Switch to Compact view'

// Bad
description: 'Compact'
```

### 3. Avoid Browser Conflicts

```tsx
import { isShortcutAvailable } from './hooks/useKeyboardShortcuts';

// Check before registering
if (isShortcutAvailable('t', ['ctrl'])) {
  // Register shortcut
}
```

### 4. Disable When Appropriate

```tsx
const [inputFocused, setInputFocused] = useState(false);

useKeyboardShortcuts(shortcuts, {
  enabled: !inputFocused, // Disable when typing
});
```

### 5. Provide Feedback

```tsx
{
  key: 's',
  modifiers: ['ctrl'],
  callback: () => {
    saveDocument();
    showToast('Document saved'); // Visual feedback
  },
  description: 'Save document',
}
```

## Testing

### Test Shortcuts

```tsx
// In your test file
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

it('should trigger callback on shortcut', () => {
  const callback = vi.fn();

  renderHook(() =>
    useKeyboardShortcuts([
      { key: 'k', modifiers: ['ctrl'], callback },
    ])
  );

  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    );
  });

  expect(callback).toHaveBeenCalled();
});
```

### Test Help Modal

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should open help modal with ?', async () => {
  render(<App />);

  await userEvent.keyboard('?');

  expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
});
```

## Performance Tips

1. **Use useCallback**: Wrap callbacks to prevent re-renders
2. **Conditional Registration**: Only register shortcuts when needed
3. **Cleanup**: Hooks automatically clean up on unmount
4. **Debounce**: For expensive operations

```tsx
const handleRefresh = useCallback(() => {
  refreshDashboard();
}, []);

useKeyboardShortcuts([
  { key: 'r', callback: handleRefresh },
]);
```

## Accessibility

The keyboard shortcuts system is fully accessible:

- Screen reader announcements for actions
- Visual feedback for triggered shortcuts
- Help modal with focus trap
- ARIA labels and roles
- Respects user input contexts

## Troubleshooting

### Shortcuts Not Working

1. Check if another component is preventing default
2. Verify modifiers match exactly
3. Check if shortcuts are disabled
4. Look for input element focus

### Conflicts with Browser

1. Use `isShortcutAvailable()` to check
2. Avoid critical shortcuts (Ctrl+T, Ctrl+W)
3. Consider alternative key combinations
4. Override with `preventDefault: true`

### Help Modal Not Showing

1. Check `isOpen` prop
2. Verify z-index (should be 9999)
3. Check if other modals are blocking
4. Verify AnimatePresence is working

## Future Enhancements

Planned features:
- Customizable key bindings
- Shortcut conflicts detection
- Visual shortcut overlay
- Recording mode
- Export/import shortcuts
- Context-aware shortcuts

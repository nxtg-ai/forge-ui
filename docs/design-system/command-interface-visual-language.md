# Command Interface Visual Language

## Design System for `/nxtg-*` Command Suite

This document defines the visual language, interaction patterns, and implementation details for the NXTG-Forge command interface. Every pixel serves a purpose. Every animation communicates state. Every interaction feels intentional.

## Core Principles

1. **Instant Recognition**: Users know they're in NXTG-Forge territory
2. **Grouped Discovery**: Commands appear as cohesive collection, not scattered list
3. **Zero Friction**: From thought to execution in minimal keystrokes
4. **Delightful Feedback**: Every interaction confirms user intent

## Color System

### Brand Colors (NXTG-Forge Identity)

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',   // Lightest - backgrounds
          100: '#dbeafe',  // Light - hover states
          200: '#bfdbfe',  // Medium light
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Primary - main brand
          600: '#2563eb',  // Primary dark
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',  // Darkest - text on light bg
        },
        surface: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        success: {
          50: '#f0fdf4',
          500: '#10b981',  // Green - confirmations
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',  // Amber - caution
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',  // Red - errors
          900: '#7f1d1d',
        },
      },
    },
  },
};
```

## Typography Scale

```typescript
// Font system for command interface
const typography = {
  // Command names (monospace for clarity)
  commandName: 'font-mono text-sm font-medium',

  // Descriptions (sans for readability)
  commandDesc: 'font-sans text-sm text-surface-600 dark:text-surface-400',

  // Headers
  menuHeader: 'font-sans text-base font-semibold text-brand-900 dark:text-brand-100',

  // Hints and tips
  hint: 'font-sans text-xs text-surface-500 dark:text-surface-400',
};
```

## Spacing System (4px Grid)

```css
/* All spacing uses 4px base */
--space-1: 4px;   /* 0.25rem */
--space-2: 8px;   /* 0.5rem */
--space-3: 12px;  /* 0.75rem */
--space-4: 16px;  /* 1rem */
--space-6: 24px;  /* 1.5rem */
--space-8: 32px;  /* 2rem */
--space-12: 48px; /* 3rem */
--space-16: 64px; /* 4rem */
```

## Shadow System (Elevation)

```typescript
// Command menu uses elevation levels
const shadows = {
  elevation1: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  elevation2: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  elevation3: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  elevation4: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  elevation5: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

// Command menu uses elevation-4
// Tooltips use elevation-3
// Hover states use elevation-2
```

## Animation System

### Timing Functions

```typescript
// Spring-based easing for natural feel
const easing = {
  spring: 'cubic-bezier(0.16, 1, 0.3, 1)',      // Primary spring
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',       // Quick actions
  smooth: 'cubic-bezier(0.4, 0, 0.6, 1)',       // Gentle transitions
};

// Duration standards
const duration = {
  instant: '100ms',   // State changes
  fast: '200ms',      // Most interactions
  normal: '300ms',    // Menu transitions
  slow: '400ms',      // Complex animations
};
```

### Animation Patterns

```css
/* Slide-fade-in (menu appearance) */
@keyframes slide-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Shimmer (loading states) */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Pulse (selection feedback) */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
```

## Component Specifications

### Command Menu Container

```tsx
<div className="
  fixed inset-x-0 bottom-8
  mx-auto max-w-2xl px-4
  animate-[slide-fade-in_200ms_cubic-bezier(0.16,1,0.3,1)]
">
  <div className="
    bg-white dark:bg-surface-900
    rounded-xl
    shadow-elevation-4
    border border-surface-200 dark:border-surface-700
    overflow-hidden
    backdrop-blur-sm
  ">
    {/* Content */}
  </div>
</div>
```

**Visual Properties**:
- Fixed position: Bottom center of viewport
- Max width: 672px (readable width)
- Backdrop blur: Creates depth separation
- Border radius: 12px (rounded-xl)
- Shadow: elevation-4 for floating effect

### Menu Header

```tsx
<div className="
  px-4 py-3
  bg-gradient-to-r from-brand-50 to-brand-100
  dark:from-brand-900/20 dark:to-brand-800/20
  border-b border-brand-200 dark:border-brand-800
">
  <div className="flex items-center space-x-2">
    <span className="text-xl">🚀</span>
    <h3 className="font-semibold text-brand-900 dark:text-brand-100">
      NXTG-Forge Command Suite
    </h3>
  </div>
</div>
```

**Visual Properties**:
- Gradient background: Subtle brand identity
- Icon: Rocket emoji for "launch/power" metaphor
- Typography: Semibold 16px for clear hierarchy
- Padding: 12px vertical, 16px horizontal

### Command Item (Default State)

```tsx
<button className="
  w-full px-4 py-3
  flex items-center justify-between
  transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
  focus:outline-none
">
  <span className="font-mono text-sm text-surface-900 dark:text-surface-100">
    /nxtg-status
  </span>
  <span className="text-sm text-surface-600 dark:text-surface-400 ml-4">
    Display project state
  </span>
</button>
```

**Visual Properties**:
- Full width: Easy click target
- Flexbox: Name left, description right
- Monospace font: Clear command identity
- Neutral colors: Reduces cognitive load

### Command Item (Hover State)

```tsx
<button className="
  hover:bg-brand-50 dark:hover:bg-brand-900/10
  hover:shadow-elevation-1
  hover:-translate-y-[1px]
  transition-all duration-200
">
  {/* Content */}
</button>
```

**Interactive Feedback**:
- Background color shift: Subtle brand tint
- Micro lift: 1px upward movement
- Shadow increase: Creates depth
- Cursor: Pointer (system default)

### Command Item (Selected/Focused State)

```tsx
<button className="
  bg-brand-100 dark:bg-brand-900/20
  ring-2 ring-brand-500 ring-inset
  shadow-elevation-2
">
  <span className="text-brand-700 dark:text-brand-300 font-semibold">
    /nxtg-status
  </span>
</button>
```

**Visual Properties**:
- Background: Stronger brand tint
- Ring: 2px inset for focus indicator
- Typography: Semibold weight for emphasis
- Shadow: elevation-2 for hierarchy

### Command Item (Active/Pressed State)

```tsx
<button className="
  active:scale-[0.98]
  active:shadow-elevation-1
  transition-transform duration-100
">
  {/* Content */}
</button>
```

**Tactile Feedback**:
- Scale: 98% creates "press down" feel
- Shadow reduction: Reinforces pressed state
- Duration: 100ms for instant response

### Menu Footer

```tsx
<div className="
  px-4 py-2
  bg-surface-50 dark:bg-surface-800
  border-t border-surface-200 dark:border-surface-700
">
  <p className="text-xs text-surface-500 dark:text-surface-400">
    Type any command or use ↑↓ to navigate • Enter to execute
  </p>
</div>
```

**Visual Properties**:
- Subtle background: Separates from main content
- Small text: 12px for supporting information
- Border top: Clear visual separation
- Reduced contrast: Less demanding attention

## Interaction States

### State Diagram

```
[Closed] ──(/nx typed)──> [Opening Animation]
                               │
                               ▼
                          [Open/Idle]
                               │
    ┌──────────────────────────┼──────────────────────────┐
    │                          │                          │
    ▼                          ▼                          ▼
[Hovering]              [Keyboard Nav]              [Searching]
    │                          │                          │
    └──────────────────────────┴──────────────────────────┘
                               │
                               ▼
                         [Executing] ──> [Success] ──> [Closed]
                                              │
                                              ▼
                                          [Error] ──> [Open/Idle]
```

### State Transitions

```typescript
const stateTransitions = {
  idle: {
    onKeyPress: '/nx' => 'opening',
    animation: 'slide-fade-in',
    duration: 200,
  },
  opening: {
    onComplete: => 'open',
    animation: 'slide-fade-in + stagger-children',
    duration: 200,
  },
  open: {
    onHover: => 'hovering',
    onKeyDown: ['ArrowUp', 'ArrowDown'] => 'navigating',
    onKeyPress: => 'searching',
    onEscape: => 'closing',
  },
  hovering: {
    animation: 'lift + color-shift',
    duration: 200,
  },
  navigating: {
    animation: 'ring-pulse',
    duration: 100,
  },
  executing: {
    animation: 'scale-pulse',
    duration: 300,
    onSuccess: => 'closing',
    onError: => 'error',
  },
  closing: {
    animation: 'slide-fade-out',
    duration: 150,
    onComplete: => 'closed',
  },
};
```

## Responsive Behavior

### Desktop (≥1024px)

```tsx
<div className="
  max-w-2xl          /* 672px max width */
  bottom-8           /* 32px from bottom */
">
  <div className="px-4 py-3">  {/* Comfortable spacing */}
    {/* Command items with full descriptions */}
  </div>
</div>
```

### Tablet (768px - 1023px)

```tsx
<div className="
  max-w-xl          /* 576px max width */
  md:bottom-6       /* 24px from bottom */
  md:mx-4           /* 16px horizontal margins */
">
  <div className="px-3 py-2">  {/* Reduced spacing */}
    {/* Command items with abbreviated descriptions */}
  </div>
</div>
```

### Mobile (< 768px)

```tsx
<div className="
  fixed inset-x-0 bottom-0  /* Full width, bottom of screen */
  rounded-t-xl rounded-b-none
  sm:mx-2 sm:mb-2           /* Small margins on larger phones */
">
  <div className="px-3 py-2">  {/* Compact spacing */}
    {/* Command names only, descriptions on tap */}
  </div>
</div>
```

## Accessibility

### Keyboard Navigation

```typescript
// Full keyboard control
const keyboardControls = {
  '/nx': 'Open command menu',
  'ArrowUp': 'Navigate to previous command',
  'ArrowDown': 'Navigate to next command',
  'Enter': 'Execute selected command',
  'Escape': 'Close menu',
  'Tab': 'Cycle through commands',
  'Home': 'Jump to first command',
  'End': 'Jump to last command',
  'a-z': 'Search/filter commands',
};
```

### ARIA Attributes

```tsx
<div
  role="menu"
  aria-label="NXTG-Forge command suite"
  aria-orientation="vertical"
>
  <button
    role="menuitem"
    aria-label="nxtg-status: Display project state"
    aria-selected={isSelected}
    aria-disabled={isDisabled}
  >
    /nxtg-status
  </button>
</div>
```

### Focus Management

```typescript
// Trap focus within menu when open
const useFocusTrap = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const menu = menuRef.current;
    const focusableElements = menu.querySelectorAll(
      'button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first item on open
    firstElement?.focus();

    // Handle Tab key to trap focus
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);
};
```

### Screen Reader Support

```tsx
// Announce state changes
<LiveAnnouncer>
  <span className="sr-only" aria-live="polite" aria-atomic="true">
    {announceText}
  </span>
</LiveAnnouncer>

// Example announcements:
// "Command menu opened. 5 commands available."
// "nxtg-status selected. Display project state."
// "Executing nxtg-status command."
// "Command completed successfully."
```

## Loading States

### Skeleton Loader (First Load)

```tsx
<div className="space-y-2 animate-pulse">
  {[1, 2, 3, 4, 5].map(i => (
    <div key={i} className="px-4 py-3 flex items-center justify-between">
      <div className="h-4 w-32 bg-surface-200 dark:bg-surface-700 rounded" />
      <div className="h-3 w-48 bg-surface-100 dark:bg-surface-800 rounded" />
    </div>
  ))}
</div>
```

### Shimmer Effect (Loading Data)

```tsx
<div className="
  relative overflow-hidden
  before:absolute before:inset-0
  before:bg-gradient-to-r
  before:from-transparent before:via-white/20 before:to-transparent
  before:animate-[shimmer_2s_infinite]
">
  {/* Content */}
</div>
```

## Error States

### Inline Error

```tsx
<div className="
  px-4 py-3
  bg-error-50 dark:bg-error-900/20
  border-l-4 border-error-500
  rounded-r-lg
">
  <div className="flex items-start space-x-2">
    <span className="text-error-500">⚠</span>
    <div>
      <p className="text-sm font-semibold text-error-900 dark:text-error-100">
        Command failed
      </p>
      <p className="text-xs text-error-700 dark:text-error-300 mt-1">
        {errorMessage}
      </p>
    </div>
  </div>
</div>
```

### Error Recovery Pattern

```tsx
<div className="flex items-center space-x-2 mt-2">
  <button className="
    text-xs font-medium
    text-error-600 dark:text-error-400
    hover:text-error-700 dark:hover:text-error-300
    transition-colors duration-200
  ">
    Try again
  </button>
  <span className="text-surface-400">•</span>
  <button className="
    text-xs font-medium
    text-surface-600 dark:text-surface-400
    hover:text-surface-700 dark:hover:text-surface-300
    transition-colors duration-200
  ">
    View details
  </button>
</div>
```

## Success States

### Success Confirmation

```tsx
<div className="
  px-4 py-3
  bg-success-50 dark:bg-success-900/20
  border-l-4 border-success-500
  rounded-r-lg
  animate-[slide-fade-in_200ms_cubic-bezier(0.16,1,0.3,1)]
">
  <div className="flex items-center space-x-2">
    <span className="text-success-500">✓</span>
    <p className="text-sm font-medium text-success-900 dark:text-success-100">
      Command executed successfully
    </p>
  </div>
</div>
```

### Celebration Animation (First Discovery)

```tsx
// Trigger on first /nx usage
const celebrateDiscovery = () => {
  // Confetti burst
  confetti({
    particleCount: 50,
    spread: 70,
    origin: { y: 0.8 },
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    disableForReducedMotion: true,
  });

  // Toast notification
  toast.success('🎉 NXTG-Forge command suite unlocked!', {
    description: 'You can now access all forge commands via /nx',
    duration: 4000,
  });
};
```

## Performance Optimization

### Lazy Loading

```typescript
// Only load command data when menu is opened
const CommandMenu = lazy(() => import('./CommandMenu'));

// Preload on /nx keypress
const handleSlashNKeyPress = () => {
  if (input === '/n') {
    // Preload next character possibilities
    import('./CommandMenu');
  }
};
```

### Virtual Scrolling (Large Command Lists)

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={commands.length}
  itemSize={48}  // Each item 48px tall
  width="100%"
>
  {CommandItem}
</FixedSizeList>
```

### Animation Performance

```css
/* GPU acceleration for animations */
.command-item {
  will-change: transform, opacity;
  transform: translateZ(0); /* Create GPU layer */
}

/* Remove will-change after animation */
.command-item:not(:hover):not(:focus) {
  will-change: auto;
}
```

## Dark Mode

### Color Adaptations

```tsx
// All colors include dark mode variants
className="
  bg-white dark:bg-surface-900
  text-surface-900 dark:text-surface-100
  border-surface-200 dark:border-surface-700
  hover:bg-brand-50 dark:hover:bg-brand-900/10
"
```

### Contrast Preservation

```typescript
// Ensure WCAG AA contrast in both modes
const contrastRatios = {
  light: {
    text: 'text-surface-900',      // 16:1 on white
    subtext: 'text-surface-600',   // 7:1 on white
  },
  dark: {
    text: 'text-surface-100',      // 15:1 on surface-900
    subtext: 'text-surface-400',   // 6:1 on surface-900
  },
};
```

## Implementation Checklist

- [ ] Install dependencies: `tailwindcss`, `framer-motion`, `class-variance-authority`
- [ ] Configure Tailwind with design tokens
- [ ] Build CommandMenu component with exact visual specs
- [ ] Implement keyboard navigation
- [ ] Add focus trap and ARIA attributes
- [ ] Create loading and error states
- [ ] Add celebration animation for first discovery
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify WCAG AA contrast ratios
- [ ] Performance audit (60fps animations)
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Dark mode validation

---

*This visual language transforms the `/nxtg-*` command prefix from a technical decision into a delightful user experience. Every detail serves the mission: empower users with instant discovery and zero friction.*
# `/nxtg-*` Command Menu Implementation Guide

## For Developers: Building the Magic

This guide provides step-by-step instructions to implement the `/nxtg-*` command discovery experience exactly as designed.

## Prerequisites

```bash
# Install required dependencies
npm install tailwindcss framer-motion class-variance-authority
npm install -D @types/react @types/react-dom

# Optional (for celebrations)
npm install canvas-confetti react-hot-toast
```

## Step 1: Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
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
          500: '#10b981',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          900: '#7f1d1d',
        },
      },
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'elevation-4': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        'elevation-5': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        'slide-fade-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(8px) scale(0.96)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        'slide-fade-out': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(8px) scale(0.96)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'slide-fade-in': 'slide-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-fade-out': 'slide-fade-out 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2s infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
```

## Step 2: Type Definitions

```typescript
// types/command.ts

export interface NXTGCommand {
  name: string;
  description: string;
  category: 'core' | 'feature' | 'utility' | 'advanced';
  shortcut?: string;
  usage?: {
    frequency: number;
    lastUsed?: Date;
  };
  execute: () => Promise<void>;
}

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  commands: NXTGCommand[];
  onExecute: (command: NXTGCommand) => void;
}
```

## Step 3: Command Registry

```typescript
// lib/command-registry.ts

import type { NXTGCommand } from '@/types/command';

class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, NXTGCommand> = new Map();

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  register(command: NXTGCommand): void {
    // Validate prefix
    if (!command.name.startsWith('/nxtg-')) {
      throw new Error(
        `Invalid command name: ${command.name}. All NXTG commands must use /nxtg- prefix.`
      );
    }

    this.commands.set(command.name, command);
  }

  getAll(): NXTGCommand[] {
    return Array.from(this.commands.values());
  }

  getSortedByUsage(): NXTGCommand[] {
    return this.getAll().sort((a, b) => {
      const aFreq = a.usage?.frequency ?? 0;
      const bFreq = b.usage?.frequency ?? 0;
      return bFreq - aFreq;
    });
  }

  incrementUsage(commandName: string): void {
    const command = this.commands.get(commandName);
    if (command) {
      if (!command.usage) {
        command.usage = { frequency: 0 };
      }
      command.usage.frequency++;
      command.usage.lastUsed = new Date();
    }
  }
}

export const commandRegistry = CommandRegistry.getInstance();

// Register core commands
commandRegistry.register({
  name: '/nxtg-init',
  description: 'Initialize project forge',
  category: 'core',
  execute: async () => {
    console.log('Executing /nxtg-init');
  },
});

commandRegistry.register({
  name: '/nxtg-status',
  description: 'Display project state',
  category: 'core',
  execute: async () => {
    console.log('Executing /nxtg-status');
  },
});

commandRegistry.register({
  name: '/nxtg-feature',
  description: 'Add new feature',
  category: 'feature',
  execute: async () => {
    console.log('Executing /nxtg-feature');
  },
});

commandRegistry.register({
  name: '/nxtg-enable',
  description: 'Activate orchestrator',
  category: 'core',
  execute: async () => {
    console.log('Executing /nxtg-enable');
  },
});

commandRegistry.register({
  name: '/nxtg-report',
  description: 'Session activity report',
  category: 'utility',
  execute: async () => {
    console.log('Executing /nxtg-report');
  },
});
```

## Step 4: Command Menu Component

```typescript
// components/CommandMenu.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NXTGCommand, CommandMenuProps } from '@/types/command';

export function CommandMenu({
  isOpen,
  onClose,
  commands,
  onExecute,
}: CommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const menu = menuRef.current;
    if (!menu) return;

    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'button:not([disabled])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(commands.length - 1, prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          onExecute(commands[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(commands.length - 1);
          break;
      }
    },
    [isOpen, selectedIndex, commands, onExecute, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-x-0 bottom-8 mx-auto max-w-2xl px-4 z-50">
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            className="
              bg-white dark:bg-surface-900
              rounded-xl
              shadow-elevation-4
              border border-surface-200 dark:border-surface-700
              overflow-hidden
              backdrop-blur-sm
            "
            role="menu"
            aria-label="NXTG-Forge command suite"
            aria-orientation="vertical"
          >
            {/* Header */}
            <div className="
              px-4 py-3
              bg-gradient-to-r from-brand-50 to-brand-100
              dark:from-brand-900/20 dark:to-brand-800/20
              border-b border-brand-200 dark:border-brand-800
            ">
              <div className="flex items-center space-x-2">
                <span className="text-xl" aria-hidden="true">🚀</span>
                <h3 className="font-semibold text-brand-900 dark:text-brand-100">
                  NXTG-Forge Command Suite
                </h3>
              </div>
            </div>

            {/* Command List */}
            <div className="py-2">
              <AnimatePresence>
                {commands.map((command, index) => {
                  const isSelected = index === selectedIndex;
                  const isHovered = index === hoveredIndex;

                  return (
                    <motion.button
                      key={command.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.02,
                        type: 'spring',
                        stiffness: 300,
                        damping: 25,
                      }}
                      onClick={() => onExecute(command)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`
                        w-full px-4 py-3
                        flex items-center justify-between
                        transition-all duration-200
                        focus:outline-none
                        ${
                          isSelected
                            ? 'bg-brand-100 dark:bg-brand-900/20 ring-2 ring-brand-500 ring-inset shadow-elevation-2'
                            : isHovered
                            ? 'bg-brand-50 dark:bg-brand-900/10 shadow-elevation-1 -translate-y-[1px]'
                            : 'bg-transparent'
                        }
                        ${
                          isSelected
                            ? 'cursor-pointer active:scale-[0.98]'
                            : 'cursor-pointer'
                        }
                      `}
                      role="menuitem"
                      aria-label={`${command.name}: ${command.description}`}
                      aria-selected={isSelected}
                    >
                      <span
                        className={`
                          font-mono text-sm
                          ${
                            isSelected
                              ? 'text-brand-700 dark:text-brand-300 font-semibold'
                              : 'text-surface-900 dark:text-surface-100 font-medium'
                          }
                        `}
                      >
                        {command.name}
                      </span>
                      <span className="text-sm text-surface-600 dark:text-surface-400 ml-4">
                        {command.description}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="
              px-4 py-2
              bg-surface-50 dark:bg-surface-800
              border-t border-surface-200 dark:border-surface-700
            ">
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Type any command or use ↑↓ to navigate • Enter to execute
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

## Step 5: Command Input Handler

```typescript
// hooks/useCommandInput.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { commandRegistry } from '@/lib/command-registry';

export function useCommandInput() {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasDiscovered, setHasDiscovered] = useState(false);

  // Check localStorage for first discovery
  useEffect(() => {
    const discovered = localStorage.getItem('nxtg-commands-discovered');
    setHasDiscovered(!!discovered);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);

    // Trigger menu on '/nx'
    if (value === '/nx' || value.startsWith('/nxtg-')) {
      setIsMenuOpen(true);

      // Celebrate first discovery
      if (!hasDiscovered && value === '/nx') {
        localStorage.setItem('nxtg-commands-discovered', 'true');
        setHasDiscovered(true);
        celebrateDiscovery();
      }
    } else {
      setIsMenuOpen(false);
    }
  }, [hasDiscovered]);

  const handleCommandExecute = useCallback(async (command: NXTGCommand) => {
    setIsMenuOpen(false);
    setInput('');

    // Increment usage
    commandRegistry.incrementUsage(command.name);

    // Execute command
    try {
      await command.execute();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, []);

  return {
    input,
    isMenuOpen,
    hasDiscovered,
    setInput: handleInputChange,
    setIsMenuOpen,
    handleCommandExecute,
    commands: commandRegistry.getSortedByUsage(),
  };
}

function celebrateDiscovery() {
  // Import confetti dynamically
  import('canvas-confetti').then((confetti) => {
    confetti.default({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#3B82F6', '#10B981', '#F59E0B'],
      disableForReducedMotion: true,
    });
  });

  // Show toast
  import('react-hot-toast').then(({ default: toast }) => {
    toast.success('🎉 NXTG-Forge command suite unlocked!', {
      description: 'You can now access all forge commands via /nx',
      duration: 4000,
    });
  });
}
```

## Step 6: Main Application Integration

```typescript
// app/page.tsx

'use client';

import { CommandMenu } from '@/components/CommandMenu';
import { useCommandInput } from '@/hooks/useCommandInput';

export default function Home() {
  const {
    input,
    isMenuOpen,
    setInput,
    setIsMenuOpen,
    handleCommandExecute,
    commands,
  } = useCommandInput();

  return (
    <main className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Terminal-like input */}
      <div className="container mx-auto px-4 py-8">
        <div className="
          bg-white dark:bg-surface-800
          rounded-lg
          border border-surface-200 dark:border-surface-700
          p-4
        ">
          <div className="flex items-center space-x-2">
            <span className="text-surface-500 dark:text-surface-400">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Try typing /nx..."
              className="
                flex-1
                bg-transparent
                text-surface-900 dark:text-surface-100
                placeholder:text-surface-400
                focus:outline-none
                font-mono
              "
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-surface-600 dark:text-surface-400">
          💡 Pro Tip: Type <code className="
            px-1 py-0.5
            bg-brand-50 dark:bg-brand-900/20
            text-brand-700 dark:text-brand-300
            rounded
            font-mono
          ">/nx</code> to see all NXTG-Forge commands
        </div>
      </div>

      {/* Command Menu */}
      <CommandMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        commands={commands}
        onExecute={handleCommandExecute}
      />
    </main>
  );
}
```

## Step 7: Accessibility Testing Checklist

```markdown
## Accessibility Verification

- [ ] Keyboard navigation works (Arrow keys, Enter, Escape, Tab, Home, End)
- [ ] Focus visible on all interactive elements
- [ ] Focus trap works when menu is open
- [ ] Screen reader announces menu state ("Command menu opened. 5 commands available.")
- [ ] Each command has descriptive aria-label
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Works with Windows High Contrast mode
- [ ] Respects prefers-reduced-motion
- [ ] No keyboard traps (can always exit with Escape)
- [ ] Tab order is logical and predictable

## Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Screen Reader Testing

- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS/iOS)
- [ ] TalkBack (Android)
```

## Step 8: Performance Optimization

```typescript
// Performance monitoring
import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor animation frame rate
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        if (fps < 50) {
          console.warn(`Low FPS detected: ${fps} (target: 60)`);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }, []);
}
```

## Step 9: Error Boundaries

```typescript
// components/ErrorBoundary.tsx

'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CommandMenuErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Command menu error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="
          fixed inset-x-0 bottom-8
          mx-auto max-w-2xl px-4
        ">
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
                  Command menu failed to load
                </p>
                <p className="text-xs text-error-700 dark:text-error-300 mt-1">
                  {this.state.error?.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Step 10: Testing

```typescript
// __tests__/CommandMenu.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { CommandMenu } from '@/components/CommandMenu';
import { commandRegistry } from '@/lib/command-registry';

describe('CommandMenu', () => {
  const mockExecute = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    mockExecute.mockClear();
    mockClose.mockClear();
  });

  it('renders when open', () => {
    render(
      <CommandMenu
        isOpen={true}
        onClose={mockClose}
        commands={commandRegistry.getAll()}
        onExecute={mockExecute}
      />
    );

    expect(screen.getByText('NXTG-Forge Command Suite')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CommandMenu
        isOpen={false}
        onClose={mockClose}
        commands={commandRegistry.getAll()}
        onExecute={mockExecute}
      />
    );

    expect(screen.queryByText('NXTG-Forge Command Suite')).not.toBeInTheDocument();
  });

  it('executes command on click', () => {
    render(
      <CommandMenu
        isOpen={true}
        onClose={mockClose}
        commands={commandRegistry.getAll()}
        onExecute={mockExecute}
      />
    );

    const statusButton = screen.getByText('/nxtg-status');
    fireEvent.click(statusButton);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/nxtg-status' })
    );
  });

  it('navigates with arrow keys', () => {
    render(
      <CommandMenu
        isOpen={true}
        onClose={mockClose}
        commands={commandRegistry.getAll()}
        onExecute={mockExecute}
      />
    );

    const menu = screen.getByRole('menu');

    // Press ArrowDown twice
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'ArrowDown' });

    // Press Enter
    fireEvent.keyDown(menu, { key: 'Enter' });

    expect(mockExecute).toHaveBeenCalled();
  });

  it('closes on Escape key', () => {
    render(
      <CommandMenu
        isOpen={true}
        onClose={mockClose}
        commands={commandRegistry.getAll()}
        onExecute={mockExecute}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockClose).toHaveBeenCalled();
  });
});
```

## Deployment Checklist

```markdown
## Pre-Deployment

- [ ] All TypeScript types are correct
- [ ] Tailwind config includes all design tokens
- [ ] Animation performance verified (60fps)
- [ ] Accessibility audit passed
- [ ] All commands registered with `/nxtg-` prefix
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] Dark mode works correctly
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Browser compatibility verified
- [ ] Screen reader testing completed

## Post-Deployment

- [ ] Monitor FPS metrics
- [ ] Track command usage analytics
- [ ] Collect user feedback on discovery
- [ ] Measure time-to-first-discovery
- [ ] Verify zero conflicts with existing commands
- [ ] Monitor error rates
- [ ] Check celebration animation triggers correctly
```

## Summary

This implementation guide provides everything needed to build the `/nxtg-*` command menu exactly as designed:

1. **Tailwind configuration** with complete design system
2. **Type-safe command registry** with validation
3. **Accessible React component** with keyboard navigation
4. **Smooth animations** using Framer Motion
5. **First discovery celebration** with confetti
6. **Error handling** with boundaries
7. **Performance monitoring** for 60fps
8. **Comprehensive testing** suite

**The result**: A delightful command discovery experience that makes users feel powerful from the moment they type `/nx`.

---

*Build it pixel-perfect. Ship it with pride. Users will love it.*
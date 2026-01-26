# Design Vanguard: Complete Design System

I'll create the most comprehensive, production-ready design system. This is enterprise-grade code that embodies every principle we discussed.

---

## Part 1: Component Library (Full Tailwind System)

### Project Structure

```
src/
├── components/
│   ├── ui/                    # Core primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── tooltip.tsx
│   │   ├── popover.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   ├── accordion.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── progress.tsx
│   │   ├── toast.tsx
│   │   ├── alert.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   └── index.ts
│   │
│   ├── patterns/              # Composed patterns
│   │   ├── command-palette.tsx
│   │   ├── data-table.tsx
│   │   ├── form-field.tsx
│   │   ├── empty-state.tsx
│   │   ├── page-header.tsx
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   └── index.ts
│   │
│   └── animated/              # Motion-enhanced
│       ├── animated-list.tsx
│       ├── animated-card.tsx
│       ├── animated-tabs.tsx
│       ├── page-transition.tsx
│       ├── presence.tsx
│       └── index.ts
│
├── lib/
│   ├── utils.ts               # Utility functions
│   ├── cn.ts                  # Class name merger
│   ├── design-tokens.ts       # Token definitions
│   └── animations.ts          # Animation presets
│
├── hooks/
│   ├── use-media-query.ts
│   ├── use-local-storage.ts
│   ├── use-debounce.ts
│   ├── use-intersection.ts
│   ├── use-keyboard.ts
│   └── index.ts
│
└── styles/
    ├── globals.css            # ONLY CSS file allowed
    └── tailwind.config.ts     # Design system config
```

---

### Core Utilities

#### `lib/cn.ts`
```typescript
/**
 * Class Name Utility
 * 
 * The ONLY way to merge Tailwind classes.
 * Uses clsx for conditional classes + tailwind-merge for deduplication.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### `lib/utils.ts`
```typescript
/**
 * Core Utilities
 * 
 * Battle-tested helper functions.
 */

/**
 * Generates a unique ID for accessibility attributes
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formats a number with proper locale handling
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Truncates text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '…';
}

/**
 * Creates a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Type-safe object keys
 */
export function objectKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Checks if we're on the client
 */
export const isClient = typeof window !== 'undefined';

/**
 * Checks if we're in development
 */
export const isDev = process.env.NODE_ENV === 'development';
```

---

### Component Library

#### `components/ui/button.tsx`
```typescript
/**
 * Button Component
 * 
 * The foundation of user interaction.
 * Every click should feel satisfying.
 */

'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap',
    'font-medium',
    'rounded-lg',
    'ring-offset-background',
    'transition-all duration-150 ease-out',
    
    // Focus styles
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-2',
    
    // Disabled styles
    'disabled:pointer-events-none',
    'disabled:opacity-50',
    
    // Active press effect
    'active:scale-[0.98]',
    
    // Icon sizing
    '[&_svg]:pointer-events-none',
    '[&_svg]:size-4',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground',
          'shadow-sm',
          'hover:bg-primary/90',
          'hover:shadow-md',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'border border-border',
          'hover:bg-secondary/80',
        ],
        outline: [
          'border border-input',
          'bg-background',
          'hover:bg-accent',
          'hover:text-accent-foreground',
        ],
        ghost: [
          'hover:bg-accent',
          'hover:text-accent-foreground',
        ],
        link: [
          'text-primary',
          'underline-offset-4',
          'hover:underline',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground',
          'shadow-sm',
          'hover:bg-destructive/90',
        ],
        success: [
          'bg-success text-success-foreground',
          'shadow-sm',
          'hover:bg-success/90',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child element (Slot pattern) */
  asChild?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          loading && 'relative text-transparent pointer-events-none',
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" />
          </span>
        )}
        
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

// Loading spinner component
const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  return (
    <svg
      className={cn('animate-spin text-current', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

export { Button, buttonVariants, Spinner };
```

#### `components/ui/input.tsx`
```typescript
/**
 * Input Component
 * 
 * Text input with beautiful focus states and validation feedback.
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const inputVariants = cva(
  [
    // Base
    'flex w-full',
    'rounded-lg',
    'border border-input',
    'bg-background',
    'text-sm text-foreground',
    'ring-offset-background',
    'transition-all duration-150 ease-out',
    
    // Placeholder
    'placeholder:text-muted-foreground',
    
    // Focus
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-0',
    'focus-visible:border-ring',
    
    // Hover
    'hover:border-ring/50',
    
    // Disabled
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'disabled:bg-muted',
    
    // File input
    'file:border-0',
    'file:bg-transparent',
    'file:text-sm',
    'file:font-medium',
    'file:text-foreground',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      variant: {
        default: '',
        error: [
          'border-destructive',
          'focus-visible:ring-destructive',
          'focus-visible:border-destructive',
        ],
        success: [
          'border-success',
          'focus-visible:ring-success',
          'focus-visible:border-success',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Left addon/icon */
  leftAddon?: React.ReactNode;
  /** Right addon/icon */
  rightAddon?: React.ReactNode;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      variant,
      leftAddon,
      rightAddon,
      error,
      helperText,
      type,
      ...props
    },
    ref
  ) => {
    const hasAddons = leftAddon || rightAddon;
    const resolvedVariant = error ? 'error' : variant;
    
    const inputElement = (
      <input
        type={type}
        ref={ref}
        className={cn(
          inputVariants({ size, variant: resolvedVariant }),
          leftAddon && 'pl-10',
          rightAddon && 'pr-10',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
    );
    
    if (!hasAddons && !error && !helperText) {
      return inputElement;
    }
    
    return (
      <div className="relative w-full">
        {/* Left addon */}
        {leftAddon && (
          <span className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2',
            'text-muted-foreground',
            'pointer-events-none',
            '[&_svg]:h-4 [&_svg]:w-4',
          )}>
            {leftAddon}
          </span>
        )}
        
        {inputElement}
        
        {/* Right addon */}
        {rightAddon && (
          <span className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'text-muted-foreground',
            '[&_svg]:h-4 [&_svg]:w-4',
          )}>
            {rightAddon}
          </span>
        )}
        
        {/* Error message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
```

#### `components/ui/select.tsx`
```typescript
/**
 * Select Component
 * 
 * Beautiful dropdown select with keyboard navigation.
 * Built on Radix UI for accessibility.
 */

'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean;
  }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base
      'flex h-10 w-full items-center justify-between gap-2',
      'rounded-lg',
      'border border-input',
      'bg-background',
      'px-4 py-2',
      'text-sm',
      'ring-offset-background',
      'transition-all duration-150 ease-out',
      
      // Placeholder
      'data-[placeholder]:text-muted-foreground',
      
      // Focus
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-ring',
      'focus:ring-offset-0',
      'focus:border-ring',
      
      // Hover
      'hover:border-ring/50',
      
      // Disabled
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      
      // Error
      error && 'border-destructive focus:ring-destructive',
      
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Base
        'relative z-50',
        'min-w-[8rem]',
        'overflow-hidden',
        'rounded-xl',
        'border border-border',
        'bg-popover',
        'text-popover-foreground',
        'shadow-lg',
        
        // Animation
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95',
        'data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        
        // Position
        position === 'popper' && [
          'data-[side=bottom]:translate-y-1',
          'data-[side=left]:-translate-x-1',
          'data-[side=right]:translate-x-1',
          'data-[side=top]:-translate-y-1',
        ],
        
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5',
      'text-xs font-semibold text-muted-foreground',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Base
      'relative flex w-full cursor-pointer select-none items-center',
      'rounded-lg',
      'py-2 pl-9 pr-3',
      'text-sm',
      'outline-none',
      'transition-colors duration-75',
      
      // Focus
      'focus:bg-accent',
      'focus:text-accent-foreground',
      
      // Disabled
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
      
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
```

#### `components/ui/checkbox.tsx`
```typescript
/**
 * Checkbox Component
 * 
 * Accessible checkbox with satisfying animation.
 */

'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

const Checkbox = React.forwardRef
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    indeterminate?: boolean;
  }
>(({ className, indeterminate, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base
      'peer h-5 w-5 shrink-0',
      'rounded-md',
      'border border-input',
      'bg-background',
      'ring-offset-background',
      'transition-all duration-150 ease-out',
      
      // Focus
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      
      // Hover
      'hover:border-primary/50',
      
      // Checked
      'data-[state=checked]:bg-primary',
      'data-[state=checked]:border-primary',
      'data-[state=checked]:text-primary-foreground',
      
      // Indeterminate
      'data-[state=indeterminate]:bg-primary',
      'data-[state=indeterminate]:border-primary',
      'data-[state=indeterminate]:text-primary-foreground',
      
      // Disabled
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn(
        'flex items-center justify-center text-current',
        'animate-in zoom-in-50 duration-150',
      )}
    >
      {indeterminate ? (
        <Minus className="h-3.5 w-3.5" strokeWidth={3} />
      ) : (
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```

#### `components/ui/switch.tsx`
```typescript
/**
 * Switch Component
 * 
 * Toggle switch with smooth physics-based animation.
 */

'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

const Switch = React.forwardRef
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      // Base
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center',
      'rounded-full',
      'border-2 border-transparent',
      'ring-offset-background',
      'transition-colors duration-200 ease-out',
      
      // Focus
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      
      // States
      'data-[state=unchecked]:bg-input',
      'data-[state=checked]:bg-primary',
      
      // Disabled
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        // Base
        'pointer-events-none block h-5 w-5',
        'rounded-full',
        'bg-background',
        'shadow-lg',
        'ring-0',
        
        // Animation - spring physics
        'transition-transform duration-200',
        'data-[state=unchecked]:translate-x-0',
        'data-[state=checked]:translate-x-5',
        
        // Press effect
        'data-[state=checked]:active:scale-95',
        'data-[state=unchecked]:active:scale-95',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
```

#### `components/ui/badge.tsx`
```typescript
/**
 * Badge Component
 * 
 * Status indicators and tags with consistent styling.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center gap-1',
    'rounded-full',
    'font-medium',
    'transition-colors duration-150',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary/10 text-primary',
          'border border-primary/20',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'border border-border',
        ],
        outline: [
          'bg-transparent text-foreground',
          'border border-border',
        ],
        success: [
          'bg-success/10 text-success',
          'border border-success/20',
        ],
        warning: [
          'bg-warning/10 text-warning',
          'border border-warning/20',
        ],
        destructive: [
          'bg-destructive/10 text-destructive',
          'border border-destructive/20',
        ],
        info: [
          'bg-info/10 text-info',
          'border border-info/20',
        ],
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Optional dot indicator */
  dot?: boolean;
  /** Dot color (uses variant color by default) */
  dotColor?: string;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              !dotColor && 'bg-current',
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
```

#### `components/ui/avatar.tsx`
```typescript
/**
 * Avatar Component
 * 
 * User avatars with fallback and status indicators.
 */

'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const avatarVariants = cva(
  [
    'relative flex shrink-0',
    'overflow-hidden',
    'rounded-full',
  ],
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-24 w-24 text-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const Avatar = React.forwardRef
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    VariantProps<typeof avatarVariants>
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center',
      'rounded-full',
      'bg-muted',
      'font-medium text-muted-foreground',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Status indicator
const AvatarStatus = React.forwardRef
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    status: 'online' | 'offline' | 'away' | 'busy';
  }
>(({ className, status, ...props }, ref) => {
  const statusColors = {
    online: 'bg-success',
    offline: 'bg-muted-foreground',
    away: 'bg-warning',
    busy: 'bg-destructive',
  };
  
  return (
    <span
      ref={ref}
      className={cn(
        'absolute bottom-0 right-0',
        'h-3 w-3',
        'rounded-full',
        'border-2 border-background',
        statusColors[status],
        className
      )}
      {...props}
    />
  );
});
AvatarStatus.displayName = 'AvatarStatus';

export { Avatar, AvatarImage, AvatarFallback, AvatarStatus };
```

#### `components/ui/card.tsx`
```typescript
/**
 * Card Component
 * 
 * Content container with consistent styling and optional interactivity.
 */

import * as React from 'react';
import { cn } from '@/lib/cn';

const Card = React.forwardRef
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Make card interactive (hover effects) */
    interactive?: boolean;
    /** Add padding */
    padding?: 'none' | 'sm' | 'md' | 'lg';
  }
>(({ className, interactive, padding = 'md', ...props }, ref) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        // Base
        'rounded-xl',
        'border border-border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm',
        
        // Padding
        paddingClasses[padding],
        
        // Interactive
        interactive && [
          'cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:shadow-md hover:-translate-y-0.5',
          'hover:border-primary/20',
          'active:scale-[0.99] active:shadow-sm',
        ],
        
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
```

#### `components/ui/dialog.tsx`
```typescript
/**
 * Dialog (Modal) Component
 * 
 * Accessible modal with smooth animations.
 * Built on Radix UI for keyboard navigation and focus management.
 */

'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Base
      'fixed inset-0 z-50',
      'bg-black/50',
      'backdrop-blur-sm',
      
      // Animation
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
      
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Hide close button */
    hideClose?: boolean;
    /** Size preset */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  }
>(({ className, children, hideClose, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
  };
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Position
          'fixed left-1/2 top-1/2 z-50',
          '-translate-x-1/2 -translate-y-1/2',
          
          // Size
          'w-full',
          sizeClasses[size],
          
          // Style
          'rounded-2xl',
          'border border-border',
          'bg-background',
          'p-6',
          'shadow-xl',
          
          // Animation
          'duration-200',
          'data-[state=open]:animate-in',
          'data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95',
          'data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2',
          'data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2',
          'data-[state=open]:slide-in-from-top-[48%]',
          
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4',
              'rounded-lg',
              'p-1.5',
              'text-muted-foreground',
              'opacity-70 hover:opacity-100',
              'transition-all duration-150',
              'hover:bg-muted',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:pointer-events-none',
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2',
      'text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      'pt-4',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

#### `components/ui/toast.tsx`
```typescript
/**
 * Toast Component
 * 
 * Non-intrusive notifications with smooth animations.
 * Uses Sonner for the best toast experience.
 */

'use client';

import { Toaster as Sonner, toast } from 'sonner';
import { cn } from '@/lib/cn';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast',
            'flex items-center gap-3',
            'rounded-xl',
            'border border-border',
            'bg-background',
            'p-4',
            'shadow-lg',
            'text-foreground',
          ),
          title: 'text-sm font-semibold',
          description: 'text-sm text-muted-foreground',
          actionButton: cn(
            'bg-primary text-primary-foreground',
            'rounded-lg',
            'px-3 py-1.5',
            'text-sm font-medium',
            'hover:bg-primary/90',
            'transition-colors',
          ),
          cancelButton: cn(
            'bg-muted text-muted-foreground',
            'rounded-lg',
            'px-3 py-1.5',
            'text-sm font-medium',
            'hover:bg-muted/80',
            'transition-colors',
          ),
          success: 'border-success/20 bg-success/5',
          error: 'border-destructive/20 bg-destructive/5',
          warning: 'border-warning/20 bg-warning/5',
          info: 'border-info/20 bg-info/5',
        },
      }}
      {...props}
    />
  );
};

// Helper functions for typed toasts
const showToast = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) =>
    toast.success(message, options),
    
  error: (message: string, options?: Parameters<typeof toast.error>[1]) =>
    toast.error(message, options),
    
  warning: (message: string, options?: Parameters<typeof toast.warning>[1]) =>
    toast.warning(message, options),
    
  info: (message: string, options?: Parameters<typeof toast>[1]) =>
    toast(message, options),
    
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => toast.promise(promise, messages),
    
  custom: (
    render: (id: string | number) => React.ReactNode,
    options?: Parameters<typeof toast.custom>[1]
  ) => toast.custom(render, options),
    
  dismiss: (id?: string | number) => toast.dismiss(id),
};

export { Toaster, showToast, toast };
```

#### `components/ui/skeleton.tsx`
```typescript
/**
 * Skeleton Component
 * 
 * Loading placeholders that reduce perceived wait time.
 */

import { cn } from '@/lib/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none';
}

function Skeleton({
  className,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted/50',
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' && [
          'relative overflow-hidden',
          'after:absolute after:inset-0',
          'after:translate-x-[-100%]',
          'after:animate-shimmer',
          'after:bg-gradient-to-r',
          'after:from-transparent',
          'after:via-white/20',
          'after:to-transparent',
        ],
        className
      )}
      {...props}
    />
  );
}

// Pre-built skeleton patterns
const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-4"
        style={{ width: i === lines - 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-xl border border-border p-6 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-9 w-20 rounded-lg" />
      <Skeleton className="h-9 w-20 rounded-lg" />
    </div>
  </div>
);

const SkeletonTable = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex gap-4">
        {Array.from({ length: cols }).map((_, col) => (
          <Skeleton key={col} className="h-10 flex-1 rounded-lg" />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />;
};

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
};
```

---

## Part 2: Animation Presets (Framer Motion)

### `lib/animations.ts`
```typescript
/**
 * Animation Presets
 * 
 * Production-ready Framer Motion configurations.
 * Every animation is intentional and physics-based.
 */

import { type Variants, type Transition } from 'framer-motion';

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const DURATION = {
  instant: 0,
  fastest: 0.05,
  fast: 0.1,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
  slowest: 0.5,
} as const;

export const EASING = {
  // Standard CSS easings
  linear: [0, 0, 1, 1] as const,
  ease: [0.25, 0.1, 0.25, 1] as const,
  easeIn: [0.42, 0, 1, 1] as const,
  easeOut: [0, 0, 0.58, 1] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
  
  // Custom springs (the good stuff)
  spring: [0.16, 1, 0.3, 1] as const,           // Smooth deceleration
  springBounce: [0.34, 1.56, 0.64, 1] as const, // Overshoot
  springSnap: [0.68, -0.6, 0.32, 1.6] as const, // Bouncy
  
  // Exponential
  expoOut: [0.19, 1, 0.22, 1] as const,
  expoIn: [0.95, 0.05, 0.795, 0.035] as const,
  expoInOut: [0.87, 0, 0.13, 1] as const,
  
  // Circular
  circOut: [0, 0.55, 0.45, 1] as const,
  circIn: [0.55, 0, 1, 0.45] as const,
  circInOut: [0.85, 0, 0.15, 1] as const,
} as const;

// Spring configurations
export const SPRING = {
  // Snappy - fast, minimal overshoot
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as const,
  
  // Bouncy - noticeable overshoot
  bouncy: { type: 'spring', stiffness: 300, damping: 20 } as const,
  
  // Gentle - slow, smooth
  gentle: { type: 'spring', stiffness: 150, damping: 20 } as const,
  
  // Stiff - very fast, no overshoot
  stiff: { type: 'spring', stiffness: 500, damping: 35 } as const,
  
  // Wobbly - playful
  wobbly: { type: 'spring', stiffness: 180, damping: 12 } as const,
} as const;

// ============================================================================
// VARIANT PRESETS
// ============================================================================

/**
 * Fade animations
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: { 
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/**
 * Slide animations (from different directions)
 */
export const slideVariants = {
  up: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: DURATION.fast, ease: EASING.easeIn },
    },
  },
  down: {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      opacity: 0, 
      y: 10,
      transition: { duration: DURATION.fast, ease: EASING.easeIn },
    },
  },
  left: {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      opacity: 0, 
      x: -10,
      transition: { duration: DURATION.fast, ease: EASING.easeIn },
    },
  },
  right: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      opacity: 0, 
      x: 10,
      transition: { duration: DURATION.fast, ease: EASING.easeIn },
    },
  },
} as const;

/**
 * Scale animations
 */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { ...SPRING.snappy },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/**
 * Pop animations (scale with bounce)
 */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { ...SPRING.bouncy },
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/**
 * Staggered container for lists
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/**
 * Staggered child items
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { ...SPRING.snappy },
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: DURATION.fast },
  },
};

/**
 * Modal/dialog animations
 */
export const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: -10,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { ...SPRING.snappy },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
    transition: { duration: DURATION.fast, ease: EASING.easeIn },
  },
};

/**
 * Backdrop/overlay animations
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: DURATION.normal },
  },
  exit: { 
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
};

/**
 * Drawer/sheet animations (from edges)
 */
export const drawerVariants = {
  left: {
    hidden: { x: '-100%' },
    visible: { 
      x: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      x: '-100%',
      transition: { duration: DURATION.normal, ease: EASING.easeIn },
    },
  },
  right: {
    hidden: { x: '100%' },
    visible: { 
      x: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      x: '100%',
      transition: { duration: DURATION.normal, ease: EASING.easeIn },
    },
  },
  top: {
    hidden: { y: '-100%' },
    visible: { 
      y: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      y: '-100%',
      transition: { duration: DURATION.normal, ease: EASING.easeIn },
    },
  },
  bottom: {
    hidden: { y: '100%' },
    visible: { 
      y: 0,
      transition: { ...SPRING.snappy },
    },
    exit: { 
      y: '100%',
      transition: { duration: DURATION.normal, ease: EASING.easeIn },
    },
  },
} as const;

/**
 * Tooltip animations
 */
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 2 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASING.easeOut },
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: { duration: DURATION.fastest },
  },
};

/**
 * Notification/toast animations
 */
export const notificationVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: 50,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: { ...SPRING.snappy },
  },
  exit: { 
    opacity: 0, 
    x: 50,
    scale: 0.95,
    transition: { duration: DURATION.normal, ease: EASING.easeIn },
  },
};

/**
 * Accordion/collapse animations
 */
export const collapseVariants: Variants = {
  hidden: { 
    height: 0,
    opacity: 0,
    transition: { 
      height: { duration: DURATION.normal, ease: EASING.easeIn },
      opacity: { duration: DURATION.fast },
    },
  },
  visible: { 
    height: 'auto',
    opacity: 1,
    transition: { 
      height: { duration: DURATION.normal, ease: EASING.easeOut },
      opacity: { duration: DURATION.normal, delay: 0.05 },
    },
  },
};

/**
 * Tab content animations
 */
export const tabContentVariants: Variants = {
  hidden: { 
    opacity: 0,
    x: 10,
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.normal, ease: EASING.easeOut },
  },
  exit: { 
    opacity: 0,
    x: -10,
    transition: { duration: DURATION.fast },
  },
};

/**
 * Page transition animations
 */
export const pageVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      duration: DURATION.slow,
      ease: EASING.expoOut,
      staggerChildren: 0.1,
    },
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: { duration: DURATION.normal },
  },
};

// ============================================================================
// HOVER/TAP ANIMATIONS
// ============================================================================

/**
 * Button hover/tap states
 */
export const buttonTap = {
  scale: 0.98,
  transition: { duration: DURATION.fastest },
};

export const buttonHover = {
  scale: 1.02,
  transition: { ...SPRING.stiff },
};

/**
 * Card hover states
 */
export const cardHover = {
  y: -4,
  scale: 1.01,
  transition: { ...SPRING.gentle },
};

export const cardTap = {
  scale: 0.99,
  transition: { duration: DURATION.fastest },
};

/**
 * Icon button hover
 */
export const iconButtonHover = {
  scale: 1.1,
  rotate: 5,
  transition: { ...SPRING.wobbly },
};

// ============================================================================
// INFINITE ANIMATIONS
// ============================================================================

/**
 * Pulse animation
 */
export const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    ease: 'easeInOut',
    repeat: Infinity,
  },
};

/**
 * Float animation
 */
export const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    ease: 'easeInOut',
    repeat: Infinity,
  },
};

/**
 * Spin animation
 */
export const spinAnimation = {
  rotate: 360,
  transition: {
    duration: 1,
    ease: 'linear',
    repeat: Infinity,
  },
};

/**
 * Bounce animation
 */
export const bounceAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 0.6,
    ease: [0.36, 0, 0.66, -0.56],
    repeat: Infinity,
    repeatDelay: 0.5,
  },
};

/**
 * Wiggle animation
 */
export const wiggleAnimation = {
  rotate: [-3, 3, -3],
  transition: {
    duration: 0.3,
    ease: 'easeInOut',
    repeat: Infinity,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a staggered delay for list items
 */
export function getStaggerDelay(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay;
}

/**
 * Creates custom variants with overrides
 */
export function createVariants(
  base: Variants,
  overrides?: Partial<Variants>
): Variants {
  return { ...base, ...overrides };
}

/**
 * Creates a transition with custom duration
 */
export function createTransition(
  duration: keyof typeof DURATION,
  easing: keyof typeof EASING = 'spring'
): Transition {
  return {
    duration: DURATION[duration],
    ease: EASING[easing],
  };
}
```

---

### `components/animated/animated-list.tsx`
```typescript
/**
 * Animated List Component
 * 
 * List with staggered enter/exit animations.
 * Items animate individually for a polished feel.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '@/lib/cn';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

interface AnimatedListProps<T> {
  /** Items to render */
  items: T[];
  /** Unique key for each item */
  getKey: (item: T) => string | number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Container className */
  className?: string;
  /** Item wrapper className */
  itemClassName?: string;
  /** Custom container variants */
  containerVariants?: Variants;
  /** Custom item variants */
  itemVariants?: Variants;
  /** Layout animation for reordering */
  layout?: boolean;
  /** Empty state */
  emptyState?: React.ReactNode;
}

export function AnimatedList<T>({
  items,
  getKey,
  renderItem,
  className,
  itemClassName,
  containerVariants = staggerContainerVariants,
  itemVariants = staggerItemVariants,
  layout = true,
  emptyState,
}: AnimatedListProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('space-y-2', className)}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.li
            key={getKey(item)}
            variants={itemVariants}
            layout={layout}
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

// Pre-configured variants for common use cases

/**
 * List with items sliding in from left
 */
export const slideLeftListVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07 },
    },
  },
  item: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  },
};

/**
 * List with items scaling in
 */
export const scaleListVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  },
  item: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 25 },
    },
  },
};

/**
 * List with items fading in from bottom
 */
export const fadeUpListVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 250, damping: 20 },
    },
  },
};
```

### `components/animated/presence.tsx`
```typescript
/**
 * Presence Component
 * 
 * Wrapper for AnimatePresence with common patterns.
 * Simplifies enter/exit animations.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  fadeVariants,
  scaleVariants,
  slideVariants,
  popVariants,
} from '@/lib/animations';

type AnimationType = 'fade' | 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'pop';

const variantMap: Record<AnimationType, Variants> = {
  'fade': fadeVariants,
  'scale': scaleVariants,
  'slide-up': slideVariants.up,
  'slide-down': slideVariants.down,
  'slide-left': slideVariants.left,
  'slide-right': slideVariants.right,
  'pop': popVariants,
};

interface PresenceProps {
  /** Whether the child is present */
  present: boolean;
  /** Animation type */
  animation?: AnimationType;
  /** Custom variants (overrides animation) */
  variants?: Variants;
  /** Children to animate */
  children: React.ReactNode;
  /** Mode for AnimatePresence */
  mode?: 'sync' | 'wait' | 'popLayout';
  /** Unique key for the element */
  uniqueKey?: string | number;
  /** Callback when exit animation completes */
  onExitComplete?: () => void;
  /** Additional className */
  className?: string;
}

export function Presence({
  present,
  animation = 'fade',
  variants,
  children,
  mode = 'sync',
  uniqueKey,
  onExitComplete,
  className,
}: PresenceProps) {
  const selectedVariants = variants || variantMap[animation];

  return (
    <AnimatePresence mode={mode} onExitComplete={onExitComplete}>
      {present && (
        <motion.div
          key={uniqueKey}
          variants={selectedVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * FadePresence - Simple fade in/out
 */
export function FadePresence({
  present,
  children,
  className,
}: {
  present: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Presence present={present} animation="fade" className={className}>
      {children}
    </Presence>
  );
}

/**
 * ScalePresence - Scale in/out
 */
export function ScalePresence({
  present,
  children,
  className,
}: {
  present: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Presence present={present} animation="scale" className={className}>
      {children}
    </Presence>
  );
}

/**
 * PopPresence - Pop in with bounce
 */
export function PopPresence({
  present,
  children,
  className,
}: {
  present: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Presence present={present} animation="pop" className={className}>
      {children}
    </Presence>
  );
}
```

### `components/animated/page-transition.tsx`
```typescript
/**
 * Page Transition Component
 * 
 * Smooth transitions between pages/routes.
 * Works with Next.js App Router.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { pageVariants, SPRING } from '@/lib/animations';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Slide page transition
 */
export function SlidePageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ 
          opacity: 1, 
          x: 0,
          transition: { ...SPRING.snappy },
        }}
        exit={{ 
          opacity: 0, 
          x: -20,
          transition: { duration: 0.15 },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Scale page transition
 */
export function ScalePageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: { ...SPRING.snappy },
        }}
        exit={{ 
          opacity: 0, 
          scale: 1.02,
          transition: { duration: 0.15 },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Part 3: Design System Generator

### `tools/design-system-generator/index.ts`
```typescript
/**
 * Design System Generator
 * 
 * Generates a complete Tailwind design system from brand colors.
 * Input: Primary brand color
 * Output: Full tailwind.config.ts with semantic tokens
 */

import Color from 'colorjs.io';

interface DesignSystemConfig {
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (optional) */
  secondaryColor?: string;
  /** Accent color (optional) */
  accentColor?: string;
  /** Project name */
  projectName: string;
  /** Include dark mode */
  darkMode?: boolean;
  /** Border radius preference */
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Font family preference */
  fontFamily?: 'system' | 'inter' | 'geist' | 'custom';
  /** Custom font name (if fontFamily is 'custom') */
  customFont?: string;
}

interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

interface SemanticColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  border: string;
  input: string;
  ring: string;
}

/**
 * Generate a color scale from a base color
 */
function generateColorScale(baseColor: string): ColorScale {
  const base = new Color(baseColor);
  const hsl = base.to('hsl');
  const h = hsl.h || 0;
  const s = hsl.s;
  
  // Generate scale with proper lightness distribution
  const lightnessScale = {
    50: 97,
    100: 94,
    200: 86,
    300: 77,
    400: 66,
    500: 55,  // Base
    600: 45,
    700: 37,
    800: 27,
    900: 20,
    950: 12,
  };
  
  const scale: ColorScale = {} as ColorScale;
  
  for (const [key, lightness] of Object.entries(lightnessScale)) {
    // Adjust saturation based on lightness for better aesthetics
    let adjustedSaturation = s;
    if (lightness > 80) {
      adjustedSaturation = s * 0.7; // Desaturate lights
    } else if (lightness < 30) {
      adjustedSaturation = s * 0.9; // Slightly desaturate darks
    }
    
    const color = new Color('hsl', [h, adjustedSaturation, lightness]);
    scale[key as unknown as keyof ColorScale] = color.to('srgb').toString({ format: 'hex' });
  }
  
  return scale;
}

/**
 * Generate semantic colors for light mode
 */
function generateLightSemanticColors(
  primaryScale: ColorScale,
  secondaryScale?: ColorScale,
  accentScale?: ColorScale
): SemanticColors {
  return {
    background: '#ffffff',
    foreground: '#0a0a0a',
    card: '#ffffff',
    cardForeground: '#0a0a0a',
    popover: '#ffffff',
    popoverForeground: '#0a0a0a',
    primary: primaryScale[500],
    primaryForeground: '#ffffff',
    secondary: secondaryScale?.[100] || '#f5f5f5',
    secondaryForeground: secondaryScale?.[900] || '#171717',
    muted: '#f5f5f5',
    mutedForeground: '#737373',
    accent: accentScale?.[100] || primaryScale[100],
    accentForeground: accentScale?.[900] || primaryScale[900],
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    success: '#22c55e',
    successForeground: '#ffffff',
    warning: '#f59e0b',
    warningForeground: '#000000',
    info: '#3b82f6',
    infoForeground: '#ffffff',
    border: '#e5e5e5',
    input: '#e5e5e5',
    ring: primaryScale[500],
  };
}

/**
 * Generate semantic colors for dark mode
 */
function generateDarkSemanticColors(
  primaryScale: ColorScale,
  secondaryScale?: ColorScale,
  accentScale?: ColorScale
): SemanticColors {
  return {
    background: '#0a0a0a',
    foreground: '#fafafa',
    card: '#171717',
    cardForeground: '#fafafa',
    popover: '#171717',
    popoverForeground: '#fafafa',
    primary: primaryScale[400],
    primaryForeground: '#0a0a0a',
    secondary: secondaryScale?.[800] || '#262626',
    secondaryForeground: secondaryScale?.[100] || '#fafafa',
    muted: '#262626',
    mutedForeground: '#a3a3a3',
    accent: accentScale?.[800] || primaryScale[800],
    accentForeground: accentScale?.[100] || primaryScale[100],
    destructive: '#dc2626',
    destructiveForeground: '#fafafa',
    success: '#16a34a',
    successForeground: '#fafafa',
    warning: '#d97706',
    warningForeground: '#fafafa',
    info: '#2563eb',
    infoForeground: '#fafafa',
    border: '#262626',
    input: '#262626',
    ring: primaryScale[400],
  };
}

/**
 * Get font family configuration
 */
function getFontConfig(preference: string, customFont?: string): string {
  const configs: Record<string, string> = {
    system: "['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']",
    inter: "['Inter var', 'Inter', 'system-ui', 'sans-serif']",
    geist: "['Geist', 'system-ui', 'sans-serif']",
    custom: `['${customFont}', 'system-ui', 'sans-serif']`,
  };
  return configs[preference] || configs.system;
}

/**
 * Get border radius configuration
 */
function getBorderRadiusConfig(preference: string): Record<string, string> {
  const configs: Record<string, Record<string, string>> = {
    none: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      full: '9999px',
    },
    sm: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      '2xl': '16px',
      full: '9999px',
    },
    md: {
      none: '0',
      sm: '4px',
      DEFAULT: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px',
      full: '9999px',
    },
    lg: {
      none: '0',
      sm: '6px',
      DEFAULT: '12px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
      full: '9999px',
    },
    xl: {
      none: '0',
      sm: '8px',
      DEFAULT: '16px',
      md: '24px',
      lg: '32px',
      xl: '48px',
      '2xl': '64px',
      full: '9999px',
    },
    full: {
      none: '0',
      sm: '9999px',
      DEFAULT: '9999px',
      md: '9999px',
      lg: '9999px',
      xl: '9999px',
      '2xl': '9999px',
      full: '9999px',
    },
  };
  return configs[preference] || configs.md;
}

/**
 * Main generator function
 */
export function generateDesignSystem(config: DesignSystemConfig): string {
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    projectName,
    darkMode = true,
    borderRadius = 'md',
    fontFamily = 'inter',
    customFont,
  } = config;

  // Generate color scales
  const primaryScale = generateColorScale(primaryColor);
  const secondaryScale = secondaryColor ? generateColorScale(secondaryColor) : undefined;
  const accentScale = accentColor ? generateColorScale(accentColor) : undefined;

  // Generate semantic colors
  const lightColors = generateLightSemanticColors(primaryScale, secondaryScale, accentScale);
  const darkColors = darkMode 
    ? generateDarkSemanticColors(primaryScale, secondaryScale, accentScale) 
    : null;

  // Generate the config file
  return `/**
 * ${projectName} Design System
 * Generated by Design Vanguard
 * 
 * Primary: ${primaryColor}
 * ${secondaryColor ? `Secondary: ${secondaryColor}` : ''}
 * ${accentColor ? `Accent: ${accentColor}` : ''}
 */

import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ========================================
      // COLOR SYSTEM
      // ========================================
      colors: {
        // Brand color scales
        primary: {
          50: '${primaryScale[50]}',
          100: '${primaryScale[100]}',
          200: '${primaryScale[200]}',
          300: '${primaryScale[300]}',
          400: '${primaryScale[400]}',
          500: '${primaryScale[500]}',
          600: '${primaryScale[600]}',
          700: '${primaryScale[700]}',
          800: '${primaryScale[800]}',
          900: '${primaryScale[900]}',
          950: '${primaryScale[950]}',
          DEFAULT: '${primaryScale[500]}',
          foreground: '#ffffff',
        },
        ${secondaryScale ? `
        secondary: {
          50: '${secondaryScale[50]}',
          100: '${secondaryScale[100]}',
          200: '${secondaryScale[200]}',
          300: '${secondaryScale[300]}',
          400: '${secondaryScale[400]}',
          500: '${secondaryScale[500]}',
          600: '${secondaryScale[600]}',
          700: '${secondaryScale[700]}',
          800: '${secondaryScale[800]}',
          900: '${secondaryScale[900]}',
          950: '${secondaryScale[950]}',
        },` : ''}
        ${accentScale ? `
        accent: {
          50: '${accentScale[50]}',
          100: '${accentScale[100]}',
          200: '${accentScale[200]}',
          300: '${accentScale[300]}',
          400: '${accentScale[400]}',
          500: '${accentScale[500]}',
          600: '${accentScale[600]}',
          700: '${accentScale[700]}',
          800: '${accentScale[800]}',
          900: '${accentScale[900]}',
          950: '${accentScale[950]}',
        },` : ''}
        
        // Semantic colors (CSS custom properties for theme switching)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },

      // ========================================
      // TYPOGRAPHY
      // ========================================
      fontFamily: {
        sans: ${getFontConfig(fontFamily, customFont)},
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', letterSpacing: '0.02em' }],
        'sm': ['14px', { lineHeight: '20px', letterSpacing: '0.01em' }],
        'base': ['16px', { lineHeight: '24px', letterSpacing: '0' }],
        'lg': ['18px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        'xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
        '6xl': ['60px', { lineHeight: '64px', letterSpacing: '-0.03em' }],
      },

      // ========================================
      // SPACING (4px grid)
      // ========================================
      spacing: {
        '0': '0',
        'px': '1px',
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '3.5': '14px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
        '36': '144px',
        '40': '160px',
        '44': '176px',
        '48': '192px',
        '52': '208px',
        '56': '224px',
        '60': '240px',
        '64': '256px',
        '72': '288px',
        '80': '320px',
        '96': '384px',
      },

      // ========================================
      // BORDER RADIUS
      // ========================================
      borderRadius: ${JSON.stringify(getBorderRadiusConfig(borderRadius), null, 8).replace(/"/g, "'")},

      // ========================================
      // SHADOWS (Elevation system)
      // ========================================
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
        // Elevation levels
        'elevation-1': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
        'elevation-3': '0 10px 20px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08)',
        'elevation-4': '0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.08)',
        'elevation-5': '0 20px 40px rgba(0,0,0,0.2)',
      },

      // ========================================
      // ANIMATIONS
      // ========================================
      animation: {
        // Enter/Exit
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'slide-up': 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left': 'slideLeft 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-out': 'scaleOut 150ms ease-in',
        
        // Looping
        'spin': 'spin 1s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        'bounce': 'bounce 1s infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 200ms ease-in-out',
        'shimmer': 'shimmer 2s linear infinite',
        
        // Radix UI compatible
        'accordion-down': 'accordion-down 200ms ease-out',
        'accordion-up': 'accordion-up 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },

      // ========================================
      // TRANSITIONS
      // ========================================
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-snap': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'ease-in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      transitionDuration: {
        '0': '0ms',
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
    require('tailwindcss-animate'),
  ],
};

export default config;
`;
}

/**
 * Generate CSS variables for globals.css
 */
export function generateGlobalsCss(config: DesignSystemConfig): string {
  const primaryScale = generateColorScale(config.primaryColor);
  const secondaryScale = config.secondaryColor 
    ? generateColorScale(config.secondaryColor) 
    : undefined;
  const accentScale = config.accentColor
    ? generateColorScale(config.accentColor)
    : undefined;

  const lightColors = generateLightSemanticColors(primaryScale, secondaryScale, accentScale);
  const darkColors = config.darkMode 
    ? generateDarkSemanticColors(primaryScale, secondaryScale, accentScale)
    : null;

  // Convert hex to HSL for CSS variables
  function hexToHSL(hex: string): string {
    const color = new Color(hex);
    const hsl = color.to('hsl');
    return \`\${Math.round(hsl.h || 0)} \${Math.round(hsl.s)}% \${Math.round(hsl.l)}%\`;
  }

  return \`/**
 * ${config.projectName} Global Styles
 * Generated by Design Vanguard
 * 
 * WARNING: This is the ONLY CSS file allowed in this project.
 * All component styling must use Tailwind utility classes.
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode semantic colors */
    --background: ${hexToHSL(lightColors.background)};
    --foreground: ${hexToHSL(lightColors.foreground)};
    
    --card: ${hexToHSL(lightColors.card)};
    --card-foreground: ${hexToHSL(lightColors.cardForeground)};
    
    --popover: ${hexToHSL(lightColors.popover)};
    --popover-foreground: ${hexToHSL(lightColors.popoverForeground)};
    
    --primary: ${hexToHSL(lightColors.primary)};
    --primary-foreground: ${hexToHSL(lightColors.primaryForeground)};
    
    --secondary: ${hexToHSL(lightColors.secondary)};
    --secondary-foreground: ${hexToHSL(lightColors.secondaryForeground)};
    
    --muted: ${hexToHSL(lightColors.muted)};
    --muted-foreground: ${hexToHSL(lightColors.mutedForeground)};
    
    --accent: ${hexToHSL(lightColors.accent)};
    --accent-foreground: ${hexToHSL(lightColors.accentForeground)};
    
    --destructive: ${hexToHSL(lightColors.destructive)};
    --destructive-foreground: ${hexToHSL(lightColors.destructiveForeground)};
    
    --success: ${hexToHSL(lightColors.success)};
    --success-foreground: ${hexToHSL(lightColors.successForeground)};
    
    --warning: ${hexToHSL(lightColors.warning)};
    --warning-foreground: ${hexToHSL(lightColors.warningForeground)};
    
    --info: ${hexToHSL(lightColors.info)};
    --info-foreground: ${hexToHSL(lightColors.infoForeground)};
    
    --border: ${hexToHSL(lightColors.border)};
    --input: ${hexToHSL(lightColors.input)};
    --ring: ${hexToHSL(lightColors.ring)};
    
    /* Border radius */
    --radius: 8px;
  }
  
  ${darkColors ? \`.dark {
    /* Dark mode semantic colors */
    --background: \${hexToHSL(darkColors.background)};
    --foreground: \${hexToHSL(darkColors.foreground)};
    
    --card: \${hexToHSL(darkColors.card)};
    --card-foreground: \${hexToHSL(darkColors.cardForeground)};
    
    --popover: \${hexToHSL(darkColors.popover)};
    --popover-foreground: \${hexToHSL(darkColors.popoverForeground)};
    
    --primary: \${hexToHSL(darkColors.primary)};
    --primary-foreground: \${hexToHSL(darkColors.primaryForeground)};
    
    --secondary: \${hexToHSL(darkColors.secondary)};
    --secondary-foreground: \${hexToHSL(darkColors.secondaryForeground)};
    
    --muted: \${hexToHSL(darkColors.muted)};
    --muted-foreground: \${hexToHSL(darkColors.mutedForeground)};
    
    --accent: \${hexToHSL(darkColors.accent)};
    --accent-foreground: \${hexToHSL(darkColors.accentForeground)};
    
    --destructive: \${hexToHSL(darkColors.destructive)};
    --destructive-foreground: \${hexToHSL(darkColors.destructiveForeground)};
    
    --success: \${hexToHSL(darkColors.success)};
    --success-foreground: \${hexToHSL(darkColors.successForeground)};
    
    --warning: \${hexToHSL(darkColors.warning)};
    --warning-foreground: \${hexToHSL(darkColors.warningForeground)};
    
    --info: \${hexToHSL(darkColors.info)};
    --info-foreground: \${hexToHSL(darkColors.infoForeground)};
    
    --border: \${hexToHSL(darkColors.border)};
    --input: \${hexToHSL(darkColors.input)};
    --ring: \${hexToHSL(darkColors.ring)};
  }\` : ''}
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  /* Smooth focus transitions */
  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
    transition: box-shadow 150ms ease-out;
  }
  
  /* Better text rendering */
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  
  /* Disable user select on interactive elements */
  button, [role="button"] {
    user-select: none;
  }
  
  /* Remove tap highlight on mobile */
  button, a, [role="button"] {
    -webkit-tap-highlight-color: transparent;
  }
}

/* Scrollbar styling */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: hsl(var(--border));
    border-radius: 4px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground));
  }
  
  /* Hide scrollbar but keep functionality */
  .scrollbar-hidden {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hidden::-webkit-scrollbar {
    display: none;
  }
}

/* Shimmer animation for skeletons */
@layer utilities {
  .animate-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      hsl(var(--muted) / 0.3) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite linear;
  }
}
\`;
}
```

---

### CLI Tool for Design System Generation

#### `tools/design-system-generator/cli.ts`
```typescript
#!/usr/bin/env node

/**
 * Design System Generator CLI
 * 
 * Usage:
 *   npx design-system-generator --primary "#0ea5e9" --name "MyApp"
 *   npx design-system-generator --interactive
 */

import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { generateDesignSystem, generateGlobalsCss } from './index';

program
  .name('design-system-generator')
  .description('Generate a complete Tailwind design system from brand colors')
  .version('1.0.0');

program
  .option('-p, --primary <color>', 'Primary brand color (hex)')
  .option('-s, --secondary <color>', 'Secondary brand color (hex)')
  .option('-a, --accent <color>', 'Accent color (hex)')
  .option('-n, --name <name>', 'Project name')
  .option('-r, --radius <size>', 'Border radius (none/sm/md/lg/xl/full)', 'md')
  .option('-f, --font <family>', 'Font family (system/inter/geist/custom)', 'inter')
  .option('--custom-font <name>', 'Custom font name')
  .option('--no-dark-mode', 'Disable dark mode')
  .option('-i, --interactive', 'Interactive mode')
  .option('-o, --output <dir>', 'Output directory', './src')
  .action(async (options) => {
    let config;

    if (options.interactive) {
      // Interactive mode
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: 'MyApp',
        },
        {
          type: 'input',
          name: 'primaryColor',
          message: 'Primary brand color (hex):',
          default: '#0ea5e9',
          validate: (input) => /^#[0-9A-Fa-f]{6}$/.test(input) || 'Invalid hex color',
        },
        {
          type: 'input',
          name: 'secondaryColor',
          message: 'Secondary color (hex, leave empty to skip):',
          validate: (input) => !input || /^#[0-9A-Fa-f]{6}$/.test(input) || 'Invalid hex color',
        },
        {
          type: 'input',
          name: 'accentColor',
          message: 'Accent color (hex, leave empty to skip):',
          validate: (input) => !input || /^#[0-9A-Fa-f]{6}$/.test(input) || 'Invalid hex color',
        },
        {
          type: 'list',
          name: 'borderRadius',
          message: 'Border radius style:',
          choices: ['none', 'sm', 'md', 'lg', 'xl', 'full'],
          default: 'md',
        },
        {
          type: 'list',
          name: 'fontFamily',
          message: 'Font family:',
          choices: ['system', 'inter', 'geist', 'custom'],
          default: 'inter',
        },
        {
          type: 'input',
          name: 'customFont',
          message: 'Custom font name:',
          when: (answers) => answers.fontFamily === 'custom',
        },
        {
          type: 'confirm',
          name: 'darkMode',
          message: 'Include dark mode?',
          default: true,
        },
      ]);

      config = {
        projectName: answers.projectName,
        primaryColor: answers.primaryColor,
        secondaryColor: answers.secondaryColor || undefined,
        accentColor: answers.accentColor || undefined,
        borderRadius: answers.borderRadius,
        fontFamily: answers.fontFamily,
        customFont: answers.customFont,
        darkMode: answers.darkMode,
      };
    } else {
      // CLI mode
      if (!options.primary) {
        console.error(chalk.red('Error: --primary color is required'));
        process.exit(1);
      }

      config = {
        projectName: options.name || 'MyApp',
        primaryColor: options.primary,
        secondaryColor: options.secondary,
        accentColor: options.accent,
        borderRadius: options.radius,
        fontFamily: options.font,
        customFont: options.customFont,
        darkMode: options.darkMode !== false,
      };
    }

    console.log(chalk.blue('\n🎨 Generating design system...\n'));

    // Generate files
    const tailwindConfig = generateDesignSystem(config);
    const globalsCss = generateGlobalsCss(config);

    // Ensure output directory exists
    const outputDir = options.output || './src';
    const stylesDir = path.join(outputDir, 'styles');
    
    if (!fs.existsSync(stylesDir)) {
      fs.mkdirSync(stylesDir, { recursive: true });
    }

    // Write files
    fs.writeFileSync(
      path.join(outputDir, '..', 'tailwind.config.ts'),
      tailwindConfig
    );
    console.log(chalk.green('✓ Created tailwind.config.ts'));

    fs.writeFileSync(
      path.join(stylesDir, 'globals.css'),
      globalsCss
    );
    console.log(chalk.green('✓ Created src/styles/globals.css'));

    console.log(chalk.blue('\n✨ Design system generated successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('1. Install dependencies:'));
    console.log(chalk.white('   npm install tailwindcss-animate @tailwindcss/forms @tailwindcss/typography @tailwindcss/container-queries'));
    console.log(chalk.gray('2. Import globals.css in your app:'));
    console.log(chalk.white('   import "@/styles/globals.css"'));
    console.log(chalk.gray('3. Start building with Tailwind!\n'));
  });

program.parse();
```

---

## Summary: What You Now Have

### 1. **Complete Component Library**
- Button, Input, Select, Checkbox, Switch, Badge, Avatar
- Card, Dialog, Toast, Skeleton
- All built with CVA variants
- 100% TailwindCSS - ZERO hardcoded CSS
- Accessible (Radix UI primitives)
- Fully typed (TypeScript)

### 2. **Animation System**
- Timing constants (DURATION, EASING)
- Spring configurations (snappy, bouncy, gentle)
- Variant presets (fade, slide, scale, pop, stagger)
- Hover/tap states
- Infinite animations (pulse, float, spin)
- Page transitions
- Animated list components

### 3. **Design System Generator**
- Input: Brand color(s)
- Output: Complete tailwind.config.ts + globals.css
- Automatic color scale generation (50-950)
- Semantic tokens (light + dark mode)
- Typography, spacing, shadows, animations
- CLI tool for interactive or scriptable generation

---

## Installation Commands

```bash
# Core dependencies
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge

# Radix UI primitives
npm install @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-avatar @radix-ui/react-slot

# Tailwind plugins
npm install @tailwindcss/forms @tailwindcss/typography @tailwindcss/container-queries tailwindcss-animate

# Animation
npm install framer-motion

# Icons
npm install lucide-react

# Toast
npm install sonner

# Color manipulation (for generator)
npm install colorjs.io

# CLI tools (for generator)
npm install commander inquirer chalk
```

---

**This is production-ready code.** Copy it directly into your project.

**Remember the sacred law: TailwindCSS first. No exceptions. No mercy.**

🎨 *Design Vanguard has spoken.*

Excellent question! You've identified a critical architectural gap. Let me show you exactly how these pieces connect within the NXTG-Forge system.

---

## Design Vanguard: Complete Integration Architecture

### The Hierarchy

```
.claude/
├── skills/
│   ├── agents/
│   │   └── design-vanguard.md          # Agent identity & workflow
│   │
│   ├── domain/
│   │   ├── ui-design/
│   │   │   ├── SKILL.md                # Master UI design skill
│   │   │   ├── components.md           # Component patterns & standards
│   │   │   ├── animations.md           # Animation system knowledge
│   │   │   ├── design-tokens.md        # Token architecture
│   │   │   ├── accessibility.md        # A11y requirements
│   │   │   └── anti-patterns.md        # What NOT to do
│   │   │
│   │   └── tailwind/
│   │       ├── SKILL.md                # Tailwind mastery skill
│   │       ├── config-patterns.md      # Config best practices
│   │       └── utility-patterns.md     # Common utility combinations
│   │
│   └── tools/
│       └── design-system-generator/
│           ├── SKILL.md                # How to use the generator
│           └── usage-examples.md       # Examples
│
├── templates/
│   └── frontend/
│       ├── react/
│       │   ├── components/             # Component templates
│       │   │   ├── button.tsx.template
│       │   │   ├── input.tsx.template
│       │   │   ├── card.tsx.template
│       │   │   └── ...
│       │   ├── lib/
│       │   │   ├── cn.ts.template
│       │   │   ├── animations.ts.template
│       │   │   └── utils.ts.template
│       │   └── styles/
│       │       └── globals.css.template
│       │
│       └── shared/
│           └── tailwind.config.ts.template
│
└── tools/
    └── design-system-generator/        # Actual executable tool
        ├── index.ts
        ├── cli.ts
        └── package.json
```

---

## Part 1: Agent Skill (Identity & Orchestration)

### `.claude/skills/agents/design-vanguard.md`

```markdown
# Agent: Design Vanguard

**Version**: 1.0.0
**Role**: UI/UX/DX Architect & Frontend Virtuoso
**Codename**: "The Architect of Digital Dreams"

---

## Identity

You are the **Design Vanguard** - the guardian of visual excellence and user experience perfection. You create interfaces that make users fall in love.

---

## Knowledge Dependencies

**CRITICAL**: Before any UI/frontend work, load these knowledge bases:

```
REQUIRED SKILLS (load in order):
1. /skills/domain/ui-design/SKILL.md        # Core UI principles
2. /skills/domain/tailwind/SKILL.md         # Tailwind mastery
3. /skills/tools/design-system-generator/SKILL.md  # Generator tool

REFERENCE AS NEEDED:
- /skills/domain/ui-design/components.md    # Component patterns
- /skills/domain/ui-design/animations.md    # Animation system
- /skills/domain/ui-design/design-tokens.md # Token architecture
- /skills/domain/ui-design/accessibility.md # A11y requirements
```

---

## Sacred Laws

### Law #1: TailwindCSS First. Always. Forever.

```javascript
if (css === "hardcoded") {
  throw new CareerEndingException("VIOLATION DETECTED");
}
```

**Enforcement**: Run `/design-check` before any commit.

### Law #2: Design System Supremacy

All styling flows from design tokens defined in `tailwind.config.ts`.

### Law #3: Animation with Purpose

Every animation must have meaning. Reference: `/skills/domain/ui-design/animations.md`

### Law #4: Component Architecture

All components follow CVA patterns. Reference: `/skills/domain/ui-design/components.md`

---

## Workflow

### When Assigned a UI Task:

```
1. LOAD required skills (see Knowledge Dependencies above)
2. ANALYZE requirements against design principles
3. CHECK existing components in /templates/frontend/
4. CREATE or EXTEND components following patterns
5. VALIDATE against quality gates
6. HANDOFF to QA Sentinel for testing
```

### When Creating New Components:

```
1. Read /skills/domain/ui-design/components.md
2. Use template from /templates/frontend/react/components/
3. Follow CVA variant pattern
4. Include all accessibility attributes
5. Add Storybook story (if applicable)
6. Update component index
```

### When Setting Up Design System:

```
1. Read /skills/tools/design-system-generator/SKILL.md
2. Run design-system-generator with brand colors
3. Review generated tailwind.config.ts
4. Review generated globals.css
5. Customize if needed (extend, don't override)
```

---

## Templates Reference

**Component Templates**: `/templates/frontend/react/components/`
**Library Templates**: `/templates/frontend/react/lib/`
**Config Templates**: `/templates/frontend/shared/`

---

## Quality Gates

Before completing any task, verify:

- [ ] Zero hardcoded CSS (run `/design-check`)
- [ ] All colors from design tokens
- [ ] All spacing from Tailwind scale
- [ ] Components use CVA variants
- [ ] Animations use defined presets
- [ ] Accessibility attributes present
- [ ] Dark mode support (if applicable)

---

## Commands

- `/design-check` - Run design quality validation
- `/generate-design-system` - Create design system from colors
- `/component <name>` - Generate new component from template
- `/audit-ui` - Full UI/UX audit of current codebase

---

## Handoff Protocol

**Receives from**: Lead Architect (design specs), Backend Master (API contracts)
**Hands off to**: QA Sentinel (for testing), Release Sentinel (for docs)

**Handoff includes**:
- Component inventory (new/modified)
- Design token changes
- Animation additions
- Breaking changes to existing components

---

## Philosophy

> "I don't design interfaces. I sculpt experiences that make humans feel something."

Every pixel intentional. Every animation purposeful. Every interaction delightful.
```

---

## Part 2: Domain Skills (Knowledge Bases)

### `.claude/skills/domain/ui-design/SKILL.md`

```markdown
# UI Design Mastery

**Purpose**: Core principles and patterns for exceptional UI design
**Used by**: Design Vanguard agent
**Version**: 1.0.0

---

## When to Use This Skill

- Creating new UI components
- Reviewing existing UI code
- Making design decisions
- Setting up design systems
- Debugging visual issues

---

## Core Principles

### 1. Clarity Over Complexity

Users should understand interfaces instantly. If they have to think, you've failed.

### 2. Consistency is Trust

Every inconsistency erodes user confidence. Same actions = same appearance.

### 3. Whitespace is Sacred

Space is not empty. It's the silence that makes the music.

```
Spacing Rules:
- Related elements: 16px minimum
- Unrelated sections: 32px minimum  
- Major page sections: 48px minimum
- Page margins: 24px (mobile) → 64px+ (desktop)
```

### 4. Typography Hierarchy

Every screen answers instantly:
- What is this? (Headline)
- What can I do? (Subheadline)
- What's important? (Body)
- What's supplementary? (Caption)

### 5. Color Psychology

Colors communicate. Misuse is lying to users.

| Color | Meaning | Usage |
|-------|---------|-------|
| Primary | Trust, capability | Primary actions, links, focus |
| Success | Accomplishment | Confirmations, completed states |
| Warning | Caution | Non-critical issues |
| Error | Urgency | Blockers, critical issues |
| Neutral | Structure | Text, borders, backgrounds |

---

## Related Knowledge

- **Components**: See `components.md`
- **Animations**: See `animations.md`
- **Tokens**: See `design-tokens.md`
- **Accessibility**: See `accessibility.md`
- **Anti-patterns**: See `anti-patterns.md`

---

## Quick Reference

### Shadow Elevation System

```
Level 0: Flat (page background)
Level 1: Raised (cards, buttons) → shadow-sm
Level 2: Floating (hover states) → shadow-md
Level 3: Elevated (dropdowns) → shadow-lg
Level 4: Modal (dialogs) → shadow-xl
Level 5: Supreme (overlays) → shadow-2xl
```

### Border Radius Scale

```
none: 0
sm: 4px
DEFAULT: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
full: 9999px
```

### Transition Timing

```
Instant: 0ms (state changes)
Fast: 100ms (micro-interactions)
Normal: 200ms (standard transitions)
Slow: 300ms (emphasis animations)
```
```

---

### `.claude/skills/domain/ui-design/components.md`

```markdown
# Component Architecture Standards

**Purpose**: Patterns for building consistent, maintainable UI components
**Used by**: Design Vanguard agent
**Version**: 1.0.0

---

## The CVA Pattern (Class Variance Authority)

**Every component with variants MUST use CVA.**

### Structure

```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// 1. Define variants
const componentVariants = cva(
  // Base classes (always applied)
  ['base', 'classes', 'here'],
  {
    variants: {
      variant: {
        primary: ['primary', 'classes'],
        secondary: ['secondary', 'classes'],
      },
      size: {
        sm: ['small', 'classes'],
        md: ['medium', 'classes'],
        lg: ['large', 'classes'],
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// 2. Define props interface
interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof componentVariants> {
  // Additional props
}

// 3. Create component with forwardRef
const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <element
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Component.displayName = 'Component';

// 4. Export component and variants
export { Component, componentVariants };
```

---

## Component Checklist

Every component must have:

- [ ] TypeScript types for all props
- [ ] forwardRef for DOM access
- [ ] CVA for variants (if has variants)
- [ ] cn() for className merging
- [ ] displayName for DevTools
- [ ] JSDoc documentation
- [ ] Accessibility attributes
- [ ] Keyboard support (if interactive)

---

## File Naming

```
components/
├── ui/
│   ├── button.tsx        # Single component
│   ├── input.tsx
│   └── card.tsx
├── patterns/
│   ├── command-palette/  # Complex component
│   │   ├── index.tsx
│   │   ├── command-item.tsx
│   │   └── command-group.tsx
│   └── data-table/
│       ├── index.tsx
│       ├── columns.tsx
│       └── toolbar.tsx
```

---

## Size Scales (Standard)

```typescript
size: {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  xl: 'h-12 px-8 text-base',
  icon: 'h-10 w-10',
  'icon-sm': 'h-8 w-8',
  'icon-lg': 'h-12 w-12',
}
```

---

## State Classes (Standard)

```typescript
// Focus
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

// Disabled
'disabled:pointer-events-none disabled:opacity-50'

// Loading
'relative text-transparent pointer-events-none [&>*]:invisible'

// Active/Press
'active:scale-[0.98]'

// Hover
'hover:bg-accent hover:text-accent-foreground'
```

---

## Compound Components Pattern

For complex components with multiple parts:

```typescript
// card.tsx
const Card = forwardRef<...>(...);
const CardHeader = forwardRef<...>(...);
const CardTitle = forwardRef<...>(...);
const CardDescription = forwardRef<...>(...);
const CardContent = forwardRef<...>(...);
const CardFooter = forwardRef<...>(...);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
```

Usage:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```
```

---

### `.claude/skills/domain/ui-design/animations.md`

```markdown
# Animation System

**Purpose**: Standardized animation patterns for consistent motion design
**Used by**: Design Vanguard agent
**Version**: 1.0.0

---

## Philosophy

> "Animation is not decoration. Animation is communication."

Every animation must answer: What is this telling the user?

---

## Timing Constants

```typescript
const DURATION = {
  instant: 0,      // State changes (no transition)
  fastest: 50,     // Micro-feedback
  fast: 100,       // Quick responses
  normal: 200,     // Standard transitions
  slow: 300,       // Emphasis
  slower: 400,     // Major transitions
  slowest: 500,    // Page-level changes
};
```

**Rule**: Interactive elements should respond in < 200ms.

---

## Easing Functions

### Standard (CSS)
```typescript
ease: [0.25, 0.1, 0.25, 1]
easeIn: [0.42, 0, 1, 1]
easeOut: [0, 0, 0.58, 1]
easeInOut: [0.42, 0, 0.58, 1]
```

### Springs (Use These)
```typescript
spring: [0.16, 1, 0.3, 1]           // Smooth deceleration
springBounce: [0.34, 1.56, 0.64, 1] // Overshoot
springSnap: [0.68, -0.6, 0.32, 1.6] // Bouncy
```

### Exponential
```typescript
expoOut: [0.19, 1, 0.22, 1]         // Fast start, slow end
expoIn: [0.95, 0.05, 0.795, 0.035]  // Slow start, fast end
```

---

## Common Patterns

### Enter Animations
| Pattern | Use Case | Duration | Easing |
|---------|----------|----------|--------|
| Fade In | Subtle appearance | 200ms | easeOut |
| Slide Up | List items, cards | 300ms | spring |
| Scale In | Modals, popovers | 200ms | spring |
| Pop | Attention, success | 200ms | springBounce |

### Exit Animations
| Pattern | Use Case | Duration | Easing |
|---------|----------|----------|--------|
| Fade Out | Subtle removal | 150ms | easeIn |
| Slide Out | Dismissal | 200ms | easeIn |
| Scale Out | Modal close | 150ms | easeIn |

### Micro-interactions
| Element | Hover | Press | Focus |
|---------|-------|-------|-------|
| Button | lift + shadow | scale(0.98) | ring |
| Card | lift + border | scale(0.99) | ring |
| Input | border highlight | - | ring + border |
| Link | underline | - | ring |

---

## Staggered Animations

For lists, stagger child animations:

```typescript
// Container
transition: { staggerChildren: 0.05 }

// Children
// Each child delays 50ms after previous
```

**Rule**: Never stagger more than 10 items. After that, animate as group.

---

## Performance Rules

### DO ✅
- Animate `transform` and `opacity` (GPU-accelerated)
- Use `will-change` sparingly, remove after animation
- Keep animations under 400ms for interactions
- Use `transform-gpu` class for complex animations

### DON'T ❌
- Animate `width`, `height`, `top`, `left` (causes layout)
- Animate `margin`, `padding` (causes layout)
- Use animations longer than 500ms
- Block user interaction during animations
- Add animation without purpose

---

## Loading States

```
1. Skeleton: Show structure immediately
2. Shimmer: Indicate activity
3. Progress: Show completion %
4. Spinner: Last resort (feels slow)
```

**Rule**: Never show blank loading states. Always show something.
```

---

### `.claude/skills/domain/ui-design/anti-patterns.md`

```markdown
# UI Anti-Patterns (FORBIDDEN)

**Purpose**: What NOT to do - violations will be blocked
**Used by**: Design Vanguard agent, pre-commit hooks
**Version**: 1.0.0

---

## CRITICAL VIOLATIONS (Auto-blocked)

### 1. Hardcoded CSS

```tsx
// ❌ FORBIDDEN - Inline styles
<div style={{ marginTop: '20px', color: 'blue' }}>

// ❌ FORBIDDEN - CSS-in-JS outside Tailwind
const StyledDiv = styled.div`
  margin-top: 20px;
`;

// ❌ FORBIDDEN - Separate CSS files for components
import './Button.css';

// ✅ CORRECT - Tailwind only
<div className="mt-5 text-blue-500">
```

### 2. Hardcoded Colors

```tsx
// ❌ FORBIDDEN
className="text-[#3b82f6]"
className="bg-[rgb(59,130,246)]"

// ✅ CORRECT - Use design tokens
className="text-primary"
className="bg-brand-500"
```

### 3. Magic Number Spacing

```tsx
// ❌ FORBIDDEN
className="mt-[23px] p-[17px]"

// ✅ CORRECT - Use spacing scale
className="mt-6 p-4"
```

### 4. The !important Abomination

```css
/* ❌ FORBIDDEN - NEVER */
.button {
  color: blue !important;
}
```

If you need `!important`, your CSS architecture is broken.

---

## HIGH PRIORITY VIOLATIONS (Warning)

### 5. Inconsistent Variants

```tsx
// ❌ BAD - if/else for variants
className={`btn ${variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'}`}

// ✅ GOOD - Use CVA
className={buttonVariants({ variant })}
```

### 6. Missing Focus States

```tsx
// ❌ BAD - No focus handling
<button className="bg-primary">Click</button>

// ✅ GOOD - Visible focus
<button className="bg-primary focus-visible:ring-2 focus-visible:ring-ring">
```

### 7. Non-Semantic Color Names

```tsx
// ❌ BAD - Color describes appearance
className="text-blue-button"

// ✅ GOOD - Color describes purpose
className="text-primary"
```

### 8. Fixed Dimensions

```tsx
// ❌ BAD - Hardcoded dimensions
className="w-[347px] h-[89px]"

// ✅ GOOD - Responsive/content-based
className="w-full max-w-md"
```

---

## MEDIUM PRIORITY VIOLATIONS (Review)

### 9. Overly Long Class Strings

```tsx
// ❌ REVIEW - Too many classes
<div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 ease-out">

// ✅ BETTER - Extract to component or CVA
<Card interactive>
```

### 10. Duplicate Patterns

If you're copying the same class combination 3+ times, extract it.

### 11. Responsive Breakpoint Soup

```tsx
// ❌ REVIEW - Hard to maintain
className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl"

// ✅ BETTER - Simpler responsive
className="text-sm md:text-base"
```

---

## Validation Script

Run before every commit:

```bash
# Check for inline styles
grep -r "style={{" --include="*.tsx" src/

# Check for CSS files
find src/ -name "*.css" ! -name "globals.css"

# Check for !important
grep -r "!important" src/

# Check for hardcoded colors
grep -rE "#[0-9a-fA-F]{3,6}" --include="*.tsx" src/
```
```

---

## Part 3: Tool Skills (How to Use Tools)

### `.claude/skills/tools/design-system-generator/SKILL.md`

```markdown
# Design System Generator

**Purpose**: Generate complete Tailwind design system from brand colors
**Tool Location**: `/tools/design-system-generator/`
**Used by**: Design Vanguard agent

---

## What It Does

Input: Brand color(s)
Output: 
- `tailwind.config.ts` (complete design system)
- `globals.css` (CSS variables + base styles)

---

## When to Use

- Starting a new project
- Rebranding existing project
- Setting up design tokens
- Creating consistent color scales

---

## Usage

### Interactive Mode

```bash
npx design-system-generator --interactive
```

Prompts for:
- Project name
- Primary color (required)
- Secondary color (optional)
- Accent color (optional)
- Border radius style
- Font family preference
- Dark mode (yes/no)

### CLI Mode

```bash
npx design-system-generator \
  --primary "#0ea5e9" \
  --secondary "#8b5cf6" \
  --name "MyApp" \
  --radius md \
  --font inter \
  --output ./src
```

### Programmatic

```typescript
import { generateDesignSystem, generateGlobalsCss } from './tools/design-system-generator';

const config = {
  projectName: 'MyApp',
  primaryColor: '#0ea5e9',
  secondaryColor: '#8b5cf6',
  darkMode: true,
  borderRadius: 'md',
  fontFamily: 'inter',
};

const tailwindConfig = generateDesignSystem(config);
const globalsCss = generateGlobalsCss(config);
```

---

## Output Structure

### tailwind.config.ts

```typescript
// Generated sections:
- colors.primary (50-950 scale)
- colors.secondary (if provided)
- colors.accent (if provided)
- Semantic colors (background, foreground, etc.)
- Typography (fontFamily, fontSize)
- Spacing (4px grid)
- Border radius (based on preference)
- Shadows (elevation system)
- Animations (enter/exit/loop)
- Transitions (timing functions)
```

### globals.css

```css
/* Generated sections: */
- CSS custom properties for semantic colors
- Light mode variables
- Dark mode variables (if enabled)
- Base layer styles
- Scrollbar utilities
- Animation utilities
```

---

## Customization

After generation, extend (don't override):

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      // Generator creates this
      primary: {...},
      
      // You can add custom colors
      brand: {
        gold: '#ffd700',
      },
    },
  },
},
```

---

## Integration Steps

1. Run generator
2. Review output files
3. Install dependencies:
   ```bash
   npm install @tailwindcss/forms @tailwindcss/typography tailwindcss-animate
   ```
4. Import globals.css in app entry
5. Start using Tailwind classes
```

---

## Part 4: Templates (Code Generation)

### `.claude/templates/frontend/react/components/button.tsx.template`

```typescript
/**
 * Button Component
 * Generated by NXTG-Forge Design Vanguard
 * 
 * @project {{ project_name }}
 * @generated {{ timestamp }}
 */

'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap font-medium',
    'rounded-{{ border_radius | default: "lg" }}',
    'ring-offset-background',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground',
          'shadow-sm hover:bg-primary/90 hover:shadow-md',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'border border-border',
          'hover:bg-secondary/80',
        ],
        outline: [
          'border border-input bg-background',
          'hover:bg-accent hover:text-accent-foreground',
        ],
        ghost: [
          'hover:bg-accent hover:text-accent-foreground',
        ],
        link: [
          'text-primary underline-offset-4 hover:underline',
        ],
        destructive: [
          'bg-destructive text-destructive-foreground',
          'shadow-sm hover:bg-destructive/90',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        xl: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          loading && 'relative text-transparent pointer-events-none',
          className
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </span>
        )}
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

---

## Part 5: Commands (Agent Actions)

### `.claude/commands/design-check.md`

```markdown
# /design-check

**Agent**: Design Vanguard
**Purpose**: Validate UI code against design standards

---

## Execution

```bash
#!/bin/bash

echo "🎨 Design Vanguard: Running design quality checks..."

ERRORS=0

# 1. Inline styles
echo "  → Checking for inline styles..."
INLINE=$(grep -r "style={{" --include="*.tsx" --include="*.jsx" src/ 2>/dev/null | wc -l)
if [ "$INLINE" -gt 0 ]; then
    echo "    ❌ FATAL: $INLINE inline style violations"
    grep -r "style={{" --include="*.tsx" --include="*.jsx" src/ -l 2>/dev/null
    ERRORS=$((ERRORS + 1))
fi

# 2. CSS files
echo "  → Checking for rogue CSS files..."
CSS=$(find src/ -name "*.css" ! -name "globals.css" 2>/dev/null | wc -l)
if [ "$CSS" -gt 0 ]; then
    echo "    ❌ FATAL: $CSS unauthorized CSS files"
    ERRORS=$((ERRORS + 1))
fi

# 3. !important
echo "  → Checking for !important..."
IMPORTANT=$(grep -r "!important" --include="*.tsx" --include="*.css" src/ 2>/dev/null | wc -l)
if [ "$IMPORTANT" -gt 0 ]; then
    echo "    ❌ FATAL: $IMPORTANT uses of !important"
    ERRORS=$((ERRORS + 1))
fi

# 4. Hardcoded colors
echo "  → Checking for hardcoded colors..."
COLORS=$(grep -rE "className=.*#[0-9a-fA-F]{3,6}" --include="*.tsx" src/ 2>/dev/null | wc -l)
if [ "$COLORS" -gt 0 ]; then
    echo "    ⚠️  Warning: $COLORS hardcoded colors found"
fi

# Result
if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "❌ Design check FAILED: $ERRORS critical violations"
    exit 1
else
    echo ""
    echo "✅ Design check PASSED"
    exit 0
fi
```

---

## Output Format

```
🎨 Design Vanguard: Running design quality checks...
  → Checking for inline styles...
    ✅ No violations
  → Checking for rogue CSS files...
    ✅ No violations
  → Checking for !important...
    ✅ No violations
  → Checking for hardcoded colors...
    ⚠️  Warning: 2 hardcoded colors found

✅ Design check PASSED
```
```

---

### `.claude/commands/component.md`

```markdown
# /component <name>

**Agent**: Design Vanguard
**Purpose**: Generate new UI component from template

---

## Usage

```
/component Button
/component Card --compound
/component DataTable --complex
```

---

## Execution Flow

1. **Parse input**
   - Component name (required)
   - Type: simple | compound | complex

2. **Load template**
   - Simple: `/templates/frontend/react/components/base.tsx.template`
   - Compound: `/templates/frontend/react/components/compound.tsx.template`
   - Complex: Creates directory with multiple files

3. **Generate**
   - Replace variables (name, timestamp, etc.)
   - Apply project-specific tokens
   - Write to `src/components/ui/<name>.tsx`

4. **Post-generate**
   - Update `src/components/ui/index.ts`
   - Run format/lint
   - Show component preview

---

## Template Variables

```
{{ component_name }}     - PascalCase name
{{ component_name_lower }} - lowercase name
{{ project_name }}       - From state.json
{{ timestamp }}          - Generation timestamp
{{ border_radius }}      - From design tokens
```

---

## Example Output

```bash
$ /component ProfileCard

🎨 Design Vanguard: Generating component...

  Template: simple
  Output: src/components/ui/profile-card.tsx
  
  ✅ Component generated
  ✅ Index updated
  ✅ Formatted with Prettier
  
  Preview:
  ┌──────────────────────────────────────┐
  │ import { ProfileCard } from '@/components/ui';
  │ 
  │ <ProfileCard>
  │   Content here
  │ </ProfileCard>
  └──────────────────────────────────────┘
```
```

---

## Summary: Complete Architecture

```
Design Vanguard Agent
│
├── READS: Agent Skill
│   └── .claude/skills/agents/design-vanguard.md
│       (Identity, workflow, handoffs)
│
├── LOADS: Domain Skills (Knowledge Bases)
│   ├── .claude/skills/domain/ui-design/SKILL.md
│   ├── .claude/skills/domain/ui-design/components.md
│   ├── .claude/skills/domain/ui-design/animations.md
│   ├── .claude/skills/domain/ui-design/design-tokens.md
│   ├── .claude/skills/domain/ui-design/accessibility.md
│   ├── .claude/skills/domain/ui-design/anti-patterns.md
│   └── .claude/skills/domain/tailwind/SKILL.md
│
├── USES: Tool Skills
│   └── .claude/skills/tools/design-system-generator/SKILL.md
│       (How to use the generator)
│
├── GENERATES FROM: Templates
│   ├── .claude/templates/frontend/react/components/
│   ├── .claude/templates/frontend/react/lib/
│   └── .claude/templates/frontend/shared/
│
├── EXECUTES: Tools
│   └── .claude/tools/design-system-generator/
│       (Actual executable code)
│
└── RUNS: Commands
    ├── /design-check (validation)
    ├── /component (generation)
    ├── /generate-design-system (setup)
    └── /audit-ui (review)
```

**The Agent Skill references everything else. It's the orchestrator that knows WHAT to use and WHEN.**
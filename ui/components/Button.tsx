import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

/**
 * Button Component
 *
 * A flexible, accessible button component with multiple variants.
 * Uses CVA for type-safe variant management.
 *
 * Features:
 * - Multiple variants (primary, secondary, danger, ghost)
 * - Size options (sm, md, lg)
 * - Disabled states
 * - Loading states
 * - Icon support
 * - Full accessibility (WCAG AA)
 */

const buttonVariants = cva(
  // Base styles - applied to all buttons
  [
    'inline-flex items-center justify-center',
    'rounded-md font-medium',
    'transition-all duration-normal ease-spring',
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-500 text-white',
          'hover:bg-brand-600',
          'active:bg-brand-700',
          'shadow-sm hover:shadow-md',
        ],
        secondary: [
          'bg-surface-700 text-surface-100',
          'hover:bg-surface-600',
          'active:bg-surface-500',
          'border border-surface-600',
        ],
        danger: [
          'bg-error-500 text-white',
          'hover:bg-error-600',
          'active:bg-error-700',
          'shadow-sm hover:shadow-md',
        ],
        success: [
          'bg-success-500 text-white',
          'hover:bg-success-600',
          'active:bg-success-700',
          'shadow-sm hover:shadow-md',
        ],
        ghost: [
          'text-surface-300',
          'hover:bg-surface-800/50 hover:text-surface-50',
          'active:bg-surface-700/50',
        ],
        outline: [
          'border border-surface-600 text-surface-200',
          'hover:bg-surface-800/50',
          'active:bg-surface-700/50',
        ],
        neon: [
          'bg-transparent text-neon-blue border border-neon-blue',
          'hover:bg-neon-blue/10',
          'active:bg-neon-blue/20',
          'shadow-neon',
          'animate-neon-glow',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-base gap-2',
        lg: 'h-12 px-6 text-lg gap-2.5',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Optional loading state */
  loading?: boolean;
  /** Optional left icon */
  leftIcon?: React.ReactNode;
  /** Optional right icon */
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

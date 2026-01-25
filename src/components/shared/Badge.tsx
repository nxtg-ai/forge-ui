/**
 * Badge Component
 * Status indicators and labels
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-surface-2 text-nxtg-gray-200 border border-surface-4',
        primary: 'bg-nxtg-purple-900/20 text-nxtg-purple-400 border border-nxtg-purple-800',
        secondary: 'bg-nxtg-blue-900/20 text-nxtg-blue-400 border border-nxtg-blue-800',
        success: 'bg-nxtg-success-dark/20 text-nxtg-success-light border border-nxtg-success-DEFAULT',
        warning: 'bg-nxtg-warning-dark/20 text-nxtg-warning-light border border-nxtg-warning-DEFAULT',
        error: 'bg-nxtg-error-dark/20 text-nxtg-error-light border border-nxtg-error-DEFAULT',
        info: 'bg-nxtg-info-dark/20 text-nxtg-info-light border border-nxtg-info-DEFAULT',
      },
      size: {
        xs: 'text-xs px-1.5 py-0.5',
        sm: 'text-sm px-2 py-0.5',
        md: 'text-base px-2.5 py-1',
        lg: 'text-lg px-3 py-1.5',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80 active:scale-95',
      },
      removable: {
        true: 'pr-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      interactive: false,
      removable: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode;
  onRemove?: () => void;
  pulse?: boolean;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, interactive, removable, leftIcon, onRemove, pulse, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, interactive: interactive || !!props.onClick, removable: removable || !!onRemove, className }),
          pulse && 'animate-pulse-glow'
        )}
        {...props}
      >
        {leftIcon && <span className="mr-1">{leftIcon}</span>}
        {children}
        {(removable || onRemove) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-white/10 transition-colors"
            aria-label="Remove"
          >
            <X className={cn('h-3 w-3', size === 'xs' && 'h-2.5 w-2.5')} />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

/**
 * Card Component
 *
 * A container component with variants for different use cases.
 * Perfect for grouping related content.
 *
 * Features:
 * - Multiple variants (default, elevated, bordered, neon)
 * - Padding options (none, sm, md, lg)
 * - Hover effects
 * - Glass morphism support
 */

const cardVariants = cva(
  [
    'rounded-lg',
    'transition-all duration-normal ease-spring',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-surface-800/50',
          'border border-surface-700/50',
        ],
        elevated: [
          'bg-surface-800/60',
          'shadow-lg',
          'border border-surface-700/30',
        ],
        bordered: [
          'bg-surface-800/30',
          'border-2 border-surface-700',
        ],
        glass: [
          'bg-surface-800/30',
          'backdrop-blur-md',
          'border border-surface-700/50',
        ],
        neon: [
          'bg-surface-900/50',
          'border border-neon-blue',
          'shadow-neon',
          'backdrop-blur-sm',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      hoverable: {
        true: [
          'hover:bg-surface-750/60',
          'hover:shadow-xl',
          'hover:border-surface-600/50',
          'cursor-pointer',
          'active:scale-[0.99]',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, hoverable, className })}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header
 */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-1.5 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Title
 */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-xl font-semibold leading-none tracking-tight text-surface-50 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * Card Description
 */
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm text-surface-400 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * Card Content
 */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${className || ''}`}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * Card Footer
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center gap-2 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

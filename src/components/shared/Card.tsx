/**
 * Card Component
 * Elevated container with variants and interactive states
 */

import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { motion, type MotionProps } from "framer-motion";

const cardVariants = cva("rounded-xl transition-all duration-300", {
  variants: {
    variant: {
      default: [
        "bg-surface-1",
        "border border-surface-4",
        "shadow-elevation-1",
      ],
      elevated: [
        "bg-surface-2",
        "border border-surface-4",
        "shadow-elevation-2",
      ],
      interactive: [
        "bg-surface-1",
        "border border-surface-4",
        "shadow-elevation-1",
        "hover:shadow-elevation-3",
        "hover:border-nxtg-purple-800",
        "cursor-pointer",
        "active:scale-[0.99]",
      ],
      gradient: [
        "bg-gradient-to-br from-surface-1 to-surface-2",
        "border border-surface-4",
        "shadow-elevation-2",
      ],
      glow: [
        "bg-surface-1",
        "border border-nxtg-purple-700",
        "shadow-glow-purple",
      ],
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants>,
    Partial<MotionProps> {
  hover?: boolean;
  delay?: number;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, hover, delay = 0, children, ...props },
    ref,
  ) => {
    const Component = hover ? motion.div : "div";

    const animationProps = hover
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.4,
            delay,
            ease: [0.16, 1, 0.3, 1], // Spring easing
          },
          whileHover: { y: -4 },
        }
      : {};

    return (
      <Component
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        {...animationProps}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = "Card";

// Card Header Component
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Card Title Component
export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-nxtg-gray-100",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// Card Description Component
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-nxtg-gray-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Card Content Component
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

// Card Footer Component
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, cardVariants };

/**
 * Input Component
 * Form input with validation states and icons
 */

import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const inputVariants = cva(
  [
    "w-full rounded-lg bg-surface-1 text-nxtg-gray-100 placeholder:text-nxtg-gray-600",
    "border transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-0",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-surface-4",
          "hover:border-nxtg-gray-600",
          "focus:border-nxtg-purple-600",
          "focus:ring-nxtg-purple-600",
        ],
        error: [
          "border-nxtg-error-DEFAULT",
          "focus:border-nxtg-error-light",
          "focus:ring-nxtg-error-light",
          "text-nxtg-error-light",
        ],
        success: [
          "border-nxtg-success-DEFAULT",
          "focus:border-nxtg-success-light",
          "focus:ring-nxtg-success-light",
        ],
      },
      inputSize: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      variant,
      inputSize,
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const finalVariant = error ? "error" : success ? "success" : variant;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-nxtg-gray-200">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-nxtg-gray-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant: finalVariant, inputSize, className }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? "error-message"
                : success
                  ? "success-message"
                  : helperText
                    ? "helper-text"
                    : undefined
            }
            {...props}
          />
          {(rightIcon || error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error ? (
                <AlertCircle className="h-5 w-5 text-nxtg-error-light" />
              ) : success ? (
                <CheckCircle2 className="h-5 w-5 text-nxtg-success-light" />
              ) : (
                <span className="text-nxtg-gray-500">{rightIcon}</span>
              )}
            </div>
          )}
        </div>
        {error && (
          <p id="error-message" className="text-sm text-nxtg-error-light">
            {error}
          </p>
        )}
        {success && !error && (
          <p id="success-message" className="text-sm text-nxtg-success-light">
            {success}
          </p>
        )}
        {helperText && !error && !success && (
          <p id="helper-text" className="text-sm text-nxtg-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input, inputVariants };

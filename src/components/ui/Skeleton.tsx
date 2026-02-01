/**
 * Skeleton Loader Component System
 * Provides smooth loading states for dashboard components
 */

import React, { forwardRef } from "react";
import { cn } from "../../utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

/**
 * Base Skeleton component with pulse animation
 *
 * @example
 * <Skeleton width="100%" height={20} />
 * <Skeleton className="w-32 h-4" />
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, borderRadius, className, style, ...props }, ref) => {
    const inlineStyle: React.CSSProperties = {
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
      borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-gray-800/50 rounded-md animate-pulse",
          className
        )}
        style={inlineStyle}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineHeight?: number;
  lastLineWidth?: string;
}

/**
 * SkeletonText - Multiple text lines with variable widths
 *
 * @example
 * <SkeletonText lines={3} />
 * <SkeletonText lines={2} lastLineWidth="60%" />
 */
export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, className, lineHeight = 16, lastLineWidth = "75%", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            height={lineHeight}
            width={index === lines - 1 ? lastLineWidth : "100%"}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = "SkeletonText";

interface SkeletonCardProps {
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}

/**
 * SkeletonCard - Dashboard card skeleton with optional header/footer
 *
 * @example
 * <SkeletonCard />
 * <SkeletonCard showHeader showFooter contentLines={4} />
 */
export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, showHeader = true, showFooter = false, contentLines = 3, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-1 border border-surface-4 rounded-xl p-4 space-y-4",
          className
        )}
        {...props}
      >
        {showHeader && (
          <div className="space-y-2">
            <Skeleton height={24} width="60%" />
            <Skeleton height={14} width="40%" />
          </div>
        )}

        <div className="space-y-3">
          <SkeletonText lines={contentLines} />
        </div>

        {showFooter && (
          <div className="pt-2 flex items-center gap-2">
            <Skeleton width={80} height={32} borderRadius={8} />
            <Skeleton width={80} height={32} borderRadius={8} />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

interface SkeletonAvatarProps {
  size?: number;
  className?: string;
  variant?: "circle" | "square";
}

/**
 * SkeletonAvatar - Circular or square avatar skeleton
 *
 * @example
 * <SkeletonAvatar size={40} />
 * <SkeletonAvatar size={64} variant="square" />
 */
export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 40, className, variant = "circle", ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        width={size}
        height={size}
        borderRadius={variant === "circle" ? "50%" : 8}
        className={className}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = "SkeletonAvatar";

interface SkeletonChartProps {
  className?: string;
  height?: number;
  showLegend?: boolean;
}

/**
 * SkeletonChart - Progress chart skeleton with bars/legend
 *
 * @example
 * <SkeletonChart />
 * <SkeletonChart height={200} showLegend />
 */
export const SkeletonChart = forwardRef<HTMLDivElement, SkeletonChartProps>(
  ({ className, height = 180, showLegend = true, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Chart area */}
        <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
          {Array.from({ length: 6 }).map((_, index) => {
            const randomHeight = 40 + Math.random() * 60; // 40-100% height
            return (
              <Skeleton
                key={index}
                className="flex-1"
                height={`${randomHeight}%`}
                borderRadius={4}
              />
            );
          })}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-center gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton width={12} height={12} borderRadius="50%" />
                <Skeleton width={60} height={12} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SkeletonChart.displayName = "SkeletonChart";

interface SkeletonPanelProps {
  className?: string;
  variant?: "left" | "right";
  itemCount?: number;
}

/**
 * SkeletonPanel - Left/right panel skeleton with list items
 *
 * @example
 * <SkeletonPanel variant="left" itemCount={5} />
 * <SkeletonPanel variant="right" />
 */
export const SkeletonPanel = forwardRef<HTMLDivElement, SkeletonPanelProps>(
  ({ className, variant = "left", itemCount = 4, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-1 border-r border-surface-4 p-4 space-y-4",
          variant === "right" && "border-r-0 border-l",
          className
        )}
        {...props}
      >
        {/* Panel header */}
        <div className="space-y-2">
          <Skeleton height={28} width="70%" />
          <Skeleton height={14} width="50%" />
        </div>

        {/* Panel items */}
        <div className="space-y-3">
          {Array.from({ length: itemCount }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <SkeletonAvatar size={32} />
              <div className="flex-1 space-y-2">
                <Skeleton height={14} width="80%" />
                <Skeleton height={12} width="60%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SkeletonPanel.displayName = "SkeletonPanel";

interface SkeletonTableProps {
  className?: string;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

/**
 * SkeletonTable - Table skeleton with rows and columns
 *
 * @example
 * <SkeletonTable rows={5} columns={4} />
 * <SkeletonTable rows={3} columns={3} showHeader />
 */
export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ className, rows = 5, columns = 4, showHeader = true, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {/* Table header */}
        {showHeader && (
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={index}
                height={16}
                width={index === 0 ? "30%" : "20%"}
                className="flex-1"
              />
            ))}
          </div>
        )}

        {/* Table rows */}
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  height={14}
                  className="flex-1"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SkeletonTable.displayName = "SkeletonTable";

interface SkeletonListProps {
  className?: string;
  items?: number;
  showAvatar?: boolean;
  showIcon?: boolean;
}

/**
 * SkeletonList - List skeleton with optional avatars/icons
 *
 * @example
 * <SkeletonList items={5} showAvatar />
 * <SkeletonList items={3} showIcon />
 */
export const SkeletonList = forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ className, items = 5, showAvatar = true, showIcon = false, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            {showAvatar && <SkeletonAvatar size={40} />}
            {showIcon && <Skeleton width={24} height={24} borderRadius={4} />}
            <div className="flex-1 space-y-2">
              <Skeleton height={16} width="80%" />
              <Skeleton height={12} width="60%" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SkeletonList.displayName = "SkeletonList";

// Export all components
export default Skeleton;

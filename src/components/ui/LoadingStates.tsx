/**
 * Dashboard Loading State Components
 * Skeleton loaders matching actual component layouts
 */

import React, { ComponentType } from "react";
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonList,
} from "./Skeleton";

/**
 * ContextPanelLoading
 * Skeleton for Memory & Context panel (ContextWindowHUD)
 */
export const ContextPanelLoading: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl flex flex-col ${className}`}
      data-testid="context-panel-loading"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Skeleton width={20} height={20} borderRadius="50%" />
            <Skeleton width={140} height={14} />
          </div>
          <Skeleton width={50} height={12} />
        </div>

        {/* Token Usage Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Skeleton width={80} height={12} />
            <Skeleton width={120} height={12} />
          </div>
          <Skeleton height={8} width="100%" borderRadius={9999} />
          <Skeleton width={90} height={12} />
        </div>
      </div>

      {/* Memory Section */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Skeleton width={16} height={16} borderRadius="50%" />
            <Skeleton width={60} height={14} />
            <Skeleton width={30} height={12} />
          </div>
          <Skeleton width={32} height={32} borderRadius={8} />
        </div>

        {/* Memory Items */}
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton width={70} height={20} borderRadius={4} />
                <div className="flex gap-1">
                  <Skeleton width={24} height={24} borderRadius={4} />
                  <Skeleton width={24} height={24} borderRadius={4} />
                </div>
              </div>
              <SkeletonText lines={2} lineHeight={12} lastLineWidth="80%" />
              <div className="flex gap-1">
                <Skeleton width={50} height={18} borderRadius={4} />
                <Skeleton width={60} height={18} borderRadius={4} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files Heat Map */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="p-2 rounded-lg border border-gray-700 bg-gray-800/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Skeleton width={14} height={14} borderRadius="50%" />
                <Skeleton width={14} height={14} borderRadius={4} />
                <Skeleton className="flex-1" height={12} />
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Skeleton width={40} height={12} />
                <Skeleton width={48} height={6} borderRadius={9999} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-950/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index}>
              <Skeleton height={12} width={60} className="mx-auto mb-1" />
              <Skeleton height={16} width={24} className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * GovernancePanelLoading
 * Skeleton for Governance HUD panel
 */
export const GovernancePanelLoading: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`h-full w-full bg-gray-950/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-2xl flex flex-col overflow-hidden ${className || ""}`}
      data-testid="governance-panel-loading"
    >
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <div className="flex items-center justify-between">
          <Skeleton width={120} height={14} />
          <div className="flex items-center gap-2">
            <Skeleton width={8} height={8} borderRadius="50%" />
            <Skeleton width={30} height={12} />
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 p-2">
        {/* Strategic Advisor Card */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
          <div className="flex items-start gap-2 mb-2">
            <Skeleton width={16} height={16} borderRadius="50%" />
            <div className="flex-1">
              <Skeleton width={100} height={14} className="mb-1" />
              <Skeleton width="100%" height={12} />
            </div>
          </div>
          <SkeletonText lines={2} lineHeight={12} lastLineWidth="90%" />
        </div>

        {/* Constitution Card */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width={16} height={16} borderRadius="50%" />
            <Skeleton width={90} height={14} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-gray-800/50 rounded"
              >
                <Skeleton width={16} height={16} borderRadius={4} />
                <Skeleton className="flex-1" height={12} />
              </div>
            ))}
          </div>
        </div>

        {/* Worker Pool Metrics */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center justify-between mb-3">
            <Skeleton width={110} height={14} />
            <Skeleton width={60} height={12} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="text-center p-2 bg-gray-800/50 rounded">
                <Skeleton height={12} width={50} className="mx-auto mb-1" />
                <Skeleton height={20} width={30} className="mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Impact Matrix */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width={16} height={16} borderRadius="50%" />
            <Skeleton width={100} height={14} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="p-2 bg-gray-800/50 rounded">
                <Skeleton width="80%" height={12} className="mb-1" />
                <Skeleton width="100%" height={6} borderRadius={9999} />
              </div>
            ))}
          </div>
        </div>

        {/* Agent Activity Feed */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="px-3 py-2 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton width={16} height={16} borderRadius="50%" />
                <Skeleton width={90} height={14} />
              </div>
              <Skeleton width={16} height={16} borderRadius={4} />
            </div>
          </div>
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-2">
                <Skeleton width={14} height={14} borderRadius="50%" />
                <div className="flex-1">
                  <Skeleton width="90%" height={12} className="mb-1" />
                  <Skeleton width={60} height={10} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Oracle Feed */}
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton width={16} height={16} borderRadius="50%" />
            <Skeleton width={80} height={14} />
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} width="100%" height={10} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * DashboardOverviewLoading
 * Skeleton for main dashboard content (ChiefOfStaffDashboard)
 */
export const DashboardOverviewLoading: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`min-h-screen bg-gray-950 text-gray-100 ${className || ""}`}
      data-testid="dashboard-overview-loading"
    >
      {/* Header Bar */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Skeleton width={40} height={40} borderRadius={12} />
                <div>
                  <Skeleton width={180} height={20} className="mb-1" />
                  <Skeleton width={140} height={12} />
                </div>
              </div>
            </div>
            <Skeleton width={120} height={32} borderRadius={8} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Vision Reminder Card */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20">
          <div className="flex items-start gap-4">
            <Skeleton width={48} height={48} borderRadius={12} />
            <div className="flex-1">
              <Skeleton width={80} height={18} className="mb-2" />
              <SkeletonText lines={2} lineHeight={16} lastLineWidth="85%" />
              <div className="flex gap-6 mt-4">
                <Skeleton width={120} height={14} />
                <Skeleton width={100} height={14} />
                <Skeleton width={110} height={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Project Progress */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Skeleton width={20} height={20} borderRadius="50%" />
                <Skeleton width={130} height={18} />
              </div>
              <Skeleton width={60} height={32} />
            </div>

            {/* Phase Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} width={60} height={12} />
                ))}
              </div>
              <Skeleton height={8} width="100%" borderRadius={9999} />
            </div>

            {/* Active Agents */}
            <div className="space-y-3">
              <Skeleton width={100} height={14} />
              {Array.from({ length: 3 }).map((_, index) => (
                <AgentCardLoading key={index} />
              ))}
            </div>
          </div>

          {/* Health & Blockers */}
          <div className="space-y-6">
            {/* Health Score */}
            <div className="p-6 rounded-2xl border border-gray-700 bg-gray-800/20">
              <div className="flex items-center justify-between mb-4">
                <Skeleton width={110} height={18} />
                <Skeleton width={20} height={20} borderRadius="50%" />
              </div>
              <Skeleton width={80} height={40} className="mb-2" />
              <Skeleton width={140} height={14} />
            </div>

            {/* Blockers */}
            <div className="p-6 rounded-2xl bg-red-900/10 border border-red-500/20">
              <div className="flex items-center justify-between mb-4">
                <Skeleton width={70} height={18} />
                <Skeleton width={20} height={20} borderRadius="50%" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                  >
                    <Skeleton width="90%" height={14} className="mb-1" />
                    <Skeleton width="60%" height={12} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stream */}
        <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Skeleton width={20} height={20} borderRadius="50%" />
              <Skeleton width={110} height={18} />
            </div>
            <Skeleton width={100} height={14} />
          </div>
          <ActivityFeedLoading itemCount={5} />
        </div>
      </div>
    </div>
  );
};

/**
 * AgentCardLoading
 * Skeleton for individual agent cards
 */
export const AgentCardLoading: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 ${className || ""}`}
      data-testid="agent-card-loading"
    >
      <div className="flex items-center gap-3">
        <Skeleton width={8} height={8} borderRadius="50%" />
        <div>
          <Skeleton width={100} height={14} className="mb-1" />
          <Skeleton width={150} height={12} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={90} height={12} />
        <Skeleton width={16} height={16} borderRadius={4} />
      </div>
    </div>
  );
};

/**
 * ActivityFeedLoading
 * Skeleton for activity feed items
 */
export const ActivityFeedLoading: React.FC<{
  className?: string;
  itemCount?: number;
}> = ({ className = "", itemCount = 5 }) => {
  return (
    <div className={`space-y-2 ${className}`} data-testid="activity-feed-loading">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800"
        >
          <Skeleton width={32} height={32} borderRadius={8} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton width={80} height={14} />
              <Skeleton width={120} height={14} />
            </div>
            <Skeleton width={70} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * withLoadingState HOC
 * Wraps a component with loading state handling
 *
 * @example
 * const MyComponent = withLoadingState(ActualComponent, LoadingSkeleton);
 * <MyComponent isLoading={loading} {...props} />
 */
export function withLoadingState<P extends { className?: string }>(
  Component: ComponentType<P>,
  LoadingComponent: ComponentType<{ className?: string }>
) {
  const WithLoadingState = (
    props: P & { isLoading?: boolean }
  ) => {
    const { isLoading, ...restProps } = props;

    if (isLoading) {
      return <LoadingComponent className={props.className} />;
    }

    return <Component {...(restProps as P)} />;
  };

  WithLoadingState.displayName = `withLoadingState(${Component.displayName || Component.name || "Component"})`;

  return WithLoadingState;
}

// Export all components
export default {
  ContextPanelLoading,
  GovernancePanelLoading,
  DashboardOverviewLoading,
  AgentCardLoading,
  ActivityFeedLoading,
  withLoadingState,
};

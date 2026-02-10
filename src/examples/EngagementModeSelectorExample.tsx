/**
 * Example: Using EngagementModeSelector Component
 *
 * This file demonstrates how to use the EngagementModeSelector
 * in different contexts and replace the inline implementation
 * from dashboard-live.tsx
 */

import React from "react";
import { EngagementModeSelector } from "../components/layout";
import { EngagementProvider } from "../contexts/EngagementContext";
import { BarChart3 } from "lucide-react";
import { logger } from "../utils/browser-logger";

/**
 * Example 1: Basic Usage in Header
 *
 * Replaces lines 609-703 in dashboard-live.tsx
 */
export const HeaderWithModeSelector: React.FC = () => {
  return (
    <EngagementProvider>
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Chief of Staff Dashboard
              </h1>
              <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                Live
              </span>
            </div>

            {/* Right: Mode Selector (replaces 100+ lines!) */}
            <div className="flex items-center gap-2">
              <EngagementModeSelector variant="compact" />
            </div>
          </div>
        </div>
      </header>
    </EngagementProvider>
  );
};

/**
 * Example 2: With Custom Callback
 *
 * Handle mode changes to update other UI state
 */
export const HeaderWithCallbacks: React.FC = () => {
  const handleModeChange = (mode: string) => {
    logger.debug(`Mode changed to: ${mode}`);

    // Apply mode-specific logic
    switch (mode) {
      case "ceo":
        // Show minimal details
        logger.debug("Switching to minimal view");
        break;
      case "founder":
        // Show everything
        logger.debug("Switching to full details view");
        break;
      default:
        logger.debug("Default view");
    }
  };

  return (
    <EngagementProvider>
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>

          <EngagementModeSelector
            variant="compact"
            onModeChange={handleModeChange}
          />
        </div>
      </header>
    </EngagementProvider>
  );
};

/**
 * Example 3: Default Variant (Full Size)
 *
 * Use in settings panels or larger UI contexts
 */
export const SettingsPanelWithModeSelector: React.FC = () => {
  return (
    <EngagementProvider>
      <div className="p-6 bg-gray-900 rounded-xl">
        <h2 className="text-lg font-semibold text-white mb-4">
          User Preferences
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Engagement Mode
            </label>
            <EngagementModeSelector variant="default" />
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Your engagement mode controls the level of detail displayed
              throughout the dashboard.
            </p>
          </div>
        </div>
      </div>
    </EngagementProvider>
  );
};

/**
 * Example 4: Multiple Selectors (Synced via Context)
 *
 * All selectors stay in sync because they share EngagementContext
 */
export const MultipleSelectorsExample: React.FC = () => {
  return (
    <EngagementProvider>
      <div className="space-y-8 p-6">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <EngagementModeSelector variant="compact" />
        </header>

        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Settings</h2>
            {/* This selector will stay in sync with the header */}
            <EngagementModeSelector variant="default" />
          </div>

          <p className="text-gray-400">
            Both selectors are synced through EngagementContext. Changing one
            updates both!
          </p>
        </div>
      </div>
    </EngagementProvider>
  );
};

/**
 * Example 5: Responsive Layout
 *
 * Show/hide based on screen size
 */
export const ResponsiveHeader: React.FC = () => {
  return (
    <EngagementProvider>
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold text-white">
              Dashboard
            </h1>

            {/* Show on tablet and up */}
            <div className="hidden md:block">
              <EngagementModeSelector variant="compact" />
            </div>

            {/* Show on mobile */}
            <div className="md:hidden">
              <EngagementModeSelector variant="compact" className="text-xs" />
            </div>
          </div>
        </div>
      </header>
    </EngagementProvider>
  );
};

/**
 * Migration Guide: dashboard-live.tsx
 *
 * BEFORE (lines 609-703):
 * ```tsx
 * <div className="relative">
 *   <button
 *     ref={modeSelectorButtonRef}
 *     onClick={() => { ... }}
 *     onKeyDown={(e) => { ... }}
 *     aria-haspopup="listbox"
 *     aria-expanded={showModeSelector}
 *     // ... 100+ more lines
 *   >
 *     ...
 *   </button>
 *   <AnimatePresence>
 *     {showModeSelector && (
 *       <motion.div>
 *         {/* Dropdown implementation * /}
 *       </motion.div>
 *     )}
 *   </AnimatePresence>
 * </div>
 * ```
 *
 * AFTER:
 * ```tsx
 * import { EngagementModeSelector } from "../components/layout";
 *
 * <EngagementModeSelector variant="compact" />
 * ```
 *
 * What to remove from dashboard-live.tsx:
 * 1. Line 78-84: Local engagement mode state (use context instead)
 * 2. Line 85: showModeSelector state (handled internally)
 * 3. Line 87: selectedModeIndex state (handled internally)
 * 4. Line 90-91: Refs (handled internally)
 * 5. Line 146-181: modeConfig (embedded in component)
 * 6. Line 184: modeKeys (handled internally)
 * 7. Line 210-244: handleModeChange (handled internally, use onModeChange prop)
 * 8. Line 510-547: Keyboard navigation useEffect (handled internally)
 * 9. Line 549-566: Click outside useEffect (handled internally)
 * 10. Line 609-703: Entire mode selector JSX (replaced by component)
 *
 * Benefits:
 * - 200+ lines removed
 * - Reusable across pages
 * - Centralized ARIA implementation
 * - Easier to test and maintain
 */

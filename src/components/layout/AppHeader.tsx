/**
 * Unified Application Header Component
 *
 * Replaces dual-header architecture with a single, flexible header that combines:
 * - NXTG-Forge branding
 * - Project switcher
 * - Navigation tabs
 * - Page-specific title and actions (via slots)
 * - Engagement mode selector
 * - Connection status
 * - Panel toggles
 * - Mobile hamburger menu with slide-out drawer
 *
 * Features:
 * - Full accessibility (ARIA roles, focus management, keyboard navigation)
 * - Responsive (hamburger menu on mobile, full nav on desktop)
 * - Animated mobile drawer using Framer Motion
 * - Skip to main content link for screen readers
 */

import React, { useState } from "react";

import { Menu } from "lucide-react";
import { ProjectSwitcher } from "../ProjectSwitcher";
import type { Runspace } from "../../core/runspace";
import logoSrc from "../../assets/logo-32.png";
import { NAVIGATION_ROUTES } from "./navigation-config";
import { ConnectionStatus } from "./ConnectionStatus";
import { EngagementModeSelector } from "./EngagementModeSelector";
import { PanelToggles } from "./PanelToggles";
import { MobileDrawer } from "./MobileDrawer";

export interface AppHeaderProps {
  // Page identity
  title?: string;
  icon?: React.ReactNode;
  badge?: string;

  // Navigation
  currentView?: string;
  onNavigate?: (viewId: string) => void;

  // Slots for page-specific content
  actions?: React.ReactNode;

  // Project switcher
  currentRunspace?: Runspace | null;
  runspaces?: Runspace[];
  onRunspaceSwitch?: (runspaceId: string) => void;
  onNewProject?: () => void;
  onManageProjects?: () => void;

  // Feature toggles
  showEngagementSelector?: boolean;
  showPanelToggles?: boolean;
  showConnectionStatus?: boolean;
  showNavigation?: boolean;
  showProjectSwitcher?: boolean;

  // Panel toggle handlers (from LayoutContext)
  onToggleContextPanel?: () => void;
  onToggleGovernancePanel?: () => void;
  contextPanelVisible?: boolean;
  governancePanelVisible?: boolean;

  // Connection status
  isConnected?: boolean;

  className?: string;
}

/**
 * Unified App Header Component
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  icon,
  badge,
  currentView,
  onNavigate,
  actions,
  currentRunspace,
  runspaces,
  onRunspaceSwitch,
  onNewProject,
  onManageProjects,
  showEngagementSelector = false,
  showPanelToggles = false,
  showConnectionStatus = false,
  showNavigation = true,
  showProjectSwitcher = true,
  onToggleContextPanel,
  onToggleGovernancePanel,
  contextPanelVisible,
  governancePanelVisible,
  isConnected = true,
  className = "",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      <header
        data-testid="app-header"
        className={`border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40 ${className}`}
        role="banner"
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 md:space-x-8">
              {/* Mobile Hamburger Menu */}
              {showNavigation && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation menu"
                  aria-expanded={mobileMenuOpen}
                  className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
                  data-testid="mobile-menu-button"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Branding */}
              <div className="flex items-center gap-2">
                <img src={logoSrc} alt="" className="w-7 h-7 rounded" aria-hidden="true" />
                <h1 className="text-xl font-bold text-white">
                  FORGE
                </h1>
              </div>

              {/* Project Switcher - Desktop */}
              {showProjectSwitcher && onNewProject && onManageProjects && (
                <div className="hidden md:block">
                  <ProjectSwitcher
                    currentRunspace={currentRunspace ?? null}
                    runspaces={runspaces ?? []}
                    onSwitch={onRunspaceSwitch ?? (() => {})}
                    onNew={onNewProject}
                    onManage={onManageProjects}
                  />
                </div>
              )}

              {/* Page Title - Optional override for page-specific branding */}
              {title && (
                <div className="hidden lg:flex items-center gap-3">
                  {icon && (
                    <span className="text-purple-400" aria-hidden="true">
                      {icon}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  {badge && (
                    <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                      {badge}
                    </span>
                  )}
                </div>
              )}

              {/* Navigation Tabs - Desktop */}
              {showNavigation && onNavigate && (
                <nav className="hidden md:flex space-x-4" aria-label="Main navigation">
                  {NAVIGATION_ROUTES.map((route) => (
                    <button
                      key={route.id}
                      data-testid={`app-nav-btn-${route.testId}`}
                      onClick={() => onNavigate(route.id)}
                      aria-current={currentView === route.id ? "page" : undefined}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                        currentView === route.id
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }`}
                    >
                      <span className="mr-2" aria-hidden="true">
                        {route.icon}
                      </span>
                      {route.label}
                    </button>
                  ))}
                </nav>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Page-specific actions slot */}
              {actions && (
                <div className="hidden md:flex items-center gap-2">
                  {actions}
                </div>
              )}

              {/* Engagement Mode Selector - Desktop */}
              {showEngagementSelector && (
                <div className="hidden md:block">
                  <EngagementModeSelector />
                </div>
              )}

              {/* Panel Toggles */}
              {showPanelToggles && (
                <PanelToggles
                  onToggleContextPanel={onToggleContextPanel}
                  onToggleGovernancePanel={onToggleGovernancePanel}
                  contextPanelVisible={contextPanelVisible}
                  governancePanelVisible={governancePanelVisible}
                />
              )}

              {/* Connection Status */}
              {showConnectionStatus && (
                <div className="hidden lg:block">
                  <ConnectionStatus isConnected={isConnected} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentView={currentView}
        onNavigate={onNavigate}
        showProjectSwitcher={showProjectSwitcher}
        currentRunspace={currentRunspace}
        runspaces={runspaces}
        onRunspaceSwitch={onRunspaceSwitch}
        onNewProject={onNewProject}
        onManageProjects={onManageProjects}
        showEngagementSelector={showEngagementSelector}
      />
    </>
  );
};

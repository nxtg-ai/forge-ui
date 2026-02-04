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

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

import {
  BarChart3,
  Target,
  Building2,
  Rocket,
  Shield,
  Menu,
  X,
  ChevronDown,
  CheckCircle,
  Code2,
  Terminal,
  Brain,
  Layers,
  MessageSquare,
  Command,
  Mountain,
  Sparkles,
} from "lucide-react";
import { ProjectSwitcher } from "../ProjectSwitcher";
import { useEngagement } from "../../contexts/EngagementContext";
import type { Runspace } from "../../core/runspace";
import type { EngagementMode } from "../types";

// Navigation route configuration - icons must match page AppShell icons
const NAVIGATION_ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, testId: "dashboard" },
  { id: "vision-display", label: "Vision", icon: <Mountain className="w-4 h-4" />, testId: "vision-display" },
  { id: "infinity-terminal", label: "Terminal", icon: <Terminal className="w-4 h-4" />, testId: "infinity-terminal" },
  { id: "command", label: "Command", icon: <Command className="w-4 h-4" />, testId: "command" },
  { id: "architect", label: "Architect", icon: <Building2 className="w-4 h-4" />, testId: "architect" },
  { id: "architect-demo", label: "Demo", icon: <Rocket className="w-4 h-4" />, testId: "architect-demo" },
  { id: "yolo", label: "YOLO", icon: <Shield className="w-4 h-4" />, testId: "yolo" },
  { id: "marketing", label: "Marketing", icon: <Sparkles className="w-4 h-4" />, testId: "marketing" },
] as const;

// Engagement mode configuration
const ENGAGEMENT_MODE_CONFIG: Record<
  EngagementMode,
  { label: string; icon: React.ReactNode; description: string }
> = {
  ceo: {
    label: "CEO",
    icon: <Target className="w-4 h-4" />,
    description: "Health + Progress + Critical blockers only",
  },
  vp: {
    label: "VP",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Strategic oversight + Recent decisions + Top 3 blockers",
  },
  engineer: {
    label: "Engineer",
    icon: <Code2 className="w-4 h-4" />,
    description: "Full agent activity + Technical details",
  },
  builder: {
    label: "Builder",
    icon: <Terminal className="w-4 h-4" />,
    description: "Implementation tasks + All details",
  },
  founder: {
    label: "Founder",
    icon: <Brain className="w-4 h-4" />,
    description: "Everything visible, no filters",
  },
};

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
 * Connection Status Indicator Component
 */
const ConnectionStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  const { mode } = useEngagement();

  return (
    <div className="flex items-center space-x-4">
      <div
        data-testid="app-connection-status"
        className="flex items-center space-x-2"
      >
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          } animate-pulse`}
          aria-hidden="true"
        />
        <span className="text-sm text-gray-400">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Mode Indicator */}
      <div className="px-3 py-1 bg-gray-800 rounded-full">
        <span className="text-xs text-gray-400">Mode: </span>
        <span className="text-xs font-semibold text-blue-400">
          {mode.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

/**
 * Engagement Mode Selector Component
 */
const EngagementModeSelector: React.FC = () => {
  const { mode, setMode } = useEngagement();
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const modeSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const modeKeys = useMemo(() => Object.keys(ENGAGEMENT_MODE_CONFIG) as EngagementMode[], []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(event.target as Node) &&
        modeSelectorButtonRef.current &&
        !modeSelectorButtonRef.current.contains(event.target as Node)
      ) {
        setShowModeSelector(false);
      }
    };

    if (showModeSelector) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showModeSelector]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: EngagementMode) => {
    setMode(newMode);
    setShowModeSelector(false);

    // Return focus to button
    setTimeout(() => {
      modeSelectorButtonRef.current?.focus();
    }, 100);
  }, [setMode]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showModeSelector) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setShowModeSelector(true);
        setSelectedModeIndex(modeKeys.indexOf(mode));
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedModeIndex((prev) => (prev + 1) % modeKeys.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedModeIndex((prev) => (prev - 1 + modeKeys.length) % modeKeys.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleModeChange(modeKeys[selectedModeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setShowModeSelector(false);
        modeSelectorButtonRef.current?.focus();
        break;
    }
  }, [showModeSelector, selectedModeIndex, modeKeys, mode, handleModeChange]);

  return (
    <div className="relative">
      <button
        ref={modeSelectorButtonRef}
        onClick={() => {
          setShowModeSelector(!showModeSelector);
          setSelectedModeIndex(modeKeys.indexOf(mode));
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={showModeSelector}
        aria-label={`Engagement mode: ${ENGAGEMENT_MODE_CONFIG[mode].label}. ${ENGAGEMENT_MODE_CONFIG[mode].description}`}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all border
          ${
            showModeSelector
              ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
              : "bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600"
          }
        `}
        data-testid="engagement-mode-button"
      >
        <span aria-hidden="true">{ENGAGEMENT_MODE_CONFIG[mode].icon}</span>
        <span className="text-sm">{ENGAGEMENT_MODE_CONFIG[mode].label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showModeSelector ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Mode Selector Dropdown - uses CSS transitions to avoid AnimatePresence hooks bug with React 19 */}
      {showModeSelector && (
        <div
          ref={modeDropdownRef}
          role="listbox"
          aria-label="Engagement mode options"
          className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          data-testid="engagement-mode-dropdown"
        >
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider" aria-hidden="true">
              Engagement Mode
            </div>
            {(modeKeys.map((modeKey, index) => {
              const config = ENGAGEMENT_MODE_CONFIG[modeKey];
              return (
                <button
                  key={modeKey}
                  onClick={() => handleModeChange(modeKey)}
                  onMouseEnter={() => setSelectedModeIndex(index)}
                  role="option"
                  aria-selected={mode === modeKey}
                  aria-label={`${config.label} mode: ${config.description}`}
                  className={`
                    w-full flex items-start gap-3 px-3 py-3 rounded-lg
                    transition-all text-left
                    ${
                      selectedModeIndex === index
                        ? "bg-gray-800 ring-2 ring-purple-500/50"
                        : mode === modeKey
                        ? "bg-purple-500/20 border border-purple-500/30"
                        : "hover:bg-gray-800"
                    }
                  `}
                  data-testid={`engagement-mode-${modeKey}`}
                >
                  <div className={`mt-0.5 ${mode === modeKey ? "text-purple-400" : "text-gray-400"}`} aria-hidden="true">
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm mb-1 ${mode === modeKey ? "text-purple-400" : "text-gray-200"}`}>
                      {config.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {config.description}
                    </div>
                  </div>
                  {mode === modeKey && (
                    <div className="text-purple-400" aria-hidden="true">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </button>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Panel Toggle Buttons Component
 */
const PanelToggles: React.FC<{
  onToggleContextPanel?: () => void;
  onToggleGovernancePanel?: () => void;
  contextPanelVisible?: boolean;
  governancePanelVisible?: boolean;
}> = ({
  onToggleContextPanel,
  onToggleGovernancePanel,
  contextPanelVisible,
  governancePanelVisible,
}) => {
  return (
    <div className="hidden md:flex items-center gap-2">
      {onToggleContextPanel && (
        <button
          onClick={onToggleContextPanel}
          aria-label={`${contextPanelVisible ? "Hide" : "Show"} context panel`}
          aria-pressed={contextPanelVisible}
          className={`p-2 rounded-lg transition-colors ${
            contextPanelVisible
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:bg-gray-800"
          }`}
          data-testid="toggle-context-panel"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
      {onToggleGovernancePanel && (
        <button
          onClick={onToggleGovernancePanel}
          aria-label={`${governancePanelVisible ? "Hide" : "Show"} governance panel`}
          aria-pressed={governancePanelVisible}
          className={`p-2 rounded-lg transition-colors ${
            governancePanelVisible
              ? "bg-purple-500/20 text-purple-400"
              : "text-gray-400 hover:bg-gray-800"
          }`}
          data-testid="toggle-governance-panel"
        >
          <Layers className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

/**
 * Mobile Drawer Component
 */
const MobileDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentView?: string;
  onNavigate?: (viewId: string) => void;
  showProjectSwitcher?: boolean;
  currentRunspace?: Runspace | null;
  runspaces?: Runspace[];
  onRunspaceSwitch?: (runspaceId: string) => void;
  onNewProject?: () => void;
  onManageProjects?: () => void;
  showEngagementSelector?: boolean;
}> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  showProjectSwitcher,
  currentRunspace,
  runspaces,
  onRunspaceSwitch,
  onNewProject,
  onManageProjects,
  showEngagementSelector,
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleNavigate = (viewId: string) => {
    onNavigate?.(viewId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[90] md:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 w-80 bg-gray-900 border-r border-gray-800 z-[100] md:hidden overflow-y-auto animate-in slide-in-from-left duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NXTG-Forge
              </h2>
              <button
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Project Switcher */}
            {showProjectSwitcher && currentRunspace && runspaces && onRunspaceSwitch && onNewProject && onManageProjects && (
              <div className="p-4 border-b border-gray-800">
                <ProjectSwitcher
                  currentRunspace={currentRunspace}
                  runspaces={runspaces}
                  onSwitch={onRunspaceSwitch}
                  onNew={onNewProject}
                  onManage={onManageProjects}
                />
              </div>
            )}

            {/* Engagement Mode Selector */}
            {showEngagementSelector && (
              <div className="p-4 border-b border-gray-800">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Engagement Mode
                </div>
                <EngagementModeSelector />
              </div>
            )}

            {/* Navigation Links */}
            <nav className="p-4 space-y-1" aria-label="Main navigation">
              {NAVIGATION_ROUTES.map((route) => (
                <button
                  key={route.id}
                  onClick={() => handleNavigate(route.id)}
                  aria-current={currentView === route.id ? "page" : undefined}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                    transition-colors font-medium
                    ${
                      currentView === route.id
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }
                  `}
                  data-testid={`mobile-nav-${route.testId}`}
                >
                  {route.icon}
                  <span>{route.label}</span>
                </button>
              ))}
            </nav>

            {/* Keyboard Shortcuts Hint */}
            <div className="p-4 border-t border-gray-800 mt-auto">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Command className="w-3 h-3" />
                <span>Press Cmd+K for shortcuts</span>
              </div>
            </div>
          </div>
        </>
  );
};

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                NXTG-Forge
              </h1>

              {/* Project Switcher - Desktop */}
              {showProjectSwitcher && currentRunspace && runspaces && onRunspaceSwitch && onNewProject && onManageProjects && (
                <div className="hidden md:block">
                  <ProjectSwitcher
                    currentRunspace={currentRunspace}
                    runspaces={runspaces}
                    onSwitch={onRunspaceSwitch}
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

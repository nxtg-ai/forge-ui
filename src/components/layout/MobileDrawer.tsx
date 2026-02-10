import React, { useEffect } from "react";
import { X, Command } from "lucide-react";
import { ProjectSwitcher } from "../ProjectSwitcher";
import { EngagementModeSelector } from "./EngagementModeSelector";
import { NAVIGATION_ROUTES } from "./navigation-config";
import type { Runspace } from "../../core/runspace";
import logoSrc from "../../assets/logo-32.png";

export interface MobileDrawerProps {
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
}

/**
 * Mobile Drawer Component
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
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
              <div className="flex items-center gap-2">
                <img src={logoSrc} alt="" className="w-7 h-7 rounded" aria-hidden="true" />
                <h2 className="text-lg font-bold text-white">
                  FORGE
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Project Switcher */}
            {showProjectSwitcher && onNewProject && onManageProjects && (
              <div className="p-4 border-b border-gray-800">
                <ProjectSwitcher
                  currentRunspace={currentRunspace ?? null}
                  runspaces={runspaces ?? []}
                  onSwitch={onRunspaceSwitch ?? (() => {})}
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

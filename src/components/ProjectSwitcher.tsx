/**
 * Project Switcher Component
 *
 * Dropdown menu for switching between runspaces
 * Shows active runspace with quick access to all projects
 */

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Circle,
  CheckCircle,
  FolderOpen,
  Settings,
} from "lucide-react";
import type { Runspace } from "../core/runspace";

interface ProjectSwitcherProps {
  currentRunspace: Runspace | null;
  runspaces: Runspace[];
  onSwitch: (runspaceId: string) => void;
  onNew: () => void;
  onManage: () => void;
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  currentRunspace,
  runspaces,
  onSwitch,
  onNew,
  onManage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sort runspaces: active first, then by last active
  const sortedRunspaces = [...runspaces].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });

  const handleSwitch = (runspaceId: string) => {
    onSwitch(runspaceId);
    setIsOpen(false);
  };

  const getStatusColor = (status: Runspace["status"]) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-500";
      case "suspended":
        return "text-yellow-400 bg-yellow-500";
      case "stopped":
        return "text-gray-400 bg-gray-500";
    }
  };

  const getStatusLabel = (status: Runspace["status"]) => {
    switch (status) {
      case "active":
        return "Active";
      case "suspended":
        return "Suspended";
      case "stopped":
        return "Stopped";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800
                   border border-gray-700 rounded-lg transition-all min-w-[200px]"
        data-testid="project-switcher-trigger"
      >
        {currentRunspace ? (
          <>
            {/* Project Icon */}
            {currentRunspace.icon ? (
              <span className="text-lg">{currentRunspace.icon}</span>
            ) : (
              <FolderOpen className="w-4 h-4 text-gray-400" />
            )}

            {/* Project Name */}
            <span className="flex-1 text-left text-sm font-medium text-white truncate">
              {currentRunspace.displayName}
            </span>

            {/* Status Indicator */}
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(currentRunspace.status)}`}
            />
          </>
        ) : (
          <>
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left text-sm text-gray-400">
              No Project
            </span>
          </>
        )}

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700
                     rounded-lg shadow-2xl z-[100] max-h-96 overflow-y-auto"
          data-testid="project-switcher-dropdown"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs text-gray-400 uppercase font-semibold">
              Your Projects
            </p>
          </div>

          {/* Project List */}
          <div className="py-2">
            {sortedRunspaces.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No projects yet. Create your first one!
              </div>
            ) : (
              sortedRunspaces.map((runspace) => (
                <button
                  key={runspace.id}
                  onClick={() => handleSwitch(runspace.id)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50
                             transition-all text-left ${
                               currentRunspace?.id === runspace.id
                                 ? "bg-gray-800/30"
                                 : ""
                             }`}
                  data-testid={`project-switcher-item-${runspace.name}`}
                >
                  {/* Icon/Color */}
                  {runspace.icon ? (
                    <span className="text-2xl mt-0.5">{runspace.icon}</span>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: runspace.color || '#6366f1' }}
                    >
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">
                        {runspace.displayName}
                      </p>
                      {currentRunspace?.id === runspace.id && (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-gray-500 truncate mb-1">
                      {runspace.path}
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span
                        className={`
                        px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1
                        ${
                          runspace.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : runspace.status === "suspended"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-gray-500/10 text-gray-400"
                        }
                      `}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${getStatusColor(runspace.status)}`}
                        />
                        {getStatusLabel(runspace.status)}
                      </span>

                      {/* Tags */}
                      {runspace.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-800 p-2 space-y-1">
            <button
              onClick={() => {
                onNew();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-800
                         rounded transition-all text-sm text-gray-300"
              data-testid="project-switcher-new-btn"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>

            <button
              onClick={() => {
                onManage();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-800
                         rounded transition-all text-sm text-gray-300"
              data-testid="project-switcher-manage-btn"
            >
              <Settings className="w-4 h-4" />
              Manage Projects
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

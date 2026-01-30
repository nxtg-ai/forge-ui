/**
 * Projects Management Component
 * Full-featured runspace management interface
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  X,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Activity,
  Clock,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import type { Runspace } from "../core/runspace";
import { useToast } from "./feedback/ToastSystem";

interface ProjectsManagementProps {
  isOpen: boolean;
  onClose: () => void;
  runspaces: Runspace[];
  activeRunspaceId: string | null;
  onRefresh: () => void;
  onSwitch: (runspaceId: string) => void;
  onStart: (runspaceId: string) => void;
  onStop: (runspaceId: string) => void;
  onDelete: (runspaceId: string) => void;
}

export const ProjectsManagement: React.FC<ProjectsManagementProps> = ({
  isOpen,
  onClose,
  runspaces,
  activeRunspaceId,
  onRefresh,
  onSwitch,
  onStart,
  onStop,
  onDelete,
}) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const getStatusColor = (status: Runspace["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "suspended":
        return "bg-yellow-500";
      case "stopped":
        return "bg-gray-500";
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

  const handleDelete = async (runspaceId: string, runspaceName: string) => {
    setIsDeleting(runspaceId);
    try {
      await onDelete(runspaceId);
      toast.success("Project deleted", {
        message: `Successfully deleted ${runspaceName}`,
        duration: 3000,
      });
      setSelectedProject(null);
    } catch (error) {
      toast.error("Failed to delete project", {
        message: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Manage Projects</h2>
              <span className="text-sm text-gray-500">
                {runspaces.length} projects
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Refresh projects"
              >
                <RefreshCw className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {runspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  No Projects Yet
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create your first project to get started
                </p>
                <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {runspaces.map((runspace) => (
                  <motion.div
                    key={runspace.id}
                    layout
                    className={`
                      relative bg-gray-800/50 border rounded-lg p-4 hover:bg-gray-800/70 transition-all
                      ${activeRunspaceId === runspace.id ? "border-purple-500" : "border-gray-700"}
                      ${selectedProject === runspace.id ? "ring-2 ring-purple-500" : ""}
                    `}
                    onClick={() => setSelectedProject(runspace.id)}
                  >
                    {/* Status Indicator */}
                    <div className="absolute top-3 right-3">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(runspace.status)}`}
                      />
                    </div>

                    {/* Icon/Color */}
                    <div className="mb-3">
                      {runspace.icon ? (
                        <span className="text-4xl">{runspace.icon}</span>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: runspace.color }}
                        >
                          <FolderOpen className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Name & Path */}
                    <h3 className="font-semibold text-white mb-1 truncate">
                      {runspace.displayName}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 truncate">
                      {runspace.path}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Activity className="w-3 h-3" />
                        <span>{getStatusLabel(runspace.status)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          Last active:{" "}
                          {runspace.lastActive.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    {runspace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {runspace.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {runspace.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">
                            +{runspace.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {runspace.status === "stopped" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStart(runspace.id);
                          }}
                          className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStop(runspace.id);
                          }}
                          className="flex-1 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs flex items-center justify-center gap-1"
                        >
                          <Pause className="w-3 h-3" />
                          Stop
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Are you sure you want to delete "${runspace.displayName}"?`,
                            )
                          ) {
                            handleDelete(runspace.id, runspace.displayName);
                          }
                        }}
                        disabled={isDeleting === runspace.id}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {isDeleting === runspace.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    {/* Active Badge */}
                    {activeRunspaceId === runspace.id && (
                      <div className="absolute top-0 left-0 right-0 bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded-t-lg text-center">
                        ACTIVE PROJECT
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {runspaces.length} project{runspaces.length !== 1 ? "s" : ""}{" "}
              total
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

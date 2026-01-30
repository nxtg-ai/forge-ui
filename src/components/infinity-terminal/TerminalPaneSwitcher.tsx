/**
 * Terminal Pane Switcher Component
 * Allows switching between different terminal panes in the Infinity Terminal
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Eye,
  Activity,
  Grid3X3,
  Maximize2,
  Minimize2,
  Plus,
  X,
} from "lucide-react";

export interface TerminalPane {
  id: string;
  name: string;
  type: "claude-code" | "oracle" | "hud" | "custom";
  wsPort?: number;
  active: boolean;
}

interface TerminalPaneSwitcherProps {
  panes: TerminalPane[];
  activePane: string;
  onPaneSelect: (paneId: string) => void;
  onPaneClose?: (paneId: string) => void;
  onPaneAdd?: () => void;
  onLayoutChange?: (layout: "single" | "split" | "grid") => void;
  className?: string;
}

export const TerminalPaneSwitcher: React.FC<TerminalPaneSwitcherProps> = ({
  panes,
  activePane,
  onPaneSelect,
  onPaneClose,
  onPaneAdd,
  onLayoutChange,
  className = "",
}) => {
  const [layout, setLayout] = useState<"single" | "split" | "grid">("single");
  const [isExpanded, setIsExpanded] = useState(false);

  const getPaneIcon = (type: TerminalPane["type"]) => {
    switch (type) {
      case "claude-code":
        return <Terminal className="w-3.5 h-3.5" />;
      case "oracle":
        return <Eye className="w-3.5 h-3.5" />;
      case "hud":
        return <Activity className="w-3.5 h-3.5" />;
      default:
        return <Terminal className="w-3.5 h-3.5" />;
    }
  };

  const getPaneColor = (type: TerminalPane["type"], isActive: boolean) => {
    if (!isActive) return "text-gray-500 hover:text-gray-300";
    switch (type) {
      case "claude-code":
        return "text-purple-400";
      case "oracle":
        return "text-cyan-400";
      case "hud":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const handleLayoutChange = (newLayout: "single" | "split" | "grid") => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  };

  return (
    <div className={`bg-gray-900 border-b border-gray-800 ${className}`}>
      <div className="flex items-center justify-between px-2 py-1">
        {/* Pane Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {panes.map((pane) => (
            <motion.button
              key={pane.id}
              onClick={() => onPaneSelect(pane.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                pane.id === activePane
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={getPaneColor(pane.type, pane.id === activePane)}>
                {getPaneIcon(pane.type)}
              </span>
              <span className="truncate max-w-[100px]">{pane.name}</span>
              {pane.active && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
              {onPaneClose && panes.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaneClose(pane.id);
                  }}
                  className="ml-1 p-0.5 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.button>
          ))}

          {/* Add Pane Button */}
          {onPaneAdd && (
            <button
              onClick={onPaneAdd}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-md transition-colors"
              title="Add new pane"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Layout Controls */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => handleLayoutChange("single")}
            className={`p-1.5 rounded transition-colors ${
              layout === "single"
                ? "bg-purple-500/20 text-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title="Single pane"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleLayoutChange("split")}
            className={`p-1.5 rounded transition-colors ${
              layout === "split"
                ? "bg-purple-500/20 text-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title="Split view"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleLayoutChange("grid")}
            className={`p-1.5 rounded transition-colors ${
              layout === "grid"
                ? "bg-purple-500/20 text-purple-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title="Grid view"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Pane Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800 px-2 py-2"
          >
            <div className="grid grid-cols-3 gap-2">
              {panes.map((pane) => (
                <div
                  key={pane.id}
                  className={`p-2 rounded-md border cursor-pointer transition-all ${
                    pane.id === activePane
                      ? "bg-gray-800 border-purple-500/50"
                      : "bg-gray-900 border-gray-800 hover:border-gray-700"
                  }`}
                  onClick={() => onPaneSelect(pane.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={getPaneColor(pane.type, true)}>
                      {getPaneIcon(pane.type)}
                    </span>
                    <span className="text-xs font-medium truncate">
                      {pane.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {pane.type === "claude-code" && "Main terminal"}
                    {pane.type === "oracle" && "Oracle monitoring"}
                    {pane.type === "hud" && "Governance HUD"}
                    {pane.type === "custom" && "Custom pane"}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TerminalPaneSwitcher;

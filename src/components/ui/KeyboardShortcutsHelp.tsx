/**
 * Keyboard Shortcuts Help Overlay Component
 *
 * Modal overlay displaying all available keyboard shortcuts
 * Triggered by '?' key or help button
 * Features search/filter, categorization, and Framer Motion animations
 */

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "./SafeAnimatePresence";
import {
  X,
  Search,
  Command,
  Navigation,
  Zap,
  Monitor,
  HelpCircle,
} from "lucide-react";

export interface KeyboardShortcut {
  key: string;
  description: string;
  category: "navigation" | "actions" | "mode" | "terminal" | "general";
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  customShortcuts?: KeyboardShortcut[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: "1",
    description: "Switch to Compact view",
    category: "navigation",
  },
  {
    key: "2",
    description: "Switch to Balanced view",
    category: "navigation",
  },
  {
    key: "3",
    description: "Switch to Immersive view",
    category: "navigation",
  },
  {
    key: "[",
    description: "Toggle left panel",
    category: "navigation",
  },
  {
    key: "]",
    description: "Toggle right panel",
    category: "navigation",
  },
  {
    key: "Tab",
    description: "Cycle through panels",
    category: "navigation",
    modifiers: ["ctrl"],
  },

  // Actions
  {
    key: "k",
    description: "Open command palette",
    category: "actions",
    modifiers: ["ctrl"],
  },
  {
    key: "r",
    description: "Refresh current view",
    category: "actions",
  },
  {
    key: "e",
    description: "Expand/collapse current panel",
    category: "actions",
  },
  {
    key: "f",
    description: "Search/filter",
    category: "actions",
    modifiers: ["ctrl"],
  },
  {
    key: "n",
    description: "New item/project",
    category: "actions",
    modifiers: ["ctrl"],
  },
  {
    key: "s",
    description: "Save",
    category: "actions",
    modifiers: ["ctrl"],
  },

  // Mode
  {
    key: "m",
    description: "Toggle mode selector",
    category: "mode",
  },
  {
    key: "d",
    description: "Toggle dark mode",
    category: "mode",
    modifiers: ["ctrl"],
  },

  // Terminal
  {
    key: "t",
    description: "Toggle terminal",
    category: "terminal",
    modifiers: ["ctrl"],
  },
  {
    key: "c",
    description: "Clear terminal",
    category: "terminal",
    modifiers: ["ctrl"],
  },
  {
    key: "l",
    description: "Clear scrollback",
    category: "terminal",
    modifiers: ["ctrl"],
  },

  // General
  {
    key: "?",
    description: "Show this help",
    category: "general",
  },
  {
    key: "Escape",
    description: "Close modal/cancel",
    category: "general",
  },
];

const CATEGORY_INFO = {
  navigation: {
    icon: Navigation,
    label: "Navigation",
    description: "Move between views and panels",
  },
  actions: {
    icon: Zap,
    label: "Actions",
    description: "Common operations",
  },
  mode: {
    icon: Monitor,
    label: "Mode",
    description: "Display and theme settings",
  },
  terminal: {
    icon: Command,
    label: "Terminal",
    description: "Terminal control",
  },
  general: {
    icon: HelpCircle,
    label: "General",
    description: "System-wide shortcuts",
  },
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  customShortcuts = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Combine default and custom shortcuts
  const allShortcuts = [...DEFAULT_SHORTCUTS, ...customShortcuts];

  // Filter shortcuts based on search query
  const filteredShortcuts = allShortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group shortcuts by category
  const groupedShortcuts = filteredShortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Simple focus management - keep focus in modal
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus search input when modal opens
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const renderKey = (key: string, modifiers?: string[]) => {
    const keys = [
      ...(modifiers || []).map((mod) => {
        switch (mod) {
          case "ctrl":
            return "Ctrl";
          case "alt":
            return "Alt";
          case "shift":
            return "Shift";
          case "meta":
            return "⌘";
          default:
            return mod;
        }
      }),
      key,
    ];

    return (
      <div className="flex items-center gap-1">
        {keys.map((k, idx) => (
          <React.Fragment key={idx}>
            <kbd
              className="px-2 py-1 text-xs font-semibold text-gray-300 bg-gray-800
                         border border-gray-700 rounded shadow-sm min-w-[28px] text-center"
            >
              {k}
            </kbd>
            {idx < keys.length - 1 && (
              <span className="text-gray-600 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-labelledby="shortcuts-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            ref={modalRef}
            className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-700
                       rounded-2xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <h2
                    id="shortcuts-modal-title"
                    className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600
                               bg-clip-text text-transparent"
                  >
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Navigate faster with these shortcuts
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close shortcuts help"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search shortcuts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg
                               text-white placeholder-gray-500 focus:outline-none focus:ring-2
                               focus:ring-purple-500 focus:border-transparent transition-all"
                    aria-label="Search keyboard shortcuts"
                  />
                </div>
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {Object.keys(groupedShortcuts).length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No shortcuts found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedShortcuts).map(([category, shortcuts]) => {
                    const categoryInfo = CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];
                    const Icon = categoryInfo.icon;

                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Category Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Icon className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">
                              {categoryInfo.label}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {categoryInfo.description}
                            </p>
                          </div>
                        </div>

                        {/* Shortcuts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {shortcuts.map((shortcut, idx) => (
                            <div
                              key={`${category}-${idx}`}
                              className="flex items-center justify-between p-3 bg-gray-800/50
                                         rounded-lg border border-gray-700/50 hover:border-purple-500/30
                                         hover:bg-gray-800/70 transition-all group"
                            >
                              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                                {shortcut.description}
                              </span>
                              {renderKey(shortcut.key, shortcut.modifiers)}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 px-6 py-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Press {renderKey("?", [])} to toggle this help</span>
                <span>Press {renderKey("Escape", [])} to close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

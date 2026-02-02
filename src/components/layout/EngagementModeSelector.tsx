/**
 * Engagement Mode Selector Component
 *
 * A polished, accessible dropdown selector for switching between engagement modes.
 *
 * Features:
 * - Full keyboard navigation (ArrowUp/Down, Enter, Escape, Home, End, Space)
 * - Complete ARIA support for screen readers
 * - Click-outside-to-close behavior
 * - Focus management and return
 * - Compact variant for header use
 * - Visual feedback for selected and hovered states
 * - Integration with EngagementContext
 *
 * @example
 * ```tsx
 * // Default variant (full-size)
 * <EngagementModeSelector />
 *
 * // Compact variant for headers
 * <EngagementModeSelector variant="compact" />
 * ```
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEngagement } from "../../contexts/EngagementContext";
import type { EngagementMode } from "../types";
import {
  ChevronDown,
  CheckCircle,
  Target,
  BarChart3,
  Code2,
  Terminal,
  Brain,
} from "lucide-react";

export interface EngagementModeSelectorProps {
  /**
   * Visual variant of the selector
   * - default: Full-size button with normal padding
   * - compact: Smaller button optimized for headers
   */
  variant?: "default" | "compact";

  /**
   * Optional className for additional styling
   */
  className?: string;

  /**
   * Optional callback when mode changes
   */
  onModeChange?: (mode: EngagementMode) => void;
}

/**
 * Configuration for each engagement mode
 */
const MODE_CONFIG: Record<
  EngagementMode,
  {
    label: string;
    icon: React.ReactNode;
    description: string;
  }
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

/**
 * Engagement Mode Selector Component
 */
export const EngagementModeSelector: React.FC<EngagementModeSelectorProps> = ({
  variant = "default",
  className = "",
  onModeChange,
}) => {
  // Context
  const { mode, setMode } = useEngagement();

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs for focus management
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mode keys for keyboard navigation
  const modeKeys = useMemo(
    () => Object.keys(MODE_CONFIG) as EngagementMode[],
    [],
  );

  // Update selected index when mode changes externally
  useEffect(() => {
    setSelectedIndex(modeKeys.indexOf(mode));
  }, [mode, modeKeys]);

  /**
   * Handle mode selection
   */
  const handleModeSelect = useCallback(
    (newMode: EngagementMode) => {
      setMode(newMode);
      setIsOpen(false);

      // Call optional callback
      if (onModeChange) {
        onModeChange(newMode);
      }

      // Return focus to button
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);
    },
    [setMode, onModeChange],
  );

  /**
   * Keyboard navigation handler
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;

        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % modeKeys.length);
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + modeKeys.length) % modeKeys.length,
          );
          break;

        case "Enter":
        case " ":
          e.preventDefault();
          handleModeSelect(modeKeys[selectedIndex]);
          break;

        case "Home":
          e.preventDefault();
          setSelectedIndex(0);
          break;

        case "End":
          e.preventDefault();
          setSelectedIndex(modeKeys.length - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, modeKeys, handleModeSelect]);

  /**
   * Click outside to close handler
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  /**
   * Button size classes based on variant
   */
  const buttonSizeClasses =
    variant === "compact" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          setSelectedIndex(modeKeys.indexOf(mode));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !isOpen) {
            e.preventDefault();
            setIsOpen(true);
            setSelectedIndex(modeKeys.indexOf(mode));
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Engagement mode: ${MODE_CONFIG[mode].label}. ${MODE_CONFIG[mode].description}`}
        className={`
          flex items-center gap-2 rounded-xl font-medium
          transition-all border-2
          ${buttonSizeClasses}
          ${
            isOpen
              ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
              : "bg-gray-900/90 border-gray-700 text-gray-300 hover:border-gray-600"
          }
        `}
        data-testid="engagement-mode-button"
      >
        <span aria-hidden="true">{MODE_CONFIG[mode].icon}</span>
        <span>{MODE_CONFIG[mode].label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="listbox"
            aria-label="Engagement mode options"
            className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            data-testid="engagement-mode-dropdown"
          >
            <div className="p-2">
              {/* Header */}
              <div
                className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                aria-hidden="true"
              >
                Engagement Mode
              </div>

              {/* Mode Options */}
              {modeKeys.map((modeKey, index) => {
                const config = MODE_CONFIG[modeKey];
                const isSelected = mode === modeKey;
                const isHighlighted = selectedIndex === index;

                return (
                  <button
                    key={modeKey}
                    onClick={() => handleModeSelect(modeKey)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${config.label} mode: ${config.description}`}
                    className={`
                      w-full flex items-start gap-3 px-3 py-3 rounded-lg
                      transition-all text-left
                      ${
                        isHighlighted
                          ? "bg-gray-800 ring-2 ring-purple-500/50"
                          : isSelected
                            ? "bg-purple-500/20 border border-purple-500/30"
                            : "hover:bg-gray-800"
                      }
                    `}
                    data-testid={`engagement-mode-${modeKey}`}
                  >
                    {/* Icon */}
                    <div
                      className={`mt-0.5 ${
                        isSelected ? "text-purple-400" : "text-gray-400"
                      }`}
                      aria-hidden="true"
                    >
                      {config.icon}
                    </div>

                    {/* Label and Description */}
                    <div className="flex-1">
                      <div
                        className={`font-semibold text-sm mb-1 ${
                          isSelected ? "text-purple-400" : "text-gray-200"
                        }`}
                      >
                        {config.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {config.description}
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="text-purple-400" aria-hidden="true">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

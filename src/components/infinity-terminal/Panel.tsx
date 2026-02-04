/**
 * Panel Component
 * Reusable side panel with fixed and overlay modes
 * Dispatches window resize event after transitions for terminal compatibility
 */

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import { X } from "lucide-react";

export type PanelMode = "fixed" | "overlay";
export type PanelSide = "left" | "right";

interface PanelProps {
  side: PanelSide;
  mode: PanelMode;
  visible: boolean;
  width: number;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Panel: React.FC<PanelProps> = ({
  side,
  mode,
  visible,
  width,
  onClose,
  children,
  className = "",
  title,
}) => {
  // Dispatch resize event after width transition for terminal fit
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.propertyName !== "width") return;
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    },
    [],
  );

  // Overlay mode: Full-screen backdrop + side drawer
  if (mode === "overlay") {
    if (!visible) return null;

    return (
      <AnimatePresence>
        {visible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={onClose}
              data-testid={`panel-backdrop-${side}`}
            />
            <motion.div
              initial={{ x: side === "left" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: side === "left" ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onAnimationComplete={() => {
                requestAnimationFrame(() => {
                  window.dispatchEvent(new Event("resize"));
                });
              }}
              className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} bottom-0 z-40 bg-gray-900 ${side === "left" ? "border-r" : "border-l"} border-gray-700 ${className}`}
              style={{ width: `${width}px` }}
              data-testid={`panel-drawer-${side}`}
            >
              {(title || onClose) && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="p-1 hover:bg-gray-800 rounded transition-colors ml-auto"
                      aria-label="Close panel"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
              <div className="h-full overflow-hidden">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Fixed mode: Always in DOM, width transitions between 0 and target.
  // This ensures transitionend fires, triggering terminal resize via fitAddon.fit().
  // Children are only rendered when visible to prevent hidden components from
  // running timers, WebSockets, and API polling while at width=0 (memory leak).
  const borderClass = side === "left" ? "border-r" : "border-l";
  const resolvedWidth = visible ? width : 0;

  return (
    <aside
      className={`flex-shrink-0 ${borderClass} border-gray-800 bg-gray-950 overflow-hidden transition-[width] duration-200 ease-in-out ${className}`}
      style={{ width: `${resolvedWidth}px` }}
      data-testid={`panel-fixed-${side}`}
      onTransitionEnd={handleTransitionEnd}
    >
      {visible && <div className="h-full overflow-y-auto">{children}</div>}
    </aside>
  );
};

export default Panel;

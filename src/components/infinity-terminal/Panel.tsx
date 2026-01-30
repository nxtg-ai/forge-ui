/**
 * Panel Component
 * Reusable side panel with fixed and overlay modes
 * Dispatches window resize event after animation completes
 */

import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  // Dispatch resize event to notify terminal of layout change
  const handleAnimationComplete = useCallback(() => {
    window.dispatchEvent(new Event("resize"));
  }, []);

  if (!visible) {
    return null;
  }

  // Overlay mode: Full-screen backdrop + side drawer
  if (mode === "overlay") {
    return (
      <AnimatePresence>
        {visible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={onClose}
              data-testid={`panel-backdrop-${side}`}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: side === "left" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: side === "left" ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onAnimationComplete={handleAnimationComplete}
              className={`fixed top-0 ${side === "left" ? "left-0" : "right-0"} bottom-0 z-40 bg-gray-900 border-${side === "left" ? "r" : "l"} border-gray-700 ${className}`}
              style={{ width: `${width}px` }}
              data-testid={`panel-drawer-${side}`}
            >
              {/* Header with close button */}
              {(title || onClose) && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  {title && (
                    <h3 className="text-sm font-semibold text-white">
                      {title}
                    </h3>
                  )}
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

  // Fixed mode: Slides in from side, part of flex layout
  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ x: side === "left" ? -width : width, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: side === "left" ? -width : width, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={handleAnimationComplete}
          className={`flex-shrink-0 border-${side === "left" ? "r" : "l"} border-gray-800 bg-gray-950 ${className}`}
          style={{ width: `${width}px` }}
          data-testid={`panel-fixed-${side}`}
        >
          <div className="h-full overflow-hidden">{children}</div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Panel;

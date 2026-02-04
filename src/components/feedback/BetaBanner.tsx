import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import { X, MessageSquare, Info } from "lucide-react";

interface BetaBannerProps {
  onFeedbackClick?: () => void;
}

const BANNER_DISMISSED_KEY = "nxtg-beta-banner-dismissed";
const BANNER_SESSION_KEY = "nxtg-beta-banner-session";

export const BetaBanner: React.FC<BetaBannerProps> = ({ onFeedbackClick }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    const sessionShown = sessionStorage.getItem(BANNER_SESSION_KEY);

    if (!dismissed && !sessionShown) {
      setIsVisible(true);
      sessionStorage.setItem(BANNER_SESSION_KEY, "true");
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  const handleFeedbackClick = () => {
    if (onFeedbackClick) {
      onFeedbackClick();
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-md border-b border-purple-500/30 shadow-elevation-3"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              {/* Content */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-600/30 rounded-lg border border-purple-500/50">
                    <Info className="w-5 h-5 text-purple-300" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      You're using NXTG-Forge Beta!
                    </h3>
                    <span className="px-2 py-0.5 bg-purple-500/30 border border-purple-400/50 rounded-full text-xs font-medium text-purple-200">
                      Beta
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    Help shape the future of development orchestration - we'd love your feedback
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleFeedbackClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium text-sm transition-all hover:scale-105"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Share Feedback</span>
                  <span className="sm:hidden">Feedback</span>
                </button>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 ml-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-5 h-5 text-gray-300 hover:text-white" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

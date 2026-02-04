import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  MessageSquare,
  X,
  Star,
  Upload,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type FeedbackCategory =
  | "Bug Report"
  | "Feature Request"
  | "UX Feedback"
  | "Performance Issue"
  | "Other";

interface FeedbackData {
  rating: number;
  category: FeedbackCategory;
  description: string;
  screenshot?: File;
  url: string;
  userAgent: string;
  timestamp: string;
}

interface BetaFeedbackProps {
  onClose?: () => void;
}

export const BetaFeedback: React.FC<BetaFeedbackProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>("Feature Request");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const categories: FeedbackCategory[] = [
    "Bug Report",
    "Feature Request",
    "UX Feedback",
    "Performance Issue",
    "Other",
  ];

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSubmitStatus("idle");
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setRating(0);
    setCategory("Feature Request");
    setDescription("");
    setScreenshot(null);
    setSubmitStatus("idle");
    setErrorMessage("");
    onClose?.();
  }, [onClose]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setErrorMessage("Screenshot must be less than 5MB");
          return;
        }
        setScreenshot(file);
        setErrorMessage("");
      }
    },
    [],
  );

  const saveFeedbackLocally = useCallback((feedback: FeedbackData) => {
    try {
      const existingFeedback = localStorage.getItem("nxtg-beta-feedback");
      const feedbackList = existingFeedback
        ? JSON.parse(existingFeedback)
        : [];
      feedbackList.push(feedback);
      localStorage.setItem("nxtg-beta-feedback", JSON.stringify(feedbackList));
      console.log("Feedback saved locally for later submission");
    } catch (error) {
      console.error("Failed to save feedback locally:", error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0 || description.trim().length === 0) {
      setErrorMessage("Please provide a rating and description");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const feedbackData: FeedbackData = {
      rating,
      category,
      description: description.trim(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    try {
      // Try to submit to API
      const formData = new FormData();
      formData.append("rating", rating.toString());
      formData.append("category", category);
      formData.append("description", description.trim());
      formData.append("url", window.location.href);
      formData.append("userAgent", navigator.userAgent);
      formData.append("timestamp", feedbackData.timestamp);

      if (screenshot) {
        formData.append("screenshot", screenshot);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSubmitStatus("success");
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback to API:", error);
      // Save locally as fallback
      saveFeedbackLocally(feedbackData);
      setSubmitStatus("success");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    rating,
    category,
    description,
    screenshot,
    handleClose,
    saveFeedbackLocally,
  ]);

  return (
    <>
      {/* Floating Feedback Button */}
      <motion.button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-glow-brand hover:shadow-glow-brand hover:scale-105 transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="font-medium">Beta Feedback</span>
      </motion.button>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={handleClose}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-elevation-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Beta Feedback
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Help us improve NXTG-Forge by sharing your thoughts
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {submitStatus === "success" ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Thank You!
                      </h3>
                      <p className="text-gray-400 text-center">
                        Your feedback has been submitted successfully
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      {/* Rating */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          How would you rate your experience?
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-8 h-8 ${
                                  star <= (hoveredRating || rating)
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-gray-600"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) =>
                            setCategory(e.target.value as FeedbackCategory)
                          }
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Tell us what you think..."
                          rows={6}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {description.length} / 2000 characters
                        </p>
                      </div>

                      {/* Screenshot Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Screenshot (optional)
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            id="screenshot-upload"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="screenshot-upload"
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-750 hover:border-gray-600 cursor-pointer transition-colors"
                          >
                            <Upload className="w-5 h-5" />
                            <span>
                              {screenshot ? screenshot.name : "Upload Image"}
                            </span>
                          </label>
                        </div>
                        {screenshot && (
                          <div className="mt-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-400">
                              {(screenshot.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              onClick={() => setScreenshot(null)}
                              className="ml-auto text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {errorMessage && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <p className="text-sm text-red-300">{errorMessage}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                {submitStatus !== "success" && (
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={
                        isSubmitting ||
                        rating === 0 ||
                        description.trim().length === 0
                      }
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-glow-brand disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

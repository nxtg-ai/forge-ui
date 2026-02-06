import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { logger } from "../../utils/browser-logger";
import { motion } from "framer-motion";
import { SafeAnimatePresence as AnimatePresence } from "../ui/SafeAnimatePresence";
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  RotateCw,
  ExternalLink,
  Copy,
  ChevronRight,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  details?: string;
  actions?: ToastAction[];
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
}

interface ToastContextType {
  toast: {
    success: (title: string, options?: Partial<Toast>) => void;
    error: (title: string, options?: Partial<Toast>) => void;
    warning: (title: string, options?: Partial<Toast>) => void;
    info: (title: string, options?: Partial<Toast>) => void;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [toast, ...prev].slice(0, 5)); // Max 5 toasts

    // Auto dismiss if not persistent
    if (!toast.persistent) {
      setTimeout(() => {
        dismiss(toast.id);
      }, toast.duration || 5000);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const createToast = useCallback(
    (type: ToastType, title: string, options?: Partial<Toast>) => {
      const toast: Toast = {
        id: `toast-${Date.now()}-${Math.random()}`,
        type,
        title,
        timestamp: new Date(),
        ...options,
      };
      addToast(toast);
    },
    [addToast],
  );

  const toast = useMemo(() => ({
    success: (title: string, options?: Partial<Toast>) =>
      createToast("success", title, options),
    error: (title: string, options?: Partial<Toast>) =>
      createToast("error", title, options),
    warning: (title: string, options?: Partial<Toast>) =>
      createToast("warning", title, options),
    info: (title: string, options?: Partial<Toast>) =>
      createToast("info", title, options),
  }), [createToast]);

  const contextValue = useMemo(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div
      data-testid="toast-container"
      className="fixed top-4 right-4 z-50 space-y-2 max-w-md"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
  index: number;
}> = ({ toast, onDismiss, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          bgColor: "bg-green-900/20",
          borderColor: "border-green-500/30",
          iconColor: "text-green-400",
          textColor: "text-green-100",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          bgColor: "bg-red-900/20",
          borderColor: "border-red-500/30",
          iconColor: "text-red-400",
          textColor: "text-red-100",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          bgColor: "bg-yellow-900/20",
          borderColor: "border-yellow-500/30",
          iconColor: "text-yellow-400",
          textColor: "text-yellow-100",
        };
      case "info":
        return {
          icon: <Info className="w-5 h-5" />,
          bgColor: "bg-blue-900/20",
          borderColor: "border-blue-500/30",
          iconColor: "text-blue-400",
          textColor: "text-blue-100",
        };
    }
  };

  const config = getToastConfig(toast.type);

  return (
    <motion.div
      data-testid={`toast-item-${toast.id}`}
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 500,
          damping: 30,
          delay: index * 0.05,
        },
      }}
      exit={{
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 },
      }}
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm shadow-2xl
        ${config.bgColor} ${config.borderColor}
      `}
    >
      {/* Progress bar for auto-dismiss */}
      {!toast.persistent && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{
            duration: toast.duration ? toast.duration / 1000 : 5,
            ease: "linear",
          }}
        />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className={`font-medium ${config.textColor}`}>
                  {toast.title}
                </h4>

                {toast.message && (
                  <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
                )}

                {/* Expandable details */}
                {toast.details && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    {isExpanded ? "Hide" : "Show"} details
                  </button>
                )}

                <AnimatePresence>
                  {isExpanded && toast.details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2"
                    >
                      <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800">
                        <code className="text-xs text-gray-400 font-mono">
                          {toast.details}
                        </code>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                {toast.actions && toast.actions.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {toast.actions.map((action, idx) => (
                      <button
                        key={idx}
                        data-testid={`toast-action-btn-${toast.id}-${idx}`}
                        onClick={action.onClick}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                          transition-all hover:scale-105 active:scale-95
                          ${
                            idx === 0
                              ? `${config.bgColor} ${config.borderColor} ${config.textColor} border`
                              : "text-gray-400 hover:text-gray-200"
                          }
                        `}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              <button
                data-testid={`toast-close-btn-${toast.id}`}
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Preset toast patterns for common scenarios
export const toastPresets = {
  commandExecuting: (commandName: string) => ({
    title: `Executing ${commandName}`,
    message: "Command is being processed...",
    type: "info" as ToastType,
    persistent: true,
  }),

  commandSuccess: (commandName: string) => ({
    title: `${commandName} completed`,
    type: "success" as ToastType,
    duration: 3000,
  }),

  commandError: (commandName: string, error: string) => ({
    title: `${commandName} failed`,
    message: "An error occurred while executing the command",
    details: error,
    type: "error" as ToastType,
    actions: [
      {
        label: "Retry",
        icon: <RotateCw className="w-3 h-3" />,
        onClick: () => logger.debug("Retry action clicked"),
      },
    ],
  }),

  networkError: () => ({
    title: "Connection lost",
    message: "Unable to connect to the server",
    type: "error" as ToastType,
    persistent: true,
    actions: [
      {
        label: "Retry",
        icon: <RotateCw className="w-3 h-3" />,
        onClick: () => window.location.reload(),
      },
    ],
  }),

  updateAvailable: () => ({
    title: "Update available",
    message: "A new version is ready to install",
    type: "info" as ToastType,
    persistent: true,
    actions: [
      {
        label: "Update now",
        onClick: () => logger.debug("Update action clicked"),
      },
    ],
  }),

  copied: (text: string) => ({
    title: "Copied to clipboard",
    message: text.length > 50 ? text.substring(0, 50) + "..." : text,
    type: "success" as ToastType,
    duration: 2000,
  }),
};

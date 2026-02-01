/**
 * Error Boundary Component
 * Catches React errors and provides graceful fallback UI with recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle } from "lucide-react";

type FallbackVariant = "full-page" | "panel" | "card";

interface Props {
  children: ReactNode;
  /** @deprecated Use fallbackMessage instead for consistent naming */
  fallbackMessage?: string;
  /** Custom error message to display */
  errorMessage?: string;
  /** Callback fired when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Maximum number of automatic retries before showing critical state */
  maxRetries?: number;
  /** Visual style variant for different contexts */
  variant?: FallbackVariant;
  /** Show "Report Error" button that copies error details */
  showReportButton?: boolean;
  /** Show "Go Home" button */
  showHomeButton?: boolean;
  /** Custom recovery message */
  recoveryMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  retryCount: number;
  errorCopied: boolean;
  currentPath: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private unlisten?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      retryCount: 0,
      errorCopied: false,
      currentPath: typeof window !== "undefined" ? window.location.pathname : "",
    };
  }

  componentDidMount() {
    // Reset error boundary on navigation changes
    if (typeof window !== "undefined") {
      this.unlisten = this.setupNavigationListener();
    }
  }

  componentWillUnmount() {
    if (this.unlisten) {
      this.unlisten();
    }
  }

  setupNavigationListener = (): (() => void) => {
    const handleNavigation = () => {
      const newPath = window.location.pathname;
      if (newPath !== this.state.currentPath && this.state.hasError) {
        // Reset error state when navigating to a different page
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          currentPath: newPath,
        });
      }
    };

    // Listen for both popstate (back/forward) and custom navigation events
    window.addEventListener("popstate", handleNavigation);

    // Also listen for React Router navigation if available
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(window.history, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      window.history.pushState = originalPushState;
    };
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error("Error in onError callback:", callbackError);
      }
    }

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
      retryCount: prevState.retryCount + 1,
    }));

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error("Production error:", {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCopied: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  copyErrorDetails = async () => {
    const { error, errorInfo } = this.state;
    const errorText = `
NXTG-Forge Error Report
=======================

Error: ${error?.toString()}
Message: ${error?.message}
Name: ${error?.name}

Component Stack:
${errorInfo?.componentStack}

Location: ${window.location.href}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}

Stack Trace:
${error?.stack}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ errorCopied: true });

      // Reset copied state after 3 seconds
      setTimeout(() => {
        this.setState({ errorCopied: false });
      }, 3000);
    } catch (err) {
      console.error("Failed to copy error details:", err);
      alert("Failed to copy to clipboard");
    }
  };

  renderFullPage() {
    const { error, errorInfo, errorCount, retryCount, errorCopied } = this.state;
    const {
      fallbackMessage,
      errorMessage,
      maxRetries = 3,
      showReportButton = true,
      showHomeButton = true,
      recoveryMessage,
    } = this.props;

    const displayMessage = errorMessage || fallbackMessage;
    const isCritical = retryCount >= maxRetries;

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Error Card */}
          <div className="bg-gray-900 border border-red-500/30 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-900/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-red-400">
                    {isCritical ? "Critical Error Detected" : "Something Went Wrong"}
                  </h1>
                  <p className="text-sm text-red-300/70">
                    {isCritical
                      ? "Multiple errors occurred. Please reload the application."
                      : "The application encountered an unexpected error."}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {displayMessage && <p className="text-gray-300">{displayMessage}</p>}

              {/* Error Details */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-400">Error Details</h3>
                  {showReportButton && (
                    <button
                      onClick={this.copyErrorDetails}
                      className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      {errorCopied ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Report
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Message:</p>
                    <p className="text-sm text-red-400 font-mono">{error?.message}</p>
                  </div>
                  {process.env.NODE_ENV === "development" && errorInfo && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                        Component Stack (Dev Only)
                      </summary>
                      <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                  {process.env.NODE_ENV === "development" && error?.stack && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                        Stack Trace (Dev Only)
                      </summary>
                      <pre className="mt-2 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>

              {/* Recovery Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Recovery Steps</h3>
                {recoveryMessage ? (
                  <p className="text-sm text-gray-300">{recoveryMessage}</p>
                ) : (
                  <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                    <li>Try clicking "Reset" to recover without losing data</li>
                    <li>If the error persists, reload the page</li>
                    <li>Clear your browser cache if issues continue</li>
                    {isCritical && (
                      <li className="text-red-400 font-semibold">
                        Contact support if the problem persists
                      </li>
                    )}
                  </ol>
                )}
              </div>

              {/* Statistics */}
              {errorCount > 1 && (
                <div className="text-xs text-gray-500">
                  Error occurred {errorCount} time{errorCount !== 1 ? "s" : ""} in this session
                  {retryCount > 0 && ` (${retryCount}/${maxRetries} retries)`}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-800 px-6 py-4 bg-gray-950/50">
              <div className="flex items-center gap-3">
                {!isCritical && (
                  <button
                    onClick={this.handleReset}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset
                  </button>
                )}
                <button
                  onClick={this.handleReload}
                  className={`${
                    isCritical ? "flex-1" : "flex-1"
                  } px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                {showHomeButton && (
                  <button
                    onClick={this.handleGoHome}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Need help? Check the{" "}
              <a
                href="https://github.com/nxtg-ai/forge/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                GitHub Issues
              </a>{" "}
              or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  renderPanel() {
    const { error, errorCopied, retryCount } = this.state;
    const {
      fallbackMessage,
      errorMessage,
      maxRetries = 3,
      showReportButton = true,
    } = this.props;

    const displayMessage = errorMessage || fallbackMessage;
    const isCritical = retryCount >= maxRetries;

    return (
      <div className="w-full h-full bg-gray-900 border border-red-500/30 rounded-lg overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-400">Error</h3>
              {displayMessage && (
                <p className="text-xs text-red-300/70 truncate">{displayMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-gray-950 border border-gray-800 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">Error:</p>
            <p className="text-sm text-red-400 font-mono break-words">{error?.message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-800 p-3 bg-gray-950/50 flex items-center gap-2">
          {!isCritical && (
            <button
              onClick={this.handleReset}
              className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
          {showReportButton && (
            <button
              onClick={this.copyErrorDetails}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Copy error details to clipboard"
            >
              {errorCopied ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Report
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  renderCard() {
    const { error, errorCopied, retryCount } = this.state;
    const {
      fallbackMessage,
      errorMessage,
      maxRetries = 3,
      showReportButton = true,
    } = this.props;

    const displayMessage = errorMessage || fallbackMessage;
    const isCritical = retryCount >= maxRetries;

    return (
      <div className="bg-gray-900 border border-red-500/30 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-400">
                {isCritical ? "Critical Error" : "Error Occurred"}
              </h3>
              {displayMessage && (
                <p className="text-xs text-red-300/70 line-clamp-2">{displayMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Error Message */}
          <div className="bg-gray-950 border border-gray-800 rounded p-3">
            <p className="text-xs text-gray-500 mb-1">Message:</p>
            <p className="text-sm text-red-400 font-mono break-words">{error?.message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isCritical && (
              <button
                onClick={this.handleReset}
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            {showReportButton && (
              <button
                onClick={this.copyErrorDetails}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm font-medium flex items-center gap-2 transition-all"
              >
                {errorCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Error
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      const variant = this.props.variant || "full-page";

      switch (variant) {
        case "panel":
          return this.renderPanel();
        case "card":
          return this.renderCard();
        case "full-page":
        default:
          return this.renderFullPage();
      }
    }

    return this.props.children;
  }
}

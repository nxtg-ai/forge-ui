/**
 * Error Boundary Component
 * Catches React errors and provides graceful fallback UI with recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error("Production error:", {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.toString()}

Component Stack:
${errorInfo?.componentStack}

Timestamp: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(errorText);
    alert("Error details copied to clipboard");
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const { fallbackMessage } = this.props;

      // If error count is too high, show more drastic recovery options
      const isCritical = errorCount >= 3;

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
                      {isCritical
                        ? "Critical Error Detected"
                        : "Something Went Wrong"}
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
                {fallbackMessage && (
                  <p className="text-gray-300">{fallbackMessage}</p>
                )}

                {/* Error Details */}
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-400">
                      Error Details
                    </h3>
                    <button
                      onClick={this.copyErrorDetails}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Message:</p>
                      <p className="text-sm text-red-400 font-mono">
                        {error?.message}
                      </p>
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
                  </div>
                </div>

                {/* Recovery Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">
                    Recovery Steps
                  </h3>
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
                </div>

                {/* Statistics */}
                {errorCount > 1 && (
                  <div className="text-xs text-gray-500">
                    Error occurred {errorCount} time
                    {errorCount !== 1 ? "s" : ""} in this session
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
                  <button
                    onClick={this.handleGoHome}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </button>
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

    return this.props.children;
  }
}

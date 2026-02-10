/**
 * ErrorBoundary Component Showcase
 * Demonstrates all variants and features of the ErrorBoundary component
 *
 * To use: Import this component in your app and render it to see examples
 */

import React, { useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AlertCircle, Zap } from "lucide-react";
import { logger } from "../utils/browser-logger";

// Component that throws an error on demand
function ErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Intentional test error for ErrorBoundary showcase");
  }
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded p-4 text-green-400 text-sm">
      Component is working normally. Click "Trigger Error" to test the error boundary.
    </div>
  );
}

// Individual variant showcase components
function FullPageExample() {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Full Page Variant</h3>
        <button
          onClick={() => setShouldThrow(true)}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
        >
          Trigger Error
        </button>
      </div>

      <ErrorBoundary
        variant="full-page"
        errorMessage="This is a full-page error boundary example"
        maxRetries={3}
        showReportButton={true}
        showHomeButton={true}
        onError={(error, errorInfo) => {
          logger.debug("Full-page error caught:", error.message);
        }}
      >
        <ErrorThrower shouldThrow={shouldThrow} />
      </ErrorBoundary>

      <div className="text-xs text-gray-500">
        Best for: Root app level, page-level errors
      </div>
    </div>
  );
}

function PanelExample() {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Panel Variant</h3>
        <button
          onClick={() => setShouldThrow(true)}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
        >
          Trigger Error
        </button>
      </div>

      <div className="h-64 border border-gray-700 rounded-lg overflow-hidden">
        <ErrorBoundary
          variant="panel"
          errorMessage="Panel component failed to load"
          maxRetries={5}
          showReportButton={true}
          onError={(error, errorInfo) => {
            logger.debug("Panel error caught:", error.message);
          }}
        >
          <ErrorThrower shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </div>

      <div className="text-xs text-gray-500">
        Best for: Sidebars, narrow panels, split-screen sections
      </div>
    </div>
  );
}

function CardExample() {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Card Variant</h3>
        <button
          onClick={() => setShouldThrow(true)}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
        >
          Trigger Error
        </button>
      </div>

      <ErrorBoundary
        variant="card"
        errorMessage="Dashboard widget encountered an error"
        maxRetries={3}
        showReportButton={true}
        onError={(error, errorInfo) => {
          logger.debug("Card error caught:", error.message);
        }}
      >
        <ErrorThrower shouldThrow={shouldThrow} />
      </ErrorBoundary>

      <div className="text-xs text-gray-500">
        Best for: Dashboard widgets, cards, medium components
      </div>
    </div>
  );
}

function CustomCallbackExample() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const handleError = (error: Error) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrorLog((prev) => [...prev, `[${timestamp}] ${error.message}`]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Custom Error Callback
        </h3>
        <button
          onClick={() => setShouldThrow(true)}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
        >
          Trigger Error
        </button>
      </div>

      <ErrorBoundary
        variant="card"
        errorMessage="Error tracking demonstration"
        maxRetries={3}
        onError={handleError}
      >
        <ErrorThrower shouldThrow={shouldThrow} />
      </ErrorBoundary>

      {errorLog.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded p-3">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            Error Log (from onError callback):
          </h4>
          <div className="space-y-1">
            {errorLog.map((log, idx) => (
              <div key={idx} className="text-xs text-red-400 font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Demonstrates onError callback for error tracking integration
      </div>
    </div>
  );
}

// Main showcase component
export function ErrorBoundaryShowcase() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">ErrorBoundary Showcase</h1>
          </div>
          <p className="text-gray-400">
            Explore all variants and features of the ErrorBoundary component.
            Click "Trigger Error" to see how each variant handles errors.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-blue-400 font-semibold mb-1">
              How to use this showcase
            </p>
            <ul className="text-gray-300 space-y-1 list-disc list-inside">
              <li>
                Click "Trigger Error" on any example to see the error boundary
                in action
              </li>
              <li>
                Click "Reset" or "Try Again" to recover from the error state
              </li>
              <li>
                Use "Copy Error Report" to see the detailed error information
              </li>
              <li>
                Open DevTools console to see onError callback logs
              </li>
            </ul>
          </div>
        </div>

        {/* Examples Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Full Page Example */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <FullPageExample />
          </div>

          {/* Panel Example */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <PanelExample />
          </div>

          {/* Card Example */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <CardExample />
          </div>

          {/* Custom Callback Example */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <CustomCallbackExample />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Component location:{" "}
            <code className="text-gray-400">
              src/components/ErrorBoundary.tsx
            </code>
          </p>
          <p className="mt-1">
            Documentation:{" "}
            <code className="text-gray-400">
              docs/components/ErrorBoundary-Usage.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundaryShowcase;

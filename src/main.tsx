import React from "react";
import { inject } from "@vercel/analytics";
import ReactDOM from "react-dom/client";
import App from "./App"; // REAL INTEGRATION - NO MOCK DATA
import { ToastProvider } from "./components/feedback/ToastSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthGate } from "./components/auth/AuthGate";
import { takeSignInParams } from "./components/auth/signin-params";
import { analyticsEnabled, scrubAnalyticsEvent } from "./components/auth/analytics-guard";
import "./index.css";

// Take ?forge_token= / ?forge_login_code= out of the URL before any script,
// beacon or Referer can see them (DIRECTIVE-NXTG-20261007-19).
takeSignInParams();

// Off in local installs; a hosted build opts in with VITE_VERCEL_ANALYTICS=1.
if (analyticsEnabled()) {
  inject({ beforeSend: scrubAnalyticsEvent });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="NXTG-Forge encountered an unexpected error. Your work is safe, but the app needs to recover.">
      <ToastProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

import React from "react";
import { inject } from "@vercel/analytics";
import { Analytics } from "@vercel/analytics/react";
import ReactDOM from "react-dom/client";
import App from "./App"; // REAL INTEGRATION - NO MOCK DATA
import { ToastProvider } from "./components/feedback/ToastSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthGate } from "./components/auth/AuthGate";
import "./index.css";

inject();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="NXTG-Forge encountered an unexpected error. Your work is safe, but the app needs to recover.">
      <ToastProvider>
        <AuthGate>
          <App />
        </AuthGate>
        <Analytics />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

import React from "react";
import { inject } from "@vercel/analytics";
import ReactDOM from "react-dom/client";
import App from "./App"; // REAL INTEGRATION - NO MOCK DATA
import { ToastProvider } from "./components/feedback/ToastSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

inject();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="NXTG-Forge encountered an unexpected error. Your work is safe, but the app needs to recover.">
      <ToastProvider>
        <App />
        <Analytics />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

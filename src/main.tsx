import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // REAL INTEGRATION - NO MOCK DATA
import { ToastProvider } from './components/feedback/ToastSystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="NXTG-Forge encountered an unexpected error. Your work is safe, but the app needs to recover.">
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

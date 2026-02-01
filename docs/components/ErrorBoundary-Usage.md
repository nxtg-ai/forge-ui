# ErrorBoundary Component - Usage Guide

## Overview

The `ErrorBoundary` component is a production-ready React error boundary that catches JavaScript errors anywhere in the component tree, logs those errors, and displays a beautiful fallback UI instead of crashing the whole application.

## Features

- **Configurable Retry Logic**: Control automatic retry behavior with `maxRetries` prop
- **Error Reporting Callback**: Track errors via `onError` prop
- **Multiple Display Variants**: Adapt to different UI contexts (full-page, panel, card)
- **Development Mode Details**: Show stack traces and component stacks only in dev
- **Navigation Auto-Reset**: Automatically clear errors when user navigates away
- **Copy Error Reports**: One-click error reporting via clipboard
- **Backward Compatible**: Existing usage with `fallbackMessage` continues to work

## Installation

Already included in the project at `/src/components/ErrorBoundary.tsx`.

```typescript
import { ErrorBoundary } from "@/components/ErrorBoundary";
```

## Basic Usage

### Full Page Error (Default)

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary fallbackMessage="The application encountered an unexpected error.">
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Panel Error (Compact)

Use for sidebar panels, small containers:

```tsx
<ErrorBoundary
  variant="panel"
  fallbackMessage="This panel encountered an error."
  maxRetries={5}
>
  <GovernancePanel />
</ErrorBoundary>
```

### Card Error (Medium)

Use for cards, widgets, dashboard components:

```tsx
<ErrorBoundary
  variant="card"
  errorMessage="Failed to load metrics"
  showReportButton={true}
>
  <MetricsCard />
</ErrorBoundary>
```

## Advanced Usage

### Error Tracking Integration

```tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackError } from "@/services/analytics";

function Dashboard() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Send to your error tracking service
    trackError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userId: currentUser.id,
      timestamp: Date.now(),
    });
  };

  return (
    <ErrorBoundary
      variant="card"
      errorMessage="Dashboard metrics failed to load"
      onError={handleError}
      maxRetries={3}
      showReportButton={true}
      showHomeButton={false}
    >
      <DashboardMetrics />
    </ErrorBoundary>
  );
}
```

### Custom Recovery Message

```tsx
<ErrorBoundary
  variant="full-page"
  errorMessage="Authentication service is currently unavailable"
  recoveryMessage="Please try logging in again, or contact support if the problem persists."
  maxRetries={1}
>
  <LoginForm />
</ErrorBoundary>
```

### Disable Features Conditionally

```tsx
const isProd = process.env.NODE_ENV === "production";

<ErrorBoundary
  variant="panel"
  showReportButton={!isProd} // Hide in production
  showHomeButton={true}
  maxRetries={isProd ? 1 : 5} // More retries in dev
>
  <ExperimentalFeature />
</ErrorBoundary>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Components to wrap with error boundary |
| `fallbackMessage` | `string` | `undefined` | **Deprecated**: Use `errorMessage` instead |
| `errorMessage` | `string` | `undefined` | Custom error message to display to users |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | `undefined` | Callback fired when error is caught |
| `maxRetries` | `number` | `3` | Maximum retry attempts before critical state |
| `variant` | `"full-page" \| "panel" \| "card"` | `"full-page"` | Visual style variant |
| `showReportButton` | `boolean` | `true` | Show "Copy Error Report" button |
| `showHomeButton` | `boolean` | `true` | Show "Go Home" button (full-page only) |
| `recoveryMessage` | `string` | `undefined` | Custom recovery instructions |

## Variant Showcase

### 1. Full Page Variant

**Best for:** Root-level app boundary, page-level errors

**Features:**
- Centered full-screen layout
- Detailed error information
- Recovery steps
- GitHub issues link
- All action buttons (Reset, Reload, Home)

**Size:** Takes full viewport

### 2. Panel Variant

**Best for:** Sidebars, narrow panels, split-screen sections

**Features:**
- Compact vertical layout
- Essential error info only
- Retry + Report buttons
- Fits in constrained spaces

**Size:** Fills parent container (flexbox-friendly)

### 3. Card Variant

**Best for:** Dashboard widgets, cards, medium-sized components

**Features:**
- Balanced information density
- Icon + message layout
- Try Again + Copy Error buttons
- Rounded corners, shadow

**Size:** Self-contained card layout

## Error Report Format

When user clicks "Copy Error Report", clipboard contains:

```
NXTG-Forge Error Report
=======================

Error: TypeError: Cannot read property 'map' of undefined
Message: Cannot read property 'map' of undefined
Name: TypeError

Component Stack:
    at ProjectList (src/components/ProjectList.tsx:42)
    at ErrorBoundary (src/components/ErrorBoundary.tsx)
    at Dashboard (src/pages/Dashboard.tsx)

Location: http://localhost:5050/dashboard
Timestamp: 2026-01-31T12:34:56.789Z
User Agent: Mozilla/5.0 ...

Stack Trace:
TypeError: Cannot read property 'map' of undefined
    at ProjectList.render (webpack://src/components/ProjectList.tsx:42:15)
    ...
```

## Behavior Details

### Automatic Navigation Reset

The error boundary automatically resets when the user navigates to a different page. This prevents stale error states from persisting across navigation.

**Triggers:**
- Browser back/forward buttons
- `history.pushState` calls
- React Router navigation
- Direct URL changes

### Retry Count vs Error Count

- **errorCount**: Total errors caught (increments on every error)
- **retryCount**: User retry attempts (increments on each retry)
- **Critical state**: When `retryCount >= maxRetries`

### Development vs Production

**Development Mode:**
- Shows component stack in collapsible section
- Shows full stack trace
- More verbose error details
- Longer default retry count

**Production Mode:**
- Hides stack traces
- Cleaner error messages
- Logs to console for monitoring service integration
- Shorter retry count (fail fast)

## Best Practices

### 1. Granular Boundaries

Wrap smaller component trees instead of the entire app:

```tsx
// GOOD: Granular boundaries
<Dashboard>
  <ErrorBoundary variant="card">
    <MetricsWidget />
  </ErrorBoundary>

  <ErrorBoundary variant="panel">
    <ActivityFeed />
  </ErrorBoundary>
</Dashboard>

// LESS IDEAL: One boundary for everything
<ErrorBoundary>
  <Dashboard>
    <MetricsWidget />
    <ActivityFeed />
  </Dashboard>
</ErrorBoundary>
```

### 2. Context-Appropriate Variants

Match the variant to the component's visual context:

```tsx
// Full page for root app
<ErrorBoundary variant="full-page">
  <App />
</ErrorBoundary>

// Panel for sidebars
<ErrorBoundary variant="panel">
  <Sidebar />
</ErrorBoundary>

// Card for dashboard widgets
<ErrorBoundary variant="card">
  <StatsCard />
</ErrorBoundary>
```

### 3. Always Provide Context

Give users actionable information:

```tsx
// GOOD: Specific, actionable
<ErrorBoundary
  errorMessage="Failed to load project metrics. This might be due to a network issue."
  recoveryMessage="Check your internet connection and try again."
>
  <ProjectMetrics />
</ErrorBoundary>

// BAD: Vague, unhelpful
<ErrorBoundary errorMessage="Error occurred">
  <ProjectMetrics />
</ErrorBoundary>
```

### 4. Track Critical Errors

Always integrate error tracking for production:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    if (process.env.NODE_ENV === "production") {
      // Send to Sentry, LogRocket, etc.
      errorTracker.captureException(error, {
        componentStack: errorInfo.componentStack,
      });
    }
  }}
>
  <CriticalFeature />
</ErrorBoundary>
```

## Migration from Old Usage

Existing code continues to work unchanged:

```tsx
// OLD (still works)
<ErrorBoundary fallbackMessage="Something went wrong">
  <Component />
</ErrorBoundary>

// NEW (recommended)
<ErrorBoundary
  errorMessage="Something went wrong"
  variant="card"
  maxRetries={3}
>
  <Component />
</ErrorBoundary>
```

The `fallbackMessage` prop is deprecated but still supported for backward compatibility.

## Testing

### Triggering Test Errors

```tsx
// Create a component that throws on mount
function BrokenComponent() {
  throw new Error("Test error");
  return <div>Never renders</div>;
}

// Test the boundary
<ErrorBoundary
  variant="card"
  errorMessage="Test error boundary"
  onError={(error) => console.log("Caught:", error)}
>
  <BrokenComponent />
</ErrorBoundary>
```

### Unit Testing with Jest

```tsx
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

test("renders error UI when child throws", () => {
  const ThrowError = () => {
    throw new Error("Test error");
  };

  render(
    <ErrorBoundary errorMessage="Test failed">
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/Test failed/i)).toBeInTheDocument();
});
```

## Styling Customization

The component uses Tailwind CSS classes. To customize:

```tsx
// Option 1: Use variant prop for predefined styles
<ErrorBoundary variant="card" />

// Option 2: Fork the component and modify classes
// See: src/components/ErrorBoundary.tsx

// Option 3: Wrap in a custom container
<div className="custom-error-container">
  <ErrorBoundary variant="panel" />
</div>
```

## Troubleshooting

### Error boundary not catching errors

Error boundaries only catch errors in:
- Render methods
- Lifecycle methods
- Constructors

They do NOT catch:
- Event handlers (use try/catch)
- Async code (use try/catch)
- Server-side rendering errors
- Errors in the error boundary itself

### Navigation reset not working

Ensure you're not preventing default navigation behavior. The error boundary hooks into:
- `window.popstate` events
- `history.pushState` calls

If using a custom router, you may need to manually reset the boundary.

---

**Component Location**: `/home/axw/projects/NXTG-Forge/v3/src/components/ErrorBoundary.tsx`

**Last Updated**: 2026-01-31

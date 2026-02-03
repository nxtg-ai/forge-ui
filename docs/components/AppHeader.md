# AppHeader Component

**Location:** `/home/axw/projects/NXTG-Forge/v3/src/components/layout/AppHeader.tsx`

## Overview

The `AppHeader` is a unified, flexible header component that replaces the dual-header architecture. It combines application-level navigation, project management, engagement modes, and page-specific actions into a single, cohesive component.

## Features

### Core Functionality
- **NXTG-Forge Branding** - Consistent branding across all pages
- **Project Switcher Integration** - Multi-project support with dropdown
- **Navigation Tabs** - 7 main routes (Dashboard, Vision, Terminal, Command, Architect, Demo, YOLO)
- **Engagement Mode Selector** - Global mode switching (CEO, VP, Engineer, Builder, Founder)
- **Connection Status** - Real-time WebSocket connection indicator
- **Panel Toggles** - Show/hide context and governance panels

### Responsive Design
- **Desktop (≥768px):** Full navigation bar with all features visible
- **Mobile (<768px):** Hamburger menu with slide-out drawer
- **Tablet:** Optimized layout with key features prioritized

### Accessibility
- **ARIA Roles:** `role="banner"`, `role="navigation"`, `aria-current`
- **Keyboard Navigation:** Full keyboard support with focus management
- **Screen Reader Support:** Proper labels and announcements
- **Skip to Content:** Skip link for screen readers (Cmd+K hint)

### Animations
- **Mobile Drawer:** Smooth slide-in/out using Framer Motion
- **Dropdowns:** Fade and scale animations
- **Focus States:** Visual feedback for keyboard navigation

## Props Interface

```typescript
interface AppHeaderProps {
  // Page identity
  title?: string;                    // Optional page title override
  icon?: React.ReactNode;            // Optional page icon
  badge?: string;                    // Optional badge (e.g., "Live", "Beta")

  // Navigation
  currentView?: string;              // Active view ID
  onNavigate?: (viewId: string) => void; // Navigation handler

  // Slots for page-specific content
  actions?: React.ReactNode;         // Custom action buttons

  // Project switcher
  currentRunspace?: Runspace | null;
  runspaces?: Runspace[];
  onRunspaceSwitch?: (runspaceId: string) => void;
  onNewProject?: () => void;
  onManageProjects?: () => void;

  // Feature toggles
  showEngagementSelector?: boolean;  // Show engagement mode selector
  showPanelToggles?: boolean;        // Show panel toggle buttons
  showConnectionStatus?: boolean;    // Show connection status
  showNavigation?: boolean;          // Show navigation tabs
  showProjectSwitcher?: boolean;     // Show project switcher

  // Panel toggle handlers
  onToggleContextPanel?: () => void;
  onToggleGovernancePanel?: () => void;
  contextPanelVisible?: boolean;
  governancePanelVisible?: boolean;

  // Connection status
  isConnected?: boolean;             // WebSocket connection state

  className?: string;                // Additional CSS classes
}
```

## Usage Examples

### Basic Usage (App-Level)

```tsx
import { AppHeader } from './components/layout';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AppHeader
        currentView={currentView}
        onNavigate={setCurrentView}
        isConnected={isConnected}
        showConnectionStatus
        showNavigation
        showProjectSwitcher
        currentRunspace={activeRunspace}
        runspaces={runspaces}
        onRunspaceSwitch={handleRunspaceSwitch}
        onNewProject={handleNewProject}
        onManageProjects={handleManageProjects}
      />

      <main id="main-content">
        {/* Page content */}
      </main>
    </div>
  );
}
```

### Page-Specific Usage (Dashboard)

```tsx
import { AppHeader } from '../components/layout';

function DashboardPage() {
  return (
    <>
      <AppHeader
        title="Chief of Staff Dashboard"
        icon={<BarChart3 className="w-6 h-6" />}
        badge="Live"
        currentView="dashboard"
        showEngagementSelector
        showPanelToggles
        onToggleContextPanel={toggleContextPanel}
        onToggleGovernancePanel={toggleGovernancePanel}
        contextPanelVisible={contextPanelVisible}
        governancePanelVisible={governancePanelVisible}
        actions={
          <button className="px-4 py-2 bg-purple-600 rounded-lg">
            Export Report
          </button>
        }
      />

      <main id="main-content">
        {/* Dashboard content */}
      </main>
    </>
  );
}
```

### Terminal Page (Minimal Header)

```tsx
import { AppHeader } from '../components/layout';

function TerminalPage() {
  return (
    <>
      <AppHeader
        title="Infinity Terminal"
        icon={<Infinity className="w-6 h-6" />}
        currentView="infinity-terminal"
        showNavigation={false}  // Hide nav for focused experience
        showConnectionStatus
        actions={
          <button className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">
            New Session
          </button>
        }
      />

      <main id="main-content">
        {/* Terminal content */}
      </main>
    </>
  );
}
```

## Component Architecture

### Sub-Components

1. **ConnectionStatus** - WebSocket connection indicator with engagement mode
2. **EngagementModeSelector** - Dropdown for switching engagement modes
3. **PanelToggles** - Buttons for showing/hiding side panels
4. **MobileDrawer** - Full-height slide-out navigation for mobile

### Navigation Routes

The component includes 7 predefined routes:

```typescript
[
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 /> },
  { id: "vision-display", label: "Vision", icon: <Target /> },
  { id: "infinity-terminal", label: "Terminal", icon: <Infinity /> },
  { id: "command", label: "Command", icon: <Zap /> },
  { id: "architect", label: "Architect", icon: <Building2 /> },
  { id: "architect-demo", label: "Demo", icon: <Rocket /> },
  { id: "yolo", label: "YOLO", icon: <Shield /> },
]
```

### Engagement Modes

Five engagement modes with different detail levels:

```typescript
{
  ceo: "Health + Progress + Critical blockers only",
  vp: "Strategic oversight + Recent decisions + Top 3 blockers",
  engineer: "Full agent activity + Technical details",
  builder: "Implementation tasks + All details",
  founder: "Everything visible, no filters"
}
```

## Integration Guide

### Replacing Dual Headers

**Before (App.tsx + Page Header):**
```tsx
// App.tsx
<header className="...">
  <h1>NXTG-Forge</h1>
  <ProjectSwitcher />
  <nav>{/* routes */}</nav>
  <AppHeaderStatus />
</header>

// dashboard-live.tsx
<header className="...">
  <h1>Chief of Staff Dashboard</h1>
  <EngagementModeSelector />
  <PanelToggles />
</header>
```

**After (Single AppHeader):**
```tsx
// App.tsx
<AppHeader
  currentView={currentView}
  onNavigate={setCurrentView}
  showNavigation
  showProjectSwitcher
  showConnectionStatus
  currentRunspace={activeRunspace}
  runspaces={runspaces}
  onRunspaceSwitch={handleRunspaceSwitch}
  onNewProject={handleNewProject}
  onManageProjects={handleManageProjects}
/>

// dashboard-live.tsx - No header needed! Just main content
<main id="main-content">
  <ChiefOfStaffDashboard />
</main>
```

### With EngagementProvider

The component uses `useEngagement()` from `EngagementContext`, so ensure your app is wrapped:

```tsx
import { EngagementProvider } from './contexts/EngagementContext';

function App() {
  return (
    <EngagementProvider>
      <AppHeader {...props} />
      {/* Rest of app */}
    </EngagementProvider>
  );
}
```

## Keyboard Shortcuts

- **Tab:** Navigate through interactive elements
- **Enter/Space:** Activate buttons and dropdowns
- **Arrow Keys:** Navigate dropdown options
- **Escape:** Close dropdowns
- **Cmd+K:** Global keyboard shortcuts (hint displayed)

## Accessibility Features

### Screen Reader Support
- Proper heading hierarchy (`<h1>`, `<h2>`)
- Descriptive ARIA labels for all interactive elements
- Live region announcements for mode changes
- Skip to content link (visible on focus)

### Keyboard Navigation
- Full keyboard access to all features
- Visible focus indicators
- Logical tab order
- Escape key closes modals/dropdowns

### ARIA Attributes
- `role="banner"` on header
- `role="navigation"` on nav elements
- `aria-current="page"` for active route
- `aria-expanded` for dropdowns
- `aria-pressed` for toggle buttons

## Styling

The component uses Tailwind CSS with design tokens from the NXTG-Forge design system:

- **Colors:** Gray 900/800/700 (dark theme), Purple/Blue gradient (brand)
- **Spacing:** Consistent px-4, py-2 padding
- **Typography:** Font bold for branding, medium for nav
- **Effects:** Backdrop blur, border, shadow

## Testing

### Test IDs

```typescript
// Header
data-testid="app-header"

// Navigation
data-testid="app-nav-btn-dashboard"
data-testid="app-nav-btn-vision-display"
data-testid="app-nav-btn-infinity-terminal"
// ... etc

// Mobile
data-testid="mobile-menu-button"
data-testid="mobile-nav-dashboard"

// Engagement Mode
data-testid="engagement-mode-button"
data-testid="engagement-mode-dropdown"
data-testid="engagement-mode-ceo"
data-testid="engagement-mode-engineer"
// ... etc

// Panel Toggles
data-testid="toggle-context-panel"
data-testid="toggle-governance-panel"

// Connection
data-testid="app-connection-status"
```

### Example Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from './AppHeader';

test('navigates to dashboard on click', () => {
  const onNavigate = jest.fn();

  render(
    <AppHeader
      currentView="terminal"
      onNavigate={onNavigate}
      showNavigation
    />
  );

  const dashboardBtn = screen.getByTestId('app-nav-btn-dashboard');
  fireEvent.click(dashboardBtn);

  expect(onNavigate).toHaveBeenCalledWith('dashboard');
});
```

## Migration Checklist

- [ ] Remove old header from `App.tsx` (lines 619-670)
- [ ] Remove page-specific headers from:
  - [ ] `src/pages/dashboard-live.tsx`
  - [ ] `src/pages/infinity-terminal-view.tsx`
  - [ ] `src/pages/vision-view.tsx`
  - [ ] `src/pages/architect-view.tsx`
  - [ ] `src/pages/command-view.tsx`
- [ ] Add `AppHeader` to `App.tsx` root
- [ ] Pass through props (currentView, onNavigate, etc.)
- [ ] Update page components to use `actions` prop for custom buttons
- [ ] Remove `AppHeaderStatus` component (now integrated)
- [ ] Test all navigation routes
- [ ] Test mobile responsiveness
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

## Related Components

- **ProjectSwitcher** (`/src/components/ProjectSwitcher.tsx`) - Project dropdown
- **EngagementContext** (`/src/contexts/EngagementContext.tsx`) - Global engagement state
- **useResponsiveLayout** - Layout management hook

## Future Enhancements

- [ ] Breadcrumb navigation for nested routes
- [ ] Search/command palette integration
- [ ] Notification badge on header icon
- [ ] Theme switcher (light/dark mode)
- [ ] User profile dropdown
- [ ] Quick actions menu

---

**Created:** 2026-02-01
**Last Updated:** 2026-02-01
**Status:** ✅ Production Ready

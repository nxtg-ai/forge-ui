# AppShell Architecture Documentation

## Overview

The **AppShell** component is the unified layout foundation for NXTG-Forge v3. It composes the entire application structure by integrating header, panels, content area, and footer into a cohesive, responsive shell.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AppShell Container                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            AppHeader (64px, sticky, z-30)             │  │
│  │  ┌──────┬──────────────────────────┬──────────────┐  │  │
│  │  │Icon  │Title + Badge            │HeaderActions │  │  │
│  │  └──────┴──────────────────────────┴──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Main Layout (flex-1, overflow)           │  │
│  │  ┌─────────┬────────────────────┬─────────────────┐  │  │
│  │  │  Left   │   Main Content     │     Right       │  │  │
│  │  │  Panel  │   (scrollable)     │     Panel       │  │  │
│  │  │  280px  │    flex-1          │     320px       │  │  │
│  │  │         │                    │                 │  │  │
│  │  │ Memory  │ Page-specific     │   Governance    │  │  │
│  │  │ Context │ content renders   │   HUD           │  │  │
│  │  │ History │ here              │   Status        │  │  │
│  │  │         │                    │                 │  │  │
│  │  └─────────┴────────────────────┴─────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         FooterPanel (64-80px, optional)               │  │
│  │  ┌────────┬──────────────────────────┬─────────────┐ │  │
│  │  │Status  │   Oracle Feed (Marquee)  │   Actions   │ │  │
│  │  └────────┴──────────────────────────┴─────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
AppShell
├── Header (app-shell-header)
│   ├── Icon (optional)
│   ├── Title + Badge
│   └── Header Actions (optional)
│
├── Main Layout Area
│   ├── Panel (left, conditional)
│   │   └── {leftPanel content}
│   │
│   ├── Main Content (app-shell-content)
│   │   └── {children}
│   │
│   └── Panel (right, conditional)
│       └── {rightPanel content}
│
├── Footer (conditional)
│   ├── FooterPanel (default)
│   │   ├── Status + Session
│   │   ├── OracleFeedMarquee
│   │   └── Quick Actions
│   │
│   └── {custom footer}
│
└── KeyboardShortcutsHelp (modal overlay)
```

## Core Responsibilities

### 1. Layout Composition
- Arranges header, panels, content, and footer
- Manages responsive breakpoints
- Handles panel visibility state
- Coordinates panel mode (fixed vs overlay)

### 2. Responsive Behavior
Adapts layout based on screen size:

**Desktop (≥1280px)**
- Full 3-column layout
- Fixed panels (part of flex layout)
- Panels slide in/out smoothly
- Footer: 64-80px height

**Tablet (768-1279px)**
- 2-column layout
- Optional panels (reduced width)
- Fixed mode maintained
- Footer: 64px height

**Mobile (<768px)**
- Single column layout
- Panels as overlay drawers
- Full-screen backdrop on panel open
- Footer: 64px height, compact actions

### 3. Keyboard Navigation
Built-in shortcuts for power users:

| Shortcut | Action |
|----------|--------|
| `[` | Toggle left panel |
| `]` | Toggle right panel |
| `Alt+F` | Toggle footer |
| `?` | Show keyboard shortcuts help |
| `Escape` | Close modals |

Shortcuts are contextual - they don't fire in input fields.

### 4. Panel Management
Panels integrate with the existing `Panel` component:
- Automatic mode switching (fixed/overlay)
- Smooth animations via Framer Motion
- Window resize events dispatched for terminal compatibility
- Close button in overlay mode

### 5. Footer Integration
Flexible footer system:
- Default: `FooterPanel` with oracle feed
- Custom: Any React component
- Conditional rendering
- Session status and connection state

## Integration Points

### useResponsiveLayout Hook
Location: `/src/components/infinity-terminal/hooks/useResponsiveLayout.ts`

Provides:
- Breakpoint detection
- Layout configuration
- Panel visibility state
- Toggle functions

```typescript
const {
  layout,              // Current layout config
  sidebarVisible,      // Left panel state
  hudVisible,          // Right panel state
  footerVisible,       // Footer state
  toggleSidebar,       // Toggle left panel
  toggleHUD,           // Toggle right panel
  toggleFooter,        // Toggle footer
} = useResponsiveLayout({
  defaultSidebarVisible: true,
  defaultHUDVisible: true,
});
```

### Panel Component
Location: `/src/components/infinity-terminal/Panel.tsx`

Features:
- Two modes: `fixed` (desktop) and `overlay` (mobile)
- Smooth animations
- Window resize event dispatch
- Optional close button

```typescript
<Panel
  side="left"           // "left" | "right"
  mode="fixed"          // "fixed" | "overlay"
  visible={true}        // Show/hide
  width={280}           // Width in pixels
  onClose={handler}     // Close callback
  title="Panel Title"   // Header title
>
  {content}
</Panel>
```

### FooterPanel Component
Location: `/src/components/infinity-terminal/FooterPanel.tsx`

Features:
- Session status indicator
- Oracle feed marquee
- Quick action buttons
- Responsive sizing

```typescript
<FooterPanel
  sessionName="default-session"
  isConnected={true}
  oracleMessages={messages}
  onToggleContext={handler}
  onToggleGovernance={handler}
  contextVisible={false}
  governanceVisible={false}
  isMobile={false}
/>
```

### KeyboardShortcutsHelp Component
Location: `/src/components/ui/KeyboardShortcutsHelp.tsx`

Features:
- Modal overlay with shortcuts list
- Search/filter functionality
- Category grouping
- Custom shortcuts support

```typescript
<KeyboardShortcutsHelp
  isOpen={showHelp}
  onClose={handler}
  customShortcuts={[
    {
      key: "r",
      description: "Refresh view",
      category: "actions",
      modifiers: ["ctrl"],
    },
  ]}
/>
```

## Props API

### Core Props

```typescript
interface AppShellProps {
  // Page identity
  title: string;                    // Required - page title
  icon?: React.ReactNode;           // Optional - title icon
  badge?: string;                   // Optional - title badge

  // Header
  headerActions?: React.ReactNode;  // Optional - right-side actions
  showEngagementSelector?: boolean; // Future - engagement mode

  // Left Panel
  leftPanel?: React.ReactNode;      // Panel content
  leftPanelTitle?: string;          // Panel header
  showLeftPanel?: boolean;          // Visibility (default: true)
  leftPanelWidth?: number;          // Width in px (default: 280)

  // Right Panel
  rightPanel?: React.ReactNode;     // Panel content
  rightPanelTitle?: string;         // Panel header
  showRightPanel?: boolean;         // Visibility (default: true)
  rightPanelWidth?: number;         // Width in px (default: 320)

  // Main Content
  children: React.ReactNode;        // Required - main content

  // Footer
  footer?: React.ReactNode;         // Custom footer
  showFooter?: boolean;             // Show footer (default: false)
  sessionName?: string;             // Default footer session
  isConnected?: boolean;            // Default footer status
  oracleMessages?: OracleMessage[]; // Oracle feed
  onToggleContext?: () => void;     // Context panel toggle
  onToggleGovernance?: () => void;  // Governance panel toggle
  contextVisible?: boolean;         // Context panel state
  governanceVisible?: boolean;      // Governance panel state

  // Keyboard Shortcuts
  customShortcuts?: KeyboardShortcut[]; // Additional shortcuts

  // Styling
  className?: string;               // Additional CSS classes
}
```

## Usage Patterns

### Pattern 1: Basic Page
Minimal setup for simple pages:

```tsx
<AppShell title="Dashboard" icon={<BarChart3 />}>
  <DashboardContent />
</AppShell>
```

### Pattern 2: With Panels
Full layout with side panels:

```tsx
<AppShell
  title="Command Center"
  icon={<Zap />}
  leftPanel={<CommandHistory />}
  leftPanelTitle="History"
  rightPanel={<ExecutionStatus />}
  rightPanelTitle="Status"
>
  <CommandBuilder />
</AppShell>
```

### Pattern 3: With Footer
Include oracle feed and status:

```tsx
<AppShell
  title="Terminal"
  showFooter={true}
  sessionName="main"
  isConnected={wsConnected}
  oracleMessages={oracleFeed}
  onToggleContext={handleContext}
>
  <TerminalView />
</AppShell>
```

### Pattern 4: Full Featured
All features enabled:

```tsx
<AppShell
  title="Dashboard"
  icon={<BarChart3 />}
  badge="Live"
  headerActions={<RefreshButton />}
  leftPanel={<ProjectHealth />}
  leftPanelTitle="Health"
  rightPanel={<AgentActivity />}
  rightPanelTitle="Activity"
  showFooter={true}
  sessionName="dashboard"
  isConnected={true}
  oracleMessages={messages}
  customShortcuts={shortcuts}
>
  <DashboardMetrics />
</AppShell>
```

## State Management

### Internal State
AppShell manages:
- Keyboard shortcuts help visibility
- Panel sync with props

### External State (useResponsiveLayout)
Hook manages:
- Breakpoint detection
- Panel visibility
- Panel mode (fixed/overlay)
- Layout configuration

### Prop-Driven State
User controls:
- Panel visibility via props
- Footer visibility
- Custom content

## Performance Considerations

### 1. Resize Event Debouncing
The `useResponsiveLayout` hook debounces resize events using `requestAnimationFrame` to prevent render loops.

### 2. Panel Animations
Panel component dispatches window resize events after animations complete, ensuring terminals and other dynamic content resize correctly.

### 3. Conditional Rendering
Panels and footer only render when needed, reducing DOM nodes.

### 4. Memoization
Consider memoizing panel content if re-rendering is expensive:

```tsx
const leftPanelContent = useMemo(
  () => <ExpensiveComponent />,
  [dependencies]
);

<AppShell leftPanel={leftPanelContent} />
```

## Accessibility

### ARIA Structure
- `<header>` for app header
- `<main>` for content area
- `<footer>` for footer panel
- `role="dialog"` for keyboard shortcuts modal

### Keyboard Support
- Tab navigation through interactive elements
- Escape to close modals
- Shortcuts don't intercept in input fields
- Focus management in modals

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for interactive elements
- Skip to main content (future enhancement)

## Testing

### Unit Tests
Location: `/src/components/layout/AppShell.test.tsx`

Coverage:
- Basic rendering
- Panel visibility
- Footer rendering
- Keyboard shortcuts
- Responsive behavior
- Integration scenarios

### Integration Tests
Test with actual page components:

```tsx
import { render } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/dashboard";

test("renders dashboard in AppShell", () => {
  const { container } = render(
    <AppShell title="Dashboard">
      <DashboardPage />
    </AppShell>
  );

  expect(container).toMatchSnapshot();
});
```

## Migration Guide

### From InfinityTerminalLayout
Old pattern:
```tsx
<InfinityTerminalLayout
  sidebar={<SessionHistory />}
  hud={<GovernanceHUD />}
>
  <TerminalComponent />
</InfinityTerminalLayout>
```

New pattern:
```tsx
<AppShell
  title="Terminal"
  leftPanel={<SessionHistory />}
  leftPanelTitle="Sessions"
  rightPanel={<GovernanceHUD />}
  rightPanelTitle="Governance"
>
  <TerminalComponent />
</AppShell>
```

### From Custom Layouts
Old pattern:
```tsx
<div className="flex flex-col h-screen">
  <CustomHeader />
  <div className="flex flex-1">
    <Sidebar />
    <main>{content}</main>
  </div>
</div>
```

New pattern:
```tsx
<AppShell
  title="Page Title"
  leftPanel={<Sidebar />}
>
  {content}
</AppShell>
```

## Future Enhancements

### Planned Features
- [ ] LayoutContext for global panel state
- [ ] AppHeader component integration
- [ ] Breadcrumb navigation support
- [ ] Panel resize handles
- [ ] Panel state persistence (localStorage)
- [ ] Custom animation presets
- [ ] Multiple footer slots
- [ ] Panel drag-and-drop reordering

### API Evolution
Future props may include:
- `onPanelResize?: (side, width) => void`
- `persistPanelState?: boolean`
- `breadcrumbs?: Breadcrumb[]`
- `headerSlots?: { left, center, right }`

## Examples

See `/src/examples/AppShellExample.tsx` for comprehensive usage examples:
- Basic example
- With panels
- With footer
- Full dashboard

## Related Components

- `Panel` - Side panel component
- `FooterPanel` - Default footer with oracle feed
- `KeyboardShortcutsHelp` - Shortcuts modal
- `AppHeader` - Unified header (future integration)
- `EngagementModeSelector` - Mode switcher

## Resources

- [Panel Component Docs](../infinity-terminal/Panel.tsx)
- [FooterPanel Docs](../infinity-terminal/FooterPanel.tsx)
- [useResponsiveLayout Hook](../infinity-terminal/hooks/useResponsiveLayout.ts)
- [Keyboard Shortcuts](../ui/KeyboardShortcutsHelp.tsx)
- [Examples](../../examples/AppShellExample.tsx)

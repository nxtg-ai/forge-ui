# AppShell Component

Unified layout structure that composes header, panels, and content into a cohesive application shell.

## Architecture

```
┌─────────────────────────────────────────┐
│ AppHeader (64px, sticky)                │
├──────┬────────────────────┬─────────────┤
│Left  │   Main Content     │  Right      │
│Panel │   (scrollable)     │  Panel      │
│280px │                    │  320px      │
│      │                    │             │
├──────┴────────────────────┴─────────────┤
│ FooterPanel (optional, 64-80px)         │
└─────────────────────────────────────────┘
```

## Features

### Responsive Layout
- **Desktop (xl/2xl)**: Full 3-column layout with fixed panels
- **Tablet (md/lg)**: 2-column layout, optional panels
- **Mobile (xs/sm)**: Single column with overlay panels

### Panel Management
- Fixed panels on desktop (part of flex layout)
- Overlay panels on mobile (slide-in drawers)
- Automatic panel mode switching based on breakpoint
- Window resize events dispatched for terminal compatibility

### Keyboard Shortcuts
Built-in keyboard shortcuts for navigation:
- `[` - Toggle left panel
- `]` - Toggle right panel
- `Alt+F` - Toggle footer
- `?` - Show keyboard shortcuts help

### Integration Points
- Uses `useResponsiveLayout` hook for state management
- Integrates with `Panel` component for side panels
- Integrates with `FooterPanel` for oracle feed and quick actions
- Supports custom keyboard shortcuts via props

## Usage

### Basic Usage

```tsx
import { AppShell } from "@/components/layout/AppShell";
import { Terminal } from "lucide-react";

function MyPage() {
  return (
    <AppShell
      title="Infinity Terminal"
      icon={<Terminal className="w-6 h-6" />}
    >
      <div className="p-6">
        <h2>Main Content</h2>
      </div>
    </AppShell>
  );
}
```

### With Panels

```tsx
<AppShell
  title="Command Center"
  icon={<Zap className="w-6 h-6" />}

  // Left panel
  leftPanel={<MemoryPanel />}
  leftPanelTitle="Memory & Context"
  showLeftPanel={true}

  // Right panel
  rightPanel={<GovernanceHUD />}
  rightPanelTitle="Governance"
  showRightPanel={true}
>
  <CommandExecutor />
</AppShell>
```

### With Header Actions

```tsx
<AppShell
  title="Dashboard"
  badge="Live"
  headerActions={
    <>
      <Button onClick={handleRefresh}>
        <RefreshCw className="w-4 h-4" />
      </Button>
      <EngagementSelector />
    </>
  }
>
  <DashboardContent />
</AppShell>
```

### With Footer

```tsx
<AppShell
  title="Terminal"
  showFooter={true}
  sessionName="default-session"
  isConnected={true}
  oracleMessages={messages}
  onToggleContext={handleToggleContext}
  onToggleGovernance={handleToggleGovernance}
  contextVisible={contextPanelOpen}
  governanceVisible={govPanelOpen}
>
  <TerminalView />
</AppShell>
```

### With Custom Footer

```tsx
<AppShell
  title="Custom View"
  footer={
    <div className="h-16 border-t border-gray-800 flex items-center px-6">
      <CustomFooter />
    </div>
  }
  showFooter={true}
>
  <CustomContent />
</AppShell>
```

### With Custom Keyboard Shortcuts

```tsx
const customShortcuts: KeyboardShortcut[] = [
  {
    key: "r",
    description: "Run command",
    category: "actions",
    modifiers: ["ctrl"],
  },
  {
    key: "d",
    description: "Toggle debug panel",
    category: "mode",
  },
];

<AppShell
  title="Advanced View"
  customShortcuts={customShortcuts}
>
  <AdvancedContent />
</AppShell>
```

## Props Reference

### Page Identity
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Page title shown in header |
| `icon` | `React.ReactNode` | `undefined` | Icon shown before title |
| `badge` | `string` | `undefined` | Badge shown after title |

### Header Customization
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headerActions` | `React.ReactNode` | `undefined` | Actions shown in header right |
| `showEngagementSelector` | `boolean` | `false` | Show engagement mode selector (future) |

### Panel Configuration
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftPanel` | `React.ReactNode` | `undefined` | Content for left panel |
| `rightPanel` | `React.ReactNode` | `undefined` | Content for right panel |
| `showLeftPanel` | `boolean` | `true` | Control left panel visibility |
| `showRightPanel` | `boolean` | `true` | Control right panel visibility |
| `leftPanelWidth` | `number` | `280` | Left panel width in pixels |
| `rightPanelWidth` | `number` | `320` | Right panel width in pixels |
| `leftPanelTitle` | `string` | `undefined` | Left panel header title |
| `rightPanelTitle` | `string` | `undefined` | Right panel header title |

### Main Content
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Main content area |

### Footer Configuration
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `footer` | `React.ReactNode` | `undefined` | Custom footer content |
| `showFooter` | `boolean` | `false` | Show footer panel |
| `sessionName` | `string` | `undefined` | Session name for default footer |
| `isConnected` | `boolean` | `true` | Connection status for default footer |
| `oracleMessages` | `OracleMessage[]` | `[]` | Oracle feed messages |
| `onToggleContext` | `() => void` | `undefined` | Context panel toggle handler |
| `onToggleGovernance` | `() => void` | `undefined` | Governance panel toggle handler |
| `contextVisible` | `boolean` | `false` | Context panel visibility state |
| `governanceVisible` | `boolean` | `false` | Governance panel visibility state |

### Keyboard Shortcuts
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customShortcuts` | `KeyboardShortcut[]` | `[]` | Additional keyboard shortcuts |

### Styling
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `""` | Additional CSS classes |

## Keyboard Shortcuts

### Built-in Shortcuts
- `[` - Toggle left panel
- `]` - Toggle right panel
- `Alt+F` - Toggle footer
- `?` - Show keyboard shortcuts help
- `Escape` - Close modals (in help overlay)

### Custom Shortcuts
Pass custom shortcuts via `customShortcuts` prop. They will appear in the keyboard shortcuts help overlay.

```typescript
interface KeyboardShortcut {
  key: string;
  description: string;
  category: "navigation" | "actions" | "mode" | "terminal" | "general";
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
}
```

## Responsive Behavior

### Desktop (≥1280px)
- Header: 64px fixed
- Left Panel: 280px fixed (if visible)
- Main Content: Flexible width
- Right Panel: 320px fixed (if visible)
- Footer: 64-80px fixed (if visible)

### Tablet (768-1279px)
- Header: 64px fixed
- Left Panel: 240px fixed (if visible)
- Main Content: Flexible width
- Right Panel: 320px fixed (if visible)
- Footer: 64px (if visible)

### Mobile (<768px)
- Header: 64px fixed
- Panels: Overlay mode with backdrop
- Main Content: Full width
- Footer: 64px (if visible)

## Integration with Existing Components

### Panel Component
AppShell uses the existing `Panel` component from `/src/components/infinity-terminal/Panel.tsx`:
- Automatically switches between fixed/overlay modes
- Dispatches window resize events after animations
- Provides close button in overlay mode

### FooterPanel Component
Default footer uses `FooterPanel` from `/src/components/infinity-terminal/FooterPanel.tsx`:
- Status indicator with session name
- Oracle feed marquee
- Quick action buttons (context, governance)

### useResponsiveLayout Hook
Layout state managed by `/src/components/infinity-terminal/hooks/useResponsiveLayout.ts`:
- Breakpoint detection
- Panel visibility state
- Panel mode calculation
- Window resize handling

## Testing

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell", () => {
  it("renders title and content", () => {
    render(
      <AppShell title="Test Page">
        <div>Test Content</div>
      </AppShell>
    );

    expect(screen.getByText("Test Page")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("toggles left panel with keyboard shortcut", () => {
    render(
      <AppShell title="Test" leftPanel={<div>Left</div>}>
        <div>Content</div>
      </AppShell>
    );

    fireEvent.keyDown(window, { key: "[" });
    // Panel should toggle
  });

  it("shows keyboard help with ?", () => {
    render(<AppShell title="Test"><div>Content</div></AppShell>);

    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });
});
```

## Examples

### Dashboard Page
```tsx
<AppShell
  title="Dashboard"
  icon={<BarChart3 className="w-6 h-6" />}
  badge="Live"
  headerActions={<EngagementSelector />}
  leftPanel={<ProjectHealth />}
  leftPanelTitle="Project Health"
  rightPanel={<AgentActivity />}
  rightPanelTitle="Agent Activity"
  showFooter={true}
  sessionName="dashboard-session"
  isConnected={wsConnected}
  oracleMessages={oracleFeed}
>
  <DashboardMetrics />
</AppShell>
```

### Terminal Page
```tsx
<AppShell
  title="Infinity Terminal"
  icon={<Infinity className="w-6 h-6" />}
  leftPanel={<SessionHistory />}
  leftPanelTitle="Sessions"
  rightPanel={<ContextWindow />}
  rightPanelTitle="Context"
  showFooter={true}
  sessionName={currentSession}
  isConnected={terminalConnected}
  oracleMessages={oracleFeed}
  onToggleContext={handleToggleContext}
  onToggleGovernance={handleToggleGovernance}
  contextVisible={contextOpen}
  governanceVisible={govOpen}
>
  <TerminalComponent />
</AppShell>
```

### Command Center
```tsx
<AppShell
  title="Command Center"
  icon={<Zap className="w-6 h-6" />}
  headerActions={
    <Button onClick={executeCommand}>
      <Play className="w-4 h-4 mr-2" />
      Execute
    </Button>
  }
  leftPanel={<CommandHistory />}
  rightPanel={<ExecutionStatus />}
  showLeftPanel={true}
  showRightPanel={true}
>
  <CommandBuilder />
</AppShell>
```

## Future Enhancements

- [ ] Add context/state management for panel visibility (LayoutContext)
- [ ] Add AppHeader component for richer header customization
- [ ] Add engagement mode selector integration
- [ ] Add breadcrumb navigation support
- [ ] Add custom header slot support
- [ ] Add panel resize handles for desktop
- [ ] Add panel persistence (localStorage)
- [ ] Add animation customization props

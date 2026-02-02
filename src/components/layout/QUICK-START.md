# AppShell Quick Start Guide

**5-minute guide to get started with AppShell.**

## Basic Usage

### 1. Import
```tsx
import { AppShell } from "@/components/layout";
```

### 2. Minimal Setup
```tsx
<AppShell title="My Page">
  <YourContent />
</AppShell>
```

That's it! You have a responsive page with header and content area.

## Common Patterns

### With Icon and Badge
```tsx
import { Terminal } from "lucide-react";

<AppShell
  title="Terminal"
  icon={<Terminal className="w-6 h-6" />}
  badge="Live"
>
  <TerminalView />
</AppShell>
```

### With Header Actions
```tsx
<AppShell
  title="Dashboard"
  headerActions={
    <button className="px-4 py-2 bg-purple-500 rounded">
      Refresh
    </button>
  }
>
  <DashboardContent />
</AppShell>
```

### With Left Panel
```tsx
<AppShell
  title="Command Center"
  leftPanel={<CommandHistory />}
  leftPanelTitle="History"
>
  <CommandBuilder />
</AppShell>
```

### With Both Panels
```tsx
<AppShell
  title="Full Layout"
  leftPanel={<LeftSidebar />}
  leftPanelTitle="Navigation"
  rightPanel={<RightPanel />}
  rightPanelTitle="Details"
>
  <MainContent />
</AppShell>
```

### With Footer
```tsx
<AppShell
  title="Terminal"
  showFooter={true}
  sessionName="my-session"
  isConnected={true}
>
  <TerminalView />
</AppShell>
```

### Full Featured
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
  isConnected={wsConnected}
  oracleMessages={messages}
>
  <DashboardMetrics />
</AppShell>
```

## Props Cheat Sheet

### Essential Props
| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Page title (required) |
| `children` | `ReactNode` | Main content (required) |
| `icon` | `ReactNode` | Icon before title |
| `badge` | `string` | Badge after title |

### Panel Props
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `leftPanel` | `ReactNode` | - | Left panel content |
| `leftPanelTitle` | `string` | - | Left panel header |
| `showLeftPanel` | `boolean` | `true` | Show/hide left |
| `leftPanelWidth` | `number` | `280` | Width in pixels |
| `rightPanel` | `ReactNode` | - | Right panel content |
| `rightPanelTitle` | `string` | - | Right panel header |
| `showRightPanel` | `boolean` | `true` | Show/hide right |
| `rightPanelWidth` | `number` | `320` | Width in pixels |

### Footer Props
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `showFooter` | `boolean` | `false` | Show footer |
| `sessionName` | `string` | - | Session name |
| `isConnected` | `boolean` | `true` | Connection status |
| `oracleMessages` | `OracleMessage[]` | `[]` | Feed messages |

## Keyboard Shortcuts

Press `?` to see all shortcuts. Built-in shortcuts:

- `[` - Toggle left panel
- `]` - Toggle right panel
- `Alt+F` - Toggle footer

## Responsive Behavior

### Desktop (≥1280px)
- Full 3-column layout
- Fixed panels slide in/out

### Tablet (768-1279px)
- 2-column layout
- Narrower panels

### Mobile (<768px)
- Single column
- Panels become overlays with backdrop

**No configuration needed - fully automatic!**

## Examples

See `/src/examples/AppShellExample.tsx` for interactive demos.

## Tips

### 1. Panel Content Should Handle Overflow
```tsx
<AppShell
  leftPanel={
    <div className="p-4 h-full overflow-auto">
      <YourScrollableContent />
    </div>
  }
>
```

### 2. Use Memoization for Heavy Panels
```tsx
const leftPanel = useMemo(
  () => <HeavyComponent />,
  [dependencies]
);

<AppShell leftPanel={leftPanel} />
```

### 3. Control Panel Visibility
```tsx
const [showLeft, setShowLeft] = useState(true);

<AppShell
  leftPanel={<Panel />}
  showLeftPanel={showLeft}
>
```

### 4. Custom Footer
```tsx
<AppShell
  showFooter={true}
  footer={
    <div className="h-16 border-t border-gray-800 px-6">
      <CustomFooter />
    </div>
  }
>
```

## Common Issues

### Panel Content Not Scrolling
**Problem:** Content overflows without scrolling.

**Solution:** Add overflow handling to panel content:
```tsx
<div className="h-full overflow-auto p-4">
  {content}
</div>
```

### Keyboard Shortcuts Not Working
**Problem:** Shortcuts fire when typing in inputs.

**Solution:** This is prevented automatically! Shortcuts don't fire in input/textarea/select elements.

### Panels Not Showing on Mobile
**Problem:** Expecting fixed panels on mobile.

**Solution:** Mobile uses overlay mode by default. Panels appear as drawers over content.

## Next Steps

1. Read [AppShell.README.md](./AppShell.README.md) for detailed docs
2. Review [AppShell-Architecture.md](../../docs/components/AppShell-Architecture.md) for deep dive
3. Check [AppShellExample.tsx](../../examples/AppShellExample.tsx) for live examples
4. Explore the test file for edge case handling

## Need Help?

- Check the comprehensive README: `./AppShell.README.md`
- Review architecture docs: `../../docs/components/AppShell-Architecture.md`
- Look at examples: `../../examples/AppShellExample.tsx`
- Check tests: `./AppShell.test.tsx`

---

**You're ready to build! Start with a basic setup and add features as needed.**

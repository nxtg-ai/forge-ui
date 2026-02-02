# AppHeader Quick Reference

## Import

```tsx
import { AppHeader } from './components/layout';
// or
import { AppHeader } from './components/layout/AppHeader';
```

## Common Patterns

### 1. Full-Featured Header (App.tsx)

```tsx
<AppHeader
  currentView={currentView}
  onNavigate={setCurrentView}
  showNavigation
  showProjectSwitcher
  showConnectionStatus
  isConnected={forge.isConnected}
  currentRunspace={activeRunspace}
  runspaces={runspaces}
  onRunspaceSwitch={handleRunspaceSwitch}
  onNewProject={handleNewProject}
  onManageProjects={handleManageProjects}
/>
```

### 2. Dashboard with Panels

```tsx
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
  actions={<YourCustomButtons />}
/>
```

### 3. Minimal (Terminal/Focused)

```tsx
<AppHeader
  title="Infinity Terminal"
  currentView="infinity-terminal"
  showNavigation={false}
  showConnectionStatus
  actions={
    <button onClick={handleNewSession}>New Session</button>
  }
/>
```

## Props Quick Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string?` | - | Page title (optional override) |
| `icon` | `ReactNode?` | - | Page icon |
| `badge` | `string?` | - | Badge text (e.g., "Live") |
| `currentView` | `string?` | - | Active view ID |
| `onNavigate` | `(id: string) => void` | - | Navigation handler |
| `actions` | `ReactNode?` | - | Custom action buttons |
| `showEngagementSelector` | `boolean` | `false` | Show engagement mode dropdown |
| `showPanelToggles` | `boolean` | `false` | Show panel toggle buttons |
| `showConnectionStatus` | `boolean` | `false` | Show WebSocket status |
| `showNavigation` | `boolean` | `true` | Show navigation tabs |
| `showProjectSwitcher` | `boolean` | `true` | Show project dropdown |
| `isConnected` | `boolean` | `true` | Connection state |

## Features Toggle Matrix

| Use Case | Navigation | ProjectSwitcher | Engagement | Panels | Connection |
|----------|-----------|----------------|------------|--------|-----------|
| App Root | ✅ | ✅ | ❌ | ❌ | ✅ |
| Dashboard | ✅ | ❌ | ✅ | ✅ | ✅ |
| Terminal | ❌ | ❌ | ❌ | ❌ | ✅ |
| Vision | ✅ | ❌ | ✅ | ❌ | ❌ |
| Architect | ✅ | ❌ | ✅ | ✅ | ✅ |

## Mobile Behavior

- **Desktop (≥768px):** Full navigation, all features visible
- **Mobile (<768px):** Hamburger menu → slide-out drawer
- **Drawer includes:** Navigation, project switcher, engagement selector

## Keyboard Shortcuts

- `Tab` - Navigate elements
- `Enter/Space` - Activate
- `Arrow Keys` - Navigate dropdowns
- `Escape` - Close dropdowns
- `Cmd+K` - Shortcuts (hint shown)

## Test IDs

```typescript
// Main
"app-header"
"mobile-menu-button"

// Navigation
"app-nav-btn-dashboard"
"app-nav-btn-vision-display"
"app-nav-btn-infinity-terminal"
"app-nav-btn-command"
"app-nav-btn-architect"
"app-nav-btn-architect-demo"
"app-nav-btn-yolo"

// Mobile
"mobile-nav-dashboard"
// ... etc

// Engagement
"engagement-mode-button"
"engagement-mode-dropdown"
"engagement-mode-ceo"
"engagement-mode-vp"
"engagement-mode-engineer"
"engagement-mode-builder"
"engagement-mode-founder"

// Panels
"toggle-context-panel"
"toggle-governance-panel"

// Status
"app-connection-status"
```

## Common Issues

### Issue: "useEngagement must be used within EngagementProvider"
**Solution:** Wrap your app with `<EngagementProvider>`

```tsx
<EngagementProvider>
  <AppHeader {...props} />
  {/* rest of app */}
</EngagementProvider>
```

### Issue: Navigation not working
**Solution:** Ensure `onNavigate` handler is passed and updates state

```tsx
const [currentView, setCurrentView] = useState('dashboard');

<AppHeader
  currentView={currentView}
  onNavigate={setCurrentView}  // Required!
  showNavigation
/>
```

### Issue: Project switcher missing props
**Solution:** All project-related props must be provided together

```tsx
<AppHeader
  showProjectSwitcher
  currentRunspace={activeRunspace}    // Required
  runspaces={runspaces}               // Required
  onRunspaceSwitch={handleSwitch}     // Required
  onNewProject={handleNew}            // Required
  onManageProjects={handleManage}     // Required
/>
```

## Migration Steps

1. **Remove old header from App.tsx** (lines 619-670)
2. **Add AppHeader to App.tsx:**
   ```tsx
   <AppHeader
     currentView={currentView}
     onNavigate={setCurrentView}
     showNavigation
     showProjectSwitcher
     showConnectionStatus
     {...runspaceProps}
   />
   ```
3. **Remove page-specific headers:**
   - `src/pages/dashboard-live.tsx` (line 595)
   - `src/pages/infinity-terminal-view.tsx` (line 137)
   - Other pages as needed
4. **Remove AppHeaderStatus component** (integrated into AppHeader)
5. **Test all routes work**
6. **Test mobile drawer**
7. **Test keyboard navigation**

## Example: Complete App.tsx

```tsx
import { AppHeader } from './components/layout';
import { EngagementProvider } from './contexts/EngagementContext';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const forge = useForgeIntegration();

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <AppHeader
          currentView={currentView}
          onNavigate={setCurrentView}
          isConnected={forge.isConnected}
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
          {currentView === 'dashboard' && <DashboardLive />}
          {currentView === 'infinity-terminal' && <InfinityTerminalView />}
          {/* ... other views */}
        </main>
      </div>
    </EngagementProvider>
  );
}
```

---

**See also:** `/docs/components/AppHeader.md` for full documentation

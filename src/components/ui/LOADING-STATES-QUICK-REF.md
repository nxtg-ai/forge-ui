# LoadingStates Quick Reference

> Fast reference for using loading state components in NXTG-Forge

## Import

```tsx
import {
  ContextPanelLoading,
  GovernancePanelLoading,
  DashboardOverviewLoading,
  AgentCardLoading,
  ActivityFeedLoading,
  withLoadingState,
} from '@/components/ui/LoadingStates';
```

## Quick Usage

### Context Panel
```tsx
{isLoading ? (
  <ContextPanelLoading className="h-screen" />
) : (
  <ContextWindowHUD className="h-screen" />
)}
```

### Governance Panel
```tsx
{isLoading ? (
  <GovernancePanelLoading className="h-full" />
) : (
  <GovernanceHUD className="h-full" />
)}
```

### Main Dashboard
```tsx
{isLoading ? (
  <DashboardOverviewLoading />
) : (
  <ChiefOfStaffDashboard {...props} />
)}
```

### Agent Card
```tsx
{isLoading ? (
  <AgentCardLoading />
) : (
  <AgentCard agent={agent} />
)}
```

### Activity Feed
```tsx
{isLoading ? (
  <ActivityFeedLoading itemCount={5} />
) : (
  <ActivityFeed items={activities} />
)}
```

## HOC Pattern (Recommended)

```tsx
// Wrap component once
const DashboardWithLoading = withLoadingState(
  ChiefOfStaffDashboard,
  DashboardOverviewLoading
);

// Use everywhere
<DashboardWithLoading
  isLoading={loading}
  {...dashboardProps}
/>
```

## Props

All components accept:
- `className?: string` - Tailwind classes

ActivityFeedLoading also accepts:
- `itemCount?: number` - Number of skeleton items (default: 5)

## Common Patterns

### 3-Panel Layout
```tsx
<div className="grid grid-cols-12 gap-4 h-screen">
  {/* Left: Context */}
  <div className="col-span-3">
    {contextLoading ? <ContextPanelLoading className="h-full" /> : <ContextWindowHUD />}
  </div>

  {/* Center: Dashboard */}
  <div className="col-span-6">
    {dashLoading ? <DashboardOverviewLoading /> : <Dashboard />}
  </div>

  {/* Right: Governance */}
  <div className="col-span-3">
    {govLoading ? <GovernancePanelLoading className="h-full" /> : <GovernanceHUD />}
  </div>
</div>
```

### Staggered Loading
```tsx
useEffect(() => {
  setTimeout(() => setLoaded(prev => ({ ...prev, context: true })), 1000);
  setTimeout(() => setLoaded(prev => ({ ...prev, dashboard: true })), 2000);
  setTimeout(() => setLoaded(prev => ({ ...prev, governance: true })), 3000);
}, []);
```

## Tips

1. **Always match className** between loading and loaded states
2. **Use HOC** for cleaner component code
3. **Test loading states** not just loaded states
4. **Stagger on large dashboards** for better perceived performance

## Test IDs

```tsx
data-testid="context-panel-loading"
data-testid="governance-panel-loading"
data-testid="dashboard-overview-loading"
data-testid="agent-card-loading"
data-testid="activity-feed-loading"
```

## Full Docs

See `LoadingStates.README.md` for complete documentation.

# LoadingStates Component Documentation

Dashboard loading state components with skeleton loaders that perfectly match actual component layouts.

## Overview

The LoadingStates module provides skeleton loading components for all major dashboard panels. Each loading state is designed to match the exact layout of its corresponding component, creating a smooth, professional loading experience.

## Components

### ContextPanelLoading

Skeleton loader for the Memory & Context panel (`ContextWindowHUD`).

**Layout includes:**
- Header with icon and title
- Token usage bar with percentage
- Memory items with category badges
- Files heat map
- Footer statistics (3 columns)

```tsx
import { ContextPanelLoading } from './LoadingStates';

<ContextPanelLoading className="h-screen" />
```

### GovernancePanelLoading

Skeleton loader for the Governance HUD panel.

**Layout includes:**
- Header with "Live" indicator
- Strategic Advisor card
- Constitution card with principles
- Worker Pool metrics grid
- Impact Matrix
- Agent Activity Feed
- Oracle Feed

```tsx
import { GovernancePanelLoading } from './LoadingStates';

<GovernancePanelLoading className="h-full" />
```

### DashboardOverviewLoading

Skeleton loader for the main Chief of Staff Dashboard.

**Layout includes:**
- Header bar with logo and YOLO mode toggle
- Vision reminder card
- Project progress section with phase indicator
- Active agents list
- Health score and blockers
- Activity stream

```tsx
import { DashboardOverviewLoading } from './LoadingStates';

<DashboardOverviewLoading />
```

### AgentCardLoading

Skeleton loader for individual agent cards.

**Layout includes:**
- Status indicator dot
- Agent name and current task
- Confidence percentage
- Chevron icon

```tsx
import { AgentCardLoading } from './LoadingStates';

<AgentCardLoading />
```

### ActivityFeedLoading

Skeleton loader for activity feed items.

**Props:**
- `itemCount?: number` - Number of skeleton items to show (default: 5)

```tsx
import { ActivityFeedLoading } from './LoadingStates';

<ActivityFeedLoading itemCount={3} />
```

## Higher-Order Component: withLoadingState

A HOC that wraps any component with loading state handling.

**Signature:**
```tsx
function withLoadingState<P>(
  Component: ComponentType<P>,
  LoadingComponent: ComponentType<Pick<P, "className">>
): ComponentType<P & { isLoading?: boolean }>
```

**Usage:**
```tsx
import { withLoadingState, GovernancePanelLoading } from './LoadingStates';
import { GovernanceHUD } from '../governance/GovernanceHUD';

const GovernanceHUDWithLoading = withLoadingState(
  GovernanceHUD,
  GovernancePanelLoading
);

// Later in your component:
<GovernanceHUDWithLoading
  isLoading={isLoading}
  className="h-full"
/>
```

## Usage Patterns

### Pattern 1: Direct Conditional Rendering

```tsx
{isLoading ? (
  <ContextPanelLoading className="h-full" />
) : (
  <ContextWindowHUD className="h-full" />
)}
```

### Pattern 2: HOC Pattern (Recommended)

```tsx
const DashboardWithLoading = withLoadingState(
  ChiefOfStaffDashboard,
  DashboardOverviewLoading
);

<DashboardWithLoading
  isLoading={isLoadingData}
  visionData={data.vision}
  projectState={data.state}
  {...otherProps}
/>
```

### Pattern 3: Custom Wrapper

```tsx
const LoadablePanel: React.FC<{
  isLoading: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ isLoading, error, children }) => {
  if (error) return <ErrorState message={error} />;
  if (isLoading) return <ContextPanelLoading />;
  return <>{children}</>;
};
```

### Pattern 4: Staggered Loading

```tsx
const [loadingStages, setLoadingStages] = useState({
  context: true,
  governance: true,
  dashboard: true,
});

useEffect(() => {
  setTimeout(() => setLoadingStages(s => ({ ...s, context: false })), 1000);
  setTimeout(() => setLoadingStages(s => ({ ...s, dashboard: false })), 2000);
  setTimeout(() => setLoadingStages(s => ({ ...s, governance: false })), 3000);
}, []);

<div className="grid grid-cols-12 gap-4">
  <div className="col-span-3">
    {loadingStages.context ? <ContextPanelLoading /> : <ContextWindowHUD />}
  </div>
  <div className="col-span-6">
    {loadingStages.dashboard ? <DashboardOverviewLoading /> : <Dashboard />}
  </div>
  <div className="col-span-3">
    {loadingStages.governance ? <GovernancePanelLoading /> : <GovernanceHUD />}
  </div>
</div>
```

## Design Principles

### 1. Perfect Layout Matching
Each loading state skeleton precisely matches its target component's layout structure, ensuring no jarring layout shifts when loading completes.

### 2. Consistent Animation
All skeletons use the same `animate-pulse` animation from Tailwind for a cohesive experience.

### 3. Dark Theme First
Loading states are designed for dark theme with proper contrast ratios:
- Background: `bg-gray-800/50`
- Borders: `border-gray-700`
- Pulse: Built-in Tailwind animation

### 4. Contextual Detail Level
Loading states show appropriate levels of detail:
- **High detail**: Main panels (Governance, Context) show full structure
- **Medium detail**: Card components show key sections
- **Low detail**: List items show minimal structure

### 5. Performance
All skeletons are lightweight with minimal DOM nodes and no JavaScript animations (pure CSS).

## Customization

All components accept a `className` prop for custom styling:

```tsx
<ContextPanelLoading className="h-screen max-w-md shadow-2xl" />
```

Tailwind utility classes work seamlessly:
- Height: `h-96`, `h-screen`, `h-full`
- Width: `w-full`, `max-w-sm`
- Layout: `flex-1`, `col-span-3`
- Spacing: `m-4`, `p-6`

## Integration with Existing Components

### GovernanceHUD Integration

```tsx
import { GovernanceHUD } from './components/governance/GovernanceHUD';
import { GovernancePanelLoading } from './components/ui/LoadingStates';

const GovernancePanel: React.FC = () => {
  const { data, isLoading, error } = useGovernanceState();

  if (error) return <ErrorState error={error} />;
  if (isLoading) return <GovernancePanelLoading className="h-full" />;

  return <GovernanceHUD className="h-full" />;
};
```

### ContextWindowHUD Integration

```tsx
import { ContextWindowHUD } from './components/terminal/ContextWindowHUD';
import { ContextPanelLoading } from './components/ui/LoadingStates';

const ContextPanel: React.FC = () => {
  const { isReady } = useContextData();

  return isReady ? (
    <ContextWindowHUD className="h-full" />
  ) : (
    <ContextPanelLoading className="h-full" />
  );
};
```

### ChiefOfStaffDashboard Integration

```tsx
import { ChiefOfStaffDashboard } from './components/ChiefOfStaffDashboard';
import { DashboardOverviewLoading } from './components/ui/LoadingStates';

const Dashboard: React.FC = () => {
  const { data, isLoading } = useDashboardData();

  if (isLoading) return <DashboardOverviewLoading />;

  return (
    <ChiefOfStaffDashboard
      visionData={data.vision}
      projectState={data.state}
      agentActivity={data.activity}
      onModeChange={handleModeChange}
      currentMode={mode}
    />
  );
};
```

## Testing

All loading states include `data-testid` attributes for testing:

```tsx
// In your tests:
const { getByTestId } = render(<ContextPanelLoading />);
expect(getByTestId('context-panel-loading')).toBeInTheDocument();
```

Available test IDs:
- `context-panel-loading`
- `governance-panel-loading`
- `dashboard-overview-loading`
- `agent-card-loading`
- `activity-feed-loading`

## Accessibility

Loading states follow accessibility best practices:

1. **Semantic HTML**: Uses proper div structure with ARIA when needed
2. **Visual feedback**: Pulse animation provides clear loading indication
3. **No motion sickness**: Gentle, slow pulse animation
4. **Color contrast**: Meets WCAG AA standards for dark theme

## Performance Considerations

### Bundle Size
- All skeletons share the base `Skeleton` component
- No heavy dependencies (uses existing Skeleton system)
- Pure CSS animations (no JavaScript)

### Rendering Cost
- Minimal re-renders (static content)
- Efficient DOM structure
- No complex calculations or state

### Memory Usage
- Lightweight components
- No data fetching or caching
- Clean unmount (no memory leaks)

## Migration Guide

### From Custom Loading Spinners

**Before:**
```tsx
{isLoading ? (
  <div className="flex items-center justify-center h-full">
    <Spinner />
  </div>
) : (
  <GovernanceHUD />
)}
```

**After:**
```tsx
{isLoading ? (
  <GovernancePanelLoading className="h-full" />
) : (
  <GovernanceHUD className="h-full" />
)}
```

### From Generic Skeleton Components

**Before:**
```tsx
{isLoading ? (
  <SkeletonCard />
) : (
  <ContextWindowHUD />
)}
```

**After:**
```tsx
{isLoading ? (
  <ContextPanelLoading className="h-full" />
) : (
  <ContextWindowHUD className="h-full" />
)}
```

## Best Practices

1. **Match container heights**: Ensure loading state has same height as loaded component
2. **Use HOC for complex logic**: Prefer `withLoadingState` over manual conditional rendering
3. **Stagger for large dashboards**: Load panels progressively for better UX
4. **Preserve layout**: Always use same `className` for loading and loaded states
5. **Test loading states**: Don't just test loaded states, verify loading UX too

## Common Pitfalls

### ❌ Height mismatch causing layout shift
```tsx
// BAD: Loading state and component have different heights
{isLoading ? <ContextPanelLoading /> : <ContextWindowHUD className="h-screen" />}
```

### ✅ Consistent height
```tsx
// GOOD: Both use same className
{isLoading ? (
  <ContextPanelLoading className="h-screen" />
) : (
  <ContextWindowHUD className="h-screen" />
)}
```

### ❌ Generic skeleton for specific component
```tsx
// BAD: Generic skeleton doesn't match layout
{isLoading ? <SkeletonCard /> : <GovernanceHUD />}
```

### ✅ Purpose-built loading state
```tsx
// GOOD: Loading state matches component structure
{isLoading ? <GovernancePanelLoading /> : <GovernanceHUD />}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Animated transitions**: Smooth fade between loading and loaded states
2. **Progressive loading**: Show partial data while loading rest
3. **Customizable animations**: Support for different pulse speeds
4. **Smart placeholders**: Show cached data with loading overlay
5. **Loading analytics**: Track loading times per component

## Related Components

- **Skeleton**: Base skeleton component system
- **Spinner**: Fallback spinner for small UI elements
- **ProgressBar**: Determinate progress indicator

## Support

For questions or issues with loading states:
1. Check examples in `LoadingStates.example.tsx`
2. Review actual component layouts for reference
3. Test with Storybook (if available)
4. Consult design system documentation

---

**Last Updated:** 2026-01-31
**Version:** 1.0.0
**Maintainer:** NXTG-Forge Team

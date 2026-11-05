# Engagement Context

## Overview

The `EngagementContext` provides centralized engagement mode and automation level management across the NXTG-Forge application, eliminating prop drilling and ensuring consistent state across all components.

## Location

```
src/contexts/EngagementContext.tsx
```

## Features

- **Centralized State Management**: Single source of truth for engagement mode and automation level
- **localStorage Persistence**: Mode and automation level are saved and restored across sessions
- **WebSocket Synchronization**: Changes are automatically synced to backend via WebSocket
- **Computed Helpers**: Convenient computed values for visibility checks
- **Type-Safe**: Full TypeScript support with proper typing

## Engagement Modes

The system supports 5 engagement modes with hierarchical visibility:

| Mode | Level | Description | Visibility |
|------|-------|-------------|-----------|
| CEO | 1 | Minimal details, executive summary only | Least details |
| VP | 2 | High-level technical overview | Limited details |
| Engineer | 3 | Standard technical details | Normal details |
| Builder | 4 | Implementation details | More details |
| Founder | 5 | Full access to all information | Everything |

## Automation Levels

| Level | Description |
|-------|-------------|
| Conservative | Minimal automation, asks permission frequently |
| Balanced | Moderate automation with checkpoints |
| Aggressive | High automation, only asks for critical decisions |

## Usage

### Basic Setup

Wrap your app with the `EngagementProvider`:

```tsx
import { EngagementProvider } from './contexts/EngagementContext';

function App() {
  return (
    <EngagementProvider>
      <YourApp />
    </EngagementProvider>
  );
}
```

### Using the Hook

```tsx
import { useEngagement } from './contexts/EngagementContext';

function MyComponent() {
  const {
    mode,
    setMode,
    automationLevel,
    setAutomationLevel,
    visibilityLevels,
    isMinimalMode,
    isFullAccessMode,
    canSee
  } = useEngagement();

  // Change engagement mode
  const handleModeChange = () => {
    setMode('founder');
  };

  // Check if user can see engineer-level content
  if (canSee('engineer')) {
    return <TechnicalDetails />;
  }

  // Show minimal view for CEO mode
  if (isMinimalMode) {
    return <ExecutiveSummary />;
  }

  return <StandardView />;
}
```

### WebSocket Synchronization

When you provide an `onModeChange` callback to the provider, it will be called whenever mode or automation level changes:

```tsx
<EngagementProvider
  onModeChange={(mode, automation) => {
    // Sync to backend
    apiClient.sendWSMessage('state.update', {
      engagementMode: mode,
      automationLevel: automation,
    });
  }}
>
  <App />
</EngagementProvider>
```

### Visibility Filtering

Use the `visibilityLevels` array to filter content based on current mode:

```tsx
const { visibilityLevels, canSee } = useEngagement();

// Get all activities visible to current mode
const visibleActivities = activities.filter(
  activity => visibilityLevels.includes(activity.requiredMode)
);

// Or check individual permissions
{canSee('engineer') && <EngineerOnlyFeature />}
```

## API Reference

### EngagementProvider Props

```typescript
interface EngagementProviderProps {
  children: React.ReactNode;
  onModeChange?: (mode: EngagementMode, automationLevel: AutomationLevel) => void;
}
```

### useEngagement Hook

```typescript
interface EngagementContextValue {
  // Core state
  mode: EngagementMode;
  setMode: (mode: EngagementMode) => void;
  automationLevel: AutomationLevel;
  setAutomationLevel: (level: AutomationLevel) => void;

  // Computed helpers
  visibilityLevels: EngagementMode[];  // All modes current user can see
  isMinimalMode: boolean;              // true if mode === 'ceo'
  isFullAccessMode: boolean;           // true if mode === 'founder'
  canSee: (requiredMode: EngagementMode) => boolean;
}
```

## Integration Points

### App.tsx

- Wrapped in `EngagementProvider` at root level
- `AppHeaderStatus` component uses `useEngagement()` to display current mode
- Mode changes are synced to backend via `onModeChange` callback

### dashboard-live.tsx

- Wrapped in `EngagementProvider` at page level
- Uses `useEngagement()` to manage engagement mode state
- No more localStorage management in component

### Components Updated

1. **App.tsx**: Root provider integration
2. **dashboard-live.tsx**: Page-level usage
3. **ChiefOfStaffDashboard**: Receives mode via props (can be refactored to use context)
4. **YoloMode**: Wrapped in helper component to use context

## Benefits

### Before (Prop Drilling)

```tsx
<App engagementMode={mode} onModeChange={setMode}>
  <Dashboard engagementMode={mode} onModeChange={setMode}>
    <ChildComponent engagementMode={mode} onModeChange={setMode}>
      <GrandchildComponent engagementMode={mode} onModeChange={setMode} />
    </ChildComponent>
  </Dashboard>
</App>
```

### After (Context)

```tsx
<EngagementProvider>
  <App>
    <Dashboard>
      <ChildComponent>
        <GrandchildComponent />
      </ChildComponent>
    </Dashboard>
  </App>
</EngagementProvider>

// Any component can access the context
function GrandchildComponent() {
  const { mode, setMode } = useEngagement();
  // Use directly without props
}
```

## Migration Guide

### For Components Currently Using Props

1. **Remove prop drilling**:
   ```tsx
   // Before
   function Component({ engagementMode, onModeChange }) { ... }

   // After
   function Component() {
     const { mode, setMode } = useEngagement();
   }
   ```

2. **Update parent components**:
   - Remove `engagementMode` and `onModeChange` from props
   - Remove passing these props to children

3. **Update usage**:
   ```tsx
   // Before
   onModeChange('founder');

   // After
   setMode('founder');
   ```

## localStorage Keys

- `nxtg-forge-engagement-mode`: Current engagement mode
- `nxtg-forge-automation-level`: Current automation level

## WebSocket Messages

When mode changes, the following message is sent (if WebSocket is available):

```json
{
  "type": "engagement.mode.changed",
  "payload": {
    "mode": "founder",
    "timestamp": "2026-01-31T02:00:00.000Z"
  }
}
```

When automation level changes:

```json
{
  "type": "engagement.automation.changed",
  "payload": {
    "level": "aggressive",
    "timestamp": "2026-01-31T02:00:00.000Z"
  }
}
```

## Future Enhancements

1. **Per-Feature Overrides**: Allow specific features to override global engagement mode
2. **Time-Based Modes**: Automatically adjust engagement mode based on time of day
3. **Context Stacking**: Support multiple engagement contexts for different sections
4. **Audit Trail**: Log all mode changes for analytics
5. **Presets**: Predefined combinations of mode + automation level

## Testing

Example test using the context:

```tsx
import { render, screen } from '@testing-library/react';
import { EngagementProvider } from './contexts/EngagementContext';
import { MyComponent } from './MyComponent';

test('shows engineer content in engineer mode', () => {
  render(
    <EngagementProvider>
      <MyComponent />
    </EngagementProvider>
  );

  const { setMode } = useEngagement();
  setMode('engineer');

  expect(screen.getByText('Technical Details')).toBeInTheDocument();
});
```

## Troubleshooting

### "useEngagement must be used within an EngagementProvider"

Make sure your component is wrapped in an `EngagementProvider`:

```tsx
<EngagementProvider>
  <YourComponent />
</EngagementProvider>
```

### Mode not persisting across page reloads

Check that localStorage is available and not blocked by browser settings.

### WebSocket sync not working

Verify that:
1. WebSocket connection is established
2. Global `window.__forgeWS` is set
3. WebSocket is in OPEN state

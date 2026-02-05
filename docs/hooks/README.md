# Custom React Hooks - NXTG-Forge v3

Complete reference for custom hooks used throughout NXTG-Forge for state management, UI behavior, and terminal functionality.

---

## Available Hooks

### Session & Terminal Management

#### `useSessionPersistence(sessionId?: string)`

Manages persistent terminal sessions that survive browser refreshes and reconnections.

**Location:** `src/components/infinity-terminal/hooks/useSessionPersistence.ts`

**Purpose:**
- Restore session state after browser close/reopen
- Auto-reconnect with exponential backoff
- Track session lifecycle (connecting, connected, disconnected, error)

**Type Signature:**
```typescript
interface SessionState {
  sessionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  autoReconnecting: boolean;
  reconnectAttempts: number;
}

function useSessionPersistence(sessionId?: string): {
  state: SessionState | null;
  reconnect: () => void;
  disconnect: () => void;
  sessionStorage: SessionStorage;
}
```

**Usage Example:**
```typescript
export function Terminal() {
  const { state, reconnect, sessionStorage } = useSessionPersistence('session-123');

  if (!state) return <Loading />;

  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Session ID: {state.sessionId}</p>
      {state.status === 'disconnected' && (
        <button onClick={reconnect}>Reconnect</button>
      )}
      {state.autoReconnecting && (
        <p>Reconnecting... (Attempt {state.reconnectAttempts})</p>
      )}
    </div>
  );
}
```

**Features:**
- Session restoration from localStorage/sessionStorage
- Exponential backoff for reconnection (100ms → 30s max)
- Automatic cleanup on unmount
- Support for multiple concurrent sessions
- Real-time connection status updates

---

### Layout & Responsive Design

#### `useResponsiveLayout(breakpoint?: string)`

Manages responsive layout behavior across device sizes.

**Location:** `src/components/infinity-terminal/hooks/useResponsiveLayout.ts`

**Purpose:**
- Detect screen size changes
- Manage mobile/tablet/desktop layouts
- Control component visibility based on viewport

**Type Signature:**
```typescript
interface LayoutState {
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // > 1024px
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

function useResponsiveLayout(breakpoint?: 'sm' | 'md' | 'lg'): LayoutState
```

**Usage Example:**
```typescript
export function Dashboard() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  return (
    <div className={isMobile ? 'flex flex-col' : 'flex flex-row'}>
      {isDesktop && <Sidebar />}
      <main>{/* content */}</main>
      {isMobile && <MobileMenu />}
    </div>
  );
}
```

**Key Points:**
- Updates on window resize (debounced)
- Includes screen orientation detection
- Safe for SSR (checks `typeof window`)

---

### Touch & Gesture Handling

#### `useTouchGestures(ref: React.RefObject<HTMLElement>)`

Detects and handles touch gestures for mobile interactions.

**Location:** `src/components/infinity-terminal/hooks/useTouchGestures.ts`

**Purpose:**
- Swipe detection (left, right, up, down)
- Pinch zoom detection
- Touch event normalization

**Type Signature:**
```typescript
interface GestureEvent {
  type: 'swipe' | 'pinch' | 'tap' | 'longpress';
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  velocity?: number;
  scale?: number;
}

function useTouchGestures(
  ref: React.RefObject<HTMLElement>,
  options?: {
    onSwipe?: (direction: string, distance: number) => void;
    onPinch?: (scale: number) => void;
    onTap?: () => void;
    onLongPress?: () => void;
    minSwipeDistance?: number;
  }
): void
```

**Usage Example:**
```typescript
export function InfinityTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);

  useTouchGestures(terminalRef, {
    onSwipe: (direction, distance) => {
      if (direction === 'left') {
        // Swipe left - close sidebar
        setSidebarOpen(false);
      } else if (direction === 'right') {
        // Swipe right - open sidebar
        setSidebarOpen(true);
      }
    },
    onPinch: (scale) => {
      // Pinch zoom terminal
      setFontSize(fontSize * scale);
    },
    minSwipeDistance: 30,
  });

  return <div ref={terminalRef} className="terminal" />;
}
```

**Gestures Detected:**
- **Swipe:** Touch down → move → release (direction determined by greatest movement)
- **Pinch:** Two-finger touch → move apart/together
- **Tap:** Quick touch (< 200ms duration)
- **Long Press:** Touch held > 500ms

---

## Context Hooks

### `useEngagement()`

Access global engagement mode (CEO, VP, Engineer, Builder, Founder).

**Location:** `src/contexts/EngagementContext.tsx`

**Purpose:**
- Share engagement mode across app
- Filter UI visibility by mode
- Persist mode preference

**Type Signature:**
```typescript
interface EngagementMode {
  mode: 'ceo' | 'vp' | 'engineer' | 'builder' | 'founder';
  setMode: (mode: EngagementMode['mode']) => void;
}

function useEngagement(): EngagementMode
```

**Usage Example:**
```typescript
export function AdvancedMetrics() {
  const { mode } = useEngagement();

  // Only show to engineer+ modes
  if (!['engineer', 'builder', 'founder'].includes(mode)) {
    return null;
  }

  return <DetailedMetrics />;
}
```

**Modes Explained:**
- **CEO:** Health + Progress + Critical blockers only (minimal detail)
- **VP:** Strategic oversight + Recent decisions + Top 3 blockers (summary)
- **Engineer:** Full agent activity + Technical details (comprehensive)
- **Builder:** Implementation tasks + All details (everything)
- **Founder:** Everything visible, no filters (complete transparency)

---

### `useWebSocket(url: string, onMessage: (msg: any) => void)`

WebSocket connection management with auto-reconnect.

**Location:** `src/hooks/` (utility hook)

**Purpose:**
- Establish WebSocket connections
- Handle disconnection and reconnection
- Broadcast state updates to clients

**Type Signature:**
```typescript
interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  send: (message: any) => void;
  disconnect: () => void;
}

function useWebSocket(
  url: string,
  options?: {
    onMessage?: (msg: any) => void;
    onError?: (error: Error) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    autoReconnect?: boolean;
    maxRetries?: number;
  }
): WebSocketState
```

**Usage Example:**
```typescript
export function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const ws = useWebSocket('ws://localhost:5051/ws', {
    onMessage: (msg) => {
      if (msg.type === 'activity.update') {
        setActivities([...activities, msg.payload]);
      }
    },
    autoReconnect: true,
    maxRetries: 5,
  });

  return (
    <div>
      <p>Connected: {ws.connected ? '🟢' : '🔴'}</p>
      <div>
        {activities.map(a => (
          <ActivityItem key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}
```

---

## State Management Hooks

### `useState` (React Built-in)

NXTG-Forge uses React's built-in `useState` for local component state. No Redux or Zustand is needed.

**Pattern:**
```typescript
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

### `useEffect` (React Built-in)

Side effects (API calls, subscriptions, etc.).

**Pattern:**
```typescript
export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (mounted) {
          setUser(await response.json());
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      mounted = false; // Cleanup
    };
  }, [userId]); // Dependency array

  if (loading) return <Loading />;
  return <div>{user?.name}</div>;
}
```

---

## Performance Hooks

### `useMemo(fn, deps)`

Memoize expensive calculations.

**Use when:**
- Computing value is expensive (> 1ms)
- Value depends on props/state that change infrequently
- Component re-renders frequently but dependencies rarely change

```typescript
export function FilteredList({ items, filter }: Props) {
  // Only recalculate when items or filter change
  const filtered = useMemo(
    () => items.filter(item => item.includes(filter)),
    [items, filter]
  );

  return (
    <ul>
      {filtered.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

### `useCallback(fn, deps)`

Memoize functions passed to child components.

**Use when:**
- Passing callback to memoized child component
- Callback depends on props/state

```typescript
export function Parent() {
  const [count, setCount] = useState(0);

  // Only create new function when count changes
  const handleIncrement = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <Child onIncrement={handleIncrement} />;
}
```

---

## Error Handling Hooks

### `useErrorHandler()`

Handle errors in components gracefully.

**Location:** `src/components/ErrorBoundary.tsx` context

**Usage:**
```typescript
export function DataView() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {
    setError(error);
    // Can also send to error tracking service
  }, []);

  if (error) {
    return <ErrorFallback error={error} onReset={() => setError(null)} />;
  }

  return <DataContent onError={handleError} />;
}
```

---

## Creating Custom Hooks

### Guidelines

1. **Start with `use` prefix**
   ```typescript
   function useMyHook() { ... }  // ✅ Good
   function myHook() { ... }     // ❌ Bad
   ```

2. **Keep logic separate from rendering**
   ```typescript
   // Good: Hook logic isolated
   function useForm(initialValues) {
     const [values, setValues] = useState(initialValues);
     const handleChange = (e) => { ... };
     return { values, handleChange };
   }

   // Usage: Separated from component logic
   export function LoginForm() {
     const { values, handleChange } = useForm({ email: '', password: '' });
     return <form>...</form>;
   }
   ```

3. **Document dependencies**
   ```typescript
   // Include dependency array to prevent stale closures
   useEffect(() => {
     fetchData();
   }, [dependency1, dependency2]); // ✅ Explicit
   ```

### Example: Custom Hook

```typescript
/**
 * useLocalStorage - Persist state to localStorage
 *
 * @param key - Storage key
 * @param initialValue - Default value if not in storage
 * @returns [value, setValue]
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get value from storage or use initial
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Update storage when value changes
  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// Usage
export function Theme() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  );
}
```

---

## Hook Rules (React Documentation)

1. **Only call hooks at top level**
   ```typescript
   // ✅ Good
   function Component() {
     const [state, setState] = useState(0);
     return <div />;
   }

   // ❌ Bad - Hook inside conditional
   function Component() {
     if (condition) {
       const [state, setState] = useState(0);
     }
   }
   ```

2. **Only call hooks from React functions**
   - React function components
   - Custom hooks
   - NOT regular JavaScript functions

3. **ESLint Plugin**
   - Install: `npm install --save-dev eslint-plugin-react-hooks`
   - Enforces hook rules automatically

---

## Testing Hooks

Use `@testing-library/react` hooks testing utilities:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useSessionPersistence } from './useSessionPersistence';

test('restores session on reconnect', () => {
  const { result } = renderHook(() => useSessionPersistence('session-123'));

  expect(result.current.state?.status).toBe('connecting');

  act(() => {
    result.current.reconnect();
  });

  // Assert reconnection logic
});
```

---

## Hook Dependencies Checklist

When using hooks with dependencies:

- [ ] Dependency array is present
- [ ] All variables from outer scope are included
- [ ] No unnecessary variables in dependencies
- [ ] ESLint `react-hooks/exhaustive-deps` passes
- [ ] Performance is acceptable (not re-running excessively)

---

## Performance Tips

1. **Avoid creating objects/arrays in renders**
   ```typescript
   // ❌ Creates new object every render
   <ChildComponent style={{ color: 'red' }} />

   // ✅ Memoized object
   const style = useMemo(() => ({ color: 'red' }), []);
   <ChildComponent style={style} />
   ```

2. **Use lazy initialization for expensive state**
   ```typescript
   // ❌ Calls expensiveCompute() on every render
   const [state, setState] = useState(expensiveCompute());

   // ✅ Lazy initializer - only called once
   const [state, setState] = useState(() => expensiveCompute());
   ```

3. **Cleanup subscriptions in useEffect**
   ```typescript
   useEffect(() => {
     const unsubscribe = subscribe(listener);
     return () => unsubscribe(); // Cleanup
   }, []);
   ```

---

## Debugging Hooks

### React DevTools

1. Install React DevTools browser extension
2. Open DevTools → Components tab
3. Select component to see:
   - Current hook values
   - Hook state changes
   - Which renders triggered

### Console Logging

```typescript
function useMyHook() {
  const [state, setState] = useState(0);

  useEffect(() => {
    console.log('Hook mounted, state:', state);
    return () => console.log('Hook cleanup, final state:', state);
  }, [state]);

  return [state, setState];
}
```

---

## Resources

- **[React Hooks Documentation](https://react.dev/reference/react)**
- **[Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)**
- **[Hooks Rules of Thumb](https://react.dev/reference/rules/rules-of-hooks)**
- **[Testing Library Hooks](https://testing-library.com/docs/react-testing-library/intro)**

---

**Last Updated:** 2026-02-05
**Maintained By:** Forge Docs Agent

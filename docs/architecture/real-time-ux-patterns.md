# Real-Time UI/UX Patterns Specification
## NXTG-Forge Live Integration Design System

### Design Philosophy
Every interaction must feel instant, every update must feel alive, every error must feel helpful.
No loading spinner should spin without purpose. No skeleton should shimmer without meaning.
This is not just about showing data - it's about creating a living, breathing interface.

---

## 1. Loading States & Skeleton Screens

### 1.1 Progressive Loading Strategy

```typescript
// Three-phase loading approach
enum LoadingPhase {
  SKELETON = 'skeleton',    // 0-300ms: Show structure
  CONTENT = 'content',       // 300ms-1s: Show partial data
  COMPLETE = 'complete'      // 1s+: Full interactive state
}
```

### 1.2 Skeleton Screen Patterns

```tsx
// ChiefOfStaffDashboard Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-950">
    {/* Header skeleton */}
    <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-800 animate-pulse" />
            <div className="space-y-2">
              <div className="w-32 h-5 bg-gray-800 rounded animate-pulse" />
              <div className="w-24 h-3 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-20 h-8 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Content skeleton with staggered animation */}
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800"
      >
        <div className="w-48 h-6 bg-gray-800 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="w-full h-4 bg-gray-800 rounded animate-pulse" />
          <div className="w-3/4 h-4 bg-gray-800 rounded animate-pulse" />
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl bg-gray-900/30 border border-gray-800"
          >
            <div className="w-32 h-5 bg-gray-800 rounded animate-pulse mb-4" />
            <div className="w-20 h-8 bg-gray-800 rounded animate-pulse" />
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

// Shimmer effect for premium feel
const shimmerKeyframes = {
  '0%': { transform: 'translateX(-100%)' },
  '100%': { transform: 'translateX(100%)' }
};

// Apply to skeleton elements
<div className="relative overflow-hidden">
  <div className="w-full h-4 bg-gray-800 rounded" />
  <div
    className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/50 to-transparent"
    style={{
      animation: 'shimmer 2s infinite',
      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
    }}
  />
</div>
```

### 1.3 Smart Content Replacement

```tsx
// Smooth skeleton-to-content transition
const ContentLoader: React.FC<{ isLoading: boolean; children: React.ReactNode }> = ({
  isLoading,
  children
}) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ContentSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1] // Spring easing
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 1.4 Optimistic Updates

```tsx
// Immediate UI response with rollback capability
const useOptimisticUpdate = <T,>(
  initialValue: T,
  updateFn: (value: T) => Promise<T>
) => {
  const [value, setValue] = useState(initialValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousValue = useRef(initialValue);

  const update = async (newValue: T) => {
    previousValue.current = value;
    setValue(newValue); // Immediate UI update
    setIsUpdating(true);

    try {
      const result = await updateFn(newValue);
      setValue(result); // Sync with server response
    } catch (error) {
      // Rollback on failure
      setValue(previousValue.current);
      toast.error('Update failed. Rolling back...', {
        icon: <RotateCcw className="w-4 h-4" />
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return { value, update, isUpdating };
};
```

---

## 2. Live Update Animations

### 2.1 Agent Activity Stream

```tsx
// Staggered entrance with spring physics
const ActivityItem: React.FC<{ activity: Activity; index: number }> = ({
  activity,
  index
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.05, // Stagger
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] // Custom spring
      }}
      className="relative"
    >
      {/* Glow effect for new items */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent rounded-lg pointer-events-none"
      />

      <div className="flex items-start gap-3 p-3 rounded-lg">
        {/* Content */}
      </div>
    </motion.div>
  );
};
```

### 2.2 Agent State Transitions

```tsx
// Smooth state changes with visual feedback
const AgentStateIndicator: React.FC<{ state: AgentState }> = ({ state }) => {
  const stateConfig = {
    idle: {
      color: 'bg-gray-500',
      icon: <MinusCircle />,
      pulse: false,
      label: 'Idle'
    },
    thinking: {
      color: 'bg-yellow-500',
      icon: <Brain className="animate-pulse" />,
      pulse: true,
      label: 'Thinking'
    },
    working: {
      color: 'bg-green-500',
      icon: <Zap className="animate-bounce" />,
      pulse: true,
      label: 'Working'
    },
    blocked: {
      color: 'bg-red-500',
      icon: <AlertCircle />,
      pulse: false,
      label: 'Blocked'
    },
    discussing: {
      color: 'bg-blue-500',
      icon: <MessageSquare className="animate-pulse" />,
      pulse: true,
      label: 'Discussing'
    }
  };

  const config = stateConfig[state];

  return (
    <motion.div
      layout
      className="flex items-center gap-2"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${config.color}`} />
        {config.pulse && (
          <div
            className={`absolute inset-0 w-3 h-3 rounded-full ${config.color} animate-ping`}
          />
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="text-sm font-medium"
        >
          {config.label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
};
```

### 2.3 Progress Indicators

```tsx
// Multi-dimensional progress visualization
const ProgressIndicator: React.FC<{ progress: number; subtasks?: SubTask[] }> = ({
  progress,
  subtasks
}) => {
  return (
    <div className="space-y-3">
      {/* Main progress */}
      <div className="relative">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1]
            }}
          />
        </div>

        {/* Animated percentage */}
        <motion.div
          className="absolute -top-8 left-0 text-sm font-medium text-blue-400"
          animate={{ left: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {progress}%
        </motion.div>
      </div>

      {/* Subtask indicators */}
      {subtasks && (
        <div className="flex gap-1">
          {subtasks.map((task, i) => (
            <motion.div
              key={task.id}
              className={`
                flex-1 h-1 rounded-full
                ${task.completed ? 'bg-green-500' : 'bg-gray-700'}
              `}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 3. Error Handling UX

### 3.1 Contextual Error States

```tsx
// Smart error components that suggest solutions
const ErrorBoundary: React.FC<{ error: Error; retry: () => void }> = ({
  error,
  retry
}) => {
  const errorType = classifyError(error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-red-900/10 border border-red-500/20"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-300 mb-2">
            {getErrorTitle(errorType)}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {getErrorDescription(errorType)}
          </p>

          {/* Suggested actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={retry}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
            >
              <RotateCw className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>

            {errorType === 'network' && (
              <button className="text-sm text-gray-400 hover:text-gray-300">
                Check connection settings
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
```

### 3.2 Toast Notification System

```tsx
// Sophisticated toast with actions
const toast = {
  success: (message: string, action?: ToastAction) => {
    Toaster.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-green-500/20 rounded-xl shadow-lg"
      >
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="text-sm text-gray-200">{message}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="ml-2 text-xs text-green-400 hover:text-green-300"
          >
            {action.label}
          </button>
        )}
      </motion.div>
    ));
  },

  error: (message: string, details?: string) => {
    Toaster.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-sm"
      >
        <div className="px-4 py-3 bg-gray-900 border border-red-500/20 rounded-xl shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-200 font-medium">{message}</p>
              {details && (
                <p className="text-xs text-gray-400 mt-1">{details}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    ));
  }
};
```

---

## 4. Real-Time Collaboration Indicators

### 4.1 Agent Typing Indicators

```tsx
// Sophisticated typing indicator with agent identity
const AgentTypingIndicator: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  if (agents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg"
    >
      {/* Agent avatars */}
      <div className="flex -space-x-2">
        {agents.slice(0, 3).map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-gray-900 flex items-center justify-center"
          >
            <span className="text-xs text-white font-bold">
              {agent.name[0]}
            </span>
          </motion.div>
        ))}
        {agents.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center">
            <span className="text-xs text-gray-400">+{agents.length - 3}</span>
          </div>
        )}
      </div>

      {/* Typing dots */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>

      <span className="text-xs text-gray-400">
        {agents.length === 1
          ? `${agents[0].name} is thinking...`
          : `${agents.length} agents collaborating...`
        }
      </span>
    </motion.div>
  );
};
```

### 4.2 Multi-Agent Activity Visualization

```tsx
// Real-time agent coordination display
const AgentCollaborationView: React.FC<{ agents: Agent[] }> = ({ agents }) => {
  return (
    <div className="relative p-8">
      {/* Connection lines */}
      <svg className="absolute inset-0 pointer-events-none">
        {agents.map((agent, i) =>
          agents.slice(i + 1).map((otherAgent, j) => {
            if (agent.collaboratingWith?.includes(otherAgent.id)) {
              return (
                <motion.line
                  key={`${agent.id}-${otherAgent.id}`}
                  x1={getPosition(i).x}
                  y1={getPosition(i).y}
                  x2={getPosition(i + j + 1).x}
                  y2={getPosition(i + j + 1).y}
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5 }}
                />
              );
            }
            return null;
          })
        )}
        <defs>
          <linearGradient id="gradient">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>

      {/* Agent nodes */}
      {agents.map((agent, i) => {
        const position = getPosition(i);
        return (
          <motion.div
            key={agent.id}
            className="absolute"
            style={{ left: position.x, top: position.y }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="relative">
              {/* Activity ring */}
              {agent.status === 'working' && (
                <div className="absolute -inset-2 rounded-full bg-green-500/20 animate-pulse" />
              )}

              {/* Agent avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {agent.name[0]}
              </div>

              {/* Status badge */}
              <div className={`
                absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-950
                ${getAgentStatusColor(agent.status)}
              `} />
            </div>

            {/* Agent label */}
            <div className="mt-2 text-center">
              <div className="text-xs font-medium">{agent.name}</div>
              <div className="text-xs text-gray-500">{agent.role}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
```

---

## 5. Performance & Responsiveness

### 5.1 Update Frequency Strategy

```typescript
// Adaptive polling with backoff
class AdaptivePoller {
  private baseInterval = 1000; // 1 second
  private maxInterval = 30000; // 30 seconds
  private currentInterval = 1000;
  private activityLevel: 'high' | 'medium' | 'low' = 'high';

  adjustFrequency(recentActivity: number) {
    if (recentActivity > 10) {
      this.activityLevel = 'high';
      this.currentInterval = this.baseInterval;
    } else if (recentActivity > 5) {
      this.activityLevel = 'medium';
      this.currentInterval = this.baseInterval * 2;
    } else {
      this.activityLevel = 'low';
      this.currentInterval = Math.min(
        this.currentInterval * 1.5,
        this.maxInterval
      );
    }
  }

  getInterval(): number {
    return this.currentInterval;
  }
}
```

### 5.2 Debounced User Input

```tsx
// Smart debouncing with instant feedback
const useDebounced = <T,>(
  value: T,
  delay: number = 300,
  onDebounce?: () => void
): [T, boolean] => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
      onDebounce?.();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue, isDebouncing];
};

// Usage in search
const SearchInput: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, isDebouncing] = useDebounced(query, 300);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-2 bg-gray-900 rounded-lg"
        placeholder="Search..."
      />
      {isDebouncing && (
        <div className="absolute right-3 top-3">
          <Loader className="w-4 h-4 animate-spin text-gray-500" />
        </div>
      )}
    </div>
  );
};
```

### 5.3 Virtual Scrolling

```tsx
// Virtualized list for activity feeds
import { VirtualList } from '@tanstack/react-virtual';

const ActivityFeed: React.FC<{ activities: Activity[] }> = ({ activities }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated item height
    overscan: 5, // Render 5 items outside viewport
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ActivityItem
              activity={activities[virtualItem.index]}
              index={virtualItem.index}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 5.4 Lazy Loading Strategy

```tsx
// Intersection Observer for lazy loading
const useLazyLoad = (ref: RefObject<HTMLElement>, rootMargin = '100px') => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Load once
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isVisible;
};

// Usage
const LazySection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useLazyLoad(ref);

  return (
    <div ref={ref}>
      {isVisible ? children : <SectionSkeleton />}
    </div>
  );
};
```

---

## 6. Visual Feedback Patterns

### 6.1 Success States

```tsx
// Celebratory success animation
const SuccessAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      {/* Confetti particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-br from-green-400 to-blue-400 rounded-full"
          initial={{
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            scale: 0
          }}
          animate={{
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 400,
            scale: [0, 1, 0],
            rotate: Math.random() * 360
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.02,
            ease: [0.16, 1, 0.3, 1]
          }}
        />
      ))}

      {/* Success message */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.2,
          type: 'spring',
          stiffness: 200,
          damping: 15
        }}
      >
        <div className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-2xl">
          <CheckCircle className="w-12 h-12 text-white mx-auto mb-2" />
          <p className="text-white font-bold text-lg">Success!</p>
        </div>
      </motion.div>
    </motion.div>
  );
};
```

### 6.2 YOLO Mode Indicator

```tsx
// Ambient automation indicator
const YoloModeIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <motion.div
      initial={false}
      animate={isActive ? 'active' : 'inactive'}
      className="fixed bottom-20 right-6 z-30"
    >
      <motion.div
        variants={{
          active: { scale: 1, opacity: 1 },
          inactive: { scale: 0.8, opacity: 0.3 }
        }}
        className="relative"
      >
        {/* Pulsing background */}
        {isActive && (
          <div className="absolute inset-0 bg-green-500/20 rounded-2xl animate-pulse" />
        )}

        <div className={`
          px-4 py-2 rounded-2xl border transition-all
          ${isActive
            ? 'bg-green-900/50 border-green-500/50 text-green-400'
            : 'bg-gray-900/50 border-gray-700 text-gray-500'
          }
        `}>
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isActive && 'animate-pulse'}`} />
            <span className="text-sm font-medium">
              YOLO Mode {isActive ? 'Active' : 'Standby'}
            </span>
            {isActive && (
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-3 bg-green-400 rounded-full"
                    animate={{
                      scaleY: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
```

### 6.3 Confidence Visualization

```tsx
// Dynamic confidence meter
const ConfidenceMeter: React.FC<{ confidence: number; trend: 'up' | 'down' | 'stable' }> = ({
  confidence,
  trend
}) => {
  const getColor = (value: number) => {
    if (value >= 80) return 'from-green-500 to-emerald-500';
    if (value >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Confidence</span>
        <div className="flex items-center gap-1">
          <motion.span
            className="text-sm font-bold"
            animate={{
              color: confidence >= 80 ? '#10b981' :
                     confidence >= 60 ? '#f59e0b' : '#ef4444'
            }}
          >
            {confidence}%
          </motion.span>
          {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
        </div>
      </div>

      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor(confidence)}`}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20
          }}
        />

        {/* Animated particles for high confidence */}
        {confidence >= 80 && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-1 bg-white/30 rounded-full"
                animate={{
                  x: [-20, 200],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.5,
                  repeat: Infinity
                }}
                style={{ top: '3px' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Animation Timing Reference

```typescript
// Framer Motion configurations for consistent animations
export const animationConfig = {
  // Micro-interactions (buttons, toggles)
  micro: {
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1] // Material Design standard
  },

  // Small elements (cards, list items)
  small: {
    duration: 0.3,
    ease: [0.16, 1, 0.3, 1] // iOS-style spring
  },

  // Medium elements (modals, panels)
  medium: {
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1]
  },

  // Large elements (page transitions)
  large: {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1]
  },

  // Spring configs
  spring: {
    gentle: { type: 'spring', stiffness: 100, damping: 20 },
    snappy: { type: 'spring', stiffness: 300, damping: 30 },
    bouncy: { type: 'spring', stiffness: 500, damping: 25 }
  }
};
```

---

## WebSocket Integration

```typescript
// Real-time data sync with optimistic updates
class ForgeWebSocket {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private listeners = new Map<string, Set<Function>>();

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = () => {
      this.emit('error');
      this.reconnect();
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'agent_update':
        this.emit('agentUpdate', data.payload);
        break;
      case 'progress':
        this.emit('progress', data.payload);
        break;
      case 'activity':
        this.emit('activity', data.payload);
        break;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnects) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.ws.url);
      }, delay);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Implement skeleton screens for all major components
- [ ] Set up WebSocket connection with reconnection logic
- [ ] Create base animation configurations
- [ ] Build toast notification system

### Phase 2: Live Updates (Week 2)
- [ ] Implement agent state transitions
- [ ] Add activity stream with staggered animations
- [ ] Create typing indicators
- [ ] Build progress visualization components

### Phase 3: Polish (Week 3)
- [ ] Add success/error animations
- [ ] Implement confidence meters
- [ ] Create YOLO mode indicators
- [ ] Optimize with virtual scrolling
- [ ] Add lazy loading for heavy sections

### Phase 4: Testing & Refinement (Week 4)
- [ ] Performance testing (60fps target)
- [ ] Network failure scenarios
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Final animation timing adjustments

---

## Summary

This real-time UX pattern specification transforms your static mockups into a living, breathing interface that:

1. **Feels Instant**: Progressive loading and optimistic updates make every action feel immediate
2. **Communicates Clearly**: Agent states, progress indicators, and activity streams keep users informed
3. **Handles Failure Gracefully**: Contextual errors with recovery suggestions maintain user confidence
4. **Scales Beautifully**: Virtual scrolling and lazy loading ensure performance at any scale
5. **Delights Constantly**: Micro-interactions and thoughtful animations create joy in every interaction

The result is an interface that doesn't just display data - it orchestrates a symphony of information that users can feel, understand, and control.
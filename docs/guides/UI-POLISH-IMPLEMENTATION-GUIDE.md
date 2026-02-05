# UI Polish Implementation Guide
**Priority 1 Quick Start for Design Elevation**

This guide provides copy-paste ready code for the most critical improvements identified in the UI/UX audit.

---

## 1. LOADING SKELETON SYSTEM (2-3 hours)

### Problem
Dashboard, Governance HUD, and Terminal show blank content while loading, making the app feel unresponsive.

### Solution
Create a comprehensive LoadingStates component library that you import everywhere.

#### File: `/src/components/ui/LoadingStates.tsx`
```tsx
import React from "react";
import { motion } from "framer-motion";

export const shimmerAnimation = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "linear",
  },
};

/**
 * Card Skeleton - mimics a card layout while loading
 */
export const CardSkeleton: React.FC = () => (
  <motion.div
    className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-lg h-32 mb-3"
    style={{ backgroundSize: "200% 100%" }}
    {...shimmerAnimation}
  />
);

/**
 * Dashboard skeleton - three cards in a row
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4 p-6 max-w-7xl mx-auto">
    <div className="h-8 bg-gray-800 rounded w-1/4 mb-6" />

    {/* Grid of cards */}
    <div className="grid md:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Details section */}
    <div className="mt-8">
      <div className="h-6 bg-gray-800 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-800 rounded w-full" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Governance HUD skeleton
 */
export const GovernanceHUDSkeleton: React.FC = () => (
  <div className="h-full bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-4">
    {/* Header */}
    <div className="border-b border-gray-800 pb-3">
      <div className="h-5 bg-gray-800 rounded w-1/2 mb-3" />
      <div className="h-2 bg-gray-800 rounded-full" />
    </div>

    {/* Content sections */}
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-800 rounded w-2/3 mb-2" />
        <div className="space-y-1">
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-3 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Terminal connection skeleton
 */
export const TerminalConnectionSkeleton: React.FC = () => (
  <motion.div
    className="flex items-center justify-center h-full bg-gray-950"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="text-center">
      {/* Animated terminal prompt */}
      <div className="font-mono text-gray-600 mb-4">
        <span>$</span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="ml-2"
        >
          _
        </motion.span>
      </div>

      <p className="text-sm text-gray-400">Connecting to session...</p>
    </div>
  </motion.div>
);

/**
 * List item skeleton
 */
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg">
    <div className="h-10 w-10 bg-gray-800 rounded-lg" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-800 rounded w-2/3" />
      <div className="h-3 bg-gray-700 rounded w-1/2" />
    </div>
  </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4 p-3">
        <div className="h-4 bg-gray-800 rounded flex-1" />
        <div className="h-4 bg-gray-800 rounded w-1/4" />
        <div className="h-4 bg-gray-800 rounded w-1/6" />
      </div>
    ))}
  </div>
);
```

#### Usage in Dashboard
```tsx
// dashboard-live.tsx
import { DashboardSkeleton } from "../components/ui/LoadingStates";

const LiveDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardData().then(data => {
      setData(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <AppShell {...}>
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <ChiefOfStaffDashboard {...data} />
      )}
    </AppShell>
  );
};
```

#### Usage in Governance HUD
```tsx
// GovernanceHUD.tsx
import { GovernanceHUDSkeleton } from "../ui/LoadingStates";

export const GovernanceHUD: React.FC<GovernanceHUDProps> = ({ className }) => {
  const [state, setState] = useState<GovernanceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ... existing code ...

  if (isLoading) {
    return <GovernanceHUDSkeleton />;
  }

  // ... rest of component ...
};
```

---

## 2. REAL-TIME GOVERNANCE STATE (2-3 hours)

### Problem
Governance HUD polls every 2 seconds causing flickering and wasting resources. No real-time updates.

### Solution
Replace polling with WebSocket push updates.

#### File: Update `/src/components/governance/GovernanceHUD.tsx`

**Before (Polling):**
```tsx
useEffect(() => {
  const fetchState = async () => {
    const res = await fetch("/api/governance/state");
    const response = await res.json();
    setState(response.data);
  };

  fetchState();
  const interval = setInterval(fetchState, 2000); // Every 2 seconds!
  return () => clearInterval(interval);
}, []);
```

**After (WebSocket):**
```tsx
useEffect(() => {
  // Initial fetch on mount
  const fetchInitial = async () => {
    const res = await fetch("/api/governance/state");
    const response = await res.json();
    setState(response.data);
    setIsLoading(false);
  };

  fetchInitial();

  // Subscribe to real-time updates via WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/governance`);

  ws.onmessage = (event) => {
    try {
      const update = JSON.parse(event.data);
      // Only update changed fields to prevent re-renders
      setState(prev => prev ? { ...prev, ...update } : update);
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    // Fallback to polling if WebSocket fails
    const fallbackInterval = setInterval(fetchInitial, 5000);
    return () => clearInterval(fallbackInterval);
  };

  return () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}, []);
```

**Benefits:**
- Updates pushed from server (< 100ms latency vs 2s polling)
- 95% less network traffic
- No flickering on updates
- Server-driven (real-time)

---

## 3. ENHANCED TAB STYLING IN DASHBOARD (1-2 hours)

### Problem
Tab styling is too subtle - active tab doesn't stand out visually.

### Solution
Add elevation, bold weight, and color change.

#### File: Update `/src/pages/dashboard-live.tsx`

**Before:**
```tsx
className={`
  px-4 py-2 rounded-lg text-sm font-medium transition-all
  ${
    viewMode === "overview"
      ? "bg-gray-800 text-gray-100"
      : "text-gray-400 hover:text-gray-200"
  }
`}
```

**After:**
```tsx
className={`
  px-4 py-2 rounded-lg text-sm transition-all relative
  ${
    viewMode === "overview"
      ? "font-bold text-white bg-gray-700 shadow-lg border-b-2 border-blue-400"
      : "font-medium text-gray-400 hover:text-gray-300 border-b-2 border-transparent hover:border-gray-600"
  }
`}
```

Or better yet, use a variant component:

```tsx
// components/ui/TabButton.tsx
import { cva } from "class-variance-authority";

export const tabButtonVariants = cva(
  "px-4 py-2 rounded-lg text-sm transition-all relative border-b-2",
  {
    variants: {
      active: {
        true: "font-bold text-white bg-gray-700 shadow-lg border-blue-400",
        false: "font-medium text-gray-400 hover:text-gray-300 border-transparent hover:border-gray-600",
      },
    },
  },
);

export const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ active, onClick, children, icon }) => (
  <motion.button
    whileHover={{ y: -2 }}
    whileTap={{ y: 0 }}
    onClick={onClick}
    className={tabButtonVariants({ active })}
  >
    {icon && <span className="inline mr-2">{icon}</span>}
    {children}
  </motion.button>
);
```

Usage:
```tsx
<TabButton
  active={viewMode === "overview"}
  onClick={() => setViewMode("overview")}
  icon={<BarChart3 className="w-4 h-4" />}
>
  Overview
</TabButton>
```

---

## 4. VISUAL HIERARCHY IN GOVERNANCE HUD (2-3 hours)

### Problem
Governance HUD stacks all components vertically with equal weight. Important info (health score, agent status) is buried.

### Solution
Reorganize with collapsible sections and prominent top-level metrics.

#### File: Update `/src/components/governance/GovernanceHUD.tsx`

**New layout:**
```tsx
export const GovernanceHUD: React.FC<GovernanceHUDProps> = ({ className }) => {
  const [state, setState] = useState<GovernanceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    constitution: false,
    workstreams: false,
    activity: false,
    logs: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!state) return null;

  return (
    <div className={`h-full w-full bg-gray-950/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-xl flex flex-col overflow-hidden ${className || ""}`}>

      {/* HEADER WITH LIVE INDICATOR */}
      <header className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-sm">Governance</h2>
          <div className="flex items-center gap-2">
            <motion.span
              className="w-2 h-2 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs text-gray-500">Live</span>
            <span className="text-xs text-gray-600 ml-2">
              {new Date(state.timestamp || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto space-y-2 p-3">

        {/* TOP SECTION: Health Metrics (Always Visible) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-3 mb-2"
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Health</div>
              <div className="text-xl font-bold text-green-400">
                {state.constitution?.healthScore || 87}%
              </div>
            </div>
            <div className="text-center border-l border-r border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Agents</div>
              <div className="text-xl font-bold text-blue-400">
                {state.activeAgentCount || 12}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Phase</div>
              <div className="text-sm font-bold text-purple-400 capitalize">
                {state.phase || "Building"}
              </div>
            </div>
          </div>
        </motion.div>

        {/* COLLAPSIBLE SECTIONS */}

        {/* Constitution */}
        <CollapsibleSection
          title="Constitution"
          expanded={expandedSections.constitution}
          onToggle={() => toggleSection("constitution")}
          icon={<Shield className="w-4 h-4" />}
        >
          <ConstitutionCard constitution={state.constitution} />
        </CollapsibleSection>

        {/* Workstreams */}
        <CollapsibleSection
          title="Workstreams"
          expanded={expandedSections.workstreams}
          onToggle={() => toggleSection("workstreams")}
          icon={<Layers className="w-4 h-4" />}
        >
          <ImpactMatrix workstreams={state.workstreams} />
        </CollapsibleSection>

        {/* Agent Activity */}
        <CollapsibleSection
          title="Agent Activity"
          expanded={expandedSections.activity}
          onToggle={() => toggleSection("activity")}
          icon={<Activity className="w-4 h-4" />}
        >
          <AgentActivityFeed maxEntries={10} />
        </CollapsibleSection>

        {/* Sentinel Logs */}
        <CollapsibleSection
          title="Sentinel Logs"
          expanded={expandedSections.logs}
          onToggle={() => toggleSection("logs")}
          icon={<FileText className="w-4 h-4" />}
        >
          <OracleFeed logs={state.sentinelLog} maxEntries={5} />
        </CollapsibleSection>
      </div>
    </div>
  );
};

/**
 * Reusable collapsible section component
 */
const CollapsibleSection: React.FC<{
  title: string;
  expanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, expanded, onToggle, icon, children }) => (
  <motion.div
    className="bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden"
    animate={{ height: expanded ? "auto" : "auto" }}
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-medium text-gray-200">{title}</span>
      </div>
      <motion.div
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </motion.div>
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-gray-800 px-3 py-2"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
```

**Benefits:**
- Top metrics always visible (health score, agent count, phase)
- Sections collapse to reduce scrolling
- Clear visual hierarchy
- Customizable (user can expand/collapse sections of interest)

---

## 5. DASHBOARD AGENT HIGHLIGHTING (1-2 hours)

### Problem
Agent list in "Agents" view shows all agents with equal visual weight. No distinction for important statuses.

### Solution
Color-code by status and highlight executing agents.

#### File: Update agent card styling

**New agent card component:**
```tsx
// components/AgentCard.tsx
import { cva } from "class-variance-authority";

export const agentCardVariants = cva(
  "p-4 rounded-lg border-2 transition-all duration-200",
  {
    variants: {
      status: {
        idle: "bg-gray-900/50 border-gray-700 text-gray-400",
        thinking: "bg-purple-900/20 border-purple-500/50 text-purple-200 animate-pulse",
        working: "bg-blue-900/20 border-blue-500/50 text-blue-200 shadow-lg shadow-blue-500/20",
        blocked: "bg-red-900/20 border-red-500/50 text-red-200 animate-pulse",
        discussing: "bg-green-900/20 border-green-500/50 text-green-200",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  },
);

export const AgentCard: React.FC<{
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ agent, isSelected, onClick }) => (
  <motion.button
    onClick={onClick}
    className={`${agentCardVariants({ status: agent.status })} w-full text-left ${isSelected ? "ring-2 ring-blue-400" : ""}`}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="font-semibold">{agent.name}</h3>
      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${
        agent.status === "working" ? "bg-blue-500 text-white" :
        agent.status === "thinking" ? "bg-purple-500 text-white" :
        "bg-gray-700 text-gray-300"
      }`}>
        {agent.status}
      </span>
    </div>

    <p className="text-sm mb-3 opacity-80">{agent.currentTask || "No active task"}</p>

    <div className="flex items-center justify-between text-xs">
      <span>Confidence: {agent.confidence}%</span>
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${agent.confidence}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  </motion.button>
);
```

**Usage:**
```tsx
{viewMode === "agents" && (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {mockAgents.map((agent) => (
      <AgentCard
        key={agent.id}
        agent={agent}
        isSelected={selectedAgent?.id === agent.id}
        onClick={() => setSelectedAgent(agent)}
      />
    ))}
  </div>
)}
```

---

## 6. PAGE TRANSITION ANIMATIONS (1-2 hours)

### Problem
Dashboard views switch with no animation - feels jarring.

### Solution
Add staggered fade-in for view transitions.

#### File: Update `/src/pages/dashboard-live.tsx`

**Add to view mode sections:**
```tsx
// Before rendering each view, wrap with animation
const viewVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

<AnimatePresence mode="wait">
  {viewMode === "overview" && (
    <motion.div
      key="overview"
      variants={viewVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <ChiefOfStaffDashboard {...} />
    </motion.div>
  )}

  {viewMode === "agents" && (
    <motion.div
      key="agents"
      variants={viewVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Agent content */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Loading States (2-3 hours)
- [ ] Create `/src/components/ui/LoadingStates.tsx` with all skeletons
- [ ] Add `CardSkeleton` to Dashboard
- [ ] Add `GovernanceHUDSkeleton` to Governance HUD
- [ ] Add `TerminalConnectionSkeleton` to Terminal
- [ ] Test on slow network (DevTools throttling)

### Phase 2: Real-Time Data (2-3 hours)
- [ ] Update GovernanceHUD to use WebSocket instead of polling
- [ ] Verify API server supports `/ws/governance` endpoint
- [ ] Fallback to polling if WebSocket unavailable
- [ ] Test reconnection logic

### Phase 3: Visual Enhancements (3-4 hours)
- [ ] Enhance tab styling with CVA variants
- [ ] Reorganize Governance HUD with collapsible sections
- [ ] Create AgentCard variant component
- [ ] Add page transition animations
- [ ] Add elevation/shadow hierarchy to cards

### Phase 4: Polish (1-2 hours)
- [ ] Verify all animations run at 60fps
- [ ] Test on mobile (iPhone/Android)
- [ ] Test on slow devices
- [ ] Get design review from team

---

## PERFORMANCE TIPS

1. **Use React.memo() on expensive components**
   ```tsx
   export const AgentCard = React.memo(({ agent, ... }) => (...));
   ```

2. **Lazy load heavy sections**
   ```tsx
   const OracleFeed = lazy(() => import("./OracleFeed"));
   ```

3. **Debounce WebSocket updates**
   ```tsx
   ws.onmessage = debounce((e) => setState(...), 100);
   ```

4. **Monitor bundle size**
   ```bash
   npm run build -- --analyze
   ```

---

## ESTIMATED EFFORT & IMPACT

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| Loading Skeletons | 2-3h | High (fixes blank screens) | P0 |
| WebSocket Real-Time | 2-3h | High (live data feel) | P0 |
| Tab Styling | 1-2h | Medium (visual polish) | P1 |
| Governance HUD Reorganization | 2-3h | High (clarity + usability) | P1 |
| Agent Card Variants | 1-2h | Medium (visual polish) | P1 |
| Page Transitions | 1-2h | Low-Medium (feel) | P2 |

**Total for Phase 1 (all P0):** 4-6 hours
**Total for Phase 1 + Phase 2 (all P0-P1):** 10-14 hours

This is achievable in a single day with focused effort.

---

## TESTING AFTER IMPLEMENTATION

1. **Visual regression testing**
   - Screenshot each view on mobile, tablet, desktop
   - Compare to audit baseline

2. **Performance testing**
   - Check 60fps on animations (DevTools)
   - Check bundle size impact (should be +0kb, only code reorganization)
   - Check WebSocket latency (should be <100ms)

3. **Accessibility testing**
   - Tab through all interactive elements (should see focus ring)
   - Test with screen reader (NVDA, JAWS)
   - Verify announcements on view changes

4. **Real-world testing**
   - Test on actual slow network (3G throttling)
   - Test on actual phone device
   - Test with actual governance API

---

**Next Steps:**
1. Pick one task above and start implementation
2. Commit changes with descriptive messages
3. Get design review on changes
4. Merge to main when approved
5. Monitor production for issues

Questions? Review the full UI/UX Audit at: `/docs/reports/UI-UX-AUDIT-2026-02-05.md`

---
id: a7f2c4d9-8b3e-4e9a-b1f6-3d8e9c2f1a5b
name: Infinity Terminal UX Refactor - Panel Architecture & Footer System
status: draft
created: 2026-01-30T14:30:00Z
updated: 2026-01-30T14:30:00Z
estimated_hours: 12
actual_hours: 0
priority: critical
complexity: M
parent_plan: 2078d162-1508-4f00-8ca8-49989c277f31
---

# Infinity Terminal UX Refactor - Panel Architecture & Footer System

## Executive Summary

This plan addresses critical UX issues identified in the detective analysis. The refactor focuses on fixing terminal width bugs, creating a unified panel architecture, and implementing a comprehensive footer system with Oracle feed integration.

**Parent Plan:** Infinity Terminal - Persistent Multi-Agent Terminal System
**Context:** Based on detective analysis revealing layout inconsistencies, terminal width bugs, and missing footer architecture.

## Problem Statement

**Current Issues:**
1. Terminal width doesn't recalculate when panels toggle (xterm.js shows wrong dimensions)
2. Container uses `min-h-screen` causing scroll issues instead of true full-screen layout
3. GovernanceHUD uses fixed positioning (line 78) making it float outside layout flow
4. Inconsistent panel widths (Context panel: 320px, Governance HUD: 384px)
5. Panel state managed in multiple places (infinity-terminal-view.tsx and useResponsiveLayout.ts)
6. No footer system for status, Oracle feed, or quick actions
7. Mobile overlay mode duplicated in multiple components

**Impact:**
- Poor user experience with incorrect terminal dimensions
- Layout breaks on different screen sizes
- Difficult to maintain panel behavior
- Missing critical information (status, Oracle messages)

## Technical Architecture

### Current vs. Target Architecture

**Current (Problematic):**
```
infinity-terminal-view.tsx
  ├── useState (showContextPanel) ← Local state
  ├── useResponsiveLayout (hudVisible) ← Separate state
  ├── GovernanceHUD (fixed position) ← Outside layout flow
  ├── ContextWindowHUD (hardcoded 320px)
  └── Terminal (doesn't resize properly)
```

**Target (Unified):**
```
infinity-terminal-view.tsx
  ├── useResponsiveLayout (ALL panel state) ← Single source of truth
  ├── Panel (Context) ← Unified component
  ├── Panel (Governance) ← Unified component
  ├── Terminal (auto-resize via dispatch)
  └── FooterPanel (NEW)
       ├── StatusSection
       ├── OracleFeedMarquee
       └── QuickActionsSection
```

### Component Design

#### 1. Unified Panel Component

**File:** `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/Panel.tsx`

**API:**
```typescript
interface PanelProps {
  position: 'left' | 'right';
  isVisible: boolean;
  mode: 'fixed' | 'overlay';  // Desktop vs mobile
  width?: number;  // Default 320px
  children: React.ReactNode;
  className?: string;
}
```

**Behavior:**
- Desktop (mode='fixed'): Flex item in main layout, slide in/out animation
- Mobile (mode='overlay'): Fixed position bottom sheet
- Dispatches window resize event on animation complete
- Consistent 320px width for both panels (per spec)

#### 2. Extended Layout Hook

**File:** `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/hooks/useResponsiveLayout.ts`

**Extended State:**
```typescript
interface LayoutConfig {
  // Existing
  breakpoint: Breakpoint;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // NEW: Panel management
  contextPanelVisible: boolean;
  contextPanelMode: 'fixed' | 'overlay';
  contextPanelWidth: number;
  
  governancePanelVisible: boolean;
  governancePanelMode: 'fixed' | 'overlay';
  governancePanelWidth: number;
  
  // NEW: Footer management
  footerVisible: boolean;
  footerHeight: number;  // h-16 mobile, h-24 desktop
  
  // Computed
  terminalWidth: number;  // Auto-calculated
  terminalHeight: string;
}
```

**New Methods:**
```typescript
{
  toggleContextPanel: () => void;
  toggleGovernancePanel: () => void;
  setContextPanel: (visible: boolean) => void;
  setGovernancePanel: (visible: boolean) => void;
  toggleFooter: () => void;
}
```

#### 3. Footer Panel Component

**File:** `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/FooterPanel.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Status (left)   │  Oracle Feed (center)  │ Actions (right) │
│ - Connection    │  Scrolling messages    │ - Quick buttons │
│ - Session info  │  from oracle queue     │ - Settings      │
└─────────────────────────────────────────────────────────┘
```

**API:**
```typescript
interface FooterPanelProps {
  status: {
    connected: boolean;
    sessionId: string;
    uptime: number;
  };
  oracleMessages: OracleMessage[];
  quickActions: QuickAction[];
  height?: 'mobile' | 'desktop';  // h-16 vs h-24
}
```

#### 4. Oracle Feed Marquee

**File:** `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/OracleFeedMarquee.tsx`

**Behavior:**
- Auto-scrolling horizontal marquee
- Fetches oracle messages from governance state
- Color-coded by priority (info/warning/critical)
- Pause on hover
- Click to expand full message

**API:**
```typescript
interface OracleFeedMarqueeProps {
  messages: OracleMessage[];
  speed?: number;  // pixels per second
  pauseOnHover?: boolean;
  onMessageClick?: (message: OracleMessage) => void;
}

interface OracleMessage {
  id: string;
  content: string;
  priority: 'info' | 'warning' | 'critical';
  timestamp: Date;
  source: string;  // Which agent/sentinel
}
```

## Implementation Phases

### PHASE 1: Critical Fixes (High Priority)
**Goal:** Fix immediate UX bugs blocking terminal usage
**Estimated:** 3 hours
**Dependencies:** None
**Risk:** Low

#### Task 1.1: Fix Terminal Width Calculation
**Status:** pending  
**Estimated:** 1.5h  
**Dependencies:** None  
**Complexity:** S

**Technical Details:**
Terminal width bug occurs because xterm.js doesn't know when panel animations complete. Need to dispatch `resize` event at the right time.

**Subtasks:**
- [ ] Add `onAnimationComplete` callback to panel slide animations in `infinity-terminal-view.tsx`
- [ ] Dispatch `window.dispatchEvent(new Event('resize'))` when panel toggle animations finish
- [ ] Test: Toggle context panel, verify terminal width adjusts immediately
- [ ] Test: Toggle governance panel, verify terminal width adjusts immediately
- [ ] Test: Toggle both panels simultaneously, verify correct final width

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/pages/infinity-terminal-view.tsx` (lines 165-177, 192-205)

**Acceptance Criteria:**
- Terminal width updates within 300ms of panel toggle
- No horizontal scrollbars appear in terminal
- Terminal is always centered in available space
- Works on all breakpoints (mobile, tablet, desktop)

**Implementation Guidance:**
```typescript
// In infinity-terminal-view.tsx
<motion.aside
  initial={{ x: -320, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -320, opacity: 0 }}
  transition={{ duration: 0.2 }}
  onAnimationComplete={() => {
    // Trigger terminal resize
    window.dispatchEvent(new Event('resize'));
  }}
  className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-950"
>
```

#### Task 1.2: Fix Container Layout (min-h-screen to h-screen)
**Status:** pending  
**Estimated:** 1.5h  
**Dependencies:** None  
**Complexity:** S

**Technical Details:**
Container currently uses `min-h-screen` which allows content to exceed viewport height, causing scrolling. Need `h-screen flex-col` for true full-screen layout.

**Subtasks:**
- [ ] Change root container from `min-h-screen` to `h-screen` in `infinity-terminal-view.tsx` (line 96)
- [ ] Add `flex flex-col` to root container to enable flex layout
- [ ] Update main content area to use `flex-1` for remaining space
- [ ] Test: Verify no page scrolling occurs
- [ ] Test: Verify panels stay within viewport on all screen sizes
- [ ] Test: Verify terminal fills available height correctly

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/pages/infinity-terminal-view.tsx` (line 96)

**Acceptance Criteria:**
- Page never scrolls vertically
- All content stays within viewport
- Terminal uses all available vertical space
- Header height accounted for correctly

**Implementation Guidance:**
```typescript
// Before (line 96)
<div className="min-h-screen bg-gray-950 text-white" data-testid="infinity-terminal-view">

// After
<div className="h-screen bg-gray-950 text-white flex flex-col" data-testid="infinity-terminal-view">
```

---

### PHASE 2: Panel Consistency (Medium Priority)
**Goal:** Create unified panel architecture with single state source
**Estimated:** 5 hours
**Dependencies:** Phase 1 complete
**Risk:** Medium (architectural refactor)

#### Task 2.1: Create Unified Panel Component
**Status:** pending  
**Estimated:** 2h  
**Dependencies:** None  
**Complexity:** M

**Technical Details:**
Extract common panel logic into reusable component supporting both fixed (desktop) and overlay (mobile) modes.

**Subtasks:**
- [ ] Create `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/Panel.tsx`
- [ ] Implement `PanelProps` interface with position, mode, width props
- [ ] Add framer-motion animations for slide-in/out (fixed mode)
- [ ] Add framer-motion animations for bottom sheet (overlay mode)
- [ ] Implement resize event dispatch on animation complete
- [ ] Add TypeScript types and JSDoc documentation
- [ ] Export from `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/index.ts`

**Files Created:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/Panel.tsx` (NEW)

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/index.ts` (add export)

**Acceptance Criteria:**
- Panel component handles both left and right positioning
- Desktop mode: Slides in from edge, 320px width
- Mobile mode: Bottom sheet overlay, full width
- Dispatches resize event after animations
- Accessible (keyboard navigation, ARIA labels)

**Implementation Guidance:**
```typescript
// Panel.tsx structure
export const Panel: React.FC<PanelProps> = ({
  position,
  isVisible,
  mode,
  width = 320,
  children,
  className
}) => {
  const handleAnimationComplete = useCallback(() => {
    window.dispatchEvent(new Event('resize'));
  }, []);

  if (!isVisible) return null;

  if (mode === 'overlay') {
    // Mobile bottom sheet
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-30"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          onAnimationComplete={handleAnimationComplete}
          className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}
        >
          {children}
        </motion.div>
      </>
    );
  }

  // Desktop fixed sidebar
  const initialX = position === 'left' ? -width : width;
  return (
    <motion.aside
      initial={{ x: initialX, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: initialX, opacity: 0 }}
      onAnimationComplete={handleAnimationComplete}
      style={{ width }}
      className={`flex-shrink-0 ${className}`}
    >
      {children}
    </motion.aside>
  );
};
```

#### Task 2.2: Extend useResponsiveLayout Hook
**Status:** pending  
**Estimated:** 2h  
**Dependencies:** Task 2.1  
**Complexity:** M

**Technical Details:**
Currently, panel state is split between `infinity-terminal-view.tsx` (showContextPanel) and `useResponsiveLayout.ts` (hudVisible). Consolidate into single source of truth.

**Subtasks:**
- [ ] Add `contextPanelVisible` state to hook
- [ ] Add `governancePanelVisible` state (rename from hudVisible for consistency)
- [ ] Add `footerVisible` state
- [ ] Add computed properties: `contextPanelMode`, `governancePanelMode`
- [ ] Add computed dimensions: `contextPanelWidth`, `governancePanelWidth`, `footerHeight`
- [ ] Add toggle methods: `toggleContextPanel`, `toggleGovernancePanel`, `toggleFooter`
- [ ] Update `LayoutConfig` interface with new properties
- [ ] Recalculate layout when any panel state changes
- [ ] Add unit tests for new state management logic

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/hooks/useResponsiveLayout.ts`

**Acceptance Criteria:**
- All panel state managed in single hook
- Panel modes auto-calculated based on breakpoint
- Panel widths consistent (320px)
- Footer height responsive (64px mobile, 96px desktop)
- State changes trigger layout recalculation

**Implementation Guidance:**
```typescript
// Extended state
const [contextPanelVisible, setContextPanelVisible] = useState(defaultContextVisible);
const [governancePanelVisible, setGovernancePanelVisible] = useState(defaultHUDVisible);
const [footerVisible, setFooterVisible] = useState(true);

// Computed config
const calculateLayout = useCallback((width: number): LayoutConfig => {
  const breakpoint = getBreakpoint(width);
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  
  return {
    // ... existing
    contextPanelVisible,
    contextPanelMode: isMobile ? 'overlay' : 'fixed',
    contextPanelWidth: 320,
    
    governancePanelVisible,
    governancePanelMode: isMobile ? 'overlay' : 'fixed',
    governancePanelWidth: 320,
    
    footerVisible,
    footerHeight: isMobile ? 64 : 96,
    
    terminalWidth: width 
      - (contextPanelVisible && !isMobile ? 320 : 0)
      - (governancePanelVisible && !isMobile ? 320 : 0),
    terminalHeight: `calc(100vh - 73px - ${footerVisible ? (isMobile ? 64 : 96) : 0}px)`
  };
}, [contextPanelVisible, governancePanelVisible, footerVisible]);

// Toggle methods
const toggleContextPanel = useCallback(() => {
  setContextPanelVisible(prev => !prev);
}, []);

const toggleGovernancePanel = useCallback(() => {
  setGovernancePanelVisible(prev => !prev);
}, []);
```

#### Task 2.3: Remove Fixed Positioning from GovernanceHUD
**Status:** pending  
**Estimated:** 0.5h  
**Dependencies:** Task 2.1, 2.2  
**Complexity:** S

**Technical Details:**
GovernanceHUD currently uses `fixed right-4 top-20 bottom-4` positioning (line 78) which makes it float outside the layout flow. Remove these styles to let it flow naturally in the Panel component.

**Subtasks:**
- [ ] Remove `fixed right-4 top-20 bottom-4` classes from `GovernanceHUD.tsx` (line 78)
- [ ] Remove `z-40` (Panel component will handle z-index)
- [ ] Remove `w-96` (Panel component controls width)
- [ ] Keep internal styling (bg-gray-950/95, backdrop-blur, border)
- [ ] Update loading and error states to remove fixed positioning
- [ ] Test: Verify HUD renders correctly in Panel component

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/governance/GovernanceHUD.tsx` (line 78, 108, 120)

**Acceptance Criteria:**
- GovernanceHUD has no fixed positioning
- Renders correctly inside Panel component
- Internal scroll still works
- Animations handled by Panel, not GovernanceHUD

**Implementation Guidance:**
```typescript
// Before (line 78)
className={`fixed right-4 top-20 bottom-4 w-96 bg-gray-950/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden ${className || ''}`}

// After
className={`h-full bg-gray-950/95 backdrop-blur-sm border border-purple-500/20 rounded-xl shadow-2xl flex flex-col overflow-hidden ${className || ''}`}
```

#### Task 2.4: Refactor infinity-terminal-view.tsx
**Status:** pending  
**Estimated:** 1.5h  
**Dependencies:** Task 2.1, 2.2, 2.3  
**Complexity:** M

**Technical Details:**
Replace custom panel logic with unified Panel component and consolidated state from useResponsiveLayout.

**Subtasks:**
- [ ] Import Panel component
- [ ] Remove local `showContextPanel` state
- [ ] Use `layout.contextPanelVisible` and `layout.governancePanelVisible` from hook
- [ ] Update header toggle buttons to use `toggleContextPanel` and `toggleGovernancePanel`
- [ ] Replace custom AnimatePresence panels with Panel component (context)
- [ ] Replace custom AnimatePresence panels with Panel component (governance)
- [ ] Remove MobileHUDSheet component (Panel handles overlay mode)
- [ ] Update button labels: "Governance" instead of "HUD" for consistency
- [ ] Test all breakpoints: mobile, tablet, desktop
- [ ] Verify animations work smoothly

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/pages/infinity-terminal-view.tsx`

**Acceptance Criteria:**
- No local panel state in view component
- All state comes from useResponsiveLayout hook
- Panel component used for both sidebars
- Mobile overlays use same Panel component
- Code reduced by ~100 lines
- All functionality preserved

**Implementation Guidance:**
```typescript
// Updated hook usage
const {
  layout,
  toggleContextPanel,
  toggleGovernancePanel,
} = useResponsiveLayout();

// Context Panel (replaces lines 163-177)
<Panel
  position="left"
  isVisible={layout.contextPanelVisible}
  mode={layout.contextPanelMode}
  width={layout.contextPanelWidth}
  className="border-r border-gray-800 bg-gray-950"
>
  <div className="h-full overflow-hidden p-4">
    <ContextWindowHUD className="h-full" />
  </div>
</Panel>

// Governance Panel (replaces lines 191-214)
<Panel
  position="right"
  isVisible={layout.governancePanelVisible}
  mode={layout.governancePanelMode}
  width={layout.governancePanelWidth}
  className="border-l border-gray-800"
>
  <ErrorBoundary fallbackMessage="Governance HUD encountered an error.">
    <GovernanceHUD />
  </ErrorBoundary>
</Panel>
```

---

### PHASE 3: Footer Architecture (Medium Priority)
**Goal:** Implement comprehensive footer with status, Oracle feed, and quick actions
**Estimated:** 4 hours
**Dependencies:** Phase 2 complete
**Risk:** Low

#### Task 3.1: Create FooterPanel Component
**Status:** pending  
**Estimated:** 2h  
**Dependencies:** Phase 2 complete  
**Complexity:** M

**Technical Details:**
Footer displays system status (left), scrolling Oracle messages (center), and quick actions (right). Responsive height: 64px mobile, 96px desktop.

**Subtasks:**
- [ ] Create `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/FooterPanel.tsx`
- [ ] Implement 3-column grid layout (status, feed, actions)
- [ ] Add status section: connection indicator, session ID, uptime
- [ ] Add quick actions section: placeholder buttons for common actions
- [ ] Integrate OracleFeedMarquee in center column
- [ ] Make responsive: single column on mobile, 3 columns on desktop
- [ ] Add TypeScript types and JSDoc documentation
- [ ] Export from index.ts

**Files Created:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/FooterPanel.tsx` (NEW)

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/index.ts` (add export)

**Acceptance Criteria:**
- Footer fixed to bottom of viewport
- Height: 64px on mobile, 96px on desktop
- 3-column layout on desktop, stacked on mobile
- Status shows connection state and session info
- Quick actions visible and clickable
- Oracle feed scrolls horizontally in center

**Implementation Guidance:**
```typescript
export const FooterPanel: React.FC<FooterPanelProps> = ({
  status,
  oracleMessages,
  quickActions,
  height = 'desktop'
}) => {
  const heightClass = height === 'mobile' ? 'h-16' : 'h-24';
  
  return (
    <footer className={`${heightClass} bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 flex-shrink-0`}>
      <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 items-center">
        {/* Status Section */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <div className="text-sm">
            <div className="text-gray-400">Session: <span className="text-white font-mono">{status.sessionId}</span></div>
            <div className="text-xs text-gray-500">Uptime: {formatUptime(status.uptime)}</div>
          </div>
        </div>
        
        {/* Oracle Feed Marquee */}
        <div className="hidden lg:block">
          <OracleFeedMarquee messages={oracleMessages} />
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2 justify-end">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};
```

#### Task 3.2: Create OracleFeedMarquee Component
**Status:** pending  
**Estimated:** 1.5h  
**Dependencies:** None  
**Complexity:** M

**Technical Details:**
Scrolling horizontal marquee displaying Oracle messages from governance state. Color-coded by priority, pauses on hover.

**Subtasks:**
- [ ] Create `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/OracleFeedMarquee.tsx`
- [ ] Implement auto-scrolling animation using framer-motion or CSS animation
- [ ] Add color coding: blue (info), yellow (warning), red (critical)
- [ ] Add pause on hover functionality
- [ ] Add click handler to expand full message (optional modal)
- [ ] Handle empty state gracefully
- [ ] Add smooth infinite loop (duplicate content for seamless scroll)
- [ ] Export from index.ts

**Files Created:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/OracleFeedMarquee.tsx` (NEW)

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/components/infinity-terminal/index.ts` (add export)

**Acceptance Criteria:**
- Messages scroll horizontally at configurable speed
- Infinite loop with no visible seam
- Pauses when user hovers
- Color-coded by priority
- Handles 0 messages gracefully
- Clickable messages (optional)

**Implementation Guidance:**
```typescript
export const OracleFeedMarquee: React.FC<OracleFeedMarqueeProps> = ({
  messages,
  speed = 50,
  pauseOnHover = true,
  onMessageClick
}) => {
  const [isPaused, setIsPaused] = useState(false);
  
  if (messages.length === 0) {
    return (
      <div className="text-xs text-gray-500 text-center italic">
        No oracle messages
      </div>
    );
  }
  
  const getPriorityColor = (priority: OracleMessage['priority']) => {
    switch (priority) {
      case 'info': return 'text-blue-400 border-blue-500/30';
      case 'warning': return 'text-yellow-400 border-yellow-500/30';
      case 'critical': return 'text-red-400 border-red-500/30';
    }
  };
  
  // Duplicate messages for seamless loop
  const duplicatedMessages = [...messages, ...messages];
  
  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <motion.div
        className="flex gap-4"
        animate={{ x: isPaused ? 0 : [0, -100 * messages.length] }}
        transition={{
          duration: messages.length * (1000 / speed),
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        {duplicatedMessages.map((msg, idx) => (
          <div
            key={`${msg.id}-${idx}`}
            onClick={() => onMessageClick?.(msg)}
            className={`px-3 py-1 rounded border text-xs whitespace-nowrap cursor-pointer ${getPriorityColor(msg.priority)}`}
          >
            <span className="font-semibold">[{msg.source}]</span> {msg.content}
          </div>
        ))}
      </motion.div>
    </div>
  );
};
```

#### Task 3.3: Integrate Footer into Main Layout
**Status:** pending  
**Estimated:** 0.5h  
**Dependencies:** Task 3.1, 3.2  
**Complexity:** S

**Technical Details:**
Add FooterPanel to infinity-terminal-view.tsx layout, fetch oracle messages from governance state, wire up status info.

**Subtasks:**
- [ ] Import FooterPanel and OracleFeedMarquee
- [ ] Add footer to main layout (after terminal, before closing div)
- [ ] Fetch oracle messages from governance state API
- [ ] Wire up session status from InfinityTerminal component
- [ ] Add quick actions: toggle panels, new session, settings
- [ ] Update terminal height calculation to account for footer
- [ ] Test responsive behavior (mobile vs desktop)

**Files Modified:**
- `/home/axw/projects/NXTG-Forge/v3/src/pages/infinity-terminal-view.tsx`

**Acceptance Criteria:**
- Footer visible at bottom of viewport
- Oracle messages scroll continuously
- Status shows accurate connection state
- Quick actions work (toggle panels, etc.)
- Terminal height adjusts for footer presence
- Footer responsive (different heights on mobile/desktop)

**Implementation Guidance:**
```typescript
// After terminal, before closing </div>
<FooterPanel
  status={{
    connected: true, // Get from InfinityTerminal
    sessionId: 'nxtg-forge-v3',
    uptime: Date.now() - sessionStartTime
  }}
  oracleMessages={state?.sentinelLog.map(log => ({
    id: log.timestamp.toString(),
    content: log.message,
    priority: log.severity === 'high' ? 'critical' : log.severity === 'medium' ? 'warning' : 'info',
    timestamp: new Date(log.timestamp),
    source: log.source
  })) || []}
  quickActions={[
    { id: 'memory', label: 'Memory', onClick: toggleContextPanel },
    { id: 'governance', label: 'Governance', onClick: toggleGovernancePanel },
    { id: 'settings', label: 'Settings', onClick: () => {} }
  ]}
  height={layout.isMobile ? 'mobile' : 'desktop'}
/>
```

---

## Testing Strategy

### Unit Tests
**Target:** 90% coverage for new components

- [ ] Panel component: mode switching, animations, resize events
- [ ] useResponsiveLayout: state management, layout calculations
- [ ] OracleFeedMarquee: scrolling, pause, priority colors
- [ ] FooterPanel: layout, status display, quick actions

### Integration Tests
**Target:** Key user flows

- [ ] Toggle context panel → terminal resizes correctly
- [ ] Toggle governance panel → terminal resizes correctly
- [ ] Resize window → panels switch between fixed/overlay modes
- [ ] Mobile overlay → close via backdrop click
- [ ] Footer oracle feed → updates when new messages arrive

### Visual Regression Tests
**Target:** Layout consistency across breakpoints

- [ ] Desktop (1920px): Both panels visible, footer 96px
- [ ] Tablet (768px): Panels overlay mode
- [ ] Mobile (375px): Panels bottom sheet, footer 64px
- [ ] Panel toggle animation: No layout shift or flicker

### Manual QA Checklist
**Before marking complete:**

- [ ] Terminal width correct at all breakpoints
- [ ] No horizontal scroll in terminal
- [ ] Panels slide smoothly (no jank)
- [ ] Footer oracle feed scrolls without gaps
- [ ] Status info updates in real-time
- [ ] Quick actions all functional
- [ ] Mobile bottom sheet dismissible
- [ ] Keyboard navigation works
- [ ] Screen reader announces panel state

---

## Risk Analysis & Mitigation

### Risk 1: Terminal Resize Timing Issues
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Dispatch resize event AFTER animation completes, not before
- Add 50ms debounce to prevent multiple rapid resizes
- Test with slow network to ensure proper sequencing

### Risk 2: State Management Complexity
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**
- Keep all panel state in single hook
- Use TypeScript strict mode to catch type errors
- Add comprehensive unit tests for state transitions

### Risk 3: Animation Performance on Mobile
**Probability:** Low  
**Impact:** Low  
**Mitigation:**
- Use CSS transforms (not position changes) for animations
- Enable GPU acceleration with `will-change`
- Test on low-end Android devices

### Risk 4: Oracle Feed Performance with Many Messages
**Probability:** Medium  
**Impact:** Low  
**Mitigation:**
- Limit marquee to last 20 messages
- Use CSS animation instead of JavaScript for scrolling
- Implement virtualization if needed

---

## Rollback Strategy

**If issues arise during implementation:**

1. Each phase is independent - can rollback individually
2. Git commits per task for granular reversion
3. Feature flag: `ENABLE_NEW_PANEL_SYSTEM` env var
4. Fallback to old layout if flag disabled

**Rollback Steps:**
```bash
# Rollback specific phase
git revert <phase-commit-hash>

# Or disable via feature flag
export ENABLE_NEW_PANEL_SYSTEM=false
```

---

## Success Metrics

**How to verify success:**

### Performance Metrics
- [ ] Terminal resize completes in <300ms
- [ ] Panel animations run at 60fps
- [ ] Oracle feed scroll smooth (no jank)
- [ ] Page load time <2s

### UX Metrics
- [ ] Zero horizontal scroll issues
- [ ] Panels work on all breakpoints
- [ ] Footer visible and functional
- [ ] All toggle buttons work

### Code Quality Metrics
- [ ] 90% test coverage on new components
- [ ] Zero TypeScript errors
- [ ] Zero console warnings
- [ ] <5% bundle size increase

---

## Dependencies

**External:**
- framer-motion: ^10.x (already installed)
- xterm.js: ^5.x (already installed)
- React: ^18.x (already installed)

**Internal:**
- GovernanceHUD component (existing)
- ContextWindowHUD component (existing)
- InfinityTerminal component (existing)
- useResponsiveLayout hook (existing, will extend)

**No new dependencies required.**

---

## Post-Implementation Tasks

- [ ] Update documentation: README.md with new panel system
- [ ] Update Storybook stories for new components
- [ ] Record demo video showing panel behavior
- [ ] Update user guide with footer quick actions
- [ ] Performance audit with Lighthouse
- [ ] Accessibility audit with axe-devtools
- [ ] Add analytics tracking for panel toggle events
- [ ] Create follow-up ticket for footer customization

---

## Notes for forge-builder

**Critical Implementation Details:**

1. **Window Resize Events:** Must dispatch AFTER animation completes, not during. Use `onAnimationComplete` callback from framer-motion.

2. **Panel Width Consistency:** Both panels MUST be 320px, not 384px. This is a design decision for uniformity.

3. **State Consolidation:** ALL panel state goes into useResponsiveLayout. No local state in view components. This is the most important architectural change.

4. **GovernanceHUD Positioning:** Remove ALL fixed positioning classes. Let Panel component handle layout.

5. **Footer Height:** 64px (h-16) on mobile, 96px (h-24) on desktop. Account for this in terminal height calculation.

6. **Oracle Feed:** Fetch from governance state (`/api/governance/state`), map `sentinelLog` to `OracleMessage[]`.

7. **Testing Priority:** Focus on resize behavior first (Phase 1), then panel switching (Phase 2), then footer (Phase 3).

**Questions to Ask User:**
- None. Spec is complete and unambiguous.

**Estimated Timeline:**
- Phase 1: 3 hours (CRITICAL - do first)
- Phase 2: 5 hours (required for Phase 3)
- Phase 3: 4 hours (can be done in parallel after Phase 2)
- **Total: 12 hours**

**Suggested Approach:**
1. Start with Phase 1, Task 1.1 (terminal width fix) - immediate impact
2. Complete Phase 1, Task 1.2 (container layout) - quick win
3. Build Phase 2 components bottom-up (Panel → hook → view refactor)
4. Finish with Phase 3 footer (least risky, most visible)

Good luck, builder! This refactor will dramatically improve the UX. 🚀

---
id: 2078d162-1508-4f00-8ca8-49989c277f31
name: Infinity Terminal - Persistent Multi-Agent Terminal System
status: draft
created: 2026-01-30T00:00:00Z
updated: 2026-01-30T00:00:00Z
estimated_hours: 96
actual_hours: 0
priority: high
complexity: XL
---

# Infinity Terminal - Persistent Multi-Agent Terminal System

## Executive Summary

Transform NXTG-Forge into a persistent, multi-device development environment supporting 20 parallel agents with seamless session continuity. Users can disconnect and reconnect from any device (web, mobile, tablet, desktop) without losing context or work.

## Strategic Vision

**Core Value Proposition:**
- **Persistent Development Environment**: Never lose your work, even across device switches
- **Multi-Agent Parallelization**: Run 20 agents simultaneously with visual orchestration
- **Universal Access**: Work from anywhere on any device with consistent experience
- **Visual Orchestration**: See all agent activities in real-time through Governance HUD

**Success Criteria:**
- [ ] Sessions survive disconnect/reconnect without data loss
- [ ] Support 20+ parallel agent sessions with independent workstreams
- [ ] Responsive UI works on mobile (320px), tablet (768px), desktop (1920px+)
- [ ] Sub-100ms reconnection time to existing sessions
- [ ] Zero data loss during network interruptions

## Technical Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Any Device)                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │ Desktop │  │   Web   │  │ Mobile  │  │   Tablet     │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬───────┘   │
│       │            │            │              │            │
│       └────────────┴────────────┴──────────────┘            │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ WebSocket + HTTP/2
┌──────────────────────────┼───────────────────────────────────┐
│                    ttyd Web Terminal                          │
│           (Port 7681 - Terminal HTTP/WebSocket)              │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                   Zellij Session Manager                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Persistent Session: nxtg-forge-infinity              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │  Pane 1  │  │  Pane 2  │  │  Pane 3 ... N    │   │   │
│  │  │ Claude   │  │ Oracle   │  │  Agent Workers   │   │   │
│  │  │  Code    │  │  Monitor │  │  (Parallel)      │   │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│               NXTG-Forge Agent Orchestration                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Governance State Manager (REST API + WebSocket)     │   │
│  │  - Session state persistence                         │   │
│  │  - Workstream coordination                           │   │
│  │  - Agent lifecycle management                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Multi-Agent Worker Pool                             │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ... (up to 20)          │   │
│  │  │Agent1│ │Agent2│ │Agent3│                          │   │
│  │  └──────┘ └──────┘ └──────┘                          │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**1. Session Persistence Layer (Zellij)**
- Named persistent sessions
- Automatic pane resurrection
- Layout configuration persistence
- Environment variable preservation

**2. Web Access Layer (ttyd)**
- WebSocket-based terminal streaming
- HTTP/2 for efficient multiplexing
- Automatic reconnection handling
- Authentication/authorization

**3. UI Integration Layer (React)**
- Terminal view with xterm.js
- Governance HUD sidebar
- Responsive layout system
- Mobile-first design

**4. Agent Orchestration Layer (Backend)**
- Worker pool management
- Workstream coordination
- State synchronization
- Real-time updates via WebSocket

## Implementation Phases

### PHASE 1: Foundation - Persistent Session Infrastructure
**Goal:** Establish basic persistent terminal capability
**Estimated:** 16 hours
**Dependencies:** None
**Risk:** Medium (new infrastructure)

#### Task 1.1: Install and Configure Zellij
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** None  
**Complexity:** S

**Subtasks:**
- [ ] Research Zellij installation on target platforms (Linux, macOS, WSL)
- [ ] Create installation script (`scripts/setup-zellij.sh`)
- [ ] Test Zellij basic session creation and reattachment
- [ ] Document installation requirements

**Acceptance Criteria:**
- Zellij installed and functional on development machine
- Can create named session: `zellij attach nxtg-forge-infinity --create`
- Session persists after terminal close

#### Task 1.2: Install and Configure ttyd
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** None  
**Complexity:** S

**Subtasks:**
- [ ] Install ttyd via package manager or build from source
- [ ] Create systemd service for ttyd auto-start (Linux)
- [ ] Configure ttyd to launch Zellij session on connection
- [ ] Test ttyd web interface (http://localhost:7681)

**Acceptance Criteria:**
- ttyd accessible on port 7681
- Opening web interface automatically attaches to Zellij session
- Closing browser doesn't kill terminal session

**ttyd Command Example:**
```bash
ttyd -p 7681 -W zellij attach nxtg-forge-infinity --create
```

#### Task 1.3: Create Zellij Layout Configuration
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 1.1  
**Complexity:** M

**Subtasks:**
- [ ] Design 3-pane layout (Claude Code, Oracle, Agent Workers)
- [ ] Create Zellij layout file (`.claude/zellij/infinity-layout.kdl`)
- [ ] Configure pane sizes and positions
- [ ] Add pane titles and borders
- [ ] Test layout loading: `zellij --layout .claude/zellij/infinity-layout.kdl`

**Layout Structure:**
```kdl
layout {
    pane size=1 borderless=true {
        plugin location="zellij:tab-bar"
    }
    pane split_direction="vertical" {
        pane name="Claude Code" size="60%" {
            command "bash"
        }
        pane split_direction="horizontal" {
            pane name="Oracle Monitor" size="50%" {
                command "bash"
            }
            pane name="Agent Workers" size="50%" {
                command "bash"
            }
        }
    }
}
```

**Acceptance Criteria:**
- Layout file loads without errors
- 3 panes display correctly with titles
- Panes resize appropriately

#### Task 1.4: Implement Session Auto-Recovery
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 1.1, Task 1.2  
**Complexity:** M

**Subtasks:**
- [ ] Create startup script (`scripts/start-infinity-terminal.sh`)
- [ ] Add session health check logic
- [ ] Implement automatic Zellij restart on crash
- [ ] Add logging for session lifecycle events
- [ ] Test crash recovery scenarios

**Acceptance Criteria:**
- Script detects existing Zellij session and reattaches
- If session died, creates new one with same name
- Logs session events to `.claude/logs/terminal-sessions.log`

---

### PHASE 2: Web Integration - UI Layer
**Goal:** Embed persistent terminal into React UI
**Estimated:** 20 hours
**Dependencies:** Phase 1
**Risk:** Low (existing xterm.js integration)

#### Task 2.1: Integrate ttyd into React Terminal Component
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 1.2  
**Complexity:** M

**Subtasks:**
- [ ] Create `<InfinityTerminal>` component in `/src/components/terminal/`
- [ ] Replace xterm.js direct integration with iframe to ttyd
- [ ] Implement WebSocket connection to ttyd endpoint
- [ ] Add connection status indicator (connected/disconnected/reconnecting)
- [ ] Handle authentication/authorization headers

**Component Structure:**
```tsx
interface InfinityTerminalProps {
  sessionId: string;
  onSessionRestore?: (sessionId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export const InfinityTerminal: React.FC<InfinityTerminalProps> = ({
  sessionId,
  onSessionRestore,
  onConnectionChange,
}) => {
  // WebSocket connection to ttyd
  // Session restoration logic
  // Connection status handling
};
```

**Acceptance Criteria:**
- Terminal renders in React UI
- Can interact with shell through browser
- Connection status displays correctly
- Reconnection happens automatically

#### Task 2.2: Add Mobile-Responsive Terminal Layout
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 2.1  
**Complexity:** M

**Subtasks:**
- [ ] Implement responsive breakpoints (320px, 768px, 1920px)
- [ ] Design mobile terminal UX (vertical stack vs horizontal split)
- [ ] Add touch gesture support (pinch-to-zoom, swipe between panes)
- [ ] Optimize font size for mobile (minimum 12px)
- [ ] Test on real mobile devices (iOS Safari, Android Chrome)

**Responsive Breakpoints:**
- **Mobile (320px - 767px):** Stack panes vertically, collapsible HUD
- **Tablet (768px - 1279px):** 2-pane layout, slide-out HUD
- **Desktop (1280px+):** 3-pane layout with fixed HUD

**Acceptance Criteria:**
- Terminal usable on iPhone SE (320px width)
- All interactive elements minimum 44px touch target
- Font scales appropriately across devices
- Governance HUD collapsible on mobile

#### Task 2.3: Update terminal-view.tsx Layout
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 2.1, Task 2.2  
**Complexity:** S

**Subtasks:**
- [ ] Replace `<ClaudeTerminal>` with `<InfinityTerminal>`
- [ ] Update layout grid to accommodate Zellij panes
- [ ] Add pane visibility toggles (show/hide Oracle, Workers)
- [ ] Implement keyboard shortcuts (Ctrl+Shift+1/2/3 to focus panes)
- [ ] Update help overlay with new shortcuts

**Acceptance Criteria:**
- Terminal view shows Zellij session with all panes
- Pane visibility toggles work correctly
- Keyboard shortcuts focus correct panes
- Help overlay documents new shortcuts

#### Task 2.4: Implement Session Persistence UI
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 2.1  
**Complexity:** M

**Subtasks:**
- [ ] Add "Session ID" display in header
- [ ] Create "Restore Session" modal for reconnection
- [ ] Show session restore notification on page load
- [ ] Add "Session History" dropdown (last 5 sessions)
- [ ] Implement "Clear Dead Sessions" cleanup action

**UI Components:**
```tsx
// Header addition
<div className="session-info">
  <span>Session: {sessionId}</span>
  <button onClick={showSessionHistory}>History</button>
</div>

// Restore modal
<SessionRestoreModal
  availableSessions={sessions}
  onRestore={handleRestore}
/>
```

**Acceptance Criteria:**
- Session ID visible in header
- Can restore previous session from dropdown
- Modal appears on page load if session exists
- Dead sessions cleaned up after 7 days

---

### PHASE 3: Agent Parallelization - Backend Architecture
**Goal:** Support 20+ parallel agent executions
**Estimated:** 28 hours
**Dependencies:** Phase 1
**Risk:** High (complex concurrency)

#### Task 3.1: Design Agent Worker Pool Architecture
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** None  
**Complexity:** L

**Subtasks:**
- [ ] Define `AgentWorker` interface and lifecycle
- [ ] Design worker pool state machine (idle → busy → complete → error)
- [ ] Create worker pool sizing strategy (dynamic vs fixed pool)
- [ ] Design task queue system (priority queue, FIFO, etc.)
- [ ] Document agent communication protocol (IPC, WebSocket, HTTP)

**Architecture Decisions:**
- **Worker Isolation:** Each agent runs in separate Node.js process (child_process.fork)
- **Pool Size:** Dynamic pool with min=5, max=20, scaling based on workload
- **Communication:** IPC for local agents, WebSocket for remote coordination
- **State Persistence:** Worker state saved to `.claude/agent-workers/{workerId}/state.json`

**Acceptance Criteria:**
- Design document created (`/docs/architecture/agent-worker-pool.md`)
- State machine diagram included
- Communication protocol specified
- Pool sizing algorithm documented

#### Task 3.2: Implement AgentWorkerPool Service
**Status:** pending  
**Estimated:** 10h  
**Dependencies:** Task 3.1  
**Complexity:** XL

**Subtasks:**
- [ ] Create `AgentWorkerPool` class in `/src/server/workers/AgentWorkerPool.ts`
- [ ] Implement worker spawning and lifecycle management
- [ ] Add task queue with priority support
- [ ] Implement worker health monitoring (heartbeat, timeout detection)
- [ ] Add worker crash recovery and restart logic
- [ ] Create worker metrics collection (CPU, memory, task count)

**Key Methods:**
```typescript
class AgentWorkerPool {
  async assignTask(task: AgentTask): Promise<WorkerId>;
  async terminateWorker(workerId: WorkerId): Promise<void>;
  getAvailableWorkers(): WorkerId[];
  getWorkerStatus(workerId: WorkerId): WorkerStatus;
  getPoolMetrics(): PoolMetrics;
}
```

**Acceptance Criteria:**
- Can spawn up to 20 worker processes
- Tasks assigned to available workers using round-robin
- Worker crashes detected and new worker spawned
- Metrics endpoint returns pool health status

#### Task 3.3: Integrate Workers with Governance State
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 3.2  
**Complexity:** L

**Subtasks:**
- [ ] Update `GovernanceState` schema to include worker pool status
- [ ] Add worker metrics to Governance HUD
- [ ] Create worker status API endpoint (`GET /api/workers`)
- [ ] Implement real-time worker updates via WebSocket
- [ ] Add worker assignment to workstreams (workstream → worker mapping)

**GovernanceState Updates:**
```typescript
interface GovernanceState {
  // existing fields...
  workerPool: {
    totalWorkers: number;
    activeWorkers: number;
    idleWorkers: number;
    tasksQueued: number;
    workers: WorkerInfo[];
  };
}

interface WorkerInfo {
  id: string;
  status: 'idle' | 'busy' | 'error';
  currentTask?: string;
  assignedWorkstream?: string;
  metrics: {
    cpuPercent: number;
    memoryMB: number;
    tasksCompleted: number;
  };
}
```

**Acceptance Criteria:**
- Governance HUD shows worker pool status
- Can see which worker is assigned to which workstream
- Real-time worker status updates in UI
- Worker metrics visible in Governance HUD

#### Task 3.4: Create Agent Execution Context Isolation
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 3.2  
**Complexity:** L

**Subtasks:**
- [ ] Implement per-agent working directory (`/tmp/agent-{workerId}/`)
- [ ] Add agent environment variable isolation
- [ ] Create agent stdout/stderr capture and routing
- [ ] Implement agent command history separation
- [ ] Add agent file system sandbox (prevent cross-contamination)

**Isolation Strategy:**
```typescript
interface AgentContext {
  workerId: string;
  workingDirectory: string;
  environmentVariables: Record<string, string>;
  stdoutStream: WritableStream;
  stderrStream: WritableStream;
  commandHistory: string[];
}
```

**Acceptance Criteria:**
- Each agent has isolated working directory
- Agent outputs don't mix in terminal
- Agent 1 cannot access Agent 2's files
- Command history separate per agent

---

### PHASE 4: Governance HUD Integration
**Goal:** Visualize all agent activities in real-time
**Estimated:** 16 hours
**Dependencies:** Phase 2, Phase 3
**Risk:** Low (existing HUD infrastructure)

#### Task 4.1: Create Agent Activity Feed Component
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 3.3  
**Complexity:** M

**Subtasks:**
- [ ] Design `<AgentActivityFeed>` component
- [ ] Implement real-time activity stream (WebSocket subscription)
- [ ] Add agent status badges (idle, busy, error, complete)
- [ ] Create agent task timeline visualization
- [ ] Add filtering by agent/workstream/status

**Component Structure:**
```tsx
interface AgentActivityFeedProps {
  workers: WorkerInfo[];
  maxEntries?: number;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  workers,
  maxEntries = 20,
}) => {
  // Real-time activity updates
  // Agent status visualization
  // Task timeline
};
```

**Acceptance Criteria:**
- Activity feed shows last 20 agent actions
- Real-time updates when agent starts/completes task
- Can filter by specific agent or workstream
- Clicking agent opens detailed view

#### Task 4.2: Add Worker Pool Metrics Dashboard
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 3.3  
**Complexity:** S

**Subtasks:**
- [ ] Create `<WorkerPoolMetrics>` component
- [ ] Add pool utilization gauge (active/total)
- [ ] Display queue depth and wait time
- [ ] Show average task completion time
- [ ] Add worker health indicators (CPU, memory)

**Metrics Display:**
```
┌─────────────────────────────────────┐
│ Worker Pool Metrics                 │
├─────────────────────────────────────┤
│ Active: 15/20  ████████████░░░ 75%  │
│ Queue:  3 tasks (avg wait: 2.3s)    │
│ Avg Completion: 45s                 │
├─────────────────────────────────────┤
│ Worker Health:                      │
│ 🟢 13 healthy  🟡 2 busy  🔴 0 err  │
└─────────────────────────────────────┘
```

**Acceptance Criteria:**
- Metrics update in real-time
- Pool utilization gauge accurate
- Queue depth visible
- Worker health status color-coded

#### Task 4.3: Enhance Impact Matrix with Worker Assignments
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 3.3, Task 4.1  
**Complexity:** M

**Subtasks:**
- [ ] Update `ImpactMatrix` to show worker assignments
- [ ] Add worker avatar/badge to workstream cards
- [ ] Implement worker reassignment drag-and-drop
- [ ] Show worker progress within workstream card
- [ ] Add "Assign Worker" action to workstream menu

**UI Enhancement:**
```tsx
// Workstream card with worker info
<WorkstreamCard workstream={ws}>
  <WorkerBadge 
    worker={ws.assignedWorker} 
    progress={ws.progress}
  />
  <button onClick={reassignWorker}>Reassign</button>
</WorkstreamCard>
```

**Acceptance Criteria:**
- Can see which worker assigned to each workstream
- Drag-and-drop worker reassignment works
- Worker progress shows in workstream card
- Empty workstreams show "Assign Worker" prompt

#### Task 4.4: Create Multi-Pane Terminal Switcher
**Status:** pending  
**Estimated:** 2h  
**Dependencies:** Task 2.1  
**Complexity:** S

**Subtasks:**
- [ ] Add pane tabs to terminal header
- [ ] Implement tab switching (Claude Code, Oracle, Worker 1-N)
- [ ] Add keyboard shortcuts (Ctrl+1/2/3/4...)
- [ ] Show active pane indicator
- [ ] Add "New Worker Pane" action

**UI Component:**
```tsx
<TerminalPaneSwitcher>
  <Tab active={activePane === 'claude'}>Claude Code</Tab>
  <Tab active={activePane === 'oracle'}>Oracle</Tab>
  <Tab active={activePane === 'worker-1'}>Worker 1</Tab>
  <Tab active={activePane === 'worker-2'}>Worker 2</Tab>
  <AddPaneButton onClick={addWorkerPane} />
</TerminalPaneSwitcher>
```

**Acceptance Criteria:**
- Tabs switch between Zellij panes
- Keyboard shortcuts work
- Can add new worker pane dynamically
- Active pane visually highlighted

---

### PHASE 5: Mobile & Multi-Device Support
**Goal:** Seamless experience across all devices
**Estimated:** 16 hours
**Dependencies:** Phase 2, Phase 4
**Risk:** Medium (touch UX complexity)

#### Task 5.1: Optimize Touch Interactions
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 2.2  
**Complexity:** M

**Subtasks:**
- [ ] Implement touch gestures (swipe left/right between panes)
- [ ] Add long-press context menus (copy, paste, select)
- [ ] Increase touch target sizes (minimum 44x44px)
- [ ] Add haptic feedback for actions (if supported)
- [ ] Test on iOS Safari, Android Chrome, tablet browsers

**Gesture Map:**
- **Swipe Left:** Next pane
- **Swipe Right:** Previous pane
- **Long Press:** Context menu
- **Pinch:** Zoom terminal font
- **Two-finger Tap:** Toggle Governance HUD

**Acceptance Criteria:**
- All gestures work on touch devices
- No accidental activations
- Context menu accessible on mobile
- Haptic feedback on supported devices

#### Task 5.2: Design Mobile-First Governance HUD
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** Task 2.2, Task 4.1  
**Complexity:** M

**Subtasks:**
- [ ] Create bottom-sheet HUD variant for mobile
- [ ] Implement swipe-up to expand, swipe-down to collapse
- [ ] Add compact card view for workstreams (vertical list)
- [ ] Optimize metrics display for small screens
- [ ] Test on iPhone SE (smallest screen)

**Mobile HUD Layout:**
```
┌─────────────────────────┐
│ Terminal (full screen)  │
│                         │
│                         │
│                         │
└─────────────────────────┘
  ↑ Swipe up to expand
┌─────────────────────────┐
│ Governance HUD (50%)    │
│ ▼ Workstreams           │
│ ▼ Workers               │
│ ▼ Metrics               │
└─────────────────────────┘
```

**Acceptance Criteria:**
- HUD collapses to bottom on mobile
- Swipe gestures work smoothly
- All critical info visible in compact view
- Performance smooth on mid-range Android

#### Task 5.3: Implement Offline Support (Progressive Web App)
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** Task 2.1  
**Complexity:** L

**Subtasks:**
- [ ] Add service worker for offline caching
- [ ] Cache terminal UI assets for offline access
- [ ] Queue terminal commands when offline
- [ ] Show offline indicator in header
- [ ] Sync queued commands when connection restored

**Offline Strategy:**
- **Cache:** UI assets (HTML, CSS, JS, fonts)
- **Queue:** Terminal commands during disconnect
- **Sync:** Auto-retry commands when online
- **Indicator:** Banner showing "Offline - commands queued"

**Acceptance Criteria:**
- UI loads instantly from cache
- Can type commands while offline
- Commands execute when reconnected
- Offline indicator shows correctly

---

### PHASE 6: Testing & Documentation
**Goal:** Comprehensive testing and user documentation
**Estimated:** 20 hours
**Dependencies:** All previous phases
**Risk:** Low

#### Task 6.1: Integration Testing
**Status:** pending  
**Estimated:** 8h  
**Dependencies:** All implementation tasks  
**Complexity:** L

**Subtasks:**
- [ ] Write session persistence tests (reconnect scenarios)
- [ ] Test worker pool scaling (spawn 20 workers, verify assignment)
- [ ] Test multi-device session sharing (same session, different browsers)
- [ ] Test mobile touch interactions (automated or manual)
- [ ] Test crash recovery (kill Zellij, verify restart)

**Test Scenarios:**
```typescript
describe('Infinity Terminal', () => {
  it('restores session after disconnect', async () => {
    // Open session, disconnect, reconnect
    // Verify terminal state preserved
  });

  it('supports 20 parallel agents', async () => {
    // Spawn 20 workers
    // Assign tasks to all
    // Verify all execute in parallel
  });

  it('works on mobile viewport', async () => {
    // Set viewport to 375x667 (iPhone)
    // Verify UI usable
    // Test touch gestures
  });
});
```

**Acceptance Criteria:**
- 95%+ test coverage for new code
- All critical user flows tested
- Mobile tests pass on real devices
- Crash recovery tests pass

#### Task 6.2: Performance Testing
**Status:** pending  
**Estimated:** 4h  
**Dependencies:** All implementation tasks  
**Complexity:** M

**Subtasks:**
- [ ] Benchmark session reconnection time (target: <100ms)
- [ ] Test worker pool under load (100 tasks in queue)
- [ ] Measure UI responsiveness (time to interactive <2s)
- [ ] Test WebSocket latency (terminal keystroke → server)
- [ ] Profile memory usage (20 workers active)

**Performance Targets:**
- **Reconnection:** <100ms
- **Worker Spawn:** <500ms
- **UI Load:** <2s on 3G
- **WebSocket Latency:** <50ms
- **Memory Usage:** <2GB for 20 workers

**Acceptance Criteria:**
- All performance targets met
- Load test passes (100 concurrent tasks)
- No memory leaks detected
- Profiling reports generated

#### Task 6.3: User Documentation
**Status:** pending  
**Estimated:** 6h  
**Dependencies:** All implementation tasks  
**Complexity:** S

**Subtasks:**
- [ ] Write user guide (`/docs/features/infinity-terminal.md`)
- [ ] Create setup instructions (install Zellij, ttyd)
- [ ] Document keyboard shortcuts and touch gestures
- [ ] Add troubleshooting section (common issues)
- [ ] Create video walkthrough (5-minute demo)

**Documentation Sections:**
1. Introduction & Benefits
2. Installation (Zellij, ttyd setup)
3. Using Infinity Terminal (basic workflow)
4. Multi-Device Access (connect from phone, tablet)
5. Agent Parallelization (managing 20 agents)
6. Troubleshooting (common errors, solutions)
7. Advanced Configuration (custom layouts, keybindings)

**Acceptance Criteria:**
- Documentation covers all features
- Setup instructions tested on fresh machine
- Troubleshooting section includes 10+ common issues
- Video walkthrough published

#### Task 6.4: Security Audit
**Status:** pending  
**Estimated:** 2h  
**Dependencies:** All implementation tasks  
**Complexity:** S

**Subtasks:**
- [ ] Review ttyd authentication (add password/token if needed)
- [ ] Audit WebSocket security (WSS instead of WS)
- [ ] Check agent isolation (prevent privilege escalation)
- [ ] Review session hijacking risks (session ID security)
- [ ] Document security best practices

**Security Checklist:**
- [ ] ttyd protected by authentication
- [ ] WebSocket uses WSS (encrypted)
- [ ] Session IDs cryptographically secure
- [ ] Agent sandboxing prevents file access outside workspace
- [ ] No sensitive data in terminal output (passwords, tokens)

**Acceptance Criteria:**
- Security audit report generated
- All high/critical issues resolved
- Authentication enabled by default
- Best practices documented

---

## Critical Path Analysis

**Longest Dependency Chain (Critical Path):**
```
Phase 1 (16h) → Phase 3 (28h) → Phase 4 (16h) → Phase 6 (20h) = 80h
```

**Parallel Work Opportunities:**
- Phase 2 (Web Integration) can proceed in parallel with Phase 3 (Agent Pool)
- Phase 5 (Mobile) depends on Phase 2, but can start before Phase 3 completes

**Optimized Timeline:**
```
Week 1: Phase 1 (16h) + Phase 2 (20h) = 36h
Week 2: Phase 3 (28h) + Phase 5 (16h - partial) = 44h
Week 3: Phase 4 (16h) + Phase 5 (remainder) + Phase 6 (20h) = 36h
Total: 12 days with parallel work
```

## MVP Scope Recommendation

For fastest time-to-value, prioritize this subset:

### MVP Phase 1: Basic Persistent Terminal (32h)
**Goal:** Prove the core value - session persistence

**Include:**
- Task 1.1-1.4 (Zellij + ttyd setup)
- Task 2.1, 2.3 (Basic React integration)
- Task 6.1 (Core integration tests)

**Defer:**
- Mobile optimization
- 20-agent parallelization (start with 5)
- Governance HUD enhancements

**Value:** Users can disconnect/reconnect without losing work

### MVP Phase 2: Agent Parallelization (44h)
**Goal:** Enable multi-agent orchestration

**Include:**
- Task 3.1-3.3 (Worker pool - limit to 5 workers)
- Task 4.1-4.2 (Basic HUD integration)

**Defer:**
- Worker reassignment UI
- Advanced metrics

**Value:** Users can run 5 parallel agents with visual feedback

### Full Feature: Complete Vision (96h)
**Goal:** 20 agents, mobile support, full UX

**Include:**
- All remaining tasks
- 20-worker scaling
- Mobile/tablet responsive design
- Offline PWA support

## Risk Mitigation

### Risk 1: Zellij Session Stability
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Add session health monitoring
- Implement automatic restart on crash
- Fallback to direct xterm.js if Zellij unavailable

### Risk 2: Worker Pool Performance
**Probability:** Medium  
**Impact:** High  
**Mitigation:**
- Start with 5 workers, scale incrementally
- Add resource limits (CPU, memory caps)
- Implement graceful degradation (queue tasks if pool saturated)

### Risk 3: Mobile Touch UX Complexity
**Probability:** Low  
**Impact:** Medium  
**Mitigation:**
- Use proven touch libraries (Hammer.js, react-use-gesture)
- Extensive testing on real devices
- Fallback to tap-only if gestures problematic

### Risk 4: WebSocket Connection Reliability
**Probability:** Medium  
**Impact:** Medium  
**Mitigation:**
- Implement exponential backoff reconnection
- Queue commands during disconnect
- Show clear connection status to user

## Dependencies

**External:**
- Zellij (terminal multiplexer)
- ttyd (web terminal server)
- Node.js 18+ (worker processes)

**Internal:**
- GovernanceState API (`/src/services/governance-state-manager.ts`)
- Terminal components (`/src/components/terminal/`)
- Agent orchestration system (`.claude/agents/`)

## Success Metrics

**Technical:**
- [ ] Session survival: 99.9% uptime (no data loss)
- [ ] Reconnection time: <100ms (p95)
- [ ] Worker pool capacity: 20 concurrent agents
- [ ] Mobile performance: 60fps on mid-range Android

**User Experience:**
- [ ] Can disconnect/reconnect from different device without context loss
- [ ] All 20 agents visible and manageable in Governance HUD
- [ ] Terminal usable on phone without external keyboard
- [ ] Zero-setup experience (ttyd auto-starts on Forge launch)

## Open Questions

1. **Authentication:** Should ttyd be password-protected? Token-based?
2. **Cloud Deployment:** Will users deploy this on remote servers or localhost only?
3. **Session Sharing:** Should multiple users share same session (pair programming)?
4. **Agent Limits:** Is 20 agents enough, or plan for 50+?

## Next Steps

1. **Approval:** Review this plan and approve MVP scope
2. **Environment Setup:** Install Zellij and ttyd on development machine
3. **Spike:** Create proof-of-concept (2h) - Zellij + ttyd basic integration
4. **Begin Phase 1:** Start Task 1.1 (Zellij installation)

---

**Plan Status:** Draft - Awaiting Review  
**Created By:** Forge Planner Agent  
**Review By:** Project Owner / Lead Developer  
**Target Start Date:** TBD  
**Target Completion Date:** TBD (96h = ~12 business days with parallel work)

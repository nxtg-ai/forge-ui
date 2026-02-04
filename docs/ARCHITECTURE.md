# NXTG-Forge v3 Architecture

**Version:** 3.0.0
**Last Updated:** 2026-02-03
**Status:** Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Agent Orchestration System](#agent-orchestration-system)
5. [Data Flow Patterns](#data-flow-patterns)
6. [State Management](#state-management)
7. [Infinity Terminal Architecture](#infinity-terminal-architecture)
8. [Monitoring & Observability](#monitoring--observability)
9. [Multi-Device Architecture](#multi-device-architecture)
10. [Security & Isolation](#security--isolation)

---

## System Overview

NXTG-Forge is an AI-orchestrated development system that coordinates 22 specialized agents for autonomous software development. The system is built on a real-time, event-driven architecture with persistent state management.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NXTG-Forge v3                             │
│                                                                   │
│  ┌───────────────┐         ┌──────────────┐         ┌─────────┐│
│  │   Frontend    │◄───────►│  API Server  │◄───────►│  Agent  ││
│  │   React 19    │         │   Express    │         │  Pool   ││
│  │   + Vite      │  HTTP   │  + WebSocket │  IPC    │ (1-20)  ││
│  │               │  WS     │              │         │         ││
│  └───────┬───────┘         └──────┬───────┘         └────┬────┘│
│          │                        │                      │     │
│          │                        │                      │     │
│  ┌───────▼───────┐         ┌──────▼───────┐         ┌────▼────┐│
│  │  xterm.js     │         │ PTY Bridge   │         │  State  ││
│  │  Terminal UI  │◄───────►│ WebSocket    │◄───────►│ Manager ││
│  │               │         │  + Sessions  │         │         ││
│  └───────────────┘         └──────────────┘         └─────────┘│
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Monitoring & Observability                    │  │
│  │  Health • Performance • Errors • Alerts • Diagnostics     │  │
│  │  Sentry Integration • Real-time Metrics                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 19 (with concurrent features)
- TypeScript 5.x (strict mode)
- Vite 6.x (dev server + bundler)
- xterm.js 5.x (terminal emulator)
- Framer Motion (animations)
- Lucide React (icons)
- TailwindCSS (styling)

**Backend:**
- Node.js 20+ (LTS)
- Express 4.x (HTTP server)
- WebSocket (ws library)
- node-pty (PTY sessions)
- Zod (runtime validation)
- simple-git (git operations)

**Monitoring:**
- Sentry (error tracking)
- Custom health monitoring
- Performance metrics
- Real-time diagnostics

**Agent System:**
- Worker pool (1-20 concurrent)
- Message-based IPC
- Resource isolation
- Task queue management

---

## Frontend Architecture

### Component Hierarchy

```
App (Root)
├── ErrorBoundary (Global error handling)
├── ProjectSwitcher (Multi-project support)
├── Navigation (Tab-based routing)
│
├── Pages (Route Views)
│   ├── DashboardLive           (/dashboard)
│   ├── VisionPage              (/vision)
│   ├── ArchitectPage           (/architect)
│   ├── CommandPage             (/command)
│   ├── InfinityTerminalView    (/terminal)
│   └── TerminalView            (/terminal-legacy)
│
├── Components (Feature Components)
│   ├── VisionCapture           (Vision input)
│   ├── ChiefOfStaffDashboard   (Execution oversight)
│   ├── ArchitectDiscussion     (Architecture decisions)
│   ├── CommandCenter           (Manual control)
│   ├── YoloMode                (Autonomous mode)
│   ├── ProjectsManagement      (Project CRUD)
│   │
│   ├── infinity-terminal/      (Persistent terminal)
│   │   ├── InfinityTerminal.tsx
│   │   ├── Panel.tsx
│   │   ├── hooks/
│   │   │   └── useSessionPersistence.ts
│   │   └── layout/
│   │
│   ├── real-time/              (Live updates)
│   │   └── LiveActivityFeed.tsx
│   │
│   ├── terminal/               (Terminal components)
│   ├── ui/                     (Shared UI primitives)
│   ├── governance/             (Approval flows)
│   └── feedback/               (User feedback)
│
└── Services (Business Logic)
    ├── api-client.ts           (HTTP/WS client)
    ├── activity-service.ts     (Agent activities)
    ├── automation-service.ts   (Automation engine)
    ├── command-service.ts      (Command execution)
    ├── vision-service.ts       (Vision management)
    ├── state-bridge.ts         (State synchronization)
    └── governance-state-manager.ts
```

### State Management Strategy

**1. Server State (Remote)**
- Managed by API server
- Accessed via `api-client.ts`
- Real-time sync via WebSocket
- Cached locally with React Query patterns

**2. UI State (Local)**
- React hooks (useState, useReducer)
- Context API for cross-cutting concerns
- Session storage for persistence
- URL state for navigation

**3. Custom Hooks**
```
useForgeIntegration    - Main integration hook
useVision              - Vision state management
useProjectState        - Project state sync
useAgentActivities     - Agent activity tracking
useCommandExecution    - Command execution
useRealtimeConnection  - WebSocket connection
useKeyboardShortcuts   - Keyboard navigation
useAutomation          - Automation control
```

### Routing System

Tab-based navigation with programmatic routing:

```
/dashboard      → Live agent activity dashboard
/vision         → Vision capture and display
/architect      → Architecture decision system
/command        → Manual command center
/terminal       → Infinity Terminal (persistent sessions)
/terminal-legacy → Legacy terminal view
```

### Real-Time Updates

WebSocket connection lifecycle:

```
┌──────────┐                    ┌──────────┐
│ Frontend │                    │  Server  │
└────┬─────┘                    └────┬─────┘
     │                               │
     │ ws://host:5050/ws (connect)   │
     ├──────────────────────────────►│
     │                               │
     │◄─────── connected ────────────┤
     │                               │
     │◄───── activity:update ────────┤
     │◄───── state:change ───────────┤
     │◄───── vision:approved ────────┤
     │                               │
     │ ping (every 30s)              │
     ├──────────────────────────────►│
     │◄────── pong ──────────────────┤
     │                               │
```

---

## Backend Architecture

### API Server Structure

File: `/src/server/api-server.ts`

```
Express App
├── Middleware Chain
│   ├── Sentry initialization
│   ├── CORS (multi-device support)
│   ├── JSON body parser (10MB limit)
│   ├── Request logging
│   └── Error handling
│
├── HTTP Endpoints
│   ├── /health                 GET  - Health check
│   ├── /api/state              GET  - System state
│   ├── /api/state/vision       GET  - Vision state
│   ├── /api/state/projects     GET  - Project list
│   ├── /api/activities         GET  - Agent activities
│   ├── /api/commands           POST - Execute command
│   ├── /api/automation/enable  POST - Enable automation
│   ├── /api/automation/disable POST - Disable automation
│   ├── /api/decisions          GET  - Architecture decisions
│   ├── /api/decisions/approve  POST - Approve decision
│   ├── /api/decisions/reject   POST - Reject decision
│   └── /api-docs               GET  - Swagger UI
│
├── WebSocket Server (port 5051)
│   ├── Connection management
│   ├── Event broadcasting
│   ├── Heartbeat/ping-pong
│   └── Client state sync
│
└── PTY Bridge (port 5051)
    ├── /terminal endpoint (upgrade)
    ├── Session management
    ├── PTY lifecycle
    └── Scrollback buffer
```

### Core Services

**1. Orchestrator** (`src/core/orchestrator.ts`)
```
ForgeOrchestrator
├── Task execution (4 patterns)
│   ├── Sequential
│   ├── Parallel
│   ├── Iterative
│   └── Hierarchical
├── Agent coordination
├── Dependency resolution
├── Progress tracking
└── Error recovery
```

**2. State Manager** (`src/core/state.ts`)
```
StateManager
├── State persistence (.claude/state/)
│   ├── current.json
│   ├── backup.json
│   ├── events.json
│   └── graph.json
├── Event sourcing
├── Context graph
├── Checkpoint system
└── Recovery mechanisms
```

**3. Vision System** (`src/core/vision.ts`)
```
VisionSystem
├── Canonical vision management
├── Strategy selection
├── Decision tracking
├── Approval workflow
└── Vision evolution
```

**4. Coordination Service** (`src/core/coordination.ts`)
```
AgentCoordinationProtocol
├── Inter-agent messaging
├── Sign-off requests
├── Activity tracking
├── Approval queue
└── Event broadcasting
```

**5. Bootstrap Service** (`src/core/bootstrap.ts`)
```
BootstrapService
├── Project initialization
├── Git repository setup
├── Dependency installation
├── Configuration validation
└── Self-healing checks
```

**6. Runspace Manager** (`src/core/runspace-manager.ts`)
```
RunspaceManager
├── Project isolation
├── Environment management
├── Backend abstraction (WSL)
├── Resource limits
└── Cleanup policies
```

---

## Agent Orchestration System

### Agent Ecosystem

NXTG-Forge coordinates **22 specialized agents** across 5 categories:

**1. Governance Agents (2)**
- `[NXTG-CEO]-LOOP.md` - Strategic oversight and vision alignment
- `[AFRG]-governance-verifier.md` - Policy compliance and approval gates

**2. Planning Agents (3)**
- `[AFRG]-planner.md` - Project planning and task breakdown
- `[AFRG]-orchestrator.md` - Agent coordination and workflow
- `forge-oracle.md` - Strategic guidance and decision support

**3. Implementation Agents (8)**
- `[AFRG]-builder.md` - Code generation and implementation
- `[AFRG]-refactor.md` - Code refactoring and optimization
- `[AFRG]-testing.md` - Test generation and quality assurance
- `[AFRG]-ui.md` - UI/UX development
- `[AFRG]-api.md` - API development and integration
- `[AFRG]-database.md` - Data modeling and database operations
- `[AFRG]-docs.md` - Documentation generation
- `[AFRG]-devops.md` - Infrastructure and deployment

**4. Quality Assurance Agents (5)**
- `[AFRG]-detective.md` - Bug investigation and debugging
- `[AFRG]-guardian.md` - Security auditing and compliance
- `[AFRG]-security.md` - Security implementation
- `[AFRG]-performance.md` - Performance optimization
- `[AFRG]-release-sentinel.md` - Release validation and quality gates

**5. Operational Agents (4)**
- `[AFRG]-analytics.md` - Usage analytics and insights
- `[AFRG]-integration.md` - Third-party integrations
- `[AFRG]-learning.md` - Pattern learning and adaptation
- `[AFRG]-compliance.md` - Regulatory compliance

### Agent Worker Pool Architecture

File: `/src/server/workers/`

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentWorkerPool                           │
│                                                               │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐       │
│  │  Worker 1  │     │  Worker 2  │ ... │  Worker N  │       │
│  │  (Idle)    │     │  (Busy)    │     │  (Idle)    │       │
│  └─────┬──────┘     └─────┬──────┘     └─────┬──────┘       │
│        │                  │                  │               │
│  ┌─────▼──────────────────▼──────────────────▼──────┐        │
│  │              Task Queue (Priority)                │        │
│  │  High: [Task A] [Task B]                          │        │
│  │  Med:  [Task C] [Task D] [Task E]                 │        │
│  │  Low:  [Task F]                                   │        │
│  └───────────────────────────────────────────────────┘        │
│                                                               │
│  Pool Config:                                                 │
│  - minWorkers: 1                                              │
│  - maxWorkers: 20                                             │
│  - taskTimeout: 300000ms (5 min)                              │
│  - retryAttempts: 3                                           │
│  - resourceLimits: { cpu: 80%, memory: 2GB }                  │
└─────────────────────────────────────────────────────────────┘
```

### Agent Communication Protocol

File: `/src/server/agent-protocol.ts`

```
Message Types:
┌─────────────┬──────────────────────────────────────┐
│ Type        │ Purpose                              │
├─────────────┼──────────────────────────────────────┤
│ REQUEST     │ Agent requests action from another   │
│ RESPONSE    │ Reply to a request                   │
│ NOTIFICATION│ One-way update notification          │
│ SIGN_OFF    │ Request approval/validation          │
│ ESCALATION  │ Escalate to higher authority         │
│ BROADCAST   │ Send to all agents                   │
└─────────────┴──────────────────────────────────────┘

Message Flow Example:

Builder Agent                  Guardian Agent
     │                              │
     │ ───── SIGN_OFF ────────────► │
     │   (code review request)      │
     │                              │
     │                         (analyze)
     │                              │
     │ ◄──── RESPONSE ────────────  │
     │   (approved/rejected)        │
     │                              │
```

### Agent Capabilities

Each agent has specific capabilities mapped to execution contexts:

```
Agent Capability Matrix:

┌─────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Agent       │Plan  │Arch  │Code  │Test  │Deploy│Review│
├─────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Planner     │  ✓   │  ✓   │      │      │      │  ✓   │
│ Builder     │      │  ✓   │  ✓   │      │      │      │
│ Testing     │      │      │      │  ✓   │      │  ✓   │
│ Guardian    │      │  ✓   │      │      │      │  ✓   │
│ DevOps      │      │      │      │      │  ✓   │      │
│ Detective   │      │      │  ✓   │  ✓   │      │  ✓   │
└─────────────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

## Data Flow Patterns

### User Action → Agent Execution

```
User Interaction Flow:

┌─────────┐
│  User   │
└────┬────┘
     │ (1) Captures vision
     │
┌────▼──────────────┐
│  VisionCapture    │
│  Component        │
└────┬──────────────┘
     │ (2) POST /api/state/vision
     │
┌────▼──────────────┐
│  API Server       │
│  api-server.ts    │
└────┬──────────────┘
     │ (3) VisionSystem.updateVision()
     │
┌────▼──────────────┐
│  Vision System    │
│  vision.ts        │
└────┬──────────────┘
     │ (4) Emit 'vision:updated'
     │
┌────▼──────────────┐
│  Orchestrator     │
│  orchestrator.ts  │
└────┬──────────────┘
     │ (5) Create task
     │
┌────▼──────────────┐
│  Agent Worker     │
│  Pool             │
└────┬──────────────┘
     │ (6) Assign to worker
     │
┌────▼──────────────┐
│  Agent Worker     │
│  (Builder)        │
└────┬──────────────┘
     │ (7) Execute task
     │
┌────▼──────────────┐
│  State Manager    │
│  state.ts         │
└────┬──────────────┘
     │ (8) Update state
     │
┌────▼──────────────┐
│  WebSocket        │
│  Broadcast        │
└────┬──────────────┘
     │ (9) 'activity:update'
     │
┌────▼──────────────┐
│  Frontend         │
│  useRealtimeConn  │
└────┬──────────────┘
     │ (10) Update UI
     │
┌────▼──────────────┐
│  Dashboard        │
│  Component        │
└───────────────────┘
```

### Real-Time State Synchronization

```
State Sync Pattern:

Backend                         Frontend
┌──────────┐                  ┌──────────┐
│  State   │                  │  React   │
│  Manager │                  │  State   │
└────┬─────┘                  └────┬─────┘
     │                             │
     │ (state change detected)     │
     │                             │
     ├──► Emit event               │
     │                             │
     ├──► WebSocket broadcast      │
     │    {                        │
     │      type: 'state:change',  │
     │      data: {...}            │
     │    }                        │
     │                             │
     │    ─────────────────────────►
     │                             │
     │                        (receive WS)
     │                             │
     │                    Update local state
     │                             │
     │                    Trigger re-render
     │                             │
```

### Terminal I/O Flow

```
Terminal Data Flow:

Browser                PTY Bridge           Shell Process
┌────────┐           ┌────────┐           ┌────────┐
│ xterm  │           │  WS    │           │  bash  │
│  .js   │           │ Server │           │  PTY   │
└───┬────┘           └───┬────┘           └───┬────┘
    │                    │                    │
    │ (user types)       │                    │
    │  "ls -la"          │                    │
    ├────────────────────►                    │
    │   WebSocket        │                    │
    │                    │                    │
    │                    ├────────────────────►
    │                    │  pty.write("ls...")│
    │                    │                    │
    │                    │               (execute)
    │                    │                    │
    │                    │◄───────────────────┤
    │                    │  pty.onData(data)  │
    │                    │                    │
    │◄───────────────────┤                    │
    │   WebSocket        │                    │
    │   {output}         │                    │
    │                    │                    │
   (render)              │                    │
    │                    │                    │
```

---

## State Management

### State Persistence Structure

```
.claude/state/
├── current.json          # Current system state
├── backup.json           # Previous state (rollback)
├── events.json           # Event sourcing log
└── graph.json            # Context relationship graph

State Schema:
{
  "vision": {
    "canonical": {...},      // Approved vision
    "proposed": {...},       // Pending changes
    "history": [...]         // Vision evolution
  },
  "tasks": {
    "active": [...],         // Running tasks
    "pending": [...],        // Queued tasks
    "completed": [...]       // Finished tasks
  },
  "agents": {
    "active": [...],         // Active agents
    "states": {...}          // Agent-specific state
  },
  "context": {
    "graph": {...},          // Relationship graph
    "decisions": [...],      // Architecture decisions
    "artifacts": [...]       // Generated artifacts
  }
}
```

### Checkpoint System

File: `/src/core/checkpoint-manager.ts`

```
Checkpoint Lifecycle:

Task Start
    │
    ├──► Create checkpoint
    │       - Task metadata
    │       - Initial state
    │       - Dependencies
    │
Task Execution
    │
    ├──► Progress updates
    │       - Incremental saves
    │       - Artifact tracking
    │
Task Complete
    │
    ├──► Finalize checkpoint
    │       - Mark complete
    │       - Validate outputs
    │       - Archive artifacts
    │
    └──► Cleanup
            - Remove temp files
            - Release resources
```

### Recovery Mechanisms

```
Error Recovery Flow:

Task Fails
    │
    ├──► Determine cause
    │       - Timeout?
    │       - Exception?
    │       - Resource limit?
    │
    ├──► Check retry policy
    │       - Attempts remaining?
    │       - Backoff delay?
    │
    ├──► Restore checkpoint
    │       - Load last good state
    │       - Reset agent state
    │
    ├──► Retry task
    │       - Exponential backoff
    │       - Same agent or new?
    │
    └──► Escalate if max retries
            - Notify orchestrator
            - Human intervention
```

---

## Infinity Terminal Architecture

### Session Persistence System

**CRITICAL: Built-in persistence, Zellij is optional.**

The Infinity Terminal has native session persistence without requiring Zellij. This is the "Infinity" in its name.

```
Architecture:

┌──────────────────────────────────────────────────────────┐
│                  Browser (Client)                         │
│                                                            │
│  ┌──────────────┐                                         │
│  │  xterm.js    │  Terminal Emulator                      │
│  │  + FitAddon  │  - Renders terminal output              │
│  │  + WebLinks  │  - Handles keyboard input               │
│  └──────┬───────┘  - Manages display buffer               │
│         │                                                  │
│  ┌──────▼────────────────────────────────────┐            │
│  │  useSessionPersistence Hook               │            │
│  │  - Generates/restores session ID          │            │
│  │  - Saves to localStorage                  │            │
│  │  - Auto-reconnect logic                   │            │
│  │  - Exponential backoff (500ms → 8s)       │            │
│  └──────┬────────────────────────────────────┘            │
│         │                                                  │
│         │  WebSocket (/terminal?sessionId=...)            │
│         │                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│                API Server (PTY Bridge)                      │
│                                                             │
│  ┌───────────────────────────────────────────┐             │
│  │  Session Manager (Map<sessionId, session>)│             │
│  │                                            │             │
│  │  session = {                               │             │
│  │    runspaceId: "project-xyz",              │             │
│  │    sessionId: "abc123",                    │             │
│  │    ws: WebSocket | null,                   │             │
│  │    pty: { ... },                           │             │
│  │    scrollbackBuffer: [...],                │             │
│  │    cleanupTimer: setTimeout()              │             │
│  │  }                                         │             │
│  └───────┬───────────────────────────────────┘             │
│          │                                                  │
│  ┌───────▼────────────────────────┐                        │
│  │  PTY Process (node-pty)        │                        │
│  │  - Spawns shell (bash/zsh)     │                        │
│  │  - Manages I/O                 │                        │
│  │  - Keeps 100KB scrollback      │                        │
│  │  - Survives disconnects (5min) │                        │
│  └───────┬────────────────────────┘                        │
│          │                                                  │
└──────────┼──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                    Shell (bash/zsh)                          │
│  - Working directory preserved                               │
│  - Environment variables maintained                          │
│  - Running processes continue                                │
└──────────────────────────────────────────────────────────────┘
```

### Key Features

**1. Session Persistence**
- Sessions survive browser close/reopen
- Sessions survive network disconnects
- Sessions survive server restarts (with runspace persistence)
- 5-minute keepalive after disconnect

**2. Multi-Device Access**
- Multiple browsers can connect to same session
- Last-write-wins for input
- All clients receive output
- Session ID shared via localStorage or URL

**3. Auto-Reconnection**
- Exponential backoff: 500ms, 1s, 2s, 4s, 8s
- Visual connection status indicators
- Automatic resume on reconnect
- Scrollback buffer restoration

**4. Zellij Integration (Optional)**
- Zellij can be launched within a session
- Provides multiplexing, layouts, tabs
- Enhances but is NOT required
- User choice, not system dependency

### Connection States

```
States:

connecting       Initial WebSocket handshake
    │
    ├──► connected    Active bidirectional communication
    │   │
    │   ├──► disconnected  Network interruption
    │   │       │
    │   │       └──► reconnecting  Attempting to restore
    │   │               │
    │   │               └──► (back to connected or error)
    │   │
    │   └──► error     Fatal connection failure
    │
    └──► error        Initial connection failed
```

---

## Monitoring & Observability

### Monitoring System Architecture

File: `/src/monitoring/index.ts`

```
┌──────────────────────────────────────────────────────────┐
│              Monitoring System (Unified)                  │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Health     │  │ Performance  │  │    Error     │   │
│  │   Monitor    │  │   Monitor    │  │   Tracker    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │            │
│         └─────────────────┼──────────────────┘            │
│                           │                               │
│  ┌────────────────────────▼──────────────────────────┐   │
│  │            Alerting System                        │   │
│  │  - Email alerts                                   │   │
│  │  - Slack webhooks                                 │   │
│  │  - PagerDuty integration                          │   │
│  └────────────────────────┬──────────────────────────┘   │
│                           │                               │
│  ┌────────────────────────▼──────────────────────────┐   │
│  │         Sentry Integration                        │   │
│  │  - Error capture                                  │   │
│  │  - Performance traces                             │   │
│  │  - User context                                   │   │
│  │  - Release tracking                               │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Health Check System

```
Health Dimensions:

┌─────────────┬────────────────────────────────────┐
│ Dimension   │ Checks                             │
├─────────────┼────────────────────────────────────┤
│ System      │ CPU, Memory, Disk, Network         │
│ Service     │ API server, WebSocket, PTY         │
│ Database    │ Connections, Query latency         │
│ External    │ Git, npm, Claude API               │
│ Agent Pool  │ Worker health, Queue depth         │
└─────────────┴────────────────────────────────────┘

Health Status:
- healthy      All checks pass
- degraded     Some non-critical checks fail
- unhealthy    Critical checks fail
- unknown      Cannot determine state
```

### Performance Metrics

```
Tracked Metrics:

API Server:
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

Agent Pool:
- Tasks queued
- Tasks in progress
- Task completion rate
- Average task duration

Terminal:
- Active sessions
- Data throughput (bytes/s)
- Reconnection rate

Memory:
- Heap used/total
- External memory
- RSS (Resident Set Size)
```

### Error Tracking (Sentry)

```
Sentry Integration:

Browser:
- JavaScript errors
- Unhandled promise rejections
- React component errors
- Performance traces

Server:
- Uncaught exceptions
- API errors
- Agent failures
- System errors

Context Captured:
- User ID / session
- Project context
- Agent execution state
- Request/response details
- Environment info
```

---

## Multi-Device Architecture

### Network Topology

```
Multi-Device Access via Vite Proxy:

┌─────────────┐
│   Desktop   │                    ┌──────────────┐
│  (WSL2)     │                    │  Vite Dev    │
│             │◄──────────────────►│  Server      │
│ localhost   │  http://localhost  │  :5050       │
└─────────────┘      :5050         └──────┬───────┘
                                          │
┌─────────────┐                           │ Proxy:
│   Tablet    │                           │ /api → :5051
│             │◄──────────────────────────┤ /ws  → :5051
│ 192.168.x.x │  http://192.168.1.206     │ /terminal → :5051
└─────────────┘      :5050                │
                                          │
┌─────────────┐                           │
│   Phone     │                           │
│             │◄──────────────────────────┤
│ 192.168.x.x │  http://192.168.1.206     │
└─────────────┘      :5050                │
                                    ┌─────▼─────┐
                                    │  API      │
                                    │  Server   │
                                    │  :5051    │
                                    └───────────┘
```

### Vite Proxy Configuration

File: `vite.config.ts`

```typescript
proxy: {
  '/api': 'http://localhost:5051',
  '/ws': {
    target: 'ws://localhost:5051',
    ws: true
  },
  '/terminal': {
    target: 'ws://localhost:5051',
    ws: true
  }
}
```

### Port Assignments

```
┌──────┬─────────────────────┬──────────┬─────────────┐
│ Port │ Service             │ Binding  │ Protocol    │
├──────┼─────────────────────┼──────────┼─────────────┤
│ 5050 │ Vite Dev UI         │ 0.0.0.0  │ HTTP        │
│ 5051 │ API + WebSocket     │ 0.0.0.0  │ HTTP/WS     │
│ 5173 │ Vite (alternate)    │ 0.0.0.0  │ HTTP        │
│ 8003 │ Reserved            │ 0.0.0.0  │ HTTP        │
└──────┴─────────────────────┴──────────┴─────────────┘

WSL2 Specific:
- Windows firewall rules required for cross-device access
- IP forwarding configured for 0.0.0.0 binding
```

### Environment Configuration

**CRITICAL: NO hardcoded URLs in .env**

```bash
# ❌ WRONG - breaks multi-device access
VITE_API_URL=http://localhost:5051
VITE_WS_URL=ws://localhost:5051

# ✅ RIGHT - let proxy handle it
# .env is empty or uses relative paths
```

Client code uses relative URLs:
```typescript
// src/services/api-client.ts
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) return '/api';  // Vite proxy
  return `http://${window.location.hostname}:5051/api`;
};
```

---

## Security & Isolation

### Runspace Isolation

```
Runspace Model:

Project A                  Project B
┌────────────┐            ┌────────────┐
│ Runspace A │            │ Runspace B │
│            │            │            │
│ /path/a    │            │ /path/b    │
│ env_a      │            │ env_b      │
│ git_a      │            │ git_b      │
└────────────┘            └────────────┘
     │                         │
     └─────────┬───────────────┘
               │
     ┌─────────▼─────────┐
     │  Runspace Manager │
     │  - Isolation      │
     │  - Resources      │
     │  - Cleanup        │
     └───────────────────┘
```

### Resource Limits

```
Agent Worker Constraints:

Memory:     2GB per worker
CPU:        80% max utilization
Disk:       Quota per runspace
Timeout:    5 minutes per task
Retries:    3 attempts with backoff

Blocked Commands:
- rm -rf /
- dd if=/dev/zero
- fork bombs
- network scans
```

### Access Control

```
Permission Model:

User Actions:
- Vision approval       → Explicit confirmation
- Architecture decision → Review required
- Automation enable     → Manual toggle
- Command execution     → Audit logged

Agent Actions:
- File operations       → Sandboxed to runspace
- Network access        → Whitelisted domains
- System calls          → Restricted set
- Git operations        → Validated commits
```

---

## Deployment Architecture

### Production Topology

```
Production Environment:

┌─────────────────────────────────────────────────────┐
│                  Load Balancer                       │
│                  (nginx/caddy)                       │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼────┐
│ API    │      │  API    │
│ Server │      │  Server │
│ Node 1 │      │  Node 2 │
└───┬────┘      └────┬────┘
    │                │
    └────────┬───────┘
             │
    ┌────────▼─────────┐
    │  Shared Storage  │
    │  - State files   │
    │  - Artifacts     │
    │  - Checkpoints   │
    └──────────────────┘
```

### Build Process

```
Build Pipeline:

Source Code
    │
    ├──► TypeScript Compilation
    │       tsc -p tsconfig.server.json
    │       → dist/server/
    │
    ├──► Vite Build
    │       vite build
    │       → dist-ui/
    │
    ├──► Asset Optimization
    │       - JS minification
    │       - CSS extraction
    │       - Source maps
    │
    └──► Distribution Package
            ├── dist/server/api-server.js
            ├── dist-ui/index.html
            └── dist-ui/assets/
```

---

## Appendix: File Structure

```
NXTG-Forge/v3/
├── .claude/
│   ├── agents/              # 22 agent definitions
│   ├── plans/               # Implementation plans
│   ├── skills/              # Agent skills/capabilities
│   └── state/               # State persistence
│
├── src/
│   ├── components/          # React components
│   │   ├── infinity-terminal/
│   │   ├── real-time/
│   │   ├── terminal/
│   │   └── ui/
│   │
│   ├── core/                # Core systems
│   │   ├── orchestrator.ts
│   │   ├── state.ts
│   │   ├── vision.ts
│   │   ├── coordination.ts
│   │   ├── bootstrap.ts
│   │   ├── checkpoint-manager.ts
│   │   └── runspace-manager.ts
│   │
│   ├── server/              # Backend
│   │   ├── api-server.ts
│   │   ├── pty-bridge.ts
│   │   ├── agent-protocol.ts
│   │   └── workers/
│   │
│   ├── services/            # Business logic
│   │   ├── api-client.ts
│   │   ├── activity-service.ts
│   │   ├── automation-service.ts
│   │   └── command-service.ts
│   │
│   ├── hooks/               # React hooks
│   ├── pages/               # Route views
│   ├── monitoring/          # Observability
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # This file
│   ├── API.md
│   ├── infinity-terminal/
│   └── components/
│
├── scripts/                 # Build/dev scripts
├── dist/                    # Compiled server
└── dist-ui/                 # Compiled UI
```

---

## Summary

NXTG-Forge v3 is a production-ready AI orchestration platform featuring:

- **Real-time architecture** with WebSocket state sync
- **22 specialized agents** coordinated via worker pool
- **Persistent terminal sessions** with auto-reconnect
- **Multi-device support** via Vite proxy
- **Comprehensive monitoring** with Sentry integration
- **State management** with checkpoints and recovery
- **Project isolation** via runspace management
- **Event-driven coordination** with pub/sub messaging

The system is designed for high reliability, observability, and developer experience, with built-in error recovery and comprehensive monitoring.

---

**Last Updated:** 2026-02-03
**Version:** 3.0.0
**Status:** Production

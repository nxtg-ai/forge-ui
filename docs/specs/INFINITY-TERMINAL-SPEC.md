# Infinity Terminal - Technical Specification

**Version:** 1.0.0
**Status:** APPROVED
**Date:** 2026-01-30
**Author:** NXTG-Forge Team (5-Agent Collaborative Analysis)
**Branch:** `feature/terminal-persistent-enhancement`

---

## Executive Summary

The **Infinity Terminal** transforms NXTG-Forge into a persistent, multi-device development environment supporting **20 parallel AI agents** with seamless session continuity. Users can disconnect from any device and reconnect from another without losing work - making agent orchestration truly autonomous.

### Key Metrics

| Metric | Target |
|--------|--------|
| Total Effort | 96 hours (12 business days) |
| Complexity | XL |
| Codebase Health | 85/100 (ready for integration) |
| Security Risk | CRITICAL (requires mitigation before deployment) |
| MVP Timeline | 32-44 hours (5-day sprint) |

---

## 1. Problem Statement

### Current Limitations

1. **Ephemeral Sessions**: Browser refresh kills the session
2. **Device Tethering**: Cannot start work on desktop, monitor on mobile
3. **Agent Fragility**: 4-hour builds die if laptop closes
4. **No Collaboration**: Session sharing requires screen sharing

### Impact

- Violates "Autonomous by Default" principle
- Limits real-world usability of multi-agent orchestration
- Forces developers to babysit long-running agent tasks

---

## 2. Solution Architecture

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Session Manager | **Zellij** (Rust) | Persistent terminal multiplexer |
| Web Bridge | **ttyd** (C++) | WebSocket-to-terminal streaming |
| Frontend | React + xterm.js | Terminal rendering |
| State | governance.json | Agent orchestration state |
| Backend | Node.js + Express | API + WebSocket server |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT DEVICES                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ Desktop  │   │  Tablet  │   │  Mobile  │   │  Remote  │            │
│  │  (xl+)   │   │ (md-lg)  │   │  (xs-sm) │   │  Server  │            │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘            │
│       │              │              │              │                    │
│       └──────────────┴──────────────┴──────────────┘                    │
│                              │                                          │
│                    HTTPS/WebSocket (TLS)                                │
│                              │                                          │
├──────────────────────────────┼──────────────────────────────────────────┤
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    ttyd (Port 7681)                               │ │
│  │                    "The WebSocket Bridge"                         │ │
│  │  - Authentication: JWT tokens                                     │ │
│  │  - Encryption: TLS 1.3                                           │ │
│  │  - Rate limiting: 100 req/min                                    │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                 Zellij Session: "forge-{projectId}"               │ │
│  │                 "The Persistence Layer"                           │ │
│  │                                                                   │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐ │ │
│  │  │   PANE 1: 70%   │ │   PANE 2: 15%   │ │    PANE 3: 15%      │ │ │
│  │  │                 │ │                 │ │                     │ │ │
│  │  │  Claude Code    │ │    Oracle       │ │   Governance HUD    │ │ │
│  │  │  Terminal       │ │    Monitor      │ │   (TUI)             │ │ │
│  │  │                 │ │                 │ │                     │ │ │
│  │  │  [Agent 1-20]   │ │  watch -n1      │ │  - Strategic Advisor│ │ │
│  │  │  Worker Pool    │ │  governance.json│ │  - Impact Matrix    │ │ │
│  │  │                 │ │                 │ │  - Agent Status     │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│                         NXTG-FORGE SERVER                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

```
1. User opens browser → React loads InfinityTerminal component
2. Component requests session → API checks for existing Zellij session
3. If exists → ttyd attaches to session
4. If not → Zellij creates session, ttyd attaches
5. User types → WebSocket sends to ttyd → ttyd writes to Zellij → PTY executes
6. Output flows back → Zellij → ttyd → WebSocket → xterm.js renders
7. User closes browser → Session persists in Zellij
8. User reopens (any device) → Attaches to same session, full history preserved
```

---

## 3. Integration Points

### 3.1 Backend Integration

| File | Lines | Changes Required |
|------|-------|------------------|
| `src/server/api-server.ts` | 1148-1163 | Add Infinity Terminal endpoints |
| `src/server/pty-bridge.ts` | 46, 79-89, 134-154 | Route to Zellij sessions |
| `src/core/runspace-manager.ts` | 87-102, 330-360 | Add session pool management |
| `src/core/backends/wsl-backend.ts` | 86-133, 154-193 | Zellij spawn support |

### 3.2 Frontend Integration

| File | Changes Required |
|------|------------------|
| `src/pages/terminal-view.tsx` | Add session tabs, pass sessionId props |
| `src/components/terminal/ClaudeTerminal.tsx` | Dynamic WebSocket URL with session routing |
| NEW: `src/components/infinity-terminal/*` | Full component suite (see Section 5) |

### 3.3 Configuration Files

| File | Purpose |
|------|---------|
| `.claude/infinity-terminal.yaml` | Runtime configuration |
| `layouts/forge-default.kdl` | Zellij layout definition |
| `.claude/governance.json` | Existing - watched by Oracle pane |

---

## 4. Security Requirements

### 4.1 Critical Vulnerabilities to Address

| Vulnerability | CVSS | Mitigation |
|--------------|------|------------|
| **Remote Code Execution** | 10.0 | Bind ttyd to localhost, require auth |
| **Session Hijacking** | 8.1 | JWT tokens, secure session IDs, TLS |
| **Data Exfiltration** | 8.6 | Audit logging, sandboxed agents |
| **Privilege Escalation** | 7.8 | Agent permission boundaries |
| **DoS** | 6.5 | Rate limiting, resource quotas |

### 4.2 Required Security Controls

```yaml
# .claude/infinity-terminal.yaml
security:
  authentication:
    type: jwt
    token_expiry: 24h
    refresh_enabled: true

  network:
    bind_interface: "127.0.0.1"  # CRITICAL: Never expose externally
    allowed_origins:
      - "http://localhost:5050"
      - "https://forge.internal"
    rate_limit: 100  # requests per minute

  session:
    id_length: 32  # cryptographically secure
    expiry: 24h
    max_concurrent: 5

  agent:
    sandboxed: true
    env_whitelist:
      - "PATH"
      - "HOME"
      - "FORGE_*"
    blocked_commands:
      - "rm -rf /"
      - ":(){ :|:& };:"
    resource_limits:
      memory_mb: 512
      cpu_percent: 25
```

### 4.3 Deployment Checklist

- [ ] ttyd bound to localhost only
- [ ] JWT authentication enabled
- [ ] TLS 1.3 configured
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Agent sandboxing tested
- [ ] Security scan passed

---

## 5. UI/UX Specification

### 5.1 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile (xs) | <640px | Single-pane stacked + carousel |
| Mobile (sm) | 640-767px | Single-pane with drawer |
| Tablet (md) | 768-1023px | Two-pane split |
| Tablet (lg) | 1024-1279px | Three-pane collapsible |
| Desktop (xl) | 1280-1535px | Full multi-pane |
| Large (2xl) | >=1536px | Expanded with agent grid |

### 5.2 Desktop Layout (xl+)

```
┌──────────────┬──────────────────────────┬────────────────┐
│  LEFT SIDEBAR│       MAIN TERMINAL      │ GOVERNANCE HUD │
│   (240px)    │       (flexible)         │    (384px)     │
│              │                          │                │
│  Agent Grid  │  ┌────────────────────┐  │  Strategic     │
│  (4x5 layout)│  │  Claude Code       │  │  Advisor       │
│              │  │  Terminal          │  │                │
│  Session     │  └────────────────────┘  │  Constitution  │
│  Indicator   │  ┌────────────────────┐  │  Card          │
│              │  │  Oracle Output     │  │                │
│  Quick       │  └────────────────────┘  │  Impact Matrix │
│  Actions     │                          │                │
│              │                          │  Oracle Feed   │
└──────────────┴──────────────────────────┴────────────────┘
```

### 5.3 Mobile Layout (xs-sm)

```
┌─────────────────────────────────┐
│  SESSION BAR (sticky)           │
│  [Agents: 12/20] [Health: 94%]  │
├─────────────────────────────────┤
│                                 │
│  AGENT CAROUSEL                 │
│  [ < Swipeable Agent Cards > ]  │
│                                 │
├─────────────────────────────────┤
│  ALERT FEED                     │
│  (Critical events only)         │
├─────────────────────────────────┤
│                    [FAB +]      │
└─────────────────────────────────┘
```

### 5.4 Component Architecture

```
src/components/infinity-terminal/
├── layout/
│   ├── InfinityTerminalLayout.tsx
│   ├── DesktopLayout.tsx
│   ├── TabletLayout.tsx
│   └── MobileMonitoringView.tsx
├── agents/
│   ├── AgentGrid.tsx           # Desktop 4x5 grid
│   ├── AgentStrip.tsx          # Tablet horizontal strip
│   ├── AgentCarousel.tsx       # Mobile swipe carousel
│   ├── AgentCard.tsx           # Shared card component
│   └── AgentDetailPanel.tsx    # Expanded agent view
├── session/
│   ├── SessionStatusBar.tsx    # Mobile session header
│   └── SessionPersistenceIndicator.tsx
├── actions/
│   ├── QuickActionFAB.tsx      # Mobile floating action
│   └── CommandPalette.tsx      # Desktop command palette
└── hooks/
    ├── useResponsiveLayout.ts
    ├── useAgentStatus.ts
    ├── useSessionPersistence.ts
    └── usePanelGestures.ts
```

### 5.5 Agent Status Colors

```typescript
const agentStatusColors = {
  working:    { light: '#4ade80', default: '#22c55e', dark: '#166534' },
  thinking:   { light: '#facc15', default: '#eab308', dark: '#854d0e' },
  blocked:    { light: '#f87171', default: '#ef4444', dark: '#991b1b' },
  discussing: { light: '#60a5fa', default: '#3b82f6', dark: '#1e40af' },
  idle:       { light: '#9ca3af', default: '#6b7280', dark: '#374151' },
};
```

---

## 6. Implementation Phases

### Phase 1: Foundation (16h) - CRITICAL

| Task | Hours | Complexity |
|------|-------|------------|
| 1.1 Install Zellij + ttyd | 4h | S |
| 1.2 Configure Zellij session management | 4h | M |
| 1.3 Create 3-pane KDL layout | 4h | S |
| 1.4 Implement session auto-recovery | 4h | M |

**Acceptance Criteria:**
- Zellij session persists after terminal close
- ttyd serves terminal over WebSocket
- 3-pane layout renders correctly

### Phase 2: Web Integration (20h) - CRITICAL

| Task | Hours | Complexity |
|------|-------|------------|
| 2.1 Integrate ttyd into React | 6h | M |
| 2.2 Mobile-responsive terminal | 6h | M |
| 2.3 Update terminal-view.tsx | 4h | S |
| 2.4 Session persistence UI | 4h | S |

**Acceptance Criteria:**
- Terminal renders in React via ttyd WebSocket
- Layout adapts to all breakpoints
- Session restore modal on reconnect

### Phase 3: Agent Parallelization (28h) - HIGH RISK

| Task | Hours | Complexity |
|------|-------|------------|
| 3.1 Worker pool architecture | 8h | L |
| 3.2 AgentWorkerPool service | 8h | XL |
| 3.3 Governance integration | 6h | M |
| 3.4 Agent sandboxing | 6h | L |

**Acceptance Criteria:**
- 20 agents run concurrently
- Each agent isolated (no env leakage)
- Agent status visible in Governance HUD

### Phase 4: Governance HUD Integration (16h) - MEDIUM

| Task | Hours | Complexity |
|------|-------|------------|
| 4.1 Agent Activity Feed | 4h | S |
| 4.2 Worker Pool Metrics | 4h | M |
| 4.3 Enhanced Impact Matrix | 4h | S |
| 4.4 Terminal pane switcher | 4h | M |

### Phase 5: Mobile & Multi-Device (16h) - LOW

| Task | Hours | Complexity |
|------|-------|------------|
| 5.1 Touch interactions | 6h | M |
| 5.2 Mobile HUD (bottom-sheet) | 6h | L |
| 5.3 PWA offline support | 4h | M |

### Phase 6: Testing & Documentation (20h) - CRITICAL

| Task | Hours | Complexity |
|------|-------|------------|
| 6.1 Integration tests | 6h | L |
| 6.2 Performance tests | 4h | M |
| 6.3 User documentation | 4h | S |
| 6.4 Security audit | 6h | L |

---

## 7. MVP Scope

### MVP Phase 1 (32h) - "Session Persistence"

**Goal:** Prove core value - sessions survive disconnect

**Include:**
- Zellij + ttyd infrastructure
- Basic React integration
- Desktop layout only
- 5 parallel agents (not 20)
- Core security (localhost, basic auth)

**Exclude:**
- Mobile optimization
- Full 20-agent scaling
- Advanced HUD features
- PWA support

**Value Delivered:** Users can close laptop, reopen, and resume exactly where they left off.

### MVP Phase 2 (44h) - "Agent Orchestration"

**Goal:** Enable multi-agent parallel execution

**Include:**
- Worker pool (5→10 agents)
- Agent status visualization
- Basic HUD integration
- Session recovery UI

**Exclude:**
- Worker reassignment UI
- Advanced metrics
- Mobile-first design

---

## 8. Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Worker Pool Performance | High CPU/memory with 20 agents | Start with 5, add resource limits |
| Security Exposure | RCE via exposed terminal | Localhost binding, JWT auth, TLS |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zellij Session Stability | Work loss on crash | Health monitoring, auto-restart |
| Mobile Touch UX | Poor usability | Proven libraries (Hammer.js), real-device testing |
| WebSocket Reliability | Terminal drops | Exponential backoff, command queuing |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| UI Integration | N/A | Existing xterm.js patterns |
| Governance Updates | N/A | Established polling approach |

---

## 9. Success Metrics

### Technical

| Metric | Target |
|--------|--------|
| Session survival | 99.9% uptime |
| Reconnection time | <100ms (p95) |
| Worker capacity | 20 concurrent agents |
| Mobile performance | 60fps on mid-range Android |
| Memory per agent | <50MB |

### User Experience

| Metric | Target |
|--------|--------|
| Device switching | Zero context loss |
| Agent visibility | All 20 in HUD |
| Mobile terminal | Usable without keyboard |
| Setup time | Zero (auto-start) |

---

## 10. Configuration Schema

### Zellij Layout (KDL)

```kdl
// layouts/forge-default.kdl
layout {
    pane split_direction="horizontal" {
        pane size="70%" {
            command "claude"
            args "--project" "."
            name "Claude Code"
            focus true
        }
        pane split_direction="vertical" size="30%" {
            pane size="50%" {
                command "watch"
                args "-n1" "cat .claude/governance.json | jq -C '.sentinelLog[-5:]'"
                name "Oracle"
            }
            pane size="50%" {
                command "forge-hud"
                args "--tui"
                name "Governance HUD"
            }
        }
    }
}
```

### Runtime Configuration

```yaml
# .claude/infinity-terminal.yaml
infinity_terminal:
  enabled: true

  ttyd:
    port: 7681
    interface: "127.0.0.1"
    ssl: true
    credential: "${TTYD_CREDENTIAL}"

  zellij:
    session_name: "forge-${PROJECT_NAME}"
    layout: "layouts/forge-default.kdl"
    auto_create: true

  workers:
    initial_pool_size: 5
    max_pool_size: 20
    memory_limit_mb: 512
    cpu_limit_percent: 25

  session:
    auto_save: true
    save_interval: 60
    max_sessions: 5
    recovery_enabled: true
```

---

## 11. Open Questions

1. **Multi-user sessions?** Support pair programming in same terminal?
2. **Agent limits?** 20 sufficient or plan for 50+?
3. **Remote deployment?** Localhost only or allow remote servers?
4. **Session sharing?** Real-time collaboration features?

---

## 12. Appendix

### A. Files Analyzed

- `src/components/terminal/ClaudeTerminal.tsx` (410 lines)
- `src/server/pty-bridge.ts` (200+ lines)
- `src/core/runspace-manager.ts` (400+ lines)
- `src/core/backends/wsl-backend.ts` (200+ lines)
- `src/pages/terminal-view.tsx` (150+ lines)
- `src/components/governance/GovernanceHUD.tsx` (126 lines)

### B. Agent Analysis Contributors

| Agent | Role | Key Contribution |
|-------|------|------------------|
| Master Architect | Architecture | ADR, integration strategy |
| Forge Detective | Codebase | Gap analysis, integration points |
| Design Vanguard | UI/UX | Responsive design, components |
| Forge Guardian | Security | Vulnerability assessment, controls |
| Forge Planner | Planning | Task breakdown, MVP scope |

### C. Related Documents

- `SECURITY-ANALYSIS-INFINITY-TERMINAL.md` - Full security audit
- `.claude/plans/infinity-terminal.md` - Detailed task breakdown
- `docs/architecture/META-ORCHESTRATION-ARCHITECTURE.md` - System architecture

---

**Document Status:** APPROVED FOR IMPLEMENTATION

**Next Steps:**
1. Review and approve this specification
2. Install Zellij + ttyd on development machine
3. Create proof-of-concept (2h spike)
4. Begin Phase 1 implementation

---

*Generated by NXTG-Forge 5-Agent Collaborative Analysis*
*2026-01-30*

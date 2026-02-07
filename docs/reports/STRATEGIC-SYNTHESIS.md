# NXTG-Forge Strategic Synthesis
## Timeless Architecture, Autonomous Maintenance, and Tool-Agnostic Future

**Date:** 2026-02-05
**Author:** [NXTG-CEO]-LOOP
**Status:** ACTIONABLE BLUEPRINT

---

## EXECUTIVE SUMMARY

This document addresses the six critical concerns raised:

1. **Timeless Architecture** - Survive CLI tool changes (Claude/Codex/Gemini)
2. **Autonomous Maintenance System** - Self-improving, self-healing
3. **Tool Agnostic Strategy** - Abstract the AI CLI layer
4. **Terminal Architecture** - tmux vs current approach
5. **Honest Assessment** - How far from production-ready?
6. **Self-Improvement Protocol** - Agents that get better autonomously

**Bottom Line Up Front:** NXTG-Forge has a solid foundation (Infinity Terminal, Web Dashboard) but suffers from over-engineering in areas where we compete with native tools. We need to DELETE 30% of our code, ABSTRACT the AI CLI layer, and FOCUS on what makes us unique.

---

## 1. TIMELESS ARCHITECTURE

### The Problem

Our current codebase is tightly coupled to Claude Code:
- Agent specs reference Claude-specific tools (Task, Read, Write, Bash)
- Orchestrator assumes Claude's execution model
- Memory system duplicates Claude's native memory
- Commands are `/frg-*` which is Claude Code slash command syntax

**If Claude Code changes or we need to support Codex/Gemini, we'd rewrite 60%+ of the codebase.**

### The Solution: Three-Layer Architecture

```
+------------------------------------------------------------------+
|                    PRESENTATION LAYER                              |
|  Infinity Terminal | Web Dashboard | Governance HUD | API         |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    ORCHESTRATION LAYER                             |
|  Agent Protocol | Task Queue | Approval System | Checkpoints      |
|  (Tool-Agnostic: Defines WHAT, not HOW)                           |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    ADAPTER LAYER (CLI ABSTRACTION)                 |
|  +-------------+  +-------------+  +-------------+                 |
|  | Claude Code |  | Codex CLI   |  | Gemini CLI  |                 |
|  | Adapter     |  | Adapter     |  | Adapter     |                 |
|  +-------------+  +-------------+  +-------------+                 |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
|                    AI CLI TOOL                                     |
|  (Claude Code today, Codex/Gemini tomorrow)                       |
+------------------------------------------------------------------+
```

### Key Architectural Decisions

#### 1.1 Agent Definitions are YAML, not Markdown

**Current (Claude-specific):**
```markdown
---
name: forge-builder
tools: Read, Write, Bash, Task
model: opus
---
```

**Timeless (Tool-agnostic):**
```yaml
# .forge/agents/builder.agent.yaml
name: forge-builder
version: "1.0"
capabilities:
  - file_read
  - file_write
  - shell_execute
  - spawn_subtask
preferences:
  model_tier: "best_available"  # Not "opus"
  context_window: "large"       # Not "200k"
triggers:
  - pattern: "implement*"
  - pattern: "build*"
  - pattern: "code*"
```

**The adapter translates capabilities to tool calls:**
```typescript
// adapters/claude-code.adapter.ts
export class ClaudeCodeAdapter implements AICliAdapter {
  translateCapability(cap: string): string {
    switch (cap) {
      case 'file_read': return 'Read';
      case 'file_write': return 'Write';
      case 'shell_execute': return 'Bash';
      case 'spawn_subtask': return 'Task';
      default: return cap;
    }
  }
}
```

#### 1.2 Task Definitions are Portable

**Current (Claude-specific workflow):**
```typescript
// Directly calls Claude's Task tool
await Task("forge-builder", { prompt: "Implement feature X" });
```

**Timeless (Adapter-mediated):**
```typescript
interface TaskRequest {
  agentId: string;
  objective: string;
  context: Record<string, unknown>;
  constraints?: string[];
  timeout?: number;
}

// The adapter handles execution
await adapter.executeTask(taskRequest);
```

#### 1.3 Memory is Native-First

**DELETE our memory layer. Integrate with native instead.**

```
MEMORY ARCHITECTURE (Post-Refactor):

Layer 1: AI CLI Native Memory (Source of Truth)
├── Claude: ~/.claude/projects/{hash}/memory/MEMORY.md
├── Codex: ~/.codex/memory/ (hypothetical)
└── Gemini: ~/.gemini/context/ (hypothetical)

Layer 2: Forge Enhancement Layer (READ-ONLY from native + our additions)
├── .forge/memory/decisions.yaml     # Our decisions
├── .forge/memory/learnings.yaml     # Our learnings
└── .forge/memory/patterns.yaml      # Discovered patterns

Layer 3: governance.json (Real-time state)
└── Single source for workstreams, constitution, events

NO localStorage. NO competing memory system.
```

#### 1.4 Commands are JSON-RPC, not Slash

**Current:**
```
User types: /frg-init
Claude interprets as slash command
```

**Timeless:**
```typescript
// commands are registered via JSON-RPC
interface ForgeCommand {
  name: string;           // "init"
  namespace: "forge";     // prefix
  handler: CommandHandler;
  schema: JSONSchema;     // Input validation
}

// CLI adapters translate to native syntax
// Claude: /frg-init
// Codex: @forge init
// Gemini: #forge.init
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/adapters/interface.ts` | Common adapter interface |
| `src/adapters/claude-code.ts` | Claude Code implementation |
| `src/adapters/mock.ts` | For testing without AI CLI |
| `.forge/schema/agent.schema.json` | Agent definition schema |
| `.forge/schema/task.schema.json` | Task definition schema |
| `.forge/schema/command.schema.json` | Command definition schema |

### Files to DELETE

| File | Reason |
|------|--------|
| `.claude/forge/memory/*` | Competing with native |
| `src/services/memory-service.ts` | 573 lines of dead code |
| Complex orchestration that duplicates Task tool | Let the adapter handle it |

---

## 2. AUTONOMOUS MAINTENANCE SYSTEM

### The Vision

NXTG-Forge should maintain itself:
- Scan successful projects for patterns
- Extract learnings into skill files
- Update agent specs based on performance
- Run health checks without human intervention
- Self-heal from common failure modes

### Architecture: The Maintenance Loop

```
+------------------------------------------------------------------+
|                    MAINTENANCE DAEMON                              |
|                    (Runs as background service)                    |
+------------------------------------------------------------------+
        |              |              |              |
        v              v              v              v
+-------------+  +-------------+  +-------------+  +-------------+
| Pattern     |  | Performance |  | Health      |  | Update      |
| Scanner     |  | Analyzer    |  | Monitor     |  | Applier     |
+-------------+  +-------------+  +-------------+  +-------------+
        |              |              |              |
        v              v              v              v
+------------------------------------------------------------------+
|                    LEARNING DATABASE                               |
|  SQLite: patterns, metrics, decisions, learnings                  |
+------------------------------------------------------------------+
```

### 2.1 Pattern Scanner

Runs nightly (or on-demand) to extract patterns from:
- Successful task completions
- User corrections/overrides
- High-performing agent sessions

```typescript
// services/pattern-scanner.ts
interface PatternScan {
  source: 'task_completion' | 'user_correction' | 'performance';
  pattern: {
    context: string;        // When does this apply?
    action: string;         // What was done?
    outcome: 'success' | 'failure';
    confidence: number;     // 0-1
  };
  frequency: number;        // How often seen?
  lastSeen: Date;
}

async function scanForPatterns(): Promise<PatternScan[]> {
  // 1. Read completed tasks from database
  // 2. Analyze common success patterns
  // 3. Extract into structured format
  // 4. Store with confidence scores
}
```

### 2.2 Performance Analyzer

Tracks agent performance and identifies improvement opportunities:

```typescript
// services/performance-analyzer.ts
interface AgentMetrics {
  agentId: string;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    avgDuration: number;
    userOverrideRate: number;  // How often did user correct?
    commonFailures: string[];  // What goes wrong?
  };
  trends: {
    improving: boolean;
    degrading: boolean;
    stable: boolean;
  };
}

async function analyzePerformance(): Promise<AgentMetrics[]> {
  // 1. Query task history for each agent
  // 2. Calculate metrics
  // 3. Identify trends
  // 4. Flag agents needing attention
}
```

### 2.3 Health Monitor

Continuous health checks without human intervention:

```typescript
// services/health-monitor.ts
interface HealthCheck {
  category: string;
  status: 'healthy' | 'degraded' | 'critical';
  metrics: Record<string, number>;
  actions: HealthAction[];
}

interface HealthAction {
  type: 'auto_fix' | 'alert' | 'escalate';
  description: string;
  handler?: () => Promise<void>;
}

const healthChecks: HealthCheck[] = [
  {
    category: 'disk_space',
    check: async () => {
      // Check .forge/ directory size
      // Auto-cleanup old checkpoints if > 1GB
    }
  },
  {
    category: 'stale_sessions',
    check: async () => {
      // Find PTY sessions older than 24h with no activity
      // Auto-terminate and log
    }
  },
  {
    category: 'agent_health',
    check: async () => {
      // Check each agent's recent success rate
      // Alert if < 70%
    }
  },
  {
    category: 'memory_sync',
    check: async () => {
      // Verify .forge/memory/ is in sync with native
      // Auto-sync if diverged
    }
  }
];
```

### 2.4 Update Applier

Automatically applies learnings to agent specs:

```typescript
// services/update-applier.ts
interface SkillUpdate {
  skillFile: string;
  section: string;
  change: 'add' | 'modify' | 'remove';
  content: string;
  reason: string;
  confidence: number;
}

async function applyUpdates(updates: SkillUpdate[]): Promise<void> {
  for (const update of updates) {
    if (update.confidence < 0.8) {
      // Queue for human review
      await queueForReview(update);
    } else {
      // Auto-apply with backup
      await createBackup(update.skillFile);
      await applyUpdate(update);
      await logUpdate(update);
    }
  }
}
```

### 2.5 The Maintenance Daemon

```typescript
// daemon/maintenance.ts
class MaintenanceDaemon {
  private scheduler: NodeCron;

  async start(): Promise<void> {
    // Run pattern scan nightly at 3 AM
    this.scheduler.schedule('0 3 * * *', this.runPatternScan);

    // Run performance analysis weekly
    this.scheduler.schedule('0 4 * * 0', this.runPerformanceAnalysis);

    // Run health checks every 5 minutes
    this.scheduler.schedule('*/5 * * * *', this.runHealthChecks);

    // Apply updates daily at 4 AM (after analysis)
    this.scheduler.schedule('0 4 * * *', this.applyUpdates);
  }

  async runPatternScan(): Promise<void> {
    const patterns = await patternScanner.scan();
    await learningDatabase.storePatterns(patterns);
  }

  async runPerformanceAnalysis(): Promise<void> {
    const metrics = await performanceAnalyzer.analyze();
    await learningDatabase.storeMetrics(metrics);

    // Generate improvement suggestions
    const suggestions = await this.generateSuggestions(metrics);
    await this.queueSuggestions(suggestions);
  }

  async runHealthChecks(): Promise<void> {
    const results = await healthMonitor.check();

    for (const result of results) {
      if (result.status === 'critical') {
        await alerter.sendAlert(result);
      }

      // Auto-fix if possible
      for (const action of result.actions) {
        if (action.type === 'auto_fix' && action.handler) {
          await action.handler();
        }
      }
    }
  }
}
```

### Maintenance Database Schema

```sql
-- SQLite schema for maintenance data
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  context TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  confidence REAL NOT NULL,
  frequency INTEGER DEFAULT 1,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_metrics (
  agent_id TEXT NOT NULL,
  date DATE NOT NULL,
  tasks_completed INTEGER,
  success_rate REAL,
  avg_duration_ms INTEGER,
  override_rate REAL,
  PRIMARY KEY (agent_id, date)
);

CREATE TABLE skill_updates (
  id TEXT PRIMARY KEY,
  skill_file TEXT NOT NULL,
  change_type TEXT NOT NULL,
  content TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, applied, rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME
);

CREATE TABLE health_events (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  action_taken TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. TOOL AGNOSTIC STRATEGY

### The Adapter Interface

```typescript
// adapters/interface.ts
export interface AICliAdapter {
  name: string;
  version: string;

  // Capability detection
  isAvailable(): Promise<boolean>;
  getCapabilities(): Promise<AdapterCapability[]>;

  // Task execution
  executeTask(task: TaskRequest): Promise<TaskResult>;

  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;

  // Shell execution
  executeShell(command: string, options?: ShellOptions): Promise<ShellResult>;

  // Agent spawning
  spawnAgent(agentId: string, prompt: string): Promise<AgentHandle>;

  // Memory access
  getMemory(): Promise<MemoryContent>;
  setMemory(content: MemoryContent): Promise<void>;

  // Session management
  startSession(): Promise<SessionHandle>;
  endSession(handle: SessionHandle): Promise<void>;
}

export interface AdapterCapability {
  name: string;
  available: boolean;
  nativeToolName?: string;
}
```

### Claude Code Adapter

```typescript
// adapters/claude-code.ts
export class ClaudeCodeAdapter implements AICliAdapter {
  name = 'claude-code';
  version = '1.0';

  async isAvailable(): Promise<boolean> {
    // Check if running in Claude Code context
    return typeof globalThis.Read !== 'undefined';
  }

  getCapabilities(): Promise<AdapterCapability[]> {
    return Promise.resolve([
      { name: 'file_read', available: true, nativeToolName: 'Read' },
      { name: 'file_write', available: true, nativeToolName: 'Write' },
      { name: 'shell_execute', available: true, nativeToolName: 'Bash' },
      { name: 'spawn_subtask', available: true, nativeToolName: 'Task' },
      { name: 'search', available: true, nativeToolName: 'Grep' },
      { name: 'glob', available: true, nativeToolName: 'Glob' },
    ]);
  }

  async executeTask(task: TaskRequest): Promise<TaskResult> {
    // Translate to Claude's Task tool call
    const prompt = this.buildPrompt(task);
    // In actual implementation, this would call Claude's Task tool
    return { success: true, output: 'Task executed' };
  }

  private buildPrompt(task: TaskRequest): string {
    return `
Agent: ${task.agentId}
Objective: ${task.objective}
Context: ${JSON.stringify(task.context)}
Constraints: ${task.constraints?.join(', ') || 'None'}
    `.trim();
  }
}
```

### Future Codex Adapter (Placeholder)

```typescript
// adapters/codex.ts
export class CodexAdapter implements AICliAdapter {
  name = 'codex';
  version = '1.0';

  async isAvailable(): Promise<boolean> {
    // Check for Codex CLI environment
    return process.env.CODEX_CLI === 'true';
  }

  getCapabilities(): Promise<AdapterCapability[]> {
    return Promise.resolve([
      { name: 'file_read', available: true, nativeToolName: 'read_file' },
      { name: 'file_write', available: true, nativeToolName: 'write_file' },
      { name: 'shell_execute', available: true, nativeToolName: 'run_shell' },
      { name: 'spawn_subtask', available: true, nativeToolName: 'spawn' },
    ]);
  }

  // ... implementation
}
```

### Adapter Factory

```typescript
// adapters/factory.ts
export class AdapterFactory {
  private adapters: AICliAdapter[] = [];

  register(adapter: AICliAdapter): void {
    this.adapters.push(adapter);
  }

  async getActiveAdapter(): Promise<AICliAdapter | null> {
    for (const adapter of this.adapters) {
      if (await adapter.isAvailable()) {
        return adapter;
      }
    }
    return null;
  }
}

// Usage
const factory = new AdapterFactory();
factory.register(new ClaudeCodeAdapter());
factory.register(new CodexAdapter());
factory.register(new GeminiAdapter());

const adapter = await factory.getActiveAdapter();
if (adapter) {
  await adapter.executeTask(task);
}
```

---

## 4. TERMINAL ARCHITECTURE: TMUX vs PTY BRIDGE

### Current Architecture Analysis

**What We Have:**
```
Browser (xterm.js) --> WebSocket --> PTY Bridge --> Shell
                          |
                   Session persistence via:
                   - scrollbackBuffer (100KB)
                   - SESSION_KEEPALIVE_MS (5 min)
                   - Session reattachment
```

**Strengths:**
- Full browser-based terminal
- Session survives browser close (5 min keepalive)
- Multi-client support (multiple browsers to same session)
- Scrollback replay on reconnect
- No external dependencies

**Weaknesses:**
- PTY dies after 5 min of no connection
- No true background persistence (like tmux)
- Single shell per session (no panes/windows)
- Manual session management

### TMUX Integration: Should We?

| Factor | PTY Bridge Only | With TMUX |
|--------|-----------------|-----------|
| Dependencies | node-pty only | node-pty + tmux |
| Session persistence | 5 min keepalive | Infinite (tmux server) |
| Multi-pane | Not native | Built-in |
| Learning curve | Zero | Users must know tmux |
| Mobile support | Full | Awkward (pane switching) |
| Implementation | Done | Significant work |

### Recommendation: HYBRID APPROACH

**Keep PTY Bridge as default, add TMUX as power-user option.**

```typescript
// Terminal mode configuration
interface TerminalConfig {
  mode: 'pty' | 'tmux';
  tmuxOptions?: {
    sessionName?: string;
    attachExisting?: boolean;
    layout?: 'single' | 'split-h' | 'split-v' | 'quad';
  };
}
```

**Implementation:**

```typescript
// backends/tmux-backend.ts
export class TmuxBackend {
  async createSession(name: string): Promise<TmuxSession> {
    // tmux new-session -d -s {name}
    await exec(`tmux new-session -d -s ${name}`);
    return { name, created: new Date() };
  }

  async attachToPTY(sessionName: string): Promise<PTYHandle> {
    // Instead of raw shell, attach to tmux session
    const pty = spawn('tmux', ['attach-session', '-t', sessionName], {
      name: 'xterm-256color',
      cols: 120,
      rows: 40,
    });
    return { pty };
  }

  async splitPane(sessionName: string, direction: 'h' | 'v'): Promise<void> {
    await exec(`tmux split-window -${direction} -t ${sessionName}`);
  }
}
```

**UI Enhancement:**

Add a "Power Terminal" toggle in the dashboard:
- OFF: Simple PTY Bridge (current behavior)
- ON: TMUX-backed with pane support

```
+-- Terminal Controls ----------------------------------+
| Mode: [Simple] [Power (tmux)]                        |
| Layout: [Single] [Split H] [Split V] [Quad]          |
+------------------------------------------------------+
```

### What About Multi-Window?

We already have multi-window via the dashboard's terminal component. Each "window" is a separate PTY session. This is simpler than tmux for most users.

**Keep multi-window as-is. Add tmux only for users who explicitly want it.**

---

## 5. HOW FAR OFF ARE WE?

### Honest Assessment

| Component | State | Production-Ready? | Time to Fix |
|-----------|-------|-------------------|-------------|
| Infinity Terminal | 8.5/10 | YES | Shipped |
| Web Dashboard | 7.2/10 | PARTIAL (stale data) | 1 week |
| Governance HUD | 6.0/10 | NO (display only) | 2 weeks |
| Agent System | 2/10 | NO (specs only, not executable) | 4-6 weeks |
| Commands (19) | 5% working | NO | 3 weeks |
| Memory System | 0/10 | NO (delete and integrate native) | 1 week |
| Security | Grade D | NO | 2 weeks |
| Test Coverage | 42% | PARTIAL | 2 weeks |

### Critical Path to "Most Powerful UI/UX/DX"

**What blocks us:**

1. **Agents Don't Execute** - We have beautiful specs, zero execution. The orchestrator is simulation.
2. **Data is Stale** - Governance HUD shows Jan 29 data. Real-time pipeline missing.
3. **Security is F-grade** - PTY has no auth, WebSocket is open, command filtering absent.
4. **Memory Competes with Native** - We built a system Claude already has.
5. **Commands are Vapor** - 18/19 commands don't work.

### The 4-Week Sprint to Production

**Week 1: Foundation Fixes**
- DELETE competing memory system
- FIX 5 security blockers (auth, filtering, origin check)
- WIRE governance real-time pipeline
- UPDATE governance.json with current state

**Week 2: Core Commands**
- IMPLEMENT /frg-init (wizard flow)
- IMPLEMENT /frg-status (comprehensive)
- IMPLEMENT /frg-gap-analysis
- IMPLEMENT /frg-health
- DELETE or stub remaining 15 commands (honest README)

**Week 3: Agent Reality**
- CREATE adapter layer (section 3 of this doc)
- IMPLEMENT forge-planner as real agent
- IMPLEMENT forge-builder as real agent
- WIRE to coordination protocol

**Week 4: Polish and Ship**
- TEST coverage to 60%+
- SECURITY audit pass
- DOCUMENTATION honesty pass
- NPM package configuration
- SHIP v3.0.0

### Success Criteria

| Metric | Current | Target | Measure |
|--------|---------|--------|---------|
| Working commands | 1 (5%) | 6 (30%) | Can execute without error |
| Agent execution | 0% | 50% | Real work, not simulation |
| Test coverage | 42% | 60% | Vitest report |
| Security grade | D | B+ | Pass security checklist |
| Fresh install success | Unknown | 90% | QA on new machine |
| Time to first value | 10+ min | < 5 min | From install to working HUD |

---

## 6. SELF-IMPROVEMENT PROTOCOL

### How Agents Improve Themselves

Every agent can improve its own spec and skills through a structured protocol.

### 6.1 Session Learning Capture

At end of each session, capture learnings:

```typescript
// hooks/session-end.ts
async function captureSessionLearnings(): Promise<void> {
  const session = await getCurrentSession();

  // Analyze what went well
  const successes = session.tasks.filter(t => t.status === 'completed');

  // Analyze what failed
  const failures = session.tasks.filter(t => t.status === 'failed');

  // Analyze user corrections
  const corrections = session.events.filter(e => e.type === 'user_override');

  // Generate learning entries
  const learnings: Learning[] = [];

  for (const success of successes) {
    learnings.push({
      type: 'success_pattern',
      context: success.context,
      action: success.approach,
      outcome: 'success',
      agentId: success.agentId,
    });
  }

  for (const failure of failures) {
    learnings.push({
      type: 'failure_pattern',
      context: failure.context,
      action: failure.approach,
      outcome: 'failure',
      reason: failure.error,
      agentId: failure.agentId,
    });
  }

  for (const correction of corrections) {
    learnings.push({
      type: 'correction',
      original: correction.originalAction,
      corrected: correction.correctedAction,
      reason: correction.userFeedback,
      agentId: correction.agentId,
    });
  }

  await storeLearnings(learnings);
}
```

### 6.2 Agent Spec Self-Update

Agents can propose updates to their own specs:

```yaml
# Agent spec update proposal format
proposal:
  agent_id: forge-builder
  timestamp: 2026-02-05T15:30:00Z
  type: skill_addition
  reason: "Discovered pattern: users often ask for TypeScript strict mode. Adding as default behavior."
  changes:
    - section: "## Coding Standards"
      action: append
      content: |
        ### TypeScript Strict Mode
        Always enable strict mode in tsconfig.json unless user explicitly requests otherwise.
        Rationale: Prevents common type errors, learned from 15 successful projects.
  confidence: 0.85
  supporting_evidence:
    - task_id: task-123
    - task_id: task-456
    - task_id: task-789
```

### 6.3 Skill File Auto-Enhancement

Skills can accumulate knowledge over time:

```yaml
# .forge/skills/typescript.skill.yaml
---
name: typescript
version: "1.3"  # Auto-incremented
last_updated: 2026-02-05
learned_patterns:
  - pattern: "strict_mode_preference"
    confidence: 0.85
    frequency: 15
    added: 2026-02-01
  - pattern: "prefer_unknown_over_any"
    confidence: 0.92
    frequency: 23
    added: 2026-01-15
---

## TypeScript Best Practices

### Strict Mode (Confidence: 85%)
Enable strict mode by default. Users prefer this 85% of the time.

### Unknown vs Any (Confidence: 92%)
Use `unknown` instead of `any` for untyped values. Safer, still flexible.
```

### 6.4 The Self-Improvement Loop

```
+----------------------------------------------------------+
|                    SELF-IMPROVEMENT LOOP                  |
+----------------------------------------------------------+
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
+---------------+   +---------------+   +---------------+
| Session End   |   | Weekly        |   | User Feedback |
| Learning      |   | Pattern       |   | Integration   |
| Capture       |   | Analysis      |   |               |
+---------------+   +---------------+   +---------------+
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
+----------------------------------------------------------+
|                    LEARNING DATABASE                      |
|  patterns | metrics | corrections | proposals             |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|                    PROPOSAL GENERATOR                     |
|  Analyze patterns -> Generate spec updates                |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|                    CONFIDENCE FILTER                      |
|  < 70%: Queue for human review                           |
|  70-90%: Auto-apply with backup                          |
|  > 90%: Auto-apply immediately                           |
+----------------------------------------------------------+
                            |
                            v
+----------------------------------------------------------+
|                    UPDATE APPLIER                         |
|  Backup -> Apply -> Validate -> Log                      |
+----------------------------------------------------------+
```

### 6.5 Human-in-the-Loop for Low Confidence

```typescript
// services/human-review.ts
interface ReviewRequest {
  proposalId: string;
  agentId: string;
  changeType: string;
  summary: string;
  confidence: number;
  evidence: string[];
}

async function queueForReview(proposal: Proposal): Promise<void> {
  const request: ReviewRequest = {
    proposalId: proposal.id,
    agentId: proposal.agentId,
    changeType: proposal.type,
    summary: proposal.reason,
    confidence: proposal.confidence,
    evidence: proposal.supportingEvidence,
  };

  // Store in review queue
  await db.insert('review_queue', request);

  // Notify user via HUD
  await governance.addSentinelEvent({
    type: 'review_requested',
    message: `${proposal.agentId} proposes: ${proposal.reason}`,
    action: 'Review in Settings > Agent Updates',
  });
}
```

### 6.6 Rollback Safety

Every self-improvement is reversible:

```typescript
// services/rollback.ts
interface Rollback {
  updateId: string;
  originalFile: string;
  backupPath: string;
  appliedAt: Date;
}

async function rollbackUpdate(updateId: string): Promise<void> {
  const rollback = await db.get('rollbacks', updateId);
  if (!rollback) throw new Error('Rollback not found');

  // Restore original file
  await fs.copyFile(rollback.backupPath, rollback.originalFile);

  // Mark update as rolled back
  await db.update('skill_updates', updateId, { status: 'rolled_back' });

  // Log event
  await governance.addSentinelEvent({
    type: 'update_rolled_back',
    message: `Rolled back update ${updateId}`,
  });
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)

| Task | Owner | Priority |
|------|-------|----------|
| Create adapter interface | Builder | CRITICAL |
| Implement Claude Code adapter | Builder | CRITICAL |
| DELETE competing memory | Builder | CRITICAL |
| FIX security blockers | Security | CRITICAL |
| Wire governance real-time | Builder | HIGH |

### Phase 2: Autonomous Maintenance (Week 3-4)

| Task | Owner | Priority |
|------|-------|----------|
| Create maintenance daemon | Builder | HIGH |
| Implement pattern scanner | Builder | HIGH |
| Implement health monitor | Builder | HIGH |
| Create learning database | Builder | HIGH |

### Phase 3: Self-Improvement (Week 5-6)

| Task | Owner | Priority |
|------|-------|----------|
| Session learning capture | Builder | MEDIUM |
| Proposal generator | Builder | MEDIUM |
| Review queue UI | UI | MEDIUM |
| Rollback system | Builder | MEDIUM |

### Phase 4: Tool Agnostic (Week 7-8)

| Task | Owner | Priority |
|------|-------|----------|
| Agent YAML schema | Architect | HIGH |
| Task YAML schema | Architect | HIGH |
| Adapter factory | Builder | HIGH |
| Mock adapter for testing | Builder | MEDIUM |

---

## CEO-LOOP DECISIONS REQUIRED

### Decision 1: Memory Strategy
**Options:**
- A) DELETE our memory, use Claude native only
- B) INTEGRATE - read native, write enhancements to .forge/
- C) Keep parallel (current broken state)

**Recommendation:** B (INTEGRATE)

### Decision 2: TMUX Integration
**Options:**
- A) Keep PTY Bridge only (current)
- B) Replace with TMUX
- C) HYBRID - PTY default, TMUX opt-in

**Recommendation:** C (HYBRID)

### Decision 3: Agent Spec Format
**Options:**
- A) Keep Markdown (Claude-specific)
- B) Move to YAML (tool-agnostic)
- C) Support both (migration period)

**Recommendation:** B (YAML) with migration script

### Decision 4: Self-Improvement Confidence Threshold
**Options:**
- A) Conservative: 90%+ for auto-apply
- B) Balanced: 70%+ for auto-apply
- C) Aggressive: 50%+ for auto-apply

**Recommendation:** B (Balanced) - 70% threshold

---

## FINAL WORD

**The Path Forward is Clear:**

1. **DELETE** what competes with native tools
2. **ABSTRACT** the AI CLI layer for tool-agnostic future
3. **FOCUS** on unique value: Infinity Terminal, Web Dashboard, Governance HUD
4. **AUTOMATE** maintenance and self-improvement
5. **SHIP** honestly - no more inflated claims

**Time to Production-Ready:** 4-6 weeks with focused execution.

**The transformation:** From "beautiful but inert cockpit" to "the most powerful UI/UX/DX for AI-powered development."

---

*Generated by [NXTG-CEO]-LOOP on 2026-02-05*
*This document supersedes all previous strategic plans*

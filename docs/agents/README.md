# NXTG-Forge Agent Ecosystem Documentation

**Version:** 3.0
**Last Updated:** 2026-02-03
**Total Agents:** 22

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Architecture](#agent-architecture)
3. [Agent Categories](#agent-categories)
4. [Core Agents](#core-agents)
5. [Development Agents](#development-agents)
6. [Quality & Security Agents](#quality--security-agents)
7. [Operations Agents](#operations-agents)
8. [Governance & Intelligence Agents](#governance--intelligence-agents)
9. [Agent Communication Protocol](#agent-communication-protocol)
10. [Agent Marketplace](#agent-marketplace)
11. [Creating Custom Agents](#creating-custom-agents)
12. [Agent Testing](#agent-testing)

---

## Overview

NXTG-Forge v3 is powered by a **22-agent ecosystem** designed for autonomous software development. Each agent is a specialized expert with specific capabilities, invoked through Claude Code's Task tool.

### Key Concepts

**Agent Invocation:**
Agents are NOT TypeScript services - they are Claude Code task invocations. When an agent needs to perform work, the orchestrator uses the Task tool to spawn a new Claude session with that agent's system prompt.

**Agent Communication:**
Agents communicate through:
- **Task tool**: Spawning child agents for specialized work
- **Shared state**: Reading/writing to `.claude/state/`, `.claude/plans/`, etc.
- **Message protocol**: Structured messages via agent-router.ts (experimental)

**Agent Capabilities:**
Each agent has access to specific tools (Read, Write, Edit, Bash, Grep, Glob, etc.) defined in their frontmatter. Agents use these tools to accomplish their work, NOT by calling TypeScript services.

### The Dog-Food Principle

NXTG-Forge uses Claude Code's native capabilities to build itself. We don't create meta-orchestration services in TypeScript - we use agents to coordinate agents. This is "eating our own dog food" - if it's not good enough for building NXTG-Forge, it's not good enough for our users.

---

## Agent Architecture

### How Agents Work

```
User Request
     ↓
Forge Orchestrator (routes to specialist)
     ↓
Task Tool Invocation (spawns agent with system prompt)
     ↓
Agent executes with tools (Read, Write, Edit, Bash, etc.)
     ↓
Agent writes results to shared state
     ↓
Control returns to orchestrator
```

### Agent Lifecycle

1. **Invocation**: Orchestrator uses Task tool with agent name
2. **Execution**: Agent reads context, performs work with tools
3. **State Update**: Agent writes results to `.claude/state/` or other locations
4. **Completion**: Agent reports completion, control returns
5. **Cleanup**: State persisted, session ends

### Shared State

Agents communicate through files:
- `.claude/state/current.json` - Active session state
- `.claude/plans/*.md` - Feature plans and task breakdowns
- `.claude/governance.json` - Strategic alignment and rules
- `.claude/logs/sentinel.jsonl` - Oracle governance feed
- `.claude/forge/preferences.json` - Learned user preferences

---

## Agent Categories

### Core Agents (6)
Strategic coordination, planning, implementation, quality gates, analysis, and strategic oversight.

### Development Agents (8)
Specialized development work: testing, docs, refactoring, security, performance, database, API, and UI.

### Operations Agents (3)
Infrastructure, deployment, analytics, and monitoring.

### Governance & Intelligence Agents (5)
Governance verification, compliance, integration, continuous learning, and autonomous decision-making.

---

## Core Agents

### 🟣 forge-orchestrator
**Model:** Opus 4.5
**Color:** Purple
**Tools:** All (Glob, Grep, Read, Write, Edit, Bash, TodoWrite, Task)

**Role:** Primary coordinator for NXTG-Forge, presenting the canonical 4-option menu and routing to specialist agents.

**When to Invoke:**
- User activates Forge (`/enable-forge`)
- User wants to continue previous work
- User needs strategic advice (soundboard mode)
- User wants health check

**Capabilities:**
- Present canonical 4-option menu (Continue, Plan, Soundboard, Health Check)
- Restore context from previous sessions
- Coordinate specialist agents (Detective, Planner, Builder, Guardian, Oracle)
- Maintain complete transparency in all orchestration

**Example Invocation:**
```typescript
// User types "/enable-forge"
Task: "forge-orchestrator"
Description: "Present the NXTG-Forge command center menu"
```

**What It Produces:**
- Canonical menu presentation
- Context restoration summaries
- Agent coordination reports
- Progress tracking updates

---

### 🟢 forge-builder
**Model:** Sonnet 4.5
**Color:** Green
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**Role:** Master implementer who transforms plans into production-ready code.

**When to Invoke:**
- User approves implementation plan
- Specific code implementation requested
- Refactoring work needed
- Code generation required

**Capabilities:**
- Read and implement `.claude/plans/*.md` files
- Generate production-quality code with SOLID principles
- Create comprehensive tests alongside implementation
- Apply design patterns consistently
- Refactor code to improve quality

**Example Invocation:**
```typescript
Task: "forge-builder"
Description: "Implement the authentication system from plan-uuid-123"
```

**What It Produces:**
- Production code files (src/*)
- Test files (tests/*)
- Implementation summary with statistics
- Quality check results

**Critical Rule:**
Builder creates REAL code files, not simulations. Uses Write/Edit tools directly, never builds TypeScript orchestration services.

---

### 🔵 forge-planner
**Model:** Sonnet 4.5
**Color:** Sky Blue
**Tools:** Glob, Grep, Read, Bash, TodoWrite

**Role:** Strategic architect who transforms ideas into executable plans.

**When to Invoke:**
- User selects "Plan Features" (Option 2)
- Feature planning or architecture design needed
- Complex work needs strategic breakdown

**Capabilities:**
- Interactive requirements gathering
- Domain modeling and API contract design
- Task breakdown with dependencies and estimates
- Risk analysis and mitigation strategies
- Technology stack recommendations

**Example Invocation:**
```typescript
Task: "forge-planner"
Description: "Design an OAuth2 authentication system with task breakdown"
```

**What It Produces:**
- Plan files in `.claude/plans/*.md` with YAML frontmatter
- Task breakdown with dependencies and estimates
- Architecture diagrams (textual)
- Risk assessment and mitigation strategies

**Output Format:**
```yaml
---
id: uuid
name: Feature Name
status: draft|approved|in_progress|completed
created: ISO date
estimated_hours: number
---

# Feature Name

## Requirements
- [ ] Requirement 1

## Tasks

### Task 1: Name
**Status:** pending
**Estimated:** 2h
**Dependencies:** None
**Subtasks:**
- [ ] Subtask 1
```

---

### 🟡 forge-guardian
**Model:** Sonnet 4.5
**Color:** Yellow
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**Role:** Quality assurance master ensuring code meets standards before release.

**When to Invoke:**
- Implementation complete (automatic)
- Security scan requested
- Pre-commit quality gates
- Code review requested
- Quality issues need remediation

**Capabilities:**
- Generate comprehensive test suites (unit, integration, e2e)
- Validate security and compliance
- Enforce quality gates (non-blocking guidance)
- Perform code reviews
- Ensure production readiness

**Example Invocation:**
```typescript
Task: "forge-guardian"
Description: "Run quality checks on the authentication implementation"
```

**What It Produces:**
- Test files with 85%+ coverage
- Security scan results
- Quality gate reports
- Pre-commit validation summary
- Remediation recommendations

**Quality Gates:**
- Code formatting (black, prettier)
- Linting (ruff, eslint)
- Type checking (mypy, tsc)
- Security scan (bandit, npm audit)
- Unit/integration tests
- Coverage check (85% minimum)

---

### 🔵 forge-detective
**Model:** Sonnet 4.5
**Color:** Blue
**Tools:** Glob, Grep, Read, Bash, WebSearch, TodoWrite

**Role:** Master analyzer performing comprehensive project health assessments.

**When to Invoke:**
- User selects "Health Check" (Option 4)
- User selects "Soundboard" (Option 3) for analysis
- Initial project activation (technology detection)
- Ad-hoc analysis requests

**Capabilities:**
- Project structure analysis
- Technology stack detection
- Code quality assessment (coverage, complexity, type safety)
- Security analysis (vulnerabilities, secrets, OWASP Top 10)
- Architecture quality review
- Git & development practices analysis

**Example Invocation:**
```typescript
Task: "forge-detective"
Description: "Perform comprehensive health analysis of the project"
```

**What It Produces:**
- Overall health score (0-100)
- Detailed analysis across 5 dimensions:
  - Testing & Quality (30% weight)
  - Security (25% weight)
  - Documentation (15% weight)
  - Architecture (20% weight)
  - Git Practices (10% weight)
- Prioritized recommendations (High/Medium/Low)
- Actionable next steps

**Health Score Calculation:**
```
Health Score = (
    Testing & Quality * 0.30 +
    Security * 0.25 +
    Documentation * 0.15 +
    Architecture * 0.20 +
    Git Practices * 0.10
)
```

---

### 🟣 forge-oracle
**Model:** Sonnet 4.5
**Color:** Magenta
**Tools:** Read, Grep, Glob, Bash, Write

**Role:** Proactive governance sentinel for autonomous development modes.

**When to Invoke:**
- Runs automatically in background during active development
- User requests governance validation
- Pre-commit validation
- PostToolUse hooks detect changes

**Capabilities:**
- Scope validation ("Are we building what we said?")
- Drift detection ("Is implementation diverging from directive?")
- Governance compliance ("Does this violate our Living Constitution?")
- Non-blocking advisory (provides insights, never halts development)

**Example Invocation:**
```typescript
Task: "forge-oracle"
Description: "Validate changes against governance state and scope"
```

**What It Produces:**
- Structured findings in `.claude/logs/sentinel.jsonl`:
```json
{
  "id": "sentinel-timestamp-random",
  "timestamp": 1738234567000,
  "type": "INFO | WARN | CRITICAL",
  "severity": "low | medium | high",
  "category": "scope | drift | governance",
  "source": "forge-oracle",
  "message": "Clear, actionable insight in one sentence",
  "context": {
    "files": ["src/path/to/file.ts"],
    "workstream": "gov-001",
    "violations": ["scope_creep"],
    "suggestion": "Consider creating separate workstream"
  }
}
```

**Three Core Questions:**
1. Scope Validation: Are we building what we said we would build?
2. Drift Detection: Is the implementation diverging from the stated directive?
3. Governance Compliance: Does this change violate our Living Constitution?

---

## Development Agents

### 🟢 forge-testing
**Model:** Sonnet 4.5
**Color:** Lime
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- New code needs test coverage
- Coverage gaps analysis needed
- Flaky tests need fixing
- Test infrastructure work

**Capabilities:**
- Generate unit/integration/e2e tests
- Analyze coverage gaps
- Fix flaky and unreliable tests
- Create test fixtures and mocks
- Set up test infrastructure

**Testing Framework:**
- Vitest with React Testing Library
- jsdom environment
- Coverage target: 85% minimum

---

### 🔘 forge-docs
**Model:** Sonnet 4.5
**Color:** Slate
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- New code needs documentation
- README/API docs need updates
- Changelog generation needed
- Documentation audit requested

**Capabilities:**
- Generate TSDoc/JSDoc for code
- Create and maintain README files
- Write API endpoint documentation
- Generate changelogs from conventional commits
- Audit documentation for staleness

**Standards:**
- TSDoc for TypeScript functions
- Examples-first documentation
- Changelog in Keep a Changelog format
- Documentation coverage tracking

---

### 🟣 forge-refactor
**Model:** Sonnet 4.5
**Color:** Fuchsia
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Large files need decomposition
- Code duplication detected
- High complexity needs reduction
- Design patterns need application

**Capabilities:**
- Reduce complexity and improve readability
- Extract reusable patterns from duplicated code
- Split large files into focused modules
- Apply SOLID principles and design patterns
- Remove dead code and unused imports

**Safety Protocol:**
1. Read code completely
2. Check tests exist
3. Run tests before (green baseline)
4. Make small incremental changes
5. Run tests after (verify behavior preserved)

---

### 🔴 forge-security
**Model:** Sonnet 4.5
**Color:** Red
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Pre-release security audit
- Auth/authz code review
- Vulnerability scanning needed
- Security hardening required

**Capabilities:**
- Scan dependencies for vulnerabilities
- Detect hardcoded secrets
- Review auth/authz implementations
- Check OWASP Top 10 vulnerabilities
- Validate input sanitization
- Audit CSP, CORS, security headers

**Severity Classification:**
- Critical: Exploitable RCE, auth bypass → Fix immediately
- High: Data exposure, privilege escalation → Fix before release
- Medium: XSS, CSRF, info disclosure → Fix in next sprint
- Low: Best practice violations → Track and plan

---

### 🟠 forge-performance
**Model:** Sonnet 4.5
**Color:** Orange
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- App performance issues
- Bundle size too large
- Memory leaks suspected
- API response times slow

**Capabilities:**
- Analyze and reduce bundle size
- Optimize React component renders
- Identify and fix memory leaks
- Improve API response times
- Profile and benchmark critical paths

**Performance Budgets:**
- JS bundle (gzipped): < 200KB
- CSS bundle: < 50KB
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- API p95 latency: < 500ms

---

### 🟢 forge-database
**Model:** Sonnet 4.5
**Color:** Emerald
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Schema design needed
- Migration creation required
- Query optimization needed
- Data modeling work

**Capabilities:**
- Design schemas with business rules
- Create safe, reversible migrations
- Optimize queries and indexing
- Model data for performance
- Troubleshoot data integrity

**Current Storage:**
- JSON files for state (`.claude/state/`)
- In-memory stores for runtime data
- localStorage for client state

---

### 🔵 forge-api
**Model:** Sonnet 4.5
**Color:** Cyan
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- New API endpoint needed
- External API integration
- Validation/middleware work
- OpenAPI spec generation

**Capabilities:**
- Design RESTful endpoints
- Implement request handlers with Zod validation
- Create middleware (auth, logging, rate limiting)
- Integrate external APIs (GitHub, Sentry)
- Generate OpenAPI specifications

**API Server:**
- Express with TypeScript
- Port 5051 (API + WebSocket)
- Zod schemas for validation
- Consistent error handling

---

### 🎀 forge-ui
**Model:** Sonnet 4.5
**Color:** Pink
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- New UI component needed
- Responsive layout issues
- Accessibility improvements
- Design system work

**Capabilities:**
- Create React 19 components with TypeScript
- Implement responsive layouts with Tailwind
- Build design system primitives
- Add micro-animations and transitions
- Ensure WCAG 2.1 AA accessibility

**Tech Stack:**
- React 19 functional components
- TypeScript strict mode
- Tailwind CSS (no inline styles)
- Framer Motion (cautious with React 19)
- Lucide React for icons

---

## Quality & Security Agents

### Testing, Security, Docs, Refactor
See [Development Agents](#development-agents) section above.

---

## Operations Agents

### ⚪ forge-devops
**Model:** Sonnet 4.5
**Color:** Gray
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Docker/container setup
- CI/CD pipeline work
- Environment configuration
- Monitoring setup

**Capabilities:**
- Create and maintain Docker configurations
- Build CI/CD pipelines with GitHub Actions
- Manage environment variables and secrets
- Configure monitoring and alerting
- Automate deployment processes

**Current Infrastructure:**
- Platform: WSL2 on Windows
- Dev: Vite (5050) + Express (5051)
- CI/CD: GitHub Actions
- Build: vite build, tsc

---

### 🔵 forge-analytics
**Model:** Haiku 3.5
**Color:** Teal
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Usage pattern analysis
- Metrics instrumentation
- Dashboard/reporting work
- KPI tracking

**Capabilities:**
- Instrument code with metrics
- Build analytics dashboards
- Analyze usage patterns and trends
- Track KPIs and success metrics
- Identify anomalies and regressions

**Key Metrics:**
- Performance: Bootstrap time, API response, bundle size
- Quality: Test coverage, type safety, error rate
- Usage: Agent invocations, feature adoption, session duration

---

### 🟣 forge-integration
**Model:** Sonnet 4.5
**Color:** Indigo
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- External service integration
- Webhook handling
- OAuth flows
- MCP server connections

**Capabilities:**
- Integrate with GitHub API
- Connect monitoring services (Sentry)
- Implement webhook handlers with security
- Set up OAuth flows
- Configure MCP server connections

**Integration Patterns:**
- HTTP client with retry logic
- Webhook signature verification
- Rate limiting awareness
- Error handling with fallbacks

---

## Governance & Intelligence Agents

### 🟡 governance-verifier
**Model:** Haiku 3.5
**Color:** Bronze (Amber)
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- PostToolUse hook blocks with governance concern
- Test-implementation mismatch detected
- Scope creep suspected
- Manual `/verify-governance` invocation

**Capabilities:**
- Gather evidence from implementation
- Analyze governance concerns
- Provide JUSTIFIED or REVERT verdict
- Document verification in sentinel log

**Verification Protocol:**
1. Parse the concern (file, type, claim)
2. Gather evidence (read implementation, check git history)
3. Analyze and verdict (structured JSON)
4. Report to sentinel log

**Output:**
```
## Governance Verification Report

**Concern**: Test expects undefined, implementation returns null
**Triggered By**: src/test/TaskQueue.test.ts:42

### Verdict: ✅ JUSTIFIED

**Reasoning**: Implementation explicitly returns null for non-existent tasks.
Test change aligns with implementation behavior.

**Action**: Proceed with test update
```

---

### 🟠 forge-compliance
**Model:** Haiku 3.5
**Color:** Amber
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- License compatibility check
- GDPR/privacy compliance review
- WCAG accessibility audit
- Policy enforcement

**Capabilities:**
- Audit dependency licenses
- Check GDPR compliance in data handling
- Verify WCAG accessibility
- Enforce coding standards
- Review for export control

**Compliance Areas:**
- License audit (MIT-compatible only)
- GDPR checklist (consent, deletion, export)
- Accessibility (WCAG 2.1 AA)
- Security policies (no secrets, vuln scanning)

---

### 🟣 forge-learning
**Model:** Haiku 3.5
**Color:** Violet
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- Improve recommendations based on patterns
- Capture user preferences
- Learn from corrections
- Optimize workflow suggestions

**Capabilities:**
- Analyze session history for patterns
- Capture user preferences and corrections
- Improve agent selection accuracy
- Optimize workflow recommendations
- Build institutional knowledge

**Learning Sources:**
- Session history (frequent agents, task sequences)
- User corrections (overrides, re-routes)
- Outcome tracking (tests pass, commit accepted)

**Preference Storage:**
`.claude/forge/preferences.json`
```json
{
  "testing": { "framework": "vitest", "coverage_target": 85 },
  "code_style": { "prefer_functional": true, "max_file_length": 300 },
  "workflow": { "auto_test_after_build": true }
}
```

---

### 🟡 release-sentinel
**Model:** Opus 4.5
**Color:** Gold
**Tools:** Glob, Grep, Read, Write, Edit, Bash, TodoWrite

**When to Invoke:**
- After commits that modify APIs/components
- Preparing for release
- Documentation audit needed
- Changelog generation

**Capabilities:**
- Audit documentation health
- Code-to-documentation mapping
- Generate changelogs from conventional commits
- Update API reference documentation
- Track documentation coverage

**Documentation Categories:**
- Auto-updated: CHANGELOG, API reference, type definitions
- Semi-auto: README, user guides (drafts for review)
- Manual: Architecture docs, diagrams (flag + suggest outline)

---

### 🔴 NXTG-CEO-LOOP
**Model:** Opus 4.5
**Color:** Crimson
**Tools:** Read, Grep, Glob, TodoWrite, Task, Write, Edit

**Role:** CEO Digital Twin for autonomous strategic decision-making.

**When to Invoke:**
- Decisions about product direction
- Architecture decisions
- Resource allocation
- Risk assessment
- Final approval on significant changes

**Capabilities:**
- Final approval authority
- Strategic direction and priority setting
- Quality bar definition
- Scope management (prevent feature creep)
- Autonomous decision-making (bias toward APPROVE)

**Decision Framework:**
- Auto-approve: Formatting, linting, bug fixes, tests, docs, refactoring
- Quick review (30s): New features, architecture changes, API changes
- Deeper thought (2-5min): Major pivots, removing features, production deploys
- Reject immediately: Scope creep, analysis paralysis, premature optimization

**Risk Matrix:**
| Impact | Reversible? | Decision |
|--------|-------------|----------|
| Low | Yes | Auto-approve |
| Low | No | Approve with quick check |
| Medium | Yes | Approve with review |
| Medium | No | Deeper thought required |
| High | Yes | Approve with review |
| High | No | Deeper thought + consultation |

**Communication Style:**
- Direct, intense, zero bullshit
- "Let's fucking ship it" energy
- Focused on outcomes, not process
- High risk tolerance (ship and iterate)

**Core Principles:**
1. Ship Fast, Iterate Faster
2. Autonomous By Default
3. Vision Alignment Over Rules
4. Quality Through Speed
5. Dog-Food or Die

---

## Agent Communication Protocol

### Message Types

Agents can communicate through structured messages defined in `src/server/agent-protocol.ts`:

```typescript
type AgentMessageType =
  | 'request'      // ask another agent to do something
  | 'response'     // reply to a request
  | 'event'        // broadcast an event
  | 'handoff'      // transfer task to another agent
  | 'status'       // report agent status
  | 'discovery';   // find agents by capability
```

### Message Structure

```typescript
interface AgentMessage {
  id: string;                    // Unique message ID
  from: string;                  // Source agent name
  to: string;                    // Target agent or '*' for broadcast
  type: AgentMessageType;
  payload: Record<string, unknown>;
  timestamp: string;             // ISO 8601
  replyTo?: string;              // Optional reference to reply
}
```

### Agent Registration

Agents can register their capabilities:

```typescript
interface AgentRegistration {
  name: string;                  // e.g., "forge-builder"
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'offline';
  lastSeen: string;              // ISO 8601
}

interface AgentCapability {
  name: string;                  // e.g., "code-generation"
  description: string;
  inputSchema?: Record<string, unknown>;
}
```

### Message Router

The `AgentRouter` class (`src/server/agent-router.ts`) handles:
- Agent registration and discovery
- Message routing (unicast and broadcast)
- Message history for debugging
- Event-driven communication

**Usage:**
```typescript
import { AgentRouter } from './agent-router';

const router = new AgentRouter(100); // max 100 messages in history

// Register an agent
router.register({
  name: 'forge-builder',
  capabilities: [
    { name: 'code-generation', description: 'Generate production code' },
    { name: 'refactoring', description: 'Improve code structure' }
  ],
  status: 'idle',
  lastSeen: new Date().toISOString()
});

// Send a message
router.send({
  id: 'msg_123',
  from: 'forge-orchestrator',
  to: 'forge-builder',
  type: 'request',
  payload: { task: 'implement-auth' },
  timestamp: new Date().toISOString()
});

// Discover agents by capability
const builders = router.discover('code-generation');
```

### Discovery

Find agents by capability:

```typescript
// Find all agents that can generate code
const codeGenerators = router.discover('code-generation');

// Results:
// [
//   { name: 'forge-builder', capabilities: [...], status: 'idle', ... }
// ]
```

---

## Agent Marketplace

The Agent Marketplace (`src/server/agent-marketplace.ts`) provides agent registry and discovery.

### Scanning Installed Agents

```typescript
import { AgentMarketplace } from './agent-marketplace';

const marketplace = new AgentMarketplace('.claude/agents');

// Scan all installed agents
await marketplace.scanInstalled();

// Get all agents
const allAgents = marketplace.getAll();

// Get by category
const coreAgents = marketplace.getByCategory('core');

// Get by capability
const testingAgents = marketplace.getByCapability('testing');

// Get marketplace statistics
const stats = marketplace.getStats();
// {
//   totalAgents: 22,
//   installedAgents: 22,
//   categoryCounts: { core: 6, development: 8, ... },
//   modelCounts: { sonnet: 17, opus: 4, haiku: 1 }
// }
```

### Agent Categories

The marketplace auto-categorizes agents:

| Category | Agents |
|----------|--------|
| **core** | orchestrator, planner, builder, guardian, detective, oracle |
| **quality** | guardian, testing, security |
| **development** | refactor, api, ui, database, docs, testing |
| **operations** | devops, performance, analytics |
| **governance** | compliance, oracle, governance-verifier, CEO-LOOP |
| **intelligence** | learning, detective, CEO-LOOP |
| **documentation** | docs, release-sentinel |
| **integration** | integration |

### Agent Metadata

Each agent in the marketplace includes:

```typescript
interface MarketplaceAgent {
  id: string;               // e.g., "forge-builder"
  name: string;             // Full name
  version: string;          // Version (default: "1.0.0")
  description: string;      // From frontmatter
  author: string;           // Default: "NXTG-Forge"
  category: AgentCategory;  // Auto-categorized
  capabilities: string[];   // Extracted from description
  model: 'sonnet' | 'opus' | 'haiku';
  installPath: string;      // Relative to .claude/agents/
  installed: boolean;       // Always true for scanned agents
  builtIn: boolean;         // true for [AFRG]-* agents
  metadata: {
    createdAt: string;
    updatedAt: string;
    downloads?: number;
    rating?: number;
  };
}
```

---

## Creating Custom Agents

### Agent File Format

Agents are Markdown files with YAML frontmatter in `.claude/agents/`:

```markdown
---
name: my-custom-agent
description: |
  Use this agent when you need [specific capability]. This includes:
  [scenarios and use cases]

  <example>
  Context: [situation]
  user: "[user request]"
  assistant: "[how to invoke this agent]"
  <commentary>
  [explanation of when to use this agent]
  </commentary>
  </example>
model: sonnet
color: green
tools: Glob, Grep, Read, Write, Edit, Bash, TodoWrite
---

# My Custom Agent

You are the **My Custom Agent** - [role description].

## Your Role

[Detailed role description]

## When You Are Invoked

[Invocation conditions]

## Your Workflow

[Step-by-step process]

## Principles

[Core principles to follow]

## Tone

[Communication style]
```

### Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | Yes | Agent identifier | `forge-builder` |
| `description` | Yes | When/how to use, with examples | See format above |
| `model` | Yes | Claude model to use | `sonnet`, `opus`, `haiku` |
| `color` | Yes | UI theme color | `green`, `blue`, `red` |
| `tools` | Yes | Available tools | `Read, Write, Edit, Bash` |

### Example: Custom Agent for SQL Optimization

```markdown
---
name: sql-optimizer
description: |
  Use this agent when database queries need optimization. This includes:
  slow queries, missing indexes, N+1 query problems, or query plan analysis.

  <example>
  Context: User reports slow API response times.
  user: "The /users endpoint takes 3 seconds to respond"
  assistant: "I'll use the sql-optimizer agent to analyze and optimize the query."
  <commentary>
  Since performance issues are suspected in database queries, use the
  sql-optimizer agent to analyze query plans and recommend indexes.
  </commentary>
  </example>
model: sonnet
color: emerald
tools: Glob, Grep, Read, Bash, TodoWrite
---

# SQL Optimizer Agent

You are the **SQL Optimizer** - the database performance specialist.

## Your Role

You analyze slow queries, recommend indexes, and optimize database access patterns.

## When You Are Invoked

- Query performance issues reported
- Missing index detection needed
- N+1 query patterns identified
- Query plan analysis requested

## Your Workflow

### Step 1: Identify Slow Queries

Check application logs for slow query warnings:
```bash
grep "slow query" logs/app.log | tail -20
```

### Step 2: Analyze Query Plans

Get execution plans for suspected queries:
```sql
EXPLAIN ANALYZE SELECT ...;
```

### Step 3: Recommend Indexes

Based on query patterns, suggest indexes:
```sql
CREATE INDEX idx_users_email ON users(email);
```

### Step 4: Verify Improvement

Re-run query plan, confirm performance gain:
```
Before: 2850ms
After:  45ms
Improvement: 98.4%
```

## Principles

1. **Measure First** - Profile before optimizing
2. **Index Strategically** - Not every column needs an index
3. **Test Impact** - Verify improvements with real queries
4. **Document Changes** - Explain why indexes were added

## Tone

**Data-Driven:**
- "Query scans 45,000 rows - index on email would reduce to 1 row lookup"
- "EXPLAIN ANALYZE shows sequential scan - recommend B-tree index"

**Pragmatic:**
- "This index will help read performance but slow writes by ~5%"
- "Trade-off acceptable given read:write ratio is 95:5"
```

### Testing Your Custom Agent

1. **Save agent file** to `.claude/agents/my-custom-agent.md`
2. **Test invocation** via Task tool or orchestrator
3. **Verify tools work** (check Read, Write, etc. permissions)
4. **Validate output** against expected behavior
5. **Update description** based on real usage

---

## Agent Testing

### Test Infrastructure

Agent-related tests are in `src/test/agent/`:

```
src/test/agent/
├── agent-protocol.test.ts    # Message protocol tests
├── agent-marketplace.test.ts # Marketplace scanning tests
├── agent-validator.test.ts   # Agent file validation
└── agent-registry.test.ts    # Agent registration tests
```

### Running Tests

```bash
# Run all agent tests
npx vitest run src/test/agent

# Run specific test file
npx vitest run src/test/agent/agent-marketplace.test.ts

# Run with coverage
npx vitest run --coverage src/test/agent
```

### Testing Agent Invocation

Test that agents can be invoked correctly:

```typescript
import { describe, it, expect } from 'vitest';
import { AgentMarketplace } from '../../server/agent-marketplace';

describe('Agent Invocation', () => {
  it('should find agent by name', async () => {
    const marketplace = new AgentMarketplace('.claude/agents');
    await marketplace.scanInstalled();

    const builder = marketplace.getAgent('forge-builder');
    expect(builder).toBeDefined();
    expect(builder?.name).toBe('forge-builder');
    expect(builder?.model).toBe('sonnet');
  });

  it('should categorize agents correctly', async () => {
    const marketplace = new AgentMarketplace('.claude/agents');
    await marketplace.scanInstalled();

    const coreAgents = marketplace.getByCategory('core');
    expect(coreAgents).toContainEqual(
      expect.objectContaining({ name: 'forge-orchestrator' })
    );
  });
});
```

### Testing Message Protocol

```typescript
import { describe, it, expect } from 'vitest';
import { AgentRouter, createMessage } from '../../server/agent-router';

describe('Agent Communication', () => {
  it('should route messages correctly', () => {
    const router = new AgentRouter();

    router.register({
      name: 'forge-builder',
      capabilities: [{ name: 'code-generation', description: 'Generate code' }],
      status: 'idle',
      lastSeen: new Date().toISOString()
    });

    const message = createMessage(
      'forge-orchestrator',
      'forge-builder',
      'request',
      { task: 'implement-auth' }
    );

    expect(() => router.send(message)).not.toThrow();
  });

  it('should discover agents by capability', () => {
    const router = new AgentRouter();

    router.register({
      name: 'forge-builder',
      capabilities: [{ name: 'code-generation', description: 'Build code' }],
      status: 'idle',
      lastSeen: new Date().toISOString()
    });

    const agents = router.discover('code-generation');
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('forge-builder');
  });
});
```

### Validating Agent Files

Ensure agent markdown files have correct structure:

```typescript
import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import fs from 'fs/promises';

describe('Agent File Validation', () => {
  it('should have required frontmatter fields', async () => {
    const content = await fs.readFile('.claude/agents/[AFRG]-builder.md', 'utf-8');
    const { data } = matter(content);

    expect(data.name).toBeDefined();
    expect(data.description).toBeDefined();
    expect(data.model).toBeOneOf(['sonnet', 'opus', 'haiku']);
    expect(data.color).toBeDefined();
    expect(data.tools).toBeDefined();
  });

  it('should have valid example blocks in description', async () => {
    const content = await fs.readFile('.claude/agents/[AFRG]-builder.md', 'utf-8');
    const { data } = matter(content);

    expect(data.description).toContain('<example>');
    expect(data.description).toContain('</example>');
    expect(data.description).toContain('<commentary>');
  });
});
```

---

## Quick Reference

See [AGENT-QUICKREF.md](./AGENT-QUICKREF.md) for a single-page reference of all agents.

---

## Additional Resources

- **Agent Skills Framework:** `.claude/skills/CLAUDE-CODE-FRAMEWORK.MD`
- **Governance System:** `.claude/governance.json`
- **Plan Templates:** `.claude/plans/`
- **State Management:** `.claude/state/current.json`
- **Oracle Logs:** `.claude/logs/sentinel.jsonl`

---

## Contributing

When adding new agents to the ecosystem:

1. Create agent file in `.claude/agents/[CATEGORY]-name.md`
2. Follow the [Creating Custom Agents](#creating-custom-agents) format
3. Add tests in `src/test/agent/`
4. Update this documentation
5. Update `AGENT-QUICKREF.md`
6. Test via orchestrator invocation

---

**End of Documentation**

For questions or contributions, see the NXTG-Forge repository README.

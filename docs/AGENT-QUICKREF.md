# NXTG-Forge Agent Quick Reference

**22 Specialized Agents** | **Updated:** 2026-02-03

---

## Core Agents (6)

| Agent | Model | Color | Purpose | When to Use |
|-------|-------|-------|---------|-------------|
| **forge-orchestrator** | Opus | 🟣 Purple | Primary coordinator, presents 4-option menu | `/enable-forge`, resume work, soundboard, health check |
| **forge-builder** | Sonnet | 🟢 Green | Master implementer, writes production code | Plan approved, code implementation, refactoring |
| **forge-planner** | Sonnet | 🔵 Sky | Strategic architect, creates feature plans | Feature design, architecture decisions, task breakdown |
| **forge-guardian** | Sonnet | 🟡 Yellow | Quality assurance, testing, security | Post-implementation, pre-commit, code review |
| **forge-detective** | Sonnet | 🔵 Blue | Project analyzer, health checks | Soundboard mode, health check, tech stack detection |
| **forge-oracle** | Sonnet | 🟣 Magenta | Governance sentinel, scope validation | Background monitoring, governance validation |

---

## Development Agents (8)

| Agent | Model | Color | Purpose | When to Use |
|-------|-------|-------|---------|-------------|
| **forge-testing** | Sonnet | 🟢 Lime | Test generation and coverage analysis | Generate tests, find coverage gaps, fix flaky tests |
| **forge-docs** | Sonnet | ⚪ Slate | Documentation generation and audit | Generate JSDoc, README updates, changelog creation |
| **forge-refactor** | Sonnet | 🟣 Fuchsia | Code restructuring and simplification | Large files, duplication, high complexity, design patterns |
| **forge-security** | Sonnet | 🔴 Red | Security scanning and hardening | Pre-release audit, auth review, vulnerability scanning |
| **forge-performance** | Sonnet | 🟠 Orange | Performance optimization | Slow app, large bundle, memory leaks, slow APIs |
| **forge-database** | Sonnet | 🟢 Emerald | Data layer design and optimization | Schema design, migrations, query optimization |
| **forge-api** | Sonnet | 🔵 Cyan | API design and integration | New endpoints, external integrations, validation |
| **forge-ui** | Sonnet | 🎀 Pink | UI component development | New components, responsive fixes, accessibility |

---

## Operations Agents (3)

| Agent | Model | Color | Purpose | When to Use |
|-------|-------|-------|---------|-------------|
| **forge-devops** | Sonnet | ⚪ Gray | Infrastructure and deployment | Docker setup, CI/CD pipelines, environment config |
| **forge-analytics** | Haiku | 🔵 Teal | Metrics tracking and reporting | Usage analysis, metrics instrumentation, dashboards |
| **forge-integration** | Sonnet | 🟣 Indigo | External service connections | GitHub API, webhooks, OAuth, MCP servers |

---

## Governance & Intelligence Agents (5)

| Agent | Model | Color | Purpose | When to Use |
|-------|-------|-------|---------|-------------|
| **governance-verifier** | Haiku | 🟡 Bronze | Automated governance verification | Hook blocks, test mismatches, scope validation |
| **forge-compliance** | Haiku | 🟠 Amber | Regulatory and policy checks | License audit, GDPR compliance, accessibility |
| **forge-learning** | Haiku | 🟣 Violet | Adaptive intelligence, learns patterns | Improve recommendations, capture preferences |
| **release-sentinel** | Opus | 🟡 Gold | Documentation synchronization | Post-commit doc updates, release prep, changelog |
| **NXTG-CEO-LOOP** | Opus | 🔴 Crimson | Strategic decision-making (digital twin) | Product direction, architecture, final approval |

---

## Agent Invocation Examples

### Via Orchestrator Menu
```bash
User: /enable-forge
# Orchestrator presents 4-option menu:
# 1. Continue/Resume
# 2. Review & Plan Features  → forge-planner
# 3. Soundboard              → forge-detective
# 4. Health Check            → forge-detective
```

### Direct Task Invocation
```typescript
// From another agent or orchestrator
Task: "forge-builder"
Description: "Implement authentication system from plan-uuid-123"
```

### Automatic Invocation
```typescript
// Guardian runs automatically after builder completes
forge-builder completes → forge-guardian runs quality checks

// Oracle monitors in background during development
Edit/Write tools used → forge-oracle validates scope
```

---

## Agent Capabilities by Tool Access

| Tools | Agents |
|-------|--------|
| **All Tools** (Read, Write, Edit, Bash, Grep, Glob, TodoWrite, Task) | orchestrator |
| **Implementation** (Read, Write, Edit, Bash, Grep, Glob, TodoWrite) | builder, guardian, testing, docs, refactor, security, performance, database, api, ui, devops, integration, learning, governance-verifier |
| **Read-Only + Bash** (Read, Grep, Glob, Bash, TodoWrite) | planner, detective |
| **Read-Only** (Read, Grep, Glob, Bash, Write) | oracle |
| **Strategic** (Read, Grep, Glob, TodoWrite, Task, Write, Edit) | CEO-LOOP, release-sentinel |

---

## Agent Categories by Use Case

### Planning & Strategy
- **forge-planner** - Feature design and task breakdown
- **NXTG-CEO-LOOP** - Strategic decisions and approvals

### Implementation
- **forge-builder** - Production code generation
- **forge-api** - API endpoints and integration
- **forge-ui** - Frontend components
- **forge-database** - Data layer and schemas

### Quality Assurance
- **forge-guardian** - Quality gates and security
- **forge-testing** - Test generation and coverage
- **forge-security** - Security scanning and hardening
- **forge-refactor** - Code quality improvements

### Analysis & Insights
- **forge-detective** - Health checks and tech stack analysis
- **forge-analytics** - Metrics and usage patterns
- **forge-oracle** - Governance and scope validation

### Documentation
- **forge-docs** - Code documentation and API refs
- **release-sentinel** - Release notes and changelog

### Operations
- **forge-devops** - CI/CD and infrastructure
- **forge-performance** - Optimization and profiling
- **forge-integration** - External service connections

### Governance
- **governance-verifier** - Automated verification
- **forge-compliance** - Regulatory compliance
- **forge-learning** - Adaptive intelligence

---

## Model Distribution

| Model | Count | Agents |
|-------|-------|--------|
| **Sonnet 4.5** | 17 | orchestrator (uses Opus), builder, planner, guardian, detective, oracle, testing, docs, refactor, security, performance, database, api, ui, devops, integration |
| **Opus 4.5** | 4 | orchestrator, release-sentinel, CEO-LOOP |
| **Haiku 3.5** | 3 | analytics, compliance, learning, governance-verifier |

Note: Orchestrator is Opus but uses Sonnet for most coordinated agents.

---

## Agent Communication Flow

```
User Request
     ↓
forge-orchestrator (Opus)
     ├─→ forge-planner (Sonnet)      → Creates plan in .claude/plans/
     ├─→ forge-builder (Sonnet)      → Implements from plan
     │        ↓
     │   forge-guardian (Sonnet)     → Quality checks
     │        ↓
     ├─→ forge-detective (Sonnet)    → Health analysis
     ├─→ release-sentinel (Opus)     → Documentation sync
     └─→ NXTG-CEO-LOOP (Opus)        → Final approval

forge-oracle (Sonnet) runs in parallel, monitoring all changes
```

---

## Quick Decision Tree

**Need to:**
- **Start session** → `forge-orchestrator`
- **Plan feature** → `forge-planner`
- **Write code** → `forge-builder`
- **Test code** → `forge-testing` or `forge-guardian`
- **Review quality** → `forge-guardian`
- **Check health** → `forge-detective`
- **Document** → `forge-docs`
- **Optimize** → `forge-performance` or `forge-refactor`
- **Secure** → `forge-security`
- **Deploy** → `forge-devops`
- **Integrate** → `forge-integration` or `forge-api`
- **Govern** → `forge-oracle` (automatic) or `governance-verifier`
- **Approve** → `NXTG-CEO-LOOP`

---

## Key Files & Locations

| Purpose | Location | Used By |
|---------|----------|---------|
| Agent definitions | `.claude/agents/*.md` | All (frontmatter + system prompt) |
| Feature plans | `.claude/plans/*.md` | planner (writes), builder (reads) |
| Session state | `.claude/state/current.json` | orchestrator, all agents |
| Governance rules | `.claude/governance.json` | oracle, governance-verifier, CEO-LOOP |
| Oracle logs | `.claude/logs/sentinel.jsonl` | oracle, governance-verifier |
| User preferences | `.claude/forge/preferences.json` | learning, all agents |
| Agent protocol | `src/server/agent-protocol.ts` | All (message passing) |
| Agent marketplace | `src/server/agent-marketplace.ts` | orchestrator (discovery) |

---

## Testing Reference

```bash
# Test all agents
npx vitest run src/test/agent

# Test specific capability
npx vitest run src/test/agent/agent-marketplace.test.ts

# Test with coverage
npx vitest run --coverage src/test/agent
```

---

## Documentation Links

- **Full Documentation:** [docs/AGENTS.md](./AGENTS.md)
- **Claude Code Skills:** `.claude/skills/CLAUDE-CODE-FRAMEWORK.MD`
- **Project CLAUDE.md:** `CLAUDE.md`

---

**Remember:** Agents are NOT TypeScript services. They are Claude Code task invocations with specialized system prompts. They use tools (Read, Write, Edit, Bash) to do real work, not simulations.

---

**Quick Invocation Template:**

```typescript
Task: "agent-name"
Description: "Clear, actionable description of what needs to be done"
```

Example:
```typescript
Task: "forge-builder"
Description: "Implement authentication system from plan-auth-001 with JWT and refresh tokens"
```

---

**End of Quick Reference**

See [AGENTS.md](./AGENTS.md) for comprehensive documentation.

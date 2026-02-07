# Forge

<div align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg" alt="Version 3.0.0" />
  <img src="https://img.shields.io/badge/tests-4145_passing-brightgreen.svg" alt="4145 Tests Passing" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" />
</div>

<div align="center">
  <h3>AI Chief of Staff for Developers</h3>
  <p><strong>20 commands, 22 agents, 20 skills — install in 60 seconds</strong></p>
</div>

---

## What is Forge?

Forge is a **Claude Code plugin** that turns your AI assistant into a Chief of Staff. It adds governance, quality gates, specialized agents, and a real-time dashboard to any project.

It also works with Codex CLI and Gemini CLI (multi-framework adapter in progress).

## Install

```bash
git clone https://github.com/nxtg-ai/forge.git
cd forge
./init.sh /path/to/your/project
```

Or install into the current project:

```bash
git clone https://github.com/nxtg-ai/forge.git /tmp/forge
/tmp/forge/init.sh .
```

This copies commands, agents, skills, and hooks into your `.claude/` directory. Open Claude Code and type `/[FRG]-status` to verify.

## What You Get

### 20 Commands

| Command | What it does |
|---------|-------------|
| `/[FRG]-init` | Initialize Forge in your project |
| `/[FRG]-status` | Project health, git state, test results |
| `/[FRG]-status-enhanced` | Full dashboard with health score |
| `/[FRG]-enable-forge` | Command center with 4-option menu |
| `/[FRG]-feature` | Codebase analysis + feature spec generation |
| `/[FRG]-test` | Run tests with analysis |
| `/[FRG]-deploy` | Pre-flight validation + build |
| `/[FRG]-optimize` | Code metrics + optimization analysis |
| `/[FRG]-checkpoint` | Save project state snapshot |
| `/[FRG]-restore` | Restore from checkpoint |
| `/[FRG]-report` | Session activity report |
| `/[FRG]-gap-analysis` | Test, doc, security, and architecture gaps |
| `/[FRG]-spec` | Generate feature specifications |
| `/[FRG]-agent-assign` | Assign tasks to specialized agents |
| `/[FRG]-integrate` | Service scaffold + configuration |
| `/[FRG]-upgrade` | Detect config gaps, upgrade Forge |
| `/[FRG]-compliance` | License audit + SBOM generation |
| `/[FRG]-docs-status` | Documentation coverage analysis |
| `/[FRG]-docs-update` | Find and fix stale documentation |
| `/[FRG]-docs-audit` | Full documentation quality audit |

All 20 commands are wired and working. They use Claude's native tools (Bash, Read, Glob, Grep) — no external services required.

### 22 Specialized Agents

Forge includes agents for every development concern:

| Agent | Role |
|-------|------|
| CEO-LOOP | Autonomous strategic decisions |
| Oracle | Real-time governance sentinel |
| Orchestrator | Coordinates agent teams |
| Planner | Architecture and task breakdown |
| Builder | Implementation |
| Guardian | Quality gates |
| Detective | Project analysis and health checks |
| Security | Vulnerability scanning |
| Testing | Test generation and coverage |
| Compliance | License and regulatory checks |
| Docs | Documentation generation |
| Refactor | Code restructuring |
| Performance | Profiling and optimization |
| Analytics | Metrics and reporting |
| Learning | Pattern recognition |
| UI | Frontend component development |
| API | Endpoint design and integration |
| Database | Schema and query optimization |
| DevOps | CI/CD and infrastructure |
| Integration | External service connections |
| Release Sentinel | Documentation sync on release |
| Governance Verifier | Automated governance validation |

### 5 Engagement Modes

| Mode | Behavior |
|------|----------|
| **CEO** | Autonomous. Agents decide and execute. You see results only. |
| **VP** | Strategic oversight. Decisions surfaced, details on demand. |
| **Engineer** | Full agent activity. Technical details and logs visible. |
| **Builder** | Hands-on. All implementation details and task queues. |
| **Founder** | Everything visible. No filters, full system transparency. |

### Dashboard (Optional)

Forge includes a web dashboard with:

- **Governance HUD** — Live project context, health score, workstream tracking
- **Infinity Terminal** — Browser terminal with session persistence (survives disconnects)
- **Agent Activity** — Real-time agent coordination view
- **Oracle Feed** — Governance event stream

```bash
npm install
npm run dev
# Dashboard: http://localhost:5050
# API: http://localhost:5051
```

## How It Works

Forge is a set of markdown files in `.claude/`:

```
.claude/
  commands/     # 20 slash commands (markdown with embedded logic)
  agents/       # 22 agent definitions (system prompts + tool configs)
  skills/       # 20 skill modules (domain knowledge)
  hooks/        # 28 automation hooks (session, governance, quality)
```

When you type `/[FRG]-status` in Claude Code, it reads `.claude/commands/[FRG]-status.md` and executes the instructions. No server required. No npm dependencies. Just markdown files that make Claude smarter about your project.

The dashboard is optional — commands work without it.

## Requirements

- Claude Code (or Codex CLI / Gemini CLI)
- Node.js 18+ (only needed for the optional dashboard)
- Git

## Test Coverage

- **110 test files**
- **4085 tests passing, 0 failures**
- **0 TypeScript errors** (strict mode)

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

## Technology Stack

All dependencies MIT or Apache-2.0 licensed.

- **Plugin**: Pure markdown (zero dependencies)
- **Dashboard Frontend**: React 19, Vite 7, TailwindCSS, Framer Motion
- **Dashboard Backend**: Express 4, WebSocket, node-pty
- **Terminal**: xterm.js 6.0 with PTY bridge
- **Testing**: Vitest, Testing Library

## Contributing

1. Fork and clone
2. `npm install && npm test`
3. Make changes with tests
4. `npm run quality:gates`
5. Open a PR

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
  <p><strong>Built for developers who ship.</strong></p>
  <p><a href="https://github.com/nxtg-ai/forge">github.com/nxtg-ai/forge</a></p>
</div>

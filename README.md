# NXTG-Forge

<div align="center">
  <img src="https://img.shields.io/badge/version-3.0.0--beta-blue.svg" alt="Version 3.0.0-beta" />
  <img src="https://img.shields.io/badge/status-active--development-yellow.svg" alt="Active Development" />
  <img src="https://img.shields.io/badge/multi--project-enabled-purple.svg" alt="Multi-Project Enabled" />
</div>

<div align="center">
  <h3>AI-Orchestrated Development System for Claude Code</h3>
  <p><strong>Build with intelligent agent orchestration, real-time monitoring, and persistent terminal sessions</strong></p>
</div>

---

## What is NXTG-Forge?

NXTG-Forge is an **intelligent development orchestration framework** designed for Claude Code. It provides a governance dashboard, specialized AI agents, and the **Infinity Terminal** - a browser-based terminal with built-in session persistence that survives disconnects and browser restarts.

This project is in **active development**. The core infrastructure works today. Agent orchestration and commands are being refined based on real-world usage.

## Quick Start

Get NXTG-Forge running in under 5 minutes.

### Prerequisites
- Node.js 18+
- Git
- Claude Code (recommended) or any terminal

### Installation

```bash
# Clone the repository
git clone https://github.com/nxtg-ai/forge.git
cd forge

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard opens at `http://localhost:5050` and the API server runs on port `5051`.

### First Steps

1. Open the dashboard at `http://localhost:5050`
2. Initialize your project with `/[FRG]-init` in Claude Code
3. View the Governance HUD to see project state
4. Use the Infinity Terminal for persistent shell sessions
5. Try `/[FRG]-status` to see available commands

## Features

### Working Today

| Feature | Status | Description |
|---------|--------|-------------|
| **Infinity Terminal** | Production | Browser-based xterm.js terminal with built-in session persistence (no Zellij required) |
| **Governance HUD** | Working | Real-time 6-panel dashboard showing project state, workstreams, and metrics |
| **Dashboard UI** | Working | React-based UI with Spring animations and responsive layout |
| **Init Wizard** | Working | Project initialization with vision capture and agent scaffolding |
| **State Management** | Production | Event-sourced state with automatic backup and recovery |
| **Vision Management** | Production | Canonical vision system with decision alignment scoring |
| **Bootstrap System** | Production | Self-bootstrapping from GitHub with automatic rollback |
| **Agent Framework** | Working | Protocol definitions and coordination infrastructure |
| **API Server** | Working | Express + WebSocket server with 10+ endpoints |
| **Multi-device Access** | Working | Vite proxy configuration for LAN access (tested on WSL2) |

### In Development

| Feature | Status | What's Left |
|---------|--------|-------------|
| **Commands** | Partial | 19 commands defined, core commands working, refinement needed |
| **Agent Orchestration** | Framework Ready | Agent protocol defined, marketplace and registry in testing |
| **Memory System** | In Design | Deciding between enhancing Claude native memory vs custom layer |
| **Skill Packs** | Planned | Marketplace and premium skill-packs designed, implementation pending |
| **Worker Pool** | UI Only | Beautiful UI exists, background agent execution not wired |
| **Real-time Updates** | Partial | Sentinel log updates manually, need auto-pipeline |

### Planned

- Claude Code Plugin distribution
- Production deployment automation
- License compliance checker (SBOM generation)
- Test coverage visualization in HUD
- Agent marketplace with premium packs

## Installation

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check test coverage (currently building toward 80%)
npm run test:coverage

# Run quality gates
npm run quality:gates

# Start development server
npm run dev
```

### Multi-Device Setup (WSL2)

To access the UI from another device on your LAN:

1. Configure Vite to bind to `0.0.0.0` (already done in `vite.config.ts`)
2. Add Windows firewall rule for ports 5050, 5051:
```powershell
New-NetFirewallRule -DisplayName 'NXTG Forge' -Direction Inbound -LocalPort 5050,5051 -Protocol TCP -Action Allow
```
3. Find your WSL IP: `ip addr show eth0`
4. Access from other device: `http://{WSL_IP}:5050`

Note: Use relative URLs (`/api/...`) in dev mode. Vite's proxy handles routing to the API server.

## Usage

### Basic Workflow

```bash
# Initialize Forge in your project
/[FRG]-init

# Check project status
/[FRG]-status

# Open the governance dashboard
# Browser opens at http://localhost:5050

# Use Infinity Terminal for persistent sessions
# Sessions survive browser close/reopen and network disconnects
```

### Available Commands

NXTG-Forge provides 19 commands (prefix: `/[FRG]-`):

| Command | Status | Description |
|---------|--------|-------------|
| `/[FRG]-init` | Working | Initialize Forge in your project |
| `/[FRG]-status` | Working | Show project status and health |
| `/[FRG]-status-enhanced` | Working | Open governance dashboard |
| `/[FRG]-enable-forge` | Working | Enable Forge command center |
| `/[FRG]-feature` | In Progress | Feature development workflow |
| `/[FRG]-test` | In Progress | Test execution and coverage |
| `/[FRG]-deploy` | Defined | Deployment automation |
| `/[FRG]-optimize` | Defined | Performance optimization |
| `/[FRG]-checkpoint` | Working | State checkpoint management |
| `/[FRG]-restore` | Working | Restore from checkpoint |
| `/[FRG]-docs-audit` | Defined | Documentation audit |
| `/[FRG]-docs-status` | Defined | Documentation health check |
| `/[FRG]-docs-update` | Defined | Update documentation |
| `/[FRG]-gap-analysis` | Defined | Identify project gaps |
| `/[FRG]-report` | Defined | Generate activity report |
| `/[FRG]-agent-assign` | Defined | Agent task assignment |
| `/[FRG]-integrate` | Defined | Integration tools |
| `/[FRG]-spec` | Defined | Specification generation |
| `/[FRG]-upgrade` | Defined | System upgrades |

Commands marked "Working" are production-ready. Commands marked "Defined" have specifications but need implementation refinement.

### Infinity Terminal

The Infinity Terminal is NXTG-Forge's standout feature:

- **Browser-based**: xterm.js with full ANSI color support
- **Session Persistence**: Built into the PTY bridge - survives browser close/reopen
- **Automatic Reconnect**: Network disconnects don't lose your session
- **Multi-client**: Multiple browser tabs can connect to the same session
- **No Dependencies**: Zellij is optional for local enhancement, not required

Sessions are tracked by ID in `api-server.ts` and persist as long as the API server is running.

## Architecture

```
NXTG-Forge v3.0
├── src/
│   ├── components/        # React UI components (Dashboard, Terminal, HUD)
│   ├── core/             # Core systems (Bootstrap, Vision, State)
│   ├── server/           # Express API server + WebSocket + PTY bridge
│   ├── services/         # Business logic (Init, Automation, Agent coordination)
│   ├── hooks/            # React hooks (keyboard shortcuts, session persistence)
│   ├── test/             # 27 test files (integration, quality, agent, e2e)
│   └── types/            # TypeScript + Zod schemas
├── .claude/
│   ├── agents/           # 22 agent definitions
│   ├── commands/         # 19 command definitions
│   ├── skills/           # 12 skill files
│   ├── forge/            # Harness (agent templates, memory, config)
│   ├── state/            # Session state (current.json, backup.json)
│   └── governance.json   # Project governance state
└── docs/                 # Documentation (architecture, guides, reports)
```

## Technology Stack

All dependencies are **MIT or Apache-2.0 licensed** (no copyleft).

- **Frontend**: React 19, Vite 7, TailwindCSS, Framer Motion
- **Terminal**: xterm.js 6.0 + node-pty for PTY bridge
- **Backend**: Express 4, WebSocket (ws), Winston logging
- **State**: Zod validation, event-sourced state management
- **Testing**: Vitest with coverage reporting
- **Types**: TypeScript 5 with strict mode

Note: `node-pty` requires native compilation (Python 3 + node-gyp). This affects distribution strategy.

## Test Coverage

Current status: **Building toward 80% coverage target**

```bash
# Run tests with coverage
npm run test:coverage
```

We have:
- 27 test files covering core systems, UI components, and integration
- Quality gates for type safety (0 `any` types in production code)
- Error handling tests for file system, network, and data corruption
- Agent protocol and marketplace tests
- E2E and integration test suites

Coverage is tracked per module with goals set in `.claude/config.json`.

## Contributing

We welcome contributions. Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run quality gates: `npm run quality:gates`
5. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
6. Push and open a Pull Request

See `CONTRIBUTING.md` for detailed guidelines.

## Project Structure

NXTG-Forge uses a clear separation:

- `.claude/forge/` - The Forge harness (committed, portable, shareable)
- `.forge/` - User's personal vault (gitignored, not part of the product)
- `docs/` - Public documentation shipped with the product
- `src/` - Implementation code (TypeScript/React)

The harness (`.claude/forge/`) is what gets installed in user projects. It contains agent templates, skill packs, and configuration.

## License

MIT License. See `LICENSE` file for details.

Core functionality is open-source MIT. Future commercial features (cloud hosting, team collaboration, enterprise SSO) may use separate licensing.

## Documentation

- **Architecture**: `docs/architecture/` - System design and decisions
- **Guides**: `docs/guides/QUICK-START.md` - Getting started guides
- **Operations**: `docs/operations/` - Deployment and production readiness
- **Reports**: `docs/reports/` - Status reports and audits
- **Agents**: `docs/agents/README.md` - Agent system documentation

## Known Issues

See `docs/STRATEGIC-AUDIT-2026-02-04.md` for complete gap analysis. Key items:

1. **Memory System Decision**: Evaluating integration with Claude Code's native memory vs custom implementation
2. **Governance Pipeline**: HUD shows current state but real-time agent updates need wiring
3. **Worker Pool**: UI implemented but background agent execution not connected
4. **Commands**: Most commands defined but some need implementation refinement

We're dogfooding NXTG-Forge to build NXTG-Forge. Real issues are tracked and addressed iteratively.

## What Makes This Different

1. **Infinity Terminal**: First browser terminal with built-in session persistence (no tmux/Zellij dependency)
2. **Governance HUD**: Real-time visibility into project state, not just code metrics
3. **Agent Framework**: Protocol-driven agent coordination for true orchestration
4. **Vision Management**: Canonical vision system with decision alignment tracking
5. **Production Focus**: Planning for production (licensing, compliance, SBOM) as first-class features

## Community & Support

- **GitHub**: [github.com/nxtg-ai/forge](https://github.com/nxtg-ai/forge)
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions

---

<div align="center">
  <h3>Ready to try it?</h3>
  <p><code>npm install && npm run dev</code></p>
  <br/>
  <p>Built for developers, by developers, with AI orchestration</p>
</div>

# Contributing to NXTG-Forge UI (`nxtg-ai/forge-ui`)

Welcome to `nxtg-ai/forge-ui` — the local browser dashboard and Infinity Terminal (Level 3) for NXTG-Forge, built with React 19, Vite 7, Express 5, TypeScript 5, `xterm.js` 6, and `node-pty`.

> Looking for a scoped first PR? Check open issues labeled [`good first issue`](https://github.com/nxtg-ai/forge-ui/labels/good%20first%20issue).

## Getting Started

### Prerequisites

- **Node.js >= 22.12** (Vite 7 requires `^20.19 || >=22.12`; `package.json` enforces `>=22.0.0`)
- **npm** (bundled with Node.js)
- **Native build toolchain** for `node-pty` (`python3`, `make`, `g++` — e.g. `sudo apt-get install -y python3 make g++` on Debian/Ubuntu/WSL2, or `xcode-select --install` on macOS)
- **Git**

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/nxtg-ai/forge-ui.git
cd forge-ui

# Install dependencies
npm install

# Start development servers (API server on :5051 + Vite UI on :5050)
npm run dev

# In a second terminal, generate a single-use 60-second browser sign-in link:
npm run auth:login-link
```

### Available Scripts

```bash
npm run dev              # Start both API server (:5051) and UI dev server (:5050)
npm run auth:login-link  # Print a single-use 60-second browser sign-in link
npm run build            # TypeScript check + Vite UI production build
npm run build:server     # Compile Express/WebSocket server to dist/
npm run lint             # Run ESLint across src/
npm run format           # Format code with Prettier
npm run test             # Run Vitest in watch mode
npm run test:coverage    # Run full test suite with coverage report
npm run test:security    # Run security test suite
npm run test:quality     # Run quality invariant tests (type-safety, stage, release-notes)
npm run quality:gates    # Full local gate check (build, server build, smoke, lint, coverage, audits)
```

## Project Structure

```text
forge-ui/
├── src/
│   ├── components/            # React 19 UI components
│   │   ├── infinity-terminal/ # Persistent xterm.js terminal UI
│   │   ├── dashboard/         # Governance HUD & dashboard panels
│   │   ├── layout/            # AppHeader, AppShell
│   │   └── ui/                # Reusable primitives
│   ├── pages/                 # Full-view screens (Dashboard, Infinity Terminal, Command, Vision, Architect)
│   ├── server/                # Express 5 + WebSocket API server, auth, and PTY bridge
│   ├── core/                  # Core state, vision, and runspace managers
│   ├── services/              # Init, status, governance, and API services
│   ├── hooks/                 # React hooks (including session persistence)
│   ├── types/                 # TypeScript types and Zod schemas
│   └── test/                  # Integration, e2e, performance, quality, and security suites
├── docs/                      # Architecture docs, API OpenAPI spec, and UI screenshots
├── scripts/                   # Dev startup, ESM import fixer, and smoke checks
└── .github/                   # Workflows, issue templates, PR template, and stage checks
```

## Development Workflow

### Branch Naming

Create a feature branch from `main` (never push directly to `main`):

- `feature/` — New features (e.g., `feature/terminal-search-highlight`)
- `fix/` — Bug or security fixes (e.g., `fix/terminal-reconnect`)
- `docs/` — Documentation updates (e.g., `docs/quickstart-prereqs`)
- `refactor/` — Code refactoring (e.g., `refactor/vision-serializer`)
- `test/` — Test additions or flake fixes (e.g., `test/worker-spawn-timeout`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

### Contribution License

Contributions are submitted under the project’s [Apache License 2.0](./LICENSE.md).

### Pull Request Process & CI Gates

Every PR targeting `main` runs required automated checks:

1. **Stage consistency** (`bash .github/scripts/check-stage.sh`) — `STAGE`, `README.md` line 9, `CHANGELOG.md`, and `src/services/app-stage.ts` must stay synchronized.
2. **Build & Server Smoke** (`npm run build`, `npm run build:server`, `npm run smoke:built`).
3. **Lint & Type Safety** (`npx tsc --noEmit`, `npm run lint`, and `src/test/quality/type-safety.test.ts` which ratchets explicit `any` and type assertions).
4. **Tests & Coverage** — `PR Protection` enforces a **test-count ratchet (`>= 4513` passing tests)** so existing tests are never silently dropped, and `Quality Gates` enforces the `vitest.config.ts` line coverage floor (**60% CI floor; 80%+ target for new code**).
5. **Security & E2E** — `npm audit --omit=dev`, CodeQL (`Analyze (javascript-typescript)`), Semgrep SAST, Gitleaks secret scanning, and Playwright Chromium `Terminal E2E`.

## Code Standards

- **TypeScript strict mode** — Avoid `any`; prefer `unknown` with runtime type guards or Zod schemas. Keep explicit type assertions (`as`) within the `type-safety.test.ts` ratchet.
- **React 19 functional components** — Type all props with interfaces, use Tailwind CSS classes, and extract stateful logic into hooks.
- **Vitest only** — Co-locate unit tests (`*.test.ts` / `*.test.tsx`) next to source files or under `src/test/{security,quality,integration}/`. Use concrete assertions (avoid hollow `toBeDefined()` checks).
- **Relative URLs in client code** — Use `/api/...` and `/ws` so Vite's proxy and multi-device LAN/WSL2 access keep working without hardcoded `localhost` URLs.
- **Infinity Terminal architecture** — Session persistence is built into the PTY bridge (`src/server/pty-bridge.ts`) and `useSessionPersistence.ts`. Zellij and tmux are not required.

## Questions?

- Check [`docs/README.md`](./docs/README.md) for architecture and API documentation.
- Open an issue using the [issue chooser](https://github.com/nxtg-ai/forge-ui/issues/new/choose).

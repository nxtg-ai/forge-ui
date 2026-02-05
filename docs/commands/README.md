# Forge Commands Reference

NXTG-Forge provides a comprehensive set of commands for development, testing, deployment, and system management.

---

## Available Commands

### Development Commands

| Command | Purpose | Status |
|---------|---------|--------|
| `npm run dev` | Start dev servers (API + UI) | ✅ Available |
| `npm run build` | Build UI for production | ✅ Available |
| `npm run preview` | Preview production build locally | ✅ Available |

---

### Testing & Quality

| Command | Purpose | Status |
|---------|---------|--------|
| `npm run test` | Run tests in watch mode | ✅ Available |
| `npm run test:coverage` | Generate coverage report | ✅ Available |
| `npm run test:ui` | Interactive test UI | ✅ Available |
| `npm run test:integration` | Integration tests only | ✅ Available |
| `npm run test:security` | Security tests only | ✅ Available |
| `npm run test:performance` | Performance tests only | ✅ Available |
| `npm run lint` | Run ESLint | ✅ Available |
| `npm run format` | Format code with Prettier | ✅ Available |
| `npm run quality:gates` | Full quality gate check | ✅ Available |

---

### Forge Agent Commands

NXTG-Forge commands are designed to work with Claude Code. These are invoked through Claude's Task feature in `.claude/commands/*.md`:

**Core Commands** (invoke in Claude):
- `/[FRG]-init` - Initialize Forge in a project
- `/[FRG]-status` - Show project status
- `/[FRG]-feature` - Build a new feature
- `/[FRG]-test` - Run comprehensive tests
- `/[FRG]-deploy` - Deploy to production
- `/[FRG]-optimize` - Performance optimization
- `/[FRG]-report` - Generate activity reports
- `/[FRG]-docs-audit` - Audit documentation completeness

**Enterprise Commands**:
- `/[FRG]-enable-forge` - Enable Forge command center
- `/[FRG]-agent-assign` - Assign work to specific agents
- `/[FRG]-checkpoint` - Create system checkpoint
- `/[FRG]-gap-analysis` - Analyze implementation gaps
- `/[FRG]-integrate` - Integration tools
- `/[FRG]-restore` - Restore from checkpoint
- `/[FRG]-spec` - Generate specifications
- `/[FRG]-upgrade` - System upgrades

See: **[Agent Ecosystem Documentation](../agents/README.md)** for how commands coordinate with agents.

---

## Command Line Scripts

### Available in npm

```bash
# Development
npm run dev              # Start both servers (Vite + API)
npm run build            # Production build
npm run preview          # Preview built app

# Testing (see docs/guides/TESTING-GUIDE.md for details)
npm run test             # Watch mode
npm run test:coverage    # Coverage report
npm run test:ui          # Test UI dashboard
npm run test:integration # Integration tests only
npm run test:security    # Security tests only
npm run test:performance # Performance tests only

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
npm run quality:gates    # All checks (build, lint, test, coverage)

# Useful Shortcuts
npm run test:watch       # Long-form watch mode
npm run clean            # Remove build artifacts
```

---

## Development Workflow

### Daily Development

```bash
# 1. Start development servers
npm run dev

# 2. In another terminal, run tests in watch mode
npm run test

# 3. Before committing, run quality gates
npm run quality:gates

# 4. Push with confidence!
```

### Adding a Feature

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement with tests
3. Run quality gates: `npm run quality:gates`
4. Commit with conventional format
5. Push and create PR

### Bug Fixes

1. Create fix branch: `git checkout -b fix/bug-description`
2. Write test that reproduces bug
3. Fix implementation
4. Verify test passes
5. Run quality gates
6. Commit and PR

---

## Continuous Integration

### What Runs in CI

When you push or create a PR:

```bash
npm run quality:gates
```

This runs (in sequence):
1. **Build** - `npm run build` (React build)
2. **Lint** - `npm run lint` (code style)
3. **Test** - `npm run test` (all tests)
4. **Coverage** - Verify 85% threshold

**If any step fails, the PR is blocked.**

---

## Advanced Commands

### Environment Variables

```bash
# Development (automatically loaded from .env)
VITE_API_URL=http://localhost:5051
VITE_WS_URL=ws://localhost:5051
NODE_ENV=development

# Production (set in deployment pipeline)
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
NODE_ENV=production
```

### Docker Commands

For containerized deployment:

```bash
# Build image
docker build -t nxtg-forge:latest .

# Run container
docker run -p 5050:5050 -p 5051:5051 nxtg-forge:latest

# Multi-device access on WSL
docker run -p 0.0.0.0:5050:5050 -p 0.0.0.0:5051:5051 nxtg-forge:latest
```

---

## Troubleshooting

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests with verbose output
npm run test -- --reporter=verbose

# Run specific test file
npm run test -- src/test/unit/your-test.test.ts
```

### Build Errors

```bash
# Clean build
npm run clean
npm run build

# Check for type errors
npx tsc --noEmit

# Check for linting errors
npm run lint
```

### Lint Errors

```bash
# Fix automatically (most issues)
npm run format

# Fix specific issues
npx eslint src --fix

# Check remaining issues
npm run lint
```

### Coverage Below Threshold

```bash
# See detailed coverage report
npm run test:coverage

# Check specific file coverage
npx vitest coverage --include='src/components/**'
```

---

## Performance Profiling

### React Profiler

Use React DevTools to profile components:

```bash
# In browser DevTools
1. Open React DevTools
2. Go to "Profiler" tab
3. Record interactions
4. Analyze render times
```

### Network Profiling

Use browser DevTools Network tab:

```bash
# Check request sizes and times
1. Open DevTools → Network tab
2. Filter by document/XHR/WebSocket
3. Check response times (p95 should be < 200ms)
```

---

## Release Management

### Version Bumping

NXTG-Forge uses semantic versioning (major.minor.patch):

```bash
# Check current version
npm --version

# Version is in package.json
cat package.json | grep version

# Update manually for release
# Format: "version": "X.Y.Z"
```

### Creating a Release

```bash
# 1. Ensure all tests pass
npm run quality:gates

# 2. Build production version
npm run build

# 3. Create git tag
git tag v3.1.0

# 4. Push tag
git push origin v3.1.0

# 5. Create GitHub release from tag
# (automatically triggers any release workflows)
```

---

## Documentation

### Build Documentation

Commands used by Forge agents to generate docs:

```typescript
// In orchestrator or documentation agent
const result = await executeCommand({
  type: 'generate-docs',
  scope: 'api',     // or 'components', 'guides', etc.
  includeExamples: true,
  outputFormat: 'markdown',
});
```

---

## Getting Help

- **For command questions:** See [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **For feature implementation:** See [docs/guides/QUICK-START.md](../guides/QUICK-START.md)
- **For testing strategy:** See [docs/guides/TESTING-GUIDE.md](../guides/TESTING-GUIDE.md)
- **For deployment:** See [docs/operations/PRODUCTION-READINESS.md](../operations/PRODUCTION-READINESS.md)

---

**Last Updated:** 2026-02-05
**Maintained By:** Forge Docs Agent

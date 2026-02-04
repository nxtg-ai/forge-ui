# Contributing to NXTG-Forge v3

Welcome to NXTG-Forge v3 - an AI-orchestrated development system built with React 19, TypeScript, and Claude Code agents.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/NXTG-Forge.git
cd NXTG-Forge/v3

# Install dependencies
npm install

# Start development servers (API server + Vite UI)
npm run dev

# The UI will be available at http://localhost:5050
# API server runs on http://localhost:5051
```

### Available Scripts

```bash
npm run dev              # Start both API server and UI dev server
npm run test             # Run tests in watch mode
npm run test:coverage    # Generate coverage report (85% threshold)
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run build            # Build UI for production
npm run quality:gates    # Run full quality gate checks (build, lint, test, coverage)
```

## Project Structure

```
v3/
├── src/
│   ├── components/        # React components
│   │   ├── infinity-terminal/  # Terminal component with session persistence
│   │   ├── dashboard/          # Main dashboard UI
│   │   ├── ui/                 # Reusable UI components
│   │   └── ...
│   ├── server/           # Backend API server (Express + WebSocket)
│   ├── core/             # Core business logic
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── test/             # Test suites
│       ├── integration/  # Integration tests
│       ├── performance/  # Performance tests
│       ├── quality/      # Quality assurance tests
│       └── security/     # Security tests
├── .claude/
│   ├── agents/           # Claude Code agent definitions
│   └── plans/            # Implementation plans
└── dist-ui/              # Production build output
```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/oauth-integration`)
- `fix/` - Bug fixes (e.g., `fix/terminal-reconnect`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `test/` - Test improvements (e.g., `test/coverage-increase`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

**Examples:**
```
feat(auth): Add OAuth2 authentication flow
fix(terminal): Resolve session persistence on reconnect
docs(api): Add comprehensive API documentation
refactor(services): Apply SOLID principles to UserService
test(auth): Increase coverage for authentication module
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following code standards (see below)
3. **Write tests** - Minimum 85% coverage required
4. **Run quality checks** - `npm run quality:gates`
5. **Commit with conventional format** - See commit message guidelines above
6. **Push and create PR** with descriptive title and summary
7. **Wait for CI** - Quality gates must pass (build, lint, test, security)
8. **Address review feedback** - Make requested changes
9. **Merge** - Squash and merge once approved

## Code Standards

### TypeScript

- **Strict mode enabled** - All type errors must be resolved
- **No `any` types** - Use proper type definitions or `unknown` with type guards
- **Type all function signatures** - Parameters and return types required
- **Use path aliases** - `@/`, `@components/`, `@core/`, `@utils/`, `@types/`

```typescript
// Good
function calculateScore(coverage: number, security: number): number {
  return Math.round(coverage * 0.5 + security * 0.5);
}

// Bad - missing types
function calculateScore(coverage, security) {
  return Math.round(coverage * 0.5 + security * 0.5);
}
```

### React Components

- **React 19 functional components only** - No class components
- **Use TypeScript interfaces for props** - Type all component props
- **Tailwind CSS only** - No inline styles, no CSS modules, no styled-components
- **Extract complex logic to hooks** - Keep components focused on rendering

```tsx
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'}
    >
      {label}
    </button>
  );
}
```

### Testing

- **Vitest for all tests** - No Jest, no other frameworks
- **Coverage thresholds** - 85% lines, 85% statements, 80% branches, 85% functions
- **Test file naming** - `*.test.ts` or `*.test.tsx` alongside source files
- **Test structure** - Arrange, Act, Assert pattern

```typescript
// Good test structure
describe('AuthService', () => {
  it('should successfully authenticate valid credentials', () => {
    // Arrange
    const authService = new AuthService();
    const credentials = { email: 'test@example.com', password: 'secret' };

    // Act
    const result = authService.login(credentials);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().email).toBe('test@example.com');
  });
});
```

### Code Quality

- **Functions < 25 lines** - Ideal 5-15 lines, maximum 25 lines
- **Single Responsibility** - One function, one job
- **Descriptive naming** - No abbreviations except universally known (HTTP, API, UI)
- **Comments for WHY, not WHAT** - Code should be self-documenting

## Testing

### Run Tests

```bash
npm run test              # Watch mode
npm run test:coverage     # Generate coverage report
npm run test:ui           # Interactive UI mode
```

### Test Categories

```bash
npm run test:integration  # Integration tests
npm run test:security     # Security tests
npm run test:performance  # Performance tests
npm run test:quality      # Quality assurance tests
```

### Coverage Requirements

- Overall: 85% minimum (enforced in CI)
- Critical business logic: 100% coverage expected
- UI components: 80% minimum acceptable
- Utility functions: 100% coverage expected

CI will fail if coverage drops below thresholds defined in `vitest.config.ts`.

## Agent Development

NXTG-Forge uses Claude Code agents for orchestration. Agents are defined in `.claude/agents/`.

### Agent File Format

```markdown
---
name: agent-name
description: |
  When to use this agent and what it does.
model: sonnet
color: blue
tools: Glob, Grep, Read, Write, Edit, Bash
---

# Agent Name

Agent implementation details and instructions...
```

### Creating a New Agent

1. Create file in `.claude/agents/` with format `[AFRG]-agent-name.md`
2. Define YAML frontmatter (name, description, model, tools)
3. Write agent instructions following existing patterns
4. Test agent by invoking it through the orchestrator

**Important:** Agents use Claude Code's native tools (Read, Write, Edit, Bash). Do NOT build TypeScript meta-services for orchestration.

## Code Review Checklist

Before requesting review, ensure:

### Code Quality
- [ ] TypeScript strict mode passes (no `any` types)
- [ ] ESLint passes with no warnings (`npm run lint`)
- [ ] Code formatted with Prettier (`npm run format`)
- [ ] Functions under 25 lines
- [ ] Descriptive variable/function names

### Testing
- [ ] Tests written for new code
- [ ] Coverage meets 85% threshold (`npm run test:coverage`)
- [ ] All tests pass locally
- [ ] Edge cases covered

### Documentation
- [ ] Public functions have JSDoc comments
- [ ] Complex logic explained in comments (WHY, not WHAT)
- [ ] README updated if adding new features
- [ ] CLAUDE.md updated if changing architecture

### CI/CD
- [ ] Quality gates pass locally (`npm run quality:gates`)
- [ ] No security vulnerabilities introduced
- [ ] Build succeeds (`npm run build`)

### PR Description
- [ ] Clear title describing the change
- [ ] Summary of what changed and why
- [ ] Test plan or steps to verify
- [ ] Screenshots/videos for UI changes

## Architecture Notes

### Multi-Device Access
- UI uses Vite's proxy for multi-device access (dev mode)
- DO NOT hardcode `localhost` URLs in client code
- Use relative URLs (`/api/...`) - Vite proxy handles routing
- Production builds use environment variables

### Session Persistence
- Infinity Terminal has BUILT-IN session persistence
- Sessions survive browser close/reopen and network disconnects
- Zellij is OPTIONAL, NOT required
- See `CLAUDE.md` for architecture details

## Questions?

- Check `CLAUDE.md` for project conventions
- Review existing code in `src/` for patterns
- Read agent definitions in `.claude/agents/` for examples
- Open an issue for clarification

---

**Remember:** Quality over speed. Write code you'd be proud to review.

# Best Practices for NXTG-Forge v3

Master the patterns and principles that make NXTG-Forge development efficient, maintainable, and scalable.

---

## Overview

This directory contains curated best practices for:
- Code organization and structure
- Testing strategies and patterns
- Performance optimization
- Security hardening
- Deployment confidence
- Team collaboration

---

## Quick Links

### Code Quality
- **[Quality Quick Reference](../guides/QUALITY-QUICK-REFERENCE.md)** - Essential code quality standards and enforcement gates

### Testing
- **[Testing Guide](../guides/TESTING-GUIDE.md)** - Comprehensive testing strategy (unit, integration, E2E, security)
- **[Data TestID Process](../testing/data-testid-process.md)** - Semantic testing approach for reliable E2E tests

### Performance
- **[Performance Optimization](../operations/PRODUCTION-READINESS.md#performance-requirements)** - Production performance targets and optimization techniques

### Development Workflow
- **[Contributing Guide](../../CONTRIBUTING.md)** - Branch names, commits, PR process, code review checklist

### Deployment
- **[Production Readiness](../operations/PRODUCTION-READINESS.md)** - Checklist and requirements for production deployment
- **[Release Process](../operations/RELEASE-READINESS.md)** - Version management and release procedures

---

## Core Principles

### 1. Code as Craft

Write code that is beautiful, readable, and a joy to maintain.

**Practices:**
- Functions under 25 lines (ideal 5-15)
- Single responsibility principle
- Descriptive naming (no abbreviations)
- Comments explain WHY, not WHAT
- Consistent formatting via Prettier

**Example:**
```typescript
// Good: Function name describes intent
function calculateProjectHealthScore(metrics: QualityMetrics): HealthScore {
  // Implementation is self-explanatory
}

// Bad: Unclear purpose
function calc(m: any): any {
  return m.coverage * 0.5 + m.security * 0.5;
}
```

---

### 2. Quality is Non-Negotiable

Every line of code must meet high standards.

**Standards:**
- **TypeScript Strict:** All type errors resolved, no `any` types
- **ESLint:** Zero warnings, enforced via CI
- **Test Coverage:** 85% minimum (enforced in vitest.config.ts)
- **Code Review:** Two eyes on every change
- **Accessibility:** WCAG 2.1 AA compliance

**Verification:**
```bash
npm run quality:gates  # Runs all checks: build, lint, test, coverage
```

---

### 3. Simplicity First

The best solution is the simplest one that solves the problem.

**Practices:**
- Avoid over-engineering
- No premature optimization
- Use framework features (React 19, Tailwind, TypeScript)
- Delete code when possible
- Prefer clarity over cleverness

**Anti-Pattern:**
```typescript
// Over-engineered
const fibonacci = (n: number): number =>
  n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);

// Simple and clear
function fibonacci(n: number): number {
  if (n <= 1) return n;
  let [a, b] = [0, 1];
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
```

---

### 4. Automate the Mundane

Let machines handle repetitive work.

**Automated Systems:**
- **ESLint + Prettier:** Enforce style automatically
- **Testing:** Run on every commit (via git hooks)
- **CI/CD:** Quality gates before merge
- **Coverage:** Enforced thresholds
- **Type Checking:** Strict mode catches errors early

---

## Architecture Patterns

### Multi-Agent Orchestration

NXTG-Forge uses a 22-agent ecosystem for specialized work.

**Pattern:**
```
Orchestrator Agent (coordinates)
  ├── Builder Agent (implementation)
  ├── Guardian Agent (quality & security)
  ├── Detective Agent (debugging)
  ├── Planner Agent (task breakdown)
  ├── Architecture Agent (design)
  └── Specialist Agents (testing, docs, ops, etc.)
```

**Key Principle:** Agents communicate through shared state, not RPC.

See: **[Agent Documentation](../agents/README.md)**

---

### Component Architecture

### Functional Components Only
```typescript
// Good: React 19 functional component
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

// Bad: Class component (not used in v3)
class Button extends React.Component { ... }
```

### Custom Hooks Pattern
```typescript
// Extract complex logic to hooks
export function useSessionPersistence(sessionId?: string) {
  const [state, setState] = useState<SessionState>(null);

  useEffect(() => {
    // Complex logic here, not in component
    loadSession(sessionId);
  }, [sessionId]);

  return { state, reconnect: () => loadSession(sessionId) };
}

// Component stays focused on rendering
export function Terminal() {
  const { state, reconnect } = useSessionPersistence();
  return <div>{/* render based on state */}</div>;
}
```

---

## Testing Best Practices

### Test-Driven Development

Write tests before implementation:

1. **Write failing test** - Red
2. **Implement feature** - Green
3. **Refactor** - Refactor
4. **Coverage check** - 85%+ required

### Test Categories

| Category | Tool | Threshold | Focus |
|----------|------|-----------|-------|
| **Unit** | Vitest | 85% | Individual functions/components |
| **Integration** | Vitest | 85% | Component interactions, API calls |
| **E2E** | Vitest (TSX) | 80% | Full user workflows |
| **Security** | Custom | 100% | OWASP Top 10 vulnerabilities |
| **Performance** | Custom | SLA-based | Response time, memory usage |

### Semantic Testing

Use `data-testid` attributes for reliable selectors:

```typescript
// Component
<button data-testid="auth-login-btn">Sign In</button>

// Test
const loginBtn = screen.getByTestId('auth-login-btn');
fireEvent.click(loginBtn);
expect(mockFn).toHaveBeenCalled();
```

**Benefit:** Tests are decoupled from CSS/text changes

See: **[Data TestID Process](../testing/data-testid-process.md)**

---

## Performance Standards

### Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Largest Contentful Paint** | < 2.5s | < 4s |
| **First Input Delay** | < 100ms | < 300ms |
| **Cumulative Layout Shift** | < 0.1 | < 0.25 |
| **API Response Time** | < 200ms (p95) | < 500ms (p95) |
| **Bundle Size** | < 500KB | < 1MB |

### Optimization Patterns

1. **Code Splitting**
   ```typescript
   const Dashboard = lazy(() => import('./Dashboard'));

   <Suspense fallback={<Loading />}>
     <Dashboard />
   </Suspense>
   ```

2. **Memoization** (only when needed)
   ```typescript
   const MemoizedList = memo(ListComponent, (prev, next) =>
     prev.items.length === next.items.length
   );
   ```

3. **Virtual Scrolling** (for large lists)
   ```typescript
   // Use react-window for 1000+ items
   <VariableSizeList
     height={600}
     itemCount={largeArray.length}
     itemSize={index => heights[index]}
   >
     {renderRow}
   </VariableSizeList>
   ```

---

## Security Best Practices

### Input Validation

All user input must be validated:

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

export function createUser(input: unknown) {
  const user = userSchema.parse(input); // Throws if invalid
  return dbInsertUser(user);
}
```

### Authentication & Authorization

- Store tokens securely (never in localStorage for sensitive apps)
- Validate on every API call
- Use HTTPS in production
- Implement CSRF protection

### Dependency Management

- Pin versions in package-lock.json
- Regular security audits: `npm audit`
- Keep dependencies updated
- Use GitHub Dependabot

---

## Documentation Standards

### Code Comments

**Good:** Explains WHY
```typescript
// Exponential backoff prevents overwhelming the API
// Start at 100ms, double on each retry, cap at 30s
const backoffMs = Math.min(100 * Math.pow(2, retryCount), 30000);
```

**Bad:** Repeats the code
```typescript
// Multiply by 2
const value = count * 2;
```

### Function Documentation

All public functions need JSDoc:

```typescript
/**
 * Calculates project health score based on quality metrics.
 *
 * Uses weighted average of test coverage and security audit.
 * Results are cached for 1 hour to avoid redundant computation.
 *
 * @param metrics - Quality metrics including coverage and security score
 * @param metrics.testCoverage - Percentage of code covered by tests (0-100)
 * @param metrics.securityScore - Security audit score (0-100)
 * @returns Health score as weighted average (0-100)
 *
 * @example
 * ```typescript
 * const score = calculateHealthScore({ testCoverage: 85, securityScore: 90 });
 * // Returns: 87.5
 * ```
 *
 * @throws {ValidationError} If metrics are outside valid ranges
 */
export function calculateHealthScore(metrics: HealthMetrics): number {
  // Implementation
}
```

---

## Deployment Best Practices

### Pre-Deployment Checklist

- [ ] All tests pass: `npm run test`
- [ ] Coverage meets threshold: `npm run test:coverage`
- [ ] Build succeeds: `npm run build`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Performance benchmarks met (see targets above)
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring/alerting configured

### Blue-Green Deployment

Minimize downtime and risk:

```bash
# Deploy to "green" environment
kubectl apply -f deployment-green.yaml

# Run smoke tests
./scripts/smoke-tests.sh --target=green

# Switch traffic (instant rollback possible)
kubectl patch service api -p '{"spec":{"selector":{"version":"green"}}}'
```

---

## Common Patterns

### Error Handling

Use Result types instead of exceptions for expected errors:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function parseConfig(raw: string): Result<Config, ParseError> {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: new ParseError(e.message) };
  }
}

// Usage
const result = parseConfig(configJson);
if (result.ok) {
  useConfig(result.value);
} else {
  logError(result.error);
}
```

### Logging

Structured logging for operational visibility:

```typescript
// Good: Structured, searchable
logger.info('user.login.success', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
  duration: endTime - startTime,
});

// Bad: Unstructured, hard to parse
console.log(`User ${userId} logged in at ${new Date()}`);
```

---

## Team Collaboration

### Code Review Process

See: **[Contributing.md - Code Review Checklist](../../CONTRIBUTING.md#code-review-checklist)**

Key points:
1. Reviews focus on logic, not style (Prettier handles that)
2. All code reviewed before merge
3. CI must pass first
4. One approval minimum
5. Squash merge to keep history clean

### Pair Programming

Effective for:
- Complex algorithms or data structures
- Security-sensitive code
- New team members onboarding
- Difficult debugging sessions

---

## Learning Resources

- **[Agent Documentation](../agents/README.md)** - 22-agent ecosystem
- **[Architecture Decisions](../architecture/README.md)** - Design philosophy
- **[CLAUDE.md](../../CLAUDE.md)** - Project conventions and architecture notes
- **[Example Code](../../src/)** - Real production code to learn from

---

## FAQ

**Q: When should I refactor?**
A: When tests make it safe to refactor without changing behavior. Use the IDE to rename, extract, and reorganize with confidence.

**Q: How do I handle legacy code?**
A: Add tests around it first (approval testing), then refactor safely.

**Q: Should I comment all my code?**
A: No. Well-named functions are better. Comments should explain WHY decisions were made, not WHAT the code does.

**Q: How strict is the 85% coverage threshold?**
A: CI will fail if coverage drops below 85%. Some exceptions can be made for difficult-to-test code (complex UI, integration points), but justify these explicitly.

---

**Last Updated:** 2026-02-05
**Maintained By:** Forge Docs Agent

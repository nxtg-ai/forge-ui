# Testing & Quality Assurance Guide

Complete guide for running tests and quality gates for NXTG-Forge v3.0.

## Quick Start

```bash
# Install dependencies
npm install

# Run all quality checks
npm run test -- --coverage
npx tsx src/test/reports/security-audit.ts
npx tsx src/test/reports/quality-dashboard.ts

# View results
open .claude/reports/quality-dashboard.html
open .claude/reports/security-audit.md
```

---

## Test Suite Structure

```
src/test/
├── setup.ts                          # Global test configuration
├── integration/                      # Integration tests
│   ├── vision-integration.test.ts    # Vision UI → Backend → File
│   └── state-integration.test.ts     # State persistence flow
├── security/                         # Security validation
│   └── input-validation.test.ts      # XSS, injection, path traversal
├── performance/                      # Performance tests
│   └── performance.test.ts           # Latency, throughput, memory
├── quality/                          # Quality checks
│   ├── type-safety.test.ts          # No 'any' types, Zod coverage
│   └── error-handling.test.ts       # Error coverage
└── reports/                          # Report generators
    ├── security-audit.ts            # Security audit report
    └── quality-dashboard.ts         # Quality metrics dashboard
```

---

## Running Tests

### All Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test -- --ui
```

### Specific Test Suites

```bash
# Integration tests only (*.integration.test.ts)
npm run test:integration

# Security tests only
npx vitest run src/test/security/

# Type safety validation
npx vitest run src/test/quality/type-safety.test.ts

# Error handling tests
npx vitest run src/test/quality/error-handling.test.ts
```

### Specific Tests

```bash
# Run a single test file
npx vitest run src/server/__tests__/smoke.integration.test.ts

# Run tests matching a pattern
npx vitest run --grep "VisionCapture"

# Run tests in a specific describe block
npx vitest run --grep "Security: Input Validation"
```

---

## Coverage Requirements

**Target Coverage**: 90% overall

| Metric | Threshold | Target |
|--------|-----------|--------|
| Lines | 85% | 90% |
| Functions | 85% | 90% |
| Branches | 80% | 85% |
| Statements | 85% | 90% |

### Viewing Coverage

```bash
# Generate coverage report
npm run test -- --coverage

# View HTML report
open coverage/index.html

# View summary in terminal
cat coverage/coverage-summary.json | jq '.total'
```

### Coverage by Category

```bash
# Check core systems coverage
npm run test -- --coverage src/core/

# Check components coverage
npm run test -- --coverage src/components/
```

---

## Security Audit

### Running Security Audit

```bash
# Full security audit
npx tsx src/test/reports/security-audit.ts

# View results
cat .claude/reports/security-audit.json | jq .
open .claude/reports/security-audit.md
```

### Security Checks

The security audit scans for:

1. **Hardcoded Secrets**
   - API keys
   - Passwords
   - Tokens
   - Database credentials

2. **Injection Vulnerabilities**
   - SQL injection
   - Command injection
   - XSS vulnerabilities
   - Path traversal

3. **Weak Cryptography**
   - MD5, SHA1 usage
   - Weak algorithms
   - Insecure random

4. **Input Validation**
   - Missing Zod schemas
   - Unvalidated user input
   - Size limit violations

5. **Access Control**
   - Missing authentication
   - Missing authorization
   - Exposed endpoints

### Security Score Interpretation

| Score | Grade | Action Required |
|-------|-------|-----------------|
| 90-100 | Excellent | Continue monitoring |
| 70-89 | Good | Address high issues |
| 50-69 | Fair | Immediate attention needed |
| 0-49 | Poor | URGENT: Critical issues |

**Quality Gate**: Score must be >= 70 with 0 critical issues

---

## Quality Metrics Dashboard

### Generating Dashboard

```bash
# Generate quality metrics
npx tsx src/test/reports/quality-dashboard.ts

# View dashboard
open .claude/reports/quality-dashboard.html
```

### Metrics Tracked

1. **Test Coverage**
   - Lines, functions, branches, statements
   - Overall coverage percentage

2. **Security Score**
   - Critical, high, medium, low issues
   - Overall security score

3. **Code Quality**
   - Average cyclomatic complexity
   - File count
   - Lint warnings/errors

4. **Documentation**
   - Documented functions
   - Documentation coverage %

5. **Overall Grade**
   - A: 90-100 (Excellent)
   - B: 80-89 (Good)
   - C: 70-79 (Acceptable)
   - D: 60-69 (Needs Work)
   - F: 0-59 (Failing)

---

## Performance Testing

There is no performance test suite yet. The targets below are goals; nothing in the test suite measures them today.

### Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| State update | < 50ms | < 100ms |
| Vision load | < 100ms | < 200ms |
| Message routing | < 10ms | < 50ms |
| UI render | 60fps | 30fps |
| Bootstrap | < 30s | < 60s |

---

## Type Safety Validation

### Running Type Checks

```bash
# TypeScript compilation
npm run build

# Type safety tests
npx vitest run src/test/quality/type-safety.test.ts

# Check for 'any' types
grep -r ": any\b" src/core/ src/components/ || echo "No any types found"
```

### Type Safety Rules

1. **No `any` types** in core code
2. **Strict TypeScript mode** enabled
3. **Zod schemas** for all public interfaces
4. **Proper null handling** throughout
5. **Generic constraints** where needed

---

## Error Handling Tests

### Running Error Tests

```bash
# All error handling tests
npx vitest run src/test/quality/error-handling.test.ts

# File system errors only
npx vitest run src/test/quality/error-handling.test.ts --grep "File System"

# Network errors only
npx vitest run src/test/quality/error-handling.test.ts --grep "Network"
```

### Error Categories Tested

1. File system errors (ENOENT, EACCES, ENOSPC)
2. Network errors (timeouts, disconnections)
3. Data corruption (invalid JSON, checksum mismatch)
4. Validation errors (Zod schema failures)
5. Resource cleanup (memory leaks, dangling listeners)

---

## CI/CD Quality Gates

### Local CI Simulation

```bash
# Run the same checks as CI
npm run build
npm run lint
npm run test -- --coverage --run
npx tsx src/test/reports/security-audit.ts
npx tsx src/test/reports/quality-dashboard.ts
```

### Quality Gates (Enforced in CI)

**Required Gates** (Must Pass):
- ✅ All tests pass
- ✅ Coverage >= 85%
- ✅ Security score >= 70
- ✅ 0 critical security issues
- ✅ TypeScript compilation succeeds

**Recommended Gates** (Should Pass):
- 📊 Overall quality grade >= B
- 📊 Documentation coverage >= 80%
- 📊 <= 5 high-severity security issues
- 📊 ESLint passes with no warnings

### Viewing CI Results

```bash
# Check latest GitHub Actions run
gh run list --workflow="Quality Gates"

# View specific run
gh run view [run-id]

# Download artifacts
gh run download [run-id]
```

---

## Test Development

### Writing New Tests

```typescript
// src/server/__tests__/my-feature.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

describe('My Feature', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', async () => {
    // Arrange
    const component = render(<MyComponent />);

    // Act
    await fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

### Test Patterns

**Integration Test Pattern**:
```typescript
describe('Feature: UI -> Backend -> Storage', () => {
  it('should save data end-to-end', async () => {
    // 1. Render UI
    // 2. Simulate user action
    // 3. Verify backend called
    // 4. Verify data persisted
  });
});
```

**Security Test Pattern**:
```typescript
describe('Security: Input Validation', () => {
  it('should prevent XSS attacks', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const result = schema.safeParse(maliciousInput);
    expect(result.success).toBe(false);
  });
});
```

**Performance Test Pattern**:
```typescript
describe('Performance: Latency', () => {
  it('should complete operation in < 100ms', async () => {
    const start = performance.now();
    await operation();
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Run with --inspect flag
node --inspect-brk ./node_modules/vitest/vitest.mjs run [test-file]

# Use VS Code debugger
# Add breakpoint in test file, then F5
```

### Verbose Output

```bash
# Show all console.logs
npx vitest run --reporter=verbose

# Show only failing tests
npx vitest run --reporter=verbose --only-failures
```

### Test Isolation

```bash
# Run single test in isolation
npx vitest run --isolate src/server/__tests__/smoke.integration.test.ts

# Run without parallel execution
npx vitest run --no-threads
```

---

## Best Practices

### Test Writing

1. **Arrange-Act-Assert** pattern
2. **One assertion per test** (when possible)
3. **Descriptive test names** (describe behavior, not implementation)
4. **Mock external dependencies** (filesystem, network)
5. **Clean up after tests** (use afterEach)

### Code Coverage

1. **Focus on critical paths** first
2. **Test error cases** not just happy paths
3. **Test edge cases** (empty arrays, null values)
4. **Don't chase 100%** - aim for meaningful coverage
5. **Review uncovered code** - might indicate dead code

### Security Testing

1. **Test all user inputs** for injection vulnerabilities
2. **Verify authentication** on protected routes
3. **Check for secrets** in code before commit
4. **Run security audit** before each release
5. **Keep dependencies updated** for security patches

---

## Troubleshooting

### Tests Failing Locally

```bash
# Clear cache
npx vitest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be >= 18.0.0
```

### Coverage Not Generated

```bash
# Ensure c8 is installed
npm install --save-dev c8

# Run with --coverage flag explicitly
npx vitest run --coverage

# Check vitest.config.ts coverage settings
```

### Performance Tests Flaky

```bash
# Increase timeout
npx vitest run --testTimeout=30000

# Run single-threaded
npx vitest run --no-threads

# Check system resources
top  # Ensure CPU/memory available
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Production Readiness Checklist](./PRODUCTION-READINESS.md)

---

## Support

Issues with testing? Contact the Forge Guardian team or open an issue on GitHub.

**Remember**: Tests are not a burden, they're your safety net. Write them with care, and they'll save you countless hours of debugging.

---

*Generated by **Forge Guardian** - Quality Assurance Master*

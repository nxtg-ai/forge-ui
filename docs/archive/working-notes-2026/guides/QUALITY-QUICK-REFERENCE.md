# Quality Gates Quick Reference

**One-page cheat sheet for NXTG-Forge v3.0 quality assurance**

---

## Quick Commands

```bash
# Run everything (CI/CD equivalent)
npm run quality:gates

# Just run tests
npm run test:coverage

# View quality dashboard
npm run quality:report

# Security audit
npm run audit:security

# Format and lint
npm run format && npm run lint
```

---

## Before You Commit

```bash
✅ npm run test:coverage    # All tests pass + coverage
✅ npm run lint             # No lint errors
✅ npm run build            # TypeScript compiles
⚠️ npm run audit:security  # Check for critical issues
```

---

## Quality Gate Thresholds

| Gate | Threshold | Blocker? |
|------|-----------|----------|
| All tests pass | 100% | ✅ YES |
| Coverage | >= 85% | ✅ YES |
| Security score | >= 70/100 | ✅ YES |
| Critical security issues | 0 | ✅ YES |
| High security issues | <= 5 | ⚠️ Warning |
| TypeScript compilation | No errors | ✅ YES |
| ESLint | No errors | ⚠️ Warning |

---

## Test Categories

```bash
npm run test:integration   # *.integration.test.ts (real server, real requests)
npm run test:security      # XSS, injection, secrets
npm run test:quality       # Type safety, errors
```

---

## Performance Targets

| Operation | Target | Max |
|-----------|--------|-----|
| State update | < 50ms | 100ms |
| Vision load | < 100ms | 200ms |
| Message routing | < 10ms | 50ms |
| UI render | 60fps | 30fps |
| Bootstrap | < 30s | 60s |

---

## Security Checklist

- [ ] No hardcoded secrets (API keys, passwords)
- [ ] All inputs validated with Zod schemas
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] File operations restricted to `.claude/`
- [ ] No command injection vulnerabilities
- [ ] All secrets in environment variables

---

## Type Safety Rules

- ❌ No `: any` types in core code
- ✅ All public interfaces have Zod schemas
- ✅ Strict TypeScript mode enabled
- ✅ Runtime validation at boundaries
- ✅ Proper null/undefined handling

---

## Coverage Requirements

```
Overall: 90% target, 85% minimum
├── Lines: 85%
├── Functions: 85%
├── Branches: 80%
└── Statements: 85%
```

---

## Report Locations

```
.claude/reports/
├── quality-dashboard.html    # Interactive dashboard
├── quality-metrics.json      # Current metrics
├── security-audit.md         # Security report
├── security-audit.json       # Security data
└── metrics-history.jsonl     # Historical data
```

---

## Troubleshooting

**Tests failing?**
```bash
npx vitest --clearCache
rm -rf node_modules && npm install
```

**Coverage not generating?**
```bash
npm install --save-dev c8
npx vitest run --coverage
```

**Type errors?**
```bash
npm run build
# Fix errors shown
```

**Security audit fails?**
```bash
npx tsx src/test/reports/security-audit.ts
# Review .claude/reports/security-audit.md
```

---

## CI/CD Status

Check workflow: `.github/workflows/quality-gates.yml`

View runs:
```bash
gh run list --workflow="Quality Gates"
gh run view [run-id]
```

---

## Production Readiness

Before deploying to production:

1. ✅ Run `npm run quality:gates`
2. ✅ All required gates pass
3. ✅ Review quality dashboard
4. ✅ Check security audit (0 critical)
5. ✅ Review [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
6. ✅ Get stakeholder sign-off

---

## Quality Grades

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100 | Excellent - ship it! |
| B | 80-89 | Good - ready for prod |
| C | 70-79 | Acceptable - review issues |
| D | 60-69 | Needs work - don't ship |
| F | 0-59 | Failing - major issues |

---

## Key Files

```
vitest.config.ts              # Test configuration
src/test/setup.ts            # Global test setup
TESTING-GUIDE.md             # Full testing docs
PRODUCTION-READINESS.md      # Production checklist
QUALITY-GATES-SUMMARY.md     # Implementation summary
```

---

## Need Help?

- 📖 Full guide: [TESTING-GUIDE.md](./TESTING-GUIDE.md)
- 📋 Production checklist: [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
- 📊 Implementation summary: [QUALITY-GATES-SUMMARY.md](./QUALITY-GATES-SUMMARY.md)
- 🔧 Vitest docs: https://vitest.dev/

---

**Remember**: Quality gates exist to help you ship confident code, not to slow you down. They're your safety net! 🛡️

*Forge Guardian - Quality Assurance Master*

# Start Testing Plan - Immediate Actions

This document tells you exactly what to do starting today.

---

## Current Situation

- **Actual coverage:** 41.98% (should be 85%)
- **Critical gaps:** 24 files with 0% coverage
- **Status:** Production not ready

---

## 3-Week Plan to Fix It

### WEEK 1: Critical Infrastructure (Days 1-5)

**Goal:** 55% coverage (from 42%)

#### Day 1: Setup & Test Utilities (4 hours)

```bash
# Create directory structure
mkdir -p src/server/__tests__
mkdir -p src/services/__tests__/
mkdir -p src/core/__tests__/
mkdir -p src/test/utils

# Create test utilities file
touch src/test/utils/test-factories.ts
touch src/test/utils/test-hooks.ts
touch src/test/utils/test-servers.ts
```

**What to put in utilities:**

```typescript
// src/test/utils/test-factories.ts
export function createTestVision(): VisionData { ... }
export function createTestTask(): Task { ... }
export function createTestAgent(): Agent { ... }
export function createTestRunspace(): Runspace { ... }
```

#### Day 2-3: PTY Bridge Tests (8 hours)

**File:** `src/server/__tests__/pty-bridge.test.ts`

Start from the template: `src/server/__tests__/pty-bridge.test.example.ts`

Test these (in order of importance):
1. Session creation
2. Command I/O
3. Disconnection recovery
4. Session timeout
5. Error handling

```bash
# Run tests
npx vitest run src/server/__tests__/pty-bridge.test.ts

# Check coverage
npx vitest run src/server/__tests__/pty-bridge.test.ts --coverage
```

Target: 85% coverage for pty-bridge.ts

#### Day 3-4: Vision Service Tests (6 hours)

**File:** `src/services/__tests__/vision-service.test.ts`

Test these:
1. Load/save vision
2. Corruption detection
3. YAML parsing
4. Backup recovery

```bash
npx vitest run src/services/__tests__/vision-service.test.ts
```

Target: 85% coverage for vision-service.ts

#### Day 4-5: Orchestrator Tests (8 hours)

**File:** `src/core/__tests__/orchestrator.test.ts`

Test these:
1. Sequential execution
2. Parallel execution
3. Task dependencies
4. Error propagation
5. Timeout handling

```bash
npx vitest run src/core/__tests__/orchestrator.test.ts
```

Target: 60% coverage for orchestrator.ts (it's complex)

#### Day 5: Check Progress

```bash
# Full coverage report
npx vitest run --coverage

# Compare to baseline (should be ~55%)
```

---

### WEEK 2: Integration Layer (Days 6-10)

**Goal:** 70% coverage (from 55%)

#### Day 6: Hook Tests Setup (4 hours)

Create these files:
- `src/hooks/__tests__/useVision.test.ts`
- `src/hooks/__tests__/useCommands.test.ts`
- `src/hooks/__tests__/useAutomation.test.ts`
- `src/hooks/__tests__/useAgentActivity.test.ts`

```bash
touch src/hooks/__tests__/useVision.test.ts
touch src/hooks/__tests__/useCommands.test.ts
touch src/hooks/__tests__/useAutomation.test.ts
touch src/hooks/__tests__/useAgentActivity.test.ts
```

#### Day 7: Implement Hook Tests (8 hours)

Each hook should have ~15-20 tests covering:
- Mount behavior
- State updates
- Error handling
- Event emission
- Cleanup

```bash
npx vitest run src/hooks/__tests__/useVision.test.ts
npx vitest run src/hooks/__tests__/useCommands.test.ts
npx vitest run src/hooks/__tests__/useAutomation.test.ts
npx vitest run src/hooks/__tests__/useAgentActivity.test.ts
```

#### Day 8-9: Session Persistence (10 hours)

**File:** `src/components/infinity-terminal/__tests__/useSessionPersistence.test.ts`

This is critical. Test:
1. Save to localStorage
2. Restore on mount
3. Corruption recovery
4. Multi-tab sync
5. Timeout cleanup

```bash
npx vitest run src/components/infinity-terminal/__tests__/useSessionPersistence.test.ts
```

Target: 85% coverage (currently 1.36%)

#### Day 10: Progress Check

```bash
npx vitest run --coverage
# Should be ~70%
```

---

### WEEK 3: UI & Services (Days 11-15)

**Goal:** 85% coverage

#### Day 11: Terminal UI Integration (6 hours)

**File:** `src/components/infinity-terminal/__tests__/InfinityTerminal.integration.test.tsx`

Test:
1. User input
2. Output display
3. Pane switching
4. Resize handling
5. Session persistence in UI

```bash
npx vitest run src/components/infinity-terminal/__tests__/InfinityTerminal.integration.test.tsx
```

#### Day 12: Service Error Tests (8 hours)

Create:
- `src/services/__tests__/command-service.test.ts`
- `src/services/__tests__/activity-service.test.ts`

Test error scenarios:
- Network timeout
- Invalid input
- Disk full
- Permission denied
- Process crash

```bash
npx vitest run src/services/__tests__/command-service.test.ts
npx vitest run src/services/__tests__/activity-service.test.ts
```

#### Day 13: Monitoring Tests (6 hours)

Create:
- `src/monitoring/__tests__/alerts.test.ts`
- `src/monitoring/__tests__/performance.test.ts`

#### Day 14: Onboarding & UI (6 hours)

- `src/components/onboarding/__tests__/MCPSelectionView.test.tsx`
- `src/components/governance/__tests__/GovernanceHUD.test.tsx`
- `src/components/feedback/__tests__/BetaFeedback.test.tsx`

#### Day 15: Final Review & Metrics

```bash
# Final coverage report
npx vitest run --coverage

# Should be at/near 85%
# Report results
```

---

## Daily Standup Checklist

### Week 1
- [ ] Day 1: Test utilities in place
- [ ] Day 2-3: PTY bridge tests passing, 85% coverage
- [ ] Day 3-4: Vision service tests, 85% coverage
- [ ] Day 4-5: Orchestrator tests, 60%+ coverage
- [ ] Day 5: Overall coverage ~55%

### Week 2
- [ ] Day 6: Hook test files created
- [ ] Day 7: Hook tests passing, 80%+ coverage each
- [ ] Day 8-9: Session persistence 85%+ coverage
- [ ] Day 10: Overall coverage ~70%

### Week 3
- [ ] Day 11: Terminal UI tests passing
- [ ] Day 12: Service error tests passing
- [ ] Day 13: Monitoring tests passing
- [ ] Day 14: UI/onboarding tests passing
- [ ] Day 15: Overall coverage 85%+

---

## Commands Reference

### Run All Tests
```bash
npx vitest run
```

### Run Specific Test File
```bash
npx vitest run src/server/__tests__/pty-bridge.test.ts
```

### Coverage Report
```bash
npx vitest run --coverage
```

### Coverage for Specific File
```bash
npx vitest run --coverage src/server/pty-bridge.ts
```

### Watch Mode (development)
```bash
npx vitest src/server/__tests__/pty-bridge.test.ts
```

### Update Snapshot Tests (if needed)
```bash
npx vitest -u src/test/file.test.ts
```

---

## Testing Patterns to Use

### Test Real Services, Not Mocks
```typescript
// GOOD: Real vision service with temp directory
const tempDir = await fs.mkdtemp('/tmp/forge-test-');
const service = new VisionService(tempDir);
const result = await service.saveVision(testData);
expect(result.ok).toBe(true);

// BAD: Mock everything
vi.mock('../services/vision-service');
// Now you're not testing real code
```

### Test Error Scenarios
```typescript
// GOOD: Test when things go wrong
it('should handle disk full error', async () => {
  // Make disk full (or simulate)
  const result = await service.save(data);
  expect(result.isErr()).toBe(true);
  expect(result.error).toContain('ENOSPC');
});

// BAD: Only test happy path
it('should save', async () => {
  const result = await service.save(data);
  expect(result.ok).toBe(true);
});
```

### Test All Branches
```typescript
// GOOD: Test all branches
it('should handle all error types', async () => {
  // Test ENOENT
  expect(handler(ENOENT_ERROR)).toBe('notfound');

  // Test EACCES
  expect(handler(EACCES_ERROR)).toBe('permission');

  // Test generic
  expect(handler(GENERIC_ERROR)).toBe('generic');
});

// BAD: Only test one branch
it('should handle error', async () => {
  expect(handler(ENOENT_ERROR)).toBe('notfound');
});
```

---

## Success Metrics

### Coverage Targets
- **Line Coverage:** 85%+
- **Branch Coverage:** 80%+
- **Function Coverage:** 85%+

### Quality Targets
- **No service <70% coverage**
- **All critical paths tested**
- **All error scenarios tested**
- **All branches tested**

### Timeline
- **Day 5:** 55% coverage
- **Day 10:** 70% coverage
- **Day 15:** 85% coverage

---

## Troubleshooting

### Test Fails With "Module Not Found"
```bash
# Check import paths
# Vitest uses src/ as root, not file-relative paths
import { VisionService } from '../../../services/vision-service'; // BAD
import { VisionService } from 'src/services/vision-service'; // GOOD
```

### Coverage Not Updated
```bash
# Clear vitest cache
rm -rf node_modules/.vite

# Re-run
npx vitest run --coverage
```

### Tests Timeout
```bash
# Increase timeout in test
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout

// Or globally in vitest.config.ts
testTimeout: 10000
```

### Mock Not Working
```typescript
// Mocks must be at top level
vi.mock('../service'); // Good

// Can't mock inside test
it('test', () => {
  vi.mock('../service'); // BAD - too late
});
```

---

## File Structure After Week 3

```
src/
├── core/
│   └── __tests__/
│       └── orchestrator.test.ts          (NEW)
├── server/
│   └── __tests__/
│       └── pty-bridge.test.ts            (NEW)
├── services/
│   └── __tests__/
│       ├── vision-service.test.ts        (NEW)
│       ├── command-service.test.ts       (NEW)
│       └── activity-service.test.ts      (NEW)
├── hooks/
│   └── __tests__/
│       ├── useVision.test.ts             (NEW)
│       ├── useCommands.test.ts           (NEW)
│       ├── useAutomation.test.ts         (NEW)
│       └── useAgentActivity.test.ts      (NEW)
├── components/
│   ├── infinity-terminal/
│   │   └── __tests__/
│   │       ├── useSessionPersistence.test.ts     (IMPROVED)
│   │       ├── useResponsiveLayout.test.ts       (IMPROVED)
│   │       └── InfinityTerminal.integration.test.tsx (NEW)
│   ├── onboarding/
│   │   └── __tests__/
│   │       └── MCPSelectionView.test.tsx         (NEW)
│   ├── governance/
│   │   └── __tests__/
│   │       └── GovernanceHUD.test.tsx            (NEW)
│   └── feedback/
│       └── __tests__/
│           └── BetaFeedback.test.tsx             (NEW)
├── monitoring/
│   └── __tests__/
│       ├── alerts.test.ts                (NEW)
│       └── performance.test.ts           (NEW)
└── test/
    └── utils/
        ├── test-factories.ts             (NEW)
        ├── test-hooks.ts                 (NEW)
        └── test-servers.ts               (NEW)
```

---

## When You're Done

1. Verify coverage is 85%+
   ```bash
   npx vitest run --coverage | grep -E "^(Lines|Functions|Branches)"
   ```

2. Commit all test files
   ```bash
   git add src/**/__tests__/*.test.ts
   git add src/test/utils/
   git commit -m "feat: Add comprehensive test coverage for critical paths"
   ```

3. Update this file with actual metrics
   - Week 1 actual vs target
   - Week 2 actual vs target
   - Week 3 actual vs target

4. Document lessons learned

5. Set up automated coverage reporting

---

## Support

Questions? Refer to:
- `TESTING-AUDIT-SUMMARY.md` - Quick overview
- `TEST-GENERATION-ROADMAP.md` - Detailed plan
- `docs/reports/TEST-COVERAGE-AUDIT-2026-02-05.md` - Technical analysis
- `src/server/__tests__/pty-bridge.test.example.ts` - Code patterns

---

*Plan created: 2026-02-05*
*Status: Ready to execute*
*Owner: Forge Testing Agent*

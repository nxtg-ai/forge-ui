# Test Coverage Audit - Complete Deliverables

**Audit Date:** 2026-02-05
**Auditor:** Forge Testing Agent
**Status:** Complete and ready for review

---

## Summary

Comprehensive test coverage audit revealing:
- **Actual coverage:** 41.98% (target 85%) - FAILING
- **Critical gaps:** 24 files at 0% coverage
- **3-week plan:** Actionable roadmap to 85% coverage

---

## Deliverable Files

### 1. Executive Briefings

#### TESTING-AUDIT-SUMMARY.md (5 min read)
**Purpose:** Quick overview for decision makers
**Contains:**
- Key findings at a glance
- Risk assessment
- Success criteria
- File overview

**Location:** `/home/axw/projects/NXTG-Forge/v3/TESTING-AUDIT-SUMMARY.md`

#### HONEST-TEST-STATUS.md (10 min read)
**Purpose:** Unfiltered reality assessment
**Contains:**
- What can go wrong
- Concrete examples
- Why this matters
- Risk levels

**Location:** `/home/axw/projects/NXTG-Forge/v3/HONEST-TEST-STATUS.md`

---

### 2. Action Plans

#### START-TESTING-PLAN.md (Day-by-day execution)
**Purpose:** Daily checklist for implementing fixes
**Contains:**
- 3-week sprint plan
- Daily tasks (15 days)
- Command reference
- Success metrics
- Troubleshooting

**Location:** `/home/axw/projects/NXTG-Forge/v3/START-TESTING-PLAN.md`

**Key Sections:**
- Week 1: Critical infrastructure (days 1-5)
- Week 2: Integration layer (days 6-10)
- Week 3: UI & services (days 11-15)

#### TEST-GENERATION-ROADMAP.md (Detailed plan)
**Purpose:** Complete testing strategy
**Contains:**
- Priority 1-5 breakdown
- Specific test files to create
- Test structure templates
- Infrastructure requirements
- Testing strategy by system
- Coverage timeline

**Location:** `/home/axw/projects/NXTG-Forge/v3/TEST-GENERATION-ROADMAP.md`

---

### 3. Technical Analysis

#### docs/reports/TEST-COVERAGE-AUDIT-2026-02-05.md (Deep dive)
**Purpose:** Comprehensive technical analysis
**Contains:**
- Detailed coverage breakdown by system
- Why coverage is low (root causes)
- Branch coverage analysis
- Services not tested (with impact)
- Test quality issues
- Coverage by risk level
- Action plan with specifics
- Testing strategies for each system
- Recommendations
- 25+ pages of detail

**Location:** `/home/axw/projects/NXTG-Forge/v3/docs/reports/TEST-COVERAGE-AUDIT-2026-02-05.md`

**Sections:**
1. Executive summary
2. Coverage by system
3. Root causes analysis
4. Services needing tests
5. Test quality issues
6. Branch coverage problem
7. What numbers mean
8. Action plan
9. Testing strategies
10. Recommendations

---

### 4. Code Templates

#### src/server/__tests__/pty-bridge.test.example.ts (200 lines)
**Purpose:** Template for real integration testing
**Contains:**
- Example test structure
- Real patterns (not mocks)
- Session management tests
- I/O operation tests
- Disconnection recovery tests
- Error handling tests
- Scrollback buffer tests
- Terminal control tests
- Detailed comments explaining what to test

**Location:** `/home/axw/projects/NXTG-Forge/v3/src/server/__tests__/pty-bridge.test.example.ts`

**Key Insight:** Shows how to test real integration instead of just mocking

---

## Audit Data

### Coverage Metrics

```
ACTUAL COVERAGE:
  Lines:       41.98%  (need 85%)  FAILING by 43%
  Functions:   33.11%  (need 85%)  FAILING by 52%
  Branches:    26.44%  (need 80%)  FAILING by 54%

TEST COUNT:
  Passing:     611
  Skipped:     26
  Total:       637

FILES TESTED:  26
TOTAL FILES:   ~150+
```

### Services at 0% Coverage (24 files)

**Critical Infrastructure:**
- src/server/pty-bridge.ts
- src/core/orchestrator.ts
- src/services/vision-service.ts
- src/core/runspace.ts
- src/core/bootstrap.ts
- src/core/init-first-run.ts
- src/core/runspace-manager.ts

**Services:**
- src/services/command-service.ts
- src/services/activity-service.ts
- src/services/governance-state-manager.ts

**Hooks (component integration):**
- src/hooks/useAgentActivity.ts
- src/hooks/useAutomation.ts
- src/hooks/useCommands.ts
- src/hooks/useVision.ts
- src/hooks/useForgeIntegration.ts
- src/hooks/useRealtimeConnection.ts
- src/hooks/useProjectState.ts

**Monitoring:**
- src/monitoring/alerts.ts
- src/monitoring/diagnostics.ts
- src/monitoring/performance.ts
- src/monitoring/sentry.ts
- src/monitoring/sentry-browser.ts

**Plus:** 1 additional file with 0%

### Critical Gaps by System

**Session Persistence:** 1.36% (should be 100%)
**Terminal UI:** 30.39% (should be 85%+)
**Responsive Layout:** 1.28% (should be 100%)
**Onboarding:** 0% (should be 80%+)

---

## 3-Week Fix Plan

### Week 1: Critical Infrastructure (59 hours total)

| Task | File | Hours | Target |
|------|------|-------|--------|
| Test utilities | src/test/utils/ | 2 | Setup |
| PTY Bridge | src/server/__tests__/pty-bridge.test.ts | 4 | 85% |
| Vision Service | src/services/__tests__/vision-service.test.ts | 3 | 85% |
| Orchestrator | src/core/__tests__/orchestrator.test.ts | 5 | 60% |
| **Subtotal** | | **14** | **55%** |

### Week 2: Integration Layer (22 hours)

| Task | File | Hours | Target |
|------|------|-------|--------|
| Hook tests (4) | src/hooks/__tests__/*.test.ts | 8 | 85% each |
| Session persist | useSessionPersistence.test.ts | 10 | 85% |
| Layout hook | useResponsiveLayout.test.ts | 4 | 85% |
| **Subtotal** | | **22** | **70%** |

### Week 3: UI & Services (23 hours)

| Task | File | Hours | Target |
|------|------|-------|--------|
| Terminal UI | InfinityTerminal.integration.test.tsx | 6 | 85% |
| Services (3) | command/activity/governance.test.ts | 8 | 85% |
| Monitoring (2) | alerts/performance.test.ts | 6 | 85% |
| Onboarding & UI | Governance/Beta/MCP tests | 3 | 80% |
| **Subtotal** | | **23** | **85%** |

**Total:** 59 hours over 3 weeks = ~20 hours/week

---

## Key Recommendations

### 1. Testing Strategy Changes

**From:** Mocking everything
**To:** Real integration testing with test doubles only where needed

**From:** Test existence ("does it render?")
**To:** Test behavior ("does it work?")

**From:** Happy path only
**To:** Happy path + error scenarios + edge cases

### 2. Infrastructure Needed

- Test utilities library for factories/helpers
- Real file I/O tests (with temp directories)
- Real PTY tests (with timeouts)
- In-memory database for service tests
- Fake timers for timing-sensitive tests

### 3. Branch Coverage Focus

Target 80%+ branch coverage. This means testing:
- All if/else branches
- All try/catch paths
- All error cases
- All timeout scenarios

### 4. Critical Path First

Test user-facing workflows first:
1. App startup → terminal ready
2. User types command → executes
3. Browser closes → session persists
4. Network fails → graceful recovery

---

## Success Criteria

### After Week 1
- [ ] 55% line coverage
- [ ] PTY bridge at 85%
- [ ] Vision service at 85%
- [ ] Orchestrator at 60%+
- [ ] Test utilities in place

### After Week 2
- [ ] 70% line coverage
- [ ] All hooks at 80%+
- [ ] Session persistence at 85%
- [ ] Responsive layout at 85%

### After Week 3
- [ ] 85% line coverage (GOAL)
- [ ] 80% branch coverage (GOAL)
- [ ] No service <70%
- [ ] All critical paths tested
- [ ] All error scenarios tested

---

## Files to Create (During Execution)

### Test Files
```
src/server/__tests__/pty-bridge.test.ts
src/services/__tests__/vision-service.test.ts
src/services/__tests__/command-service.test.ts
src/services/__tests__/activity-service.test.ts
src/core/__tests__/orchestrator.test.ts
src/hooks/__tests__/useVision.test.ts
src/hooks/__tests__/useCommands.test.ts
src/hooks/__tests__/useAutomation.test.ts
src/hooks/__tests__/useAgentActivity.test.ts
src/components/infinity-terminal/__tests__/useSessionPersistence.test.ts (EXPAND)
src/components/infinity-terminal/__tests__/useResponsiveLayout.test.ts (EXPAND)
src/components/infinity-terminal/__tests__/InfinityTerminal.integration.test.tsx
src/components/onboarding/__tests__/MCPSelectionView.test.tsx
src/components/governance/__tests__/GovernanceHUD.test.tsx
src/components/feedback/__tests__/BetaFeedback.test.tsx
src/monitoring/__tests__/alerts.test.ts
src/monitoring/__tests__/performance.test.ts
```

### Utility Files
```
src/test/utils/test-factories.ts
src/test/utils/test-hooks.ts
src/test/utils/test-servers.ts
```

---

## Reports to Create (Post-Audit)

After each week, create:
- Weekly coverage report
- Progress vs target
- Issues encountered
- Adjustments made
- Next week priorities

---

## Audit Methodology

1. **Ran `npx vitest run --coverage`**
   - Captured actual coverage metrics
   - Identified untested files
   - Analyzed gap patterns

2. **Categorized gaps by:**
   - System importance (critical vs optional)
   - Coverage percentage (0% vs 50% vs 80%)
   - User impact (high vs medium vs low)
   - Technical complexity (simple vs complex)

3. **Created actionable plans:**
   - Prioritized by critical path first
   - Estimated effort for each task
   - Created daily checklist
   - Provided code templates

4. **Validated findings:**
   - Cross-checked multiple metrics
   - Identified root causes
   - Traced to specific files
   - Analyzed impact

---

## How to Use This Audit

### For Managers
1. Read: TESTING-AUDIT-SUMMARY.md
2. Understand: Risk assessment
3. Approve: 3-week plan with 59 hours
4. Check weekly: Coverage metrics

### For Developers
1. Read: START-TESTING-PLAN.md
2. Follow: Day-by-day checklist
3. Use: Code templates as guide
4. Report: Progress daily

### For QA/Testers
1. Read: TEST-GENERATION-ROADMAP.md
2. Implement: Specific test files
3. Track: Coverage metrics
4. Adjust: Plan based on progress

### For Technical Leads
1. Review: docs/reports/TEST-COVERAGE-AUDIT-2026-02-05.md
2. Understand: Root causes
3. Guide: Team through execution
4. Monitor: Quality metrics

---

## Questions?

Refer to appropriate document:
- **"What's the overview?"** → TESTING-AUDIT-SUMMARY.md
- **"What could go wrong?"** → HONEST-TEST-STATUS.md
- **"How do I get started?"** → START-TESTING-PLAN.md
- **"What's the detailed plan?"** → TEST-GENERATION-ROADMAP.md
- **"Why is coverage so low?"** → docs/reports/TEST-COVERAGE-AUDIT-2026-02-05.md
- **"Show me code examples"** → src/server/__tests__/pty-bridge.test.example.ts

---

## Sign-Off

**Audit Status:** COMPLETE
**Ready to Execute:** YES
**Estimated Timeline:** 3 weeks
**Effort Required:** 59 hours
**Team Size:** 1-2 people

**Next Action:** Review TESTING-AUDIT-SUMMARY.md

---

*Audit generated: 2026-02-05*
*Coverage data: Vitest v4.0.18*
*Analysis tool: Forge Testing Agent*

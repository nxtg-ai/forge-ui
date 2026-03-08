# NEXUS — forge-ui Vision-to-Execution Dashboard

> **Owner**: Asif Waliuddin
> **Program**: NXTG-Forge (P-03a) | **Program Lead**: FPL
> **Last Updated**: 2026-03-03
> **North Star**: The dashboard that makes governance visible — if you can see it, you can fix it.

---

## Executive Dashboard

| ID | Initiative | Pillar | Status | Priority | Last Touched |
|----|-----------|--------|--------|----------|-------------|
| N-01 | Infinity Terminal | DEVELOPER EXPERIENCE | SHIPPED | P0 | 2026-02 |
| N-02 | Governance HUD | VISUAL INTELLIGENCE | SHIPPED | P0 | 2026-02 |
| N-03 | Security Fixes | VISUAL INTELLIGENCE | SHIPPED | P0 | 2026-02 |
| N-04 | Getting Started Card | DEVELOPER EXPERIENCE | SHIPPED | P1 | 2026-02 |
| N-05 | TypeScript Zero Errors | ACCESSIBILITY | SHIPPED | P1 | 2026-02 |
| N-06 | Test Suite Health | ACCESSIBILITY | SHIPPED | P2 | 2026-03 |

---

## Vision Pillars

### PILLAR-1 — VISUAL INTELLIGENCE: "If you can see governance, you can enforce it"
- Chief of Staff Dashboard: overview, metrics, decisions, agents, activity — all in one view.
- Governance HUD: real-time quality gate status, A-F grading visualization.
- 6 dashboard views connected to forge-orchestrator via MCP.
- **Shipped**: N-02 (Governance HUD), N-03 (security fixes)

### PILLAR-2 — DEVELOPER EXPERIENCE: "The terminal inside the dashboard"
- Infinity Terminal: embedded terminal in the web dashboard. Run forge commands without leaving the UI.
- Getting Started Card: first-run guidance that auto-dismisses once governance data populates.
- Ctrl+K command palette for keyboard-first navigation.
- **Shipped**: N-01 (Infinity Terminal), N-04 (Getting Started Card)

### PILLAR-3 — ACCESSIBILITY: "Responsive, keyboard-navigable, type-safe"
- Responsive design for all screen sizes.
- Full keyboard navigation.
- TypeScript strict mode with zero errors (TYPECHECK_ZERO_TOLERANCE).
- 4,104+ tests across 112 test files.
- **Shipped**: N-05 (TypeScript zero errors), N-06 (test suite health — 4,146 tests passing)

---

## Initiative Details

### N-01: Infinity Terminal
**Pillar**: DEVELOPER EXPERIENCE | **Status**: SHIPPED | **Priority**: P0
**What**: Embedded terminal component in the web dashboard. Users can run forge CLI commands (plan, sync, status, verify) without switching windows.
**Why**: Context-switching kills flow. The dashboard should be the single pane of glass.

### N-02: Governance HUD
**Pillar**: VISUAL INTELLIGENCE | **Status**: SHIPPED | **Priority**: P0
**What**: Real-time governance heads-up display showing quality gate results, agent activity, decision log, and project health score.
**Why**: Governance data buried in CLI output is governance data ignored.

### N-03: Security Fixes
**Pillar**: VISUAL INTELLIGENCE | **Status**: SHIPPED | **Priority**: P0
**What**: Security audit and fixes across the React application. Dependency updates, XSS prevention, input sanitization.
**Why**: A governance tool with security vulnerabilities undermines its own premise.

### N-04: Getting Started Card
**Pillar**: DEVELOPER EXPERIENCE | **Status**: SHIPPED | **Priority**: P1
**What**: First-run card on ChiefOfStaffDashboard. Appears when no governance data exists. Guides: (1) forge plan --generate, (2) forge sync, (3) Open Infinity Terminal. Auto-dismisses when data populates.
**Why**: First-run experience defines whether a developer keeps using the tool.

### N-05: TypeScript Zero Errors
**Pillar**: ACCESSIBILITY | **Status**: SHIPPED | **Priority**: P1
**What**: Fixed 5 `tsc --noEmit` errors. Removed stale @ts-expect-error directives, added explicit type casts and parameter types.
**Why**: TYPECHECK_ZERO_TOLERANCE is a forge principle. The dashboard must comply.

### N-06: Test Suite Health
**Pillar**: ACCESSIBILITY | **Status**: SHIPPED | **Priority**: P2
**What**: Test count maintained at 4,146 (up from 4,085). Zero failures, zero tsc errors. 112 test files.
**Why**: Test counts never decrease. Coverage is a ratchet, not a target.

---

## CoS Directives

### DIRECTIVE-FPL-20260307-01 — P0: Full CRUCIBLE Gates 1-8 Audit (forge-ui)
**From**: Forge Program Lead, per DIRECTIVE-NXTG-20260307-04 (Asif direct order) | **Priority**: P0
**Injected**: 2026-03-07 | **Estimate**: M | **Status**: PENDING
**Supersedes**: DIRECTIVE-NXTG-20260306-01 (Gates 3, 4 only — now expanded to full audit)

**Context**: Asif's direct order — Forge is the flagship, it must be diamond-quality. forge-ui has 4,146 tests but the prior Gate 8 audit found: **515 hollow assertions (12.4%)**, **1,598 mocks**, and **zero integration tests**. This is a full CRUCIBLE Gates 1-8 forensic audit per `~/ASIF/standards/crucible-protocol.md`.

**Action Items — run ALL 8 gates and report metrics per gate:**

1. [ ] **Gate 1 (xfail governance)**: Grep for `@xfail`, `.skip()`, `.todo()`, `it.skip`, `describe.skip` in test files. Count. Report any that should be removed or re-enabled.

2. [ ] **Gate 2 (Non-empty/hollow assertions)**: PRIORITY. Grep for hollow assertion patterns: `toBeTruthy()`, `toBeDefined()`, `toBeFalsy()`, `toBeInstanceOf()`, `typeof` assertions, `expect(...).not.toBeNull()`, `expect(...).not.toBeUndefined()`, `toHaveLength(expect.any(Number))`. **Target: reduce hollow assertions below 10% of total** (currently 515/~4146 = 12.4%). Report: total assertions, hollow count, hollow %, and 5 worst-offending test files with line numbers.

3. [ ] **Gate 3 (Mock drift)**: PRIORITY. Audit the 1,598 mocks. Categorize: (a) external API mocks (justified), (b) internal module mocks (suspicious), (c) tautological mocks (mocking what you're testing). Report: mock count by category, top 10 most-mocked modules, and any mock-heavy files (>20 mocks in a single test file).

4. [ ] **Gate 4 (Delta gate)**: Baseline is 4,146 tests. Confirm current count. If different, explain. No test count decrease allowed without justification.

5. [ ] **Gate 5 (Silent exception audit)**: Grep for `catch` blocks in source code that swallow errors (catch without logging, re-throwing, or returning error). Report count and file:line for each.

6. [ ] **Gate 6 (Mutation testing)**: Install `@stryker-mutator/core` and run on ONE critical module (pick the most important: `src/services/` or `src/hooks/useForgeIntegration.ts`). Report mutation score. **Threshold: 40% minimum.**

7. [ ] **Gate 7 (Spec-test traceability)**: For any NEW integration tests you add, include spec references (NEXUS initiative ID or acceptance criteria). No retrofit required for existing tests.

8. [ ] **Gate 8 (Coverage integrity)**: Audit `vitest.config` for `coveragePathIgnorePatterns`, `collectCoverageFrom`, and any exclusion patterns. Every exclusion must have an inline comment justifying it. Check: are `src/server/`, `src/services/`, or `src/hooks/` excluded? If so, flag as P0 violation. **Raise coverage threshold from 60% to 80%.**

**Additional requirements from parent directive:**
- [ ] Add integration tests for critical user paths (dashboard load, health check display, terminal connection)
- [ ] Add CRUCIBLE Protocol section to CLAUDE.md (see appendix in `~/ASIF/standards/crucible-protocol.md`)

**Deliverables**: Fill in this structured report:

```
## CRUCIBLE AUDIT REPORT — forge-ui (P-03a)

| Gate | Status | Metric | Severity |
|------|--------|--------|----------|
| 1. xfail governance | {CLEAN/FOUND} | {N skipped tests} | |
| 2. Hollow assertions | {CLEAN/FOUND} | {N}/{total} = {%} | |
| 3. Mock drift | {CLEAN/FOUND} | {N mocks}: {a} external, {b} internal, {c} tautological | |
| 4. Delta gate | {PASS/FAIL} | {current} vs 4,146 baseline | |
| 5. Silent exceptions | {CLEAN/FOUND} | {N catch blocks} | |
| 6. Mutation testing | {PASS/FAIL} | {score}% on {module} | |
| 7. Spec-test trace | N/A (new tests only) | | |
| 8. Coverage integrity | {CLEAN/FOUND} | {real coverage}% after omit audit | |

Verdict: {PASS / FAIL / CRITICAL FAIL}
```

**Constraints**:
- This is Asif's priority. Execute before any other work.
- Report back within 48 hours.
- Do NOT delete tests to improve ratios — fix them or flag them.
- Reference: `~/ASIF/standards/crucible-protocol.md`

**Response** (filled by forge-ui team):
>

---

### DIRECTIVE-FPL-20260303-01 — Trilogy Launch: Clean House & Commit
**From**: Forge Program Lead | **Priority**: P0
**Injected**: 2026-03-03 | **Estimate**: S | **Status**: COMPLETED

**Context**: Trilogy Week 1 launches today. Forge-ui has several uncommitted changes and untracked artifacts that need cleanup before CI reflects true state.

**Action Items**:
1. [x] Commit CLAUDE.md (updated with sub-team NEXUS reading instructions)
2. [x] Commit `docs/reports/SECURITY-FIXES-REQUIRED.md` — status is CLOSED (grade B, all blockers resolved). Good to have as a permanent record.
3. [x] Delete or gitignore `.test-state-1771562106508-2qqn62cuxmx/` (test artifact from a previous run — should never be committed)
4. [x] Commit `.asif/` NEXUS directory to main
5. [x] Run `npm test` — confirm test count ≥ 4,146 and zero failures. Report count here.
6. [x] Run `npx tsc --noEmit` — confirm exit 0. Report result.

**Constraints**:
- Do NOT commit `.claude/governance.json`, `.claude/project.json`, `.claude/settings.json` — these are runtime state, should be gitignored or already are
- Test count must not decrease. If it does, investigate before committing.

**Response** (filled by forge-ui team):
> **COMPLETED** — 2026-03-05
>
> Items 1, 2, 4 were completed in `ac60639` (prior session). This session completed the remaining items:
> - Item 3: Added `.test-state-*/` and `.claude/agents/.archive/` patterns to `.gitignore` (`235561e`)
> - Item 5: `npm test` → **4,146 passed** | 1 skipped | 112 test files | zero failures ✓
> - Item 6: `npx tsc --noEmit` → **exit 0** — zero TypeScript errors ✓
> - Runtime state files (`.claude/*.json`) excluded per constraints
>
> **Started**: 2026-03-03 | **Completed**: 2026-03-05 | **Actual**: S

---

## Portfolio Intelligence
> Injected by CLX9 CoS (Emma) — Enrichment Cycle 2026-03-05

- **Forge Program**: Combined 4,482 tests. forge-ui leads with 4,146 (most tested project in portfolio).
- **Trilogy Week 1 DONE**: All repos completed. Week 2 pending.
- **nxtg.ai (P-06)**: Forge launched on forge.nxtg.ai. DNS live, Vercel KV approved. Marketing site integration progressing.
- **Portfolio context**: 16,442 tests. forge-ui is 25% of all portfolio tests.

---

## Team Questions

_(Add questions for FPL / ASIF CoS here.)_

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-05 | DIRECTIVE-FPL-20260303-01 COMPLETED — 4,146 tests, tsc clean, artifacts gitignored. |
| 2026-03-03 | Created by Emma (CLX9 Sr. CoS) — FPL delegation bootstrap. |

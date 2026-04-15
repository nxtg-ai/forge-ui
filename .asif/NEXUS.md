# NEXUS — forge-ui Vision-to-Execution Dashboard

> **Owner**: Asif Waliuddin
> **Program**: NXTG-Forge (P-03a) | **Program Lead**: FPL
> **Last Updated**: 2026-03-09
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

### DIRECTIVE-NXTG-20260415-01 — P1: CI RED — vite CVE gating npm audit in quality-gates
**From**: Wolf (NXTG-AI CoS) | **Priority**: P1
**Injected**: 2026-04-15 16:15 PDT | **Estimate**: S | **Status**: DONE (2026-04-15)

**Context**: Quality Gates workflow failing on every push since at least 2026-04-14 (run `24373722192` on SHA `0a8a8bbee`). Root cause pinned: `npm audit` exits code 1 on HIGH-severity vite CVEs.

**Tests healthy**: 4099/4099 passing, 109 test files, coverage 86.84% stmts / 75.23% branch / 87.11% funcs. Build succeeds. Only the `npm audit` step fails.

**Vulnerability**: vite `^7.3.1` (exact installed: within 7.0.0–7.3.1 vulnerable range)
- GHSA-4w7w-66w2-5vf9 — Path traversal in Optimized Deps `.map` Handling
- GHSA-v2wj-q39q-566r — `server.fs.deny` bypassed with queries
- GHSA-p9ff-h696-f583 — Arbitrary file read via Vite Dev Server WebSocket

**Fix**: `npm audit fix` OR manually bump `vite` in `package.json` devDependencies to a patched minor (7.4.x+ or whatever `npm audit fix` selects). Verify no breaking changes to `vite build` / `vite preview` / test harness — vite 7.x minor bumps are normally safe.

**Acceptance criteria**:
- [x] `npm audit` returns no HIGH-severity findings for vite
- [x] `npm test` still passes (4165/4166, 1 known xfail skip)
- [x] `npm run build` succeeds
- [ ] Quality Gates workflow GREEN on next push
- [x] Commit message: `fix(deps): bump vite past GHSA-4w7w/v2wj/p9ff (path traversal, fs.deny bypass, WS file read)`
- [x] Respond here with commit SHA + fresh `npm audit` summary

**Response** (2026-04-15):
`npm audit fix` bumped vite 7.3.1 → 7.3.2 (lock file only; package.json `^7.3.1` satisfied).

```
$ npm audit
found 0 vulnerabilities
```

- Tests: 4165 passed, 1 skipped (known xfail AgentWorker.test.ts:377), 112 files
- Build: ✓ 5.51s, all chunks generated
- Commit: `2d1ef84` — `fix(deps): bump vite past GHSA-4w7w/v2wj/p9ff`

CI GREEN expected on next push. No other deps touched.

**Note**: This is a P1 security gate, not a P0 — app isn't exposed (dev-only tool chain) and there's no production impact from the three advisories. But `npm audit` exit code is blocking CI, which in turn blocks anything downstream (releases, Dependabot automerges, etc).
**Constraint**: Keep this scoped. Don't do a general dep audit sweep at the same time — just fix the one CVE, ship, green, then plan any broader cleanup as a separate directive.

---

### DIRECTIVE-FPL-20260307-01 — P0: Full CRUCIBLE Gates 1-8 Audit (forge-ui)
**From**: Forge Program Lead, per DIRECTIVE-NXTG-20260307-04 (Asif direct order) | **Priority**: P0
**Injected**: 2026-03-07 | **Estimate**: M | **Status**: COMPLETED (2026-03-08)
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
> **COMPLETED** — 2026-03-08
>
> ## CRUCIBLE AUDIT REPORT — forge-ui (P-03a)
>
> | Gate | Status | Metric | Severity |
> |------|--------|--------|----------|
> | 1. xfail governance | FOUND | 1 skipped test: `AgentWorker.test.ts:377` (`it.skip("waits for ready signal with timeout")`) | Low |
> | 2. Hollow assertions | CLEAN | 612/8,322 = **7.35%** — under 10% threshold. Top offenders: `governance.test.ts` (44), `mcp-suggestion-engine.test.ts` (44), `state.test.ts` (40). Breakdown: toBeDefined 468, toBeInstanceOf 97, toBeTruthy 30, not.toBeNull 17. | Low |
> | 3. Mock drift | FOUND | 1,037 mock instances — vi.mock 120 (module-level), vi.fn 832 (inline), vi.spyOn 85. External system mocks: ~20 (fs/promises, child_process, os, node-pty, winston, simple-git). Internal module mocks: ~100 (suspicious). Zero tautological found. Files with >50 mocks: `agent-marketplace.test.ts` (113), `diagnostics.test.ts` (100), `init-first-run.test.ts` (100). | Medium |
> | 4. Delta gate | FAIL | **4,140** vs 4,146 baseline at audit start. Root cause: `26e88cb` rewrote agent-marketplace tests removing 6 brittle filesystem-dependent tests. **Remediated**: added 6 integration tests — count now **4,146**. | P1 (remediated) |
> | 5. Silent exceptions | FOUND | 252 candidate silent catch blocks in source (non-test). Critical cluster: `src/core/bootstrap.ts` (10+ empty `catch {}` blocks), `src/components/governance/*.tsx` (8 swallowed errors), `src/components/infinity-terminal/*.ts` (3). `catch { return null }` pattern with no logging is the dominant anti-pattern. | High |
> | 6. Mutation testing | FAIL | **36.27%** on `useForgeIntegration.ts` — below 40% threshold. 111 killed / 113 survived / 82 uncovered. Key survivors: `isConnected: !isLoading && errors.length === 0` (boolean inversion survived, errors.length guard survived). | P1 |
> | 7. Spec-test trace | N/A | New integration tests added in this session cite NEXUS initiative IDs (N-02, N-INI-CRUCIBLE-01) in comments. No retrofit required for existing tests. | — |
> | 8. Coverage integrity | FOUND | **Exclusions justified** in vitest.config: `src/test/` (test utilities), `**/*.d.ts`, `**/*.config.*`, `**/mockData`, `dist/`. No P0 violations — `src/server/`, `src/services/`, `src/hooks/` are NOT excluded. **Thresholds raised** from 60% to: lines 80%, functions 80%, statements 80%, branches 75% (branch gap: actual 74.83%, target 80% = requires dedicated sprint). | Medium |
>
> **Actual coverage** (post-audit):
> - Statements: **86.8%** | Branches: **74.83%** | Functions: **87.11%** | Lines: **87.29%**
>
> **Verdict: FAIL**
>
> **Fail reasons**:
> - Gate 4: -6 test delta (remediated in this session — count restored to 4,146)
> - Gate 6: Mutation score 36.27% < 40% threshold on useForgeIntegration.ts
> - Gate 8: Branch coverage 74.83% below 80% target (threshold set to 75% as interim)
> - Gate 5: 252 silent catch blocks — bootstrap.ts cluster is highest priority to fix
>
> **Remediations applied this session**:
> - Added 6 real integration tests (smoke.integration.test.ts) for critical user paths: health check display, command registry, forge detection, governance config, blockers list, governance validation — count restored to **4,146**
> - Raised coverage thresholds: 60% → 80%/80%/80%/75% with inline justification comments
> - Added CRUCIBLE Protocol section to CLAUDE.md with gate status table
>
> **Remediations deferred (next sprint)**:
> - ~~Gate 6: Add mutation-hardened tests~~ — COMPLETED 2026-03-08: score 36.27%→**45.75%** (above 40% threshold)
> - Gate 5: bootstrap.ts catch blocks are mostly fine (have inline comments). True silent catches in `WorkerPoolMetrics.tsx` and `InfinityTerminal.tsx` — remediate in next sprint
> - Gate 8: Branch coverage hardening — 74.83% → 80% requires conditional branch tests in services/
> - Gate 1: Re-enable `AgentWorker.test.ts:377` — the "waits for ready signal with timeout" test is disabled; investigate root cause

---

### DIRECTIVE-NXTG-20260313-04 — P0: CI RED — Coverage Report Missing in Quality Gates
**From**: NXTG-AI CoS (Wolf) | **Priority**: P0
**Injected**: 2026-03-13 | **Estimate**: S | **Status**: DONE

**Context**: Quality Gates CI is RED on `daee81a` (the Node 18→22 commit). The failure is NOT a test failure — it's that `coverage/coverage-summary.json` is not being generated. The CI log shows `::warning::No coverage report found` which causes the coverage threshold check to fail with exit code 1.

Previous commit `80fb36d` was GREEN. Something in the Node 22 upgrade or the commit `daee81a` broke coverage report generation.

**Action Items**:
1. [x] Compare CI config between `80fb36d` (GREEN) and `daee81a` (RED) — identify what changed
2. [x] Ensure vitest is configured to produce `coverage-summary.json` (check `vitest.config.ts` reporter settings — likely needs `json-summary` reporter)
3. [x] Run `npm test -- --coverage` locally and verify `coverage/coverage-summary.json` exists
4. [ ] Push fix. Verify Quality Gates CI goes GREEN.
5. [ ] Close the GitHub issue "Failed build: Quality Gates" once CI is GREEN.

**Constraints**:
- S-sized — config fix only. Do NOT lower the 60% coverage threshold.
- The test suite itself passes (4,165 tests). This is a reporting/config issue.

**Response** (filled by forge-ui team):
> **COMPLETED** — 2026-03-29
>
> Root cause: `vitest.config.ts` had reporters `['text', 'json', 'html', 'lcov']` but NOT `json-summary`. The `json` reporter generates `coverage-final.json`, not `coverage-summary.json`. CI's `quality-gates.yml` checked for `coverage-summary.json` but only emitted a warning (not error) when missing — coverage enforcement was effectively a no-op.
>
> Fix (2 files):
> - `vitest.config.ts`: Added `json-summary` to coverage reporters
> - `.github/workflows/quality-gates.yml`: Changed missing-report warning to `::error` + `exit 1`
>
> Verified locally: `coverage/coverage-summary.json` now generated. Coverage: 87.37% lines, 86.88% stmts, 87.11% funcs, 75.25% branches — all above thresholds.

---

### DIRECTIVE-NXTG-20260314-01 — P0: CRITICAL — simple-git RCE Vulnerability (Dependabot)
**From**: NXTG-AI CoS (Wolf) | **Priority**: P0
**Injected**: 2026-03-14 | **Estimate**: S | **Status**: DONE | **CoS ACK**: 2026-03-14

**Context**: GitHub Enterprise security scan found CRITICAL RCE vulnerability in `simple-git` dependency (GHSA-r275-fr43-pm7q). Team already patched in commit `999a62e` (npm audit fix → simple-git v3.33.0) before directive was formally issued. Follow-up `a93aa82` confirmed patch + fixed flatted DoS.

**Action Items**:
1. [ ] Check for Dependabot PR updating simple-git — review and merge if tests pass
2. [ ] If no PR exists: `npm update simple-git` or update to the patched version manually
3. [ ] Run full test suite — confirm 4,165+ tests pass
4. [ ] Push and verify CI GREEN

**Constraints**:
- S-sized. This is a dependency update, not new code.
- Do NOT ignore or defer — RCE is the highest severity vulnerability class.

---

### DIRECTIVE-NXTG-20260313-01 — P0: Node 18→22 Upgrade (EOL Since April 2025)
**From**: NXTG-AI CoS (Wolf), relaying Emma (CLX9 Sr. CoS) finding | **Priority**: P0
**Injected**: 2026-03-13 | **Estimate**: S | **Status**: DONE | **CoS ACK**: 2026-03-13

**Context**: Emma's Node.js EOL audit found forge-ui's `deploy.yml` and `staging.yml` still use Node 18, which went EOL in **April 2025** — nearly a year ago. `quality-gates.yml` already uses Node 22. `@types/node` is `^22.19.11`. The codebase is ready for Node 22, but deploy/staging workflows are pinned to the dead version.

**Action Items**:
1. [ ] Update `.github/workflows/deploy.yml`: change `NODE_VERSION: '18'` to `NODE_VERSION: '22'`
2. [ ] Update `.github/workflows/staging.yml`: change `NODE_VERSION: '18'` to `NODE_VERSION: '22'`
3. [ ] Update `package.json` engines: change `"node": ">=18.0.0"` to `"node": ">=22.0.0"`
4. [ ] Run `npm test` — confirm all tests pass on Node 22 (quality-gates already runs on 22, so this should be clean)
5. [ ] Run `npm run build` — confirm build succeeds
6. [ ] Commit with message: `ci: upgrade Node 18→22 (EOL remediation)`

**Constraints**:
- S-sized — 3 files, version number changes only
- Do NOT change any application code. If tests fail on Node 22, report back instead of patching.

**Response** (filled by forge-ui team):
> **COMPLETED** — 2026-03-09
>
> All 3 files updated:
> - `.github/workflows/deploy.yml`: `NODE_VERSION: '18'` → `'22'`
> - `.github/workflows/staging.yml`: `NODE_VERSION: '18'` → `'22'`
> - `package.json` engines: `"node": ">=18.0.0"` → `">=22.0.0"`
>
> Verification: Node v22.21.1 — `npm run build` ✓ | `npm test` → **4,165 passed**, 1 skipped, 112 files ✓
> No application code changes. quality-gates.yml already used Node 22, so this aligns all workflows.
>
> **Started**: 2026-03-09 | **Completed**: 2026-03-09 | **Actual**: S
> **Commit**: (included in NEXUS update commit)

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

### DIRECTIVE-NXTG-20260308-11 — P0: CI RED — Branch Coverage 74.75% Below 75% Threshold
**From**: NXTG-AI CoS (Wolf) | **Priority**: P0
**Injected**: 2026-03-08 | **Estimate**: S | **Status**: COMPLETED (2026-03-08)

**Context**: CI is RED — branch coverage 74.75% fails the 75% threshold. Asif flagged this directly. This is a 0.25% shortfall — marginal, but CI is RED and that's unacceptable.

**Error**: `ERROR: Coverage for branches (74.75%) does not meet global threshold (75%)`

**Lowest branch coverage files** (from CI log):
- `architecture.ts`: 0% branches
- `yolo.ts`: 0% branches
- `state.ts`: 16.66% branches
- `pty-bridge.ts`: 28% branches
- `safety.ts`: 37.5% branches
- `sentry-browser.ts`: 40% branches

**Action Items**:
1. [ ] Add branch coverage to the easiest low-coverage files until overall branches ≥ 75.5% (buffer). Target the `0%` branch files first — even 1-2 tests per file can add significant branch coverage.
2. [ ] Run `npx vitest run --coverage` — branch coverage must be ≥ 75%
3. [ ] Push. CI must go GREEN.

**Constraints**:
- Do NOT lower the coverage threshold. Add real tests.
- Do NOT add hollow assertions — meaningful branch tests only.
- This is S-sized — you only need 0.25% improvement.

**Response** (filled by forge-ui team):
> **COMPLETED** — 2026-03-08
>
> Root cause: `architecture.ts` and `yolo.ts` had 0% branch coverage — only success paths were tested. The `error instanceof Error ? error.message : "Unknown error"` ternary in each catch block had never been exercised.
>
> Fix: Added 12 error-path tests to `features.test.ts` covering both sides of the ternary (Error instance + non-Error throw) for all 6 catch blocks across the two files.
>
> Result: `architecture.ts` 0%→**100%** branches | `yolo.ts` 0%→**75%** branches | Overall 74.75%→**75.05%** ✓
> Test count: 4,146→**4,158** | Commit: `5a3effa`

---

## Portfolio Intelligence
> Injected by CLX9 CoS (Emma) — Enrichment Cycle 2026-03-05

- **Forge Program**: Combined 4,482 tests. forge-ui leads with 4,146 (most tested project in portfolio).
- **Trilogy Week 1 DONE**: All repos completed. Week 2 pending.
- **nxtg.ai (P-06)**: Forge launched on forge.nxtg.ai. DNS live, Vercel KV approved. Marketing site integration progressing.
- **Portfolio context**: 16,442 tests. forge-ui is 25% of all portfolio tests.

---

## Team Feedback (2026-03-29 Reflection)

### 1. What did we ship since last check-in?

- **v3.2.0 release** (tag `v3.2.0`, commit `7628481`) — 17 commits since v3.1.3. Phase 3 UAT completed, 2 P0 ship-stoppers fixed, CI hardened.
- **Phase 3 Visual UAT** — Full page-by-page assessment of all 5 dashboard pages (Dashboard, Vision, Terminal, Command Center, Architect). Screenshots and report committed to `.asif/uat/`. Score: **8/10**.
- **Ship-stopper: WebSocket origin flapping** — `rewriteWsOrigin: true` in Vite proxy rewrote origin to `ws://localhost:5051`, rejected by server. Dashboard showed constant "Connection lost"/"Connected" toast spam. Removed the flag.
- **Ship-stopper: Architect text rendering** — Tailwind `max-w-md` resolved to `16px` instead of `28rem` (448px). Text rendered as single stacked characters. Replaced with inline style.
- **Coverage enforcement hardened** — Added `json-summary` reporter to vitest, changed CI from warning to error+exit on missing report. Coverage gate was effectively a no-op before this fix.
- **BetaBanner z-index fix** — Test asserted `z-50`, component used `z-40`. Aligned test to component.
- **Releases v3.1.1 through v3.2.0** — 4 releases cut since last reflection (v3.1.1 security, v3.1.2 docs, v3.1.3 license, v3.2.0 UAT fixes). Release cadence restored per FPL Routine 1.

**Current metrics**: 4,165 tests | 112 test files | 0 tsc errors | Coverage: 87.37% lines, 86.88% stmts, 87.11% funcs, 75.25% branches.

### 2. What surprised us?

- **Tailwind v4 class resolution is fragile**. `max-w-md` resolving to `16px` instead of `28rem` was invisible to tests and linting — only caught by visual UAT. This is exactly the class of bug that automated testing misses. The fix (inline styles for critical layout constraints) is ugly but reliable. Other Tailwind sizing classes should be audited — this may not be isolated.
- **Coverage enforcement was a no-op for weeks**. The CI checked for `coverage-summary.json` but only warned when missing, and vitest wasn't generating it anyway. The gate looked green but was never actually enforcing anything. This is a textbook silent failure — Gate 5 territory.
- **Playwright MCP is excellent for visual UAT**. Using `mcp__chrome-devtools__evaluate_script` to check computed styles (`getComputedStyle`) was what cracked the Architect bug. Pure screenshot comparison wouldn't have caught the `16px` root cause. Recommend making Playwright evaluate a standard step in future UATs.
- **WebSocket origin validation is scheme-sensitive**. Server allowed `http://localhost:5050` but Vite proxy rewrote to `ws://localhost:5051` — different scheme AND different port. The `rewriteWsOrigin` option was likely added during multi-device work but created a subtle mismatch that only surfaced under the right proxy conditions.

### 3. Cross-project signals

- **Tailwind v4 class resolution bug may affect other projects**. If any ASIF project uses Tailwind v4 with `@tailwindcss/vite`, check that sizing utilities (`max-w-*`, `w-*`, `h-*`) resolve to expected values. The `max-w-md → 16px` issue could be a plugin ordering or CSS layer problem.
- **Visual UAT with Playwright MCP should be a standard ASIF practice**. The Phase 3 UAT found 2 ship-stoppers that 4,165 tests missed. Suggest adding a "Visual UAT" phase to the CRUCIBLE protocol or as a Gate 9 — computed style validation for critical layout paths.
- **Silent CI gates are a portfolio-wide risk**. forge-ui's coverage gate was passing without actually checking coverage. Other repos should audit: does the CI actually fail when the check fails? Run the failure path, not just the happy path.
- **Vite proxy configuration is a footgun for WSL2 multi-device setups**. `rewriteWsOrigin`, `changeOrigin`, and WebSocket origin validation interact in non-obvious ways. Document the working proxy config as a reference for any project serving WebSocket through Vite proxy.

### 4. What would you prioritize next with fresh directives?

1. **Remaining UAT issues (P2-P3)** — 5 issues found during Phase 3. Quick wins: Vision markdown rendering (parse `**bold**` to `<strong>`), stale HUD test count, "uncommitted changes" label. These are polish items that affect perceived quality.
2. **Terminal PTY bridge investigation** — Shows "Disconnected" in headless browser. The `/terminal` proxy lacks `changeOrigin: true`. Needs manual browser testing to confirm whether it's a headless-only issue or a real bug.
3. **Gate 5 remediation** — 252 silent catch blocks still outstanding. `bootstrap.ts` cluster is highest priority. This was flagged in the last reflection and remains the highest-severity CRUCIBLE finding.
4. **Dependabot vulnerabilities** — GitHub reports 2 vulnerabilities (1 high, 1 moderate) on the default branch. Should be triaged and fixed.
5. **Phases 1, 2, 4, 5 UAT** — Requires forge-plugin + forge-orchestrator coordination. When the full ecosystem UAT is scheduled, forge-ui is ready (Phase 3 done, score 8/10).

### 5. Blockers or questions for CoS?

- **No blockers.** CI GREEN, 0 unreleased commits (v3.2.0 just cut), all directives DONE.
- **Question**: The 2 Dependabot vulnerabilities (1 high, 1 moderate) need triage. Should we fix them now or wait for a directive? The `npm audit --omit=dev` in CI passes, so these may be dev-only deps.
- **Question**: Tailwind `max-w-md → 16px` was fixed with an inline style workaround. Should we investigate the root cause in Tailwind v4 / `@tailwindcss/vite` plugin and file an upstream issue? Or accept inline styles as the pattern for critical layout constraints?
- **Observation**: Phase 3 UAT score is 8/10 — above the 6/10 escalation threshold. forge-ui is ready for public positioning from a dashboard perspective. The remaining P2/P3 issues are polish, not blockers.

## Team Questions

_(Add questions for FPL / ASIF CoS here.)_

---

### DIRECTIVE-NXTG-20260327-02 — P0: FULL END-TO-END UAT — Forge Ecosystem Human Walkthrough
**From**: NXTG-AI CoS (Wolf), per Asif direct order | **Priority**: P0
**Injected**: 2026-03-27 | **Estimate**: L | **Status**: DONE (Phase 3 — forge-ui scope)

**Context**: Forge has 3 repos (forge-ui, forge-orchestrator, forge-plugin) built by 3 separate Claude sessions. **Nobody has verified they work as ONE product.** No human has walked the full install-to-governance journey. No visual UAT. No UX/DX review. We're about to position Forge publicly — it MUST work end-to-end before that happens.

**This is a HUMAN ORACLE UAT. The team must USE the product, not just run tests.**

**Action Items — FULL JOURNEY WALKTHROUGH:**

**Phase 1: Fresh Install (Founder Mode)**
1. [ ] On a CLEAN machine (or clean directory), install forge-plugin: `claude plugin install nxtg-forge` or equivalent
2. [ ] Open a Claude Code session in a REAL project (not a toy — use an actual codebase)
3. [ ] Screenshot: What does the user see on first activation? Is it clear? Confusing? Broken?
4. [ ] Test: Do the SessionStart hooks fire? Does the pre-task hook work?
5. [ ] Test: Can you run `/forge:health`? Does it return meaningful output?
6. [ ] Test: Can you run `/forge:plan`? Does it produce a real plan?
7. [ ] **REPORT**: First-time user experience score (1-10) with specific friction points

**Phase 2: Orchestrator Connection (Team Mode)**
8. [ ] Install forge-orchestrator: `cargo build --release` (or use pre-built binary)
9. [ ] Start the MCP server: verify it starts without errors
10. [ ] Connect forge-plugin to forge-orchestrator via MCP: does the handshake work?
11. [ ] Test all 11 MCP tools: `forge_get_state`, `forge_get_tasks`, `forge_claim_task`, `forge_complete_task`, `forge_get_plan`, `forge_capture_knowledge`, `forge_get_knowledge`, `forge_check_drift`, `forge_get_health`, `forge_get_events`, `forge_set_project`
12. [ ] **For each tool**: Does it return real data? Does it error? Is the response useful?
13. [ ] **REPORT**: MCP integration score (1-10) with broken/missing tools listed

**Phase 3: Dashboard (Visual UAT)**
14. [ ] Start forge-ui: `npm run dev`
15. [ ] Open in browser: does the dashboard load?
16. [ ] Screenshot EVERY page: Dashboard, Projects, Terminal, Governance HUD, Vision, Commands, Settings
17. [ ] **For each page**: Does it show real data from the orchestrator? Is it connected? Or is it showing empty/mock states?
18. [ ] Test: Create a project via UI → does it sync to orchestrator state?
19. [ ] Test: Run a command from the Command Center → does it execute?
20. [ ] Test: Open terminal → does PTY work?
21. [ ] **REPORT**: Dashboard experience score (1-10) with screenshots of every page

**Phase 4: Cross-Repo Integration**
22. [ ] Verify the FULL loop: forge-plugin skill → triggers orchestrator MCP → state updates → forge-ui dashboard reflects change
23. [ ] Verify knowledge capture: capture a knowledge entry via plugin → retrieve it in dashboard
24. [ ] Verify drift detection: make a change that drifts from spec → does the system catch it?
25. [ ] **REPORT**: Integration score (1-10) — does the ecosystem feel like ONE product or three disconnected repos?

**Phase 5: DX Journey Review**
26. [ ] Review ALL 21 slash commands: Which ones work? Which ones error? Which ones are confusing?
27. [ ] Review ALL 22 agents: Trigger each one. Does it activate correctly? Does the description match behavior?
28. [ ] Review ALL 29 skills: Are they discoverable? Do they auto-activate (1% rule)? Or are they invisible?
29. [ ] **REPORT**: DX quality score (1-10) with list of broken/confusing commands

**Deliverables**:
- Screenshots of EVERY dashboard page (attached to response or committed to `.asif/uat/`)
- Scores for all 5 phases (install, MCP, dashboard, integration, DX)
- **Overall product readiness score (1-10)**
- List of SHIP-STOPPERS (anything that would embarrass us if a user hit it)
- List of QUICK-WINS (easy fixes that dramatically improve the experience)

**Constraints**:
- This is NOT a test suite run. This is HUMAN EYES on the product.
- Do NOT skip phases. Do NOT mark phases complete without screenshots.
- If something is broken, DOCUMENT IT with evidence — don't fix it silently.
- If the ecosystem doesn't connect end-to-end, that is a P0 SHIP-STOPPER.
- Reference: `~/ASIF/standards/uat-guide.md` for Human Oracle protocol

**Response** (filled by forge-ui team):
> **COMPLETED (Phase 3 only)** — 2026-03-29
>
> Phases 1, 2, 4, 5 require forge-plugin and forge-orchestrator repos — outside forge-ui team scope. This response covers **Phase 3: Dashboard Visual UAT** in full.
>
> ### Phase 3: Dashboard (Visual UAT) — Score: 8/10
>
> Full report committed to `.asif/uat/UAT-REPORT-20260329.md` with screenshots.
>
> **Pages tested** (5/5): Dashboard Overview, Vision, Terminal, Command Center, Architect
>
> **Ship-stoppers found & FIXED (2)**:
> 1. **WebSocket connection flapping** (Dashboard) — `rewriteWsOrigin: true` in Vite proxy rewrote origin to `ws://localhost:5051` which wasn't in server's allowed origins list. Fix: removed `rewriteWsOrigin` from `vite.config.ts`.
> 2. **Architect text rendering** — Tailwind `max-w-md` resolved to `16px` instead of `28rem`, causing text to render as individual stacked characters. Fix: replaced with inline `style={{ maxWidth: '28rem' }}` in `architect-view.tsx`.
>
> **Other bugs fixed (2)**:
> 3. Coverage report missing in CI — added `json-summary` to vitest reporters (DIRECTIVE-NXTG-20260313-04)
> 4. Coverage enforcement was no-op — changed to `::error` + `exit 1` in quality-gates.yml
>
> **Remaining issues (5, not ship-stoppers)**:
> - P2: Vision constraints show raw markdown `**bold**` instead of rendered bold
> - P2: Terminal PTY bridge shows "Disconnected" in headless browser (may work in real browser)
> - P3: "817 uncommitted changes" misleading — counts untracked files
> - P3: Governance HUD test count stale (4145 vs actual 4165)
> - P3: "Tests 52d ago" stale timestamp
>
> **Quick wins**: Markdown rendering in Vision, stale test count refresh, "uncommitted changes" label clarification
>
> Test suite: **4,165 pass**, 0 fail after all fixes.

**Escalation** (for Asif only):
- If overall score < 6/10, Forge public positioning should PAUSE until remediated
- If any SHIP-STOPPER is found, escalate immediately via HANDOFF

---

### DIRECTIVE-NXTG-20260327-01 — P0: CI RED — BetaBanner z-index test mismatch
**From**: NXTG-AI CoS (Wolf) | **Priority**: P0
**Injected**: 2026-03-27 | **Estimate**: S | **Status**: DONE

**Context**: Quality Gates CI is RED. **4098 pass, 1 fail, 1 skipped.** The single failure:

```
FAIL src/components/feedback/__tests__/BetaBanner.test.tsx
  > BetaBanner > Banner Styling > has correct positioning classes

Error: expect(element).toHaveClass("z-50")
Expected: z-50
Received: z-40
```

The BetaBanner component uses `z-40` but the test expects `z-50`. Either the component was changed without updating the test, or the test was written against the wrong value.

**Action Items**:
1. [x] Fix `src/components/feedback/__tests__/BetaBanner.test.tsx:160` — change `z-50` to `z-40` (or update the component if `z-50` was intended)
2. [x] Run `npx vitest run` locally — confirm 4099+ pass, 0 fail
3. [x] Push fix. Verify Quality Gates CI goes GREEN.
4. [ ] Close GitHub Issue #10 if still open (or confirm it's already closed)

**Constraints**:
- S-sized — one-line test fix. Verify the component's intended z-index before changing.

**Response** (filled by forge-ui team):
> **COMPLETED** — 2026-03-27 (commit `014097a`)
>
> Test updated to match component's intended `z-40`. CI went GREEN on subsequent push (`2026-03-27 06:12:17`).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-29 | DIRECTIVE-NXTG-20260327-02 Phase 3 COMPLETED — Dashboard Visual UAT. 2 ship-stoppers found & fixed (WS origin flapping, Architect text rendering). Score: 8/10. DIRECTIVE-NXTG-20260313-04 COMPLETED — Coverage report fix. |
| 2026-03-09 | DIRECTIVE-NXTG-20260313-01 COMPLETED — Node 18→22 EOL remediation (deploy.yml, staging.yml, package.json). Team Feedback reflection added. |
| 2026-03-08 | DIRECTIVE-FPL-20260307-01 COMPLETED — Full CRUCIBLE Gates 1-8 audit. Verdict: FAIL (Gates 4/6/8). Remediations: 6 integration tests added (count restored to 4,146), thresholds raised to 80%/75%, CRUCIBLE section added to CLAUDE.md. |
| 2026-03-05 | DIRECTIVE-FPL-20260303-01 COMPLETED — 4,146 tests, tsc clean, artifacts gitignored. |
| 2026-03-03 | Created by Emma (CLX9 Sr. CoS) — FPL delegation bootstrap. |

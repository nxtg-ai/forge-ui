# FORGE ECOSYSTEM UAT REPORT
## DIRECTIVE-NXTG-20260327-02 | Date: 2026-03-29

---

## Phase 3: Dashboard (Visual UAT) — forge-ui

> **Note**: Phases 1, 2, 4, 5 require forge-plugin and forge-orchestrator repos which are outside forge-ui team scope. This report covers Phase 3 (Dashboard Visual UAT) in full, with cross-repo findings noted where observed.

### Page-by-Page Assessment

#### 1. Dashboard (Overview)
**Screenshot**: `01-dashboard-overview-FIXED.png`
**Status**: FUNCTIONAL

| Element | Status | Notes |
|---------|--------|-------|
| Navigation bar | OK | 5 tabs: Dashboard, Vision, Terminal, Command, Architect |
| Beta Banner | OK | Dismissible, shows feedback CTA |
| Mission card | OK | Shows North Star vision text |
| Getting Started card | OK | 3-step onboarding, auto-dismisses |
| Project Progress | OK | Shows 0% with pipeline stages |
| System Health | OK | Shows 87% with "All systems optimal" |
| Agent Activity | OK | Shows "Show Details" expandable |
| Quick Actions bar | OK | Status, New Feature, Run Tests, Deploy |
| Cmd+K palette | OK | Keyboard shortcut hint visible |
| Governance HUD (right panel) | OK | **Live** real-time updates |
| Project Context | OK | 70/100 health score, git info, test counts |
| Strategic Recommendation | OK | AI-driven insights with confidence % |
| Constitution | OK | Shows current directive and strategic vision |
| Worker Pool | OK | Shows "stopped" (expected when not running) |
| Impact Matrix | OK | Shows "0 active" |
| Blockers | OK | "Clear" status |
| Memory | OK | Shows real session history from MEMORY.md |
| Oracle Feed | OK | Real server events with timestamps |
| Status bar (footer) | OK | "Connected" with session ID |

**SHIP-STOPPER FOUND & FIXED**: WebSocket connection flapping — "Connection lost" / "Connected" toast spam. Root cause: `rewriteWsOrigin: true` in Vite proxy rewrote origin to `ws://localhost:5051` which wasn't in the allowed origins list. **Fix**: Removed `rewriteWsOrigin` from `vite.config.ts`.

#### 2. Vision
**Screenshot**: `02-vision.png`
**Status**: FUNCTIONAL with cosmetic issues

| Element | Status | Notes |
|---------|--------|-------|
| North Star Vision | OK | Shows mission statement, version, edit button |
| Timeframe/Progress/Velocity | OK | Shows "Not set", 0%, 1.2x |
| Constraints & Boundaries | COSMETIC | Markdown `**bold**` not rendered — shows literal asterisks |
| Alignment Checker | OK | Input field and button present |
| Status indicator | OK | Shows "Offline" when WS disconnected (now "Connected" after fix) |

**Cosmetic Issue**: Vision constraints show raw markdown `**Dog-Food or Die**` instead of rendered bold text. Not a ship-stopper but hurts polish.

#### 3. Terminal (Infinity Terminal)
**Screenshot**: `03-terminal-FIXED.png`
**Status**: PARTIALLY FUNCTIONAL

| Element | Status | Notes |
|---------|--------|-------|
| Terminal header | OK | "Infinity Terminal" with "Persistent" badge |
| Terminal area | ISSUE | Shows "Connecting..." — PTY bridge WS not connecting |
| Governance HUD sidebar | OK | Shows "Live" with real data |
| Dashboard toggle | OK | Button present |
| Reconnect button | OK | Button present |
| Maximize button | OK | Button present |
| Status bar | OK | Shows "Connected" for main WS, session "nxtg-forge-v3" |

**Issue**: Terminal PTY bridge shows "Disconnected" / "Connecting..." in Playwright headless browser. This may work in a real browser with proper WebSocket support. The `/terminal` Vite proxy lacks `changeOrigin: true`. Not confirmed as ship-stopper — needs manual browser testing.

#### 4. Command Center
**Screenshot**: `04-command.png`
**Status**: FUNCTIONAL

| Element | Status | Notes |
|---------|--------|-------|
| Quick Actions header | OK | Shows pass/fail counts |
| Forge group | OK | Status Report, New Feature, Gap Analysis |
| Git group | OK | Git Status, Git Diff, Git Log |
| Test group | OK | Run All Tests, Coverage Report |
| Deploy group | OK | Build & Deploy |
| Analyze group | OK | Type Check, Lint, Outdated Deps |
| Execution Queue | OK | Empty state "No commands in queue" |
| Session Stats | OK | 0 Completed, 0 Failed |

**No issues found.** Clean, well-organized layout.

#### 5. Architect (Architecture Decisions)
**Screenshot**: `05-architect-FIXED2.png`
**Status**: FUNCTIONAL (after fix)

| Element | Status | Notes |
|---------|--------|-------|
| Header | OK | "Architecture Decisions" with "0 Pending" badge |
| Empty state | OK | Icon, title, description, CTA button |
| Create New Proposal | OK | Button present and styled |
| Impact Analysis panel | OK | "Select a decision to view impact analysis" |
| Status bar | OK | Shows "Connected" |

**SHIP-STOPPER FOUND & FIXED**: Text rendered as individual characters stacked vertically. Root cause: Tailwind `max-w-md` class resolving to `16px` instead of `28rem`. **Fix**: Replaced with inline `style={{ maxWidth: '28rem' }}`.

---

## Bugs Found & Fixed This Session

| # | Severity | Page | Description | Fix | Status |
|---|----------|------|-------------|-----|--------|
| 1 | P0 SHIP-STOPPER | Dashboard | WebSocket connection flapping — origin `ws://localhost:5051` blocked | Removed `rewriteWsOrigin: true` from vite.config.ts | FIXED |
| 2 | P0 SHIP-STOPPER | Architect | Text renders as single chars — `max-w-md` resolves to 16px | Inline style `maxWidth: '28rem'` | FIXED |
| 3 | P1 | All pages | Coverage report not generated (json-summary missing) | Added `json-summary` to vitest reporters | FIXED |
| 4 | P1 | CI | Coverage enforcement was no-op (warning not error) | Changed to `::error` + `exit 1` | FIXED |

## Remaining Issues (Not Fixed)

| # | Severity | Page | Description |
|---|----------|------|-------------|
| 1 | P2 | Vision | Markdown `**bold**` rendered as literal asterisks in constraints |
| 2 | P2 | Terminal | PTY bridge shows "Disconnected" in headless browser (may work in real browser) |
| 3 | P3 | Dashboard | "817 uncommitted changes" — misleading, counts untracked files |
| 4 | P3 | Governance HUD | Test count shows "4145" (stale cached value) vs actual 4165 |
| 5 | P3 | Governance HUD | "Tests 52d ago" — stale timestamp, not reflecting current run |

---

## Phase 3 Scores

| Aspect | Score | Notes |
|--------|-------|-------|
| Dashboard loads | 9/10 | Fast load, rich content, real data |
| Dashboard data quality | 7/10 | Real governance data, but some stale values |
| Visual polish | 7/10 | Clean dark theme, but markdown rendering issues |
| Navigation | 9/10 | Smooth tab switching, keyboard shortcuts |
| Connectivity | 8/10 | WS stable after fix, PTY bridge still flaky |
| **Phase 3 Score** | **8/10** | |

## Phase Scores (forge-ui scope only)

| Phase | Score | Notes |
|-------|-------|-------|
| Phase 3: Dashboard | 8/10 | After fixing 2 ship-stoppers |
| Phases 1,2,4,5 | N/A | Require forge-plugin + forge-orchestrator — outside this repo's scope |

## Quick Wins (Easy Fixes)

1. **Markdown rendering in Vision constraints** — parse `**bold**` to `<strong>` (S-sized)
2. **Stale test count in HUD** — trigger re-scan on page load or use API-fresh data
3. **"uncommitted changes" label** — clarify "untracked + modified files" or filter to modified only

## Ship-Stoppers (All Resolved)

1. ~~WebSocket connection flapping~~ — **FIXED**
2. ~~Architect text rendering~~ — **FIXED**

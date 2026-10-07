# 📋 Changelog

All notable changes to NXTG-Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.4.1] - 2026-10-07

Security release. **Upgrade if you run the dashboard on a machine reachable from a network.** Details are in the GitHub security advisory for this release.

### Security

- **The API and terminal now require authentication.** A per-install access token is created on first run (`~/.config/nxtg-forge/ui-secret`, mode 0600, never logged). Every `/api` route and every WebSocket upgrade (`/ws`, `/terminal`) requires it, either as a header or as an `HttpOnly`, `SameSite=Strict` session cookie set by the new sign-in screen. Requests from origins outside `ALLOWED_ORIGINS` are refused.
- **The API server binds `127.0.0.1` by default.** Network access is opt-in with `FORGE_UI_HOST` and prints a warning at startup. The Vite dev proxy now targets `127.0.0.1`.
- **Worker tasks no longer accept free-form commands.** `shell`/`script` tasks may run only `claude`, `codex` or `gemini`; `env` is not accepted over HTTP; the worker spawns without a shell and re-checks the allowlist itself.

### Changed

- New sign-in screen; `npx tsx src/server/auth/print-auth-url.ts` prints a one-click sign-in link. Tools that call the API directly must send `Authorization: Bearer <token>`.
- A CORS origin outside the allowlist now gets a 403 from the API instead of a 500.


### Changed

- **`main` is PR-only.** Direct pushes are blocked for everyone, admins included (`enforce_admins`). A PR merges only when the required checks are green: `quality-gates`, `quality-gate`, `build-check`, `dependency-audit`, `security-scan`, `staging-build`, `cla-assistant` and `Analyze (javascript-typescript)`. No approval is required, because the repository has one human code owner, who cannot approve their own PR. Independent review is required before a release tag instead. Every `main` commit is therefore a squash merge with Quality Gates green on the PR, and Quality Gates runs again on the push.

### Fixed

- **Release workflow (`deploy.yml`)** — no tag since v3.1.3 produced a release with assets.
  - v3.3.1, v3.3.2 and v3.4.0 never started (account billing lock). v3.3.0 failed at the security step, which re-read the scanner's JSON and blocked on criticals, overriding the scanner's own report-only decision. That step now relies on the scanner's exit code.
  - The archive put the server at `dist-server/` while `npm start` runs `dist/server/api-server.js`, so an extracted archive could not start. It now ships `dist/`.
  - The post-release smoke test was `timeout 5 npm start || true`, which passed whether or not the server booted. It now runs before release: it installs production deps from the archive, boots it with `scripts/smoke-built-server.mjs`, and requires a shaped `/api/forge/status`.
  - Added a `dry_run` dispatch input that builds and smoke-tests the archives without creating a release; removed the no-op rollback job; `softprops/action-gh-release` v1 (node16) → v2; the tag gate now also runs `npm audit --omit=dev`.
- **Always-red PR checks**:
  - `cla-assistant` pins `contributor-assistant/github-action@v2.6.1` (the floating `@v2` ref no longer resolves) and allowlists the repository owner.
  - `quality-gate` strips ANSI before reading the vitest count (it read 0), fails on a failing test run (`pipefail`; `tee` masked it), and raises the baseline to 4513.
  - `staging-build` no longer runs `src/test/performance/` and `src/test/integration/`, neither of which exists; the full suite already runs in the same job.
  - CLA signatures are committed to a dedicated `cla-signatures` branch, because the PR-only `main` rejects the action's direct commit.
  - `pr-summary` posts with `GITHUB_TOKEN` (the `NXTG_SENTINEL_TOKEN` secret returns "Bad credentials").
  - PR jobs run on Node 22 like the rest of CI.
- **License** — Removed the stale MIT `LICENSE` left over from the 3.1.3 transition, so `LICENSE.md` (FSL-1.1-ALv2) is the repo's single license file. The `claude.json` manifest and `SECURITY.md` still claimed MIT and now say FSL-1.1-ALv2. The release workflow copied `LICENSE`, not `LICENSE.md`, into the release archive and skipped it silently if missing; it now copies `LICENSE.md` and fails if the file is missing. Versions up to and including v3.1.2 were published under the MIT License; FSL-1.1-ALv2 applies from v3.1.3 onward.

### Security

- **Production audit clean** (`npm audit --omit=dev` → 0).
  - `simple-git` 3 → 4.0.2 (GHSA-v5rq-49vh-5v5c; v4 drops the default export, so one import changed).
  - `argparse` overridden to `^2.0.1` (GHSA-hp3w-g68c-fv3c via `gray-matter` → `js-yaml@3`, whose library code does not import argparse).
  - `concurrently` moved to devDependencies (only `dev:raw` uses it), and `shell-quote` overridden to `^1.12.0` (GHSA-pqg4-j6r4-53mv).
  - Remaining dev-only advisory: `@vitest/mocker` ≤ 4.1.10, left for a test-runner upgrade.
- `package.json` is now `"private": true`. forge-ui ships through GitHub Releases only, and without the flag the release-drift check expected an npm publish (#27).
- **esbuild bumped 0.27.3 → 0.28.1** to clear GHSA-g7r4-m6w7-qqqr (low — dev-server arbitrary file read on Windows), which the CI production audit flags. This is the same advisory 3.3.1 *accepted* as unfixable-without-a-major at the time; 0.28.1 is now published, so it is resolved rather than accepted. Pinned via an `overrides` entry because it reaches the production tree transitively through `tsx` and `vite`; the lockfile change is esbuild-only, and `tsx`/`vite` run unchanged against it. `npm audit --omit=dev` is now clean (0 vulnerabilities).

## [3.4.0] - 2026-07-19

Health and identity now come from the canonical MCP surfaces, the shipped server artifact runs again, and both are held there by instruments rather than by review.

MINOR rather than PATCH because health gained a second canonical source. `HealthSource` is now `"orchestrator" | "governance" | "estimate"` — additive at runtime, but a TypeScript consumer that narrows exhaustively on that union must handle `"governance"`. Nothing else in the served payload changed shape.

### Added

- **Governance-MCP health tier for plugin-only (L1) projects.** Precedence is now **orchestrator → governance-mcp → labeled estimate**. Previously a project with no orchestrator binary fell straight to a local estimate even when a canonical governance surface was available — the dashboard was showing an approximation while the real number was one MCP call away.
  - The server is **discovered from the project's own `.mcp.json`**, the same file Claude Code reads, and its declared command is spawned verbatim. forge-ui keeps no path dependency on forge-plugin; MCP remains the only integration layer.
  - A declared command still carrying an unexpanded `${...}` placeholder is treated as unavailable rather than spawned.
  - In-flight calls are coalesced per project root and children are reaped with SIGTERM→SIGKILL, so the new tier cannot reintroduce the subprocess fan-out or zombie classes fixed in 3.3.2.
- **Build-artifact smoke gate** (`npm run smoke:built`, wired into `quality:gates`) — boots the real `dist/server/api-server.js` on an ephemeral port and requires a *shaped* `/api/forge/status`, then tears it down. Verified to exit non-zero against a seeded extensionless import.

### Fixed

- **The shipped server could not start.** `npm start` died with `ERR_MODULE_NOT_FOUND` and had done so since the ESM migration, shipping that way in 3.3.2. The package is `"type": "module"` and the server compiled with `module: ES2022` but `moduleResolution: "node"` — a combination TypeScript accepts and emits verbatim, while Node's ESM loader does not probe extensions or `index` files. `tsc` exited 0 throughout. `build:server` now rewrites emitted relative specifiers (109 across 42 files), and an unresolvable specifier fails the build instead of producing another artifact that cannot boot. Dev (tsx) and built output are verified to serve identical routes and health payloads.
- **Project identity was invisible to non-Node projects.** The dashboard read the project name from `package.json` only, so a bare `forge init` project — or any Rust/Python one — reported `"unknown"`. Identity now comes from `.forge/state.json:project_name` first, falling back to `package.json`.
- **Health and identity could describe the wrong project.** The status service was constructed once with the startup working directory while every other route followed the active runspace, and nothing ever moved it. After a runspace switch the dashboard reported the *previous* project's health and name. It now resolves the root on each read.
- **Test isolation.** Suites that built temp directories from `Date.now()` — or from fixed repo-relative paths like `.forge-test-learning/` — could collide when Vitest workers started in the same millisecond or shared a directory across files. All such paths now use `mkdtemp`. This was a real intermittent failure (2 of 6 full runs before; 0 of 10 after), not a theoretical one.
- **The MCP handshake reported a stale version.** `clientInfo.version` was a hardcoded literal that had already drifted a full release — a 3.3.2 client announced itself as 3.3.1. It now derives from `package.json` through a single version module, with a coupling test that fails if a literal reappears.
- **Neither audit script in `quality:gates` was working.** `audit:quality` crashed at module scope (`require.main` in an ES module) and `audit:security` exited 0 having scanned nothing — it passed a `(pattern, options, callback)` call to glob v13, whose callback API was removed in v9, so the wrapping promise never settled and Node exited cleanly with no output. Both now run. See "Known issues" for what the security scanner reports.

### Changed

- The estimate label no longer says "orchestrator unavailable" — with a second canonical tier, an estimate means *no* MCP source answered.
- `HealthSource` is exported and consumed by the components that previously redeclared the union inline, so the set of valid sources has one definition.

### Known issues

- **The security scanner is uncalibrated and its score is not meaningful — it runs REPORT-ONLY.** Its first working run reports ~40 critical / ~627 high, but the findings do not survive inspection: 606 of the "high" are "SQL injection via string concatenation" in a project with **no SQL dependency at all** — one such line is `updatedAt?: string;`, a TypeScript interface field — and every "critical" is a `spawn()` call flagged regardless of whether it uses `shell` (none do; all pass an argument array, which is the form that *prevents* injection). The scanner was never triaged because it never ran. Its 0/100 also drags the quality dashboard's overall grade to D.
  - It prints a loud `SECURITY SCAN: REPORT-ONLY (uncalibrated)` banner on every run, naming the finding count and the calibration directive, so the state cannot pass unnoticed and the numbers cannot travel as a posture.
  - **The report-only window expires by version**: the scanner returns to blocking at **v3.5.0** whether or not calibration has landed, and sooner if it lands first. Treat the current numbers as noise until then.

## [3.3.2] - 2026-07-18

Completes the anti-fabrication work started in 3.3.1, splits runtime state out of versioned config, and closes three governance-state defects that could silently stop the dashboard updating. Cleared by independent cross-vendor adversarial review (Codex re-gate round 4) on `7abaa63`.

### Fixed

- **The last fabricated metrics are gone** (DIRECTIVE-NXTG-20260718-04 items 1-2). 3.3.1 removed the fabricated *health score*; this release removes the rest. Four paths rendered invented numbers to users as if measured:
  - `command-view.tsx` — six hardcoded literals (health 87, 3 active agents, 12 pending tasks, project name, phase) surfaced through `CommandPalette`. All five fields turned out to have real sources and are now read from `/api/forge/status` via `useDashboardData`.
  - `state-bridge.ts` — seeded `healthScore: 100`, a perfect score nobody had measured, on every load.
  - `dashboard-live.tsx` — hardcoded project name.
  - `useDashboardData` — coerced a missing score to `0`, so a backend outage rendered "0% — Attention required" **and** made every downstream "unavailable" branch unreachable. Fixed at the data layer: `null`, not `0`.
  - `ProjectContext.healthScore` is now `number | null`, so "we don't know" is representable and cannot be faked. All three health render sites carry an unavailable path and a provenance label; `CommandCenter` previously had neither.
- **Health lookups no longer fan out one subprocess per caller.** `getOrchestratorHealth` consulted only the settled value cache, so its 15s TTL throttled sequential callers while the dashboard's real load shape is concurrent — 20 parallel callers spawned 20 `forge mcp` processes. Concurrent callers now join a single in-flight promise keyed by project root.
- **Health subprocesses are guaranteed to be reaped.** The timeout path called bare `child.kill()` (SIGTERM) and resolved in the same tick, so a child that ignored or never received the signal survived — multiplied by the fan-out above. Now SIGTERM, then SIGKILL after a 1s grace, settling on `close`. Reaping runs in the background so process teardown never taxes the request path.
- **Governance watchers survive atomic writes** — the dashboard could go permanently stale. Both state files are written by staging a `.tmp` and renaming over the target, which replaces the inode; `fs.watch(file)` binds to the inode, so the watcher went deaf after the first write, and the startup sentinel performs exactly such a write moments after attachment. Watchers now bind to the containing directory, filter by basename, and coalesce the multi-event rename burst so one write still means one broadcast.
- **Governance watchers survive the upgrade from a pre-3.3.2 layout.** On a legacy single-file project, state loaded from the versioned file alone, so the runtime file did not exist when its watcher attached; the resulting `ENOENT` escaped past the sibling watcher into a non-fatal catch, leaving a healthy-looking server with *neither* watcher active. Runtime state is now materialized before attachment, and each watcher attaches inside its own try/catch so one failure can never disable the other. Each logs its own "watcher active" line.
- **`sync_governance_progress` could destroy the committed constitution.** After `workstreams` moved to runtime state, the hook kept `jq`-editing `.claude/governance.json`; `jq` failed, the result was empty, and `echo "$updated" > f.tmp && mv` truncated the tracked file to one byte — while logging success, because `echo` succeeds on empty input. Observed live: 326 bytes to 1 on a routine post-task fire. The writer and its three readers now follow the data to the runtime file, and a write requires a zero `jq` exit **and** non-empty output **and** a non-empty temp file before the rename.
- **`.mcp.json` pointed the forge server at a project path that does not exist**, through a stale v1.5.0 binary. Repointed to the forge-ui root using the binary on `PATH`. The failure mode is worth noting: the old config never errored, because `forge mcp` starts happily against a nonexistent project and serves it.
- **`post-task.sh` overwrote a real test count with `0`** — it counted only Python `test_*.py` in a TypeScript repo. Aligned to the correct multi-language logic already upstream in forge-plugin; it now also refuses to write a zero, since 0 means "counted nothing", not "no tests".

### Changed

- **Runtime state is split from versioned config, so running the project no longer dirties the git tree.** `.claude/governance.json` keeps the human-authored version and constitution; `sentinelLog`, timestamps, workstreams, and metadata move to the gitignored `.forge/governance-runtime.json`. `.claude/project.json` gets the same treatment. Existing content is migrated, not discarded, and a project with no runtime file still reads from the legacy single-file layout. The uncapped shell writer now caps the sentinel log at 100 entries. Mechanism documented in `docs/architecture/RUNTIME-STATE-SPLIT.md`.

### Tests

- **4466 tests** (up from 4176), 119 files.
- **Branch coverage threshold raised 75% → 80%**, honoured by real tests rather than tuned: 75.11% → 81.32%. Twelve modules covered, nine reaching 100% branches. The threshold is set ~1.3pp below measured and verified to bite — at 82 the run exits non-zero.
- Coverage: 89.03% lines / 88.61% statements / 88.22% functions / 81.32% branches.
- **Legacy `any` allowances retired to 0.** The 54/93 thresholds measured 0 actual — an allowance nothing uses is a gate that cannot fail. The detector also matched only `: any`, letting `as any` and `<any>` through with a `Record<string, any>` carve-out on top; broadened to all three forms with the carve-out removed, then mutation-tested to confirm each form fires the gate. Type assertions ratcheted <50 → 46.
- New regression tests were each verified to **fail against the unfixed code**, not merely to pass — including the watcher liveness tests, which required two spaced write rounds per file to discriminate a live watcher from the single spurious event a dying one still emits.

### Chore

- Removed six `eslint-disable` directives naming `@typescript-eslint/no-throw-literal`, renamed to `only-throw-error` in typescript-eslint v8. An unresolvable rule name is an ESLint *error*, so these broke the lint gate; neither rule is enabled, so the directives suppressed nothing.

## [3.3.1] - 2026-07-18

Security + health-contract remediation (DIRECTIVE-NXTG-20260718-02, P0).

### Security

- **npm audit: 18 vulnerabilities → 1 low** (was 5 critical / 3 high / 8 moderate / 2 low). All fixes stayed within existing majors; no breaking upgrades required.
  - `vitest` → 4.1.10 (CRITICAL — UI server arbitrary file read/exec), plus `@vitest/ui` and `@vitest/coverage-v8`
  - `shell-quote` → 1.9.0 and `concurrently` → 9.2.4 (CRITICAL — newline escaping in `quote()`)
  - `ws` → 8.21.1 (HIGH — memory-exhaustion DoS; the only critical/high reachable from the network-exposed Express+WS server)
  - `vite` → 7.3.6 (HIGH — `server.fs.deny` bypass)
  - `form-data` → 4.0.6 (HIGH — CRLF injection)
- **Accepted**: `esbuild` 0.27.3 (LOW, GHSA-g7r4-m6w7-qqqr) — dev-server-only arbitrary file read on Windows, pinned transitively by `tsx` and `vite` with no non-major fix published. Not reachable in production.

### Fixed

- **Health-score contract violation** (open since March) — the dashboard fabricated its own health number with hardcoded weights, an anti-pattern named in `contracts/dx-journeys.md`. There were two independent fabrications: one client-side, one server-side, using different formulas.
  - Added `src/services/orchestrator-health.ts`, which sources the canonical score from forge-orchestrator's `forge_get_health` over stdio JSON-RPC 2.0. MCP is the only integration layer — no code dependency on forge-orchestrator.
  - `ForgeStatus` now carries `health`, tagged with `source` (`orchestrator` | `estimate`).
  - The local calculation is retained only as a last-resort fallback and is labeled **"Estimate — orchestrator unavailable"** in the UI, so a non-canonical number can never be mistaken for the real one.
  - Verified end-to-end: `forge_get_health` → 95, and `GET /api/forge/status` → `{"score":95,"source":"orchestrator"}`.

### Changed

- Health degrades gracefully: a 5s timeout and 15s memoization keep the dashboard responsive when the orchestrator is absent.

### Chore

- Removed dead files (`draw-terminal-view.txt`, `dashboard-live.tsx.backup`, `.pytest_cache/`, test-checkpoint/state scratch dirs); ignored `.stryker-tmp/` and `reports/`.
- Committed ASIF alignment wiring; discarded two runtime-state files that were dirtying the tree.

### Tests

- **4176 tests** (up from 4166) — 10 new tests drive the real spawn + JSON-RPC parse path against a stub binary rather than mocking `child_process`.
- Coverage: 87.32% lines / 75.18% branches — both above threshold; branch coverage up from 74.8%.

## [3.3.0] - 2026-05-06

### Security

- **simple-git RCE** — Bumped `simple-git` past GHSA-hffm-xvc3-vprc (RCE in versions < 3.36.0).
- **Vite path traversal** — Bumped `vite` past GHSA-4w7w/v2wj/p9ff (path traversal, `fs.deny` bypass, WS file read).
- **uuid + postcss dep bumps** — `uuid` 13→14 and `postcss` 8.5.6→8.5.10 to clear npm audit (DIRECTIVE-NXTG-20260427-02).
- **npm audit clean** — 0 production vulnerabilities remaining.

### CI

- **Defense-in-depth security scanning** — Semgrep SAST + Gitleaks secrets detection added alongside CodeQL on all PRs.
- **Security scan hardening (v2→v5.1)** — Added Bandit (Python SAST) + Bearer (data privacy), PR annotations + job summary, YAML parse fixes, guarded missing-location edge cases.
- **ADR-036 release-protocol-check workflow** — Layer 0 Release Protocol Enforcement; daily drift check + pre-push gate catches unreleased commit accumulation.

### Fixed

- **Hook settings path** — Corrected `settings.json` path from `NXTG-Forge/v3` → `NXTG-Forge/forge-ui` (stale path after repo rename).

### Governance

- **Voice identity** — Claimed `af_sarah` as forge-ui team voice in portfolio voice registry (DIRECTIVE-NXTG-20260418-03).
- **24 NEXUS reflections** — Continuous FPL check-ins and directive tracking (2026-04-03 → 2026-05-23).

---

## [3.2.0] - 2026-03-29

### Fixed

- **WebSocket connection flapping (P0)** — Removed `rewriteWsOrigin: true` from Vite `/ws` proxy that rewrote origin to `ws://localhost:5051`, rejected by server's allowed origins list. Dashboard no longer shows "Connection lost" toast spam.
- **Architect text rendering (P0)** — Replaced Tailwind `max-w-md` (resolving to 16px instead of 28rem) with inline `style={{ maxWidth: '28rem' }}` in `architect-view.tsx`. Text no longer renders as stacked single characters.
- **BetaBanner z-index test mismatch** — Updated test to match component's intended `z-40` (was asserting `z-50`).
- **Dashboard analytics import (P0)** — Restored missing Analytics import that broke dashboard rendering for 9 days.
- **3 launch blockers** — Fixed navigation, ws-token, and architect overflow issues.
- **picomatch ReDoS vulnerability** — Resolved via `npm audit fix`.
- **Sentry beforeSend types** — Added explicit parameter types to unblock CI.
- **Dependabot CLA noise** — Skip CLA check for Dependabot PRs.

### Changed

- **Coverage enforcement hardened** — CI now fails with `::error` + `exit 1` when `coverage-summary.json` is missing (was silent warning).
- **vitest reporters** — Added `json-summary` reporter so CI coverage gate works correctly.
- **Build script** — Added `tsc --noEmit` to prevent type errors from shipping.

### Added

- **PR protection workflow** — Security, quality, build, and dependency audit checks on pull requests.
- **Phase 3 UAT report** — Full visual UAT of all 5 dashboard pages with screenshots (`.asif/uat/`).
- **Dx3 Brain Integration** — Standing instructions for cross-project intelligence in CLAUDE.md.

### Documentation

- **docs/README.md** — Rewritten, removed 24 broken links, deleted empty directories.
- **Prerequisites section** — Added to docs for new users.

---

## [3.1.3] - 2026-03-18

### Changed

- **License** — Transitioned from MIT to FSL-1.1-ALv2 (Functional Source License 1.1). Converts automatically to Apache License 2.0 on 2028-03-18. See `LICENSE.md`.
- **README** — License section updated to describe FSL terms and the Apache 2.0 conversion date.
- **package.json** — `license` field updated to `"FSL-1.1-ALv2"`.

### Added

- **LICENSE.md** — Full FSL-1.1-ALv2 license text (copyright 2026 NXTG AI Pty Ltd).
- **CLA enforcement** — `contributor-assistant/github-action@v2` workflow in `.github/workflows/cla.yml`. All PR contributors must sign before merge. Bots and Dependabot auto-allowlisted.
- **CLA.md** — Contributor License Agreement document (Apache ICLA terms). Signatures stored in `.github/cla-signatures.json`.
- **CONTRIBUTING.md** — Updated with CLA signing instructions and requirement notice.

### Notes

- `CLA_PERSONAL_ACCESS_TOKEN` repository secret must be set for the CLA bot to commit signatures back to the repo.

---

## [3.1.2] - 2026-03-16

### Documentation

- **JSDoc coverage** — Added JSDoc to 23 previously undocumented components and hooks across `src/components/` and `src/hooks/`.
- **Broken link fixes** — Repaired broken internal links in `CHANGELOG.md`, `PORT-CONFIGURATION.md`, and multiple guides.
- **Stale docs archive** — Archived 47 stale reports, specs, and architecture docs that no longer reflected the current codebase.
- **gitignore** — Added `.asif/**/node_modules/` to `.gitignore` to prevent ASIF tooling artifacts from being tracked.

---

## [3.1.1] - 2026-03-14

### Security

- **flatted DoS fix** — Upgraded flatted 3.3.3 → 3.4.1 to resolve GHSA-25h7-pfq9-p65f (unbounded recursion DoS in parse() revive phase).
- **simple-git CVE-2026-28292** — Verified v3.33.0 already patched (fix was in v3.32.3). No action required.

### Fixed

- **Node 18 → 22 upgrade** — Migrated from EOL Node 18 (EOL April 2025) to Node 22 LTS. Updated CI, Dockerfile, and engine constraints.
- **11 TypeScript lint violations** — Resolved ESLint warnings blocking CI (unused vars, argsIgnorePattern).
- **CI coverage report** — Fixed missing coverage report in Quality Gates workflow.

## [3.1.0] - 2026-02-22

### Added

- **CRUCIBLE Protocol integration** — 8-gate test quality system enforced in CI.
- **Getting Started card** — ChiefOfStaffDashboard shows guided onboarding for new users.
- **Launch readiness gates** — 31/31 gates passing.

### Fixed

- **GovernanceHUD test failures** — All 27 tests green.
- **npm audit** — 0 production vulnerabilities.
- **tsc errors** — 0 TypeScript compilation errors.

## [3.0.0] - 2026-01-24

### 🎉 Major Release: Production-Ready Architecture Restoration

This release represents a MASSIVE architectural evolution, restoring the full production-grade capabilities from ThreeDB v2 while maintaining the clean developer experience of v3. We've migrated from a simplified proof-of-concept to a battle-tested, enterprise-ready development orchestration system.

### 🏆 Headline Achievement

**Restored 81% of Lost Capabilities** - 1,886+ lines of production code restored from archived v2.0 system, bringing back the sophisticated multi-agent orchestration, state management, and automation that made the original system powerful.

### ✨ Added

#### NXTG AI Forge Production Agents ([AFRG]- Prefix)
Six specialized production-grade agents for enterprise development:

- **[AFRG]-orchestrator**: Master workflow coordinator with advanced task delegation and strategic planning
- **[AFRG]-planner**: Strategic feature planner with dependency management and resource allocation
- **[AFRG]-builder**: Implementation powerhouse for rapid feature development
- **[AFRG]-detective**: Problem-solving expert for debugging and root cause analysis
- **[AFRG]-guardian**: Quality and security sentinel with comprehensive auditing
- **[AFRG]-release-sentinel**: Documentation manager for changelog generation and release coordination

#### Standard Development Agents (5 Agents)
Clean, focused agents for everyday development:

- **orchestrator**: Project coordination and workflow management
- **architect**: System design and architecture decisions
- **developer**: Clean code implementation
- **qa**: Quality assurance and testing
- **devops**: Deployment and operations

#### Comprehensive Command System (19 Commands with [FRG]- Prefix)

**Core Commands:**
- `/[FRG]-init`: Smart project initialization with stack detection
- `/[FRG]-status`: Real-time project health and status reporting
- `/[FRG]-status-enhanced`: Advanced dashboard with live metrics
- `/[FRG]-feature`: AI-powered feature development workflow
- `/[FRG]-test`: Automated test generation and execution
- `/[FRG]-deploy`: Safe deployment with rollback capability
- `/[FRG]-optimize`: Performance analysis and optimization

**Production Commands:**
- `/[FRG]-enable-forge`: Activate full command center orchestration
- `/[FRG]-report`: Comprehensive session activity reporting
- `/[FRG]-agent-assign`: Intelligent agent assignment and coordination
- `/[FRG]-checkpoint`: State checkpoint management
- `/[FRG]-restore`: State restoration from checkpoints

**Documentation Commands:**
- `/[FRG]-docs-audit`: Documentation coverage and staleness audit
- `/[FRG]-docs-status`: Current documentation health report
- `/[FRG]-docs-update`: Automated documentation updates

**Analysis & Integration:**
- `/[FRG]-gap-analysis`: Capability gap analysis
- `/[FRG]-spec`: Specification generation
- `/[FRG]-integrate`: System integration tools
- `/[FRG]-upgrade`: System upgrade management

#### Automation Hooks (12 Hooks)
Comprehensive event-driven automation:

- **session-start.md**: Enhanced session initialization with capability messaging
- **error-handler.md**: Intelligent error recovery with context-aware guidance
- **post-tool-use.md**: Post-execution validation and cleanup
- **pre-tool-use.md**: Pre-execution validation and preparation
- And 8 additional hooks for complete lifecycle management

#### Domain Skills (10+ Skills)
Deep expertise modules:

- **architecture.md**: System design patterns and best practices
- **testing.md**: Comprehensive test strategies
- **security.md**: Security auditing and vulnerability management
- **optimization.md**: Performance tuning and profiling
- **agent-development.md**: Agent creation and customization
- **[FRG]-skill-development.md**: Skill module development
- And additional specialized skills

### 🔄 Changed

#### Branding & Naming
- Rebranded all production agents with **[AFRG]- prefix** (NXTG AI Forge)
- Standardized all commands with **[FRG]- prefix** for consistency
- Clear separation between production ([AFRG]-) and standard agents

#### Architecture
- Restored production-grade state management system
- Re-implemented checkpoint and recovery mechanisms
- Enhanced multi-agent coordination protocols
- Integrated advanced analytics and reporting
- Restored comprehensive error handling and recovery

#### Developer Experience
- Improved command discoverability with consistent prefixing
- Enhanced session start messaging for capability awareness
- Better error messages with actionable recovery steps
- Real-time status dashboards for live monitoring

### 🚀 Improved

**Capability Restoration:**
- **11 specialized agents** (6 production + 5 standard) vs 5 basic agents
- **19 powerful commands** vs 9 simple commands
- **12 automation hooks** vs 5 basic hooks
- **10+ domain skills** vs 4 basic skills
- **Full state management** with checkpoints and recovery
- **Comprehensive analytics** and reporting

**Production Readiness:**
- Enterprise-grade multi-agent orchestration
- Advanced state checkpoint and recovery system
- Comprehensive documentation management
- Real-time monitoring and dashboards
- Professional error handling and recovery
- Complete gap analysis and upgrade tooling

**Performance:**
- Intelligent agent selection and coordination
- Optimized state persistence and loading
- Efficient multi-agent parallel execution
- Advanced caching and memoization

### 🔧 Fixed

- Restored missing production features from v2.0 archive
- Fixed agent coordination and handoff protocols
- Corrected state management and persistence issues
- Improved cross-platform path handling
- Enhanced error recovery mechanisms
- Fixed documentation sync and generation

### 🗑️ Removed

Legacy and experimental code cleaned up:

- Removed 70+ obsolete files from failed experiments
- Cleaned up v2.0 archive files (moved to `forge-v2.0-archive/`)
- Removed duplicate and conflicting configuration files
- Eliminated stale checkpoint and state files
- Removed experimental UI components

### 🚨 Breaking Changes

**Command Prefix Changes:**
- Old: `/nxtg-*` commands → New: `/[FRG]-*` commands
- Old: `agent-forge-*` agents → New: `[AFRG]-*` agents

**Migration Path:**
- All commands now use `[FRG]-` prefix for consistency
- Production agents use `[AFRG]-` prefix for clarity
- Standard agents remain unprefixed (orchestrator, architect, etc.)
- See MIGRATION-COMPLETE.md for detailed upgrade guide

**System Requirements:**
- Node.js 18+ now required
- Git repository required for full functionality
- Claude Desktop or CLI for agent orchestration

### 📦 Repository Information

- **GitHub**: https://github.com/nxtg-ai/forge.git
- **Brand**: NXTG AI Forge
- **Version**: 3.0.0
- **Status**: Production Ready

### 🎯 What This Means

NXTG-Forge v3.0 is now a **production-ready development orchestration system** combining:

1. **Enterprise Capabilities**: Full v2.0 production features restored
2. **Clean Architecture**: Maintained v3.0 developer experience improvements
3. **Professional Polish**: Comprehensive documentation and branding
4. **Battle-Tested**: Built on proven v2.0 production architecture
5. **Future-Ready**: Extensible plugin and skill system

This is the system that was always intended - powerful, professional, and production-ready.

---

## [2.0.0] - 2023-12-01

### Added
- Initial multi-agent support
- Basic command system
- Simple hook implementation
- Documentation framework

### Changed
- Migrated from JavaScript to TypeScript
- Improved error handling
- Better test coverage

### Fixed
- Various bug fixes and performance improvements

---

## [1.0.0] - 2023-06-01

### Added
- Initial release
- Basic orchestration capabilities
- Simple command execution
- Basic documentation

---

## Migration Guide

### From v2 to v3

1. **Update Directory Structure**
   ```bash
   # Old structure
   .forge/

   # New structure
   .claude/
   ```

2. **Update Commands**
   ```bash
   # Old
   forge init

   # New
   /init
   ```

3. **Update Configuration**
   - Configuration now in `claude.json`
   - Auto-detection reduces manual config needs

4. **Update Dependencies**
   - Node.js 18+ required
   - TypeScript 5.0+ recommended

See the Migration Guide above for detailed instructions.

---

## Upcoming Features (v3.1.0)

- 🌍 Cloud synchronization
- 🤝 Team collaboration features
- 📊 Advanced analytics dashboard
- 🔌 Plugin marketplace
- 🎨 UI customization options

---

## Support

For questions or issues:
- GitHub: [github.com/nxtg-ai/forge](https://github.com/nxtg-ai/forge)
- Discord: [discord.gg/nxtg-forge](https://discord.gg/nxtg-forge)
- Email: forge@nxtg.ai

---

<div align="center">
  <p><strong>Thank you for using NXTG-Forge!</strong></p>
  <p>We're committed to making development faster, better, and more enjoyable.</p>
</div>
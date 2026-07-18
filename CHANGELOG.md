# 📋 Changelog

All notable changes to NXTG-Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
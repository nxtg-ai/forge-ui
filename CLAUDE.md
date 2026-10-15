# NXTG-Forge v3 - Claude Code Knowledge Base

## CRITICAL: Read Before Responding

### Infinity Terminal Architecture

**The Infinity Terminal has BUILT-IN session persistence. Zellij is NOT required.**

```
Architecture:
Browser (xterm.js) → WebSocket → PTY Bridge (api-server.ts) → Shell
                          ↓
               Session persistence via:
               - useSessionPersistence.ts hook
               - PTY Bridge session management
               - Session ID tracking + auto-reconnect
```

**Key facts:**
- Sessions survive browser close/reopen
- Sessions survive network disconnects
- Multiple clients can connect to same session
- This is the "Infinity" in Infinity Terminal
- Zellij is OPTIONAL local terminal enhancement, not a dependency

### Multi-Device Access (WSL2)

The UI uses **Vite's proxy** for multi-device access:

```
Remote Device → http://<your-lan-ip>:5050/api/* → Vite Proxy → localhost:5051
```

**Critical configuration:**
- `.env` must NOT hardcode `VITE_API_URL` or `VITE_WS_URL`
- Client code uses relative URLs (`/api/...`) in dev mode
- Vite proxies `/api`, `/ws`, `/terminal` to `localhost:5051`
- Windows firewall rule required: `New-NetFirewallRule -DisplayName 'NXTG Forge' -Direction Inbound -LocalPort 5050,5051,8003 -Protocol TCP -Action Allow`

### Port Assignments

| Port | Service | Binding |
|------|---------|---------|
| 5050 | Vite UI Dev Server | 0.0.0.0 |
| 5051 | API Server + WebSocket | 0.0.0.0 |
| 8003 | Reserved | 0.0.0.0 |

### Core Principles

1. **Dog-Food or Die** - Use Claude Code's native capabilities, not TypeScript meta-services
2. **Agent Teams First** - For multi-file features, reviews, and debugging: spawn agent teams with specialized teammates, not sequential subagents. Teams talk to each other, challenge findings, and self-coordinate
3. **Parallel Agents** - Launch up to 20 agents in parallel with multiple Task calls in ONE message
4. **Real Logs, No Mocking** - QA sees real web logs, no simulated data
5. **Everything to Memory** - Store all user feedback/corrections persistently

### Agent Teams (Always Active)

Agent Teams are enabled with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your Claude Code settings (for example `.claude/settings.local.json`). This is a super-human capability — use it aggressively.

**When to spawn a team (default for non-trivial work):**
- Features touching 3+ files → builder + tester + reviewer teammates
- Code reviews → security + performance + coverage teammates in parallel
- Debugging unclear issues → competing hypothesis teammates that debate each other
- `/forge:gap-analysis` → 4 teammates analyzing test/doc/security/architecture gaps simultaneously

**Team patterns for NXTG-Forge:**
| Command | Team Structure |
|---------|---------------|
| `/forge:feature` | Lead plans → builder implements → tester writes tests → security reviews |
| `/forge:gap-analysis` | 4 teammates: test gaps, doc gaps, security gaps, arch gaps |
| Health Check | 3 teammates run vitest, tsc, npm audit simultaneously |
| Code review | 3 reviewers: security lens, performance lens, test coverage lens |

**Rules for teammates:**
- Each teammate owns **separate files** — never two teammates editing the same file
- Use **delegate mode** (Shift+Tab) when the lead should only coordinate, not code
- Use **plan approval** for risky changes — teammate plans, lead approves before implementation
- CLAUDE.md is automatically loaded by all teammates — project context is shared

### Before Making Claims About This Codebase

1. **READ THE CODE** - Don't assume. Check `src/` for actual implementation
2. **CHECK EXISTING DOCS** - `docs/infinity-terminal/README.md`, `.claude/` files
3. **VERIFY RUNNING SERVICES** - `ss -tlnp | grep 505` to see what's actually running
4. **TEST BEFORE CLAIMING** - Don't say "X doesn't work" without testing

### Common Mistakes to Avoid

- ❌ Claiming Zellij is required for session persistence
- ❌ Suggesting hardcoded localhost URLs for multi-device
- ❌ Building TypeScript services when agents should do the work
- ❌ Asking permission after decisions are made
- ❌ Making claims about features without reading the implementation

## CRUCIBLE Protocol (Test Quality — Mandatory)

CRUCIBLE = Code Review Under Conditions Inducing Bug Latency Exposure. This project must pass all 8 gates before any release.

### The 8 Gates

| Gate | Name | Threshold | Current Status |
|------|------|-----------|----------------|
| 1 | xfail governance | 0 unexplained skips | 1 skip (`AgentWorker.test.ts:377`) |
| 2 | Hollow assertions | < 10% | 7.35% (612/8,322) — CLEAN |
| 3 | Mock drift | Justified mocks only | 1,037 mocks — flag heavy internal mocking |
| 4 | Delta gate | Count never decreases | 4,146 baseline — maintain or grow |
| 5 | Silent exceptions | No swallowed errors | 252 found — remediate in bootstrap.ts |
| 6 | Mutation testing | ≥ 40% score | 36.27% on useForgeIntegration — FAIL |
| 7 | Spec-test trace | New tests cite NEXUS ID | N/A for existing; required for new tests |
| 8 | Coverage integrity | Lines/Funcs/Stmts ≥ 80%, Branches ≥ 75% | 86.8%/87.1%/87.3%/74.8% |

### Key Rules
- **Do NOT delete tests** — fix or flag them. Test count is a ratchet.
- **Hollow assertions** (`toBeDefined`, `toBeTruthy`) count against Gate 2. Use specific matchers.
- **Every mock must be justified** — external API/filesystem = fine; mocking your own service = suspicious.
- **Silent catch blocks** = P1 violation. Always log or rethrow.
- **New integration tests** must cite a NEXUS initiative ID in a comment.
- **Mutation score target**: 40% minimum per module. Run: `npx stryker run /tmp/stryker.config.json`

---

## Release

Release steps for a user-facing change:
1. **CHANGELOG**: roll `[Unreleased]` → `[vX.Y.Z] — YYYY-MM-DD` in CHANGELOG.md
2. **Version**: bump `package.json`
3. **Tag**: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. **GH Release**: `gh release create vX.Y.Z --notes-from-tag`
5. **Docs**: update any pinned version references in README.md / docs

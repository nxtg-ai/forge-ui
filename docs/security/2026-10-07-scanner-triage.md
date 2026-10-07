# Security scanner triage — 2026-10-07

DIRECTIVE-NXTG-20261007-08. This is a triage only; nothing here fixes a finding.

Scanner: `src/test/reports/security-audit.ts`, run on `main` @ `8fec4fe`, v3.4.0. It reports **728 findings** (40 critical, 627 high, 61 medium) across 267 files.

## What actually blocks a tag

The scanner runs report-only until `SECURITY_SCAN_BLOCKING_FROM = "3.5.0"` or until calibration lands. Once blocking, it fails **only when `critical > 0`**. So **40 findings gate the v3.5.0 tag; the other 688 gate nothing.** All 40 are the "Command Injection" rule, and **none of them is a command injection**.

## Classification

| Category (severity) | Total | Real (prod path) | Dev/test only | False positive | Duplicate |
|---|---:|---:|---:|---:|---:|
| SQL Injection (high) | 607 | 0 | 3 | 604 | 0 |
| Input Validation (medium) | 57 | 0 | 2 | 55 | 0 |
| Command Injection (critical) | 40 | 3 | 1 | 36 | 0 |
| Access Control (high) | 16 | 13 | 0 | 3 | 0 |
| Weak Cryptography (medium) | 4 | 0 | 1 | 0 | 3 |
| Path Traversal (high) | 2 | 0 | 0 | 2 | 0 |
| XSS (high) | 2 | 0 | 2 | 0 | 0 |
| **Total** | **728** | **16** | **9** | **700** | **3** |

- "Dev/test only" means findings in `test/reports/*` and `server/__tests__/*.example.ts`.
- 7 of the 9 dev/test findings are the scanner matching its own source: comments, its own rule strings, and its own `["md5","sha1",…]` array. That array is also the only duplicate: one line counted four times.
- The 16 "real" rows are **3 distinct issues**, listed below.

## Why the false positives fire (rule defects)

- **SQL Injection (604 FP).** The pattern `/[`'"]SELECT|INSERT|UPDATE|DELETE.*\+.*[`'"]/i` has an ungrouped alternation, so any line containing `update`, `insert` or `delete` in any case matches; `updatedAt?: string;` is enough. The project has **no SQL dependency** (`package.json` has no pg/mysql/sqlite/ORM). **0 of the 607 flagged lines contain a SQL statement.**
- **Command Injection (36 FP).** Any `exec(`, `spawn(`, `execSync(` or `execFile(` is "critical" unless the same line contains "validate", "sanitize" or "escape". The 36:
  - 25 run **literal** command strings with no interpolation (e.g. `execSync("git status --short 2>&1")`).
  - 3 are not process calls at all: a method definition `async spawn()` and two `worker.spawn()` method calls.
  - 1 interpolates only a value already checked against a fixed allowlist (`which ${command}` behind `ALLOWED_CLI_COMMANDS`).
  - 7 are argument-array `spawn()` calls. An argument array is the form that *prevents* shell injection. These run a command the product executes by design: the terminal backend, the `.mcp.json`-declared MCP server, the orchestrator binary, and the internal command service.
- **Input Validation (55 FP).** This is file-level: it flags any file whose text matches `input|req\.|query|params|body` and doesn't import zod. There is no line number to assess. The 10 server-route hits are covered by the access-control issue below.
- **Access Control (3 FP).** `utils/api-fetch.ts`, `services/api-client.ts` and `api/diff-service.ts` are client-side; they match on the word "api" in the filename.
- **Path Traversal (2 FP).** Both are `path.join(__dirname, "../server/workers/worker-process")`, a constant path.

## All real findings, by severity

There are 3 real issues. This list is not padded to 10.

1. **HIGH: missing authentication on the API server (access-control class, server-side). Confirmed by a live probe on loopback.**
   - This covers the 13 server-route Access Control rows. The heuristic flagged them for the wrong reason (no "auth" in the file), but the conclusion is right: `/api/*` has no authentication layer.
   - The concrete impact is serious. Exploit details are in a private GitHub security advisory and are deliberately not in this public document. The fix is tracked separately.
2. **HIGH (conditional): `server/workers/worker-process.ts:65`.** A task's command is spawned with no allowlist, and the route that creates tasks has the same missing authentication as #1. It is reachable only when the detected backend is not Claude Code; on a Claude Code machine the worker pool is disabled, and a probe confirmed the route answers "Worker pool disabled". Details are in the same private advisory.
3. **LOW (hardening): `monitoring/diagnostics/tests.ts:461` and `monitoring/diagnostics/formatters.ts:74`.** Both interpolate `projectPath` into a shell string: `df -k "${projectPath}"`. `projectPath` comes from local config or `process.cwd()`, never from a request, so this is not remotely reachable. It should still move to an argument array.

## Recommendation: next tag = **v3.4.1**, not v3.5.0

- **v3.4.1 (patch)** keeps the scanner report-only and passes the release workflow's security step. It is the right shape for shipping the fix for real issue #1/#2 (a security fix is a patch).
- **v3.5.0 should wait for scanner calibration (DIRECTIVE-NXTG-20260718-17), not for code fixes.** The 40 blockers are rule defects, not vulnerabilities, so "fixing" them means fixing the scanner: group the SQL alternation, ignore `RegExp.exec` and method names, exempt literal commands and argument arrays, and exclude the scanner's own file. Tagging v3.5.0 before that fails the tag on false positives.
- Neither tag should ship before #1 has a fix or a documented mitigation.

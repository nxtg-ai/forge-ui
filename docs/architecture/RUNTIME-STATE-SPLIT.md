# Runtime State vs Versioned Config

**Status**: Implemented
**Directive**: DIRECTIVE-NXTG-20260718-04 item 3
**Related**: [PRODUCT-vs-RUNTIME-FILES.md](./PRODUCT-vs-RUNTIME-FILES.md)

## Problem

`.claude/governance.json` and `.claude/project.json` were tracked in git but
rewritten at runtime. Every api-server start and every Claude Code hook fire
mutated them, so `git status` was dirty after simply *running* the project.

Two writers, with asymmetric behavior, made it worse:

| Writer | Path | Behavior |
|---|---|---|
| `governance-state-manager.ts` | TS / api-server | Pruned `sentinelLog` to 100, but rewrote `timestamp` on **every** boot — guaranteed diff per run |
| `.claude/hooks/lib.sh` | shell / hooks | `jq`-appended with **no cap at all** — unbounded growth |

Separately, `.claude/hooks/post-task.sh` counted only Python `test_*.py` files
under a `tests/` directory. In this TypeScript repo that matched nothing and
wrote `0` over a real count — active corruption, not staleness.

## Decision

Split by **lifecycle**, not by file:

- **Versioned config** stays in `.claude/` — human-authored, committed,
  reviewed. For governance that is `version` + `constitution` (directive,
  vision, status, confidence).
- **Runtime state** moves to `.forge/` — already gitignored. That is
  `sentinelLog`, `timestamp`, `workstreams`, `metadata`, plus `last_session`
  and `quality` from `project.json`.

```
.claude/governance.json        → { version, constitution }          (tracked)
.forge/governance-runtime.json → { timestamp, workstreams,          (ignored)
                                   sentinelLog, metadata }
.claude/project.json           → agents, architecture, mcp_servers, (tracked)
                                 spec, development, project
.forge/project-runtime.json    → { last_session, quality }          (ignored)
```

## Mechanism

**Read** — `readState()` reads the versioned file and overlays the runtime
file: `{ ...versioned, ...runtime }`. Consumers see one merged object and are
unaware of the split.

**Write** — `writeState()` always writes the runtime half. It writes the
versioned half **only when its content actually changed**, so ordinary runtime
activity never dirties the tree. A genuine constitution edit still rewrites and
should be committed.

**Content comparison, not byte comparison.** The change check parses both sides
and compares canonically. A raw string compare treats a trailing newline (which
`jq` adds and `JSON.stringify` does not) as a change, which reintroduces the
exact per-boot rewrite this split removes.

**Canonical checksum.** `calculateChecksum` sorts keys before hashing. Plain
`JSON.stringify` is key-order sensitive, so a state reassembled from two files
hashed differently than the one written and failed integrity validation even
when no value had changed.

**Both files are watched.** The api-server watches the runtime file (where
sentinel appends now land) *and* the constitution (so a human edit reaches
clients without a restart). Watching only `.claude/governance.json` would
silently stop live dashboard updates.

**Shell writers mirror this.** `lib.sh` exports `GOVERNANCE_RUNTIME_FILE` and
`PROJECT_RUNTIME_FILE`, seeds them on first use, and caps `sentinelLog` at
`SENTINEL_LOG_MAX_ENTRIES` (default 100) — the cap the shell path never had.

## Migration

Backward compatible. When the runtime file is absent, `readState()` falls back
to whatever the versioned file still carries, so a project written under the
old single-file layout reads correctly; its first write moves the fields
across. Covered by the `still reads legacy single-file state written before the
split` test.

## Verification

DoD required the tree to stay clean across an api-server start/stop cycle.
Verified behaviorally, not by inspection:

```
BEFORE: sentinels=13, tracked-config-modified=0
health: {"status":"healthy", ...}
AFTER:  sentinels=14 (delta 1 proves the server wrote runtime state)
        tracked-config-modified=0
```

The sentinel delta matters: without it, a clean tree would be indistinguishable
from a server that never started and therefore never wrote. An earlier run of
this check produced a false PASS for exactly that reason — the server had
failed with `EADDRINUSE` and written nothing.

# NXTG-Forge Strategic Audit & Action Plan
**Date:** 2026-02-04
**Scope:** Licensing, Architecture, Governance, Documentation Hygiene, Deployment Strategy
**Status:** BLOCKING DECISIONS REQUIRED

---

## Table of Contents
1. [Tech Stack License Inventory](#1-tech-stack-license-inventory)
2. [Open-Source vs Monetization Framework](#2-open-source-vs-monetization-framework)
3. [Directory Architecture Audit (.claude vs .forge)](#3-directory-architecture-audit)
4. [Empty Directory Analysis](#4-empty-directory-analysis)
5. [Governance HUD Gap Analysis](#5-governance-hud-gap-analysis)
6. [Root Documentation Cleanup Plan](#6-root-documentation-cleanup-plan)
7. [Deployment Medium Decision (BLOCKING)](#7-deployment-medium-decision-blocking)
8. [Production Planning as nxtg-forge Feature](#8-production-planning-as-nxtg-forge-feature)
9. [Master Gap Tracker](#9-master-gap-tracker)

---

## 1. Tech Stack License Inventory

**VERDICT: 100% commercially safe. No copyleft. No restrictions.**

### Runtime Dependencies (35 packages)

| Package | Version | License | Risk |
|---------|---------|---------|------|
| react / react-dom | 19.2.3 | MIT | None |
| express | 4.22.1 | MIT | None |
| @react-three/fiber + drei | 9.5 / 10.7 | MIT | None |
| three | 0.182.0 | MIT | None |
| @xterm/xterm + addons | 6.0.0 | MIT | None |
| node-pty | 1.1.0 | MIT | None (native) |
| framer-motion | 12.31.0 | MIT | None |
| tailwindcss | 3.4.19 | MIT | None |
| lucide-react | 0.563.0 | ISC | None |
| ws | 8.19.0 | MIT | None |
| zod | 4.3.6 | MIT | None |
| winston | 3.19.0 | MIT | None |
| vite | 7.3.1 | MIT | None |
| typescript | 5.9.3 | Apache-2.0 | None |
| class-variance-authority | 0.7.1 | Apache-2.0 | None |
| simple-git | 3.30.0 | Apache-2.0 | None |

### License Distribution
- **MIT:** 52 packages (78.8%)
- **Apache-2.0:** 3 packages (4.5%) - compatible with MIT
- **ISC:** 3 packages (4.5%) - BSD-equivalent, permissive
- **GPL/AGPL:** 0 packages - **no copyleft anywhere**

### Native Module Warning
- `node-pty` requires C++ compilation (gcc/clang + Python 3.x + node-gyp)
- This affects distribution - cannot ship as pure JS bundle
- Impacts deployment medium decision (see Section 7)

---

## 2. Open-Source vs Monetization Framework

### Option A: Full MIT Open-Source
| Aspect | Assessment |
|--------|-----------|
| Community growth | Fastest adoption |
| Revenue | None from license; services/hosting only |
| Competition risk | Forks can compete directly |
| Contribution quality | Highest (no friction) |
| Brand trust | Maximum |

### Option B: Open-Core (Recommended for Evaluation)
| Aspect | Assessment |
|--------|-----------|
| Core (MIT) | CLI tool, agent framework, terminal, governance HUD |
| Pro (Commercial) | Cloud hosting, team features, enterprise SSO, SLA support |
| Revenue | Recurring from hosted service + enterprise licenses |
| Competition risk | Core forkable, value-add protectable |
| Community balance | Good - core is fully open |

### Option C: Source-Available (BSL/SSPL)
| Aspect | Assessment |
|--------|-----------|
| Visibility | Full source visible, limited commercial use |
| Revenue | License fees for commercial deployment |
| Community | Lower contribution (license friction) |
| Precedent | HashiCorp, Elastic, MongoDB |
| Risk | Community backlash |

### Option D: Dual License (GPL + Commercial)
| Aspect | Assessment |
|--------|-----------|
| Open track | GPL - copyleft, must share modifications |
| Commercial track | Paid license for proprietary use |
| Revenue | Enterprise licenses |
| Risk | GPL scares some contributors |
| Precedent | Qt, MySQL (pre-Oracle) |

### Recommendation Matrix

| Factor | MIT | Open-Core | BSL/SSPL | Dual |
|--------|-----|-----------|----------|------|
| Community growth | +++++ | ++++ | ++ | +++ |
| Revenue potential | + | ++++ | ++++ | +++ |
| Fork protection | + | +++ | +++++ | ++++ |
| Contributor friendliness | +++++ | ++++ | ++ | +++ |
| Brand alignment ("fair") | +++++ | ++++ | ++ | +++ |
| Complexity to implement | +++++ | +++ | ++ | ++ |

**ACTION REQUIRED:** Schedule decision session. This blocks LICENSE file creation.

---

## 3. Directory Architecture Audit

### Current State: .claude/ vs .forge/ Separation

| Directory | Purpose | Committed? | Size |
|-----------|---------|-----------|------|
| `.claude/` | Project config, agents, commands, skills, state | Yes (git) | 1.6 MB |
| `.forge/` | Personal knowledge vault, brand assets, ops guides | No (gitignored) | 5.3 MB |
| `docs/` | Public documentation shipped with product | Yes (git) | 800 KB |
| Root `*.md` | Status reports, decision docs (38 files) | Yes (git) | ~300 KB |

### Separation of Duties

```
.claude/                          .forge/
├── commands/ (19 CLI cmds)       ├── Design-System/ (brand assets)
├── skills/ (12 skill files)      ├── ⚙️OPS/ (operational guides)
├── agents/ (agent assignments)   ├── Code-System/ (personal arch ref)
├── plans/ (feature plans)        ├── NXTG-FORGE-KNOWLEDGE/ (research)
├── governance/ (rules/config)    ├── CODEBASE-HYGIENE/ (personal notes)
├── state/ (machine state)        ├── CLAUDE-WSL-BASH/ (WSL reference)
├── templates/ (code gen)         └── checkpoints/ (personal snapshots)
├── prompts/ (5 standardized)
├── workflows/ (6 shell scripts)
└── config.json (master config)
```

### Duplication Found

| Item | .claude/ Location | .forge/ Location | Action |
|------|-------------------|------------------|--------|
| Architecture knowledge | `skills/architecture.md` | `Code-System/master-software-architect.md` | Keep both - different scope |
| Memory system | `memory/` + `forge/memory/` | N/A | **MERGE** - dual memory dirs |
| Agent definitions | `forge/agents/` (empty) | N/A | **DELETE** - unused nested dir |
| Brand assets | Missing | `Design-System/NXTG-BRAND-GUIDELINES/` | Gap - not in committed code |

### Nested .claude/forge/ Problem **[TOPIC-1: How do see the user journey begining from the download/install?]**

**[master-architect]** The user journey should be:
```
1. USER DISCOVERS: GitHub repo, Claude Code plugin marketplace, or word-of-mouth
2. USER INSTALLS: One command - `npx nxtg-forge init` OR Claude Code plugin install
3. FORGE SCAFFOLDS: Creates .claude/forge/ (the "harness") with:
   - config.yml (project settings)
   - agents/ (starter agents for their stack)
   - skills/ (relevant skill packs)
   - memory/ (context persistence layer)
4. USER ENGAGES: /frg-enable-forge presents the 4-option menu
5. VISION CAPTURE: User states their project vision → stored in CLAUDE.md + governance.json
6. CONTINUOUS: Governance HUD shows real-time state, agents auto-report
```

**[forge-planner]** Key insight: The harness (.claude/forge/) is the PRODUCT. The .forge/ folder is USER-PERSONAL (gitignored). This is the right separation:
- `.claude/forge/` = What nxtg-forge installs (committed, portable, shareable)
- `.forge/` = User's personal vault (not shared, not our concern)

There is a `.claude/forge/` subdirectory that duplicates the concept of `.forge/`: **[TOPIC-3: Not intended to be a duplicate - This folder should hold the foundational Claude Code Harness for Claude Code Enhancements (of if you know if a better way please share - although the use could potentially download forge agents, templates, skills, etc from the GitHub repo, there has been discussion around charging for skill-packs for common tech-stacks and builds -- thoughts?)]**

**[forge-planner]** AGREED - this is NOT duplication. This is the architecture:
```
~/.claude/                     # GLOBAL Claude Code config (user's machine)
project/.claude/               # PROJECT-SPECIFIC Claude Code config
project/.claude/forge/         # NXTG-FORGE HARNESS (our product, committed)
project/.forge/                # USER'S PERSONAL VAULT (gitignored, their stuff)
```

**[master-architect]** On skill-packs monetization: YES. The model is:
- **FREE TIER**: Core harness + basic agents + essential skills
- **PRO TIER**: Premium skill-packs (React 19, Next.js 15, FastAPI, etc.)
- **ENTERPRISE**: Custom skill-packs, private agent libraries, SSO

The skill-pack marketplace is a natural extension. Users download from GitHub releases OR a future `nxtg-forge marketplace` command.

- `.claude/forge/config.yml` - Forge integration config **[TOPIC-3: Initially i thought we created this for the auto-deployment]**

**[forge-builder]** CORRECT. This is the harness configuration. Should contain:
- Project type detection results
- Enabled agents/skills
- Governance rules
- Auto-deploy settings
- Memory sync configuration

- `.claude/forge/agents/` - Empty **[TOPIC-3: Initially i thought we created this for the auto-deployment - This folder used to hold all of our agents that could be copied to the .claude/agents folder]**

**[forge-builder]** This should be the TEMPLATE LIBRARY. On init:
1. Detect project type (React, Node, Python, etc.)
2. Copy relevant agents from .claude/forge/agents/ → .claude/agents/
3. User can then customize their local copies

The empty state is a BUG. We need to ship starter agents here.

- `.claude/forge/memory/` - Empty **[TOPIC-4: Where is our memory stored, pulled, retrieved, add to? is it the state.json or this folder? or is it claude.md? is it all of them? WE MUST DISCUSS IN DETAIL AND HARDEN OUR FRAMEWORK -- THERE IS CLAUDE CODE.. AND THEN AFTER INSTALLING NXTG-FORGE --> THERE IS CLAUDE CODE FORGE THE SUPER POWER]**

**[master-architect]** CRITICAL TOPIC. Here's the memory architecture we MUST implement:

```
MEMORY HIERARCHY (Claude Code → Claude Code Forge):

Layer 1: CLAUDE.md (Always in context)
├── Project instructions
├── Critical rules
└── Quick reference

Layer 2: .claude/state/ (Machine state)
├── current.json - Session state
├── backup.json - Recovery state
├── events.jsonl - Event log
└── context-graph.json - Entity relationships

Layer 3: .claude/forge/memory/ (Forge-enhanced memory)
├── decisions.md - Key decisions with rationale
├── learnings.md - Accumulated project knowledge
├── patterns.md - Discovered patterns/conventions
└── context-snapshots/ - Point-in-time context saves

Layer 4: governance.json (Strategic state)
├── Constitution (directive/vision)
├── Workstreams (active work)
└── Sentinel log (events/alerts)

Layer 5: localStorage (Browser-side, ContextWindowHUD)
└── forge-memory - Display-only (THIS IS THE BUG - should sync to Layer 3)
```

**[forge-builder]** The fix: ContextWindowHUD memory cards should:
1. READ from .claude/forge/memory/
2. WRITE back on save
3. SYNC to governance.json sentinelLog for visibility
4. Be INJECTABLE into Claude's context window (not just display)

- `.claude/forge/AUTO-SETUP.md` - Setup guide **[TOPIC-5: HOW ARE WE AUTODEPLOYING THE NXTG-FORGE HARNESS AI INFRASTRUCTURE - CONTROLS ETC?]**

**[forge-planner]** Auto-deployment flow:

```
/frg-init (or first-time plugin activation)
    │
    ├─→ Detect: Is this a new project or existing?
    │       ├─ NEW: Full scaffold
    │       └─ EXISTING: Backup existing .claude/, merge carefully
    │
    ├─→ Analyze: What kind of project?
    │       ├─ package.json → JS/TS project
    │       ├─ requirements.txt → Python project
    │       ├─ Cargo.toml → Rust project
    │       └─ etc.
    │
    ├─→ Deploy harness:
    │       ├─ .claude/forge/config.yml (generated for this project)
    │       ├─ .claude/forge/agents/ (stack-appropriate agents)
    │       ├─ .claude/forge/skills/ (relevant skill files)
    │       └─ .claude/forge/memory/ (empty, ready for use)
    │
    ├─→ Generate CLAUDE.md (or merge with existing)
    │
    ├─→ Initialize governance.json with:
    │       ├─ Empty constitution (user fills in vision)
    │       ├─ Default workstreams
    │       └─ Clean sentinel log
    │
    └─→ Present: "Forge initialized. Run /frg-enable-forge to begin."
```

**This creates confusion.** The `.claude/forge/` nested directory should either be the canonical forge config location (committed) or be removed if `.forge/` is the source of truth.

**[master-architect]** RESOLVED: They are NOT duplicates. They serve different purposes:
- `.claude/forge/` = THE PRODUCT (nxtg-forge harness, committed, shared)
- `.forge/` = USER'S PERSONAL STUFF (brand assets, private notes, gitignored)

---

## 4. Empty Directory Analysis

| Directory | Should Exist? | Action |
|-----------|--------------|--------|
| `docs/commands/` | Yes - but HOLD per user directive | Add .gitkeep, fill later |
| `docs/tutorials/` | Yes - but HOLD | Add .gitkeep, fill later |
| `docs/best-practices/` | Yes - but HOLD | Add .gitkeep, fill later |
| `docs/hooks/` | Yes - but HOLD | Add .gitkeep, fill later |
| `docs/agents/` | Yes - but content exists at `docs/AGENTS.md` | Move AGENTS.md into dir |
| `docs/skills/` | Yes - but HOLD | Add .gitkeep, fill later |
| `tests/unit/` | No - tests live in `src/test/` | **DELETE** |
| `data/` | Unclear - no runtime data usage found | **DELETE** or document purpose |
| `.forge/checkpoints/` | Yes - personal, gitignored | Leave as-is |
| `.claude/forge/agents/` | No - duplicates concept | **DELETE** |
| `.claude/forge/memory/` | No - duplicates `.claude/memory/` | **DELETE** |

**[TOPIC-6: THERE ARE TWO DISTICT TYPES OF DOCS THAT WE NEED TO ACCOUNT FOR AND ORGANIZE AND REINFORCE WITH OUR AGENTS, SKILLS AND HOOKS --> 1. The User's Project Documentation 2. nxtg-forge documentation (for power users) 3. claude code forge - enhanced context engineer, memory, project memory --> which should be determined to be enhanced, enriched and stored as SKILLS.md, right?]**

**[master-architect]** EXCELLENT observation. THREE distinct documentation domains:

```
DOCUMENTATION ARCHITECTURE:

1. USER'S PROJECT DOCS (Their codebase)
   Location: project/docs/, project/README.md, etc.
   Managed by: User + forge-docs agent when requested
   Purpose: Their API docs, guides, changelogs
   Forge role: ASSIST (don't pollute, help organize)

2. NXTG-FORGE PRODUCT DOCS (Power users)
   Location: nxtg-forge repo/docs/ (our GitHub)
   Managed by: Us (NXTG team)
   Purpose: How to use forge, agent reference, skill dev guide
   Ships with: The forge harness OR linked to GitHub

3. CLAUDE CODE FORGE ENHANCED CONTEXT (Project memory)
   Location: project/.claude/forge/memory/ + CLAUDE.md
   Managed by: Forge agents + user corrections
   Purpose: Accumulated project intelligence
   Format: YES, SKILLS.md pattern is correct!
```

**[forge-planner]** The skills pattern is the right model for #3. We should have:

```
.claude/forge/memory/
├── PROJECT-CONTEXT.md    # Auto-generated project understanding
├── DECISIONS.md          # Key decisions + rationale (skill-style)
├── PATTERNS.md           # Discovered conventions (skill-style)
├── LEARNINGS.md          # Accumulated knowledge (skill-style)
└── BLOCKERS.md           # Current blockers/risks
```

Each file follows the skill format: YAML frontmatter + structured markdown. This allows:
- Easy parsing by agents
- Human-readable
- Git-diffable
- Selective context injection

**[forge-builder]** The agents/hooks should:
- **forge-docs**: Manages USER docs (domain 1) - only when asked
- **forge-learning**: Accumulates PROJECT memory (domain 3) - proactive
- **release-sentinel**: Audits USER docs for staleness (domain 1)
- **PostToolUse hooks**: Update PROJECT memory after significant actions

---

## 5. Governance HUD Gap Analysis

### What Works (Score: 4/10 overall usefulness)

| Feature | Status | Notes |
|---------|--------|-------|
| UI rendering | Working | Beautiful 6-panel dashboard |
| Sentinel log display | Working | Shows events with color coding |
| Constitution card | Working | Shows directive/vision/status | **[TOPIC-7: How is this controlled, governed, automated by the nxtg-forge harness? this should be part of the Topic-6.3 Claude Code Forge documentation, right?]**
| Impact matrix | Working | Shows workstreams + progress |
| Worker pool metrics | Working | Shows utilization/queue | **[TOPIC-8: How is this being used? what is it used for? when user clicks on the UI, what happens? How does the user know, see what is happening? UI/UX/DX]**
| State persistence | Working | JSON file + backups + checksums | **[TOPIC-4: HERE?]**
| API endpoints | Working | 10 endpoints operational |

**[master-architect]** TOPIC-7 Response: Constitution Governance Flow

```
CONSTITUTION CONTROL FLOW:

1. INITIAL SETUP (/frg-init or /frg-enable-forge Option 1)
   └─→ User provides vision statement
   └─→ Written to governance.json.constitution.directive
   └─→ Confidence starts at 50%

2. ONGOING GOVERNANCE (Automated)
   ├─→ forge-oracle watches for scope drift
   │       └─→ If agent works outside vision → WARNING in sentinelLog
   │       └─→ Confidence decreases
   │
   ├─→ forge-planner validates new features
   │       └─→ Feature aligns with vision → SUCCESS log
   │       └─→ Confidence increases
   │
   └─→ CEO-LOOP reviews blocking decisions
           └─→ Decisions marked CRITICAL get escalated
           └─→ Human approval required for CRITICAL+CRITICAL

3. USER OVERRIDE (Manual)
   └─→ User can update constitution via:
       ├─→ /frg-status (shows current constitution)
       ├─→ Direct edit of governance.json
       └─→ Vision refinement session

4. STATUS TRANSITIONS:
   PLANNING → EXECUTION → REVIEW → MONITORING → COMPLETE
                ↑           │
                └── BLOCKED ←┘
```

**[forge-builder]** The constitution card should be INTERACTIVE:
- Click status → dropdown to change
- Click confidence → see reasoning chain
- Click directive → edit mode (with confirmation)

**[nxtg-design-vanguard]** TOPIC-8 Response: Worker Pool UX/DX

```
CURRENT STATE: Worker Pool is ASPIRATIONAL, not functional.

What it SHOWS:
- Pool status badge (running/scaling/degraded/stopped)
- Utilization percentage
- Worker counts (total/active/idle/error)
- Queue depth

What HAPPENS when user clicks: NOTHING currently.

WHAT SHOULD HAPPEN:

1. Click "Scale Up" button:
   └─→ POST /api/workers/scale/up
   └─→ Spawns new background Task agent
   └─→ UI shows new worker in "idle" state
   └─→ Worker picks up next queued task

2. Click worker badge:
   └─→ Modal shows worker details:
       ├─→ Current task (if any)
       ├─→ Completed tasks history
       ├─→ Error rate
       └─→ "Terminate" button

3. Click queue depth:
   └─→ Expand to show queued tasks list
   └─→ Allow re-prioritization
   └─→ Allow task cancellation

HONEST ASSESSMENT: Worker pool is 90% UI, 10% functional.
The backend exists but agents don't actually spawn workers.
This is COSMETIC until we wire real Task tool parallelization.
```

**[forge-planner]** TOPIC-4 (continued): State Persistence Locations

```
STATE PERSISTENCE MAP:

governance.json (Strategic State)
├─→ Persisted: Yes (file system)
├─→ Backed up: Yes (timestamped in .claude/governance/backups/)
├─→ Checksummed: Yes (SHA256 in metadata)
└─→ Auto-synced: NO (this is the bug)

.claude/state/current.json (Session State)
├─→ Persisted: Yes
├─→ Backed up: Yes (to backup.json)
└─→ Purpose: Quick session recovery

localStorage (Browser State)
├─→ Key: "forge-memory"
├─→ Persisted: Browser-local only
├─→ Synced to file system: NO (this is the disconnect)
└─→ Lost if: Clear browser data, different browser

The FIX needed:
1. ContextWindowHUD writes to .claude/forge/memory/ not just localStorage
2. On load, read from file system, hydrate localStorage
3. On save, write to file system + governance.json sentinelLog
4. This creates true persistence across sessions/browsers
``` 

### What's BROKEN

| Gap | Severity | Description |
|-----|----------|-------------|
| **Static data** | CRITICAL | governance.json hasn't been updated since Jan 29. Still shows "Governance HUD Implementation" workstream at 100%. None of the Week 1-4 roadmap work is reflected. |
| **No auto-update** | CRITICAL | No agent, hook, or system actually writes to governance.json during real work. It's manually seeded and never touched again. |
| **Context disconnected** | HIGH | ContextWindowHUD (left panel) stores memory in localStorage only. Never feeds into governance state. Display-only as user observed. |
| **Memory not pulled in** | HIGH | Context Memory cards are display-only. They don't influence Claude's context window. User observation (b/c) confirmed. |
| **Agent protocol unused** | HIGH | AGENT_PROTOCOL.md defines how agents should report - but no agent implementation actually calls the sentinel API. |
| **No git tracking** | MEDIUM | Current branch, commit history, file changes not visible in HUD. |
| **No test metrics** | MEDIUM | 595 tests passing but HUD doesn't know. |
| **No dependency enforcement** | MEDIUM | Workstream dependencies defined but not checked. |

### What governance.json CURRENTLY shows vs SHOULD show

**Currently:**
```
Workstreams: "Governance HUD Implementation" (100%), "Agent Integration Layer" (100%)
Sentinel Log: 6 entries from Jan 29
Constitution: "Build production-ready Governance HUD" (85% confidence)
```

**Should show:**
```
Workstreams: Week 1-4 roadmap items, current tasks, deployment strategy decision
Sentinel Log: All session activity, governance hook events, test results
Constitution: Updated to reflect current phase (post-launch, deployment planning)
Blocking Decisions: LICENSE, Deployment Medium, .claude/.forge cleanup
Test Metrics: 595 passing, 26 skipped, 0 failures
Git State: main branch, latest commits, uncommitted changes
```

---

## 6. Root Documentation Cleanup Plan

**Current:** 39 markdown files in project root
**Target:** ~10 essential files in root, rest organized into `docs/`

### Keep in Root (Essential)

| File | Reason |
|------|--------|
| README.md | Standard project entry point |
| CLAUDE.md | Claude Code project instructions | **[TOPIC-9: As part of nxtg-forge - do we autodeploy this based on the initial Vision engagement? rename their existing one if they have one that is empty or if it's an existing project -- we ask permission to backup and create a new one or something?]**

**[forge-planner]** CLAUDE.md Handling Strategy:

```
/frg-init CLAUDE.md HANDLING:

CASE 1: No CLAUDE.md exists
└─→ Generate fresh from vision + project analysis
└─→ Include: Project type, key patterns, critical instructions
└─→ Link to .claude/forge/ harness

CASE 2: CLAUDE.md exists but is EMPTY/MINIMAL
└─→ Ask user: "Enhance with forge intelligence? [Y/n]"
└─→ If Y: Generate rich CLAUDE.md, keep their content at top
└─→ If N: Leave as-is, note in governance.json

CASE 3: CLAUDE.md exists with SUBSTANTIAL content
└─→ Ask user: "Your CLAUDE.md has content. Options:"
    ├─→ [A] Backup to CLAUDE.md.backup, generate new
    ├─→ [B] Merge: Keep yours, append forge section
    ├─→ [C] Skip: Use yours as-is
└─→ Default recommendation: [B] Merge

GENERATED CLAUDE.md STRUCTURE:
---
# {Project Name}

## User Instructions
{Their original content if any}

## NXTG-Forge Integration
- Harness: .claude/forge/
- Memory: .claude/forge/memory/
- Governance: governance.json

## Project Context
{Auto-generated from analysis}

## Critical Rules
{From governance constitution}
---
```

**[master-architect]** YES to the backup approach. Never destroy user content. Always ask permission for significant changes.
| CHANGELOG.md | Version history (standard) |
| CONTRIBUTING.md | Contributor guide (standard) |
| GETTING-STARTED.md | User onboarding |
| LICENSE | Required (to be created) |
| SECURITY.md | Vulnerability disclosure (to be created) |

### Move to docs/reports/ (Generated Reports)

| File | New Location |
|------|-------------|
| AUTONOMOUS-OPERATION-GAP-ANALYSIS.md | docs/reports/ |
| DOCUMENTATION-REPORT.md | docs/reports/ |
| HEALTH-MONITORING-REPORT.md | docs/reports/ |
| QUALITY-ASSESSMENT-2026-01-31.md | docs/reports/ |
| QUALITY-GATES-SUMMARY.md | docs/reports/ |
| DESIGN-REVIEW-PRODUCTION-SIGNOFF.md | docs/reports/ |
| IMPLEMENTATION-COMPLETE.md | docs/reports/ |
| IMPLEMENTATION_STATUS.md | docs/reports/ |
| TASK-4.7-BETA-FEEDBACK-COMPLETE.md | docs/reports/ |
| TESTID-IMPLEMENTATION-COMPLETE.md | docs/reports/ |

### Move to docs/architecture/ (Design Docs)

| File | New Location |
|------|-------------|
| CEO-LOOP-PROTOCOL.md | docs/architecture/ |
| CORE-INFRASTRUCTURE-SUMMARY.md | docs/architecture/ |
| MCP-INTEGRATION-SUMMARY.md | docs/architecture/ |
| PORT-CONFIGURATION.md | docs/architecture/ |
| PRODUCT-SEPARATION-STRATEGY.md | docs/architecture/ |
| PRODUCT-vs-RUNTIME-FILES.md | docs/architecture/ |

### Move to docs/operations/ (Operational Docs)

| File | New Location |
|------|-------------|
| DEBUG-TERMINAL.md | docs/operations/ |
| INFINITY-TERMINAL-RESIZE-FIX.md | docs/operations/ |
| TERMINAL-FIX-STATUS.md | docs/operations/ |
| PRODUCTION-READINESS.md | docs/operations/ |
| RELEASE-READINESS.md | docs/operations/ |
| ROADMAP-SUMMARY.md | docs/operations/ |
| READY-TO-BUILD-SUMMARY.md | docs/operations/ |
| SEPARATION-COMPLETE.md | docs/operations/ |

### Move to docs/guides/ (User Guides)

| File | New Location |
|------|-------------|
| DOG-FOOD-README.md | docs/guides/ |
| DOG-FOODING-USER-JOURNEY.md | docs/guides/ |
| QUICK-DOGFOOD-REFERENCE.md | docs/guides/ |
| QUICK-START.md | docs/guides/ |
| QUICKSTART.md | **DELETE** (duplicate of QUICK-START.md) |
| QUICK-UAT.md | docs/guides/ |
| TESTING-GUIDE.md | docs/guides/ |
| QUALITY-QUICK-REFERENCE.md | docs/guides/ |

### Delete (Obsolete/Duplicate)

| File | Reason |
|------|--------|
| QUICKSTART.md | Duplicate of QUICK-START.md |
| z_bug.md | Personal bug note, should be in .forge/ |

---

## 7. Deployment Medium Decision (BLOCKING)

**STATUS: BRAINSTORMING SESSION REQUIRED - REGISTERED ON GOVERNANCE HUD**

### Options Under Consideration

| Medium | Pros | Cons | Alignment |
|--------|------|------|-----------|
| **npm package** | JS ecosystem native, easy install (`npx nxtg-forge`), versioning built-in | node-pty native compilation, heavy deps | HIGH - primary audience is JS/TS devs |
| **PyPI package** | Python ecosystem, pip install | Not a Python project, confusing | LOW |
| **GitHub Release** | Binary distribution, no runtime deps, cross-platform | Large binaries, no auto-update | MEDIUM |
| **Claude Code Plugin** | Native integration, auto-discovery, dog-food alignment | Limited to Claude Code users, new ecosystem | HIGHEST - this IS what we build for |
| **VS Code Extension** | Massive marketplace, IDE integration | Separate codebase, maintenance burden | MEDIUM | **[TOPIC-10: Sounds like this is the play... but we don't want nxtg-forge src/ folder to fuck with the user's src/ folder right? how the fuck do we do this? install in .forge folder .. .like a binary or something? if they are managing multiple projects.. it won't make sense to have .forge in one project directory??? i don't know -- ultrathink on this one please.]**

**[master-architect]** ULTRATHINK: Installation Architecture

```
THE PROBLEM:
- nxtg-forge has src/, node_modules/, etc.
- User's project has src/, node_modules/, etc.
- We can't collide.

SOLUTION OPTIONS:

OPTION A: GLOBAL INSTALLATION (Recommended for CLI)
├─→ npm install -g nxtg-forge
├─→ Installs to: ~/.npm-global/ or /usr/local/lib/node_modules/
├─→ Binary: nxtg-forge (global command)
├─→ User's project: UNTOUCHED
├─→ Forge creates: .claude/forge/ (config only, no src/)
└─→ Multi-project: Works naturally - each project has its own .claude/forge/

OPTION B: CLAUDE CODE PLUGIN (Recommended for Integration)
├─→ Plugin lives in: ~/.claude/plugins/nxtg-forge/
├─→ Or downloaded to: Claude's plugin directory
├─→ User's project: UNTOUCHED
├─→ Forge creates: .claude/forge/ (harness config)
├─→ The UI/terminal: Served from plugin directory OR bundled binary
└─→ Multi-project: Each project has .claude/forge/, plugin is shared

OPTION C: PROJECT-LOCAL (Current accidental state)
├─→ NOT RECOMMENDED
├─→ Copies forge src/ into each project
├─→ Pollutes user's codebase
└─→ AVOID THIS

THE ANSWER FOR MULTI-PROJECT:

~/.nxtg-forge/                    # GLOBAL: The forge "binary" / runtime
├── bin/                          # CLI executables
├── server/                       # API server (if standalone)
├── ui/                           # Bundled UI assets
└── plugins/                      # Skill packs, agent packs

~/project-a/.claude/forge/        # PROJECT-SPECIFIC: Harness config
├── config.yml                    # This project's settings
├── agents/                       # Enabled agents for this project
├── memory/                       # This project's accumulated knowledge
└── skills/                       # Active skills for this project

~/project-b/.claude/forge/        # DIFFERENT PROJECT: Own config
└── (same structure, different content)
```

**[forge-planner]** The key insight: SEPARATE RUNTIME FROM CONFIG

```
RUNTIME (global, shared):      ~/.nxtg-forge/ or Claude plugin
CONFIG (per-project):          .claude/forge/

User never sees our src/.
User never has our node_modules in their project.
We deploy to GLOBAL or PLUGIN location.
We only CREATE CONFIG FILES in their project.
```

**[forge-builder]** For the Claude Code Plugin path:
- Claude Code plugins can have a UI (webview)
- We'd be the first comprehensive one
- The terminal (xterm.js + node-pty) is the challenge
- Solution: Plugin spawns a local server process
- UI connects via WebSocket (same as now)
- Server runs from plugin directory, not project

**[master-architect]** RECOMMENDATION: Dual-track distribution
1. **PRIMARY**: Claude Code Plugin (dog-food alignment, native integration)
2. **SECONDARY**: npm global install (broader reach, standalone use)
| **Docker image** | Consistent env, easy deploy | Heavy for CLI tool, terminal access complex | LOW |

### Key Factors for Decision

1. **Canon vision:** "Chief of Staff for Developers" - needs to be where developers already are **[TOPIC-11: What do you mean? there is my vision for nxtg-forge.. then there should be a canon vision archtecture for the user's project when deployed right?]**

**[master-architect]** CLARIFICATION: Two Visions

```
VISION LAYER 1: NXTG-FORGE PRODUCT VISION (Ours)
├─→ "Chief of Staff for Developers"
├─→ AI-orchestrated productivity 10x
├─→ Production planning + legal compliance as features
├─→ No one else is doing this
└─→ This drives OUR decisions (deployment, monetization, features)

VISION LAYER 2: USER'S PROJECT VISION (Theirs)
├─→ Captured during /frg-enable-forge → "What are you building?"
├─→ Stored in governance.json.constitution.directive
├─→ Drives THEIR agents' behavior
├─→ Used for scope validation, drift detection
└─→ Example: "Build a real-time collaboration platform"

CANON ARCHITECTURE (What gets deployed to user's project):

governance.json
├── constitution
│   ├── directive: "{USER'S PROJECT VISION}" ← They fill this
│   ├── vision: ["{USER'S GOALS}"] ← Their goals
│   └── status: "PLANNING"
├── workstreams: [] ← Populated as they work
└── sentinelLog: [] ← Events accumulate

The "canon" for their project IS the governance.json.
Forge agents validate against THEIR directive, not ours.
Our vision (Chief of Staff) is the meta-layer that defines how we help them achieve their vision.
```

**[forge-planner]** So "canon vision architecture" means:
- THEIR governance.json is THEIR constitution
- Forge respects and enforces THEIR vision
- Our product vision ("Chief of Staff") is how we DELIVER that service
2. **Dog-food principle:** We build for Claude Code - should we BE a Claude Code plugin? yes i think so. can a plug have a built-in UI like we do? Let's be the first.
3. **node-pty dependency:** Native compilation means npm install can fail on some systems
4. **Multi-platform:** WSL2, Linux, macOS - all need to work 
5. **Update mechanism:** How do users get new versions?
6. **First-run experience:** How fast from discovery to working? **[TOPIC-12: You tell me]**

**[master-architect]** First-Run Experience Analysis:

```
CURRENT STATE (Honest Assessment):
├─→ Discovery: GitHub repo (if you know to look)
├─→ Install: Clone repo, npm install, hope node-pty compiles
├─→ Time to working: 10-30 minutes (depending on environment)
├─→ First value: After reading docs, understanding commands
├─→ GRADE: D+ (developer-hostile)

TARGET STATE (What we should achieve):

SCENARIO A: Claude Code Plugin (Best case)
├─→ Discovery: Claude Code plugin marketplace
├─→ Install: One click "Install Plugin"
├─→ First run: Plugin auto-activates, presents menu
├─→ Time to working: < 60 seconds
├─→ First value: Immediate - /frg-enable-forge shows dashboard
├─→ GRADE: A+

SCENARIO B: npm global (Good case)
├─→ Discovery: npm search, blog post, recommendation
├─→ Install: npm install -g nxtg-forge (hope node-pty works)
├─→ First run: nxtg-forge init in project dir
├─→ Time to working: 2-5 minutes
├─→ First value: After init completes, /frg-enable-forge
├─→ GRADE: B+

SCENARIO C: GitHub Release binary (Fallback)
├─→ Discovery: GitHub releases page
├─→ Install: Download, extract, add to PATH
├─→ First run: nxtg-forge init
├─→ Time to working: 5-10 minutes
├─→ First value: After manual setup
├─→ GRADE: B-

THE IDEAL FIRST-RUN FLOW (60 seconds to value):

0:00  User installs plugin/package
0:05  Plugin loads, detects no .claude/forge/
0:10  Prompt: "Initialize NXTG-Forge for this project? [Y/n]"
0:15  User confirms
0:20  Forge analyzes project (package.json, etc.)
0:30  Harness deployed (.claude/forge/ created)
0:35  Prompt: "What's your vision for this project?"
0:45  User types brief description
0:50  Governance initialized, HUD ready
0:55  Terminal opens with welcome message
1:00  User sees dashboard, types first command
      VALUE DELIVERED ✓
```

**[nxtg-design-vanguard]** The UX flow matters:
- NO documentation reading required for first value
- Guided wizard, not "read the README"
- Visual feedback at every step
- Escape hatch for power users who want to skip wizard

### Proposed Session Agenda
1. Review vision alignment for each medium
2. Technical feasibility assessment (node-pty, WebSocket, terminal)
3. Distribution logistics (publishing, versioning, CI/CD)
4. Multi-medium strategy (primary + secondary channels)
5. Decision and implementation plan

---

## 8. Production Planning as nxtg-forge Feature

**Dog-food opportunity:** Capture what we're doing RIGHT NOW as a reusable nxtg-forge capability.

### Feature: `/frg-compliance` - Production & Legal Readiness

| Capability | Description | Status |
|-----------|-------------|--------|
| Tech stack scanner | Auto-detect all dependencies + licenses | GAP |
| License compatibility check | Flag GPL/AGPL/restrictive licenses | GAP |
| Security audit | OWASP, dependency vulnerabilities, secrets scanning | PARTIAL (npm audit exists) |
| SBOM generation | Software Bill of Materials (CycloneDX/SPDX) | GAP |
| Compliance report | Generate compliance artifact for stakeholders | GAP |
| Deployment readiness | Pre-flight checks for production | PARTIAL |
| Legal checklist | LICENSE, SECURITY.md, privacy policy, ToS | GAP |

**No one else is doing this** - most dev tools stop at linting and testing. Production planning, legal compliance, and business readiness checks as first-class features would be a differentiator.

---

## 9. Master Gap Tracker

### BLOCKING (Must resolve before proceeding)

| # | Gap | Owner | Status | Blocks |
|---|-----|-------|--------|--------|
| B1 | Deployment medium decision | CEO-LOOP | PENDING | Everything downstream |
| B2 | LICENSE file creation | CEO-LOOP | PENDING (needs B1) | Open-source release |
| B3 | Governance HUD data pipeline | forge-builder | GAP | Real-time visibility |

### CRITICAL (Must fix this session)

| # | Gap | Owner | Status | Action |
|---|-----|-------|--------|--------|
| C1 | governance.json stale (Jan 29 data) | forge-builder | GAP | Update with current state |
| C2 | Root doc clutter (39 files) | forge-builder | GAP | Reorganize per Section 6 |
| C3 | .claude/forge/ duplication | forge-builder | GAP | Clean nested dirs |
| C4 | Empty dirs without .gitkeep | forge-builder | GAP | Add .gitkeep or delete |
| C5 | Context Memory not functional | forge-builder | KNOWN | User observation confirmed |

### HIGH (Address soon)

| # | Gap | Owner | Status | Action |
|---|-----|-------|--------|--------|
| H1 | SECURITY.md missing | forge-builder | GAP | Create after LICENSE decided |
| H2 | CODE_OF_CONDUCT.md missing | forge-builder | GAP | Create (Contributor Covenant) |
| H3 | SUPPORT.md missing | forge-builder | GAP | Create |
| H4 | No SBOM generation | forge-planner | GAP | Design as forge feature |
| H5 | Agent protocol not wired | forge-builder | GAP | Agents don't call sentinel API |
| H6 | Test metrics not in HUD | forge-builder | GAP | Wire vitest results to governance |
| H7 | Fresh install doc hygiene | forge-planner | GAP | Validate init creates proper structure |

### MEDIUM (Backlog)

| # | Gap | Owner | Status | Notes |
|---|-----|-------|--------|-------|
| M1 | docs/tutorials/ empty | HOLD | User directive | Fill after blockers resolved |
| M2 | docs/best-practices/ empty | HOLD | User directive | Fill after blockers resolved |
| M3 | docs/commands/ empty | HOLD | User directive | Fill after blockers resolved |
| M4 | docs/hooks/ empty | HOLD | User directive | Fill after blockers resolved |
| M5 | docs/skills/ empty | HOLD | User directive | Fill after blockers resolved |
| M6 | Brand assets only in .forge/ | HOLD | By design | Personal, not committed |
| M7 | No dependency graph visualization | HOLD | Future | Governance HUD enhancement |

---

## Governance HUD Registration

The following items have been identified as requiring Governance HUD visibility:

1. **BLOCKING DECISION: Deployment Medium** - npm vs Claude Plugin vs GitHub Release vs multi-channel
2. **BLOCKING DECISION: License Model** - MIT vs Open-Core vs BSL vs Dual
3. **CRITICAL: Governance Data Pipeline** - HUD shows stale data from Jan 29
4. **CRITICAL: Root Documentation Reorganization** - 39 files → ~10

These will be written to governance.json in the next step.

---

---

## 10. Team Session Consensus (2026-02-04)

### Participants
- **CEO** (User) - Vision, priorities, inline comments
- **[master-architect]** - System design, architecture decisions
- **[forge-planner]** - Feature planning, workflow design
- **[forge-builder]** - Implementation specifics, technical details
- **[nxtg-design-vanguard]** - UI/UX considerations

### Key Decisions Made

| Topic | Decision | Rationale |
|-------|----------|-----------|
| `.claude/forge/` vs `.forge/` | NOT duplicates - serve different purposes | `.claude/forge/` = product harness (committed), `.forge/` = user personal (gitignored) |
| Memory architecture | 5-layer hierarchy | CLAUDE.md → state/ → forge/memory/ → governance.json → localStorage (synced) |
| Deployment medium | Dual-track: Claude Code Plugin (primary) + npm global (secondary) | Dog-food alignment + broad reach |
| Runtime vs Config | Separate runtime (~/.nxtg-forge/) from config (.claude/forge/) | Prevents src/ collision with user projects |
| First-run target | < 60 seconds to value | Guided wizard, no docs required |
| Skill-pack monetization | FREE core + PRO skill-packs + ENTERPRISE custom | Natural extension of platform |
| CLAUDE.md handling | Merge approach with backup | Never destroy user content |
| Documentation domains | 3 distinct types | User docs, Forge docs, Project memory (skills-style) |

### Blocking Decisions Still Pending

| Decision | Owner | Action Required |
|----------|-------|-----------------|
| License model (MIT vs Open-Core vs BSL vs Dual) | CEO | Final call needed |
| Skill-pack pricing | CEO | Business decision |
| Claude Code Plugin timeline | Team | Depends on Claude Code plugin API maturity |

### Immediate Next Steps

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Wire ContextWindowHUD to file system (fix localStorage-only) | forge-builder | CRITICAL |
| 2 | Implement memory persistence layer (.claude/forge/memory/) | forge-builder | CRITICAL |
| 3 | Create /frg-init wizard flow | forge-planner | HIGH |
| 4 | Populate .claude/forge/agents/ with starter agents | forge-builder | HIGH |
| 5 | Design skill-pack format and marketplace spec | forge-planner | MEDIUM |
| 6 | Research Claude Code plugin API capabilities | forge-builder | MEDIUM |
| 7 | Build first-run experience prototype | nxtg-design-vanguard | MEDIUM |

### Architecture Diagram (Agreed)

```
USER'S MACHINE
├── ~/.nxtg-forge/                    # GLOBAL RUNTIME (shared)
│   ├── bin/                          # CLI executables
│   ├── server/                       # API server
│   ├── ui/                           # Bundled UI
│   └── skill-packs/                  # Downloaded packs
│
├── ~/.claude/                        # GLOBAL CLAUDE CODE CONFIG
│   └── plugins/nxtg-forge/           # Plugin installation (if plugin path)
│
└── ~/projects/
    └── my-project/
        ├── .claude/                  # PROJECT CLAUDE CODE CONFIG
        │   ├── CLAUDE.md             # Project instructions (enhanced by forge)
        │   ├── agents/               # Active agents (copied from harness)
        │   ├── commands/             # Commands
        │   ├── skills/               # Skills
        │   ├── state/                # Session state
        │   ├── governance.json       # GOVERNANCE STATE
        │   └── forge/                # NXTG-FORGE HARNESS (the product)
        │       ├── config.yml        # Harness config
        │       ├── agents/           # Agent templates (source)
        │       ├── skills/           # Skill templates (source)
        │       └── memory/           # PROJECT MEMORY (persisted)
        │           ├── decisions.md
        │           ├── learnings.md
        │           ├── patterns.md
        │           └── context-snapshots/
        │
        ├── .forge/                   # USER PERSONAL VAULT (gitignored)
        │   ├── notes/
        │   ├── brand-assets/
        │   └── private-docs/
        │
        └── src/                      # USER'S CODE (untouched by forge)
```

### Session Artifacts Generated
- This document with inline team responses
- Updated governance.json with current workstreams
- Clear separation of .claude/forge/ vs .forge/ documented
- Memory architecture specification
- First-run experience target defined

---

*Generated by NXTG-Forge Strategic Audit | 2026-02-04*
*Team Session: CEO + master-architect + forge-planner + forge-builder + nxtg-design-vanguard*

# NXTG-Forge Soundboard — 2026-02-10

## 1. V3 (forge-ui) Launch Strategy

### Your Take
Human-driven final UI/UX/DX journey before launch. "We don't play with the cutting edge, we LIVE AND SHAPE THE BLEEDING EDGE."

### My Recommendation: Absolutely Yes

4114 tests give us **structural confidence** — the code works. But tests can't tell you:
- Does the onboarding flow *feel* right?
- Is the dashboard information density overwhelming or just right?
- Does the terminal reconnect experience feel seamless or jarring?
- Are the engagement modes (CEO/VP/Engineer/Builder/Founder) actually useful in practice?

**Proposed Human UAT Sprint (2-3 hours):**

| Journey | What to Validate | Key Questions |
|---------|-----------------|---------------|
| First-time user | Vision capture -> MCP selection -> Dashboard | Does a new dev "get it" in 60 seconds? |
| Daily driver | Dashboard -> Terminal -> Command Center | Is the workflow natural? Any friction? |
| Mobile/tablet | Full app on phone/iPad via 192.168.x.x:5050 | Does responsive actually work in hand? |
| Engagement modes | Switch CEO -> Founder -> Builder mid-session | Does filtering feel useful or just hiding things? |
| Error states | Kill API server mid-session, disconnect WiFi | Do error states guide recovery or just show red? |

**What typically surfaces in human UAT that automated tests miss:**
- Copy/microcopy that sounds robotic (AI-generated text patterns)
- Loading states that feel too long or flash too quick
- Z-index battles between modals, dropdowns, and toasts
- Color contrast issues in specific lighting conditions
- "Where did my data go?" moments after navigation

**My strong recommendation:** Do this BEFORE any public launch. Ship the razor, not the blade blank.

---

## 2. Bundle Size — Beyond Best Practices

### Current: 749 KB (down from 907 KB)

**Next moves available (ordered by impact):**

| Technique | Estimated Savings | Effort |
|-----------|------------------|--------|
| Lazy-load remaining page components (dashboard-live is 81 KB) | ~80-100 KB off main | Low — same pattern as Session 10 |
| Tree-shake lucide-react (import specific icons, not barrel) | ~20-30 KB | Medium — many files to update |
| Replace framer-motion with CSS animations where possible | ~120 KB (entire chunk) | High — need to audit each usage |
| Dynamic import for heavy hooks (useForgeIntegration) | ~30-40 KB | Medium |

**Realistic target:** Under 500 KB main chunk is achievable with lazy-loading the remaining pages. The 120 KB framer-motion chunk is already split out so it only loads once.

**My take:** The 749 KB is fine for a dev tool (not a consumer landing page). Pursue #1 (more lazy loading) if you want, but don't chase vanity metrics here. Dev tools trade bundle size for feature density.

---

## 3. Rust Orchestrator — The Trust Gap

### The Problem
You built forge-ui with your hands. You've used the Claude plugin daily. But forge-orchestrator was largely AI-built and you haven't personally driven it.

### Why This Matters
The orchestrator is your **most technically differentiated piece** — a 3 MB native binary that does intelligent task planning with pluggable AI brains. No other dev tool in this space has this. But if the founder doesn't trust it, customers won't either.

### Recommendations to Close the Trust Gap

**Option A: Dogfood Sprint (1-2 hours)**
```
cd ~/projects/NXTG-Forge/forge-orchestrator
forge init        # Initialize a test project
forge plan        # See what it generates
forge status      # Check the dashboard
forge run         # Execute a task
forge mcp         # Test the MCP server mode
```
Just... use it. On a real project. Maybe even use it to plan your own forge-ui work. The fastest path to trust is experience.

**Option B: Integration Sprint — Wire Orchestrator into forge-ui**
The orchestrator has an MCP server mode (`forge mcp`). We could:
1. Add it as an MCP server in the plugin's `.mcp.json`
2. Have the UI call orchestrator endpoints for task planning
3. The dashboard could show orchestrator-generated plans

This would make the orchestrator a **visible, daily-use tool** rather than a standalone binary.

**Option C: The Mini-Dashboard You Mentioned** *[Asif:] Okay let's pair program this - give me a guide to work with.*
> "still don't know why we haven't pushed that mini-dashboard to the plugin that would have been dope AF"

THIS. A mini orchestrator dashboard embedded in the Claude plugin. Shows:
- Current project plan (from `forge plan`)
- Task status board
- Health metrics
- Quick actions (run, sync, status)

This bridges all three products: forge-ui feeds the dashboard, the plugin provides the surface, and the orchestrator provides the brain.

*[Claude:] Let's do it. Here's how I see this working:*

**Rust TUI Dashboard — Yes, Pure Rust**

You asked "Can we build a dashboard purely in Rust?" — absolutely. This is the SOTA move. The Rust ecosystem has mature TUI (Terminal UI) libraries:

| Library | What It Does | Why It Fits |
|---------|-------------|-------------|
| **ratatui** | Terminal UI framework (the standard) | Rich widgets, charts, tables, gauges |
| **crossterm** | Terminal backend (cross-platform) | Works on Windows CMD, PowerShell, WSL, Mac, Linux |
| **tui-textarea** | Text input widget | For interactive commands |

**What `forge dashboard` would look like:**
```
+--[ NXTG-Forge Orchestrator ]----------------------------+
| Project: forge-ui          Brain: OpenAI (gpt-4.1)      |
| Status: ACTIVE             Tasks: 3/8 complete           |
+----------------------------------------------------------+
| TASK BOARD                  | HEALTH          | METRICS  |
| [x] Auth routes             | Tests: 4114 OK  | LOC: 42K|
| [x] Vision API              | Types: 0 errors | Files:312|
| [>] Bundle optimize         | Audit: 0 vulns  | Cov: 87%|
| [ ] Mini-dashboard          | Build: 2.99s    |          |
| [ ] Docs site               |                 |          |
+----------------------------------------------------------+
| [r]un  [p]lan  [s]ync  [c]onfig  [q]uit                 |
+----------------------------------------------------------+
```

**Pair programming plan:**
1. You open forge-orchestrator in a second VS Code window
2. Add `ratatui` + `crossterm` to Cargo.toml
3. Build the dashboard TUI as `forge dashboard` subcommand
4. Wire it to read from the existing `.forge/state.json` and `plan.md`
5. I stay open here to help debug, review, and iterate

This stays 100% in the Rust binary — no Node, no browser, no electron. A 3 MB binary that renders a full dashboard in any terminal. That's bleeding edge for a dev tool.

### Windows Users — Your Unique Angle

You're absolutely right that Windows developers are underserved in AI/ML tooling. The Rust orchestrator is **cross-platform by design** — it compiles to Windows native without WSL. This is a genuine competitive advantage. The path:

1. `cargo build --target x86_64-pc-windows-msvc` (cross-compile or native)
2. Ship `.exe` via GitHub Releases
3. `winget` package for easy install
4. PowerShell-friendly CLI output

**No other AI dev orchestrator ships a native Windows binary.** This could be your wedge into an underserved market.
*[Asif:] Okay let's pair program this as well... but I have to improve it, maximize the UI/UX/DX vibes on it with my Vision first*

*[Claude:] 100% right order of operations. Vision first, then ship. Here's the sequence:*
1. **You dogfood the orchestrator** — feel the rough edges, note what annoys you
2. **You sketch your Vision** for what the DX should feel like (even napkin-level)
3. **We pair on the TUI dashboard** — your design sense + my Rust implementation
4. **Then** cross-compile to Windows — shipping polish, not prototype

The Windows `.exe` is the easy part (one cargo flag). Making it *feel right* is the hard part that only you can drive.
---

## 4. Distribution Strategy — Plugin, NPM, Docs

### Plugin Packaging
Claude Code plugins use the `.claude/` directory convention:
- `commands/` — slash commands
- `agents/` — agent definitions
- `settings.json` — hooks
- `CLAUDE.md` — project knowledge

The plugin repo (github.com/nxtg-ai/forge-plugin) ships these. Claude's packaging is just "clone/copy the .claude directory." No npm or PyPI needed for the plugin itself. *[Asif:] Yes, but we probably want a nice README.md, engaging contributors and instructions on how to load the marketplace first <- we need to research the marketplace -- i don't want NextGen AI to come off as weak, basic and janky... we have to be SOTA, professional and secure.*

*[Claude:] Hard agree. First impressions are everything.* Here's what "SOTA professional" looks like for a plugin README:

**Plugin README must-haves:**
- Hero banner/logo (nxtg.ai branding)
- One-line value prop + 30-second GIF demo
- `Installation` section (marketplace link + manual install)
- `What's Included` table (19 commands, 22 agents, hooks)
- `Quick Start` — 3 commands to go from zero to productive
- `Architecture` — clean diagram showing plugin <-> UI <-> orchestrator
- `Contributing` — how to extend with custom agents/commands
- `Security` — how governance/audit trail works
- Badges: CI status, license, version, downloads

**On the marketplace:** Claude Code's plugin marketplace is still early. Let me research what the current submission process looks like — whether it's a registry, a curated list, or PR-based. We should be first-movers with a polished listing. I can do that research as a next step if you want.

### Why NPM Matters (for the UI, not the plugin)
The forge-ui dashboard could be shipped as:
```bash
npx nxtg-forge          # Instant launch, no install
# or
npm install -g nxtg-forge
nxtg-forge start        # Starts UI + API server
```

**Why NPM over PyPI or binary:**
- **Audience match** — your users are JS/TS developers using Claude Code
- **Zero friction** — `npx` runs without install, no PATH config, no permissions
- **Update story** — `npm update` vs manual binary downloads
- **Dependency management** — lockfile ensures reproducible installs
- **Cross-platform** — Node runs everywhere (Windows, Mac, Linux) without separate builds

PyPI would be right if your users were Python developers. Binary (Rust) is right for the orchestrator (no runtime dependency). NPM is right for the UI (Node is already installed — they're using Claude Code).

### Documentation Site — Autonomous Agent-Maintained Docs

YES. This is perfectly aligned. Here's the play:

**Stack:** Docusaurus + GitHub Pages (free, zero-ops)

**Why Docusaurus:**
- MDX support (embed interactive components)
- Versioned docs (v3 docs alongside future v4)
- Built-in search (Algolia DocSearch, free for OSS)
- GitHub Pages deployment via GitHub Actions

**Autonomous maintenance flow:**
```
Code change detected (PR merged)
  -> release-sentinel agent detects affected docs
  -> forge-docs agent generates/updates markdown
  -> PR auto-created to docs repo
  -> Human approves (or auto-merge for minor updates)
  -> GitHub Actions deploys to nxtg.ai/docs
```

We already have `[AFRG]-docs.md` and `[AFRG]-release-sentinel.md` agents. They just need a docs repo to target.

---

## 5. The NXTG Protocol Vision — Let's Riff

### The Pattern You're Describing

```
Build -> Streamline -> Optimize -> Standardize as Protocol -> Ship at Scale
```

This is how platforms are born. You're not building a product — you're building a **protocol for AI-assisted development**. The products (forge-ui, plugin, orchestrator) are implementations of the protocol.

### What "NXTG Protocols" Could Look Like

| Protocol | What It Standardizes | Products That Use It |
|----------|---------------------|---------------------|
| Governance Protocol | How AI decisions are tracked, approved, audited | governance.json, sentinel hooks |
| Vision Protocol | How project vision flows to agent behavior | VisionSystem, alignment checks |
| Engagement Protocol | How information density adapts to user role | Engagement modes (CEO->Founder) |
| Orchestration Protocol | How tasks are planned, assigned, tracked | Rust orchestrator, MCP tools |
| Memory Protocol | How context persists across sessions | 5-layer memory, CLAUDE.md |

### The Flywheel

```
                    Protocols (open standard)
                   /                        \
                  /                          \
    Products (implementations)     Community (adopters)
                  \                          /
                   \                        /
                    Ecosystem (plugins, agents)
```

1. Ship products that prove the protocols work
2. Extract protocols as open standards
3. Community builds on the protocols
4. Ecosystem grows -> more products -> better protocols

*[Asif:] But do our products/protocols ACTUALLY seamlessly plug into one another like legos? This is the threshold we must meet move this Vision into reality.*

*[Claude:] Honest answer — not yet. Here's the current integration map:*

```
Current State (what actually connects):

  forge-ui ──WebSocket──> api-server     (TIGHT: real-time, bidirectional)
  forge-ui ──REST API──> api-server      (TIGHT: 40+ endpoints)
  plugin ──CLAUDE.md──> Claude Code      (TIGHT: auto-loaded context)
  plugin ──agents/──> Claude Code        (TIGHT: 22 agents, all wired)
  plugin ──hooks──> Claude Code          (TIGHT: governance advisory)

  orchestrator ──MCP──> Claude Code      (WORKS but LOOSE: standalone binary, separate session)
  orchestrator ──???──> forge-ui         (NOT CONNECTED: no integration today)
  plugin ──???──> orchestrator           (NOT CONNECTED: plugin doesn't call forge binary)
```

**The gaps are orchestrator <-> everything else.** forge-ui and the plugin are tight. The orchestrator is an island.

**The Lego Snap Plan:**
1. `forge dashboard` TUI (pure Rust) — makes orchestrator self-sufficient and delightful
2. `forge mcp` wired into plugin's `.mcp.json` — orchestrator tools available in Claude Code
3. forge-ui `/api/orchestrator/*` proxy — UI can display orchestrator plans/status
4. Shared governance.json format — all three products read/write the same state

After steps 1-4, the snap looks like:
```
  forge-ui <──governance.json──> orchestrator
  forge-ui <──API proxy──> orchestrator
  plugin <──MCP tools──> orchestrator
  plugin <──CLAUDE.md──> forge-ui context
```

That's the Lego moment. Each product enhances the other. The governance.json is the shared bus.

### Immediate Next Steps (Revised per Asif's input)

**Priority 1 — Orchestrator Trust + TUI Dashboard (pair programming)**
1. Asif dogfoods orchestrator (keep this Claude session open, open forge-orchestrator in second VS Code)
2. Note friction points, sketch Vision for ideal DX
3. Pair-build `forge dashboard` with ratatui (pure Rust TUI)
4. Wire orchestrator MCP into plugin `.mcp.json` (the Lego snap)

**Priority 2 — Human UAT on forge-ui**
5. Hands-on UI/UX/DX journey (2-3 hours)
6. Fix anything that feels off — copy, timing, flow, contrast

**Priority 3 — Professional Polish for Public Launch**
7. Plugin README overhaul (hero banner, GIF demo, badges)
8. Research Claude marketplace submission process
9. Docusaurus docs site at nxtg.ai/docs (agent-maintained)
10. NPM packaging for forge-ui (`npx nxtg-forge`)

**Priority 4 — Windows + Protocol Standardization**
11. Cross-compile orchestrator to Windows `.exe`
12. Extract first NXTG Protocol spec (Governance Protocol v1)
13. Public launch: Product Hunt / Hacker News / X

---

## Open Questions for You

- [x] What's the timeline pressure? Is there a launch date target? No timeline pressure. [Asif] The real pressure is with the code quality and aligning all products to my Vision (everything peices together like lego blogs; enhancing the intelligence with each snap together like synAPPs)
- [x] The mini-dashboard for the plugin — should this be a priority over the docs site? [Asif] Yes, I want a visual while we build it. Can we build a dashboard purely in RUST? let's see how SOTA we can get.
- [x] For the orchestrator dogfood session — want to pair on it? I can guide you through it live. [Asif] Yes please let's pair brother. this was the missing part last time... i closed your claude session and lost you... the forge orchestrator was just dumb... so this time i'll keep you open and open another VS Code session with forge-orchestrator.
- [ ] nxtg.ai domain — is this already set up for GitHub Pages? Or do we need to configure DNS? [Asif] not setup yet.

---

*This is a living [breathing] document. Edit, annotate, push back on anything.*

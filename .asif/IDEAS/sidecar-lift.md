# sidecar inspiration: https://github.com/marcus/sidecar

Yeah… **Sidecar is *very* relevant** to NXTG-Forge. It’s basically a terminal “cockpit” for exactly the multi-agent world you’re building… diffs, file tree, conversation history, tasks, and workspaces. ([marcus.github.io][1])

## What we can lift (high leverage)

### 1) **Workspaces = git worktrees + agent sessions + live output**

Sidecar’s Workspaces plugin turns **git worktrees into managed parallel environments**; each workspace can launch an agent (Claude Code, Codex, Gemini, Cursor, OpenCode), stream output, show diffs, then run a PR/merge/cleanup flow. ([marcus.github.io][2])
**Forge mapping:** this is almost a drop-in mental model for your “multiple terminals, each agent on a task” vision… except Forge adds the **routing + shared canonical plan/state**.

What to copy conceptually:

* workspace = `{branch/worktree} + {assigned agent} + {task link} + {prompt template}`
* “Output tab” style streaming (Sidecar captures tmux pane output on an interval, adaptive, auto-scroll, etc.) ([marcus.github.io][2])
* Kanban view for agent status (Active/Waiting/Done/Error) ([marcus.github.io][2])

### 2) **Conversation normalization across agents**

Sidecar’s Conversations plugin auto-detects sessions across a bunch of agents (Claude Code, Codex, Gemini CLI, Cursor CLI, etc.) and gives unified browsing/search, plus actions like copy session as markdown and “open/resume in CLI” per agent. ([marcus.github.io][3])
**Forge mapping:** this is gold for your “filesystem is the bus” approach… because “knowing where the bodies are buried” (each agent’s local logs + resume mechanics) is half the battle.

### 3) **Task system that’s actually agent-native: td**

Sidecar leans on **td** for “task tracking for AI agents” with **structured handoffs**, **session isolation**, boards/queries, dependency graphs, and a live monitor. ([marcus.github.io][4])
**Forge mapping:** you can either:

* **Adopt td as the backend** for `.forge/plan.md` + state (best interoperability move), or
* mimic td’s primitives (handoff schema, review isolation) as your Forge-native implementation.

### 4) **Real-time visibility loop: git + file watching + previews**

Sidecar’s whole pitch is “no context switching”… live git monitoring and a file browser that updates previews when files change. ([marcus.github.io][1])
**Forge mapping:** you want that same “holy sh*t” visibility… but with your North Star + governance layered on top.

### 5) **Distribution model worth stealing**

Single binary, fast startup, auto-update; also “run beside your agent in split terminal.” ([marcus.github.io][5])
**Forge mapping:** even if your long-term UI is premium, a “Forge TUI kernel” could be the fastest adoption wedge.

## The uncomfortable truth

Sidecar is already nibbling at *your* category. It’s not just a viewer… it’s edging into workflow orchestration via workspaces + td task linking. ([marcus.github.io][2])
So if we “clone Sidecar”, we become a me-too. The win is: **Forge becomes the orchestration brain** (routing, canonical plan/state, governance, multi-agent coordination contracts), while Sidecar is a **display layer**.

## 3 strategic options (with tradeoffs)

### Option A) **Interop-first (fastest win)**

Make Forge generate/maintain the canonical artifacts (`.forge/` + agent-specific md files), then **let Sidecar be one of the recommended cockpits**.

* **Revenue probability:** High (quick to ship a differentiated layer)
* **Passion fit:** High (pure orchestrator brain, no UI yak shave)
* **Tradeoff:** You’re “playing nice” with a potential competitor

### Option B) **Adopt td as Forge’s task substrate**

Use **td tasks + handoffs + session isolation** as the canonical task engine; Forge becomes the router that assigns tasks to agents and keeps their md files aligned.

* **Revenue probability:** High (strong governance story, less reinventing)
* **Passion fit:** High (this is “control plane” energy)
* **Tradeoff:** Some dependency risk on td conventions

### Option C) **Fork/lift Sidecar code (MIT) for a Forge cockpit**

Sidecar is MIT licensed, so legally you can lift with attribution. ([GitHub][6])

* **Revenue probability:** Medium (bigger build surface area)
* **Passion fit:** Medium (more UI plumbing)
* **Tradeoff:** You inherit tmux + non-Windows-native assumptions (Sidecar targets macOS/Linux/WSL) ([marcus.github.io][1])

## My take

If the goal is “future-proof universal orchestration”… **lift the primitives, not the product**:

* **Workspaces model**
* **Conversation harvesting/normalization**
* **td-style handoff + review isolation**
* then wrap it all in Forge’s canonical plan/state loop

If you want, I’ll turn this into a **Forge lift checklist**: the exact Sidecar behaviors to replicate, what to ignore, and the minimal interface contracts Forge needs for Claude Code, Codex, and Gemini.

[1]: https://marcus.github.io/sidecar/docs/intro "Getting Started | Sidecar"
[2]: https://marcus.github.io/sidecar/docs/workspaces-plugin "Workspaces Plugin | Sidecar"
[3]: https://marcus.github.io/sidecar/docs/conversations-plugin "Conversations Plugin | Sidecar"
[4]: https://marcus.github.io/td/ "td"
[5]: https://marcus.github.io/sidecar/ "You might never open your editor again | Sidecar"
[6]: https://github.com/marcus/sidecar?utm_source=chatgpt.com "GitHub - marcus/sidecar: Use sidecar next to CLI agents for diffs, file ..."

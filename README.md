<p align="center">
  <img src="docs/images/forge-logo.png" alt="Forge" width="120">
</p>

# forge-ui

**Full visual platform for multi-tool AI orchestration.**

This is L3: Ship Lord.

Sessions survive everything. Start a long-running task on your desktop. Close the browser tab. Open it on your phone during lunch. The session is still there, still running. Close your phone. Open your laptop at a coffee shop. Same session. Same progress. The Infinity Terminal is built on top of the orchestrator's file-based state layer. Session state is files. Files persist. Sessions persist.

That's the headline. Here's the rest: a real-time governance dashboard with health scores, a feed showing your tools coordinate in real-time, and a command center for executing Forge commands from the browser.

## Install

```bash
git clone https://github.com/nxtg-ai/forge-ui
cd forge-ui
npm install
npm run dev
```

Requires the Forge Orchestrator (L2: Pro Builder) running in your project.

## The Infinity Terminal

The Infinity Terminal changes how you work with AI tools. Tasks that take hours aren't tied to a terminal window. You start them and walk away. Check in from any device. Pick up where you left off.

There is no socket connection to maintain. No server process that needs to stay alive. The terminal reconnects to state, not to a process. Network drops, browser restarts, device switches. It doesn't matter. The session is the state, and the state is files.

## Governance Dashboard

The dashboard shows your project's health at a glance. Health score from A through F, computed across 8 quality dimensions: test coverage, documentation, security, code style, dependency health, API consistency, error handling, and type safety.

Trend monitoring tracks score changes over time and fires regression alerts. Tool orchestration shows which tools are active, which files are locked, and which tasks are in progress.

Governance state comes from the Rust orchestrator. The UI reads and displays it. Policy decisions are made in the core, not in the frontend.

## Tool Activity Feed

Watch Claude Code, Codex CLI, and Gemini CLI coordinate in real-time. A tool claiming a task and starting implementation. The guardian agent running quality checks on the output. The planner decomposing a feature into subtasks. A security scan flagging a dependency vulnerability.

The feed shows tool assignments, task progress, file lock acquisitions and releases, knowledge captures, and governance events.

## What You Get

| Feature | What It Does |
|---------|-------------|
| Governance dashboard | Real-time health scores (A/B/C/D/F), 8 quality checks, trend monitoring |
| Tool activity feed | Watch Claude Code, Codex CLI, Gemini CLI coordinate: task claims, file locks, knowledge captures |
| Infinity Terminal | Browser-based terminal that survives close, disconnect, and restart |
| Command center | Execute Forge commands (`forge plan`, `forge status`) from the browser |
| Multi-device access | Phone, tablet, remote machine. All see the same state. |

58 React components. 4,165 tests. 87% coverage.

## Links

- [Forge Product Page](https://forge.nxtg.ai)
- [Forge Plugin](https://github.com/nxtg-ai/forge-plugin) (L1: Vibe Coder)
- [Forge Orchestrator](https://github.com/nxtg-ai/forge-orchestrator) (L2: Pro Builder)
- [Documentation](https://forge.nxtg.ai/docs)

## License

See [LICENSE](./LICENSE).

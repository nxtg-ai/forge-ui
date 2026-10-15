<p align="center">
  <img src="docs/images/forge-logo.png" alt="Forge" width="120">
</p>

# forge-ui

[![stage: public preview](https://img.shields.io/badge/stage-public_preview-blue)](STAGE)

**Stage: Public preview.** The Forge plugin and orchestrator are in alpha. This dashboard, forge-ui, was not part of the pre-registered core-job test behind that stage and is still a public preview.

**A browser dashboard for Forge.**

This is L3: Ship Lord.

forge-ui gives you a terminal in the browser (the Infinity Terminal), a governance dashboard with a project health score, and a command center that runs a fixed set of project commands from the browser. An agent activity feed is planned.

## Install

```bash
git clone --branch v3.5.2 https://github.com/nxtg-ai/forge-ui
cd forge-ui
npm install
npm run dev
```

Runs on its own. With the [Forge Orchestrator](https://github.com/nxtg-ai/forge-orchestrator) (L2: Pro Builder) installed, the health score comes from the orchestrator.

### Sign-in and network access

The dashboard asks for this install's access token the first time you open it. On the machine running Forge:

```bash
npx tsx src/server/auth/print-auth-url.ts      # or: node dist/server/auth/print-auth-url.js
```

Open the link it prints. The token is created on first run at `~/.config/nxtg-forge/ui-secret` (mode 0600); you can also paste it into the sign-in screen. Tools can send it as `Authorization: Bearer <token>`.

The dashboard (5050) and API server (5051) listen on `127.0.0.1` only. To open the dashboard from another device, set `FORGE_UI_HOST=0.0.0.0` (both servers bind to it, and the API prints a warning) and add the device-facing origin to `ALLOWED_ORIGINS`, e.g. `ALLOWED_ORIGINS=http://192.168.1.206:5050`. Every request still needs the token.

## The Infinity Terminal

A shell on the machine running forge-ui, in your browser. Browser tabs on the same project share one shell. If you close the tab or lose the network, the shell keeps running: reopen the page within 5 minutes and you are back in the same shell, though output from while you were away is not replayed. Restarting the forge-ui server ends the shell. Sessions that survive a server restart are planned.

## Governance Dashboard

The dashboard shows a project health score from 0 to 100. It comes from the Forge Orchestrator when that is installed, otherwise from the Forge plugin's governance health, otherwise from a local estimate that is labelled as one. A letter grade is planned.

Governance state is read from the project's `.claude/governance.json`. The UI displays it; policy decisions are made by Forge's other tools, not in the frontend.

## What You Get

| Feature | What It Does |
|---------|-------------|
| Governance dashboard | A 0-100 project health score and the project's governance state |
| Infinity Terminal | A browser terminal on a shared shell that survives a closed tab or a network drop, not a server restart |
| Command center | Runs project status, tests, a type-check and build pre-flight, and a gap analysis from the browser |
| Multi-device access | Open the dashboard from another device on your network (`FORGE_UI_HOST` plus `ALLOWED_ORIGINS`, see above) |

## Prerequisites

- Node.js 22.12 or later (Vite 7 needs `^20.19 || >=22.12`; `package.json` asks for Node 22)
- Optional: the [Forge Orchestrator](https://github.com/nxtg-ai/forge-orchestrator) in your project, for its health score

## Links

- [Forge Product Page](https://forge.nxtg.ai)
- [Forge Plugin](https://github.com/nxtg-ai/forge-plugin) (L1: Vibe Coder — start here if you're new)
- [Forge Orchestrator](https://github.com/nxtg-ai/forge-orchestrator) (L2: Pro Builder)
- [Documentation](https://forge.nxtg.ai/docs)

## License

Source available under the [Functional Source License 1.1 (FSL-1.1-ALv2)](./LICENSE.md). Converts to Apache License 2.0 on 2028-03-18. See [LICENSE.md](./LICENSE.md).

Versions up to and including v3.1.2 were published under the MIT License; FSL-1.1-ALv2 applies from v3.1.3 onward.

# NXTG-Forge UI — Claude Code Project Guide

## Product Architecture

The Infinity Terminal provides persistent browser terminal sessions through the public application stack:

```text
Browser (xterm.js) -> WebSocket -> PTY bridge -> shell
```

Session identity and reconnect logic should survive ordinary browser and network interruptions. Keep client URLs environment-neutral and use the documented proxy/configuration layer rather than developer-machine addresses.

## Development Rules

- Read the implementation before making architectural claims.
- Preserve session persistence and reconnect behavior.
- Prefer relative URLs and environment-driven configuration over hardcoded hosts or ports.
- Run the full test suite, typecheck, security audit, and build before release changes.
- Keep test coverage and meaningful assertions from regressing without explicit justification.
- Use synthetic fixtures and portable examples.

## Public / Private Boundary

This is a public repository. Do not commit private portfolio state, internal directives, agent handoffs, personal design workspaces, organization-internal runtime paths, private network addresses, machine topology, private cross-project memory configuration, credentials, or generated internal audit output.

Public agent guidance belongs in this file. Organization-internal runtime wiring must be injected outside the repository.

## Security

- Never commit environment secrets or private keys.
- Keep browser/API boundaries explicit and validate input crossing them.
- Do not publish developer-machine firewall rules, LAN addresses, private service endpoints, or internal voice/runtime services.
- Generated screenshots, reports, checkpoints, and session data remain local unless intentionally scrubbed for release.

## Release Discipline

Keep version metadata, changelog entries, tags, and release artifacts consistent. Do not bypass failing security, typecheck, test, or build gates to ship a release.

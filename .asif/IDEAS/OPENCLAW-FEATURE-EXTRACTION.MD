Brother, here’s a **SPEC.md blueprint** for what to strip from OpenClaw into nxtg-forge, focused on **contracts, system shape, and clean lifts** (not architectural opinions). It’s grounded in OpenClaw’s Gateway architecture, protocol, tooling model, sandboxing, approvals, plugin system, and operations runbooks. ([OpenClaw][1])

Also: OpenClaw’s ecosystem is already seeing **malicious “skills” distribution** risks; treat any skill registry concept as high-risk and design for verification and containment from day one. ([Tom's Hardware][2])

```md
# SPEC.md
# NXTG-FORGE Control Plane; OpenClaw Extraction Reference (Clean Lifts)

Version: 0.1
Status: Draft for implementation teams (Claude)
Owner: nxtg-forge agents (Architect, Implementer, Reviewer, Tester, Ops)

## 0) Purpose

Create a comprehensive extraction spec for what to lift from OpenClaw into nxtg-forge to accelerate a Control Plane product:
- Control plane Gateway design patterns
- Typed protocol contracts and code generation
- Devices (nodes) pairing, presence, and capabilities
- Tooling policy, sandboxing, approvals, and safety gates
- Plugin and extension architecture
- Operational runbooks, diagnostics, and release mechanics
- Minimal web interfaces patterns (dashboard, canvas hosting)

This document is informative and tactical; architectural decisions belong to nxtg-forge teams.

## 1) Scope and non-goals

### In scope
- Patterns that define a control plane that is always-on, observable, and safe-by-construction
- Contracts and testable interfaces (protocol frames, method schemas, events, approvals lifecycle)
- Operating procedures that reduce support burden (doctor, probe, status, audit)
- Plugin model that enables community and internal feature velocity with validation

### Out of scope
- Copying any OpenClaw code directly without license review and clean-room practices
- Feature parity for every chat surface, provider, or platform application
- Opinionated UI design decisions (the goal is to extract proven primitives, not clone UI)

## 2) Clean lift strategy (do not skip)

### 2.1 Clean-room extraction approach
1) Read and freeze the upstream behavior as contracts:
   - Protocol frames, request methods, event names, approvals state machine
   - Configuration schema shape and validation behavior
   - Sandbox and tool policy precedence rules
2) Implement a clean-room specification:
   - Rewrite in nxtg-forge terminology and package boundaries
   - Create contract tests that assert behavior, not implementation
3) Implement against the tests:
   - Teams choose language, framework, runtime
   - Must pass compatibility tests before merging
4) Maintain an “Upstream Delta Log”:
   - When OpenClaw changes, evaluate whether to incorporate deltas
   - Track with a dated changelog entry per lifted area

### 2.2 License and provenance gates
- Identify upstream licenses for any repository referenced
- Prefer lift via publicly documented behavior rather than code copy
- If code is referenced, require:
  - license compatibility review
  - attribution requirements
  - separate “vendor” boundary or reimplementation plan

## 3) Extraction inventory (what to strip and why)

### 3.1 Gateway (always-on daemon) patterns
Goal: single, long-lived control plane process that owns external surfaces and the event plane.

Liftables:
- “One Gateway per host” invariant
- Gateway as the single owner of channel/provider sessions (avoid multi-process contention)
- WebSocket server for control plane clients and nodes
- Separate canvas host / user interface host ports
- Event emission model: agent, chat, presence, health, heartbeat, scheduler/cron

Actionable lift tasks:
- Define Gateway responsibilities; explicitly list “must own” resources
- Define a Gateway lifecycle and supervision contract:
  - exits non-zero on fatal errors so supervisors restart it
  - supports verbose logging modes
  - supports a “force” option to reclaim ports safely

Tests:
- Gateway starts, binds, advertises health, and emits baseline heartbeat events
- Gateway restarts under supervisor without corrupting state
- Gateway refuses unsafe bind configurations without authentication

### 3.2 Typed WebSocket protocol contracts (control plane API)
Goal: stable contract between UI clients, command line interface, automations, and nodes.

Liftables:
- Frame types:
  - Request: { type: "req", id, method, params }
  - Response: { type: "res", id, ok, payload | error }
  - Event: { type: "event", event, payload, seq?, stateVersion? }
- First frame must be connect
- Protocol version negotiation (minimum protocol + maximum protocol)
- Schema-first approach using TypeScript schema definitions with generated JSON Schema and client models

Actionable lift tasks:
- Specify method surface in a versioned schema:
  - connect handshake requirements
  - health/status methods
  - presence queries
  - approvals resolve methods
- Implement code generation pipeline for:
  - TypeScript client types
  - Optional additional language client types (example: Swift)
- Enforce protocol version mismatch rejection in server

Tests:
- Client must send connect first; otherwise rejected
- Version negotiation behaves deterministically
- Server validates inbound frames against schema and rejects invalid payloads

### 3.3 Authentication, pairing, device identity, and token lifecycle
Goal: device-based trust and least-privilege for every connection.

Liftables:
- Token-based authentication on connect
- Device identity (stable identifier derived from keypair fingerprint)
- Device tokens issued after pairing; persisted client-side for future connects
- Token rotation and revocation capabilities
- Auto-approval rules for local connects only (loopback and same-host tailnet address patterns)

Actionable lift tasks:
- Define:
  - how device identity is created and stored
  - how pairing approvals are requested and granted
  - how device tokens are scoped (role + scopes)
- Provide operator methods for rotate and revoke
- Ensure new device identities are blocked until approved unless explicitly auto-approved under defined conditions

Tests:
- Unpaired device cannot perform privileged methods
- Paired device receives scoped device token
- Revoked token is rejected immediately

### 3.4 Roles, scopes, capabilities, and commands
Goal: explicit declaration of “what this client can do” at connection time.

Liftables:
- connect parameters include role and declared scopes
- Nodes declare role: node and an explicit list of capabilities and commands
- Presence model that shows a single device row even if it connects in multiple roles

Actionable lift tasks:
- Create a roles model:
  - operator (control plane user interface, command line interface, automations)
  - node (execution and sensor endpoints)
- Create scopes model:
  - pairing scope
  - approvals scope
  - admin scope
  - tool execution scope
- Define capability and command descriptors for nodes:
  - canvas.* camera.* screen.record location.get, and more as needed

Tests:
- Scope enforcement on every method
- Presence includes deviceId, roles, scopes

### 3.5 Exec tool, process management, and background sessions
Goal: predictable command execution with streaming, timeouts, and controllability.

Liftables:
- exec tool contract:
  - command, yield time, background mode, timeout
  - host target (sandbox, gateway, node)
  - request pseudo-terminal when needed
- Background process sessions:
  - return sessionId
  - process tool to poll, log, write, kill, clear sessions

Actionable lift tasks:
- Define a tool interface standard:
  - input schema
  - output schema
  - streaming events
  - error taxonomy
- Implement a background session registry with:
  - log retention policy
  - deterministic cleanup behavior

Tests:
- Background execution returns sessionId and emits “running” events
- process tool can kill and clean sessions
- Timeouts enforce termination

### 3.6 Exec approvals (host and node guardrail)
Goal: command execution is allowed only when policy + allowlist + optional approval agree.

Liftables:
- Approvals stored locally on execution host in a file:
  - ~/.openclaw/exec-approvals.json (analogous path to be decided for nxtg-forge)
- Defaults vs per-agent overrides
- Policy knobs:
  - security: deny | allowlist | full
  - ask: off | on-miss | always
  - askFallback: deny by default
  - autoAllowSkills boolean
  - allowlist entries per agent
- Approval request lifecycle:
  - exec returns status approval-pending with an approval identifier
  - gateway emits events for approval requested and resolved
- Allowlist enforcement uses resolved binary paths (not basename)
- Disallow chaining and redirection in allowlist mode; pipeline segments must be allowlisted

Actionable lift tasks:
- Specify the approvals state machine and event names
- Define storage format for approvals (versioned schema)
- Define the user interaction model:
  - approve/deny in user interface
  - optional forwarding to chat channels
- Define host enforcement logic:
  - strictly validate the command structure in allowlist mode
  - safe bins concept for stdin-only executables

Tests:
- Command that requires approval returns approval-pending
- Approval resolution triggers deterministic execution or denial
- Disallowed chaining and redirection is rejected under allowlist

### 3.7 Sandboxing model (Docker-based isolation)
Goal: reduce blast radius for tools; isolate filesystem and process access.

Liftables:
- Sandboxing is optional and configured per agent defaults and per agent overrides
- Gateway stays on host; tool execution runs inside Docker containers when enabled
- Modes:
  - off: no sandbox
  - non-main: sandbox only non-main sessions
  - all: sandbox all sessions
- Optional sandboxed browser management:
  - autostart behavior and timeout controls
  - allow host control explicitly with allowlists for custom targets
- Bind mount rules and warnings:
  - bind mounts pierce the sandbox boundary
  - read-only mode for sensitive mounts
  - avoid docker socket mounts unless intentionally granting host control

Actionable lift tasks:
- Define sandbox configuration schema with:
  - mode
  - scope
  - workspace mount access
  - bind mount rules
  - image selection and lifecycle
- Provide a sandbox inspector command:
  - prints effective sandbox mode and tool policy resolution
  - prints elevated gating resolution and “fix-it” config key paths

Tests:
- Tool execution goes into sandbox when configured
- Sandbox is not used when mode is off
- Inspector reflects effective computed settings accurately

### 3.8 Tool allow and deny policy; per provider controls
Goal: tools are explicitly permitted and composable.

Liftables:
- Global tool allow and deny lists
- Tool “profiles” (base allowlists)
- Per-agent tool policy overrides
- Provider-specific tool policy overrides
- Tool grouping patterns (example: group: filesystem tools)

Actionable lift tasks:
- Define a tool registry:
  - core tools
  - plugin tools
- Define policy precedence:
  - global profile then provider profile then per-agent allow/deny, with explicit resolution rules
- Enforce policy at tool dispatch time, not only in prompts

Tests:
- Disallowed tool cannot be invoked even if agent requests it
- Per-agent overrides take effect as specified by precedence rules

### 3.9 Plugin architecture and manifest validation
Goal: extensibility with strict manifests and configuration schema validation.

Liftables:
- Plugin loads as TypeScript module at runtime
- Plugin manifest file required:
  - openclaw.plugin.json equivalent
  - inline JSON Schema for config (even if empty)
- Plugin discovery precedence:
  - config paths
  - workspace extensions
  - global extensions
  - bundled extensions
- Plugin registration surface:
  - Gateway remote procedure call methods
  - Gateway Hypertext Transfer Protocol handlers
  - agent tools
  - command line interface commands
  - background services
  - optional config validation
  - skills directories
  - auto-reply commands

Actionable lift tasks:
- Define plugin manifest contract:
  - identifier, version, configSchema, skills directories
- Implement config validation that does not execute plugin code
- Implement plugin enable/disable and update flows with pinning support
- Security posture:
  - treat plugins as trusted code; require explicit enablement
  - prefer pinned versions for installs

Tests:
- Plugin without valid manifest cannot load
- Config validation fails fast on schema mismatch
- Plugin tool appears in registry only when enabled

### 3.10 Configuration system and state layout
Goal: predictable configuration, easy updates, and safe customization separation.

Liftables:
- Configuration stored outside the repository:
  - config file path (example: ~/.openclaw/openclaw.json) with JSON5 features
  - workspace directory (skills, prompts, memories)
- Strict schema validation and user interface hints
- Include support ($include) and merge behavior
- Environment variable substitution; optional shell environment mapping
- Multi-instance isolation via profiles and state directories
- Hot reload matrix with explicit “what reloads” list

Actionable lift tasks:
- Define:
  - state directory root
  - config file location
  - workspace root
- Provide config tooling:
  - configure command by section
  - validate command
  - apply and restart remote procedure call for live reload where safe
- Enforce consistent “cli config” vs “service config” resolution to avoid split-brain edits

Tests:
- Invalid config is rejected with actionable errors
- Includes resolve deterministically
- Hot reload updates only safe subsystems

### 3.11 Diagnostics and operational commands
Goal: reduce mean time to resolution and support overhead.

Liftables:
- gateway probe: debug everything; probe local and remote
- doctor: health checks and quick fixes; non-interactive safe behavior
- status and health commands
- troubleshooting rules:
  - bind modes require authentication for non-loopback
  - service install rewrite or force reinstall path
  - config mismatch detection and resolution guidance

Actionable lift tasks:
- Implement:
  - status for clients and nodes
  - health checks with verbose output option
  - doctor that can repair service wiring and chmod state/config where needed
  - gateway status that surfaces resolved port, bind, and last error

Tests:
- Probe finds expected gateways
- Doctor fix is idempotent and creates backups
- Troubleshooting output is deterministic

### 3.12 Web Control User Interface, dashboard, and canvas host
Goal: provide a control surface for approvals, visibility, and agent outputs.

Liftables:
- Canvas host serving agent-editable HyperText Markup Language for interactive surfaces
- Dashboard patterns for:
  - sessions
  - tools activity
  - presence and nodes
  - approvals queue and resolution

Actionable lift tasks:
- Specify canvas hosting contract:
  - port defaults
  - file server behavior
  - live reload policy
  - access policy and authentication requirements
- Specify dashboard data feed contract via WebSocket events

Tests:
- Canvas content updates reflect in user interface deterministically
- Approvals appear and resolve in user interface

### 3.13 Node hosts and remote access patterns
Goal: pair devices and delegate capabilities.

Liftables:
- Nodes connect to the same WebSocket server; declare role node
- Headless node host supports tool execution with approvals
- Node binding for execution when multiple nodes exist
- Node can advertise a browser proxy if browser is enabled

Actionable lift tasks:
- Implement node registration and capability advertisement
- Implement node execution binding
- Provide remote access patterns:
  - loopback local default
  - tailnet and local area network binds as explicit modes
  - auth required for non-loopback

Tests:
- Multiple nodes present; execution binds to chosen node
- Node capabilities are visible in presence and allow routing decisions

## 4) Security considerations to carry forward

### 4.1 Security audit and automatic fixes
Liftables:
- security audit command with deep probe option
- warnings for shared direct message sender scope settings
- warnings for small model usage without sandboxing while web or browser tools are enabled
- fix mode that tightens defaults and corrects file permissions

Actionable lift tasks:
- Define an audit rule pack:
  - insecure bind modes without auth
  - shared inbox session isolation
  - tool policy too permissive for declared threat model
  - sandbox disabled while risky tools enabled
- Provide an auto-fix mode with backups

### 4.2 Ecosystem supply chain risks (skills, plugins, registries)
Observed risks:
- malicious skills in public registries can execute arbitrary code and steal credentials

Actionable lift tasks:
- If nxtg-forge supports skill registries:
  - require signing or verification
  - isolate skill execution by default
  - show provenance and diffs in user interface
  - provide a safe install flow with pinning

## 5) Implementation playbook for agents (Claude)

### 5.1 Discovery and capture
- Read and snapshot upstream docs for each extraction area
- Enumerate upstream contract surface:
  - protocol methods, events, config keys, command line interface commands
- Build a Lift Matrix table:
  - Component
  - Contract artifacts (schemas, state machines, config)
  - Test artifacts (golden tests)
  - Implementation notes
  - Risks and footguns

### 5.2 Contract test harness
- Build a harness that can run:
  - protocol tests (connect, versioning, method calls)
  - approvals flow tests (pending, resolve, deny, timeout)
  - sandbox inspector output tests
  - configuration validation tests
- Use golden files for:
  - schema exports
  - example connect frames
  - example event payloads

### 5.3 Build and release mechanics
- Mirror the key operational mechanics:
  - protocol generation scripts
  - release runbook steps
  - version bump discipline
- Provide a “compatibility shim” pattern if renaming packages or commands

## 6) Source references (OpenClaw docs and repositories)

### Docs (primary)
- Gateway architecture
- Gateway protocol
- TypeBox protocol source of truth
- Gateway runbook
- Tools and tool policy
- Exec tool
- Exec approvals
- Sandboxing
- Sandbox vs tool policy vs elevated
- Plugin system and plugin manifest
- Plugin command line interface
- Configuration and configuration examples
- Troubleshooting and doctor
- Install and Windows via Windows Subsystem for Linux version 2 (WSL2)

### Repositories (primary)
- openclaw/openclaw (main)
- openclaw/skills (skills archive; treat as supply chain risk)
- openclaw org repositories list

### News / risk signals (optional but recommended reading)
- Malicious skills distribution targeting OpenClaw users

## 7) Link index (paste into tooling, do not rely on memory)

Primary docs:
https://docs.openclaw.ai/concepts/architecture
https://docs.openclaw.ai/gateway/protocol
https://docs.openclaw.ai/concepts/typebox
https://docs.openclaw.ai/gateway
https://docs.openclaw.ai/tools
https://docs.openclaw.ai/tools/exec
https://docs.openclaw.ai/tools/exec-approvals
https://docs.openclaw.ai/gateway/sandboxing
https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated
https://docs.openclaw.ai/plugin
https://docs.openclaw.ai/cli/plugins
https://docs.openclaw.ai/gateway/configuration
https://docs.openclaw.ai/gateway/troubleshooting
https://docs.openclaw.ai/cli/doctor
https://docs.openclaw.ai/cli/security
https://docs.openclaw.ai/install
https://docs.openclaw.ai/start/setup
https://docs.openclaw.ai/start/getting-started
https://docs.openclaw.ai/nodes

Repos:
https://github.com/openclaw/openclaw
https://github.com/openclaw/skills
https://github.com/openclaw

Release notes:
https://github.com/openclaw/openclaw/releases

Supply chain risk signal (skills malware reporting):
https://www.tomshardware.com/tech-industry/cyber-security/malicious-moltbot-skill-targets-crypto-users-on-clawhub
```

If you want, brother, next I can generate a **Lift Matrix table template** (component → contract → tests → ownership) that your Claude agents can fill in as they implement… and it’ll plug straight into your plan → state → checks loop.

[1]: https://docs.openclaw.ai/concepts/architecture "Gateway Architecture - OpenClaw"
[2]: https://www.tomshardware.com/tech-industry/cyber-security/malicious-moltbot-skill-targets-crypto-users-on-clawhub?utm_source=chatgpt.com "Malicious OpenClaw 'skill' targets crypto users on ClawHub - 14 malicious skills were uploaded to ClawHub last month"

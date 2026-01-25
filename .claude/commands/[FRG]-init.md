---
description: "Initialize NXTG-Forge in a project (new or upgrade existing)"
---

# NXTG-Forge Initialization

You are the **NXTG-Forge Installer** - an autonomous system that sets up the complete NXTG-Forge development infrastructure.

## Load Core Skills

- Load: `.claude/skills/core/nxtg-forge.md`

## Parse Arguments

Arguments received: `$ARGUMENTS`

Parse the mode:

- `--new`: Initialize brand new project
- `--upgrade`: Upgrade existing project to NXTG-Forge
- `--spec <file>`: Use existing spec file
- `--interactive`: Interactive spec building (default for --new)

## Execution Flow

### Mode: --new (Brand New Project)

**Step 1: Interactive Spec Building**

If no `--spec` provided, guide user through interactive spec creation:

```
Welcome to NXTG-Forge! Let's build your project together.

1. Project Basics:
   - Project name?
   - Project type? (web-app / api / cli / platform / mobile)
   - Brief description?

2. Architecture:
   - Backend language? (python / node / go / rust)
   - Backend framework? (fastapi / django / express / gin)
   - Database? (postgresql / mysql / mongodb)
   - Cache? (redis / memcached / none)
   
3. Frontend (if applicable):
   - Framework? (react / vue / svelte / none)
   - UI library? (tailwind / mui / chakra / custom)

4. Infrastructure:
   - Deployment target? (docker / kubernetes / serverless / vps)
   - CI/CD? (github-actions / gitlab-ci / custom)

5. Features:
   - Authentication? (jwt / oauth / none)
   - Payment processing? (stripe / square / none)
   - Real-time features? (websocket / sse / none)
   - File uploads? (s3 / local / none)

6. Quality Standards:
   - Minimum test coverage? (default: 85%)
   - Linting? (strict / moderate / relaxed)
   - Type checking? (strict / moderate / none)
```

Save responses to `.claude/tmp/spec-answers.json`

**Step 2: Generate Project Spec**

Use answers to generate comprehensive spec:

- Run: `forge spec-generator .claude/tmp/spec-answers.json`
- Output: `docs/PROJECT-SPEC.md`
- Validate spec with user
- Get approval before proceeding

**Step 3: Generate Complete Infrastructure**

Based on approved spec, generate ALL files:

```bash
# Generate core infrastructure
forge generate \
  --spec docs/PROJECT-SPEC.md \
  --output-dir . \
  --template-set full

# This auto-generates:
# - Directory structure
# - .claude/ configuration
# - All skills (architecture, coding-standards, domain-knowledge)
# - Agent configurations
# - Hooks
# - Docker/compose files
# - CI/CD configs
# - README and docs
# - Initial boilerplate code
```

**Step 4: Auto-Detect and Configure MCP Servers**

```bash
# Analyze spec and auto-configure MCP servers
forge mcp auto-configure \
  --spec docs/PROJECT-SPEC.md \
  --detect-integrations

# Example: If spec mentions "GitHub", auto-add GitHub MCP server
# Example: If spec uses PostgreSQL, auto-add postgres MCP server
# Example: If spec includes Stripe, auto-add Stripe MCP server
```

**Step 5: Initialize State**

```bash
# Create initial state.json
forge state init \
  --spec docs/PROJECT-SPEC.md \
  --phase setup

# Create first checkpoint
forge checkpoint create "Initial NXTG-Forge setup"
```

**Step 6: Initialize Git (if not exists)**

```bash
git init
git add .
git commit -m "chore: initialize project with NXTG-Forge"
```

**Step 7: Install Native Agents**

```bash
# Copy agent files to .claude/agents/
mkdir -p .claude/agents

# Copy all five native agents
cp {forge_root}/.claude/agents/agent-forge-orchestrator.md .claude/agents/
cp {forge_root}/.claude/agents/agent-forge-detective.md .claude/agents/
cp {forge_root}/.claude/agents/agent-forge-planner.md .claude/agents/
cp {forge_root}/.claude/agents/agent-forge-builder.md .claude/agents/
cp {forge_root}/.claude/agents/agent-forge-guardian.md .claude/agents/

# Verify agents are accessible
ls -la .claude/agents/agent-forge-*.md

# Register agents with status detection
forge agents register --verify
```

**Step 8: Setup Status Detection**

Create session start hook to detect forge status:

```bash
# Create hook that displays NXTG-FORGE status banner
forge hooks create session-start \
  --template forge-status-banner \
  --output .claude/hooks/on-session-start.sh

# Hook checks:
# 1. If .claude/agents/agent-forge-orchestrator.md exists
# 2. If forge services initialized
# 3. Displays appropriate banner (ENABLED or READY)
```

**Step 9: Report**

```
✅ NXTG-FORGE-ENABLED

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  Project: {project_name}                                 ║
║  Type: {project_type}                                    ║
║  Stack: {tech_stack}                                     ║
║                                                          ║
║  Your AI development infrastructure is active            ║
║  and watching your back.                                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

Generated Files:
  - 156 files created
  - 12,345 lines of code
  - 8 skills configured
  - 5 native agents installed
  - 5 MCP servers connected

Native Agents Available:
  🔄 Forge Orchestrator - Command center and coordination
  🔍 Forge Detective - Analysis and investigation
  🎯 Forge Planner - Feature planning and design
  ⚙️  Forge Builder - Implementation and coding
  🛡️  Forge Guardian - Quality and security

Next Steps:
  1. Review generated spec: docs/PROJECT-SPEC.md
  2. Check project state: /status
  3. Enable forge: /enable-forge
  4. Start development: /feature "first feature name"
  5. View available commands: /help

Quick Commands:
  /enable-forge    - Activate forge command center
  /status          - Show project state
  /feature "name"  - Add new feature
  /report          - View session activity
  /deploy          - Deploy application
```

---

### Mode: --upgrade (Upgrade Existing Project)

**Step 1: Analyze Existing Project**

```bash
# Scan current project
forge analyze-project \
  --output .claude/tmp/project-analysis.json

# Analysis includes:
# - Language/framework detection
# - File structure analysis
# - Dependency analysis
# - Existing tests
# - Documentation
# - Git history
# - Identified gaps
```

**Step 2: Generate Migration Plan**

```bash
# Create upgrade plan
forge plan-upgrade \
  --analysis .claude/tmp/project-analysis.json \
  --output .claude/tmp/upgrade-plan.json

# Plan includes:
# - Files to create
# - Files to modify
# - Skills to add
# - MCP servers to configure
# - Recommended refactoring
```

**Step 3: Show Plan to User**

```
NXTG-Forge Upgrade Plan
=======================

Current State:
  - 42 files detected
  - Python/FastAPI project
  - Basic structure exists
  - No tests found
  - Limited documentation

Proposed Changes:
  ✓ Add .claude/ infrastructure (12 files)
  ✓ Add comprehensive skills (8 files)
  ✓ Configure MCP servers (3 servers)
  ✓ Add testing infrastructure
  ✓ Add CI/CD pipeline
  ✓ Restructure to clean architecture
  ~ Refactor 15 files for standards compliance

Approve plan? (y/n)
```

**Step 4: Execute Upgrade**

```bash
# Apply upgrade incrementally
forge upgrade-apply \
  --plan .claude/tmp/upgrade-plan.json \
  --checkpoint-each-step \
  --backup-before-changes
```

**Step 5: Gap Analysis**

```bash
# Identify remaining improvements
forge gap-analysis \
  --output docs/GAP-ANALYSIS.md
```

**Step 6: Report**

```
✅ NXTG-Forge Upgrade Complete!

Changes Applied:
  - 45 files created
  - 15 files modified
  - 8 skills added
  - 6 agents configured
  - 3 MCP servers connected

Test Coverage Before: 0%
Test Coverage After: 45% (needs improvement)

Gap Analysis:
  📋 See docs/GAP-ANALYSIS.md for 12 recommended improvements

Next Steps:
  1. Review gap analysis: docs/GAP-ANALYSIS.md
  2. Check state: /status
  3. Address gaps: /feature "improve test coverage"
```

---

## Validation Checklist

Before completing initialization:

- [ ] `.claude/state.json` created and valid
- [ ] All required skills generated
- [ ] MCP servers configured and tested
- [ ] Hooks installed and executable
- [ ] Agent team configured
- [ ] Git repository initialized
- [ ] First checkpoint created
- [ ] Documentation complete

## Error Handling

If initialization fails at any step:

1. Auto-create error report: `.claude/init-error.log`
2. Restore to previous state if --upgrade
3. Provide clear error message and resolution steps
4. Save partial progress to `.claude/tmp/partial-init.json`

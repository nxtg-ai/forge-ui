# Product Files vs Runtime Generated Files

## THE PROBLEM

When YOU dog-food NXTG-Forge to build NXTG-Forge, it generates runtime artifacts.

When USERS `git clone` the repo, they need a **CLEAN, FRESH EXPERIENCE** - not YOUR runtime data!

---

## WHAT SHIPS (Product/Default Files)

###`.claude/` Files TO SHIP:

✅ **Agents** (Forge system agents)
- `.claude/agents/*.md` - ALL agent definitions
  - `[AFRG]-builder.md`, `[AFRG]-detective.md`, `[AFRG]-guardian.md`, etc.

✅ **Commands** (Forge slash commands)
- `.claude/commands/*.md` - ALL command definitions
  - `[FRG]-init.md`, `[FRG]-feature.md`, `[FRG]-test.md`, etc.

✅ **Hooks** (Forge event hooks)
- `.claude/hooks/*.md` - ALL hook definitions
  - `pre-commit.md`, `post-tool-use.md`, `session-start-forge.md`, etc.

✅ **Skills** (Forge knowledge base)
- `.claude/skills/*.md` - ALL skill files
  - `architecture.md`, `coding-standards.md`, `testing-strategy.md`, etc.

✅ **Prompts** (Default prompts)
- `.claude/prompts/*.md` - ALL prompt templates
  - `code-review.md`, `feature-implementation.md`, `bug-fix.md`, etc.

✅ **Workflows** (Workflow scripts)
- `.claude/workflows/*.sh` - ALL workflow scripts
  - `tdd-workflow.sh`, `refactor-bot.sh`, `code-review.sh`, etc.

✅ **Templates** (Generation templates)
- `.claude/templates/**/*` - ALL templates

✅ **Config Files** (Default configurations)
- `.claude/config.json` - Default project config
- `.claude/settings.json` - Default settings
- `.claude/forge.config.json` - Default forge config
- `.claude/forge/config.yml` - Forge config
- `.claude/forge/AUTO-SETUP.md` - Setup documentation

✅ **Template Files** (Empty templates for users)
- `.claude/state.json.template` - State template
- `.claude/ALIGNMENT.md` - Empty decision log template
- `.claude/THOUGHTS.md` - Empty scratchpad template

---

## WHAT DOESN'T SHIP (Runtime/Generated Files)

### `.claude/` Files to GITIGNORE:

❌ **User's Vision**
- `.claude/VISION.md` - User's actual vision content
- `.claude/vision-events.json` - Vision usage history

❌ **Runtime State**
- `.claude/forge/state.json` - Current session state
- `.claude/state/` - Runtime state directory (all *.json files)

❌ **Runtime Directories**
- `.claude/memory/` - Session memory (generated at runtime)
- `.claude/checkpoints/` - User checkpoints
- `.claude/features/` - Generated feature specs
- `.claude/reports/` - Generated reports

❌ **Runtime Markers**
- `.claude/FORGE-ENABLED` - Runtime marker file
- `.claude/MIGRATION-COMPLETE.md` - Migration artifact (your specific migration)

❌ **User-Specific Overrides**
- `.claude/**/*.local.md`
- `.claude/**/*.local.json`
- `.claude/**/*.local.yml`

---

## GITIGNORE STRATEGY

### Current .gitignore needs to be SELECTIVE:

```gitignore
# ============================================================
# RUNTIME FILES (Generated when users run NXTG-Forge)
# ============================================================

# User's personal vision and history
.claude/VISION.md
!.claude/VISION.template.md
.claude/vision-events.json

# Runtime state and session data
.claude/forge/state.json
.claude/state/
!.claude/state.json.template

# Runtime generated directories
.claude/memory/*
.claude/checkpoints/*
.claude/features/*
.claude/reports/*

# Keep directory structure but ignore contents
!.claude/memory/.gitkeep
!.claude/checkpoints/.gitkeep
!.claude/features/.gitkeep
!.claude/reports/.gitkeep

# Runtime markers
.claude/FORGE-ENABLED
.claude/MIGRATION-COMPLETE.md

# User-specific override files
.claude/**/*.local.md
.claude/**/*.local.yml
.claude/**/*.local.json

# ============================================================
# WHAT SHIPS (Product/Default files - these ARE committed)
# ============================================================
# Everything else in .claude/ that's not listed above!
```

---

## INITIALIZATION SYSTEM

When a user runs NXTG-Forge for the first time:

```typescript
// src/core/initialization.ts

export async function initializeUserEnvironment() {
  const claudeDir = '.claude';

  // 1. Create runtime directories
  await ensureDir(`${claudeDir}/memory`);
  await ensureDir(`${claudeDir}/checkpoints`);
  await ensureDir(`${claudeDir}/features`);
  await ensureDir(`${claudeDir}/reports`);
  await ensureDir(`${claudeDir}/state`);

  // 2. Copy templates to user files (if they don't exist)
  if (!exists(`${claudeDir}/VISION.md`)) {
    await copy(
      `${claudeDir}/VISION.template.md`,
      `${claudeDir}/VISION.md`
    );
  }

  if (!exists(`${claudeDir}/forge/state.json`)) {
    await copy(
      `${claudeDir}/state.json.template`,
      `${claudeDir}/forge/state.json`
    );
  }

  // 3. Mark as initialized
  await writeFile(`${claudeDir}/FORGE-ENABLED`, new Date().toISOString());

  console.log('✓ NXTG-Forge initialized! Ready to capture your vision.');
}
```

---

## USER EXPERIENCE

### Clean Clone Experience:

```bash
# User clones the repo
git clone https://github.com/you/nxtg-forge
cd nxtg-forge
npm install

# They have:
✅ All agents, commands, hooks, skills (PRODUCT FILES)
✅ Empty runtime directories (.claude/memory/, etc.)
✅ Template files (.claude/VISION.template.md)
❌ NO runtime state or vision data

# First run:
npm run dev

# System detects first run, initializes:
# - Creates .claude/VISION.md from template
# - Creates .claude/forge/state.json from template
# - Creates .claude/FORGE-ENABLED marker
# - User gets fresh, clean experience!
```

### Dog-Fooding Experience (You):

```bash
# You work on NXTG-Forge using NXTG-Forge
# It generates:
- .claude/VISION.md (your vision for NXTG-Forge)
- .claude/vision-events.json (your usage history)
- .claude/forge/state.json (your session state)
- .claude/memory/* (your session memory)
- .claude/checkpoints/* (your checkpoints)

# You commit product changes:
git add .claude/agents/new-agent.md
git add .claude/commands/new-command.md
git add src/

# Git status shows:
M .claude/agents/new-agent.md      ✅ Product file (commit this)
M .claude/commands/new-command.md  ✅ Product file (commit this)
M src/core/something.ts            ✅ Product code (commit this)

# .claude/VISION.md WON'T show up (gitignored)
# .claude/forge/state.json WON'T show up (gitignored)
```

---

## CURRENT STATE AUDIT

Run this to see what's currently tracked that shouldn't be:

```bash
git ls-files .claude/ | grep -E "(VISION\.md|vision-events\.json|state\.json|FORGE-ENABLED|MIGRATION-COMPLETE)"
```

If anything shows up, remove it:
```bash
git rm --cached .claude/VISION.md
git rm --cached .claude/vision-events.json
git rm --cached .claude/forge/state.json
git rm --cached .claude/FORGE-ENABLED
git rm --cached .claude/MIGRATION-COMPLETE.md
```

---

## TEMPLATES TO CREATE

Need to create these templates:

1. **`.claude/VISION.template.md`**
```markdown
---
version: 1.0
created: [auto-filled]
updated: [auto-filled]
---

# Canonical Vision

## Mission
[Describe your mission]

## Principles
[Your guiding principles]

## Strategic Goals
[Your strategic goals]

## Current Focus
[What you're focusing on now]

## Success Metrics
[How you'll measure success]
```

2. **`.claude/state.json.template`** (already exists)

3. **`.claude/memory/.gitkeep`**
4. **`.claude/checkpoints/.gitkeep`**
5. **`.claude/features/.gitkeep`**
6. **`.claude/reports/.gitkeep`**

---

## SUMMARY

**Product Files (SHIP):**
- Agents, commands, hooks, skills, prompts, workflows
- Config files, templates
- Empty template files (VISION.template.md, etc.)

**Runtime Files (GITIGNORE):**
- VISION.md (user's actual vision)
- vision-events.json (usage history)
- forge/state.json (session state)
- memory/, checkpoints/, features/, reports/ (runtime dirs)
- FORGE-ENABLED, MIGRATION-COMPLETE.md (markers)

**The Goal:**
- Users git clone and get ALL the product features
- Users run it and get a FRESH, CLEAN experience
- Your dog-fooding data NEVER pollutes the public repo
- Magic! ✨

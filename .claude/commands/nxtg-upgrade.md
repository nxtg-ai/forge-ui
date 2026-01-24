---
name: nxtg-upgrade
description: Upgrade from v2.1 (bash scripts) to v3.0 (pure Claude Code)
category: core
---

# NXTG-Forge Upgrade: v2.1 → v3.0

**Seamlessly migrate from bash scripts to pure Claude Code commands.**

## When I Execute This Command

I will detect your v2.1 installation, archive bash scripts, migrate state, install v3.0, and celebrate your upgrade—all automatically.

## What This Upgrades

### From v2.1 (Bash Scripts)
- `./init.sh` → Archived
- `./verify-setup.sh` → Archived
- Manual execution → Pure Claude Code commands

### To v3.0 (Claude Code Native)
- `/nxtg-init` - Initialize in conversation
- `/nxtg-verify` - Validate with auto-fix
- `/nxtg-status` - Live dashboard
- All 20 `/nxtg-*` commands

## Execution Flow

### Step 1: Detection & Analysis

Check for v2.1 installation:
- Look for `init.sh` in project root or NXTG-Forge directory
- Look for `verify-setup.sh`
- Check for existing `.claude/` structure
- Check for `state.json`

**Display findings**:
```
╔══════════════════════════════════════════════════════════╗
║          NXTG-FORGE v2.1 → v3.0 UPGRADE                   ║
║           From Bash Scripts to Claude Code                ║
╚══════════════════════════════════════════════════════════╝

🔍 Analyzing current installation...

Found v2.1 components:
  ✅ init.sh detected
  ✅ verify-setup.sh detected
  ✅ .claude/ directory exists
  ✅ state.json found (will migrate)

Ready to upgrade to v3.0!
```

### Step 2: Backup Creation

Create safety backup before any changes:
```bash
# Create backup directory
mkdir -p scripts/archive/v2.1-backup-$(date +%Y%m%d-%H%M%S)

# Backup critical files
cp init.sh scripts/archive/v2.1-backup-*/
cp verify-setup.sh scripts/archive/v2.1-backup-*/
cp -r .claude scripts/archive/v2.1-backup-*/

# Show backup location
```

**Display**:
```
💾 Creating backup...
   ├─ Backup location: scripts/archive/v2.1-backup-20260123-143022/
   ├─ Backed up: init.sh ✅
   ├─ Backed up: verify-setup.sh ✅
   └─ Backed up: .claude/ directory ✅

Backup complete! Safe to proceed.
```

### Step 3: Archive Bash Scripts

Move bash scripts to archive (don't delete):
```bash
mkdir -p scripts/archive/
mv init.sh scripts/archive/init-v2.1.sh
mv verify-setup.sh scripts/archive/verify-setup-v2.1.sh

# Create README in archive
cat > scripts/archive/README.md <<EOF
# NXTG-Forge v2.1 Archive

These bash scripts were used in v2.1 but are deprecated in v3.0.

## v2.1 (Deprecated)
- init-v2.1.sh - Manual project initialization
- verify-setup-v2.1.sh - Setup validation

## v3.0 (Current)
Use Claude Code commands instead:
- /nxtg-init - Initialize project
- /nxtg-verify - Validate setup

Archived on: $(date)
EOF
```

**Display**:
```
📦 Archiving v2.1 bash scripts...
   ├─ init.sh → scripts/archive/init-v2.1.sh ✅
   ├─ verify-setup.sh → scripts/archive/verify-setup-v2.1.sh ✅
   └─ Created archive README ✅

Bash scripts safely archived.
```

### Step 4: State Migration

Migrate `state.json` to v3.0 schema if exists:

**Check schema version**:
```bash
# Read current state.json
CURRENT_VERSION=$(jq -r '.schema_version // "2.0"' .claude/forge/state.json)

if [ "$CURRENT_VERSION" = "2.0" ]; then
  echo "State schema is v2.0, migration to v3.0 needed"
else
  echo "State already at v3.0+"
fi
```

**Migrate if needed**:
```json
// v2.0 schema
{
  "schema_version": "2.0",
  "session": {...},
  "context": {...}
}

// v3.0 schema (enhanced)
{
  "schema_version": "3.0",
  "session": {
    "id": "...",
    "started_at": "...",
    "last_updated": "...",
    "token_usage": {...},
    "upgrade_history": [
      {
        "from_version": "2.1",
        "to_version": "3.0",
        "upgraded_at": "2026-01-23T14:30:22Z",
        "migration_applied": true
      }
    ]
  },
  "context": {...},
  "recovery": {...},
  "engagement_quality": {...}
}
```

**Display**:
```
🔄 Migrating state.json...
   ├─ Current schema: v2.0
   ├─ Target schema: v3.0
   ├─ Adding upgrade history ✅
   ├─ Validating JSON syntax ✅
   └─ State migration complete ✅

State successfully upgraded to v3.0 schema.
```

### Step 5: Command Suite Installation

Ensure all 20 v3.0 commands are installed:
```bash
# Verify all /nxtg-* commands exist
COMMANDS=(
  nxtg-init
  nxtg-verify
  nxtg-status
  nxtg-enable-forge
  nxtg-feature
  nxtg-integrate
  nxtg-spec
  nxtg-gap-analysis
  nxtg-deploy
  nxtg-checkpoint
  nxtg-continue
  nxtg-restore
  nxtg-report
  nxtg-docs-audit
  nxtg-docs-status
  nxtg-docs-update
  nxtg-upgrade
  nxtg-agent-assign
  nxtg-status-enhanced
  nxtg-compact
  nxtg-export
)

# Check each command
for cmd in "${COMMANDS[@]}"; do
  if [ -f ".claude/commands/$cmd.md" ]; then
    echo "✅ $cmd"
  else
    echo "⚠️ $cmd missing - will install"
  fi
done
```

**Display**:
```
⚡ Verifying v3.0 command suite...
   ├─ Core commands (5)         ✅ All present
   ├─ Feature commands (7)      ✅ All present
   ├─ State commands (4)        ✅ All present
   ├─ Docs commands (3)         ✅ All present
   └─ Advanced commands (4)     ✅ All present

Total: 20/20 commands registered ✅
```

### Step 6: Hook Installation

Ensure all v3.0 hooks are installed and executable:
```bash
# Check hooks
HOOKS=(
  session-start.sh
  session-end.sh
  pre-compact.sh
  post-task.sh
  pre-tool-use.sh
  post-tool-use.sh
)

for hook in "${HOOKS[@]}"; do
  if [ -f ".claude/hooks/$hook" ]; then
    chmod +x ".claude/hooks/$hook"
    echo "✅ $hook (executable)"
  else
    echo "⚠️ $hook missing"
  fi
done
```

**Display**:
```
🎯 Configuring v3.0 hooks...
   ├─ session-start.sh          ✅ Executable
   ├─ session-end.sh            ✅ Executable
   ├─ pre-compact.sh            ✅ Executable
   ├─ post-task.sh              ✅ Executable
   ├─ pre-tool-use.sh           ✅ Executable
   └─ post-tool-use.sh          ✅ Executable

All hooks configured and ready.
```

### Step 7: Validation

Run comprehensive validation (same as `/nxtg-verify`):
- Directory structure
- Agent frontmatter
- Command registration
- Hook executability
- State management
- Git configuration

**Display**:
```
🔍 Running validation...

📁 Directory Structure              ✅ Perfect
📝 Agent Frontmatter (7 files)     ✅ All valid
⚡ Command Registration (20 files)  ✅ All valid
🎯 Hook Executability (6 files)    ✅ All ready
💾 State Management                 ✅ v3.0 schema
🔒 Git Configuration                ✅ Configured

Validation: 42/42 checks passed ✅
```

### Step 8: Success Celebration

**Display**:
```
╔══════════════════════════════════════════════════════════╗
║              ✅ UPGRADE COMPLETE: v2.1 → v3.0            ║
╠══════════════════════════════════════════════════════════╣
║  Time: 12 seconds                                         ║
║  Scripts archived: 2                                      ║
║  Commands installed: 20                                   ║
║  Hooks configured: 6                                      ║
║  State migrated: v2.0 → v3.0                             ║
║  Validation: 100% (42/42 checks)                         ║
╚══════════════════════════════════════════════════════════╝

🎉 Welcome to NXTG-Forge v3.0!

What's New:
  • Pure Claude Code commands (no more bash scripts!)
  • Grouped discovery via /nx autocomplete
  • Live dashboard with /nxtg-status --live
  • Smart suggestions throughout
  • Automatic state persistence via hooks
  • Enhanced error recovery
  • 20 powerful commands at your fingertips

What Changed:
  ❌ ./init.sh → ✅ /nxtg-init
  ❌ ./verify-setup.sh → ✅ /nxtg-verify
  ❌ Manual execution → ✅ Conversation-native

Your v2.1 bash scripts are safely archived in:
  scripts/archive/v2.1-backup-20260123-143022/

Next Steps:
  1. Try: /nxtg-status (see your project state)
  2. Discover: /nx (see all commands)
  3. Build: /nxtg-feature "your idea"

From Exhaustion to Empowerment - Now powered by v3.0! 🚀
```

## Error Handling

### If v2.1 Not Detected

```
⚠️ v2.1 Installation Not Found

I looked for:
  • init.sh (not found)
  • verify-setup.sh (not found)

This might mean:
  1. You're already on v3.0 (check with /nxtg-status)
  2. v2.1 wasn't installed in this project
  3. Scripts were manually deleted

Want to do a fresh v3.0 installation instead?
  → Use /nxtg-init
```

### If Migration Fails

```
❌ Migration Failed

Issue: state.json has invalid JSON syntax

Fix applied:
  ✅ Created backup: .claude/forge/state.json.bak
  ✅ Generated fresh v3.0 state.json

Your old state is preserved in state.json.bak
Review the backup if needed.

Retrying validation... ✅ Success!
```

### If Backup Directory Exists

```
⚠️ Backup directory already exists:
  scripts/archive/v2.1-backup-20260123-143022/

Options:
  1. Create new backup with timestamp
  2. Skip backup (not recommended)
  3. Cancel upgrade

Recommended: Option 1 (creating new backup...)
```

## Implementation

Use Claude Code tools only:
- **Read**: Check existing files
- **Write**: Create archive README, update state.json
- **Bash**: Move files, chmod hooks, validation checks
- **Glob**: Find all command files
- **Edit**: Update state.json schema version

**NO manual user intervention required.**

## Success Criteria

✅ v2.1 bash scripts archived safely
✅ State migrated to v3.0 schema
✅ All 20 commands installed
✅ All 6 hooks configured
✅ Validation passes 100%
✅ Backup created for safety
✅ User celebrates the upgrade

## Rollback (If Needed)

```bash
/nxtg-upgrade --rollback
```

Restores from most recent backup:
- Restores init.sh, verify-setup.sh
- Restores .claude/ directory
- Restores state.json
- Validates v2.1 installation

**Only use if upgrade fails catastrophically.**

---

**Make upgrading delightful, not stressful.**

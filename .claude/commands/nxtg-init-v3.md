---
name: nxtg-init-v3
description: Initialize NXTG-Forge v3.0 with intelligent scenario detection
category: core
---

# NXTG-Forge v3.0 Intelligent Installer

**Smart detection. Perfect experience. Zero confusion.**

## When I Execute This Command

I will silently detect your installation scenario and provide the perfect experience - whether fresh install, upgrade, or repair.

## Implementation Flow

### Step 1: Silent Detection Phase

Before displaying ANYTHING, I will check:

1. **Bash scripts** (init.sh, verify-setup.sh)
2. **State file** (.claude/forge/state.json)
3. **Claude structure** (.claude/commands/*.md)
4. **Version markers** (manifest.json)

Based on findings, determine scenario:
- **FRESH**: No Forge artifacts found
- **UPGRADE_V2**: v2.x bash scripts or state found
- **REINSTALL_V3**: v3.0 already installed
- **CORRUPTED**: Partial/broken installation

### Step 2: Execute Appropriate Flow

#### Scenario: FRESH Installation

Display:
```
╔══════════════════════════════════════════════════════════╗
║               NXTG-FORGE v3.0 INSTALLER                   ║
║            From Exhaustion to Empowerment™                ║
╚══════════════════════════════════════════════════════════╝

Analyzing your project...

Project Details:
  Type: [Detected project type]
  Files: [Count] source files detected
  Repository: ✅ Git initialized

Ready to install NXTG-Forge v3.0

This will:
  • Create .claude/ infrastructure (156 files)
  • Install 5 intelligent agents
  • Register 20 powerful commands
  • Configure 6 automation hooks
  • Initialize state management

Installation time: ~15 seconds
```

Then proceed with installation showing:
```
Creating infrastructure...
  .claude/ structure           [████████████████████] 100%
  State management            [████████████████████] 100%
  Documentation               [████████████████████] 100%

Installing intelligent agents (5 total)...
  [Progress for each agent]

Registering commands (20 total)...
  [Progress for command groups]

Configuring automation hooks...
  [Progress for hooks]
```

Complete with:
```
╔══════════════════════════════════════════════════════════╗
║           ✨ INSTALLATION COMPLETE ✨                      ║
╠══════════════════════════════════════════════════════════╣
║  Version: 3.0.0                                           ║
║  Time: [actual] seconds                                   ║
║  Files created: [count]                                   ║
║  Commands available: 20                                   ║
║  Agents ready: 5                                          ║
╚══════════════════════════════════════════════════════════╝

🎉 Your project is now FORGE-ENABLED!

Quick Start Guide:
  1. See your project state: /nxtg-status
  2. Explore commands: Type /nx[TAB]
  3. Build features: /nxtg-feature "your idea"

Welcome to effortless development! 🚀
```

#### Scenario: UPGRADE from v2.x

Display:
```
╔══════════════════════════════════════════════════════════╗
║            NXTG-FORGE UPGRADE DETECTED                    ║
║                  v2.1 → v3.0                              ║
╚══════════════════════════════════════════════════════════╝

Current Installation:
  Version: NXTG-Forge v2.1 (bash scripts)
  Components found:
    ✓ init.sh
    ✓ verify-setup.sh
    ✓ .claude/ directory
    ✓ state.json (v2.0 schema)

Upgrade Benefits:
  • NO MORE bash script execution
  • Commands run directly in Claude
  • Faster, more reliable, zero dependencies
  • Enhanced state management
  • Automatic error recovery

Safety First:
  ✅ Full backup will be created
  ✅ Scripts archived (not deleted)
  ✅ State data preserved & migrated
  ✅ Rollback available if needed

This upgrade is recommended. Proceed? (yes/no):
```

If yes, proceed with upgrade showing progress and complete with upgrade success message.

#### Scenario: REINSTALL v3.0

Display:
```
╔══════════════════════════════════════════════════════════╗
║          NXTG-FORGE v3.0 ALREADY INSTALLED               ║
╚══════════════════════════════════════════════════════════╝

Current Installation:
  Version: 3.0.0
  Commands: 20 registered
  Agents: 5 active
  State: Healthy ✅

Your installation is working perfectly!

Available actions:
  • /nxtg-verify - Validate installation integrity
  • /nxtg-status - View project state
  • /nxtg-feature - Build a new feature

No action needed - you're ready to build!
```

#### Scenario: CORRUPTED Installation

Display:
```
╔══════════════════════════════════════════════════════════╗
║         ⚠️ INCOMPLETE FORGE INSTALLATION DETECTED         ║
╚══════════════════════════════════════════════════════════╝

Installation Issues Found:
  [List specific issues found]

Recommended Action: Repair Installation

This will:
  • Restore missing components
  • Rebuild state management
  • Validate all systems
  • Preserve existing work

Proceed with repair? (yes/no):
```

### Step 3: Installation Actions

#### For FRESH Install:

1. Create directory structure:
```bash
mkdir -p .claude/{agents,commands,hooks,skills,templates,forge}
mkdir -p docs/{architecture,design,testing,workflow,sessions,features,guides,api}
```

2. Create manifest.json:
```json
{
  "name": "NXTG-Forge",
  "version": "3.0.0",
  "installed_at": "[timestamp]",
  "installation_id": "[uuid]"
}
```

3. Create state.json:
```json
{
  "schema_version": "3.0",
  "forge_version": "3.0.0",
  "session": {
    "id": "[uuid]",
    "started_at": "[timestamp]",
    "installation_type": "fresh"
  },
  "context": {},
  "metrics": {
    "commands_available": 20,
    "agents_installed": 5,
    "hooks_configured": 6
  }
}
```

4. Copy all template files with progress indication

5. Make hooks executable:
```bash
chmod +x .claude/hooks/*.sh
```

6. Update .gitignore if needed

#### For UPGRADE:

1. Create backup:
```bash
mkdir -p .forge-backup/v2.1-[timestamp]
cp -r init.sh verify-setup.sh .claude/ .forge-backup/v2.1-[timestamp]/
```

2. Archive bash scripts:
```bash
mkdir -p scripts/archive
mv init.sh scripts/archive/init-v2.1.sh
mv verify-setup.sh scripts/archive/verify-setup-v2.1.sh
```

3. Migrate state.json to v3.0 schema

4. Install/update all v3.0 components

5. Run validation

#### For REPAIR:

1. Identify missing components
2. Restore only what's missing
3. Validate state integrity
4. Update manifest

### Step 4: Validation

Run comprehensive checks:
- Directory structure complete
- All commands registered
- Agents have valid frontmatter
- Hooks are executable
- State.json valid
- Git configured properly

### Step 5: Success Celebration

Provide clear next steps based on scenario:
- FRESH: Quick start guide
- UPGRADE: What changed guide
- REPAIR: Verification steps

## Critical Requirements

✅ **NO confusion about versions**
- Fresh installs NEVER mention v2.x
- Only upgrades show version comparison

✅ **Professional progress indicators**
- Real progress bars
- Clear section headers
- Success checkmarks

✅ **Smart detection before output**
- Analyze silently first
- Show appropriate flow
- Never confuse user

✅ **Clear success metrics**
- Time taken
- Files created/modified
- Features enabled

✅ **Actionable next steps**
- Specific commands to try
- Clear value propositions
- Excitement building

## Error Handling

Never show generic errors. Always:
1. Explain what happened
2. Show how to fix it
3. Offer alternatives
4. Maintain professional tone

Example:
```
⚠️ Unable to create .claude/ directory

This might be because:
  • Permission issues in current directory
  • Directory already exists and is protected

Solutions:
  1. Check write permissions: ls -la
  2. Try with elevated permissions if needed
  3. Choose a different project directory

Need help? The issue is likely [specific diagnosis].
```

## Success Criteria

The installation must:
- Take less than 20 seconds
- Show clear progress throughout
- Never confuse fresh vs upgrade
- Celebrate completion appropriately
- Provide immediate value
- Build user confidence

**From Exhaustion to Empowerment - in under 20 seconds!**
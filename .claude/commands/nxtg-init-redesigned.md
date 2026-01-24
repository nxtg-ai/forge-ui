---
name: nxtg-init-redesigned
description: Professional NXTG-Forge v3.0 installation with intelligent detection
category: core
---

# NXTG-Forge Professional Installation System

**Intelligent detection. Perfect experience. Zero confusion.**

## Detection Logic (Executed Silently)

Before ANY output, I will analyze the project state:

```typescript
interface InstallationState {
  scenario: 'FRESH' | 'UPGRADE_V2' | 'REINSTALL_V3' | 'CORRUPTED';
  evidence: {
    hasClaudeDir: boolean;
    hasBashScripts: boolean;
    stateVersion: string | null;
    forgeVersion: string | null;
    hasV2Artifacts: boolean;
    hasV3Commands: boolean;
  };
}
```

### Detection Priority Order

1. **Check for v2.x bash scripts** (init.sh, verify-setup.sh)
   → If found: UPGRADE_V2 scenario

2. **Check for .claude/forge/state.json**
   → Parse version field
   → If v2.x: UPGRADE_V2 scenario
   → If v3.x: REINSTALL_V3 scenario
   → If corrupted: CORRUPTED scenario

3. **Check for .claude/ directory with commands**
   → If has /nxtg-* commands: REINSTALL_V3 scenario
   → If empty/partial: CORRUPTED scenario

4. **No Forge artifacts found**
   → FRESH scenario

## Scenario 1: FRESH Installation

**User Experience:**

```
╔══════════════════════════════════════════════════════════╗
║               NXTG-FORGE v3.0 INSTALLER                   ║
║            From Exhaustion to Empowerment™                ║
╚══════════════════════════════════════════════════════════╝

Analyzing your project...

Project Details:
  Type: Python/FastAPI application
  Files: 142 source files detected
  Repository: ✅ Git initialized

Ready to install NXTG-Forge v3.0

This will:
  • Create .claude/ infrastructure (156 files)
  • Install 5 intelligent agents
  • Register 20 powerful commands
  • Configure 6 automation hooks
  • Initialize state management

Installation time: ~15 seconds

Press Enter to begin installation...
```

**Installation Progress:**

```
╭─────────────────────────────────────────────────────────╮
│ Installing NXTG-Forge v3.0                              │
╰─────────────────────────────────────────────────────────╯

Creating infrastructure...
  .claude/ structure           [████████████████████] 100%
  State management            [████████████████████] 100%
  Documentation               [████████████████████] 100%

Installing intelligent agents (5 total)...
  Core Agent                  [████████████████████] ✅
  Feature Architect          [████████████████████] ✅
  Quality Guardian           [████████████████████] ✅
  Integration Expert         [████████████████████] ✅
  Documentation Master       [████████████████████] ✅

Registering commands (20 total)...
  Core commands (5)          [████████████████████] ✅
  Feature commands (7)       [████████████████████] ✅
  State commands (4)         [████████████████████] ✅
  Documentation (4)          [████████████████████] ✅

Configuring automation hooks...
  Session management         [████████████████████] ✅
  State persistence         [████████████████████] ✅
  Quality checks            [████████████████████] ✅
```

**Success Celebration:**

```
╔══════════════════════════════════════════════════════════╗
║           ✨ INSTALLATION COMPLETE ✨                      ║
╠══════════════════════════════════════════════════════════╣
║  Version: 3.0.0                                           ║
║  Time: 14.2 seconds                                       ║
║  Files created: 156                                       ║
║  Commands available: 20                                   ║
║  Agents ready: 5                                          ║
╚══════════════════════════════════════════════════════════╝

🎉 Your project is now FORGE-ENABLED!

Quick Start Guide:

  1. See your project state:
     /nxtg-status

  2. Explore available commands:
     Type /nx[TAB] to see all commands

  3. Build your first feature:
     /nxtg-feature "describe your feature"

Welcome to effortless development! 🚀
```

## Scenario 2: UPGRADE from v2.x

**User Experience:**

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

Ready to upgrade to v3.0?

  [Y] Yes, upgrade now (recommended)
  [B] Create backup only
  [C] Cancel

Choice: _
```

**Upgrade Progress:**

```
╭─────────────────────────────────────────────────────────╮
│ Upgrading to NXTG-Forge v3.0                           │
╰─────────────────────────────────────────────────────────╯

Creating safety backup...
  Location: .forge-backup/v2.1-20260123-143022/
  Files backed up: 42                        ✅

Archiving v2.1 components...
  init.sh → scripts/archive/               ✅
  verify-setup.sh → scripts/archive/       ✅

Migrating state data...
  Schema v2.0 → v3.0                       ✅
  Session data preserved                    ✅
  History maintained                        ✅

Installing v3.0 components...
  Commands (20)                            ✅
  Agents (5)                               ✅
  Hooks (6)                                ✅

Running validation...
  Structure integrity                       ✅
  Command registration                      ✅
  State management                          ✅
```

**Upgrade Success:**

```
╔══════════════════════════════════════════════════════════╗
║           ✨ UPGRADE SUCCESSFUL ✨                        ║
╠══════════════════════════════════════════════════════════╣
║  Previous: v2.1 (bash scripts)                           ║
║  Current: v3.0 (Claude native)                           ║
║  Migration time: 18.4 seconds                            ║
║  Data preserved: 100%                                    ║
╚══════════════════════════════════════════════════════════╝

🎉 Welcome to NXTG-Forge v3.0!

What's Changed:

  OLD WAY (v2.1)          →  NEW WAY (v3.0)
  ./init.sh               →  /nxtg-init
  ./verify-setup.sh       →  /nxtg-verify
  Manual execution        →  Conversation-native

Your v2.1 files are safely archived in:
  scripts/archive/

Try These Commands:
  /nxtg-status     - See enhanced project state
  /nxtg-verify     - Validate installation
  /nx[TAB]         - Explore all commands

The future is here! 🚀
```

## Scenario 3: REINSTALL v3.0

**User Experience:**

```
╔══════════════════════════════════════════════════════════╗
║          NXTG-FORGE v3.0 ALREADY INSTALLED               ║
╚══════════════════════════════════════════════════════════╝

Current Installation:
  Version: 3.0.0
  Installed: 2 days ago
  Commands: 20 registered
  Agents: 5 active
  State: Healthy ✅

Options:

  [V] Verify installation integrity
  [R] Repair if issues found
  [F] Force fresh reinstall
  [C] Cancel (recommended - you're good!)

Choice: _
```

## Scenario 4: CORRUPTED Installation

**User Experience:**

```
╔══════════════════════════════════════════════════════════╗
║         ⚠️ INCOMPLETE FORGE INSTALLATION DETECTED         ║
╚══════════════════════════════════════════════════════════╝

Installation Issues Found:
  ⚠️ Missing 3 commands (of 20)
  ⚠️ state.json corrupted or missing
  ✅ Agents present
  ✅ Hooks configured

Recommended Action: Repair Installation

This will:
  • Restore missing commands
  • Rebuild state management
  • Validate all components
  • Preserve existing work

Proceed with repair? [Y/n]: _
```

## Command Design Decision

### Recommendation: SINGLE Smart Command

Keep `/nxtg-init` as the single entry point with intelligent routing:

```typescript
// Pseudocode for command logic
async function nxtgInit(flags?: string[]) {
  // Silent detection
  const state = detectInstallationState();

  // Route to appropriate flow
  switch(state.scenario) {
    case 'FRESH':
      return freshInstall();

    case 'UPGRADE_V2':
      return upgradeFromV2();

    case 'REINSTALL_V3':
      return handleReinstall();

    case 'CORRUPTED':
      return repairInstallation();
  }
}
```

**Why single command?**
- Users don't need to know which command to use
- Prevents the exact confusion the CEO experienced
- System intelligently routes to correct flow
- Cleaner, more professional

### Alternative flags for power users:

```bash
/nxtg-init              # Smart detection (default)
/nxtg-init --fresh      # Force fresh install
/nxtg-init --repair     # Force repair mode
/nxtg-init --verify     # Just check, don't install
```

## Repository Strategy

### Recommendation: Clean Current Repository

1. **Remove ALL v2.x artifacts from main**
   - Delete init.sh, verify-setup.sh from repo
   - Archive in separate `v2-legacy` branch if needed

2. **Clean state.json**
   - Ship with NO state.json in repo
   - Generate fresh on installation

3. **Version in manifest only**
   - Version lives in `.claude/forge/manifest.json`
   - Not in multiple places causing confusion

## Implementation Checklist

```typescript
interface ImplementationTasks {
  detection: {
    checkBashScripts: () => boolean;
    checkStateVersion: () => string | null;
    checkClaudeStructure: () => boolean;
    determineScenario: () => InstallationScenario;
  };

  display: {
    showFreshInstall: () => void;
    showUpgradeFlow: () => void;
    showReinstallOptions: () => void;
    showRepairFlow: () => void;
  };

  execution: {
    performFreshInstall: () => Promise<void>;
    performUpgrade: () => Promise<void>;
    performRepair: () => Promise<void>;
    validateInstallation: () => Promise<boolean>;
  };

  celebration: {
    showSuccess: (stats: InstallStats) => void;
    showNextSteps: (scenario: string) => void;
  };
}
```

## Error Prevention

1. **Never show version confusion**
   - Fresh install NEVER mentions old versions
   - Only show version comparison in upgrade scenario

2. **Clear scenario identification**
   - Tell user exactly what was detected
   - Explain what will happen
   - Get confirmation before proceeding

3. **Professional progress indicators**
   - Real progress bars with percentages
   - Clear section headers
   - Success checkmarks for completed items

4. **Helpful error messages**
   - Never just "Error occurred"
   - Always explain what happened
   - Always provide next steps
   - Always offer recovery options

## Visual Design System

### Colors (via Tailwind/ANSI)
```
Success: ✅ bright green
Warning: ⚠️ amber
Error: ❌ red
Info: ℹ️ blue
Progress: ████ cyan
Headers: ═══ white/bright
```

### Box Drawing
```
╔══════════════╗  Main headers
║              ║
╚══════════════╝

╭──────────────╮  Section headers
│              │
╰──────────────╯

┌──────────────┐  Sub-sections
│              │
└──────────────┘
```

### Progress Bars
```
[████████████████████] 100% ✅
[████████░░░░░░░░░░░]  40%
[░░░░░░░░░░░░░░░░░░░]   0%
```

## Summary

The CEO's frustration was 100% justified. The current experience is confusing and unprofessional.

**Key changes:**
1. Smart detection BEFORE any output
2. Clear, distinct flows for each scenario
3. Professional progress visualization
4. Never mention old versions in fresh installs
5. Single smart command that routes intelligently

This design transforms the installation from a confusing mess into a delightful, professional experience that builds trust and excitement.

Ready to implement this redesigned experience?
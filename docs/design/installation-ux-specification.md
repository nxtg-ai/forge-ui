# NXTG-Forge Installation UX Specification

## Executive Summary

This document defines the professional installation experience for NXTG-Forge v3.0, addressing the critical UX failures identified in CEO testing.

## The Problem

**CEO Experience:**
- Copied v3.0 `.claude/` to new repo
- Ran `/nxtg-init`
- Saw "v2.0 installed" with "upgrade to v3.0 available"
- Result: Confusion, frustration, loss of trust

**CEO Quote:**
> "This is bullshit. Why would a fresh new install... install v2... then say an upgrade to v3 is available. It makes no sense. We need a professional install method and practice."

## Design Principles

### 1. Zero Confusion Principle
- Fresh installs NEVER mention previous versions
- Version comparisons ONLY in upgrade scenarios
- Clear scenario identification before any action

### 2. Professional Polish
- Installation feels like enterprise software
- Progress visualization matches modern CLIs (npm, cargo, etc.)
- Success celebration appropriate to scenario

### 3. Intelligent Detection
- Silent analysis before ANY output
- Smart routing to appropriate flow
- No user guesswork required

## Installation Scenarios

### Scenario Matrix

| Scenario | Detection Criteria | User Experience | Outcome |
|----------|-------------------|-----------------|----------|
| **FRESH** | No Forge artifacts | Clean v3.0 install flow | Full installation |
| **UPGRADE_V2** | Bash scripts or v2.x state | Migration wizard | Archive v2, install v3 |
| **REINSTALL_V3** | v3.0 already present | Status check | Verify or repair |
| **CORRUPTED** | Partial installation | Repair wizard | Fix and validate |

## Detection Logic

```typescript
interface DetectionLogic {
  // Priority order (stop at first match)
  checks: [
    {
      name: "v2_bash_scripts",
      files: ["init.sh", "verify-setup.sh"],
      result: "UPGRADE_V2"
    },
    {
      name: "state_json",
      path: ".claude/forge/state.json",
      version_check: true,
      results: {
        "2.x": "UPGRADE_V2",
        "3.x": "REINSTALL_V3",
        corrupted: "CORRUPTED"
      }
    },
    {
      name: "claude_commands",
      pattern: ".claude/commands/nxtg-*.md",
      threshold: 15, // of 20 commands
      results: {
        complete: "REINSTALL_V3",
        partial: "CORRUPTED"
      }
    },
    {
      name: "no_artifacts",
      result: "FRESH"
    }
  ]
}
```

## User Experience Flows

### Flow 1: FRESH Installation

#### Entry Display
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
```

#### Key Elements
- NO mention of any previous version
- Clear "v3.0 INSTALLER" branding
- Project analysis shows understanding
- Single version reference (v3.0)

#### Progress Visualization
```
Creating infrastructure...
  .claude/ structure           [████████████████████] 100%

Installing intelligent agents (5 total)...
  Core Agent                  [████████████████████] ✅
  Feature Architect          [████████████████████] ✅

Registering commands (20 total)...
  Core commands (5)          [████████████████████] ✅
  Feature commands (7)       [████████████████████] ✅
```

#### Success Celebration
```
╔══════════════════════════════════════════════════════════╗
║           ✨ INSTALLATION COMPLETE ✨                      ║
╠══════════════════════════════════════════════════════════╣
║  Version: 3.0.0                                           ║
║  Time: 14.2 seconds                                       ║
║  Files created: 156                                       ║
╚══════════════════════════════════════════════════════════╝

🎉 Your project is now FORGE-ENABLED!

Quick Start:
  /nxtg-status - See your project state
  /nx[TAB] - Explore all commands
```

### Flow 2: UPGRADE from v2.x

#### Entry Display
```
╔══════════════════════════════════════════════════════════╗
║            NXTG-FORGE UPGRADE DETECTED                    ║
║                  v2.1 → v3.0                              ║
╚══════════════════════════════════════════════════════════╝

Current: v2.1 (bash scripts)
Target: v3.0 (Claude native)

Benefits:
  • No bash execution required
  • 10x faster operations
  • Automatic error recovery
```

#### Key Differences from FRESH
- Shows version comparison (v2.1 → v3.0)
- Explains what's changing
- Emphasizes benefits of upgrade
- Provides safety assurances

### Flow 3: REINSTALL (v3.0 exists)

#### Entry Display
```
╔══════════════════════════════════════════════════════════╗
║          NXTG-FORGE v3.0 ALREADY INSTALLED               ║
╚══════════════════════════════════════════════════════════╝

Status: ✅ Working perfectly!

Your installation:
  Version: 3.0.0
  Commands: 20/20
  Agents: 5/5

No action needed. Try:
  /nxtg-status - View project state
  /nxtg-feature - Build something
```

### Flow 4: CORRUPTED Installation

#### Entry Display
```
╔══════════════════════════════════════════════════════════╗
║         ⚠️ INCOMPLETE INSTALLATION DETECTED               ║
╚══════════════════════════════════════════════════════════╝

Issues found:
  ⚠️ Missing 3 commands
  ⚠️ State file corrupted

Repair will:
  • Restore missing files
  • Fix configuration
  • Preserve your work

Repair now? (yes/no):
```

## Visual Design System

### Typography Hierarchy
```
╔═══════╗  Main Headers (box drawing)
║       ║  High importance
╚═══════╝

Section Headers
  Bold, clear hierarchy

Progress Items
  • Bullet points for lists
  ✓ Checkmarks for completion

Status Indicators
  ✅ Success (green)
  ⚠️ Warning (yellow)
  ❌ Error (red)
  ℹ️ Info (blue)
```

### Progress Bars
```
Style A: Block Fill
[████████████████████] 100%
[████████░░░░░░░░░░░]  40%

Style B: With Percentage
[====================] 100% Complete
[========>           ]  40% Processing

Style C: Animated (during execution)
[████████████████████] ✅ Done
[████████████▓▓▓▓▓▓▓] ⚡ Working...
```

### Color Palette
- **Success**: Bright green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Error**: Red (#EF4444)
- **Info**: Blue (#3B82F6)
- **Progress**: Cyan (#06B6D4)
- **Muted**: Gray (#6B7280)

## Implementation Requirements

### Command Structure

Single entry point with intelligent routing:
```bash
/nxtg-init           # Smart detection (default)
/nxtg-init --fresh   # Force fresh install
/nxtg-init --repair  # Force repair mode
/nxtg-init --status  # Check only
```

### Repository Cleanliness

1. **Remove v2.x artifacts from main**
   - No init.sh or verify-setup.sh
   - No pre-populated state.json

2. **Version in single location**
   - manifest.json holds version
   - Generated fresh on install

3. **Clean templates**
   - Ship templates without state
   - Generate user-specific data

### Performance Requirements

- Detection: < 500ms
- Fresh install: < 20 seconds
- Upgrade: < 30 seconds
- Repair: < 15 seconds
- All progress bars: 60fps smooth

### Error Handling

Never show:
```
❌ "Error occurred"
❌ "Something went wrong"
❌ "Installation failed"
```

Always show:
```
✅ "Unable to create directory: Permission denied"
✅ "How to fix: Run with appropriate permissions"
✅ "Alternative: Choose different directory"
```

## Success Metrics

### Quantitative
- Installation time < 20 seconds
- Zero version confusion incidents
- 100% successful completions
- No manual intervention required

### Qualitative
- User feels confident
- Process feels professional
- Clear understanding of outcome
- Excitement to use product

## Testing Scenarios

### Test 1: Fresh Install
1. New directory, no Forge artifacts
2. Should see ONLY v3.0 messaging
3. Complete in < 20 seconds
4. Clear next steps

### Test 2: Upgrade Path
1. Directory with init.sh present
2. Should detect and offer upgrade
3. Show version comparison
4. Archive old files properly

### Test 3: Reinstall Attempt
1. Directory with complete v3.0
2. Should detect and inform
3. No unnecessary reinstall
4. Offer verify option

### Test 4: Corrupted State
1. Partial .claude/ structure
2. Should detect issues
3. Offer repair
4. Fix without data loss

## Migration Plan

### Phase 1: Immediate Fix
1. Update `/nxtg-init` with detection logic
2. Remove v2.x references from fresh flow
3. Test all scenarios

### Phase 2: Repository Cleanup
1. Remove bash scripts from main
2. Archive in legacy branch
3. Clean all state files

### Phase 3: Documentation
1. Update install guides
2. Create migration guide
3. Record video demos

## Conclusion

The current installation UX is fundamentally broken, causing confusion and eroding trust. This specification provides a clear path to a professional, delightful installation experience that builds confidence and excitement.

The key insight: **Users installing fresh should NEVER see mention of older versions.** This simple principle, properly implemented, transforms the experience from confusing to confident.

---

*"First impressions are everything. Make installation magical."*
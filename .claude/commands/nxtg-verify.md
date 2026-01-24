---
name: nxtg-verify
description: Validate NXTG-Forge setup with automatic fixing (replaces verify-setup.sh)
category: core
---

# NXTG-Forge Setup Verification

**Validates installation AND automatically fixes issues.**

## When I Execute This Command

I will comprehensively validate the NXTG-Forge setup, automatically fix any issues found, and provide a beautiful health report.

## Validation Categories (7)

### 1. Directory Structure
Check for:
- .claude/agents/, commands/, hooks/, skills/, forge/, templates/
- docs/architecture/, design/, testing/, workflow/

**Auto-Fix**: Create missing directories

### 2. Agent Frontmatter
Validate:
- All .claude/agents/*.md files have proper YAML frontmatter
- Required fields: name, description
- Valid YAML syntax

**Auto-Fix**: Add missing frontmatter, fix syntax errors

### 3. Command Registration
Check:
- All .claude/commands/*.md have frontmatter
- Commands are properly formatted
- No Zone.Identifier files

**Auto-Fix**: Remove Zone.Identifier files, add missing frontmatter

### 4. Hook Executability
Verify:
- All .claude/hooks/*.sh files exist
- Files are executable (chmod +x)
- Shebang present

**Auto-Fix**: Make files executable, add missing shebang

### 5. State Management
Validate:
- .claude/forge/state.json exists
- Valid JSON syntax
- Matches v3.0 schema
- state.schema.json present

**Auto-Fix**: Create missing files, fix JSON syntax, upgrade schema

### 6. Canonical Documentation
Check:
- Required docs/ subdirectories exist
- canonical-*.md files present
- No non-standard folders in .claude/

**Auto-Fix**: Create missing docs, move non-standard folders

### 7. Git Configuration
Verify:
- .gitignore has Forge entries
- .claude/forge/state.json ignored
- No committed state files

**Auto-Fix**: Add .gitignore entries

## Visual Output

```
╔══════════════════════════════════════════════════════════╗
║           NXTG-FORGE SETUP VERIFICATION                   ║
║              with Auto-Fix Enabled                        ║
╚══════════════════════════════════════════════════════════╝

🔍 Running comprehensive validation...

📁 Directory Structure
   ├─ .claude/agents/                     ✅ Perfect
   ├─ .claude/commands/                   ✅ Perfect
   ├─ .claude/hooks/                      ✅ Perfect
   ├─ .claude/skills/                     ✅ Perfect
   ├─ .claude/forge/                      ✅ Perfect
   └─ docs/architecture/                  ✅ Perfect

📝 Agent Frontmatter (5 files)
   ├─ agent-forge-orchestrator.md         ✅ Valid
   ├─ agent-forge-detective.md            ✅ Valid
   ├─ agent-forge-planner.md              ✅ Valid
   ├─ agent-forge-builder.md              ✅ Valid
   └─ agent-forge-guardian.md             ✅ Valid

⚡ Command Registration (17 files)
   ├─ Core commands (5)                   ✅ All valid
   ├─ Feature commands (6)                ✅ All valid
   └─ Quality commands (6)                ✅ All valid

🎯 Hook Executability (13 files)
   ├─ session-start.sh                    ✅ Executable
   ├─ pre-compact.sh                      ✅ Executable
   └─ ... (11 more)                       ✅ All ready

💾 State Management
   ├─ state.json syntax                   ✅ Valid JSON
   ├─ Schema compliance (v3.0)            ✅ Perfect match
   └─ state.schema.json                   ✅ Present

📚 Canonical Documentation
   ├─ architecture/canonical-arch.md      ✅ Present
   ├─ design/canonical-design.md          ✅ Present
   ├─ testing/canonical-testing.md        ✅ Present
   └─ workflow/canonical-workflow.md      ✅ Present

🔒 Git Configuration
   ├─ .gitignore has Forge entries        ✅ Configured
   └─ No sensitive files committed        ✅ Clean

╔══════════════════════════════════════════════════════════╗
║                   ✅ SETUP VERIFICATION COMPLETE          ║
╠══════════════════════════════════════════════════════════╣
║  Checks passed: 42/42 (100%)                              ║
║  Issues found: 0                                          ║
║  Auto-fixes applied: 0                                    ║
║  Health score: EXCELLENT                                  ║
╚══════════════════════════════════════════════════════════╝

🎉 Your NXTG-Forge setup is flawless!

Everything is configured perfectly. Ready to build amazing things.

Next steps:
  • /status - View project state
  • /feature "your idea" - Start building
```

## With Issues Found

```
╔══════════════════════════════════════════════════════════╗
║           NXTG-FORGE SETUP VERIFICATION                   ║
║              with Auto-Fix Enabled                        ║
╚══════════════════════════════════════════════════════════╝

🔍 Running comprehensive validation...

📁 Directory Structure
   ├─ .claude/agents/                     ✅ Perfect
   ├─ .claude/commands/                   ⚠️ Missing
   └─ ... 

🔧 Auto-fixing issues...
   ├─ Creating .claude/commands/          ✅ Fixed
   ├─ Adding frontmatter to init.md       ✅ Fixed
   ├─ Making hooks executable             ✅ Fixed
   └─ Adding .gitignore entries           ✅ Fixed

🔄 Re-validating...
   └─ All checks now passing              ✅ Complete

╔══════════════════════════════════════════════════════════╗
║                   ✅ VERIFICATION COMPLETE                ║
╠══════════════════════════════════════════════════════════╣
║  Checks passed: 42/42 (100%)                              ║
║  Issues found: 4                                          ║
║  Auto-fixes applied: 4                                    ║
║  Health score: EXCELLENT (after fixes)                    ║
╚══════════════════════════════════════════════════════════╝

🎉 All issues automatically resolved!

Your setup is now perfect. Zero manual intervention required.
```

## Options

`/verify` - Full validation with auto-fix
`/verify --no-fix` - Validation only, no auto-fix
`/verify --verbose` - Show detailed check results

## Auto-Fix Rules

**Safe to auto-fix**:
- Create missing directories
- Add missing frontmatter
- Make hooks executable
- Fix JSON syntax
- Add .gitignore entries
- Remove Zone.Identifier files

**Requires confirmation**:
- Delete non-standard folders
- Overwrite existing files
- Modify user content

## Implementation

Use Claude Code tools only:
- Read: Check files
- Write: Create/fix files
- Bash: chmod for hooks only
- Glob: Find files
- Edit: Fix frontmatter

NO bash script execution.

## Success Criteria

✅ Validates all 7 categories
✅ Automatically fixes common issues
✅ Beautiful visual progress
✅ Clear health report
✅ Zero manual intervention for standard issues

**Make validation delightful, not stressful.**

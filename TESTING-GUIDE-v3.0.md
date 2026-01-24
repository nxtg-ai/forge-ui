# NXTG-Forge v3.0 Testing Guide

**For CEO: Complete step-by-step guide for testing your v2.1 → v3.0 upgrade**

---

## Prerequisites

- ✅ You have an existing project using NXTG-Forge v2.1
- ✅ That project has `init.sh` and/or `verify-setup.sh` bash scripts
- ✅ You have Claude Code installed
- ✅ You have the v3.0 NXTG-Forge repository cloned

---

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] 1. Backup existing v2.1 project
- [ ] 2. Navigate to v2.1 project in Claude Code
- [ ] 3. Run `/nxtg-upgrade` command
- [ ] 4. Verify upgrade success (8 checks)
- [ ] 5. Test command discovery (`/nx`)
- [ ] 6. Test state management (`/nxtg-status`)
- [ ] 7. Test session resumption (`/nxtg-continue`)
- [ ] 8. Test token optimization (`/nxtg-compact`)
- [ ] 9. Test state export (`/nxtg-export`)
- [ ] 10. Document feedback and ideas

---

## Step 1: Backup Your v2.1 Project

**Before testing, create a safety backup:**

```bash
# Navigate to your v2.1 project directory
cd /path/to/your/v2.1/project

# Create a backup (outside project)
cd ..
cp -r your-v2.1-project your-v2.1-project-backup-$(date +%Y%m%d-%H%M%S)

# Verify backup exists
ls -la | grep backup
```

**Expected output:**
```
drwxr-xr-x  your-v2.1-project-backup-20260123-150000
```

✅ **Checkpoint**: You have a complete backup of your v2.1 project

---

## Step 2: Open Your v2.1 Project in Claude Code

```bash
cd your-v2.1-project
claude-code .
```

**Wait for Claude Code to fully load** (you'll see the chat interface).

✅ **Checkpoint**: Claude Code is running, showing your project

---

## Step 3: Run the Upgrade Command

**In the Claude Code conversation**, type:

```
/nxtg-upgrade
```

### What to Expect

The upgrade should display 8 distinct phases:

#### Phase 1: Detection & Analysis
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

**✅ PASS**: All v2.1 components detected
**❌ FAIL**: "No v2.1 installation found" → See [Troubleshooting](#troubleshooting) below

#### Phase 2: Backup Creation
```
💾 Creating backup...
   ├─ Backup location: scripts/archive/v2.1-backup-20260123-150000/
   ├─ Backed up: init.sh ✅
   ├─ Backed up: verify-setup.sh ✅
   └─ Backed up: .claude/ directory ✅

Backup complete! Safe to proceed.
```

**✅ PASS**: Backup directory created with timestamp
**❌ FAIL**: Permission errors → Check directory permissions

#### Phase 3: Archive Bash Scripts
```
📦 Archiving v2.1 bash scripts...
   ├─ init.sh → scripts/archive/init-v2.1.sh ✅
   ├─ verify-setup.sh → scripts/archive/verify-setup-v2.1.sh ✅
   └─ Created archive README ✅

Bash scripts safely archived.
```

**✅ PASS**: Bash scripts moved to archive
**❌ FAIL**: "File not found" → Scripts may have been deleted manually

#### Phase 4: State Migration
```
🔄 Migrating state.json...
   ├─ Current schema: v2.0
   ├─ Target schema: v3.0
   ├─ Adding upgrade history ✅
   ├─ Validating JSON syntax ✅
   └─ State migration complete ✅

State successfully upgraded to v3.0 schema.
```

**✅ PASS**: State migrated to v3.0 schema
**❌ FAIL**: JSON syntax errors → Claude will auto-fix and retry

#### Phase 5: Command Suite Installation
```
⚡ Verifying v3.0 command suite...
   ├─ Core commands (5)         ✅ All present
   ├─ Feature commands (7)      ✅ All present
   ├─ State commands (4)        ✅ All present
   ├─ Docs commands (3)         ✅ All present
   └─ Advanced commands (4)     ✅ All present

Total: 20/20 commands registered ✅
```

**✅ PASS**: All 20 commands installed
**❌ FAIL**: Missing commands → Claude will install them

#### Phase 6: Hook Installation
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

**✅ PASS**: All hooks executable
**❌ FAIL**: Permission errors → Claude will run `chmod +x`

#### Phase 7: Validation
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

**✅ PASS**: All validation checks pass
**❌ FAIL**: Failed checks → Claude will auto-fix

#### Phase 8: Success Celebration
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
  scripts/archive/v2.1-backup-20260123-150000/

Next Steps:
  1. Try: /nxtg-status (see your project state)
  2. Discover: /nx (see all commands)
  3. Build: /nxtg-feature "your idea"

From Exhaustion to Empowerment - Now powered by v3.0! 🚀
```

**✅ PASS**: Upgrade completed successfully
**Time**: ~10-15 seconds total

---

## Step 4: Verify Upgrade Success

### 4.1 Check File Structure

**Run in terminal:**
```bash
# Check bash scripts were archived
ls scripts/archive/

# Should show:
# - init-v2.1.sh
# - verify-setup-v2.1.sh
# - README.md
# - v2.1-backup-20260123-150000/ (directory)

# Check commands installed
ls .claude/commands/ | grep nxtg-

# Should show 20 files:
# - nxtg-init.md
# - nxtg-verify.md
# - nxtg-status.md
# ... (17 more)
```

**✅ PASS**: Bash scripts archived, 20 commands present
**❌ FAIL**: Missing files → Run `/nxtg-verify` to auto-fix

### 4.2 Check State Migration

**Run in terminal:**
```bash
# Check state schema version
cat .claude/forge/state.json | grep schema_version

# Should show:
# "schema_version": "3.0"
```

**✅ PASS**: State at v3.0 schema
**❌ FAIL**: Still at v2.0 → Re-run `/nxtg-upgrade`

### 4.3 Check Backup Integrity

**Run in terminal:**
```bash
# Verify backup contents
ls scripts/archive/v2.1-backup-*/

# Should contain:
# - init.sh (your original)
# - verify-setup.sh (your original)
# - .claude/ (directory copy)
```

**✅ PASS**: Complete backup exists
**❌ FAIL**: Backup incomplete → Don't proceed, restore from your manual backup

### 4.4 Check Git Status

**Run in terminal:**
```bash
git status

# Should show:
# - scripts/archive/ (untracked or modified)
# - .claude/commands/ (modified - new names)
# - .claude/forge/state.json (modified - new schema)
```

**✅ PASS**: Changes detected by git
**Note**: Don't commit yet - finish testing first

---

## Step 5: Test Command Discovery

### 5.1 Test `/nx` Autocomplete

**In Claude Code conversation**, type:
```
/nx
```

**Expected behavior:**
- Claude Code's autocomplete menu appears
- Shows all 20 `/nxtg-*` commands grouped together
- Commands are alphabetically sorted
- Each has a description

**✅ PASS**: All 20 commands visible in autocomplete
**❌ FAIL**: Commands missing → Run `/nxtg-verify`

### 5.2 Test Individual Command Help

**Try a few commands to verify they're registered:**

```
/nxtg-init
```
**Expected**: Shows command documentation (don't actually run it - project already initialized)

```
/nxtg-verify
```
**Expected**: Runs validation (safe to execute)

```
/nxtg-status
```
**Expected**: Shows project state dashboard

**✅ PASS**: All tested commands work
**❌ FAIL**: "Command not found" → See [Troubleshooting](#troubleshooting)

---

## Step 6: Test State Management

### 6.1 View Current State

**In Claude Code conversation:**
```
/nxtg-status
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║                  Project State                         ║
╚════════════════════════════════════════════════════════╝

📍 Current Goal: [Your current goal or "No active goal"]

✅ Completed: [Your completed work from v2.1]
☐ Pending: [Your pending todos from v2.1]

🔑 Key Decisions: [Any decisions tracked in v2.1]

💡 Engagement Quality: [Score]/100

📊 Token Usage: [X] / 200,000 ([Y]%)

Last saved: [timestamp]
```

**✅ PASS**: State shows your migrated v2.1 data
**❌ FAIL**: State empty → Migration may have failed

### 6.2 Update State

**In Claude Code conversation:**
```
Test the state system by asking Claude to remember something:
"Remember that we're testing v3.0 upgrade - this is a test note"
```

**Then check state persisted:**
```
/nxtg-status
```

**Expected**: Should show the test note in context or decisions

**✅ PASS**: State updated and persisted
**❌ FAIL**: State not updating → Check `.claude/forge/state.json` file permissions

---

## Step 7: Test Session Resumption

### 7.1 Test `/nxtg-continue`

**In Claude Code conversation:**
```
/nxtg-continue
```

**Expected output:**
```
╔══════════════════════════════════════════════════════════╗
║            RESUMING PREVIOUS SESSION                      ║
╚══════════════════════════════════════════════════════════╝

📍 Goal: [Your current goal]

⏰ Last active: [time] ago

✅ Completed work:
   [List of completed items from state]

☐ Pending work:
   [List of pending items]

🔑 Key decisions made:
   [Key decisions from state]

💡 Last working on:
   [Last activity]

🚀 Ready to continue! What would you like to work on?
```

**✅ PASS**: Context restored from state
**❌ FAIL**: "No previous session found" → State may be empty (expected if new project)

### 7.2 Test Context Preservation

**Create a checkpoint:**
```
Ask Claude: "Create a checkpoint named 'before-testing'"
```

**Make some changes:**
```
Ask Claude: "Add a test file called test-v3.txt with content 'v3 is working'"
```

**Simulate session restart by saying:**
```
/nxtg-continue
```

**Expected**: Claude should remember the test file creation and checkpoint

**✅ PASS**: Context preserved across resumption
**❌ FAIL**: Context lost → Check state.json for checkpoint data

---

## Step 8: Test Token Optimization

### 8.1 Check Current Token Usage

**In Claude Code conversation:**
```
/nxtg-status
```

**Look for:** `📊 Token Usage: [current] / 200,000 ([percentage]%)`

**Record your current token usage**: _____ tokens

### 8.2 Test Dry Run Compaction

**In Claude Code conversation:**
```
/nxtg-compact --dry-run
```

**Expected output:**
```
🔍 Compaction preview (dry run):

Would compact:
  • [N] test results → [X] tokens
  • [N] completed tasks → [X] tokens
  • [N] discussion threads → [X] tokens

Total savings: ~[X] tokens ([Y]%)

To execute: /nxtg-compact
```

**✅ PASS**: Shows compaction preview without executing
**❌ FAIL**: No preview shown → May need more context to compact

### 8.3 Test Actual Compaction (Optional)

**⚠️ Only if token usage > 60%**

```
/nxtg-compact
```

**Expected**: Token usage reduces by 20-40%

**✅ PASS**: Token usage decreased
**❌ FAIL**: No change → Not enough context to compact yet

---

## Step 9: Test State Export

### 9.1 Export to Markdown

**In Claude Code conversation:**
```
/nxtg-export markdown
```

**Expected output:**
```
📝 Exporting to Markdown...

Generating report:
  ✅ Session metadata
  ✅ Completed work
  ✅ Pending todos
  ✅ Key decisions
  ✅ Statistics

Export complete!

📄 Saved to: .claude/forge/exports/project-report-[timestamp].md
Size: [X] KB
```

**Verify file exists:**
```bash
# In terminal
ls .claude/forge/exports/

# Should show:
# project-report-20260123-150000.md
```

**Open the file and check contents:**
```bash
cat .claude/forge/exports/project-report-*.md
```

**✅ PASS**: Markdown file created with complete project report
**❌ FAIL**: File missing or empty → Check `.claude/forge/exports/` directory permissions

### 9.2 Export to JSON (Optional)

**In Claude Code conversation:**
```
/nxtg-export json
```

**Expected**: Creates `.claude/forge/exports/state-export-[timestamp].json`

**Verify JSON is valid:**
```bash
cat .claude/forge/exports/state-export-*.json | jq '.'
```

**✅ PASS**: Valid JSON with complete state
**❌ FAIL**: Invalid JSON → See [Troubleshooting](#troubleshooting)

---

## Step 10: Document Your Feedback

### Testing Results Template

**Copy this template and fill it out:**

```markdown
# NXTG-Forge v3.0 Testing Results

**Date**: [Date]
**Project**: [Your v2.1 project name]
**Tester**: CEO

## Upgrade Process

- [ ] ✅ Detection successful
- [ ] ✅ Backup created
- [ ] ✅ Scripts archived
- [ ] ✅ State migrated
- [ ] ✅ Commands installed
- [ ] ✅ Hooks configured
- [ ] ✅ Validation passed
- [ ] ✅ Celebration shown

**Time taken**: ___ seconds
**Issues encountered**: [None / List issues]

## Command Discovery

- [ ] ✅ `/nx` autocomplete works
- [ ] ✅ All 20 commands visible
- [ ] ✅ Commands have descriptions

**Issues**: [None / List issues]

## State Management

- [ ] ✅ `/nxtg-status` shows state
- [ ] ✅ State persists updates
- [ ] ✅ v2.1 data migrated correctly

**Issues**: [None / List issues]

## Session Resumption

- [ ] ✅ `/nxtg-continue` restores context
- [ ] ✅ Checkpoints work
- [ ] ✅ Context preserved

**Issues**: [None / List issues]

## Token Optimization

- [ ] ✅ `/nxtg-compact --dry-run` shows preview
- [ ] ✅ `/nxtg-compact` reduces tokens (if tested)

**Token savings**: [X]% or [Not tested]

## State Export

- [ ] ✅ Markdown export works
- [ ] ✅ JSON export works (if tested)
- [ ] ✅ Files are valid and complete

**Issues**: [None / List issues]

## Overall Experience

**What worked great**:
- [List what you loved]

**What needs improvement**:
- [List issues or annoyances]

**What's missing that I wish was there**:
- [List your IDEAS - the features you mentioned]

**Would I recommend this to users?**: [Yes / No / With caveats]

**Overall rating**: [X]/10

## My Ideas for Next Features

[Share your ideas here - the ones you mentioned wanting to discuss]

```

---

## Troubleshooting

### Issue: `/nxtg-upgrade` says "No v2.1 installation found"

**Possible causes:**
1. Not in a v2.1 project directory
2. `init.sh` or `verify-setup.sh` were manually deleted
3. In a fresh project (not v2.1)

**Solutions:**
- Verify you're in the correct directory: `pwd`
- Check for bash scripts: `ls *.sh`
- If truly not v2.1, use `/nxtg-init` instead

### Issue: Commands not appearing in autocomplete

**Possible causes:**
1. Commands not properly registered
2. Frontmatter missing `name:` field
3. Zone.Identifier files present

**Solutions:**
```
/nxtg-verify
```
This will auto-fix command registration issues.

### Issue: State not migrating

**Possible causes:**
1. `state.json` has invalid JSON
2. File permissions incorrect
3. Schema version mismatch

**Solutions:**
```bash
# Check JSON validity
cat .claude/forge/state.json | jq '.'

# If invalid, Claude will auto-create backup and fix
```

Then re-run:
```
/nxtg-upgrade
```

### Issue: Export files not created

**Possible causes:**
1. `.claude/forge/exports/` directory doesn't exist
2. Permission issues
3. Disk full

**Solutions:**
```bash
# Create directory
mkdir -p .claude/forge/exports

# Check permissions
ls -la .claude/forge/

# Check disk space
df -h .
```

### Issue: Token compaction doesn't reduce tokens

**Possible causes:**
1. Not enough context accumulated yet
2. Already optimized
3. Context is all high-priority

**Solutions:**
- This is expected if conversation is short
- Try again after more context builds up
- Use `--aggressive` mode: `/nxtg-compact --aggressive`

### Emergency: Need to Rollback

**If upgrade catastrophically fails:**

```
/nxtg-upgrade --rollback
```

**Or manually:**
```bash
# Restore from backup
cp -r scripts/archive/v2.1-backup-[timestamp]/* .

# Verify restoration
ls *.sh
```

---

## Success Criteria

✅ **Your upgrade is successful if:**

1. All 8 upgrade phases completed without errors
2. All 20 commands discoverable via `/nx`
3. `/nxtg-status` shows your migrated state
4. `/nxtg-continue` restores context
5. `/nxtg-export markdown` creates valid report
6. Bash scripts safely archived in `scripts/archive/`
7. State at v3.0 schema
8. Full backup exists

✅ **You're ready for production if:**

1. All success criteria above met
2. No critical bugs encountered
3. UX feels empowering (not exhausting)
4. You trust the system with your real work
5. You'd recommend it to other developers

---

## Next Steps After Testing

### If Testing Successful ✅

1. **Document your ideas** (the ones you mentioned)
2. **Share feedback** with the dev team
3. **Identify priority features** for next phase
4. **Consider production rollout** timeline

### If Testing Found Issues ❌

1. **Document all issues** with reproduction steps
2. **Categorize by severity** (critical / major / minor)
3. **Report to dev team** for fixes
4. **Decide**: Fix now or after v3.1?

---

## Testing Completion

**When you've completed all 10 steps, you can:**

1. **Commit your upgrade** (if satisfied):
   ```bash
   git add .
   git commit -m "Upgrade to NXTG-Forge v3.0

   - Migrated from v2.1 bash scripts to pure Claude Code
   - 20 /nxtg-* commands installed
   - State migrated to v3.0 schema
   - Bash scripts archived safely

   Testing: All features verified and working

   🤖 Generated with Claude Code
   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

2. **Share your results** with the team

3. **Share your IDEAS** for what comes next

---

**From Exhaustion to Empowerment**

Happy testing! 🚀

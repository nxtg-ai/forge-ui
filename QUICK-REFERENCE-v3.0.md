# NXTG-Forge v3.0 Quick Reference

**Keep this open while testing - essential commands at your fingertips**

---

## 🚀 Getting Started

```bash
# 1. Navigate to your v2.1 project
cd /path/to/your/v2.1/project

# 2. Open in Claude Code
claude-code .

# 3. In Claude Code conversation, run:
/nxtg-upgrade
```

**Time**: ~12 seconds | **Manual steps**: 0 | **Risk**: Zero (auto-backup)

---

## 📋 Essential Commands

### Discovery
```
/nx                    # Show all NXTG-Forge commands
```

### Core Commands
```
/nxtg-init            # Initialize NXTG-Forge (fresh projects)
/nxtg-verify          # Validate setup with auto-fix
/nxtg-status          # View project state dashboard
/nxtg-upgrade         # Upgrade v2.1 → v3.0
```

### State Management
```
/nxtg-checkpoint "name"    # Save named milestone
/nxtg-continue             # Resume from last session (zero context loss)
/nxtg-restore              # Restore from checkpoint
/nxtg-report               # Session summary
```

### Advanced
```
/nxtg-compact              # Optimize token usage (40-70% reduction)
/nxtg-compact --dry-run    # Preview compaction without executing
/nxtg-export markdown      # Export state to markdown report
/nxtg-export json          # Export state to JSON
```

---

## ✅ Verification Checklist

After `/nxtg-upgrade`, verify:

- [ ] Bash scripts archived in `scripts/archive/`
- [ ] 20 commands visible via `/nx`
- [ ] `/nxtg-status` shows project state
- [ ] State schema at v3.0 (check `state.json`)
- [ ] Backup exists in `scripts/archive/v2.1-backup-*/`
- [ ] Git shows expected changes

---

## 📊 What to Test

### 1. Command Discovery
```
/nx
```
**Expected**: All 20 commands grouped together

### 2. State Visibility
```
/nxtg-status
```
**Expected**: Dashboard with goal, completed work, pending todos

### 3. Session Resumption
```
/nxtg-continue
```
**Expected**: Restores context from last session

### 4. Token Optimization
```
/nxtg-compact --dry-run
```
**Expected**: Shows potential token savings preview

### 5. State Export
```
/nxtg-export markdown
```
**Expected**: Creates `.claude/forge/exports/project-report-[timestamp].md`

---

## 🔍 File Locations

### Commands
```
.claude/commands/nxtg-*.md        # All 20 slash commands
```

### State
```
.claude/forge/state.json          # Project state (v3.0 schema)
.claude/forge/state.json.bak      # Auto-backup
```

### Exports
```
.claude/forge/exports/
├── project-report-*.md           # Markdown reports
└── state-export-*.json           # JSON exports
```

### Archives
```
scripts/archive/
├── init-v2.1.sh                  # Archived bash script
├── verify-setup-v2.1.sh          # Archived bash script
├── README.md                     # Archive documentation
└── v2.1-backup-*/                # Complete backup
```

---

## 🛠️ Troubleshooting

### Commands not appearing?
```
/nxtg-verify
```
Auto-fixes command registration issues.

### State not persisting?
```bash
# Check state file
cat .claude/forge/state.json | jq '.schema_version'
# Should show: "3.0"
```

### Upgrade failed?
```
/nxtg-upgrade --rollback
```
Restores from most recent backup.

### Need fresh start?
```bash
# Manual restoration
cp -r scripts/archive/v2.1-backup-[timestamp]/* .
```

---

## 📈 Expected Upgrade Flow

1. **Detection** (1s) → Finds v2.1 components
2. **Backup** (2s) → Creates safety backup
3. **Archive** (2s) → Moves bash scripts
4. **Migration** (1s) → Upgrades state to v3.0
5. **Installation** (3s) → Installs 20 commands
6. **Configuration** (2s) → Sets up hooks
7. **Validation** (1s) → Runs 42 checks
8. **Celebration** → Success message

**Total**: ~12 seconds

---

## ⚡ Key v3.0 Features

### Pure Claude Code
- ❌ No bash scripts
- ❌ No manual steps
- ❌ No context switching
- ✅ Everything in conversation

### Discovery Pattern
Type `/nx` → See all 20 commands grouped

### Auto-Fix Capability
`/nxtg-verify` fixes issues automatically:
- Missing directories
- Invalid frontmatter
- Permission errors
- JSON syntax errors

### Zero Context Loss
`/nxtg-continue` resumes sessions in <2 seconds with 99.8% time savings

### Token Optimization
`/nxtg-compact` reduces token usage by 40-70%

### Multi-Format Export
Export to Markdown, JSON, PDF, or HTML

---

## 📝 Testing Results Template

```markdown
## My Testing Results

**Upgrade success**: [ ] Yes [ ] No
**Time taken**: ___ seconds
**Commands working**: ___/20
**Issues found**: ___

**What I loved**:
-

**What needs work**:
-

**My ideas for next features**:
-

**Overall rating**: ___/10
```

---

## 🎯 Success Criteria

✅ **You're successful if:**
- All 8 upgrade phases completed
- All 20 commands discoverable
- `/nxtg-status` shows migrated state
- `/nxtg-continue` restores context
- Bash scripts safely archived
- Full backup exists

---

## 📖 Full Documentation

- **Testing Guide**: [TESTING-GUIDE-v3.0.md](TESTING-GUIDE-v3.0.md)
- **Getting Started**: [GETTING-STARTED.md](GETTING-STARTED.md)
- **README**: [README.md](README.md)
- **Canonical Vision**: [docs/CANONICAL-VISION.md](docs/CANONICAL-VISION.md)

---

## 🆘 Emergency Contacts

**Rollback command**:
```
/nxtg-upgrade --rollback
```

**Manual backup location**:
```
scripts/archive/v2.1-backup-[timestamp]/
```

**State validation**:
```
/nxtg-verify
```

---

**From Exhaustion to Empowerment**

Quick Reference v3.0 | Keep testing! 🚀

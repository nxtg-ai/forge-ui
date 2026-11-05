# 🐕 Dog-Fooding Guide: Using NXTG-Forge to Build NXTG-Forge

**Status:** Active | **Updated:** 2026-01-28

---

## Welcome to the Meta-Zone! 🌀

You're using NXTG-Forge to build NXTG-Forge itself. This is called **dog-fooding** (eating your own dog food), and it's how we ensure the product is actually useful.

This guide explains how to **fly the plane while building it** without crashing into data pollution.

---

## 🎯 The Core Problem

**Challenge:** Use NXTG-Forge for real work (building itself and other projects) while keeping personal usage data separate from the public GitHub release.

**Solution:** Clean separation of **personal data** (you) vs. **product code** (everyone).

---

## 📂 Directory Structure

### Your Personal Directories (Gitignored)

#### `.asif/` - Personal Design Workspace
**Purpose:** UI/UX explorations and experimental designs

**What goes here:**
- UI mockups and prototypes
- Experimental components
- Design iterations
- Work-in-progress UI code

**Example:**
```
.asif/
└── UI-DESIGN/
    └── dx3-v2/          # Your current design iteration
        ├── components/
        ├── mockups/
        └── DEVELOPMENT-LOG.md
```

📖 **Full guide:** [.asif/README.md](.asif/README.md)

---

#### `.forge/` - Personal Knowledge Base
**Purpose:** Reference materials, notes, and development guides

**What goes here:**
- Personal development notes
- Architecture references
- Design guidelines and brand assets
- Code patterns and snippets
- Git/ops cheatsheets
- Bug investigation notes

**Current structure:**
```
.forge/
├── CLAUDE-WSL-BASH/        # WSL/Bash references
├── CODEBASE-HYGIENE/       # Code quality patterns
├── Code-System/            # Architecture guides
├── Design-System/          # Design specs & branding
├── NXTG-FORGE-KNOWLEDGE/   # Project learnings
├── ⚙️OPS/                  # Git/GitHub guides
└── *.md                    # Root notes
```

📖 **Full guide:** [.forge/README.md](.forge/README.md)

---

#### `.claude/` - Session Data & State (Partially Gitignored)

**Personal files (gitignored):**
```
.claude/
├── VISION.md              # Your actual vision content
├── vision-events.json     # Usage history
├── forge/
│   ├── state.json         # Current session state
│   └── memory/            # Session memory
└── state/
    ├── current.json       # Current state
    └── backup.json        # State backup
```

**System files (ships with product):**
```
.claude/
├── forge/
│   ├── config.yml         # Default forge config
│   └── agents/            # Agent definitions
└── commands/              # Slash commands
```

---

### What Ships in the Public Release

✅ **Product Code:**
- `src/` - All application code
- `docs/` - Documentation
- `tests/` - Test suites
- `package.json` - Dependencies
- `.claude/forge/config.yml` - Default configs
- `.claude/forge/agents/` - Agent definitions

✅ **Templates & Examples:**
- `.claude/system/templates/` (future)
- Example vision files
- Sample configurations

❌ **Never Ships:**
- `.asif/` - Your design workspace
- `.forge/` - Your knowledge base
- `.claude/VISION.md` - Your actual visions
- `.claude/vision-events.json` - Your usage history
- `.claude/forge/state.json` - Your session state
- Any `*.local.*` files

---

## 🚀 Quick Start: Dog-Fooding Workflow

### 1. **Start Your Session**
```bash
npm run dev
```

The UI will launch at `http://localhost:5052`

### 2. **Capture Your Vision**
Click **"Vision"** tab → Define what you want to build

Your vision is saved to `.claude/VISION.md` (gitignored automatically)

### 3. **Build Features**
Use NXTG-Forge normally:
- Define features
- Generate code
- Review and iterate

All your personal session data is automatically separated.

### 4. **Document in .forge/**
As you learn patterns, save them:
```bash
echo "## Pattern: XYZ" >> .forge/patterns/my-pattern.md
```

### 5. **Experiment in .asif/**
Testing new UI ideas:
```bash
cp -r src/components/NewIdea .asif/experiments/new-idea
# Hack away safely!
```

### 6. **Commit Product Changes Only**
```bash
git status
# Should only show src/, docs/, tests/ changes
# .asif/ and .forge/ won't appear

git add src/
git commit -m "feat: Add new capability"
```

---

## 🛡️ Protection in Place

### Gitignore Patterns

Current `.gitignore` protects:

```gitignore
# Personal workspaces
.asif/                    # Design workspace
.forge/                   # Knowledge base

# Personal session data
.claude/VISION.md
.claude/vision-events.json
.claude/forge/state.json
.claude/state/current.json
.claude/state/backup.json
.claude/forge/memory/*
.claude/user/             # Future user directory

# User override files
**/*.local.md
**/*.local.yml
**/*.local.json
**/*.local.ts
**/*.local.tsx
```

### Safety Checks

Before committing, verify:
```bash
# 1. Check git status
git status

# 2. Verify no personal data
git diff --cached | grep -i "personal\|secret\|private"

# 3. Check for .asif or .forge files
git diff --cached --name-only | grep -E "(\.asif|\.forge)"

# If any of the above match, DON'T commit!
```

---

## 🧪 Testing the Separation

### Clean Clone Test

Verify the separation works:

```bash
# 1. Clone to a temp location
cd /tmp
git clone <your-repo-url> test-nxtg-forge
cd test-nxtg-forge

# 2. Install
npm install

# 3. Start
npm run dev

# Expected: App starts with empty/template data, no errors
```

### Dog-Food Test

```bash
# 1. Use NXTG-Forge for real work
# Create visions, run sessions, generate code

# 2. Check git status
git status

# Expected: Only src/, docs/, tests/ changes appear
# No .asif/, .forge/, or .claude/VISION.md changes
```

---

## 📝 Filing UAT Feedback

As you dog-food, document issues and learnings:

**Use:** `tests/UI/UI-UAT.MD`

This file is your working scratchpad for:
- Bug reports
- UX issues
- Feature ideas
- Flow improvements

**Structure:**
```markdown
## [Date] - [Feature Area]

### Issue
Description of what's broken/confusing

### Expected
What should happen

### Actual
What actually happened

### Screenshots
(if applicable)

### Impact
High/Medium/Low
```

---

## 🎨 Design Iteration Workflow

When experimenting with UI:

```bash
# 1. Create experiment in .asif/
mkdir .asif/experiments/new-nav-design
cp -r src/components/Navigation .asif/experiments/new-nav-design/

# 2. Hack freely (it's gitignored!)
# Edit, break, rebuild

# 3. When ready, migrate to src/
cp .asif/experiments/new-nav-design/Navigation.tsx src/components/

# 4. Commit only the final version
git add src/components/Navigation.tsx
git commit -m "feat: Redesigned navigation for better UX"

# 5. Archive or delete experiment
mv .asif/experiments/new-nav-design .asif/archive/
```

---

## 📚 Knowledge Management

Use `.forge/` as your second brain:

### Capture Decisions
```markdown
# .forge/decisions/2026-01-28-runspace-architecture.md

## Decision: Multi-Project Runspace Isolation

**Context:** Need to support multiple projects without conflicts

**Options:**
1. Shared state (rejected - causes pollution)
2. Process isolation (chosen - clean separation)

**Outcome:** Implemented runspace-manager.ts with full isolation

**References:**
- Code: src/core/runspace-manager.ts
- Docs: docs/features/multi-project/
```

### Document Patterns
```markdown
# .forge/patterns/result-type.md

## Pattern: Result<T, E> Type

Always use Result type for error handling instead of throwing:

\`\`\`typescript
// Good
function loadConfig(): Result<Config, ConfigError> {
  try {
    return Result.ok(parseConfig());
  } catch (e) {
    return Result.error(new ConfigError(e));
  }
}

// Bad
function loadConfig(): Config {
  return parseConfig(); // Can throw!
}
\`\`\`

**Why:** Explicit error handling, type-safe, forces handling
```

---

## 🔄 Multiple Profiles (Advanced)

Work on multiple projects without conflicts:

```bash
# Personal NXTG-Forge work
NXTG_USER_DATA_DIR=~/.nxtg-forge-dogfood npm run dev

# Client project work
NXTG_USER_DATA_DIR=~/.nxtg-client-alpha npm run dev

# Demo/presentation mode
NXTG_USER_DATA_DIR=~/.nxtg-demo npm run dev
```

Each profile has separate:
- Visions
- Session history
- State
- Preferences

---

## 🧹 Periodic Cleanup

Keep your personal directories organized:

### Monthly
- [ ] Review `.asif/experiments/` - delete failed experiments
- [ ] Archive `.forge/logs/` - move old investigations
- [ ] Update `.forge/README.md` - reflect current structure

### Quarterly
- [ ] Consolidate `.forge/` notes - merge similar content
- [ ] Clean `.asif/archive/` - delete ancient prototypes
- [ ] Review `.gitignore` - ensure all personal data protected

---

## ❓ FAQ

### Q: Can I share files from .forge/ or .asif/?
**A:** Yes! They're gitignored, but you can manually share specific files with collaborators if needed. Just be careful not to include secrets.

### Q: What if I accidentally commit personal data?
**A:**
1. Don't push yet!
2. `git reset --soft HEAD~1` to undo the commit
3. Fix `.gitignore` if needed
4. Re-commit only the product code

If already pushed, see `docs/DOGFOODING-BEST-PRACTICES.md` for history cleanup.

### Q: Should I back up .forge/ and .asif/?
**A:** Yes! They're not in git, so use:
- Cloud sync (Dropbox, Google Drive)
- Local backups
- Or create a separate private git repo just for these

### Q: Can I use NXTG-Forge for other projects?
**A:** Absolutely! That's the point. The dog-fooding setup keeps NXTG-Forge development separate from your other projects.

---

## 📖 Additional Resources

- **Best Practices:** [docs/DOGFOODING-BEST-PRACTICES.md](docs/DOGFOODING-BEST-PRACTICES.md)
- **Implementation Guide:** [docs/IMPLEMENTATION-CHECKLIST.md](docs/IMPLEMENTATION-CHECKLIST.md)
- **Separation Strategy:** [PRODUCT-SEPARATION-STRATEGY.md](PRODUCT-SEPARATION-STRATEGY.md)

---

## 🎉 You're Ready!

You now have a **clean separation** between:
- **Product code** (ships to everyone)
- **Personal data** (stays with you)

**Golden Rule:** If it contains **your specific content** or **runtime state**, it belongs in `.asif/`, `.forge/`, or `.claude/user/` and must be gitignored.

**Fly that plane while building it!** ✈️🔧

---

**Questions?** Document them in `tests/UI/UI-UAT.MD` and we'll iterate on the process.

# Dog-Fooding Best Practices: Flying the Plane While Building It

## The Challenge

How do you **use your own product** (dog-food it) for real work while actively developing it, **without polluting the public release** with personal usage data?

This is the classic **"bootstrap problem"** - using NXTG-Forge to build NXTG-Forge itself.

---

## Industry Best Practices (2025)

### 1. **Separate Deployment from Release**
Deploy changes internally for dog-fooding **before** releasing to all users. This is achieved through:
- Feature flags
- Environment profiles (dev/dogfood/prod)
- Branch strategies

### 2. **Data Separation is Critical**
User data must be separated from shipped code. Common patterns:

#### Pattern A: XDG Base Directory Specification (Linux/Unix Standard)
```
~/.config/nxtg-forge/     # Configuration (ships as templates)
~/.local/share/nxtg-forge/  # User data (never ships)
~/.cache/nxtg-forge/       # Cache (never ships)
~/.local/state/nxtg-forge/  # State/sessions (never ships)
```

**Pros:** Industry standard, clean separation, respects user expectations
**Cons:** Platform-specific (primarily Unix/Linux)

#### Pattern B: VS Code Style - User Data Directory Flag
```bash
# Different profiles for different uses
nxtg-forge --user-data-dir ~/.nxtg-forge-personal
nxtg-forge --user-data-dir ~/.nxtg-forge-work
nxtg-forge --user-data-dir ~/.nxtg-forge-dogfood
```

**Pros:** Ultimate flexibility, multiple profiles, no pollution
**Cons:** Requires users to understand flags

#### Pattern C: .local Suffix Convention (Claude Code Pattern)
```
.claude/
├── VISION.template.md     # Ships in repo
├── VISION.local.md        # User's actual vision (gitignored)
├── config.yml             # Default config (ships)
├── config.local.yml       # User overrides (gitignored)
```

In `.gitignore`:
```gitignore
**/*.local.md
**/*.local.yml
**/*.local.json
```

**Pros:** Simple, discoverable, works everywhere
**Cons:** Can lead to file proliferation

#### Pattern D: Separate User Directory (Recommended Hybrid)
```
project/
├── .claude/
│   ├── system/            # Ships with product
│   │   ├── templates/
│   │   ├── defaults/
│   │   └── examples/
│   └── user/              # .gitignored completely
│       ├── vision.md
│       ├── sessions/
│       ├── state/
│       └── cache/
```

**Pros:** Clear boundary, easy to reason about, clean gitignore
**Cons:** Requires migration for existing users

### 3. **Template-Driven Initialization**

Ship **template files**, copy to user files on first run:

```typescript
// First-run initialization
async function initializeUserData() {
  const userDir = path.join('.claude', 'user');

  if (!fs.existsSync(userDir)) {
    await fs.mkdir(userDir, { recursive: true });

    // Copy templates
    await fs.copyFile(
      '.claude/system/templates/vision.md',
      '.claude/user/vision.md'
    );

    console.log('✓ Initialized user directory from templates');
  }
}
```

### 4. **Environment Variables for Paths**

```typescript
const NXTG_USER_DATA = process.env.NXTG_USER_DATA_DIR || '.claude/user';
const NXTG_SYSTEM_DATA = process.env.NXTG_SYSTEM_DIR || '.claude/system';
const NXTG_CACHE_DIR = process.env.NXTG_CACHE_DIR || '.claude/user/cache';
```

Allow power users to customize locations while providing sensible defaults.

### 5. **Feature Flags for Dog-Fooding**

```typescript
// Enable experimental features for internal use
const FEATURE_FLAGS = {
  multiProjectRunspaces: process.env.NXTG_ENABLE_RUNSPACES === 'true',
  mcpIntegration: process.env.NXTG_ENABLE_MCP === 'true',
  advancedMetrics: process.env.NXTG_DOGFOOD === 'true',
};

// In your .env.local (gitignored):
NXTG_DOGFOOD=true
NXTG_ENABLE_RUNSPACES=true
NXTG_ENABLE_MCP=true
```

---

## Real-World Examples

### Example 1: Docker
- **Code:** GitHub repo (public)
- **Runtime Data:** `/var/lib/docker` (never in repo)
- **Config:** `/etc/docker/daemon.json` (user-specific, gitignored)

### Example 2: VS Code
- **Code:** vscode repo
- **User Data:** `~/.config/Code/User/` (completely separate)
- **Extensions:** `~/.vscode/extensions/` (separate directory)
- **Workspaces:** User-defined locations

### Example 3: Obsidian
- **Code:** Closed source app
- **Vaults:** User chooses location (never mixed)
- **Plugins:** `.obsidian/` in each vault (user's choice to commit or not)

### Example 4: Git Itself
- **Code:** git repo
- **Global Config:** `~/.gitconfig` (never in repo)
- **Repo Config:** `.git/config` (auto-gitignored)

---

## Recommended Strategy for NXTG-Forge

### Phase 1: Immediate Fixes (Today)

Update `.gitignore`:
```gitignore
# User-specific data (NEVER commit these)
.claude/user/
.claude/VISION.md
.claude/vision-events.json
.claude/forge/state.json
.claude/state/current.json
.claude/state/backup.json
**/*.local.md
**/*.local.yml
**/*.local.json

# User sessions and cache
.claude/forge/memory/*
.claude/cache/*
session-*.log

# Environment files
.env.local
.env.dogfood
```

### Phase 2: Structural Changes (This Week)

1. **Create user/system separation:**
   ```
   .claude/
   ├── system/          # Ships with product
   │   ├── templates/
   │   │   ├── vision.template.md
   │   │   ├── config.template.yml
   │   │   └── README.md
   │   └── defaults/
   └── user/            # .gitignored
       ├── vision.md    # Copied from template on first run
       ├── config.yml   # User overrides
       ├── sessions/
       └── state/
   ```

2. **Add initialization logic:**
   ```typescript
   // src/core/initialization.ts
   export async function ensureUserEnvironment() {
     const userDir = USER_DATA_DIR;
     const systemDir = SYSTEM_DATA_DIR;

     if (!fs.existsSync(userDir)) {
       console.log('🎉 First-time setup...');
       await copyTemplates(systemDir, userDir);
       console.log('✓ User environment ready!');
     }
   }
   ```

3. **Update all file paths:**
   - `VISION.md` → `user/vision.md`
   - `vision-events.json` → `user/sessions/vision-events.json`
   - `state.json` → `user/state/current.json`

### Phase 3: Environment Profiles (Next Sprint)

Support multiple profiles:
```bash
# Personal dog-fooding
NXTG_PROFILE=dogfood npm run dev

# Clean public demo
NXTG_PROFILE=demo npm run dev

# Production release testing
NXTG_PROFILE=prod npm run dev
```

Each profile loads from different directories:
- `dogfood` → `.claude/user-dogfood/`
- `demo` → `.claude/user-demo/`
- `prod` → `.claude/user/`

---

## Testing the Separation

### Clean Clone Test
1. Clone repo to new directory
2. Run `npm install`
3. Run `npm run dev`
4. **Expected:** App starts with template data, no errors
5. **Create vision** → saves to `.claude/user/vision.md`
6. Run `git status`
7. **Expected:** No user data files appear

### Dog-Fooding Test
1. Use NXTG-Forge for real work
2. Create visions, run sessions, generate code
3. Run `git status`
4. **Expected:** Only code changes appear, no session/state data

### Public Release Test
1. Run `git clean -fdx` (removes all untracked files)
2. Verify templates are present in `.claude/system/templates/`
3. Package release
4. **Expected:** No personal data included

---

## Migration Plan

### For Existing Users (Backward Compatibility)

```typescript
// Auto-migrate on startup
async function migrateToUserDirectory() {
  const oldVisionPath = '.claude/VISION.md';
  const newVisionPath = '.claude/user/vision.md';

  if (fs.existsSync(oldVisionPath) && !fs.existsSync(newVisionPath)) {
    console.log('📦 Migrating to new user directory structure...');

    await fs.mkdir('.claude/user', { recursive: true });
    await fs.rename(oldVisionPath, newVisionPath);

    console.log('✓ Migration complete! Your data is now in .claude/user/');
  }
}
```

---

## Documentation for Users

Create `docs/USER-DATA.md`:

```markdown
# Where NXTG-Forge Stores Your Data

## Your Personal Data (Never Shared)
- **Location:** `.claude/user/`
- **Contents:** Your visions, sessions, state, preferences
- **Git Status:** Automatically ignored (won't be committed)

## System Templates (Shipped with Product)
- **Location:** `.claude/system/templates/`
- **Contents:** Default templates, examples
- **Git Status:** Committed to repo

## First-Time Setup
On first run, NXTG-Forge copies templates to your user directory.

## Using Multiple Profiles
```bash
# Work projects
NXTG_USER_DATA_DIR=~/.nxtg-work nxtg-forge

# Personal projects
NXTG_USER_DATA_DIR=~/.nxtg-personal nxtg-forge
```

## Resetting to Defaults
Delete `.claude/user/` and restart. Templates will be copied fresh.
```

---

## Success Criteria

✅ Clean `git clone` works without errors
✅ No personal data in public repo
✅ Dog-fooding doesn't pollute releases
✅ Users can reset to defaults easily
✅ Multiple profiles supported
✅ Backward compatible migration
✅ Clear documentation

---

## Key Takeaway

**The Golden Rule:** If a file contains **user-generated content** or **runtime state**, it belongs in the **user directory** and must be **gitignored**.

If it's a **template**, **example**, or **default configuration**, it ships with the product in the **system directory**.

This separation enables you to **fly the plane while building it** without fear of mixing your flight logs into the blueprints. ✈️🔧

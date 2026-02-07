# Dog-Fooding Separation - Implementation Checklist

## Phase 1: Immediate Protection (15 minutes)

- [ ] **Update `.gitignore`** - Add user data patterns
  ```bash
  # Add these lines to .gitignore
  .claude/user/
  .claude/VISION.md
  .claude/vision-events.json
  .claude/forge/state.json
  .claude/state/current.json
  .claude/state/backup.json
  ```

- [ ] **Verify nothing is staged**
  ```bash
  git status
  # Ensure no personal data is staged for commit
  ```

- [ ] **Remove user data from git history** (if already committed)
  ```bash
  git rm --cached .claude/VISION.md
  git rm --cached .claude/vision-events.json
  git rm --cached .claude/forge/state.json
  # Commit the removal
  ```

- [ ] **Test clean clone**
  ```bash
  cd /tmp
  git clone <your-repo> test-clone
  cd test-clone
  npm install
  # Should work without errors
  ```

## Phase 2: Directory Restructure (1 hour)

- [ ] **Create system/user directory structure**
  ```bash
  mkdir -p .claude/system/templates
  mkdir -p .claude/system/defaults
  mkdir -p .claude/user
  ```

- [ ] **Create template files**
  - [ ] `.claude/system/templates/vision.template.md`
  - [ ] `.claude/system/templates/config.template.yml`
  - [ ] `.claude/system/templates/README.md`

- [ ] **Move existing user data** (backup first!)
  ```bash
  # Backup
  cp .claude/VISION.md .claude/VISION.md.backup

  # Move to user directory
  mv .claude/VISION.md .claude/user/vision.md
  mv .claude/vision-events.json .claude/user/vision-events.json
  mv .claude/forge/state.json .claude/user/state.json
  ```

- [ ] **Create `.claude/user/.gitkeep`** (keep directory in git, ignore contents)
  ```bash
  touch .claude/user/.gitkeep
  ```

- [ ] **Update `.gitignore` for user directory**
  ```gitignore
  .claude/user/*
  !.claude/user/.gitkeep
  ```

## Phase 3: Code Updates (2-3 hours)

- [ ] **Create path configuration** (`src/config/paths.ts`)
  ```typescript
  export const PATHS = {
    USER_DATA_DIR: process.env.NXTG_USER_DATA_DIR || '.claude/user',
    SYSTEM_DIR: '.claude/system',
    TEMPLATES_DIR: '.claude/system/templates',
    VISION_FILE: path.join(USER_DATA_DIR, 'vision.md'),
    STATE_FILE: path.join(USER_DATA_DIR, 'state.json'),
    SESSIONS_DIR: path.join(USER_DATA_DIR, 'sessions'),
  };
  ```

- [ ] **Create initialization module** (`src/core/init-user-env.ts`)
  - [ ] Check if user directory exists
  - [ ] Copy templates on first run
  - [ ] Migrate old files if found

- [ ] **Update all file references**
  - [ ] Search codebase for `.claude/VISION.md`
  - [ ] Replace with `PATHS.VISION_FILE`
  - [ ] Search for `vision-events.json`
  - [ ] Search for `state.json`
  - [ ] Update all hardcoded paths

- [ ] **Add startup initialization**
  ```typescript
  // In main app entry point
  import { initializeUserEnvironment } from './core/init-user-env';

  async function main() {
    await initializeUserEnvironment();
    // ... rest of app startup
  }
  ```

- [ ] **Update tests**
  - [ ] Create test fixtures using templates
  - [ ] Update test paths to use PATHS config
  - [ ] Add tests for initialization logic

## Phase 4: Migration & Backward Compatibility (1 hour)

- [ ] **Create migration script** (`scripts/migrate-user-data.ts`)
  - [ ] Detect old file locations
  - [ ] Prompt user before moving
  - [ ] Create backups
  - [ ] Move files to new structure
  - [ ] Update any config references

- [ ] **Add migration to startup**
  - [ ] Run migration check on app start
  - [ ] Show migration message to user
  - [ ] Create `.migrated` flag file

- [ ] **Document migration for users**
  - [ ] Update README with migration notes
  - [ ] Create MIGRATION.md guide

## Phase 5: Documentation (30 minutes)

- [ ] **Create user documentation** (`docs/USER-DATA.md`)
  - [ ] Explain where data is stored
  - [ ] How to reset to defaults
  - [ ] How to use multiple profiles

- [ ] **Update README.md**
  - [ ] Add "Data Storage" section
  - [ ] Link to full docs

- [ ] **Create examples** (`.claude/system/templates/`)
  - [ ] Example vision files
  - [ ] Example config files
  - [ ] README explaining templates

## Phase 6: Testing & Validation (30 minutes)

- [ ] **Clean clone test**
  ```bash
  # In a fresh directory
  git clone <repo> fresh-test
  cd fresh-test
  npm install
  npm run dev
  # Verify templates are copied to .claude/user/
  ```

- [ ] **Dog-fooding test**
  - [ ] Create a real vision
  - [ ] Run a real session
  - [ ] Check `git status`
  - [ ] Verify no user data appears

- [ ] **Migration test**
  - [ ] Clone old version
  - [ ] Create user data in old locations
  - [ ] Checkout new version
  - [ ] Run app
  - [ ] Verify migration works

- [ ] **Multi-profile test** (if implemented)
  ```bash
  NXTG_USER_DATA_DIR=~/.nxtg-test npm run dev
  # Verify separate user data directory works
  ```

## Phase 7: Release Preparation (30 minutes)

- [ ] **Create release branch**
  ```bash
  git checkout -b release/data-separation
  ```

- [ ] **Final audit**
  ```bash
  # Check for any personal data
  git log --all --full-history -- ".claude/VISION.md"
  git log --all --full-history -- ".claude/vision-events.json"
  ```

- [ ] **Clean history if needed** (CAREFUL!)
  ```bash
  # Only if personal data was committed
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch .claude/VISION.md" \
    --prune-empty --tag-name-filter cat -- --all
  ```

- [ ] **Update CHANGELOG.md**
  - [ ] Note breaking change (data location)
  - [ ] Document migration path

- [ ] **Create PR**
  - [ ] Clear description of changes
  - [ ] Migration guide in PR description
  - [ ] Tag as breaking change

## Success Validation

Run this final checklist before merging:

```bash
# 1. Clean clone works
cd /tmp && git clone <repo> test1 && cd test1 && npm install && npm run dev

# 2. No user data in repo
cd <repo> && git status && git log --all -- .claude/user/

# 3. Templates exist
ls .claude/system/templates/

# 4. User directory is gitignored
echo "test" > .claude/user/test.txt && git status | grep -q "test.txt" && echo "FAIL: User data not ignored!" || echo "PASS: User data ignored"
```

All must pass! ✅

---

## Estimated Time

- **Phase 1:** 15 min
- **Phase 2:** 1 hour
- **Phase 3:** 2-3 hours
- **Phase 4:** 1 hour
- **Phase 5:** 30 min
- **Phase 6:** 30 min
- **Phase 7:** 30 min

**Total:** ~6-7 hours of focused work

---

## Priority

**Critical** - Must be done before public release to avoid leaking personal data.

**Recommended Approach:** Do Phase 1 immediately (15 min), then schedule the rest for a dedicated sprint.

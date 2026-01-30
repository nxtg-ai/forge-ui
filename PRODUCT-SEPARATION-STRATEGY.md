# Product Separation Strategy

## Problem Statement
We want to **dog-food** NXTG-Forge (use it to build itself and other projects) while keeping **personal usage data separate** from the public GitHub release.

## Current Situation
- `.claude/VISION.md` contains personal vision documents
- `.claude/vision-events.json` tracks personal usage history
- `.claude/forge/state.json` contains session data
- User-specific configurations mixed with product code

## Required Separation

### What Should Ship Publicly
✅ Product code (src/, components, services)
✅ Documentation (README, API docs)
✅ Example/template files
✅ Test suites
✅ Build configuration
✅ Empty state UI/UX

### What Should Stay Private
❌ Personal vision documents (actual content)
❌ Session history and state
❌ User-specific configurations
❌ Personal project data
❌ Usage analytics
❌ Test data from dog-fooding

## Proposed Solutions

### Option 1: .gitignore Patterns
```gitignore
# User-specific data (keep private)
.claude/VISION.md
.claude/vision-events.json
.claude/forge/state.json
.claude/forge/memory/*
.claude/state/current.json
.claude/state/backup.json

# Ship templates instead
!.claude/VISION.template.md
!.claude/vision-events.template.json
```

### Option 2: Separate User Directory
```
.claude/
├── system/          # Ships with product
│   ├── templates/
│   ├── defaults/
│   └── examples/
├── user/           # .gitignore'd, local only
│   ├── vision.md
│   ├── sessions/
│   └── state/
```

### Option 3: Environment-Based Config
```typescript
const USER_DATA_DIR = process.env.NXTG_USER_DATA || '.claude/user';
const SYSTEM_DIR = '.claude/system';
```

### Option 4: Hybrid Approach (Recommended)
- Use `.local.md` suffix for user files (auto-ignored)
- Ship `.template.md` files as examples
- Separate `user/` directory for runtime data
- Clear documentation on what to gitignore

## Implementation Tasks
- [ ] Audit current `.gitignore` patterns
- [ ] Create template files for all user-facing configs
- [ ] Move user data to `.local` or `user/` directory
- [ ] Update documentation
- [ ] Add startup detection (if no user config, copy templates)
- [ ] Test clean clone experience

## Success Criteria
- Clean `git clone` works out of box
- User can start using immediately
- No personal data in public repo
- Dog-fooding doesn't pollute releases
- Clear separation for contributors

---

**Status:** Planning
**Priority:** High (blocks public release)
**Owner:** TBD

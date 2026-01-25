# Upgrade Command

Upgrade NXTG-Forge version, migrate configurations, and update project structure.

## Usage

```bash
/upgrade [version] [--check] [--dry-run] [--backup]
```

## Arguments

- `version`: Target version (latest if omitted)
- `--check`: Check for available upgrades
- `--dry-run`: Preview changes without applying
- `--backup`: Create backup before upgrading

## Upgrade Process

### 1. Check Current Version

```bash
/upgrade --check
```

Output:
```
Current Version: 3.0.0
Latest Version: 3.2.0

Available Upgrades:
- 3.0.0 → 3.1.0 (Minor)
  - New: Multi-agent workflows
  - New: Enhanced checkpointing
  - Fixed: State synchronization

- 3.1.0 → 3.2.0 (Patch)
  - Fixed: Configuration validation
  - Improved: Performance optimizations
```

### 2. Preview Upgrade

```bash
/upgrade --dry-run
```

### 3. Backup

```bash
/upgrade --backup
```

Creates: `.claude/backups/pre-upgrade-20250107.tar.gz`

### 4. Perform Upgrade

```bash
/upgrade
```

Output:
```
Upgrading NXTG-Forge...

Phase 1: Backup
  ✓ Created backup: pre-upgrade-20250107.tar.gz

Phase 2: Migration
  ✓ Updated config schema
  ✓ Migrated state.json
  ✓ Updated hooks
  ✓ Updated templates

Phase 3: Verification
  ✓ Config validated
  ✓ State validated
  ✓ All checks passed

Upgrade complete: 3.0.0 → 3.2.0
```

## What Gets Upgraded

1. Core system files
2. Configuration schema
3. State management
4. Command definitions
5. Skill definitions
6. Templates
7. Workflows
8. Hooks

## Breaking Changes

Major version upgrades may include breaking changes:

```
Upgrading to 4.0.0 includes breaking changes:

1. State file format changed
   Migration: Automatic
   Impact: None if using latest state schema

2. Hook signature updated
   Migration: Manual update required
   Files: .claude/hooks/*.sh

3. Deprecated commands removed
   - /old-command → Use /new-command instead
```

## Rollback

If upgrade fails:

```bash
/upgrade --rollback
```

Restores from pre-upgrade backup.

## Configuration Migration

Automatic migration of config files:

```
Old config.json → New config schema
  + Added: agent_assignment settings
  + Added: checkpoint_retention policy
  - Removed: legacy_mode option
  ~ Changed: state_sync.frequency (string → int)
```

## Best Practices

1. Always create backup before upgrading
2. Read release notes
3. Test in development first
4. Review breaking changes
5. Update documentation
6. Run tests after upgrade
7. Verify integrations

## See Also

- `/init` - Initialize NXTG-Forge
- `/status` - Check system health
- `/checkpoint` - Create backup checkpoint

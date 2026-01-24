# Restore Command

Restore project state from checkpoints, recovering from failures or rolling back changes.

## Usage

```bash
/restore <checkpoint-id> [--preview] [--partial] [--verify]
```

## Arguments

- `checkpoint-id`: ID of checkpoint to restore from
- `--preview`: Show what will be restored without making changes
- `--partial`: Restore specific components only
- `--verify`: Verify checkpoint integrity before restoring

## Restore Workflow

### 1. List Available Checkpoints

```bash
/checkpoint --list
```

### 2. Preview Restore

```bash
/restore checkpoint-20250107-120000 --preview
```

Output:
```
Restore Preview for checkpoint-20250107-120000

Will restore:
  - State file (.claude/state.json)
  - Configuration (8 files)
  - Feature tracking (3 active features)
  - Git commit: abc123
  
Files to restore: 142 files
Files to modify: 7 files
Files to delete: 2 files

Changes:
  + src/auth/oauth.py (will be deleted)
  M src/auth/models.py (will be reverted)
  M src/auth/routes.py (will be reverted)
```

### 3. Verify Checkpoint

```bash
/restore checkpoint-20250107-120000 --verify
```

### 4. Restore

```bash
/restore checkpoint-20250107-120000
```

## Partial Restore

Restore only specific components:

```bash
/restore checkpoint-001 --partial state,config
```

Options:
- `state` - Project state only
- `config` - Configuration files only
- `features` - Feature tracking only
- `files` - Source files only

## Safety Features

1. Creates backup before restoring
2. Verifies checkpoint integrity
3. Validates Git state
4. Confirms destructive changes
5. Allows rollback of restore

## See Also

- `/checkpoint` - Create checkpoints
- `/status` - View current state
- `/deploy` - Deployment with rollback

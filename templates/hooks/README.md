# NXTG-Forge Hooks

Claude Code lifecycle hooks for NXTG-Forge automation.

## Overview

These hooks are automatically executed by Claude Code at various points during task execution to maintain project state, validate changes, and provide helpful feedback.

## Available Hooks

### 1. pre-task.sh

**Triggers**: Before Claude Code starts executing a task

**Functions**:
- Ensures `state.json` exists (creates from template if missing)
- Updates last session info with task details
- Checks for uncommitted git changes
- Validates project structure

**Environment Variables**:
- `TASK_ID` - Unique identifier for the task
- `TASK_DESCRIPTION` - Description of the task
- `AGENT_TYPE` - Type of agent handling the task

**Example Output**:
```
[NXTG-Forge] Pre-task hook triggered
[Success] Updated state.json with task info
[Ready] Pre-task checks complete
```

### 2. post-task.sh

**Triggers**: After Claude Code completes a task

**Functions**:
- Updates state.json with completion status
- Runs quick test validation
- Checks code quality with linter
- Updates quality metrics
- Suggests next steps
- Recommends checkpoint creation for major tasks

**Environment Variables**:
- `TASK_ID` - Unique identifier for the task
- `TASK_STATUS` - Status (success, failed, cancelled)
- `TASK_DURATION` - Duration in seconds
- `FILES_MODIFIED` - Number of files modified

**Example Output**:
```
[NXTG-Forge] Post-task hook triggered
[Success] Task completed successfully
[Tests] Quick validation passed
[Lint] No linting issues found
[Next] Consider running:
  • make test
  • make quality
  • git status
```

### 3. on-error.sh

**Triggers**: When an error occurs during task execution

**Functions**:
- Logs error details to `.claude/errors.log`
- Updates state.json with error status
- Analyzes error type and provides suggestions
- Checks for repeated errors
- Suggests recovery actions
- Recommends checkpoint creation

**Environment Variables**:
- `ERROR_CODE` - Exit code of the failed command
- `ERROR_MESSAGE` - Error message
- `ERROR_FILE` - File where error occurred
- `ERROR_LINE` - Line number where error occurred
- `TASK_ID` - Current task identifier

**Error Analysis**:
- Module/Import errors → Suggests installing dependencies
- Permission errors → Suggests fixing permissions
- Syntax errors → Suggests running formatter
- Connection errors → Suggests checking services

**Example Output**:
```
[Error] Error handler triggered
[Log] Error logged to .claude/errors.log
[Analysis] Python import error detected. Try:
  • pip install -r requirements.txt
  • make dev-install
[Recovery] Recommended actions:
  1. Review error message and fix the issue
  2. Run diagnostics: make test, make lint
```

### 4. on-file-change.sh

**Triggers**: When files are modified during task execution

**Functions**:
- Auto-formats Python files with Black
- Validates JSON/YAML syntax
- Warns about critical file modifications
- Tracks file statistics
- Suggests running tests when test files change

**Environment Variables**:
- `CHANGED_FILE` - Path to the changed file
- `CHANGE_TYPE` - Type of change (created, modified, deleted)
- `FILE_TYPE` - File extension/type

**Monitored Critical Files**:
- `.env` - Warns about never committing
- `requirements.txt` / `package.json` - Suggests reinstalling
- `.claude/state.json` - Validates structure

**Example Output**:
```
[File Change] modified: forge/cli.py
[Format] Auto-formatted Python file
[Valid] JSON syntax is valid
```

### 5. state-sync.sh

**Triggers**: Periodic state synchronization or manual checkpoint creation

**Functions**:
- Creates backups of state.json (keeps last 10)
- Validates state.json structure
- Syncs project statistics (file counts, lines of code)
- Updates git information
- Calculates project health score
- Creates checkpoints
- Verifies state integrity

**Environment Variables**:
- `SYNC_TYPE` - Type of sync (auto, manual, checkpoint)
- `CHECKPOINT_DESCRIPTION` - Description for checkpoint

**Statistics Tracked**:
- Python file count
- Test file count
- Total lines of code
- Git branch/commit
- Project health score

**Example Output**:
```
[State Sync] Starting state synchronization...
[Backup] State backed up to: state_20260105_114712.json
[Valid] state.json structure is valid
[Updated] Synced project statistics
  • Python files: 15
  • Test files: 38
  • Total lines: 4,523
[Git] Branch: main | Commit: abc1234 | Status: clean
[Health] Project health score: 78%
[Complete] State synchronization complete
```

## State Management

### state.json Template

First-time users start with `state.json.template`, which is copied to `state.json` on first init:

```json
{
  "version": "1.0.0",
  "project": { ... },
  "development": { ... },
  "agents": { ... },
  "quality": { ... }
}
```

### Backup Strategy

- **Automatic Backups**: Created on every sync
- **Location**: `.claude/backups/`
- **Retention**: Last 10 backups
- **Naming**: `state_YYYYMMDD_HHMMSS.json`

### Checkpoints

- **Purpose**: Save milestone states
- **Location**: `.claude/checkpoints/`
- **Creation**: Manual via `forge checkpoint` or automatic for major tasks
- **Restore**: `forge restore [checkpoint-id]`

## Dependencies

Hooks work with minimal dependencies but utilize these tools when available:

- **Required**: bash
- **Recommended**:
  - `jq` - JSON manipulation (state updates)
  - `git` - Version control integration
  - `python` - Quality checks and health scoring
  - `black` - Auto-formatting Python files
  - `ruff` - Code linting

## Manual Execution

You can run hooks manually for testing:

```bash
# Test pre-task hook
TASK_ID="test-123" TASK_DESCRIPTION="Test" .claude/hooks/pre-task.sh

# Test state sync
.claude/hooks/state-sync.sh

# Create checkpoint
SYNC_TYPE="checkpoint" CHECKPOINT_DESCRIPTION="Manual test" .claude/hooks/state-sync.sh
```

## Troubleshooting

### Hook Not Executing

1. Verify executable permissions:
   ```bash
   chmod +x .claude/hooks/*.sh
   ```

2. Check hook file exists and has content:
   ```bash
   ls -la .claude/hooks/
   ```

### state.json Errors

If state.json becomes corrupted:

1. Hooks automatically restore from latest backup
2. Manual restore: `cp .claude/backups/state_*.json .claude/state.json`
3. Reset from template: `cp .claude/state.json.template .claude/state.json`

### Error Logs

View error history:
```bash
cat .claude/errors.log
tail -f .claude/errors.log  # Watch in real-time
```

## Version Control

The `.gitignore` is configured to:

- ✅ **Keep**: Hook scripts, state.json.template
- ❌ **Ignore**: state.json, backups/, checkpoints/, errors.log

This ensures:
- Templates are shared across the team
- User-specific state is not committed
- Clean git history

## Best Practices

1. **Let hooks run automatically** - They're designed to work in the background
2. **Review error logs periodically** - Catch recurring issues
3. **Create checkpoints before major changes** - Easy rollback
4. **Keep dependencies installed** - Especially `jq` for state management
5. **Don't edit state.json directly** - Use hooks or Python CLI

## Integration with NXTG-Forge

These hooks are an integral part of the NXTG-Forge ecosystem:

- **State Manager** (`forge/state_manager.py`) - Python interface to state.json
- **Gap Analyzer** (`forge/gap_analyzer.py`) - Calculates health scores
- **CLI** (`forge/cli.py`) - Commands like `forge checkpoint`, `forge restore`
- **Agents** (`forge/agents/`) - Specialized AI agents tracked in state

## Contributing

When adding new hooks:

1. Follow the naming convention: `on-*.sh` or `*-task.sh`
2. Make executable: `chmod +x .claude/hooks/your-hook.sh`
3. Add environment variable documentation
4. Include colored output for better UX
5. Handle errors gracefully (don't break workflow)
6. Update this README

---

**Version**: 1.0.0
**Last Updated**: 2026-01-05
**Maintainer**: NXTG-Forge Team

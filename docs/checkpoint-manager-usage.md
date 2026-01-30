# CheckpointManager Usage Guide

The `CheckpointManager` provides simple file-based task state persistence for recovery in NXTG-Forge.

## Overview

Checkpoints are stored in `.forge/checkpoints/{taskId}.json` and contain:
- Task metadata
- Execution state (step, artifacts, errors)
- Timestamp
- Custom metadata

## Basic Usage

```typescript
import { CheckpointManager, TaskCheckpoint } from '@nxtg-forge/core';

// Initialize
const manager = new CheckpointManager('/path/to/project');
await manager.initialize();

// Create a checkpoint
const checkpoint: TaskCheckpoint = {
  taskId: 'feature-123',
  timestamp: new Date(),
  task: {
    id: 'feature-123',
    title: 'Implement authentication',
    description: 'Add OAuth2 authentication',
    status: TaskStatus.IN_PROGRESS,
    dependencies: [],
    createdAt: new Date(),
    priority: 8,
    artifacts: []
  },
  executionState: {
    step: 3,
    totalSteps: 5,
    currentAction: 'Configuring OAuth provider',
    artifacts: ['src/auth/oauth.ts', 'src/auth/config.ts'],
    errors: []
  },
  metadata: {
    sessionId: 'abc-123',
    branch: 'feature/auth'
  }
};

// Save checkpoint
const saveResult = await manager.saveCheckpoint('feature-123', checkpoint);
if (saveResult.isErr()) {
  console.error('Failed to save:', saveResult.error);
}

// Restore from checkpoint
const restoreResult = await manager.restoreFromCheckpoint('feature-123');
if (restoreResult.isOk()) {
  const restored = restoreResult.value;
  console.log(`Restored task at step ${restored.executionState.step}`);
}

// Check if checkpoint exists
const exists = await manager.hasCheckpoint('feature-123');

// List all checkpoints
const checkpoints = await manager.listCheckpoints();
console.log(`Found ${checkpoints.length} checkpoints`);

// Clear a checkpoint
await manager.clearCheckpoint('feature-123');

// Cleanup old checkpoints (older than 24 hours)
const cleaned = await manager.cleanupOldCheckpoints(24 * 60 * 60 * 1000);
```

## Integration with StateManager

The `StateManager` includes checkpoint methods for convenience:

```typescript
import { StateManager } from '@nxtg-forge/core';

const stateManager = new StateManager('/path/to/project');
await stateManager.initialize();

// All checkpoint methods are available
await stateManager.saveCheckpoint(taskId, checkpoint);
await stateManager.restoreFromCheckpoint(taskId);
await stateManager.listCheckpoints();
await stateManager.clearCheckpoint(taskId);
```

## Error Handling

All methods return `Result<T, string>` for predictable error handling:

```typescript
const result = await manager.saveCheckpoint(taskId, checkpoint);

if (result.isOk()) {
  console.log('Checkpoint saved successfully');
} else {
  console.error('Save failed:', result.error);
}

// Or use match for branching
result.match({
  ok: () => console.log('Success!'),
  err: (error) => console.error('Failed:', error)
});

// Or unwrap (throws on error)
result.unwrap();

// Or provide fallback
const checkpoints = result.unwrapOr([]);
```

## Recovery Workflow

```typescript
async function recoverTask(taskId: string) {
  const result = await manager.restoreFromCheckpoint(taskId);

  if (result.isErr()) {
    console.log('No checkpoint found, starting fresh');
    return null;
  }

  const checkpoint = result.value;

  // Check if checkpoint is recent (within 1 hour)
  const ageResult = await manager.getCheckpointAge(taskId);
  const age = ageResult.unwrapOr(Infinity);

  if (age > 60 * 60 * 1000) {
    console.log('Checkpoint is too old, starting fresh');
    await manager.clearCheckpoint(taskId);
    return null;
  }

  console.log(`Resuming from step ${checkpoint.executionState.step}`);
  return checkpoint;
}
```

## Automatic Cleanup

```typescript
// Clean up checkpoints older than 7 days on startup
async function initializeWithCleanup() {
  const manager = new CheckpointManager();
  await manager.initialize();

  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const result = await manager.cleanupOldCheckpoints(maxAge);

  if (result.isOk()) {
    console.log(`Cleaned up ${result.value} old checkpoints`);
  }
}
```

## Best Practices

1. **Save checkpoints at significant milestones** - Don't checkpoint after every operation, only at meaningful state transitions

2. **Include enough context** - Store artifacts, current step, and any data needed to resume

3. **Clean up regularly** - Use `cleanupOldCheckpoints()` to prevent disk bloat

4. **Handle errors gracefully** - Always check Result type before using checkpoint data

5. **Use task IDs consistently** - Ensure task IDs are unique and stable across sessions

6. **Store recovery metadata** - Include session IDs, branch names, or other context that helps identify checkpoint relevance

## File Structure

```
.forge/
  checkpoints/
    feature-123.json
    bugfix-456.json
    task_with_special_chars.json  # Special chars are sanitized
```

## API Reference

### Methods

- `initialize(): Promise<Result<void, string>>` - Initialize checkpoint directory
- `saveCheckpoint(taskId, checkpoint): Promise<Result<void, string>>` - Save checkpoint
- `restoreFromCheckpoint(taskId): Promise<Result<TaskCheckpoint, string>>` - Restore checkpoint
- `listCheckpoints(): Promise<TaskCheckpoint[]>` - List all checkpoints (sorted by timestamp)
- `clearCheckpoint(taskId): Promise<void>` - Remove a checkpoint
- `clearAllCheckpoints(): Promise<Result<number, string>>` - Remove all checkpoints
- `hasCheckpoint(taskId): Promise<boolean>` - Check if checkpoint exists
- `getCheckpointAge(taskId): Promise<Result<number, string>>` - Get age in milliseconds
- `cleanupOldCheckpoints(maxAgeMs): Promise<Result<number, string>>` - Remove old checkpoints

### Types

```typescript
interface TaskCheckpoint {
  taskId: string;
  timestamp: Date;
  task: Task;
  executionState: {
    step: number;
    totalSteps: number;
    currentAction: string;
    artifacts: string[];
    errors: string[];
  };
  metadata?: Record<string, any>;
}
```

## Testing

The checkpoint manager includes comprehensive tests. Run them with:

```bash
npm test -- checkpoint-manager.test.ts
```

All 22 tests cover:
- Basic save/restore operations
- Date parsing
- Error handling
- File sanitization
- Cleanup operations
- Edge cases
```

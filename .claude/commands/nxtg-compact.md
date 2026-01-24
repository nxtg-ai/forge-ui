---
name: nxtg-compact
description: Proactive token optimization - compact context before limits
category: advanced
---

# NXTG-Forge Token Compaction

**Intelligently optimize token usage before hitting limits.**

## When I Execute This Command

I will analyze your current context, identify optimization opportunities, save state, compact the conversation, and show you exactly what was optimized.

## Use Cases

### 1. Approaching Token Limit
```
Current: 180,000 / 200,000 tokens (90%)
⚠️ Approaching limit!

Use /nxtg-compact to:
  • Save full state to disk
  • Compact conversation to ~40% size
  • Preserve all critical context
  • Continue working seamlessly
```

### 2. Before Major Feature Work
```
Starting: OAuth2 integration (large feature)
Current tokens: 120,000 / 200,000 (60%)

Use /nxtg-compact to:
  • Free up token space
  • Start fresh with clean context
  • Ensure state is saved
  • Maximize working space
```

### 3. Performance Optimization
```
Conversation feels slow?
Token count: 150,000 / 200,000 (75%)

Use /nxtg-compact to:
  • Speed up responses
  • Reduce latency
  • Optimize Claude Code performance
```

## Execution Flow

### Step 1: Token Usage Analysis

Analyze current token consumption:
```
🔍 Analyzing token usage...

Current Session:
  • Total tokens: 157,342 / 200,000 (79%)
  • Input tokens: 89,120 (57%)
  • Output tokens: 68,222 (43%)

Breakdown by category:
  • Code implementation: 45,230 tokens (29%)
  • Documentation: 32,110 tokens (20%)
  • Testing: 28,445 tokens (18%)
  • Discussion: 23,557 tokens (15%)
  • State management: 18,000 tokens (11%)
  • Planning: 10,000 tokens (6%)

Compaction potential: ~60,000 tokens (38%)
```

### Step 2: State Preservation

Save complete state before compaction:
```
💾 Preserving state...

Saving to .claude/forge/state.json:
  ✅ Current goal and objectives
  ✅ Completed work (42 items)
  ✅ Pending todos (8 items)
  ✅ Key decisions (15 items)
  ✅ Code artifacts (23 files)
  ✅ Test results (156 tests passing)
  ✅ Documentation updates
  ✅ Engagement quality metrics

State saved successfully: 157KB
Checkpoint created: compact-20260123-143052
```

### Step 3: Compaction Strategy

Determine what to compact:
```
📋 Compaction strategy:

Will KEEP (high priority):
  ✅ Current feature context (last 2 hours)
  ✅ Active code files (23 files)
  ✅ Recent decisions (last 10)
  ✅ Blocking issues (2 items)
  ✅ Next steps (8 items)

Will COMPACT (medium priority):
  🔄 Older discussions → Summary
  🔄 Completed work → Reference
  🔄 Documentation → Links
  🔄 Test output → Pass/fail status

Will ARCHIVE (low priority):
  📦 Initial planning (saved to state)
  📦 Refactoring history (saved to state)
  📦 Debug sessions (saved to state)

Estimated reduction: 40% → 94,400 tokens remaining
```

### Step 4: User Confirmation

Ask for confirmation before compacting:
```
⚠️ Ready to compact conversation

Before: 157,342 tokens (79%)
After:  ~94,400 tokens (47%)
Savings: ~63,000 tokens (40% reduction)

What will happen:
  ✅ Full state saved to disk
  ✅ Checkpoint created for rollback
  ✅ High-priority context preserved
  ✅ Medium-priority context summarized
  ✅ Low-priority context archived

You can restore full context anytime with:
  /nxtg-continue (from checkpoint)
  /nxtg-restore (from any checkpoint)

Proceed with compaction? [Yes/No]
```

### Step 5: Execute Compaction

Perform the optimization:
```
🚀 Compacting conversation...

Phase 1: Creating checkpoint
  ✅ Checkpoint saved: compact-20260123-143052

Phase 2: Summarizing content
  ✅ Summarized 156 test results → "All passing"
  ✅ Summarized 42 completed tasks → "Feature complete"
  ✅ Summarized 15 discussions → Key points preserved

Phase 3: Archiving to state
  ✅ Archived planning sessions
  ✅ Archived refactoring history
  ✅ Archived debug logs

Phase 4: Optimizing context
  ✅ Removed redundant code explanations
  ✅ Removed duplicate file contents
  ✅ Removed verbose output logs

Phase 5: Validating preservation
  ✅ Current goal: Preserved
  ✅ Active files: All preserved
  ✅ Pending todos: All preserved
  ✅ Recent decisions: All preserved
```

### Step 6: Results & Celebration

Show compaction results:
```
╔══════════════════════════════════════════════════════════╗
║              ✅ COMPACTION COMPLETE                      ║
╠══════════════════════════════════════════════════════════╣
║  Before:     157,342 tokens (79%)                        ║
║  After:       94,205 tokens (47%)                        ║
║  Saved:       63,137 tokens (40% reduction)              ║
║  Time:        2.3 seconds                                ║
╚══════════════════════════════════════════════════════════╝

🎉 Conversation optimized!

What changed:
  • Token usage: 79% → 47% (32% improvement)
  • Available space: 42,658 → 105,795 tokens
  • Performance: Faster responses
  • State: Fully preserved in .claude/forge/state.json

What's preserved:
  ✅ Current goal: Implement OAuth2
  ✅ Active files: 23 files in memory
  ✅ Pending todos: 8 items
  ✅ Recent decisions: Last 10 decisions
  ✅ Blocker status: 2 blocking issues

Checkpoint for rollback:
  Name: compact-20260123-143052
  Restore: /nxtg-restore compact-20260123-143052

Continue working with more headroom! 🚀
```

## Compaction Modes

### Mode 1: Automatic (Default)
```
/nxtg-compact
```
Analyzes and compacts with intelligent defaults.

### Mode 2: Aggressive
```
/nxtg-compact --aggressive
```
Maximum compaction (60-70% reduction):
- Summarizes even active discussions
- Archives more aggressively
- Keeps only critical context

### Mode 3: Conservative
```
/nxtg-compact --conservative
```
Gentle compaction (20-30% reduction):
- Preserves more history
- Minimal summarization
- Safe for complex projects

### Mode 4: Dry Run
```
/nxtg-compact --dry-run
```
Shows what would be compacted without executing:
```
🔍 Compaction preview (dry run):

Would compact:
  • 156 test results → 15 tokens
  • 42 completed tasks → 180 tokens
  • 15 discussion threads → 420 tokens
  • 8 file histories → 2,340 tokens

Total savings: ~63,000 tokens (40%)

To execute: /nxtg-compact
```

## Smart Compaction Rules

### Always Preserve
✅ Current goal and active objectives
✅ Last 2 hours of conversation
✅ Active code files (currently editing)
✅ Blocking issues
✅ Pending todos
✅ Recent decisions (last 10)
✅ Error messages and warnings

### Summarize
🔄 Completed work (task → outcome)
🔄 Test results (details → pass/fail)
🔄 Documentation (content → links)
🔄 Discussions (thread → key points)
🔄 Refactoring (changes → summary)

### Archive to State
📦 Planning sessions
📦 Historical discussions
📦 Old debug sessions
📦 Completed feature details
📦 Previous iterations

### Remove Safely
🗑️ Duplicate content
🗑️ Redundant explanations
🗑️ Verbose logs
🗑️ Temporary debugging code
🗑️ Obsolete context

## Rollback & Recovery

If compaction removed something needed:

```bash
# Restore from checkpoint
/nxtg-restore compact-20260123-143052

# Or restore specific context
/nxtg-continue --from-state

# View what was archived
cat .claude/forge/state.json | jq '.context.archived_sessions'
```

## Automatic Compaction

Enable automatic compaction at thresholds:

```bash
# Auto-compact at 80% token usage
/nxtg-compact --auto-enable --threshold 80

# Auto-compact every 50,000 tokens
/nxtg-compact --auto-enable --interval 50000
```

**Configured in**: `.claude/hooks/pre-compact.sh` (runs automatically)

## Token Usage Optimization Tips

### Proactive Compaction
```
Compact BEFORE hitting limits, not after:
  • At 60-70%: Gentle compaction
  • At 75-85%: Standard compaction
  • At 90%+: Aggressive compaction
```

### Regular Checkpoints
```
Create checkpoints at milestones:
  /nxtg-checkpoint "feature complete"

Then compact freely:
  /nxtg-compact
```

### State-First Workflow
```
Save important context to state:
  "Remember: using JWT for auth (decision: stateless architecture)"

Then compact conversations:
  /nxtg-compact
```

## Performance Impact

### Before Compaction (157K tokens)
- Response latency: ~3-5 seconds
- Memory usage: High
- Context window: 79% full

### After Compaction (94K tokens)
- Response latency: ~1-2 seconds ✅
- Memory usage: Medium ✅
- Context window: 47% full ✅

**Compaction = Faster Claude Code**

## See Also

- `/nxtg-status` - Check current token usage
- `/nxtg-checkpoint` - Save before compacting
- `/nxtg-restore` - Restore if needed
- `/nxtg-export` - Export full state

---

**Make token management invisible and delightful.**

---
name: nxtg-continue
description: Resume from last checkpoint with zero context loss
category: core
---

# NXTG-Forge Session Resumption

**Pick up exactly where you left off—zero context loss, instant productivity.**

## When I Execute This Command

I will load your last checkpoint, restore full context, show completed work, display pending tasks, and continue seamlessly from where we stopped.

## The Problem This Solves

### Before `/nxtg-continue` (Standard Claude)
```
[Session timeout]

You: [New session] "Continue working on the authentication feature"

Claude: "I don't see any previous context. Can you describe:
  • What you've built so far?
  • What's left to do?
  • What decisions were made?
  • What tests are passing?"

You: [Spends 10 minutes re-explaining everything] 😫
```

### After `/nxtg-continue` (NXTG-Forge v3.0)
```
[Session timeout]

You: [New session] "/nxtg-continue"

Claude: "Resuming authentication feature.

Last checkpoint: 2026-01-23 13:42 (1 hour ago)

Completed (3 hours ago):
  ✅ User model with password hashing
  ✅ JWT token service
  ✅ Login/register endpoints
  ✅ 42 tests (all passing)

Remaining:
  ☐ Password reset flow
  ☐ Email verification
  ☐ Rate limiting

Last working on: Password reset endpoint design

Continuing with password reset flow..." 🚀

[Immediately productive—zero re-explanation]
```

**The difference**: Instant context restoration vs 10 minutes of explaining.

## How It Works

### Step 1: Load Last Checkpoint

Read `.claude/forge/state.json`:
```json
{
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "started_at": "2026-01-23T10:00:00Z",
    "last_updated": "2026-01-23T13:42:15Z"
  },
  "context": {
    "current_goal": "Implement authentication with JWT",
    "completed_work": [...],
    "pending_todos": [...],
    "key_decisions": [...],
    "last_activity": "Designing password reset endpoint"
  },
  "recovery": {
    "checkpoint": "auth-endpoints-complete",
    "next_steps": [
      "Design password reset flow",
      "Implement email service",
      "Add rate limiting"
    ],
    "blockers": []
  }
}
```

### Step 2: Display Resumption Summary

Show clear, actionable summary:
```
╔══════════════════════════════════════════════════════════╗
║            RESUMING PREVIOUS SESSION                      ║
╚══════════════════════════════════════════════════════════╝

📍 Goal: Implement authentication with JWT tokens

⏰ Last active: 1 hour ago (2026-01-23 13:42)
📦 Checkpoint: auth-endpoints-complete

✅ Completed work (42 items):

   Authentication Core:
   • User model with bcrypt hashing ✅
   • JWT service (access + refresh tokens) ✅
   • Login endpoint (POST /login) ✅
   • Register endpoint (POST /register) ✅
   • Token refresh endpoint (POST /refresh) ✅

   Testing & Quality:
   • 42 tests written, all passing ✅
   • 96% code coverage ✅
   • Security audit passed ✅

   ... [View all 42 items: /nxtg-status]

☐ Pending work (3 items):

   High Priority:
   • Password reset flow (next up)
   • Email verification
   • Rate limiting

🔑 Key decisions made:
   • Using JWT for stateless sessions
   • bcrypt with 12 rounds for passwords
   • 15min access token, 7day refresh token

💡 Last working on:
   "Designing password reset endpoint - considering email vs SMS"

🚀 Ready to continue! What would you like to work on?
```

### Step 3: Restore Working Context

Load relevant files into context:
```
📂 Loading relevant files...

   Active files (last edited):
   ✅ models/user.py
   ✅ services/token_service.py
   ✅ api/auth.py
   ✅ tests/test_auth.py

   Recently referenced:
   ✅ config/settings.py
   ✅ utils/email.py

Files loaded: 6 (ready for editing)
```

### Step 4: Smart Next-Step Suggestion

Proactively suggest what to do next:
```
💡 Suggested next steps:

1. **Password Reset Flow** (recommended)
   - Design reset token generation
   - Create /forgot-password endpoint
   - Build email template
   - Add /reset-password endpoint
   - Write tests

   Estimated time: 2-3 hours
   Would you like me to start? [Yes/No]

2. **Email Verification** (alternative)
   - If you want to do email setup first

3. **Rate Limiting** (quick win)
   - Can be done in 30 minutes
   - Protects against brute force

Which would you prefer?
```

## Resumption Modes

### Mode 1: Automatic (Default)
```bash
/nxtg-continue
```
Loads last checkpoint automatically.

### Mode 2: From Specific Checkpoint
```bash
/nxtg-continue --from "auth-endpoints-complete"
```
Restore from named checkpoint instead of latest.

### Mode 3: From Date/Time
```bash
/nxtg-continue --from "2026-01-23 12:00"
```
Restore state from specific timestamp.

### Mode 4: Brief Summary
```bash
/nxtg-continue --brief
```
Quick summary only, no file loading:
```
Resuming: Authentication feature
Completed: 42 items
Pending: 3 items
Next: Password reset flow
```

### Mode 5: Interactive Selection
```bash
/nxtg-continue --interactive
```
Choose what to restore:
```
Available checkpoints:

1. auth-endpoints-complete (1 hour ago)
   - 42 items completed
   - Ready for password reset

2. user-model-complete (3 hours ago)
   - 12 items completed
   - Before JWT implementation

3. project-setup (5 hours ago)
   - Initial setup
   - Before feature work

Which checkpoint? [1-3]:
```

## Smart Recovery

### If State File Missing
```
⚠️ No previous session found

I looked for:
  • .claude/forge/state.json (not found)

This might mean:
  1. First session in this project
  2. State file was deleted
  3. NXTG-Forge not initialized

Want to:
  • Initialize NXTG-Forge: /nxtg-init
  • Start fresh session: Just tell me what to build!
```

### If State File Corrupted
```
⚠️ State file has invalid JSON

Fix options:
  1. Restore from backup (.claude/forge/state.json.bak)
  2. Start fresh (creates new state.json)
  3. Manual repair (open state.json in editor)

Recommended: Option 1 (restoring from backup...)

✅ Backup restored successfully
✅ State validated
✅ Ready to continue
```

### If Multiple Sessions
```
⚠️ Multiple sessions detected

Sessions found:
  1. "Authentication feature" (1 hour ago, 42 items)
  2. "Refactoring" (1 day ago, 15 items)
  3. "Documentation" (3 days ago, 8 items)

Which session to continue? [1-3]:
```

## Auto-Continue Feature

Enable automatic resumption on session start:

```bash
# Configure in .claude/hooks/session-start.md
# Auto-offers /nxtg-continue if state exists

When you open Claude Code:
  "💡 Previous session detected (1 hour ago).
   Type /nxtg-continue to resume where you left off."
```

## What Gets Restored

### Always Restored
✅ Current goal and objectives
✅ Completed work (with timestamps)
✅ Pending todos (prioritized)
✅ Key decisions (with rationale)
✅ Blocking issues
✅ Recent file edits
✅ Test status

### Optionally Restored
🔄 Full conversation history (use `--full`)
🔄 Debug sessions
🔄 Planning discussions
🔄 Archived content

### Never Restored (Irrelevant)
❌ Temporary debugging output
❌ Duplicate content
❌ Obsolete context
❌ Random explorations

## Context Preservation Quality

Track how well context is preserved:
```
📊 Context Preservation: 96/100

Metrics:
  • Goal clarity: 98% (crystal clear)
  • Work completeness: 100% (all items tracked)
  • Decision preservation: 94% (rationales captured)
  • Next steps: 92% (actionable)

Overall: EXCELLENT - Ready to continue seamlessly
```

## Use Cases

### 1. Daily Development
```
Day 1, 5pm: Working on authentication
[End of day]

Day 2, 9am: /nxtg-continue
[Instantly productive—zero ramp-up]
```

### 2. Context Switch
```
Working on Feature A
[Urgent bug in Feature B]
/nxtg-checkpoint "feature-a-paused"

[Work on Feature B]

[Bug fixed]
/nxtg-continue --from "feature-a-paused"
[Back to Feature A instantly]
```

### 3. After Interruption
```
Working on complex refactoring
[Meeting interruption]

[After meeting]
/nxtg-continue
"Resuming refactoring - you were extracting the AuthService..."
```

### 4. Cross-Device
```
Desktop: Working on feature, checkpoint created
[Go home]

Laptop: /nxtg-continue
[Same context, different device]
```

### 5. Team Handoff
```
Developer A:
  /nxtg-checkpoint "oauth2-in-progress"
  /nxtg-export markdown

Developer B:
  /nxtg-continue --from "oauth2-in-progress"
  [Reads exported markdown for context]
  [Continues work seamlessly]
```

## Performance

### Resumption Speed
- State loading: <100ms
- Context restoration: <500ms
- File loading: <1 second
- **Total**: <2 seconds to full productivity

### Compared to Manual Re-explanation
- Manual explanation: 5-15 minutes
- `/nxtg-continue`: <2 seconds
- **Time saved**: 99.8%

## See Also

- `/nxtg-checkpoint` - Create named checkpoints
- `/nxtg-status` - View current state
- `/nxtg-restore` - Restore from any checkpoint
- `/nxtg-export` - Export session for sharing

---

**Never lose context again. Resume instantly.**

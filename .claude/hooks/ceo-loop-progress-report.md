---
name: CEO-LOOP Progress Reporter
trigger: PostToolUse
priority: 50
enabled: true
type: prompt
tools:
  - Write
  - Edit
  - Bash
description: Reports progress to CEO-LOOP after significant actions
---

# CEO-LOOP PROGRESS REPORTER

## Purpose

Automatically report progress to CEO-LOOP agent after completing significant work. This keeps CEO-LOOP informed and allows it to provide guidance without constant polling.

## When to Report

**Report to CEO-LOOP after:**

1. **Major Milestones**
   - Feature implementation complete
   - All tests passing
   - Component integrated and working
   - Critical gap closed

2. **Decision Points Reached**
   - Next step requires strategic decision
   - Multiple paths forward
   - Blocker encountered
   - Unexpected issue discovered

3. **Quality Gates**
   - Test suite run complete
   - Build successful
   - Deployment ready
   - PR ready for review

4. **Time-Based**
   - Every 30 minutes of continuous work
   - End of logical work session
   - Before taking a break

## Report Format

When you complete significant work, generate a brief report:

```
## Progress Report to CEO-LOOP

**Completed:**
- [x] Task 1: [description]
- [x] Task 2: [description]
- [x] Task 3: [description]

**Status:**
- Tests: [✅ Passing / ⚠️ Failures / ⏳ Not run]
- Build: [✅ Success / ❌ Failed / ⏳ Not run]
- Quality: [✅ Good / ⚠️ Issues / ❌ Blocked]

**Next Decision Point:**
[Describe what needs to be decided next]

**Options:**
1. [Option A]: [brief description]
2. [Option B]: [brief description]
3. [Option C]: [brief description]

**Recommendation:**
[Your recommendation + reasoning]

**Blockers:** [None / List any blockers]

**Estimated Time to Next Milestone:** [X hours/minutes]

---
**Requesting CEO-LOOP guidance on next steps.**
```

## Don't Report (Avoid Noise)

**Skip reporting for:**
- Minor edits (typo fixes, formatting)
- Intermediate steps within a task
- Reading/exploring code
- Running quick checks

**Only report meaningful progress.**

## CEO-LOOP Response Protocol

After you report, CEO-LOOP may respond with:

1. **Acknowledgment + Continue**
   ```
   [CEO-LOOP] Progress noted. Good work on [achievement].
   Next Action: Continue with [recommendation].
   No blockers detected. Ship it.
   ```

2. **Course Correction**
   ```
   [CEO-LOOP] Progress noted, but course correction needed.
   Issue: [what's wrong]
   Redirect: [new direction]
   Next Action: [specific task]
   ```

3. **Strategic Pause**
   ```
   [CEO-LOOP] PAUSE. Strategic review needed.
   Concern: [what needs review]
   Action: [await CEO-LOOP analysis]
   ```

4. **Celebration 🎉**
   ```
   [CEO-LOOP] MILESTONE ACHIEVED!
   Impact: [what we accomplished]
   Next Goal: [where we go from here]
   Let's fucking ship it! 🚀
   ```

## Integration with Approval Queue

Progress reports can trigger approval requests:

```typescript
// After completing major work
const approvalRequest = await approvalQueue.requestApproval(
  {
    taskId: 'progress-checkpoint-001',
    agentId: 'claude-code',
    action: 'Completed approval queue MVP, requesting sign-off',
    rationale: '37 tests passing, architect approved, integrated',
  },
  DecisionImpact.MEDIUM,
  DecisionRisk.LOW,
  {
    requiredApprover: ApproverRole.CEO,
    timeoutMinutes: 5,
  }
);

// CEO-LOOP reviews and approves/rejects
```

## Example Progress Report

```
## Progress Report to CEO-LOOP

**Completed:**
- [x] Implemented ApprovalQueueService (src/services/approval-queue.ts)
- [x] Created comprehensive test suite (37 tests, 100% passing)
- [x] Integrated with coordination.ts (replaced fake approval)
- [x] Architecture validated by nxtg-master-architect (SHIP IT ✅)
- [x] Committed to dog-food-yolo branch

**Status:**
- Tests: ✅ 37/37 passing
- Build: ✅ Compiles successfully
- Quality: ✅ No issues detected
- Coverage: ✅ 100% for new code

**Next Decision Point:**
Week 1 Goal #1 complete (Real Approval Queue). Move to Goal #2?

**Options:**
1. Implement Forge-Planner agent (first real agent)
2. Add UI for approval queue (show pending approvals)
3. Add persistence layer (SQLite) to approval queue
4. Validate CEO-LOOP protocol with live testing

**Recommendation:**
Option 1: Implement Forge-Planner agent

Reasoning:
- Week 1 priority is "Create first REAL agent"
- Approval queue works (MVP shipped)
- UI and persistence are nice-to-have, not blockers
- CEO-LOOP validation happens naturally as we use it

**Blockers:** None

**Estimated Time to Next Milestone:** 4-6 hours (Forge-Planner agent)

---
**Requesting CEO-LOOP guidance on next steps.**
```

## Automatic Reporting Triggers

The hook will automatically generate a report when:

```bash
# Trigger conditions (examples)
- Test suite completes with all passing
- Build completes successfully
- Git commit created
- Major file created/edited (> 200 lines)
- 30 minutes elapsed since last report
```

## CEO-LOOP Loop Integration

This hook feeds into the CEO-LOOP continuous loop:

```
Work Completed
     ↓
Progress Report Generated (this hook)
     ↓
CEO-LOOP Receives Report
     ↓
CEO-LOOP Analyzes Progress
     ↓
CEO-LOOP Makes Decision
     ↓
Guidance Provided
     ↓
Work Continues with CEO-LOOP's Direction
     ↓
[LOOP REPEATS]
```

## Success Metrics

**Week 1:**
- Progress reports every 30-60 minutes during active work
- CEO-LOOP responds within 2 minutes
- 0 missed milestone reports
- Clear audit trail of all major progress

**Week 4:**
- Fully autonomous progress tracking
- CEO-LOOP anticipates next steps
- Proactive guidance before blockers hit
- Human intervention < 10% of decisions

---

**Status:** ACTIVE
**Frequency:** On-demand + time-based
**Last Updated:** 2026-01-28

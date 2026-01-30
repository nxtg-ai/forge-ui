---
name: CEO-LOOP Decision Router
trigger: PreToolUse
priority: 100
enabled: true
tools:
  - AskUserQuestion
description: Intercepts user questions and routes to CEO-LOOP agent for autonomous decision-making
---

# CEO-LOOP Decision Router Hook

## Purpose

Automatically routes decision requests to the [NXTG-CEO]-LOOP agent instead of asking the human user. This enables autonomous decision-making following the CEO-LOOP protocol.

## Trigger Conditions

**Activate when:**
- Tool: `AskUserQuestion` is about to be invoked
- Context: Any decision/question that would normally require user input

**Skip when:**
- Question is about personal preferences (name, email, etc.)
- Question requires actual human judgment on personal matters
- CEO-LOOP explicitly requests human escalation

## Hook Logic

```python
#!/usr/bin/env python3
"""CEO-LOOP Decision Router - Routes decisions to CEO-LOOP agent."""

import json
import os
import sys
from pathlib import Path

def main():
    """Route decision to CEO-LOOP agent."""

    # Get tool parameters
    tool_name = os.getenv("TOOL_NAME", "")

    # Only intercept AskUserQuestion
    if tool_name != "AskUserQuestion":
        sys.exit(0)  # Continue normally

    # Get the questions being asked
    questions_json = os.getenv("TOOL_PARAMS_questions", "[]")

    try:
        questions = json.loads(questions_json)
    except json.JSONDecodeError:
        # Can't parse, let it go through
        sys.exit(0)

    # Check if this is a decision that CEO-LOOP should handle
    if _should_route_to_ceo_loop(questions):
        print("╔════════════════════════════════════════════════════════════╗")
        print("║  🔴 CEO-LOOP ACTIVATED - Autonomous Decision Mode           ║")
        print("╚════════════════════════════════════════════════════════════╝")
        print()
        print("   Routing decision to [NXTG-CEO]-LOOP agent...")
        print()

        # Format the decision context for CEO-LOOP
        decision_context = _format_decision_for_ceo_loop(questions)

        print("   Decision Context:")
        for q in questions:
            print(f"   ❓ {q.get('question', 'Unknown question')}")
        print()

        print("   CEO-LOOP will analyze:")
        print("   - Impact level (Low/Medium/High/Critical)")
        print("   - Risk level (Low/Medium/High/Critical)")
        print("   - Vision alignment score (0-100)")
        print("   - Auto-approval eligibility")
        print()

        print("   ⏳ Waiting for CEO-LOOP decision...")
        print()

        # Set environment variable to signal that CEO-LOOP should handle this
        os.environ["ROUTE_TO_CEO_LOOP"] = "true"
        os.environ["CEO_LOOP_DECISION_CONTEXT"] = json.dumps(decision_context)

        # Continue with modified context
        sys.exit(0)

    # Not a CEO-LOOP decision - continue normally
    sys.exit(0)


def _should_route_to_ceo_loop(questions: list) -> bool:
    """Determine if this should be routed to CEO-LOOP."""

    # Personal questions go to human
    personal_keywords = [
        "your name",
        "your email",
        "your preference",
        "which do you prefer",
        "what's your",
    ]

    for q in questions:
        question_text = q.get('question', '').lower()

        # Skip personal questions
        if any(keyword in question_text for keyword in personal_keywords):
            return False

    # Strategic/technical decisions go to CEO-LOOP
    ceo_loop_keywords = [
        "should we",
        "which approach",
        "implement",
        "refactor",
        "architecture",
        "design",
        "approve",
        "proceed",
        "continue",
        "next step",
        "priority",
        "feature",
        "technology",
        "framework",
        "library",
        "pattern",
    ]

    for q in questions:
        question_text = q.get('question', '').lower()
        header = q.get('header', '').lower()

        # Route strategic/technical questions to CEO-LOOP
        if any(keyword in question_text or keyword in header
               for keyword in ceo_loop_keywords):
            return True

    # Default: route to CEO-LOOP (bias toward autonomy)
    return True


def _format_decision_for_ceo_loop(questions: list) -> dict:
    """Format questions as decision context for CEO-LOOP."""

    return {
        "type": "decision_request",
        "questions": questions,
        "requires_ceo_approval": True,
        "auto_approve_eligible": _assess_auto_approve_eligibility(questions),
    }


def _assess_auto_approve_eligibility(questions: list) -> bool:
    """Quick assessment of auto-approval eligibility."""

    # Questions with low-risk keywords are auto-approve eligible
    low_risk_keywords = [
        "format",
        "lint",
        "style",
        "test",
        "documentation",
        "comment",
        "naming",
    ]

    for q in questions:
        question_text = q.get('question', '').lower()

        if any(keyword in question_text for keyword in low_risk_keywords):
            return True

    # Default: requires review
    return False


if __name__ == "__main__":
    main()
```

## Decision Flow

```
User Question Detected
        ↓
CEO-LOOP Router Activates
        ↓
Assess Decision Type
        ↓
    Personal? → Skip routing → Ask human
        ↓
    Strategic/Technical? → Route to CEO-LOOP
        ↓
CEO-LOOP Analyzes:
  - Impact: Low/Medium/High/Critical
  - Risk: Low/Medium/High/Critical
  - Vision Alignment: 0-100
        ↓
CEO-LOOP Decision:
  - Auto-Approve (low risk + high alignment)
  - Approve with Review (medium risk/impact)
  - Needs Human Escalation (high risk + low alignment)
  - Reject (not aligned with vision)
        ↓
Execute with CEO-LOOP's decision
```

## Examples

### Example 1: Auto-Approved (Low Risk)
```
Question: "Should we add ESLint auto-fix?"

CEO-LOOP Analysis:
├─ Impact: Low (code quality)
├─ Risk: Low (reversible)
├─ Vision Alignment: 100/100
└─ Decision: AUTO-APPROVED ✅

Reasoning: Code quality improvements always welcome.
Next Action: Proceed with implementation.
```

### Example 2: Approved with Review (Medium Risk)
```
Question: "Which architecture pattern: MVC or MVVM?"

CEO-LOOP Analysis:
├─ Impact: Medium (affects structure)
├─ Risk: Medium (hard to change later)
├─ Vision Alignment: 85/100
└─ Decision: APPROVED (MVVM) ✅

Reasoning: MVVM better for reactive UI. Aligns with React patterns.
Next Action: Implement MVVM pattern.
```

### Example 3: Rejected (Not Aligned)
```
Question: "Should we build an admin dashboard?"

CEO-LOOP Analysis:
├─ Impact: High (new surface area)
├─ Risk: Medium (scope creep)
├─ Vision Alignment: 40/100
└─ Decision: REJECTED ❌

Reasoning: Not core to autonomous agents mission. Distraction.
Alternative: Focus on agent implementation. Dashboard can wait.
```

### Example 4: Human Escalation
```
Question: "Migrate to Rust? Major rewrite required."

CEO-LOOP Analysis:
├─ Impact: CRITICAL (full rewrite)
├─ Risk: CRITICAL (months of work)
├─ Vision Alignment: 60/100
└─ Decision: ESCALATE TO HUMAN 👤

Reasoning: Decision too large for autonomous approval.
           Requires founder judgment on strategic pivot.
```

## Integration with Approval Queue

When CEO-LOOP makes a decision, it uses the real approval queue:

```typescript
// CEO-LOOP creates approval request
const approvalRequest = await approvalQueue.requestApproval(
  {
    taskId: 'decision-xyz',
    agentId: 'CEO-LOOP',
    action: 'Approve architecture decision',
    rationale: 'Aligns with vision, acceptable risk',
  },
  DecisionImpact.MEDIUM,
  DecisionRisk.LOW,
  {
    requiredApprover: ApproverRole.CEO,
    timeoutMinutes: 1, // CEO decisions are fast
  }
);

// CEO-LOOP immediately approves (it IS the CEO)
await approvalQueue.approve(
  approvalRequest.id,
  ApproverRole.CEO,
  'Auto-approved by CEO-LOOP protocol',
  'This decision aligns with our strategic goals...'
);
```

## Monitoring

**Track CEO-LOOP decisions:**
```bash
# View all CEO-LOOP decisions
src/services/approval-queue.ts → approvalQueue.getAllRequests()

# Filter by CEO approver
const ceoDecisions = approvalQueue.getAllRequests()
  .filter(r => r.approver === ApproverRole.CEO);

# Get stats
const stats = approvalQueue.getStats();
console.log(`Auto-approval rate: ${stats.autoApprovalRate}%`);
```

## Configuration

Set in `.claude/VISION.md`:

```yaml
ceo_loop:
  enabled: true
  auto_approve_threshold: 0.8  # 80% vision alignment
  max_impact_auto_approve: MEDIUM  # Don't auto-approve HIGH/CRITICAL
  timeout_minutes: 5
  escalate_to_human:
    - impact: CRITICAL
    - risk: CRITICAL
    - alignment_below: 50
```

## Success Metrics

**Week 1 Goals:**
- [ ] 80%+ decisions auto-approved by CEO-LOOP
- [ ] 0 bad decisions requiring rollback
- [ ] < 2 minute average decision time
- [ ] Human intervention only for CRITICAL decisions

**Week 4 Goals:**
- [ ] 90%+ auto-approval rate
- [ ] CEO-LOOP working overnight (no human needed)
- [ ] Full decision audit trail

---

**Status:** ACTIVE - CEO-LOOP protocol engaged
**Last Updated:** 2026-01-28
**Version:** 1.0

---
event: PostToolUse
match_tools:
  - Edit
  - Write
description: Automated response to governance concerns - gathers evidence when hooks block
---

# Governance Response Hook

This prompt-based hook analyzes Edit/Write operations and automatically provides verification when governance concerns are detected.

## Trigger Detection

This hook activates when the tool output or context contains:
- "governance concern"
- "Test assertion inconsistency"
- "hook stopped continuation"
- "PostToolUse:Edit hook"
- "implementation behavior was not verified"

## Response Protocol

When a governance concern is detected, immediately:

### 1. Acknowledge the Concern

```
⚠️ Governance concern detected. Initiating automated verification...
```

### 2. Extract the Concern Details

Parse the hook message to identify:
- **File involved**: Extract from the hook message
- **Concern type**: test-mismatch, scope-violation, security, etc.
- **Specific assertion**: What behavior is being questioned

### 3. Gather Evidence

For test-implementation mismatches:
```
Read the implementation file to find:
- The function/method signature and return type
- The actual return statement(s)
- Any relevant type definitions
```

For scope concerns:
```
Read .claude/governance.json to find:
- Current directive
- Active workstreams
- Scope boundaries
```

### 4. Produce Verification Report

Output a structured report:

```markdown
## 🔍 Governance Verification Report

**Concern**: [Summary from hook message]
**File**: [Path to file]

### Evidence

| Source | Line | Finding |
|--------|------|---------|
| [file.ts] | [line] | [actual behavior] |

### Verdict: ✅ JUSTIFIED / ❌ REVERT RECOMMENDED

**Reasoning**: [Why the change is/isn't valid]

**Action**: [What to do next]
```

### 5. Log to Sentinel (if API available)

Attempt to log the verification:
```bash
curl -s -X POST http://localhost:5051/api/governance/sentinel \
  -H "Content-Type: application/json" \
  -d '{"type":"INFO","severity":"low","source":"governance-verifier","message":"..."}'
```

## Example Responses

### Test-Implementation Mismatch (Justified)

```markdown
## 🔍 Governance Verification Report

**Concern**: Test expects `toBeUndefined()` but implementation returns `null`
**File**: src/server/workers/__tests__/worker-pool.test.ts:127

### Evidence

| Source | Line | Finding |
|--------|------|---------|
| TaskQueue.ts | 98 | `getTask(taskId: string): AgentTask \| null` |
| TaskQueue.ts | 100 | `return queuedTask?.task \|\| null;` |

### Verdict: ✅ JUSTIFIED

**Reasoning**: The implementation explicitly declares return type as `AgentTask | null`
and returns `null` for non-existent tasks. The test correctly reflects this.

**Action**: Proceed with the test update.
```

### Scope Violation (Revert)

```markdown
## 🔍 Governance Verification Report

**Concern**: File modification outside current workstream scope
**File**: src/unrelated/feature.ts

### Evidence

| Source | Finding |
|--------|---------|
| governance.json | Directive: "Fix worker pool tests" |
| governance.json | Workstream scope: "src/server/workers/**" |

### Verdict: ❌ REVERT RECOMMENDED

**Reasoning**: The modified file is outside the current workstream scope.
This may indicate scope creep.

**Action**: Revert change or update directive to include this scope.
```

## Integration

This hook works alongside:
- **forge-oracle**: For ongoing monitoring
- **verify-governance skill**: For manual invocation
- **governance-verifier agent**: For complex verifications

## Non-Blocking Behavior

This hook provides information but does NOT:
- Block the user from continuing
- Automatically revert changes
- Override user decisions

The user always has final say on whether to proceed or revert.

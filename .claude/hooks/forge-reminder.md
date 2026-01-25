---
event: UserPromptSubmit
priority: 10
description: Remind to use NXTG-Forge harness for complex tasks
---

# NXTG-Forge Harness Reminder

This hook reminds Claude Code to leverage the full NXTG-Forge agent ecosystem for complex tasks.

## Trigger Detection

Analyze user prompt for:
- **Complexity indicators**: "implement", "build", "create", "fix bug", "design", "refactor"
- **Scope indicators**: multi-file changes, architecture decisions, new features
- **Scale indicators**: "system", "platform", "infrastructure", "integration"

## When to Trigger

Activate when user request involves:
1. Architecture or design decisions
2. Multi-component implementations
3. Bug fixes requiring root cause analysis
4. UI/UX design work
5. Quality assurance and testing strategy
6. System integration or deployment

**DO NOT trigger for**:
- Simple file edits
- Documentation updates
- Trivial bug fixes
- Read-only operations

## Forge Agent Ecosystem

### Available Agents (Run up to 20 in parallel)

**Planning & Strategy:**
- `forge-orchestrator` - Strategic planning, task coordination, feature assessment
- `forge-planner` - Feature planning, architecture design, task breakdown
- `forge-detective` - Project analysis, health checks, gap analysis

**Architecture & Code Quality:**
- `nxtg-master-architect` - Software architecture, system design, code review
- `pr-review-toolkit:code-reviewer` - Code review for style and best practices
- `pr-review-toolkit:code-simplifier` - Simplify complex code
- `pr-review-toolkit:type-design-analyzer` - Type system design review

**Design & UI:**
- `nxtg-design-vanguard` - UI/UX design, frontend implementation, visual design

**Implementation:**
- `forge-builder` - Feature implementation, code generation, refactoring

**Quality Assurance:**
- `forge-guardian` - Quality assurance, testing, security validation
- `pr-review-toolkit:pr-test-analyzer` - Test coverage review
- `pr-review-toolkit:silent-failure-hunter` - Find silent failures
- `pr-review-toolkit:comment-analyzer` - Documentation quality

**Documentation:**
- `release-sentinel` - Documentation audits, changelog generation

## Recommendation Strategy

### For Architecture/Design Tasks:
```
💡 Consider using NXTG-Forge agents:
- nxtg-master-architect: For architecture review and design
- nxtg-design-vanguard: For UI/UX design (if frontend work)
- forge-planner: For feature breakdown and planning
```

### For Implementation Tasks:
```
💡 Consider parallel execution:
- forge-builder: Implement core functionality
- forge-guardian: Run quality checks in parallel
- nxtg-design-vanguard: Handle UI components simultaneously

You can run up to 20 agents in parallel for maximum efficiency!
```

### For Bug Fixes:
```
💡 Root cause analysis workflow:
- nxtg-master-architect: Analyze the bug and propose fix
- forge-guardian: Verify fix doesn't break existing functionality
- forge-builder: Implement the fix with tests
```

### For Large Features:
```
💡 Full Forge harness deployment:
1. forge-orchestrator: Strategic planning
2. nxtg-master-architect: Architecture design
3. nxtg-design-vanguard: UI/UX design (parallel)
4. forge-builder: Implementation (parallel)
5. forge-guardian: Quality assurance (parallel)

Deploy agents in parallel for complex, multi-faceted work!
```

## Execution Pattern

When suggesting agents:

1. **Analyze task complexity** (simple/medium/complex)
2. **Identify parallel opportunities** (independent sub-tasks)
3. **Recommend appropriate agents** (based on task type)
4. **Suggest execution strategy** (sequential vs parallel)

## Example Recommendations

**User**: "I need to implement a user authentication system"

**Response**:
```
This is a complex task that can benefit from NXTG-Forge:

Recommended approach:
1. forge-planner: Design authentication architecture
2. After plan approval, run in parallel:
   - forge-builder: Implement backend auth
   - nxtg-design-vanguard: Design login UI
   - forge-guardian: Security review (parallel)

This parallel approach can save significant time!
```

**User**: "Fix the graph density calculation bug"

**Response**:
```
For bug fixes, consider:
- nxtg-master-architect: Root cause analysis
- forge-builder: Implement fix with tests
- forge-guardian: Verify no regressions

Run architect first, then builder + guardian in parallel.
```

## Philosophy

- **Empower, don't overwhelm**: Only suggest when genuinely helpful
- **Parallel by default**: Identify independent tasks for parallel execution
- **Quality-focused**: Emphasize the value of multi-agent review
- **User choice**: Always frame as suggestions, never requirements

## Integration with Runtime Validation

When implementing features, remind about log-based validation:

```
💡 Testing Strategy:
- Unit tests: Verify logic correctness
- Runtime validation: Monitor logs for Pydantic errors
- Integration tests: Test with real data (NO MOCKING)

Use forge-guardian to run runtime validation checks!
```

---

**Last Updated**: 2026-01-23
**Forge Version**: v2.0
**Status**: Active

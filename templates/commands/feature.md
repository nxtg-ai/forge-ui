---
description: "Add a new feature with full agent orchestration"
---

# NXTG-Forge Feature Implementation

Arguments: `$ARGUMENTS`

Expected format: `/feature "Feature Name" [--priority high|medium|low] [--agent agent-name]`

## Step 1: Parse Feature Request

```bash
FEATURE_NAME="$ARGUMENTS"
# Extract from arguments or prompt user
```

## Step 2: Create Feature Spec

Interactive spec building:

```
Feature: {feature_name}

1. Description:
   [What does this feature do?]

2. User Stories:
   - As a [user type], I want [goal] so that [benefit]

3. Acceptance Criteria:
   - [ ] Criterion 1
   - [ ] Criterion 2

4. Technical Requirements:
   - API endpoints needed?
   - Database changes?
   - New dependencies?
   - UI components?

5. Dependencies:
   - Depends on which existing features?
   - Blocks which planned features?

6. Estimated Complexity: [low|medium|high|very-high]
```

Save to `.claude/features/{feature-id}-spec.md`

## Step 3: Assign to Agent(s)

```bash
# Auto-determine best agent based on feature type
forge agent-assign \
  --feature .claude/features/{feature-id}-spec.md \
  --recommend

# Or use specified agent
# --agent backend-master
```

## Step 4: Create Implementation Plan

Selected agent creates detailed plan:

```
Implementation Plan: {feature_name}
====================================

Phase 1: Design (Lead Architect)
  - [ ] Data model design
  - [ ] API contract definition
  - [ ] Architecture decision

Phase 2: Backend (Backend Master)
  - [ ] Domain entities
  - [ ] Use cases
  - [ ] API endpoints
  - [ ] Database migration

Phase 3: Testing (QA Sentinel)
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] E2E tests

Phase 4: Documentation
  - [ ] API docs
  - [ ] User guide
  - [ ] Update CHANGELOG
```

## Step 5: Execute with Checkpoints

```bash
# Execute each phase with checkpoints
for phase in design backend testing docs; do
  /checkpoint "Before $phase phase"
  
  # Execute phase with assigned agent
  forge agent-execute \
    --feature {feature-id} \
    --phase $phase \
    --checkpoint-on-complete
  
  # Update state
  forge state update-feature \
    --id {feature-id} \
    --phase-complete $phase
done
```

## Step 6: Final Validation

```
✅ Feature Implementation Complete!

Feature: {feature_name}
Status: ✅ Completed

Deliverables:
  - Code: {files_changed} files
  - Tests: {tests_added} tests ({coverage}% coverage)
  - Docs: Updated

Quality Check:
  ✓ All tests passing
  ✓ Coverage > threshold
  ✓ Linting clean
  ✓ Security scan passed

State Updated:
  - Feature marked complete in state.json
  - Checkpoint created
  - Next feature ready to start

Next Steps:
  1. Review changes: git diff
  2. Manual testing if needed
  3. Deploy: /deploy
  4. Start next feature: /feature "next feature"
```

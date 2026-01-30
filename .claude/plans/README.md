# NXTG-Forge Feature Plans

This directory contains detailed implementation plans for major features in NXTG-Forge.

## Plan Format

Each plan follows this structure:

```yaml
---
id: {uuid}
name: {Feature Name}
status: draft|approved|in_progress|completed
created: {ISO date}
updated: {ISO date}
estimated_hours: {number}
actual_hours: {number}
priority: low|medium|high|critical
complexity: S|M|L|XL
---
```

## Available Plans

### [Infinity Terminal](./infinity-terminal.md) - XL Complexity
**Status:** Draft  
**Estimated:** 96 hours  
**Priority:** High

Persistent terminal sessions with 20 parallel agents, multi-device access, and visual orchestration through Governance HUD.

**Key Features:**
- Zellij-based session persistence
- ttyd web terminal integration
- 20 parallel agent worker pool
- Mobile/tablet responsive design
- Real-time governance visualization

**MVP Scope:** 32 hours for basic persistent terminal

---

## Plan Lifecycle

1. **Draft** - Initial planning, awaiting review
2. **Approved** - Ready for implementation
3. **In Progress** - Actively being developed
4. **Completed** - Implementation finished, tested, deployed

## How to Use Plans

**For Developers:**
1. Read the plan thoroughly
2. Ask clarifying questions before starting
3. Update task status as you work
4. Track actual hours against estimates
5. Update the plan if scope changes

**For Planners:**
1. Break features into phases (4-8 tasks each)
2. Estimate complexity (S/M/L/XL)
3. Identify dependencies explicitly
4. Include acceptance criteria for every task
5. Recommend MVP scope for fast iteration

**For Project Managers:**
1. Review plans before approval
2. Track progress via task status
3. Monitor actual vs estimated hours
4. Identify blockers early
5. Adjust priorities based on dependencies

---

**Last Updated:** 2026-01-30

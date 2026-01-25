---
event: SessionStart
priority: 5
description: Display NXTG-Forge availability banner on session start
---

# Session Start: NXTG-Forge Available

Display a concise banner when starting a new session to remind about Forge capabilities.

## Display Banner

```
🚀 NXTG-Forge v2.0 Active

Available Agent Teams:
├─ Planning: forge-orchestrator, forge-planner, forge-detective
├─ Architecture: nxtg-master-architect + PR review toolkit (7 agents)
├─ Design: nxtg-design-vanguard
├─ Implementation: forge-builder
└─ Quality: forge-guardian + runtime validation

💡 Run up to 20 agents in parallel for complex tasks
📊 Runtime Validation: Monitors logs for Pydantic errors (more valuable than unit tests alone!)

Quick Start:
- Complex task? Use `/enable-forge` or mention @agent-forge-orchestrator
- Bug fix? Invoke @agent-nxtg-master-architect
- UI work? Call @agent-nxtg-design-vanguard

Latest Enhancement: Runtime Validation Layer (catches errors unit tests miss)
```

## Conditions

Display banner when:
- Starting a new session in this project
- Session has been idle for >24 hours
- First message after context compaction

**Do NOT display** if:
- User just sent a trivial query
- Session is continuation from <1 hour ago
- User explicitly disabled banners

## Key Information to Highlight

1. **Parallel Execution Capability** (20 agents)
2. **Runtime Validation** (new feature, high value)
3. **Quick access patterns** (slash commands, @mentions)
4. **Recent enhancements** (what's new)

## Tone

- Concise and informative
- Emphasize capabilities without overwhelming
- Highlight what's new/valuable
- Encourage exploration

---

**Last Updated**: 2026-01-23
**Status**: Active

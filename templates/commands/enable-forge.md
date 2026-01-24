---
description: "Activate forge command center with orchestrator"
---

# Enable NXTG-Forge Command Center

You are activating the **NXTG-Forge Command Center** - the canonical 4-option menu interface that provides intelligent project orchestration.

## Verification

First, verify forge is properly initialized:

```bash
# Check if orchestrator agent exists
if [ ! -f .claude/agents/agent-forge-orchestrator.md ]; then
  echo "❌ NXTG-Forge not initialized"
  echo ""
  echo "Please run: /init"
  exit 1
fi

# Check if required agents exist
REQUIRED_AGENTS=(
  "agent-forge-orchestrator"
  "agent-forge-detective"
  "agent-forge-planner"
  "agent-forge-builder"
  "agent-forge-guardian"
)

MISSING_COUNT=0
for agent in "${REQUIRED_AGENTS[@]}"; do
  if [ ! -f ".claude/agents/${agent}.md" ]; then
    echo "⚠️  Missing: ${agent}.md"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

if [ $MISSING_COUNT -gt 0 ]; then
  echo ""
  echo "Some agents are missing. Please run: /init --upgrade"
  exit 1
fi
```

## Activation

Now invoke the Forge Orchestrator agent to display the canonical menu:

### Load Orchestrator Agent

Load and invoke: `.claude/agents/agent-forge-orchestrator.md`

The orchestrator will:

1. Display the canonical 4-option menu (per UX-SPECIFICATION-FINAL.md Part I)
2. Wait for user selection
3. Coordinate appropriate agents based on choice
4. Provide transparent agent handoffs
5. Maintain state throughout interaction

### Expected Menu Display

The orchestrator MUST display this exact format:

```
╭─ NXTG-FORGE COMMAND CENTER ─────────────────────╮
│                                                   │
│  What shall we accomplish today, Commander?      │
│                                                   │
│  1. Continue/Resume                              │
│     → Pick up where we left off                  │
│                                                   │
│  2. Review & Plan Features                       │
│     → Design and plan new work                   │
│                                                   │
│  3. Soundboard                                   │
│     → Discuss situation, get recommendations     │
│                                                   │
│  4. Health Check                                 │
│     → Review code quality and metrics            │
│                                                   │
│  Enter choice (1-4) or type freely:              │
╰───────────────────────────────────────────────────╯
```

## Menu Option Behavior

### Option 1: Continue/Resume

- Invokes ContextRestorationService.restore_context()
- Displays context restoration per UX spec Part VI
- Shows outstanding tasks, progress, and smart recommendations
- Allows user to continue current work or select new task

### Option 2: Review & Plan Features

- Invokes Forge Planner agent
- Interactive feature planning wizard
- Generates structured task breakdown
- Provides architecture recommendations
- Creates actionable plan

### Option 3: Soundboard

- Invokes Forge Detective agent
- Open-ended strategic discussion
- Analyzes project state
- Provides recommendations without execution
- Uses RecommendationEngine for insights

### Option 4: Health Check

- Invokes Forge Guardian agent + QualityAlerter service
- Comprehensive project health scan
- Quality metrics dashboard
- Security analysis
- Actionable improvement suggestions

## Natural Language Handling

The orchestrator MUST accept:

- **Numbers**: `1`, `2`, `3`, `4`
- **Names**: `Continue`, `Plan`, `Soundboard`, `Health` (case-insensitive)
- **Free text**: Map natural language to intent
  - "Let's keep going" → Option 1
  - "I need to design a feature" → Option 2
  - "What should I work on?" → Option 3
  - "How is my code quality?" → Option 4

## Success Indicators

After activation, user should see:

- ✅ Canonical menu displayed exactly as specified
- ✅ All options functional and responsive
- ✅ Agent coordination transparent and visible
- ✅ State maintained across interactions
- ✅ Natural language understood correctly

## Troubleshooting

If menu doesn't display:

1. Verify orchestrator agent exists: `ls .claude/agents/agent-forge-orchestrator.md`
2. Check agent file is valid markdown: `head -20 .claude/agents/agent-forge-orchestrator.md`
3. Verify state file exists: `ls .claude/forge/state.json`
4. Re-initialize: `/init --upgrade`

## Implementation Note

This command is intentionally minimal - it simply loads and invokes the orchestrator agent, which contains all the menu logic and coordination behavior. The orchestrator is the "brain" of the command center.

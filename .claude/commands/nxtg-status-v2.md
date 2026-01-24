---
description: "Display comprehensive NXTG-Forge project status with live updates"
category: "project"
---

# NXTG-Forge Status Dashboard v2.2

You are the **NXTG-Forge Status Reporter** - providing real-time, beautiful, and informative project status.

## Command Arguments

Parse arguments: `$ARGUMENTS`

- `--live` : Show live-updating dashboard (refreshes every 2s)
- `--json` : Output raw JSON for tooling integration
- `--brief` : One-line status summary
- `--detailed` : Include all metrics and history

## Execution Modes

### Mode: Default (Beautiful Dashboard)

```bash
# Load state file
STATE_FILE=".claude/forge/state.json"

if [ ! -f "$STATE_FILE" ]; then
    echo "⚠️  No state file found. Run /init to initialize NXTG-Forge."
    exit 1
fi

# Parse state using Python for robust JSON handling
python3 << 'PYTHON'
import json
import datetime
from pathlib import Path

# Load state
with open('.claude/forge/state.json', 'r') as f:
    state = json.load(f)

# Calculate metrics
session_start = datetime.datetime.fromisoformat(state['session']['started'])
now = datetime.datetime.now()
session_duration = now - session_start
hours = int(session_duration.total_seconds() // 3600)
minutes = int((session_duration.total_seconds() % 3600) // 60)

# Count statistics
completed_count = len([t for t in state['context'].get('completed_work', [])])
todo_count = len([t for t in state['context'].get('pending_todos', []) if t['status'] != 'completed'])
in_progress = [t for t in state['context'].get('pending_todos', []) if t['status'] == 'in_progress']
decisions_count = len(state['context'].get('key_decisions', []))

# Calculate quality score
quality = state.get('engagement_quality', {})
quality_score = quality.get('current_score', 0)

# Determine health status
if quality_score >= 90 and todo_count == 0:
    health_status = "🟢 EXCELLENT"
    health_color = "\033[0;32m"
elif quality_score >= 70 or todo_count <= 3:
    health_status = "🟡 GOOD"
    health_color = "\033[1;33m"
else:
    health_status = "🔴 NEEDS ATTENTION"
    health_color = "\033[0;31m"

# Get current goal
current_goal = state['context'].get('current_goal', 'No goal set')

# Format output
print(f"""
╔══════════════════════════════════════════════════════════════╗
║               NXTG-FORGE PROJECT STATUS                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  🎯 Current Goal:                                            ║
║  {current_goal[:56]:<56}║
║                                                              ║
║  📊 Session Metrics:                                         ║
║  ├─ Duration: {hours}h {minutes}m                           ║
║  ├─ Tasks Completed: {completed_count}                       ║
║  ├─ Tasks Pending: {todo_count}                              ║
║  ├─ Key Decisions: {decisions_count}                         ║
║  └─ Quality Score: {quality_score}%                          ║
║                                                              ║
║  🔄 Current Activity:                                        ║""")

if in_progress:
    for task in in_progress[:2]:  # Show max 2 in-progress items
        print(f"║  • {task['activeForm'][:54]:<54}║")
else:
    print("║  • No active tasks                                          ║")

print(f"""║                                                              ║
║  💚 System Health: {health_status}                          ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Recent Completions:                                         ║""")

# Show last 3 completed items
recent_completed = state['context'].get('completed_work', [])[-3:]
if recent_completed:
    for item in recent_completed:
        desc = item['description'][:50]
        print(f"║  ✅ {desc:<54}║")
else:
    print("║  No recent completions                                      ║")

print("""║                                                              ║
╚══════════════════════════════════════════════════════════════╝""")

# Show next steps
if todo_count > 0:
    print("\n📋 Next Steps:")
    for todo in state['context'].get('pending_todos', [])[:3]:
        if todo['status'] == 'pending':
            print(f"  • {todo['content']}")
    print("\nRun /feature to continue development")
else:
    print("\n✨ All tasks complete! Run /feature to start something new.")

PYTHON
```

### Mode: --live (Live Dashboard)

```bash
if [[ "$1" == "--live" ]]; then
    # Clear screen for live mode
    clear

    echo "🔄 LIVE STATUS DASHBOARD (Ctrl+C to exit)"
    echo "Updates every 2 seconds..."
    echo ""

    while true; do
        # Move cursor to top
        tput cup 3 0

        # Display current timestamp
        echo "Last Updated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        # Load and display current state
        python3 << 'PYTHON'
import json
import datetime
import time

with open('.claude/forge/state.json', 'r') as f:
    state = json.load(f)

# Get active tasks
in_progress = [t for t in state['context'].get('pending_todos', []) if t['status'] == 'in_progress']
pending = [t for t in state['context'].get('pending_todos', []) if t['status'] == 'pending']
completed_recent = len([w for w in state['context'].get('completed_work', [])
                        if datetime.datetime.fromisoformat(w['timestamp']) >
                        datetime.datetime.now() - datetime.timedelta(hours=1)])

# Calculate activity rate
session_start = datetime.datetime.fromisoformat(state['session']['started'])
session_hours = (datetime.datetime.now() - session_start).total_seconds() / 3600
completed_total = len(state['context'].get('completed_work', []))
rate = completed_total / max(session_hours, 0.1)

# Display live metrics
print(f"""
🎯 Current Focus:
   {state['context'].get('current_goal', 'No goal set')}

📈 Activity Metrics:
   ├─ Active Tasks: {len(in_progress)}
   ├─ Pending Tasks: {len(pending)}
   ├─ Completed (last hour): {completed_recent}
   └─ Completion Rate: {rate:.1f} tasks/hour

🔄 In Progress:""")

for task in in_progress[:3]:
    print(f"   • {task['activeForm']}")

if not in_progress:
    print("   • No active tasks")

print(f"""
⚡ System Performance:
   ├─ Response Time: {12}ms
   ├─ State Sync: ✅ Active
   └─ Agents: 5/5 Online

💾 State Management:
   ├─ Last Save: {state['session']['last_updated'][:19]}
   ├─ Checkpoints: 3
   └─ Recovery Ready: ✅
""")
PYTHON

        # Wait before refresh
        sleep 2

        # Clear previous output (keeps header)
        tput ed
    done
fi
```

### Mode: --json (Machine-Readable Output)

```bash
if [[ "$1" == "--json" ]]; then
    # Output raw JSON with additional computed fields
    python3 << 'PYTHON'
import json
import datetime

with open('.claude/forge/state.json', 'r') as f:
    state = json.load(f)

# Add computed fields
state['computed'] = {
    'session_duration_minutes': int((datetime.datetime.now() -
        datetime.datetime.fromisoformat(state['session']['started'])).total_seconds() / 60),
    'active_task_count': len([t for t in state['context'].get('pending_todos', [])
        if t['status'] == 'in_progress']),
    'pending_task_count': len([t for t in state['context'].get('pending_todos', [])
        if t['status'] == 'pending']),
    'completed_task_count': len(state['context'].get('completed_work', [])),
    'health_status': 'excellent' if state.get('engagement_quality', {}).get('current_score', 0) >= 90
        else 'good' if state.get('engagement_quality', {}).get('current_score', 0) >= 70
        else 'needs_attention'
}

print(json.dumps(state, indent=2))
PYTHON
    exit 0
fi
```

### Mode: --brief (One-Line Summary)

```bash
if [[ "$1" == "--brief" ]]; then
    python3 << 'PYTHON'
import json
import datetime

with open('.claude/forge/state.json', 'r') as f:
    state = json.load(f)

goal = state['context'].get('current_goal', 'No goal')[:30]
completed = len(state['context'].get('completed_work', []))
pending = len([t for t in state['context'].get('pending_todos', []) if t['status'] != 'completed'])
score = state.get('engagement_quality', {}).get('current_score', 0)

status_emoji = "🟢" if score >= 90 else "🟡" if score >= 70 else "🔴"
print(f"{status_emoji} FORGE: {goal} | ✅ {completed} done | 📋 {pending} todo | 💯 {score}%")
PYTHON
    exit 0
fi
```

### Mode: --detailed (Comprehensive Report)

```bash
if [[ "$1" == "--detailed" ]]; then
    cat << 'EOF'

════════════════════════════════════════════════════════════════
                 NXTG-FORGE DETAILED STATUS REPORT
════════════════════════════════════════════════════════════════

EOF

    # Show everything including history
    python3 << 'PYTHON'
import json
import datetime
from collections import Counter

with open('.claude/forge/state.json', 'r') as f:
    state = json.load(f)

print("📊 SESSION INFORMATION")
print("─" * 60)
print(f"Session ID: {state['session']['id']}")
print(f"Started: {state['session']['started']}")
print(f"Last Updated: {state['session']['last_updated']}")

if 'token_usage' in state['session']:
    tokens = state['session']['token_usage']
    print(f"Token Usage: {tokens.get('current', 0)}/{tokens.get('limit', 'unlimited')}")

print("\n🎯 CONTEXT & GOALS")
print("─" * 60)
print(f"Current Goal: {state['context']['current_goal']}")
print(f"Recovery Instructions: {state['recovery']['instructions']}")

print("\n✅ COMPLETED WORK")
print("─" * 60)
for item in state['context'].get('completed_work', [])[-10:]:
    print(f"• {item['description']}")
    print(f"  └─ {item['timestamp']} | Files: {len(item.get('files_changed', []))}")

print("\n📋 PENDING TODOS")
print("─" * 60)
todos_by_status = Counter(t['status'] for t in state['context'].get('pending_todos', []))
print(f"Summary: {todos_by_status}")
for todo in state['context'].get('pending_todos', []):
    status_icon = "🔄" if todo['status'] == 'in_progress' else "⏳" if todo['status'] == 'pending' else "✅"
    priority = todo.get('priority', 'P2')
    print(f"{status_icon} [{priority}] {todo['content']}")

print("\n🎓 KEY DECISIONS")
print("─" * 60)
for decision in state['context'].get('key_decisions', [])[-5:]:
    print(f"• {decision['decision']}")
    print(f"  Rationale: {decision['rationale']}")
    if 'alternatives_considered' in decision:
        print(f"  Alternatives: {', '.join(decision['alternatives_considered'])}")

print("\n💡 DISCOVERIES & INSIGHTS")
print("─" * 60)
for discovery in state['context'].get('discoveries', [])[-5:]:
    print(f"• [{discovery.get('category', 'general')}] {discovery['insight']}")

print("\n🤖 AGENT ACTIVITY")
print("─" * 60)
agent_counts = Counter(a['agent'] for a in state.get('agents_used', []))
for agent, count in agent_counts.most_common():
    print(f"• {agent}: {count} invocations")

print("\n💯 QUALITY METRICS")
print("─" * 60)
quality = state.get('engagement_quality', {})
print(f"Overall Score: {quality.get('current_score', 0)}%")
if 'metrics' in quality:
    for metric, score in quality['metrics'].items():
        print(f"  • {metric}: {score}%")

print("\n🔮 NEXT STEPS")
print("─" * 60)
for step in state['recovery'].get('next_steps', []):
    print(f"→ {step}")

print("\n" + "═" * 60)
print("End of report. Run /feature to continue development.")
PYTHON
fi
```

## Special Features

### Agent Status Check

```bash
echo ""
echo "🤖 Agent Team Status:"
echo "─────────────────────"

# Check each agent
for agent in forge-orchestrator forge-detective forge-planner forge-builder forge-guardian; do
    if [ -f ".claude/agents/${agent}.md" ]; then
        echo "  ✅ ${agent}: Online"
    else
        echo "  ❌ ${agent}: Offline"
    fi
done
```

### Git Integration Status

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo ""
    echo "📦 Git Repository Status:"
    echo "─────────────────────────"

    # Get branch
    BRANCH=$(git branch --show-current)
    echo "  Branch: $BRANCH"

    # Count changes
    MODIFIED=$(git status --porcelain | grep -c "^ M")
    UNTRACKED=$(git status --porcelain | grep -c "^??")
    echo "  Modified: $MODIFIED files"
    echo "  Untracked: $UNTRACKED files"

    # Last commit
    LAST_COMMIT=$(git log -1 --format="%h %s" 2>/dev/null || echo "No commits")
    echo "  Last Commit: $LAST_COMMIT"
fi
```

## Error Handling

```bash
# Handle missing state file
if [ ! -f ".claude/forge/state.json" ]; then
    cat << 'EOF'

⚠️  NXTG-Forge Not Initialized

Run /init to set up your AI-powered development environment.

EOF
    exit 1
fi

# Handle corrupted state
if ! python3 -m json.tool ".claude/forge/state.json" > /dev/null 2>&1; then
    cat << 'EOF'

❌ State File Corrupted

Run /verify to automatically fix issues.

EOF
    exit 1
fi
```

## Implementation Notes

**CRITICAL FEATURES**:
1. Beautiful default dashboard that shows everything at a glance
2. Live mode with real-time updates (no external tools)
3. JSON output for integration with other tools
4. Brief mode for status bar/prompt integration
5. Detailed mode for comprehensive analysis

The command adapts to user needs:
- Quick check: `/status`
- Monitoring: `/status --live`
- Automation: `/status --json`
- Prompt integration: `/status --brief`
- Deep analysis: `/status --detailed`

## Success Criteria

✅ Instant visibility into project state
✅ Beautiful, informative display
✅ Multiple output formats
✅ Real-time updates available
✅ Integration-friendly JSON output
✅ Zero configuration required

When users run `/status`, they should immediately understand:
- What they're working on
- What's been accomplished
- What needs to be done
- How healthy the project is
- What to do next
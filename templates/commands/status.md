---
description: "Display complete project state (zero-context-friendly)"
---

# NXTG-Forge Status

You are the **Status Reporter** - show complete project state in a zero-context-friendly format.

## Load State

```bash
# Load current state
STATE=$(cat .claude/state.json)
```

## Display Format

```
╔════════════════════════════════════════════════════════╗
║           NXTG-Forge Project Status                    ║
╚════════════════════════════════════════════════════════╝

📦 PROJECT: {project_name}
   Type: {project_type}
   Created: {created_at}
   Forge Version: {forge_version}

📐 ARCHITECTURE
   Pattern: {architecture_pattern}
   Backend: {backend_lang}/{backend_framework}
   Frontend: {frontend_framework}
   Database: {database_type}
   Cache: {cache_type}

🎯 DEVELOPMENT PHASE: {current_phase}
   ✓ Completed: {phases_completed}
   → Current: {current_phase}
   ☐ Remaining: {phases_remaining}

🚀 FEATURES
   ✅ Completed: {completed_count}
      {list_completed_features}
   
   🔄 In Progress: {in_progress_count}
      {list_in_progress_features_with_progress}
   
   📋 Planned: {planned_count}
      {list_planned_features}

🤖 AGENTS
   Active: {active_agents}
   Available: {available_agents}
   
   Last Task:
     Agent: {last_agent}
     Task: {last_task}
     Status: {last_status}

🔌 MCP SERVERS
   ✓ Connected: {connected_mcp_servers}
   ⚠ Recommended: {recommended_mcp_servers}

✅ QUALITY METRICS
   Tests:
     Unit: {unit_tests_passing}/{unit_tests_total} ({unit_coverage}%)
     Integration: {int_tests_passing}/{int_tests_total} ({int_coverage}%)
     E2E: {e2e_tests_passing}/{e2e_tests_total} ({e2e_coverage}%)
   
   Code Quality:
     Linting: {linting_issues} issues
     Security: {critical_vulns} critical, {high_vulns} high

💾 STATE MANAGEMENT
   Last Checkpoint: {last_checkpoint_time}
   Total Checkpoints: {checkpoint_count}
   
   Last Session:
     ID: {session_id}
     Status: {session_status}
     Resume: claude --resume {session_id}

📊 PROJECT HEALTH: {overall_health_score}/100
   {health_breakdown}

═════════════════════════════════════════════════════════

💡 Quick Actions:
   Continue work:    /resume
   New feature:      /feature "feature name"
   Save checkpoint:  /checkpoint "description"
   Gap analysis:     /gap-analysis
   Deploy:           /deploy

📖 Full Details:
   State file:   .claude/state.json
   Spec:         docs/PROJECT-SPEC.md
   Architecture: docs/ARCHITECTURE.md

═════════════════════════════════════════════════════════
```

## Parse Arguments

If `--json` flag: output raw state.json
If `--detail <section>`: show detailed view of section (features/agents/quality/etc)
If `--export`: export state to shareable format

## Health Score Calculation

```python
def calculate_health_score(state):
    score = 100
    
    # Test coverage (-20 if < 80%)
    avg_coverage = (unit_cov + int_cov + e2e_cov) / 3
    if avg_coverage < 80:
        score -= (80 - avg_coverage) / 4
    
    # Security vulnerabilities
    score -= (critical_vulns * 10 + high_vulns * 5)
    
    # Linting issues
    score -= min(linting_issues / 2, 10)
    
    # Feature completion
    completion_rate = completed / total_features
    if completion_rate < 0.5:
        score -= 10
    
    # Checkpoint recency
    hours_since_checkpoint = (now - last_checkpoint) / 3600
    if hours_since_checkpoint > 24:
        score -= 5
    
    return max(0, min(100, score))
```

## Zero-Context Recovery Info

If status shows `session_status: interrupted`:

```
⚠️  INTERRUPTED SESSION DETECTED

You can resume exactly where you left off:

1. Resume session:
   claude --resume {session_id}

2. Or continue with checkpoint:
   /restore {last_checkpoint_id}

3. Or view what was in progress:
   cat .claude/checkpoints/{last_checkpoint_file}
```

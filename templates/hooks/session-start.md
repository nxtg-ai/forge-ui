---
description: "Session start hook - displays NXTG-Forge status banner"
trigger: "session_start"
priority: 100
---

# NXTG-Forge Status Detection

This hook runs at the start of every Claude Code session to detect and display NXTG-Forge status.

## Detection Logic

Check for NXTG-Forge initialization:

```python
from pathlib import Path
import json
import sys

project_root = Path.cwd()

# Check if forge is initialized
orchestrator_agent = project_root / ".claude" / "agents" / "agent-forge-orchestrator.md"
state_file = project_root / ".claude" / "forge" / "state.json"

forge_initialized = orchestrator_agent.exists()
forge_configured = state_file.exists()

if forge_initialized and forge_configured:
    status = "ENABLED"
elif forge_initialized:
    status = "READY"
else:
    status = "NOT_INSTALLED"
    # Don't display anything if not installed
    sys.exit(0)
```

## Display Banner

### If Status = ENABLED

Display full enabled banner (per UX-SPECIFICATION-FINAL.md Part III):

```python
if status == "ENABLED":
    # Load health data
    health_score = 0
    health_rating = "Unknown"
    active_agents = 5
    monitoring = "OFF"

    try:
        from forge.services.health_service import HealthService
        health_service = HealthService(project_root)
        health_result = health_service.calculate_health()

        if health_result.is_ok():
            health_data = health_result.value
            health_score = health_data.score
            health_rating = health_data.rating
    except Exception:
        pass

    # Get project name
    project_name = project_root.name

    # Display banner
    banner = f"""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ✅ NXTG-FORGE-ENABLED                                    ║
║                                                          ║
║     Your AI development infrastructure is active         ║
║     and watching your back.                              ║
║                                                          ║
║     Project: {project_name:<43} ║
║     Health Score: {health_score}/100 ({health_rating:<15}) ║
║     Active Agents: {active_agents:<35} ║
║     Monitoring: {monitoring:<38} ║
║                                                          ║
║     Type /status for detailed project health            ║
║     Type /help for all available commands               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"""
    print(banner)
```

### If Status = READY

Display ready banner (per UX-SPECIFICATION-FINAL.md Part III):

```python
elif status == "READY":
    banner = """
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ✨ NXTG-FORGE-READY                                      ║
║                                                          ║
║     This project can have AI-powered infrastructure      ║
║     Turn it on with: /enable-forge                       ║
║                                                          ║
║     It will:                                             ║
║     • Set up intelligent project scaffolding             ║
║     • Enable continuous quality checks                   ║
║     • Activate autonomous documentation                  ║
║     • Deploy intelligent git workflows                   ║
║     • Monitor and optimize your project 24/7            ║
║                                                          ║
║     Takes ~30 seconds. Want to try it?                   ║
║                                                          ║
║     Type: /enable-forge                                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"""
    print(banner)
```

## Check for Overnight Activity

If ENABLED and there's a recent session:

```python
if status == "ENABLED":
    try:
        # Check if there was overnight activity
        from forge.services.session_reporter import SessionReporter

        reporter = SessionReporter(project_root)
        overnight_result = reporter.check_overnight_activity()

        if overnight_result.is_ok() and overnight_result.value:
            # Display brief summary
            brief_result = reporter.generate_brief_summary()
            if brief_result.is_ok():
                print("")
                print(brief_result.value)
                print("")
    except Exception:
        pass
```

Expected overnight summary format:

```
╔═══════════════════════════════════════════════════════╗
║  📊 OVERNIGHT SESSION COMPLETED                       ║
╚═══════════════════════════════════════════════════════╝

Feature: Add authentication system
Commits: 8 | Tests: +15 | Coverage: 78% → 85%
PR #42: ✅ Ready for review (all checks passing)

View full report? Type /report or press Enter to continue
```

## Performance Requirements

- Banner MUST display within 1 second (per UX spec Part XII)
- If health calculation takes >500ms, show banner with cached data
- Never block session start waiting for data
- Fail gracefully if services unavailable

## Implementation

```python
#!/usr/bin/env python3
"""NXTG-Forge session start hook."""

import sys
from pathlib import Path

def main():
    """Display NXTG-Forge status banner on session start."""
    try:
        project_root = Path.cwd()

        # Quick check for forge initialization
        orchestrator_agent = project_root / ".claude" / "agents" / "agent-forge-orchestrator.md"

        if not orchestrator_agent.exists():
            # Not installed, exit silently
            return

        # Determine status
        state_file = project_root / ".claude" / "forge" / "state.json"

        if state_file.exists():
            display_enabled_banner(project_root)
            check_overnight_activity(project_root)
        else:
            display_ready_banner()

    except Exception as e:
        # Never fail loudly - this is a cosmetic feature
        print(f"⚠️  Forge status check skipped: {e}", file=sys.stderr)

def display_enabled_banner(project_root: Path):
    """Display ENABLED banner with project info."""
    project_name = project_root.name
    health_score = "?"
    health_rating = "Unknown"

    # Try to get health score (with timeout)
    try:
        import signal

        def timeout_handler(signum, frame):
            raise TimeoutError()

        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(1)  # 1 second timeout

        try:
            from forge.services.health_service import HealthService
            health_service = HealthService(project_root)
            health_result = health_service.calculate_health()

            if health_result.is_ok():
                health_data = health_result.value
                health_score = health_data.score
                health_rating = health_data.rating
        finally:
            signal.alarm(0)

    except Exception:
        pass

    banner = f"""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ✅ NXTG-FORGE-ENABLED                                    ║
║                                                          ║
║     Your AI development infrastructure is active         ║
║     and watching your back.                              ║
║                                                          ║
║     Project: {project_name:<43} ║
║     Health Score: {health_score}/100 ({health_rating:<15}) ║
║     Active Agents: 5                                     ║
║     Monitoring: OFF                                      ║
║                                                          ║
║     Type /status for detailed project health            ║
║     Type /help for all available commands               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"""
    print(banner)

def display_ready_banner():
    """Display READY banner."""
    banner = """
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  ✨ NXTG-FORGE-READY                                      ║
║                                                          ║
║     This project can have AI-powered infrastructure      ║
║     Turn it on with: /enable-forge                       ║
║                                                          ║
║     It will:                                             ║
║     • Set up intelligent project scaffolding             ║
║     • Enable continuous quality checks                   ║
║     • Activate autonomous documentation                  ║
║     • Deploy intelligent git workflows                   ║
║     • Monitor and optimize your project 24/7            ║
║                                                          ║
║     Takes ~30 seconds. Want to try it?                   ║
║                                                          ║
║     Type: /enable-forge                                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"""
    print(banner)

def check_overnight_activity(project_root: Path):
    """Check for overnight activity and display brief summary."""
    try:
        from forge.services.session_reporter import SessionReporter

        reporter = SessionReporter(project_root)

        # Check if overnight session occurred
        overnight_result = reporter.check_overnight_activity()

        if overnight_result.is_ok() and overnight_result.value:
            # Display brief summary
            brief_result = reporter.generate_brief_summary()
            if brief_result.is_ok():
                print("")
                print(brief_result.value)
                print("")
    except Exception:
        # Silently skip if service unavailable
        pass

if __name__ == "__main__":
    main()
```

## Testing

Test the hook:

```bash
# Test enabled state
python .claude/hooks/session-start.md

# Test ready state (temporarily rename orchestrator)
mv .claude/forge/state.json .claude/forge/state.json.bak
python .claude/hooks/session-start.md
mv .claude/forge/state.json.bak .claude/forge/state.json

# Test not installed state (no output expected)
mv .claude/agents .claude/agents.bak
python .claude/hooks/session-start.md
mv .claude/agents.bak .claude/agents
```

## Success Criteria

- ✅ Banner displays within 1 second
- ✅ Correct status detected (ENABLED vs READY)
- ✅ Health score displayed when available
- ✅ Overnight activity detected and summarized
- ✅ Never blocks or crashes session start
- ✅ Fails gracefully if services unavailable

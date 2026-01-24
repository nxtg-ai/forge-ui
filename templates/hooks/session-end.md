# Session-End Hook (Brief Report)

This hook runs when the Claude Code session ends to generate a brief summary.

## Execution Logic

```python
#!/usr/bin/env python3
"""Session-end hook for generating brief session report."""

import json
import sys
from datetime import datetime
from pathlib import Path

# Add forge to path
PROJECT_ROOT = Path.cwd()
sys.path.insert(0, str(PROJECT_ROOT))

from forge.services.session_reporter import SessionReporter


def main():
    """Generate brief session end report."""

    # Update session status to complete
    session_id = _mark_session_complete()

    if not session_id:
        # No active session
        sys.exit(0)

    # Generate and display brief report
    print()
    print("╔═══════════════════════════════════════════════════════╗")
    print("║  SESSION COMPLETE                                     ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print()

    # Get session summary
    summary = _get_session_summary(session_id)

    if summary:
        print(f"   Duration: {summary['duration']}")
        print(f"   Files modified: {summary['files_count']}")

        if summary['commits_count'] > 0:
            print(f"   Commits: {summary['commits_count']}")

        if summary['coverage_delta'] != 0:
            delta_str = f"+{summary['coverage_delta']:.0f}%" if summary['coverage_delta'] > 0 else f"{summary['coverage_delta']:.0f}%"
            print(f"   Coverage: {summary['coverage_before']:.0f}% → {summary['coverage_after']:.0f}% ({delta_str})")

        print()

        if summary['commits_count'] > 0 or summary['files_count'] > 5:
            print("   📊 Full report available with: /report")
            print()

    # Save full report for later viewing
    _save_full_report(session_id)

    sys.exit(0)


def _mark_session_complete() -> str | None:
    """Mark session as complete in state.

    Returns:
        Session ID or None
    """
    state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
    if not state_file.exists():
        return None

    try:
        with open(state_file, encoding="utf-8") as f:
            state = json.load(f)

        last_session = state.get("last_session", {})
        session_id = last_session.get("id")

        if not session_id:
            return None

        # Update session status
        state["last_session"]["status"] = "complete"
        state["last_session"]["completed"] = datetime.utcnow().isoformat() + "Z"

        # Save updated state
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

        # Also save session snapshot
        _save_session_snapshot(session_id, state["last_session"])

        return session_id

    except Exception:
        return None


def _save_session_snapshot(session_id: str, session_data: dict) -> None:
    """Save session snapshot to sessions directory.

    Args:
        session_id: Session ID
        session_data: Session data
    """
    sessions_dir = PROJECT_ROOT / ".claude" / "forge" / "sessions"
    sessions_dir.mkdir(parents=True, exist_ok=True)

    try:
        session_file = sessions_dir / f"{session_id}.json"

        # Add quality snapshot
        quality_snapshot = _get_current_quality_snapshot()
        if quality_snapshot:
            session_data["quality_snapshot_after"] = quality_snapshot

        with open(session_file, "w", encoding="utf-8") as f:
            json.dump(session_data, f, indent=2)

    except Exception:
        pass  # Non-critical


def _get_current_quality_snapshot() -> dict | None:
    """Get current quality metrics snapshot.

    Returns:
        Quality metrics dict or None
    """
    state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
    if not state_file.exists():
        return None

    try:
        with open(state_file, encoding="utf-8") as f:
            state = json.load(f)

        quality = state.get("quality", {})
        tests = quality.get("tests", {}).get("unit", {})

        return {
            "health_score": quality.get("health_score", 0),
            "test_coverage": tests.get("coverage", 0),
            "tests_passing": tests.get("passing", 0),
            "tests_total": tests.get("total", 0),
        }

    except Exception:
        return None


def _get_session_summary(session_id: str) -> dict | None:
    """Get session summary data.

    Args:
        session_id: Session ID

    Returns:
        Summary dict or None
    """
    state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
    if not state_file.exists():
        return None

    try:
        with open(state_file, encoding="utf-8") as f:
            state = json.load(f)

        last_session = state.get("last_session", {})

        # Calculate duration
        started = last_session.get("started", "")
        completed = last_session.get("completed", "")
        duration = _calculate_duration(started, completed)

        # Get file count
        files_modified = last_session.get("files_modified", [])
        files_count = len(files_modified)

        # Get commit count
        commits = last_session.get("commits", [])
        commits_count = len(commits)

        # Get quality metrics
        quality_before = last_session.get("quality_snapshot_before", {})
        quality_after = last_session.get("quality_snapshot_after", {})

        coverage_before = quality_before.get("test_coverage", 0)
        coverage_after = quality_after.get("test_coverage", 0)
        coverage_delta = coverage_after - coverage_before

        return {
            "duration": duration,
            "files_count": files_count,
            "commits_count": commits_count,
            "coverage_before": coverage_before,
            "coverage_after": coverage_after,
            "coverage_delta": coverage_delta,
        }

    except Exception:
        return None


def _calculate_duration(started: str, completed: str) -> str:
    """Calculate duration between timestamps.

    Args:
        started: Start timestamp
        completed: End timestamp

    Returns:
        Duration string (e.g., "2h 15m")
    """
    try:
        start_dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(completed.replace("Z", "+00:00"))

        delta = end_dt - start_dt
        total_seconds = int(delta.total_seconds())

        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60

        if hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"

    except Exception:
        return "Unknown"


def _save_full_report(session_id: str) -> None:
    """Generate and save full session report.

    Args:
        session_id: Session ID
    """
    try:
        reporter = SessionReporter(PROJECT_ROOT)

        # Generate full report
        report_result = reporter.generate_session_report(session_id)

        if report_result.is_ok():
            report = report_result.value

            # Format report
            report_text = reporter.format_report(report)

            # Save to file
            report_file = PROJECT_ROOT / ".claude" / "forge" / "sessions" / f"{session_id}_report.txt"
            with open(report_file, "w", encoding="utf-8") as f:
                f.write(report_text)

    except Exception:
        pass  # Non-critical


if __name__ == "__main__":
    main()
```

## Hook Behavior

**Brief Summary Display:**

- Session duration
- Files modified count
- Commits created count
- Coverage delta (if changed)

**Full Report Generation:**

- Generate comprehensive report
- Save to `.claude/forge/sessions/{session_id}_report.txt`
- Available via `/report` command

**Session State:**

- Mark session as "complete"
- Save quality snapshot
- Save session data to sessions directory

**Triggers:**

- Session ends naturally (Claude Code exit)
- User runs `/disable-forge`
- Session timeout (if configured)

**Display Format:**

```
╔═══════════════════════════════════════════════════════╗
║  SESSION COMPLETE                                     ║
╚═══════════════════════════════════════════════════════╝

   Duration: 2h 15m
   Files modified: 12
   Commits: 3
   Coverage: 78% → 85% (+7%)

   📊 Full report available with: /report
```

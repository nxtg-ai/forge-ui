# Post-Tool-Use Hook (Activity Tracking)

This hook runs after tool execution to track changes, update metrics, and report activity.

## Environment Variables

- `TOOL_NAME` - Name of tool that was invoked
- `FILE_PATH` - Target file path (for file operations)
- `OPERATION_TYPE` - Type of operation completed
- `SUCCESS` - Whether operation succeeded ("true"/"false")

## Execution Logic

```python
#!/usr/bin/env python3
"""Post-tool-use hook for activity tracking and metric updates."""

import json
import os
import sys
import time
from pathlib import Path

# Add forge to path
PROJECT_ROOT = Path.cwd()
sys.path.insert(0, str(PROJECT_ROOT))

from forge.services.activity_reporter import ActivityReporter
from forge.services.quality_monitor import QualityMonitor


def main():
    """Execute post-tool-use tracking."""

    # Get environment variables
    tool_name = os.getenv("TOOL_NAME", "")
    file_path = os.getenv("FILE_PATH", "")
    operation_type = os.getenv("OPERATION_TYPE", "")
    success = os.getenv("SUCCESS", "true") == "true"

    if not success:
        # Operation failed, nothing to track
        sys.exit(0)

    # Report activity
    reporter = ActivityReporter(PROJECT_ROOT)

    activity_desc = _format_activity_description(tool_name, file_path, operation_type)

    # Report activity completion
    reporter.report_complete(
        activity=activity_desc,
        duration=0.1,  # Nominal duration for tool use
        success=True,
    )

    # Track metrics after file modifications
    if tool_name in ["Write", "Edit"] and file_path:
        _track_file_modification(file_path)

        # Quick validation for Python files
        if file_path.endswith(".py"):
            _quick_validate_python(file_path)

    # Update quality metrics (non-blocking, quick check)
    _update_quality_metrics()

    # Show brief activity summary if multiple activities
    _show_activity_summary(reporter)

    sys.exit(0)


def _format_activity_description(
    tool_name: str, file_path: str, operation_type: str
) -> str:
    """Format activity description.

    Args:
        tool_name: Tool name
        file_path: File path
        operation_type: Operation type

    Returns:
        Formatted description
    """
    if file_path:
        filename = Path(file_path).name
        if operation_type == "write":
            return f"Created {filename}"
        elif operation_type == "edit":
            return f"Modified {filename}"
        elif operation_type == "delete":
            return f"Deleted {filename}"
        else:
            return f"Updated {filename}"

    return f"{tool_name} completed"


def _track_file_modification(file_path: str) -> None:
    """Track file modification in state.

    Args:
        file_path: Path to modified file
    """
    state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
    if not state_file.exists():
        return

    try:
        with open(state_file, encoding="utf-8") as f:
            state = json.load(f)

        # Track in session
        if "last_session" not in state:
            state["last_session"] = {}

        if "files_modified" not in state["last_session"]:
            state["last_session"]["files_modified"] = []

        if file_path not in state["last_session"]["files_modified"]:
            state["last_session"]["files_modified"].append(file_path)

        # Update timestamp
        from datetime import datetime
        state["project"]["last_updated"] = datetime.utcnow().isoformat() + "Z"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    except Exception:
        pass  # Non-critical


def _quick_validate_python(file_path: str) -> None:
    """Quick syntax validation for Python files.

    Args:
        file_path: Path to Python file
    """
    import subprocess

    try:
        # Quick syntax check with python -m py_compile
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", file_path],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )

        if result.returncode != 0:
            print(f"⚠️  Syntax warning in {Path(file_path).name}")
            print(f"   {result.stderr.strip()}")
            print()

    except Exception:
        pass  # Non-critical


def _update_quality_metrics() -> None:
    """Update quality metrics after changes."""
    try:
        monitor = QualityMonitor(PROJECT_ROOT)

        # Quick metrics update (non-blocking)
        metrics_result = monitor.track_metrics()

        if metrics_result.is_ok():
            metrics = metrics_result.value

            # Check for significant changes
            previous_result = monitor._get_previous_metrics()

            if previous_result.is_ok() and previous_result.value:
                previous = previous_result.value

                # Report coverage changes
                coverage_delta = metrics.test_coverage - previous.test_coverage

                if abs(coverage_delta) > 1:
                    if coverage_delta > 0:
                        print(f"📈 Test coverage improved: {previous.test_coverage:.1f}% → {metrics.test_coverage:.1f}% (+{coverage_delta:.1f}%)")
                    else:
                        print(f"📉 Test coverage changed: {previous.test_coverage:.1f}% → {metrics.test_coverage:.1f}% ({coverage_delta:.1f}%)")
                    print()

    except Exception:
        pass  # Non-critical


def _show_activity_summary(reporter: ActivityReporter) -> None:
    """Show summary of recent activities.

    Args:
        reporter: ActivityReporter instance
    """
    try:
        # Get recent history
        history_result = reporter.get_recent_history(limit=3)

        if history_result.is_ok() and len(history_result.value) > 1:
            # Multiple activities - show summary box
            activities = history_result.value

            # Format and display
            summary = reporter.format_summary(activities[-3:])  # Last 3
            print(summary)
            print()

    except Exception:
        pass  # Non-critical


if __name__ == "__main__":
    main()
```

## Hook Behavior

**Always:**

- Report activity to activity log
- Track file modifications in session state
- Update last_modified timestamp

**Python Files:**

- Quick syntax validation
- Report syntax errors as warnings (non-blocking)

**After Multiple Activities:**

- Display activity summary box
- Show recent 3 activities with durations

**Quality Metric Changes:**

- Report significant coverage changes (> 1%)
- Celebrate improvements
- Warn about regressions (non-blocking)

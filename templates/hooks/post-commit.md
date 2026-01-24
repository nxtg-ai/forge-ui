# Post-Commit Hook (Documentation & Tracking)

This hook runs after successful git commits to track activity and update documentation.

## Environment Variables

- `COMMIT_HASH` - Hash of the commit just created
- `COMMIT_MESSAGE` - Commit message

## Execution Logic

```python
#!/usr/bin/env python3
"""Post-commit hook for documentation and activity tracking."""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add forge to path
PROJECT_ROOT = Path.cwd()
sys.path.insert(0, str(PROJECT_ROOT))

from forge.services.activity_reporter import ActivityReporter
from forge.services.quality_monitor import QualityMonitor


def main():
    """Execute post-commit tracking and documentation."""

    # Get commit information
    commit_hash = _get_last_commit_hash()
    commit_message = _get_last_commit_message()

    print("✓ Commit created:", commit_hash[:7])

    # Report activity
    reporter = ActivityReporter(PROJECT_ROOT)
    reporter.report_complete(
        f"Commit created: {commit_hash[:7]}",
        duration=0.1,
        success=True,
    )

    # Update session state with commit
    _track_commit_in_session(commit_hash, commit_message)

    # Update quality metrics
    _update_quality_metrics_after_commit()

    # Create automatic checkpoint for major commits
    files_changed = _count_files_in_commit(commit_hash)

    if files_changed > 5:
        print("✓ Creating checkpoint (major commit)...")
        checkpoint_id = _create_checkpoint(commit_hash, commit_message)

        if checkpoint_id:
            print(f"🔖 Checkpoint created: {checkpoint_id}")
            print(f"   Restore with: /restore {checkpoint_id}")

    # Show project health update
    _show_health_update()

    print()

    sys.exit(0)


def _get_last_commit_hash() -> str:
    """Get hash of last commit.

    Returns:
        Commit hash
    """
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        return result.stdout.strip() if result.returncode == 0 else ""

    except Exception:
        return ""


def _get_last_commit_message() -> str:
    """Get message of last commit.

    Returns:
        Commit message
    """
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%s"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        return result.stdout.strip() if result.returncode == 0 else ""

    except Exception:
        return ""


def _count_files_in_commit(commit_hash: str) -> int:
    """Count files changed in commit.

    Args:
        commit_hash: Commit hash

    Returns:
        Number of files changed
    """
    try:
        result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_hash],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode == 0:
            files = [line for line in result.stdout.splitlines() if line.strip()]
            return len(files)

    except Exception:
        pass

    return 0


def _track_commit_in_session(commit_hash: str, commit_message: str) -> None:
    """Track commit in session state.

    Args:
        commit_hash: Commit hash
        commit_message: Commit message
    """
    state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
    if not state_file.exists():
        return

    try:
        with open(state_file, encoding="utf-8") as f:
            state = json.load(f)

        # Update last session
        if "last_session" not in state:
            state["last_session"] = {}

        if "commits" not in state["last_session"]:
            state["last_session"]["commits"] = []

        state["last_session"]["commits"].append({
            "hash": commit_hash,
            "message": commit_message,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })

        # Update project timestamp
        state["project"]["last_updated"] = datetime.utcnow().isoformat() + "Z"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    except Exception:
        pass  # Non-critical


def _update_quality_metrics_after_commit() -> None:
    """Update quality metrics after commit."""
    try:
        monitor = QualityMonitor(PROJECT_ROOT)

        # Track current metrics
        metrics_result = monitor.track_metrics()

        if metrics_result.is_ok():
            # Metrics tracked successfully
            pass

    except Exception:
        pass  # Non-critical


def _create_checkpoint(commit_hash: str, commit_message: str) -> str | None:
    """Create checkpoint for commit.

    Args:
        commit_hash: Commit hash
        commit_message: Commit message

    Returns:
        Checkpoint ID or None
    """
    try:
        import time

        checkpoint_id = f"cp_{datetime.utcnow().strftime('%Y-%m-%d_%H%M')}"

        checkpoints_dir = PROJECT_ROOT / ".claude" / "forge" / "checkpoints"
        checkpoints_dir.mkdir(parents=True, exist_ok=True)

        checkpoint_data = {
            "id": checkpoint_id,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "description": commit_message[:100],  # First 100 chars
            "git_commit": commit_hash,
            "git_tag": f"checkpoint/{checkpoint_id}",
            "branch": _get_current_branch(),
        }

        # Save checkpoint metadata
        checkpoint_file = checkpoints_dir / f"{checkpoint_id}.json"
        with open(checkpoint_file, "w", encoding="utf-8") as f:
            json.dump(checkpoint_data, f, indent=2)

        # Create git tag
        subprocess.run(
            ["git", "tag", "-a", checkpoint_data["git_tag"], "-m", checkpoint_data["description"]],
            cwd=PROJECT_ROOT,
            capture_output=True,
            check=False,
        )

        return checkpoint_id

    except Exception:
        return None


def _get_current_branch() -> str:
    """Get current git branch.

    Returns:
        Branch name
    """
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

        return result.stdout.strip() if result.returncode == 0 else "main"

    except Exception:
        return "main"


def _show_health_update() -> None:
    """Show project health update after commit."""
    try:
        monitor = QualityMonitor(PROJECT_ROOT)

        # Calculate health score
        health_result = monitor.calculate_health_score()

        if health_result.is_ok():
            health_score = health_result.value

            # Get previous score from state
            state_file = PROJECT_ROOT / ".claude" / "forge" / "state.json"
            previous_score = 0

            if state_file.exists():
                with open(state_file, encoding="utf-8") as f:
                    state = json.load(f)
                    previous_score = state.get("quality", {}).get("health_score", 0)

            delta = health_score - previous_score

            if delta > 0:
                print(f"📈 Project Health: {previous_score} → {health_score} (+{delta})")
            elif delta < 0:
                print(f"📊 Project Health: {previous_score} → {health_score} ({delta})")
            else:
                print(f"📊 Project Health: {health_score}/100")

    except Exception:
        pass  # Non-critical


if __name__ == "__main__":
    main()
```

## Hook Behavior

**Always:**

- Report commit activity
- Track commit in session state
- Update quality metrics
- Show commit hash confirmation

**Major Commits (> 5 files changed):**

- Create automatic checkpoint
- Tag commit with checkpoint reference
- Display checkpoint ID and restore command

**Health Updates:**

- Calculate new health score
- Show delta from previous score
- Celebrate improvements
- Notify of declines (informational)

**Non-Blocking:**

- All operations are informational
- Never blocks or fails
- Gracefully handles errors

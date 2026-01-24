"""Context Restoration Service for Continue Mode.

This service restores full context when the user selects "Continue" in the Forge menu,
providing smart recommendations and progress tracking.
"""

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result, StateError


@dataclass
class Task:
    """Represents a task in the feature."""

    id: str
    description: str
    status: str  # "completed", "in_progress", "pending"
    progress: int = 0  # 0-100 for in_progress tasks


@dataclass
class Recommendation:
    """Smart recommendation for improvement."""

    priority: int  # 1-10 (10 = critical)
    category: str  # "security", "quality", "performance", "docs"
    message: str
    suggestion: str
    action: str | None = None  # Optional command to fix


@dataclass
class ContinueContext:
    """Complete context for Continue mode."""

    last_session_time: str
    branch: str
    progress_percent: int
    feature_name: str | None
    outstanding_tasks: list[Task]
    recommendations: list[Recommendation]
    uncommitted_changes: int
    recent_files: list[str] = field(default_factory=list)
    last_commit_hash: str | None = None
    last_commit_time: str | None = None


class ContextRestorationService:
    """Service for restoring Continue mode context."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize context restoration service.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.state_file = self.project_root / ".claude" / "forge" / "state.json"

    def restore_context(self) -> Result[ContinueContext, StateError]:
        """Restore full context for Continue mode.

        Returns:
            Result containing ContinueContext or StateError
        """
        # Load state from state.json
        state_result = self._load_state()
        if state_result.is_error():
            return state_result  # type: ignore

        state = state_result.value

        # Get current git branch
        branch_result = self._get_current_branch()
        branch = branch_result.unwrap_or("main")

        # Get last session time
        last_session_time = self._get_last_session_time(state)

        # Calculate progress
        progress_percent = self._calculate_progress(state)

        # Get feature name
        feature_name = self._get_current_feature(state)

        # Get outstanding tasks
        outstanding_tasks = self._get_outstanding_tasks(state)

        # Get uncommitted changes count
        uncommitted_changes = self._count_uncommitted_changes()

        # Get recently modified files
        recent_files = self._get_recent_files()

        # Get last commit info
        last_commit_hash, last_commit_time = self._get_last_commit_info()

        # Generate smart recommendations
        recommendations = self._generate_recommendations(state, recent_files, uncommitted_changes)

        return Ok(
            ContinueContext(
                last_session_time=last_session_time,
                branch=branch,
                progress_percent=progress_percent,
                feature_name=feature_name,
                outstanding_tasks=outstanding_tasks,
                recommendations=recommendations,
                uncommitted_changes=uncommitted_changes,
                recent_files=recent_files,
                last_commit_hash=last_commit_hash,
                last_commit_time=last_commit_time,
            ),
        )

    def _load_state(self) -> Result[dict[str, Any], StateError]:
        """Load state from state.json.

        Returns:
            Result containing state dict or StateError
        """
        if not self.state_file.exists():
            return Err(StateError.load_failed("State file does not exist"))

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state: dict[str, Any] = json.load(f)
                return Ok(state)
        except json.JSONDecodeError as e:
            return Err(StateError.load_failed(f"Invalid JSON: {e}"))
        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def _get_current_branch(self) -> Result[str, str]:
        """Get current git branch.

        Returns:
            Result containing branch name or error message
        """
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                branch = result.stdout.strip()
                return Ok(branch if branch else "main")
            return Err("Failed to get current branch")
        except Exception as e:
            return Err(str(e))

    def _get_last_session_time(self, state: dict[str, Any]) -> str:
        """Get last session time as human-readable string.

        Args:
            state: State dictionary

        Returns:
            Human-readable time string (e.g., "2 hours ago")
        """
        last_session = state.get("last_session", {})
        started = last_session.get("started")

        if not started:
            return "No previous session"

        try:
            session_time = datetime.fromisoformat(started.replace("Z", "+00:00"))
            now = datetime.now(session_time.tzinfo)
            delta = now - session_time

            if delta < timedelta(minutes=1):
                return "just now"
            elif delta < timedelta(hours=1):
                minutes = int(delta.total_seconds() / 60)
                return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            elif delta < timedelta(days=1):
                hours = int(delta.total_seconds() / 3600)
                return f"{hours} hour{'s' if hours != 1 else ''} ago"
            else:
                days = delta.days
                return f"{days} day{'s' if days != 1 else ''} ago"
        except Exception:
            return "Unknown time"

    def _calculate_progress(self, state: dict[str, Any]) -> int:
        """Calculate progress percentage based on completed tasks.

        Args:
            state: State dictionary

        Returns:
            Progress percentage (0-100)
        """
        development = state.get("development", {})
        features = development.get("features", {})

        in_progress = features.get("in_progress", [])
        if not in_progress:
            return 0

        # For now, use first in-progress feature
        # In a real implementation, this would track task-level progress
        feature = in_progress[0] if isinstance(in_progress, list) else in_progress

        if isinstance(feature, dict):
            return feature.get("progress", 0)

        # Fallback: estimate based on phases
        phases_completed = len(development.get("phases_completed", []))
        phases_remaining = len(development.get("phases_remaining", []))
        total_phases = phases_completed + phases_remaining

        if total_phases == 0:
            return 0

        return int((phases_completed / total_phases) * 100)

    def _get_current_feature(self, state: dict[str, Any]) -> str | None:
        """Get name of currently active feature.

        Args:
            state: State dictionary

        Returns:
            Feature name or None
        """
        development = state.get("development", {})
        features = development.get("features", {})
        in_progress = features.get("in_progress", [])

        if not in_progress:
            return None

        if isinstance(in_progress, list) and len(in_progress) > 0:
            feature = in_progress[0]
            if isinstance(feature, dict):
                return feature.get("name")
            elif isinstance(feature, str):
                return feature

        return None

    def _get_outstanding_tasks(self, state: dict[str, Any]) -> list[Task]:
        """Get list of outstanding tasks.

        Args:
            state: State dictionary

        Returns:
            List of Task objects
        """
        development = state.get("development", {})
        phases_completed = development.get("phases_completed", [])
        phases_remaining = development.get("phases_remaining", [])
        current_phase = development.get("current_phase", "planning")

        tasks: list[Task] = []

        # Convert completed phases to completed tasks
        for idx, phase in enumerate(phases_completed):
            tasks.append(
                Task(
                    id=f"phase_{idx}",
                    description=phase.capitalize(),
                    status="completed",
                    progress=100,
                ),
            )

        # Current phase as in_progress
        if current_phase:
            tasks.append(
                Task(
                    id="current",
                    description=current_phase.capitalize(),
                    status="in_progress",
                    progress=self._calculate_progress(state),
                ),
            )

        # Remaining phases as pending
        for idx, phase in enumerate(phases_remaining):
            if phase != current_phase:  # Don't duplicate current phase
                tasks.append(
                    Task(
                        id=f"pending_{idx}",
                        description=phase.capitalize(),
                        status="pending",
                        progress=0,
                    ),
                )

        return tasks

    def _count_uncommitted_changes(self) -> int:
        """Count number of uncommitted file changes.

        Returns:
            Number of modified files
        """
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                lines = [line for line in result.stdout.splitlines() if line.strip()]
                return len(lines)
            return 0
        except Exception:
            return 0

    def _get_recent_files(self, hours: int = 2) -> list[str]:
        """Get list of recently modified files.

        Args:
            hours: Number of hours to look back

        Returns:
            List of file paths
        """
        try:
            # Find files modified in last N hours
            result = subprocess.run(
                ["find", ".", "-type", "f", "-mmin", f"-{hours * 60}", "-name", "*.py"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                files = result.stdout.splitlines()
                # Filter out common exclusions
                filtered = [
                    f
                    for f in files
                    if not any(
                        excl in f
                        for excl in [
                            "__pycache__",
                            ".git",
                            "venv",
                            "node_modules",
                            ".pytest_cache",
                        ]
                    )
                ]
                return filtered[:10]  # Limit to 10 files
            return []
        except Exception:
            return []

    def _get_last_commit_info(self) -> tuple[str | None, str | None]:
        """Get last commit hash and time.

        Returns:
            Tuple of (commit_hash, commit_time)
        """
        try:
            # Get last commit hash
            hash_result = subprocess.run(
                ["git", "log", "-1", "--format=%H"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            commit_hash = hash_result.stdout.strip() if hash_result.returncode == 0 else None

            # Get last commit time
            time_result = subprocess.run(
                ["git", "log", "-1", "--format=%ar"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            commit_time = time_result.stdout.strip() if time_result.returncode == 0 else None

            return (commit_hash, commit_time)
        except Exception:
            return (None, None)

    def _generate_recommendations(
        self,
        state: dict[str, Any],
        recent_files: list[str],
        uncommitted_changes: int,
    ) -> list[Recommendation]:
        """Generate smart recommendations based on context.

        Args:
            state: State dictionary
            recent_files: Recently modified files
            uncommitted_changes: Count of uncommitted changes

        Returns:
            List of Recommendation objects
        """
        recommendations: list[Recommendation] = []

        # Check test coverage
        quality = state.get("quality", {})
        tests = quality.get("tests", {})
        unit_coverage = tests.get("unit", {}).get("coverage", 0)

        if unit_coverage < 85:
            recommendations.append(
                Recommendation(
                    priority=7,
                    category="quality",
                    message=f"Test coverage at {unit_coverage}%",
                    suggestion="Target is 85% minimum for production",
                    action="forge test generate-stubs",
                ),
            )

        # Check for uncommitted changes
        if uncommitted_changes > 10:
            recommendations.append(
                Recommendation(
                    priority=6,
                    category="quality",
                    message=f"{uncommitted_changes} uncommitted files",
                    suggestion="Consider committing or stashing changes",
                    action=None,
                ),
            )

        # Check security vulnerabilities
        security = quality.get("security", {})
        vulnerabilities = security.get("vulnerabilities", {})
        critical = vulnerabilities.get("critical", 0)
        high = vulnerabilities.get("high", 0)

        if critical > 0 or high > 0:
            recommendations.append(
                Recommendation(
                    priority=10 if critical > 0 else 9,
                    category="security",
                    message=f"{critical} critical, {high} high severity vulnerabilities",
                    suggestion="Run security scan and update dependencies",
                    action="forge security scan",
                ),
            )

        # Sort by priority (descending) and return top 3
        recommendations.sort(key=lambda r: r.priority, reverse=True)
        return recommendations[:3]

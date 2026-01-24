"""Activity Reporter Service for background activity monitoring.

This service reports background hook activity to the active Claude session,
allowing transparent visibility into what Forge is doing.

Implements both synchronous reporting and asynchronous monitoring with
real-time updates in the terminal.
"""

import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Literal

from ..result import Err, Ok, Result, StateError


@dataclass
class ActivityStatus:
    """Status of a background activity."""

    activity: str
    status: Literal["started", "complete", "failed"]
    timestamp: float
    duration: float | None = None
    success: bool | None = None
    message: str | None = None


@dataclass
class ActivityUpdate:
    """Real-time activity update for async monitoring."""

    activity: str
    status: Literal["started", "progress", "complete", "failed"]
    progress: float | None = None  # 0.0 to 1.0
    message: str | None = None
    timestamp: float = field(default_factory=time.time)


class ActivityReporter:
    """Reporter for background activity status.

    Phase 1: Synchronous reporting (display after completion)
    Phase 2: Asynchronous reporting (real-time display) - future enhancement
    """

    def __init__(self, project_root: Path | str = "."):
        """Initialize activity reporter.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.status_file = self.project_root / ".claude" / "forge" / "activity.status"
        self.history_file = self.project_root / ".claude" / "forge" / "activity.history"

        # Ensure directory exists
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

    def report_start(self, activity: str) -> Result[None, StateError]:
        """Signal activity started.

        Args:
            activity: Description of the activity (e.g., "Running tests...")

        Returns:
            Result indicating success or StateError
        """
        status = ActivityStatus(activity=activity, status="started", timestamp=time.time())

        return self._write_status(status)

    def report_complete(
        self,
        activity: str,
        duration: float,
        success: bool = True,
        message: str | None = None,
    ) -> Result[None, StateError]:
        """Signal activity completed.

        Args:
            activity: Description of the activity
            duration: Duration in seconds
            success: Whether activity succeeded
            message: Optional completion message

        Returns:
            Result indicating success or StateError
        """
        status = ActivityStatus(
            activity=activity,
            status="complete" if success else "failed",
            timestamp=time.time(),
            duration=duration,
            success=success,
            message=message,
        )

        # Write to status file
        write_result = self._write_status(status)
        if write_result.is_error():
            return write_result

        # Append to history
        self._append_to_history(status)

        return Ok(None)

    def report_failed(self, activity: str, duration: float, error: str) -> Result[None, StateError]:
        """Signal activity failed.

        Args:
            activity: Description of the activity
            duration: Duration in seconds before failure
            error: Error message

        Returns:
            Result indicating success or StateError
        """
        return self.report_complete(activity, duration, success=False, message=error)

    def get_current_status(self) -> Result[ActivityStatus | None, StateError]:
        """Get current activity status.

        Returns:
            Result containing ActivityStatus or None if no active status
        """
        if not self.status_file.exists():
            return Ok(None)

        try:
            with open(self.status_file, encoding="utf-8") as f:
                data = json.load(f)
                status = ActivityStatus(
                    activity=data["activity"],
                    status=data["status"],
                    timestamp=data["timestamp"],
                    duration=data.get("duration"),
                    success=data.get("success"),
                    message=data.get("message"),
                )
                return Ok(status)
        except json.JSONDecodeError as e:
            return Err(StateError.load_failed(f"Invalid activity status JSON: {e}"))
        except Exception as e:
            return Err(StateError.load_failed(f"Failed to read activity status: {e}"))

    def clear_status(self) -> Result[None, StateError]:
        """Clear current status file.

        Returns:
            Result indicating success or StateError
        """
        try:
            if self.status_file.exists():
                self.status_file.unlink()
            return Ok(None)
        except Exception as e:
            return Err(StateError.save_failed(f"Failed to clear status: {e}"))

    def get_recent_history(self, limit: int = 10) -> Result[list[ActivityStatus], StateError]:
        """Get recent activity history.

        Args:
            limit: Maximum number of activities to return

        Returns:
            Result containing list of ActivityStatus objects
        """
        if not self.history_file.exists():
            return Ok([])

        try:
            with open(self.history_file, encoding="utf-8") as f:
                lines = f.readlines()
                recent_lines = lines[-limit:] if len(lines) > limit else lines

                statuses: list[ActivityStatus] = []
                for line in recent_lines:
                    data = json.loads(line.strip())
                    status = ActivityStatus(
                        activity=data["activity"],
                        status=data["status"],
                        timestamp=data["timestamp"],
                        duration=data.get("duration"),
                        success=data.get("success"),
                        message=data.get("message"),
                    )
                    statuses.append(status)

                return Ok(statuses)
        except Exception as e:
            return Err(StateError.load_failed(f"Failed to read activity history: {e}"))

    def format_summary(self, activities: list[ActivityStatus]) -> str:
        """Format activities as summary for display.

        Args:
            activities: List of ActivityStatus objects

        Returns:
            Formatted summary string
        """
        if not activities:
            return "No recent activity"

        lines = ["┌─ Forge Activity ─────────────────────────────────────┐"]

        for activity in activities:
            if activity.status == "complete":
                icon = "✓"
                duration_str = f"{activity.duration:.1f}s" if activity.duration else ""
                line = f"│ {icon} {activity.activity:<45} {duration_str:>6} │"
            elif activity.status == "failed":
                icon = "❌"
                line = f"│ {icon} {activity.activity:<52} │"
            else:  # started
                icon = "🔍"
                line = f"│ {icon} {activity.activity:<52} │"

            lines.append(line)

        lines.append("└──────────────────────────────────────────────────────┘")

        return "\n".join(lines)

    def _write_status(self, status: ActivityStatus) -> Result[None, StateError]:
        """Write status to status file.

        Args:
            status: ActivityStatus to write

        Returns:
            Result indicating success or StateError
        """
        try:
            data = {
                "activity": status.activity,
                "status": status.status,
                "timestamp": status.timestamp,
            }

            if status.duration is not None:
                data["duration"] = status.duration
            if status.success is not None:
                data["success"] = status.success
            if status.message is not None:
                data["message"] = status.message

            with open(self.status_file, "w", encoding="utf-8") as f:
                json.dump(data, f)

            return Ok(None)
        except Exception as e:
            return Err(StateError.save_failed(f"Failed to write activity status: {e}"))

    def _append_to_history(self, status: ActivityStatus) -> None:
        """Append status to history file.

        Args:
            status: ActivityStatus to append
        """
        try:
            data = {
                "activity": status.activity,
                "status": status.status,
                "timestamp": status.timestamp,
            }

            if status.duration is not None:
                data["duration"] = status.duration
            if status.success is not None:
                data["success"] = status.success
            if status.message is not None:
                data["message"] = status.message

            with open(self.history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(data) + "\n")
        except Exception:
            # Non-critical: history append failure doesn't break workflow
            pass

    def supports_async_display(self) -> bool:
        """Check if terminal supports asynchronous display.

        Returns:
            True if ANSI escape codes supported, False otherwise
        """
        return sys.stdout.isatty() and os.getenv("TERM") != "dumb" and os.getenv("NO_COLOR") is None

    async def monitor_activity_async(
        self,
        callback: Callable[[ActivityUpdate], None],
    ) -> Result[None, StateError]:
        """Monitor activity asynchronously with real-time updates.

        Watches the status file for changes and calls callback with updates.
        Useful for displaying live progress in the terminal.

        Args:
            callback: Function to call with each update

        Returns:
            Result indicating success or StateError
        """
        if not self.supports_async_display():
            return Err(
                StateError.load_failed("Terminal does not support async display (no ANSI support)"),
            )

        last_timestamp = 0.0
        monitoring = True

        try:
            while monitoring:
                # Check for status updates
                status_result = self.get_current_status()
                if status_result.is_ok() and status_result.value:
                    status = status_result.value

                    # Only process new updates
                    if status.timestamp > last_timestamp:
                        last_timestamp = status.timestamp

                        # Convert to update
                        update = ActivityUpdate(
                            activity=status.activity,
                            status=(
                                status.status
                                if status.status in ["started", "complete", "failed"]
                                else "progress"
                            ),
                            progress=None,  # Could be enhanced with progress tracking
                            message=status.message,
                            timestamp=status.timestamp,
                        )

                        # Call callback
                        callback(update)

                        # Stop monitoring if activity completed or failed
                        if status.status in ["complete", "failed"]:
                            monitoring = False

                # Sleep briefly to avoid busy waiting
                await asyncio.sleep(0.1)

            return Ok(None)

        except Exception as e:
            return Err(StateError.load_failed(f"Failed to monitor activity: {e}"))

    def format_live_update(self, update: ActivityUpdate) -> str:
        """Format activity update for live terminal display.

        Uses ANSI escape codes for in-place updates. Returns string with
        cursor positioning and color codes.

        Args:
            update: ActivityUpdate to format

        Returns:
            ANSI-formatted string for terminal display
        """
        if not self.supports_async_display():
            # Fallback to simple format
            return f"{update.activity} [{update.status}]"

        # ANSI codes
        CLEAR_LINE = "\033[2K"  # Clear entire line
        CURSOR_START = "\033[0G"  # Move cursor to start of line
        COLOR_RESET = "\033[0m"
        COLOR_BLUE = "\033[34m"
        COLOR_GREEN = "\033[32m"
        COLOR_RED = "\033[31m"
        COLOR_YELLOW = "\033[33m"

        # Status indicators
        if update.status == "started":
            icon = self._get_spinner_frame()
            color = COLOR_BLUE
            status_text = "RUNNING"
        elif update.status == "progress":
            icon = self._get_spinner_frame()
            color = COLOR_BLUE
            status_text = "PROGRESS"
        elif update.status == "complete":
            icon = "✓"
            color = COLOR_GREEN
            status_text = "COMPLETE"
        else:  # failed
            icon = "✗"
            color = COLOR_RED
            status_text = "FAILED"

        # Build update string
        parts = [CLEAR_LINE, CURSOR_START, color, icon, " ", update.activity]

        # Add progress bar if available
        if update.progress is not None:
            bar = self._render_progress_bar(update.progress)
            parts.extend([" ", bar])

        # Add status
        parts.extend([" [", status_text, "]", COLOR_RESET])

        # Add message if available
        if update.message:
            parts.extend([" - ", update.message[:50]])  # Truncate long messages

        return "".join(parts)

    def _get_spinner_frame(self) -> str:
        """Get current frame of spinner animation.

        Returns:
            Single character spinner frame
        """
        frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        # Use timestamp for frame selection to create animation effect
        frame_idx = int(time.time() * 10) % len(frames)
        return frames[frame_idx]

    def _render_progress_bar(self, progress: float, width: int = 20) -> str:
        """Render progress bar.

        Args:
            progress: Progress from 0.0 to 1.0
            width: Width of progress bar in characters

        Returns:
            Progress bar string
        """
        filled = int(progress * width)
        empty = width - filled

        # Use block characters for smooth progress
        if self.supports_async_display():
            bar = "▓" * filled + "░" * empty
        else:
            bar = "#" * filled + "-" * empty

        percentage = int(progress * 100)
        return f"[{bar}] {percentage}%"

    def start_live_monitoring(self, timeout: float = 60.0) -> None:
        """Start live monitoring in background (convenience method).

        Creates an async task to monitor activity and display updates.
        Use this for CLI commands that want live progress display.

        Args:
            timeout: Maximum time to monitor in seconds
        """
        if not self.supports_async_display():
            # Fallback: just print static messages
            print("Live monitoring not supported in this terminal.")
            return

        def display_update(update: ActivityUpdate) -> None:
            """Display update to terminal."""
            output = self.format_live_update(update)
            sys.stdout.write(output)
            sys.stdout.flush()

            # Add newline on completion
            if update.status in ["complete", "failed"]:
                sys.stdout.write("\n")
                sys.stdout.flush()

        # Run monitoring in asyncio event loop with timeout
        try:
            asyncio.run(
                asyncio.wait_for(self.monitor_activity_async(display_update), timeout=timeout),
            )
        except asyncio.TimeoutError:
            sys.stdout.write("\n[Activity monitoring timed out]\n")
            sys.stdout.flush()
        except Exception:
            # Gracefully handle errors
            pass

    def get_live_progress_display(self, activities: list[str]) -> str:
        """Generate multi-activity progress display.

        Args:
            activities: List of activity descriptions

        Returns:
            ANSI-formatted progress display
        """
        if not self.supports_async_display():
            return "\n".join(f"• {a}" for a in activities)

        # ANSI codes
        COLOR_BLUE = "\033[34m"
        COLOR_RESET = "\033[0m"
        CLEAR_SCREEN = "\033[2J"
        CURSOR_HOME = "\033[H"

        lines = [
            CLEAR_SCREEN + CURSOR_HOME,
            "╔═══════════════════════════════════════════════════════╗",
            "║  FORGE ACTIVITY MONITOR                               ║",
            "╚═══════════════════════════════════════════════════════╝",
            "",
        ]

        for activity in activities:
            spinner = self._get_spinner_frame()
            lines.append(f"{COLOR_BLUE}{spinner}{COLOR_RESET} {activity}")

        lines.append("")
        lines.append("Press Ctrl+C to stop monitoring...")

        return "\n".join(lines)

    async def monitor_multiple_activities(
        self,
        activity_generators: list[asyncio.Task],
        callback: Callable[[list[ActivityUpdate]], None],
    ) -> Result[None, StateError]:
        """Monitor multiple async activities simultaneously.

        Args:
            activity_generators: List of async tasks generating activities
            callback: Function to call with all current updates

        Returns:
            Result indicating success or StateError
        """
        try:
            updates: dict[str, ActivityUpdate] = {}
            monitoring = True

            while monitoring and activity_generators:
                # Check each generator for updates
                done, pending = await asyncio.wait(
                    activity_generators,
                    timeout=0.1,
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for task in done:
                    try:
                        update = await task
                        if update:
                            updates[update.activity] = update
                            callback(list(updates.values()))

                            if update.status in ["complete", "failed"]:
                                activity_generators.remove(task)
                    except Exception:
                        activity_generators.remove(task)

                # Continue with pending tasks
                activity_generators = list(pending)

                # Stop if all activities complete
                if not activity_generators:
                    monitoring = False

            return Ok(None)

        except Exception as e:
            return Err(StateError.load_failed(f"Failed to monitor activities: {e}"))

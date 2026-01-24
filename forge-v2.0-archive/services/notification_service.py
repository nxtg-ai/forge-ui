"""Notification Service for important events and alerts.

This service manages notifications for quality regressions, workflow completions,
critical errors, and success celebrations with configurable notification levels.
"""

import json
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path

from ..result import Err, Ok, Result, StateError


class NotificationLevel(Enum):
    """Notification importance levels."""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    SUCCESS = "success"


class NotificationCategory(Enum):
    """Notification categories."""

    QUALITY = "quality"
    WORKFLOW = "workflow"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COMMIT = "commit"
    DEPLOYMENT = "deployment"
    GENERAL = "general"


@dataclass
class Notification:
    """Represents a notification."""

    level: NotificationLevel
    category: NotificationCategory
    title: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    action_required: bool = False
    action_hint: str | None = None
    dismissible: bool = True

    def to_dict(self) -> dict[str, str | bool]:
        """Convert to dictionary."""
        return {
            "level": self.level.value,
            "category": self.category.value,
            "title": self.title,
            "message": self.message,
            "timestamp": self.timestamp,
            "action_required": self.action_required,
            "action_hint": self.action_hint or "",
            "dismissible": self.dismissible,
        }


@dataclass
class NotificationConfig:
    """Notification configuration."""

    min_level: NotificationLevel = NotificationLevel.INFO
    enabled_categories: set[NotificationCategory] = field(
        default_factory=lambda: set(NotificationCategory),
    )
    quiet_hours_start: int | None = None  # Hour (0-23)
    quiet_hours_end: int | None = None  # Hour (0-23)
    max_notifications_per_session: int = 20
    sound_enabled: bool = False
    color_enabled: bool = True

    @staticmethod
    def default() -> "NotificationConfig":
        """Create default configuration."""
        return NotificationConfig(
            min_level=NotificationLevel.INFO,
            enabled_categories=set(NotificationCategory),
        )


class NotificationService:
    """Service for managing notifications and alerts."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize notification service.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.notifications_file = self.project_root / ".claude" / "forge" / "notifications.jsonl"
        self.config_file = self.project_root / ".claude" / "forge" / "notification_config.json"

        # Ensure directory exists
        self.notifications_file.parent.mkdir(parents=True, exist_ok=True)

        # Load configuration
        self.config = self._load_config()

    def notify(
        self,
        level: NotificationLevel,
        category: NotificationCategory,
        title: str,
        message: str,
        action_required: bool = False,
        action_hint: str | None = None,
    ) -> Result[None, StateError]:
        """Send a notification.

        Args:
            level: Notification level
            category: Notification category
            title: Notification title
            message: Notification message
            action_required: Whether action is required
            action_hint: Hint for required action

        Returns:
            Result indicating success or StateError
        """
        # Check if notification should be sent
        if not self._should_notify(level, category):
            return Ok(None)

        # Create notification
        notification = Notification(
            level=level,
            category=category,
            title=title,
            message=message,
            action_required=action_required,
            action_hint=action_hint,
        )

        # Store notification
        self._store_notification(notification)

        # Display notification
        self._display_notification(notification)

        return Ok(None)

    def notify_quality_regression(
        self,
        metric: str,
        previous: float,
        current: float,
    ) -> Result[None, StateError]:
        """Notify about quality regression.

        Args:
            metric: Metric name
            previous: Previous value
            current: Current value

        Returns:
            Result indicating success or StateError
        """
        delta = current - previous
        return self.notify(
            level=NotificationLevel.WARNING,
            category=NotificationCategory.QUALITY,
            title="Quality Regression Detected",
            message=f"{metric} decreased from {previous:.1f} to {current:.1f} ({delta:+.1f})",
            action_required=True,
            action_hint="Review recent changes and add tests to improve quality",
        )

    def notify_workflow_complete(
        self,
        workflow_name: str,
        duration_seconds: int,
    ) -> Result[None, StateError]:
        """Notify about workflow completion.

        Args:
            workflow_name: Name of completed workflow
            duration_seconds: Duration in seconds

        Returns:
            Result indicating success or StateError
        """
        minutes = duration_seconds // 60
        return self.notify(
            level=NotificationLevel.SUCCESS,
            category=NotificationCategory.WORKFLOW,
            title="Workflow Completed",
            message=f"{workflow_name} completed successfully in {minutes}m",
            action_required=False,
        )

    def notify_critical_error(
        self,
        error_type: str,
        error_message: str,
    ) -> Result[None, StateError]:
        """Notify about critical error.

        Args:
            error_type: Type of error
            error_message: Error message

        Returns:
            Result indicating success or StateError
        """
        return self.notify(
            level=NotificationLevel.CRITICAL,
            category=NotificationCategory.GENERAL,
            title=f"Critical Error: {error_type}",
            message=error_message,
            action_required=True,
            action_hint="Immediate attention required - workflow stopped",
        )

    def notify_success(
        self,
        achievement: str,
        details: str | None = None,
    ) -> Result[None, StateError]:
        """Notify about success/achievement.

        Args:
            achievement: Achievement description
            details: Additional details

        Returns:
            Result indicating success or StateError
        """
        message = achievement
        if details:
            message += f" - {details}"

        return self.notify(
            level=NotificationLevel.SUCCESS,
            category=NotificationCategory.GENERAL,
            title="Success! 🎉",
            message=message,
            action_required=False,
        )

    def notify_security_alert(
        self,
        severity: str,
        issue_description: str,
    ) -> Result[None, StateError]:
        """Notify about security issue.

        Args:
            severity: Severity level
            issue_description: Description of issue

        Returns:
            Result indicating success or StateError
        """
        level = NotificationLevel.CRITICAL if severity == "high" else NotificationLevel.WARNING

        return self.notify(
            level=level,
            category=NotificationCategory.SECURITY,
            title=f"Security Alert ({severity})",
            message=issue_description,
            action_required=True,
            action_hint="Review and fix security issues before committing",
        )

    def get_unread_notifications(self, limit: int = 10) -> Result[list[Notification], StateError]:
        """Get unread notifications.

        Args:
            limit: Maximum number of notifications

        Returns:
            Result containing list of Notification objects
        """
        if not self.notifications_file.exists():
            return Ok([])

        try:
            notifications: list[Notification] = []

            with open(self.notifications_file, encoding="utf-8") as f:
                lines = f.readlines()

            recent_lines = lines[-limit:] if len(lines) > limit else lines

            for line in recent_lines:
                data = json.loads(line.strip())
                notification = Notification(
                    level=NotificationLevel(data["level"]),
                    category=NotificationCategory(data["category"]),
                    title=data["title"],
                    message=data["message"],
                    timestamp=data["timestamp"],
                    action_required=data.get("action_required", False),
                    action_hint=data.get("action_hint"),
                    dismissible=data.get("dismissible", True),
                )
                notifications.append(notification)

            return Ok(notifications)

        except Exception as e:
            return Err(StateError.load_failed(f"Failed to load notifications: {e}"))

    def clear_notifications(self) -> Result[None, StateError]:
        """Clear all notifications.

        Returns:
            Result indicating success or StateError
        """
        try:
            if self.notifications_file.exists():
                self.notifications_file.unlink()
            return Ok(None)
        except Exception as e:
            return Err(StateError.save_failed(f"Failed to clear notifications: {e}"))

    def update_config(self, config: NotificationConfig) -> Result[None, StateError]:
        """Update notification configuration.

        Args:
            config: New configuration

        Returns:
            Result indicating success or StateError
        """
        try:
            config_data = {
                "min_level": config.min_level.value,
                "enabled_categories": [c.value for c in config.enabled_categories],
                "quiet_hours_start": config.quiet_hours_start,
                "quiet_hours_end": config.quiet_hours_end,
                "max_notifications_per_session": config.max_notifications_per_session,
                "sound_enabled": config.sound_enabled,
                "color_enabled": config.color_enabled,
            }

            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2)

            self.config = config
            return Ok(None)

        except Exception as e:
            return Err(StateError.save_failed(f"Failed to update config: {e}"))

    # Helper methods

    def _load_config(self) -> NotificationConfig:
        """Load notification configuration.

        Returns:
            NotificationConfig object
        """
        if not self.config_file.exists():
            return NotificationConfig.default()

        try:
            with open(self.config_file, encoding="utf-8") as f:
                data = json.load(f)

            return NotificationConfig(
                min_level=NotificationLevel(data.get("min_level", "info")),
                enabled_categories={
                    NotificationCategory(c) for c in data.get("enabled_categories", [])
                }
                or set(NotificationCategory),
                quiet_hours_start=data.get("quiet_hours_start"),
                quiet_hours_end=data.get("quiet_hours_end"),
                max_notifications_per_session=data.get("max_notifications_per_session", 20),
                sound_enabled=data.get("sound_enabled", False),
                color_enabled=data.get("color_enabled", True),
            )

        except Exception:
            return NotificationConfig.default()

    def _should_notify(self, level: NotificationLevel, category: NotificationCategory) -> bool:
        """Check if notification should be sent.

        Args:
            level: Notification level
            category: Notification category

        Returns:
            True if notification should be sent
        """
        # Check level
        level_order = {
            NotificationLevel.DEBUG: 0,
            NotificationLevel.INFO: 1,
            NotificationLevel.SUCCESS: 1,
            NotificationLevel.WARNING: 2,
            NotificationLevel.ERROR: 3,
            NotificationLevel.CRITICAL: 4,
        }

        if level_order.get(level, 0) < level_order.get(self.config.min_level, 1):
            return False

        # Check category
        if category not in self.config.enabled_categories:
            return False

        # Check quiet hours
        if self._is_quiet_hours():
            # Only critical notifications during quiet hours
            if level != NotificationLevel.CRITICAL:
                return False

        return True

    def _is_quiet_hours(self) -> bool:
        """Check if current time is in quiet hours.

        Returns:
            True if in quiet hours
        """
        if self.config.quiet_hours_start is None or self.config.quiet_hours_end is None:
            return False

        current_hour = datetime.now().hour

        start = self.config.quiet_hours_start
        end = self.config.quiet_hours_end

        if start <= end:
            return start <= current_hour < end
        else:
            # Quiet hours span midnight
            return current_hour >= start or current_hour < end

    def _store_notification(self, notification: Notification) -> None:
        """Store notification to file.

        Args:
            notification: Notification to store
        """
        try:
            with open(self.notifications_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(notification.to_dict()) + "\n")
        except Exception:
            pass  # Non-critical failure

    def _display_notification(self, notification: Notification) -> None:
        """Display notification to user.

        Args:
            notification: Notification to display
        """
        # Get icon and color based on level
        icon, color_code = self._get_notification_style(notification.level)

        # Build notification box
        lines = [
            self._colorize(f"╭─ {icon} {notification.title} ─", color_code),
            self._colorize("│", color_code),
            self._colorize(f"│  {notification.message}", color_code),
        ]

        if notification.action_required and notification.action_hint:
            lines.extend(
                [
                    self._colorize("│", color_code),
                    self._colorize(f"│  💡 {notification.action_hint}", color_code),
                ],
            )

        lines.append(self._colorize("╰─────────────────────────────", color_code))

        # Print to stderr (so it doesn't interfere with stdout)
        print("\n".join(lines), file=sys.stderr)

    def _get_notification_style(self, level: NotificationLevel) -> tuple[str, str]:
        """Get icon and color for notification level.

        Args:
            level: Notification level

        Returns:
            Tuple of (icon, color_code)
        """
        styles = {
            NotificationLevel.DEBUG: ("🔍", "\033[90m"),  # Gray
            NotificationLevel.INFO: ("ℹ️", "\033[34m"),  # Blue
            NotificationLevel.SUCCESS: ("✅", "\033[32m"),  # Green
            NotificationLevel.WARNING: ("⚠️", "\033[33m"),  # Yellow
            NotificationLevel.ERROR: ("❌", "\033[31m"),  # Red
            NotificationLevel.CRITICAL: ("🚨", "\033[91m"),  # Bright red
        }

        return styles.get(level, ("📢", "\033[0m"))

    def _colorize(self, text: str, color_code: str) -> str:
        """Apply color to text if enabled.

        Args:
            text: Text to colorize
            color_code: ANSI color code

        Returns:
            Colorized text
        """
        if not self.config.color_enabled or not self._supports_color():
            return text

        return f"{color_code}{text}\033[0m"

    @staticmethod
    def _supports_color() -> bool:
        """Check if terminal supports color.

        Returns:
            True if colors are supported
        """
        return sys.stdout.isatty() and os.getenv("TERM") != "dumb" and os.getenv("NO_COLOR") is None

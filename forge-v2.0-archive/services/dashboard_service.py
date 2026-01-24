"""Dashboard Service for real-time activity aggregation and visualization.

This service provides comprehensive dashboard data with text-based visualization,
trend analysis, comparative analytics, and metric export capabilities.
"""

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result, StateError
from ..utils.text_charts import create_bar_chart, render_trend


class ExportFormat(Enum):
    """Export formats for metrics."""

    JSON = "json"
    MARKDOWN = "markdown"
    TEXT = "text"
    CSV = "csv"


@dataclass
class DateRange:
    """Represents a date range for comparisons."""

    start: datetime
    end: datetime

    def to_dict(self) -> dict[str, str]:
        """Convert to dictionary."""
        return {
            "start": self.start.isoformat() + "Z",
            "end": self.end.isoformat() + "Z",
        }


@dataclass
class Metric:
    """Represents a single metric value with metadata."""

    name: str
    value: float
    unit: str = ""
    timestamp: str | None = None
    previous_value: float | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        data: dict[str, Any] = {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
        }
        if self.timestamp:
            data["timestamp"] = self.timestamp
        if self.previous_value is not None:
            data["previous_value"] = self.previous_value
            data["delta"] = self.value - self.previous_value
        return data


@dataclass
class DashboardData:
    """Complete dashboard data structure."""

    timestamp: str
    health_score: int
    health_trend: str
    active_workflows: list[str] = field(default_factory=list)
    recent_commits: list[dict[str, str]] = field(default_factory=list)
    quality_metrics: dict[str, Metric] = field(default_factory=dict)
    checkpoints: list[dict[str, str]] = field(default_factory=list)
    agent_activity: list[dict[str, str]] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp,
            "health_score": self.health_score,
            "health_trend": self.health_trend,
            "active_workflows": self.active_workflows,
            "recent_commits": self.recent_commits,
            "quality_metrics": {k: v.to_dict() for k, v in self.quality_metrics.items()},
            "checkpoints": self.checkpoints,
            "agent_activity": self.agent_activity,
            "recommendations": self.recommendations,
        }


@dataclass
class Comparison:
    """Comparison between two time periods."""

    period1: DateRange
    period2: DateRange
    metrics: dict[str, tuple[float, float]]  # metric -> (period1_value, period2_value)
    improvements: list[str] = field(default_factory=list)
    regressions: list[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "period1": self.period1.to_dict(),
            "period2": self.period2.to_dict(),
            "metrics": {k: {"period1": v[0], "period2": v[1]} for k, v in self.metrics.items()},
            "improvements": self.improvements,
            "regressions": self.regressions,
            "summary": self.summary,
        }


class DashboardService:
    """Service for real-time dashboard data and visualization."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize dashboard service.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.state_file = self.project_root / ".claude" / "forge" / "state.json"
        self.metrics_file = self.project_root / ".claude" / "forge" / "quality_metrics.jsonl"
        self.activity_file = self.project_root / ".claude" / "forge" / "activity.history"
        self.checkpoints_dir = self.project_root / ".claude" / "forge" / "checkpoints"

        # Ensure directories exist
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)

    def get_dashboard_data(self) -> Result[DashboardData, StateError]:
        """Get comprehensive dashboard data.

        Returns:
            Result containing DashboardData or StateError
        """
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Load state
        state_result = self._load_state()
        if state_result.is_error():
            return Err(state_result.error)  # type: ignore

        state = state_result.value

        # Get health score
        health_score = state.get("quality", {}).get("health_score", 0)

        # Get health trend
        health_trend_result = self._get_health_trend()
        health_trend = health_trend_result.unwrap_or("stable")

        # Get active workflows
        active_workflows = self._get_active_workflows(state)

        # Get recent commits
        recent_commits = self._get_recent_commits(limit=5)

        # Get quality metrics
        quality_metrics = self._get_quality_metrics(state)

        # Get checkpoints
        checkpoints = self._get_recent_checkpoints(limit=5)

        # Get agent activity
        agent_activity = self._get_agent_activity(limit=10)

        # Get recommendations
        recommendations = self._generate_recommendations(state, health_score)

        dashboard = DashboardData(
            timestamp=timestamp,
            health_score=health_score,
            health_trend=health_trend,
            active_workflows=active_workflows,
            recent_commits=recent_commits,
            quality_metrics=quality_metrics,
            checkpoints=checkpoints,
            agent_activity=agent_activity,
            recommendations=recommendations,
        )

        return Ok(dashboard)

    def generate_text_charts(self, metrics: list[Metric]) -> str:
        """Generate text-based charts for metrics visualization.

        Args:
            metrics: List of Metric objects to visualize

        Returns:
            Formatted chart string
        """
        if not metrics:
            return "No metrics to display"

        lines = ["╭─ Metrics Dashboard ─────────────────────────────────────╮"]
        lines.append("│                                                          │")

        # Create bar chart for current values
        metric_data = {m.name: m.value for m in metrics}
        bar_chart = create_bar_chart(metric_data, width=45, show_values=True)

        for line in bar_chart.split("\n"):
            lines.append(f"│  {line:<54}  │")

        lines.append("│                                                          │")

        # Add trends
        lines.append("│  Trends:                                                 │")
        for metric in metrics:
            if metric.previous_value is not None:
                trend = render_trend(metric.value, metric.previous_value, color=True)
                line = f"│    {metric.name}: {metric.value:.1f} {trend}"
                lines.append(line.ljust(58) + "│")

        lines.append("╰──────────────────────────────────────────────────────────╯")

        return "\n".join(lines)

    def compare_periods(
        self,
        period1: DateRange,
        period2: DateRange,
    ) -> Result[Comparison, StateError]:
        """Compare metrics between two time periods.

        Args:
            period1: First time period
            period2: Second time period

        Returns:
            Result containing Comparison or StateError
        """
        # Get metrics for both periods
        metrics1 = self._get_metrics_in_range(period1)
        metrics2 = self._get_metrics_in_range(period2)

        if not metrics1 or not metrics2:
            return Err(StateError.load_failed("Insufficient data for comparison"))

        # Calculate averages for each metric
        avg_metrics1 = self._average_metrics(metrics1)
        avg_metrics2 = self._average_metrics(metrics2)

        # Compare
        comparison_metrics: dict[str, tuple[float, float]] = {}
        improvements: list[str] = []
        regressions: list[str] = []

        for metric_name in avg_metrics1.keys():
            if metric_name in avg_metrics2:
                val1 = avg_metrics1[metric_name]
                val2 = avg_metrics2[metric_name]
                comparison_metrics[metric_name] = (val1, val2)

                # Determine if improvement or regression
                # (higher is better for most metrics except errors)
                if "error" in metric_name.lower() or "issue" in metric_name.lower():
                    if val2 < val1:
                        improvements.append(f"{metric_name}: {val1:.1f} → {val2:.1f}")
                    elif val2 > val1:
                        regressions.append(f"{metric_name}: {val1:.1f} → {val2:.1f}")
                else:
                    if val2 > val1:
                        improvements.append(f"{metric_name}: {val1:.1f} → {val2:.1f}")
                    elif val2 < val1:
                        regressions.append(f"{metric_name}: {val1:.1f} → {val2:.1f}")

        # Generate summary
        if len(improvements) > len(regressions):
            summary = "Overall improvement detected"
        elif len(regressions) > len(improvements):
            summary = "Overall regression detected"
        else:
            summary = "Metrics stable between periods"

        comparison = Comparison(
            period1=period1,
            period2=period2,
            metrics=comparison_metrics,
            improvements=improvements,
            regressions=regressions,
            summary=summary,
        )

        return Ok(comparison)

    def export_metrics(self, format: ExportFormat) -> Result[str, StateError]:
        """Export metrics in specified format.

        Args:
            format: Export format

        Returns:
            Result containing exported data string or StateError
        """
        dashboard_result = self.get_dashboard_data()
        if dashboard_result.is_error():
            return Err(dashboard_result.error)  # type: ignore

        dashboard = dashboard_result.value

        if format == ExportFormat.JSON:
            return Ok(json.dumps(dashboard.to_dict(), indent=2))

        elif format == ExportFormat.MARKDOWN:
            return Ok(self._export_markdown(dashboard))

        elif format == ExportFormat.TEXT:
            return Ok(self._export_text(dashboard))

        elif format == ExportFormat.CSV:
            return Ok(self._export_csv(dashboard))

        return Err(StateError.invalid_data(f"Unsupported export format: {format}"))

    def _load_state(self) -> Result[dict[str, Any], StateError]:
        """Load state from state file.

        Returns:
            Result containing state dictionary or StateError
        """
        if not self.state_file.exists():
            return Ok({})  # Empty state is valid

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state = json.load(f)
            return Ok(state)
        except json.JSONDecodeError as e:
            return Err(StateError.load_failed(f"Invalid state JSON: {e}"))
        except Exception as e:
            return Err(StateError.load_failed(f"Failed to load state: {e}"))

    def _get_health_trend(self) -> Result[str, StateError]:
        """Get health score trend.

        Returns:
            Result containing trend string ("improving", "declining", "stable")
        """
        if not self.metrics_file.exists():
            return Ok("stable")

        try:
            with open(self.metrics_file, encoding="utf-8") as f:
                lines = f.readlines()

            if len(lines) < 2:
                return Ok("stable")

            # Get last two metrics
            last_data = json.loads(lines[-1].strip())
            prev_data = json.loads(lines[-2].strip())

            last_coverage = last_data.get("test_coverage", 0)
            prev_coverage = prev_data.get("test_coverage", 0)

            if last_coverage > prev_coverage + 1:
                return Ok("improving")
            elif last_coverage < prev_coverage - 1:
                return Ok("declining")
            else:
                return Ok("stable")

        except Exception:
            return Ok("stable")

    def _get_active_workflows(self, state: dict[str, Any]) -> list[str]:
        """Get list of active workflows.

        Args:
            state: State dictionary

        Returns:
            List of workflow names
        """
        workflows: list[str] = []

        # Check for active feature
        current_feature = state.get("current_feature")
        if current_feature:
            workflows.append(f"Feature: {current_feature.get('name', 'Unknown')}")

        # Check for active session
        last_session = state.get("last_session", {})
        if last_session.get("status") == "active":
            workflows.append(f"Session: {last_session.get('id', 'Unknown')}")

        return workflows

    def _get_recent_commits(self, limit: int = 5) -> list[dict[str, str]]:
        """Get recent commits.

        Args:
            limit: Maximum number of commits

        Returns:
            List of commit dictionaries
        """
        try:
            result = subprocess.run(
                ["git", "log", f"-{limit}", "--format=%H|%s|%ar"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=5,
            )

            if result.returncode != 0:
                return []

            commits: list[dict[str, str]] = []
            for line in result.stdout.strip().splitlines():
                if "|" in line:
                    parts = line.split("|", 2)
                    commits.append(
                        {
                            "hash": parts[0][:7],
                            "message": parts[1],
                            "time": parts[2],
                        },
                    )

            return commits

        except Exception:
            return []

    def _get_quality_metrics(self, state: dict[str, Any]) -> dict[str, Metric]:
        """Get quality metrics from state.

        Args:
            state: State dictionary

        Returns:
            Dictionary of metric name to Metric object
        """
        metrics: dict[str, Metric] = {}

        quality = state.get("quality", {})
        tests = quality.get("tests", {}).get("unit", {})

        # Test coverage
        coverage = tests.get("coverage", 0.0)
        metrics["test_coverage"] = Metric(
            name="Test Coverage",
            value=coverage,
            unit="%",
            timestamp=quality.get("last_updated"),
        )

        # Tests passing
        passing = tests.get("passing", 0)
        total = tests.get("total", 0)
        if total > 0:
            pass_rate = (passing / total) * 100
            metrics["test_pass_rate"] = Metric(
                name="Test Pass Rate",
                value=pass_rate,
                unit="%",
            )

        # Health score
        health_score = quality.get("health_score", 0)
        metrics["health_score"] = Metric(
            name="Health Score",
            value=health_score,
            unit="/100",
        )

        return metrics

    def _get_recent_checkpoints(self, limit: int = 5) -> list[dict[str, str]]:
        """Get recent checkpoints.

        Args:
            limit: Maximum number of checkpoints

        Returns:
            List of checkpoint dictionaries
        """
        if not self.checkpoints_dir.exists():
            return []

        checkpoints: list[dict[str, str]] = []

        try:
            checkpoint_files = sorted(
                self.checkpoints_dir.glob("*.json"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )

            for checkpoint_file in checkpoint_files[:limit]:
                with open(checkpoint_file, encoding="utf-8") as f:
                    data = json.load(f)

                checkpoints.append(
                    {
                        "id": checkpoint_file.stem,
                        "description": data.get("description", ""),
                        "created_at": data.get("created_at", ""),
                    },
                )

        except Exception:
            pass

        return checkpoints

    def _get_agent_activity(self, limit: int = 10) -> list[dict[str, str]]:
        """Get recent agent activity.

        Args:
            limit: Maximum number of activities

        Returns:
            List of activity dictionaries
        """
        if not self.activity_file.exists():
            return []

        activities: list[dict[str, str]] = []

        try:
            with open(self.activity_file, encoding="utf-8") as f:
                lines = f.readlines()

            recent_lines = lines[-limit:] if len(lines) > limit else lines

            for line in recent_lines:
                data = json.loads(line.strip())
                activities.append(
                    {
                        "activity": data.get("activity", ""),
                        "status": data.get("status", ""),
                        "duration": (
                            f"{data.get('duration', 0):.1f}s" if data.get("duration") else ""
                        ),
                    },
                )

        except Exception:
            pass

        return activities

    def _generate_recommendations(self, state: dict[str, Any], health_score: int) -> list[str]:
        """Generate smart recommendations based on current state.

        Args:
            state: State dictionary
            health_score: Current health score

        Returns:
            List of recommendation strings
        """
        recommendations: list[str] = []

        # Health score based recommendations
        if health_score < 70:
            recommendations.append(
                "Health score below 70 - consider focusing on quality improvements",
            )

        quality = state.get("quality", {})
        tests = quality.get("tests", {}).get("unit", {})
        coverage = tests.get("coverage", 0)

        if coverage < 85:
            recommendations.append(f"Test coverage at {coverage}% - add tests to reach 85%+ target")

        # Check for uncommitted changes
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=5,
            )
            if result.stdout.strip():
                recommendations.append(
                    "Uncommitted changes detected - consider creating a checkpoint",
                )
        except Exception:
            pass

        # Add positive recommendations
        if health_score >= 90:
            recommendations.append(
                "Excellent health score! Consider sharing improvements with team",
            )

        return recommendations[:5]  # Top 5

    def _get_metrics_in_range(self, date_range: DateRange) -> list[dict[str, Any]]:
        """Get metrics within date range.

        Args:
            date_range: Date range to query

        Returns:
            List of metrics dictionaries
        """
        if not self.metrics_file.exists():
            return []

        metrics: list[dict[str, Any]] = []

        try:
            with open(self.metrics_file, encoding="utf-8") as f:
                for line in f:
                    data = json.loads(line.strip())
                    timestamp_str = data.get("timestamp", "")

                    try:
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        if date_range.start <= timestamp <= date_range.end:
                            metrics.append(data)
                    except Exception:
                        continue

        except Exception:
            pass

        return metrics

    def _average_metrics(self, metrics: list[dict[str, Any]]) -> dict[str, float]:
        """Calculate average values for metrics.

        Args:
            metrics: List of metrics dictionaries

        Returns:
            Dictionary of metric name to average value
        """
        if not metrics:
            return {}

        # Collect all values
        sums: dict[str, float] = {}
        counts: dict[str, int] = {}

        for metric in metrics:
            for key, value in metric.items():
                if isinstance(value, (int, float)) and key != "timestamp":
                    sums[key] = sums.get(key, 0) + value
                    counts[key] = counts.get(key, 0) + 1

        # Calculate averages
        averages = {key: sums[key] / counts[key] for key in sums.keys()}

        return averages

    def _export_markdown(self, dashboard: DashboardData) -> str:
        """Export dashboard as Markdown.

        Args:
            dashboard: DashboardData to export

        Returns:
            Markdown string
        """
        lines = [
            "# Dashboard Report",
            f"**Generated:** {dashboard.timestamp}",
            "",
            f"## Health Score: {dashboard.health_score}/100 ({dashboard.health_trend})",
            "",
        ]

        if dashboard.active_workflows:
            lines.extend(
                [
                    "## Active Workflows",
                    "",
                ],
            )
            for workflow in dashboard.active_workflows:
                lines.append(f"- {workflow}")
            lines.append("")

        if dashboard.quality_metrics:
            lines.extend(
                [
                    "## Quality Metrics",
                    "",
                ],
            )
            for metric in dashboard.quality_metrics.values():
                lines.append(f"- **{metric.name}**: {metric.value:.1f}{metric.unit}")
            lines.append("")

        if dashboard.recommendations:
            lines.extend(
                [
                    "## Recommendations",
                    "",
                ],
            )
            for idx, rec in enumerate(dashboard.recommendations, 1):
                lines.append(f"{idx}. {rec}")
            lines.append("")

        return "\n".join(lines)

    def _export_text(self, dashboard: DashboardData) -> str:
        """Export dashboard as plain text.

        Args:
            dashboard: DashboardData to export

        Returns:
            Plain text string
        """
        return self.generate_text_charts(list(dashboard.quality_metrics.values()))

    def _export_csv(self, dashboard: DashboardData) -> str:
        """Export dashboard metrics as CSV.

        Args:
            dashboard: DashboardData to export

        Returns:
            CSV string
        """
        lines = ["Metric,Value,Unit"]

        for metric in dashboard.quality_metrics.values():
            lines.append(f"{metric.name},{metric.value},{metric.unit}")

        return "\n".join(lines)

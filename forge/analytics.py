"""NXTG-Forge Project Analytics

Tracks project metrics, quality trends, and team productivity over time.

v1.0: Basic metrics collection and reporting
v1.1: Advanced trend analysis and predictions
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional


logger = logging.getLogger(__name__)


@dataclass
class Metric:
    """Single metric data point"""

    name: str
    value: float
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    tags: dict[str, str] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Trend:
    """Trend analysis for a metric"""

    metric_name: str
    direction: str  # up, down, stable
    change_percent: float
    current_value: float
    previous_value: float
    period_days: int


class ProjectAnalytics:
    """Collects and analyzes project metrics over time."""

    def __init__(self, project_root: Optional[Path] = None):
        """Initialize analytics.

        Args:
            project_root: Project root directory
        """
        self.project_root = project_root or Path.cwd()
        self.metrics_dir = self.project_root / ".claude" / "analytics"
        self.metrics_dir.mkdir(parents=True, exist_ok=True)

        self.metrics: list[Metric] = []
        self._load_metrics()

    def _load_metrics(self) -> None:
        """Load metrics from storage."""
        metrics_file = self.metrics_dir / "metrics.json"

        if not metrics_file.exists():
            return

        try:
            with open(metrics_file, encoding="utf-8") as f:
                data = json.load(f)
                self.metrics = [Metric(**m) for m in data.get("metrics", [])]
            logger.info(f"Loaded {len(self.metrics)} metrics from storage")
        except Exception as e:
            logger.error(f"Failed to load metrics: {e}")

    def _save_metrics(self) -> None:
        """Save metrics to storage."""
        metrics_file = self.metrics_dir / "metrics.json"

        try:
            with open(metrics_file, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "version": "1.0.0",
                        "last_updated": datetime.utcnow().isoformat() + "Z",
                        "metrics": [
                            {
                                "name": m.name,
                                "value": m.value,
                                "timestamp": m.timestamp,
                                "tags": m.tags,
                                "metadata": m.metadata,
                            }
                            for m in self.metrics
                        ],
                    },
                    f,
                    indent=2,
                )
            logger.info(f"Saved {len(self.metrics)} metrics")
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")

    def record_metric(
        self,
        name: str,
        value: float,
        tags: Optional[dict[str, str]] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> Metric:
        """Record a metric data point.

        Args:
            name: Metric name
            value: Metric value
            tags: Optional tags for categorization
            metadata: Optional metadata

        Returns:
            Created metric
        """
        metric = Metric(name=name, value=value, tags=tags or {}, metadata=metadata or {})

        self.metrics.append(metric)
        self._save_metrics()

        logger.info(f"Recorded metric: {name}={value}")

        return metric

    def get_metrics(
        self,
        name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        tags: Optional[dict[str, str]] = None,
    ) -> list[Metric]:
        """Get metrics filtered by criteria.

        Args:
            name: Filter by metric name
            start_date: Filter by start date
            end_date: Filter by end date
            tags: Filter by tags

        Returns:
            List of matching metrics
        """
        filtered = self.metrics

        if name:
            filtered = [m for m in filtered if m.name == name]

        if start_date:
            start_iso = start_date.isoformat() + "Z"
            filtered = [m for m in filtered if m.timestamp >= start_iso]

        if end_date:
            end_iso = end_date.isoformat() + "Z"
            filtered = [m for m in filtered if m.timestamp <= end_iso]

        if tags:
            filtered = [m for m in filtered if all(m.tags.get(k) == v for k, v in tags.items())]

        return sorted(filtered, key=lambda m: m.timestamp)

    def calculate_trend(self, metric_name: str, period_days: int = 7) -> Optional[Trend]:
        """Calculate trend for a metric.

        Args:
            metric_name: Name of metric
            period_days: Number of days to analyze

        Returns:
            Trend analysis or None if insufficient data
        """
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)

        # Get metrics for the period
        metrics = self.get_metrics(name=metric_name, start_date=period_start, end_date=now)

        if len(metrics) < 2:
            return None

        # Calculate average for first half vs second half
        midpoint = len(metrics) // 2
        first_half = metrics[:midpoint]
        second_half = metrics[midpoint:]

        avg_first = sum(m.value for m in first_half) / len(first_half)
        avg_second = sum(m.value for m in second_half) / len(second_half)

        change_percent = ((avg_second - avg_first) / avg_first * 100) if avg_first != 0 else 0

        if abs(change_percent) < 5:
            direction = "stable"
        elif change_percent > 0:
            direction = "up"
        else:
            direction = "down"

        return Trend(
            metric_name=metric_name,
            direction=direction,
            change_percent=change_percent,
            current_value=avg_second,
            previous_value=avg_first,
            period_days=period_days,
        )

    def get_coverage_trend(self, period_days: int = 30) -> Optional[Trend]:
        """Get test coverage trend.

        Args:
            period_days: Number of days to analyze

        Returns:
            Coverage trend or None
        """
        return self.calculate_trend("test_coverage", period_days)

    def get_velocity_trend(self, period_days: int = 14) -> Optional[Trend]:
        """Get development velocity trend.

        Args:
            period_days: Number of days to analyze

        Returns:
            Velocity trend or None
        """
        return self.calculate_trend("velocity", period_days)

    def get_quality_score_trend(self, period_days: int = 30) -> Optional[Trend]:
        """Get quality score trend.

        Args:
            period_days: Number of days to analyze

        Returns:
            Quality score trend or None
        """
        return self.calculate_trend("quality_score", period_days)

    def generate_summary(self, period_days: int = 30) -> dict[str, Any]:
        """Generate analytics summary.

        Args:
            period_days: Number of days to analyze

        Returns:
            Analytics summary
        """
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)

        # Get recent metrics
        recent_metrics = self.get_metrics(start_date=period_start, end_date=now)

        # Group by metric name
        by_name: dict[str, list[Metric]] = {}
        for metric in recent_metrics:
            if metric.name not in by_name:
                by_name[metric.name] = []
            by_name[metric.name].append(metric)

        # Calculate summary stats
        metrics_summary: dict[str, dict[str, Any]] = {}

        for name, metrics_list in by_name.items():
            values = [m.value for m in metrics_list]
            metrics_summary[name] = {
                "count": len(values),
                "current": values[-1] if values else 0,
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "avg": sum(values) / len(values) if values else 0,
            }

            # Add trend if available
            trend = self.calculate_trend(name, period_days)
            if trend:
                metrics_summary[name]["trend"] = {
                    "direction": trend.direction,
                    "change_percent": trend.change_percent,
                }

        summary: dict[str, Any] = {
            "period_days": period_days,
            "start_date": period_start.isoformat() + "Z",
            "end_date": now.isoformat() + "Z",
            "total_metrics": len(recent_metrics),
            "unique_metrics": len(by_name),
            "metrics": metrics_summary,
        }

        return summary

    def export_report(self, output_file: Path, period_days: int = 30) -> None:
        """Export analytics report to markdown.

        Args:
            output_file: Output file path
            period_days: Number of days to analyze
        """
        summary = self.generate_summary(period_days)

        report_lines = [
            "# Project Analytics Report",
            "",
            f"**Period**: {period_days} days",
            f"**Generated**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "",
            "---",
            "",
            "## Summary",
            "",
            f"- **Total Data Points**: {summary['total_metrics']}",
            f"- **Unique Metrics**: {summary['unique_metrics']}",
            f"- **Period**: {summary['start_date']} to {summary['end_date']}",
            "",
            "---",
            "",
            "## Metrics",
            "",
        ]

        for metric_name, stats in summary["metrics"].items():
            report_lines.extend(
                [
                    f"### {metric_name.replace('_', ' ').title()}",
                    "",
                    f"- **Current Value**: {stats['current']:.2f}",
                    f"- **Average**: {stats['avg']:.2f}",
                    f"- **Min**: {stats['min']:.2f}",
                    f"- **Max**: {stats['max']:.2f}",
                    f"- **Data Points**: {stats['count']}",
                    "",
                ],
            )

            if "trend" in stats:
                trend = stats["trend"]
                direction_emoji = {"up": "📈", "down": "📉", "stable": "➡️"}
                emoji = direction_emoji.get(trend["direction"], "")
                report_lines.extend(
                    [
                        f"**Trend**: {emoji} {trend['direction'].upper()} ({trend['change_percent']:+.1f}%)",
                        "",
                    ],
                )

        report_lines.extend(
            [
                "---",
                "",
                "## Interpretation",
                "",
                "- 📈 **Up**: Metric is increasing over time",
                "- 📉 **Down**: Metric is decreasing over time",
                "- ➡️ **Stable**: Metric has less than 5% change",
                "",
                "---",
                "",
                f"*Generated by NXTG-Forge Analytics on {datetime.utcnow().strftime('%Y-%m-%d')}*",
            ],
        )

        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text("\n".join(report_lines), encoding="utf-8")

        logger.info(f"Analytics report exported to {output_file}")


def record_test_coverage(project_root: Path, coverage_percent: float) -> None:
    """Record test coverage metric.

    Args:
        project_root: Project root directory
        coverage_percent: Coverage percentage
    """
    analytics = ProjectAnalytics(project_root)
    analytics.record_metric(
        name="test_coverage",
        value=coverage_percent,
        tags={"type": "quality"},
        metadata={"unit": "percent"},
    )


def record_quality_score(project_root: Path, score: float) -> None:
    """Record quality score metric.

    Args:
        project_root: Project root directory
        score: Quality score (0-100)
    """
    analytics = ProjectAnalytics(project_root)
    analytics.record_metric(
        name="quality_score",
        value=score,
        tags={"type": "quality"},
        metadata={"scale": "0-100"},
    )


def record_velocity(project_root: Path, features_completed: int) -> None:
    """Record development velocity.

    Args:
        project_root: Project root directory
        features_completed: Number of features completed
    """
    analytics = ProjectAnalytics(project_root)
    analytics.record_metric(
        name="velocity",
        value=float(features_completed),
        tags={"type": "productivity"},
        metadata={"unit": "features_per_period"},
    )

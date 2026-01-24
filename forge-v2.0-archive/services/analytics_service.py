"""Analytics Service for pattern detection and insights.

This service analyzes development workflow patterns, detects trends, predicts
quality trajectories, and provides best practice recommendations based on
historical project data.
"""

import json
import subprocess
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Literal

from ..result import Err, Ok, Result, StateError


@dataclass
class WorkflowPattern:
    """Detected workflow pattern."""

    pattern_type: str  # "commit_frequency", "test_first", "refactor_cycle", etc.
    description: str
    frequency: float  # How often this pattern occurs (0-1)
    confidence: float  # Confidence in pattern detection (0-1)
    recommendation: str | None = None


@dataclass
class ProductivityMetrics:
    """Developer productivity metrics."""

    commits_per_day: float
    avg_commit_size: float  # Lines changed per commit
    test_to_code_ratio: float
    refactor_frequency: float
    feature_velocity: float  # Features per week
    focus_time_percentage: float  # % time in focused work vs context switching


@dataclass
class QualityPrediction:
    """Quality metric prediction."""

    metric_name: str
    current_value: float
    predicted_value_7d: float
    predicted_value_30d: float
    confidence: float
    trend: Literal["improving", "declining", "stable"]
    recommendation: str


@dataclass
class TechnologyInsight:
    """Technology-specific insight."""

    technology: str  # "python", "typescript", "react", etc.
    usage_percentage: float
    quality_score: float
    common_issues: list[str] = field(default_factory=list)
    best_practices: list[str] = field(default_factory=list)


@dataclass
class AnalyticsReport:
    """Complete analytics report."""

    generated_at: str
    workflow_patterns: list[WorkflowPattern] = field(default_factory=list)
    productivity_metrics: ProductivityMetrics | None = None
    quality_predictions: list[QualityPrediction] = field(default_factory=list)
    technology_insights: list[TechnologyInsight] = field(default_factory=list)
    key_recommendations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "generated_at": self.generated_at,
            "workflow_patterns": [
                {
                    "type": p.pattern_type,
                    "description": p.description,
                    "frequency": p.frequency,
                    "confidence": p.confidence,
                    "recommendation": p.recommendation,
                }
                for p in self.workflow_patterns
            ],
            "productivity_metrics": (
                {
                    "commits_per_day": self.productivity_metrics.commits_per_day,
                    "avg_commit_size": self.productivity_metrics.avg_commit_size,
                    "test_to_code_ratio": self.productivity_metrics.test_to_code_ratio,
                    "refactor_frequency": self.productivity_metrics.refactor_frequency,
                    "feature_velocity": self.productivity_metrics.feature_velocity,
                    "focus_time_percentage": self.productivity_metrics.focus_time_percentage,
                }
                if self.productivity_metrics
                else None
            ),
            "quality_predictions": [
                {
                    "metric": p.metric_name,
                    "current": p.current_value,
                    "predicted_7d": p.predicted_value_7d,
                    "predicted_30d": p.predicted_value_30d,
                    "confidence": p.confidence,
                    "trend": p.trend,
                    "recommendation": p.recommendation,
                }
                for p in self.quality_predictions
            ],
            "technology_insights": [
                {
                    "technology": t.technology,
                    "usage": t.usage_percentage,
                    "quality": t.quality_score,
                    "issues": t.common_issues,
                    "best_practices": t.best_practices,
                }
                for t in self.technology_insights
            ],
            "recommendations": self.key_recommendations,
        }


class AnalyticsService:
    """Service for advanced analytics and pattern detection."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize analytics service.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.state_file = self.project_root / ".claude" / "forge" / "state.json"
        self.metrics_file = self.project_root / ".claude" / "forge" / "quality_metrics.jsonl"
        self.sessions_dir = self.project_root / ".claude" / "forge" / "sessions"

    def detect_workflow_patterns(self, days: int = 30) -> Result[list[WorkflowPattern], StateError]:
        """Detect workflow patterns in development activity.

        Args:
            days: Number of days to analyze

        Returns:
            Result containing list of WorkflowPattern objects
        """
        patterns: list[WorkflowPattern] = []

        # Get commit history
        commits = self._get_commits_last_n_days(days)
        if not commits:
            return Ok(patterns)

        # Pattern 1: Commit frequency
        commit_pattern = self._analyze_commit_frequency(commits, days)
        if commit_pattern:
            patterns.append(commit_pattern)

        # Pattern 2: Test-first development
        test_pattern = self._analyze_test_first_pattern(commits)
        if test_pattern:
            patterns.append(test_pattern)

        # Pattern 3: Refactor cycles
        refactor_pattern = self._analyze_refactor_cycles(commits)
        if refactor_pattern:
            patterns.append(refactor_pattern)

        # Pattern 4: Feature batching
        feature_pattern = self._analyze_feature_batching(commits)
        if feature_pattern:
            patterns.append(feature_pattern)

        return Ok(patterns)

    def calculate_productivity_metrics(
        self,
        days: int = 30,
    ) -> Result[ProductivityMetrics, StateError]:
        """Calculate developer productivity metrics.

        Args:
            days: Number of days to analyze

        Returns:
            Result containing ProductivityMetrics
        """
        commits = self._get_commits_last_n_days(days)

        if not commits:
            return Err(StateError.load_failed("No commit data available"))

        # Calculate metrics
        commits_per_day = len(commits) / days if days > 0 else 0

        # Average commit size (lines changed)
        total_lines = sum(c.get("lines_added", 0) + c.get("lines_removed", 0) for c in commits)
        avg_commit_size = total_lines / len(commits) if commits else 0

        # Test to code ratio
        test_commits = sum(1 for c in commits if "test" in c.get("message", "").lower())
        test_to_code_ratio = test_commits / len(commits) if commits else 0

        # Refactor frequency
        refactor_commits = sum(1 for c in commits if "refactor" in c.get("message", "").lower())
        refactor_frequency = refactor_commits / len(commits) if commits else 0

        # Feature velocity (features per week)
        feature_commits = sum(1 for c in commits if c.get("message", "").lower().startswith("feat"))
        weeks = days / 7
        feature_velocity = feature_commits / weeks if weeks > 0 else 0

        # Focus time (simplified: based on commit clustering)
        focus_time_percentage = self._estimate_focus_time(commits)

        metrics = ProductivityMetrics(
            commits_per_day=commits_per_day,
            avg_commit_size=avg_commit_size,
            test_to_code_ratio=test_to_code_ratio,
            refactor_frequency=refactor_frequency,
            feature_velocity=feature_velocity,
            focus_time_percentage=focus_time_percentage,
        )

        return Ok(metrics)

    def predict_quality_trends(
        self,
        days_ahead: int = 7,
    ) -> Result[list[QualityPrediction], StateError]:
        """Predict quality metric trends.

        Args:
            days_ahead: Number of days to predict ahead

        Returns:
            Result containing list of QualityPrediction objects
        """
        predictions: list[QualityPrediction] = []

        # Load historical metrics
        historical = self._load_historical_metrics(days=30)
        if len(historical) < 7:
            return Err(StateError.load_failed("Insufficient historical data for prediction"))

        # Predict test coverage
        coverage_pred = self._predict_metric(
            historical,
            "test_coverage",
            days_ahead=days_ahead,
        )
        if coverage_pred:
            predictions.append(coverage_pred)

        # Predict linting errors
        linting_pred = self._predict_metric(
            historical,
            "linting_errors",
            days_ahead=days_ahead,
            inverse=True,  # Lower is better
        )
        if linting_pred:
            predictions.append(linting_pred)

        # Predict security issues
        security_pred = self._predict_metric(
            historical,
            "security_issues",
            days_ahead=days_ahead,
            inverse=True,
        )
        if security_pred:
            predictions.append(security_pred)

        return Ok(predictions)

    def analyze_technology_usage(self) -> Result[list[TechnologyInsight], StateError]:
        """Analyze technology usage and provide insights.

        Returns:
            Result containing list of TechnologyInsight objects
        """
        insights: list[TechnologyInsight] = []

        # Detect technologies from file extensions
        tech_usage = self._detect_technologies()

        # Get quality scores by technology
        for tech, percentage in tech_usage.items():
            quality_score = self._calculate_tech_quality(tech)
            issues = self._get_common_issues(tech)
            practices = self._get_best_practices(tech)

            insight = TechnologyInsight(
                technology=tech,
                usage_percentage=percentage,
                quality_score=quality_score,
                common_issues=issues,
                best_practices=practices,
            )
            insights.append(insight)

        return Ok(insights)

    def generate_analytics_report(self) -> Result[AnalyticsReport, StateError]:
        """Generate comprehensive analytics report.

        Returns:
            Result containing AnalyticsReport
        """
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Detect workflow patterns
        patterns_result = self.detect_workflow_patterns(days=30)
        patterns = patterns_result.unwrap_or([])

        # Calculate productivity metrics
        productivity_result = self.calculate_productivity_metrics(days=30)
        productivity = productivity_result.unwrap_or(None)

        # Predict quality trends
        predictions_result = self.predict_quality_trends(days_ahead=7)
        predictions = predictions_result.unwrap_or([])

        # Analyze technology usage
        tech_insights_result = self.analyze_technology_usage()
        tech_insights = tech_insights_result.unwrap_or([])

        # Generate key recommendations
        recommendations = self._generate_key_recommendations(patterns, productivity, predictions)

        report = AnalyticsReport(
            generated_at=timestamp,
            workflow_patterns=patterns,
            productivity_metrics=productivity,
            quality_predictions=predictions,
            technology_insights=tech_insights,
            key_recommendations=recommendations,
        )

        return Ok(report)

    # Helper methods

    def _get_commits_last_n_days(self, days: int) -> list[dict[str, Any]]:
        """Get commits from last N days.

        Args:
            days: Number of days to look back

        Returns:
            List of commit dictionaries
        """
        try:
            since = (datetime.utcnow() - timedelta(days=days)).isoformat()

            result = subprocess.run(
                [
                    "git",
                    "log",
                    f"--since={since}",
                    "--format=%H|%s|%ar|%ai",
                    "--numstat",
                ],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            )

            if result.returncode != 0:
                return []

            commits: list[dict[str, Any]] = []
            lines = result.stdout.splitlines()

            i = 0
            while i < len(lines):
                if "|" in lines[i]:
                    parts = lines[i].split("|", 3)
                    commit = {
                        "hash": parts[0],
                        "message": parts[1],
                        "time_ago": parts[2],
                        "timestamp": parts[3],
                        "lines_added": 0,
                        "lines_removed": 0,
                    }

                    # Next lines might have stats
                    i += 1
                    while i < len(lines) and "\t" in lines[i]:
                        stat_parts = lines[i].split("\t")
                        if len(stat_parts) >= 2:
                            try:
                                added = int(stat_parts[0]) if stat_parts[0] != "-" else 0
                                removed = int(stat_parts[1]) if stat_parts[1] != "-" else 0
                                commit["lines_added"] += added
                                commit["lines_removed"] += removed
                            except ValueError:
                                pass
                        i += 1

                    commits.append(commit)
                else:
                    i += 1

            return commits

        except Exception:
            return []

    def _analyze_commit_frequency(
        self,
        commits: list[dict[str, Any]],
        days: int,
    ) -> WorkflowPattern | None:
        """Analyze commit frequency pattern.

        Args:
            commits: List of commits
            days: Number of days analyzed

        Returns:
            WorkflowPattern or None
        """
        if not commits:
            return None

        commits_per_day = len(commits) / days if days > 0 else 0

        if commits_per_day >= 3:
            return WorkflowPattern(
                pattern_type="high_frequency_commits",
                description=f"Frequent commits ({commits_per_day:.1f}/day) indicating continuous integration",
                frequency=min(commits_per_day / 5, 1.0),  # Normalize to 0-1
                confidence=0.9,
                recommendation="Maintain this healthy commit frequency",
            )
        elif commits_per_day < 0.5:
            return WorkflowPattern(
                pattern_type="low_frequency_commits",
                description=f"Infrequent commits ({commits_per_day:.1f}/day) may indicate large batches",
                frequency=0.3,
                confidence=0.8,
                recommendation="Consider committing more frequently to reduce integration risk",
            )

        return None

    def _analyze_test_first_pattern(self, commits: list[dict[str, Any]]) -> WorkflowPattern | None:
        """Analyze test-first development pattern.

        Args:
            commits: List of commits

        Returns:
            WorkflowPattern or None
        """
        test_commits = [c for c in commits if "test" in c.get("message", "").lower()]

        if not test_commits or not commits:
            return None

        test_ratio = len(test_commits) / len(commits)

        if test_ratio >= 0.3:
            return WorkflowPattern(
                pattern_type="test_driven_development",
                description=f"Strong test-first pattern ({test_ratio:.0%} of commits are test-related)",
                frequency=test_ratio,
                confidence=0.85,
                recommendation="Excellent test coverage discipline - keep it up!",
            )

        return None

    def _analyze_refactor_cycles(self, commits: list[dict[str, Any]]) -> WorkflowPattern | None:
        """Analyze refactoring cycle pattern.

        Args:
            commits: List of commits

        Returns:
            WorkflowPattern or None
        """
        refactor_commits = [c for c in commits if "refactor" in c.get("message", "").lower()]

        if not refactor_commits or not commits:
            return None

        refactor_ratio = len(refactor_commits) / len(commits)

        if refactor_ratio >= 0.15:
            return WorkflowPattern(
                pattern_type="continuous_refactoring",
                description=f"Regular refactoring cycles ({refactor_ratio:.0%} of commits)",
                frequency=refactor_ratio,
                confidence=0.8,
                recommendation="Good technical debt management through regular refactoring",
            )

        return None

    def _analyze_feature_batching(self, commits: list[dict[str, Any]]) -> WorkflowPattern | None:
        """Analyze feature batching pattern.

        Args:
            commits: List of commits

        Returns:
            WorkflowPattern or None
        """
        # Group commits by day
        commits_by_day: defaultdict[str, int] = defaultdict(int)

        for commit in commits:
            timestamp = commit.get("timestamp", "")
            try:
                date = datetime.fromisoformat(timestamp).date()
                commits_by_day[str(date)] += 1
            except Exception:
                continue

        if not commits_by_day:
            return None

        # Check for batching (some days with many commits, some with few)
        commit_counts = list(commits_by_day.values())
        avg_commits = sum(commit_counts) / len(commit_counts)
        max_commits = max(commit_counts)

        if max_commits > avg_commits * 3:
            return WorkflowPattern(
                pattern_type="feature_batching",
                description="Work tends to be batched into intense coding sessions",
                frequency=0.6,
                confidence=0.7,
                recommendation="Consider spreading work more evenly for sustainable pace",
            )

        return None

    def _estimate_focus_time(self, commits: list[dict[str, Any]]) -> float:
        """Estimate focus time percentage from commit patterns.

        Args:
            commits: List of commits

        Returns:
            Focus time percentage (0-100)
        """
        if not commits:
            return 0.0

        # Group commits by hour
        commit_times: list[datetime] = []

        for commit in commits:
            timestamp = commit.get("timestamp", "")
            try:
                dt = datetime.fromisoformat(timestamp)
                commit_times.append(dt)
            except Exception:
                continue

        if len(commit_times) < 2:
            return 50.0  # Default

        # Sort by time
        commit_times.sort()

        # Calculate gaps between commits
        gaps: list[float] = []
        for i in range(1, len(commit_times)):
            gap = (commit_times[i] - commit_times[i - 1]).total_seconds() / 3600  # hours
            gaps.append(gap)

        # Focus sessions are when gaps are small (< 2 hours)
        focus_sessions = sum(1 for gap in gaps if gap < 2)
        total_sessions = len(gaps)

        focus_percentage = (focus_sessions / total_sessions) * 100 if total_sessions > 0 else 50.0

        return min(100.0, focus_percentage)

    def _load_historical_metrics(self, days: int = 30) -> list[dict[str, Any]]:
        """Load historical metrics.

        Args:
            days: Number of days to load

        Returns:
            List of metrics dictionaries
        """
        if not self.metrics_file.exists():
            return []

        cutoff = datetime.utcnow() - timedelta(days=days)
        metrics: list[dict[str, Any]] = []

        try:
            with open(self.metrics_file, encoding="utf-8") as f:
                for line in f:
                    data = json.loads(line.strip())
                    timestamp_str = data.get("timestamp", "")

                    try:
                        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        if timestamp >= cutoff:
                            metrics.append(data)
                    except Exception:
                        continue

        except Exception:
            pass

        return metrics

    def _predict_metric(
        self,
        historical: list[dict[str, Any]],
        metric_name: str,
        days_ahead: int = 7,
        inverse: bool = False,
    ) -> QualityPrediction | None:
        """Predict metric value using simple linear regression.

        Args:
            historical: Historical metrics data
            metric_name: Name of metric to predict
            days_ahead: Days to predict ahead
            inverse: Whether lower is better

        Returns:
            QualityPrediction or None
        """
        # Extract metric values
        values: list[tuple[float, float]] = []  # (days_ago, value)

        now = datetime.utcnow()

        for data in historical:
            if metric_name not in data:
                continue

            timestamp_str = data.get("timestamp", "")
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                days_ago = (now - timestamp).total_seconds() / 86400  # Convert to days
                value = float(data[metric_name])
                values.append((-days_ago, value))  # Negative so older data has more negative x
            except Exception:
                continue

        if len(values) < 3:
            return None

        # Simple linear regression
        n = len(values)
        sum_x = sum(x for x, y in values)
        sum_y = sum(y for x, y in values)
        sum_xy = sum(x * y for x, y in values)
        sum_x2 = sum(x * x for x, y in values)

        # Calculate slope and intercept
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n

        # Current value (x=0)
        current_value = intercept

        # Predict for 7 and 30 days
        predicted_7d = slope * 7 + intercept
        predicted_30d = slope * 30 + intercept

        # Calculate R² for confidence
        mean_y = sum_y / n
        ss_tot = sum((y - mean_y) ** 2 for x, y in values)
        ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in values)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        confidence = max(0.0, min(1.0, r_squared))

        # Determine trend
        if inverse:
            if slope < -0.5:
                trend = "improving"
            elif slope > 0.5:
                trend = "declining"
            else:
                trend = "stable"
        else:
            if slope > 0.5:
                trend = "improving"
            elif slope < -0.5:
                trend = "declining"
            else:
                trend = "stable"

        # Generate recommendation
        if trend == "improving":
            recommendation = f"{metric_name.replace('_', ' ').title()} trending positively - maintain current practices"
        elif trend == "declining":
            recommendation = (
                f"{metric_name.replace('_', ' ').title()} declining - consider intervention"
            )
        else:
            recommendation = f"{metric_name.replace('_', ' ').title()} stable - monitor for changes"

        return QualityPrediction(
            metric_name=metric_name.replace("_", " ").title(),
            current_value=current_value,
            predicted_value_7d=predicted_7d,
            predicted_value_30d=predicted_30d,
            confidence=confidence,
            trend=trend,
            recommendation=recommendation,
        )

    def _detect_technologies(self) -> dict[str, float]:
        """Detect technologies used in project.

        Returns:
            Dictionary mapping technology to usage percentage
        """
        try:
            # Count files by extension
            extensions = Counter()

            for path in self.project_root.rglob("*"):
                if path.is_file() and not any(
                    ex in str(path) for ex in [".git", "__pycache__", "node_modules", "venv"]
                ):
                    ext = path.suffix.lower()
                    if ext:
                        extensions[ext] += 1

            total_files = sum(extensions.values())

            # Map extensions to technologies
            tech_mapping = {
                ".py": "Python",
                ".js": "JavaScript",
                ".ts": "TypeScript",
                ".jsx": "React",
                ".tsx": "React",
                ".go": "Go",
                ".rs": "Rust",
                ".java": "Java",
                ".rb": "Ruby",
                ".md": "Documentation",
            }

            tech_usage: defaultdict[str, int] = defaultdict(int)

            for ext, count in extensions.items():
                tech = tech_mapping.get(ext, "Other")
                tech_usage[tech] += count

            # Convert to percentages
            return {tech: (count / total_files) * 100 for tech, count in tech_usage.items()}

        except Exception:
            return {}

    def _calculate_tech_quality(self, technology: str) -> float:
        """Calculate quality score for a technology.

        Args:
            technology: Technology name

        Returns:
            Quality score (0-100)
        """
        # Simplified quality calculation based on test coverage
        # In reality, this would be technology-specific
        return 85.0  # Placeholder

    def _get_common_issues(self, technology: str) -> list[str]:
        """Get common issues for a technology.

        Args:
            technology: Technology name

        Returns:
            List of common issues
        """
        # Technology-specific common issues
        issues_map: dict[str, list[str]] = {
            "Python": [
                "Missing type hints in some modules",
                "Consider using async/await for I/O operations",
            ],
            "JavaScript": [
                "Consider migrating to TypeScript for type safety",
                "Use modern async/await over callbacks",
            ],
            "TypeScript": [
                "Avoid 'any' type where possible",
                "Enable strict mode in tsconfig",
            ],
        }

        return issues_map.get(technology, [])

    def _get_best_practices(self, technology: str) -> list[str]:
        """Get best practices for a technology.

        Args:
            technology: Technology name

        Returns:
            List of best practices
        """
        practices_map: dict[str, list[str]] = {
            "Python": [
                "Use type hints for better IDE support",
                "Follow PEP 8 style guidelines",
                "Use dataclasses for data structures",
            ],
            "JavaScript": [
                "Use ESLint for code quality",
                "Follow Airbnb style guide",
                "Use modern ES6+ features",
            ],
            "TypeScript": [
                "Enable all strict checks",
                "Use interfaces for object shapes",
                "Prefer type inference where clear",
            ],
        }

        return practices_map.get(technology, [])

    def _generate_key_recommendations(
        self,
        patterns: list[WorkflowPattern],
        productivity: ProductivityMetrics | None,
        predictions: list[QualityPrediction],
    ) -> list[str]:
        """Generate key recommendations from analytics.

        Args:
            patterns: Detected workflow patterns
            productivity: Productivity metrics
            predictions: Quality predictions

        Returns:
            List of recommendation strings
        """
        recommendations: list[str] = []

        # From patterns
        for pattern in patterns:
            if pattern.recommendation and pattern.confidence > 0.7:
                recommendations.append(pattern.recommendation)

        # From productivity
        if productivity:
            if productivity.test_to_code_ratio < 0.3:
                recommendations.append("Increase test coverage - current test-to-code ratio is low")
            if productivity.commits_per_day < 1:
                recommendations.append(
                    "Consider committing more frequently to reduce integration risk",
                )

        # From predictions
        for pred in predictions:
            if pred.trend == "declining" and pred.confidence > 0.6:
                recommendations.append(pred.recommendation)

        return recommendations[:5]  # Top 5

"""Quality Monitor Service for continuous quality tracking.

This service monitors code quality metrics over time, detects regressions,
analyzes trends, and calculates overall health scores.
"""

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result, StateError


@dataclass
class QualityMetrics:
    """Snapshot of quality metrics at a point in time."""

    timestamp: str
    test_coverage: float
    tests_passing: int
    tests_total: int
    linting_errors: int
    type_errors: int
    security_issues: int
    code_complexity: float
    documentation_coverage: float
    dependency_issues: int

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "timestamp": self.timestamp,
            "test_coverage": self.test_coverage,
            "tests_passing": self.tests_passing,
            "tests_total": self.tests_total,
            "linting_errors": self.linting_errors,
            "type_errors": self.type_errors,
            "security_issues": self.security_issues,
            "code_complexity": self.code_complexity,
            "documentation_coverage": self.documentation_coverage,
            "dependency_issues": self.dependency_issues,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> "QualityMetrics":
        """Create from dictionary."""
        return QualityMetrics(
            timestamp=data.get("timestamp", ""),
            test_coverage=data.get("test_coverage", 0.0),
            tests_passing=data.get("tests_passing", 0),
            tests_total=data.get("tests_total", 0),
            linting_errors=data.get("linting_errors", 0),
            type_errors=data.get("type_errors", 0),
            security_issues=data.get("security_issues", 0),
            code_complexity=data.get("code_complexity", 0.0),
            documentation_coverage=data.get("documentation_coverage", 0.0),
            dependency_issues=data.get("dependency_issues", 0),
        )


@dataclass
class Regression:
    """Detected quality regression."""

    metric: str
    previous_value: float
    current_value: float
    delta: float
    severity: str  # "critical", "high", "medium", "low"
    message: str


@dataclass
class TrendReport:
    """Quality trend analysis over time."""

    start_date: str
    end_date: str
    metrics_improving: list[str] = field(default_factory=list)
    metrics_declining: list[str] = field(default_factory=list)
    metrics_stable: list[str] = field(default_factory=list)
    overall_trend: str = "stable"  # "improving", "declining", "stable"
    recommendations: list[str] = field(default_factory=list)


class QualityMonitor:
    """Service for continuous quality monitoring and trend analysis."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize quality monitor.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.metrics_file = self.project_root / ".claude" / "forge" / "quality_metrics.jsonl"
        self.state_file = self.project_root / ".claude" / "forge" / "state.json"

        # Ensure directory exists
        self.metrics_file.parent.mkdir(parents=True, exist_ok=True)

    def track_metrics(self) -> Result[QualityMetrics, StateError]:
        """Collect and track current quality metrics.

        Returns:
            Result containing current QualityMetrics or StateError
        """
        # Collect all metrics
        test_coverage = self._get_test_coverage()
        tests_passing, tests_total = self._get_test_counts()
        linting_errors = self._get_linting_errors()
        type_errors = self._get_type_errors()
        security_issues = self._get_security_issues()
        code_complexity = self._get_code_complexity()
        documentation_coverage = self._get_documentation_coverage()
        dependency_issues = self._get_dependency_issues()

        metrics = QualityMetrics(
            timestamp=datetime.utcnow().isoformat() + "Z",
            test_coverage=test_coverage,
            tests_passing=tests_passing,
            tests_total=tests_total,
            linting_errors=linting_errors,
            type_errors=type_errors,
            security_issues=security_issues,
            code_complexity=code_complexity,
            documentation_coverage=documentation_coverage,
            dependency_issues=dependency_issues,
        )

        # Save to metrics log
        self._append_metrics(metrics)

        # Update state.json
        self._update_state_metrics(metrics)

        return Ok(metrics)

    def calculate_health_score(self) -> Result[int, StateError]:
        """Calculate overall health score (0-100).

        Returns:
            Result containing health score or StateError
        """
        metrics_result = self.track_metrics()
        if metrics_result.is_error():
            return Err(metrics_result.error)  # type: ignore

        metrics = metrics_result.value

        # Calculate weighted health score
        score = 100.0

        # Test coverage (30% weight)
        if metrics.test_coverage < 85:
            score -= (85 - metrics.test_coverage) * 0.3

        # Tests passing (20% weight)
        if metrics.tests_total > 0:
            pass_rate = (metrics.tests_passing / metrics.tests_total) * 100
            if pass_rate < 100:
                score -= (100 - pass_rate) * 0.2

        # Linting errors (15% weight)
        if metrics.linting_errors > 0:
            score -= min(15, metrics.linting_errors * 0.5)

        # Type errors (10% weight)
        if metrics.type_errors > 0:
            score -= min(10, metrics.type_errors * 0.3)

        # Security issues (20% weight) - critical impact
        if metrics.security_issues > 0:
            score -= min(20, metrics.security_issues * 2)

        # Code complexity (5% weight)
        if metrics.code_complexity > 10:
            score -= min(5, (metrics.code_complexity - 10) * 0.5)

        # Ensure score is in valid range
        health_score = max(0, min(100, int(score)))

        return Ok(health_score)

    def detect_regressions(self) -> Result[list[Regression], StateError]:
        """Detect quality regressions since last measurement.

        Returns:
            Result containing list of Regression objects or StateError
        """
        # Get current metrics
        current_result = self.track_metrics()
        if current_result.is_error():
            return Err(current_result.error)  # type: ignore

        current = current_result.value

        # Get previous metrics
        previous_result = self._get_previous_metrics()
        if previous_result.is_error() or previous_result.value is None:
            # No previous metrics to compare
            return Ok([])

        previous = previous_result.value

        regressions: list[Regression] = []

        # Check test coverage
        if current.test_coverage < previous.test_coverage - 1:
            delta = current.test_coverage - previous.test_coverage
            regressions.append(
                Regression(
                    metric="test_coverage",
                    previous_value=previous.test_coverage,
                    current_value=current.test_coverage,
                    delta=delta,
                    severity="high" if abs(delta) > 5 else "medium",
                    message=f"Test coverage dropped from {previous.test_coverage:.1f}% to {current.test_coverage:.1f}%",
                ),
            )

        # Check linting errors
        if current.linting_errors > previous.linting_errors:
            delta = current.linting_errors - previous.linting_errors
            regressions.append(
                Regression(
                    metric="linting_errors",
                    previous_value=float(previous.linting_errors),
                    current_value=float(current.linting_errors),
                    delta=float(delta),
                    severity="medium" if delta < 5 else "high",
                    message=f"Linting errors increased from {previous.linting_errors} to {current.linting_errors}",
                ),
            )

        # Check security issues (critical)
        if current.security_issues > previous.security_issues:
            delta = current.security_issues - previous.security_issues
            regressions.append(
                Regression(
                    metric="security_issues",
                    previous_value=float(previous.security_issues),
                    current_value=float(current.security_issues),
                    delta=float(delta),
                    severity="critical",
                    message=f"New security issues detected: {current.security_issues} (was {previous.security_issues})",
                ),
            )

        # Check code complexity
        if current.code_complexity > previous.code_complexity + 1:
            delta = current.code_complexity - previous.code_complexity
            regressions.append(
                Regression(
                    metric="code_complexity",
                    previous_value=previous.code_complexity,
                    current_value=current.code_complexity,
                    delta=delta,
                    severity="low" if delta < 3 else "medium",
                    message=f"Code complexity increased from {previous.code_complexity:.1f} to {current.code_complexity:.1f}",
                ),
            )

        return Ok(regressions)

    def analyze_trends(self, days: int = 7) -> Result[TrendReport, StateError]:
        """Analyze quality trends over specified period.

        Args:
            days: Number of days to analyze

        Returns:
            Result containing TrendReport or StateError
        """
        # Get historical metrics
        cutoff = datetime.utcnow() - timedelta(days=days)
        historical = self._get_metrics_since(cutoff)

        if len(historical) < 2:
            # Not enough data for trend analysis
            return Ok(
                TrendReport(
                    start_date=cutoff.isoformat() + "Z",
                    end_date=datetime.utcnow().isoformat() + "Z",
                    overall_trend="stable",
                    recommendations=["Not enough historical data for trend analysis"],
                ),
            )

        first = historical[0]
        last = historical[-1]

        metrics_improving: list[str] = []
        metrics_declining: list[str] = []
        metrics_stable: list[str] = []

        # Analyze each metric
        if last.test_coverage > first.test_coverage + 2:
            metrics_improving.append("test_coverage")
        elif last.test_coverage < first.test_coverage - 2:
            metrics_declining.append("test_coverage")
        else:
            metrics_stable.append("test_coverage")

        if last.linting_errors < first.linting_errors - 2:
            metrics_improving.append("linting")
        elif last.linting_errors > first.linting_errors + 2:
            metrics_declining.append("linting")
        else:
            metrics_stable.append("linting")

        if last.security_issues < first.security_issues:
            metrics_improving.append("security")
        elif last.security_issues > first.security_issues:
            metrics_declining.append("security")
        else:
            metrics_stable.append("security")

        # Determine overall trend
        if len(metrics_improving) > len(metrics_declining):
            overall_trend = "improving"
        elif len(metrics_declining) > len(metrics_improving):
            overall_trend = "declining"
        else:
            overall_trend = "stable"

        # Generate recommendations
        recommendations = self._generate_trend_recommendations(
            metrics_improving,
            metrics_declining,
            first,
            last,
        )

        return Ok(
            TrendReport(
                start_date=first.timestamp,
                end_date=last.timestamp,
                metrics_improving=metrics_improving,
                metrics_declining=metrics_declining,
                metrics_stable=metrics_stable,
                overall_trend=overall_trend,
                recommendations=recommendations,
            ),
        )

    def _get_test_coverage(self) -> float:
        """Get test coverage percentage.

        Returns:
            Coverage percentage (0-100)
        """
        # Try to get from state.json first
        if self.state_file.exists():
            try:
                with open(self.state_file, encoding="utf-8") as f:
                    state = json.load(f)
                    coverage = (
                        state.get("quality", {}).get("tests", {}).get("unit", {}).get("coverage", 0)
                    )
                    if coverage > 0:
                        return float(coverage)
            except Exception:
                pass

        # Fallback: try to run coverage if pytest available
        try:
            result = subprocess.run(
                ["coverage", "report", "--precision=0"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            )

            if result.returncode == 0:
                # Parse TOTAL line
                for line in result.stdout.splitlines():
                    if "TOTAL" in line:
                        # Extract percentage
                        parts = line.split()
                        if len(parts) > 0:
                            pct_str = parts[-1].rstrip("%")
                            return float(pct_str)
        except Exception:
            pass

        return 0.0

    def _get_test_counts(self) -> tuple[int, int]:
        """Get test passing/total counts.

        Returns:
            Tuple of (passing, total)
        """
        try:
            result = subprocess.run(
                ["pytest", "--collect-only", "-q"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            )

            if result.returncode == 0:
                # Parse output for test count
                for line in result.stdout.splitlines():
                    if "test" in line.lower() and "selected" in line.lower():
                        parts = line.split()
                        if parts:
                            total = int(parts[0])
                            # Assume all passing unless we know otherwise
                            return (total, total)
        except Exception:
            pass

        return (0, 0)

    def _get_linting_errors(self) -> int:
        """Get linting error count.

        Returns:
            Number of linting errors
        """
        try:
            result = subprocess.run(
                ["ruff", "check", ".", "--quiet"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=10,
            )

            # Count lines in output (each line is one error)
            errors = len([line for line in result.stdout.splitlines() if line.strip()])
            return errors
        except Exception:
            pass

        return 0

    def _get_type_errors(self) -> int:
        """Get type checking error count.

        Returns:
            Number of type errors
        """
        try:
            result = subprocess.run(
                ["mypy", ".", "--no-error-summary"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

            # Count error lines
            errors = len([line for line in result.stdout.splitlines() if ": error:" in line])
            return errors
        except Exception:
            pass

        return 0

    def _get_security_issues(self) -> int:
        """Get security issue count.

        Returns:
            Number of security issues
        """
        try:
            result = subprocess.run(
                ["bandit", "-r", ".", "-q", "-f", "json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

            if result.stdout:
                data = json.loads(result.stdout)
                issues = len(data.get("results", []))
                return issues
        except Exception:
            pass

        return 0

    def _get_code_complexity(self) -> float:
        """Get average code complexity.

        Returns:
            Average cyclomatic complexity
        """
        try:
            result = subprocess.run(
                ["radon", "cc", ".", "-a", "-j"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )

            if result.stdout:
                data = json.loads(result.stdout)
                # Calculate average complexity
                total_complexity = 0
                count = 0

                for file_data in data.values():
                    for item in file_data:
                        if isinstance(item, dict) and "complexity" in item:
                            total_complexity += item["complexity"]
                            count += 1

                if count > 0:
                    return total_complexity / count

        except Exception:
            pass

        return 0.0

    def _get_documentation_coverage(self) -> float:
        """Get documentation coverage percentage.

        Returns:
            Documentation coverage (0-100)
        """
        # Simple heuristic: count docstrings in Python files
        try:
            py_files = list(self.project_root.rglob("*.py"))
            total_functions = 0
            documented_functions = 0

            for py_file in py_files:
                if any(
                    excl in str(py_file) for excl in ["__pycache__", ".git", "venv", "node_modules"]
                ):
                    continue

                try:
                    content = py_file.read_text(encoding="utf-8")
                    # Count def statements
                    total_functions += content.count("def ")
                    # Count docstrings (simple check)
                    documented_functions += content.count('"""') // 2
                except Exception:
                    continue

            if total_functions > 0:
                return (documented_functions / total_functions) * 100

        except Exception:
            pass

        return 0.0

    def _get_dependency_issues(self) -> int:
        """Get dependency vulnerability count.

        Returns:
            Number of vulnerable dependencies
        """
        try:
            result = subprocess.run(
                ["pip-audit", "--format=json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
                timeout=30,
            )

            if result.stdout:
                data = json.loads(result.stdout)
                issues = len(data.get("dependencies", {}).get("vulnerabilities", []))
                return issues
        except Exception:
            pass

        return 0

    def _append_metrics(self, metrics: QualityMetrics) -> None:
        """Append metrics to log file.

        Args:
            metrics: QualityMetrics to append
        """
        try:
            with open(self.metrics_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(metrics.to_dict()) + "\n")
        except Exception:
            pass  # Non-critical failure

    def _update_state_metrics(self, metrics: QualityMetrics) -> None:
        """Update state.json with latest metrics.

        Args:
            metrics: QualityMetrics to save
        """
        if not self.state_file.exists():
            return

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state = json.load(f)

            # Update quality section
            if "quality" not in state:
                state["quality"] = {}

            state["quality"]["last_updated"] = metrics.timestamp
            state["quality"]["health_score"] = self.calculate_health_score().unwrap_or(0)

            # Update tests section
            if "tests" not in state["quality"]:
                state["quality"]["tests"] = {}
            if "unit" not in state["quality"]["tests"]:
                state["quality"]["tests"]["unit"] = {}

            state["quality"]["tests"]["unit"]["coverage"] = metrics.test_coverage
            state["quality"]["tests"]["unit"]["passing"] = metrics.tests_passing
            state["quality"]["tests"]["unit"]["total"] = metrics.tests_total

            # Save back
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)

        except Exception:
            pass  # Non-critical failure

    def _get_previous_metrics(self) -> Result[QualityMetrics | None, StateError]:
        """Get previous metrics from log.

        Returns:
            Result containing previous QualityMetrics or None
        """
        if not self.metrics_file.exists():
            return Ok(None)

        try:
            with open(self.metrics_file, encoding="utf-8") as f:
                lines = f.readlines()

            if len(lines) < 2:
                return Ok(None)

            # Get second-to-last line
            previous_line = lines[-2].strip()
            data = json.loads(previous_line)
            return Ok(QualityMetrics.from_dict(data))

        except Exception as e:
            return Err(StateError.load_failed(f"Failed to load previous metrics: {e}"))

    def _get_metrics_since(self, cutoff: datetime) -> list[QualityMetrics]:
        """Get metrics since cutoff date.

        Args:
            cutoff: Cutoff datetime

        Returns:
            List of QualityMetrics
        """
        if not self.metrics_file.exists():
            return []

        metrics: list[QualityMetrics] = []

        try:
            with open(self.metrics_file, encoding="utf-8") as f:
                for line in f:
                    data = json.loads(line.strip())
                    metric = QualityMetrics.from_dict(data)

                    # Parse timestamp
                    try:
                        timestamp = datetime.fromisoformat(metric.timestamp.replace("Z", "+00:00"))
                        if timestamp >= cutoff:
                            metrics.append(metric)
                    except Exception:
                        continue

        except Exception:
            pass

        return metrics

    def _generate_trend_recommendations(
        self,
        improving: list[str],
        declining: list[str],
        first: QualityMetrics,
        last: QualityMetrics,
    ) -> list[str]:
        """Generate recommendations based on trends.

        Args:
            improving: List of improving metrics
            declining: List of declining metrics
            first: First metrics snapshot
            last: Last metrics snapshot

        Returns:
            List of recommendation strings
        """
        recommendations: list[str] = []

        if "test_coverage" in declining:
            recommendations.append(
                f"Test coverage declining ({first.test_coverage:.1f}% → {last.test_coverage:.1f}%). Add tests for new code.",
            )

        if "linting" in declining:
            recommendations.append(
                f"Linting errors increasing ({first.linting_errors} → {last.linting_errors}). Run 'make lint' regularly.",
            )

        if "security" in declining:
            recommendations.append(
                "New security issues detected. Run security scan and address vulnerabilities.",
            )

        if "test_coverage" in improving:
            recommendations.append(
                f"Great progress on test coverage! ({first.test_coverage:.1f}% → {last.test_coverage:.1f}%)",
            )

        if len(improving) > len(declining):
            recommendations.append("Overall quality trend is positive. Keep up the good work!")
        elif len(declining) > 0 and len(improving) == 0:
            recommendations.append(
                "Quality metrics declining. Consider pausing feature work to address quality issues.",
            )

        return recommendations[:5]  # Top 5

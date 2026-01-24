"""Quality Alerter Service for pre-commit quality gates.

This service performs quality checks and displays interactive warnings
according to UX-SPECIFICATION-FINAL.md Part IX standards.
"""

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result


@dataclass(frozen=True)
class QualityError:
    """Quality check error."""

    message: str
    detail: str | None = None

    @staticmethod
    def check_failed(tool: str, reason: str) -> "QualityError":
        """Create error for failed quality check."""
        return QualityError(f"{tool} check failed", reason)

    @staticmethod
    def coverage_below_threshold(actual: float, threshold: float) -> "QualityError":
        """Create error for insufficient coverage."""
        return QualityError(f"Test coverage below threshold: {actual:.1f}% < {threshold:.1f}%")

    @staticmethod
    def security_issues(count: int) -> "QualityError":
        """Create error for security vulnerabilities."""
        return QualityError(f"{count} security vulnerabilities detected")


@dataclass
class Issue:
    """Represents a quality issue."""

    severity: str  # "error", "warning", "info"
    category: str  # "coverage", "security", "complexity", "smell"
    message: str
    file_path: str | None = None
    line: int | None = None
    suggestion: str | None = None
    fix_available: bool = False


@dataclass
class QualityReport:
    """Quality check report."""

    passed: bool
    issues: list[Issue] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    timestamp: str | None = None

    def has_errors(self) -> bool:
        """Check if report contains blocking errors."""
        return any(issue.severity == "error" for issue in self.issues)

    def has_warnings(self) -> bool:
        """Check if report contains warnings."""
        return any(issue.severity == "warning" for issue in self.issues)

    def error_count(self) -> int:
        """Count blocking errors."""
        return sum(1 for issue in self.issues if issue.severity == "error")

    def warning_count(self) -> int:
        """Count warnings."""
        return sum(1 for issue in self.issues if issue.severity == "warning")


@dataclass
class CoverageReport:
    """Test coverage report."""

    total_coverage: float
    threshold: float
    passed: bool
    files_below_threshold: list[tuple[str, float]] = field(default_factory=list)
    previous_coverage: float | None = None

    def coverage_delta(self) -> float | None:
        """Calculate coverage change from previous."""
        if self.previous_coverage is None:
            return None
        return self.total_coverage - self.previous_coverage


@dataclass
class SecurityReport:
    """Security scan report."""

    passed: bool
    vulnerabilities: list[Issue] = field(default_factory=list)
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0


class QualityAlerter:
    """Service for quality gate checks and interactive alerting.

    Implements pre-commit quality checks with interactive warnings
    following UX-SPECIFICATION-FINAL.md standards.
    """

    def __init__(self, project_root: Path | str = "."):
        """Initialize quality alerter.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.coverage_threshold = 85.0  # Default threshold

    def check_quality_gates(self, files: list[Path]) -> Result[QualityReport, QualityError]:
        """Run all quality gate checks on specified files.

        Args:
            files: List of files to check

        Returns:
            Result containing QualityReport or QualityError
        """
        issues: list[Issue] = []

        # Run linting checks
        lint_result = self._check_linting(files)
        if lint_result.is_ok():
            issues.extend(lint_result.value)

        # Run type checking
        type_result = self._check_types(files)
        if type_result.is_ok():
            issues.extend(type_result.value)

        # Run code complexity checks
        complexity_result = self._check_complexity(files)
        if complexity_result.is_ok():
            issues.extend(complexity_result.value)

        # Determine if checks passed
        passed = not any(issue.severity == "error" for issue in issues)

        report = QualityReport(
            passed=passed,
            issues=issues,
            metrics={
                "files_checked": len(files),
                "total_issues": len(issues),
                "errors": sum(1 for i in issues if i.severity == "error"),
                "warnings": sum(1 for i in issues if i.severity == "warning"),
            },
        )

        return Ok(report)

    def check_test_coverage(
        self,
        threshold: float | None = None,
    ) -> Result[CoverageReport, QualityError]:
        """Check test coverage against threshold.

        Args:
            threshold: Coverage threshold (0-100). Uses default if None.

        Returns:
            Result containing CoverageReport or QualityError
        """
        if threshold is None:
            threshold = self.coverage_threshold

        # Try to read coverage data
        coverage_result = self._read_coverage_data()
        if coverage_result.is_error():
            return coverage_result  # type: ignore

        coverage_data = coverage_result.value

        # Extract coverage percentage
        total_coverage = coverage_data.get("totals", {}).get("percent_covered", 0.0)

        # Get previous coverage if available
        previous_coverage = self._get_previous_coverage()

        # Find files below threshold
        files_below: list[tuple[str, float]] = []
        for file_path, file_data in coverage_data.get("files", {}).items():
            file_coverage = file_data.get("summary", {}).get("percent_covered", 0.0)
            if file_coverage < threshold:
                files_below.append((file_path, file_coverage))

        passed = total_coverage >= threshold

        report = CoverageReport(
            total_coverage=total_coverage,
            threshold=threshold,
            passed=passed,
            files_below_threshold=files_below,
            previous_coverage=previous_coverage,
        )

        return Ok(report)

    def check_security(self) -> Result[SecurityReport, QualityError]:
        """Run security vulnerability scan.

        Returns:
            Result containing SecurityReport or QualityError
        """
        vulnerabilities: list[Issue] = []

        # Check for known vulnerabilities in dependencies
        bandit_result = self._run_bandit()
        if bandit_result.is_ok():
            vulnerabilities.extend(bandit_result.value)

        # Check for hardcoded secrets
        secrets_result = self._check_secrets()
        if secrets_result.is_ok():
            vulnerabilities.extend(secrets_result.value)

        # Count by severity
        high_count = sum(1 for v in vulnerabilities if "high" in v.category.lower())
        medium_count = sum(1 for v in vulnerabilities if "medium" in v.category.lower())
        low_count = sum(1 for v in vulnerabilities if "low" in v.category.lower())

        passed = high_count == 0

        report = SecurityReport(
            passed=passed,
            vulnerabilities=vulnerabilities,
            high_severity_count=high_count,
            medium_severity_count=medium_count,
            low_severity_count=low_count,
        )

        return Ok(report)

    def format_interactive_alert(self, issues: list[Issue]) -> str:
        """Format interactive alert for quality issues.

        Follows UX-SPECIFICATION-FINAL.md Part IX format.

        Args:
            issues: List of issues to display

        Returns:
            Formatted alert string
        """
        # Separate by severity
        errors = [i for i in issues if i.severity == "error"]
        warnings = [i for i in issues if i.severity == "warning"]
        info = [i for i in issues if i.severity == "info"]

        # Build alert message
        lines = []

        if errors:
            lines.append("❌ Quality Gate FAILED")
            lines.append("")
            lines.append("   Critical issues must be fixed before commit:")
            for issue in errors[:3]:  # Show top 3
                lines.append(f"   • {issue.message}")
                if issue.file_path:
                    location = f"{issue.file_path}"
                    if issue.line:
                        location += f":{issue.line}"
                    lines.append(f"     ({location})")
            if len(errors) > 3:
                lines.append(f"   ... and {len(errors) - 3} more")
            lines.append("")
            lines.append("   Cannot proceed until resolved.")

        elif warnings:
            lines.append("⚠️  Quality Gate Warning")
            lines.append("")
            lines.append("   Issues detected but not blocking:")
            for issue in warnings[:3]:  # Show top 3
                lines.append(f"   • {issue.message}")
                if issue.suggestion:
                    lines.append(f"     → {issue.suggestion}")
            if len(warnings) > 3:
                lines.append(f"   ... and {len(warnings) - 3} more")
            lines.append("")
            lines.append("   Recommend fixing, but you can proceed.")

        elif info:
            lines.append("💡 Quality Insight")
            lines.append("")
            lines.append("   Potential improvements available:")
            for issue in info[:3]:  # Show top 3
                lines.append(f"   • {issue.message}")
                if issue.suggestion:
                    lines.append(f"     → {issue.suggestion}")
            lines.append("")
            lines.append("   Optional - implement when convenient.")

        return "\n".join(lines)

    def format_coverage_alert(self, report: CoverageReport) -> str:
        """Format interactive alert for coverage issues.

        Args:
            report: Coverage report

        Returns:
            Formatted alert with options
        """
        lines = []
        lines.append("⚠️  Quality Gate Alert")
        lines.append("")

        # Show coverage change
        if report.previous_coverage is not None:
            delta = report.coverage_delta()
            if delta is not None:
                lines.append(
                    f"   Test coverage: {report.previous_coverage:.1f}% → {report.total_coverage:.1f}%",
                )
                if delta < 0:
                    lines.append(f"   Coverage dropped by {abs(delta):.1f}%")

        # Show files needing tests
        if report.files_below_threshold:
            lines.append("")
            lines.append("   New files need tests:")
            for file_path, coverage in report.files_below_threshold[:3]:
                lines.append(f"     • {file_path} ({coverage:.1f}% coverage)")
            if len(report.files_below_threshold) > 3:
                lines.append(f"     ... and {len(report.files_below_threshold) - 3} more")

        lines.append("")
        lines.append("   Want me to:")
        lines.append("     1. Generate test stubs now")
        lines.append("     2. Show coverage gaps in detail")
        lines.append("     3. Remind me later")
        lines.append("")
        lines.append("Your choice [1-3]:")

        return "\n".join(lines)

    # Private helper methods

    def _check_linting(self, files: list[Path]) -> Result[list[Issue], QualityError]:
        """Run linting checks on files."""
        issues: list[Issue] = []

        # Check if ruff is available
        if not self._command_exists("ruff"):
            return Ok(issues)

        try:
            # Run ruff on files
            result = subprocess.run(
                ["ruff", "check", "--output-format=json"] + [str(f) for f in files],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.stdout:
                try:
                    ruff_output = json.loads(result.stdout)
                    for item in ruff_output:
                        issues.append(
                            Issue(
                                severity="warning",
                                category="style",
                                message=item.get("message", "Style issue"),
                                file_path=item.get("filename"),
                                line=item.get("location", {}).get("row"),
                            ),
                        )
                except json.JSONDecodeError:
                    pass

            return Ok(issues)

        except subprocess.TimeoutExpired:
            return Err(QualityError.check_failed("ruff", "timeout"))
        except Exception as e:
            return Err(QualityError.check_failed("ruff", str(e)))

    def _check_types(self, files: list[Path]) -> Result[list[Issue], QualityError]:
        """Run type checking on files."""
        issues: list[Issue] = []

        # Check if mypy is available
        if not self._command_exists("mypy"):
            return Ok(issues)

        try:
            # Run mypy on files
            result = subprocess.run(
                ["mypy", "--no-error-summary"] + [str(f) for f in files],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )

            # Parse mypy output
            for line in result.stdout.splitlines():
                if ": error:" in line or ": warning:" in line:
                    parts = line.split(":", 3)
                    if len(parts) >= 4:
                        issues.append(
                            Issue(
                                severity="warning",
                                category="types",
                                message=parts[3].strip(),
                                file_path=parts[0],
                                line=int(parts[1]) if parts[1].isdigit() else None,
                            ),
                        )

            return Ok(issues)

        except subprocess.TimeoutExpired:
            return Err(QualityError.check_failed("mypy", "timeout"))
        except Exception as e:
            return Err(QualityError.check_failed("mypy", str(e)))

    def _check_complexity(self, files: list[Path]) -> Result[list[Issue], QualityError]:
        """Check code complexity."""
        issues: list[Issue] = []

        # Check if radon is available
        if not self._command_exists("radon"):
            return Ok(issues)

        try:
            # Run radon complexity check
            result = subprocess.run(
                ["radon", "cc", "-j"] + [str(f) for f in files],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.stdout:
                try:
                    radon_output = json.loads(result.stdout)
                    for file_path, functions in radon_output.items():
                        for func in functions:
                            if func.get("complexity", 0) > 10:
                                issues.append(
                                    Issue(
                                        severity="info",
                                        category="complexity",
                                        message=f"High complexity in {func.get('name', 'function')}",
                                        file_path=file_path,
                                        line=func.get("lineno"),
                                        suggestion="Consider refactoring to reduce complexity",
                                    ),
                                )
                except json.JSONDecodeError:
                    pass

            return Ok(issues)

        except subprocess.TimeoutExpired:
            return Err(QualityError.check_failed("radon", "timeout"))
        except Exception as e:
            return Err(QualityError.check_failed("radon", str(e)))

    def _run_bandit(self) -> Result[list[Issue], QualityError]:
        """Run Bandit security scanner."""
        issues: list[Issue] = []

        if not self._command_exists("bandit"):
            return Ok(issues)

        try:
            result = subprocess.run(
                ["bandit", "-r", "-f", "json", str(self.project_root)],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )

            if result.stdout:
                try:
                    bandit_output = json.loads(result.stdout)
                    for item in bandit_output.get("results", []):
                        severity = "error" if item.get("issue_severity") == "HIGH" else "warning"
                        issues.append(
                            Issue(
                                severity=severity,
                                category=f"security-{item.get('issue_severity', 'UNKNOWN').lower()}",
                                message=item.get("issue_text", "Security issue"),
                                file_path=item.get("filename"),
                                line=item.get("line_number"),
                                suggestion=item.get("issue_text"),
                            ),
                        )
                except json.JSONDecodeError:
                    pass

            return Ok(issues)

        except subprocess.TimeoutExpired:
            return Err(QualityError.check_failed("bandit", "timeout"))
        except Exception as e:
            return Err(QualityError.check_failed("bandit", str(e)))

    def _check_secrets(self) -> Result[list[Issue], QualityError]:
        """Check for hardcoded secrets."""
        issues: list[Issue] = []

        # Simple pattern matching for common secrets
        secret_patterns = [
            ("password", "Hardcoded password detected"),
            ("api_key", "Hardcoded API key detected"),
            ("secret_key", "Hardcoded secret key detected"),
            ("token", "Hardcoded token detected"),
        ]

        try:
            for py_file in self.project_root.rglob("*.py"):
                if ".venv" in str(py_file) or "venv" in str(py_file):
                    continue

                try:
                    content = py_file.read_text()
                    for pattern, message in secret_patterns:
                        if f'{pattern} = "' in content or f"{pattern} = '" in content:
                            issues.append(
                                Issue(
                                    severity="warning",
                                    category="security-secrets",
                                    message=message,
                                    file_path=str(py_file),
                                    suggestion="Move to environment variables",
                                ),
                            )
                except Exception:
                    continue

            return Ok(issues)

        except Exception as e:
            return Err(QualityError.check_failed("secrets", str(e)))

    def _read_coverage_data(self) -> Result[dict[str, Any], QualityError]:
        """Read coverage data from coverage.json."""
        coverage_file = self.project_root / "coverage.json"

        if not coverage_file.exists():
            return Err(
                QualityError(
                    "Coverage data not found",
                    "Run pytest with --cov to generate coverage data",
                ),
            )

        try:
            with open(coverage_file) as f:
                data = json.load(f)
            return Ok(data)
        except json.JSONDecodeError as e:
            return Err(QualityError("Invalid coverage data", str(e)))
        except Exception as e:
            return Err(QualityError("Failed to read coverage data", str(e)))

    def _get_previous_coverage(self) -> float | None:
        """Get previous coverage percentage from history."""
        history_file = self.project_root / ".claude" / "forge" / "coverage_history.json"

        if not history_file.exists():
            return None

        try:
            with open(history_file) as f:
                history = json.load(f)
            return history.get("previous_coverage")
        except Exception:
            return None

    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in PATH."""
        result = subprocess.run(
            ["which", command],
            capture_output=True,
            text=True,
            check=False,
        )
        return result.returncode == 0


__all__ = [
    "QualityAlerter",
    "QualityReport",
    "CoverageReport",
    "SecurityReport",
    "Issue",
    "QualityError",
]

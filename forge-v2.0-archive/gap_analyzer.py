#!/usr/bin/env python3
"""NXTG-Forge Gap Analyzer

Analyzes project for improvement opportunities with explicit error handling.
"""

import ast
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from forge.result import Err, Ok, Result


console = Console()


@dataclass(frozen=True)
class GapAnalysisError:
    """Gap analysis errors."""

    message: str
    context: str | None = None

    @staticmethod
    def analysis_failed(reason: str) -> "GapAnalysisError":
        return GapAnalysisError("Gap analysis failed", reason)

    @staticmethod
    def file_not_found(path: str) -> "GapAnalysisError":
        return GapAnalysisError(f"File not found: {path}")

    @staticmethod
    def invalid_file(path: str, reason: str) -> "GapAnalysisError":
        return GapAnalysisError(f"Invalid file {path}", reason)

    @staticmethod
    def generation_failed(reason: str) -> "GapAnalysisError":
        return GapAnalysisError("Failed to generate report", reason)


@dataclass(frozen=True)
class Gap:
    """Represents an identified gap or improvement opportunity."""

    severity: str  # critical, high, medium, low
    issue: str
    recommendation: str
    priority: int  # 1=highest, 3=lowest


class GapAnalyzer:
    """Analyzes project for improvement opportunities with explicit error handling."""

    def __init__(self, project_root: str = ".", state: dict[str, Any] | None = None):
        self.project_root = Path(project_root)
        self.state = state or {}
        self.gaps: dict[str, list[Gap]] = {
            "testing": [],
            "documentation": [],
            "security": [],
            "code_quality": [],
            "performance": [],
            "infrastructure": [],
        }

    def analyze(self) -> Result[str, GapAnalysisError]:
        """Run comprehensive gap analysis.

        Returns:
            Result containing markdown report or error
        """
        console.print("\n[cyan]📊 Running Gap Analysis...[/cyan]\n")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:

            task = progress.add_task("Analyzing testing coverage...", total=6)

            self._analyze_testing()
            progress.advance(task)

            progress.update(task, description="Analyzing documentation...")
            self._analyze_documentation()
            progress.advance(task)

            progress.update(task, description="Analyzing security...")
            self._analyze_security()
            progress.advance(task)

            progress.update(task, description="Analyzing code quality...")
            self._analyze_code_quality()
            progress.advance(task)

            progress.update(task, description="Analyzing performance...")
            self._analyze_performance()
            progress.advance(task)

            progress.update(task, description="Analyzing infrastructure...")
            self._analyze_infrastructure()
            progress.advance(task)

        return self._generate_report()

    def _analyze_testing(self) -> None:
        """Analyze test coverage and quality."""
        quality = self.state.get("quality", {})
        tests = quality.get("tests", {})

        # Check unit test coverage
        unit_coverage = tests.get("unit", {}).get("coverage", 0)
        if unit_coverage < 85:
            self.gaps["testing"].append(
                Gap(
                    severity="high" if unit_coverage < 70 else "medium",
                    issue=f"Unit test coverage is {unit_coverage}% (target: 85%)",
                    recommendation="Add unit tests to increase coverage",
                    priority=1,
                ),
            )

        # Check integration tests
        int_coverage = tests.get("integration", {}).get("coverage", 0)
        if int_coverage < 70:
            self.gaps["testing"].append(
                Gap(
                    severity="medium",
                    issue=f"Integration test coverage is {int_coverage}% (target: 70%)",
                    recommendation="Add integration tests for key workflows",
                    priority=2,
                ),
            )

        # Check E2E tests
        e2e_total = tests.get("e2e", {}).get("total", 0)
        if e2e_total == 0:
            self.gaps["testing"].append(
                Gap(
                    severity="medium",
                    issue="No E2E tests found",
                    recommendation="Add E2E tests for critical user journeys",
                    priority=2,
                ),
            )

        # Check for test files
        test_dirs = ["tests", "test", "__tests__"]
        has_tests = any((self.project_root / d).exists() for d in test_dirs)

        if not has_tests:
            self.gaps["testing"].append(
                Gap(
                    severity="critical",
                    issue="No test directory found",
                    recommendation="Create test directory and add tests",
                    priority=1,
                ),
            )

    def _analyze_documentation(self) -> None:
        """Analyze documentation completeness."""
        # Check for README
        if not (self.project_root / "README.md").exists():
            self.gaps["documentation"].append(
                Gap(
                    severity="high",
                    issue="No README.md found",
                    recommendation="Create README.md with project overview and setup instructions",
                    priority=1,
                ),
            )

        # Check for docs directory
        docs_dir = self.project_root / "docs"
        if not docs_dir.exists():
            self.gaps["documentation"].append(
                Gap(
                    severity="medium",
                    issue="No docs/ directory found",
                    recommendation="Create documentation directory with architecture and API docs",
                    priority=2,
                ),
            )
        else:
            # Check for essential docs
            essential_docs = ["ARCHITECTURE.md", "API.md", "DEPLOYMENT.md"]
            missing_docs = [doc for doc in essential_docs if not (docs_dir / doc).exists()]

            if missing_docs:
                self.gaps["documentation"].append(
                    Gap(
                        severity="medium",
                        issue=f'Missing documentation: {", ".join(missing_docs)}',
                        recommendation="Create missing documentation files",
                        priority=2,
                    ),
                )

        # Check for inline documentation
        python_files_result = self._find_python_files()
        if python_files_result.is_ok():
            python_files = python_files_result.value[:10]  # Sample
            undocumented = self._check_python_docstrings(python_files)

            if undocumented > 30:  # More than 30% undocumented
                self.gaps["documentation"].append(
                    Gap(
                        severity="low",
                        issue=f"{undocumented}% of functions lack docstrings",
                        recommendation="Add docstrings to functions and classes",
                        priority=3,
                    ),
                )

    def _analyze_security(self) -> None:
        """Analyze security posture."""
        quality = self.state.get("quality", {})
        security = quality.get("security", {})
        vulns = security.get("vulnerabilities", {})

        # Check for critical vulnerabilities
        if vulns.get("critical", 0) > 0:
            self.gaps["security"].append(
                Gap(
                    severity="critical",
                    issue=f'{vulns["critical"]} critical vulnerabilities found',
                    recommendation="Fix critical vulnerabilities immediately",
                    priority=1,
                ),
            )

        # Check for high vulnerabilities
        if vulns.get("high", 0) > 0:
            self.gaps["security"].append(
                Gap(
                    severity="high",
                    issue=f'{vulns["high"]} high-severity vulnerabilities found',
                    recommendation="Address high-severity vulnerabilities",
                    priority=1,
                ),
            )

        # Check for .env file
        if (self.project_root / ".env").exists() and not (
            self.project_root / ".gitignore"
        ).exists():
            self.gaps["security"].append(
                Gap(
                    severity="critical",
                    issue=".env file may be committed to git",
                    recommendation="Create .gitignore and exclude .env",
                    priority=1,
                ),
            )

        # Check for secrets in code
        secrets_result = self._check_for_hardcoded_secrets()
        if secrets_result.is_ok() and secrets_result.value:
            self.gaps["security"].append(
                Gap(
                    severity="high",
                    issue="Potential hardcoded secrets detected",
                    recommendation="Move secrets to environment variables",
                    priority=1,
                ),
            )

    def _analyze_code_quality(self) -> None:
        """Analyze code quality metrics."""
        quality = self.state.get("quality", {})
        linting = quality.get("linting", {})

        # Check linting issues
        issues = linting.get("issues", 0)
        if issues > 10:
            self.gaps["code_quality"].append(
                Gap(
                    severity="medium",
                    issue=f"{issues} linting issues found",
                    recommendation="Fix linting issues",
                    priority=2,
                ),
            )

        # Check for linter configuration
        linter_configs = [".ruff.toml", "ruff.toml", ".eslintrc", ".eslintrc.json"]
        has_linter = any((self.project_root / c).exists() for c in linter_configs)

        if not has_linter:
            self.gaps["code_quality"].append(
                Gap(
                    severity="medium",
                    issue="No linter configuration found",
                    recommendation="Configure linter (ruff for Python, eslint for JS)",
                    priority=2,
                ),
            )

        # Check for formatter configuration
        formatter_configs = [".prettierrc", "pyproject.toml"]
        has_formatter = any((self.project_root / c).exists() for c in formatter_configs)

        if not has_formatter:
            self.gaps["code_quality"].append(
                Gap(
                    severity="low",
                    issue="No code formatter configured",
                    recommendation="Configure code formatter (black for Python, prettier for JS)",
                    priority=3,
                ),
            )

        # Check code complexity
        complexity_result = self._check_code_complexity()
        if complexity_result.is_ok():
            complexity_issues = complexity_result.value
            if complexity_issues > 0:
                self.gaps["code_quality"].append(
                    Gap(
                        severity="low",
                        issue=f"{complexity_issues} functions with high complexity",
                        recommendation="Refactor complex functions",
                        priority=3,
                    ),
                )

    def _analyze_performance(self) -> None:
        """Analyze performance considerations."""
        # Check for database indexes (if using database)
        arch = self.state.get("architecture", {})
        if arch.get("database"):
            self.gaps["performance"].append(
                Gap(
                    severity="low",
                    issue="Database index optimization not verified",
                    recommendation="Review database queries and add indexes for slow queries",
                    priority=3,
                ),
            )

        # Check for caching
        if not arch.get("cache"):
            self.gaps["performance"].append(
                Gap(
                    severity="medium",
                    issue="No caching layer configured",
                    recommendation="Consider adding Redis or similar caching",
                    priority=2,
                ),
            )

        # Check for CDN configuration
        if self.state.get("project", {}).get("type") in ["web-app", "platform"]:
            self.gaps["performance"].append(
                Gap(
                    severity="low",
                    issue="CDN configuration not verified",
                    recommendation="Configure CDN for static assets",
                    priority=3,
                ),
            )

    def _analyze_infrastructure(self) -> None:
        """Analyze infrastructure and deployment."""
        # Check for Dockerfile
        if not (self.project_root / "Dockerfile").exists():
            self.gaps["infrastructure"].append(
                Gap(
                    severity="medium",
                    issue="No Dockerfile found",
                    recommendation="Create Dockerfile for containerization",
                    priority=2,
                ),
            )

        # Check for docker-compose
        if not (self.project_root / "docker-compose.yml").exists():
            self.gaps["infrastructure"].append(
                Gap(
                    severity="low",
                    issue="No docker-compose.yml found",
                    recommendation="Create docker-compose.yml for local development",
                    priority=3,
                ),
            )

        # Check for CI/CD
        ci_configs = [".github/workflows", ".gitlab-ci.yml", "Jenkinsfile"]
        has_ci = any((self.project_root / c).exists() for c in ci_configs)

        if not has_ci:
            self.gaps["infrastructure"].append(
                Gap(
                    severity="high",
                    issue="No CI/CD pipeline configured",
                    recommendation="Set up CI/CD with GitHub Actions or similar",
                    priority=1,
                ),
            )

        # Check for monitoring
        self.gaps["infrastructure"].append(
            Gap(
                severity="medium",
                issue="Monitoring and observability not verified",
                recommendation="Configure logging, metrics, and alerting",
                priority=2,
            ),
        )

    def _generate_report(self) -> Result[str, GapAnalysisError]:
        """Generate markdown gap analysis report.

        Returns:
            Result containing report text or error
        """
        try:
            now = datetime.now(timezone.utc)
            report = f"""# Gap Analysis Report

> Generated by NXTG-Forge on {now.strftime('%Y-%m-%d %H:%M:%S UTC')}

## Executive Summary

"""

            # Count gaps by severity
            all_gaps = []
            for category, gaps in self.gaps.items():
                all_gaps.extend(gaps)

            critical = len([g for g in all_gaps if g.severity == "critical"])
            high = len([g for g in all_gaps if g.severity == "high"])
            medium = len([g for g in all_gaps if g.severity == "medium"])
            low = len([g for g in all_gaps if g.severity == "low"])

            report += f"""- **Critical Issues:** {critical}
- **High Priority:** {high}
- **Medium Priority:** {medium}
- **Low Priority:** {low}

**Total Gaps:** {len(all_gaps)}

"""

            # Add health assessment
            if critical > 0:
                report += "🔴 **Status:** CRITICAL - Immediate action required\n\n"
            elif high > 3:
                report += "🟡 **Status:** NEEDS ATTENTION - Address high-priority issues\n\n"
            elif medium > 5:
                report += "🟢 **Status:** GOOD - Some improvements recommended\n\n"
            else:
                report += "✅ **Status:** EXCELLENT - Minor improvements only\n\n"

            # Add detailed sections
            for category, gaps in self.gaps.items():
                if not gaps:
                    continue

                category_title = category.replace("_", " ").title()
                report += f"## {category_title}\n\n"

                # Sort by priority
                sorted_gaps = sorted(gaps, key=lambda x: x.priority)

                for gap in sorted_gaps:
                    severity_icon = {
                        "critical": "🔴",
                        "high": "🟠",
                        "medium": "🟡",
                        "low": "🔵",
                    }.get(gap.severity, "⚪")

                    report += f"### {severity_icon} {gap.issue}\n\n"
                    report += f"**Severity:** {gap.severity.upper()}\n"
                    report += f"**Priority:** P{gap.priority}\n\n"
                    report += f"**Recommendation:**\n{gap.recommendation}\n\n"
                    report += "---\n\n"

            # Add action plan
            report += "## Recommended Action Plan\n\n"

            # Sort all gaps by priority
            all_sorted = sorted(all_gaps, key=lambda x: (x.priority, x.severity))

            for i, gap in enumerate(all_sorted[:10], 1):  # Top 10
                report += f"{i}. {gap.issue}\n"

            report += "\n---\n\n"
            report += "*This report was auto-generated. Review and validate all recommendations.*\n"

            return Ok(report)

        except Exception as e:
            return Err(GapAnalysisError.generation_failed(str(e)))

    def _find_python_files(self) -> Result[list[Path], GapAnalysisError]:
        """Find Python files in the project.

        Returns:
            Result containing list of Python file paths or error
        """
        try:
            python_files = list(self.project_root.glob("**/*.py"))
            return Ok(python_files)
        except Exception as e:
            return Err(GapAnalysisError.analysis_failed(f"Failed to find Python files: {e}"))

    def _check_python_docstrings(self, files: list[Path]) -> int:
        """Check percentage of functions without docstrings.

        Args:
            files: List of Python files to check

        Returns:
            Percentage of undocumented functions (0-100)
        """
        total_functions = 0
        undocumented = 0

        for file_path in files:
            if not file_path.exists():
                continue

            try:
                with open(file_path) as f:
                    tree = ast.parse(f.read())

                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        total_functions += 1
                        if not ast.get_docstring(node):
                            undocumented += 1
            except Exception:
                # Silently skip files that can't be parsed
                continue

        if total_functions == 0:
            return 0

        return int((undocumented / total_functions) * 100)

    def _check_for_hardcoded_secrets(self) -> Result[bool, GapAnalysisError]:
        """Check for potential hardcoded secrets.

        Returns:
            Result containing True if secrets found, False otherwise
        """
        import re

        # Patterns that might indicate secrets
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
        ]

        python_files_result = self._find_python_files()
        if python_files_result.is_error():
            return Err(python_files_result.error)

        python_files = python_files_result.value[:20]  # Sample

        for file_path in python_files:
            try:
                with open(file_path) as f:
                    content = f.read()

                for pattern in secret_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        return Ok(True)
            except Exception:
                # Silently skip files that can't be read
                continue

        return Ok(False)

    def _check_code_complexity(self) -> Result[int, GapAnalysisError]:
        """Check for complex functions.

        Returns:
            Result containing count of complex functions or error
        """
        try:
            # Try to use radon if available
            result = subprocess.run(
                ["radon", "cc", str(self.project_root), "-n", "C"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )

            if result.returncode == 0:
                # Count complex functions
                lines = result.stdout.split("\n")
                count = len([l for l in lines if l.strip() and not l.startswith(" ")])
                return Ok(count)

            return Ok(0)  # Radon not available or failed
        except FileNotFoundError:
            return Ok(0)  # Radon not installed
        except subprocess.TimeoutExpired:
            return Err(GapAnalysisError.analysis_failed("Complexity check timed out"))
        except Exception as e:
            return Err(GapAnalysisError.analysis_failed(f"Complexity check failed: {e}"))


# CLI
if __name__ == "__main__":
    import json

    # Load state if exists
    state = {}
    state_file = Path(".claude/state.json")
    if state_file.exists():
        try:
            with open(state_file) as f:
                state = json.load(f)
        except Exception as e:
            console.print(f"[yellow]Warning: Failed to load state: {e}[/yellow]")

    analyzer = GapAnalyzer(state=state)
    result = analyzer.analyze()

    if result.is_error():
        console.print(f"[red]Error: {result.error.message}[/red]")
        if result.error.context:
            console.print(f"[red]Context: {result.error.context}[/red]")
        exit(1)

    report = result.value

    # Save report
    output_file = Path("docs/GAP-ANALYSIS.md")
    output_file.parent.mkdir(exist_ok=True, parents=True)

    try:
        with open(output_file, "w") as f:
            f.write(report)

        console.print("\n[green]✅ Gap analysis complete![/green]")
        console.print(f"[cyan]Report saved to: {output_file}[/cyan]\n")

        # Print summary
        summary = report.split("## Executive Summary")[1].split("##")[0]
        print(summary)
    except Exception as e:
        console.print(f"[red]Failed to save report: {e}[/red]")
        exit(1)

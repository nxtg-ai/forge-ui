"""Recommendation Engine for AI-powered code analysis and suggestions.

This service analyzes project patterns and provides smart recommendations
for improvements, next steps, and best practices.
"""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result


@dataclass(frozen=True)
class AnalysisError:
    """Analysis operation error."""

    message: str
    detail: str | None = None

    @staticmethod
    def analysis_failed(reason: str) -> "AnalysisError":
        """Create error for failed analysis."""
        return AnalysisError("Analysis failed", reason)

    @staticmethod
    def no_data(source: str) -> "AnalysisError":
        """Create error for missing data."""
        return AnalysisError(f"No data available from {source}")


@dataclass
class Pattern:
    """Detected code pattern."""

    pattern_type: str  # "architecture", "naming", "testing", "documentation"
    description: str
    frequency: int
    confidence: float  # 0.0-1.0
    examples: list[str] = field(default_factory=list)


@dataclass
class PatternReport:
    """Project pattern analysis report."""

    patterns: list[Pattern] = field(default_factory=list)
    tech_stack: dict[str, Any] = field(default_factory=dict)
    code_style: dict[str, Any] = field(default_factory=dict)
    metrics: dict[str, Any] = field(default_factory=dict)


@dataclass
class Recommendation:
    """Smart recommendation for improvement."""

    priority: int  # 1-10 (10 = critical)
    category: str  # "security", "quality", "performance", "architecture", "docs"
    title: str
    description: str
    action: str
    reasoning: str
    effort: str = "medium"  # "low", "medium", "high"
    impact: str = "medium"  # "low", "medium", "high"
    code_example: str | None = None


@dataclass
class Improvement:
    """Specific improvement suggestion for a file."""

    file_path: str
    line: int | None
    improvement_type: str
    message: str
    suggestion: str
    before: str | None = None
    after: str | None = None


class RecommendationEngine:
    """Service for AI-powered code analysis and recommendations.

    Analyzes project patterns, detects issues, and suggests improvements
    based on best practices and project history.
    """

    def __init__(self, project_root: Path | str = "."):
        """Initialize recommendation engine.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)

    def analyze_project_patterns(self) -> Result[PatternReport, AnalysisError]:
        """Analyze project to detect patterns and conventions.

        Returns:
            Result containing PatternReport or AnalysisError
        """
        patterns: list[Pattern] = []

        # Detect technology stack
        tech_stack = self._detect_tech_stack()

        # Analyze naming conventions
        naming_patterns = self._analyze_naming_conventions()
        if naming_patterns.is_ok():
            patterns.extend(naming_patterns.value)

        # Analyze project structure
        structure_patterns = self._analyze_project_structure()
        if structure_patterns.is_ok():
            patterns.extend(structure_patterns.value)

        # Analyze testing patterns
        testing_patterns = self._analyze_testing_patterns()
        if testing_patterns.is_ok():
            patterns.extend(testing_patterns.value)

        # Collect code metrics
        metrics = self._collect_code_metrics()

        report = PatternReport(
            patterns=patterns,
            tech_stack=tech_stack,
            metrics=metrics,
        )

        return Ok(report)

    def suggest_next_steps(
        self,
        context: dict[str, Any],
    ) -> Result[list[Recommendation], AnalysisError]:
        """Suggest smart next steps based on current context.

        Args:
            context: Current session context (from ContextRestorationService)

        Returns:
            Result containing list of Recommendations or AnalysisError
        """
        recommendations: list[Recommendation] = []

        # Analyze current state
        current_tasks = context.get("outstanding_tasks", [])
        recent_files = context.get("recent_files", [])
        uncommitted_changes = context.get("uncommitted_changes", 0)

        # Suggest based on uncommitted changes
        if uncommitted_changes > 0:
            recommendations.append(
                Recommendation(
                    priority=8,
                    category="quality",
                    title="Commit your work",
                    description=f"You have {uncommitted_changes} uncommitted changes",
                    action="Review and commit changes with descriptive message",
                    reasoning="Regular commits make it easier to track progress and revert if needed",
                    effort="low",
                    impact="medium",
                ),
            )

        # Analyze test coverage
        coverage_rec = self._suggest_test_improvements()
        if coverage_rec.is_ok():
            recommendations.extend(coverage_rec.value)

        # Analyze documentation
        docs_rec = self._suggest_documentation_improvements()
        if docs_rec.is_ok():
            recommendations.extend(docs_rec.value)

        # Analyze code quality
        quality_rec = self._suggest_quality_improvements()
        if quality_rec.is_ok():
            recommendations.extend(quality_rec.value)

        # Sort by priority (highest first)
        recommendations.sort(key=lambda r: r.priority, reverse=True)

        return Ok(recommendations)

    def suggest_improvements(self, file_path: Path) -> Result[list[Improvement], AnalysisError]:
        """Suggest improvements for a specific file.

        Args:
            file_path: Path to file to analyze

        Returns:
            Result containing list of Improvements or AnalysisError
        """
        improvements: list[Improvement] = []

        full_path = self.project_root / file_path
        if not full_path.exists():
            return Err(AnalysisError(f"File not found: {file_path}"))

        try:
            content = full_path.read_text()
        except Exception as e:
            return Err(AnalysisError.analysis_failed(f"Could not read file: {e}"))

        # Check for docstrings
        if full_path.suffix == ".py":
            docstring_improvements = self._check_docstrings(str(file_path), content)
            improvements.extend(docstring_improvements)

            # Check for type hints
            type_improvements = self._check_type_hints(str(file_path), content)
            improvements.extend(type_improvements)

            # Check for error handling
            error_improvements = self._check_error_handling(str(file_path), content)
            improvements.extend(error_improvements)

            # Check for code complexity
            complexity_improvements = self._check_complexity(str(file_path), content)
            improvements.extend(complexity_improvements)

        return Ok(improvements)

    # Private helper methods

    def _detect_tech_stack(self) -> dict[str, Any]:
        """Detect technologies used in project."""
        stack: dict[str, Any] = {"languages": [], "frameworks": [], "tools": []}

        # Check for Python
        if list(self.project_root.glob("**/*.py")):
            stack["languages"].append("Python")

            # Check Python version
            pyproject = self.project_root / "pyproject.toml"
            if pyproject.exists():
                content = pyproject.read_text()
                if "python" in content:
                    stack["python_version"] = "3.8+"  # Default assumption

            # Check for frameworks
            requirements_files = list(self.project_root.glob("*requirements*.txt"))
            if requirements_files:
                for req_file in requirements_files:
                    content = req_file.read_text().lower()
                    if "django" in content:
                        stack["frameworks"].append("Django")
                    if "flask" in content:
                        stack["frameworks"].append("Flask")
                    if "fastapi" in content:
                        stack["frameworks"].append("FastAPI")
                    if "pytest" in content:
                        stack["tools"].append("pytest")

        # Check for JavaScript/TypeScript
        if list(self.project_root.glob("**/*.js")) or list(self.project_root.glob("**/*.ts")):
            stack["languages"].append("JavaScript/TypeScript")

        # Check for Go
        if (self.project_root / "go.mod").exists():
            stack["languages"].append("Go")

        # Check for Rust
        if (self.project_root / "Cargo.toml").exists():
            stack["languages"].append("Rust")

        return stack

    def _analyze_naming_conventions(self) -> Result[list[Pattern], AnalysisError]:
        """Analyze naming conventions in code."""
        patterns: list[Pattern] = []

        # Analyze Python files
        py_files = list(self.project_root.glob("**/*.py"))
        if not py_files:
            return Ok(patterns)

        class_names: list[str] = []
        function_names: list[str] = []

        for py_file in py_files[:50]:  # Sample first 50 files
            try:
                content = py_file.read_text()

                # Extract class names
                class_matches = re.findall(r"^class (\w+)", content, re.MULTILINE)
                class_names.extend(class_matches)

                # Extract function names
                func_matches = re.findall(r"^def (\w+)", content, re.MULTILINE)
                function_names.extend(func_matches)

            except Exception:
                continue

        # Analyze class naming
        if class_names:
            pascal_case = sum(1 for name in class_names if name[0].isupper())
            if pascal_case / len(class_names) > 0.8:
                patterns.append(
                    Pattern(
                        pattern_type="naming",
                        description="Classes use PascalCase convention",
                        frequency=len(class_names),
                        confidence=0.9,
                        examples=class_names[:3],
                    ),
                )

        # Analyze function naming
        if function_names:
            snake_case = sum(1 for name in function_names if "_" in name or name.islower())
            if snake_case / len(function_names) > 0.8:
                patterns.append(
                    Pattern(
                        pattern_type="naming",
                        description="Functions use snake_case convention",
                        frequency=len(function_names),
                        confidence=0.9,
                        examples=function_names[:3],
                    ),
                )

        return Ok(patterns)

    def _analyze_project_structure(self) -> Result[list[Pattern], AnalysisError]:
        """Analyze project directory structure."""
        patterns: list[Pattern] = []

        # Check for common structures
        has_src = (self.project_root / "src").exists()
        has_tests = (self.project_root / "tests").exists()
        has_docs = (self.project_root / "docs").exists()

        if has_src:
            patterns.append(
                Pattern(
                    pattern_type="architecture",
                    description="Uses src/ directory for source code",
                    frequency=1,
                    confidence=1.0,
                ),
            )

        if has_tests:
            patterns.append(
                Pattern(
                    pattern_type="testing",
                    description="Dedicated tests/ directory",
                    frequency=1,
                    confidence=1.0,
                ),
            )

        if has_docs:
            patterns.append(
                Pattern(
                    pattern_type="documentation",
                    description="Dedicated docs/ directory",
                    frequency=1,
                    confidence=1.0,
                ),
            )

        return Ok(patterns)

    def _analyze_testing_patterns(self) -> Result[list[Pattern], AnalysisError]:
        """Analyze testing patterns and conventions."""
        patterns: list[Pattern] = []

        test_files = list(self.project_root.glob("**/test_*.py"))
        test_files.extend(self.project_root.glob("**/*_test.py"))

        if test_files:
            # Check naming convention
            test_prefix = sum(1 for f in test_files if f.name.startswith("test_"))
            if test_prefix / len(test_files) > 0.8:
                patterns.append(
                    Pattern(
                        pattern_type="testing",
                        description="Test files use test_ prefix convention",
                        frequency=len(test_files),
                        confidence=0.9,
                    ),
                )

            # Check for pytest usage
            pytest_markers = 0
            for test_file in test_files[:20]:
                try:
                    content = test_file.read_text()
                    if "@pytest" in content or "import pytest" in content:
                        pytest_markers += 1
                except Exception:
                    continue

            if pytest_markers > 0:
                patterns.append(
                    Pattern(
                        pattern_type="testing",
                        description="Uses pytest framework",
                        frequency=pytest_markers,
                        confidence=0.9,
                    ),
                )

        return Ok(patterns)

    def _collect_code_metrics(self) -> dict[str, Any]:
        """Collect various code metrics."""
        metrics: dict[str, Any] = {}

        # Count files by type
        py_files = list(self.project_root.glob("**/*.py"))
        test_files = [f for f in py_files if "test" in str(f)]

        metrics["total_python_files"] = len(py_files)
        metrics["test_files"] = len(test_files)
        metrics["source_files"] = len(py_files) - len(test_files)

        # Calculate lines of code
        total_lines = 0
        for py_file in py_files[:100]:  # Sample
            try:
                total_lines += len(py_file.read_text().splitlines())
            except Exception:
                continue

        metrics["approximate_lines"] = total_lines

        return metrics

    def _suggest_test_improvements(self) -> Result[list[Recommendation], AnalysisError]:
        """Suggest testing improvements."""
        recommendations: list[Recommendation] = []

        # Check test coverage
        coverage_file = self.project_root / "coverage.json"
        if coverage_file.exists():
            try:
                with open(coverage_file) as f:
                    coverage_data = json.load(f)
                total_coverage = coverage_data.get("totals", {}).get("percent_covered", 0)

                if total_coverage < 85:
                    recommendations.append(
                        Recommendation(
                            priority=7,
                            category="quality",
                            title="Improve test coverage",
                            description=f"Current coverage is {total_coverage:.1f}%",
                            action="Add tests for uncovered code paths",
                            reasoning="85% coverage minimum ensures reliability",
                            effort="medium",
                            impact="high",
                        ),
                    )
            except Exception:
                pass

        return Ok(recommendations)

    def _suggest_documentation_improvements(self) -> Result[list[Recommendation], AnalysisError]:
        """Suggest documentation improvements."""
        recommendations: list[Recommendation] = []

        # Check for README
        readme_files = list(self.project_root.glob("README*"))
        if not readme_files:
            recommendations.append(
                Recommendation(
                    priority=6,
                    category="docs",
                    title="Add project README",
                    description="No README file found",
                    action="Create README.md with project overview, setup, and usage",
                    reasoning="README is first touchpoint for users and contributors",
                    effort="low",
                    impact="high",
                ),
            )

        # Check for API documentation
        py_files = list(self.project_root.glob("**/*.py"))
        if py_files:
            undocumented = 0
            for py_file in py_files[:20]:
                try:
                    content = py_file.read_text()
                    # Simple check for docstrings
                    if "def " in content and '"""' not in content:
                        undocumented += 1
                except Exception:
                    continue

            if undocumented > 5:
                recommendations.append(
                    Recommendation(
                        priority=5,
                        category="docs",
                        title="Add function docstrings",
                        description=f"Found {undocumented} files with undocumented functions",
                        action="Add docstrings to public functions and classes",
                        reasoning="Docstrings improve code maintainability and enable auto-documentation",
                        effort="medium",
                        impact="medium",
                    ),
                )

        return Ok(recommendations)

    def _suggest_quality_improvements(self) -> Result[list[Recommendation], AnalysisError]:
        """Suggest code quality improvements."""
        recommendations: list[Recommendation] = []

        # Check for type hints
        py_files = list(self.project_root.glob("**/*.py"))
        if py_files:
            untyped = 0
            for py_file in py_files[:20]:
                try:
                    content = py_file.read_text()
                    # Simple check for type hints
                    if "def " in content and "->" not in content and ": " not in content:
                        untyped += 1
                except Exception:
                    continue

            if untyped > 10:
                recommendations.append(
                    Recommendation(
                        priority=6,
                        category="quality",
                        title="Add type hints",
                        description="Many functions lack type annotations",
                        action="Add type hints to function signatures",
                        reasoning="Type hints catch bugs early and improve IDE support",
                        effort="medium",
                        impact="medium",
                    ),
                )

        return Ok(recommendations)

    def _check_docstrings(self, file_path: str, content: str) -> list[Improvement]:
        """Check for missing docstrings."""
        improvements: list[Improvement] = []

        # Find functions without docstrings
        lines = content.splitlines()
        for i, line in enumerate(lines, 1):
            if line.strip().startswith("def "):
                # Check if next non-empty line is a docstring
                for j in range(i, min(i + 3, len(lines))):
                    if lines[j].strip() and not lines[j].strip().startswith('"""'):
                        improvements.append(
                            Improvement(
                                file_path=file_path,
                                line=i,
                                improvement_type="documentation",
                                message="Missing docstring",
                                suggestion="Add docstring describing function purpose, parameters, and return value",
                            ),
                        )
                        break
                    if '"""' in lines[j]:
                        break

        return improvements

    def _check_type_hints(self, file_path: str, content: str) -> list[Improvement]:
        """Check for missing type hints."""
        improvements: list[Improvement] = []

        # Find functions without type hints
        lines = content.splitlines()
        for i, line in enumerate(lines, 1):
            if line.strip().startswith("def ") and "->" not in line:
                func_name = line.split("(")[0].replace("def ", "").strip()
                if not func_name.startswith("_"):  # Focus on public functions
                    improvements.append(
                        Improvement(
                            file_path=file_path,
                            line=i,
                            improvement_type="types",
                            message=f"Function {func_name} lacks return type hint",
                            suggestion="Add return type annotation (-> ReturnType)",
                        ),
                    )

        return improvements

    def _check_error_handling(self, file_path: str, content: str) -> list[Improvement]:
        """Check for poor error handling."""
        improvements: list[Improvement] = []

        # Check for bare except clauses
        lines = content.splitlines()
        for i, line in enumerate(lines, 1):
            if "except:" in line and "except Exception" not in line:
                improvements.append(
                    Improvement(
                        file_path=file_path,
                        line=i,
                        improvement_type="error-handling",
                        message="Bare except clause catches all exceptions",
                        suggestion="Use specific exception types or 'except Exception'",
                        before="except:",
                        after="except SpecificException:",
                    ),
                )

        return improvements

    def _check_complexity(self, file_path: str, content: str) -> list[Improvement]:
        """Check for high complexity."""
        improvements: list[Improvement] = []

        # Simple heuristic: count nested blocks
        lines = content.splitlines()
        indent_stack: list[int] = []

        for i, line in enumerate(lines, 1):
            stripped = line.lstrip()
            if not stripped or stripped.startswith("#"):
                continue

            indent = len(line) - len(stripped)

            if stripped.startswith(("if ", "for ", "while ", "with ")):
                indent_stack.append(indent)

                # Check for deep nesting
                if len([x for x in indent_stack if x >= indent]) > 3:
                    improvements.append(
                        Improvement(
                            file_path=file_path,
                            line=i,
                            improvement_type="complexity",
                            message="Deep nesting detected (>3 levels)",
                            suggestion="Consider extracting to separate function",
                        ),
                    )

        return improvements


__all__ = [
    "RecommendationEngine",
    "PatternReport",
    "Recommendation",
    "Improvement",
    "Pattern",
    "AnalysisError",
]

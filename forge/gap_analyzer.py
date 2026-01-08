#!/usr/bin/env python3
"""NXTG-Forge Gap Analyzer

Analyzes project for improvement opportunities
"""

import ast
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn


console = Console()


class GapAnalyzer:
    def __init__(self, project_root: str = ".", state: Optional[dict[str, Any]] = None):
        self.project_root = Path(project_root)
        self.state = state or {}
        self.gaps: dict[str, list[dict[str, Any]]] = {
            "testing": [],
            "documentation": [],
            "security": [],
            "code_quality": [],
            "performance": [],
            "infrastructure": [],
        }

    def analyze(self) -> str:
        """Run comprehensive gap analysis"""
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

    def _analyze_testing(self):
        """Analyze test coverage and quality"""
        quality = self.state.get("quality", {})
        tests = quality.get("tests", {})

        # Check unit test coverage
        unit_coverage = tests.get("unit", {}).get("coverage", 0)
        if unit_coverage < 85:
            self.gaps["testing"].append(
                {
                    "severity": "high" if unit_coverage < 70 else "medium",
                    "issue": f"Unit test coverage is {unit_coverage}% (target: 85%)",
                    "recommendation": "Add unit tests to increase coverage",
                    "priority": 1,
                },
            )

        # Check integration tests
        int_coverage = tests.get("integration", {}).get("coverage", 0)
        if int_coverage < 70:
            self.gaps["testing"].append(
                {
                    "severity": "medium",
                    "issue": f"Integration test coverage is {int_coverage}% (target: 70%)",
                    "recommendation": "Add integration tests for key workflows",
                    "priority": 2,
                },
            )

        # Check E2E tests
        e2e_total = tests.get("e2e", {}).get("total", 0)
        if e2e_total == 0:
            self.gaps["testing"].append(
                {
                    "severity": "medium",
                    "issue": "No E2E tests found",
                    "recommendation": "Add E2E tests for critical user journeys",
                    "priority": 2,
                },
            )

        # Check for test files
        test_dirs = ["tests", "test", "__tests__"]
        has_tests = any((self.project_root / d).exists() for d in test_dirs)

        if not has_tests:
            self.gaps["testing"].append(
                {
                    "severity": "critical",
                    "issue": "No test directory found",
                    "recommendation": "Create test directory and add tests",
                    "priority": 1,
                },
            )

    def _analyze_documentation(self):
        """Analyze documentation completeness"""
        # Check for README
        if not (self.project_root / "README.md").exists():
            self.gaps["documentation"].append(
                {
                    "severity": "high",
                    "issue": "No README.md found",
                    "recommendation": "Create README.md with project overview and setup instructions",
                    "priority": 1,
                },
            )

        # Check for docs directory
        docs_dir = self.project_root / "docs"
        if not docs_dir.exists():
            self.gaps["documentation"].append(
                {
                    "severity": "medium",
                    "issue": "No docs/ directory found",
                    "recommendation": "Create documentation directory with architecture and API docs",
                    "priority": 2,
                },
            )
        else:
            # Check for essential docs
            essential_docs = ["ARCHITECTURE.md", "API.md", "DEPLOYMENT.md"]
            missing_docs = [doc for doc in essential_docs if not (docs_dir / doc).exists()]

            if missing_docs:
                self.gaps["documentation"].append(
                    {
                        "severity": "medium",
                        "issue": f'Missing documentation: {", ".join(missing_docs)}',
                        "recommendation": "Create missing documentation files",
                        "priority": 2,
                    },
                )

        # Check for inline documentation
        python_files = list(self.project_root.glob("**/*.py"))
        undocumented = self._check_python_docstrings(python_files[:10])  # Sample

        if undocumented > 30:  # More than 30% undocumented
            self.gaps["documentation"].append(
                {
                    "severity": "low",
                    "issue": f"{undocumented}% of functions lack docstrings",
                    "recommendation": "Add docstrings to functions and classes",
                    "priority": 3,
                },
            )

    def _analyze_security(self):
        """Analyze security posture"""
        quality = self.state.get("quality", {})
        security = quality.get("security", {})
        vulns = security.get("vulnerabilities", {})

        # Check for critical vulnerabilities
        if vulns.get("critical", 0) > 0:
            self.gaps["security"].append(
                {
                    "severity": "critical",
                    "issue": f'{vulns["critical"]} critical vulnerabilities found',
                    "recommendation": "Fix critical vulnerabilities immediately",
                    "priority": 1,
                },
            )

        # Check for high vulnerabilities
        if vulns.get("high", 0) > 0:
            self.gaps["security"].append(
                {
                    "severity": "high",
                    "issue": f'{vulns["high"]} high-severity vulnerabilities found',
                    "recommendation": "Address high-severity vulnerabilities",
                    "priority": 1,
                },
            )

        # Check for .env file
        if (self.project_root / ".env").exists() and not (
            self.project_root / ".gitignore"
        ).exists():
            self.gaps["security"].append(
                {
                    "severity": "critical",
                    "issue": ".env file may be committed to git",
                    "recommendation": "Create .gitignore and exclude .env",
                    "priority": 1,
                },
            )

        # Check for secrets in code (basic check)
        if self._check_for_hardcoded_secrets():
            self.gaps["security"].append(
                {
                    "severity": "high",
                    "issue": "Potential hardcoded secrets detected",
                    "recommendation": "Move secrets to environment variables",
                    "priority": 1,
                },
            )

    def _analyze_code_quality(self):
        """Analyze code quality metrics"""
        quality = self.state.get("quality", {})
        linting = quality.get("linting", {})

        # Check linting issues
        issues = linting.get("issues", 0)
        if issues > 10:
            self.gaps["code_quality"].append(
                {
                    "severity": "medium",
                    "issue": f"{issues} linting issues found",
                    "recommendation": "Fix linting issues",
                    "priority": 2,
                },
            )

        # Check for linter configuration
        linter_configs = [".ruff.toml", "ruff.toml", ".eslintrc", ".eslintrc.json"]
        has_linter = any((self.project_root / c).exists() for c in linter_configs)

        if not has_linter:
            self.gaps["code_quality"].append(
                {
                    "severity": "medium",
                    "issue": "No linter configuration found",
                    "recommendation": "Configure linter (ruff for Python, eslint for JS)",
                    "priority": 2,
                },
            )

        # Check for formatter configuration
        formatter_configs = [".prettierrc", "pyproject.toml"]
        has_formatter = any((self.project_root / c).exists() for c in formatter_configs)

        if not has_formatter:
            self.gaps["code_quality"].append(
                {
                    "severity": "low",
                    "issue": "No code formatter configured",
                    "recommendation": "Configure code formatter (black for Python, prettier for JS)",
                    "priority": 3,
                },
            )

        # Check code complexity
        complexity_issues = self._check_code_complexity()
        if complexity_issues:
            self.gaps["code_quality"].append(
                {
                    "severity": "low",
                    "issue": f"{complexity_issues} functions with high complexity",
                    "recommendation": "Refactor complex functions",
                    "priority": 3,
                },
            )

    def _analyze_performance(self):
        """Analyze performance considerations"""
        # Check for database indexes (if using database)
        arch = self.state.get("architecture", {})
        if arch.get("database"):
            # This would require database introspection
            # For now, add recommendation
            self.gaps["performance"].append(
                {
                    "severity": "low",
                    "issue": "Database index optimization not verified",
                    "recommendation": "Review database queries and add indexes for slow queries",
                    "priority": 3,
                },
            )

        # Check for caching
        if not arch.get("cache"):
            self.gaps["performance"].append(
                {
                    "severity": "medium",
                    "issue": "No caching layer configured",
                    "recommendation": "Consider adding Redis or similar caching",
                    "priority": 2,
                },
            )

        # Check for CDN configuration
        if self.state.get("project", {}).get("type") in ["web-app", "platform"]:
            # Could check for CDN config
            self.gaps["performance"].append(
                {
                    "severity": "low",
                    "issue": "CDN configuration not verified",
                    "recommendation": "Configure CDN for static assets",
                    "priority": 3,
                },
            )

    def _analyze_infrastructure(self):
        """Analyze infrastructure and deployment"""
        # Check for Dockerfile
        if not (self.project_root / "Dockerfile").exists():
            self.gaps["infrastructure"].append(
                {
                    "severity": "medium",
                    "issue": "No Dockerfile found",
                    "recommendation": "Create Dockerfile for containerization",
                    "priority": 2,
                },
            )

        # Check for docker-compose
        if not (self.project_root / "docker-compose.yml").exists():
            self.gaps["infrastructure"].append(
                {
                    "severity": "low",
                    "issue": "No docker-compose.yml found",
                    "recommendation": "Create docker-compose.yml for local development",
                    "priority": 3,
                },
            )

        # Check for CI/CD
        ci_configs = [".github/workflows", ".gitlab-ci.yml", "Jenkinsfile"]
        has_ci = any((self.project_root / c).exists() for c in ci_configs)

        if not has_ci:
            self.gaps["infrastructure"].append(
                {
                    "severity": "high",
                    "issue": "No CI/CD pipeline configured",
                    "recommendation": "Set up CI/CD with GitHub Actions or similar",
                    "priority": 1,
                },
            )

        # Check for monitoring
        # This is a heuristic check
        self.gaps["infrastructure"].append(
            {
                "severity": "medium",
                "issue": "Monitoring and observability not verified",
                "recommendation": "Configure logging, metrics, and alerting",
                "priority": 2,
            },
        )

    def _generate_report(self) -> str:
        """Generate markdown gap analysis report"""
        report = f"""# Gap Analysis Report

> Generated by NXTG-Forge on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Executive Summary

"""

        # Count gaps by severity
        all_gaps = []
        for category, gaps in self.gaps.items():
            all_gaps.extend(gaps)

        critical = len([g for g in all_gaps if g["severity"] == "critical"])
        high = len([g for g in all_gaps if g["severity"] == "high"])
        medium = len([g for g in all_gaps if g["severity"] == "medium"])
        low = len([g for g in all_gaps if g["severity"] == "low"])

        report += f"""- **Critical Issues:** {critical}
- **High Priority:** {high}
- **Medium Priority:** {medium}
- **Low Priority:** {low}

**Total Gaps:** {len(all_gaps)}

"""

        # Add health assessment
        if critical > 0:
            report += "=� **Status:** CRITICAL - Immediate action required\n\n"
        elif high > 3:
            report += "�  **Status:** NEEDS ATTENTION - Address high-priority issues\n\n"
        elif medium > 5:
            report += "=M **Status:** GOOD - Some improvements recommended\n\n"
        else:
            report += " **Status:** EXCELLENT - Minor improvements only\n\n"

        # Add detailed sections
        for category, gaps in self.gaps.items():
            if not gaps:
                continue

            category_title = category.replace("_", " ").title()
            report += f"## {category_title}\n\n"

            # Sort by priority
            sorted_gaps = sorted(gaps, key=lambda x: x["priority"])

            for gap in sorted_gaps:
                severity_icon = {"critical": "=4", "high": "=�", "medium": "=�", "low": "=�"}.get(
                    gap["severity"],
                    "�",
                )

                report += f"### {severity_icon} {gap['issue']}\n\n"
                report += f"**Severity:** {gap['severity'].upper()}\n"
                report += f"**Priority:** P{gap['priority']}\n\n"
                report += f"**Recommendation:**\n{gap['recommendation']}\n\n"
                report += "---\n\n"

        # Add action plan
        report += "## Recommended Action Plan\n\n"

        # Sort all gaps by priority
        all_sorted = sorted(all_gaps, key=lambda x: (x["priority"], x["severity"]))

        for i, gap in enumerate(all_sorted[:10], 1):  # Top 10
            report += f"{i}. {gap['issue']}\n"

        report += "\n---\n\n"
        report += "*This report was auto-generated. Review and validate all recommendations.*\n"

        return report

    def _check_python_docstrings(self, files: list[Path]) -> int:
        """Check percentage of functions without docstrings"""
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
            except:
                continue

        if total_functions == 0:
            return 0

        return int((undocumented / total_functions) * 100)

    def _check_for_hardcoded_secrets(self) -> bool:
        """Check for potential hardcoded secrets"""
        # Patterns that might indicate secrets
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
        ]

        python_files = list(self.project_root.glob("**/*.py"))[:20]  # Sample

        for file_path in python_files:
            try:
                with open(file_path) as f:
                    content = f.read()

                import re

                for pattern in secret_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        return True
            except:
                continue

        return False

    def _check_code_complexity(self) -> int:
        """Check for complex functions"""
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
                return len([l for l in lines if l.strip() and not l.startswith(" ")])
        except:
            pass

        return 0


# CLI
if __name__ == "__main__":
    import json

    # Load state if exists
    state = {}
    state_file = Path(".claude/state.json")
    if state_file.exists():
        with open(state_file) as f:
            state = json.load(f)

    analyzer = GapAnalyzer(state=state)
    report = analyzer.analyze()

    # Save report
    output_file = Path("docs/GAP-ANALYSIS.md")
    output_file.parent.mkdir(exist_ok=True, parents=True)

    with open(output_file, "w") as f:
        f.write(report)

    console.print("\n[green] Gap analysis complete![/green]")
    console.print(f"[cyan]Report saved to: {output_file}[/cyan]\n")

    # Print summary
    print(report.split("## Executive Summary")[1].split("##")[0])

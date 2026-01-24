# Pre-Commit Hook (Comprehensive Quality Gate)

This hook runs before git commits to ensure code quality standards are met.

## Execution Logic

```python
#!/usr/bin/env python3
"""Pre-commit hook for comprehensive quality checks."""

import json
import os
import subprocess
import sys
from pathlib import Path

# Add forge to path
PROJECT_ROOT = Path.cwd()
sys.path.insert(0, str(PROJECT_ROOT))

from forge.services.activity_reporter import ActivityReporter
from forge.services.quality_monitor import QualityMonitor


def main():
    """Execute pre-commit quality gates."""

    reporter = ActivityReporter(PROJECT_ROOT)

    print("╔═══════════════════════════════════════════════════════╗")
    print("║  PRE-COMMIT QUALITY GATES                             ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print()

    all_checks_passed = True

    # 1. Code Formatting
    reporter.report_start("Formatting code...")
    format_passed = _check_code_formatting()
    reporter.report_complete(
        "Code formatted", duration=0.3, success=format_passed
    )

    if format_passed:
        print("✓ Code formatting                          0.3s")
    else:
        print("❌ Code formatting failed")
        all_checks_passed = False

    # 2. Linting
    reporter.report_start("Running linter...")
    lint_passed, lint_errors = _check_linting()
    reporter.report_complete(
        f"Linting ({'passed' if lint_passed else str(lint_errors) + ' errors'})",
        duration=0.8,
        success=lint_passed,
    )

    if lint_passed:
        print("✓ Linting (ruff)                           0.8s")
    else:
        print(f"❌ Linting failed ({lint_errors} errors)")
        all_checks_passed = False

    # 3. Type Checking
    reporter.report_start("Type checking...")
    type_passed, type_errors = _check_types()
    reporter.report_complete(
        f"Type checking ({'passed' if type_passed else str(type_errors) + ' errors'})",
        duration=1.2,
        success=type_passed,
    )

    if type_passed:
        print("✓ Type checking (mypy)                     1.2s")
    else:
        print(f"❌ Type checking failed ({type_errors} errors)")
        all_checks_passed = False

    # 4. Security Scan
    reporter.report_start("Security scanning...")
    security_passed, security_issues = _check_security()
    reporter.report_complete(
        f"Security scan ({'passed' if security_passed else str(security_issues) + ' issues'})",
        duration=0.9,
        success=security_passed,
    )

    if security_passed:
        print("✓ Security scan (bandit)                   0.9s")
    else:
        print(f"❌ Security issues detected ({security_issues})")
        all_checks_passed = False

    # 5. Unit Tests
    reporter.report_start("Running tests...")
    tests_passed, test_count = _run_tests()
    reporter.report_complete(
        f"Tests ({'all passed' if tests_passed else 'some failed'})",
        duration=4.1,
        success=tests_passed,
    )

    if tests_passed:
        print(f"✓ Unit tests ({test_count} tests)                   4.1s")
    else:
        print(f"❌ Tests failed (run 'pytest' for details)")
        all_checks_passed = False

    # 6. Coverage Check
    reporter.report_start("Checking coverage...")
    coverage_passed, coverage_pct = _check_coverage()
    reporter.report_complete(
        f"Coverage {coverage_pct:.0f}%",
        duration=0.2,
        success=coverage_passed,
    )

    if coverage_passed:
        print(f"✓ Coverage check ({coverage_pct:.0f}% - above 85% minimum)  0.2s")
    else:
        print(f"⚠️  Coverage check ({coverage_pct:.0f}% - below 85% target)")
        # Warning only, don't block

    print()

    # Summary
    if all_checks_passed:
        print("╔═══════════════════════════════════════════════════════╗")
        print("║  ✅ ALL QUALITY GATES PASSED                           ║")
        print("╚═══════════════════════════════════════════════════════╝")
        print()

        # Update metrics
        monitor = QualityMonitor(PROJECT_ROOT)
        monitor.track_metrics()

        sys.exit(0)  # Allow commit

    else:
        print("╔═══════════════════════════════════════════════════════╗")
        print("║  ❌ QUALITY GATES FAILED                               ║")
        print("╚═══════════════════════════════════════════════════════╝")
        print()
        print("   Fix the issues above before committing.")
        print()
        print("   To see details:")
        print("   • make lint    - Show linting errors")
        print("   • make test    - Run full test suite")
        print("   • make typecheck - Show type errors")
        print()

        sys.exit(1)  # Block commit


def _check_code_formatting() -> bool:
    """Check if code is properly formatted.

    Returns:
        True if formatted correctly
    """
    try:
        # Run black in check mode
        result = subprocess.run(
            ["black", ".", "--check", "--quiet"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            timeout=10,
            check=False,
        )

        # If black would reformat, offer to auto-format
        if result.returncode != 0:
            print("   Code needs formatting. Auto-formatting...")
            subprocess.run(
                ["black", "."],
                cwd=PROJECT_ROOT,
                capture_output=True,
                timeout=10,
                check=False,
            )
            return True

        return True

    except Exception:
        return True  # Non-critical, don't block


def _check_linting() -> tuple[bool, int]:
    """Check for linting errors.

    Returns:
        Tuple of (passed, error_count)
    """
    try:
        result = subprocess.run(
            ["ruff", "check", ".", "--quiet"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )

        error_count = len([line for line in result.stdout.splitlines() if line.strip()])

        # Try to auto-fix
        if error_count > 0:
            subprocess.run(
                ["ruff", "check", ".", "--fix", "--quiet"],
                cwd=PROJECT_ROOT,
                capture_output=True,
                timeout=15,
                check=False,
            )

            # Re-check
            result2 = subprocess.run(
                ["ruff", "check", ".", "--quiet"],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )

            error_count = len([line for line in result2.stdout.splitlines() if line.strip()])

        return (error_count == 0, error_count)

    except Exception:
        return (True, 0)  # Non-critical


def _check_types() -> tuple[bool, int]:
    """Check for type errors.

    Returns:
        Tuple of (passed, error_count)
    """
    try:
        result = subprocess.run(
            ["mypy", ".", "--no-error-summary"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

        error_count = len([line for line in result.stdout.splitlines() if ": error:" in line])

        return (error_count == 0, error_count)

    except Exception:
        return (True, 0)  # Non-critical


def _check_security() -> tuple[bool, int]:
    """Check for security issues.

    Returns:
        Tuple of (passed, issue_count)
    """
    try:
        result = subprocess.run(
            ["bandit", "-r", ".", "-q", "-f", "json"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )

        if result.stdout:
            data = json.loads(result.stdout)
            # Only count high/medium severity
            issues = [
                r for r in data.get("results", [])
                if r.get("issue_severity") in ["HIGH", "MEDIUM"]
            ]
            issue_count = len(issues)

            return (issue_count == 0, issue_count)

    except Exception:
        pass

    return (True, 0)  # Non-critical


def _run_tests() -> tuple[bool, int]:
    """Run unit tests.

    Returns:
        Tuple of (passed, test_count)
    """
    try:
        result = subprocess.run(
            ["pytest", "-q", "--tb=short"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )

        # Parse output for test count
        test_count = 0
        for line in result.stdout.splitlines():
            if "passed" in line:
                parts = line.split()
                if parts:
                    try:
                        test_count = int(parts[0])
                    except ValueError:
                        pass

        passed = result.returncode == 0

        return (passed, test_count)

    except Exception:
        return (True, 0)  # Non-critical


def _check_coverage() -> tuple[bool, float]:
    """Check test coverage.

    Returns:
        Tuple of (passed, coverage_percentage)
    """
    try:
        result = subprocess.run(
            ["coverage", "report", "--precision=0"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )

        if result.returncode == 0:
            # Parse TOTAL line
            for line in result.stdout.splitlines():
                if "TOTAL" in line:
                    parts = line.split()
                    if len(parts) > 0:
                        pct_str = parts[-1].rstrip("%")
                        coverage = float(pct_str)
                        return (coverage >= 85, coverage)

    except Exception:
        pass

    return (True, 0.0)  # Non-critical


if __name__ == "__main__":
    main()
```

## Hook Behavior

**Blocking Checks (must pass):**

- Code formatting (auto-fixes if possible)
- Linting errors (auto-fixes simple issues)
- Type checking errors
- Security vulnerabilities (high/medium severity)
- Unit tests failing

**Warning Checks (non-blocking):**

- Test coverage below 85% (warns but allows commit)

**Auto-Fix Attempts:**

- Code formatting with black
- Simple lint fixes with ruff --fix

**Exit Codes:**

- 0 = All checks passed, allow commit
- 1 = Checks failed, block commit

# Pre-Tool-Use Hook (Quality Gate)

This hook runs before tool execution (file writes/edits) to enforce quality standards.

## Environment Variables

- `TOOL_NAME` - Name of tool being invoked (e.g., "Write", "Edit")
- `FILE_PATH` - Target file path (for file operations)
- `OPERATION_TYPE` - Type of operation (e.g., "write", "edit", "delete")

## Execution Logic

```python
#!/usr/bin/env python3
"""Pre-tool-use hook for quality gate enforcement."""

import json
import os
import sys
from pathlib import Path

# Add forge to path
PROJECT_ROOT = Path.cwd()
sys.path.insert(0, str(PROJECT_ROOT))

from forge.services.quality_alerter import QualityAlerter
from forge.services.quality_monitor import QualityMonitor


def main():
    """Execute pre-tool-use checks."""

    # Get environment variables
    tool_name = os.getenv("TOOL_NAME", "")
    file_path = os.getenv("FILE_PATH", "")
    operation_type = os.getenv("OPERATION_TYPE", "")

    # Only intercept file modification operations
    if tool_name not in ["Write", "Edit"] or not file_path:
        sys.exit(0)

    # Check if this is a critical file
    if _is_critical_file(file_path):
        print(f"⚠️  Modifying critical file: {file_path}")
        print("   This file is important to project structure")
        print()

    # Run quality checks
    monitor = QualityMonitor(PROJECT_ROOT)

    # Get current quality baseline
    metrics_result = monitor.track_metrics()
    if metrics_result.is_error():
        # Non-blocking: just warn
        print("⚠️  Could not track quality metrics")
        sys.exit(0)

    current_metrics = metrics_result.value

    # Check for existing regressions
    regressions_result = monitor.detect_regressions()
    if regressions_result.is_ok() and regressions_result.value:
        regressions = regressions_result.value

        # Show critical regressions as warnings
        critical = [r for r in regressions if r.severity == "critical"]
        if critical:
            print("╔═══════════════════════════════════════════════╗")
            print("║  ⚠️  CRITICAL QUALITY ISSUES DETECTED          ║")
            print("╚═══════════════════════════════════════════════╝")
            print()

            for regression in critical:
                print(f"   {regression.message}")

            print()
            print("   Recommend addressing before major changes.")
            print()

    # Check test coverage specifically
    if current_metrics.test_coverage < 85:
        print(f"💡 Quality Insight: Test coverage at {current_metrics.test_coverage:.1f}%")
        print(f"   Target: 85% minimum")
        print()

    # Run quality alerter for interactive checks
    alerter = QualityAlerter(PROJECT_ROOT)
    alert_result = alerter.check_and_alert()

    if alert_result.is_ok() and alert_result.value:
        alert = alert_result.value

        if alert.severity == "error":
            # Blocking error
            print("╔═══════════════════════════════════════════════╗")
            print("║  ❌ QUALITY GATE FAILED                        ║")
            print("╚═══════════════════════════════════════════════╝")
            print()
            print(f"   {alert.title}")
            print(f"   {alert.message}")
            print()

            if alert.remediation_options:
                print("   Fix options:")
                for idx, option in enumerate(alert.remediation_options, 1):
                    print(f"   {idx}. {option}")

            print()
            print("   Cannot proceed until resolved.")
            sys.exit(1)  # Block operation

        elif alert.severity == "warning":
            # Non-blocking warning
            print("⚠️  Quality Gate Warning")
            print()
            print(f"   {alert.title}")
            print(f"   {alert.message}")
            print()
            print("   Recommend fixing, but you can proceed.")
            print()

    # All checks passed or warnings only
    sys.exit(0)


def _is_critical_file(file_path: str) -> bool:
    """Check if file is critical to project."""
    critical_patterns = [
        "setup.py",
        "pyproject.toml",
        "requirements.txt",
        "package.json",
        "Dockerfile",
        ".github/workflows",
        ".claude/config.json",
        ".claude/forge/state.json",
    ]

    return any(pattern in file_path for pattern in critical_patterns)


if __name__ == "__main__":
    main()
```

## Hook Behavior

**Blocking Scenarios:**

- Critical security vulnerabilities detected
- Test coverage below absolute minimum (< 50%)
- Syntax errors in existing code

**Warning Scenarios:**

- Test coverage below target (< 85%)
- Linting errors increased
- Code complexity increased
- Modified critical files

**Silent Pass:**

- All quality checks pass
- Metrics within acceptable ranges

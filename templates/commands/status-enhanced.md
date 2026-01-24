---
description: "Enhanced status display with real-time dashboard (Phase 3)"
---

# NXTG-Forge Enhanced Status

You are the **Enhanced Status Reporter** - show comprehensive project state with rich visualizations and metrics.

## Import Dashboard Service

```python
from pathlib import Path
from forge.services import DashboardService, AnalyticsService
from forge.utils import create_bar_chart, create_sparkline, render_trend

dashboard = DashboardService(Path.cwd())
analytics = AnalyticsService(Path.cwd())
```

## Get Dashboard Data

```python
# Get comprehensive dashboard data
dashboard_result = dashboard.get_dashboard_data()
if dashboard_result.is_error():
    print(f"Error loading dashboard: {dashboard_result.error.message}")
    exit(1)

data = dashboard_result.value
```

## Display Enhanced Status

```
╔════════════════════════════════════════════════════════════════════╗
║                 NXTG-FORGE PROJECT DASHBOARD                       ║
║                   {timestamp}                                      ║
╚════════════════════════════════════════════════════════════════════╝

┌─ HEALTH SCORE ──────────────────────────────────────────────────────┐
│                                                                      │
│   Score: {health_score}/100 {trend_indicator}                       │
│   Status: {health_trend}                                            │
│                                                                      │
│   {health_score_bar_chart}                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─ ACTIVE WORKFLOWS ──────────────────────────────────────────────────┐
│                                                                      │
│   {list_active_workflows or "No active workflows"}                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─ QUALITY METRICS ───────────────────────────────────────────────────┐
│                                                                      │
│   {quality_metrics_bar_chart}                                       │
│                                                                      │
│   Test Coverage:    {coverage}% {sparkline}                         │
│   Test Pass Rate:   {pass_rate}% {trend}                            │
│   Health Score:     {health}/100 {trend}                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─ RECENT ACTIVITY ───────────────────────────────────────────────────┐
│                                                                      │
│   Commits (last 5):                                                 │
│   {list_recent_commits}                                             │
│                                                                      │
│   Agent Activity:                                                   │
│   {list_agent_activity}                                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─ CHECKPOINTS ───────────────────────────────────────────────────────┐
│                                                                      │
│   {list_recent_checkpoints}                                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌─ RECOMMENDATIONS ───────────────────────────────────────────────────┐
│                                                                      │
│   {list_recommendations}                                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════

💡 Quick Actions:
   Continue work:        /enable-forge → Continue
   View analytics:       /status --analytics
   Export metrics:       /status --export json|markdown|csv
   Compare periods:      /status --compare "7 days" "30 days"

📊 Advanced Views:
   Full dashboard:       /status --dashboard
   Trend analysis:       /status --trends
   Technology insights:  /status --tech

═══════════════════════════════════════════════════════════════════════
```

## Command-Line Arguments

Parse additional arguments for enhanced views:

**`/status --dashboard`**

- Show full dashboard with all charts and visualizations
- Uses `dashboard.generate_text_charts()`

**`/status --analytics`**

- Show analytics report with pattern detection
- Uses `analytics.generate_analytics_report()`

**`/status --trends`**

- Show quality trend predictions
- Uses `analytics.predict_quality_trends()`

**`/status --tech`**

- Show technology usage analysis
- Uses `analytics.analyze_technology_usage()`

**`/status --export <format>`**

- Export in JSON, Markdown, Text, or CSV
- Uses `dashboard.export_metrics(ExportFormat.<format>)`

**`/status --compare <period1> <period2>`**

- Compare metrics between two periods
- Example: `/status --compare "last 7 days" "previous 7 days"`
- Uses `dashboard.compare_periods()`

## Implementation Examples

### Show Dashboard with Charts

```python
# Get metrics
metrics = list(data.quality_metrics.values())

# Generate text charts
charts = dashboard.generate_text_charts(metrics)
print(charts)
```

### Show Analytics Report

```python
# Generate analytics
report_result = analytics.generate_analytics_report()
if report_result.is_ok():
    report = report_result.value

    print("\n┌─ WORKFLOW PATTERNS ─────────────────────────────┐")
    for pattern in report.workflow_patterns:
        print(f"│  • {pattern.description}")
        print(f"│    Confidence: {pattern.confidence:.0%}")
        if pattern.recommendation:
            print(f"│    💡 {pattern.recommendation}")
    print("└─────────────────────────────────────────────────┘")

    if report.productivity_metrics:
        pm = report.productivity_metrics
        print("\n┌─ PRODUCTIVITY METRICS ──────────────────────────┐")
        print(f"│  Commits/day:      {pm.commits_per_day:.1f}")
        print(f"│  Avg commit size:  {pm.avg_commit_size:.0f} lines")
        print(f"│  Test ratio:       {pm.test_to_code_ratio:.1%}")
        print(f"│  Feature velocity: {pm.feature_velocity:.1f}/week")
        print(f"│  Focus time:       {pm.focus_time_percentage:.0f}%")
        print("└─────────────────────────────────────────────────┘")

    if report.quality_predictions:
        print("\n┌─ QUALITY PREDICTIONS (7 days) ─────────────────┐")
        for pred in report.quality_predictions:
            trend_icon = "↑" if pred.trend == "improving" else "↓" if pred.trend == "declining" else "→"
            print(f"│  {pred.metric_name}:")
            print(f"│    Current:  {pred.current_value:.1f}")
            print(f"│    Predicted: {pred.predicted_value_7d:.1f} {trend_icon}")
            print(f"│    Confidence: {pred.confidence:.0%}")
        print("└─────────────────────────────────────────────────┘")
```

### Export Metrics

```python
# Export to different formats
export_result = dashboard.export_metrics(ExportFormat.JSON)
if export_result.is_ok():
    print(export_result.value)
```

### Compare Periods

```python
from datetime import datetime, timedelta
from forge.services.dashboard_service import DateRange

# Define periods
now = datetime.utcnow()
period1 = DateRange(
    start=now - timedelta(days=14),
    end=now - timedelta(days=7)
)
period2 = DateRange(
    start=now - timedelta(days=7),
    end=now
)

# Compare
comparison_result = dashboard.compare_periods(period1, period2)
if comparison_result.is_ok():
    comp = comparison_result.value

    print(f"\n┌─ PERIOD COMPARISON ─────────────────────────────┐")
    print(f"│  Summary: {comp.summary}")
    print(f"│")

    if comp.improvements:
        print(f"│  Improvements:")
        for improvement in comp.improvements:
            print(f"│    ✓ {improvement}")

    if comp.regressions:
        print(f"│  Regressions:")
        for regression in comp.regressions:
            print(f"│    ⚠ {regression}")

    print("└─────────────────────────────────────────────────┘")
```

## Integration with Morning Report

If overnight session detected, show session report first:

```python
from forge.services import SessionReporter

reporter = SessionReporter(Path.cwd())

# Check for morning report
should_show_result = reporter.should_display_report_on_startup()
if should_show_result.unwrap_or(False):
    # Get last session ID from state
    with open(".claude/forge/state.json") as f:
        state = json.load(f)
    session_id = state.get("last_session", {}).get("id")

    if session_id:
        report_result = reporter.generate_session_report(session_id)
        if report_result.is_ok():
            print(reporter.format_report(report_result.value))
            print("\n" + "═" * 60 + "\n")

# Then show regular status
# (continue with dashboard display)
```

## Overnight Activity Detection

Detect if work happened overnight and show summary:

```python
# Check if last commit was > 4 hours ago
import subprocess
result = subprocess.run(
    ["git", "log", "-1", "--format=%ar"],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    time_ago = result.stdout.strip()

    if "hours ago" in time_ago:
        hours = int(time_ago.split()[0])
        if hours >= 4:
            print("╭─ OVERNIGHT ACTIVITY DETECTED ────────────────────╮")
            print("│                                                   │")
            print("│  Work continued while you were away!              │")
            print("│  Generating summary of changes...                │")
            print("│                                                   │")
            print("╰───────────────────────────────────────────────────╯\n")

            # Show session report
            # (as shown above)
```

## Error Handling

All operations use Result types for explicit error handling:

```python
# Pattern: Check for errors and provide fallbacks
dashboard_result = dashboard.get_dashboard_data()
if dashboard_result.is_error():
    print(f"⚠️  Unable to load dashboard: {dashboard_result.error.message}")
    print("   Falling back to basic status...")
    # Show basic status from state.json
    exit(0)  # Don't fail, degrade gracefully
```

## Performance Targets

- Dashboard load: < 500ms
- Chart generation: < 100ms
- Analytics report: < 1s
- Export operations: < 200ms

All operations should be fast enough for interactive use.

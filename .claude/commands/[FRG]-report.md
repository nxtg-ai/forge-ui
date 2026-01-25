---
description: "Display comprehensive session activity report"
---

# Session Activity Report

You are generating a **comprehensive session activity report** following UX-SPECIFICATION-FINAL.md Part VII standards.

## Load Required Services

First, import the SessionReporter service:

```python
from forge.services.session_reporter import SessionReporter
from pathlib import Path

# Initialize reporter
reporter = SessionReporter(project_root=Path.cwd())
```

## Parse Arguments

Arguments received: `$ARGUMENTS`

Options:

- `--brief` or `-b`: Show brief summary only (auto-display format)
- `--full` or `-f`: Show full detailed report (default)
- `--format=json`: Output as JSON instead of formatted text
- `--since=<datetime>`: Show activity since specific time (ISO format)

## Generate Report

### For Brief Summary

```python
# Generate brief summary (Part VII: Brief Summary format)
result = reporter.generate_brief_summary()

if result.is_ok():
    summary = result.value
    print(summary)
else:
    print(f"❌ Failed to generate report: {result.error.message}")
    exit(1)
```

Expected output format:

```
✅ NXTG-FORGE-ENABLED

╔═══════════════════════════════════════════════════════╗
║  📊 OVERNIGHT SESSION COMPLETED                       ║
╚═══════════════════════════════════════════════════════╝

Feature: {Feature Name}
Commits: {count} | Tests: +{count} | Coverage: {before}% → {after}%
PR #{number}: ✅ Ready for review (all checks passing)

View full report? Type /report or press Enter to continue
```

### For Full Report

```python
# Generate comprehensive report (Part VII: Full Report format)
result = reporter.generate_full_report()

if result.is_ok():
    report = result.value
    print(report)
else:
    print(f"❌ Failed to generate report: {result.error.message}")
    exit(1)
```

Expected output format:

```
╔═══════════════════════════════════════════════════════╗
║  OVERNIGHT ACTIVITY REPORT                            ║
║  Session: {start_time} - {end_time}                   ║
╚═══════════════════════════════════════════════════════╝

📊 SESSION SUMMARY
   Duration: {duration}
   Commits: {count}
   Files changed: {count}
   Tests added: {count}
   Coverage: {before}% → {after}% (+{delta}%)
   Health Score: {before} → {after} (+{delta})

🔗 GIT ACTIVITY
   Branch: {branch_name}

   Commits created:
   • {hash} {message}
   • {hash} {message}
   [...]

   📈 All commits pushed to: {remote}/{branch}

   🔍 View commits:
      {github_url}

📝 PULL REQUEST CREATED
   #{number}: {title}

   Status: ✅ All checks passing
   • CI/CD pipeline: ✓ Passed ({duration})
   • Security scan: ✓ No issues
   • Code review bot: ✓ Approved (high quality)
   • Test coverage: ✓ {percentage}% (above {threshold}% threshold)

   Ready for human review

   🔍 View PR: {pr_url}

🎯 QUALITY IMPROVEMENTS
   • Security score: {before} → {after} (+{delta})
   • Code smells: {before} → {after} ({delta})
   • Technical debt: {before}h → {after}h ({delta}h)

🔖 CHECKPOINTS CREATED
   • {checkpoint_id} - {description}
   • {checkpoint_id} - {description}

💡 RECOMMENDED NEXT STEPS
   1. {Next action 1}
   2. {Next action 2}
   3. {Next action 3}

📍 AUDIT TRAIL
   Session log: {path_to_session_json}
   All actions are fully documented and reversible

[Continue Working] [Create New Feature] [Health Check]
```

## JSON Output Format

If `--format=json` specified:

```python
result = reporter.generate_report_json()

if result.is_ok():
    import json
    print(json.dumps(result.value, indent=2))
else:
    print(json.dumps({
        "error": result.error.message,
        "detail": result.error.detail
    }))
    exit(1)
```

JSON structure:

```json
{
  "session": {
    "start_time": "2026-01-08T09:00:00Z",
    "end_time": "2026-01-08T17:30:00Z",
    "duration_hours": 8.5
  },
  "summary": {
    "commits": 12,
    "files_changed": 45,
    "tests_added": 23,
    "coverage_before": 78.5,
    "coverage_after": 85.2,
    "coverage_delta": 6.7
  },
  "git_activity": {
    "branch": "feature/auth-system",
    "commits": [
      {
        "hash": "abc123",
        "message": "feat: add JWT authentication",
        "timestamp": "2026-01-08T10:30:00Z"
      }
    ],
    "remote_url": "https://github.com/user/repo"
  },
  "pull_requests": [
    {
      "number": 42,
      "title": "Add authentication system",
      "url": "https://github.com/user/repo/pull/42",
      "status": "passing",
      "checks": {
        "ci_cd": "passed",
        "security": "passed",
        "coverage": "passed"
      }
    }
  ],
  "quality": {
    "security_score_before": 85,
    "security_score_after": 92,
    "code_smells_before": 15,
    "code_smells_after": 8,
    "tech_debt_hours_before": 24.5,
    "tech_debt_hours_after": 18.2
  },
  "checkpoints": [
    {
      "id": "cp-2026-01-08-001",
      "description": "Auth system baseline"
    }
  ],
  "recommendations": [
    "Review PR #42 for final approval",
    "Add integration tests for OAuth flow",
    "Update API documentation"
  ]
}
```

## Error Handling

If report generation fails:

```
❌ Session Report Failed

What happened:
   Could not generate session activity report.

Why it happened:
   {error_detail}

How to fix:
   1. Check if state file exists: ls .claude/forge/state.json
   2. Verify git repository: git status
   3. Try brief report: /report --brief
   4. Re-initialize if needed: /init --upgrade

Need help? Try:
   • /soundboard - Discuss troubleshooting
   • GitHub: {issue_tracker_url}
```

## Interactive Options

After displaying full report, present action options:

```
What would you like to do next?

1. Continue Working
   → Resume current feature development

2. Create New Feature
   → Start fresh feature with /feature

3. Health Check
   → Run comprehensive quality analysis

4. View Git Activity
   → Show detailed git log and diffs

Your choice [1-4]:
```

## Implementation Notes

- Use SessionReporter service for all report generation
- Follow UX-SPECIFICATION-FINAL.md Part VII formatting exactly
- Ensure all data comes from state.json and git history
- Include audit trail for transparency
- Make reports machine-readable (JSON) and human-friendly (formatted)
- Cache report data for 5 minutes to avoid redundant git queries

## Success Criteria

Report is successful when:

- ✅ Displays all session activity accurately
- ✅ Follows canonical UX format exactly
- ✅ Git data matches actual repository state
- ✅ Quality metrics are current and accurate
- ✅ Recommendations are actionable and prioritized
- ✅ JSON output is valid and complete
- ✅ Interactive options work correctly

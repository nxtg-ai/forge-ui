"""Session Reporter Service for morning reports.

This service generates comprehensive session reports that provide
"morning-after confidence" by showing everything that happened during
an overnight work session.

Supports multiple report formats, filtering, and output formats.
"""

import json
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result, StateError


class ReportFormat(Enum):
    """Report detail level."""

    BRIEF = "brief"  # 3-line summary
    DETAILED = "detailed"  # Full report with sections
    DAILY = "daily"  # Daily summary
    WEEKLY = "weekly"  # Weekly summary
    PROJECT_HEALTH = "project_health"  # Quality focus
    AGENT_ACTIVITY = "agent_activity"  # Agent focus


class OutputFormat(Enum):
    """Report output format."""

    TEXT = "text"  # Terminal formatted
    MARKDOWN = "markdown"  # Markdown file
    JSON = "json"  # Structured data


class ActivityType(Enum):
    """Type of activity."""

    COMMIT = "commit"
    PR = "pr"
    CHECKPOINT = "checkpoint"
    QUALITY = "quality"
    ALL = "all"


@dataclass
class DateRange:
    """Date range for filtering."""

    start: datetime
    end: datetime


@dataclass
class CommitInfo:
    """Information about a commit."""

    hash: str
    message: str
    timestamp: str
    files_changed: int
    lines_added: int
    lines_removed: int


@dataclass
class PRInfo:
    """Information about a pull request."""

    number: int
    title: str
    url: str
    status: str  # "open", "merged", "closed"
    checks_passing: bool
    ci_status: str | None = None


@dataclass
class QualityMetrics:
    """Quality metrics for before/after comparison."""

    health_score: int
    test_coverage: float
    tests_passing: int
    tests_total: int
    security_issues: int
    linting_errors: int


@dataclass
class CheckpointInfo:
    """Information about a checkpoint."""

    id: str
    description: str
    commit_hash: str
    created_at: str


@dataclass
class SessionReport:
    """Complete session report."""

    session_id: str
    start_time: str
    end_time: str
    duration_seconds: int
    feature_name: str | None
    branch: str
    commits: list[CommitInfo] = field(default_factory=list)
    files_changed: int = 0
    lines_added: int = 0
    lines_removed: int = 0
    tests_added: int = 0
    pr_info: PRInfo | None = None
    quality_before: QualityMetrics | None = None
    quality_after: QualityMetrics | None = None
    checkpoints: list[CheckpointInfo] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


class SessionReporter:
    """Service for generating comprehensive session reports."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize session reporter.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.sessions_dir = self.project_root / ".claude" / "forge" / "sessions"
        self.state_file = self.project_root / ".claude" / "forge" / "state.json"

        # Ensure directory exists
        self.sessions_dir.mkdir(parents=True, exist_ok=True)

    def generate_session_report(self, session_id: str) -> Result[SessionReport, StateError]:
        """Generate comprehensive report from session log.

        Args:
            session_id: Session identifier

        Returns:
            Result containing SessionReport or StateError
        """
        # Load session data
        session_file = self.sessions_dir / f"{session_id}.json"
        if not session_file.exists():
            return Err(StateError.load_failed(f"Session file not found: {session_id}"))

        try:
            with open(session_file, encoding="utf-8") as f:
                session_data: dict[str, Any] = json.load(f)
        except Exception as e:
            return Err(StateError.load_failed(f"Failed to load session: {e}"))

        # Extract basic info
        start_time = session_data.get("start_time", "")
        end_time = session_data.get("end_time", "")
        feature_name = session_data.get("feature_name")
        branch = session_data.get("branch", "main")

        # Calculate duration
        duration_seconds = self._calculate_duration(start_time, end_time)

        # Get commits during session
        commits = self._get_session_commits(start_time, end_time)

        # Aggregate file statistics
        files_changed = sum(c.files_changed for c in commits)
        lines_added = sum(c.lines_added for c in commits)
        lines_removed = sum(c.lines_removed for c in commits)

        # Get PR info if created
        pr_info = self._get_pr_info(session_data.get("pr_number"))

        # Get quality metrics
        quality_before = self._parse_quality_metrics(session_data.get("quality_snapshot_before"))
        quality_after = self._get_current_quality_metrics()

        # Get checkpoints created during session
        checkpoints = self._get_session_checkpoints(session_data.get("checkpoints", []))

        # Generate recommendations
        recommendations = self._generate_recommendations(quality_before, quality_after, commits)

        report = SessionReport(
            session_id=session_id,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration_seconds,
            feature_name=feature_name,
            branch=branch,
            commits=commits,
            files_changed=files_changed,
            lines_added=lines_added,
            lines_removed=lines_removed,
            pr_info=pr_info,
            quality_before=quality_before,
            quality_after=quality_after,
            checkpoints=checkpoints,
            recommendations=recommendations,
        )

        return Ok(report)

    def should_display_report_on_startup(self) -> Result[bool, StateError]:
        """Check if there's a recent completed session to report.

        Returns:
            Result containing boolean indicating if report should be shown
        """
        # Get last session from state
        if not self.state_file.exists():
            return Ok(False)

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state = json.load(f)

            last_session = state.get("last_session", {})
            session_id = last_session.get("id")
            status = last_session.get("status")

            if not session_id or status != "complete":
                return Ok(False)

            # Check if session completed recently (< 24 hours ago)
            session_file = self.sessions_dir / f"{session_id}.json"
            if not session_file.exists():
                return Ok(False)

            with open(session_file, encoding="utf-8") as f:
                session_data = json.load(f)

            end_time_str = session_data.get("end_time")
            if not end_time_str:
                return Ok(False)

            end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
            now = datetime.now(end_time.tzinfo)
            hours_ago = (now - end_time).total_seconds() / 3600

            return Ok(hours_ago < 24)

        except Exception as e:
            return Err(StateError.load_failed(f"Failed to check for report: {e}"))

    def generate_report(
        self,
        session_id: str,
        format: ReportFormat = ReportFormat.DETAILED,
        output_format: OutputFormat = OutputFormat.TEXT,
    ) -> Result[str, StateError]:
        """Generate session report with specified format and output.

        Args:
            session_id: Session identifier
            format: Report detail level
            output_format: Output format (text, markdown, json)

        Returns:
            Result containing formatted report string or StateError
        """
        # Get session report
        report_result = self.generate_session_report(session_id)
        if report_result.is_error():
            return report_result.map(lambda _: "")

        report = report_result.value

        # Format based on report format
        if format == ReportFormat.BRIEF:
            content = self._format_brief(report)
        elif format == ReportFormat.DAILY:
            content = self._format_daily(report)
        elif format == ReportFormat.WEEKLY:
            content = self._format_weekly(report)
        elif format == ReportFormat.PROJECT_HEALTH:
            content = self._format_project_health(report)
        elif format == ReportFormat.AGENT_ACTIVITY:
            content = self._format_agent_activity(report)
        else:  # DETAILED
            content = self.format_report(report)

        # Convert to output format
        if output_format == OutputFormat.MARKDOWN:
            return Ok(self._to_markdown(content, report))
        elif output_format == OutputFormat.JSON:
            return Ok(self._to_json(report))
        else:  # TEXT
            return Ok(content)

    def generate_filtered_report(
        self,
        date_range: DateRange | None = None,
        agent_filter: list[str] | None = None,
        activity_type: ActivityType | None = None,
    ) -> Result[str, StateError]:
        """Generate filtered report across multiple sessions.

        Args:
            date_range: Optional date range filter
            agent_filter: Optional list of agent names to filter by
            activity_type: Optional activity type filter

        Returns:
            Result containing filtered report or StateError
        """
        # Get all sessions in date range
        sessions = self._get_sessions_in_range(date_range)
        if not sessions:
            return Ok("No sessions found in the specified range.")

        # Aggregate data across sessions
        total_commits = 0
        total_files = 0
        total_lines_added = 0
        total_lines_removed = 0
        all_checkpoints = []
        quality_changes = []

        for session_id in sessions:
            report_result = self.generate_session_report(session_id)
            if report_result.is_ok():
                report = report_result.value

                # Apply filters
                if activity_type and activity_type != ActivityType.ALL:
                    if activity_type == ActivityType.COMMIT:
                        total_commits += len(report.commits)
                    elif activity_type == ActivityType.CHECKPOINT:
                        all_checkpoints.extend(report.checkpoints)
                    continue

                # Aggregate all
                total_commits += len(report.commits)
                total_files += report.files_changed
                total_lines_added += report.lines_added
                total_lines_removed += report.lines_removed
                all_checkpoints.extend(report.checkpoints)

                if report.quality_before and report.quality_after:
                    quality_changes.append(
                        (
                            report.quality_before.health_score,
                            report.quality_after.health_score,
                        ),
                    )

        # Format aggregated report
        lines = [
            "╔═══════════════════════════════════════════════════════╗",
            "║  FILTERED ACTIVITY REPORT                             ║",
            "╚═══════════════════════════════════════════════════════╝",
            "",
            f"📊 AGGREGATE METRICS ({len(sessions)} sessions)",
            f"   Total commits: {total_commits}",
            f"   Files changed: {total_files}",
            f"   Lines: +{total_lines_added}, -{total_lines_removed}",
            f"   Checkpoints: {len(all_checkpoints)}",
        ]

        if quality_changes:
            avg_before = sum(q[0] for q in quality_changes) / len(quality_changes)
            avg_after = sum(q[1] for q in quality_changes) / len(quality_changes)
            delta = avg_after - avg_before
            lines.append(f"   Health: {avg_before:.0f} → {avg_after:.0f} ({delta:+.0f})")

        return Ok("\n".join(lines))

    def format_report(self, report: SessionReport) -> str:
        """Format session report for display.

        Args:
            report: SessionReport to format

        Returns:
            Formatted report string
        """
        lines = [
            "╔═══════════════════════════════════════════════════════╗",
            "║  OVERNIGHT ACTIVITY REPORT                            ║",
            f"║  Session: {report.start_time} - {report.end_time}".ljust(57) + "║",
            "╚═══════════════════════════════════════════════════════╝",
            "",
            "📊 SESSION SUMMARY",
            f"   Duration: {self._format_duration(report.duration_seconds)}",
            f"   Commits: {len(report.commits)}",
            f"   Files changed: {report.files_changed}",
            f"   Lines: +{report.lines_added}, -{report.lines_removed}",
        ]

        if report.quality_before and report.quality_after:
            cov_before = report.quality_before.test_coverage
            cov_after = report.quality_after.test_coverage
            cov_delta = cov_after - cov_before
            lines.append(f"   Coverage: {cov_before:.0f}% → {cov_after:.0f}% ({cov_delta:+.0f}%)")

        lines.extend(
            [
                "",
                "─────────────────────────────────────────────────────────",
                "",
                "🔗 GIT ACTIVITY",
                f"   Branch: {report.branch}",
                "",
                "   Commits created:",
            ],
        )

        for commit in report.commits[:10]:  # Limit to 10 commits
            lines.append(f"   • {commit.hash[:7]} {commit.message}")
            lines.append(f"     {commit.timestamp}")

        if report.pr_info:
            lines.extend(
                [
                    "",
                    "   🔍 View commits:",
                    f"      {self._get_github_commits_url(report.branch)}",
                    "",
                    "─────────────────────────────────────────────────────────",
                    "",
                    "📝 PULL REQUEST CREATED",
                    f"   #{report.pr_info.number}: {report.pr_info.title}",
                    "",
                    f"   Status: {'✅' if report.pr_info.checks_passing else '⚠️'} {report.pr_info.status.capitalize()}",
                ],
            )

            if report.pr_info.checks_passing:
                lines.append("   • All CI checks passing")
                lines.append("   • Ready for human review")

            lines.extend(
                [
                    "",
                    f"   🔍 View PR: {report.pr_info.url}",
                ],
            )

        if report.quality_before and report.quality_after:
            lines.extend(
                [
                    "",
                    "─────────────────────────────────────────────────────────",
                    "",
                    "📈 QUALITY IMPROVEMENTS",
                    "",
                    f"   Health Score: {report.quality_before.health_score} → {report.quality_after.health_score} "
                    f"({report.quality_after.health_score - report.quality_before.health_score:+d})",
                ],
            )

        if report.checkpoints:
            lines.extend(
                [
                    "",
                    "─────────────────────────────────────────────────────────",
                    "",
                    "🔖 CHECKPOINTS CREATED",
                    "",
                ],
            )

            for cp in report.checkpoints:
                lines.append(f"   • {cp.id}")
                lines.append(f"     {cp.description}")
                lines.append(f"     Restore: forge checkpoint restore {cp.id}")

        # Add rollback instructions if commits were created
        if report.commits:
            lines.extend(
                [
                    "",
                    "─────────────────────────────────────────────────────────",
                    "",
                    "🔄 ROLLBACK OPTIONS (if needed)",
                    "",
                    "   To undo the last commit (keep changes):",
                    "      git reset --soft HEAD~1",
                    "",
                    "   To completely remove all session changes:",
                    f"      git reset --hard {report.commits[0].hash[:7]}~1",
                    "",
                    "   To restore from checkpoint:",
                    "      forge checkpoint restore <checkpoint-id>",
                ],
            )

        if report.recommendations:
            lines.extend(
                [
                    "",
                    "─────────────────────────────────────────────────────────",
                    "",
                    "💡 RECOMMENDED NEXT STEPS",
                    "",
                ],
            )

            for idx, rec in enumerate(report.recommendations, 1):
                lines.append(f"   {idx}. {rec}")

        lines.extend(
            [
                "",
                "─────────────────────────────────────────────────────────",
                "",
                "Everything completed successfully. What would you like to do next?",
                "",
                "Type /enable-forge to continue with orchestrator menu",
            ],
        )

        return "\n".join(lines)

    def _calculate_duration(self, start_time: str, end_time: str) -> int:
        """Calculate duration in seconds.

        Args:
            start_time: ISO format start time
            end_time: ISO format end time

        Returns:
            Duration in seconds
        """
        try:
            start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
            return int((end - start).total_seconds())
        except Exception:
            return 0

    def _format_duration(self, seconds: int) -> str:
        """Format duration as human-readable string.

        Args:
            seconds: Duration in seconds

        Returns:
            Formatted string (e.g., "4h 45m")
        """
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"

    def _get_session_commits(self, start_time: str, end_time: str) -> list[CommitInfo]:
        """Get commits created during session.

        Args:
            start_time: Session start time
            end_time: Session end time

        Returns:
            List of CommitInfo objects
        """
        try:
            # Get commits in time range
            result = subprocess.run(
                [
                    "git",
                    "log",
                    f"--since={start_time}",
                    f"--until={end_time}",
                    "--format=%H|%s|%ar",
                    "--shortstat",
                ],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                return []

            commits: list[CommitInfo] = []
            lines = result.stdout.splitlines()

            i = 0
            while i < len(lines):
                if "|" in lines[i]:
                    parts = lines[i].split("|")
                    commit_hash = parts[0]
                    message = parts[1]
                    timestamp = parts[2]

                    # Next line might have stats
                    files_changed = 0
                    lines_added = 0
                    lines_removed = 0

                    if i + 1 < len(lines) and "changed" in lines[i + 1]:
                        stats = lines[i + 1]
                        if "file" in stats:
                            files_changed = int(stats.split()[0])
                        if "insertion" in stats:
                            lines_added = int(stats.split("insertion")[0].split()[-1].strip(","))
                        if "deletion" in stats:
                            lines_removed = int(stats.split("deletion")[0].split()[-1].strip(","))
                        i += 1

                    commits.append(
                        CommitInfo(
                            hash=commit_hash,
                            message=message,
                            timestamp=timestamp,
                            files_changed=files_changed,
                            lines_added=lines_added,
                            lines_removed=lines_removed,
                        ),
                    )

                i += 1

            return commits

        except Exception:
            return []

    def _get_pr_info(self, pr_number: int | None) -> PRInfo | None:
        """Get pull request information.

        Args:
            pr_number: PR number

        Returns:
            PRInfo object or None
        """
        if not pr_number:
            return None

        try:
            # Use gh CLI to get PR info
            result = subprocess.run(
                ["gh", "pr", "view", str(pr_number), "--json", "title,url,state,statusCheckRollup"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode == 0:
                data = json.loads(result.stdout)
                checks_passing = all(
                    check.get("conclusion") == "SUCCESS"
                    for check in data.get("statusCheckRollup", [])
                )

                return PRInfo(
                    number=pr_number,
                    title=data.get("title", ""),
                    url=data.get("url", ""),
                    status=data.get("state", "open").lower(),
                    checks_passing=checks_passing,
                )

            return None
        except Exception:
            return None

    def _parse_quality_metrics(self, metrics_data: dict[str, Any] | None) -> QualityMetrics | None:
        """Parse quality metrics from data.

        Args:
            metrics_data: Quality metrics dictionary

        Returns:
            QualityMetrics object or None
        """
        if not metrics_data:
            return None

        return QualityMetrics(
            health_score=metrics_data.get("health_score", 0),
            test_coverage=metrics_data.get("test_coverage", 0.0),
            tests_passing=metrics_data.get("tests_passing", 0),
            tests_total=metrics_data.get("tests_total", 0),
            security_issues=metrics_data.get("security_issues", 0),
            linting_errors=metrics_data.get("linting_errors", 0),
        )

    def _get_current_quality_metrics(self) -> QualityMetrics | None:
        """Get current quality metrics.

        Returns:
            QualityMetrics object or None
        """
        if not self.state_file.exists():
            return None

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state = json.load(f)

            quality = state.get("quality", {})
            tests = quality.get("tests", {})

            unit = tests.get("unit", {})
            coverage = unit.get("coverage", 0)
            passing = unit.get("passing", 0)
            total = unit.get("total", 0)

            security = quality.get("security", {}).get("vulnerabilities", {})
            security_issues = sum(security.values())

            linting = quality.get("linting", {})
            linting_errors = linting.get("issues", 0)

            # Calculate health score (simplified)
            health_score = min(100, int(coverage + (passing / max(total, 1)) * 10))

            return QualityMetrics(
                health_score=health_score,
                test_coverage=coverage,
                tests_passing=passing,
                tests_total=total,
                security_issues=security_issues,
                linting_errors=linting_errors,
            )
        except Exception:
            return None

    def _get_session_checkpoints(self, checkpoint_ids: list[str]) -> list[CheckpointInfo]:
        """Get checkpoint information.

        Args:
            checkpoint_ids: List of checkpoint IDs

        Returns:
            List of CheckpointInfo objects
        """
        checkpoints: list[CheckpointInfo] = []
        checkpoints_dir = self.project_root / ".claude" / "forge" / "checkpoints"

        for checkpoint_id in checkpoint_ids:
            checkpoint_file = checkpoints_dir / f"{checkpoint_id}.json"
            if checkpoint_file.exists():
                try:
                    with open(checkpoint_file, encoding="utf-8") as f:
                        data = json.load(f)

                    checkpoints.append(
                        CheckpointInfo(
                            id=checkpoint_id,
                            description=data.get("description", ""),
                            commit_hash=data.get("git_commit", ""),
                            created_at=data.get("created_at", ""),
                        ),
                    )
                except Exception:
                    continue

        return checkpoints

    def _generate_recommendations(
        self,
        quality_before: QualityMetrics | None,
        quality_after: QualityMetrics | None,
        commits: list[CommitInfo],
    ) -> list[str]:
        """Generate smart recommendations for next steps.

        Args:
            quality_before: Quality metrics before session
            quality_after: Quality metrics after session
            commits: Commits created during session

        Returns:
            List of recommendation strings
        """
        recommendations: list[str] = []

        # If PR was created, recommend review
        recommendations.append("Review and merge the pull request when approved")

        # If tests were added, recommend running in staging
        if quality_after and quality_after.tests_passing > 0:
            recommendations.append("Deploy to staging and verify test results")

        # If quality improved significantly, celebrate
        if (
            quality_before
            and quality_after
            and quality_after.health_score > quality_before.health_score + 5
        ):
            recommendations.append(
                "Quality score improved significantly - consider sharing wins with team",
            )

        return recommendations[:3]  # Top 3

    def _get_github_commits_url(self, branch: str) -> str:
        """Get GitHub URL for commits.

        Args:
            branch: Branch name

        Returns:
            GitHub commits URL
        """
        try:
            # Get remote URL
            result = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode == 0:
                remote_url = result.stdout.strip()
                # Convert git@github.com:user/repo.git to https://github.com/user/repo
                if "github.com" in remote_url:
                    if remote_url.startswith("git@"):
                        remote_url = remote_url.replace("git@github.com:", "https://github.com/")
                    remote_url = remote_url.replace(".git", "")
                    return f"{remote_url}/commits/{branch}"

            return f"https://github.com/commits/{branch}"
        except Exception:
            return f"https://github.com/commits/{branch}"

    def _get_sessions_in_range(self, date_range: DateRange | None) -> list[str]:
        """Get session IDs in date range.

        Args:
            date_range: Optional date range

        Returns:
            List of session IDs
        """
        sessions = []
        if not self.sessions_dir.exists():
            return sessions

        for session_file in self.sessions_dir.glob("*.json"):
            try:
                with open(session_file, encoding="utf-8") as f:
                    data = json.load(f)
                    start_time_str = data.get("start_time", "")
                    if start_time_str:
                        start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                        if date_range:
                            if date_range.start <= start_time <= date_range.end:
                                sessions.append(session_file.stem)
                        else:
                            sessions.append(session_file.stem)
            except Exception:
                continue

        return sessions

    def _format_brief(self, report: SessionReport) -> str:
        """Format brief 3-line summary.

        Args:
            report: SessionReport to format

        Returns:
            Brief summary string
        """
        duration = self._format_duration(report.duration_seconds)
        commits = len(report.commits)
        files = report.files_changed

        health_trend = ""
        if report.quality_before and report.quality_after:
            delta = report.quality_after.health_score - report.quality_before.health_score
            if delta > 0:
                health_trend = f" (health +{delta})"
            elif delta < 0:
                health_trend = f" (health {delta})"

        return f"Session {report.session_id}: {duration}, {commits} commits, {files} files{health_trend}"

    def _format_daily(self, report: SessionReport) -> str:
        """Format daily summary.

        Args:
            report: SessionReport to format

        Returns:
            Daily summary string
        """
        lines = [
            "═══ DAILY SUMMARY ═══",
            f"Date: {report.start_time[:10]}",
            f"Duration: {self._format_duration(report.duration_seconds)}",
            f"Activity: {len(report.commits)} commits, {report.files_changed} files",
            "",
        ]

        if report.quality_after:
            lines.extend(
                [
                    "Quality:",
                    f"  Health: {report.quality_after.health_score}/100",
                    f"  Coverage: {report.quality_after.test_coverage:.1f}%",
                    f"  Tests: {report.quality_after.tests_passing}/{report.quality_after.tests_total}",
                    "",
                ],
            )

        if report.pr_info:
            status = "✅" if report.pr_info.checks_passing else "⚠️"
            lines.append(f"PR: {status} #{report.pr_info.number} - {report.pr_info.title}")

        return "\n".join(lines)

    def _format_weekly(self, report: SessionReport) -> str:
        """Format weekly summary.

        Args:
            report: SessionReport to format

        Returns:
            Weekly summary string
        """
        # For weekly, we'd aggregate multiple sessions
        # For now, just format as daily with week indicator
        return self._format_daily(report).replace("DAILY", "WEEKLY")

    def _format_project_health(self, report: SessionReport) -> str:
        """Format with quality/health focus.

        Args:
            report: SessionReport to format

        Returns:
            Health-focused report string
        """
        lines = [
            "╔═══════════════════════════════════════════════════════╗",
            "║  PROJECT HEALTH REPORT                                ║",
            "╚═══════════════════════════════════════════════════════╝",
            "",
        ]

        if report.quality_after:
            qm = report.quality_after
            lines.extend(
                [
                    f"📊 HEALTH SCORE: {qm.health_score}/100",
                    "",
                    "Quality Metrics:",
                    f"  Test Coverage:    {qm.test_coverage:.1f}%",
                    f"  Tests Passing:    {qm.tests_passing}/{qm.tests_total}",
                    f"  Security Issues:  {qm.security_issues}",
                    f"  Linting Errors:   {qm.linting_errors}",
                    "",
                ],
            )

        if report.quality_before and report.quality_after:
            delta_health = report.quality_after.health_score - report.quality_before.health_score
            delta_coverage = (
                report.quality_after.test_coverage - report.quality_before.test_coverage
            )

            lines.extend(
                [
                    "📈 CHANGES:",
                    f"  Health: {delta_health:+d} points",
                    f"  Coverage: {delta_coverage:+.1f}%",
                    "",
                ],
            )

        if report.recommendations:
            lines.extend(["💡 RECOMMENDATIONS:", ""])
            for idx, rec in enumerate(report.recommendations, 1):
                lines.append(f"  {idx}. {rec}")

        return "\n".join(lines)

    def _format_agent_activity(self, report: SessionReport) -> str:
        """Format with agent activity focus.

        Args:
            report: SessionReport to format

        Returns:
            Agent-focused report string
        """
        lines = [
            "╔═══════════════════════════════════════════════════════╗",
            "║  AGENT ACTIVITY REPORT                                ║",
            "╚═══════════════════════════════════════════════════════╝",
            "",
            f"⏱️  Duration: {self._format_duration(report.duration_seconds)}",
            f"📦 Feature: {report.feature_name or 'N/A'}",
            f"🌿 Branch: {report.branch}",
            "",
            "🔨 WORK COMPLETED:",
            f"   Commits: {len(report.commits)}",
            f"   Files: {report.files_changed}",
            f"   Lines: +{report.lines_added}, -{report.lines_removed}",
            "",
        ]

        if report.commits:
            lines.extend(["📝 COMMITS:", ""])
            for commit in report.commits[:5]:
                lines.append(f"   • {commit.hash[:7]} {commit.message}")

        if report.checkpoints:
            lines.extend(["", "🔖 CHECKPOINTS:", ""])
            for cp in report.checkpoints:
                lines.append(f"   • {cp.id}: {cp.description}")

        return "\n".join(lines)

    def _to_markdown(self, content: str, report: SessionReport) -> str:
        """Convert report to Markdown format.

        Args:
            content: Text content
            report: SessionReport

        Returns:
            Markdown formatted string
        """
        md_lines = [
            f"# Session Report: {report.session_id}",
            "",
            f"**Date:** {report.start_time[:10]}",
            f"**Duration:** {self._format_duration(report.duration_seconds)}",
            f"**Branch:** {report.branch}",
            "",
            "## Summary",
            "",
            f"- **Commits:** {len(report.commits)}",
            f"- **Files Changed:** {report.files_changed}",
            f"- **Lines:** +{report.lines_added}, -{report.lines_removed}",
            "",
        ]

        if report.quality_after:
            md_lines.extend(
                [
                    "## Quality Metrics",
                    "",
                    f"- **Health Score:** {report.quality_after.health_score}/100",
                    f"- **Test Coverage:** {report.quality_after.test_coverage:.1f}%",
                    f"- **Tests:** {report.quality_after.tests_passing}/{report.quality_after.tests_total}",
                    "",
                ],
            )

        if report.commits:
            md_lines.extend(["## Commits", ""])
            for commit in report.commits:
                md_lines.append(f"- `{commit.hash[:7]}` {commit.message}")
            md_lines.append("")

        if report.pr_info:
            md_lines.extend(
                [
                    "## Pull Request",
                    "",
                    f"- **Number:** #{report.pr_info.number}",
                    f"- **Title:** {report.pr_info.title}",
                    f"- **URL:** {report.pr_info.url}",
                    f"- **Status:** {report.pr_info.status}",
                    "",
                ],
            )

        return "\n".join(md_lines)

    def _to_json(self, report: SessionReport) -> str:
        """Convert report to JSON format.

        Args:
            report: SessionReport

        Returns:
            JSON formatted string
        """
        data = {
            "session_id": report.session_id,
            "start_time": report.start_time,
            "end_time": report.end_time,
            "duration_seconds": report.duration_seconds,
            "feature_name": report.feature_name,
            "branch": report.branch,
            "commits": [
                {
                    "hash": c.hash,
                    "message": c.message,
                    "timestamp": c.timestamp,
                    "files_changed": c.files_changed,
                    "lines_added": c.lines_added,
                    "lines_removed": c.lines_removed,
                }
                for c in report.commits
            ],
            "files_changed": report.files_changed,
            "lines_added": report.lines_added,
            "lines_removed": report.lines_removed,
        }

        if report.quality_after:
            data["quality"] = {
                "health_score": report.quality_after.health_score,
                "test_coverage": report.quality_after.test_coverage,
                "tests_passing": report.quality_after.tests_passing,
                "tests_total": report.quality_after.tests_total,
                "security_issues": report.quality_after.security_issues,
                "linting_errors": report.quality_after.linting_errors,
            }

        if report.pr_info:
            data["pull_request"] = {
                "number": report.pr_info.number,
                "title": report.pr_info.title,
                "url": report.pr_info.url,
                "status": report.pr_info.status,
                "checks_passing": report.pr_info.checks_passing,
            }

        return json.dumps(data, indent=2)

"""Git Automation Service for intelligent git workflow management.

This service provides automated commit message generation, branch creation,
PR creation, and commit history analysis following project conventions.

All operations return Result types for robust error handling.
"""

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..result import Err, Ok, Result


@dataclass
class GitError:
    """Git operation error."""

    message: str
    details: str | None = None

    @staticmethod
    def command_failed(message: str, details: str | None = None) -> "GitError":
        """Create git command failure error."""
        return GitError(message=message, details=details)

    @staticmethod
    def invalid_state(message: str) -> "GitError":
        """Create invalid git state error."""
        return GitError(message=message)


@dataclass
class CommitStyle:
    """Detected commit message style for a project."""

    uses_conventional_commits: bool = False
    common_prefixes: list[str] = field(default_factory=list)
    average_length: int = 50
    uses_scopes: bool = False
    uses_breaking_change: bool = False
    example_messages: list[str] = field(default_factory=list)


@dataclass
class PullRequest:
    """Pull request information."""

    number: int
    url: str
    title: str
    body: str


class GitAutomationService:
    """Service for intelligent git workflow automation."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize git automation service.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)

    def generate_commit_message(
        self,
        staged_files: list[str] | None = None,
        feature_context: str | None = None,
    ) -> Result[str, GitError]:
        """Generate commit message following project conventions.

        Args:
            staged_files: List of staged files (None = auto-detect)
            feature_context: Optional context about current feature

        Returns:
            Result containing commit message or GitError
        """
        # Analyze project commit history to learn style
        style_result = self.analyze_commit_history()
        style = style_result.unwrap_or(CommitStyle())

        # Get staged diff
        diff_result = self._get_staged_diff()
        if diff_result.is_error():
            return diff_result  # type: ignore

        diff = diff_result.value

        # Analyze changes to determine type and scope
        analysis = self._analyze_changes(diff, staged_files)

        # Generate message following detected style
        if style.uses_conventional_commits:
            message = self._generate_conventional_commit(analysis, feature_context, style)
        else:
            message = self._generate_simple_commit(analysis, feature_context)

        # Add Forge attribution
        message += "\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n"
        message += "Co-Authored-By: Claude <noreply@anthropic.com>"

        return Ok(message)

    def create_feature_branch(
        self,
        feature_name: str,
        base_branch: str = "main",
    ) -> Result[str, GitError]:
        """Create feature branch with naming convention.

        Args:
            feature_name: Feature description
            base_branch: Base branch to branch from

        Returns:
            Result containing branch name or GitError
        """
        # Sanitize feature name for branch
        branch_name = self._sanitize_branch_name(feature_name)

        # Check if already on a branch with this name
        current_branch_result = self._get_current_branch()
        if current_branch_result.is_ok() and current_branch_result.value == branch_name:
            return Ok(branch_name)

        # Create and checkout branch
        try:
            subprocess.run(
                ["git", "checkout", "-b", branch_name, base_branch],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=True,
            )
            return Ok(branch_name)
        except subprocess.CalledProcessError as e:
            return Err(
                GitError.command_failed(
                    f"Failed to create branch: {branch_name}", details=e.stderr,
                ),
            )

    def create_pull_request(
        self,
        title: str,
        body: str,
        base_branch: str = "main",
    ) -> Result[PullRequest, GitError]:
        """Create pull request using GitHub CLI.

        Args:
            title: PR title
            body: PR description
            base_branch: Base branch for PR

        Returns:
            Result containing PullRequest or GitError
        """
        # Check if gh CLI is available
        if not self._has_gh_cli():
            return Err(
                GitError.command_failed(
                    "GitHub CLI (gh) not installed. Install from https://cli.github.com",
                ),
            )

        # Get current branch
        branch_result = self._get_current_branch()
        if branch_result.is_error():
            return Err(GitError.invalid_state("Not on a git branch"))

        current_branch = branch_result.value

        # Push current branch if needed
        push_result = self._ensure_branch_pushed(current_branch)
        if push_result.is_error():
            return push_result  # type: ignore

        # Create PR using gh CLI
        try:
            result = subprocess.run(
                [
                    "gh",
                    "pr",
                    "create",
                    "--title",
                    title,
                    "--body",
                    body,
                    "--base",
                    base_branch,
                    "--head",
                    current_branch,
                ],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=True,
            )

            # Parse PR URL from output
            pr_url = result.stdout.strip()

            # Extract PR number from URL
            pr_number_match = re.search(r"/pull/(\d+)", pr_url)
            pr_number = int(pr_number_match.group(1)) if pr_number_match else 0

            return Ok(PullRequest(number=pr_number, url=pr_url, title=title, body=body))

        except subprocess.CalledProcessError as e:
            return Err(GitError.command_failed("Failed to create PR", details=e.stderr))

    def analyze_commit_history(self, limit: int = 100) -> Result[CommitStyle, GitError]:
        """Analyze commit history to detect project conventions.

        Args:
            limit: Number of commits to analyze

        Returns:
            Result containing CommitStyle or GitError
        """
        try:
            result = subprocess.run(
                ["git", "log", f"-{limit}", "--format=%s"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=True,
            )

            messages = [line.strip() for line in result.stdout.splitlines() if line.strip()]

            if not messages:
                return Ok(CommitStyle())

            # Detect conventional commits pattern: type(scope): description
            conventional_pattern = re.compile(
                r"^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+?\))?: .+",
            )

            conventional_count = sum(1 for msg in messages if conventional_pattern.match(msg))

            uses_conventional = conventional_count > len(messages) * 0.5

            # Extract common prefixes
            prefixes: dict[str, int] = {}
            for msg in messages:
                match = re.match(r"^(\w+)(\(.+?\))?:", msg)
                if match:
                    prefix = match.group(1)
                    prefixes[prefix] = prefixes.get(prefix, 0) + 1

            common_prefixes = sorted(prefixes.keys(), key=lambda p: prefixes[p], reverse=True)[:5]

            # Detect scope usage
            uses_scopes = (
                sum(1 for msg in messages if "(" in msg and ")" in msg) > len(messages) * 0.3
            )

            # Detect breaking change marker
            uses_breaking = any("BREAKING CHANGE" in msg for msg in messages)

            # Calculate average length
            average_length = int(sum(len(msg.split("\n")[0]) for msg in messages) / len(messages))

            return Ok(
                CommitStyle(
                    uses_conventional_commits=uses_conventional,
                    common_prefixes=common_prefixes,
                    average_length=average_length,
                    uses_scopes=uses_scopes,
                    uses_breaking_change=uses_breaking,
                    example_messages=messages[:5],
                ),
            )

        except subprocess.CalledProcessError as e:
            return Err(
                GitError.command_failed("Failed to analyze commit history", details=e.stderr),
            )

    def link_to_issues(self, commit_msg: str, branch_name: str | None = None) -> str:
        """Add issue references to commit message.

        Args:
            commit_msg: Commit message
            branch_name: Current branch name (None = auto-detect)

        Returns:
            Commit message with issue links added
        """
        if branch_name is None:
            branch_result = self._get_current_branch()
            branch_name = branch_result.unwrap_or("")

        # Extract issue number from branch name (e.g., feature/123-add-auth)
        issue_match = re.search(r"(\d+)", branch_name)
        if issue_match:
            issue_number = issue_match.group(1)

            # Check if already has Closes/Fixes reference
            if not re.search(r"(Closes|Fixes|Resolves) #\d+", commit_msg, re.IGNORECASE):
                # Add before Forge attribution
                parts = commit_msg.split("\n\n🤖 Generated with")
                if len(parts) == 2:
                    commit_msg = (
                        f"{parts[0]}\n\nCloses #{issue_number}\n\n🤖 Generated with{parts[1]}"
                    )
                else:
                    commit_msg = f"{commit_msg}\n\nCloses #{issue_number}"

        return commit_msg

    def _get_staged_diff(self) -> Result[str, GitError]:
        """Get diff of staged changes.

        Returns:
            Result containing diff string or GitError
        """
        try:
            result = subprocess.run(
                ["git", "diff", "--staged"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=True,
            )
            return Ok(result.stdout)
        except subprocess.CalledProcessError as e:
            return Err(GitError.command_failed("Failed to get staged diff", details=e.stderr))

    def _get_current_branch(self) -> Result[str, GitError]:
        """Get current git branch.

        Returns:
            Result containing branch name or GitError
        """
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=True,
            )
            branch = result.stdout.strip()
            if not branch:
                return Err(GitError.invalid_state("Not on a branch (detached HEAD)"))
            return Ok(branch)
        except subprocess.CalledProcessError as e:
            return Err(GitError.command_failed("Failed to get current branch", details=e.stderr))

    def _analyze_changes(self, diff: str, staged_files: list[str] | None) -> dict[str, Any]:
        """Analyze changes to determine commit type and scope.

        Args:
            diff: Git diff output
            staged_files: List of staged files

        Returns:
            Analysis dictionary with type, scope, summary, details
        """
        analysis: dict[str, Any] = {
            "type": "chore",
            "scope": None,
            "summary": "Update files",
            "details": [],
        }

        # Get list of changed files if not provided
        if staged_files is None:
            try:
                result = subprocess.run(
                    ["git", "diff", "--staged", "--name-only"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                staged_files = result.stdout.splitlines() if result.returncode == 0 else []
            except Exception:
                staged_files = []

        if not staged_files:
            return analysis

        # Determine type based on file patterns
        has_tests = any("test" in f.lower() for f in staged_files)
        has_docs = any(f.endswith((".md", ".rst", ".txt")) for f in staged_files)
        has_code = any(f.endswith((".py", ".js", ".ts", ".go", ".rs")) for f in staged_files)

        # Check diff content for clues
        diff_lower = diff.lower()
        has_new_files = "+++ b/" in diff and "new file mode" in diff
        has_deletions = "--- a/" in diff and any(
            line.startswith("-") and not line.startswith("---") for line in diff.splitlines()
        )
        has_fix = any(keyword in diff_lower for keyword in ["fix", "bug", "issue", "error"])
        has_feature = any(
            keyword in diff_lower for keyword in ["add", "new", "feature", "implement"]
        )

        # Determine commit type
        if has_fix:
            analysis["type"] = "fix"
            analysis["summary"] = "Fix issue"
        elif has_feature or has_new_files:
            analysis["type"] = "feat"
            analysis["summary"] = "Add feature"
        elif has_tests and not has_code:
            analysis["type"] = "test"
            analysis["summary"] = "Add tests"
        elif has_docs and not has_code:
            analysis["type"] = "docs"
            analysis["summary"] = "Update documentation"
        elif has_deletions and not has_new_files:
            analysis["type"] = "refactor"
            analysis["summary"] = "Refactor code"
        else:
            analysis["type"] = "chore"
            analysis["summary"] = "Update files"

        # Determine scope from file paths
        common_dirs = {}
        for f in staged_files:
            parts = Path(f).parts
            if len(parts) > 1:
                # Use first directory as scope
                dir_name = parts[0]
                if dir_name not in ["tests", "docs", "scripts"]:
                    common_dirs[dir_name] = common_dirs.get(dir_name, 0) + 1

        if common_dirs:
            analysis["scope"] = max(common_dirs.keys(), key=lambda d: common_dirs[d])

        # Generate details from diff
        details = []
        for f in staged_files[:10]:  # Limit to first 10 files
            details.append(f"Modified {f}")

        analysis["details"] = details

        return analysis

    def _generate_conventional_commit(
        self,
        analysis: dict[str, Any],
        feature_context: str | None,
        style: CommitStyle,
    ) -> str:
        """Generate conventional commit message.

        Args:
            analysis: Change analysis
            feature_context: Feature context
            style: Detected commit style

        Returns:
            Formatted conventional commit message
        """
        commit_type = analysis["type"]
        scope = analysis["scope"]
        summary = feature_context or analysis["summary"]

        # First line: type(scope): summary
        if scope and style.uses_scopes:
            first_line = f"{commit_type}({scope}): {summary}"
        else:
            first_line = f"{commit_type}: {summary}"

        # Ensure first line fits within average length
        if len(first_line) > style.average_length:
            first_line = first_line[: style.average_length - 3] + "..."

        # Body: detailed changes
        details = analysis.get("details", [])
        body = "\n".join(f"- {detail}" for detail in details[:5])

        if body:
            return f"{first_line}\n\n{body}"
        else:
            return first_line

    def _generate_simple_commit(self, analysis: dict[str, Any], feature_context: str | None) -> str:
        """Generate simple commit message (non-conventional).

        Args:
            analysis: Change analysis
            feature_context: Feature context

        Returns:
            Simple commit message
        """
        summary = feature_context or analysis["summary"]

        details = analysis.get("details", [])
        if details:
            body = "\n".join(f"- {detail}" for detail in details[:5])
            return f"{summary}\n\n{body}"
        else:
            return summary

    def _sanitize_branch_name(self, feature_name: str) -> str:
        """Convert feature name to valid branch name.

        Args:
            feature_name: Feature description

        Returns:
            Sanitized branch name
        """
        # Convert to lowercase
        name = feature_name.lower()

        # Replace spaces and special chars with hyphens
        name = re.sub(r"[^a-z0-9]+", "-", name)

        # Remove leading/trailing hyphens
        name = name.strip("-")

        # Prefix with feature/
        return f"feature/{name}"

    def _has_gh_cli(self) -> bool:
        """Check if GitHub CLI is installed.

        Returns:
            True if gh is available
        """
        try:
            subprocess.run(
                ["gh", "--version"],
                capture_output=True,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def _ensure_branch_pushed(self, branch: str) -> Result[None, GitError]:
        """Ensure current branch is pushed to remote.

        Args:
            branch: Branch name

        Returns:
            Result indicating success or GitError
        """
        try:
            # Check if remote tracking exists
            result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", f"{branch}@{{upstream}}"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                # No upstream, need to push with -u
                subprocess.run(
                    ["git", "push", "-u", "origin", branch],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    check=True,
                )
            else:
                # Upstream exists, just push
                subprocess.run(
                    ["git", "push"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    check=True,
                )

            return Ok(None)

        except subprocess.CalledProcessError as e:
            return Err(GitError.command_failed("Failed to push branch", details=e.stderr))

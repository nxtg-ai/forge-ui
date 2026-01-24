"""Status service for project status operations.

Handles:
- Retrieving project status
- Formatting status displays
- Detailed section views
- Health score calculation
"""

from dataclasses import dataclass
from typing import Any

from forge.result import Err, Ok, Result, StateError
from forge.state_manager import StateManager


@dataclass
class ProjectStatus:
    """Project status information."""

    project_name: str
    project_type: str
    forge_version: str
    current_phase: str
    features_completed: int
    features_in_progress: int
    features_planned: int
    active_agents: list[str]
    health_score: int
    has_interrupted_session: bool
    last_session_id: str | None = None


class StatusService:
    """Service for project status operations.

    Responsibilities:
    - Load and parse state data
    - Calculate derived metrics (health score, progress, etc.)
    - Format status for display

    Does NOT:
    - Handle CLI arguments
    - Print to console (that's the command's job)
    - Manage state persistence (that's StateManager's job)
    """

    def __init__(self, state_manager: StateManager):
        """Initialize status service.

        Args:
            state_manager: State manager for accessing project state
        """
        self.state_manager = state_manager

    def get_project_status(self) -> Result[ProjectStatus, StateError]:
        """Get current project status.

        Returns:
            Result with ProjectStatus or StateError
        """
        try:
            state = self.state_manager.state

            # Extract key information
            project = state.get("project", {})
            dev = state.get("development", {})
            features = dev.get("features", {})
            agents = state.get("agents", {})
            last_session = state.get("last_session", {})

            status = ProjectStatus(
                project_name=project.get("name", "Unknown"),
                project_type=project.get("type", "unknown"),
                forge_version=project.get("forge_version", "unknown"),
                current_phase=dev.get("current_phase", "unknown"),
                features_completed=len(features.get("completed", [])),
                features_in_progress=len(features.get("in_progress", [])),
                features_planned=len(features.get("planned", [])),
                active_agents=agents.get("active", []),
                health_score=self.calculate_health_score(state),
                has_interrupted_session=last_session.get("status") == "interrupted",
                last_session_id=last_session.get("id"),
            )

            return Ok(status)

        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def get_full_state(self) -> Result[dict[str, Any], StateError]:
        """Get full state dictionary.

        Returns:
            Result with state dictionary or StateError
        """
        try:
            return Ok(self.state_manager.state)
        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def get_detailed_features(self) -> Result[dict[str, Any], StateError]:
        """Get detailed feature information.

        Returns:
            Result with feature details or StateError
        """
        try:
            state = self.state_manager.state
            features = state.get("development", {}).get("features", {})

            return Ok(
                {
                    "completed": features.get("completed", []),
                    "in_progress": features.get("in_progress", []),
                    "planned": features.get("planned", []),
                },
            )

        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def get_detailed_agents(self) -> Result[dict[str, Any], StateError]:
        """Get detailed agent information.

        Returns:
            Result with agent details or StateError
        """
        try:
            state = self.state_manager.state
            agents = state.get("agents", {})

            return Ok(
                {
                    "active": agents.get("active", []),
                    "available": agents.get("available", []),
                },
            )

        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def get_detailed_quality(self) -> Result[dict[str, Any], StateError]:
        """Get detailed quality information.

        Returns:
            Result with quality details or StateError
        """
        try:
            state = self.state_manager.state
            quality = state.get("quality", {})

            return Ok(
                {
                    "tests": quality.get("tests", {}),
                    "coverage": quality.get("coverage", {}),
                    "linting": quality.get("linting", {}),
                    "security": quality.get("security", {}),
                },
            )

        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def get_detailed_mcp(self) -> Result[dict[str, Any], StateError]:
        """Get detailed MCP server information.

        Returns:
            Result with MCP details or StateError
        """
        try:
            state = self.state_manager.state
            mcp = state.get("mcp_servers", {})

            return Ok(
                {
                    "configured": mcp.get("configured", []),
                    "available": mcp.get("available", []),
                },
            )

        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def calculate_health_score(self, state: dict[str, Any]) -> int:
        """Calculate project health score.

        Score is based on:
        - Test coverage (40% weight)
        - Security vulnerabilities (30% weight)
        - Linting issues (10% weight)
        - Feature completion (20% weight)

        Args:
            state: Project state dictionary

        Returns:
            Health score from 0-100
        """
        score = 100

        # Test coverage (40 points max)
        quality = state.get("quality", {})
        tests = quality.get("tests", {})

        if tests:
            unit_cov = tests.get("unit", {}).get("coverage", 0)
            int_cov = tests.get("integration", {}).get("coverage", 0)
            e2e_cov = tests.get("e2e", {}).get("coverage", 0)

            avg_coverage = (unit_cov + int_cov + e2e_cov) / 3

            if avg_coverage < 80:
                score -= (80 - avg_coverage) / 2  # Lose up to 40 points

        # Security vulnerabilities (30 points max)
        security = quality.get("security", {}).get("vulnerabilities", {})
        score -= security.get("critical", 0) * 10  # -10 per critical
        score -= security.get("high", 0) * 5  # -5 per high
        score -= security.get("medium", 0) * 2  # -2 per medium

        # Linting issues (10 points max)
        linting = quality.get("linting", {})
        issues = linting.get("issues", 0)
        score -= min(issues / 2, 10)  # Up to -10 points

        # Feature completion (20 points max)
        features = state.get("development", {}).get("features", {})
        completed = len(features.get("completed", []))
        total = completed + len(features.get("in_progress", [])) + len(features.get("planned", []))

        if total > 0:
            completion_rate = completed / total
            if completion_rate < 0.5:
                score -= 10  # -10 if less than half complete

        return max(0, min(100, int(score)))


__all__ = ["StatusService", "ProjectStatus"]

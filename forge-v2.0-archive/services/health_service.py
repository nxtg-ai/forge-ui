"""Health service for health score calculation."""

from typing import Any

from forge.result import Err, Ok, Result, StateError


class HealthService:
    """Service for health score operations.

    Calculates project health based on multiple factors:
    - Test coverage
    - Security vulnerabilities
    - Code quality (linting)
    - Feature completion
    """

    def calculate_health_score(self, state: dict[str, Any]) -> Result[int, StateError]:
        """Calculate project health score (0-100).

        Args:
            state: Project state dictionary

        Returns:
            Result with health score or error
        """
        try:
            score = 100

            # Test coverage (40% weight)
            quality = state.get("quality", {})
            tests = quality.get("tests", {})

            if tests:
                unit_cov = tests.get("unit", {}).get("coverage", 0)
                int_cov = tests.get("integration", {}).get("coverage", 0)
                e2e_cov = tests.get("e2e", {}).get("coverage", 0)

                avg_coverage = (unit_cov + int_cov + e2e_cov) / 3

                if avg_coverage < 80:
                    score -= (80 - avg_coverage) / 2

            # Security (30% weight)
            security = quality.get("security", {}).get("vulnerabilities", {})
            score -= security.get("critical", 0) * 10
            score -= security.get("high", 0) * 5
            score -= security.get("medium", 0) * 2

            # Linting (10% weight)
            linting = quality.get("linting", {})
            issues = linting.get("issues", 0)
            score -= min(issues / 2, 10)

            # Feature completion (20% weight)
            features = state.get("development", {}).get("features", {})
            completed = len(features.get("completed", []))
            total = (
                completed + len(features.get("in_progress", [])) + len(features.get("planned", []))
            )

            if total > 0:
                completion_rate = completed / total
                if completion_rate < 0.5:
                    score -= 10

            return Ok(max(0, min(100, int(score))))

        except Exception as e:
            return Err(StateError.invalid_state(str(e)))


__all__ = ["HealthService"]

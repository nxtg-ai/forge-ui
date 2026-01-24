"""Project service for project-level operations."""

from typing import Any

from forge.result import Err, Ok, Result, StateError


class ProjectService:
    """Service for project operations.

    Responsibilities:
    - Get recovery information
    - Project initialization checks
    - Project metadata
    """

    def __init__(self, state_manager):
        """Initialize project service.

        Args:
            state_manager: State manager instance
        """
        self.state_manager = state_manager

    def get_recovery_info(self) -> Result[dict[str, Any] | None, StateError]:
        """Get recovery information for interrupted sessions.

        Returns:
            Result with recovery info or None if no recovery needed
        """
        try:
            info = self.state_manager.get_recovery_info()
            return Ok(info)

        except Exception as e:
            return Err(StateError.load_failed(str(e)))


__all__ = ["ProjectService"]

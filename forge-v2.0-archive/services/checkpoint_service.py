"""Checkpoint service for checkpoint operations."""

from forge.result import CheckpointError, Err, Ok, Result
from forge.state_manager import StateManager


class CheckpointService:
    """Service for checkpoint operations.

    Responsibilities:
    - Create checkpoints
    - Restore from checkpoints
    - List available checkpoints

    Uses StateManager for actual checkpoint storage.
    """

    def __init__(self, state_manager: StateManager):
        """Initialize checkpoint service.

        Args:
            state_manager: State manager for checkpoint operations
        """
        self.state_manager = state_manager

    def create_checkpoint(self, description: str) -> Result[str, CheckpointError]:
        """Create a new checkpoint.

        Args:
            description: Checkpoint description

        Returns:
            Result with checkpoint ID or error
        """
        try:
            checkpoint_id = self.state_manager.checkpoint(description)
            return Ok(checkpoint_id)

        except Exception as e:
            return Err(CheckpointError.create_failed(str(e)))

    def restore_checkpoint(self, checkpoint_id: str | None = None) -> Result[None, CheckpointError]:
        """Restore from a checkpoint.

        Args:
            checkpoint_id: Checkpoint ID (None for latest)

        Returns:
            Result with None on success or error
        """
        try:
            self.state_manager.restore(checkpoint_id)
            return Ok(None)

        except FileNotFoundError:
            return Err(CheckpointError.not_found(checkpoint_id or "latest"))
        except Exception as e:
            return Err(CheckpointError.restore_failed(checkpoint_id or "latest", str(e)))

    def list_checkpoints(self) -> Result[list[dict], CheckpointError]:
        """List available checkpoints.

        Returns:
            Result with list of checkpoint metadata or error
        """
        try:
            # This would need to be implemented in StateManager
            # For now, return empty list
            return Ok([])

        except Exception as e:
            return Err(CheckpointError.create_failed(f"Failed to list: {e}"))


__all__ = ["CheckpointService"]

"""Restore command implementation."""

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class RestoreCommand(BaseCommand):
    """Restore from a checkpoint."""

    def __init__(self, checkpoint_service):
        """Initialize restore command.

        Args:
            checkpoint_service: CheckpointService instance
        """
        self.checkpoint_service = checkpoint_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute restore command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        checkpoint_id = getattr(context.args, "checkpoint_id", None)

        result = self.checkpoint_service.restore_checkpoint(checkpoint_id)

        if result.is_error():
            self.print_error(result.error.message)
            return Err(CommandError.execution_failed(result.error.message))

        restore_id = checkpoint_id or "latest"
        self.print_success(f"Restored from checkpoint: {restore_id}")

        return Ok(0)


__all__ = ["RestoreCommand"]

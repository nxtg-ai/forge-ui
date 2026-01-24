"""Checkpoint command implementation."""

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class CheckpointCommand(BaseCommand):
    """Create a checkpoint."""

    def __init__(self, checkpoint_service):
        """Initialize checkpoint command.

        Args:
            checkpoint_service: CheckpointService instance
        """
        self.checkpoint_service = checkpoint_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute checkpoint command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        description = context.args.description

        result = self.checkpoint_service.create_checkpoint(description)

        if result.is_error():
            self.print_error(result.error.message)
            return Err(CommandError.execution_failed(result.error.message))

        checkpoint_id = result.value
        self.print_success(f"Checkpoint created: {checkpoint_id}")
        print(f"  Description: {description}")

        return Ok(0)


__all__ = ["CheckpointCommand"]

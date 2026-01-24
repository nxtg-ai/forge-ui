"""Init command implementation."""

from forge.init_command import init_project
from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class InitCommand(BaseCommand):
    """Initialize NXTG-Forge in project."""

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute init command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        directory = getattr(context.args, "directory", None)
        force = getattr(context.args, "force", False)
        quiet = getattr(context.args, "quiet", False)

        try:
            exit_code = init_project(
                target_dir=directory,
                force=force,
                quiet=quiet,
            )

            return Ok(exit_code)

        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))


__all__ = ["InitCommand"]

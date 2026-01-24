"""Spec command implementation."""

import json
from pathlib import Path

from forge.result import CommandError, Err, Ok, Result
from forge.spec_generator import SpecGenerator

from .base import BaseCommand, CommandContext


class SpecCommand(BaseCommand):
    """Specification operations."""

    def __init__(self, project_root: Path):
        """Initialize spec command.

        Args:
            project_root: Project root directory
        """
        self.project_root = project_root

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute spec command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        spec_command = getattr(context.args, "spec_command", None)

        if spec_command == "generate":
            return self._generate(context)
        elif spec_command == "validate":
            return self._validate(context)
        else:
            return Err(CommandError.invalid_args("No spec subcommand specified"))

    def _generate(self, context: CommandContext) -> Result[int, CommandError]:
        """Generate project specification."""
        generator = SpecGenerator(str(self.project_root))

        try:
            if context.args.interactive:
                spec = generator.interactive_mode()
            elif context.args.from_answers:
                with open(context.args.from_answers) as f:
                    answers = json.load(f)
                spec = generator.from_answers(answers)
            else:
                return Err(CommandError.invalid_args("Use --interactive or --from-answers"))

            # Write spec file
            spec_file = self.project_root / "docs" / "PROJECT-SPEC.md"
            spec_file.parent.mkdir(exist_ok=True)

            with open(spec_file, "w") as f:
                f.write(spec)

            self.print_success(f"Spec generated: {spec_file}")
            return Ok(0)

        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))

    def _validate(self, context: CommandContext) -> Result[int, CommandError]:
        """Validate project specification."""
        # TODO: Implement validation
        print("Spec validation not yet implemented")
        return Ok(0)


__all__ = ["SpecCommand"]

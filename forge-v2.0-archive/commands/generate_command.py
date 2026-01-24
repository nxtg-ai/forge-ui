"""Generate command implementation."""

from pathlib import Path

from forge.file_generator import FileGenerator
from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class GenerateCommand(BaseCommand):
    """Generate project files from spec."""

    def __init__(self, project_root: Path):
        """Initialize generate command.

        Args:
            project_root: Project root directory
        """
        self.project_root = project_root

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute generate command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        try:
            generator = FileGenerator(str(self.project_root))

            # Load spec
            spec_path = context.args.spec
            with open(spec_path) as f:
                spec_content = f.read()

            # Generate files
            generated = generator.generate_from_spec(
                spec_content,
                template_set=context.args.template_set,
                dry_run=context.args.dry_run,
            )

            # Display results
            if context.args.dry_run:
                print("\n🔍 Dry Run - Would Generate:\n")
                for file_path in generated:
                    print(f"  • {file_path}")
                print(f"\nTotal: {len(generated)} files\n")
            else:
                self.print_success(f"Generated {len(generated)} files\n")

            return Ok(0)

        except FileNotFoundError as e:
            return Err(CommandError.execution_failed(f"Spec file not found: {e}"))
        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))


__all__ = ["GenerateCommand"]

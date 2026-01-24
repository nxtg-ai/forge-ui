"""Gap analysis command implementation."""

from pathlib import Path

from forge.gap_analyzer import GapAnalyzer
from forge.result import CommandError, Err, Ok, Result
from forge.state_manager import StateManager

from .base import BaseCommand, CommandContext


class GapAnalysisCommand(BaseCommand):
    """Analyze improvement gaps."""

    def __init__(self, project_root: Path, state_manager: StateManager):
        """Initialize gap analysis command.

        Args:
            project_root: Project root directory
            state_manager: State manager instance
        """
        self.project_root = project_root
        self.state_manager = state_manager

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute gap analysis command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        try:
            analyzer = GapAnalyzer(str(self.project_root), self.state_manager.state)
            gaps = analyzer.analyze()

            # Write output file
            output = context.args.output
            output_file = self.project_root / output
            output_file.parent.mkdir(exist_ok=True)

            with open(output_file, "w") as f:
                f.write(gaps)

            self.print_success(f"Gap analysis complete: {output_file}")

            # Show summary
            gap_count = len(gaps.split("##")) - 1
            print("\n📋 Summary:")
            print(f"   Found {gap_count} improvement areas")
            print(f"   See {output} for details\n")

            return Ok(0)

        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))


__all__ = ["GapAnalysisCommand"]

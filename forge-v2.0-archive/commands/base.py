"""Base command interface for CLI commands.

All commands inherit from BaseCommand and implement execute() method.
This provides consistent structure and enables dependency injection.
"""

from abc import ABC, abstractmethod
from argparse import Namespace
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from forge.result import CommandError, Result


@dataclass
class CommandContext:
    """Context passed to all commands.

    Contains shared dependencies and configuration that commands need.
    Using a context object makes it easy to add new dependencies without
    changing every command signature.
    """

    project_root: Path
    args: Namespace

    def __post_init__(self):
        """Ensure project_root is a Path object."""
        if not isinstance(self.project_root, Path):
            self.project_root = Path(self.project_root)


class BaseCommand(ABC):
    """Base class for all CLI commands.

    Commands follow the Command pattern:
    - Single responsibility: Each command does one thing
    - Dependency injection: Dependencies passed via constructor
    - Result types: All commands return Result for explicit error handling
    - No side effects in constructor: All work happens in execute()

    Usage:
        class MyCommand(BaseCommand):
            def __init__(self, my_service: MyService):
                self.my_service = my_service

            def execute(self, context: CommandContext) -> Result[int, CommandError]:
                result = self.my_service.do_work()
                if result.is_error():
                    return Err(CommandError.execution_failed(result.error))
                print("Success!")
                return Ok(0)
    """

    @abstractmethod
    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute the command.

        Args:
            context: Command execution context with args and dependencies

        Returns:
            Result with exit code (0 = success, non-zero = error)
        """

    def print_error(self, message: str) -> None:
        """Print error message to stderr.

        Args:
            message: Error message to print
        """
        import sys

        print(f"Error: {message}", file=sys.stderr)

    def print_success(self, message: str) -> None:
        """Print success message to stdout.

        Args:
            message: Success message to print
        """
        print(f"✓ {message}")

    def print_header(self, title: str) -> None:
        """Print formatted header.

        Args:
            title: Header title
        """
        print("\n" + "╔" + "═" * 58 + "╗")
        print(f"║ {title:^56} ║")
        print("╚" + "═" * 58 + "╝")


class SimpleCommand(BaseCommand):
    """Simple command that takes a handler function.

    Useful for simple commands that don't need a full class.

    Usage:
        def handle_version(context: CommandContext) -> Result[int, CommandError]:
            print("Version 1.0.0")
            return Ok(0)

        version_cmd = SimpleCommand(handle_version)
    """

    def __init__(self, handler: Any):
        """Initialize with handler function.

        Args:
            handler: Function that takes CommandContext and returns Result[int, CommandError]
        """
        self.handler = handler

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute the handler function."""
        return self.handler(context)


__all__ = ["BaseCommand", "CommandContext", "SimpleCommand"]

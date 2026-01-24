"""Recovery command implementation."""

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class RecoveryCommand(BaseCommand):
    """Display recovery information."""

    def __init__(self, project_service):
        """Initialize recovery command.

        Args:
            project_service: ProjectService instance
        """
        self.project_service = project_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute recovery command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        result = self.project_service.get_recovery_info()

        if result.is_error():
            return Err(CommandError.execution_failed(result.error.message))

        info = result.value

        if not info:
            print("✅ No recovery needed - all sessions completed normally\n")
            return Ok(0)

        # Display recovery information
        print("\n⚠️  Recovery Information\n")
        print("=" * 60)

        session = info.get("session", {})
        print("\nInterrupted Session:")
        print(f"  ID: {session.get('id', 'unknown')}")
        print(f"  Agent: {session.get('agent', 'unknown')}")
        print(f"  Task: {session.get('task', 'unknown')}")
        print(f"  Started: {session.get('started', 'unknown')}")

        checkpoint = info.get("checkpoint")
        if checkpoint:
            print("\nLast Checkpoint:")
            print(f"  ID: {checkpoint.get('id', 'unknown')}")
            print(f"  Description: {checkpoint.get('description', 'unknown')}")
            print(f"  Time: {checkpoint.get('timestamp', 'unknown')}")

        in_progress = info.get("in_progress_features", [])
        if in_progress:
            print("\nIn-Progress Features:")
            for feat in in_progress:
                progress = feat.get("progress", 0)
                print(f"  • {feat.get('name', 'unknown')} ({progress}%)")

        recovery_commands = info.get("recovery_commands", [])
        if recovery_commands:
            print("\n💡 Recovery Commands:")
            for cmd in recovery_commands:
                if cmd:
                    print(f"  {cmd}")

        print("\n" + "=" * 60 + "\n")

        return Ok(0)


__all__ = ["RecoveryCommand"]

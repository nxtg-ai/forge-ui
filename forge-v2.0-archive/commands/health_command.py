"""Health command implementation."""

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class HealthCommand(BaseCommand):
    """Calculate and display project health score."""

    def __init__(self, health_service, status_service):
        """Initialize health command.

        Args:
            health_service: HealthService instance
            status_service: StatusService instance
        """
        self.health_service = health_service
        self.status_service = status_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute health command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        # Get state
        state_result = self.status_service.get_full_state()
        if state_result.is_error():
            return Err(CommandError.execution_failed(state_result.error.message))

        state = state_result.value

        # Calculate health score
        score_result = self.health_service.calculate_health_score(state)
        if score_result.is_error():
            return Err(CommandError.execution_failed(score_result.error.message))

        score = score_result.value

        # Display score
        print(f"\n📊 Project Health Score: {score}/100\n")

        # Show detailed breakdown if requested
        if getattr(context.args, "detail", False):
            print("Breakdown:")
            # TODO: Add detailed breakdown

        # Provide assessment
        if score >= 90:
            print("✅ Excellent! Project is in great shape.\n")
        elif score >= 75:
            print("👍 Good! Some minor improvements recommended.\n")
        elif score >= 60:
            print("⚠️  Fair. Several areas need attention.\n")
        else:
            print("🚨 Critical. Immediate improvements required.\n")

        return Ok(0)


__all__ = ["HealthCommand"]

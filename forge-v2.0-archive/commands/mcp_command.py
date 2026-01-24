"""MCP command implementation."""

from pathlib import Path

from forge.mcp_detector import MCPDetector
from forge.result import CommandError, Err, Ok, Result
from forge.state_manager import StateManager

from .base import BaseCommand, CommandContext


class MCPCommand(BaseCommand):
    """MCP server operations."""

    def __init__(self, project_root: Path, state_manager: StateManager):
        """Initialize MCP command.

        Args:
            project_root: Project root directory
            state_manager: State manager instance
        """
        self.project_root = project_root
        self.state_manager = state_manager

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute MCP command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        mcp_command = getattr(context.args, "mcp_command", None)

        if mcp_command == "detect":
            return self._detect(context)
        elif mcp_command == "list":
            return self._list(context)
        else:
            return Err(CommandError.invalid_args("No MCP subcommand specified"))

    def _detect(self, context: CommandContext) -> Result[int, CommandError]:
        """Detect needed MCP servers."""
        try:
            detector = MCPDetector(str(self.project_root))
            recommendations = detector.detect()

            print("\n📋 MCP Server Recommendations:\n")

            # Sort by priority
            priority_map = {"high": 3, "medium": 2, "low": 1}
            sorted_recs = sorted(
                recommendations,
                key=lambda x: priority_map.get(x.get("priority", "low"), 0),
                reverse=True,
            )

            for rec in sorted_recs:
                icon = (
                    "🔴"
                    if rec["priority"] == "high"
                    else "🟡" if rec["priority"] == "medium" else "🟢"
                )
                print(f"{icon} {rec['name']} ({rec['priority']})")
                print(f"   {rec['reason']}\n")

            # Auto-configure if requested
            if context.args.configure:
                detector.configure()
                self.print_success("MCP servers configured!")

            return Ok(0)

        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))

    def _list(self, context: CommandContext) -> Result[int, CommandError]:
        """List configured MCP servers."""
        try:
            mcp = self.state_manager.state.get("mcp_servers", {})
            configured = mcp.get("configured", [])

            print("\n🔌 Configured MCP Servers:\n")

            for server in configured:
                status_icon = "✓" if server.get("status") == "connected" else "✗"
                print(f"{status_icon} {server['name']}")
                if server.get("reason"):
                    print(f"   {server['reason']}")

            return Ok(0)

        except Exception as e:
            return Err(CommandError.execution_failed(str(e)))


__all__ = ["MCPCommand"]

#!/usr/bin/env python3
"""NXTG-Forge CLI - Refactored with Command Pattern.

This is the main CLI entry point. It is responsible ONLY for:
- Setting up the DI container
- Parsing arguments
- Routing to commands
- Handling errors

All business logic is delegated to commands and services.

Architecture:
    CLI (this file) -> Commands -> Services -> Domain Models

Target: <200 lines of pure orchestration code
"""

import argparse
import sys
from pathlib import Path

from forge import __version__ as FORGE_VERSION
from forge.commands import (
    CheckpointCommand,
    CommandContext,
    ConfigCommand,
    GapAnalysisCommand,
    GenerateCommand,
    HealthCommand,
    InitCommand,
    MCPCommand,
    RecoveryCommand,
    RestoreCommand,
    SpecCommand,
    StatusCommand,
)
from forge.container import DIContainer
from forge.services import (
    ActivityReporter,
    CheckpointService,
    ConfigService,
    ContextRestorationService,
    HealthService,
    ProjectService,
    QualityAlerter,
    RecommendationEngine,
    SessionReporter,
    StatusService,
)
from forge.state_manager import StateManager


class ForgeCLI:
    """Main CLI orchestrator.

    Responsibilities:
    - Create DI container
    - Register dependencies
    - Parse arguments
    - Route to commands

    Does NOT contain business logic - that's in commands and services.
    """

    def __init__(self):
        """Initialize CLI."""
        self.project_root = Path.cwd()
        self.container = DIContainer()
        self._setup_dependencies()

    def _setup_dependencies(self):
        """Register all dependencies in DI container."""
        # Core dependencies
        self.container.register_singleton(Path, self.project_root)

        # State manager - lazy loaded to avoid creating .claude/ during init
        self.container.register_factory(StateManager, lambda c: StateManager(str(c.resolve(Path))))

        # Services
        self.container.register_factory(
            StatusService,
            lambda c: StatusService(c.resolve(StateManager)),
        )

        self.container.register_factory(
            CheckpointService,
            lambda c: CheckpointService(c.resolve(StateManager)),
        )

        self.container.register_factory(HealthService, lambda c: HealthService())

        self.container.register_factory(
            ConfigService,
            lambda c: ConfigService(c.resolve(Path) / ".claude" / "config.json"),
        )

        self.container.register_factory(
            ProjectService,
            lambda c: ProjectService(c.resolve(StateManager)),
        )

        # Phase 1 Services
        self.container.register_factory(
            ContextRestorationService,
            lambda c: ContextRestorationService(project_root=c.resolve(Path)),
        )

        self.container.register_factory(
            ActivityReporter,
            lambda c: ActivityReporter(project_root=c.resolve(Path)),
        )

        self.container.register_factory(
            SessionReporter,
            lambda c: SessionReporter(project_root=c.resolve(Path)),
        )

        self.container.register_factory(
            QualityAlerter,
            lambda c: QualityAlerter(project_root=c.resolve(Path)),
        )

        self.container.register_factory(
            RecommendationEngine,
            lambda c: RecommendationEngine(project_root=c.resolve(Path)),
        )

        # Commands
        self.container.register_factory(
            StatusCommand,
            lambda c: StatusCommand(c.resolve(StatusService)),
        )

        self.container.register_factory(
            CheckpointCommand,
            lambda c: CheckpointCommand(c.resolve(CheckpointService)),
        )

        self.container.register_factory(
            RestoreCommand,
            lambda c: RestoreCommand(c.resolve(CheckpointService)),
        )

        self.container.register_factory(
            HealthCommand,
            lambda c: HealthCommand(c.resolve(HealthService), c.resolve(StatusService)),
        )

        self.container.register_factory(
            RecoveryCommand,
            lambda c: RecoveryCommand(c.resolve(ProjectService)),
        )

        self.container.register_factory(SpecCommand, lambda c: SpecCommand(c.resolve(Path)))

        self.container.register_factory(
            MCPCommand,
            lambda c: MCPCommand(c.resolve(Path), c.resolve(StateManager)),
        )

        self.container.register_factory(
            GapAnalysisCommand,
            lambda c: GapAnalysisCommand(c.resolve(Path), c.resolve(StateManager)),
        )

        self.container.register_factory(GenerateCommand, lambda c: GenerateCommand(c.resolve(Path)))

        self.container.register_factory(
            ConfigCommand,
            lambda c: ConfigCommand(c.resolve(ConfigService)),
        )

        self.container.register_factory(InitCommand, lambda c: InitCommand())

    def create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser.

        Returns:
            Configured ArgumentParser
        """
        parser = argparse.ArgumentParser(
            description="NXTG-Forge - Self-Deploying AI Development Infrastructure",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  forge init                           # Initialize NXTG-Forge in project
  forge status                         # Show project status
  forge checkpoint "milestone"         # Create checkpoint
  forge health                         # Calculate health score
            """,
        )

        parser.add_argument("--version", action="version", version=f"NXTG-Forge {FORGE_VERSION}")

        subparsers = parser.add_subparsers(dest="command", help="Commands")

        # Init command
        init_parser = subparsers.add_parser("init", help="Initialize NXTG-Forge")
        init_parser.add_argument("directory", nargs="?", type=Path)
        init_parser.add_argument("--force", action="store_true")
        init_parser.add_argument("--quiet", action="store_true")

        # Status command
        status_parser = subparsers.add_parser("status", help="Show project status")
        status_parser.add_argument("--json", action="store_true")
        status_parser.add_argument("--detail", choices=["features", "agents", "quality", "mcp"])

        # Checkpoint commands
        checkpoint_parser = subparsers.add_parser("checkpoint", help="Create checkpoint")
        checkpoint_parser.add_argument("description", help="Checkpoint description")

        restore_parser = subparsers.add_parser("restore", help="Restore from checkpoint")
        restore_parser.add_argument("checkpoint_id", nargs="?")

        # Spec commands
        spec_parser = subparsers.add_parser("spec", help="Specification operations")
        spec_subparsers = spec_parser.add_subparsers(dest="spec_command")
        spec_gen = spec_subparsers.add_parser("generate", help="Generate spec")
        spec_gen.add_argument("--interactive", action="store_true")
        spec_gen.add_argument("--from-answers")
        spec_validate = spec_subparsers.add_parser("validate", help="Validate spec")
        spec_validate.add_argument("file")

        # MCP commands
        mcp_parser = subparsers.add_parser("mcp", help="MCP operations")
        mcp_subparsers = mcp_parser.add_subparsers(dest="mcp_command")
        mcp_detect = mcp_subparsers.add_parser("detect", help="Detect MCP servers")
        mcp_detect.add_argument("--configure", action="store_true")
        mcp_subparsers.add_parser("list", help="List MCP servers")

        # Gap analysis
        gap_parser = subparsers.add_parser("gap-analysis", help="Analyze gaps")
        gap_parser.add_argument("--output", default="docs/GAP-ANALYSIS.md")

        # Health
        health_parser = subparsers.add_parser("health", help="Health score")
        health_parser.add_argument("--detail", action="store_true")

        # Recovery
        subparsers.add_parser("recovery", help="Recovery information")

        # Generate
        generate_parser = subparsers.add_parser("generate", help="Generate files")
        generate_parser.add_argument("--spec", required=True)
        generate_parser.add_argument("--template-set", default="full")
        generate_parser.add_argument("--dry-run", action="store_true")

        # Config
        config_parser = subparsers.add_parser("config", help="Configuration")
        config_subparsers = config_parser.add_subparsers(dest="config_command")
        config_show = config_subparsers.add_parser("show", help="Show config")
        config_show.add_argument("--section")
        config_show.add_argument("--json", action="store_true")
        config_validate = config_subparsers.add_parser("validate", help="Validate config")
        config_validate.add_argument("--fix", action="store_true")

        return parser

    def run(self, args: list[str]) -> int:
        """Run the CLI.

        Args:
            args: Command-line arguments

        Returns:
            Exit code (0 = success, non-zero = error)
        """
        parser = self.create_parser()
        parsed_args = parser.parse_args(args)

        if not parsed_args.command:
            parser.print_help()
            return 0

        # Create context
        context = CommandContext(project_root=self.project_root, args=parsed_args)

        # Route to command
        command_map = {
            "init": InitCommand,
            "status": StatusCommand,
            "checkpoint": CheckpointCommand,
            "restore": RestoreCommand,
            "spec": SpecCommand,
            "mcp": MCPCommand,
            "gap-analysis": GapAnalysisCommand,
            "health": HealthCommand,
            "recovery": RecoveryCommand,
            "generate": GenerateCommand,
            "config": ConfigCommand,
        }

        command_class = command_map.get(parsed_args.command)
        if not command_class:
            print(f"Unknown command: {parsed_args.command}")
            return 1

        # Resolve command from container
        command = self.container.resolve(command_class)

        # Execute command
        result = command.execute(context)

        if result.is_error():
            print(f"Error: {result.error.message}", file=sys.stderr)
            return result.error.exit_code

        return result.value


def main():
    """CLI entry point."""
    cli = ForgeCLI()
    return cli.run(sys.argv[1:])


if __name__ == "__main__":
    sys.exit(main())

"""CLI Commands for NXTG-Forge.

Implements the Command pattern for clean separation of concerns:
- Each command is a single class with single responsibility
- Commands delegate business logic to domain services
- Commands use dependency injection for testability
- All commands return Result types for explicit error handling
"""

from .base import BaseCommand, CommandContext
from .checkpoint_command import CheckpointCommand
from .config_command import ConfigCommand
from .gap_analysis_command import GapAnalysisCommand
from .generate_command import GenerateCommand
from .health_command import HealthCommand
from .init_command import InitCommand
from .mcp_command import MCPCommand
from .recovery_command import RecoveryCommand
from .restore_command import RestoreCommand
from .spec_command import SpecCommand
from .status_command import StatusCommand


__all__ = [
    "BaseCommand",
    "CommandContext",
    "CheckpointCommand",
    "ConfigCommand",
    "GapAnalysisCommand",
    "GenerateCommand",
    "HealthCommand",
    "InitCommand",
    "MCPCommand",
    "RecoveryCommand",
    "RestoreCommand",
    "SpecCommand",
    "StatusCommand",
]

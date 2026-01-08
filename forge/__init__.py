"""NXTG-Forge - Self-Deploying AI Development Infrastructure.

A comprehensive system for building, deploying, and maintaining software projects
with Claude Code integration.
"""

__version__ = "1.0.0"
__author__ = "NXTG-Forge Contributors"

from .config import ForgeConfig, get_forge_config, requires_complex_handling
from .file_generator import FileGenerator
from .gap_analyzer import GapAnalyzer
from .integration import (
    get_config,
    get_forge_version,
    handle_request,
    is_feature_enabled,
    is_forge_available,
    quick_check,
    should_use_forge,
)
from .mcp_detector import MCPDetector
from .spec_generator import SpecGenerator
from .state_manager import StateManager


__all__ = [
    "FileGenerator",
    "ForgeConfig",
    "GapAnalyzer",
    "MCPDetector",
    "SpecGenerator",
    "StateManager",
    "get_config",
    "get_forge_config",
    "get_forge_version",
    "handle_request",
    "is_feature_enabled",
    "is_forge_available",
    "quick_check",
    "requires_complex_handling",
    "should_use_forge",
]

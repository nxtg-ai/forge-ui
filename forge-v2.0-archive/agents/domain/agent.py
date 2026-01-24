"""Immutable Agent domain model."""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class AgentType(Enum):
    """Available agent types."""

    LEAD_ARCHITECT = "lead-architect"
    BACKEND_MASTER = "backend-master"
    CLI_ARTISAN = "cli-artisan"
    PLATFORM_BUILDER = "platform-builder"
    INTEGRATION_SPECIALIST = "integration-specialist"
    QA_SENTINEL = "qa-sentinel"


class AgentCapability(Enum):
    """Agent capabilities/expertise areas."""

    ARCHITECTURE = "architecture"
    DESIGN = "design"
    PATTERNS = "patterns"
    API = "api"
    DATABASE = "database"
    BUSINESS_LOGIC = "business-logic"
    CLI = "cli"
    COMMANDS = "commands"
    UX = "ux"
    INFRASTRUCTURE = "infrastructure"
    DEPLOYMENT = "deployment"
    CICD = "cicd"
    INTEGRATION = "integration"
    WEBHOOKS = "webhooks"
    MCP = "mcp"
    TESTING = "testing"
    QUALITY = "quality"
    REVIEW = "review"


@dataclass(frozen=True)
class Agent:
    """Immutable agent model.

    Represents a specialized AI agent with specific capabilities.
    This is pure data - no business logic.

    Attributes:
        agent_type: Type of agent
        name: Display name
        capabilities: List of capabilities
        skill_file: Path to skill file
        is_active: Whether agent is currently active
    """

    agent_type: AgentType
    name: str
    capabilities: tuple[AgentCapability, ...]  # Tuple for immutability
    skill_file: Path
    is_active: bool = False

    def has_capability(self, capability: AgentCapability) -> bool:
        """Check if agent has a capability.

        Args:
            capability: Capability to check

        Returns:
            True if agent has capability
        """
        return capability in self.capabilities

    def has_any_capability(self, capabilities: list[AgentCapability]) -> bool:
        """Check if agent has any of the given capabilities.

        Args:
            capabilities: List of capabilities to check

        Returns:
            True if agent has at least one capability
        """
        return any(cap in self.capabilities for cap in capabilities)


__all__ = ["Agent", "AgentType", "AgentCapability"]

"""Agent selection strategies using Strategy pattern.

This module provides different strategies for selecting the most appropriate
agent for a given task. New strategies can be added without modifying existing code.
"""

from abc import ABC, abstractmethod

from forge.agents.domain.agent import AgentCapability, AgentType
from forge.agents.domain.task import Task


class AgentSelectionStrategy(ABC):
    """Abstract base class for agent selection strategies.

    Implementations define different algorithms for selecting agents.
    """

    @abstractmethod
    def select_agent(self, task: Task) -> AgentType:
        """Select the most appropriate agent for a task.

        Args:
            task: Task to assign

        Returns:
            Selected agent type
        """


class KeywordStrategy(AgentSelectionStrategy):
    """Keyword-based agent selection strategy.

    Selects agents based on keywords in task description and type.
    Simple but effective for most cases.
    """

    def __init__(self):
        """Initialize keyword mappings."""
        # Map keywords to agent types
        self._keyword_map: dict[AgentType, list[str]] = {
            AgentType.LEAD_ARCHITECT: ["architect", "design", "pattern", "structure", "system"],
            AgentType.BACKEND_MASTER: [
                "api",
                "endpoint",
                "database",
                "backend",
                "repository",
                "service",
            ],
            AgentType.CLI_ARTISAN: ["cli", "command", "terminal", "interface", "console"],
            AgentType.PLATFORM_BUILDER: [
                "deploy",
                "docker",
                "kubernetes",
                "cicd",
                "infrastructure",
                "platform",
            ],
            AgentType.INTEGRATION_SPECIALIST: ["integration", "webhook", "mcp", "external", "api"],
            AgentType.QA_SENTINEL: ["test", "qa", "quality", "review", "lint", "validation"],
        }

        # Map task types to default agents
        self._type_map: dict[str, AgentType] = {
            "feature": AgentType.BACKEND_MASTER,
            "bugfix": AgentType.QA_SENTINEL,
            "refactor": AgentType.LEAD_ARCHITECT,
            "design": AgentType.LEAD_ARCHITECT,
            "testing": AgentType.QA_SENTINEL,
            "deployment": AgentType.PLATFORM_BUILDER,
            "integration": AgentType.INTEGRATION_SPECIALIST,
        }

    def select_agent(self, task: Task) -> AgentType:
        """Select agent based on keywords in task description.

        Args:
            task: Task to assign

        Returns:
            Selected agent type
        """
        description_lower = task.description.lower()
        task_type_lower = task.task_type.lower()

        # Try keyword matching first
        for agent_type, keywords in self._keyword_map.items():
            if any(keyword in description_lower for keyword in keywords):
                return agent_type

        # Fall back to task type mapping
        if task_type_lower in self._type_map:
            return self._type_map[task_type_lower]

        # Default fallback
        return AgentType.LEAD_ARCHITECT


class CapabilityStrategy(AgentSelectionStrategy):
    """Capability-based agent selection strategy.

    Selects agents based on required capabilities derived from task context.
    More sophisticated than keyword matching.
    """

    def __init__(self):
        """Initialize capability mappings."""
        # Map agent types to their capabilities
        self._agent_capabilities: dict[AgentType, set[AgentCapability]] = {
            AgentType.LEAD_ARCHITECT: {
                AgentCapability.ARCHITECTURE,
                AgentCapability.DESIGN,
                AgentCapability.PATTERNS,
            },
            AgentType.BACKEND_MASTER: {
                AgentCapability.API,
                AgentCapability.DATABASE,
                AgentCapability.BUSINESS_LOGIC,
            },
            AgentType.CLI_ARTISAN: {
                AgentCapability.CLI,
                AgentCapability.COMMANDS,
                AgentCapability.UX,
            },
            AgentType.PLATFORM_BUILDER: {
                AgentCapability.INFRASTRUCTURE,
                AgentCapability.DEPLOYMENT,
                AgentCapability.CICD,
            },
            AgentType.INTEGRATION_SPECIALIST: {
                AgentCapability.INTEGRATION,
                AgentCapability.WEBHOOKS,
                AgentCapability.MCP,
            },
            AgentType.QA_SENTINEL: {
                AgentCapability.TESTING,
                AgentCapability.QUALITY,
                AgentCapability.REVIEW,
            },
        }

    def select_agent(self, task: Task) -> AgentType:
        """Select agent based on required capabilities.

        Args:
            task: Task to assign

        Returns:
            Selected agent type
        """
        # Extract required capabilities from task metadata
        required_capabilities = self._extract_capabilities(task)

        if not required_capabilities:
            # Fall back to keyword strategy
            return KeywordStrategy().select_agent(task)

        # Find agent with most matching capabilities
        best_agent = AgentType.LEAD_ARCHITECT
        best_match_count = 0

        for agent_type, capabilities in self._agent_capabilities.items():
            match_count = len(required_capabilities & capabilities)
            if match_count > best_match_count:
                best_match_count = match_count
                best_agent = agent_type

        return best_agent

    def _extract_capabilities(self, task: Task) -> set[AgentCapability]:
        """Extract required capabilities from task.

        Args:
            task: Task to analyze

        Returns:
            Set of required capabilities
        """
        capabilities = set()

        # Check task metadata for explicit capabilities
        if "required_capabilities" in task.metadata:
            cap_names = task.metadata["required_capabilities"]
            for cap_name in cap_names:
                try:
                    capabilities.add(AgentCapability(cap_name))
                except ValueError:
                    pass  # Invalid capability name, skip

        # Infer from description keywords
        description_lower = task.description.lower()

        capability_keywords = {
            AgentCapability.ARCHITECTURE: ["architecture", "design", "system"],
            AgentCapability.API: ["api", "endpoint", "rest"],
            AgentCapability.DATABASE: ["database", "sql", "query"],
            AgentCapability.CLI: ["cli", "command"],
            AgentCapability.TESTING: ["test", "quality"],
            AgentCapability.DEPLOYMENT: ["deploy", "docker"],
        }

        for capability, keywords in capability_keywords.items():
            if any(keyword in description_lower for keyword in keywords):
                capabilities.add(capability)

        return capabilities


__all__ = ["AgentSelectionStrategy", "KeywordStrategy", "CapabilityStrategy"]

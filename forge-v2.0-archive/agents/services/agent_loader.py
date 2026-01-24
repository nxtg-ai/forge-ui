"""Service for loading agent configurations."""

import json
import logging
from pathlib import Path

from forge.agents.domain.agent import Agent, AgentCapability, AgentType
from forge.result import ConfigError, Err, Ok, Result


logger = logging.getLogger(__name__)


class AgentLoader:
    """Loads agent configurations from config files.

    Responsible for:
    - Loading agent config from JSON
    - Creating Agent domain models
    - Providing defaults when config is missing
    """

    def __init__(self, project_root: Path):
        """Initialize agent loader.

        Args:
            project_root: Root directory of project
        """
        self.project_root = project_root
        self.config_path = project_root / ".claude" / "config.json"

    def load_agents(self) -> Result[dict[AgentType, Agent], ConfigError]:
        """Load available agents from configuration.

        Returns:
            Result containing mapping of agent types to Agent instances, or error
        """
        # Try to load from config.json
        if self.config_path.exists():
            result = self._load_from_config()
            if result.is_ok():
                return result

        # Fall back to defaults
        logger.info("Using default agent configuration")
        return Ok(self._get_default_agents())

    def _load_from_config(self) -> Result[dict[AgentType, Agent], ConfigError]:
        """Load agents from config.json.

        Returns:
            Result containing agent mapping or error
        """
        try:
            with open(self.config_path, encoding="utf-8") as f:
                config = json.load(f)
        except json.JSONDecodeError as e:
            return Err(ConfigError.invalid_json(str(e)))
        except Exception as e:
            return Err(ConfigError(f"Failed to load config: {e}"))

        # Extract agent configuration
        agent_configs = config.get("agents", {}).get("available_agents", [])

        if not agent_configs:
            return Err(ConfigError("No agents configured"))

        # Parse agents
        agents: dict[AgentType, Agent] = {}

        for agent_config in agent_configs:
            result = self._parse_agent_config(agent_config)
            if result.is_ok():
                agent = result.value
                agents[agent.agent_type] = agent
            else:
                logger.warning(f"Skipping invalid agent config: {result.error}")

        if not agents:
            return Err(ConfigError("No valid agents found in config"))

        logger.info(f"Loaded {len(agents)} agents from config")
        return Ok(agents)

    def _parse_agent_config(self, config: dict) -> Result[Agent, ConfigError]:
        """Parse single agent configuration.

        Args:
            config: Agent configuration dict

        Returns:
            Result containing Agent or error
        """
        try:
            # Extract required fields
            name = config.get("name", "")
            if not name:
                return Err(ConfigError.missing_field("name"))

            # Convert name to AgentType
            try:
                agent_type = AgentType(name)
            except ValueError:
                return Err(ConfigError(f"Invalid agent type: {name}"))

            # Extract capabilities
            capability_names = config.get("capabilities", [])
            capabilities = []

            for cap_name in capability_names:
                try:
                    # Try to map to AgentCapability enum
                    capabilities.append(AgentCapability(cap_name))
                except ValueError:
                    # Skip invalid capabilities
                    logger.warning(f"Unknown capability: {cap_name}")

            # Get display name and skill file
            display_name = config.get("role", name.replace("-", " ").title())
            skill_file_str = config.get("skill_file", f".claude/skills/agents/{name}.md")
            skill_file = self.project_root / skill_file_str

            # Create Agent
            agent = Agent(
                agent_type=agent_type,
                name=display_name,
                capabilities=tuple(capabilities),
                skill_file=skill_file,
                is_active=True,
            )

            return Ok(agent)

        except Exception as e:
            return Err(ConfigError(f"Failed to parse agent config: {e}"))

    def _get_default_agents(self) -> dict[AgentType, Agent]:
        """Get default agent configurations.

        Returns:
            Dictionary mapping agent types to default Agent instances
        """
        return {
            AgentType.LEAD_ARCHITECT: Agent(
                agent_type=AgentType.LEAD_ARCHITECT,
                name="Lead Architect",
                capabilities=(
                    AgentCapability.ARCHITECTURE,
                    AgentCapability.DESIGN,
                    AgentCapability.PATTERNS,
                ),
                skill_file=self.project_root / ".claude/skills/agents/lead-architect.md",
                is_active=True,
            ),
            AgentType.BACKEND_MASTER: Agent(
                agent_type=AgentType.BACKEND_MASTER,
                name="Backend Master",
                capabilities=(
                    AgentCapability.API,
                    AgentCapability.DATABASE,
                    AgentCapability.BUSINESS_LOGIC,
                ),
                skill_file=self.project_root / ".claude/skills/agents/backend-master.md",
                is_active=True,
            ),
            AgentType.CLI_ARTISAN: Agent(
                agent_type=AgentType.CLI_ARTISAN,
                name="CLI Artisan",
                capabilities=(
                    AgentCapability.CLI,
                    AgentCapability.COMMANDS,
                    AgentCapability.UX,
                ),
                skill_file=self.project_root / ".claude/skills/agents/cli-artisan.md",
                is_active=True,
            ),
            AgentType.PLATFORM_BUILDER: Agent(
                agent_type=AgentType.PLATFORM_BUILDER,
                name="Platform Builder",
                capabilities=(
                    AgentCapability.INFRASTRUCTURE,
                    AgentCapability.DEPLOYMENT,
                    AgentCapability.CICD,
                ),
                skill_file=self.project_root / ".claude/skills/agents/platform-builder.md",
                is_active=True,
            ),
            AgentType.INTEGRATION_SPECIALIST: Agent(
                agent_type=AgentType.INTEGRATION_SPECIALIST,
                name="Integration Specialist",
                capabilities=(
                    AgentCapability.INTEGRATION,
                    AgentCapability.WEBHOOKS,
                    AgentCapability.MCP,
                ),
                skill_file=self.project_root / ".claude/skills/agents/integration-specialist.md",
                is_active=True,
            ),
            AgentType.QA_SENTINEL: Agent(
                agent_type=AgentType.QA_SENTINEL,
                name="QA Sentinel",
                capabilities=(
                    AgentCapability.TESTING,
                    AgentCapability.QUALITY,
                    AgentCapability.REVIEW,
                ),
                skill_file=self.project_root / ".claude/skills/agents/qa-sentinel.md",
                is_active=True,
            ),
        }


__all__ = ["AgentLoader"]

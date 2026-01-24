"""Config service for configuration operations."""

import json
from pathlib import Path
from typing import Any

from forge.result import ConfigError, Err, Ok, Result


class ConfigService:
    """Service for configuration operations.

    Responsibilities:
    - Load and parse configuration
    - Validate configuration
    - Format configuration for display
    """

    def __init__(self, config_path: Path):
        """Initialize config service.

        Args:
            config_path: Path to config.json file
        """
        self.config_path = config_path

    def load_config(self) -> Result[dict[str, Any], ConfigError]:
        """Load configuration from file.

        Returns:
            Result with config dict or error
        """
        if not self.config_path.exists():
            return Err(ConfigError.not_found(str(self.config_path)))

        try:
            with open(self.config_path, encoding="utf-8") as f:
                config = json.load(f)
            return Ok(config)

        except json.JSONDecodeError as e:
            return Err(ConfigError.invalid_json(str(e)))
        except Exception as e:
            return Err(ConfigError(f"Failed to load config: {e}"))

    def validate_config(self, config: dict[str, Any]) -> Result[list[str], ConfigError]:
        """Validate configuration.

        Args:
            config: Configuration dictionary

        Returns:
            Result with list of errors (empty if valid)
        """
        errors = []
        warnings = []

        # Validate required sections
        required_sections = ["project", "development", "testing", "hooks"]
        for section in required_sections:
            if section not in config:
                errors.append(f"Missing required section: {section}")

        # Validate project section
        if "project" in config:
            project = config["project"]
            if "name" not in project:
                errors.append("Missing project.name")
            if "language" not in project:
                warnings.append("Missing project.language (optional)")

        # Validate development section
        if "development" in config:
            dev = config["development"]
            lang = config.get("project", {}).get("language", "python")
            if lang not in dev:
                warnings.append(f"Missing development.{lang} configuration")

        # Validate testing section
        if "testing" in config:
            testing = config["testing"]
            if "coverage_target" in testing:
                target = testing["coverage_target"]
                if not isinstance(target, (int, float)) or not 0 <= target <= 100:
                    errors.append("testing.coverage_target must be between 0 and 100")

        # Validate hooks
        if "hooks" in config:
            hooks = config["hooks"]
            if "enabled" in hooks and not isinstance(hooks["enabled"], bool):
                errors.append("hooks.enabled must be a boolean")

        return Ok(errors + warnings)

    def get_section(
        self,
        config: dict[str, Any],
        section: str,
    ) -> Result[dict[str, Any], ConfigError]:
        """Get a specific configuration section.

        Args:
            config: Full configuration
            section: Section name

        Returns:
            Result with section data or error
        """
        if section not in config:
            return Err(ConfigError.missing_field(section))

        return Ok(config[section])


__all__ = ["ConfigService"]

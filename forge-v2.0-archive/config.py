#!/usr/bin/env python3
"""NXTG-Forge Configuration Manager

Handles:
- Directory structure (.claude/forge/)
- Migration from .nxtg-forge/ to .claude/forge/
- Lazy configuration loading
- Smart defaults from project analysis
- Silent fallback on errors
"""

import json
import logging
import shutil
from pathlib import Path
from typing import Any, Optional


try:
    import yaml

    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

logger = logging.getLogger(__name__)


class ForgeConfig:
    """Configuration manager for NXTG-Forge

    Implements the lazy activation protocol from AUTO-SETUP.md:
    1. Detects if .nxtg-forge/ exists and migrates to .claude/forge/
    2. Loads config from .claude/forge/config.yml or creates with smart defaults
    3. Provides silent fallback on any errors
    """

    # Protocol version from AUTO-SETUP.md
    PROTOCOL_VERSION = "1.0"

    # Forge version - imported from package metadata
    @property
    def FORGE_VERSION(self) -> str:
        """Get Forge version from package metadata"""
        try:
            from forge import __version__
            return __version__
        except Exception:
            return "0.0.0-dev"

    def __init__(self, project_root: Optional[Path] = None):
        """Initialize config manager

        Args:
            project_root: Project root directory (default: current directory)
        """
        self.project_root = project_root or Path.cwd()

        # Directory structure
        self.claude_dir = self.project_root / ".claude"
        self.forge_dir = self.claude_dir / "forge"
        self.old_forge_dir = self.project_root / ".nxtg-forge"  # Beta location

        # Config and data paths
        self.config_file = self.forge_dir / "config.yml"
        self.memory_dir = self.forge_dir / "memory"
        self.agents_dir = self.forge_dir / "agents"

        # State file remains in .claude/ root for compatibility
        self.state_file = self.claude_dir / "state.json"
        self.checkpoints_dir = self.claude_dir / "checkpoints"

        # Migrate if needed
        self._migrate_if_needed()

        # Load configuration
        self._config: Optional[dict[str, Any]] = None

    @property
    def config(self) -> dict[str, Any]:
        """Get configuration (lazy loaded)

        Returns:
            Configuration dictionary with smart defaults
        """
        if self._config is None:
            self._config = self._load_or_create_config()
        return self._config

    def _migrate_if_needed(self):
        """Migrate from .nxtg-forge/ to .claude/forge/ if needed

        Implements migration strategy from UX-REDESIGN-2026-01-07.md
        """
        if not self.old_forge_dir.exists():
            return

        if self.forge_dir.exists():
            logger.warning(
                "Both .nxtg-forge/ and .claude/forge/ exist. "
                "Please verify migration and remove .nxtg-forge/",
            )
            return

        try:
            logger.info("Migrating .nxtg-forge/ to .claude/forge/")

            # Ensure .claude exists
            self.claude_dir.mkdir(parents=True, exist_ok=True)

            # Move the directory
            shutil.move(str(self.old_forge_dir), str(self.forge_dir))

            logger.info("✅ Migration complete: .nxtg-forge/ → .claude/forge/")

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            # Don't raise - silent fallback
            # If migration fails, we'll just create new directory

    def _load_or_create_config(self) -> dict[str, Any]:
        """Load config or create with smart defaults

        Implements configuration loading from AUTO-SETUP.md

        Returns:
            Configuration dictionary
        """
        # If config exists, load it
        if self.config_file.exists():
            return self._load_config()

        # Otherwise, create from smart defaults
        return self._create_config_from_defaults()

    def _load_config(self) -> dict[str, Any]:
        """Load configuration from file

        Returns:
            Configuration dictionary
        """
        try:
            if not YAML_AVAILABLE:
                logger.warning("PyYAML not available, using JSON fallback")
                return self._get_default_config()

            with open(self.config_file) as f:
                config: dict[str, Any] = yaml.safe_load(f)

            # Validate protocol version
            if config.get("protocol_version") != self.PROTOCOL_VERSION:
                logger.warning(
                    f"Protocol version mismatch: "
                    f"config={config.get('protocol_version')} "
                    f"expected={self.PROTOCOL_VERSION}",
                )

            return config

        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            # Silent fallback to defaults
            return self._get_default_config()

    def _create_config_from_defaults(self) -> dict[str, Any]:
        """Create config from smart defaults

        Analyzes project and generates appropriate configuration

        Returns:
            Generated configuration dictionary
        """
        logger.debug("Creating config from smart defaults")

        # Analyze project
        analysis = self._analyze_project()

        # Generate config
        config = self._get_default_config()
        config["auto_generated"] = True
        config["project_analysis"] = analysis

        # Save config
        try:
            self._save_config(config)
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            # Continue with in-memory config

        return config

    def _analyze_project(self) -> dict[str, Any]:
        """Analyze project to determine appropriate defaults

        Returns:
            Project analysis results
        """
        analysis: dict[str, Any] = {
            "languages": [],
            "frameworks": [],
            "databases": [],
            "structure": "unknown",
        }

        # Detect languages
        if (self.project_root / "setup.py").exists() or (
            self.project_root / "pyproject.toml"
        ).exists():
            analysis["languages"].append("python")

        if (self.project_root / "package.json").exists():
            analysis["languages"].append("javascript")

        if (self.project_root / "go.mod").exists():
            analysis["languages"].append("go")

        if (self.project_root / "Cargo.toml").exists():
            analysis["languages"].append("rust")

        # Detect Python frameworks
        if "python" in analysis["languages"]:
            requirements = self.project_root / "requirements.txt"
            pyproject = self.project_root / "pyproject.toml"

            if requirements.exists():
                content = requirements.read_text().lower()
                if "fastapi" in content:
                    analysis["frameworks"].append("fastapi")
                if "django" in content:
                    analysis["frameworks"].append("django")
                if "flask" in content:
                    analysis["frameworks"].append("flask")

            if pyproject.exists():
                content = pyproject.read_text().lower()
                if "fastapi" in content:
                    analysis["frameworks"].append("fastapi")

        # Detect databases
        docker_compose = self.project_root / "docker-compose.yml"
        if docker_compose.exists():
            content = docker_compose.read_text().lower()
            if "postgres" in content:
                analysis["databases"].append("postgresql")
            if "mysql" in content:
                analysis["databases"].append("mysql")
            if "redis" in content:
                analysis["databases"].append("redis")

        # Detect structure
        if (self.project_root / "src").exists():
            analysis["structure"] = "src-layout"
        elif (self.project_root / "packages").exists():
            analysis["structure"] = "monorepo"
        elif len(list(self.project_root.glob("*/__init__.py"))) > 0:
            analysis["structure"] = "flat-layout"

        return analysis

    def _get_default_config(self) -> dict[str, Any]:
        """Get default configuration template

        Based on AUTO-SETUP.md configuration template

        Returns:
            Default configuration dictionary
        """
        return {
            "protocol_version": self.PROTOCOL_VERSION,
            "forge_version": self.FORGE_VERSION,
            "auto_generated": True,
            "project_analysis": {
                "languages": [],
                "frameworks": [],
                "databases": [],
                "structure": "unknown",
            },
            "defaults": {
                "memory": {
                    "enabled": True,
                    "persistence": "session",  # or 'permanent'
                },
                "agents": {
                    "discovery": "auto",  # or 'manual'
                    "orchestration": True,
                    "max_parallel": 3,
                },
                "features": {
                    "tdd_workflow": True,
                    "refactoring_bot": True,
                    "analytics": True,
                    "gap_analysis": True,
                },
            },
        }

    def _save_config(self, config: dict[str, Any]):
        """Save configuration to file

        Args:
            config: Configuration to save
        """
        # Ensure directory exists
        self.forge_dir.mkdir(parents=True, exist_ok=True)

        if YAML_AVAILABLE:
            # Save as YAML with helpful comments
            with open(self.config_file, "w") as f:
                f.write("# Auto-generated by nxtg-forge\n")
                f.write("# Edit this file to customize behavior\n")
                f.write("# Or delete it to regenerate from project analysis\n\n")
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)

        else:
            # Fallback to JSON
            json_file = self.forge_dir / "config.json"
            with open(json_file, "w") as f:
                json.dump(config, f, indent=2)

        # Create .gitignore for memory directory
        gitignore = self.forge_dir / ".gitignore"
        if not gitignore.exists():
            gitignore.write_text(
                "# Forge memory (don't commit)\n"
                "memory/\n"
                "*.log\n\n"
                "# Keep config (do commit)\n"
                "!config.yml\n"
                "!config.json\n",
            )

    def ensure_directories(self):
        """Ensure all required directories exist"""
        self.claude_dir.mkdir(parents=True, exist_ok=True)
        self.forge_dir.mkdir(parents=True, exist_ok=True)
        self.memory_dir.mkdir(parents=True, exist_ok=True)
        self.agents_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)

    def get_memory_enabled(self) -> bool:
        """Check if memory persistence is enabled

        Returns:
            True if memory is enabled
        """
        enabled: bool = self.config["defaults"]["memory"]["enabled"]
        return enabled

    def get_max_parallel_agents(self) -> int:
        """Get maximum number of parallel agents

        Returns:
            Maximum parallel agents
        """
        max_parallel: int = self.config["defaults"]["agents"]["max_parallel"]
        return max_parallel

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled

        Args:
            feature: Feature name (e.g., 'tdd_workflow')

        Returns:
            True if feature is enabled
        """
        is_enabled: bool = self.config["defaults"]["features"].get(feature, False)
        return is_enabled


def requires_complex_handling(request: str) -> bool:
    """Determine if request needs forge capabilities

    Implements complexity detection from AUTO-SETUP.md

    Args:
        request: User request text

    Returns:
        True if request should use forge orchestration
    """
    import re

    complexity_indicators = [
        # Multi-step operations
        r"create.+and.+",
        r"implement.+with.+",
        r"build.+with.+",
        # Multiple components
        r"add.+(auth|authentication|payment|email|notification)",
        r"setup.+(ci/cd|deployment|infrastructure)",
        r"integrate.+(stripe|oauth|api)",
        # Architectural keywords
        r"refactor",
        r"migrate",
        r"integrate",
        r"architect",
        # Feature development
        r"build.+feature",
        r"develop.+(api|service)",
        r"create.+(rest|graphql).+api",
        # Cross-cutting
        r"add.+to all",
        r"update.+across",
        r"apply.+to.+files",
    ]

    request_lower = request.lower()
    return any(re.search(pattern, request_lower) for pattern in complexity_indicators)


# Singleton instance for lazy loading
_forge_config: Optional[ForgeConfig] = None


def get_forge_config(project_root: Optional[Path] = None) -> ForgeConfig:
    """Get forge configuration (singleton)

    Args:
        project_root: Project root directory

    Returns:
        ForgeConfig instance
    """
    global _forge_config
    if _forge_config is None:
        _forge_config = ForgeConfig(project_root)
    return _forge_config

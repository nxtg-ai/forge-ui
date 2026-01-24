"""Refactored NXTG-Forge Configuration Manager.

This is a refactored version demonstrating clean architecture principles:
- Single Responsibility: Each class has one job
- Dependency Injection: Dependencies injected via constructor
- Explicit Error Handling: Using Result types instead of silent failures
- Composition: Built from focused, composable components

Compare with forge/config.py to see the improvement.
"""

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .directory_manager import DirectoryManager
from .result import ConfigError, Err, Ok, Result, from_exception


try:
    import yaml

    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

logger = logging.getLogger(__name__)


# ============================================================================
# Domain Models (Immutable Data)
# ============================================================================


@dataclass(frozen=True)
class ProjectAnalysis:
    """Results of project analysis."""

    languages: tuple[str, ...]
    frameworks: tuple[str, ...]
    databases: tuple[str, ...]
    structure: str


@dataclass(frozen=True)
class MemoryConfig:
    """Memory persistence configuration."""

    enabled: bool
    persistence: str  # 'session' or 'permanent'


@dataclass(frozen=True)
class AgentsConfig:
    """Agent orchestration configuration."""

    discovery: str  # 'auto' or 'manual'
    orchestration: bool
    max_parallel: int


@dataclass(frozen=True)
class FeaturesConfig:
    """Feature flags configuration."""

    tdd_workflow: bool
    refactoring_bot: bool
    analytics: bool
    gap_analysis: bool


@dataclass(frozen=True)
class DefaultsConfig:
    """Default configuration values."""

    memory: MemoryConfig
    agents: AgentsConfig
    features: FeaturesConfig


@dataclass(frozen=True)
class ForgeConfigData:
    """Immutable configuration data.

    This is the core configuration model. All configuration data
    should be represented here as immutable values.
    """

    protocol_version: str
    forge_version: str
    auto_generated: bool
    project_analysis: ProjectAnalysis
    defaults: DefaultsConfig

    def get_memory_enabled(self) -> bool:
        """Check if memory persistence is enabled."""
        return self.defaults.memory.enabled

    def get_max_parallel_agents(self) -> int:
        """Get maximum number of parallel agents."""
        return self.defaults.agents.max_parallel

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled.

        Args:
            feature: Feature name (e.g., 'tdd_workflow')

        Returns:
            True if feature is enabled
        """
        features_dict = {
            "tdd_workflow": self.defaults.features.tdd_workflow,
            "refactoring_bot": self.defaults.features.refactoring_bot,
            "analytics": self.defaults.features.analytics,
            "gap_analysis": self.defaults.features.gap_analysis,
        }
        return features_dict.get(feature, False)


# ============================================================================
# Project Analyzer (Separated Responsibility)
# ============================================================================


class ProjectAnalyzer:
    """Analyzes project structure to determine appropriate defaults.

    Single responsibility: Project analysis
    No I/O: Only reads existing files, doesn't modify
    No dependencies: Pure logic based on file existence
    """

    def __init__(self, project_root: Path):
        """Initialize analyzer.

        Args:
            project_root: Root directory to analyze
        """
        self.project_root = project_root

    def analyze(self) -> ProjectAnalysis:
        """Analyze project and return structured results.

        Returns:
            ProjectAnalysis with detected languages, frameworks, etc.
        """
        languages = self._detect_languages()
        frameworks = self._detect_frameworks(languages)
        databases = self._detect_databases()
        structure = self._detect_structure()

        return ProjectAnalysis(
            languages=tuple(languages),
            frameworks=tuple(frameworks),
            databases=tuple(databases),
            structure=structure,
        )

    def _detect_languages(self) -> list[str]:
        """Detect programming languages used."""
        languages = []

        if self._file_exists("setup.py") or self._file_exists("pyproject.toml"):
            languages.append("python")

        if self._file_exists("package.json"):
            languages.append("javascript")

        if self._file_exists("go.mod"):
            languages.append("go")

        if self._file_exists("Cargo.toml"):
            languages.append("rust")

        return languages

    def _detect_frameworks(self, languages: list[str]) -> list[str]:
        """Detect frameworks based on languages and dependencies."""
        frameworks = []

        if "python" in languages:
            frameworks.extend(self._detect_python_frameworks())

        # Add more language-specific framework detection as needed

        return frameworks

    def _detect_python_frameworks(self) -> list[str]:
        """Detect Python frameworks."""
        frameworks = []

        # Check requirements.txt
        requirements_file = self.project_root / "requirements.txt"
        if requirements_file.exists():
            content = requirements_file.read_text().lower()

            if "fastapi" in content:
                frameworks.append("fastapi")
            if "django" in content:
                frameworks.append("django")
            if "flask" in content:
                frameworks.append("flask")

        # Check pyproject.toml
        pyproject_file = self.project_root / "pyproject.toml"
        if pyproject_file.exists():
            content = pyproject_file.read_text().lower()

            if "fastapi" in content and "fastapi" not in frameworks:
                frameworks.append("fastapi")

        return frameworks

    def _detect_databases(self) -> list[str]:
        """Detect databases from docker-compose or config files."""
        databases = []

        docker_compose = self.project_root / "docker-compose.yml"
        if docker_compose.exists():
            content = docker_compose.read_text().lower()

            if "postgres" in content:
                databases.append("postgresql")
            if "mysql" in content:
                databases.append("mysql")
            if "redis" in content:
                databases.append("redis")
            if "mongo" in content:
                databases.append("mongodb")

        return databases

    def _detect_structure(self) -> str:
        """Detect project structure pattern."""
        if (self.project_root / "src").exists():
            return "src-layout"
        elif (self.project_root / "packages").exists():
            return "monorepo"
        elif list(self.project_root.glob("*/__init__.py")):
            return "flat-layout"
        else:
            return "unknown"

    def _file_exists(self, filename: str) -> bool:
        """Check if file exists in project root."""
        return (self.project_root / filename).exists()


# ============================================================================
# Configuration Loader (Separated Responsibility)
# ============================================================================


class ConfigLoader:
    """Loads and saves configuration files.

    Single responsibility: Configuration I/O
    Explicit errors: Returns Result types
    No side effects: Doesn't create directories or migrate
    """

    PROTOCOL_VERSION = "1.0"

    def __init__(self, config_file: Path):
        """Initialize config loader.

        Args:
            config_file: Path to configuration file
        """
        self.config_file = config_file

    def load(self) -> Result[ForgeConfigData, ConfigError]:
        """Load configuration from file.

        Returns:
            Ok with config data or Err with specific error
        """
        if not self.config_file.exists():
            return Err(ConfigError.not_found(str(self.config_file)))

        if not YAML_AVAILABLE:
            return Err(
                ConfigError(
                    "YAML library not available",
                    "Install PyYAML to load configuration: pip install pyyaml",
                ),
            )

        def load_yaml() -> dict[str, Any]:
            with open(self.config_file) as f:
                return yaml.safe_load(f)

        # Load YAML with exception handling
        yaml_result = from_exception(load_yaml, lambda e: ConfigError.invalid_yaml(str(e)))

        if yaml_result.is_error():
            return yaml_result  # type: ignore

        raw_config = yaml_result.value  # type: ignore

        # Validate and convert to typed model
        return self._to_config_data(raw_config)

    def save(self, config: ForgeConfigData) -> Result[None, ConfigError]:
        """Save configuration to file.

        Args:
            config: Configuration data to save

        Returns:
            Ok if saved successfully, Err otherwise
        """
        # Ensure parent directory exists
        self.config_file.parent.mkdir(parents=True, exist_ok=True)

        # Convert to dictionary
        config_dict = self._from_config_data(config)

        if YAML_AVAILABLE:
            return self._save_yaml(config_dict)
        else:
            return self._save_json(config_dict)

    def _to_config_data(self, raw: dict[str, Any]) -> Result[ForgeConfigData, ConfigError]:
        """Convert raw dictionary to typed config data.

        Args:
            raw: Raw dictionary from file

        Returns:
            Ok with typed config or Err with validation error
        """
        try:
            # Extract and validate fields
            protocol_version = raw.get("protocol_version", self.PROTOCOL_VERSION)
            forge_version = raw.get("forge_version", "0.0.0-dev")
            auto_generated = raw.get("auto_generated", False)

            # Parse project analysis
            analysis_raw = raw.get("project_analysis", {})
            analysis = ProjectAnalysis(
                languages=tuple(analysis_raw.get("languages", [])),
                frameworks=tuple(analysis_raw.get("frameworks", [])),
                databases=tuple(analysis_raw.get("databases", [])),
                structure=analysis_raw.get("structure", "unknown"),
            )

            # Parse defaults
            defaults_raw = raw.get("defaults", {})

            memory_raw = defaults_raw.get("memory", {})
            memory = MemoryConfig(
                enabled=memory_raw.get("enabled", True),
                persistence=memory_raw.get("persistence", "session"),
            )

            agents_raw = defaults_raw.get("agents", {})
            agents = AgentsConfig(
                discovery=agents_raw.get("discovery", "auto"),
                orchestration=agents_raw.get("orchestration", True),
                max_parallel=agents_raw.get("max_parallel", 3),
            )

            features_raw = defaults_raw.get("features", {})
            features = FeaturesConfig(
                tdd_workflow=features_raw.get("tdd_workflow", True),
                refactoring_bot=features_raw.get("refactoring_bot", True),
                analytics=features_raw.get("analytics", True),
                gap_analysis=features_raw.get("gap_analysis", True),
            )

            defaults = DefaultsConfig(
                memory=memory,
                agents=agents,
                features=features,
            )

            return Ok(
                ForgeConfigData(
                    protocol_version=protocol_version,
                    forge_version=forge_version,
                    auto_generated=auto_generated,
                    project_analysis=analysis,
                    defaults=defaults,
                ),
            )

        except (KeyError, TypeError, ValueError) as e:
            return Err(ConfigError(f"Invalid config structure: {e}"))

    def _from_config_data(self, config: ForgeConfigData) -> dict[str, Any]:
        """Convert typed config data to dictionary for serialization."""
        return {
            "protocol_version": config.protocol_version,
            "forge_version": config.forge_version,
            "auto_generated": config.auto_generated,
            "project_analysis": {
                "languages": list(config.project_analysis.languages),
                "frameworks": list(config.project_analysis.frameworks),
                "databases": list(config.project_analysis.databases),
                "structure": config.project_analysis.structure,
            },
            "defaults": {
                "memory": {
                    "enabled": config.defaults.memory.enabled,
                    "persistence": config.defaults.memory.persistence,
                },
                "agents": {
                    "discovery": config.defaults.agents.discovery,
                    "orchestration": config.defaults.agents.orchestration,
                    "max_parallel": config.defaults.agents.max_parallel,
                },
                "features": {
                    "tdd_workflow": config.defaults.features.tdd_workflow,
                    "refactoring_bot": config.defaults.features.refactoring_bot,
                    "analytics": config.defaults.features.analytics,
                    "gap_analysis": config.defaults.features.gap_analysis,
                },
            },
        }

    def _save_yaml(self, config_dict: dict[str, Any]) -> Result[None, ConfigError]:
        """Save configuration as YAML."""
        try:
            with open(self.config_file, "w") as f:
                f.write("# Auto-generated by nxtg-forge\n")
                f.write("# Edit this file to customize behavior\n")
                f.write("# Or delete it to regenerate from project analysis\n\n")
                yaml.dump(config_dict, f, default_flow_style=False, sort_keys=False)

            return Ok(None)

        except Exception as e:
            return Err(ConfigError(f"Failed to save YAML: {e}"))

    def _save_json(self, config_dict: dict[str, Any]) -> Result[None, ConfigError]:
        """Save configuration as JSON (fallback when YAML not available)."""
        try:
            json_file = self.config_file.parent / "config.json"

            with open(json_file, "w") as f:
                json.dump(config_dict, f, indent=2)

            return Ok(None)

        except Exception as e:
            return Err(ConfigError(f"Failed to save JSON: {e}"))


# ============================================================================
# Configuration Manager (Orchestrator)
# ============================================================================


class ForgeConfigManager:
    """Manages configuration for NXTG-Forge.

    This is the main facade that orchestrates the other components.
    It uses dependency injection and composition rather than doing everything itself.

    Responsibilities:
    - Coordinate directory setup, analysis, loading, and saving
    - Provide high-level API for config access
    - Handle config generation when file doesn't exist

    Does NOT:
    - Create directories (delegates to DirectoryManager)
    - Analyze projects (delegates to ProjectAnalyzer)
    - Load/save files (delegates to ConfigLoader)
    """

    def __init__(
        self,
        directory_manager: DirectoryManager,
        config_loader: ConfigLoader,
        project_analyzer: ProjectAnalyzer,
    ):
        """Initialize config manager with injected dependencies.

        Args:
            directory_manager: Manages directory structure
            config_loader: Loads and saves config files
            project_analyzer: Analyzes project structure
        """
        self.dirs = directory_manager
        self.loader = config_loader
        self.analyzer = project_analyzer
        self._config: ForgeConfigData | None = None

    @property
    def config(self) -> ForgeConfigData:
        """Get configuration (lazy loaded).

        Returns:
            Configuration data

        Raises:
            RuntimeError: If config fails to load
        """
        if self._config is None:
            result = self.load_or_create()

            if result.is_error():
                # Fallback to default config
                logger.warning(f"Failed to load config: {result.error}, using defaults")
                self._config = self._get_default_config()
            else:
                self._config = result.value

        return self._config

    def load_or_create(self) -> Result[ForgeConfigData, ConfigError]:
        """Load existing config or create with smart defaults.

        Returns:
            Ok with config data or Err with error details
        """
        # Try to load existing config
        load_result = self.loader.load()

        if load_result.is_ok():
            return load_result

        # Config doesn't exist - create from defaults
        logger.info("Config file not found, creating from project analysis")

        analysis = self.analyzer.analyze()
        config = self._create_config_from_analysis(analysis)

        # Save the generated config
        save_result = self.loader.save(config)

        if save_result.is_error():
            logger.warning(f"Failed to save generated config: {save_result.error}")
            # Continue with in-memory config

        return Ok(config)

    def _create_config_from_analysis(self, analysis: ProjectAnalysis) -> ForgeConfigData:
        """Create configuration from project analysis."""
        return ForgeConfigData(
            protocol_version=ConfigLoader.PROTOCOL_VERSION,
            forge_version=self._get_forge_version(),
            auto_generated=True,
            project_analysis=analysis,
            defaults=self._get_default_defaults(),
        )

    def _get_default_config(self) -> ForgeConfigData:
        """Get default configuration (fallback)."""
        return ForgeConfigData(
            protocol_version=ConfigLoader.PROTOCOL_VERSION,
            forge_version=self._get_forge_version(),
            auto_generated=True,
            project_analysis=ProjectAnalysis(
                languages=(),
                frameworks=(),
                databases=(),
                structure="unknown",
            ),
            defaults=self._get_default_defaults(),
        )

    def _get_default_defaults(self) -> DefaultsConfig:
        """Get default defaults configuration."""
        return DefaultsConfig(
            memory=MemoryConfig(enabled=True, persistence="session"),
            agents=AgentsConfig(discovery="auto", orchestration=True, max_parallel=3),
            features=FeaturesConfig(
                tdd_workflow=True,
                refactoring_bot=True,
                analytics=True,
                gap_analysis=True,
            ),
        )

    def _get_forge_version(self) -> str:
        """Get forge version from package metadata."""
        try:
            from forge import __version__

            return __version__
        except Exception:
            return "0.0.0-dev"


# ============================================================================
# Factory Function (Convenience)
# ============================================================================


def create_forge_config(project_root: Path | None = None) -> ForgeConfigManager:
    """Create a fully configured ForgeConfigManager.

    This is a convenience factory that wires up all dependencies.

    Args:
        project_root: Project root directory

    Returns:
        Configured ForgeConfigManager
    """
    # Create dependencies
    dirs = DirectoryManager(project_root)
    loader = ConfigLoader(dirs.config_file)
    analyzer = ProjectAnalyzer(dirs.project_root)

    # Ensure directory structure exists
    dirs.ensure_structure()

    # Check for legacy migration
    migration = dirs.migrate_legacy()
    if migration.performed:
        logger.info(f"Migration performed: {migration.message}")

    # Create and return manager
    return ForgeConfigManager(
        directory_manager=dirs,
        config_loader=loader,
        project_analyzer=analyzer,
    )


__all__ = [
    "ForgeConfigData",
    "ForgeConfigManager",
    "ProjectAnalysis",
    "DefaultsConfig",
    "create_forge_config",
]

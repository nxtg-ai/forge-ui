"""Dependency injection container configuration.

This module configures the DIContainer with all services and dependencies
for the NXTG-Forge application.
"""

from pathlib import Path

from .container import DIContainer
from .services import (
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


def create_configured_container(project_root: Path | str = ".") -> DIContainer:
    """Create and configure DI container with all services.

    Args:
        project_root: Root directory of the project

    Returns:
        Configured DIContainer with all services registered
    """
    container = DIContainer()
    root = Path(project_root)

    # Register core services as factories
    # They will be instantiated once and cached as singletons

    container.register_factory(
        ConfigService,
        lambda c: ConfigService(project_root=root),
    )

    container.register_factory(
        ProjectService,
        lambda c: ProjectService(project_root=root),
    )

    container.register_factory(
        StatusService,
        lambda c: StatusService(project_root=root),
    )

    container.register_factory(
        HealthService,
        lambda c: HealthService(project_root=root),
    )

    container.register_factory(
        CheckpointService,
        lambda c: CheckpointService(project_root=root),
    )

    # Register Phase 1 services

    container.register_factory(
        ContextRestorationService,
        lambda c: ContextRestorationService(project_root=root),
    )

    container.register_factory(
        ActivityReporter,
        lambda c: ActivityReporter(project_root=root),
    )

    container.register_factory(
        SessionReporter,
        lambda c: SessionReporter(project_root=root),
    )

    container.register_factory(
        QualityAlerter,
        lambda c: QualityAlerter(project_root=root),
    )

    container.register_factory(
        RecommendationEngine,
        lambda c: RecommendationEngine(project_root=root),
    )

    return container


def configure_global_container(project_root: Path | str = ".") -> None:
    """Configure global service locator with container.

    This is a convenience function for CLI applications that need
    global access to services.

    Args:
        project_root: Root directory of the project
    """
    from .container import ServiceLocator

    container = create_configured_container(project_root)
    ServiceLocator.set_container(container)


__all__ = [
    "create_configured_container",
    "configure_global_container",
]

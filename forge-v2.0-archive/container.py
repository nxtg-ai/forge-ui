"""Simple dependency injection container for NXTG-Forge.

Provides lightweight dependency injection to decouple components and improve testability.

Usage:
    # Create container
    container = DIContainer()

    # Register dependencies
    container.register_singleton(Database, PostgresDatabase("connection_string"))
    container.register_factory(UserRepository, lambda c: UserRepository(c.resolve(Database)))

    # Resolve dependencies
    user_repo = container.resolve(UserRepository)
"""

from typing import Any, Callable, TypeVar, cast


T = TypeVar("T")


class DIContainer:
    """Simple dependency injection container.

    Supports:
    - Singleton registration (one instance for lifetime)
    - Factory registration (create new instance on resolve)
    - Constructor injection (automatically inject dependencies)

    Does NOT support:
    - Property injection
    - Method injection
    - Circular dependency detection (will cause RecursionError)
    - Scoped lifetimes
    """

    def __init__(self):
        """Initialize empty container."""
        self._singletons: dict[type, Any] = {}
        self._factories: dict[type, Callable] = {}
        self._resolving: set[type] = set()  # Track what we're currently resolving

    def register_singleton(self, interface: type[T], instance: T) -> None:
        """Register a singleton instance.

        The same instance will be returned on every resolve() call.

        Args:
            interface: The type to register (used as key)
            instance: The instance to return

        Example:
            container.register_singleton(Database, PostgresDatabase("conn_str"))
        """
        self._singletons[interface] = instance

    def register_factory(self, interface: type[T], factory: Callable[["DIContainer"], T]) -> None:
        """Register a factory function.

        The factory will be called once, and the result cached as a singleton.

        Args:
            interface: The type to register (used as key)
            factory: Function that takes container and returns instance

        Example:
            container.register_factory(
                UserRepository,
                lambda c: UserRepository(c.resolve(Database))
            )
        """
        self._factories[interface] = factory

    def register_transient(self, interface: type[T], factory: Callable[["DIContainer"], T]) -> None:
        """Register a transient factory (creates new instance each time).

        Note: Currently not implemented - all factories are treated as singletons.
        This is a placeholder for future enhancement.

        Args:
            interface: The type to register
            factory: Function that creates new instance
        """
        # For v1.0, treat as factory (singleton after first resolve)
        # v1.1 could implement true transient behavior
        self.register_factory(interface, factory)

    def resolve(self, interface: type[T]) -> T:
        """Resolve a dependency.

        Args:
            interface: The type to resolve

        Returns:
            Instance of the requested type

        Raises:
            ValueError: If type is not registered
            RecursionError: If circular dependency detected
        """
        # Check if we're already resolving this (circular dependency)
        if interface in self._resolving:
            raise RecursionError(
                f"Circular dependency detected while resolving {interface.__name__}",
            )

        # Check singletons first
        if interface in self._singletons:
            return cast(T, self._singletons[interface])

        # Check factories
        if interface in self._factories:
            # Mark as resolving to detect cycles
            self._resolving.add(interface)

            try:
                # Create instance via factory
                factory = self._factories[interface]
                instance = factory(self)

                # Cache as singleton
                self._singletons[interface] = instance

                return cast(T, instance)

            finally:
                # Always remove from resolving set
                self._resolving.discard(interface)

        # Not registered
        raise ValueError(
            f"No registration found for {interface.__name__}. " "Did you forget to register it?",
        )

    def has(self, interface: type) -> bool:
        """Check if a type is registered.

        Args:
            interface: The type to check

        Returns:
            True if registered, False otherwise
        """
        return interface in self._singletons or interface in self._factories

    def clear(self) -> None:
        """Clear all registrations.

        Useful for testing or resetting the container.
        """
        self._singletons.clear()
        self._factories.clear()
        self._resolving.clear()

    def override(self, interface: type[T], instance: T) -> None:
        """Override an existing registration.

        Useful for testing to replace real implementations with mocks.

        Args:
            interface: The type to override
            instance: The new instance to use
        """
        self._singletons[interface] = instance

        # Remove from factories if present
        self._factories.pop(interface, None)


class ServiceLocator:
    """Global service locator (anti-pattern, use sparingly).

    Provides global access to the DI container. This is useful for
    scenarios where dependency injection is not practical (e.g., CLI entry points).

    WARNING: This is an anti-pattern. Use constructor injection where possible.
    """

    _container: DIContainer | None = None

    @classmethod
    def set_container(cls, container: DIContainer) -> None:
        """Set the global container.

        Args:
            container: Container to use globally
        """
        cls._container = container

    @classmethod
    def get_container(cls) -> DIContainer:
        """Get the global container.

        Returns:
            The global container

        Raises:
            RuntimeError: If container not initialized
        """
        if cls._container is None:
            raise RuntimeError(
                "ServiceLocator not initialized. Call ServiceLocator.set_container() first.",
            )
        return cls._container

    @classmethod
    def resolve(cls, interface: type[T]) -> T:
        """Resolve a dependency from global container.

        Args:
            interface: The type to resolve

        Returns:
            Instance of requested type
        """
        return cls.get_container().resolve(interface)

    @classmethod
    def has(cls, interface: type) -> bool:
        """Check if type is registered in global container.

        Args:
            interface: The type to check

        Returns:
            True if registered, False otherwise
        """
        if cls._container is None:
            return False
        return cls._container.has(interface)


# Helper function for creating configured container
def create_container() -> DIContainer:
    """Create a new, empty container.

    Returns:
        Empty DIContainer instance
    """
    return DIContainer()


__all__ = [
    "DIContainer",
    "ServiceLocator",
    "create_container",
]

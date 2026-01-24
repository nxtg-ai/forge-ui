"""Result type for explicit error handling.

A Result type represents the outcome of an operation that can either succeed or fail.
This eliminates the need for exceptions in normal control flow and makes error handling
explicit and type-safe.

Usage:
    from forge.result import Result, Ok, Err

    def divide(a: float, b: float) -> Result[float, str]:
        if b == 0:
            return Err("Division by zero")
        return Ok(a / b)

    result = divide(10, 2)
    if result.is_ok():
        print(f"Result: {result.value}")
    else:
        print(f"Error: {result.error}")

    # Or use pattern matching (Python 3.10+)
    match result:
        case Ok(value):
            print(f"Result: {value}")
        case Err(error):
            print(f"Error: {error}")
"""

from dataclasses import dataclass
from typing import Callable, Generic, TypeVar, Union


T = TypeVar("T")  # Success type
E = TypeVar("E")  # Error type
U = TypeVar("U")  # Mapped success type


@dataclass(frozen=True)
class Ok(Generic[T]):
    """Represents a successful result.

    Attributes:
        value: The success value
    """

    value: T

    def is_ok(self) -> bool:
        """Check if this is a success result."""
        return True

    def is_error(self) -> bool:
        """Check if this is an error result."""
        return False

    def map(self, func: Callable[[T], U]) -> "Result[U, E]":
        """Transform the success value.

        Args:
            func: Function to transform the value

        Returns:
            New Result with transformed value
        """
        return Ok(func(self.value))

    def flat_map(self, func: Callable[[T], "Result[U, E]"]) -> "Result[U, E]":
        """Chain another Result-returning operation.

        Args:
            func: Function that returns a Result

        Returns:
            Result from the function
        """
        return func(self.value)

    def unwrap(self) -> T:
        """Get the success value (safe for Ok)."""
        return self.value

    def unwrap_or(self, default: T) -> T:
        """Get the success value or a default."""
        return self.value

    def expect(self, message: str) -> T:
        """Get the success value (safe for Ok)."""
        return self.value


@dataclass(frozen=True)
class Err(Generic[E]):
    """Represents an error result.

    Attributes:
        error: The error value
    """

    error: E

    def is_ok(self) -> bool:
        """Check if this is a success result."""
        return False

    def is_error(self) -> bool:
        """Check if this is an error result."""
        return True

    def map(self, func: Callable[[T], U]) -> "Result[U, E]":
        """Transform the success value (no-op for Err).

        Args:
            func: Function to transform the value (ignored)

        Returns:
            Self (error unchanged)
        """
        return self  # type: ignore

    def flat_map(self, func: Callable[[T], "Result[U, E]"]) -> "Result[U, E]":
        """Chain another Result-returning operation (no-op for Err).

        Args:
            func: Function that returns a Result (ignored)

        Returns:
            Self (error unchanged)
        """
        return self  # type: ignore

    def unwrap(self) -> T:
        """Get the success value (raises for Err)."""
        raise ValueError(f"Called unwrap() on an Err: {self.error}")

    def unwrap_or(self, default: T) -> T:
        """Get the success value or a default."""
        return default

    def expect(self, message: str) -> T:
        """Get the success value with custom error message."""
        raise ValueError(f"{message}: {self.error}")


# Type alias for the union
Result = Union[Ok[T], Err[E]]


# Utility functions


def collect_results(results: list[Result[T, E]]) -> Result[list[T], E]:
    """Collect a list of Results into a Result of list.

    If all Results are Ok, returns Ok with list of all values.
    If any Result is Err, returns the first Err encountered.

    Args:
        results: List of Results to collect

    Returns:
        Result containing list of values or first error
    """
    values: list[T] = []
    for result in results:
        if result.is_error():
            return result  # type: ignore
        values.append(result.value)  # type: ignore
    return Ok(values)


def from_optional(value: T | None, error: E) -> Result[T, E]:
    """Convert an optional value to a Result.

    Args:
        value: Optional value
        error: Error to use if value is None

    Returns:
        Ok if value is not None, else Err
    """
    if value is None:
        return Err(error)
    return Ok(value)


def from_exception(func: Callable[[], T], error_mapper: Callable[[Exception], E]) -> Result[T, E]:
    """Execute a function and convert exceptions to Result.

    Args:
        func: Function to execute
        error_mapper: Function to map exceptions to error type

    Returns:
        Ok with function result or Err with mapped exception
    """
    try:
        return Ok(func())
    except Exception as e:
        return Err(error_mapper(e))


# Common error types for the domain


@dataclass(frozen=True)
class FileError:
    """File operation errors."""

    message: str
    path: str

    @staticmethod
    def not_found(path: str) -> "FileError":
        return FileError(f"File not found: {path}", path)

    @staticmethod
    def permission_denied(path: str) -> "FileError":
        return FileError(f"Permission denied: {path}", path)

    @staticmethod
    def invalid_format(path: str, detail: str) -> "FileError":
        return FileError(f"Invalid file format in {path}: {detail}", path)


@dataclass(frozen=True)
class ConfigError:
    """Configuration errors."""

    message: str
    detail: str | None = None

    @staticmethod
    def not_found(path: str) -> "ConfigError":
        return ConfigError(f"Config file not found: {path}")

    @staticmethod
    def invalid_json(detail: str) -> "ConfigError":
        return ConfigError("Invalid JSON in config file", detail)

    @staticmethod
    def invalid_yaml(detail: str) -> "ConfigError":
        return ConfigError("Invalid YAML in config file", detail)

    @staticmethod
    def missing_field(field: str) -> "ConfigError":
        return ConfigError(f"Missing required field: {field}")


@dataclass(frozen=True)
class StateError:
    """State management errors."""

    message: str
    context: str | None = None

    @staticmethod
    def load_failed(reason: str) -> "StateError":
        return StateError("Failed to load state", reason)

    @staticmethod
    def save_failed(reason: str) -> "StateError":
        return StateError("Failed to save state", reason)

    @staticmethod
    def invalid_state(reason: str) -> "StateError":
        return StateError("Invalid state data", reason)


@dataclass(frozen=True)
class CheckpointError:
    """Checkpoint operation errors."""

    message: str
    checkpoint_id: str | None = None

    @staticmethod
    def create_failed(reason: str) -> "CheckpointError":
        return CheckpointError(f"Failed to create checkpoint: {reason}")

    @staticmethod
    def not_found(checkpoint_id: str) -> "CheckpointError":
        return CheckpointError(f"Checkpoint not found: {checkpoint_id}", checkpoint_id)

    @staticmethod
    def restore_failed(checkpoint_id: str, reason: str) -> "CheckpointError":
        return CheckpointError(f"Failed to restore checkpoint: {reason}", checkpoint_id)


@dataclass(frozen=True)
class CommandError:
    """CLI command errors."""

    message: str
    exit_code: int = 1

    @staticmethod
    def invalid_args(detail: str) -> "CommandError":
        return CommandError(f"Invalid arguments: {detail}", exit_code=2)

    @staticmethod
    def execution_failed(detail: str) -> "CommandError":
        return CommandError(f"Command execution failed: {detail}")


# Export all public symbols
__all__ = [
    "Result",
    "Ok",
    "Err",
    "collect_results",
    "from_optional",
    "from_exception",
    "FileError",
    "ConfigError",
    "StateError",
    "CheckpointError",
    "CommandError",
]

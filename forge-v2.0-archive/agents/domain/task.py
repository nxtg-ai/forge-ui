"""Immutable Task domain model with builder pattern."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class TaskStatus(Enum):
    """Task status enumeration."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """Task priority enumeration."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Task:
    """Immutable task model.

    Tasks are immutable - use TaskBuilder to create new versions.
    This ensures thread-safety and predictable state.

    Attributes:
        id: Unique task identifier
        description: Task description
        task_type: Type of task (feature, bugfix, etc.)
        priority: Task priority
        status: Current status
        assigned_agent: Agent type assigned to this task
        dependencies: Task IDs this task depends on
        metadata: Additional task metadata
        subtask_ids: IDs of subtasks
        started_at: Timestamp when task started
        completed_at: Timestamp when task completed
        result: Task result data
    """

    id: str
    description: str
    task_type: str
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: str | None = None
    dependencies: tuple[str, ...] = field(default_factory=tuple)  # Immutable
    metadata: dict[str, Any] = field(
        default_factory=dict,
    )  # Note: dict is mutable, but frozen prevents reassignment
    subtask_ids: tuple[str, ...] = field(default_factory=tuple)  # Immutable
    started_at: str | None = None
    completed_at: str | None = None
    result: dict[str, Any] | None = None

    def can_start(self, completed_task_ids: set[str]) -> bool:
        """Check if task can start based on dependencies.

        Args:
            completed_task_ids: Set of completed task IDs

        Returns:
            True if all dependencies are satisfied
        """
        return all(dep_id in completed_task_ids for dep_id in self.dependencies)

    def is_complete(self) -> bool:
        """Check if task is complete.

        Returns:
            True if status is COMPLETED
        """
        return self.status == TaskStatus.COMPLETED

    def is_failed(self) -> bool:
        """Check if task failed.

        Returns:
            True if status is FAILED
        """
        return self.status == TaskStatus.FAILED

    def is_in_progress(self) -> bool:
        """Check if task is in progress.

        Returns:
            True if status is IN_PROGRESS
        """
        return self.status == TaskStatus.IN_PROGRESS


class TaskBuilder:
    """Builder for creating Task instances.

    Use this to create new tasks or modified versions of existing tasks.

    Usage:
        # Create new task
        task = (TaskBuilder(id="task-1", description="Implement feature")
                .with_type("feature")
                .with_priority(TaskPriority.HIGH)
                .with_agent("backend-master")
                .build())

        # Create modified version
        updated_task = TaskBuilder.from_task(task).with_status(TaskStatus.IN_PROGRESS).build()
    """

    def __init__(self, id: str, description: str):
        """Initialize builder with required fields.

        Args:
            id: Task ID
            description: Task description
        """
        self._id = id
        self._description = description
        self._task_type = "feature"
        self._priority = TaskPriority.MEDIUM
        self._status = TaskStatus.PENDING
        self._assigned_agent = None
        self._dependencies = tuple()
        self._metadata = {}
        self._subtask_ids = tuple()
        self._started_at = None
        self._completed_at = None
        self._result = None

    @classmethod
    def from_task(cls, task: Task) -> "TaskBuilder":
        """Create builder from existing task.

        Args:
            task: Existing task to copy

        Returns:
            Builder with task's values
        """
        builder = cls(id=task.id, description=task.description)
        builder._task_type = task.task_type
        builder._priority = task.priority
        builder._status = task.status
        builder._assigned_agent = task.assigned_agent
        builder._dependencies = task.dependencies
        builder._metadata = task.metadata.copy()
        builder._subtask_ids = task.subtask_ids
        builder._started_at = task.started_at
        builder._completed_at = task.completed_at
        builder._result = task.result
        return builder

    def with_type(self, task_type: str) -> "TaskBuilder":
        """Set task type."""
        self._task_type = task_type
        return self

    def with_priority(self, priority: TaskPriority) -> "TaskBuilder":
        """Set priority."""
        self._priority = priority
        return self

    def with_status(self, status: TaskStatus) -> "TaskBuilder":
        """Set status."""
        self._status = status
        return self

    def with_agent(self, agent: str) -> "TaskBuilder":
        """Set assigned agent."""
        self._assigned_agent = agent
        return self

    def with_dependencies(self, *dependencies: str) -> "TaskBuilder":
        """Set dependencies."""
        self._dependencies = tuple(dependencies)
        return self

    def with_metadata(self, **metadata: Any) -> "TaskBuilder":
        """Set metadata."""
        self._metadata = metadata
        return self

    def with_subtasks(self, *subtask_ids: str) -> "TaskBuilder":
        """Set subtask IDs."""
        self._subtask_ids = tuple(subtask_ids)
        return self

    def with_timestamps(
        self,
        started_at: str | None = None,
        completed_at: str | None = None,
    ) -> "TaskBuilder":
        """Set timestamps."""
        self._started_at = started_at
        self._completed_at = completed_at
        return self

    def with_result(self, result: dict[str, Any]) -> "TaskBuilder":
        """Set result."""
        self._result = result
        return self

    def build(self) -> Task:
        """Build immutable Task.

        Returns:
            Immutable Task instance
        """
        return Task(
            id=self._id,
            description=self._description,
            task_type=self._task_type,
            priority=self._priority,
            status=self._status,
            assigned_agent=self._assigned_agent,
            dependencies=self._dependencies,
            metadata=self._metadata,
            subtask_ids=self._subtask_ids,
            started_at=self._started_at,
            completed_at=self._completed_at,
            result=self._result,
        )


__all__ = ["Task", "TaskBuilder", "TaskStatus", "TaskPriority"]

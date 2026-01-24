"""Service for task management operations."""

import logging
import uuid
from typing import Any

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task, TaskBuilder, TaskPriority, TaskStatus
from forge.agents.selection.strategy import AgentSelectionStrategy, KeywordStrategy


logger = logging.getLogger(__name__)


class TaskService:
    """Service for managing tasks.

    Responsibilities:
    - Creating tasks
    - Assigning agents to tasks
    - Tracking task state
    """

    def __init__(self, selection_strategy: AgentSelectionStrategy | None = None):
        """Initialize task service.

        Args:
            selection_strategy: Strategy for agent selection (defaults to KeywordStrategy)
        """
        self.selection_strategy = selection_strategy or KeywordStrategy()
        self.active_tasks: dict[str, Task] = {}
        self.completed_task_ids: set[str] = set()

    def create_task(
        self,
        description: str,
        task_type: str = "feature",
        priority: TaskPriority = TaskPriority.MEDIUM,
        metadata: dict[str, Any] | None = None,
        dependencies: list[str] | None = None,
    ) -> Task:
        """Create a new task and assign it to an agent.

        Args:
            description: Task description
            task_type: Type of task
            priority: Task priority
            metadata: Additional metadata
            dependencies: Task IDs this depends on

        Returns:
            Created task with assigned agent
        """
        # Generate task ID
        task_id = str(uuid.uuid4())[:8]

        # Create task
        builder = (
            TaskBuilder(id=task_id, description=description)
            .with_type(task_type)
            .with_priority(priority)
            .with_metadata(**(metadata or {}))
        )

        if dependencies:
            builder.with_dependencies(*dependencies)

        task = builder.build()

        # Assign agent
        agent_type = self.selection_strategy.select_agent(task)
        task = TaskBuilder.from_task(task).with_agent(agent_type.value).build()

        # Track task
        self.active_tasks[task_id] = task

        logger.info(f"Created task {task_id}: '{description}' assigned to {agent_type.value}")

        return task

    def get_task(self, task_id: str) -> Task | None:
        """Get task by ID.

        Args:
            task_id: Task identifier

        Returns:
            Task if found, None otherwise
        """
        return self.active_tasks.get(task_id)

    def update_task_status(self, task_id: str, new_status: TaskStatus) -> Task | None:
        """Update task status.

        Args:
            task_id: Task identifier
            new_status: New status

        Returns:
            Updated task or None if not found
        """
        task = self.active_tasks.get(task_id)
        if not task:
            return None

        # Create updated task
        updated_task = TaskBuilder.from_task(task).with_status(new_status).build()

        # Update tracking
        self.active_tasks[task_id] = updated_task

        if new_status == TaskStatus.COMPLETED:
            self.completed_task_ids.add(task_id)

        logger.info(f"Task {task_id} status updated to: {new_status.value}")

        return updated_task

    def mark_started(self, task_id: str, timestamp: str) -> Task | None:
        """Mark task as started.

        Args:
            task_id: Task identifier
            timestamp: Start timestamp

        Returns:
            Updated task or None
        """
        task = self.active_tasks.get(task_id)
        if not task:
            return None

        updated_task = (
            TaskBuilder.from_task(task)
            .with_status(TaskStatus.IN_PROGRESS)
            .with_timestamps(started_at=timestamp)
            .build()
        )

        self.active_tasks[task_id] = updated_task
        return updated_task

    def mark_completed(self, task_id: str, timestamp: str, result: dict[str, Any]) -> Task | None:
        """Mark task as completed.

        Args:
            task_id: Task identifier
            timestamp: Completion timestamp
            result: Task result data

        Returns:
            Updated task or None
        """
        task = self.active_tasks.get(task_id)
        if not task:
            return None

        updated_task = (
            TaskBuilder.from_task(task)
            .with_status(TaskStatus.COMPLETED)
            .with_timestamps(started_at=task.started_at, completed_at=timestamp)
            .with_result(result)
            .build()
        )

        self.active_tasks[task_id] = updated_task
        self.completed_task_ids.add(task_id)

        return updated_task

    def mark_failed(self, task_id: str, error: str) -> Task | None:
        """Mark task as failed.

        Args:
            task_id: Task identifier
            error: Error message

        Returns:
            Updated task or None
        """
        task = self.active_tasks.get(task_id)
        if not task:
            return None

        updated_task = (
            TaskBuilder.from_task(task)
            .with_status(TaskStatus.FAILED)
            .with_result({"error": error})
            .build()
        )

        self.active_tasks[task_id] = updated_task
        return updated_task

    def list_tasks(self, status: TaskStatus | None = None) -> list[Task]:
        """List tasks, optionally filtered by status.

        Args:
            status: Filter by status (optional)

        Returns:
            List of matching tasks, sorted by priority
        """
        tasks = list(self.active_tasks.values())

        if status:
            tasks = [t for t in tasks if t.status == status]

        # Sort by priority (high -> low) then by ID
        priority_order = {
            TaskPriority.CRITICAL: 0,
            TaskPriority.HIGH: 1,
            TaskPriority.MEDIUM: 2,
            TaskPriority.LOW: 3,
        }

        return sorted(tasks, key=lambda t: (priority_order.get(t.priority, 4), t.id))

    def reassign_agent(self, task_id: str, new_agent: AgentType) -> Task | None:
        """Reassign task to different agent.

        Args:
            task_id: Task identifier
            new_agent: New agent type

        Returns:
            Updated task or None
        """
        task = self.active_tasks.get(task_id)
        if not task:
            return None

        updated_task = TaskBuilder.from_task(task).with_agent(new_agent.value).build()

        self.active_tasks[task_id] = updated_task
        logger.info(f"Task {task_id} reassigned to {new_agent.value}")

        return updated_task


__all__ = ["TaskService"]

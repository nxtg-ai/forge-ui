"""NXTG-Forge Task Dispatcher

Distributes tasks to appropriate agents and manages task execution.

NOTE: This is a simplified v1.0 implementation. Full task dispatch will be
      implemented in v1.1 with advanced features like:
      - Task queue management with priorities
      - Parallel task execution
      - Task dependencies and workflow orchestration
      - Real-time task progress tracking
      - Task result aggregation
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional


logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status"""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TaskResult:
    """Result of task execution"""

    task_id: str
    status: TaskStatus
    output: Any = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    def __post_init__(self):
        if self.started_at and self.completed_at:
            self.duration_seconds = (self.completed_at - self.started_at).total_seconds()


@dataclass
class DispatchedTask:
    """Task that has been dispatched"""

    id: str
    description: str
    agent: str
    handler: Optional[Callable] = None
    status: TaskStatus = TaskStatus.QUEUED
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[TaskResult] = None
    metadata: dict[str, Any] = field(default_factory=dict)


class TaskDispatcher:
    """Dispatches tasks to agents and manages execution.

    v1.0: Simple sequential task dispatch
    v1.1+: Queue management, parallel execution, dependencies
    """

    def __init__(self, project_root: Optional[Path] = None):
        """Initialize the dispatcher.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = project_root or Path.cwd()
        self.tasks: dict[str, DispatchedTask] = {}
        self.task_history: list[DispatchedTask] = []

    def dispatch(
        self,
        task_id: str,
        description: str,
        agent: str,
        handler: Optional[Callable] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> DispatchedTask:
        """Dispatch a task to an agent.

        v1.0: Simple task registration
        v1.1: Queue task and execute based on priority and dependencies

        Args:
            task_id: Unique task identifier
            description: Task description
            agent: Agent to handle the task
            handler: Optional handler function to execute
            metadata: Additional task metadata

        Returns:
            Dispatched task object
        """
        task = DispatchedTask(
            id=task_id,
            description=description,
            agent=agent,
            handler=handler,
            metadata=metadata or {},
        )

        self.tasks[task_id] = task

        logger.info(f"Dispatched task {task_id} to {agent}: {description}")

        return task

    async def execute(self, task_id: str) -> TaskResult:
        """Execute a dispatched task.

        v1.0: Simple sequential execution
        v1.1: Async execution with progress tracking

        Args:
            task_id: Task to execute

        Returns:
            Task result

        Raises:
            KeyError: If task not found
        """
        task = self.tasks.get(task_id)
        if not task:
            raise KeyError(f"Task {task_id} not found")

        # Update status
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()

        logger.info(f"Executing task {task_id} with {task.agent}")

        try:
            # Execute handler if provided
            output = None
            if task.handler:
                if callable(task.handler):
                    output = (
                        await task.handler()
                        if hasattr(task.handler, "__await__")
                        else task.handler()
                    )

            # Mark as completed
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()

            result = TaskResult(
                task_id=task_id,
                status=TaskStatus.COMPLETED,
                output=output,
                started_at=task.started_at,
                completed_at=task.completed_at,
            )

            task.result = result

            logger.info(f"Task {task_id} completed in {result.duration_seconds:.2f}s")

            # Move to history
            self.task_history.append(task)

            return result

        except Exception as e:
            # Mark as failed
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.utcnow()

            result = TaskResult(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error=str(e),
                started_at=task.started_at,
                completed_at=task.completed_at,
            )

            task.result = result

            logger.error(f"Task {task_id} failed: {e!s}")

            # Move to history
            self.task_history.append(task)

            return result

    def get_task(self, task_id: str) -> Optional[DispatchedTask]:
        """Get task by ID.

        Args:
            task_id: Task identifier

        Returns:
            Task if found, None otherwise
        """
        return self.tasks.get(task_id)

    def list_tasks(
        self,
        status: Optional[TaskStatus] = None,
        agent: Optional[str] = None,
    ) -> list[DispatchedTask]:
        """List tasks, optionally filtered.

        Args:
            status: Filter by status
            agent: Filter by agent

        Returns:
            List of matching tasks
        """
        tasks = list(self.tasks.values())

        if status:
            tasks = [t for t in tasks if t.status == status]

        if agent:
            tasks = [t for t in tasks if t.agent == agent]

        return tasks

    def cancel_task(self, task_id: str) -> bool:
        """Cancel a task.

        v1.0: Simple status update
        v1.1: Interrupt running tasks gracefully

        Args:
            task_id: Task to cancel

        Returns:
            True if cancelled, False if not found or already completed
        """
        task = self.tasks.get(task_id)
        if not task:
            return False

        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            return False

        task.status = TaskStatus.CANCELLED
        task.completed_at = datetime.utcnow()

        logger.info(f"Task {task_id} cancelled")

        # Move to history
        self.task_history.append(task)
        del self.tasks[task_id]

        return True

    def get_agent_workload(self, agent: str) -> int:
        """Get number of active tasks for an agent.

        Args:
            agent: Agent name

        Returns:
            Number of queued or running tasks
        """
        return len(
            [
                t
                for t in self.tasks.values()
                if t.agent == agent and t.status in [TaskStatus.QUEUED, TaskStatus.RUNNING]
            ],
        )

    def get_task_stats(self) -> dict[str, Any]:
        """Get task execution statistics.

        Returns:
            Dictionary with task statistics
        """
        all_tasks = list(self.tasks.values()) + self.task_history

        total = len(all_tasks)
        completed = len([t for t in all_tasks if t.status == TaskStatus.COMPLETED])
        failed = len([t for t in all_tasks if t.status == TaskStatus.FAILED])
        running = len([t for t in all_tasks if t.status == TaskStatus.RUNNING])
        queued = len([t for t in all_tasks if t.status == TaskStatus.QUEUED])

        # Calculate average duration for completed tasks
        completed_tasks = [
            t for t in all_tasks if t.result and t.result.status == TaskStatus.COMPLETED
        ]
        avg_duration = 0.0
        if completed_tasks:
            avg_duration = sum(
                t.result.duration_seconds for t in completed_tasks if t.result is not None
            ) / len(completed_tasks)

        return {
            "total": total,
            "completed": completed,
            "failed": failed,
            "running": running,
            "queued": queued,
            "success_rate": (completed / total * 100) if total > 0 else 0.0,
            "average_duration_seconds": avg_duration,
        }

    def clear_history(self):
        """Clear task history."""
        self.task_history.clear()
        logger.info("Task history cleared")


# Convenience functions
def dispatch_task(description: str, agent: str, task_id: Optional[str] = None) -> DispatchedTask:
    """Convenience function to dispatch a task.

    Args:
        description: Task description
        agent: Agent to handle the task
        task_id: Optional task ID (generated if not provided)

    Returns:
        Dispatched task
    """
    import uuid

    dispatcher = TaskDispatcher()
    task_id = task_id or str(uuid.uuid4())[:8]

    return dispatcher.dispatch(task_id=task_id, description=description, agent=agent)


def get_task_status(task_id: str) -> Optional[TaskStatus]:
    """Get status of a task.

    Args:
        task_id: Task identifier

    Returns:
        Task status or None if not found
    """
    dispatcher = TaskDispatcher()
    task = dispatcher.get_task(task_id)
    return task.status if task else None

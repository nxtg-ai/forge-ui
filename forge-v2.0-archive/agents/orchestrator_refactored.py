"""Refactored Agent Orchestrator - Clean Architecture Edition.

Thin orchestration layer - all business logic is in services.
v2.0: Refactored with SOLID principles, dependency injection, immutable models
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task, TaskPriority, TaskStatus
from forge.agents.execution import AsyncExecutor, SyncExecutor, TaskExecutor
from forge.agents.selection.strategy import AgentSelectionStrategy, KeywordStrategy
from forge.agents.services import AgentLoader, TaskDecomposer, TaskService
from forge.result import Err, Result


logger = logging.getLogger(__name__)

# Priority mapping
PRIORITY_MAP = {
    "low": TaskPriority.LOW,
    "medium": TaskPriority.MEDIUM,
    "high": TaskPriority.HIGH,
    "critical": TaskPriority.CRITICAL,
}


class AgentOrchestrator:
    """Orchestrates AI agents to complete development tasks.

    Thin coordination layer - delegates to services for all logic.
    """

    def __init__(
        self,
        project_root: Path | None = None,
        selection_strategy: AgentSelectionStrategy | None = None,
        executor: TaskExecutor | None = None,
        use_async: bool = False,
        max_parallel: int = 3,
    ):
        """Initialize orchestrator with services and executor."""
        self.project_root = project_root or Path.cwd()

        # Services
        self.agent_loader = AgentLoader(self.project_root)
        self.selection_strategy = selection_strategy or KeywordStrategy()
        self.task_service = TaskService(self.selection_strategy)
        self.task_decomposer = TaskDecomposer()

        # Executor
        if executor:
            self.executor = executor
        elif use_async:
            self.executor = AsyncExecutor(max_parallel=max_parallel)
        else:
            self.executor = SyncExecutor()

        # Load agents
        result = self.agent_loader.load_agents()
        self.agents = result.value if result.is_ok() else {}
        if result.is_error():
            logger.warning(f"Failed to load agents: {result.error}")

    def create_task(
        self,
        description: str,
        task_type: str = "feature",
        priority: str = "medium",
        metadata: dict[str, Any] | None = None,
    ) -> Task:
        """Create and assign a task."""
        task_priority = PRIORITY_MAP.get(priority.lower(), TaskPriority.MEDIUM)
        return self.task_service.create_task(
            description=description,
            task_type=task_type,
            priority=task_priority,
            metadata=metadata,
        )

    def decompose_task(self, task: Task) -> list[Task]:
        """Decompose complex task into subtasks."""
        subtasks = self.task_decomposer.decompose(task)
        for subtask in subtasks:
            self.task_service.active_tasks[subtask.id] = subtask
        return subtasks

    def _update_task_status(self, task_id: str, result: Result[dict[str, Any], str]) -> None:
        """Update task status based on execution result."""
        timestamp = datetime.utcnow().isoformat() + "Z"
        if result.is_ok():
            self.task_service.mark_completed(task_id, timestamp, result.value)
        else:
            self.task_service.mark_failed(task_id, result.error)

    def execute_task(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute a single task synchronously."""
        timestamp = datetime.utcnow().isoformat() + "Z"
        self.task_service.mark_started(task.id, timestamp)

        result = self.executor.execute(task)
        self._update_task_status(task.id, result)
        return result

    async def execute_task_async(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute task asynchronously."""
        if not isinstance(self.executor, AsyncExecutor):
            return Err("Async execution requires AsyncExecutor")

        timestamp = datetime.utcnow().isoformat() + "Z"
        self.task_service.mark_started(task.id, timestamp)

        result = await self.executor.execute_async(task)
        self._update_task_status(task.id, result)
        return result

    async def execute_parallel(self, tasks: list[Task]) -> list[Result[dict[str, Any], str]]:
        """Execute multiple tasks in parallel."""
        if not isinstance(self.executor, AsyncExecutor):
            return [Err("Async execution requires AsyncExecutor") for _ in tasks]

        # Mark all as started
        timestamp = datetime.utcnow().isoformat() + "Z"
        for task in tasks:
            self.task_service.mark_started(task.id, timestamp)

        # Execute and update
        results = await self.executor.execute_parallel(tasks)
        for task, result in zip(tasks, results):
            self._update_task_status(task.id, result)

        return results

    def register_agent_callback(self, agent_type: AgentType, callback: Callable) -> None:
        """Register callback for agent execution."""
        self.executor.register_callback(agent_type, callback)

    def get_agent_context(self, agent_type: AgentType) -> str:
        """Get skill file path for agent."""
        agent = self.agents.get(agent_type)
        return str(agent.skill_file) if agent else ""

    def list_tasks(self, status: str | None = None) -> list[Task]:
        """List tasks, optionally filtered by status."""
        status_enum = None
        if status:
            try:
                status_enum = TaskStatus(status)
            except ValueError:
                pass
        return self.task_service.list_tasks(status_enum)

    def get_task(self, task_id: str) -> Task | None:
        """Get task by ID."""
        return self.task_service.get_task(task_id)


__all__ = ["AgentOrchestrator"]

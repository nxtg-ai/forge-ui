"""Synchronous task executor."""

import logging
from typing import Any

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task
from forge.result import Err, Ok, Result

from .executor import TaskExecutor


logger = logging.getLogger(__name__)


class SyncExecutor(TaskExecutor):
    """Synchronous task executor.

    Executes tasks one at a time in the current thread.
    Simple and predictable, suitable for most use cases.
    """

    def execute(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute a task synchronously.

        Args:
            task: Task to execute

        Returns:
            Result containing task output or error
        """
        if not task.assigned_agent:
            return Err("Task has no assigned agent")

        try:
            agent_type = AgentType(task.assigned_agent)
        except ValueError:
            return Err(f"Invalid agent type: {task.assigned_agent}")

        logger.info(f"Executing task {task.id} with {agent_type.value}")

        # Get callback for agent
        callback = self.get_callback(agent_type)

        if not callback:
            # Default execution - just mark as completed
            logger.warning(f"No callback registered for {agent_type.value}, using default")
            return Ok(
                {
                    "status": "completed",
                    "message": f"Task {task.id} completed (no callback)",
                    "task_id": task.id,
                },
            )

        # Execute callback
        try:
            result = callback(task)

            # Ensure result is a dict
            if not isinstance(result, dict):
                result = {"status": "completed", "result": result}

            return Ok(result)

        except Exception as e:
            logger.error(f"Task {task.id} failed: {e}")
            return Err(f"Execution failed: {e!s}")


__all__ = ["SyncExecutor"]

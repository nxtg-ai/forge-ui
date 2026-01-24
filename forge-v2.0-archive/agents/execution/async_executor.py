"""Asynchronous task executor with parallel execution."""

import asyncio
import logging
from typing import Any

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task
from forge.result import Err, Ok, Result

from .executor import TaskExecutor


logger = logging.getLogger(__name__)


class AsyncExecutor(TaskExecutor):
    """Asynchronous task executor.

    Executes tasks concurrently with dependency resolution and parallel limits.
    Suitable for I/O-bound tasks and workflows requiring coordination.
    """

    def __init__(self, max_parallel: int = 3):
        """Initialize async executor.

        Args:
            max_parallel: Maximum number of concurrent tasks
        """
        super().__init__()
        self.max_parallel = max_parallel
        self._completed_tasks: set[str] = set()

    def execute(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute a task asynchronously (runs in new event loop).

        This is a synchronous wrapper around async execution.

        Args:
            task: Task to execute

        Returns:
            Result containing task output or error
        """
        # Create new event loop for this execution
        try:
            return asyncio.run(self.execute_async(task))
        except RuntimeError:
            # Event loop already running, use it
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(self.execute_async(task))

    async def execute_async(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute a task asynchronously.

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

        logger.info(f"Executing task {task.id} with {agent_type.value} (async)")

        # Wait for dependencies
        await self._wait_for_dependencies(task)

        # Get callback for agent
        callback = self.get_callback(agent_type)

        if not callback:
            logger.warning(f"No callback registered for {agent_type.value}, using default")
            self._completed_tasks.add(task.id)
            return Ok(
                {
                    "status": "completed",
                    "message": f"Task {task.id} completed (no callback)",
                    "task_id": task.id,
                },
            )

        # Execute callback
        try:
            # Check if callback is async
            if asyncio.iscoroutinefunction(callback):
                result = await callback(task)
            else:
                # Run sync callback in executor
                result = await asyncio.to_thread(callback, task)

            # Ensure result is a dict
            if not isinstance(result, dict):
                result = {"status": "completed", "result": result}

            self._completed_tasks.add(task.id)
            return Ok(result)

        except Exception as e:
            logger.error(f"Task {task.id} failed: {e}")
            return Err(f"Execution failed: {e!s}")

    async def execute_parallel(self, tasks: list[Task]) -> list[Result[dict[str, Any], str]]:
        """Execute multiple tasks in parallel with dependency resolution.

        Args:
            tasks: List of tasks to execute

        Returns:
            List of results (one per task)
        """
        # Reset completed tasks for this batch
        self._completed_tasks.clear()

        # Create semaphore to limit parallelism
        semaphore = asyncio.Semaphore(self.max_parallel)

        async def execute_with_semaphore(task: Task) -> Result[dict[str, Any], str]:
            async with semaphore:
                return await self.execute_async(task)

        # Execute all tasks
        results = await asyncio.gather(
            *[execute_with_semaphore(task) for task in tasks],
            return_exceptions=True,
        )

        # Convert exceptions to Err results
        final_results: list[Result[dict[str, Any], str]] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Task {tasks[i].id} raised exception: {result}")
                final_results.append(Err(f"Exception: {result!s}"))
            elif isinstance(result, (Ok, Err)):
                final_results.append(result)
            else:
                # Should not happen, but handle anyway
                final_results.append(Ok({"status": "completed", "result": result}))

        return final_results

    async def _wait_for_dependencies(self, task: Task) -> None:
        """Wait for task dependencies to complete.

        Args:
            task: Task to check
        """
        if not task.dependencies:
            return

        # Poll for dependencies (simple implementation)
        max_wait = 300  # 5 minutes max
        waited = 0
        interval = 0.1

        while not task.can_start(self._completed_tasks):
            if waited >= max_wait:
                logger.warning(f"Task {task.id} timed out waiting for dependencies")
                break

            await asyncio.sleep(interval)
            waited += interval


__all__ = ["AsyncExecutor"]

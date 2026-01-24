"""Abstract task executor interface."""

from abc import ABC, abstractmethod
from typing import Any, Callable

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task
from forge.result import Result


class TaskExecutor(ABC):
    """Abstract base class for task executors.

    Executors are responsible for running tasks and managing their lifecycle.
    """

    def __init__(self):
        """Initialize executor."""
        self._callbacks: dict[AgentType, Callable] = {}

    def register_callback(self, agent_type: AgentType, callback: Callable) -> None:
        """Register callback for agent execution.

        Args:
            agent_type: Type of agent
            callback: Callback function for task execution
        """
        self._callbacks[agent_type] = callback

    def get_callback(self, agent_type: AgentType) -> Callable | None:
        """Get callback for agent type.

        Args:
            agent_type: Type of agent

        Returns:
            Callback function or None
        """
        return self._callbacks.get(agent_type)

    @abstractmethod
    def execute(self, task: Task) -> Result[dict[str, Any], str]:
        """Execute a task.

        Args:
            task: Task to execute

        Returns:
            Result containing task output or error
        """


__all__ = ["TaskExecutor"]

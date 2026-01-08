"""NXTG-Forge Agent System.

Orchestration and dispatching for specialized AI agents.
"""

__version__ = "1.0.0"

from .dispatcher import DispatchedTask, TaskDispatcher, TaskResult, TaskStatus, dispatch_task
from .orchestrator import AgentOrchestrator, AgentType, Task, suggest_agent


__all__ = [
    "AgentOrchestrator",
    "AgentType",
    "DispatchedTask",
    "Task",
    "TaskDispatcher",
    "TaskResult",
    "TaskStatus",
    "dispatch_task",
    "suggest_agent",
]

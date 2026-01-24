"""Service for decomposing complex tasks into subtasks."""

import logging

from forge.agents.domain.agent import AgentType
from forge.agents.domain.task import Task, TaskBuilder


logger = logging.getLogger(__name__)


class TaskDecomposer:
    """Decomposes complex tasks into smaller subtasks.

    Implements common decomposition patterns for different task types.
    """

    def decompose(self, task: Task) -> list[Task]:
        """Decompose task into subtasks.

        Args:
            task: Complex task to decompose

        Returns:
            List of subtasks with proper dependencies
        """
        task_type = task.task_type.lower()

        # Select decomposition strategy based on task type
        if task_type == "feature":
            return self._decompose_feature(task)
        elif task_type == "bugfix":
            return self._decompose_bugfix(task)
        elif task_type == "refactor":
            return self._decompose_refactor(task)
        else:
            # Default: no decomposition
            logger.info(f"No decomposition strategy for task type: {task_type}")
            return []

    def _decompose_feature(self, task: Task) -> list[Task]:
        """Decompose feature into design -> implement -> test.

        Args:
            task: Feature task

        Returns:
            List of subtasks
        """
        parent_id = task.id

        subtasks = [
            # 1. Design/Architecture
            (
                TaskBuilder(
                    id=f"{parent_id}-arch",
                    description=f"Design architecture for: {task.description}",
                )
                .with_type("design")
                .with_priority(task.priority)
                .with_agent(AgentType.LEAD_ARCHITECT.value)
                .with_metadata(parent_task=parent_id, phase="architecture")
                .build()
            ),
            # 2. Implementation
            (
                TaskBuilder(
                    id=f"{parent_id}-impl",
                    description=f"Implement: {task.description}",
                )
                .with_type("implementation")
                .with_priority(task.priority)
                .with_agent(AgentType.BACKEND_MASTER.value)
                .with_dependencies(f"{parent_id}-arch")
                .with_metadata(parent_task=parent_id, phase="implementation")
                .build()
            ),
            # 3. Testing
            (
                TaskBuilder(
                    id=f"{parent_id}-test",
                    description=f"Test: {task.description}",
                )
                .with_type("testing")
                .with_priority(task.priority)
                .with_agent(AgentType.QA_SENTINEL.value)
                .with_dependencies(f"{parent_id}-impl")
                .with_metadata(parent_task=parent_id, phase="testing")
                .build()
            ),
        ]

        logger.info(f"Decomposed feature {parent_id} into {len(subtasks)} subtasks")
        return subtasks

    def _decompose_bugfix(self, task: Task) -> list[Task]:
        """Decompose bugfix into diagnose -> fix -> verify.

        Args:
            task: Bugfix task

        Returns:
            List of subtasks
        """
        parent_id = task.id

        subtasks = [
            # 1. Diagnose
            (
                TaskBuilder(
                    id=f"{parent_id}-diagnose",
                    description=f"Diagnose root cause: {task.description}",
                )
                .with_type("diagnosis")
                .with_priority(task.priority)
                .with_agent(AgentType.QA_SENTINEL.value)
                .with_metadata(parent_task=parent_id, phase="diagnosis")
                .build()
            ),
            # 2. Fix
            (
                TaskBuilder(
                    id=f"{parent_id}-fix",
                    description=f"Fix bug: {task.description}",
                )
                .with_type("bugfix")
                .with_priority(task.priority)
                .with_agent(AgentType.BACKEND_MASTER.value)
                .with_dependencies(f"{parent_id}-diagnose")
                .with_metadata(parent_task=parent_id, phase="fix")
                .build()
            ),
            # 3. Verify
            (
                TaskBuilder(
                    id=f"{parent_id}-verify",
                    description=f"Verify fix: {task.description}",
                )
                .with_type("verification")
                .with_priority(task.priority)
                .with_agent(AgentType.QA_SENTINEL.value)
                .with_dependencies(f"{parent_id}-fix")
                .with_metadata(parent_task=parent_id, phase="verification")
                .build()
            ),
        ]

        logger.info(f"Decomposed bugfix {parent_id} into {len(subtasks)} subtasks")
        return subtasks

    def _decompose_refactor(self, task: Task) -> list[Task]:
        """Decompose refactor into analyze -> refactor -> validate.

        Args:
            task: Refactor task

        Returns:
            List of subtasks
        """
        parent_id = task.id

        subtasks = [
            # 1. Analyze
            (
                TaskBuilder(
                    id=f"{parent_id}-analyze",
                    description=f"Analyze code for: {task.description}",
                )
                .with_type("analysis")
                .with_priority(task.priority)
                .with_agent(AgentType.LEAD_ARCHITECT.value)
                .with_metadata(parent_task=parent_id, phase="analysis")
                .build()
            ),
            # 2. Refactor
            (
                TaskBuilder(
                    id=f"{parent_id}-refactor",
                    description=f"Refactor: {task.description}",
                )
                .with_type("refactoring")
                .with_priority(task.priority)
                .with_agent(AgentType.BACKEND_MASTER.value)
                .with_dependencies(f"{parent_id}-analyze")
                .with_metadata(parent_task=parent_id, phase="refactoring")
                .build()
            ),
            # 3. Validate
            (
                TaskBuilder(
                    id=f"{parent_id}-validate",
                    description=f"Validate refactoring: {task.description}",
                )
                .with_type("validation")
                .with_priority(task.priority)
                .with_agent(AgentType.QA_SENTINEL.value)
                .with_dependencies(f"{parent_id}-refactor")
                .with_metadata(parent_task=parent_id, phase="validation")
                .build()
            ),
        ]

        logger.info(f"Decomposed refactor {parent_id} into {len(subtasks)} subtasks")
        return subtasks


__all__ = ["TaskDecomposer"]

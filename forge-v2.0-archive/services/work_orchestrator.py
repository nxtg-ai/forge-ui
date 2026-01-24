"""Work Orchestrator Service for autonomous multi-step workflows.

This service coordinates autonomous feature implementation workflows,
managing agent handoffs, checkpoints, error recovery, and progress tracking.
"""

import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path

from ..result import Err, Ok, Result, StateError


class WorkflowPhase(Enum):
    """Workflow execution phases."""

    PLANNING = "planning"
    ARCHITECTURE = "architecture"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    REVIEW = "review"
    COMMIT = "commit"
    COMPLETE = "complete"
    FAILED = "failed"


@dataclass
class FeatureSpec:
    """Specification for a feature to implement."""

    name: str
    description: str
    requirements: list[str] = field(default_factory=list)
    acceptance_criteria: list[str] = field(default_factory=list)
    estimated_hours: float = 0.0
    priority: str = "medium"  # "low", "medium", "high", "critical"


@dataclass
class WorkflowTask:
    """Individual task in workflow."""

    id: str
    description: str
    agent: str  # Which agent handles this task
    status: str = "pending"  # "pending", "in_progress", "complete", "failed"
    result: str | None = None
    error: str | None = None
    duration_seconds: float = 0.0


@dataclass
class Workflow:
    """Complete workflow definition."""

    id: str
    feature: FeatureSpec
    tasks: list[WorkflowTask] = field(default_factory=list)
    current_phase: WorkflowPhase = WorkflowPhase.PLANNING
    started_at: str = ""
    completed_at: str | None = None
    checkpoints: list[str] = field(default_factory=list)


@dataclass
class WorkflowResult:
    """Result of workflow execution."""

    workflow_id: str
    status: str  # "success", "partial", "failed"
    phases_completed: list[str] = field(default_factory=list)
    tasks_completed: int = 0
    tasks_failed: int = 0
    total_duration_seconds: float = 0.0
    checkpoints_created: list[str] = field(default_factory=list)
    final_commit_hash: str | None = None
    error_message: str | None = None


@dataclass
class AgentError:
    """Error from agent execution."""

    agent: str
    task_id: str
    error_message: str
    recoverable: bool


@dataclass
class RecoveryAction:
    """Action to take for error recovery."""

    action_type: str  # "retry", "skip", "fallback", "abort"
    description: str
    checkpoint_id: str | None = None


@dataclass
class AgentResults:
    """Results from coordinated agent execution."""

    completed_tasks: list[WorkflowTask] = field(default_factory=list)
    failed_tasks: list[WorkflowTask] = field(default_factory=list)
    checkpoints: list[str] = field(default_factory=list)


class WorkOrchestrator:
    """Service for orchestrating autonomous multi-step workflows."""

    def __init__(self, project_root: Path | str = "."):
        """Initialize work orchestrator.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root)
        self.workflows_dir = self.project_root / ".claude" / "forge" / "workflows"
        self.checkpoints_dir = self.project_root / ".claude" / "forge" / "checkpoints"

        # Ensure directories exist
        self.workflows_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)

    def execute_feature_workflow(self, feature: FeatureSpec) -> Result[WorkflowResult, StateError]:
        """Execute complete feature implementation workflow.

        Args:
            feature: Feature specification

        Returns:
            Result containing WorkflowResult or StateError
        """
        # Create workflow
        workflow_id = self._generate_workflow_id(feature.name)
        workflow = Workflow(
            id=workflow_id,
            feature=feature,
            started_at=datetime.utcnow().isoformat() + "Z",
        )

        # Plan workflow tasks
        planning_result = self._plan_workflow_tasks(workflow)
        if planning_result.is_error():
            return Err(planning_result.error)  # type: ignore

        workflow.tasks = planning_result.value

        # Execute workflow phases
        result = self._execute_workflow_phases(workflow)

        # Save workflow record
        self._save_workflow(workflow)

        return result

    def coordinate_agents(self, workflow: Workflow) -> Result[AgentResults, StateError]:
        """Coordinate multiple agents for workflow execution.

        Args:
            workflow: Workflow to execute

        Returns:
            Result containing AgentResults or StateError
        """
        results = AgentResults()

        for task in workflow.tasks:
            if task.status == "complete":
                results.completed_tasks.append(task)
                continue

            # Execute task with appropriate agent
            task_result = self._execute_task_with_agent(task, workflow)

            if task_result.is_ok():
                task.status = "complete"
                task.result = task_result.value
                results.completed_tasks.append(task)

                # Create checkpoint after major tasks
                if self._is_major_task(task):
                    checkpoint_id = self._create_task_checkpoint(task, workflow)
                    if checkpoint_id:
                        results.checkpoints.append(checkpoint_id)

            else:
                task.status = "failed"
                task.error = str(task_result.error)
                results.failed_tasks.append(task)

                # Attempt recovery
                recovery = self.handle_agent_failure(
                    AgentError(
                        agent=task.agent,
                        task_id=task.id,
                        error_message=task.error,
                        recoverable=True,
                    ),
                )

                if recovery.is_ok() and recovery.value.action_type == "retry":
                    # Retry task once
                    retry_result = self._execute_task_with_agent(task, workflow)
                    if retry_result.is_ok():
                        task.status = "complete"
                        task.result = retry_result.value
                        results.completed_tasks.append(task)
                        results.failed_tasks.remove(task)

        return Ok(results)

    def handle_agent_failure(self, error: AgentError) -> Result[RecoveryAction, StateError]:
        """Handle agent execution failure with recovery strategy.

        Args:
            error: AgentError containing failure details

        Returns:
            Result containing RecoveryAction or StateError
        """
        # Analyze error to determine recovery strategy
        if "timeout" in error.error_message.lower():
            # Timeout errors are retryable
            return Ok(
                RecoveryAction(
                    action_type="retry",
                    description="Task timed out, retrying with increased timeout",
                ),
            )

        elif "permission" in error.error_message.lower() or "access" in error.error_message.lower():
            # Permission errors require manual intervention
            return Ok(
                RecoveryAction(
                    action_type="abort",
                    description="Permission error requires manual intervention",
                ),
            )

        elif error.recoverable:
            # Generic recoverable error - retry once
            return Ok(RecoveryAction(action_type="retry", description="Retrying failed task"))

        else:
            # Non-recoverable error - abort workflow
            return Ok(
                RecoveryAction(
                    action_type="abort",
                    description="Non-recoverable error, aborting workflow",
                ),
            )

    def _plan_workflow_tasks(self, workflow: Workflow) -> Result[list[WorkflowTask], StateError]:
        """Plan workflow tasks based on feature spec.

        Args:
            workflow: Workflow to plan

        Returns:
            Result containing list of WorkflowTask objects
        """
        feature = workflow.feature
        tasks: list[WorkflowTask] = []

        # Phase 1: Architecture design
        tasks.append(
            WorkflowTask(
                id=f"{workflow.id}_arch",
                description=f"Design architecture for {feature.name}",
                agent="agent-forge-planner",
                status="pending",
            ),
        )

        # Phase 2: Implementation
        tasks.append(
            WorkflowTask(
                id=f"{workflow.id}_impl",
                description=f"Implement {feature.name}",
                agent="agent-forge-builder",
                status="pending",
            ),
        )

        # Phase 3: Testing
        tasks.append(
            WorkflowTask(
                id=f"{workflow.id}_test",
                description=f"Create tests for {feature.name}",
                agent="agent-forge-guardian",
                status="pending",
            ),
        )

        # Phase 4: Review
        tasks.append(
            WorkflowTask(
                id=f"{workflow.id}_review",
                description=f"Review and validate {feature.name}",
                agent="agent-forge-detective",
                status="pending",
            ),
        )

        return Ok(tasks)

    def _execute_workflow_phases(self, workflow: Workflow) -> Result[WorkflowResult, StateError]:
        """Execute all workflow phases.

        Args:
            workflow: Workflow to execute

        Returns:
            Result containing WorkflowResult
        """
        start_time = time.time()
        phases_completed: list[str] = []
        checkpoints_created: list[str] = []

        # Execute each phase
        for phase in WorkflowPhase:
            if phase in [WorkflowPhase.COMPLETE, WorkflowPhase.FAILED]:
                continue

            workflow.current_phase = phase

            # Execute tasks for this phase
            phase_tasks = [t for t in workflow.tasks if self._task_belongs_to_phase(t, phase)]

            for task in phase_tasks:
                task_start = time.time()
                task_result = self._execute_task_with_agent(task, workflow)

                task.duration_seconds = time.time() - task_start

                if task_result.is_ok():
                    task.status = "complete"
                    task.result = task_result.value
                else:
                    task.status = "failed"
                    task.error = str(task_result.error)

                    # Handle failure
                    recovery = self.handle_agent_failure(
                        AgentError(
                            agent=task.agent,
                            task_id=task.id,
                            error_message=task.error,
                            recoverable=True,
                        ),
                    )

                    if recovery.is_ok() and recovery.value.action_type == "abort":
                        workflow.current_phase = WorkflowPhase.FAILED
                        return Ok(
                            WorkflowResult(
                                workflow_id=workflow.id,
                                status="failed",
                                phases_completed=phases_completed,
                                tasks_completed=len(
                                    [t for t in workflow.tasks if t.status == "complete"],
                                ),
                                tasks_failed=len(
                                    [t for t in workflow.tasks if t.status == "failed"],
                                ),
                                total_duration_seconds=time.time() - start_time,
                                checkpoints_created=checkpoints_created,
                                error_message=task.error,
                            ),
                        )

            phases_completed.append(phase.value)

            # Create checkpoint after each major phase
            if phase in [
                WorkflowPhase.ARCHITECTURE,
                WorkflowPhase.IMPLEMENTATION,
                WorkflowPhase.TESTING,
            ]:
                checkpoint_id = self._create_phase_checkpoint(workflow, phase)
                if checkpoint_id:
                    checkpoints_created.append(checkpoint_id)
                    workflow.checkpoints.append(checkpoint_id)

        # All phases complete
        workflow.current_phase = WorkflowPhase.COMPLETE
        workflow.completed_at = datetime.utcnow().isoformat() + "Z"

        return Ok(
            WorkflowResult(
                workflow_id=workflow.id,
                status="success",
                phases_completed=phases_completed,
                tasks_completed=len([t for t in workflow.tasks if t.status == "complete"]),
                tasks_failed=len([t for t in workflow.tasks if t.status == "failed"]),
                total_duration_seconds=time.time() - start_time,
                checkpoints_created=checkpoints_created,
            ),
        )

    def _execute_task_with_agent(
        self,
        task: WorkflowTask,
        workflow: Workflow,
    ) -> Result[str, StateError]:
        """Execute task with designated agent.

        Args:
            task: Task to execute
            workflow: Parent workflow

        Returns:
            Result containing task result string or StateError
        """
        # This is a placeholder - actual implementation would invoke
        # the appropriate agent via Claude Code's agent system

        # For now, simulate successful execution
        task.status = "in_progress"

        # In real implementation, this would:
        # 1. Load agent from .claude/agents/{agent_name}.md
        # 2. Prepare context including workflow, feature spec, task details
        # 3. Invoke agent
        # 4. Capture agent output
        # 5. Validate result
        # 6. Return result or error

        result = f"Task '{task.description}' completed by {task.agent}"
        return Ok(result)

    def _task_belongs_to_phase(self, task: WorkflowTask, phase: WorkflowPhase) -> bool:
        """Check if task belongs to workflow phase.

        Args:
            task: Task to check
            phase: Phase to check against

        Returns:
            True if task belongs to phase
        """
        phase_mapping = {
            WorkflowPhase.PLANNING: ["plan", "design", "architect"],
            WorkflowPhase.ARCHITECTURE: ["arch", "design", "plan"],
            WorkflowPhase.IMPLEMENTATION: ["impl", "build", "create"],
            WorkflowPhase.TESTING: ["test", "validate", "verify"],
            WorkflowPhase.REVIEW: ["review", "check", "inspect"],
        }

        keywords = phase_mapping.get(phase, [])
        task_desc_lower = task.description.lower()

        return any(keyword in task_desc_lower for keyword in keywords)

    def _is_major_task(self, task: WorkflowTask) -> bool:
        """Check if task is major enough for checkpoint.

        Args:
            task: Task to check

        Returns:
            True if major task
        """
        major_keywords = ["implement", "architecture", "testing", "review"]
        return any(keyword in task.description.lower() for keyword in major_keywords)

    def _create_task_checkpoint(self, task: WorkflowTask, workflow: Workflow) -> str | None:
        """Create checkpoint after task completion.

        Args:
            task: Completed task
            workflow: Parent workflow

        Returns:
            Checkpoint ID or None if failed
        """
        checkpoint_id = f"checkpoint_{workflow.id}_{task.id}_{int(time.time())}"

        checkpoint_data = {
            "id": checkpoint_id,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "description": f"After completing: {task.description}",
            "workflow_id": workflow.id,
            "task_id": task.id,
            "phase": workflow.current_phase.value,
        }

        try:
            checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
            with open(checkpoint_file, "w", encoding="utf-8") as f:
                json.dump(checkpoint_data, f, indent=2)

            return checkpoint_id
        except Exception:
            return None

    def _create_phase_checkpoint(self, workflow: Workflow, phase: WorkflowPhase) -> str | None:
        """Create checkpoint after phase completion.

        Args:
            workflow: Workflow
            phase: Completed phase

        Returns:
            Checkpoint ID or None if failed
        """
        checkpoint_id = f"checkpoint_{workflow.id}_{phase.value}_{int(time.time())}"

        checkpoint_data = {
            "id": checkpoint_id,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "description": f"After {phase.value} phase: {workflow.feature.name}",
            "workflow_id": workflow.id,
            "phase": phase.value,
        }

        try:
            checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
            with open(checkpoint_file, "w", encoding="utf-8") as f:
                json.dump(checkpoint_data, f, indent=2)

            return checkpoint_id
        except Exception:
            return None

    def _generate_workflow_id(self, feature_name: str) -> str:
        """Generate unique workflow ID.

        Args:
            feature_name: Feature name

        Returns:
            Workflow ID
        """
        # Sanitize feature name
        sanitized = "".join(c if c.isalnum() else "_" for c in feature_name.lower())[:30]
        timestamp = int(time.time())
        return f"workflow_{sanitized}_{timestamp}"

    def _save_workflow(self, workflow: Workflow) -> None:
        """Save workflow to disk.

        Args:
            workflow: Workflow to save
        """
        workflow_data = {
            "id": workflow.id,
            "feature": {
                "name": workflow.feature.name,
                "description": workflow.feature.description,
                "requirements": workflow.feature.requirements,
                "acceptance_criteria": workflow.feature.acceptance_criteria,
                "estimated_hours": workflow.feature.estimated_hours,
                "priority": workflow.feature.priority,
            },
            "tasks": [
                {
                    "id": t.id,
                    "description": t.description,
                    "agent": t.agent,
                    "status": t.status,
                    "result": t.result,
                    "error": t.error,
                    "duration_seconds": t.duration_seconds,
                }
                for t in workflow.tasks
            ],
            "current_phase": workflow.current_phase.value,
            "started_at": workflow.started_at,
            "completed_at": workflow.completed_at,
            "checkpoints": workflow.checkpoints,
        }

        try:
            workflow_file = self.workflows_dir / f"{workflow.id}.json"
            with open(workflow_file, "w", encoding="utf-8") as f:
                json.dump(workflow_data, f, indent=2)
        except Exception:
            pass  # Non-critical failure

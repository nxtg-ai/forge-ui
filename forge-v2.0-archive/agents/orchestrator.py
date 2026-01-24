"""NXTG-Forge Agent Orchestrator

Coordinates multiple specialized agents to complete complex development tasks.

v1.0: Basic agent routing and task tracking
v1.1: Advanced multi-agent coordination, parallel execution, learning
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional


logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Available agent types"""

    LEAD_ARCHITECT = "lead-architect"
    BACKEND_MASTER = "backend-master"
    CLI_ARTISAN = "cli-artisan"
    PLATFORM_BUILDER = "platform-builder"
    INTEGRATION_SPECIALIST = "integration-specialist"
    QA_SENTINEL = "qa-sentinel"


class MessageType(Enum):
    """Agent communication message types"""

    HANDOFF = "handoff"  # Hand off task to another agent
    QUERY = "query"  # Query another agent for information
    RESULT = "result"  # Send result back
    STATUS = "status"  # Status update
    ERROR = "error"  # Error notification


@dataclass
class AgentMessage:
    """Message between agents"""

    from_agent: AgentType
    to_agent: AgentType
    message_type: MessageType
    content: dict[str, Any]
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    message_id: str = field(default_factory=lambda: __import__("uuid").uuid4().hex[:8])


@dataclass
class Task:
    """Represents a development task"""

    id: str
    description: str
    type: str  # feature, bugfix, refactor, etc.
    priority: str  # high, medium, low
    assigned_agent: Optional[AgentType] = None
    status: str = "pending"  # pending, in_progress, completed, failed
    metadata: dict[str, Any] = field(default_factory=dict)
    subtasks: list["Task"] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)  # Task IDs this depends on
    messages: list[AgentMessage] = field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[dict[str, Any]] = None

    def can_start(self, completed_tasks: set[str]) -> bool:
        """Check if task can start based on dependencies.

        Args:
            completed_tasks: Set of completed task IDs

        Returns:
            True if all dependencies are satisfied
        """
        return all(dep_id in completed_tasks for dep_id in self.dependencies)


class AgentOrchestrator:
    """Orchestrates specialized AI agents to complete development tasks.

    v1.0: Basic agent routing and task tracking
    v1.1: Advanced multi-agent coordination, parallel execution, learning
    """

    def __init__(self, project_root: Optional[Path] = None):
        """Initialize the orchestrator.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = project_root or Path.cwd()
        self.config = self._load_config()
        self.agents = self._load_available_agents()
        self.active_tasks: dict[str, Task] = {}
        self.completed_tasks: set[str] = set()
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.agent_callbacks: dict[AgentType, Callable] = {}

        # Load orchestration configuration
        orchestration_config = self.config.get("agents", {}).get("orchestration", {})
        self.max_parallel = orchestration_config.get("max_parallel", 3)
        self.handoff_timeout = orchestration_config.get("handoff_timeout", 300)
        self.orchestration_enabled = orchestration_config.get("enabled", True)

        # Learning configuration
        self.learning_enabled = orchestration_config.get("learning_enabled", False)
        self.interaction_log: list[dict[str, Any]] = []

    def _load_config(self) -> dict[str, Any]:
        """Load configuration from .claude/config.json.

        Returns:
            Configuration dictionary, or empty dict if not found
        """
        config_path = self.project_root / ".claude" / "config.json"

        if not config_path.exists():
            logger.warning(f"Config file not found at {config_path}, using defaults")
            return {}

        try:
            with open(config_path, encoding="utf-8") as f:
                data: dict[str, Any] = json.load(f)
                return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse config.json: {e}")
            return {}
        except Exception as e:
            logger.error(f"Failed to load config.json: {e}")
            return {}

    def _load_available_agents(self) -> dict[AgentType, dict[str, Any]]:
        """Load available agent configurations.

        Loads agents from config.json if available, otherwise falls back to defaults.

        Returns:
            Dictionary mapping agent types to their configurations
        """
        # Try to load from config.json first
        config_agents = self.config.get("agents", {}).get("available_agents", [])

        if config_agents:
            # Map agent names from config to AgentType enum
            agent_map = {}
            for agent_config in config_agents:
                try:
                    agent_name = agent_config.get("name", "")
                    # Convert name to enum (e.g., "lead-architect" -> LEAD_ARCHITECT)
                    agent_type = AgentType(agent_name)
                    agent_map[agent_type] = {
                        "name": agent_config.get("role", agent_name.replace("-", " ").title()),
                        "expertise": agent_config.get("capabilities", []),
                        "skill_file": agent_config.get(
                            "skill_file",
                            f".claude/skills/agents/{agent_name}.md",
                        ),
                    }
                except (ValueError, KeyError) as e:
                    logger.warning(
                        f"Skipping invalid agent config: {agent_config.get('name', 'unknown')}: {e}",
                    )
                    continue

            if agent_map:
                logger.info(f"Loaded {len(agent_map)} agents from config.json")
                return agent_map

        # Fallback to default configuration
        logger.info("Using default agent configuration")
        return {
            AgentType.LEAD_ARCHITECT: {
                "name": "Lead Architect",
                "expertise": ["architecture", "design", "patterns"],
                "skill_file": ".claude/skills/agents/lead-architect.md",
            },
            AgentType.BACKEND_MASTER: {
                "name": "Backend Master",
                "expertise": ["api", "database", "business-logic"],
                "skill_file": ".claude/skills/agents/backend-master.md",
            },
            AgentType.CLI_ARTISAN: {
                "name": "CLI Artisan",
                "expertise": ["cli", "commands", "ux"],
                "skill_file": ".claude/skills/agents/cli-artisan.md",
            },
            AgentType.PLATFORM_BUILDER: {
                "name": "Platform Builder",
                "expertise": ["infrastructure", "deployment", "cicd"],
                "skill_file": ".claude/skills/agents/platform-builder.md",
            },
            AgentType.INTEGRATION_SPECIALIST: {
                "name": "Integration Specialist",
                "expertise": ["apis", "mcp", "webhooks"],
                "skill_file": ".claude/skills/agents/integration-specialist.md",
            },
            AgentType.QA_SENTINEL: {
                "name": "QA Sentinel",
                "expertise": ["testing", "quality", "review"],
                "skill_file": ".claude/skills/agents/qa-sentinel.md",
            },
        }

    def assign_agent(self, task: Task) -> AgentType:
        """Assign the most appropriate agent to a task.

        v1.0: Simple keyword-based routing
        v1.1: ML-based agent selection based on task context and history

        Args:
            task: The task to assign

        Returns:
            The assigned agent type
        """
        # Simple keyword-based assignment
        description_lower = task.description.lower()
        task_type_lower = task.type.lower()

        # Architecture and design tasks
        if any(
            keyword in description_lower
            for keyword in ["architect", "design", "pattern", "structure"]
        ):
            return AgentType.LEAD_ARCHITECT

        # Backend implementation
        if any(
            keyword in description_lower
            for keyword in ["api", "endpoint", "database", "backend", "repository"]
        ):
            return AgentType.BACKEND_MASTER

        # CLI tasks
        if any(keyword in description_lower for keyword in ["cli", "command", "terminal"]):
            return AgentType.CLI_ARTISAN

        # Infrastructure and deployment
        if any(
            keyword in description_lower
            for keyword in ["deploy", "docker", "kubernetes", "cicd", "infrastructure"]
        ):
            return AgentType.PLATFORM_BUILDER

        # Integration tasks
        if any(
            keyword in description_lower
            for keyword in ["integration", "webhook", "mcp", "external"]
        ):
            return AgentType.INTEGRATION_SPECIALIST

        # Testing and QA
        if any(keyword in description_lower for keyword in ["test", "qa", "quality", "review"]):
            return AgentType.QA_SENTINEL

        # Default: use task type
        if task_type_lower == "feature":
            return AgentType.BACKEND_MASTER
        elif task_type_lower in ["bugfix", "refactor"]:
            return AgentType.QA_SENTINEL

        # Fallback
        logger.warning(
            f"Could not determine agent for task: {task.description}, using LEAD_ARCHITECT",
        )
        return AgentType.LEAD_ARCHITECT

    def create_task(
        self,
        description: str,
        task_type: str = "feature",
        priority: str = "medium",
        metadata: Optional[dict[str, Any]] = None,
    ) -> Task:
        """Create a new task and assign it to an agent.

        Args:
            description: Task description
            task_type: Type of task (feature, bugfix, refactor, etc.)
            priority: Task priority (high, medium, low)
            metadata: Additional task metadata

        Returns:
            Created task with assigned agent
        """
        import uuid

        task = Task(
            id=str(uuid.uuid4())[:8],
            description=description,
            type=task_type,
            priority=priority,
            metadata=metadata or {},
        )

        task.assigned_agent = self.assign_agent(task)
        self.active_tasks[task.id] = task

        logger.info(
            f"Created task {task.id}: '{description}' assigned to {task.assigned_agent.value}",
        )

        return task

    def get_agent_context(self, agent_type: AgentType) -> str:
        """Get the skill context for an agent.

        v1.0: Return path to skill file
        v1.1: Load and parse skill file, inject into context

        Args:
            agent_type: Type of agent

        Returns:
            Agent context/skill file path
        """
        agent_info = self.agents.get(agent_type)
        if not agent_info:
            return ""

        skill_file = self.project_root / agent_info["skill_file"]

        # v1.0: Just return the path
        # v1.1: Load file content and inject into Claude's context
        return str(skill_file)

    def list_tasks(self, status: Optional[str] = None) -> list[Task]:
        """List tasks, optionally filtered by status.

        Args:
            status: Filter by status (pending, in_progress, completed, failed)

        Returns:
            List of matching tasks
        """
        tasks = list(self.active_tasks.values())

        if status:
            tasks = [t for t in tasks if t.status == status]

        return sorted(tasks, key=lambda t: t.priority, reverse=True)

    def update_task_status(self, task_id: str, status: str) -> Optional[Task]:
        """Update task status.

        Args:
            task_id: Task ID
            status: New status

        Returns:
            Updated task or None if not found
        """
        task = self.active_tasks.get(task_id)
        if task:
            task.status = status
            logger.info(f"Task {task_id} status updated to: {status}")
        return task

    def get_recommended_agent(self, context: str) -> AgentType:
        """Recommend an agent based on context.

        v1.0: Simple keyword matching
        v1.1: Context-aware recommendation using embeddings

        Args:
            context: Current context or question

        Returns:
            Recommended agent type
        """
        # Create temporary task to use assignment logic
        temp_task = Task(id="temp", description=context, type="query", priority="medium")

        return self.assign_agent(temp_task)

    async def execute_task_async(self, task: Task) -> dict[str, Any]:
        """Execute a single task asynchronously.

        v1.1: Async execution with callback support

        Args:
            task: Task to execute

        Returns:
            Task execution result
        """
        task.status = "in_progress"
        task.started_at = datetime.utcnow().isoformat() + "Z"

        agent_name = task.assigned_agent.value if task.assigned_agent else "unknown"
        logger.info(f"Executing task {task.id} with {agent_name}")

        try:
            # Get agent callback if registered
            callback = (
                self.agent_callbacks.get(task.assigned_agent) if task.assigned_agent else None
            )

            result: dict[str, Any]
            if callback:
                result = await callback(task)
            else:
                # Default: just mark as completed
                result = {"status": "completed", "message": "Task completed"}

            task.status = "completed"
            task.completed_at = datetime.utcnow().isoformat() + "Z"
            task.result = result

            self.completed_tasks.add(task.id)

            # Log interaction for learning
            if self.learning_enabled:
                self._log_interaction(task)

            return result

        except Exception as e:
            logger.error(f"Task {task.id} failed: {e}")
            task.status = "failed"
            task.result = {"error": str(e)}
            raise

    async def execute_parallel(self, tasks: list[Task]) -> list[dict[str, Any]]:
        """Execute multiple tasks in parallel.

        v1.1: Parallel execution with dependency resolution

        Args:
            tasks: List of tasks to execute

        Returns:
            List of task results
        """
        if not self.orchestration_enabled:
            logger.warning("Orchestration disabled, executing sequentially")
            results: list[dict[str, Any]] = []
            for task in tasks:
                result = await self.execute_task_async(task)
                results.append(result)
            return results

        # Respect max_parallel limit
        semaphore = asyncio.Semaphore(self.max_parallel)

        async def execute_with_semaphore(task: Task) -> dict[str, Any]:
            async with semaphore:
                # Wait for dependencies
                while not task.can_start(self.completed_tasks):
                    await asyncio.sleep(0.1)

                return await self.execute_task_async(task)

        # Execute all tasks in parallel (respecting semaphore)
        raw_results = await asyncio.gather(
            *[execute_with_semaphore(task) for task in tasks],
            return_exceptions=True,
        )

        # Filter out exceptions and convert to results
        final_results: list[dict[str, Any]] = []
        for item in raw_results:
            if isinstance(item, BaseException):
                logger.error(f"Task execution failed: {item}")
                final_results.append({"error": str(item), "status": "failed"})
            else:
                final_results.append(item)

        return final_results

    async def send_message(
        self,
        from_agent: AgentType,
        to_agent: AgentType,
        message_type: MessageType,
        content: dict[str, Any],
    ) -> AgentMessage:
        """Send message between agents.

        v1.1: Agent-to-agent communication

        Args:
            from_agent: Sending agent
            to_agent: Receiving agent
            message_type: Type of message
            content: Message content

        Returns:
            Created message
        """
        message = AgentMessage(
            from_agent=from_agent,
            to_agent=to_agent,
            message_type=message_type,
            content=content,
        )

        await self.message_queue.put(message)
        logger.info(f"Message {message.message_id}: {from_agent.value} -> {to_agent.value}")

        return message

    async def process_messages(self, timeout: Optional[float] = None) -> list[AgentMessage]:
        """Process pending messages in the queue.

        v1.1: Message processing loop

        Args:
            timeout: Max time to wait for messages

        Returns:
            List of processed messages
        """
        messages = []
        deadline = None if timeout is None else asyncio.get_event_loop().time() + timeout

        while True:
            if deadline and asyncio.get_event_loop().time() >= deadline:
                break

            try:
                wait_time = (
                    0.1 if deadline is None else max(0, deadline - asyncio.get_event_loop().time())
                )
                message = await asyncio.wait_for(self.message_queue.get(), timeout=wait_time)
                messages.append(message)

                # Process message based on type
                if message.message_type == MessageType.HANDOFF:
                    await self._handle_handoff(message)
                elif message.message_type == MessageType.QUERY:
                    await self._handle_query(message)

            except asyncio.TimeoutError:
                break

        return messages

    async def _handle_handoff(self, message: AgentMessage) -> None:
        """Handle task handoff between agents.

        Args:
            message: Handoff message
        """
        task_id = message.content.get("task_id", "")
        if not task_id or not isinstance(task_id, str):
            logger.warning("Invalid task_id in handoff message")
            return

        task = self.active_tasks.get(task_id)

        if task:
            task.assigned_agent = message.to_agent
            task.messages.append(message)
            logger.info(f"Task {task_id} handed off to {message.to_agent.value}")

    async def _handle_query(self, message: AgentMessage) -> None:
        """Handle query from one agent to another.

        Args:
            message: Query message
        """
        # Future: implement query handling
        logger.info(f"Query from {message.from_agent.value}: {message.content.get('query')}")

    def _log_interaction(self, task: Task) -> None:
        """Log agent interaction for learning.

        v1.1: Learning from past interactions

        Args:
            task: Completed task
        """
        interaction = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "task_id": task.id,
            "task_type": task.type,
            "description": task.description,
            "agent": task.assigned_agent.value if task.assigned_agent else None,
            "status": task.status,
            "duration": self._calculate_duration(task),
            "success": task.status == "completed",
        }

        self.interaction_log.append(interaction)

        # Persist to file if enabled
        if self.learning_enabled:
            self._save_interaction_log()

    def _calculate_duration(self, task: Task) -> Optional[float]:
        """Calculate task duration in seconds.

        Args:
            task: Task with timestamps

        Returns:
            Duration in seconds or None
        """
        if not task.started_at or not task.completed_at:
            return None

        from datetime import datetime as dt

        start = dt.fromisoformat(task.started_at.replace("Z", "+00:00"))
        end = dt.fromisoformat(task.completed_at.replace("Z", "+00:00"))
        return (end - start).total_seconds()

    def _save_interaction_log(self) -> None:
        """Save interaction log to file."""
        log_file = self.project_root / ".claude" / "interaction-log.json"
        log_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(self.interaction_log, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save interaction log: {e}")

    def register_agent_callback(self, agent_type: AgentType, callback: Callable) -> None:
        """Register callback for agent execution.

        v1.1: Custom agent execution

        Args:
            agent_type: Type of agent
            callback: Async callback function
        """
        self.agent_callbacks[agent_type] = callback
        logger.info(f"Registered callback for {agent_type.value}")

    def decompose_task(self, task: Task) -> list[Task]:
        """Decompose complex task into subtasks.

        v1.1: Task decomposition

        Args:
            task: Complex task to decompose

        Returns:
            List of subtasks
        """
        # Simple decomposition based on task type
        subtasks = []

        if task.type == "feature":
            # Typical feature workflow
            subtasks = [
                Task(
                    id=f"{task.id}-arch",
                    description=f"Design architecture for: {task.description}",
                    type="design",
                    priority=task.priority,
                    assigned_agent=AgentType.LEAD_ARCHITECT,
                    metadata={"parent_task": task.id},
                ),
                Task(
                    id=f"{task.id}-impl",
                    description=f"Implement: {task.description}",
                    type="implementation",
                    priority=task.priority,
                    assigned_agent=AgentType.BACKEND_MASTER,
                    dependencies=[f"{task.id}-arch"],
                    metadata={"parent_task": task.id},
                ),
                Task(
                    id=f"{task.id}-test",
                    description=f"Test: {task.description}",
                    type="testing",
                    priority=task.priority,
                    assigned_agent=AgentType.QA_SENTINEL,
                    dependencies=[f"{task.id}-impl"],
                    metadata={"parent_task": task.id},
                ),
            ]

        task.subtasks = subtasks
        for subtask in subtasks:
            self.active_tasks[subtask.id] = subtask

        return subtasks


# Convenience function for simple agent suggestion
def suggest_agent(description: str) -> str:
    """Suggest which agent should handle a given task.

    Args:
        description: Task or question description

    Returns:
        Suggested agent name
    """
    orchestrator = AgentOrchestrator()
    agent_type = orchestrator.get_recommended_agent(description)
    agent_info = orchestrator.agents.get(agent_type, {})
    name: str = agent_info.get("name", "Unknown Agent")
    return name

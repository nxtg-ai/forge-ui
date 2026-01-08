"""
Unit tests for Agent Orchestrator
"""

from pathlib import Path

import pytest

from forge.agents.orchestrator import AgentOrchestrator, AgentType, Task, suggest_agent


class TestTask:
    """Test Task dataclass."""

    def test_task_creation(self):
        """Test creating a task."""
        task = Task(id="test-1", description="Test task", type="feature", priority="high")

        assert task.id == "test-1"
        assert task.description == "Test task"
        assert task.type == "feature"
        assert task.priority == "high"
        assert task.status == "pending"
        assert task.assigned_agent is None
        assert task.metadata == {}

    def test_task_with_metadata(self):
        """Test task with metadata."""
        metadata = {"complexity": "high", "estimate": "4h"}
        task = Task(
            id="test-2",
            description="Complex task",
            type="feature",
            priority="medium",
            metadata=metadata,
        )

        assert task.metadata == metadata

    def test_task_default_metadata(self):
        """Test task initializes empty metadata dict."""
        task = Task(id="test-3", description="Test", type="feature", priority="low")

        assert isinstance(task.metadata, dict)
        assert len(task.metadata) == 0


class TestAgentType:
    """Test AgentType enum."""

    def test_agent_types_exist(self):
        """Test all agent types are defined."""
        assert AgentType.LEAD_ARCHITECT.value == "lead-architect"
        assert AgentType.BACKEND_MASTER.value == "backend-master"
        assert AgentType.CLI_ARTISAN.value == "cli-artisan"
        assert AgentType.PLATFORM_BUILDER.value == "platform-builder"
        assert AgentType.INTEGRATION_SPECIALIST.value == "integration-specialist"
        assert AgentType.QA_SENTINEL.value == "qa-sentinel"

    def test_agent_type_count(self):
        """Test we have 6 agent types."""
        assert len(AgentType) == 6


class TestAgentOrchestrator:
    """Test AgentOrchestrator class."""

    @pytest.fixture()
    def orchestrator(self, tmp_project_root):
        """Create orchestrator with temp project root."""
        return AgentOrchestrator(tmp_project_root)

    def test_init(self, orchestrator, tmp_project_root):
        """Test orchestrator initialization."""
        assert orchestrator.project_root == tmp_project_root
        assert isinstance(orchestrator.agents, dict)
        assert len(orchestrator.agents) == 6
        assert isinstance(orchestrator.active_tasks, dict)
        assert len(orchestrator.active_tasks) == 0

    def test_init_without_project_root(self):
        """Test orchestrator initializes with cwd if no root provided."""
        orchestrator = AgentOrchestrator()
        assert orchestrator.project_root == Path.cwd()

    def test_load_available_agents(self, orchestrator):
        """Test loading agent configurations."""
        agents = orchestrator.agents

        # Check all agent types are loaded
        assert AgentType.LEAD_ARCHITECT in agents
        assert AgentType.BACKEND_MASTER in agents
        assert AgentType.CLI_ARTISAN in agents
        assert AgentType.PLATFORM_BUILDER in agents
        assert AgentType.INTEGRATION_SPECIALIST in agents
        assert AgentType.QA_SENTINEL in agents

        # Check agent config structure
        lead_arch = agents[AgentType.LEAD_ARCHITECT]
        assert "name" in lead_arch
        assert "expertise" in lead_arch
        assert "skill_file" in lead_arch
        assert lead_arch["name"] == "Lead Architect"
        assert isinstance(lead_arch["expertise"], list)
        assert len(lead_arch["expertise"]) > 0


class TestAgentAssignment:
    """Test agent assignment logic."""

    @pytest.fixture()
    def orchestrator(self, tmp_project_root):
        """Create orchestrator."""
        return AgentOrchestrator(tmp_project_root)

    def test_assign_architecture_task(self, orchestrator):
        """Test assigning architecture tasks to Lead Architect."""
        task = Task(
            id="arch-1",
            description="Design system architecture",
            type="feature",
            priority="high",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.LEAD_ARCHITECT

    def test_assign_design_task(self, orchestrator):
        """Test assigning design tasks to Lead Architect."""
        task = Task(
            id="design-1",
            description="Create design patterns for modules",
            type="feature",
            priority="high",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.LEAD_ARCHITECT

    def test_assign_api_task(self, orchestrator):
        """Test assigning API tasks to Backend Master."""
        task = Task(
            id="api-1",
            description="Implement REST API endpoint",
            type="feature",
            priority="high",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.BACKEND_MASTER

    def test_assign_database_task(self, orchestrator):
        """Test assigning database tasks to Backend Master."""
        task = Task(
            id="db-1",
            description="Create database migrations",
            type="feature",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.BACKEND_MASTER

    def test_assign_cli_task(self, orchestrator):
        """Test assigning CLI tasks to CLI Artisan."""
        task = Task(
            id="cli-1",
            description="Add new command to CLI",
            type="feature",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.CLI_ARTISAN

    def test_assign_deployment_task(self, orchestrator):
        """Test assigning deployment tasks to Platform Builder."""
        task = Task(
            id="deploy-1",
            description="Setup Docker deployment",
            type="feature",
            priority="high",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.PLATFORM_BUILDER

    def test_assign_cicd_task(self, orchestrator):
        """Test assigning CI/CD tasks to Platform Builder."""
        task = Task(
            id="cicd-1",
            description="Configure cicd pipeline with GitHub Actions",
            type="feature",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.PLATFORM_BUILDER

    def test_assign_integration_task(self, orchestrator):
        """Test assigning integration tasks to Integration Specialist."""
        task = Task(
            id="int-1",
            description="Integrate external webhook service",
            type="feature",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.INTEGRATION_SPECIALIST

    def test_assign_mcp_task(self, orchestrator):
        """Test assigning MCP tasks to Integration Specialist."""
        task = Task(
            id="mcp-1",
            description="Configure MCP server connection",
            type="feature",
            priority="low",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.INTEGRATION_SPECIALIST

    def test_assign_test_task(self, orchestrator):
        """Test assigning testing tasks to QA Sentinel."""
        task = Task(
            id="test-1",
            description="Write comprehensive test suite for the application",
            type="feature",
            priority="high",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.QA_SENTINEL

    def test_assign_qa_task(self, orchestrator):
        """Test assigning QA tasks to QA Sentinel."""
        task = Task(
            id="qa-1",
            description="Review code quality standards",
            type="review",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.QA_SENTINEL

    def test_assign_bugfix_task_by_type(self, orchestrator):
        """Test bugfix type assigns to QA Sentinel."""
        task = Task(id="bug-1", description="Fix login issue", type="bugfix", priority="high")

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.QA_SENTINEL

    def test_assign_refactor_task_by_type(self, orchestrator):
        """Test refactor type assigns to QA Sentinel."""
        task = Task(
            id="refactor-1",
            description="Refactor user module",
            type="refactor",
            priority="low",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.QA_SENTINEL

    def test_assign_feature_task_fallback(self, orchestrator):
        """Test generic feature tasks default to Backend Master."""
        task = Task(
            id="feat-1",
            description="Add some new functionality",
            type="feature",
            priority="medium",
        )

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.BACKEND_MASTER

    def test_assign_unknown_task_fallback(self, orchestrator):
        """Test unknown tasks default to Lead Architect."""
        task = Task(id="unknown-1", description="Some random task", type="unknown", priority="low")

        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.LEAD_ARCHITECT


class TestTaskCreation:
    """Test task creation and management."""

    @pytest.fixture()
    def orchestrator(self, tmp_project_root):
        """Create orchestrator."""
        return AgentOrchestrator(tmp_project_root)

    def test_create_task(self, orchestrator):
        """Test creating a task."""
        task = orchestrator.create_task(
            description="Implement user authentication",
            task_type="feature",
            priority="high",
        )

        assert task.id is not None
        assert len(task.id) == 8  # UUID first 8 chars
        assert task.description == "Implement user authentication"
        assert task.type == "feature"
        assert task.priority == "high"
        assert task.status == "pending"
        assert task.assigned_agent is not None

    def test_create_task_assigns_agent(self, orchestrator):
        """Test task creation automatically assigns agent."""
        task = orchestrator.create_task(description="Design system architecture")

        assert task.assigned_agent == AgentType.LEAD_ARCHITECT

    def test_create_task_adds_to_active_tasks(self, orchestrator):
        """Test created task is added to active tasks."""
        assert len(orchestrator.active_tasks) == 0

        task = orchestrator.create_task("Test task")

        assert len(orchestrator.active_tasks) == 1
        assert task.id in orchestrator.active_tasks
        assert orchestrator.active_tasks[task.id] == task

    def test_create_task_with_metadata(self, orchestrator):
        """Test creating task with metadata."""
        metadata = {"complexity": "high", "estimate": "8h"}
        task = orchestrator.create_task(description="Complex feature", metadata=metadata)

        assert task.metadata == metadata

    def test_create_task_default_values(self, orchestrator):
        """Test task creation with default values."""
        task = orchestrator.create_task("Simple task")

        assert task.type == "feature"
        assert task.priority == "medium"
        assert task.metadata == {}


class TestTaskManagement:
    """Test task listing and status updates."""

    @pytest.fixture()
    def orchestrator_with_tasks(self, tmp_project_root):
        """Create orchestrator with sample tasks."""
        orch = AgentOrchestrator(tmp_project_root)

        # Create various tasks
        orch.create_task("Architecture task", priority="high")
        orch.create_task("API implementation", priority="medium")
        orch.create_task("Write tests", priority="low")

        # Update some statuses
        tasks = list(orch.active_tasks.values())
        orch.update_task_status(tasks[0].id, "in_progress")
        orch.update_task_status(tasks[1].id, "completed")

        return orch

    def test_list_all_tasks(self, orchestrator_with_tasks):
        """Test listing all tasks."""
        tasks = orchestrator_with_tasks.list_tasks()

        assert len(tasks) == 3

    def test_list_tasks_by_status(self, orchestrator_with_tasks):
        """Test filtering tasks by status."""
        pending_tasks = orchestrator_with_tasks.list_tasks(status="pending")
        in_progress_tasks = orchestrator_with_tasks.list_tasks(status="in_progress")
        completed_tasks = orchestrator_with_tasks.list_tasks(status="completed")

        assert len(pending_tasks) == 1
        assert len(in_progress_tasks) == 1
        assert len(completed_tasks) == 1

    def test_list_tasks_sorted_by_priority(self, orchestrator_with_tasks):
        """Test tasks are sorted by priority (reverse alphabetical)."""
        tasks = orchestrator_with_tasks.list_tasks()

        # Priority is sorted reverse alphabetically: "medium" > "low" > "high"
        # So we just verify they're sorted in reverse order
        assert len(tasks) == 3
        priorities = [t.priority for t in tasks]
        assert priorities == sorted(priorities, reverse=True)

    def test_update_task_status(self, orchestrator_with_tasks):
        """Test updating task status."""
        tasks = list(orchestrator_with_tasks.active_tasks.values())
        task_id = tasks[0].id

        updated_task = orchestrator_with_tasks.update_task_status(task_id, "completed")

        assert updated_task is not None
        assert updated_task.id == task_id
        assert updated_task.status == "completed"

    def test_update_nonexistent_task(self, orchestrator_with_tasks):
        """Test updating nonexistent task returns None."""
        result = orchestrator_with_tasks.update_task_status("nonexistent-id", "completed")

        assert result is None

    def test_list_empty_tasks(self, tmp_project_root):
        """Test listing tasks when none exist."""
        orch = AgentOrchestrator(tmp_project_root)
        tasks = orch.list_tasks()

        assert tasks == []

    def test_list_tasks_no_status_match(self, orchestrator_with_tasks):
        """Test filtering by status with no matches."""
        tasks = orchestrator_with_tasks.list_tasks(status="failed")

        assert tasks == []


class TestAgentContext:
    """Test agent context retrieval."""

    @pytest.fixture()
    def orchestrator(self, tmp_project_root):
        """Create orchestrator."""
        return AgentOrchestrator(tmp_project_root)

    def test_get_agent_context(self, orchestrator, tmp_project_root):
        """Test getting agent context."""
        context = orchestrator.get_agent_context(AgentType.LEAD_ARCHITECT)

        expected_path = str(tmp_project_root / ".claude/skills/agents/lead-architect.md")
        assert context == expected_path

    def test_get_context_for_all_agents(self, orchestrator):
        """Test getting context for all agent types."""
        for agent_type in AgentType:
            context = orchestrator.get_agent_context(agent_type)

            assert context != ""
            assert ".claude/skills/agents/" in context
            assert context.endswith(".md")


class TestRecommendations:
    """Test agent recommendation system."""

    @pytest.fixture()
    def orchestrator(self, tmp_project_root):
        """Create orchestrator."""
        return AgentOrchestrator(tmp_project_root)

    def test_recommend_agent_for_architecture(self, orchestrator):
        """Test recommending agent for architecture question."""
        agent = orchestrator.get_recommended_agent(
            "How should we structure the application layers?",
        )

        assert agent == AgentType.LEAD_ARCHITECT

    def test_recommend_agent_for_api(self, orchestrator):
        """Test recommending agent for API question."""
        agent = orchestrator.get_recommended_agent("How do I implement a REST endpoint?")

        assert agent == AgentType.BACKEND_MASTER

    def test_recommend_agent_for_testing(self, orchestrator):
        """Test recommending agent for testing question."""
        agent = orchestrator.get_recommended_agent("What test framework should we use?")

        assert agent == AgentType.QA_SENTINEL

    def test_suggest_agent_function(self):
        """Test suggest_agent convenience function."""
        agent_name = suggest_agent("How to deploy to Kubernetes?")

        assert agent_name == "Infrastructure and deployment"

    def test_suggest_agent_for_integration(self):
        """Test suggest_agent for integration tasks."""
        agent_name = suggest_agent("Configure webhook integration")

        assert agent_name == "System integration and interoperability"


class TestMultipleTasks:
    """Test orchestrator with multiple concurrent tasks."""

    def test_multiple_tasks_different_agents(self, tmp_project_root):
        """Test creating tasks for different agents."""
        orch = AgentOrchestrator(tmp_project_root)

        task1 = orch.create_task("Design architecture")
        task2 = orch.create_task("Implement API")
        task3 = orch.create_task("Write tests")
        task4 = orch.create_task("Setup cicd deployment pipeline")

        assert len(orch.active_tasks) == 4
        assert task1.assigned_agent == AgentType.LEAD_ARCHITECT
        assert task2.assigned_agent == AgentType.BACKEND_MASTER
        assert task3.assigned_agent == AgentType.QA_SENTINEL
        assert task4.assigned_agent == AgentType.PLATFORM_BUILDER

    def test_task_ids_are_unique(self, tmp_project_root):
        """Test all created tasks have unique IDs."""
        orch = AgentOrchestrator(tmp_project_root)

        tasks = [orch.create_task(f"Task {i}") for i in range(10)]
        task_ids = [t.id for t in tasks]

        assert len(task_ids) == len(set(task_ids))  # All unique

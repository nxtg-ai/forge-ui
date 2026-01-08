# Implementation Plan: Comprehensive Unit Tests (feat-004)

**Status**: Ready to Execute
**Assigned**: QA Sentinel
**Estimated Effort**: 10-15 hours
**Target Coverage**: 85% (Current: 24%)

## Current Coverage Analysis

### Module Status

| Module | Statements | Missing | Coverage | Priority |
|--------|-----------|---------|----------|----------|
| forge/**init**.py | 8 | 0 | **100%** | ✅ Complete |
| forge/state_manager.py | 98 | 21 | **79%** | 🟡 Expand |
| forge/spec_generator.py | 100 | 34 | **66%** | 🟡 Expand |
| forge/file_generator.py | 158 | 55 | **65%** | 🟠 Fix + Expand |
| forge/mcp_detector.py | 156 | 138 | **12%** | 🔴 Critical |
| forge/gap_analyzer.py | 191 | 170 | **11%** | 🔴 Critical |
| forge/cli.py | 310 | 310 | **0%** | 🔴 Critical |
| forge/agents/**init**.py | 4 | 4 | **0%** | 🔴 Critical |
| forge/agents/orchestrator.py | 84 | 84 | **0%** | 🔴 Critical |
| forge/agents/dispatcher.py | 121 | 121 | **0%** | 🔴 Critical |
| **TOTAL** | **1230** | **937** | **24%** | **Target: 85%** |

### Gap Analysis

- **Need to cover**: 937 - (1230 * 0.15) = ~753 statements
- **Current coverage**: 293 statements
- **Target coverage**: 1046 statements
- **Additional tests needed**: ~100-150 test cases

---

## Phase 1: Test Infrastructure Setup

**Duration**: 30 minutes
**Coverage Impact**: 0% (foundation)

### Tasks

1. Create shared fixtures
2. Set up test data directory
3. Configure pytest
4. Create test utilities

###

 Implementation

#### 1.1 Global Fixtures (`tests/conftest.py`)

```python
import pytest
import tempfile
from pathlib import Path
import json

@pytest.fixture
def tmp_project_root(tmp_path):
    """Create temporary project root with .claude directory."""
    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()
    (claude_dir / "commands").mkdir()
    (claude_dir / "skills").mkdir()
    (claude_dir / "templates").mkdir()
    (claude_dir / "hooks").mkdir()
    return tmp_path

@pytest.fixture
def sample_state():
    """Sample state.json structure."""
    return {
        "version": "1.0.0",
        "project": {
            "name": "test-project",
            "type": "web-app",
            "created_at": "2026-01-01T00:00:00Z"
        },
        "development": {
            "current_phase": "testing",
            "features": {
                "completed": [],
                "in_progress": [],
                "planned": []
            }
        },
        "agents": {
            "active": [],
            "available": ["lead-architect", "backend-master"]
        }
    }

@pytest.fixture
def sample_spec():
    """Sample project specification."""
    return {
        "name": "test-project",
        "type": "web-app",
        "framework": "fastapi",
        "database": "postgresql"
    }
```

#### 1.2 Test Fixtures Directory

```bash
tests/fixtures/
├── states/
│   ├── minimal.json
│   ├── complete.json
│   └── corrupted.json
├── specs/
│   ├── fastapi.yaml
│   ├── django.yaml
│   └── react.yaml
└── templates/
    └── sample_template.j2
```

---

## Phase 2: Critical Module Tests (0% Coverage)

**Duration**: 4-6 hours
**Coverage Impact**: +40% (24% → 64%)

### 2.1 CLI Module Tests (`tests/unit/test_cli.py`)

**Impact**: 310 statements | Target: 85% (264 statements covered)

```python
# tests/unit/test_cli.py
import pytest
from click.testing import CliRunner
from forge.cli import cli, main

class TestCLI:
    """Test CLI interface."""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_cli_help_displays(self, runner):
        """Test that help text is displayed."""
        result = runner.invoke(cli, ['--help'])
        assert result.exit_code == 0
        assert 'NXTG-Forge' in result.output

    def test_status_command_without_state_file(self, runner, tmp_path):
        """Test status command when state.json doesn't exist."""
        result = runner.invoke(cli, ['status'], cwd=tmp_path)
        # Should handle gracefully or show error

    def test_checkpoint_command_creates_checkpoint(self, runner, tmp_project_root):
        """Test checkpoint creation."""
        result = runner.invoke(cli, [
            'checkpoint',
            'Test checkpoint',
            '--project-root', str(tmp_project_root)
        ])
        # Verify checkpoint created

    # ... 20+ more test cases covering all CLI commands
```

**Test Cases** (25 total):

- [ ] Help text display
- [ ] Version display
- [ ] Status command (with/without state)
- [ ] Checkpoint command
- [ ] Restore command
- [ ] Init command
- [ ] Feature command
- [ ] Gap analysis command
- [ ] MCP detect command
- [ ] Invalid command handling
- [ ] Missing arguments
- [ ] Invalid arguments
- [ ] Project root detection
- [ ] Error message formatting
- [ ] Exit codes
- [ ] Verbose/quiet modes
- [ ] Config file loading
- [ ] Environment variables
- [ ] Interactive prompts
- [ ] Non-interactive mode
- [ ] JSON output format
- [ ] Colored output
- [ ] Progress indicators
- [ ] Interrupt handling
- [ ] Multiple commands chaining

### 2.2 Orchestrator Tests (`tests/unit/agents/test_orchestrator.py`)

**Impact**: 84 statements | Target: 85% (71 statements covered)

```python
# tests/unit/agents/test_orchestrator.py
import pytest
from forge.agents.orchestrator import (
    AgentOrchestrator,
    AgentType,
    Task
)

class TestAgentOrchestrator:
    """Test agent orchestration."""

    @pytest.fixture
    def orchestrator(self, tmp_project_root):
        return AgentOrchestrator(tmp_project_root)

    def test_init_loads_available_agents(self, orchestrator):
        """Test that orchestrator loads agent configurations."""
        assert len(orchestrator.agents) == 6
        assert AgentType.LEAD_ARCHITECT in orchestrator.agents

    def test_assign_agent_for_architecture_task(self, orchestrator):
        """Test agent assignment for architecture tasks."""
        task = Task(
            id="test-1",
            description="Design system architecture",
            type="feature",
            priority="high"
        )
        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.LEAD_ARCHITECT

    def test_assign_agent_for_api_task(self, orchestrator):
        """Test agent assignment for API tasks."""
        task = Task(
            id="test-2",
            description="Implement REST API endpoint",
            type="feature",
            priority="high"
        )
        agent = orchestrator.assign_agent(task)
        assert agent == AgentType.BACKEND_MASTER

    # ... 15+ more test cases
```

**Test Cases** (20 total):

- [ ] Orchestrator initialization
- [ ] Agent loading
- [ ] Task creation
- [ ] Agent assignment (architecture)
- [ ] Agent assignment (backend)
- [ ] Agent assignment (CLI)
- [ ] Agent assignment (platform)
- [ ] Agent assignment (integration)
- [ ] Agent assignment (QA)
- [ ] Fallback agent assignment
- [ ] Task tracking
- [ ] Task status updates
- [ ] Active tasks list
- [ ] Task completion
- [ ] Task failure handling
- [ ] Agent context retrieval
- [ ] Multiple tasks
- [ ] Task priorities
- [ ] Agent recommendations
- [ ] Task metadata

### 2.3 Dispatcher Tests (`tests/unit/agents/test_dispatcher.py`)

**Impact**: 121 statements | Target: 85% (103 statements covered)

```python
# tests/unit/agents/test_dispatcher.py
import pytest
from forge.agents.dispatcher import (
    TaskDispatcher,
    TaskStatus,
    TaskResult,
    DispatchedTask
)

class TestTaskDispatcher:
    """Test task dispatching."""

    @pytest.fixture
    def dispatcher(self):
        return TaskDispatcher()

    def test_dispatch_task_creates_dispatched_task(self, dispatcher):
        """Test that dispatching creates a task record."""
        task_id = dispatcher.dispatch(
            task_type="test",
            description="Test task",
            agent="backend-master"
        )
        assert task_id in dispatcher.tasks
        assert dispatcher.tasks[task_id].status == TaskStatus.PENDING

    @pytest.mark.asyncio
    async def test_execute_task_updates_status(self, dispatcher):
        """Test that execution updates task status."""
        task_id = dispatcher.dispatch("test", "Test", "backend-master")
        result = await dispatcher.execute(task_id)
        assert dispatcher.tasks[task_id].status in [
            TaskStatus.COMPLETED,
            TaskStatus.FAILED
        ]

    # ... 15+ more test cases
```

**Test Cases** (20 total):

- [ ] Task dispatch
- [ ] Task execution
- [ ] Status tracking
- [ ] Result aggregation
- [ ] Error handling
- [ ] Async execution
- [ ] Task cancellation
- [ ] Task timeout
- [ ] Multiple tasks
- [ ] Task dependencies
- [ ] Sequential execution
- [ ] Task retry logic
- [ ] Progress tracking
- [ ] Task results
- [ ] Failed task handling
- [ ] Task queue management
- [ ] Concurrent tasks
- [ ] Task metadata
- [ ] Execution logging
- [ ] Cleanup after completion

---

## Phase 3: Expand Existing Tests (65-79% Coverage)

**Duration**: 2-3 hours
**Coverage Impact**: +15% (64% → 79%)

### 3.1 State Manager Expansion (`tests/unit/test_state_manager.py`)

**Current**: 79% | **Target**: 90% | **Gap**: 21 statements

**Missing Coverage**:

- Lines 151, 158-184 (backup/restore logic)
- Lines 201, 215 (error handling)
- Line 262 (edge case)

**New Test Cases** (10 total):

- [ ] Backup creation
- [ ] Backup rotation (keep last 10)
- [ ] Restore from backup
- [ ] Corrupted state recovery
- [ ] Missing state file handling
- [ ] Invalid JSON handling
- [ ] Checkpoint validation
- [ ] State migration
- [ ] Concurrent access
- [ ] Large state files

### 3.2 Spec Generator Expansion (`tests/unit/test_spec_generator.py`)

**Current**: 66% | **Target**: 85% | **Gap**: 34 statements

**Missing Coverage**:

- Lines 43-197 (interactive prompts)
- Lines 444, 485, 489 (validation)

**New Test Cases** (12 total):

- [ ] Interactive prompt flow
- [ ] User input validation
- [ ] Framework selection
- [ ] Database selection
- [ ] Template variable extraction
- [ ] Spec file generation
- [ ] Invalid input handling
- [ ] Empty input handling
- [ ] Spec validation
- [ ] Default values
- [ ] Custom configurations
- [ ] Spec file saving

### 3.3 File Generator Fix + Expansion (`tests/unit/test_file_generator.py`)

**Current**: 65% | **Target**: 85% | **Gap**: 55 statements + 1 failure

**Missing Coverage**:

- Lines 48-65 (initialization)
- Lines 107, 116, 122-153 (template loading)
- Lines 162-182, 187-189 (error handling)
- Lines 198-223 (file generation)
- Lines 251-252 (cleanup)

**First**: Fix failing test
**Then**: Add 15 new test cases

---

## Phase 4: Utility Modules (11-12% Coverage)

**Duration**: 2-3 hours
**Coverage Impact**: +15% (79% → 94%)

### 4.1 MCP Detector Tests (`tests/unit/test_mcp_detector.py`)

**Current**: 12% | **Target**: 85% | **Gap**: 138 statements

**Test Cases** (25 total):

- [ ] Detector initialization
- [ ] Package.json detection
- [ ] Requirements.txt detection
- [ ] Docker compose detection
- [ ] Service identification
- [ ] Multiple services
- [ ] No services found
- [ ] Invalid config files
- [ ] Missing files
- [ ] Auto-configuration
- [ ] Manual configuration
- [ ] Configuration validation
- [ ] MCP server recommendations
- [ ] Priority calculation
- [ ] Detection rules
- [ ] File parsing
- [ ] Error handling
- [ ] Custom detectors
- [ ] Detection caching
- [ ] Configuration output
- [ ] JSON export
- [ ] Detection reporting
- [ ] Service versions
- [ ] Dependency analysis
- [ ] Integration checks

### 4.2 Gap Analyzer Tests (`tests/unit/test_gap_analyzer.py`)

**Current**: 11% | **Target**: 80% | **Gap**: 170 statements

**Test Cases** (25 total):

- [ ] Analyzer initialization
- [ ] Project analysis
- [ ] Gap identification
- [ ] Recommendation generation
- [ ] Health score calculation
- [ ] Coverage analysis
- [ ] Documentation gaps
- [ ] Test gaps
- [ ] Security gaps
- [ ] Performance gaps
- [ ] Best practices check
- [ ] Architecture analysis
- [ ] Dependency audit
- [ ] Code quality check
- [ ] Priority assignment
- [ ] Report generation
- [ ] JSON export
- [ ] Trend analysis
- [ ] Comparison with baseline
- [ ] Custom rules
- [ ] Severity levels
- [ ] Actionable items
- [ ] Progress tracking
- [ ] Historical data
- [ ] Configuration

---

## Phase 5: Edge Cases & Error Handling

**Duration**: 1-2 hours
**Coverage Impact**: +5% (94% → 99%)

### Test Categories

#### Error Handling

- [ ] File not found errors
- [ ] Permission errors
- [ ] JSON parsing errors
- [ ] Network errors (mocked)
- [ ] Timeout errors
- [ ] Memory errors
- [ ] Disk full errors

#### Edge Cases

- [ ] Empty inputs
- [ ] Very large inputs
- [ ] Special characters
- [ ] Unicode handling
- [ ] Path edge cases
- [ ] Concurrent access
- [ ] Resource exhaustion

#### Boundary Cases

- [ ] Zero items
- [ ] One item
- [ ] Maximum items
- [ ] Minimum/maximum values
- [ ] Null/None values
- [ ] Empty strings
- [ ] Whitespace-only inputs

---

## Phase 6: Documentation & CI

**Duration**: 1 hour
**Coverage Impact**: 0% (but critical for maintainability)

### Tasks

- [ ] Update `docs/TESTING.md`
- [ ] Add testing section to CONTRIBUTING.md
- [ ] Configure GitHub Actions for tests
- [ ] Add coverage badge to README
- [ ] Create test writing guide
- [ ] Document fixture usage
- [ ] Add examples of good tests

---

## Execution Strategy

### Day 1: Foundation + Critical Modules (0%)

1. Phase 1: Infrastructure (30 min)
2. Phase 2.1: CLI tests (2 hours)
3. Phase 2.2: Orchestrator tests (1 hour)
4. Phase 2.3: Dispatcher tests (1 hour)

**Checkpoint**: "After critical module tests - 64% coverage"
**Milestone**: Coverage 24% → 64% (+40%)

### Day 2: Expansion + Utilities

1. Phase 3: Expand existing tests (2-3 hours)
2. Phase 4.1: MCP Detector tests (1.5 hours)
3. Phase 4.2: Gap Analyzer tests (1.5 hours)

**Checkpoint**: "After utility module tests - 94% coverage"
**Milestone**: Coverage 64% → 94% (+30%)

### Day 3: Polish + Integration

1. Phase 5: Edge cases (1-2 hours)
2. Phase 6: Documentation & CI (1 hour)
3. Final validation and cleanup

**Checkpoint**: "Unit tests complete - 85%+ coverage"
**Milestone**: Coverage 94% → 99%, All tests passing

---

## Success Criteria

- ✅ Overall coverage ≥ 85% (Target: 90%+)
- ✅ All modules ≥ 80% coverage
- ✅ 0 test failures
- ✅ Tests run in < 30 seconds
- ✅ CI/CD integration complete
- ✅ Documentation updated

---

## Next Steps

Ready to begin Phase 1. Confirm to proceed with test implementation.

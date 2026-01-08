# Feature Specification: Comprehensive Unit Tests

**Feature ID**: feat-004
**Priority**: HIGH
**Assigned Agent**: QA Sentinel
**Status**: In Progress
**Created**: 2026-01-06

## Description

Implement comprehensive unit test suite for NXTG-Forge to increase coverage from current 24% to target 85%+. Tests should cover all core modules, utilities, and agent orchestration components with focus on edge cases, error handling, and integration points.

## User Stories

### As a Developer

- I want comprehensive unit tests so that I can refactor code confidently without breaking functionality
- I want tests to run quickly so that I get rapid feedback during development
- I want clear test organization so that I can easily find and update relevant tests

### As a Contributor

- I want test examples so that I understand expected behavior and coding patterns
- I want test coverage reports so that I know which areas need more testing
- I want failing tests to provide clear error messages so that I can quickly diagnose issues

### As a Project Maintainer

- I want high test coverage so that bugs are caught before reaching production
- I want tests to validate edge cases so that the system is robust
- I want integration with CI/CD so that tests run automatically on every commit

## Current State Analysis

### Existing Tests (24% coverage)

- `tests/unit/test_state_manager.py` - Basic state management tests
- `tests/unit/test_spec_generator.py` - Spec generation tests
- `tests/unit/test_file_generator.py` - File generation tests (1 failing)

### Coverage Gaps

**Uncovered Modules** (from coverage report):

- `forge/cli.py` - 0% coverage
- `forge/mcp_detector.py` - Low coverage
- `forge/gap_analyzer.py` - Low coverage
- `forge/agents/orchestrator.py` - 0% coverage
- `forge/agents/dispatcher.py` - 0% coverage

**Missing Test Categories**:

- Error handling and edge cases
- Async operations
- File I/O operations
- External API mocking
- Agent coordination
- State recovery scenarios

## Acceptance Criteria

### Must Have (v1.0)

- [ ] Overall test coverage ≥ 85%
- [ ] All core modules have ≥ 80% coverage
- [ ] All tests pass (0 failures)
- [ ] Tests run in < 30 seconds
- [ ] Clear test naming conventions followed
- [ ] Fixtures and mocks properly organized
- [ ] Integration with pytest and coverage tools
- [ ] CI/CD integration configured

### Should Have (v1.1)

- [ ] Property-based testing for critical functions
- [ ] Performance benchmarks
- [ ] Mutation testing setup
- [ ] Test data factories

### Nice to Have (v2.0)

- [ ] Snapshot testing for template outputs
- [ ] Contract testing for agent interactions
- [ ] Chaos testing for error resilience

## Technical Requirements

### Testing Framework

- **pytest** - Primary test runner
- **pytest-cov** - Coverage reporting
- **pytest-asyncio** - Async test support
- **pytest-mock** - Mocking utilities
- **pytest-fixtures** - Shared test fixtures

### Test Organization

```
tests/
├── unit/                      # Unit tests (fast, isolated)
│   ├── conftest.py           # Shared fixtures
│   ├── test_cli.py           # NEW
│   ├── test_state_manager.py # EXPAND
│   ├── test_spec_generator.py # EXPAND
│   ├── test_file_generator.py # FIX + EXPAND
│   ├── test_mcp_detector.py  # NEW
│   ├── test_gap_analyzer.py  # NEW
│   └── agents/
│       ├── test_orchestrator.py # NEW
│       └── test_dispatcher.py   # NEW
├── integration/              # Integration tests
├── e2e/                      # End-to-end tests
├── fixtures/                 # Test data and fixtures
│   ├── sample_states.json
│   ├── sample_specs.yaml
│   └── templates/
└── conftest.py              # Global fixtures
```

### Test Patterns

**AAA Pattern** (Arrange-Act-Assert):

```python
def test_feature():
    # Arrange - Set up test data
    manager = StateManager("/tmp/test")

    # Act - Execute the function
    result = manager.load_state()

    # Assert - Verify the outcome
    assert result["version"] == "1.0.0"
```

**Fixtures for Reusability**:

```python
@pytest.fixture
def temp_state_file(tmp_path):
    """Create temporary state file for testing."""
    state_file = tmp_path / "state.json"
    state_file.write_text('{"version": "1.0.0"}')
    return state_file
```

**Mocking External Dependencies**:

```python
def test_mcp_detection(mocker):
    # Mock file system operations
    mocker.patch("pathlib.Path.exists", return_value=True)
    mocker.patch("builtins.open", mocker.mock_open(read_data="{}"))

    detector = MCPDetector()
    result = detector.detect()
    assert result["servers"] == []
```

### Coverage Targets by Module

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| cli.py | 0% | 85% | HIGH |
| state_manager.py | 60% | 90% | HIGH |
| spec_generator.py | 50% | 85% | HIGH |
| file_generator.py | 40% | 85% | HIGH |
| mcp_detector.py | 20% | 85% | HIGH |
| gap_analyzer.py | 10% | 80% | MEDIUM |
| agents/orchestrator.py | 0% | 85% | HIGH |
| agents/dispatcher.py | 0% | 85% | HIGH |

## Dependencies

### Depends On

- ✅ Core Python modules (implemented)
- ✅ pytest framework (installed)
- ✅ Test structure (exists)

### Blocks

- feat-005: Integration Tests (needs unit test foundation)
- Release confidence (needs high coverage)
- Future refactoring (needs test safety net)

## Implementation Phases

### Phase 1: Test Infrastructure (QA Sentinel)

**Duration**: 2-3 hours

- [ ] Set up pytest configuration
- [ ] Create shared fixtures in conftest.py
- [ ] Establish test naming conventions
- [ ] Configure coverage reporting
- [ ] Set up test data fixtures
- [ ] Document testing guidelines

**Deliverables**:

- `tests/conftest.py` with common fixtures
- `tests/fixtures/` with test data
- `pytest.ini` configuration
- `docs/TESTING.md` update

### Phase 2: Core Module Tests (QA Sentinel)

**Duration**: 4-6 hours

**Priority 1: High-Value Modules**

- [ ] `test_cli.py` - CLI interface tests
  - Command parsing
  - Argument validation
  - Help text generation
  - Error handling

- [ ] `test_orchestrator.py` - Agent orchestration
  - Agent assignment logic
  - Task creation and tracking
  - Agent context loading
  - Task status updates

- [ ] `test_dispatcher.py` - Task dispatching
  - Task execution lifecycle
  - Status tracking
  - Result aggregation
  - Error handling

**Priority 2: Existing Module Expansion**

- [ ] Expand `test_state_manager.py`
  - Checkpoint creation/restore
  - State validation
  - Backup management
  - Corruption recovery

- [ ] Expand `test_spec_generator.py`
  - Interactive prompt flow
  - Validation logic
  - Template variable extraction

- [ ] Fix and expand `test_file_generator.py`
  - Fix failing gitignore test
  - Template rendering
  - File creation
  - Error cases

**Priority 3: Utility Modules**

- [ ] `test_mcp_detector.py`
  - Service detection
  - Configuration parsing
  - Auto-configuration

- [ ] `test_gap_analyzer.py`
  - Gap identification
  - Recommendation generation
  - Health score calculation

**Deliverables**:

- 8+ test files with comprehensive coverage
- 100+ test cases
- Coverage increase to 75%+

### Phase 3: Edge Cases & Error Handling (QA Sentinel)

**Duration**: 2-3 hours

- [ ] Invalid input handling
- [ ] File I/O errors
- [ ] Missing dependencies
- [ ] Corrupted state files
- [ ] Network failures (mocked)
- [ ] Concurrent access scenarios
- [ ] Resource exhaustion

**Test Categories**:

```python
# Happy path
def test_normal_operation():
    """Test standard successful operation."""

# Edge cases
def test_empty_input():
    """Test behavior with empty input."""

def test_very_large_input():
    """Test behavior with large datasets."""

# Error cases
def test_missing_file():
    """Test behavior when required file is missing."""

def test_invalid_json():
    """Test behavior with malformed JSON."""

# Boundary cases
def test_zero_items():
    """Test with zero items."""

def test_maximum_items():
    """Test with maximum allowed items."""
```

**Deliverables**:

- 50+ edge case and error tests
- Coverage increase to 85%+

### Phase 4: Async & Integration Points (QA Sentinel)

**Duration**: 1-2 hours

- [ ] Async function testing
- [ ] Mock external services
- [ ] File system operations
- [ ] Environment variable handling
- [ ] Signal handling

**Deliverables**:

- Async test coverage
- Proper mocking patterns
- Coverage target achieved (85%+)

### Phase 5: Documentation & CI Integration (QA Sentinel)

**Duration**: 1 hour

- [ ] Update `docs/TESTING.md`
- [ ] Add test examples to CONTRIBUTING.md
- [ ] Configure GitHub Actions workflow
- [ ] Add coverage badges to README
- [ ] Document test patterns

**Deliverables**:

- Updated testing documentation
- CI/CD integration
- Coverage reporting in PRs

## Testing Guidelines

### Naming Conventions

```python
# Function naming: test_{function_name}_{scenario}_{expected_result}
def test_create_checkpoint_with_valid_description_succeeds()
def test_load_state_with_missing_file_raises_error()
def test_assign_agent_with_api_task_returns_backend_master()
```

### Fixture Organization

```python
# Scope by usage pattern
@pytest.fixture(scope="session")  # Expensive, reuse across all tests
def database_schema():
    ...

@pytest.fixture(scope="module")  # Reuse within one test file
def temp_workspace():
    ...

@pytest.fixture  # Default: function scope, fresh for each test
def sample_state():
    ...
```

### Mocking Best Practices

```python
# Mock at the boundary, not internals
@patch("forge.cli.StateManager")  # Good: mock external dependency
def test_cli_status_command(mock_manager):
    ...

# Avoid over-mocking
# Bad: mock too much, test becomes brittle
# Good: mock only external dependencies (files, network, time)
```

## Success Metrics

### Quantitative

- ✅ Overall coverage: 85%+ (current: 24%)
- ✅ Core modules: 80%+ each
- ✅ Test execution time: < 30s
- ✅ Zero test failures
- ✅ 150+ total test cases (current: ~40)

### Qualitative

- ✅ Clear, maintainable test code
- ✅ Easy to add new tests
- ✅ Fast feedback for developers
- ✅ Catches regressions
- ✅ Documents expected behavior

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tests take too long | Slow feedback | Use mocks, parallelize, optimize |
| Brittle tests | High maintenance | Follow best practices, avoid over-mocking |
| Low coverage of critical paths | Bugs escape | Prioritize high-risk modules first |
| Flaky async tests | CI failures | Proper async patterns, timeouts |

## Rollout Plan

### Week 1: Foundation

- Phase 1: Test infrastructure
- Phase 2: Core module tests (Priority 1)
- Coverage milestone: 50%

### Week 2: Completion

- Phase 2: Remaining modules (Priority 2-3)
- Phase 3: Edge cases
- Phase 4: Async & integration
- Coverage milestone: 85%

### Week 3: Integration

- Phase 5: Documentation & CI
- Final validation
- Release preparation

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Coverage ≥ 85% overall
- [ ] All existing tests pass
- [ ] No new test failures introduced
- [ ] CI/CD integration complete
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] CHANGELOG.md updated

---

**Estimated Total Effort**: 10-15 hours
**Target Completion**: v1.1 release
**Blocked By**: None
**Blocks**: Integration tests, production deployment confidence

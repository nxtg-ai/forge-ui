# Feature Implementation Prompt Template

## Purpose

This prompt template guides the implementation of new features following NXTG-Forge's Clean Architecture principles, testing standards, and development workflows.

## When to Use

- Adding new functionality to the project
- Implementing user stories or requirements
- Building new modules or components
- Extending existing features with new capabilities

## Template

```
# Feature Implementation: [FEATURE_NAME]

## Context

**Feature Description**: [Brief description of what this feature does]

**User Story**: As a [user type], I want to [goal] so that [benefit]

**Acceptance Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Related Issues**: #[issue_number]

## Architecture Design

### Affected Layers

**Domain Layer**:
- New entities: [List entities to create/modify]
- New value objects: [List value objects]
- Domain services: [List domain services]
- Repository interfaces: [List repository interfaces]

**Application Layer**:
- Use cases: [List use cases to implement]
- DTOs: [List data transfer objects]
- Application services: [List application services]

**Infrastructure Layer**:
- Repository implementations: [List concrete repositories]
- External services: [List external integrations]
- Database migrations: [List schema changes]

**Interface Layer**:
- API endpoints: [List REST endpoints or CLI commands]
- Request/Response schemas: [List schemas]
- Controllers: [List controllers]

### Dependencies

**New Dependencies**: [List any new packages needed]
**MCP Servers**: [List MCP servers to configure]
**Environment Variables**: [List new env vars]

## Implementation Plan

### Step 1: Domain Layer (Pure Business Logic)

**Goal**: Implement core business entities and rules

**Tasks**:
1. Create entity classes in `src/domain/entities/`
2. Create value objects in `src/domain/value_objects/`
3. Define repository interfaces in `src/domain/repositories/`
4. Implement domain services in `src/domain/services/`

**Example**:
```python
# src/domain/entities/feature_entity.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class FeatureEntity:
    """Domain entity for [feature]."""

    id: Optional[int]
    name: str
    created_at: datetime
    updated_at: datetime

    def validate(self) -> None:
        """Validate entity invariants."""
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Name cannot be empty")
```

**Acceptance**:

- [ ] No dependencies on external frameworks
- [ ] All business rules implemented
- [ ] Entity invariants enforced
- [ ] Type hints on all methods

### Step 2: Application Layer (Use Cases)

**Goal**: Orchestrate domain logic for specific use cases

**Tasks**:

1. Create use case classes in `src/application/use_cases/`
2. Define DTOs in `src/application/dtos/`
3. Implement application services if needed

**Example**:

```python
# src/application/use_cases/create_feature.py
from dataclasses import dataclass
from typing import Protocol

from forge.domain.entities.feature_entity import FeatureEntity
from forge.domain.repositories.feature_repository import FeatureRepository

@dataclass
class CreateFeatureDTO:
    """Data transfer object for creating feature."""
    name: str

class CreateFeatureUseCase:
    """Use case for creating a new feature."""

    def __init__(self, feature_repo: FeatureRepository):
        self.feature_repo = feature_repo

    async def execute(self, dto: CreateFeatureDTO) -> FeatureEntity:
        """Execute the create feature use case."""
        # Create entity
        entity = FeatureEntity(
            id=None,
            name=dto.name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Validate
        entity.validate()

        # Persist
        saved = await self.feature_repo.create(entity)

        return saved
```

**Acceptance**:

- [ ] Only depends on domain layer
- [ ] Uses dependency injection
- [ ] Clear input/output DTOs
- [ ] Error handling implemented

### Step 3: Infrastructure Layer (Implementations)

**Goal**: Implement concrete adapters for external systems

**Tasks**:

1. Implement repositories in `src/infrastructure/persistence/`
2. Implement external service adapters
3. Create database migrations if needed
4. Configure dependencies

**Example**:

```python
# src/infrastructure/persistence/sqlite_feature_repository.py
from typing import Optional
import sqlite3
from datetime import datetime

from forge.domain.entities.feature_entity import FeatureEntity
from forge.domain.repositories.feature_repository import FeatureRepository

class SqliteFeatureRepository(FeatureRepository):
    """SQLite implementation of FeatureRepository."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_table()

    def _ensure_table(self) -> None:
        """Create table if it doesn't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS features (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

    async def create(self, entity: FeatureEntity) -> FeatureEntity:
        """Create a new feature."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "INSERT INTO features (name, created_at, updated_at) VALUES (?, ?, ?)",
                (entity.name, entity.created_at.isoformat(), entity.updated_at.isoformat())
            )
            entity_id = cursor.lastrowid

        return FeatureEntity(
            id=entity_id,
            name=entity.name,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
```

**Acceptance**:

- [ ] Implements domain interfaces
- [ ] Handles external failures gracefully
- [ ] Includes connection pooling if applicable
- [ ] Logs important operations

### Step 4: Interface Layer (API/CLI)

**Goal**: Expose functionality through user-facing interfaces

**Tasks**:

1. Create API endpoints in `src/interface/api/` (if FastAPI)
2. Create CLI commands in `src/interface/cli/` (if CLI)
3. Define request/response schemas
4. Add input validation

**Example (FastAPI)**:

```python
# src/interface/api/feature_routes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from forge.application.use_cases.create_feature import CreateFeatureUseCase, CreateFeatureDTO

router = APIRouter(prefix="/features", tags=["features"])

class CreateFeatureRequest(BaseModel):
    """Request schema for creating feature."""
    name: str

class FeatureResponse(BaseModel):
    """Response schema for feature."""
    id: int
    name: str
    created_at: str
    updated_at: str

@router.post("/", response_model=FeatureResponse, status_code=201)
async def create_feature(
    request: CreateFeatureRequest,
    use_case: CreateFeatureUseCase = Depends(get_create_feature_use_case)
):
    """Create a new feature."""
    try:
        dto = CreateFeatureDTO(name=request.name)
        entity = await use_case.execute(dto)

        return FeatureResponse(
            id=entity.id,
            name=entity.name,
            created_at=entity.created_at.isoformat(),
            updated_at=entity.updated_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Example (CLI)**:

```python
# src/interface/cli/feature_commands.py
import click
from forge.application.use_cases.create_feature import CreateFeatureUseCase, CreateFeatureDTO

@click.group()
def feature():
    """Feature management commands."""
    pass

@feature.command()
@click.option("--name", required=True, help="Feature name")
def create(name: str):
    """Create a new feature."""
    use_case = get_create_feature_use_case()
    dto = CreateFeatureDTO(name=name)

    try:
        entity = use_case.execute(dto)
        click.echo(f"✓ Created feature: {entity.name} (ID: {entity.id})")
    except ValueError as e:
        click.echo(f"✗ Error: {e}", err=True)
        raise click.Abort()
```

**Acceptance**:

- [ ] Only handles HTTP/CLI concerns
- [ ] Input validation present
- [ ] Error responses well-formatted
- [ ] Documentation/help text included

### Step 5: Testing (TDD Approach)

**Goal**: Achieve 86%+ test coverage with all test types

**Unit Tests** (70% of tests):

```python
# tests/unit/domain/entities/test_feature_entity.py
import pytest
from datetime import datetime
from forge.domain.entities.feature_entity import FeatureEntity

class TestFeatureEntity:
    """Test FeatureEntity domain logic."""

    def test_create_valid_entity(self):
        """Test creating a valid feature entity."""
        # Arrange
        now = datetime.utcnow()

        # Act
        entity = FeatureEntity(
            id=1,
            name="Test Feature",
            created_at=now,
            updated_at=now
        )

        # Assert
        assert entity.id == 1
        assert entity.name == "Test Feature"
        assert entity.created_at == now

    def test_validate_raises_on_empty_name(self):
        """Test validation fails for empty name."""
        # Arrange
        entity = FeatureEntity(
            id=1,
            name="",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        # Act & Assert
        with pytest.raises(ValueError, match="Name cannot be empty"):
            entity.validate()
```

**Integration Tests** (20% of tests):

```python
# tests/integration/test_feature_workflow.py
import pytest
from pathlib import Path

from forge.application.use_cases.create_feature import CreateFeatureUseCase, CreateFeatureDTO
from forge.infrastructure.persistence.sqlite_feature_repository import SqliteFeatureRepository

class TestFeatureWorkflow:
    """Test complete feature workflow."""

    @pytest.fixture
    def repository(self, tmp_path):
        """Create repository with temp database."""
        db_path = tmp_path / "test.db"
        return SqliteFeatureRepository(str(db_path))

    @pytest.fixture
    def use_case(self, repository):
        """Create use case with dependencies."""
        return CreateFeatureUseCase(repository)

    async def test_create_feature_end_to_end(self, use_case):
        """Test creating feature from use case to persistence."""
        # Arrange
        dto = CreateFeatureDTO(name="Integration Test Feature")

        # Act
        entity = await use_case.execute(dto)

        # Assert
        assert entity.id is not None
        assert entity.name == "Integration Test Feature"
```

**E2E Tests** (10% of tests):

```python
# tests/e2e/test_feature_api.py
from fastapi.testclient import TestClient
from forge.interface.api.app import app

class TestFeatureAPI:
    """Test feature API endpoints end-to-end."""

    def test_create_feature_via_api(self):
        """Test creating feature through REST API."""
        # Arrange
        client = TestClient(app)

        # Act
        response = client.post("/features/", json={"name": "E2E Test"})

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "E2E Test"
        assert "id" in data
```

**Acceptance**:

- [ ] Unit tests for all domain logic
- [ ] Integration tests for workflows
- [ ] E2E tests for main paths
- [ ] Test coverage ≥ 86%
- [ ] All tests passing

### Step 6: Documentation

**Goal**: Document the feature for users and developers

**Tasks**:

1. Update API documentation
2. Add docstrings to all classes/methods
3. Update README if needed
4. Create usage examples

**Example Docstring**:

```python
class CreateFeatureUseCase:
    """Use case for creating a new feature.

    This use case orchestrates the creation of a feature entity,
    validates business rules, and persists it through the repository.

    Example:
        >>> use_case = CreateFeatureUseCase(feature_repo)
        >>> dto = CreateFeatureDTO(name="My Feature")
        >>> entity = await use_case.execute(dto)
        >>> print(f"Created: {entity.id}")
        Created: 42

    Args:
        feature_repo: Repository implementation for feature persistence

    Raises:
        ValueError: If feature data is invalid
        RepositoryError: If persistence fails
    """
```

**Acceptance**:

- [ ] All public APIs documented
- [ ] Usage examples included
- [ ] Architecture decisions recorded
- [ ] Known limitations documented

### Step 7: Integration and Deployment

**Goal**: Integrate feature and prepare for deployment

**Tasks**:

1. Update state.json with new feature
2. Run full test suite
3. Check code coverage
4. Run linting and type checking
5. Create migration if needed
6. Update configuration

**Commands**:

```bash
# Run tests
pytest tests/ -v --cov=forge --cov-report=term-missing

# Check coverage
pytest tests/ --cov=forge --cov-report=html
open htmlcov/index.html

# Lint code
ruff check forge/

# Type check
mypy forge/

# Format code
black forge/ tests/

# Update state
forge status
```

**Acceptance**:

- [ ] All tests passing
- [ ] Coverage ≥ 86%
- [ ] No linting errors
- [ ] No type errors
- [ ] State updated

## Quality Checklist

### Clean Architecture

- [ ] Domain layer has no external dependencies
- [ ] Application layer only depends on domain
- [ ] Infrastructure implements domain interfaces
- [ ] Interface layer only handles I/O concerns
- [ ] Dependencies point inward only

### Code Quality

- [ ] All functions have type hints
- [ ] Docstrings on all public APIs
- [ ] No code duplication
- [ ] Functions are < 50 lines
- [ ] Classes follow Single Responsibility Principle

### Testing

- [ ] Unit tests for domain logic (fast, isolated)
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Test coverage ≥ 86%
- [ ] Tests follow AAA pattern

### Security

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevented (parameterized queries)
- [ ] Error messages don't leak sensitive data
- [ ] Authentication/authorization if needed

### Performance

- [ ] Database queries optimized (no N+1)
- [ ] Appropriate indexes on database
- [ ] Caching strategy if applicable
- [ ] Connection pooling configured
- [ ] API response time < 200ms (p95)

### Documentation

- [ ] README updated
- [ ] API docs generated
- [ ] Usage examples included
- [ ] Architecture decisions recorded

## Agent Handoff

If this feature requires multiple agents:

**Lead Architect** → Design architecture, define layers
**Backend Master** → Implement API and business logic
**CLI Artisan** → Create CLI commands (if applicable)
**QA Sentinel** → Write comprehensive tests
**Platform Builder** → Configure deployment

See `.claude/prompts/agent-handoff.md` for handoff protocol.

## Common Pitfalls

### ❌ Don't

- **Mix layers**: Don't put business logic in controllers
- **Skip tests**: Don't implement without TDD
- **Hardcode**: Don't hardcode configuration
- **Over-engineer**: Don't add features not in requirements
- **Ignore errors**: Don't swallow exceptions silently

### ✅ Do

- **Follow layers**: Respect Clean Architecture boundaries
- **Write tests first**: TDD ensures testability
- **Use config**: Read from config.json or env vars
- **Keep it simple**: Solve the stated problem
- **Handle errors**: Log and propagate errors appropriately

## Example Usage

```bash
# Create new feature from this template
cp .claude/prompts/feature-implementation.md docs/features/my-feature.md

# Edit the template with specific feature details
vim docs/features/my-feature.md

# Use with Claude Code
claude --project . --prompt "Implement the feature described in docs/features/my-feature.md"
```

---

**Template Version**: 1.0.0
**Last Updated**: 2026-01-07
**Maintained By**: NXTG-Forge Team

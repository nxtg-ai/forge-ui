# Code Review Prompt Template

## Purpose

This prompt template provides a systematic approach to code review, ensuring quality, maintainability, and adherence to project standards.

## When to Use

- Reviewing pull requests
- Conducting code audits
- Mentoring junior developers
- Ensuring quality before merge

## Review Process

### 1. Pre-Review Checklist

Before starting the review, verify:

- [ ] **CI Checks Passing**: All automated checks are green
- [ ] **Description Complete**: PR has clear description and context
- [ ] **Reasonable Size**: PR is < 500 lines (ideally < 200)
- [ ] **Single Purpose**: PR addresses one feature/fix, not multiple
- [ ] **Tests Included**: New tests for new functionality
- [ ] **Documentation Updated**: README/docs reflect changes

If any of these are not met, request fixes before detailed review.

### 2. High-Level Review

**Purpose**: Understand what the PR does and why

#### Questions to Answer

**Intent**:

- [ ] What problem does this PR solve?
- [ ] Is this the right approach to solve it?
- [ ] Are there simpler alternatives?
- [ ] Does it align with project goals?

**Scope**:

- [ ] Is the scope appropriate?
- [ ] Should any parts be split into separate PRs?
- [ ] Are there related changes that should be included?

**Architecture**:

- [ ] Does it follow Clean Architecture?
- [ ] Are layers properly separated?
- [ ] Do dependencies point inward?
- [ ] Is it consistent with existing patterns?

**Example Review Comments**:

```markdown
### High-Level Feedback

**Intent**: ✅ This PR correctly implements JWT authentication as specified

**Scope**: ⚠️ Consider splitting the user registration into a separate PR.
The authentication logic is complete, but user registration adds complexity
and could be reviewed independently.

**Architecture**: ✅ Clean Architecture maintained. Domain logic is pure,
use cases are in application layer, and FastAPI integration is properly
isolated in interface layer.
```

### 3. Detailed Code Review

Go through each file systematically:

## Clean Architecture Review

### Domain Layer Review

**Location**: `forge/domain/`

**Checklist**:

```markdown
#### Domain Layer

**Entities** (`forge/domain/entities/`):
- [ ] No external dependencies (pure Python)
- [ ] Business invariants enforced
- [ ] Immutable where appropriate
- [ ] Rich domain models (behavior, not just data)
- [ ] Type hints on all methods
- [ ] Docstrings on public APIs

**Example Review**:
```python
# ❌ BAD - Entity with framework dependency
from sqlalchemy import Column, Integer, String

class User(Base):  # SQLAlchemy dependency!
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)

# ✅ GOOD - Pure domain entity
@dataclass
class User:
    """User domain entity."""
    id: Optional[int]
    email: Email
    created_at: datetime

    def change_email(self, new_email: Email) -> None:
        """Change email (business logic in entity)."""
        self.email = new_email
        self.updated_at = datetime.utcnow()
```

**Value Objects** (`forge/domain/value_objects/`):

- [ ] Immutable (frozen dataclasses or immutable types)
- [ ] Validation in `__post_init__` or constructor
- [ ] Equality based on value, not identity
- [ ] Type hints present

**Example Review**:

```python
# ✅ GOOD - Immutable value object with validation
@dataclass(frozen=True)
class Email:
    """Email address value object."""
    value: str

    def __post_init__(self):
        """Validate email format."""
        if not self._is_valid():
            raise ValueError(f"Invalid email: {self.value}")

    def _is_valid(self) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, self.value))
```

**Repository Interfaces** (`forge/domain/repositories/`):

- [ ] Protocol or ABC, not concrete class
- [ ] Domain types in signatures (not DTOs)
- [ ] Clear method names (create, find_by_id, update, delete)
- [ ] Async if I/O operations
- [ ] Documented exceptions

**Example Review**:

```python
# ✅ GOOD - Repository as Protocol
class UserRepository(Protocol):
    """Repository interface for users."""

    async def create(self, user: User) -> User:
        """Create new user.

        Args:
            user: User entity to create

        Returns:
            Created user with assigned ID

        Raises:
            EmailAlreadyExistsError: If email exists
            RepositoryError: If persistence fails
        """
        ...
```

**Domain Services** (`forge/domain/services/`):

- [ ] Only for operations spanning multiple entities
- [ ] Stateless
- [ ] Pure domain logic, no infrastructure
- [ ] Named after domain concepts

```

### Application Layer Review

**Location**: `forge/application/`

**Checklist**:

```markdown
#### Application Layer

**Use Cases** (`forge/application/use_cases/`):
- [ ] Single Responsibility (one use case = one operation)
- [ ] Depends only on domain layer
- [ ] Uses dependency injection
- [ ] Has clear input (DTO) and output
- [ ] Error handling present
- [ ] Async if I/O operations

**Example Review**:
```python
# ✅ GOOD - Use case with clear boundaries
class CreateUserUseCase:
    """Use case for creating a new user."""

    def __init__(
        self,
        user_repo: UserRepository,  # Injected
        email_service: EmailService  # Injected
    ):
        self.user_repo = user_repo
        self.email_service = email_service

    async def execute(self, dto: CreateUserDTO) -> User:
        """Execute use case."""
        # Validation
        email = Email(dto.email)

        # Business logic
        existing = await self.user_repo.find_by_email(email)
        if existing:
            raise EmailAlreadyExistsError()

        # Create entity
        user = User(...)

        # Persist
        saved = await self.user_repo.create(user)

        # Side effects
        await self.email_service.send_welcome(saved.email)

        return saved
```

**DTOs** (`forge/application/dtos/`):

- [ ] Dataclasses or Pydantic models
- [ ] Only data, no behavior
- [ ] Type hints on all fields
- [ ] Validation rules if using Pydantic

**Application Services** (if present):

- [ ] Facade over use cases
- [ ] Minimal logic (orchestration only)
- [ ] Does not duplicate use case logic

```

### Infrastructure Layer Review

**Location**: `forge/infrastructure/`

**Checklist**:

```markdown
#### Infrastructure Layer

**Repositories** (`forge/infrastructure/persistence/`):
- [ ] Implements domain repository interface
- [ ] Converts between domain entities and storage format
- [ ] Handles connection pooling
- [ ] Logs errors appropriately
- [ ] Uses transactions where needed
- [ ] Parameterized queries (no SQL injection)

**Example Review**:
```python
# ✅ GOOD - Repository implementation with proper error handling
class SqliteUserRepository(UserRepository):
    """SQLite implementation of UserRepository."""

    async def create(self, user: User) -> User:
        """Create user in database."""
        try:
            async with self._get_connection() as conn:
                async with conn.transaction():  # Transaction
                    cursor = await conn.execute(
                        "INSERT INTO users (email, ...) VALUES (?, ...)",
                        (str(user.email), ...)  # Parameterized
                    )
                    user_id = cursor.lastrowid

                    return User(id=user_id, email=user.email, ...)
        except IntegrityError as e:
            logger.error(f"Email already exists: {e}")
            raise EmailAlreadyExistsError() from e
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise RepositoryError("Failed to create user") from e
```

**External Services** (`forge/infrastructure/external/`):

- [ ] Implements domain interface
- [ ] Handles API errors gracefully
- [ ] Includes retry logic if appropriate
- [ ] Respects rate limits
- [ ] Logs external calls
- [ ] Has circuit breaker if needed

**Configuration** (`forge/infrastructure/config/`):

- [ ] No secrets in code
- [ ] Environment variables for configuration
- [ ] Defaults for development
- [ ] Validation of required config

```

### Interface Layer Review

**Location**: `forge/interface/`

**Checklist**:

```markdown
#### Interface Layer

**API Routes** (`forge/interface/api/`):
- [ ] Only handles HTTP concerns (request/response)
- [ ] Delegates to use cases
- [ ] Request validation (Pydantic schemas)
- [ ] Appropriate HTTP status codes
- [ ] Error responses well-formatted
- [ ] API versioning if needed

**Example Review**:
```python
# ✅ GOOD - API endpoint with proper separation
@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,  # Validation
    use_case: CreateUserUseCase = Depends(get_create_user_use_case)
):
    """Create a new user."""
    try:
        dto = CreateUserDTO(
            email=request.email,
            password=request.password
        )

        user = await use_case.execute(dto)  # Delegate

        return UserResponse.from_domain(user)  # Convert
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except EmailAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

**CLI Commands** (`forge/interface/cli/`):

- [ ] Clear help text
- [ ] Input validation
- [ ] Progress indicators for long operations
- [ ] User-friendly error messages
- [ ] Exit codes (0 success, 1+ error)

**Schemas** (`forge/interface/schemas/`):

- [ ] Pydantic models for validation
- [ ] Clear field descriptions
- [ ] Examples in docstrings
- [ ] Conversion methods (to/from domain)

```

## Code Quality Review

### Readability

**Checklist**:

```markdown
#### Readability

**Naming**:
- [ ] Variables: descriptive, lowercase_with_underscores
- [ ] Functions: verb_noun, lowercase_with_underscores
- [ ] Classes: PascalCase, noun
- [ ] Constants: UPPERCASE_WITH_UNDERSCORES
- [ ] Boolean variables: is_*, has_*, can_*
- [ ] Avoid abbreviations unless very common

**Example Review**:
```python
# ❌ BAD - Unclear names
def calc(x, y):
    res = x + y
    return res

# ✅ GOOD - Clear names
def calculate_total_price(item_price: Decimal, tax_rate: Decimal) -> Decimal:
    """Calculate total price including tax."""
    total_with_tax = item_price * (1 + tax_rate)
    return total_with_tax
```

**Function Length**:

- [ ] Functions < 50 lines (ideally < 20)
- [ ] Single responsibility
- [ ] Max 2-3 levels of indentation
- [ ] Extract complex logic to helper functions

**Comments**:

- [ ] Code is self-documenting (names explain intent)
- [ ] Comments explain "why", not "what"
- [ ] No commented-out code
- [ ] TODOs reference issue numbers

**Example Review**:

```python
# ❌ BAD - Comment explaining obvious "what"
# Calculate the price
price = quantity * unit_price

# ✅ GOOD - Comment explaining non-obvious "why"
# Use Decimal to avoid floating-point precision errors in financial calculations
price = Decimal(quantity) * Decimal(unit_price)

# ✅ GOOD - Self-documenting code
def calculate_price_with_bulk_discount(quantity: int, unit_price: Decimal) -> Decimal:
    """Calculate price with quantity-based discount."""
    if quantity >= 100:
        return apply_bulk_discount(quantity * unit_price)
    return quantity * unit_price
```

```

### Maintainability

**Checklist**:

```markdown
#### Maintainability

**DRY (Don't Repeat Yourself)**:
- [ ] No duplicated code
- [ ] Common logic extracted to functions/classes
- [ ] Constants defined once

**Example Review**:
```python
# ❌ BAD - Duplication
def create_user(email: str):
    if not email or '@' not in email:
        raise ValueError("Invalid email")
    # ...

def update_user_email(user_id: int, email: str):
    if not email or '@' not in email:
        raise ValueError("Invalid email")
    # ...

# ✅ GOOD - Extracted validation
def validate_email(email: str) -> None:
    """Validate email format."""
    if not email or '@' not in email:
        raise ValueError("Invalid email")

def create_user(email: str):
    validate_email(email)
    # ...
```

**SOLID Principles**:

- [ ] Single Responsibility: Each class has one reason to change
- [ ] Open/Closed: Open for extension, closed for modification
- [ ] Liskov Substitution: Subclasses can replace parent classes
- [ ] Interface Segregation: Small, focused interfaces
- [ ] Dependency Inversion: Depend on abstractions, not concretions

**Coupling**:

- [ ] Low coupling between modules
- [ ] High cohesion within modules
- [ ] Dependencies injected, not hardcoded

**Complexity**:

- [ ] Cyclomatic complexity < 10
- [ ] Avoid deep nesting
- [ ] Extract complex conditions to named functions

```

### Testing

**Checklist**:

```markdown
#### Testing

**Test Coverage**:
- [ ] All new code has tests
- [ ] Coverage ≥ 86% overall
- [ ] Domain logic: 95%+ coverage
- [ ] Application logic: 90%+ coverage
- [ ] Infrastructure: 85%+ coverage

**Test Quality**:
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Tests are independent (can run in any order)
- [ ] Tests are fast (unit tests < 100ms)
- [ ] Test names describe what is being tested
- [ ] One assertion per test (or closely related assertions)

**Example Review**:
```python
# ✅ GOOD - Well-structured test
def test_create_user_with_valid_data():
    """Test creating user with valid email and password."""
    # Arrange
    repository = InMemoryUserRepository()
    use_case = CreateUserUseCase(repository)
    dto = CreateUserDTO(
        email="test@example.com",
        password="secure123"
    )

    # Act
    user = await use_case.execute(dto)

    # Assert
    assert user.id is not None
    assert str(user.email) == "test@example.com"
```

**Test Types**:

- [ ] Unit tests for domain logic
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Edge cases covered
- [ ] Error cases tested

**Test Data**:

- [ ] Use factories or builders
- [ ] Fixtures for common setup
- [ ] Parametrize for similar test cases

```

### Security

**Checklist**:

```markdown
#### Security

**Input Validation**:
- [ ] All user inputs validated
- [ ] Whitelist validation (not blacklist)
- [ ] Length limits enforced
- [ ] Type checking present

**Authentication & Authorization**:
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks present
- [ ] No hardcoded credentials
- [ ] Secure session management

**Data Protection**:
- [ ] Passwords hashed (not plain text or encrypted)
- [ ] Sensitive data not logged
- [ ] PII properly handled
- [ ] No secrets in code or version control

**SQL Injection**:
- [ ] Parameterized queries used
- [ ] No string concatenation for SQL
- [ ] ORM used correctly

**Example Review**:
```python
# ❌ BAD - SQL injection vulnerability
def find_user(email: str):
    query = f"SELECT * FROM users WHERE email = '{email}'"  # VULNERABLE!
    cursor.execute(query)

# ✅ GOOD - Parameterized query
def find_user(email: str):
    query = "SELECT * FROM users WHERE email = ?"
    cursor.execute(query, (email,))

# ❌ BAD - Plain text password
user = User(email="...", password="password123")

# ✅ GOOD - Hashed password
password = Password.from_plain("password123")
user = User(email="...", password=password)
```

**API Security**:

- [ ] Rate limiting implemented
- [ ] CORS configured correctly
- [ ] No sensitive data in URLs
- [ ] HTTPS enforced (in production)

```

### Performance

**Checklist**:

```markdown
#### Performance

**Database**:
- [ ] No N+1 queries
- [ ] Appropriate indexes
- [ ] Connection pooling configured
- [ ] Query optimization for large datasets

**Example Review**:
```python
# ❌ BAD - N+1 query problem
users = await user_repo.find_all()
for user in users:
    orders = await order_repo.find_by_user_id(user.id)  # N queries!

# ✅ GOOD - Single query with join
users_with_orders = await user_repo.find_all_with_orders()
```

**Caching**:

- [ ] Expensive operations cached
- [ ] Cache invalidation strategy present
- [ ] TTL appropriate

**Async Operations**:

- [ ] I/O operations are async
- [ ] Async functions awaited properly
- [ ] No blocking operations in async code

**Memory**:

- [ ] No memory leaks
- [ ] Large datasets paginated
- [ ] Resources properly closed

```

## Documentation Review

**Checklist**:

```markdown
#### Documentation

**Docstrings**:
- [ ] All public classes have docstrings
- [ ] All public functions have docstrings
- [ ] Docstrings follow Google/NumPy style
- [ ] Parameters documented with types
- [ ] Return values documented
- [ ] Exceptions documented

**Example Review**:
```python
# ✅ GOOD - Complete docstring
def create_user(email: str, password: str) -> User:
    """Create a new user account.

    This function creates a user entity, validates the data,
    checks for email uniqueness, and persists to the database.

    Args:
        email: User's email address (must be valid format)
        password: User's password (min 8 characters)

    Returns:
        User: Created user entity with assigned ID

    Raises:
        ValueError: If email format is invalid or password too short
        EmailAlreadyExistsError: If email already registered

    Example:
        >>> user = create_user("test@example.com", "secure123")
        >>> print(user.id)
        42
    """
```

**README**:

- [ ] Installation instructions up to date
- [ ] Usage examples present
- [ ] API documentation referenced
- [ ] Contributing guidelines present

**API Documentation**:

- [ ] OpenAPI/Swagger docs generated
- [ ] Examples for each endpoint
- [ ] Error responses documented

```

## Review Comments Format

### Comment Structure

**Be Specific and Actionable**:

```markdown
# ❌ BAD - Vague comment
This doesn't look right.

# ✅ GOOD - Specific and actionable
`forge/domain/entities/user.py:45`

The `change_email` method modifies state without validation.
Add email format validation before changing the email:

```python
def change_email(self, new_email: str) -> None:
    """Change user's email address."""
    # Add this validation
    if not Email(new_email):
        raise ValueError(f"Invalid email format: {new_email}")

    self.email = new_email
    self.updated_at = datetime.utcnow()
```

```

### Categorize Comments

Use labels to indicate severity:

```markdown
**🔴 BLOCKING**: Must be fixed before merge
- Security vulnerabilities
- Breaking changes
- Test failures
- Architectural violations

**🟡 IMPORTANT**: Should be fixed before merge
- Code quality issues
- Missing tests
- Poor naming
- Lack of documentation

**🟢 SUGGESTION**: Nice to have
- Refactoring opportunities
- Performance optimizations
- Code style improvements

**💬 QUESTION**: Need clarification
- Unclear intent
- Design decisions
- Alternative approaches
```

### Example Review

```markdown
## Review Summary

Overall: ⚠️ Requires Changes

**Strengths**:
- ✅ Clean Architecture properly maintained
- ✅ Comprehensive test coverage (88%)
- ✅ Clear, descriptive naming

**Issues**:
- 🔴 SQL injection vulnerability in user search
- 🟡 Missing error handling in API endpoint
- 🟡 Docstring missing on public method
- 🟢 Consider extracting validation to value object

---

### 🔴 BLOCKING: SQL Injection Vulnerability

**File**: `forge/infrastructure/persistence/sqlite_user_repository.py:67`

```python
# Current code (VULNERABLE)
def search_users(self, query: str) -> list[User]:
    sql = f"SELECT * FROM users WHERE email LIKE '%{query}%'"
    cursor.execute(sql)
```

**Issue**: User input is directly interpolated into SQL query, allowing SQL injection.

**Fix**: Use parameterized queries:

```python
def search_users(self, query: str) -> list[User]:
    sql = "SELECT * FROM users WHERE email LIKE ?"
    cursor.execute(sql, (f"%{query}%",))
```

---

### 🟡 IMPORTANT: Missing Error Handling

**File**: `forge/interface/api/user_routes.py:23`

```python
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await use_case.execute(user_id)
    return UserResponse.from_domain(user)
```

**Issue**: No handling for user not found case. Will return 500 instead of 404.

**Fix**: Add error handling:

```python
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    try:
        user = await use_case.execute(user_id)
        return UserResponse.from_domain(user)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
```

---

### 🟢 SUGGESTION: Extract Validation

**File**: `forge/application/use_cases/create_user.py:15`

Consider extracting email validation to an `Email` value object for reusability:

```python
# Current (validation in use case)
if not email or '@' not in email:
    raise ValueError("Invalid email")

# Suggested (validation in value object)
email = Email(dto.email)  # Validation happens in Email.__post_init__
```

This would:

- Make validation reusable
- Keep use case focused on orchestration
- Follow DDD patterns

---

### 💬 QUESTION: Design Decision

Why was SQLite chosen over PostgreSQL for production? The requirements document
mentioned PostgreSQL. If this is intentional, consider documenting the decision
in an ADR.

```

## Post-Review Actions

### After Review Completion

1. **Summarize Findings**:
   - Count of blocking/important/suggestion issues
   - Overall assessment (Approve/Request Changes/Comment)
   - Timeline for re-review

2. **Track Issues**:
   - Create tickets for suggestions not addressed
   - Document architectural decisions
   - Update team knowledge base

3. **Follow Up**:
   - Re-review after changes
   - Verify fixes are appropriate
   - Approve when ready

## Example Usage

```bash
# Review a PR using this template
claude --project . --prompt "Review PR #123 using .claude/prompts/code-review.md"

# Or copy template for manual review
cp .claude/prompts/code-review.md /tmp/review-pr-123.md
vim /tmp/review-pr-123.md  # Fill in review comments
```

---

**Template Version**: 1.0.0
**Last Updated**: 2026-01-07
**Maintained By**: NXTG-Forge Team

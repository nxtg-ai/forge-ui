# Refactoring Prompt Template

## Purpose

This prompt template guides safe, systematic refactoring that improves code structure without changing external behavior.

## When to Use

- Improving code structure or readability
- Reducing code complexity or duplication
- Applying design patterns
- Migrating to better architectural patterns
- Improving testability or maintainability

## Template

```
# Refactoring: [REFACTORING_NAME]

## Context

**Current State**: [Description of current code structure]

**Problem**: [What makes current code problematic]

**Goal**: [What we want to achieve]

**Scope**: [What will be refactored]

## Motivation

### Why Refactor?

**Code Smells Identified**:
- [ ] Long method (> 50 lines)
- [ ] Large class (> 300 lines or > 10 methods)
- [ ] Long parameter list (> 4 parameters)
- [ ] Duplicated code
- [ ] Feature envy (method uses data from another class more than its own)
- [ ] Data clumps (same parameters always appear together)
- [ ] Primitive obsession (using primitives instead of value objects)
- [ ] Switch statements (should be polymorphism)
- [ ] Temporary field (field only used in some cases)
- [ ] Refused bequest (subclass doesn't use parent's methods)
- [ ] Comments (code needs comments to explain what it does)

**Impact**:
- **Readability**: [How will this improve code clarity]
- **Maintainability**: [How will this make code easier to change]
- **Testability**: [How will this make code easier to test]
- **Performance**: [Any performance implications]

**Risk Level**: [Low | Medium | High]

## Before: Current Code

```python
# Example of code that needs refactoring
class UserService:
    """Service handling user operations."""

    def create_user(self, email: str, password: str, first_name: str,
                    last_name: str, phone: str, address: str,
                    city: str, state: str, zip_code: str):
        """Create a new user."""
        # Validate email
        if not email or '@' not in email:
            raise ValueError("Invalid email")

        # Validate password
        if len(password) < 8:
            raise ValueError("Password too short")

        # Hash password
        import hashlib
        hashed = hashlib.sha256(password.encode()).hexdigest()

        # Create user dict
        user = {
            'email': email,
            'password': hashed,
            'first_name': first_name,
            'last_name': last_name,
            'phone': phone,
            'address': address,
            'city': city,
            'state': state,
            'zip_code': zip_code
        }

        # Save to database
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (email, password, first_name, last_name,
                             phone, address, city, state, zip_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (email, hashed, first_name, last_name, phone,
              address, city, state, zip_code))
        conn.commit()
        conn.close()

        return user
```

**Issues**:

1. Long parameter list (9 parameters)
2. Multiple responsibilities (validation, hashing, persistence)
3. Hardcoded database logic
4. Using dict instead of domain entity
5. No separation of concerns
6. Direct database access (not following Clean Architecture)

## Refactoring Strategy

### Pattern to Apply

**Extract Method**: Break long method into smaller methods
**Extract Class**: Create new class for related functionality
**Introduce Parameter Object**: Replace parameter list with object
**Replace Primitive with Value Object**: Use value objects instead of primitives
**Move Method**: Move method to more appropriate class
**Replace Conditional with Polymorphism**: Use inheritance instead of if/else

**Selected Pattern**: Extract Class + Introduce Parameter Object + Move Method

### Step-by-Step Plan

1. **Extract Value Objects** (Email, Password)
2. **Create Domain Entity** (User)
3. **Extract Repository Interface** (UserRepository)
4. **Extract Use Case** (CreateUserUseCase)
5. **Update Service to Use Use Case**

## Refactoring Steps

### Step 1: Extract Value Objects

**Create Email Value Object**:

```python
# forge/domain/value_objects/email.py
"""Email value object."""
from dataclasses import dataclass
import re

@dataclass(frozen=True)
class Email:
    """Email address value object.

    Immutable value object representing a valid email address.

    Example:
        >>> email = Email("user@example.com")
        >>> str(email)
        'user@example.com'

    Raises:
        ValueError: If email format is invalid
    """

    value: str

    def __post_init__(self):
        """Validate email format."""
        if not self.value or not self._is_valid():
            raise ValueError(f"Invalid email format: {self.value}")

    def _is_valid(self) -> bool:
        """Check if email format is valid."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, self.value))

    def __str__(self) -> str:
        """Return string representation."""
        return self.value
```

**Create Password Value Object**:

```python
# forge/domain/value_objects/password.py
"""Password value object."""
from dataclasses import dataclass
import hashlib

@dataclass(frozen=True)
class Password:
    """Hashed password value object.

    Immutable value object representing a securely hashed password.
    """

    hashed_value: str

    @classmethod
    def from_plain(cls, plain_password: str) -> "Password":
        """Create password from plain text.

        Args:
            plain_password: Plain text password

        Returns:
            Password with hashed value

        Raises:
            ValueError: If password doesn't meet requirements
        """
        if len(plain_password) < 8:
            raise ValueError("Password must be at least 8 characters")

        hashed = hashlib.sha256(plain_password.encode()).hexdigest()
        return cls(hashed_value=hashed)

    def verify(self, plain_password: str) -> bool:
        """Verify password matches.

        Args:
            plain_password: Plain text password to verify

        Returns:
            True if password matches
        """
        hashed = hashlib.sha256(plain_password.encode()).hexdigest()
        return hashed == self.hashed_value
```

**Create Address Value Object**:

```python
# forge/domain/value_objects/address.py
"""Address value object."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Address:
    """Physical address value object."""

    street: str
    city: str
    state: str
    zip_code: str

    def __post_init__(self):
        """Validate address components."""
        if not self.street or not self.city:
            raise ValueError("Street and city are required")
        if not self.state or len(self.state) != 2:
            raise ValueError("State must be 2 characters")
        if not self.zip_code or len(self.zip_code) != 5:
            raise ValueError("Zip code must be 5 digits")
```

**Test Value Objects**:

```python
# tests/unit/domain/value_objects/test_email.py
import pytest
from forge.domain.value_objects.email import Email

class TestEmail:
    """Test Email value object."""

    def test_create_valid_email(self):
        """Test creating valid email."""
        email = Email("user@example.com")
        assert str(email) == "user@example.com"

    def test_invalid_email_raises_error(self):
        """Test invalid email raises ValueError."""
        with pytest.raises(ValueError, match="Invalid email format"):
            Email("not-an-email")

    def test_email_is_immutable(self):
        """Test email value object is immutable."""
        email = Email("user@example.com")
        with pytest.raises(AttributeError):
            email.value = "other@example.com"
```

### Step 2: Create Domain Entity

```python
# forge/domain/entities/user.py
"""User domain entity."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from forge.domain.value_objects.email import Email
from forge.domain.value_objects.password import Password
from forge.domain.value_objects.address import Address

@dataclass
class User:
    """User domain entity.

    Represents a user in the system with validation rules and business logic.
    """

    id: Optional[int]
    email: Email
    password: Password
    first_name: str
    last_name: str
    phone: str
    address: Address
    created_at: datetime
    updated_at: datetime

    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"

    def change_email(self, new_email: Email) -> None:
        """Change user's email address."""
        self.email = new_email
        self.updated_at = datetime.utcnow()

    def change_password(self, old_password: str, new_password: str) -> None:
        """Change user's password.

        Args:
            old_password: Current password (plain text)
            new_password: New password (plain text)

        Raises:
            ValueError: If old password doesn't match
        """
        if not self.password.verify(old_password):
            raise ValueError("Current password is incorrect")

        self.password = Password.from_plain(new_password)
        self.updated_at = datetime.utcnow()
```

### Step 3: Create Repository Interface

```python
# forge/domain/repositories/user_repository.py
"""User repository interface."""
from typing import Protocol, Optional

from forge.domain.entities.user import User
from forge.domain.value_objects.email import Email

class UserRepository(Protocol):
    """Repository interface for user persistence."""

    async def create(self, user: User) -> User:
        """Create a new user.

        Args:
            user: User entity to create

        Returns:
            Created user with assigned ID

        Raises:
            EmailAlreadyExistsError: If email already exists
            RepositoryError: If persistence fails
        """
        ...

    async def find_by_id(self, user_id: int) -> Optional[User]:
        """Find user by ID.

        Args:
            user_id: User ID

        Returns:
            User if found, None otherwise
        """
        ...

    async def find_by_email(self, email: Email) -> Optional[User]:
        """Find user by email.

        Args:
            email: Email to search for

        Returns:
            User if found, None otherwise
        """
        ...
```

### Step 4: Create Use Case

```python
# forge/application/use_cases/create_user.py
"""Create user use case."""
from dataclasses import dataclass
from datetime import datetime

from forge.domain.entities.user import User
from forge.domain.repositories.user_repository import UserRepository
from forge.domain.value_objects.email import Email
from forge.domain.value_objects.password import Password
from forge.domain.value_objects.address import Address

@dataclass
class CreateUserDTO:
    """DTO for creating a user."""

    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    street: str
    city: str
    state: str
    zip_code: str

class CreateUserUseCase:
    """Use case for creating a new user."""

    def __init__(self, user_repo: UserRepository):
        """Initialize use case.

        Args:
            user_repo: User repository implementation
        """
        self.user_repo = user_repo

    async def execute(self, dto: CreateUserDTO) -> User:
        """Execute create user use case.

        Args:
            dto: User creation data

        Returns:
            Created user entity

        Raises:
            ValueError: If user data is invalid
            EmailAlreadyExistsError: If email already exists
        """
        # Create value objects (validation happens here)
        email = Email(dto.email)
        password = Password.from_plain(dto.password)
        address = Address(
            street=dto.street,
            city=dto.city,
            state=dto.state,
            zip_code=dto.zip_code
        )

        # Check email uniqueness
        existing = await self.user_repo.find_by_email(email)
        if existing is not None:
            raise EmailAlreadyExistsError(f"Email {email} already exists")

        # Create entity
        now = datetime.utcnow()
        user = User(
            id=None,
            email=email,
            password=password,
            first_name=dto.first_name,
            last_name=dto.last_name,
            phone=dto.phone,
            address=address,
            created_at=now,
            updated_at=now
        )

        # Persist
        return await self.user_repo.create(user)
```

### Step 5: Update Service

```python
# forge/application/services/user_service.py
"""User service (application layer)."""
from forge.application.use_cases.create_user import CreateUserUseCase, CreateUserDTO
from forge.domain.repositories.user_repository import UserRepository

class UserService:
    """Service for user operations."""

    def __init__(self, user_repo: UserRepository):
        """Initialize service with dependencies."""
        self.user_repo = user_repo
        self.create_user_use_case = CreateUserUseCase(user_repo)

    async def create_user(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: str,
        street: str,
        city: str,
        state: str,
        zip_code: str
    ):
        """Create a new user.

        This is a facade method that delegates to the appropriate use case.
        """
        dto = CreateUserDTO(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            street=street,
            city=city,
            state=state,
            zip_code=zip_code
        )

        return await self.create_user_use_case.execute(dto)
```

## After: Refactored Code

**Benefits**:

1. **Separation of Concerns**: Each class has single responsibility
2. **Testability**: Each component can be tested independently
3. **Reusability**: Value objects and entities can be reused
4. **Maintainability**: Changes are localized to appropriate layer
5. **Type Safety**: Strong typing with value objects
6. **Clean Architecture**: Proper layer separation

**Layers**:

```
Domain Layer:
  - User (entity)
  - Email, Password, Address (value objects)
  - UserRepository (interface)

Application Layer:
  - CreateUserUseCase (use case)
  - CreateUserDTO (DTO)
  - UserService (service facade)

Infrastructure Layer:
  - SqliteUserRepository (implementation)
```

## Testing Strategy

### Test Each Layer Independently

**Unit Tests (Domain)**:

```python
# tests/unit/domain/entities/test_user.py
class TestUser:
    """Test User entity."""

    def test_create_user(self):
        """Test creating user with valid data."""
        email = Email("user@example.com")
        password = Password.from_plain("password123")
        address = Address("123 Main St", "City", "CA", "12345")

        user = User(
            id=None,
            email=email,
            password=password,
            first_name="John",
            last_name="Doe",
            phone="555-1234",
            address=address,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        assert user.full_name == "John Doe"
        assert user.email == email
```

**Integration Tests (Use Case)**:

```python
# tests/integration/test_create_user_workflow.py
class TestCreateUserWorkflow:
    """Test complete user creation workflow."""

    async def test_create_user_success(self, use_case, repository):
        """Test successful user creation."""
        dto = CreateUserDTO(
            email="new@example.com",
            password="secure123",
            first_name="Jane",
            last_name="Smith",
            phone="555-5678",
            street="456 Oak Ave",
            city="Town",
            state="NY",
            zip_code="54321"
        )

        user = await use_case.execute(dto)

        assert user.id is not None
        assert str(user.email) == "new@example.com"
        assert user.full_name == "Jane Smith"
```

## Refactoring Checklist

### Before Starting

- [ ] All tests are passing
- [ ] Code coverage documented
- [ ] Behavior to preserve is clear
- [ ] Refactoring scope is defined
- [ ] Team is informed (if needed)

### During Refactoring

- [ ] Make small, incremental changes
- [ ] Run tests after each change
- [ ] Commit after each successful step
- [ ] Keep external behavior unchanged
- [ ] Maintain or improve coverage

### After Completing

- [ ] All tests still passing
- [ ] Coverage maintained or improved
- [ ] No linting errors
- [ ] No type errors
- [ ] Documentation updated
- [ ] Code review completed

## Safety Guidelines

### Safe Refactorings (Low Risk)

✅ **Rename** (variable, method, class)
✅ **Extract Method** (break up long method)
✅ **Extract Class** (move related methods)
✅ **Inline** (merge simple methods/variables)
✅ **Move Method** (to more appropriate class)
✅ **Pull Up Method** (to superclass)
✅ **Push Down Method** (to subclass)

### Risky Refactorings (High Risk)

⚠️ **Change Method Signature** (impacts callers)
⚠️ **Extract Interface** (changes dependencies)
⚠️ **Replace Inheritance with Delegation** (major structure change)
⚠️ **Replace Conditional with Polymorphism** (behavior change risk)

**For Risky Refactorings**:

1. Add comprehensive tests first
2. Use automated refactoring tools if available
3. Refactor in small steps
4. Get code review before merging
5. Consider feature flags for gradual rollout

## Common Pitfalls

### ❌ Don't

- **Change behavior**: Refactoring should not change external behavior
- **Refactor without tests**: Always have tests before refactoring
- **Make big changes**: Small incremental steps are safer
- **Skip code review**: Get another pair of eyes
- **Ignore failed tests**: Fix immediately or rollback

### ✅ Do

- **Preserve behavior**: External behavior must remain identical
- **Test first**: Ensure comprehensive test coverage
- **Small steps**: Commit after each successful refactoring
- **Review carefully**: Have changes reviewed
- **Monitor production**: Watch for issues after deployment

## Example Workflow

```bash
# 1. Ensure tests pass
pytest tests/ -v

# 2. Create refactoring branch
git checkout -b refactor/user-service-clean-architecture

# 3. Create value objects (small step)
vim forge/domain/value_objects/email.py
vim tests/unit/domain/value_objects/test_email.py
pytest tests/unit/domain/value_objects/ -v
git add forge/domain/value_objects/ tests/unit/domain/value_objects/
git commit -m "refactor: Extract Email value object"

# 4. Create entity (small step)
vim forge/domain/entities/user.py
vim tests/unit/domain/entities/test_user.py
pytest tests/unit/domain/entities/ -v
git add forge/domain/entities/ tests/unit/domain/entities/
git commit -m "refactor: Extract User entity"

# 5. Create repository interface (small step)
vim forge/domain/repositories/user_repository.py
git add forge/domain/repositories/
git commit -m "refactor: Extract UserRepository interface"

# 6. Create use case (small step)
vim forge/application/use_cases/create_user.py
vim tests/integration/test_create_user_workflow.py
pytest tests/integration/test_create_user_workflow.py -v
git add forge/application/ tests/integration/
git commit -m "refactor: Extract CreateUserUseCase"

# 7. Update service (small step)
vim forge/application/services/user_service.py
pytest tests/ -v  # Run all tests
git add forge/application/services/
git commit -m "refactor: Update UserService to use use case"

# 8. Verify everything works
pytest tests/ -v --cov=forge
black forge/ tests/
ruff check forge/
mypy forge/

# 9. Create PR
gh pr create --title "refactor: Migrate UserService to Clean Architecture"
```

---

**Template Version**: 1.0.0
**Last Updated**: 2026-01-07
**Maintained By**: NXTG-Forge Team

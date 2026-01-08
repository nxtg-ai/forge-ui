# Bug Fix Prompt Template

## Purpose

This prompt template guides systematic debugging and fixing of bugs while maintaining code quality and preventing regressions.

## When to Use

- Fixing reported bugs or defects
- Resolving test failures
- Addressing production issues
- Correcting incorrect behavior

## Template

```
# Bug Fix: [BUG_TITLE]

## Bug Report

**Issue ID**: #[issue_number]

**Severity**: [Critical | High | Medium | Low]

**Component**: [affected component/module]

**Environment**: [production | staging | development]

**Reported By**: [username/date]

**Description**: [Clear description of the problem]

## Reproduction

### Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happens]

### Frequency

- [ ] Always reproducible
- [ ] Intermittent (occurs [X]% of the time)
- [ ] Only in specific conditions: [describe conditions]

### Evidence

**Error Message**:
```

[Paste error message/stack trace]

```

**Logs**:
```

[Relevant log entries]

```

**Screenshots**: [If applicable]

## Investigation

### Step 1: Understand the Context

**Read Related Code**:
```bash
# Find relevant files
rg -l "[keyword]" forge/

# Read the implementation
cat forge/[module]/[file].py
```

**Check Test Coverage**:

```bash
# Run tests for affected module
pytest tests/unit/[module]/ -v

# Check coverage
pytest tests/unit/[module]/ --cov=forge.[module] --cov-report=term-missing
```

**Review Recent Changes**:

```bash
# Check git history
git log --oneline --all -- forge/[module]/[file].py

# See what changed
git show [commit_hash]
```

**Questions to Answer**:

- [ ] What component is failing?
- [ ] What layer does it belong to? (Domain/Application/Infrastructure/Interface)
- [ ] Are there existing tests for this functionality?
- [ ] What changed recently that might have caused this?

### Step 2: Isolate the Root Cause

**Create Minimal Reproduction**:

```python
# tests/debug/test_minimal_reproduction.py
"""Minimal test case reproducing the bug."""
import pytest

def test_bug_reproduction():
    """Reproduce bug #[issue_number]."""
    # Arrange - Set up minimal conditions
    [setup code]

    # Act - Trigger the bug
    [action that causes bug]

    # Assert - Verify bug occurs
    [assertion showing bug]
```

**Add Debug Logging**:

```python
import logging

logger = logging.getLogger(__name__)

def problematic_function(data):
    """Function that may have the bug."""
    logger.debug(f"Input data: {data}")

    result = process(data)
    logger.debug(f"Intermediate result: {result}")

    final = transform(result)
    logger.debug(f"Final output: {final}")

    return final
```

**Use Debugger**:

```bash
# Run with debugger
python -m pdb -m pytest tests/debug/test_minimal_reproduction.py

# Or use pytest's debugger
pytest --pdb tests/debug/test_minimal_reproduction.py
```

**Hypothesis Checklist**:

- [ ] Is it a logic error? (wrong algorithm)
- [ ] Is it a data error? (unexpected input)
- [ ] Is it a state error? (incorrect state management)
- [ ] Is it a concurrency error? (race condition)
- [ ] Is it an integration error? (external service)
- [ ] Is it a configuration error? (wrong config)

### Step 3: Implement the Fix

**Determine Fix Location**:

```
Domain Layer:     Fix business logic or invariants
Application Layer: Fix use case orchestration
Infrastructure:    Fix external integration or persistence
Interface Layer:   Fix input validation or output formatting
```

**Example Fix (Domain Layer)**:

```python
# forge/domain/entities/user.py

class User:
    """User domain entity."""

    def change_email(self, new_email: str) -> None:
        """Change user's email address.

        Raises:
            ValueError: If email format is invalid
        """
        # BUG FIX: Added email validation that was missing
        if not self._is_valid_email(new_email):
            raise ValueError(f"Invalid email format: {new_email}")

        # BUG FIX: Added check to prevent duplicate emails
        if new_email == self.email:
            return  # No change needed

        self.email = new_email
        self.updated_at = datetime.utcnow()

    def _is_valid_email(self, email: str) -> bool:
        """Validate email format."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
```

**Example Fix (Application Layer)**:

```python
# forge/application/use_cases/update_user.py

class UpdateUserUseCase:
    """Use case for updating user information."""

    async def execute(self, user_id: int, dto: UpdateUserDTO) -> User:
        """Execute update user use case."""
        # BUG FIX: Added existence check that was missing
        user = await self.user_repo.find_by_id(user_id)
        if user is None:
            raise UserNotFoundError(f"User {user_id} not found")

        # BUG FIX: Fixed race condition by checking email uniqueness
        if dto.email and dto.email != user.email:
            existing = await self.user_repo.find_by_email(dto.email)
            if existing is not None:
                raise EmailAlreadyExistsError(f"Email {dto.email} already in use")

        # Apply updates
        if dto.email:
            user.change_email(dto.email)

        # BUG FIX: Added proper error handling for save operation
        try:
            return await self.user_repo.update(user)
        except RepositoryError as e:
            logger.error(f"Failed to update user {user_id}: {e}")
            raise UpdateUserError(f"Failed to update user: {e}") from e
```

**Example Fix (Infrastructure Layer)**:

```python
# forge/infrastructure/persistence/sqlite_user_repository.py

class SqliteUserRepository(UserRepository):
    """SQLite implementation of user repository."""

    async def update(self, user: User) -> User:
        """Update existing user."""
        # BUG FIX: Added transaction to ensure atomicity
        conn = await self._get_connection()
        try:
            async with conn.transaction():
                # BUG FIX: Fixed SQL query that was updating wrong column
                await conn.execute(
                    """
                    UPDATE users
                    SET email = $1, updated_at = $2
                    WHERE id = $3
                    """,
                    user.email, user.updated_at, user.id
                )

                # BUG FIX: Added check to ensure user was actually updated
                result = await conn.fetchval(
                    "SELECT COUNT(*) FROM users WHERE id = $1",
                    user.id
                )
                if result == 0:
                    raise UserNotFoundError(f"User {user.id} not found")

                return user
        except Exception as e:
            logger.error(f"Database error updating user {user.id}: {e}")
            raise RepositoryError(f"Failed to update user") from e
```

**Fix Checklist**:

- [ ] Fix addresses root cause, not symptoms
- [ ] Fix maintains architectural boundaries
- [ ] Fix doesn't introduce new bugs
- [ ] Fix is minimal and focused
- [ ] Fix includes appropriate error handling
- [ ] Fix includes logging if needed

### Step 4: Write Regression Test

**Create Test That Would Have Caught the Bug**:

```python
# tests/unit/domain/entities/test_user.py

class TestUserEmailChange:
    """Test user email change functionality."""

    def test_change_email_validates_format(self):
        """Test that changing email validates format (bug #123)."""
        # Arrange
        user = User(id=1, email="old@example.com")

        # Act & Assert - Invalid email should raise error
        with pytest.raises(ValueError, match="Invalid email format"):
            user.change_email("not-an-email")

        # Email should remain unchanged
        assert user.email == "old@example.com"

    def test_change_email_accepts_valid_format(self):
        """Test that changing email accepts valid format."""
        # Arrange
        user = User(id=1, email="old@example.com")

        # Act
        user.change_email("new@example.com")

        # Assert
        assert user.email == "new@example.com"

    def test_change_email_no_op_if_same(self):
        """Test that changing to same email is no-op (bug #123)."""
        # Arrange
        user = User(id=1, email="same@example.com")
        original_updated_at = user.updated_at

        # Act
        user.change_email("same@example.com")

        # Assert - updated_at should not change
        assert user.updated_at == original_updated_at
```

**Integration Test**:

```python
# tests/integration/test_user_update_workflow.py

class TestUserUpdateWorkflow:
    """Test complete user update workflow."""

    async def test_update_user_prevents_duplicate_emails(self, use_case, repository):
        """Test that updating email prevents duplicates (bug #123)."""
        # Arrange - Create two users
        user1 = await repository.create(User(id=None, email="user1@example.com"))
        user2 = await repository.create(User(id=None, email="user2@example.com"))

        dto = UpdateUserDTO(email="user1@example.com")  # Try to use existing email

        # Act & Assert - Should raise error
        with pytest.raises(EmailAlreadyExistsError):
            await use_case.execute(user2.id, dto)

        # User2 email should remain unchanged
        user2_updated = await repository.find_by_id(user2.id)
        assert user2_updated.email == "user2@example.com"
```

**E2E Test**:

```python
# tests/e2e/test_user_api.py

class TestUserAPI:
    """Test user API endpoints end-to-end."""

    def test_update_user_email_validation(self, client):
        """Test email validation in user update API (bug #123)."""
        # Arrange - Create user
        response = client.post("/users/", json={"email": "test@example.com"})
        user_id = response.json()["id"]

        # Act - Try to update with invalid email
        response = client.patch(
            f"/users/{user_id}",
            json={"email": "invalid-email"}
        )

        # Assert - Should return 400 Bad Request
        assert response.status_code == 400
        assert "invalid email" in response.json()["detail"].lower()
```

**Regression Test Checklist**:

- [ ] Test reproduces original bug
- [ ] Test verifies fix works
- [ ] Test covers edge cases
- [ ] Test is deterministic (not flaky)
- [ ] Test runs quickly (< 1 second for unit test)

### Step 5: Verify the Fix

**Run Related Tests**:

```bash
# Run tests for affected module
pytest tests/unit/domain/entities/test_user.py -v

# Run integration tests
pytest tests/integration/test_user_update_workflow.py -v

# Run E2E tests
pytest tests/e2e/test_user_api.py -v

# Run full test suite
pytest tests/ -v
```

**Check Coverage**:

```bash
# Ensure fix is covered by tests
pytest tests/ --cov=forge --cov-report=term-missing

# Coverage should still be ≥ 86%
```

**Manual Testing**:

```bash
# Test in development environment
forge user update 123 --email new@example.com

# Try edge cases
forge user update 123 --email invalid-email
forge user update 123 --email existing@example.com
```

**Performance Testing** (if applicable):

```bash
# Ensure fix doesn't impact performance
python -m timeit -s "from forge.domain.entities import User" \
    "user = User(id=1, email='test@example.com'); user.change_email('new@example.com')"
```

**Verification Checklist**:

- [ ] Original bug no longer occurs
- [ ] Regression test passes
- [ ] All existing tests still pass
- [ ] Coverage maintained ≥ 86%
- [ ] Manual testing confirms fix
- [ ] No performance degradation

### Step 6: Update Documentation

**Code Comments**:

```python
def change_email(self, new_email: str) -> None:
    """Change user's email address.

    This method validates the email format and ensures the new email
    is different from the current one before applying the change.

    Bug Fix (#123): Added email format validation to prevent invalid
    emails from being stored.

    Args:
        new_email: The new email address

    Raises:
        ValueError: If email format is invalid

    Example:
        >>> user = User(id=1, email="old@example.com")
        >>> user.change_email("new@example.com")
        >>> assert user.email == "new@example.com"
    """
```

**Changelog**:

```markdown
# Changelog

## [Unreleased]

### Fixed
- Fixed email validation in user update endpoint (#123)
  - Added format validation to prevent invalid emails
  - Added duplicate email check to prevent conflicts
  - Added proper error handling for database failures
  - Added regression tests to prevent future occurrences
```

**Known Issues**:

```markdown
# Known Issues

## Fixed

### Email Validation Not Applied (Fixed in v1.2.1)
**Issue**: Users could set invalid email addresses
**Impact**: High - Data integrity issue
**Fixed By**: PR #456
**Regression Test**: tests/unit/domain/entities/test_user.py::test_change_email_validates_format
```

**Documentation Checklist**:

- [ ] Code comments explain the fix
- [ ] Changelog updated
- [ ] Known issues updated
- [ ] Related documentation updated

### Step 7: Create Pull Request

**PR Title**:

```
fix: Validate email format in user update (#123)
```

**PR Description**:

```markdown
## Bug Fix

Fixes #123

## Problem

Users could set invalid email addresses through the update endpoint, causing:
- Data integrity issues
- Email sending failures
- Poor user experience

The bug occurred because:
1. No email format validation in domain entity
2. No duplicate email check in use case
3. No proper error handling in repository

## Solution

Added three layers of protection:

1. **Domain Layer** (`forge/domain/entities/user.py`)
   - Added `_is_valid_email()` method for format validation
   - Modified `change_email()` to validate before applying changes

2. **Application Layer** (`forge/application/use_cases/update_user.py`)
   - Added duplicate email check to prevent conflicts
   - Added proper error handling and logging

3. **Infrastructure Layer** (`forge/infrastructure/persistence/sqlite_user_repository.py`)
   - Added transaction to ensure atomicity
   - Added verification that user exists before update

## Testing

**Regression Tests Added**:
- `tests/unit/domain/entities/test_user.py::test_change_email_validates_format`
- `tests/integration/test_user_update_workflow.py::test_update_user_prevents_duplicate_emails`
- `tests/e2e/test_user_api.py::test_update_user_email_validation`

**Test Results**:
```

230 passed in 2.34s
Coverage: 86.08% (+0.02%)

```

**Manual Testing**:
- [x] Invalid email rejected with clear error
- [x] Valid email accepted and saved
- [x] Duplicate email detected and rejected
- [x] Existing functionality unaffected

## Checklist

- [x] Bug reproduced in test
- [x] Root cause identified
- [x] Fix implemented
- [x] Regression tests added
- [x] All tests passing
- [x] Coverage maintained ≥ 86%
- [x] Code reviewed
- [x] Documentation updated

🤖 Generated with Claude Code
```

**PR Checklist**:

- [ ] Title follows format: `fix: description (#issue)`
- [ ] Description explains problem and solution
- [ ] Links to original issue
- [ ] Includes test results
- [ ] All CI checks passing

## Quality Checklist

### Fix Quality

- [ ] Addresses root cause, not symptoms
- [ ] Minimal and focused change
- [ ] Follows Clean Architecture
- [ ] No new dependencies unless necessary
- [ ] Backwards compatible (if possible)

### Testing

- [ ] Regression test reproduces bug
- [ ] Regression test verifies fix
- [ ] All existing tests still pass
- [ ] Coverage maintained ≥ 86%
- [ ] Edge cases covered

### Code Quality

- [ ] Follows coding standards
- [ ] Type hints maintained
- [ ] Docstrings updated
- [ ] No linting errors
- [ ] No type errors

### Documentation

- [ ] Code comments explain fix
- [ ] Changelog updated
- [ ] Known issues updated
- [ ] API docs updated if needed

## Common Pitfalls

### ❌ Don't

- **Guess the fix**: Always understand root cause first
- **Fix symptoms**: Address the underlying problem
- **Skip tests**: Always add regression tests
- **Over-engineer**: Keep the fix simple and focused
- **Ignore architecture**: Maintain layer boundaries

### ✅ Do

- **Reproduce first**: Create minimal reproduction
- **Understand deeply**: Know why bug occurred
- **Test thoroughly**: Unit, integration, E2E tests
- **Keep it simple**: Minimal fix that solves problem
- **Document well**: Explain the fix for future reference

## Example Workflow

```bash
# 1. Reproduce the bug
pytest tests/debug/test_bug_123.py -v

# 2. Find root cause
rg "def change_email" forge/
vim forge/domain/entities/user.py

# 3. Implement fix
vim forge/domain/entities/user.py

# 4. Write regression test
vim tests/unit/domain/entities/test_user.py

# 5. Run tests
pytest tests/ -v --cov=forge

# 6. Check quality
black forge/ tests/
ruff check forge/
mypy forge/

# 7. Commit
git add forge/ tests/
git commit -m "fix: Validate email format in user update (#123)

- Add email format validation to User entity
- Add duplicate email check to UpdateUserUseCase
- Add transaction to repository update
- Add regression tests at all layers

Fixes #123

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 8. Create PR
gh pr create --title "fix: Validate email format in user update (#123)"
```

---

**Template Version**: 1.0.0
**Last Updated**: 2026-01-07
**Maintained By**: NXTG-Forge Team

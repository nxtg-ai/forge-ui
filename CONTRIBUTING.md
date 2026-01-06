# Contributing to NXTG-Forge

Thank you for your interest in contributing to NXTG-Forge! We welcome contributions from the community and are excited to have you here.

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to axw@nxtg.ai.

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- Git
- Make (optional, for convenience commands)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nxtg-forge.git
   cd nxtg-forge
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nxtg-ai/nxtg-forge.git
   ```

4. **Install dependencies**:
   ```bash
   # Using make
   make dev-install

   # Or manually
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   npm install
   ```

5. **Install pre-commit hooks**:
   ```bash
   pre-commit install
   ```

6. **Claude Code lifecycle hooks** are automatically active when using Claude Code:
   - Hooks run automatically during task execution
   - See [`.claude/hooks/README.md`](.claude/hooks/README.md) for details
   - No additional setup required

## Development Workflow

### Creating a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Making Changes

1. **Write tests first** (Test-Driven Development):
   ```bash
   # Create test file
   touch tests/unit/test_your_feature.py

   # Write failing tests
   # Then implement the feature
   ```

2. **Follow coding standards** (see [Architecture Guide](docs/ARCHITECTURE.md#coding-standards)):
   - Use type hints
   - Write docstrings for all public functions/classes
   - Keep functions focused and small
   - Use meaningful variable names

3. **Run quality checks** before committing:
   ```bash
   make quality
   ```

   This runs:
   - Ruff (linting)
   - Black (formatting)
   - MyPy (type checking)
   - Tests with coverage

   **Note**: When using Claude Code, lifecycle hooks automatically:
   - Format Python files with Black on save
   - Run quick linting checks after tasks
   - Validate JSON/YAML syntax
   - Suggest running tests when needed

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:
```
feat(agents): add parallel task execution

Implement parallel execution in TaskDispatcher to handle
multiple agent tasks concurrently using asyncio.gather().

Closes #123
```

```
fix(cli): resolve state.json encoding issue

Handle UTF-8 encoding explicitly when reading/writing state
files to prevent UnicodeDecodeError on Windows systems.

Fixes #456
```

### Running Tests

```bash
# Run all tests
make test

# Run specific test suite
pytest tests/unit/
pytest tests/integration/

# Run with coverage
pytest --cov=forge --cov-report=html
open htmlcov/index.html

# Run specific test file
pytest tests/unit/test_orchestrator.py

# Run specific test
pytest tests/unit/test_orchestrator.py::test_assign_agent
```

**Testing Requirements**:
- All new features must have unit tests
- Aim for minimum 85% code coverage
- Include integration tests for complex features
- Add E2E tests for critical user workflows

### Code Quality Standards

**Python**:
- Follow PEP 8 style guide
- Use type hints (PEP 484)
- Maximum line length: 100 characters
- Use `"""Docstrings"""` for all public APIs
- Prefer composition over inheritance
- Keep cyclomatic complexity low (< 10)

**TypeScript/JavaScript**:
- Use ESLint configuration provided
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promise chains
- Write JSDoc comments for public functions

**Clean Architecture**:
- Keep domain layer pure (no infrastructure dependencies)
- Application layer depends only on domain
- Infrastructure implements domain interfaces
- Interface layer only handles HTTP/CLI concerns

See [Architecture Guide](docs/ARCHITECTURE.md) for detailed standards.

### Documentation

- Update README.md if adding new features
- Add docstrings to all public functions/classes
- Update relevant documentation in `docs/`
- Include code examples in docstrings
- Keep CHANGELOG.md updated

## Pull Request Process

### Before Submitting

1. **Update your branch** with latest upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all quality checks**:
   ```bash
   make quality
   ```

3. **Ensure tests pass**:
   ```bash
   make test
   ```

4. **Update documentation** as needed

5. **Update CHANGELOG.md** under "Unreleased" section:
   ```markdown
   ## [Unreleased]

   ### Added
   - New feature description (#PR_NUMBER)

   ### Fixed
   - Bug fix description (#PR_NUMBER)
   ```

### Submitting the PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request** on GitHub with:
   - Clear, descriptive title
   - Detailed description of changes
   - Reference to related issues (e.g., "Closes #123")
   - Screenshots/GIFs for UI changes
   - Testing instructions

3. **PR Template** (automatically populated):
   ```markdown
   ## Description
   [Clear description of what this PR does]

   ## Type of Change
   - [ ] Bug fix (non-breaking change which fixes an issue)
   - [ ] New feature (non-breaking change which adds functionality)
   - [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
   - [ ] Documentation update

   ## How Has This Been Tested?
   [Description of testing approach]

   ## Checklist
   - [ ] My code follows the project's coding standards
   - [ ] I have performed a self-review of my code
   - [ ] I have commented my code, particularly in hard-to-understand areas
   - [ ] I have made corresponding changes to the documentation
   - [ ] My changes generate no new warnings
   - [ ] I have added tests that prove my fix is effective or that my feature works
   - [ ] New and existing unit tests pass locally with my changes
   - [ ] Any dependent changes have been merged and published
   - [ ] I have updated the CHANGELOG.md
   ```

### Review Process

1. **Automated checks** will run:
   - GitHub Actions CI/CD
   - Code quality checks
   - Test suite
   - Coverage reports

2. **Code review** by maintainers:
   - At least one approval required
   - Address feedback promptly
   - Push updates to the same branch

3. **Squash and merge** once approved:
   - Maintainers will merge your PR
   - Your commits will be squashed into one
   - Branch will be deleted automatically

## Coding Standards

### Python Style Guide

```python
# Good example - type hints, docstrings, clean structure
from typing import Optional

class UserRepository:
    """Repository for managing user persistence.

    This class handles all database operations related to users,
    following the repository pattern from clean architecture.
    """

    async def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by their email address.

        Args:
            email: User's email address

        Returns:
            User object if found, None otherwise

        Raises:
            ValueError: If email format is invalid
        """
        if not self._is_valid_email(email):
            raise ValueError(f"Invalid email format: {email}")

        return await self._db.query(User).filter_by(email=email).first()
```

### Architecture Boundaries

```python
# ✅ GOOD - Domain entity with no dependencies
from dataclasses import dataclass
from decimal import Decimal

@dataclass
class Payment:
    """Pure domain entity."""
    amount: Decimal
    currency: str

    def validate(self) -> bool:
        """Business logic validation."""
        return self.amount > 0

# ❌ BAD - Domain entity with infrastructure dependency
class Payment:
    def save(self):
        db.session.add(self)  # Don't access infrastructure from domain!
        db.session.commit()
```

### Testing Best Practices

```python
# Good test - clear, focused, follows AAA pattern
def test_create_user_with_valid_email():
    """Test user creation with valid email succeeds."""
    # Arrange
    email = "test@example.com"
    password = "SecurePass123!"

    # Act
    user = User.create(email=email, password=password)

    # Assert
    assert user.email == email
    assert user.password_hash != password  # Password should be hashed
    assert user.created_at is not None
```

## Project Structure

Understanding the codebase structure helps with contributions:

```
nxtg-forge/
├── .claude/              # Claude Code integration
│   ├── commands/         # Slash commands (/status, /feature, etc.)
│   ├── skills/           # Agent and core skills
│   │   ├── agents/       # Specialized agent definitions
│   │   └── core/         # Core system skills
│   └── templates/        # Code generation templates
├── forge/                # Core Python package
│   ├── agents/           # Agent orchestration
│   │   ├── orchestrator.py  # Agent coordination
│   │   └── dispatcher.py    # Task distribution
│   ├── cli.py            # CLI interface
│   ├── state_manager.py  # State management
│   ├── spec_generator.py # Interactive spec builder
│   ├── file_generator.py # Template-based generation
│   ├── mcp_detector.py   # MCP auto-detection
│   └── gap_analyzer.py   # Gap analysis
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/                 # Documentation
│   ├── ARCHITECTURE.md   # Architecture guide
│   ├── API.md            # API reference
│   └── DEPLOYMENT.md     # Deployment guide
└── scripts/              # Utility scripts
```

## Areas for Contribution

We welcome contributions in these areas:

### High Priority
- 🧪 **Test Coverage**: Increase from 29% to 85%
- 📝 **Documentation**: API docs, tutorials, examples
- 🐛 **Bug Fixes**: Check [Issues](https://github.com/nxtg-ai/nxtg-forge/issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- ✨ **Feature Requests**: See [Roadmap](https://github.com/nxtg-ai/nxtg-forge#roadmap)

### Good First Issues
- Look for [`good first issue`](https://github.com/nxtg-ai/nxtg-forge/labels/good%20first%20issue) label
- Documentation improvements
- Adding examples to `examples/`
- Writing unit tests for uncovered code

### Advanced Contributions
- Agent orchestration enhancements (v1.1 roadmap)
- New framework templates
- Performance optimizations
- MCP server integrations

## Getting Help

- 📖 **Documentation**: Start with [README.md](README.md) and [docs/](docs/)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/nxtg-ai/nxtg-forge/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/nxtg-ai/nxtg-forge/issues)
- 📧 **Email**: axw@nxtg.ai

## Recognition

Contributors will be:
- Listed in release notes
- Added to [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Acknowledged in the project README
- Invited to join the core team (for significant contributions)

## License

By contributing to NXTG-Forge, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for contributing to NXTG-Forge!** 🚀

Every contribution, no matter how small, helps make this project better for everyone.

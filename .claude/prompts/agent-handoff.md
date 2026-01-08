# Agent Handoff Prompt Template

## Purpose

This prompt template facilitates smooth handoffs between specialized agents in NXTG-Forge's agent orchestration system.

## When to Use

- Transitioning tasks between agents
- Starting collaboration between agents
- Completing an agent's specialized work
- Ensuring context preservation

## Agent Roles

### Available Agents

**Lead Architect**:

- **Specialization**: System design, architecture decisions, ADRs
- **Triggers**: "design", "architecture", "pattern", "structure"
- **Outputs**: Architecture specs, design documents, ADRs
- **Next Agents**: Usually hands off to Backend Master or Platform Builder

**Backend Master**:

- **Specialization**: API implementation, business logic, database
- **Triggers**: "api", "endpoint", "database", "repository", "use case"
- **Outputs**: Use cases, repositories, API routes
- **Next Agents**: Usually hands off to QA Sentinel or CLI Artisan

**CLI Artisan**:

- **Specialization**: Command-line interfaces, user experience
- **Triggers**: "cli", "command", "terminal", "argparse", "click"
- **Outputs**: CLI commands, help text, input validation
- **Next Agents**: Usually hands off to QA Sentinel

**Platform Builder**:

- **Specialization**: Infrastructure, deployment, CI/CD
- **Triggers**: "deploy", "docker", "kubernetes", "ci/cd", "pipeline"
- **Outputs**: Dockerfiles, CI configs, deployment scripts
- **Next Agents**: Usually hands off to Integration Specialist or QA Sentinel

**Integration Specialist**:

- **Specialization**: External integrations, MCP servers, webhooks
- **Triggers**: "integration", "api client", "mcp", "webhook", "oauth"
- **Outputs**: Integration adapters, MCP configs, webhook handlers
- **Next Agents**: Usually hands off to QA Sentinel

**QA Sentinel**:

- **Specialization**: Testing, quality assurance, code review
- **Triggers**: "test", "quality", "review", "coverage"
- **Outputs**: Test suites, coverage reports, quality analysis
- **Next Agents**: Usually final agent or hands back to originating agent

## Handoff Template

```
# Agent Handoff: [FROM_AGENT] → [TO_AGENT]

## Handoff Context

**From**: [Agent Name]
**To**: [Agent Name]
**Task**: [Brief task description]
**Priority**: [High | Medium | Low]
**Deadline**: [If applicable]

## Completed Work

### What Was Done

**Deliverables**:
- [x] [Deliverable 1]
- [x] [Deliverable 2]
- [x] [Deliverable 3]

**Files Created/Modified**:
```

forge/
  domain/
    entities/
      - user.py (created)
      - authentication.py (created)
  application/
    use_cases/
      - create_user.py (created)
      - authenticate_user.py (created)

```

**Key Decisions Made**:
1. [Decision 1] - [Rationale]
2. [Decision 2] - [Rationale]
3. [Decision 3] - [Rationale]

### Architecture Overview

**Layers Completed**:
- [x] Domain Layer: User entity, Authentication domain service
- [x] Application Layer: CreateUserUseCase, AuthenticateUserUseCase
- [ ] Infrastructure Layer: (handed off to next agent)
- [ ] Interface Layer: (handed off to next agent)

**Design Patterns Used**:
- Repository Pattern for User persistence
- Value Object for Email and Password
- Strategy Pattern for authentication methods

**Dependencies**:
```python
# Required interfaces to implement
class UserRepository(Protocol):
    async def create(self, user: User) -> User: ...
    async def find_by_email(self, email: Email) -> Optional[User]: ...

class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...
    def verify(self, password: str, hashed: str) -> bool: ...
```

## Remaining Work

### What Needs to Be Done

**Next Agent Tasks**:

**Backend Master** should implement:

1. **UserRepository Implementation** (`forge/infrastructure/persistence/user_repository.py`)
   - SQLite implementation of UserRepository interface
   - Database schema creation
   - CRUD operations
   - Transaction handling

2. **API Endpoints** (`forge/interface/api/user_routes.py`)
   - POST /users (create user)
   - POST /auth/login (authenticate)
   - GET /users/{id} (get user)
   - Proper error handling and status codes

3. **Request/Response Schemas** (`forge/interface/schemas/user_schemas.py`)
   - CreateUserRequest
   - LoginRequest
   - UserResponse
   - TokenResponse

**Acceptance Criteria**:

- [ ] All repository methods implemented
- [ ] API endpoints return correct status codes
- [ ] Error responses properly formatted
- [ ] Integration with domain layer verified
- [ ] Database migrations created

### Context for Next Agent

**Important Considerations**:

1. **Email Uniqueness**: Enforce at database level with unique constraint
2. **Password Hashing**: Use bcrypt (already defined in domain layer)
3. **Error Handling**: Map domain exceptions to HTTP status codes:
   - `EmailAlreadyExistsError` → 409 Conflict
   - `InvalidCredentialsError` → 401 Unauthorized
   - `UserNotFoundError` → 404 Not Found

4. **Database Schema**:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
```

**Testing Requirements**:

- Unit tests for repository (with in-memory DB)
- Integration tests for API endpoints
- E2E tests for complete auth flow
- Target coverage: 90%+ for application layer

**Dependencies to Add** (if not present):

```toml
# pyproject.toml
[tool.poetry.dependencies]
bcrypt = "^4.0.0"
python-jose = "^3.3.0"  # For JWT tokens
passlib = "^1.7.4"
```

## State Update

**Update state.json**:

```json
{
  "development": {
    "features": {
      "in_progress": [
        {
          "name": "User Authentication",
          "status": "implementation",
          "current_agent": "backend-master",
          "previous_agent": "lead-architect",
          "layers_complete": ["domain", "application"],
          "layers_remaining": ["infrastructure", "interface"]
        }
      ]
    }
  }
}
```

**Command**:

```bash
forge status update \
  --feature "User Authentication" \
  --status "implementation" \
  --agent "backend-master"
```

## Handoff Checklist

### Pre-Handoff (Sending Agent)

- [ ] All deliverables complete
- [ ] Code compiles/runs without errors
- [ ] Tests pass for completed work
- [ ] Documentation updated
- [ ] Interfaces/contracts clearly defined
- [ ] Design decisions documented
- [ ] State updated

### During Handoff

- [ ] Context document created (this template)
- [ ] Files listed with descriptions
- [ ] Dependencies documented
- [ ] Next steps clearly defined
- [ ] Acceptance criteria specified
- [ ] Known issues/blockers communicated

### Post-Handoff (Receiving Agent)

- [ ] Context understood
- [ ] Questions clarified
- [ ] Files reviewed
- [ ] Dependencies verified
- [ ] Work plan created
- [ ] State acknowledged

## Communication Protocol

### Handoff Message Format

```markdown
@[receiving-agent]

I've completed the [task description]. Here's the handoff:

**Completed**:
- [List key deliverables]

**Next Steps**:
1. [Action 1]
2. [Action 2]
3. [Action 3]

**Context**: See `.claude/handoffs/[from_agent]-to-[to_agent]-[date].md`

**Questions/Blockers**: [Any questions or blockers for receiving agent]

Ready for your review and next phase implementation.

---
[Sending Agent Name]
```

### Acknowledgment Format

```markdown
@[sending-agent]

Handoff acknowledged. I understand I need to:

1. [Confirm action 1]
2. [Confirm action 2]
3. [Confirm action 3]

**Questions**:
- [Question 1 if any]
- [Question 2 if any]

**Timeline**: [Estimated completion time]

Starting work now.

---
[Receiving Agent Name]
```

## Example Handoffs

### Example 1: Lead Architect → Backend Master

```markdown
# Agent Handoff: Lead Architect → Backend Master

## Handoff Context

**From**: Lead Architect
**To**: Backend Master
**Task**: Implement user authentication system
**Priority**: High
**Deadline**: 2026-01-10

## Completed Work

### What Was Done

**Deliverables**:
- [x] Architecture design document
- [x] Domain model (User entity)
- [x] Value objects (Email, Password)
- [x] Use case specifications
- [x] ADR-001: JWT Authentication Strategy

**Files Created**:
```

forge/domain/
  entities/user.py
  value_objects/email.py
  value_objects/password.py
  repositories/user_repository.py (interface)
  services/authentication_service.py

forge/application/
  use_cases/create_user.py
  use_cases/authenticate_user.py
  dtos/user_dtos.py

docs/
  adr/ADR-001-jwt-authentication.md
  architecture/user-authentication.md

```

**Key Decisions**:
1. **JWT for tokens** - Stateless, scalable authentication
2. **bcrypt for password hashing** - Industry standard, secure
3. **Email as unique identifier** - Natural key, prevents duplicates

### Architecture Overview

```

Domain Layer (✅ Complete)
  ↓
Application Layer (✅ Complete)
  ↓
Infrastructure Layer (🔲 Next: Backend Master)
  ↓
Interface Layer (🔲 Next: Backend Master)

```

## Remaining Work

### Backend Master Tasks

1. **Implement UserRepository**
   - File: `forge/infrastructure/persistence/sqlite_user_repository.py`
   - Methods: create, find_by_id, find_by_email, update, delete
   - Database: SQLite with migrations

2. **Implement API Endpoints**
   - File: `forge/interface/api/v1/users.py`
   - Routes: POST /users, POST /auth/login, GET /users/me
   - Authentication: JWT middleware

3. **Implement Password Hasher**
   - File: `forge/infrastructure/security/bcrypt_hasher.py`
   - Methods: hash, verify

**Acceptance Criteria**:
- [ ] Repository passes all interface tests
- [ ] API returns correct status codes
- [ ] JWT tokens generated and validated correctly
- [ ] 90%+ test coverage

**Timeline**: 2 days

Ready for implementation!

---
Lead Architect
```

### Example 2: Backend Master → QA Sentinel

```markdown
# Agent Handoff: Backend Master → QA Sentinel

## Handoff Context

**From**: Backend Master
**To**: QA Sentinel
**Task**: Test user authentication API
**Priority**: High

## Completed Work

### What Was Done

**Deliverables**:
- [x] UserRepository implementation
- [x] API endpoints (/users, /auth/login)
- [x] JWT token generation
- [x] Basic unit tests (current coverage: 65%)

**Files Created/Modified**:
```

forge/infrastructure/
  persistence/sqlite_user_repository.py
  security/bcrypt_hasher.py

forge/interface/
  api/v1/users.py
  api/v1/auth.py
  schemas/user_schemas.py

tests/unit/
  infrastructure/test_user_repository.py
  interface/test_user_api.py (basic tests only)

```

## Remaining Work

### QA Sentinel Tasks

**Testing Needs**:

1. **Increase Unit Test Coverage** (target: 90%+)
   - Edge cases for email validation
   - Password hashing edge cases
   - Repository error handling

2. **Add Integration Tests**
   - Complete user registration flow
   - Authentication with valid/invalid credentials
   - Token refresh workflow

3. **Add E2E Tests**
   - User signup → login → access protected resource
   - Invalid token handling
   - Expired token handling

4. **Security Testing**
   - SQL injection attempts
   - Password strength validation
   - Rate limiting on login endpoint

5. **Performance Testing**
   - API response time < 200ms
   - Repository query optimization
   - Load test login endpoint

**Acceptance Criteria**:
- [ ] Test coverage ≥ 90% for application layer
- [ ] All edge cases covered
- [ ] Security vulnerabilities addressed
- [ ] Performance benchmarks met
- [ ] No flaky tests

**Known Issues to Test**:
- Email validation allows some invalid formats (need stricter regex)
- No rate limiting on login endpoint (potential brute force)
- Password reset flow not implemented yet (future work)

Ready for comprehensive testing!

---
Backend Master
```

### Example 3: QA Sentinel → Platform Builder

```markdown
# Agent Handoff: QA Sentinel → Platform Builder

## Handoff Context

**From**: QA Sentinel
**To**: Platform Builder
**Task**: Deploy user authentication service
**Priority**: Medium

## Completed Work

### What Was Done

**Deliverables**:
- [x] Comprehensive test suite (92% coverage)
- [x] All tests passing (245 tests)
- [x] Security vulnerabilities fixed
- [x] Performance benchmarks met
- [x] Quality report generated

**Quality Metrics**:
```

Test Coverage: 92.3%
Unit Tests: 180 passing
Integration Tests: 50 passing
E2E Tests: 15 passing
Performance: 95th percentile < 150ms
Security: No critical vulnerabilities

```

## Remaining Work

### Platform Builder Tasks

**Deployment Requirements**:

1. **Dockerization**
   - Create `Dockerfile` for API service
   - Create `docker-compose.yml` for local development
   - Include database initialization

2. **CI/CD Pipeline**
   - GitHub Actions workflow
   - Run tests on every PR
   - Deploy to staging on merge to main
   - Deploy to production on tag

3. **Infrastructure**
   - Production database setup
   - Environment variable management
   - Secrets management (JWT secret key)
   - Monitoring and logging

4. **Configuration**
   - Production settings
   - Database migrations in production
   - Health check endpoints

**Acceptance Criteria**:
- [ ] Docker image builds successfully
- [ ] CI pipeline runs tests automatically
- [ ] Automated deployment to staging
- [ ] Production infrastructure documented
- [ ] Monitoring dashboards created

**Environment Variables Needed**:
```bash
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
```

Ready for deployment!

---
QA Sentinel

```

## Handoff Storage

### Creating Handoff Document

```bash
# Create handoff directory if not exists
mkdir -p .claude/handoffs

# Create handoff document
cat > .claude/handoffs/architect-to-backend-2026-01-07.md <<EOF
# Agent Handoff: Lead Architect → Backend Master
...
EOF

# Reference in state.json
forge state update --add-handoff "architect-to-backend-2026-01-07.md"
```

### Retrieving Past Handoffs

```bash
# List all handoffs
ls -l .claude/handoffs/

# View specific handoff
cat .claude/handoffs/architect-to-backend-2026-01-07.md

# Search handoffs
grep -r "User Authentication" .claude/handoffs/
```

## Best Practices

### For Sending Agent

✅ **Do**:

- Complete all promised deliverables
- Document design decisions
- Define clear interfaces
- Specify acceptance criteria
- List dependencies explicitly
- Update state before handoff
- Test completed work

❌ **Don't**:

- Hand off broken code
- Leave implementation decisions undocumented
- Skip interface definitions
- Forget to update state
- Hand off without tests
- Leave cryptic comments

### For Receiving Agent

✅ **Do**:

- Read entire handoff document
- Ask clarifying questions
- Verify interface compatibility
- Review completed work
- Acknowledge receipt
- Estimate timeline
- Update state

❌ **Don't**:

- Start without understanding context
- Ignore design decisions
- Change interfaces without discussion
- Skip reading documentation
- Forget to acknowledge
- Miss dependency requirements

## Troubleshooting

### Common Issues

**Issue: Unclear Requirements**

```markdown
@lead-architect I need clarification on the user authentication handoff:

1. Should password reset be included in this phase or future work?
2. What's the expected token expiration time?
3. Should we support refresh tokens?

Please clarify before I proceed.
```

**Issue: Incompatible Interfaces**

```markdown
@backend-master The UserRepository interface expects async methods, but the
current SQLite implementation uses synchronous calls.

Should I:
A) Make repository truly async with aiosqlite
B) Update interface to synchronous
C) Keep interface async but use sync_to_async wrapper

Please advise on preferred approach.
```

**Issue: Missing Dependencies**

```markdown
@platform-builder The handoff mentioned JWT token support, but I don't see
the required dependencies (python-jose) in pyproject.toml.

Can you confirm if these should be added:
- python-jose[cryptography]
- passlib[bcrypt]

Or if there's an alternative approach planned?
```

## Example Usage

```bash
# Create handoff document from template
cp .claude/prompts/agent-handoff.md .claude/handoffs/my-handoff.md

# Edit with specific details
vim .claude/handoffs/my-handoff.md

# Use with Claude Code
claude --project . --prompt "Complete the work described in .claude/handoffs/my-handoff.md as Backend Master"
```

---

**Template Version**: 1.0.0
**Last Updated**: 2026-01-07
**Maintained By**: NXTG-Forge Team

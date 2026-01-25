# Gap Analysis Command

Analyze project state to identify missing features, incomplete implementations, technical debt, and areas requiring improvement.

## Usage

```bash
/gap-analysis [--scope <area>] [--severity <level>] [--report] [--fix]
```

## Arguments

- `--scope`: Limit analysis to specific area (architecture, testing, documentation, security, performance)
- `--severity`: Filter by severity level (critical, high, medium, low)
- `--report`: Generate detailed report
- `--fix`: Generate action plan to address gaps

## Analysis Dimensions

The gap analysis evaluates:

### 1. Feature Completeness
- Planned vs implemented features
- Partial implementations
- Missing functionality
- Incomplete user stories

### 2. Code Quality
- Test coverage gaps
- Missing error handling
- Code duplication
- Complexity hotspots
- Style violations

### 3. Architecture
- Missing abstractions
- Tight coupling
- Circular dependencies
- Violation of design principles
- Scalability concerns

### 4. Documentation
- Missing README
- Outdated API docs
- Missing inline comments
- No architecture documentation
- Missing deployment guides

### 5. Security
- Known vulnerabilities
- Missing authentication
- Insecure configurations
- Exposed secrets
- Missing input validation

### 6. Performance
- Unoptimized queries
- Missing caching
- Memory leaks
- Slow endpoints
- Large bundle sizes

### 7. Infrastructure
- Missing CI/CD
- No monitoring
- No logging
- Missing backups
- No disaster recovery

### 8. Testing
- Missing unit tests
- No integration tests
- Missing E2E tests
- Low coverage
- Untested edge cases

## Running Gap Analysis

### Complete Analysis

```bash
/gap-analysis
```

Output:
```
Running comprehensive gap analysis...

=== CRITICAL GAPS (3) ===

1. Missing Authentication
   Severity: CRITICAL
   Area: Security
   Description: No authentication system implemented
   Impact: All endpoints are publicly accessible
   Recommendation: Implement JWT-based authentication
   Estimated Effort: 8 hours
   Files Affected:
     - src/auth/ (missing)
     - src/middleware/ (missing)

2. No Test Coverage
   Severity: CRITICAL
   Area: Testing
   Description: Zero unit tests, 0% coverage
   Impact: No validation of business logic
   Recommendation: Implement test suite with pytest
   Estimated Effort: 16 hours
   Files Affected:
     - tests/ (empty)

3. Exposed Database Credentials
   Severity: CRITICAL
   Area: Security
   Description: Database URL hardcoded in source
   Impact: Security vulnerability
   Recommendation: Move to environment variables
   Estimated Effort: 1 hour
   Files Affected:
     - src/config.py:15

=== HIGH PRIORITY GAPS (5) ===

4. Missing Error Handling
   Severity: HIGH
   Area: Code Quality
   Description: API endpoints lack error handling
   Impact: Poor user experience, crashes
   Recommendation: Add try/catch blocks and error responses
   Estimated Effort: 4 hours

5. No API Documentation
   Severity: HIGH
   Area: Documentation
   Description: No OpenAPI/Swagger documentation
   Impact: Developers cannot understand API
   Recommendation: Add FastAPI automatic docs
   Estimated Effort: 2 hours

[... continues ...]

=== SUMMARY ===
Total Gaps: 23
  Critical: 3
  High: 5
  Medium: 10
  Low: 5

Estimated Total Effort: 67 hours
Recommended Priority: Security, Testing, Error Handling
```

### Scoped Analysis

```bash
/gap-analysis --scope testing
```

Output:
```
Testing Gap Analysis

=== COVERAGE GAPS ===
Current Coverage: 12%
Target Coverage: 80%
Gap: 68%

Uncovered Modules:
  - src/auth/models.py: 0% (24 lines)
  - src/auth/routes.py: 0% (45 lines)
  - src/users/service.py: 5% (89 lines)
  - src/payments/processor.py: 0% (156 lines)

=== MISSING TEST TYPES ===
  - Unit tests for business logic
  - Integration tests for API endpoints
  - E2E tests for user flows
  - Performance tests
  - Security tests

=== TEST QUALITY ISSUES ===
  - No test fixtures
  - No mocking setup
  - Tests not isolated
  - No parameterized tests
  - Missing edge case tests

Recommendations:
1. Add pytest fixtures in conftest.py
2. Create unit tests for each module
3. Add integration tests for API
4. Implement E2E test suite
5. Set up coverage reporting in CI

Estimated Effort: 24 hours
```

### Security Analysis

```bash
/gap-analysis --scope security
```

Output:
```
Security Gap Analysis

=== CRITICAL SECURITY GAPS ===

1. No Authentication System
   - All endpoints publicly accessible
   - No user identity verification
   - No access control

   Fix: Implement JWT authentication
   Priority: CRITICAL
   Effort: 8 hours

2. SQL Injection Vulnerability
   - Raw SQL queries in src/database.py:45
   - User input not sanitized

   Fix: Use parameterized queries
   Priority: CRITICAL
   Effort: 2 hours

3. Exposed Secrets
   - API keys in source code
   - Database credentials hardcoded
   - AWS keys in config file

   Fix: Move to environment variables
   Priority: CRITICAL
   Effort: 1 hour

=== HIGH PRIORITY GAPS ===

4. Missing Input Validation
   - No request validation
   - No data sanitization
   - XSS vulnerability

   Fix: Add Pydantic models for validation
   Priority: HIGH
   Effort: 4 hours

5. No Rate Limiting
   - API vulnerable to abuse
   - No DDoS protection

   Fix: Implement rate limiting middleware
   Priority: HIGH
   Effort: 3 hours

=== RECOMMENDATIONS ===
- Run security audit with Bandit
- Implement OWASP Top 10 protections
- Add security headers
- Enable HTTPS only
- Implement CORS properly
- Add request logging
- Set up intrusion detection

Total Security Debt: 18 hours
Risk Level: HIGH
```

## Gap Analysis Report

Generate comprehensive report:

```bash
/gap-analysis --report
```

Creates: `.claude/reports/gap-analysis-20250107.md`

### Report Structure

```markdown
# Gap Analysis Report
Generated: 2025-01-07T12:00:00Z

## Executive Summary
- Total Gaps: 23
- Critical: 3
- High: 5
- Medium: 10
- Low: 5
- Estimated Effort: 67 hours
- Risk Level: HIGH

## Critical Gaps
[Detailed list with impact analysis]

## Recommendations by Priority
[Actionable steps prioritized]

## Technical Debt Assessment
[Quantified technical debt]

## Comparison with Industry Standards
[Benchmarking against best practices]

## Action Plan
[Step-by-step remediation plan]
```

## Automatic Gap Detection

The system automatically detects:

### Missing Files

```
Expected but missing:
  - README.md
  - CONTRIBUTING.md
  - LICENSE
  - .gitignore
  - requirements.txt / package.json
  - tests/conftest.py
  - docs/API.md
```

### Incomplete Features

```
Feature: User Authentication
  Status: INCOMPLETE (40%)

  Completed:
    - User model created
    - Database schema defined

  Missing:
    - Login endpoint
    - Registration endpoint
    - Password reset
    - Email verification
    - Token refresh
    - Logout functionality

  Estimated Remaining: 12 hours
```

### Code Quality Issues

```
Code Quality Gaps:

1. High Complexity Functions:
   - process_payment(): Cyclomatic complexity 15 (target: <10)
   - handle_webhook(): Cyclomatic complexity 12

2. Duplicate Code:
   - auth/login.py and auth/register.py: 85% similar
   - Suggestion: Extract common logic

3. Missing Error Handling:
   - 23 functions lack try/except
   - 15 functions don't validate inputs
```

### Architecture Violations

```
Architecture Gaps:

1. Layer Violations:
   - Domain layer imports Infrastructure: 5 violations
   - Interface layer has business logic: 3 violations

2. Missing Abstractions:
   - No repository interface
   - Direct database calls in routes
   - No service layer

3. Tight Coupling:
   - Payment processor tightly coupled to Stripe
   - No adapter pattern for external services
```

## Gap Prioritization

Gaps are prioritized by:

### Priority Score Formula

```
Score = (Severity × 3) + (Impact × 2) + (Effort × -1) + (Risk × 2)

Where:
  Severity: 1-10 (how bad is the gap?)
  Impact: 1-10 (how many users affected?)
  Effort: 1-10 (hours to fix, normalized)
  Risk: 1-10 (probability of causing issues)
```

### Priority Categories

**CRITICAL** (Score > 25):
- Security vulnerabilities
- Data loss risks
- System instability
- Compliance violations

**HIGH** (Score 15-25):
- Missing core features
- Performance issues
- Major bugs
- Test coverage gaps

**MEDIUM** (Score 8-15):
- Missing nice-to-have features
- Code quality issues
- Documentation gaps
- Minor bugs

**LOW** (Score < 8):
- Code style issues
- Optimization opportunities
- Enhancement requests

## Fix Generation

Generate action plan to address gaps:

```bash
/gap-analysis --fix
```

Output:
```
Gap Remediation Plan

=== PHASE 1: CRITICAL FIXES (Week 1) ===

Day 1-2: Implement Authentication
  - [ ] Create User model
  - [ ] Add JWT token generation
  - [ ] Implement login endpoint
  - [ ] Add authentication middleware
  - [ ] Write tests
  Estimated: 16 hours
  Assigned: backend-master

Day 3: Fix Security Issues
  - [ ] Move secrets to environment variables
  - [ ] Fix SQL injection vulnerabilities
  - [ ] Add input validation
  Estimated: 8 hours
  Assigned: backend-master

Day 4-5: Add Test Coverage
  - [ ] Set up pytest
  - [ ] Write unit tests for auth
  - [ ] Write integration tests
  - [ ] Set up coverage reporting
  Estimated: 16 hours
  Assigned: qa-sentinel

=== PHASE 2: HIGH PRIORITY (Week 2) ===

[... continues ...]

Total Timeline: 4 weeks
Total Effort: 67 hours
Resources Needed: 2 developers
```

## Gap Tracking

Track gap resolution progress:

```json
{
  "gap_id": "gap-001",
  "description": "Missing authentication",
  "severity": "critical",
  "status": "in_progress",
  "assigned_to": "backend-master",
  "created_at": "2025-01-07T10:00:00Z",
  "started_at": "2025-01-07T14:00:00Z",
  "estimated_completion": "2025-01-08T18:00:00Z",
  "progress": 40,
  "blockers": []
}
```

## Integration with Other Commands

```bash
# Analyze gaps before feature planning
/gap-analysis --scope architecture
/feature "Implement missing abstractions"

# Analyze gaps before deployment
/gap-analysis --scope security
/deploy production  # Only if no critical gaps

# Create checkpoint before fixing gaps
/checkpoint pre-gap-fixes
/gap-analysis --fix
```

## Configuration

Customize gap analysis in `.claude/config.json`:

```json
{
  "gap_analysis": {
    "coverage_threshold": 80,
    "complexity_threshold": 10,
    "severity_weights": {
      "critical": 10,
      "high": 7,
      "medium": 4,
      "low": 2
    },
    "auto_analyze": {
      "enabled": true,
      "frequency": "daily",
      "scope": ["security", "testing"]
    },
    "exclude_patterns": [
      "*/migrations/*",
      "*/node_modules/*",
      "*/venv/*"
    ]
  }
}
```

## Best Practices

1. Run gap analysis regularly (weekly)
2. Address critical gaps immediately
3. Plan sprints around gap closure
4. Track gap trends over time
5. Include gap analysis in code reviews
6. Automate gap detection in CI/CD
7. Document architectural decisions to prevent gaps

## See Also

- `/status` - Current project state
- `/feature` - Plan features to close gaps
- `/checkpoint` - Save state before fixes
- `/deploy` - Deployment validation

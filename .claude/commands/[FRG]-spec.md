# Spec Command

Generate comprehensive technical specifications from high-level requirements.

## Usage

```bash
/spec <feature-name> [--format <type>] [--output <file>] [--interactive]
```

## Arguments

- `feature-name`: Name or description of feature
- `--format`: Output format (markdown, yaml, json)
- `--output`: Write to file instead of stdout
- `--interactive`: Interactive specification builder

## What Gets Specified

A complete spec includes:

### 1. Requirements
- Functional requirements
- Non-functional requirements
- User stories
- Acceptance criteria

### 2. Architecture
- System components
- Data models
- API contracts
- Integration points

### 3. Implementation
- File structure
- Key classes/functions
- Algorithm details
- Error handling

### 4. Testing
- Test scenarios
- Edge cases
- Performance targets
- Security requirements

### 5. Documentation
- API documentation
- User guides
- Deployment instructions

## Spec Generation

### Basic Spec

```bash
/spec "User authentication with JWT"
```

Output:
```markdown
# Feature Specification: User Authentication with JWT

## Overview
Implement JWT-based authentication system for user login and authorization.

## Requirements

### Functional
- Users can register with email/password
- Users can log in with credentials
- System issues JWT tokens on successful login
- Tokens expire after 24 hours
- Users can refresh tokens
- Protected endpoints require valid token

### Non-Functional
- Token verification < 10ms
- Support 10,000 concurrent users
- 99.9% uptime
- OWASP compliant

## Architecture

### Components
1. Authentication Service
2. Token Manager
3. User Repository
4. Middleware

### Data Models

User:
- id: UUID
- email: string
- password_hash: string
- created_at: datetime

Token:
- access_token: string
- refresh_token: string
- expires_at: datetime

### API Endpoints

POST /auth/register
  Body: {email, password}
  Returns: {user_id}

POST /auth/login
  Body: {email, password}
  Returns: {access_token, refresh_token}

POST /auth/refresh
  Body: {refresh_token}
  Returns: {access_token}

## Implementation

### File Structure
src/auth/
├── models.py
├── service.py
├── routes.py
├── middleware.py
└── utils.py

### Key Components

AuthService:
- register_user(email, password)
- login_user(email, password)
- verify_token(token)
- refresh_token(refresh_token)

TokenManager:
- create_token(user_id)
- verify_token(token)
- decode_token(token)

### Error Handling
- InvalidCredentials
- TokenExpired
- InvalidToken
- UserAlreadyExists

## Testing

### Unit Tests
- User registration validation
- Password hashing
- Token generation/verification
- Token expiration

### Integration Tests
- Full login flow
- Token refresh flow
- Protected endpoint access

### Security Tests
- SQL injection prevention
- Password strength
- Token tampering detection

## Acceptance Criteria
- [ ] User can register
- [ ] User can log in
- [ ] Token is issued
- [ ] Token expires
- [ ] Token can be refreshed
- [ ] Protected routes require token
- [ ] All tests pass
- [ ] Coverage > 80%

## Estimated Effort: 16 hours
```

### Interactive Spec

```bash
/spec --interactive
```

Prompts for:
- Feature name
- User stories
- Data models
- Endpoints
- Testing requirements

### YAML Spec

```bash
/spec "Payment processing" --format yaml --output payment-spec.yaml
```

## Spec Templates

Pre-built templates for common features:

- Authentication
- CRUD operations
- File upload
- Real-time notifications
- Payment processing
- Search functionality

## Best Practices

1. Write specs before coding
2. Include acceptance criteria
3. Specify error cases
4. Define performance targets
5. Document assumptions
6. Review specs with team
7. Update specs as requirements change

## See Also

- `/feature` - Implement from spec
- `/agent-assign` - Assign implementation
- `/gap-analysis` - Validate completeness

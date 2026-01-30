# Feature Plan: Basic User Login

═══════════════════════════════════════════════════════
FEATURE PLAN: Basic User Login
═══════════════════════════════════════════════════════

## 📋 Feature Summary
   **Purpose:** Implement secure user authentication with JWT-based sessions
   **Impact:** Enables user identification, access control, and personalized experiences
   **Users:** All NXTG-Forge users requiring authenticated API access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🏗️ Architecture Design

### Domain Model
```typescript
User {
  id: string (UUID)
  email: string (unique)
  passwordHash: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date
  loginAttempts: number
  lockedUntil: Date | null
}

Session {
  userId: string
  token: string (JWT)
  refreshToken: string
  expiresAt: Date
  createdAt: Date
}

LoginAttempt {
  email: string
  ipAddress: string
  success: boolean
  timestamp: Date
}
```

### API Contract Design
```typescript
POST /api/auth/login
  Purpose: Authenticate user and return JWT tokens
  Request: {
    email: string
    password: string
  }
  Response: {
    success: boolean
    data?: {
      accessToken: string
      refreshToken: string
      user: {
        id: string
        email: string
      }
    }
    error?: string
  }
  Rate limiting: 5 attempts per minute, lockout after 10 failed attempts

POST /api/auth/refresh
  Purpose: Refresh access token using refresh token
  Request: {
    refreshToken: string
  }
  Response: {
    success: boolean
    data?: {
      accessToken: string
    }
    error?: string
  }

POST /api/auth/logout
  Purpose: Invalidate session tokens
  Request: {
    refreshToken: string
  }
  Response: {
    success: boolean
  }

GET /api/auth/me
  Purpose: Get current authenticated user
  Headers: Authorization: Bearer {token}
  Response: {
    success: boolean
    data?: {
      id: string
      email: string
      createdAt: string
    }
    error?: string
  }
```

### Technology Stack Recommendations
```
External Dependencies:
  • bcrypt
    Purpose: Password hashing with salt
    Alternatives: argon2, scrypt
    Recommendation: bcrypt - mature, battle-tested, good defaults

  • jsonwebtoken
    Purpose: JWT token generation and validation
    Alternatives: jose, node-jsonwebtoken
    Recommendation: jsonwebtoken - industry standard, extensive documentation

  • express-rate-limit
    Purpose: API rate limiting middleware
    Alternatives: rate-limiter-flexible, bottleneck
    Recommendation: express-rate-limit - Express-native, simple configuration

  • sqlite3 + better-sqlite3
    Purpose: Lightweight embedded database for user storage
    Alternatives: PostgreSQL, MySQL, MongoDB
    Recommendation: SQLite - No external dependencies, perfect for 8-hour timeline
```

### Clean Architecture Layers
```
┌─────────────────────────────────────────┐
│  Interface Layer (Express Routes)       │  ← Thin route handlers
├─────────────────────────────────────────┤
│  Application Layer (Auth Service)       │  ← Orchestrates auth flow
├─────────────────────────────────────────┤
│  Domain Layer (User, Session)          │  ← Business rules, validation
├─────────────────────────────────────────┤
│  Infrastructure Layer (DB, JWT)        │  ← SQLite, bcrypt, JWT
└─────────────────────────────────────────┘
```

✓ Architecture design complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📋 Implementation Tasks

### 1. Database Setup & Models
   - Install SQLite dependencies (better-sqlite3)
   - Create database connection service
   - Create user table schema migration
   - Create session table schema migration
   - Create login_attempts table schema migration
   - Implement User repository with CRUD operations
   **Dependencies:** None
   **Duration estimate:** 1.5 hours
   **Complexity:** Low

### 2. Security Infrastructure
   - Install bcrypt, jsonwebtoken
   - Create password hashing service with salt rounds
   - Create JWT token service (sign, verify, decode)
   - Implement refresh token rotation logic
   - Create secure token storage patterns
   **Dependencies:** Task 1 (database ready)
   **Duration estimate:** 1 hour
   **Complexity:** Medium

### 3. Domain Layer Implementation
   - Create User domain entity with validation rules
   - Create Session domain entity
   - Implement password strength validator
   - Implement email format validator
   - Create authentication business rules (lockout logic)
   **Dependencies:** None
   **Duration estimate:** 1 hour
   **Complexity:** Low

### 4. Application Service Layer
   - Create AuthenticationService class
   - Implement login use case with attempt tracking
   - Implement token refresh use case
   - Implement logout use case
   - Add session cleanup logic
   **Dependencies:** Tasks 1, 2, 3
   **Duration estimate:** 1.5 hours
   **Complexity:** Medium

### 5. Rate Limiting & Protection
   - Install express-rate-limit
   - Configure rate limiter for auth endpoints
   - Implement account lockout after failed attempts
   - Add IP-based tracking for attempts
   - Create unlock mechanism after timeout
   **Dependencies:** Task 1 (for storing attempts)
   **Duration estimate:** 0.5 hours
   **Complexity:** Low

### 6. API Routes & Middleware
   - Create /api/auth router module
   - Implement POST /api/auth/login endpoint
   - Implement POST /api/auth/refresh endpoint
   - Implement POST /api/auth/logout endpoint
   - Implement GET /api/auth/me endpoint
   - Create authentication middleware for protected routes
   **Dependencies:** Tasks 4, 5
   **Duration estimate:** 1 hour
   **Complexity:** Low

### 7. Integration & Testing
   - Write unit tests for auth service
   - Write integration tests for auth endpoints
   - Test rate limiting behavior
   - Test JWT expiration and refresh
   - Test account lockout scenarios
   - Manual testing with curl/Postman
   **Dependencies:** Tasks 1-6
   **Duration estimate:** 1.5 hours
   **Complexity:** Medium

### 8. Documentation & Cleanup
   - Create API documentation (OpenAPI/Swagger format)
   - Add code comments and JSDoc
   - Create authentication guide for developers
   - Add example .env configuration
   - Code review and refactoring
   **Dependencies:** Tasks 1-7
   **Duration estimate:** 1 hour
   **Complexity:** Low

**Total Estimate:** 8.5 hours (includes 0.5 hour buffer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ Risks & Mitigations

### Risk: JWT Secret Key Management
  **Probability:** Medium
  **Impact:** High
  **Mitigation:** Use environment variables, provide clear setup instructions, include .env.example with secure defaults

### Risk: Database Migrations in Production
  **Probability:** Low
  **Impact:** Medium
  **Mitigation:** Use migration scripts, version control schema changes, provide rollback procedures

### Risk: Password Reset Flow Missing
  **Probability:** High
  **Impact:** Low (for MVP)
  **Mitigation:** Document as known limitation, provide manual reset procedure, plan for Phase 2

### Risk: Session Hijacking
  **Probability:** Low
  **Impact:** High
  **Mitigation:** Use secure cookies, implement HTTPS only, add session fingerprinting in Phase 2

### Risk: Integration Conflicts with Existing Code
  **Probability:** Low
  **Impact:** Medium
  **Mitigation:** Use dependency injection, minimal changes to existing api-server.ts, separate auth module

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 Implementation Strategy

### Phase 1: Core Foundation (3 hours)
  • Set up SQLite database with tables
  • Implement User domain model and repository
  • Create password hashing service
  • Set up JWT token generation
  **Milestone:** Can create users and generate tokens

### Phase 2: Feature Complete (3.5 hours)
  • Implement AuthenticationService with all use cases
  • Add all API endpoints
  • Integrate rate limiting
  • Add authentication middleware
  **Milestone:** Full login/logout flow working

### Phase 3: Polish & Documentation (1.5 hours)
  • Write comprehensive tests
  • Add API documentation
  • Create developer guide
  • Final testing and bug fixes
  **Milestone:** Production-ready authentication system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📊 Effort Summary
   **Total Tasks:** 8
   **Estimated Duration:** 8.5h (target: 8h, includes 0.5h buffer)
   **Complexity:** Medium
   **Team Size:** 1 developer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## File Structure

```
src/
├── auth/
│   ├── domain/
│   │   ├── user.entity.ts
│   │   ├── session.entity.ts
│   │   └── validators.ts
│   ├── application/
│   │   └── auth.service.ts
│   ├── infrastructure/
│   │   ├── database.ts
│   │   ├── user.repository.ts
│   │   ├── jwt.service.ts
│   │   └── password.service.ts
│   ├── interfaces/
│   │   ├── auth.routes.ts
│   │   └── auth.middleware.ts
│   └── index.ts
├── server/
│   └── api-server.ts (minimal changes to integrate auth)
└── database/
    ├── migrations/
    │   ├── 001_create_users.sql
    │   ├── 002_create_sessions.sql
    │   └── 003_create_login_attempts.sql
    └── forge.db (SQLite database file)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Environment Configuration

Required environment variables (.env):
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=different-secret-for-refresh-tokens
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# Security
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=10
LOCKOUT_DURATION=30m

# Database
DATABASE_PATH=./database/forge.db

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Testing Strategy

### Unit Tests
- Password hashing and verification
- JWT token generation and validation
- User entity validation rules
- Session expiry calculations

### Integration Tests
- Complete login flow
- Token refresh flow
- Rate limiting triggers
- Account lockout and recovery
- Protected route access

### Security Tests
- SQL injection attempts
- Brute force protection
- Token manipulation attempts
- Session fixation prevention

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Success Criteria

✓ Users can register and login with email/password
✓ Passwords are hashed with bcrypt (never stored plain)
✓ JWT tokens expire and can be refreshed
✓ Rate limiting prevents brute force attacks
✓ Account lockout after excessive failed attempts
✓ Clean separation of concerns (domain/application/infrastructure)
✓ Comprehensive test coverage (>80%)
✓ API documentation available
✓ Zero security vulnerabilities in OWASP top 10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Future Enhancements (Phase 2)

- Password reset via email
- Two-factor authentication (2FA)
- OAuth2/SSO integration (Google, GitHub)
- Session management UI
- Audit logging
- CAPTCHA for repeated failures
- Remember me functionality
- Device fingerprinting
- Geolocation-based security

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
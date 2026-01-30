# Authentication Feature Implementation Checklist

## Quick Start Commands

```bash
# Install required dependencies
npm install bcrypt jsonwebtoken express-rate-limit better-sqlite3
npm install --save-dev @types/bcrypt @types/jsonwebtoken

# Create directory structure
mkdir -p src/auth/{domain,application,infrastructure,interfaces}
mkdir -p src/database/migrations
```

## Task Checklist

### ☐ Task 1: Database Setup & Models (1.5 hours)

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

- ☐ Create `src/auth/infrastructure/database.ts`
  ```typescript
  import Database from 'better-sqlite3';
  const db = new Database('./database/forge.db');
  ```

- ☐ Create `src/database/migrations/001_create_users.sql`
  ```sql
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login_at INTEGER,
    login_attempts INTEGER DEFAULT 0,
    locked_until INTEGER
  );
  CREATE INDEX idx_users_email ON users(email);
  ```

- ☐ Create `src/database/migrations/002_create_sessions.sql`
  ```sql
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX idx_sessions_token ON sessions(token_hash);
  ```

- ☐ Create `src/database/migrations/003_create_login_attempts.sql`
  ```sql
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    success INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX idx_attempts_email ON login_attempts(email);
  CREATE INDEX idx_attempts_timestamp ON login_attempts(timestamp);
  ```

- ☐ Create `src/auth/infrastructure/user.repository.ts`
  - findByEmail(email: string)
  - create(user: User)
  - update(id: string, data: Partial<User>)
  - incrementLoginAttempts(email: string)
  - resetLoginAttempts(email: string)
  - lockAccount(email: string, until: Date)

### ☐ Task 2: Security Infrastructure (1 hour)

```bash
npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

- ☐ Create `src/auth/infrastructure/password.service.ts`
  ```typescript
  export class PasswordService {
    async hash(password: string): Promise<string>
    async verify(password: string, hash: string): Promise<boolean>
  }
  ```

- ☐ Create `src/auth/infrastructure/jwt.service.ts`
  ```typescript
  export class JWTService {
    generateAccessToken(userId: string): string
    generateRefreshToken(userId: string): string
    verifyAccessToken(token: string): JWTPayload
    verifyRefreshToken(token: string): JWTPayload
  }
  ```

- ☐ Implement token rotation logic
- ☐ Add token blacklist for logout

### ☐ Task 3: Domain Layer (1 hour)

- ☐ Create `src/auth/domain/user.entity.ts`
  ```typescript
  export class User {
    constructor(
      public id: string,
      public email: string,
      public passwordHash: string,
      // ... other fields
    )
    isLocked(): boolean
    canAttemptLogin(): boolean
  }
  ```

- ☐ Create `src/auth/domain/session.entity.ts`
  ```typescript
  export class Session {
    isExpired(): boolean
    needsRefresh(): boolean
  }
  ```

- ☐ Create `src/auth/domain/validators.ts`
  - validateEmail(email: string): boolean
  - validatePasswordStrength(password: string): ValidationResult
  - Password must be 8+ chars, include upper, lower, number

### ☐ Task 4: Application Service (1.5 hours)

- ☐ Create `src/auth/application/auth.service.ts`
  ```typescript
  export class AuthenticationService {
    async login(email: string, password: string): Promise<LoginResult>
    async refresh(refreshToken: string): Promise<RefreshResult>
    async logout(refreshToken: string): Promise<void>
    async getCurrentUser(accessToken: string): Promise<User>
  }
  ```

- ☐ Implement login with:
  - Email/password validation
  - Account lockout check
  - Login attempt tracking
  - Token generation
  - Session creation

- ☐ Implement refresh with:
  - Token validation
  - Token rotation
  - Session update

- ☐ Implement logout with:
  - Token invalidation
  - Session deletion

### ☐ Task 5: Rate Limiting (0.5 hours)

```bash
npm install express-rate-limit
```

- ☐ Create `src/auth/infrastructure/rate-limiter.ts`
  ```typescript
  export const loginRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 5, // 5 requests per minute
    message: 'Too many login attempts'
  });
  ```

- ☐ Create account lockout middleware
- ☐ Add IP-based tracking

### ☐ Task 6: API Routes & Middleware (1 hour)

- ☐ Create `src/auth/interfaces/auth.routes.ts`
  ```typescript
  router.post('/login', loginRateLimiter, loginHandler);
  router.post('/refresh', refreshHandler);
  router.post('/logout', authenticate, logoutHandler);
  router.get('/me', authenticate, getCurrentUserHandler);
  ```

- ☐ Create `src/auth/interfaces/auth.middleware.ts`
  ```typescript
  export const authenticate = (req, res, next) => {
    // Verify JWT from Authorization header
    // Attach user to request
    // Call next() or return 401
  }
  ```

- ☐ Update `src/server/api-server.ts`
  ```typescript
  import { authRouter } from '../auth/interfaces/auth.routes';
  app.use('/api/auth', authRouter);
  ```

### ☐ Task 7: Testing (1.5 hours)

- ☐ Create `src/auth/__tests__/unit/password.service.test.ts`
  - Test hashing
  - Test verification
  - Test salt uniqueness

- ☐ Create `src/auth/__tests__/unit/jwt.service.test.ts`
  - Test token generation
  - Test token verification
  - Test expiration

- ☐ Create `src/auth/__tests__/integration/auth.routes.test.ts`
  - Test successful login
  - Test failed login
  - Test rate limiting
  - Test account lockout
  - Test token refresh
  - Test logout
  - Test protected routes

- ☐ Manual testing checklist:
  - ☐ Register new user
  - ☐ Login with correct credentials
  - ☐ Login with wrong password
  - ☐ Trigger rate limit (6 requests in 1 minute)
  - ☐ Trigger account lockout (10 failed attempts)
  - ☐ Refresh access token
  - ☐ Access protected route
  - ☐ Logout

### ☐ Task 8: Documentation (1 hour)

- ☐ Create `src/auth/README.md` with:
  - Architecture overview
  - Setup instructions
  - API documentation
  - Security considerations

- ☐ Create `.env.example`
  ```bash
  JWT_SECRET=change-this-in-production
  JWT_REFRESH_SECRET=change-this-too
  JWT_ACCESS_TOKEN_EXPIRY=15m
  JWT_REFRESH_TOKEN_EXPIRY=7d
  BCRYPT_SALT_ROUNDS=10
  MAX_LOGIN_ATTEMPTS=10
  LOCKOUT_DURATION=30m
  DATABASE_PATH=./database/forge.db
  ```

- ☐ Add JSDoc comments to all public methods
- ☐ Create Postman/Insomnia collection for testing

## Code Quality Checklist

- ☐ No sensitive data in logs
- ☐ All passwords hashed before storage
- ☐ SQL injection prevention (parameterized queries)
- ☐ Input validation on all endpoints
- ☐ Error messages don't leak information
- ☐ Consistent error response format
- ☐ TypeScript strict mode enabled
- ☐ No any types
- ☐ Test coverage > 80%

## Security Audit Checklist

- ☐ Passwords never logged or returned in responses
- ☐ JWT secrets are strong (32+ characters)
- ☐ Tokens expire appropriately
- ☐ Rate limiting works correctly
- ☐ Account lockout prevents brute force
- ☐ No SQL injection vulnerabilities
- ☐ HTTPS enforced in production
- ☐ Secure cookie flags set
- ☐ CORS properly configured

## Final Validation

- ☐ All tests pass
- ☐ No console errors
- ☐ Performance acceptable (<100ms response time)
- ☐ Documentation complete
- ☐ Code reviewed
- ☐ Ready for production
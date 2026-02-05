# Test Coverage Reality Check - 2026-02-05

## Executive Summary

**The claim of "611 tests passing" is misleading. Actual code coverage is critically low.**

- **Lines: 41.98%** (target: 85%) - **FAILING BY 43%**
- **Functions: 33.11%** (target: 85%) - **FAILING BY 52%**
- **Branches: 26.44%** (target: 80%) - **FAILING BY 54%**
- **Tests Passing: 611** across 26 test files
- **Tests Skipped: 26**

**Interpretation: We have many tests that exercise some code, but massive critical gaps remain.**

---

## Coverage by System

### Critical Infrastructure (0% coverage)

These are the core systems that make NXTG-Forge work. None have tests.

| System | File | Impact |
|--------|------|--------|
| **Orchestration Engine** | `src/core/orchestrator.ts` | Meta-orchestration system - untested |
| **Runspace/Execution** | `src/core/runspace.ts` | Shell execution isolation - untested |
| **Bootstrap/Init** | `src/core/init-first-run.ts` `src/core/bootstrap.ts` | Application startup - untested |
| **Runspace Manager** | `src/core/runspace-manager.ts` | Runspace lifecycle - untested |
| **PTY Bridge** | `src/server/pty-bridge.ts` | Terminal communication (critical) - untested |
| **Vision Service** | `src/services/vision-service.ts` | Data persistence layer - untested |
| **Command Service** | `src/services/command-service.ts` | Command execution - untested |
| **Activity Service** | `src/services/activity-service.ts` | Activity tracking - untested |
| **Governance State** | `src/services/governance-state-manager.ts` | State management - untested |

### Hook/Integration Layer (0% coverage)

Component state management has zero test coverage.

| Hook | File | Usage |
|------|------|-------|
| `useAgentActivity` | `src/hooks/useAgentActivity.ts` | Agent status tracking - untested |
| `useAutomation` | `src/hooks/useAutomation.ts` | Automation flows - untested |
| `useCommands` | `src/hooks/useCommands.ts` | Command execution - untested |
| `useVision` | `src/hooks/useVision.ts` | Vision management - untested |
| `useForgeIntegration` | `src/hooks/useForgeIntegration.ts` | Forge core integration - untested |
| `useRealtimeConnection` | `src/hooks/useRealtimeConnection.ts` | WebSocket connection - untested |
| `useProjectState` | `src/hooks/useProjectState.ts` | Project state sync - untested |

### Monitoring & Observability (0% coverage)

Error handling and monitoring are completely untested in production code.

| System | File | Risk |
|--------|------|------|
| Alerts | `src/monitoring/alerts.ts` | Error alerts untested - could miss issues |
| Diagnostics | `src/monitoring/diagnostics.ts` | System diagnostics untested |
| Performance | `src/monitoring/performance.ts` | Perf tracking untested |
| Sentry (Node) | `src/monitoring/sentry.ts` | Error reporting to Sentry untested |
| Sentry (Browser) | `src/monitoring/sentry-browser.ts` | Browser error tracking untested |

### UI Components (< 20% coverage)

Most UI has minimal coverage - components render but behavior untested.

| Component | Coverage | Status |
|-----------|----------|--------|
| Onboarding View | 0% | User onboarding flow completely untested |
| Governance HUD | 13.51% | Admin UI mostly untested |
| Feedback Components | 1-17% | User feedback system minimal coverage |
| Terminal UI | 1-60% | Core terminal UI poorly covered |
| App Pages | 3-8% | Page routing minimal coverage |
| Infinity Terminal | 30.39% | Multi-pane terminal weak coverage |

### Session & State Management (< 2% coverage)

Critical for feature working after browser reload.

| System | Coverage | Issue |
|--------|----------|-------|
| Session Persistence | 1.36% | Browser reload state recovery untested |
| Responsive Layout | 1.28% | Mobile/resize handling untested |
| Touch Gestures | 0% | Mobile touch untested |

### Server/API (80-92% coverage)

Well-tested areas.

| System | Coverage | Status |
|--------|----------|--------|
| Agent Protocol | 90% | Good |
| Agent Marketplace | 86.48% | Good |
| Agent Router | 100% | Excellent |
| Worker Pool | 51.85% | Partial |
| Health Monitor | 92.22% | Good |

### Services (50-95% coverage)

Mixed results - some well tested, others barely.

| Service | Coverage | Status |
|---------|----------|--------|
| Approval Queue | 94.79% | Excellent |
| State Bridge | 90.41% | Good |
| Init Service | 83.87% | Good |
| Automation Service | 81.92% | Good |
| Base Service | 63.29% | Partial |
| API Client | 50.41% | Weak |

---

## Why Coverage is Low: Root Causes

### 1. Test Organization Problem

Tests exist but don't cover critical paths:
- Many unit tests mock everything (return fake data)
- Real integration between services untested
- Happy path tests, few error scenarios
- Type safety tests exist but functionality tests don't

### 2. Untested Critical Flows

Users experience these daily but untested:

```
User Launches App
  ↓ (untested: src/core/bootstrap.ts)
App Initializes
  ↓ (untested: src/core/init-first-run.ts)
Loads Vision/State
  ↓ (untested: src/services/vision-service.ts)
Opens Terminal Session
  ↓ (untested: src/server/pty-bridge.ts)
User Types Command
  ↓ (untested: src/services/command-service.ts)
Executes in Runspace
  ↓ (untested: src/core/orchestrator.ts, src/core/runspace.ts)
Results Displayed
```

**Every single step has 0% test coverage.**

### 3. UI Testing Gaps

- Components render in tests but behavior untested
- User interactions (click, type, drag) minimal coverage
- Responsive behavior (resize, mobile) untested
- Multi-pane terminal layout untested
- Session persistence (reload recovery) untested

### 4. Excessive Mocking

Mock implementations exist for services that should be integration tested:
- Vision service calls mocked, not tested
- Command execution mocked, not tested
- State persistence mocked, not tested
- Network errors mocked, actual recovery untested

---

## Branch Coverage Problem (26.44%)

**Branch coverage at 26% means edge cases are untested:**

```typescript
// Typical untested pattern:
if (error.code === 'ENOENT') {
  // tested ✓
  handleNotFound();
} else if (error.code === 'EACCES') {
  // untested ✗
  handlePermissionDenied();
} else {
  // untested ✗
  handleGenericError();
}
```

**Impact:**
- Errors in production don't have recovery logic tested
- Error messages may be wrong
- Fallback behavior unknown

---

## Services That Should Have Tests But Don't

### Tier 1: Critical Path (0% = immediate risk)

1. **PTY Bridge** (`src/server/pty-bridge.ts`)
   - Bridges terminal I/O between frontend and shell
   - No tests for: connection handling, session recovery, scrollback
   - Risk: Terminal broken on reconnect

2. **Orchestrator** (`src/core/orchestrator.ts`)
   - Core execution engine for agent coordination
   - No tests for: task sequencing, parallel execution, error handling
   - Risk: Tasks execute in wrong order or fail silently

3. **Vision Service** (`src/services/vision-service.ts`)
   - Persists user vision and goals
   - No tests for: file I/O, corruption recovery, backup logic
   - Risk: User data lost on error

4. **Runspace** (`src/core/runspace.ts`)
   - Isolates shell execution per project
   - No tests for: environment variables, process cleanup, resource limits
   - Risk: Processes hang or interfere with each other

### Tier 2: User-Facing (< 5% = major UX issues)

1. **Session Persistence** (`useSessionPersistence.ts` - 1.36%)
   - User reopens browser: session should restore
   - No tests for: reconnection, state sync, timeout handling
   - Risk: Closing browser loses all work

2. **Terminal UI** (`InfinityTerminal.tsx` - 60.44%)
   - Multi-pane terminal layout
   - No tests for: resize behavior, pane switching, scrolling
   - Risk: Layout breaks on window resize

3. **Onboarding** (`MCPSelectionView.tsx` - 0%)
   - First-time user experience
   - No tests for: form validation, MCP selection, error cases
   - Risk: Users can't set up projects

---

## Test Quality Issues

### 1. Tests Pass But Don't Actually Test

```typescript
// Example from error-handling.test.ts
it('should retry on temporary file system errors', () => {
  const error = { code: 'EACCES' };
  // Test passes, but doesn't verify retry logic actually worked
  expect(stateManager.getState()).toBeDefined();
});
```

Many tests check that code doesn't crash rather than verifying correct behavior.

### 2. Mock-Heavy Testing

Too many mocks mean real integration untested:

```typescript
// Current approach - everything mocked
vi.mock('../services/vision-service');
vi.mock('../services/command-service');
vi.mock('../core/orchestrator');

// What's actually tested? Almost nothing real.
```

### 3. No Failure Scenarios

Tests check: "Does it work when everything is fine?"
Missing: "Does it work when services crash, network is down, disk is full?"

### 4. UI Tests Don't Test Interaction

```typescript
// Renders ✓, but does it work?
it('should render engagement selector', () => {
  render(<EngagementModeSelector />);
  expect(screen.getByTestId('engagement-selector')).toBeInTheDocument();
  // Missing: click handler tests, state changes, validation
});
```

---

## Coverage by Risk Level

### High Risk (0% coverage, heavily used)

- **Terminal Session Recovery**: Users expect sessions to survive browser close
- **Command Execution**: Core feature used constantly
- **State Persistence**: User work must be saved
- **Error Recovery**: Services crash - need graceful fallback
- **Multi-Agent Coordination**: Agents must coordinate without deadlock

### Medium Risk (< 20% coverage)

- **UI Responsiveness**: Layout adapts to window size
- **Form Validation**: User input validated before execution
- **Real-time Updates**: State syncs between clients
- **Mobile Experience**: Works on phone/tablet

### Lower Risk (> 85% coverage)

- **Type System**: Zod schemas validate data (96.66%)
- **Agent Protocol**: Agent communication (90%)
- **Worker Pool**: Task execution (51.85% - needs work)

---

## What The Numbers Actually Mean

| Metric | Our Value | Industry Target | Gap |
|--------|-----------|-----------------|-----|
| Line Coverage | 41.98% | 85% | -43% |
| Function Coverage | 33.11% | 85% | -52% |
| Branch Coverage | 26.44% | 80% | -54% |
| Tests Passing | 611 | N/A | N/A |

**Translation:**
- 33% of functions are never called by tests
- 74% of code branches are never tested (if/else/try/catch/else)
- More than half the codebase doesn't have a test exercising it

---

## Action Plan

### Immediate (This Week)

1. **Add tests for PTY bridge** (0% → 80%)
   - Connection lifecycle
   - Data I/O
   - Disconnection recovery
   - `src/server/__tests__/pty-bridge.test.ts`

2. **Add tests for Vision service** (0% → 80%)
   - File read/write
   - Corruption detection
   - Backup recovery
   - `src/services/__tests__/vision-service.test.ts`

3. **Add tests for Orchestrator** (0% → 60%)
   - Task sequencing
   - Parallel execution
   - Error propagation
   - `src/core/__tests__/orchestrator.test.ts`

### Week 2

4. **Session persistence tests** (1.36% → 80%)
   - Reconnection logic
   - State sync
   - Timeout handling

5. **Terminal UI interaction tests** (60% → 85%)
   - Resize handling
   - Pane switching
   - Keyboard shortcuts

6. **Hooks integration tests** (0% → 70%)
   - `useVision` hook
   - `useAutomation` hook
   - `useCommands` hook

### Week 3

7. **Onboarding flow E2E** (0% → 75%)
   - Form submission
   - Validation errors
   - MCP selection

8. **Service error scenarios**
   - Network failures
   - Disk full
   - Process crashes

### Coverage Target

- **Week 1 Target:** 55% line coverage (+13%)
- **Week 2 Target:** 70% line coverage (+28%)
- **Week 3 Target:** 85% line coverage (GOAL)

---

## Testing Strategies for Each System

### For PTY Bridge

```typescript
// Use real PTY, not mocked
it('should handle command execution with I/O', async () => {
  const pty = await createTestPTY();
  const output = await pty.execute('echo "hello"');
  expect(output).toContain('hello');
  await pty.cleanup();
});

// Test disconnection recovery
it('should reconnect after network failure', async () => {
  const bridge = new PTYBridge(wss);
  const session = bridge.createSession('runspace-1');

  // Simulate network failure
  session.ws.close();

  // Reconnect same session
  const reconnected = bridge.getSession('runspace-1');
  expect(reconnected).toBeDefined();
});
```

### For Vision Service

```typescript
// Test real file I/O
it('should persist vision to disk', async () => {
  const service = new VisionService(testDir);
  await service.saveVision(testVision);

  const loaded = await service.loadVision();
  expect(loaded).toEqual(testVision);
});

// Test corruption recovery
it('should recover from corrupted vision file', async () => {
  const corruptFile = path.join(testDir, 'vision.yaml');
  await fs.writeFile(corruptFile, 'invalid: yaml: [');

  const service = new VisionService(testDir);
  const vision = await service.loadVision();

  expect(vision).toEqual(defaultVision);
});
```

### For Terminal UI

```typescript
// Test responsive behavior
it('should handle window resize', async () => {
  render(<InfinityTerminal />);

  // Initial size
  expect(screen.getByTestId('terminal')).toHaveStyle('width: 100%');

  // Simulate resize
  global.innerWidth = 1024;
  fireEvent(window, new Event('resize'));

  // Should adapt layout
  expect(screen.getByTestId('main-pane')).toHaveStyle('width: 66%');
});
```

---

## Recommendations

### 1. Focus on Integration Tests

Stop mocking and test real interactions:
- Real database (or in-memory SQLite for tests)
- Real file I/O (with temp directories)
- Real WebSocket connections (use ws library)
- Real shell execution (with timeout)

### 2. Test Failure Scenarios

For every service, add tests for:
- Network timeout
- Invalid input
- File not found
- Disk full
- Process crash
- Database locked

### 3. Session Persistence Testing

This is critical for user experience:
```typescript
it('should recover session after browser close', async () => {
  // User closes browser
  const sessionId = getActiveSessionId();

  // Browser restarts, new instance
  const recovered = await restoreSession(sessionId);

  expect(recovered.state).toEqual(previousState);
  expect(recovered.history).toEqual(previousHistory);
});
```

### 4. Use Real vs Mock Decision Tree

```
Does the service...
├─ Interact with filesystem? → USE REAL (with temp dir)
├─ Interact with network? → MOCK ONLY FAILURES
├─ Spawn processes? → USE REAL (with timeout)
├─ Use database? → USE IN-MEMORY DB OR REAL
└─ Pure logic? → UNIT TEST WITH MOCKS (OK)
```

### 5. Branch Coverage Requirements

Every if/else/try/catch must have at least one test in each branch:

```typescript
if (error.code === 'ENOENT') {
  // Test this branch
  expect(handleNotFound).toHaveBeenCalled();
} else if (error.code === 'EACCES') {
  // Test this branch
  expect(handlePermissionDenied).toHaveBeenCalled();
} else {
  // Test this branch
  expect(handleGenericError).toHaveBeenCalled();
}
```

---

## Summary

**The claim of "611 tests passing" masks a harsh reality: 58% of code untested, 74% of branches untested.**

The tests that exist are mostly shallow unit tests with heavy mocking. Critical paths like:
- Terminal session recovery
- Command execution
- Vision persistence
- Agent orchestration
- Error handling

Are completely untested.

**This creates hidden bugs and technical debt.** Users experience issues (terminal breaks on reload, commands hang) that tests didn't catch.

**Priority:** Add integration tests for the critical path first, then expand to UI and edge cases.

---

*Report generated: 2026-02-05*
*Test framework: Vitest*
*Target coverage: 85% lines, 80% branches*

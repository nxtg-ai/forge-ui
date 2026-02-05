# Test Generation Roadmap

## Priority 1: Critical Infrastructure (Week 1)

These tests must be created immediately as they block other testing efforts.

### 1.1 PTY Bridge Tests
**File:** `src/server/__tests__/pty-bridge.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 4 hours

Critical tests needed:
- Session creation and lifecycle
- Command execution and I/O
- Disconnection and reconnection
- Scrollback buffer management
- Resource cleanup on exit

```typescript
// Test structure
describe('PTY Bridge', () => {
  describe('Session Management', () => {
    it('should create terminal session')
    it('should handle client connection')
    it('should reconnect to existing session')
    it('should timeout inactive sessions')
    it('should clean up on exit')
  })

  describe('I/O Operations', () => {
    it('should send command to shell')
    it('should receive output from shell')
    it('should handle large output')
    it('should preserve output order')
  })

  describe('Disconnection', () => {
    it('should keep PTY alive after WebSocket close')
    it('should reconnect same session')
    it('should restore scrollback on reconnect')
    it('should timeout after 5 minutes')
  })

  describe('Error Handling', () => {
    it('should handle shell crash')
    it('should handle invalid runspace ID')
    it('should handle PTY creation failure')
  })
})
```

### 1.2 Vision Service Tests
**File:** `src/services/__tests__/vision-service.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 3 hours

Critical tests needed:
- Load/save vision to disk
- Corruption detection and recovery
- YAML parsing and validation
- Vision history tracking
- Event emission

```typescript
describe('Vision Service', () => {
  describe('File Operations', () => {
    it('should save vision to disk')
    it('should load vision from disk')
    it('should create default vision if missing')
    it('should preserve vision on update')
  })

  describe('Corruption Recovery', () => {
    it('should detect corrupted vision file')
    it('should fall back to backup')
    it('should create new vision if both fail')
    it('should log corruption events')
  })

  describe('Vision Updates', () => {
    it('should update vision data')
    it('should emit update events')
    it('should maintain update history')
    it('should validate before saving')
  })

  describe('Goal Management', () => {
    it('should add goal to vision')
    it('should mark goal complete')
    it('should track goal metrics')
  })
})
```

### 1.3 Orchestrator Tests
**File:** `src/core/__tests__/orchestrator.test.ts`
**Current Coverage:** 0%
**Target:** 60% (complex system, phased approach)
**Effort:** 5 hours

Critical tests needed:
- Sequential task execution
- Parallel task execution
- Hierarchical execution
- Error propagation
- Task dependency resolution

```typescript
describe('Meta Orchestrator', () => {
  describe('Task Execution', () => {
    it('should execute sequential tasks')
    it('should execute parallel tasks')
    it('should respect task dependencies')
    it('should propagate errors up')
  })

  describe('Execution Patterns', () => {
    it('should use SEQUENTIAL pattern')
    it('should use PARALLEL pattern')
    it('should use ITERATIVE pattern')
    it('should use HIERARCHICAL pattern')
  })

  describe('Error Handling', () => {
    it('should handle task timeout')
    it('should handle task failure')
    it('should rollback on error')
    it('should report failure details')
  })

  describe('Metrics', () => {
    it('should track execution duration')
    it('should track agent performance')
    it('should report success/failure')
  })
})
```

---

## Priority 2: Hook & Integration Layer (Week 2)

These hooks are used by every component. Testing them enables component tests.

### 2.1 useVision Hook Tests
**File:** `src/hooks/__tests__/useVision.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 2 hours

```typescript
describe('useVision', () => {
  it('should load vision on mount')
  it('should update vision data')
  it('should handle vision service errors')
  it('should sync vision across tabs')
  it('should emit vision change events')
})
```

### 2.2 useCommands Hook Tests
**File:** `src/hooks/__tests__/useCommands.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 2 hours

```typescript
describe('useCommands', () => {
  it('should execute command')
  it('should track command history')
  it('should handle command timeout')
  it('should validate command before execution')
  it('should emit completion events')
})
```

### 2.3 useAutomation Hook Tests
**File:** `src/hooks/__tests__/useAutomation.test.ts`
**Current Coverage:** 0%
**Target:** 80%
**Effort:** 2 hours

```typescript
describe('useAutomation', () => {
  it('should start automation workflow')
  it('should pause automation')
  it('should handle automation errors')
  it('should track automation progress')
})
```

### 2.4 useAgentActivity Hook Tests
**File:** `src/hooks/__tests__/useAgentActivity.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 1.5 hours

```typescript
describe('useAgentActivity', () => {
  it('should subscribe to agent activity')
  it('should update on agent state change')
  it('should handle agent disconnect')
  it('should aggregate multiple agents')
})
```

---

## Priority 3: Session & State Management (Week 2)

These features are critical for user experience.

### 3.1 Session Persistence Tests
**File:** `src/components/infinity-terminal/__tests__/useSessionPersistence.test.ts`
**Current Coverage:** 1.36%
**Target:** 85%
**Effort:** 3 hours

Tests needed:
- Session save to localStorage
- Session restore on mount
- Handle corrupted session data
- Timeout and cleanup
- Multi-tab synchronization

```typescript
describe('useSessionPersistence', () => {
  describe('Session Save', () => {
    it('should save session to localStorage')
    it('should include state in session')
    it('should include history in session')
    it('should update on state change')
  })

  describe('Session Restore', () => {
    it('should restore session on mount')
    it('should restore terminal output')
    it('should restore cursor position')
    it('should restore scrollback')
  })

  describe('Error Recovery', () => {
    it('should handle corrupted session data')
    it('should fall back to fresh session')
    it('should log corruption')
  })

  describe('Multi-Tab Sync', () => {
    it('should sync session across tabs')
    it('should handle tab conflict')
    it('should use latest state')
  })
})
```

### 3.2 Responsive Layout Tests
**File:** `src/components/infinity-terminal/__tests__/useResponsiveLayout.test.ts`
**Current Coverage:** 1.28%
**Target:** 85%
**Effort:** 2 hours

```typescript
describe('useResponsiveLayout', () => {
  it('should calculate layout on mount')
  it('should recalculate on window resize')
  it('should adapt to mobile width')
  it('should maintain aspect ratio')
  it('should emit layout change events')
})
```

---

## Priority 4: User Interface (Week 3)

These make up most untested code.

### 4.1 Terminal UI Integration Tests
**File:** `src/components/infinity-terminal/__tests__/InfinityTerminal.integration.test.tsx`
**Current Coverage:** 60.44%
**Target:** 85%
**Effort:** 4 hours

```typescript
describe('InfinityTerminal Integration', () => {
  describe('User Interaction', () => {
    it('should accept keyboard input')
    it('should display command output')
    it('should handle multi-line input')
    it('should support copy/paste')
  })

  describe('Multi-Pane Layout', () => {
    it('should display all panes')
    it('should switch between panes')
    it('should resize panes')
    it('should persist pane layout')
  })

  describe('Session Management', () => {
    it('should persist session on close')
    it('should restore session on reopen')
    it('should handle multiple sessions')
  })
})
```

### 4.2 Onboarding Flow Tests
**File:** `src/components/onboarding/__tests__/MCPSelectionView.test.tsx`
**Current Coverage:** 0%
**Target:** 80%
**Effort:** 3 hours

```typescript
describe('MCP Selection View', () => {
  it('should render MCP options')
  it('should validate selection before submit')
  it('should handle form submission')
  it('should show validation errors')
  it('should track selected MCPs')
})
```

### 4.3 Governance UI Tests
**File:** `src/components/governance/__tests__/GovernanceHUD.test.tsx`
**Current Coverage:** 13.51%
**Target:** 85%
**Effort:** 3 hours

```typescript
describe('GovernanceHUD', () => {
  it('should display governance status')
  it('should show constitution')
  it('should display impact metrics')
  it('should update on state change')
})
```

### 4.4 Feedback Component Tests
**File:** `src/components/feedback/__tests__/BetaFeedback.test.tsx`
**Current Coverage:** 1.28%
**Target:** 85%
**Effort:** 2 hours

```typescript
describe('Beta Feedback', () => {
  it('should capture user feedback')
  it('should validate feedback form')
  it('should submit feedback')
  it('should show success message')
})
```

---

## Priority 5: Services & Utilities (Week 3+)

### 5.1 Command Service Tests
**File:** `src/services/__tests__/command-service.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 3 hours

```typescript
describe('Command Service', () => {
  it('should parse command')
  it('should validate command')
  it('should execute command')
  it('should handle command timeout')
  it('should return command result')
})
```

### 5.2 Activity Service Tests
**File:** `src/services/__tests__/activity-service.test.ts`
**Current Coverage:** 0%
**Target:** 80%
**Effort:** 2 hours

```typescript
describe('Activity Service', () => {
  it('should log activity')
  it('should retrieve activity history')
  it('should filter activities')
  it('should aggregate metrics')
})
```

### 5.3 Monitoring & Alerts Tests
**File:** `src/monitoring/__tests__/alerts.test.ts`
**Current Coverage:** 0%
**Target:** 85%
**Effort:** 2 hours

```typescript
describe('Alerts', () => {
  it('should send alert on error')
  it('should deduplicate alerts')
  it('should respect alert throttling')
  it('should include error context')
})
```

### 5.4 Performance Monitoring Tests
**File:** `src/monitoring/__tests__/performance.test.ts`
**Current Coverage:** 0%
**Target:** 80%
**Effort:** 2 hours

```typescript
describe('Performance Monitor', () => {
  it('should measure operation duration')
  it('should track slow operations')
  it('should report metrics')
  it('should detect memory leaks')
})
```

---

## Testing Infrastructure Requirements

### Test Utilities Needed

Create `src/test/utils/` for shared test helpers:

```typescript
// src/test/utils/test-factories.ts
export function createTestVision(): VisionData
export function createTestTask(): Task
export function createTestAgent(): Agent

// src/test/utils/test-hooks.ts
export function renderWithProviders(component)
export function createTestQueryClient()

// src/test/utils/test-servers.ts
export function createTestPTY()
export function createTestTempDir()
export function withTempDir(testFn)
```

### Mock Reduction Strategy

Instead of mocking services, use real implementations:

| Current | Change To |
|---------|-----------|
| Mock file I/O | Use temp directory with real fs |
| Mock network | Use fake timers or msw |
| Mock database | Use in-memory SQLite |
| Mock PTY | Create real PTY with timeout |

---

## Coverage Target Timeline

| Week | Target | Focus |
|------|--------|-------|
| Week 1 | 55% | PTY, Vision, Orchestrator |
| Week 2 | 70% | Hooks, Session persistence |
| Week 3 | 85% | UI, Services, Monitoring |

### Success Criteria

- [ ] All critical infrastructure at 80%+ coverage
- [ ] All hooks at 80%+ coverage
- [ ] Session persistence at 85%+ coverage
- [ ] Terminal UI at 85%+ coverage
- [ ] Branch coverage above 80%
- [ ] All critical error paths tested

---

## Test Execution Plan

### Week 1: Critical Infrastructure

```bash
# Day 1-2: PTY Bridge
npx vitest run src/server/__tests__/pty-bridge.test.ts

# Day 2-3: Vision Service
npx vitest run src/services/__tests__/vision-service.test.ts

# Day 3-4: Orchestrator
npx vitest run src/core/__tests__/orchestrator.test.ts

# Check progress
npx vitest run --coverage
```

### Week 2: Hooks & Integration

```bash
# Day 1: Hooks
npx vitest run src/hooks/__tests__/useVision.test.ts
npx vitest run src/hooks/__tests__/useCommands.test.ts
npx vitest run src/hooks/__tests__/useAutomation.test.ts
npx vitest run src/hooks/__tests__/useAgentActivity.test.ts

# Day 2-3: Session persistence
npx vitest run src/components/infinity-terminal/__tests__/useSessionPersistence.test.ts

# Check progress
npx vitest run --coverage
```

### Week 3: UI & Services

```bash
# Day 1: Terminal UI
npx vitest run src/components/infinity-terminal/__tests__/InfinityTerminal.integration.test.tsx

# Day 2: Services
npx vitest run src/services/__tests__/command-service.test.ts
npx vitest run src/services/__tests__/activity-service.test.ts

# Day 3: Monitoring
npx vitest run src/monitoring/__tests__/

# Final check
npx vitest run --coverage
```

---

## Getting Started

### Step 1: Create Test File Structure
```bash
mkdir -p src/server/__tests__
mkdir -p src/services/__tests__/
mkdir -p src/hooks/__tests__/
mkdir -p src/monitoring/__tests__/
mkdir -p src/test/utils
```

### Step 2: Create Test Utilities
Start with `src/test/utils/test-factories.ts` and `test-hooks.ts`

### Step 3: Begin with PTY Bridge
Most critical path for terminal functionality

### Step 4: Run Coverage Frequently
```bash
npx vitest run --coverage
```

### Step 5: Report Progress
Update this file weekly with new metrics

---

## Exit Criteria

- [ ] All critical infrastructure: 80%+
- [ ] All hooks: 85%+
- [ ] All user-facing UI: 85%+
- [ ] Branch coverage: 80%+
- [ ] No critical gaps remain
- [ ] Test suite runs in < 30 seconds
- [ ] All tests pass on CI

---

*Last updated: 2026-02-05*
*Owner: Forge Testing Agent*
*Status: Ready to execute*

# NXTG-Forge v3.0 Architecture

## Overview

NXTG-Forge is a production-ready, enterprise-grade development orchestration system built on a sophisticated multi-agent architecture. This document describes the v3.0 architecture that combines battle-tested v2.0 production capabilities with modern TypeScript implementation and clean developer experience.

## Architecture Philosophy

1. **Multi-Agent Orchestration**: Specialized agents working in coordinated harmony
2. **Clean Separation**: Clear boundaries between orchestration, execution, and state management
3. **Event-Driven**: Hook-based automation for lifecycle management
4. **Extensible**: Plugin-based skills and modular agent system
5. **Production-Ready**: Checkpoint recovery, analytics, and comprehensive error handling

## Core Components

### 1. Orchestration Layer (`src/forge.ts`)

The main engine that coordinates all operations:
- Initializes projects
- Manages features
- Executes tasks
- Coordinates agents

```typescript
class Forge {
  init(): Initialize forge in project
  addFeature(): Add and implement new feature
  executeTask(): Execute specific task
  getStatus(): Get current state
}
```

### 2. State Management (`src/state.ts`)

Persistent state tracking:
- Feature tracking
- Task management
- Progress monitoring
- Session history

```typescript
class StateManager {
  loadState(): Load from disk
  saveState(): Persist to disk
  addFeature(): Track new feature
  updateTaskStatus(): Update progress
}
```

### 3. Type System (`src/types.ts`)

Strong TypeScript definitions:
- `ForgeState`: Overall system state
- `Feature`: Feature definition
- `Task`: Individual task
- `Agent`: AI agent interface

### 4. Claude Integration (`.claude/`)

Deep integration with Claude Desktop:

```
.claude/
├── agents/       # AI orchestration agents
├── commands/     # Slash command handlers
├── hooks/        # Event hooks
└── skills/       # Reusable capabilities
```

## Data Flow

```
User Input (/command)
    ↓
Command Parser (.claude/commands/)
    ↓
Forge Orchestrator (src/forge.ts)
    ↓
Agent Execution (.claude/agents/)
    ↓
State Update (src/state.ts)
    ↓
Response to User
```

## Agent Architecture

NXTG-Forge v3.0 features 11 specialized agents organized into two tiers:

### Production-Grade Agents ([AFRG]- Prefix)

#### [AFRG]-orchestrator
- **Role**: Master workflow coordinator
- **Responsibilities**:
  - Multi-agent task delegation and coordination
  - Strategic planning and execution oversight
  - Complex feature orchestration
  - Agent handoff protocol management
- **When to Use**: Complex features requiring multiple agents

#### [AFRG]-planner
- **Role**: Strategic feature planner
- **Responsibilities**:
  - Feature decomposition into executable tasks
  - Resource allocation and timeline planning
  - Dependency management and ordering
  - Risk assessment and mitigation planning
- **When to Use**: Large features needing strategic breakdown

#### [AFRG]-builder
- **Role**: Implementation powerhouse
- **Responsibilities**:
  - Code generation and feature development
  - Architecture pattern implementation
  - Best practices enforcement
  - Template-based code generation
- **When to Use**: Feature implementation and code generation

#### [AFRG]-detective
- **Role**: Problem-solving expert
- **Responsibilities**:
  - Bug investigation and root cause analysis
  - Performance profiling and bottleneck detection
  - Security vulnerability detection
  - System behavior analysis
- **When to Use**: Debugging, performance issues, investigations

#### [AFRG]-guardian
- **Role**: Quality and security sentinel
- **Responsibilities**:
  - Comprehensive code review
  - Security audit and vulnerability scanning
  - Standards enforcement and compliance
  - Quality gate validation
- **When to Use**: Code review, security audits, quality checks

#### [AFRG]-release-sentinel
- **Role**: Documentation and release manager
- **Responsibilities**:
  - Changelog generation from commits
  - Release notes preparation
  - Documentation synchronization
  - Version management
- **When to Use**: Releases, documentation updates

### Standard Development Agents

#### orchestrator
- **Role**: Project coordination
- **Responsibilities**: Task coordination, workflow management
- **When to Use**: General project coordination

#### architect
- **Role**: System design
- **Responsibilities**: Architecture decisions, design patterns, tech stack selection
- **When to Use**: Architectural planning and design

#### developer
- **Role**: Code implementation
- **Responsibilities**: Feature implementation, refactoring, optimization
- **When to Use**: Standard development tasks

#### qa
- **Role**: Quality assurance
- **Responsibilities**: Test design, code review, quality validation
- **When to Use**: Testing and quality assurance

#### devops
- **Role**: Operations
- **Responsibilities**: CI/CD, deployment, infrastructure, monitoring
- **When to Use**: Deployment and infrastructure tasks

## State Schema

```json
{
  "version": "3.0.0",
  "initialized": "2024-01-24T10:00:00Z",
  "features": [
    {
      "id": "unique-id",
      "name": "Feature Name",
      "status": "in_progress",
      "tasks": [...]
    }
  ],
  "status": "ready"
}
```

## Extension Points

### Adding Commands

Create new file in `.claude/commands/`:
```markdown
---
name: mycommand
description: Command description
---

# Command implementation
```

### Adding Agents

Create new file in `.claude/agents/`:
```markdown
# Agent Name

## Role
Define agent purpose

## Responsibilities
- List responsibilities

## Process
1. Step-by-step process
```

### Custom Hooks

Add hooks in `.claude/hooks/` for:
- Pre/post task execution
- State changes
- Error handling

## Security Considerations

- State files are local only
- No external API calls by default
- Git-ignored sensitive files
- Sanitized user input

## Performance

- Minimal file I/O
- Lazy state loading
- Efficient TypeScript compilation
- < 100ms command response time

## Future Enhancements

- Plugin system for extensions
- Remote state synchronization
- Multi-agent parallelization
- Advanced error recovery

---

For implementation details, see the source code in `src/`.
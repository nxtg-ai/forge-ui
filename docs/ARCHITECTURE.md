# NXTG-Forge Architecture

> Complete system architecture documentation

## Overview

NXTG-Forge is a self-deploying AI development infrastructure platform that enables rapid project setup, development, and deployment with Claude Code integration.

### Key Principles

1. **Zero-Context Continuation** - Resume work from any point without context loss
2. **Template-Driven Generation** - Consistent, high-quality code generation
3. **State-First Design** - All project state tracked and recoverable
4. **Agent Orchestration** - Specialized AI agents for different development tasks
5. **MCP Integration** - Automatic detection and configuration of needed services

## System Components

### 1. Core Python Modules

```
forge/
├── cli.py              # Command-line interface
├── state_manager.py    # State tracking and checkpoints
├── spec_generator.py   # Interactive spec builder
├── file_generator.py   # Template-based file generation
├── mcp_detector.py     # MCP server auto-detection
├── gap_analyzer.py     # Project analysis and recommendations
└── agents/             # Agent orchestration system
    ├── orchestrator.py
    └── dispatcher.py
```

#### State Manager

- **Purpose**: Track project state, create checkpoints, enable recovery
- **Key Features**:
  - JSON-based state storage
  - Git-integrated checkpoints
  - Zero-context recovery
  - Feature lifecycle tracking

#### Spec Generator

- **Purpose**: Interactive project specification creation
- **Key Features**:
  - Q&A-based spec building
  - Template variable extraction
  - Validation and approval workflow

#### File Generator

- **Purpose**: Generate code from templates and specs
- **Key Features**:
  - Jinja2 template engine
  - Multi-framework support
  - Clean architecture patterns
  - Automated directory structure

#### MCP Detector

- **Purpose**: Auto-detect and configure MCP servers
- **Key Features**:
  - Spec-based detection
  - Dependency analysis
  - Git remote detection
  - Automatic configuration

#### Gap Analyzer

- **Purpose**: Identify project improvement opportunities
- **Key Features**:
  - Test coverage analysis
  - Documentation completeness
  - Security scanning
  - Code quality metrics

### 2. Template System

```
.claude/templates/
├── backend/
│   ├── fastapi/         # FastAPI templates
│   ├── django/          # Django templates
│   └── express/         # Express.js templates
├── frontend/
│   ├── react/           # React templates
│   ├── vue/             # Vue.js templates
│   └── svelte/          # Svelte templates
├── cli/
│   └── python-click/    # CLI tool templates
└── infrastructure/
    ├── docker/          # Docker configurations
    ├── kubernetes/      # K8s manifests
    └── github-actions/  # CI/CD pipelines
```

**Template Variables:**

- `project_name` - Project identifier
- `entity_name` - Domain entity name
- `backend_language` - Programming language
- `backend_framework` - Web framework
- `database` - Database type
- Custom filters: `snake_case`, `pascal_case`, `camel_case`, `kebab_case`

### 3. Claude Code Integration

```
.claude/
├── commands/           # Slash commands
│   ├── init.md
│   ├── status.md
│   ├── feature.md
│   ├── checkpoint.md
│   └── gap-analysis.md
├── skills/             # Agent skills
│   ├── core/
│   │   ├── nxtg-forge.md
│   │   ├── architecture.md
│   │   ├── coding-standards.md
│   │   └── testing.md
│   └── agents/
│       ├── lead-architect.md
│       ├── backend-master.md
│       ├── cli-artisan.md
│       ├── platform-builder.md
│       ├── integration-specialist.md
│       └── qa-sentinel.md
└── hooks/              # Lifecycle hooks
    ├── pre-task.sh
    ├── post-task.sh
    ├── on-error.sh
    └── state-sync.sh
```

**Agent System:**
Each agent has:

- Specialized expertise domain
- Standard workflows
- Decision frameworks
- Quality standards
- Handoff protocols

### 3.5. Lifecycle Hooks

Automated bash scripts that run at different points in the Claude Code workflow:

**Hook Types:**

1. **pre-task.sh** - Pre-execution validation
   - Ensures `state.json` exists (creates from template if missing)
   - Updates last session tracking
   - Validates project structure
   - Checks for uncommitted git changes

2. **post-task.sh** - Post-execution quality checks
   - Runs quick test validation (10s timeout)
   - Performs code quality checks with ruff
   - Updates quality metrics in state.json
   - Suggests next steps based on task status
   - Recommends checkpoint creation for major tasks (>5 files modified)

3. **on-error.sh** - Error handling and recovery
   - Logs errors to `.claude/errors.log`
   - Analyzes error types (imports, permissions, syntax, connections)
   - Provides contextual recovery suggestions
   - Tracks error patterns
   - Updates state with error status

4. **on-file-change.sh** - File modification automation
   - Auto-formats Python files with Black
   - Validates JSON/YAML syntax
   - Warns about critical file modifications (.env, requirements.txt)
   - Tracks file statistics
   - Suggests running tests for test file changes

5. **state-sync.sh** - State synchronization
   - Creates automatic backups (retains last 10)
   - Validates state.json integrity
   - Syncs project statistics (file counts, LOC)
   - Updates git information (branch, commit, status)
   - Calculates project health scores
   - Creates checkpoints
   - Auto-restores corrupted state from backups

**State Management:**
- **Template**: `state.json.template` committed to repo
- **User State**: `state.json` gitignored
- **Backups**: `.claude/backups/state_YYYYMMDD_HHMMSS.json`
- **Checkpoints**: `.claude/checkpoints/checkpoint_ID.json`

**Dependencies:**
- Required: bash
- Recommended: jq (JSON manipulation), git, python, black, ruff

See [`.claude/hooks/README.md`](.claude/hooks/README.md) for complete documentation.

### 4. State Management

**State Schema:**

```json
{
  "version": "1.0.0",
  "project": {
    "name": "project-name",
    "type": "web-app|api|cli|platform",
    "created_at": "ISO8601",
    "last_updated": "ISO8601",
    "forge_version": "1.0.0"
  },
  "spec": {
    "status": "pending|approved|outdated",
    "file": "docs/PROJECT-SPEC.md",
    "hash": "sha256"
  },
  "architecture": { ... },
  "development": {
    "current_phase": "setup|implementation|testing|deployment",
    "features": {
      "completed": [],
      "in_progress": [],
      "planned": []
    }
  },
  "quality": {
    "tests": { ... },
    "linting": { ... },
    "security": { ... }
  },
  "checkpoints": [],
  "last_session": { ... }
}
```

**Checkpoint System:**

- Automatic state snapshots
- Git commit integration
- Recovery information
- Symlink to latest

## Data Flow

### Project Initialization

```
1. User runs: /init --new
2. Spec Generator:
   - Interactive Q&A
   - Generate PROJECT-SPEC.md
   - User approval
3. File Generator:
   - Parse spec
   - Select templates
   - Generate files
4. MCP Detector:
   - Analyze project
   - Auto-configure servers
5. State Manager:
   - Create initial state
   - First checkpoint
```

### Feature Development

```
1. User runs: /feature "Feature Name"
2. State Manager:
   - Add to planned features
   - Assign to agent
3. Agent:
   - Load relevant skills
   - Implement feature
   - Update subtasks
4. State Sync Hook:
   - Update progress
   - Save state
5. Completion:
   - Move to completed
   - Create checkpoint
```

### Recovery Flow

```
1. Detect interruption:
   - last_session.status = "interrupted"
2. Get recovery info:
   - Last checkpoint
   - In-progress features
   - Resume commands
3. Show to user:
   - /status displays recovery info
4. Resume:
   - Load checkpoint
   - Continue from last state
```

## Architecture Patterns

### Clean Architecture

All generated code follows Clean Architecture:

```
src/
├── domain/              # Business entities
├── application/         # Use cases
├── infrastructure/      # External interfaces
└── interface/           # API/CLI/Web
```

**Dependencies flow inward:**

- Domain has no dependencies
- Application depends on Domain
- Infrastructure depends on Application
- Interface depends on all

### Template Pattern

Templates use Jinja2 with custom filters:

```jinja2
class {{ entity_name | pascal_case }}UseCase:
    def execute(self, {{ entity_name | snake_case }}_id: int):
        return self.repository.find({{ entity_name | snake_case }}_id)
```

### State Pattern

State transitions:

```
planned → in_progress → completed
    ↓           ↓           ↓
 checkpoint checkpoint checkpoint
```

## Deployment Architecture

### Development

```
Developer Machine
├── Claude Code CLI
├── NXTG-Forge
├── Git Repository
└── Local Services (Docker Compose)
    ├── PostgreSQL
    ├── Redis
    └── Application
```

### Production

```
Cloud Platform
├── Container Registry
├── Kubernetes Cluster
│   ├── Application Pods
│   ├── Database (Managed Service)
│   └── Cache (Managed Service)
├── CI/CD Pipeline
│   ├── Lint & Test
│   ├── Build Image
│   ├── Security Scan
│   └── Deploy
└── Monitoring
    ├── Logs
    ├── Metrics
    └── Alerts
```

## Security Considerations

1. **Secret Management**
   - Environment variables
   - No secrets in code
   - `.env` in `.gitignore`

2. **Dependency Security**
   - Regular vulnerability scans
   - Safety checks in CI/CD
   - Bandit static analysis

3. **Code Quality**
   - Pre-commit hooks
   - Ruff linting
   - MyPy type checking

4. **Access Control**
   - MCP server permissions
   - API authentication
   - Role-based access

## Performance Optimization

1. **Template Caching**
   - Jinja2 compiled templates
   - Reusable environment

2. **State Management**
   - Minimal file I/O
   - JSON schema validation
   - Incremental updates

3. **Docker**
   - Multi-stage builds
   - Layer caching
   - Minimal base images

## Extensibility

### Adding New Templates

```python
# 1. Create template directory
.claude/templates/backend/myframework/

# 2. Add .j2 files
main.py.j2
entity.py.j2

# 3. Templates auto-discovered
# No code changes needed
```

### Adding New Agents

```markdown
# 1. Create skill file
.claude/skills/agents/my-agent.md

# 2. Define:
- Role & Responsibilities
- Expertise Domains
- Standard Workflows
- Quality Standards

# 3. Add to state.json
"available": ["my-agent"]
```

### Adding New Commands

```markdown
# 1. Create command file
.claude/commands/my-command.md

# 2. Define command logic
# 3. Available as: /my-command
```

## Testing Strategy

1. **Unit Tests** - Each module tested independently
2. **Integration Tests** - End-to-end workflows
3. **Template Tests** - Generated code validates
4. **CI/CD Tests** - All checks automated

## Future Enhancements

- [ ] Real-time collaboration
- [ ] Multi-project workspaces
- [ ] Cloud sync for state
- [ ] Plugin system
- [ ] Web dashboard
- [ ] Advanced analytics

---

*Last Updated: 2025-01-04*
*Version: 1.0.0*

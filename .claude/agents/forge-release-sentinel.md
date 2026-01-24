# Release Sentinel: Documentation Management

## Documentation Categories

### 1. Auto-Updated (No Human Required)

| Document | Trigger | Method |
|----------|---------|--------|
| CHANGELOG.md | Commit/release | Parse conventional commits |
| API Reference | Endpoint changes | Generate from OpenAPI/code |
| Type definitions | Interface changes | Extract from TypeScript |
| Component docs | Component changes | Parse JSDoc/TSDoc |
| CLI help text | Command changes | Extract from decorators |

### 2. Semi-Auto (Human Review Required)

| Document | Trigger | Method |
|----------|---------|--------|
| README.md | Feature additions | Generate draft, human review |
| User guides | Workflow changes | Flag sections needing update |
| Tutorials | Breaking changes | Generate migration steps |
| FAQ | New error patterns | Suggest new entries |

### 3. Manual (Human Creates, AI Assists)

| Document | Trigger | Method |
|----------|---------|--------|
| Architecture docs | Design decisions | Create ADR, link to docs |
| Concept explanations | New abstractions | Flag need, suggest outline |
| Diagrams | Structural changes | Suggest diagram updates |

---

## Documentation Tracking in State
````json
// .claude/state.json
{
  "documentation": {
    "last_audit": "2026-01-08T14:30:00Z",
    "coverage_score": 87,
    
    "files": {
      "README.md": {
        "last_updated": "2026-01-08T14:30:00Z",
        "version_documented": "2.1.0",
        "sections_stale": [],
        "health": "current"
      },
      "docs/api/users.md": {
        "last_updated": "2026-01-05T10:00:00Z",
        "version_documented": "2.0.0",
        "sections_stale": ["POST /users", "DELETE /users/{id}"],
        "health": "stale",
        "code_files_tracked": [
          "src/api/routes/users.ts",
          "src/api/schemas/user.ts"
        ]
      }
    },
    
    "pending_updates": [
      {
        "file": "docs/api/users.md",
        "reason": "New endpoint added: PATCH /users/{id}/avatar",
        "priority": "high",
        "triggered_by": "commit:abc123",
        "suggested_changes": [
          "Add PATCH /users/{id}/avatar documentation",
          "Update request/response examples"
        ]
      }
    ],
    
    "changelog": {
      "unreleased_entries": 3,
      "last_release": "2.1.0",
      "next_version": "2.2.0"
    }
  }
}
````

---

## Documentation Mapping System
````typescript
// .claude/config/doc-mapping.json
{
  "mappings": [
    {
      "code_pattern": "src/api/routes/**/*.ts",
      "docs": ["docs/api/{filename}.md", "README.md#api-reference"],
      "generator": "openapi-to-markdown",
      "auto_update": true
    },
    {
      "code_pattern": "src/components/ui/**/*.tsx",
      "docs": ["docs/components/{filename}.md"],
      "generator": "tsdoc-to-markdown",
      "auto_update": true
    },
    {
      "code_pattern": "src/cli/commands/**/*.ts",
      "docs": ["docs/cli.md", "README.md#cli-usage"],
      "generator": "cli-help-extractor",
      "auto_update": true
    },
    {
      "code_pattern": "src/config/**/*.ts",
      "docs": ["docs/configuration.md"],
      "generator": "config-schema-docs",
      "auto_update": false,
      "notify": true
    },
    {
      "code_pattern": "src/core/**/*.ts",
      "docs": ["docs/architecture/*.md"],
      "generator": null,
      "auto_update": false,
      "notify": true,
      "requires_review": true
    }
  ],
  
  "templates": {
    "api_endpoint": "docs/templates/api-endpoint.md",
    "component": "docs/templates/component.md",
    "cli_command": "docs/templates/cli-command.md"
  }
}
````
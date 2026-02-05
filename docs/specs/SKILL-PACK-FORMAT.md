# Skill-Pack Package Format Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-02-04

## Overview

A skill-pack is a distributable package that extends NXTG-Forge with specialized knowledge, agents, and templates for specific technology stacks or domains. This specification defines the structure, manifest format, and packaging requirements for skill-packs.

## Directory Structure

```
<pack-name>/
├── skill-pack.json          # REQUIRED: Package manifest
├── README.md                # REQUIRED: Human-readable documentation
├── LICENSE                  # REQUIRED: Pack-specific license file
├── CHANGELOG.md             # RECOMMENDED: Version history
├── .gitignore               # OPTIONAL: For Git-based distribution
├── agents/                  # OPTIONAL: Agent definitions
│   ├── <agent-name>.md
│   └── <agent-name>.json    # Agent metadata
├── skills/                  # OPTIONAL: Knowledge base files
│   ├── <skill-area>/
│   │   ├── patterns.md
│   │   ├── best-practices.md
│   │   └── pitfalls.md
│   └── index.md
├── templates/               # OPTIONAL: Code/file templates
│   ├── <template-name>.j2   # Jinja2 templates
│   └── templates.json       # Template metadata
├── examples/                # OPTIONAL: Usage examples
│   ├── quickstart.md
│   └── sample-projects/
├── tests/                   # OPTIONAL: Validation tests
│   └── pack-tests.md
└── hooks/                   # OPTIONAL: Lifecycle hooks
    ├── post-install.sh
    └── pre-uninstall.sh
```

## Manifest File: `skill-pack.json`

### Schema Version 1.0

```json
{
  "$schema": "https://nxtg.ai/schemas/skill-pack/v1.0.json",
  "name": "string",
  "version": "string",
  "description": "string",
  "tier": "FREE|PRO|ENTERPRISE",
  "author": {
    "name": "string",
    "email": "string",
    "url": "string"
  },
  "license": "string",
  "repository": {
    "type": "git",
    "url": "string"
  },
  "homepage": "string",
  "bugs": {
    "url": "string",
    "email": "string"
  },
  "keywords": ["string"],
  "requires": {
    "nxtg-forge": "string",
    "claude-code": "string"
  },
  "dependencies": {
    "skill-pack-name": "version-range"
  },
  "peerDependencies": {
    "skill-pack-name": "version-range"
  },
  "provides": {
    "agents": ["string"],
    "skills": ["string"],
    "templates": ["string"],
    "commands": ["string"]
  },
  "configuration": {
    "schema": "object",
    "defaults": "object"
  },
  "lifecycle": {
    "postInstall": "string",
    "preUninstall": "string"
  },
  "metadata": {
    "tags": ["string"],
    "categories": ["string"],
    "maturity": "alpha|beta|stable|mature",
    "since": "string",
    "deprecated": "boolean"
  }
}
```

### Field Definitions

#### Required Fields

- **`name`** (string, required)
  - Unique identifier for the skill-pack
  - Format: lowercase, hyphen-separated (e.g., `react-19-pack`)
  - Must match directory name
  - Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`

- **`version`** (string, required)
  - Semantic versioning (semver) format
  - Pattern: `^\d+\.\d+\.\d+(-[a-z0-9.]+)?(\+[a-z0-9.]+)?$`
  - Examples: `1.0.0`, `2.1.3-beta.1`, `1.0.0+build.123`

- **`description`** (string, required)
  - Brief one-line summary (max 200 characters)
  - Describes what the pack provides

- **`tier`** (enum, required)
  - License tier: `FREE`, `PRO`, or `ENTERPRISE`
  - Determines pricing and distribution channel

- **`author`** (object, required)
  - `name` (string, required): Author or organization name
  - `email` (string, optional): Contact email
  - `url` (string, optional): Author homepage

- **`license`** (string, required)
  - SPDX license identifier (e.g., `MIT`, `Apache-2.0`, `Commercial`)
  - Must match LICENSE file content
  - FREE tier: Must be OSI-approved open source
  - PRO/ENTERPRISE: Can be proprietary

#### Recommended Fields

- **`repository`** (object)
  - `type`: Version control system (e.g., `git`)
  - `url`: Repository URL

- **`homepage`** (string)
  - Landing page or documentation site

- **`keywords`** (array of strings)
  - Search keywords for marketplace discovery
  - Max 20 keywords

#### Optional Fields

- **`requires`** (object)
  - Version constraints for NXTG-Forge compatibility
  - `nxtg-forge`: Semver range (e.g., `>=3.0.0 <4.0.0`)
  - `claude-code`: Semver range (e.g., `>=1.0.0`)

- **`dependencies`** (object)
  - Other skill-packs this pack depends on
  - Key: pack name, Value: semver range
  - Installed automatically during installation

- **`peerDependencies`** (object)
  - Skill-packs that should be installed alongside this pack
  - Not automatically installed; user is warned if missing

- **`provides`** (object)
  - Inventory of included resources
  - `agents`: Array of agent file names (without extension)
  - `skills`: Array of skill area names
  - `templates`: Array of template names
  - `commands`: Array of slash commands provided

- **`configuration`** (object)
  - `schema`: JSON Schema for pack-specific configuration
  - `defaults`: Default configuration values

- **`lifecycle`** (object)
  - `postInstall`: Script to run after installation
  - `preUninstall`: Script to run before removal

- **`metadata`** (object)
  - `tags`: Additional categorization tags
  - `categories`: High-level categories (e.g., `frontend`, `backend`, `devops`)
  - `maturity`: Stability level (`alpha`, `beta`, `stable`, `mature`)
  - `since`: Date pack was first published (ISO 8601)
  - `deprecated`: Boolean indicating if pack is deprecated

## Agent Definitions

Agent files in `agents/` directory follow the standard NXTG-Forge agent format:

### Agent Markdown File: `agents/<agent-name>.md`

```markdown
# {Agent Name}

## Role
{Brief description of the agent's purpose}

## When Activated
- Condition 1
- Condition 2

## Capabilities
- Capability 1
- Capability 2

## Protocols
{Detailed instructions for the agent}

## Examples
{Usage examples}
```

### Agent Metadata File: `agents/<agent-name>.json`

```json
{
  "name": "string",
  "role": "string",
  "triggers": ["string"],
  "capabilities": ["string"],
  "priority": "number",
  "enabled": "boolean"
}
```

## Skill Files

Skill files in `skills/` directory are markdown documents containing domain knowledge:

```markdown
# {Skill Area}

## Patterns
{Common patterns and their use cases}

## Best Practices
{Recommended approaches}

## Pitfalls
{Common mistakes to avoid}

## Examples
{Code examples and demonstrations}

## References
{External resources and documentation}
```

## Templates

Templates use Jinja2 syntax with `.j2` extension:

```jinja2
{# templates/component.tsx.j2 #}
import React from 'react';

interface {{ componentName }}Props {
  {% for prop in props %}
  {{ prop.name }}: {{ prop.type }};
  {% endfor %}
}

export const {{ componentName }}: React.FC<{{ componentName }}Props> = ({
  {% for prop in props %}
  {{ prop.name }},
  {% endfor %}
}) => {
  return (
    <div>
      {/* Component implementation */}
    </div>
  );
};
```

### Template Metadata: `templates/templates.json`

```json
{
  "templates": [
    {
      "name": "component",
      "file": "component.tsx.j2",
      "description": "React component with TypeScript",
      "variables": [
        {
          "name": "componentName",
          "type": "string",
          "required": true,
          "description": "Name of the component"
        },
        {
          "name": "props",
          "type": "array",
          "required": false,
          "description": "Component props"
        }
      ],
      "output": {
        "path": "src/components/{{ componentName }}.tsx",
        "overwrite": false
      }
    }
  ]
}
```

## Versioning Scheme

Skill-packs follow [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** version: Breaking changes to pack structure, APIs, or behavior
- **MINOR** version: Backward-compatible additions (new agents, skills, templates)
- **PATCH** version: Backward-compatible bug fixes, documentation updates

### Pre-release Versions

- Alpha: `1.0.0-alpha.1` (unstable, testing)
- Beta: `1.0.0-beta.1` (feature-complete, stabilizing)
- Release Candidate: `1.0.0-rc.1` (final testing)

### Build Metadata

- `1.0.0+build.123` (informational, doesn't affect precedence)

## Dependency Resolution

### Version Ranges

Skill-packs support standard npm-style semver ranges:

- Exact: `1.2.3`
- Greater than: `>1.2.3`
- Greater than or equal: `>=1.2.3`
- Less than: `<2.0.0`
- Range: `>=1.2.3 <2.0.0`
- Caret: `^1.2.3` (allow MINOR and PATCH updates)
- Tilde: `~1.2.3` (allow PATCH updates only)

### Dependency Graph

Dependencies form a directed acyclic graph (DAG):

```
user-pack
  ├── react-19-pack@^1.0.0
  │   └── typescript-pack@^5.0.0
  └── testing-pack@^2.1.0
      └── typescript-pack@^5.0.0  # Shared dependency
```

Shared dependencies are deduplicated using the highest compatible version.

## License Requirements

### FREE Tier

- Must use OSI-approved open source license
- Recommended: MIT, Apache-2.0, BSD-3-Clause
- No usage restrictions beyond license terms

### PRO Tier

- Can use proprietary/commercial license
- Must clearly state usage restrictions
- May require license key validation

### ENTERPRISE Tier

- Typically custom licensing agreements
- May include NDA or confidentiality clauses
- Private distribution only

## Distribution Formats

### Source Distribution (`.tar.gz`)

Standard tarball containing all pack files:

```bash
skill-pack-name-1.0.0.tar.gz
```

### Checksum File (`.sha256`)

SHA-256 checksum for integrity verification:

```bash
skill-pack-name-1.0.0.tar.gz.sha256
```

### Signature File (`.sig`)

Optional GPG signature for authenticity verification:

```bash
skill-pack-name-1.0.0.tar.gz.sig
```

## Validation Rules

A valid skill-pack must:

1. Include `skill-pack.json` with all required fields
2. Include `README.md` with usage documentation
3. Include `LICENSE` file matching declared license
4. Use valid semver versioning
5. Have unique name not conflicting with existing packs
6. Pass JSON schema validation
7. Have no circular dependencies
8. Include at least one resource (agent, skill, or template)
9. Have all referenced files actually present
10. Pass tier-specific validation (e.g., FREE tier must be open source)

## Installation Location

Skill-packs are installed to:

```
.claude/forge/skill-packs/<pack-name>/
```

With symlinks created for agents:

```
.claude/agents/<agent-name>.md -> .claude/forge/skill-packs/<pack-name>/agents/<agent-name>.md
```

## Configuration Overrides

Users can override pack configuration in `.claude/forge/config.yml`:

```yaml
installed_packs:
  react-19-pack:
    version: 1.2.3
    enabled: true
    config:
      strict_mode: true
      hooks_linting: enabled
```

## Best Practices

1. **Single Responsibility**: Each pack should focus on one technology or domain
2. **Clear Documentation**: README should explain what, why, and how
3. **Version Pinning**: Use exact versions for critical dependencies
4. **Backwards Compatibility**: Avoid breaking changes in MINOR/PATCH versions
5. **Changelog**: Maintain CHANGELOG.md with all notable changes
6. **Testing**: Include validation tests in `tests/` directory
7. **Examples**: Provide practical usage examples
8. **Metadata**: Use descriptive keywords and categories for discoverability

## Future Considerations

- Binary assets support (images, fonts, etc.)
- Multi-language support (i18n)
- Pack signing and verification infrastructure
- Automated dependency security scanning
- Pack analytics and telemetry
- Hot-reloading during development

---

**See Also:**
- [Marketplace Specification](./MARKETPLACE-SPEC.md)
- [Skill-Pack Tiers](./SKILL-PACK-TIERS.md)
- [Marketplace Commands](./MARKETPLACE-COMMANDS.md)

# Marketplace CLI Commands Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-02-04

## Overview

This document specifies the command-line interface for interacting with the NXTG-Forge Marketplace. All marketplace commands are available through the `/frg-marketplace` namespace.

## Command Prefix

All marketplace commands use the prefix:

```
/frg-marketplace <subcommand> [options] [arguments]
```

Alias: `/frg-mp` (shorter form)

## Commands

### `/frg-marketplace search`

Search for available skill-packs in the marketplace.

#### Syntax

```bash
/frg-marketplace search <query> [options]
```

#### Arguments

- `<query>` (required): Search terms (e.g., "react", "typescript testing")

#### Options

- `--tier <FREE|PRO|ENTERPRISE>`: Filter by tier
- `--category <category>`: Filter by category
- `--tag <tag>`: Filter by tag (can be repeated)
- `--maturity <alpha|beta|stable|mature>`: Filter by maturity level
- `--sort <relevance|downloads|rating|updated|created>`: Sort order (default: relevance)
- `--limit <number>`: Max results to show (default: 20)
- `--json`: Output in JSON format

#### Examples

```bash
# Search for React packs
/frg-marketplace search react

# Search for free frontend packs
/frg-marketplace search frontend --tier FREE

# Search for TypeScript packs, sorted by downloads
/frg-marketplace search typescript --sort downloads

# Search for stable backend packs with specific tag
/frg-marketplace search backend --maturity stable --tag nodejs

# Get JSON output for scripting
/frg-marketplace search react --json
```

#### Output

```
NXTG-Forge Marketplace Search Results

Query: "react"
Filters: tier=FREE
Found: 12 packs

1. react-19-pack (v1.2.3) ★★★★★ 4.8 (156)
   React 19 best practices, hooks patterns, Server Components
   FREE | stable | 12.4K downloads
   Tags: react, frontend, hooks, typescript

2. react-testing-pack (v2.1.0) ★★★★☆ 4.5 (89)
   Comprehensive testing for React applications
   FREE | stable | 8.2K downloads
   Tags: react, testing, jest, rtl

3. react-native-pack (v1.0.5) ★★★★☆ 4.3 (45)
   React Native mobile development essentials
   PRO | beta | 3.1K downloads
   Tags: react-native, mobile, ios, android

Showing 3 of 12 results. Use --limit to see more.

Install a pack: /frg-marketplace install <pack-name>
```

---

### `/frg-marketplace install`

Install a skill-pack from the marketplace.

#### Syntax

```bash
/frg-marketplace install <pack-name>[@version] [options]
```

#### Arguments

- `<pack-name>` (required): Name of the pack to install
- `[@version]` (optional): Specific version or range (default: latest)

#### Options

- `--save`: Save to project dependencies (updates `.claude/forge/config.yml`)
- `--save-dev`: Save as development dependency
- `--global`: Install globally (available to all projects)
- `--force`: Force reinstall even if already installed
- `--no-deps`: Skip installing dependencies
- `--dry-run`: Show what would be installed without actually installing
- `--verbose`: Show detailed installation progress
- `--license-key <key>`: License key for PRO/ENTERPRISE packs

#### Examples

```bash
# Install latest version
/frg-marketplace install react-19-pack

# Install specific version
/frg-marketplace install react-19-pack@1.2.3

# Install with version range
/frg-marketplace install react-19-pack@^1.2.0

# Install and save to project
/frg-marketplace install react-19-pack --save

# Install globally
/frg-marketplace install typescript-pack --global

# Force reinstall
/frg-marketplace install react-19-pack --force

# Dry run to preview
/frg-marketplace install react-19-pack --dry-run

# Install PRO pack with license key
/frg-marketplace install react-pro-pack --license-key XXXXX-XXXXX-XXXXX
```

#### Output

```
Installing react-19-pack@^1.2.0...

Resolving dependencies...
  ✓ react-19-pack@1.2.3
  ✓ typescript-pack@5.3.0

Downloading packages...
  ✓ react-19-pack-1.2.3.tar.gz (60 KB)
  ✓ typescript-pack-5.3.0.tar.gz (45 KB)

Verifying checksums...
  ✓ react-19-pack checksum verified
  ✓ typescript-pack checksum verified

Installing...
  ✓ Extracted to .claude/forge/skill-packs/react-19-pack/
  ✓ Extracted to .claude/forge/skill-packs/typescript-pack/
  ✓ Linked 2 agents to .claude/agents/
  ✓ Registered 5 skills
  ✓ Installed 3 templates

Running post-install hooks...
  ✓ react-19-pack: Configuration initialized

Successfully installed:
  - react-19-pack@1.2.3 (2 agents, 5 skills, 3 templates)
  - typescript-pack@5.3.0 (1 agent, 3 skills, 0 templates)

Total size: 105 KB

Get started: /frg-help react-19-pack
```

#### Error Handling

```
Error: Failed to install react-19-pack@1.2.3

Reason: Dependency conflict detected
  - react-19-pack@1.2.3 requires typescript-pack@^5.0.0
  - your-custom-pack@1.0.0 requires typescript-pack@^4.9.0
  - No version satisfies both ^5.0.0 and ^4.9.0

Suggested resolution:
  1. Update your-custom-pack to support typescript-pack@^5.0.0
  2. Use an older version: /frg-marketplace install react-19-pack@1.1.0
  3. Remove conflicting pack: /frg-marketplace remove your-custom-pack

Need help? Visit: https://docs.nxtg.ai/marketplace/troubleshooting
```

---

### `/frg-marketplace list`

List installed skill-packs.

#### Syntax

```bash
/frg-marketplace list [options]
```

#### Options

- `--global`: Show globally installed packs
- `--tier <FREE|PRO|ENTERPRISE>`: Filter by tier
- `--outdated`: Show only packs with available updates
- `--json`: Output in JSON format

#### Examples

```bash
# List all installed packs
/frg-marketplace list

# List global packs
/frg-marketplace list --global

# Show only outdated packs
/frg-marketplace list --outdated

# JSON output
/frg-marketplace list --json
```

#### Output

```
Installed Skill-Packs

Project: /home/user/my-project
Location: .claude/forge/skill-packs/

react-19-pack@1.2.3 (FREE) ✓ up-to-date
  2 agents, 5 skills, 3 templates
  Installed: 2026-01-15

typescript-pack@5.3.0 (FREE) ⚠ update available (5.4.0)
  1 agent, 3 skills, 0 templates
  Installed: 2026-01-20

testing-pack@2.1.5 (PRO) ✓ up-to-date
  3 agents, 8 skills, 5 templates
  License: XXXXX-XXXXX (expires 2026-12-31)
  Installed: 2026-02-01

Total: 3 packs (6 agents, 16 skills, 8 templates)

Update available: /frg-marketplace update typescript-pack
Update all: /frg-marketplace update --all
```

---

### `/frg-marketplace update`

Update an installed skill-pack.

#### Syntax

```bash
/frg-marketplace update [pack-name] [options]
```

#### Arguments

- `[pack-name]` (optional): Name of pack to update (if omitted, shows available updates)

#### Options

- `--all`: Update all outdated packs
- `--global`: Update global packs
- `--dry-run`: Show what would be updated without updating
- `--verbose`: Show detailed update progress

#### Examples

```bash
# Show available updates
/frg-marketplace update

# Update specific pack
/frg-marketplace update react-19-pack

# Update all packs
/frg-marketplace update --all

# Dry run
/frg-marketplace update --all --dry-run
```

#### Output

```
Updating typescript-pack...

Current version: 5.3.0
Latest version: 5.4.0

Changelog:
  ## [5.4.0] - 2026-02-03
  ### Added
  - TypeScript 5.4 features
  - Improved type inference patterns
  
  ### Fixed
  - Template type issues

Proceed with update? [Y/n] y

Downloading typescript-pack@5.4.0...
  ✓ Downloaded (46 KB)
  ✓ Checksum verified

Installing...
  ✓ Removed old version
  ✓ Installed new version
  ✓ Updated symlinks

Successfully updated typescript-pack: 5.3.0 → 5.4.0
```

---

### `/frg-marketplace remove`

Uninstall a skill-pack.

#### Syntax

```bash
/frg-marketplace remove <pack-name> [options]
```

#### Arguments

- `<pack-name>` (required): Name of pack to remove

#### Options

- `--global`: Remove from global installation
- `--force`: Skip confirmation prompt
- `--keep-config`: Keep configuration files

#### Examples

```bash
# Remove a pack (with confirmation)
/frg-marketplace remove react-19-pack

# Force remove without confirmation
/frg-marketplace remove react-19-pack --force

# Remove but keep config
/frg-marketplace remove react-19-pack --keep-config
```

#### Output

```
Removing react-19-pack@1.2.3...

This will remove:
  - 2 agents
  - 5 skills
  - 3 templates
  - Configuration files

Dependents:
  ⚠ testing-pack@2.1.5 depends on react-19-pack
  → testing-pack may not work correctly after removal

Proceed with removal? [y/N] y

Running pre-uninstall hooks...
  ✓ react-19-pack: Cleanup completed

Removing...
  ✓ Unlinked agents
  ✓ Removed skills
  ✓ Removed templates
  ✓ Deleted pack directory

Successfully removed react-19-pack@1.2.3
```

---

### `/frg-marketplace info`

Show detailed information about a skill-pack.

#### Syntax

```bash
/frg-marketplace info <pack-name>[@version] [options]
```

#### Arguments

- `<pack-name>` (required): Name of pack
- `[@version]` (optional): Specific version (default: latest)

#### Options

- `--json`: Output in JSON format
- `--readme`: Show full README
- `--changelog`: Show full changelog

#### Examples

```bash
# Show pack info
/frg-marketplace info react-19-pack

# Show specific version
/frg-marketplace info react-19-pack@1.2.0

# Show README
/frg-marketplace info react-19-pack --readme

# JSON output
/frg-marketplace info react-19-pack --json
```

#### Output

```
react-19-pack v1.2.3

React 19 best practices, hooks patterns, Server Components, and
performance optimization strategies.

Tier: FREE
License: MIT
Author: NXTG Team <packs@nxtg.ai>
Homepage: https://github.com/nxtg-ai/skill-packs/tree/main/react-19-pack

Statistics:
  ★★★★★ 4.8/5.0 (156 ratings)
  12,450 total downloads
  1,230 downloads this month

Provides:
  2 agents:
    - react-expert: Advanced React patterns and architecture
    - hooks-specialist: Hooks best practices and custom hooks
  
  5 skills:
    - react-patterns: Common React design patterns
    - hooks-best-practices: Hooks usage guidelines
    - server-components: Server Components architecture
    - performance: React performance optimization
    - testing: Testing strategies for React
  
  3 templates:
    - component: Functional component with TypeScript
    - custom-hook: Custom hook template
    - server-component: Server Component template

Requirements:
  NXTG-Forge: >=3.0.0 <4.0.0
  Claude Code: >=1.0.0

Dependencies:
  typescript-pack: ^5.0.0

Peer Dependencies:
  testing-pack: ^2.0.0 (optional)

Versions:
  Latest: 1.2.3 (2026-02-01)
  Available: 1.2.3, 1.2.2, 1.2.1, 1.2.0, 1.1.0, 1.0.0

Install: /frg-marketplace install react-19-pack
```

---

### `/frg-marketplace publish`

Publish a skill-pack to the marketplace (for contributors).

#### Syntax

```bash
/frg-marketplace publish [path] [options]
```

#### Arguments

- `[path]` (optional): Path to pack directory (default: current directory)

#### Options

- `--tag <tag>`: Publish with a dist-tag (e.g., `beta`, `next`)
- `--access <public|restricted>`: Access level (default: public for FREE, restricted for PRO/ENTERPRISE)
- `--dry-run`: Validate without publishing
- `--token <token>`: Authentication token

#### Examples

```bash
# Publish from current directory
/frg-marketplace publish

# Publish specific directory
/frg-marketplace publish ./my-skill-pack

# Publish as beta
/frg-marketplace publish --tag beta

# Dry run (validation only)
/frg-marketplace publish --dry-run
```

#### Output

```
Publishing react-19-pack...

Validating pack...
  ✓ skill-pack.json is valid
  ✓ README.md exists
  ✓ LICENSE exists (MIT)
  ✓ All referenced files exist
  ✓ No circular dependencies
  ✓ Version 1.2.4 is valid (increments from 1.2.3)
  ✓ Tier matches license (FREE → MIT)

Building distribution...
  ✓ Created tarball (60 KB)
  ✓ Generated checksum
  ✓ Signed with GPG key

Uploading...
  ✓ Tarball uploaded to CDN
  ✓ Metadata updated in marketplace

Successfully published react-19-pack@1.2.4

View: https://marketplace.nxtg.ai/packs/react-19-pack
Install: /frg-marketplace install react-19-pack@1.2.4
```

---

### `/frg-marketplace login`

Authenticate with the marketplace (for PRO/ENTERPRISE packs).

#### Syntax

```bash
/frg-marketplace login [options]
```

#### Options

- `--token <token>`: API token
- `--license-key <key>`: License key

#### Examples

```bash
# Interactive login
/frg-marketplace login

# Login with token
/frg-marketplace login --token xxxxx-xxxxx

# Add license key
/frg-marketplace login --license-key XXXXX-XXXXX
```

---

### `/frg-marketplace logout`

Remove authentication credentials.

#### Syntax

```bash
/frg-marketplace logout
```

---

### `/frg-marketplace config`

Manage marketplace configuration.

#### Syntax

```bash
/frg-marketplace config <get|set|list> [key] [value]
```

#### Examples

```bash
# List all config
/frg-marketplace config list

# Get specific config
/frg-marketplace config get registry

# Set config
/frg-marketplace config set cache-ttl 3600
```

---

### `/frg-marketplace doctor`

Diagnose marketplace issues.

#### Syntax

```bash
/frg-marketplace doctor
```

#### Output

```
NXTG-Forge Marketplace Diagnostics

Checking installation...
  ✓ NXTG-Forge version: 3.1.0
  ✓ Claude Code version: 1.2.0
  ✓ Marketplace cache directory exists
  ✓ Marketplace config is valid

Checking network connectivity...
  ✓ Can reach marketplace API (api.nxtg.ai)
  ✓ Can reach CDN (cdn.nxtg.ai)

Checking installed packs...
  ✓ react-19-pack@1.2.3 (no issues)
  ⚠ typescript-pack@5.3.0 (update available: 5.4.0)
  ✓ testing-pack@2.1.5 (no issues)

Checking dependencies...
  ✓ All dependencies satisfied
  ✓ No circular dependencies

All systems operational.
```

---

## Global Options

These options apply to all commands:

- `--help`, `-h`: Show command help
- `--version`, `-v`: Show marketplace CLI version
- `--quiet`, `-q`: Suppress non-error output
- `--verbose`: Show detailed output
- `--no-color`: Disable colored output
- `--registry <url>`: Use alternative registry (default: https://api.nxtg.ai)

---

**See Also:**
- [Skill-Pack Format](./SKILL-PACK-FORMAT.md)
- [Marketplace Specification](./MARKETPLACE-SPEC.md)
- [Skill-Pack Tiers](./SKILL-PACK-TIERS.md)

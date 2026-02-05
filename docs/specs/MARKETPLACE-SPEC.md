# Marketplace Catalog Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-02-04

## Overview

The NXTG-Forge Marketplace is a centralized registry for discovering, browsing, and installing skill-packs. This specification defines the catalog format, discovery mechanisms, search capabilities, and version resolution algorithms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NXTG-Forge CLI Client                    │
│  (/frg-marketplace search, install, list, update, remove)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Marketplace API (api.nxtg.ai/v1)               │
│  - Catalog endpoints                                        │
│  - Search/filter                                            │
│  - Download links                                           │
│  - Version resolution                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Distribution Storage (CDN/GitHub)              │
│  - Tarball downloads                                        │
│  - Checksums                                                │
│  - Signatures                                               │
└─────────────────────────────────────────────────────────────┘
```

## Catalog Format

### Master Catalog: `catalog.json`

The master catalog is a JSON file listing all available skill-packs:

```json
{
  "version": "1.0",
  "updated": "2026-02-04T15:30:00Z",
  "packs": [
    {
      "name": "react-19-pack",
      "latest": "1.2.3",
      "tier": "FREE",
      "description": "React 19 best practices, hooks patterns, Server Components",
      "short_description": "React 19 essentials",
      "author": {
        "name": "NXTG Team",
        "url": "https://nxtg.ai"
      },
      "homepage": "https://github.com/nxtg-ai/skill-packs/tree/main/react-19-pack",
      "repository": {
        "type": "git",
        "url": "https://github.com/nxtg-ai/skill-packs.git"
      },
      "license": "MIT",
      "keywords": ["react", "frontend", "hooks", "typescript", "server-components"],
      "categories": ["frontend", "javascript"],
      "tags": ["react", "frontend", "hooks", "typescript"],
      "maturity": "stable",
      "downloads": {
        "total": 12450,
        "monthly": 1230,
        "weekly": 340
      },
      "rating": {
        "average": 4.8,
        "count": 156
      },
      "created": "2025-09-15T10:00:00Z",
      "updated": "2026-02-01T14:22:00Z",
      "versions": ["1.2.3", "1.2.2", "1.2.1", "1.2.0", "1.1.0", "1.0.0"],
      "requires": {
        "nxtg-forge": ">=3.0.0",
        "claude-code": ">=1.0.0"
      },
      "provides": {
        "agents": 2,
        "skills": 5,
        "templates": 3,
        "commands": 0
      },
      "size": {
        "unpacked": 245760,
        "packed": 61440
      },
      "checksum": "sha256:a1b2c3d4e5f6...",
      "deprecated": false,
      "deprecation_reason": null,
      "replacement": null
    }
  ]
}
```

### Pack Detail: `packs/<pack-name>.json`

Detailed information for a specific pack:

```json
{
  "name": "react-19-pack",
  "version": "1.2.3",
  "tier": "FREE",
  "description": "Comprehensive React 19 skill-pack with best practices, hooks patterns, Server Components, and performance optimization strategies.",
  "author": {
    "name": "NXTG Team",
    "email": "packs@nxtg.ai",
    "url": "https://nxtg.ai"
  },
  "maintainers": [
    {
      "name": "Jane Developer",
      "email": "jane@nxtg.ai"
    }
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/nxtg-ai/skill-packs.git",
    "directory": "react-19-pack"
  },
  "homepage": "https://github.com/nxtg-ai/skill-packs/tree/main/react-19-pack",
  "bugs": {
    "url": "https://github.com/nxtg-ai/skill-packs/issues",
    "email": "support@nxtg.ai"
  },
  "keywords": ["react", "frontend", "hooks", "typescript", "server-components", "rsc"],
  "categories": ["frontend", "javascript"],
  "maturity": "stable",
  "created": "2025-09-15T10:00:00Z",
  "updated": "2026-02-01T14:22:00Z",
  "requires": {
    "nxtg-forge": ">=3.0.0 <4.0.0",
    "claude-code": ">=1.0.0"
  },
  "dependencies": {
    "typescript-pack": "^5.0.0"
  },
  "peerDependencies": {
    "testing-pack": "^2.0.0"
  },
  "provides": {
    "agents": ["react-expert", "hooks-specialist"],
    "skills": ["react-patterns", "hooks-best-practices", "server-components", "performance", "testing"],
    "templates": ["component", "custom-hook", "server-component"],
    "commands": []
  },
  "files": [
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "skill-pack.json",
    "agents/",
    "skills/",
    "templates/"
  ],
  "downloads": {
    "total": 12450,
    "versions": {
      "1.2.3": 340,
      "1.2.2": 890,
      "1.2.1": 1220
    }
  },
  "rating": {
    "average": 4.8,
    "count": 156,
    "distribution": {
      "5": 120,
      "4": 28,
      "3": 6,
      "2": 1,
      "1": 1
    }
  },
  "dist": {
    "tarball": "https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz",
    "shasum": "sha256:a1b2c3d4e5f6789012345678901234567890",
    "signature": "https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz.sig",
    "size": 61440
  },
  "versions_available": [
    {
      "version": "1.2.3",
      "published": "2026-02-01T14:22:00Z",
      "deprecated": false
    },
    {
      "version": "1.2.2",
      "published": "2026-01-15T09:10:00Z",
      "deprecated": false
    }
  ],
  "readme": "# React 19 Pack\n\nComprehensive skill-pack for React 19...",
  "changelog": "## [1.2.3] - 2026-02-01\n### Added\n- Server Actions patterns...",
  "related_packs": [
    "nextjs-pack",
    "typescript-pack",
    "testing-pack"
  ]
}
```

### Version Manifest: `packs/<pack-name>/versions.json`

All versions of a specific pack:

```json
{
  "name": "react-19-pack",
  "versions": {
    "1.2.3": {
      "version": "1.2.3",
      "published": "2026-02-01T14:22:00Z",
      "deprecated": false,
      "requires": {
        "nxtg-forge": ">=3.0.0 <4.0.0"
      },
      "dependencies": {
        "typescript-pack": "^5.0.0"
      },
      "dist": {
        "tarball": "https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz",
        "shasum": "sha256:a1b2c3d4e5f6...",
        "size": 61440
      }
    },
    "1.2.2": {
      "version": "1.2.2",
      "published": "2026-01-15T09:10:00Z",
      "deprecated": false,
      "requires": {
        "nxtg-forge": ">=3.0.0 <4.0.0"
      },
      "dependencies": {
        "typescript-pack": "^5.0.0"
      },
      "dist": {
        "tarball": "https://cdn.nxtg.ai/packs/react-19-pack-1.2.2.tar.gz",
        "shasum": "sha256:f6e5d4c3b2a1...",
        "size": 60928
      }
    }
  }
}
```

## API Endpoints

### Base URL

```
https://api.nxtg.ai/v1/marketplace
```

### Endpoints

#### `GET /catalog`

Retrieve the master catalog.

**Response:**
```json
{
  "version": "1.0",
  "updated": "2026-02-04T15:30:00Z",
  "packs": [ /* array of pack summaries */ ]
}
```

#### `GET /packs/:name`

Get detailed information for a specific pack.

**Example:** `GET /packs/react-19-pack`

**Response:** Pack detail JSON (see above)

#### `GET /packs/:name/versions`

Get all versions of a specific pack.

**Example:** `GET /packs/react-19-pack/versions`

**Response:** Version manifest JSON (see above)

#### `GET /packs/:name/:version`

Get information for a specific version.

**Example:** `GET /packs/react-19-pack/1.2.3`

**Response:** Version-specific pack detail

#### `GET /search?q=:query&tier=:tier&category=:category&tag=:tag`

Search for packs.

**Parameters:**
- `q` (string): Search query (searches name, description, keywords)
- `tier` (enum): Filter by tier (`FREE`, `PRO`, `ENTERPRISE`)
- `category` (string): Filter by category
- `tag` (string): Filter by tag
- `maturity` (enum): Filter by maturity level
- `limit` (int): Max results (default: 50)
- `offset` (int): Pagination offset (default: 0)
- `sort` (enum): Sort order (`relevance`, `downloads`, `rating`, `updated`, `created`)

**Example:** `GET /search?q=react&tier=FREE&sort=downloads`

**Response:**
```json
{
  "query": "react",
  "filters": {
    "tier": "FREE"
  },
  "sort": "downloads",
  "total": 15,
  "offset": 0,
  "limit": 50,
  "results": [
    { /* pack summary */ }
  ]
}
```

#### `GET /categories`

List all available categories.

**Response:**
```json
{
  "categories": [
    {
      "name": "frontend",
      "display": "Frontend",
      "count": 45
    },
    {
      "name": "backend",
      "display": "Backend",
      "count": 38
    }
  ]
}
```

#### `GET /tags`

List all available tags.

**Response:**
```json
{
  "tags": [
    {
      "name": "react",
      "count": 12
    },
    {
      "name": "typescript",
      "count": 28
    }
  ]
}
```

## Search Implementation

### Full-Text Search

Search indexes the following fields with different weights:

- **name** (weight: 10)
- **keywords** (weight: 8)
- **description** (weight: 5)
- **short_description** (weight: 7)
- **categories** (weight: 6)
- **tags** (weight: 6)

### Ranking Algorithm

Results are ranked by:

1. **Relevance score** (based on field weights and query matching)
2. **Download count** (popularity signal)
3. **Rating** (quality signal)
4. **Freshness** (recently updated packs boosted slightly)

### Filters

All filters are applied with AND logic:

```
Results = (query match) AND (tier filter) AND (category filter) AND (tag filter) AND (maturity filter)
```

### Faceted Search

API returns facet counts for all filters:

```json
{
  "results": [ /* ... */ ],
  "facets": {
    "tiers": {
      "FREE": 45,
      "PRO": 12,
      "ENTERPRISE": 3
    },
    "categories": {
      "frontend": 30,
      "backend": 20
    },
    "maturity": {
      "stable": 40,
      "beta": 15,
      "alpha": 5
    }
  }
}
```

## Version Resolution Algorithm

### Input

- Requested pack with version range (e.g., `react-19-pack@^1.2.0`)
- Installed packs with their versions
- Dependency tree

### Algorithm

```
1. Parse version range
2. Fetch available versions from marketplace
3. Filter versions matching the range
4. Sort versions in descending order (highest first)
5. For each candidate version (starting with highest):
   a. Check NXTG-Forge compatibility
   b. Check dependency compatibility
   c. Resolve dependencies recursively
   d. Detect circular dependencies
   e. Build dependency graph
   f. If all checks pass, select this version
6. If no compatible version found, report error
7. Return selected version and dependency tree
```

### Dependency Deduplication

When multiple packs depend on the same pack:

```
user-request: react-19-pack@^1.2.0
  ├── typescript-pack@^5.0.0
  └── testing-pack@^2.1.0
      └── typescript-pack@^5.2.0

Resolution:
  - react-19-pack: 1.2.3
  - typescript-pack: 5.3.0 (highest version satisfying both ^5.0.0 and ^5.2.0)
  - testing-pack: 2.1.5
```

If incompatible versions are required, installation fails with conflict error.

### Circular Dependency Detection

```
A depends on B
B depends on C
C depends on A  ← Circular dependency detected

Error: Circular dependency detected: A → B → C → A
```

## Rating and Review System (Future)

### Rating Submission

**Endpoint:** `POST /packs/:name/ratings`

**Request:**
```json
{
  "rating": 5,
  "comment": "Excellent pack! Saved me hours.",
  "version": "1.2.3"
}
```

### Review Moderation

- User authentication required
- One rating per user per pack
- Reviews flagged for spam/abuse
- Author responses allowed

## Installation Verification

### Checksum Validation

```bash
# Download tarball
curl -L https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz -o pack.tar.gz

# Download checksum
curl -L https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz.sha256 -o pack.tar.gz.sha256

# Verify
sha256sum -c pack.tar.gz.sha256
```

### Signature Verification (Optional)

```bash
# Download signature
curl -L https://cdn.nxtg.ai/packs/react-19-pack-1.2.3.tar.gz.sig -o pack.tar.gz.sig

# Verify with GPG
gpg --verify pack.tar.gz.sig pack.tar.gz
```

## Cache Strategy

### Client-Side Cache

CLI caches catalog data locally:

```
~/.claude/forge/marketplace-cache/
  ├── catalog.json             (TTL: 1 hour)
  ├── packs/
  │   ├── react-19-pack.json   (TTL: 6 hours)
  │   └── ...
  └── search-cache/            (TTL: 1 hour)
      └── query-hash.json
```

### Cache Invalidation

- User can force refresh with `--refresh` flag
- Cache auto-expires based on TTL
- Cache cleared on pack install/update

## Distribution Channels

### FREE Tier

- Hosted on GitHub Releases or public CDN
- No authentication required
- Public download statistics

### PRO Tier

- Hosted on NXTG CDN
- Requires license key validation
- Download statistics private

### ENTERPRISE Tier

- Private distribution
- Custom hosting options
- VPN/network restrictions supported

## Metrics and Analytics

### Tracked Metrics

- Download count (total, monthly, weekly)
- Install count (active installations)
- Search impressions
- Click-through rate
- Update frequency
- Uninstall rate

### Privacy

- No personal data collected
- Aggregated statistics only
- Optional telemetry (user can opt-out)

## Error Codes

| Code | Description |
|------|-------------|
| 404  | Pack not found |
| 409  | Version conflict (incompatible dependencies) |
| 410  | Pack deprecated/removed |
| 422  | Invalid version range |
| 429  | Rate limit exceeded |
| 451  | Pack unavailable in region (licensing) |
| 500  | Server error |

## Future Enhancements

1. **GraphQL API**: More flexible querying
2. **Webhooks**: Notify on pack updates
3. **Pack Bundles**: Install multiple packs together
4. **Recommended Packs**: ML-based recommendations
5. **Pack Badges**: Quality/security badges
6. **Changelog Feed**: RSS feed of updates
7. **Pack Analytics Dashboard**: For authors
8. **A/B Testing**: For pack descriptions/keywords

---

**See Also:**
- [Skill-Pack Format](./SKILL-PACK-FORMAT.md)
- [Marketplace Commands](./MARKETPLACE-COMMANDS.md)
- [Skill-Pack Tiers](./SKILL-PACK-TIERS.md)

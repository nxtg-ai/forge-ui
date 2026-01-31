---
hook_type: UserPromptSubmit
description: Validates environment configuration for common pitfalls learned from debugging sessions
---

# Environment Validator Hook

Runs on session start to catch configuration issues before they cause problems.

## Validation: Multi-Device API Access

Check if `.env` has hardcoded localhost URLs that will break multi-device access:

```bash
#!/bin/bash
# Check for hardcoded localhost API URLs in .env
if [ -f ".env" ]; then
  # Look for uncommented VITE_API_URL or VITE_WS_URL with localhost
  if grep -E "^VITE_(API|WS)_URL.*localhost" .env 2>/dev/null | grep -v "^#" > /dev/null; then
    echo "[Warning] .env contains hardcoded localhost URLs"
    echo "[Info] This will break multi-device access (mobile, tablet, other PCs)"
    echo "[Fix] Comment out VITE_API_URL and VITE_WS_URL in .env"
    echo "[Learn] See .claude/skills/dev-environment-patterns.md"
  fi
fi
```

## Validation: Server Binding

Check if vite.config.ts binds to 0.0.0.0 for network access:

```bash
#!/bin/bash
if [ -f "vite.config.ts" ]; then
  if ! grep -q "host.*0.0.0.0" vite.config.ts 2>/dev/null; then
    echo "[Info] vite.config.ts may not be configured for network access"
    echo "[Info] Add host: '0.0.0.0' to server config for multi-device dev"
  fi
fi
```

## Why This Hook Exists

**Date Added**: 2026-01-31
**Trigger**: Debugging session where multi-device access failed due to hardcoded localhost URLs

This hook embodies the "learn from every interaction" principle - catching configuration issues proactively so they don't waste debugging time again.

## Related Skills

- `.claude/skills/dev-environment-patterns.md` - Full documentation of the pattern
- `docs/GETTING-STARTED.md` - User-facing troubleshooting guide

# NXTG-Forge Deployment Guide

## Overview

NXTG-Forge uses GitHub Actions for CI/CD with the following workflows:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `quality-gates.yml` | Push to main/develop, PRs | Run tests, lint, security checks |
| `staging.yml` | Push to develop/release/*, PRs to main | Full staging build with all tests |
| `deploy.yml` | Version tags (`v*.*.*`), manual | Build and create GitHub Release |

## Release Process

### 1. Prepare Release

Ensure all quality gates pass on `main` branch:

```bash
# Run quality checks locally
npm run quality:gates

# Verify tests pass
npm run test -- --run

# Check security
npm run audit:security
```

### 2. Create Release Tag

```bash
# Update version in package.json (if not already done)
npm version patch  # or minor, major

# Push tag to trigger release
git push --tags
```

### 3. Manual Release (Alternative)

Use GitHub Actions UI:
1. Go to Actions → "Deploy & Release"
2. Click "Run workflow"
3. Enter version (e.g., `3.0.1`)
4. Optionally mark as pre-release
5. Click "Run workflow"

### 4. Verify Release

After workflow completes:
1. Check [Releases](../../releases) page
2. Download and verify checksums
3. Test installation from release artifacts

---

## Rollback Procedure

### Immediate Rollback (< 1 hour)

If issues are found immediately after release:

```bash
# Delete the problematic release
gh release delete vX.Y.Z --yes

# Delete the tag
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# Users should use previous release
```

### Standard Rollback

If issues are found after users have adopted the release:

```bash
# Create a new patch release with the fix
git checkout -b hotfix/vX.Y.Z+1
# ... make fixes ...
git commit -m "fix: Resolve issue from vX.Y.Z"
git push origin hotfix/vX.Y.Z+1

# Create PR, merge, and tag new release
npm version patch
git push --tags
```

### Emergency Rollback

For critical security issues:

1. **Immediately** mark release as pre-release or delete it
2. Notify users via GitHub Discussions/Issues
3. Create hotfix release ASAP
4. Post-mortem after resolution

```bash
# Mark as pre-release (hides from latest)
gh release edit vX.Y.Z --prerelease

# Or delete entirely
gh release delete vX.Y.Z --yes
```

---

## Environment Configuration

### Required Secrets

None required for basic GitHub Releases. The `GITHUB_TOKEN` is automatically provided.

### Optional Secrets

| Secret | Purpose | When Needed |
|--------|---------|-------------|
| `CODECOV_TOKEN` | Upload coverage to Codecov | If using Codecov |
| `NPM_TOKEN` | Publish to npm | If publishing to npm |
| `DOCKER_USERNAME` | Push to Docker Hub | If using Docker |
| `DOCKER_PASSWORD` | Push to Docker Hub | If using Docker |

### Environment Variables

Production builds use these defaults:

```env
NODE_ENV=production
```

---

## Quality Gates

All releases must pass these gates:

| Gate | Threshold | Enforced |
|------|-----------|----------|
| Tests | 100% pass | ✅ Yes |
| Coverage | ≥85% lines | ✅ Yes |
| Security | 0 critical issues | ✅ Yes |
| Security | ≤5 high issues | ✅ Yes |
| Type Safety | 0 any violations | ✅ Yes |
| Build | Must succeed | ✅ Yes |

---

## Troubleshooting

### Build Fails

1. Check workflow logs for specific error
2. Run locally: `npm run build && npm run build:server`
3. Verify Node.js version matches (18.x)

### Tests Fail

1. Run locally: `npm run test -- --run`
2. Check for environment-specific issues
3. Verify no flaky tests

### Security Audit Fails

1. Run locally: `npm run audit:security`
2. Check `.claude/reports/security-audit.json` for details
3. Fix critical/high issues before release

### Release Not Created

1. Verify tag format: `vX.Y.Z` (e.g., `v3.0.1`)
2. Check workflow permissions (needs `contents: write`)
3. Verify no existing release with same tag

---

## Monitoring Releases

### GitHub Release Metrics

- Download counts visible on Releases page
- Star/watch trends indicate adoption

### Post-Release Checklist

- [ ] Release artifacts downloadable
- [ ] Checksums match
- [ ] Installation instructions work
- [ ] No immediate bug reports
- [ ] Announcement posted (if major release)

---

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### Pre-release Versions

- `v3.1.0-alpha.1` - Early testing
- `v3.1.0-beta.1` - Feature complete, testing
- `v3.1.0-rc.1` - Release candidate

---

## Quick Reference

```bash
# Create patch release
npm version patch && git push --tags

# Create minor release
npm version minor && git push --tags

# Create major release
npm version major && git push --tags

# Delete release (emergency)
gh release delete vX.Y.Z --yes && git push origin :refs/tags/vX.Y.Z

# View release status
gh release list
```

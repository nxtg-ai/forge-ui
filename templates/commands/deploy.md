# Deploy Command

Deploy applications to production or staging environments with full validation and rollback capabilities.

## Usage

```bash
/deploy [environment] [--validate-only] [--skip-tests] [--rollback] [--dry-run]
```

## Arguments

- `environment`: Target environment (production, staging, development)
- `--validate-only`: Run pre-deployment validation only
- `--skip-tests`: Skip running tests (not recommended)
- `--rollback`: Rollback to previous deployment
- `--dry-run`: Simulate deployment without making changes

## Pre-Deployment Checklist

Before deploying, this command ensures:

1. All tests pass
2. Code quality checks pass
3. Security vulnerabilities scanned
4. Dependencies updated and audited
5. Environment variables configured
6. Database migrations ready
7. Backup created
8. Monitoring configured

## Deployment Workflow

### Phase 1: Pre-Deployment Validation

```bash
# Run all tests
npm test || pytest || cargo test

# Check code quality
npm run lint || flake8 || cargo clippy

# Security scan
npm audit || safety check || cargo audit

# Build verification
npm run build || python setup.py build || cargo build --release
```

### Phase 2: Environment Preparation

```bash
# Backup current deployment
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz /path/to/app

# Database backup
pg_dump database_name > backup-$(date +%Y%m%d-%H%M%S).sql

# Check environment variables
env | grep -E 'API_KEY|DATABASE_URL|SECRET'
```

### Phase 3: Build and Package

```bash
# Frontend build
npm run build
npm run optimize

# Backend build
docker build -t app:$(git rev-parse --short HEAD) .

# Create deployment package
tar -czf deploy-$(git rev-parse --short HEAD).tar.gz dist/
```

### Phase 4: Deploy

```bash
# Stop current services
systemctl stop app || docker-compose down

# Deploy new version
cp -r dist/* /var/www/app/
docker-compose up -d

# Run database migrations
npm run migrate || alembic upgrade head

# Start services
systemctl start app
```

### Phase 5: Post-Deployment Validation

```bash
# Health check
curl -f http://localhost:8080/health || exit 1

# Smoke tests
npm run smoke-test

# Monitor logs
tail -f /var/log/app/app.log

# Performance check
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/status
```

### Phase 6: Rollback (If Needed)

```bash
# Stop failed deployment
systemctl stop app

# Restore backup
tar -xzf backup-TIMESTAMP.tar.gz -C /

# Restore database
psql database_name < backup-TIMESTAMP.sql

# Restart services
systemctl start app
```

## Environment-Specific Configurations

### Production

```json
{
  "environment": "production",
  "validation": {
    "require_tests": true,
    "require_review": true,
    "require_approval": true
  },
  "deployment": {
    "strategy": "blue-green",
    "rollback_enabled": true,
    "backup_required": true
  },
  "monitoring": {
    "alerts_enabled": true,
    "log_level": "warn",
    "metrics_enabled": true
  }
}
```

### Staging

```json
{
  "environment": "staging",
  "validation": {
    "require_tests": true,
    "require_review": false,
    "require_approval": false
  },
  "deployment": {
    "strategy": "rolling",
    "rollback_enabled": true,
    "backup_required": false
  },
  "monitoring": {
    "alerts_enabled": false,
    "log_level": "debug",
    "metrics_enabled": true
  }
}
```

### Development

```json
{
  "environment": "development",
  "validation": {
    "require_tests": false,
    "require_review": false,
    "require_approval": false
  },
  "deployment": {
    "strategy": "direct",
    "rollback_enabled": false,
    "backup_required": false
  },
  "monitoring": {
    "alerts_enabled": false,
    "log_level": "debug",
    "metrics_enabled": false
  }
}
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run validation tests
3. Switch traffic from "blue" to "green"
4. Keep "blue" for instant rollback
5. After 24h stability, decommission "blue"

### Rolling Deployment

1. Deploy to 25% of instances
2. Monitor for 10 minutes
3. Deploy to 50% of instances
4. Monitor for 10 minutes
5. Deploy to 100% of instances

### Canary Deployment

1. Deploy to 5% of traffic
2. Monitor key metrics
3. Gradually increase to 100%
4. Rollback if errors detected

## Monitoring and Alerts

Post-deployment monitoring includes:

```bash
# CPU and Memory
top -b -n 1 | head -20

# Disk usage
df -h

# Network connections
netstat -an | grep LISTEN

# Application logs
journalctl -u app -f

# Error rates
grep ERROR /var/log/app/app.log | wc -l

# Response times
curl -w "Time: %{time_total}s\n" -o /dev/null -s http://localhost:8080
```

## Security Checks

```bash
# SSL certificate validation
openssl s_client -connect domain.com:443 -servername domain.com

# Security headers
curl -I https://domain.com

# Dependency vulnerabilities
npm audit --production
pip-audit
cargo audit

# Secrets detection
gitleaks detect --source .
```

## Rollback Procedures

### Automatic Rollback Triggers

- Health check fails for 3 consecutive checks
- Error rate exceeds 5%
- Response time increases by 200%
- Manual rollback requested

### Rollback Steps

1. Stop new deployment
2. Restore previous version from backup
3. Restore database from snapshot
4. Restart services
5. Verify health checks pass
6. Notify team

## Post-Deployment Report

After deployment, generate report:

```markdown
# Deployment Report

- Timestamp: 2025-01-07T12:00:00Z
- Environment: production
- Version: v1.2.3
- Commit: abc123
- Deployed By: user@example.com

## Validation Results
- Tests: PASSED
- Security Scan: PASSED
- Build: PASSED

## Deployment Metrics
- Duration: 5m 32s
- Downtime: 0s (blue-green)
- Errors: 0

## Health Checks
- API: HEALTHY
- Database: HEALTHY
- Cache: HEALTHY

## Performance
- Response Time: 45ms (avg)
- Throughput: 1000 req/s
- Error Rate: 0.01%
```

## Integration with CI/CD

This command integrates with:

- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Travis CI

Example GitHub Action:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        run: |
          claude /deploy production
```

## Error Recovery

Common deployment errors and fixes:

1. Database migration fails: Rollback and fix migration
2. Health check fails: Check logs, rollback if critical
3. Build fails: Fix build errors, redeploy
4. Dependency conflicts: Update dependencies, test locally

## Best Practices

1. Always run tests before deploying
2. Deploy during low-traffic periods
3. Monitor for at least 1 hour post-deployment
4. Keep backups for at least 30 days
5. Document all manual steps
6. Use infrastructure as code
7. Automate rollbacks
8. Test rollback procedures regularly

## See Also

- `/checkpoint` - Create deployment checkpoint
- `/restore` - Restore from checkpoint
- `/status` - Check deployment status

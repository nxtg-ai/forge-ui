---
name: nxtg-deploy
description: Deploy application with automated checks
category: operations
---

Deploy your application with comprehensive pre-flight checks and monitoring.

## Deployment Process

1. **Pre-flight Checks**
   - All tests passing
   - No security vulnerabilities
   - Dependencies up to date
   - Build successful

2. **Deployment Steps**
   - Build production artifacts
   - Run database migrations
   - Deploy to target environment
   - Smoke tests
   - Monitor initial metrics

3. **Rollback Ready**
   - Automatic rollback on failure
   - Previous version retained
   - Database rollback scripts

## Supported Targets

- Docker containers
- Kubernetes clusters
- Cloud platforms (AWS, GCP, Azure)
- Traditional servers
- Serverless functions

Safety first: Every deployment is validated and reversible.
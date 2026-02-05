# Skill-Pack Tiers Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2026-02-04

## Overview

NXTG-Forge skill-packs are distributed across three tiers: FREE, PRO, and ENTERPRISE. Each tier serves different use cases and includes different levels of content, support, and licensing.

## Tier Comparison Matrix

| Feature | FREE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| **License** | Open Source (MIT, Apache, etc.) | Commercial | Custom/Private |
| **Price** | $0 | $X/month per seat | Custom pricing |
| **Distribution** | Public (GitHub, CDN) | NXTG Marketplace | Private registry |
| **Support** | Community | Email + Priority | Dedicated + SLA |
| **Updates** | Best effort | Regular releases | Custom schedule |
| **Source Code** | Always available | Optional | Optional |
| **Customization** | Fork yourself | Request features | Full customization |
| **Analytics** | Public download stats | Private analytics | Custom metrics |
| **Security Scanning** | Community | Automated | Automated + Manual |
| **Compliance** | None | Basic | SOC2, HIPAA, etc. |

## FREE Tier

### Purpose

Provide comprehensive coverage of common technology stacks with standard best practices and patterns. Make NXTG-Forge immediately useful out of the box.

### Licensing

- Must use OSI-approved open source license
- Recommended licenses: MIT, Apache-2.0, BSD-3-Clause
- Source code must be publicly available
- Free to use, modify, and distribute

### Content Scope

#### Included

**General-Purpose Tech Stacks:**
- **Frontend**: React, Vue, Angular, Svelte, SolidJS
- **Backend**: Node.js, Python (Django, Flask, FastAPI), Ruby (Rails), Go, Rust
- **Mobile**: React Native, Flutter, SwiftUI basics
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis
- **DevOps**: Docker, Kubernetes basics, CI/CD fundamentals
- **Testing**: Jest, Pytest, Vitest, Cypress, Playwright
- **Languages**: JavaScript, TypeScript, Python, Go, Rust, Java, C#

**Standard Patterns:**
- MVC, MVVM architecture
- REST API design
- Basic authentication (JWT, sessions)
- CRUD operations
- Database migrations
- Unit testing patterns
- Integration testing basics

**General Best Practices:**
- Code organization and structure
- Error handling
- Logging fundamentals
- Version control (Git)
- Documentation standards
- Accessibility basics (WCAG)
- Performance fundamentals

#### Not Included (Reserved for PRO/ENTERPRISE)

- Advanced optimization techniques
- Specific pitfall avoidance strategies
- Industry-specific patterns (fintech, healthcare, etc.)
- Enterprise architecture patterns
- Advanced security hardening
- Compliance-specific guidance
- Company-specific conventions

### Quality Standards

- Accurate and up-to-date information
- Clear examples and explanations
- Community-reviewed content
- Regular updates (best effort)

### Example FREE Packs

1. **react-19-pack** (MIT)
   - React 19 fundamentals
   - Hooks patterns
   - Component composition
   - Server Components basics
   - Testing with RTL

2. **typescript-pack** (MIT)
   - TypeScript fundamentals
   - Type safety patterns
   - Generics usage
   - Configuration best practices
   - Common typing patterns

3. **nodejs-api-pack** (MIT)
   - Express/Fastify basics
   - REST API design
   - Authentication fundamentals
   - Database integration
   - Error handling

4. **python-fastapi-pack** (MIT)
   - FastAPI fundamentals
   - Pydantic models
   - Async patterns
   - Testing with pytest
   - API documentation

5. **docker-pack** (MIT)
   - Dockerfile best practices
   - Docker Compose
   - Container optimization
   - Multi-stage builds
   - Security basics

### Support

- Community support via GitHub Discussions
- Issue tracking on GitHub
- Community-contributed improvements
- Documentation wiki

### Distribution

- Hosted on GitHub as open source repositories
- Distributed via GitHub Releases
- Available through public CDN
- Listed in public marketplace catalog

---

## PRO Tier

### Purpose

Provide advanced, battle-tested knowledge that helps developers avoid common pitfalls and implement production-grade solutions efficiently.

### Licensing

- Commercial license
- Licensed per-seat or per-team
- Source code access optional (depending on license agreement)
- Redistribution restricted

### Pricing Model (Example)

- **Individual**: $29/month (1 developer)
- **Team**: $99/month (up to 5 developers)
- **Organization**: $299/month (up to 20 developers)
- **Volume**: Custom pricing for 20+ developers

### Content Scope

#### Included (Everything in FREE, plus)

**Advanced Patterns:**
- Performance optimization strategies
- Scalability patterns (caching, sharding, load balancing)
- Security hardening techniques
- Advanced authentication (OAuth2, SAML, SSO)
- Microservices architecture
- Event-driven architecture
- CQRS and Event Sourcing
- DDD (Domain-Driven Design) patterns

**Pitfall Avoidance:**
- Common anti-patterns and how to avoid them
- Performance gotchas specific to each framework
- Security vulnerabilities and mitigations
- Memory leak prevention
- Race condition handling
- N+1 query problems and solutions
- Dependency injection pitfalls

**Production Readiness:**
- Monitoring and observability patterns
- Logging best practices (structured logging, log aggregation)
- Alerting strategies
- Graceful shutdown patterns
- Health checks and readiness probes
- Circuit breakers and retry logic
- Rate limiting and throttling

**Advanced Testing:**
- Test coverage strategies
- Mutation testing
- Property-based testing
- Contract testing
- Load testing patterns
- Chaos engineering basics

**Industry-Specific Patterns:**
- Fintech: Payment processing, transaction handling, audit trails
- E-commerce: Cart management, inventory, order processing
- SaaS: Multi-tenancy, billing, user management
- Media: CDN integration, streaming, transcoding
- Analytics: Data pipelines, warehousing, reporting

**Framework-Specific Deep Dives:**
- React: Advanced state management (Zustand, Jotai), render optimization
- Next.js: ISR, SSG, edge functions, middleware
- NestJS: Modules, guards, interceptors, custom decorators
- Django: ORM optimization, custom middleware, signals
- Kubernetes: Advanced deployment strategies, operators, service mesh

### Quality Standards

- Expert-reviewed content
- Real-world case studies
- Regular updates (monthly releases)
- Automated testing of code examples
- Professional copyediting
- Version compatibility testing

### Example PRO Packs

1. **react-pro-pack** (Commercial)
   - Render optimization techniques
   - Memory leak prevention in React
   - Server Component performance patterns
   - Advanced state management comparisons
   - Production monitoring integration

2. **nextjs-pro-pack** (Commercial)
   - ISR/SSG optimization strategies
   - Edge runtime patterns
   - Advanced caching strategies
   - Image optimization deep dive
   - Performance monitoring

3. **fintech-pack** (Commercial)
   - Payment gateway integration patterns
   - Transaction atomicity patterns
   - Audit trail implementation
   - Regulatory compliance (PCI-DSS)
   - Financial calculations (precision handling)

4. **kubernetes-pro-pack** (Commercial)
   - Advanced deployment strategies (blue-green, canary)
   - Custom operators
   - Service mesh integration (Istio, Linkerd)
   - Multi-cluster management
   - Cost optimization

5. **security-hardening-pack** (Commercial)
   - OWASP Top 10 mitigations
   - Input validation patterns
   - Secrets management
   - API security best practices
   - Security testing automation

### Support

- Email support (48-hour response time)
- Priority bug fixes
- Feature request consideration
- Dedicated Slack/Discord channel
- Monthly Q&A sessions
- Access to experts

### Distribution

- Hosted on NXTG CDN (private)
- License key required for download
- Private analytics dashboard
- Version update notifications

### License Verification

```bash
# Install PRO pack with license key
/frg-marketplace install react-pro-pack --license-key XXXXX-XXXXX-XXXXX

# License key stored in:
~/.claude/forge/licenses.json

# Validation occurs on:
# - Initial install
# - Pack updates
# - Periodic checks (weekly)
```

### License Enforcement

- License key validated against marketplace API
- Offline grace period: 30 days
- Seat limit enforced
- License expiration warnings
- Automatic renewal (if subscription active)

---

## ENTERPRISE Tier

### Purpose

Provide customized skill-packs aligned with organization-specific needs, including proprietary patterns, compliance requirements, and private agent libraries.

### Licensing

- Custom licensing agreements
- Unlimited seats (or seat-based pricing)
- Source code access included
- Customization rights
- Private hosting options

### Pricing Model

- Custom pricing based on:
  - Number of developers
  - Level of customization
  - Support requirements
  - Compliance needs
  - Private agent development

- Typical range: $5,000 - $50,000+ per year

### Content Scope

#### Included (Everything in FREE + PRO, plus)

**Organization-Specific Patterns:**
- Internal framework conventions
- Proprietary architecture patterns
- Company-specific security policies
- Custom deployment workflows
- Internal tooling integration

**Compliance-Focused Packs:**
- SOC2 compliance patterns
- HIPAA compliance for healthcare
- GDPR compliance for EU operations
- ISO 27001 security standards
- PCI-DSS for payment processing
- FedRAMP for government contracts

**Private Agent Libraries:**
- Custom agents for organization workflows
- Integration with internal systems
- Proprietary domain expertise
- Legacy system agents

**Advanced Customization:**
- Custom templates for org standards
- Branded documentation
- Internal API integration
- Custom validation rules

**Dedicated Development:**
- Custom skill-pack creation
- Ongoing maintenance and updates
- Quarterly reviews and improvements

### Quality Standards

- Dedicated quality assurance
- Continuous updates
- Security audits
- Compliance reviews
- Custom testing requirements

### Example ENTERPRISE Packs

1. **acme-corp-internal-pack** (Private)
   - ACME internal API patterns
   - Company-specific security policies
   - Custom deployment to ACME infrastructure
   - Internal monitoring integration
   - ACME coding standards

2. **healthcare-hipaa-pack** (Private)
   - HIPAA compliance patterns
   - PHI handling best practices
   - Audit logging requirements
   - Encryption standards
   - Access control patterns

3. **fintech-pci-pack** (Private)
   - PCI-DSS compliance
   - Cardholder data handling
   - Secure coding for payments
   - PCI audit preparation
   - Tokenization patterns

4. **government-fedramp-pack** (Private)
   - FedRAMP compliance
   - Government cloud patterns
   - Security controls (NIST 800-53)
   - Continuous monitoring
   - Incident response

5. **legacy-mainframe-pack** (Private)
   - COBOL integration patterns
   - Mainframe modernization
   - JCL to modern CI/CD
   - DB2 integration
   - Custom migration strategies

### Support

- Dedicated support engineer
- SLA guarantees (4-hour response time)
- Direct access to pack authors
- Custom training sessions
- On-site workshops (optional)
- Quarterly business reviews

### Distribution

- Private registry (self-hosted or NXTG-hosted)
- VPN access required (optional)
- Air-gapped installation support
- Custom CDN integration
- Version control integration (private Git)

### Custom Development Process

1. **Discovery Phase** (1-2 weeks)
   - Requirements gathering
   - Use case analysis
   - Compliance review
   - Existing pattern audit

2. **Design Phase** (1-2 weeks)
   - Architecture design
   - Agent definition
   - Template creation
   - Review and approval

3. **Development Phase** (2-4 weeks)
   - Pack implementation
   - Testing and validation
   - Documentation
   - Internal review

4. **Deployment Phase** (1 week)
   - Pilot deployment
   - User training
   - Feedback collection
   - Production rollout

5. **Maintenance Phase** (Ongoing)
   - Quarterly updates
   - Bug fixes
   - Feature additions
   - Compliance updates

---

## Tier Migration

### FREE → PRO

Users can upgrade seamlessly:

```bash
# Uninstall FREE pack
/frg-marketplace remove react-19-pack

# Install PRO pack with license
/frg-marketplace install react-pro-pack --license-key XXXXX

# Configuration migrates automatically
```

### PRO → ENTERPRISE

Requires custom onboarding:

1. Contact sales team
2. Requirements gathering
3. Custom pack development
4. Private registry setup
5. Team training

### Downgrade (PRO → FREE)

Users can downgrade:

```bash
# Uninstall PRO pack
/frg-marketplace remove react-pro-pack

# Install FREE pack
/frg-marketplace install react-19-pack

# Warning: Advanced features not available
```

---

## Content Guidelines by Tier

### What Goes in Each Tier

| Content Type | FREE | PRO | ENTERPRISE |
|--------------|------|-----|------------|
| Basic syntax and API usage | ✓ | ✓ | ✓ |
| Common patterns | ✓ | ✓ | ✓ |
| Standard best practices | ✓ | ✓ | ✓ |
| Performance optimization | Basic | Advanced | Custom |
| Security guidance | Fundamentals | Hardening | Compliance |
| Error handling | Standard | Production-grade | Org-specific |
| Testing strategies | Unit/Integration | Advanced (mutation, property-based) | Custom frameworks |
| Architecture patterns | MVC, REST | Microservices, DDD, Event-driven | Proprietary |
| Industry-specific knowledge | - | Fintech, SaaS, E-commerce | Custom domains |
| Compliance guidance | - | Basic compliance | Full compliance (SOC2, HIPAA, etc.) |
| Pitfall avoidance | - | ✓ | ✓ |
| Monitoring/Observability | - | ✓ | Custom integration |
| Deployment strategies | Basic | Advanced | Org-specific |
| Company-specific patterns | - | - | ✓ |

---

## Revenue Model

### FREE Tier

- No direct revenue
- Marketing and adoption driver
- Community building
- Talent pipeline

### PRO Tier

- Subscription revenue
- Predictable recurring income
- Scalable (low marginal cost)
- Upsell to ENTERPRISE

### ENTERPRISE Tier

- High-value contracts
- Custom development revenue
- Ongoing maintenance contracts
- Professional services

### Target Revenue Mix (Year 3)

- FREE: 80% of users, 0% of revenue
- PRO: 18% of users, 40% of revenue
- ENTERPRISE: 2% of users, 60% of revenue

---

## Competitive Positioning

### FREE Tier

**Competes with:**
- Stack Overflow
- Documentation sites
- Free tutorials
- Open source examples

**Differentiation:**
- Integrated with NXTG-Forge workflow
- Agent-driven assistance
- Context-aware suggestions
- Multi-framework coverage

### PRO Tier

**Competes with:**
- Pluralsight, Frontend Masters (education)
- Specialized consulting
- Advanced books/courses

**Differentiation:**
- Just-in-time learning (in IDE)
- Production-ready patterns
- Pitfall avoidance focus
- Continuously updated

### ENTERPRISE Tier

**Competes with:**
- Internal tooling teams
- Consulting firms
- Training companies
- Custom development

**Differentiation:**
- Self-service with expert backing
- Scales across organization
- Lower cost than consulting
- Continuously maintained

---

**See Also:**
- [Skill-Pack Format](./SKILL-PACK-FORMAT.md)
- [Marketplace Specification](./MARKETPLACE-SPEC.md)
- [Marketplace Commands](./MARKETPLACE-COMMANDS.md)

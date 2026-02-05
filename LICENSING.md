# NXTG-Forge Licensing

## Open-Core Model

NXTG-Forge uses an **Open-Core licensing model** that balances community collaboration with sustainable business development. The core platform is free and open-source under the MIT license, while premium features and services require a commercial license.

This model allows developers to use, modify, and distribute the core technology freely, while supporting the development of advanced features for teams and enterprises.

---

## MIT Licensed (Core) - Free Forever

The following components are **MIT licensed** and completely free to use, modify, and distribute:

### Development Tools
- **CLI Tool**: Complete command-line interface for all core operations
- **Agent Framework**: Base agent system, orchestration, and communication protocols
- **22+ Base Agents**: All agents in the core repository (Forge Orchestrator, Builder, Planner, QA, Debugger, Security, etc.)

### Infinity Terminal
- **PTY Bridge**: WebSocket-based terminal with session persistence
- **xterm.js Integration**: Browser-based terminal interface
- **Multi-device Access**: Connect from any device on your network
- **Session Management**: Built-in reconnection and state preservation

### Governance & Quality
- **Governance HUD**: Real-time project health monitoring dashboard
- **Quality Gates**: Automated quality checks and metrics
- **Health Scoring**: Test coverage, security, documentation, and architecture analysis
- **Git Integration**: Branch management and commit quality tracking

### Core Infrastructure
- **Skill System**: Extensible skill framework for agents
- **Memory Persistence**: Long-term memory via claude-mem MCP server
- **State Management**: Project state tracking and governance
- **Task Orchestration**: Parallel agent execution system

### All Source Code
- Everything in this repository (`/home/axw/projects/NXTG-Forge/v3/`)
- Full TypeScript/React codebase
- Test suites and utilities
- Documentation and examples

---

## Commercial License (Pro) - Premium Features

The following features and services require a **commercial license**:

### NXTG Cloud (Hosted Service)
- Managed hosting with zero setup
- Automatic updates and maintenance
- 99.9% uptime SLA
- Dedicated support team
- Cloud storage and backups

### Team Collaboration
- Shared agent workspaces
- Team memory and knowledge sharing
- Collaborative governance dashboards
- Project templates and workflows
- Activity logging and audit trails

### Enterprise Features
- Single Sign-On (SSO) integration
- Role-based access control (RBAC)
- Custom agent deployment
- Private skill-pack repositories
- On-premise deployment options
- Enterprise support with SLA

### Premium Skill-Packs
- Advanced best-practices intelligence
- Framework-specific optimizations
- Pitfall-avoiding guidance
- Custom skill development
- Private agent libraries

---

## Skill-Pack Pricing Model

Skill-packs follow a tiered pricing model based on value and sophistication:

### Free Tier (MIT Licensed)
**Common technology stacks** - included with core:
- React, Vue, Angular, Svelte
- Node.js, Express, Fastify
- Python, Flask, Django
- TypeScript, JavaScript, Go, Rust
- PostgreSQL, MongoDB, Redis
- Docker, Git, npm/yarn/pnpm
- Jest, Pytest, Vitest, Playwright

### Pro Tier (Commercial)
**Best-practices infused** - require commercial license:
- Enterprise architecture patterns
- Security hardening guides
- Performance optimization techniques
- Accessibility compliance (WCAG 2.1 AA)
- Advanced testing strategies
- CI/CD pipeline templates
- Monitoring and observability

### Enterprise Tier (Commercial)
**Custom development** - dedicated support:
- Company-specific coding standards
- Internal framework knowledge
- Legacy system integration
- Compliance requirements (HIPAA, SOC2, GDPR)
- Custom agent personalities
- Private knowledge bases

---

## Contributing to NXTG-Forge

We welcome contributions to the MIT-licensed core platform.

### How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following our coding standards
4. **Run tests** (`npm test`) and ensure all pass
5. **Run quality checks** (`npm run lint`, `npm run typecheck`)
6. **Commit your changes** with clear messages
7. **Push to your fork** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request** with detailed description

### Contribution Guidelines

- **Code Quality**: All contributions must pass type checking, linting, and tests
- **Test Coverage**: New features require comprehensive test coverage (85%+ target)
- **Documentation**: Public APIs must be documented with JSDoc/TSDoc
- **Commit Style**: Follow conventional commits format (`feat:`, `fix:`, `docs:`, etc.)
- **License Agreement**: By contributing, you agree your code is MIT licensed

### What We Accept

- Bug fixes and error handling improvements
- New agent capabilities and skills
- Performance optimizations
- Documentation improvements
- Test coverage enhancements
- UI/UX improvements
- Accessibility enhancements

### What Goes to Commercial

Contributions to **team collaboration**, **cloud hosting**, or **enterprise features** may be considered for the commercial tier. We'll work with contributors to ensure proper attribution and compensation when appropriate.

---

## License Header Format

For new files created in this project, use the following header:

```typescript
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 NextGen AI (NXTG)
```

For Python files:

```python
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 NextGen AI (NXTG)
```

---

## FAQ

### Can I use NXTG-Forge commercially?

**Yes.** The MIT license allows commercial use of the core platform. You can:
- Use it in commercial projects
- Modify it for your business needs
- Distribute it as part of your product

You only need a commercial license for **Pro/Enterprise features** (cloud hosting, team features, SSO, premium skill-packs).

### Can I fork and create a competing product?

**Yes.** The MIT license permits this. We believe in open source and trust the community will choose the best solution. Competition drives innovation.

### Can I sell NXTG-Forge as a service?

**Yes,** you can offer NXTG-Forge hosting or consulting services. However:
- You cannot rebrand **Pro/Enterprise features** (they're not in this repo)
- You must retain the MIT license and copyright notices
- Consider contributing improvements back to the community

### What happens if NXTG stops development?

The **MIT license ensures** the core platform remains free forever. The community can continue development independently. All code is yours to use.

### How do I get a commercial license?

Contact **sales@nxtg.ai** for:
- NXTG Cloud access
- Team collaboration features
- Enterprise SSO and RBAC
- Premium skill-packs
- Custom development

Pricing is based on team size and features needed.

---

## Contact

- **Website**: [nxtg.ai](https://nxtg.ai)
- **GitHub**: [github.com/nxtg-ai/nxtg-forge](https://github.com/nxtg-ai/nxtg-forge)
- **Email**: hello@nxtg.ai
- **Sales**: sales@nxtg.ai
- **Support**: support@nxtg.ai

---

## Version History

- **2026-02-04**: Initial Open-Core licensing model established
- **2024**: Original MIT license applied to NXTG-Forge core

---

**Thank you for using NXTG-Forge. Together, we're building the future of AI-powered development.**

#!/usr/bin/env python3
"""NXTG-Forge Spec Generator

Interactive project specification builder
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import questionary
from questionary import Style
from rich.console import Console
from rich.panel import Panel


console = Console()

# Custom style for questionary
custom_style = Style(
    [
        ("qmark", "fg:#673ab7 bold"),
        ("question", "bold"),
        ("answer", "fg:#2196f3 bold"),
        ("pointer", "fg:#673ab7 bold"),
        ("highlighted", "fg:#673ab7 bold"),
        ("selected", "fg:#4caf50"),
        ("separator", "fg:#cc5454"),
        ("instruction", ""),
        ("text", ""),
    ],
)


class SpecGenerator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.answers: dict[str, Any] = {}

    def interactive_mode(self) -> str:
        """Interactive spec building through Q&A"""
        console.print(
            Panel.fit(
                "[bold cyan]Welcome to NXTG-Forge![/bold cyan]\n\n"
                "Let's build your project specification together.\n"
                "This will guide you through defining your project architecture.",
                title="NXTG-Forge Spec Generator",
                border_style="cyan",
            ),
        )

        # Project Basics
        console.print("\n[bold yellow]Project Basics[/bold yellow]\n")

        self.answers["project_name"] = questionary.text(
            "Project name?",
            default=self.project_root.name,
            style=custom_style,
        ).ask()

        self.answers["project_type"] = (
            questionary.select(
                "Project type?",
                choices=[
                    "web-app (Full-stack web application)",
                    "api (Backend API service)",
                    "cli (Command-line tool)",
                    "platform (Multi-service platform)",
                    "mobile (Mobile application)",
                    "library (Reusable library/package)",
                ],
                style=custom_style,
            )
            .ask()
            .split(" ")[0]
        )

        self.answers["description"] = questionary.text(
            "Brief description?",
            style=custom_style,
        ).ask()

        # Architecture
        console.print("\n[bold yellow]Architecture[/bold yellow]\n")

        self.answers["backend_language"] = questionary.select(
            "Backend language?",
            choices=["python", "node", "go", "rust", "java", "none"],
            style=custom_style,
        ).ask()

        if self.answers["backend_language"] != "none":
            frameworks = self._get_framework_choices(self.answers["backend_language"])
            self.answers["backend_framework"] = questionary.select(
                "Backend framework?",
                choices=frameworks,
                style=custom_style,
            ).ask()

        self.answers["database"] = questionary.select(
            "Database?",
            choices=["postgresql", "mysql", "mongodb", "sqlite", "none"],
            style=custom_style,
        ).ask()

        self.answers["cache"] = questionary.select(
            "Cache?",
            choices=["redis", "memcached", "none"],
            style=custom_style,
        ).ask()

        # Frontend (if applicable)
        if self.answers["project_type"] in ["web-app", "platform"]:
            console.print("\n[bold yellow]<� Frontend[/bold yellow]\n")

            self.answers["frontend_framework"] = questionary.select(
                "Frontend framework?",
                choices=["react", "vue", "svelte", "angular", "none"],
                style=custom_style,
            ).ask()

            if self.answers["frontend_framework"] != "none":
                self.answers["ui_library"] = questionary.select(
                    "UI library?",
                    choices=["tailwind", "mui", "chakra", "antd", "custom"],
                    style=custom_style,
                ).ask()

        # Infrastructure
        console.print("\n[bold yellow]=' Infrastructure[/bold yellow]\n")

        self.answers["deployment_target"] = questionary.select(
            "Deployment target?",
            choices=["docker", "kubernetes", "serverless", "vps", "heroku", "vercel"],
            style=custom_style,
        ).ask()

        self.answers["ci_cd"] = questionary.select(
            "CI/CD platform?",
            choices=["github-actions", "gitlab-ci", "jenkins", "circleci", "none"],
            style=custom_style,
        ).ask()

        # Features
        console.print("\n[bold yellow]( Features[/bold yellow]\n")

        self.answers["authentication"] = questionary.select(
            "Authentication?",
            choices=["jwt", "oauth", "session", "none"],
            style=custom_style,
        ).ask()

        self.answers["payment"] = questionary.select(
            "Payment processing?",
            choices=["stripe", "square", "paypal", "none"],
            style=custom_style,
        ).ask()

        self.answers["realtime"] = questionary.select(
            "Real-time features?",
            choices=["websocket", "sse", "polling", "none"],
            style=custom_style,
        ).ask()

        self.answers["file_storage"] = questionary.select(
            "File storage?",
            choices=["s3", "gcs", "azure-blob", "local", "none"],
            style=custom_style,
        ).ask()

        # Quality Standards
        console.print("\n[bold yellow] Quality Standards[/bold yellow]\n")

        self.answers["min_test_coverage"] = questionary.text(
            "Minimum test coverage % (default: 85)?",
            default="85",
            style=custom_style,
        ).ask()

        self.answers["linting"] = questionary.select(
            "Linting strictness?",
            choices=["strict", "moderate", "relaxed"],
            style=custom_style,
        ).ask()

        self.answers["type_checking"] = questionary.select(
            "Type checking?",
            choices=["strict", "moderate", "none"],
            style=custom_style,
        ).ask()

        # Save answers
        self._save_answers()

        # Generate spec from answers
        return self.from_answers(self.answers)

    def from_answers(self, answers: dict[str, Any]) -> str:
        """Generate spec markdown from answers"""
        self.answers = answers

        spec = f"""# {answers['project_name']} - Project Specification

> Generated by NXTG-Forge on {datetime.utcnow().strftime('%Y-%m-%d')}

## Overview

**Project Name:** {answers['project_name']}
**Type:** {answers['project_type']}
**Description:** {answers.get('description', 'No description provided')}

## Architecture

### Design Pattern
- **Pattern:** Clean Architecture
- **Layers:** Domain � Application � Infrastructure � Interface

### Technology Stack

#### Backend
- **Language:** {answers.get('backend_language', 'N/A')}
- **Framework:** {answers.get('backend_framework', 'N/A')}
- **Architecture:** Layered (Clean Architecture)

#### Database
- **Type:** {answers.get('database', 'none')}
- **ORM/Driver:** {self._get_orm(answers)}

#### Caching
- **Type:** {answers.get('cache', 'none')}

"""

        # Add frontend if applicable
        if answers.get("frontend_framework") and answers["frontend_framework"] != "none":
            spec += f"""#### Frontend
- **Framework:** {answers['frontend_framework']}
- **UI Library:** {answers.get('ui_library', 'custom')}
- **State Management:** {self._get_state_management(answers['frontend_framework'])}
- **Build Tool:** {self._get_build_tool(answers['frontend_framework'])}

"""

        # Infrastructure
        spec += f"""### Infrastructure

#### Deployment
- **Target:** {answers.get('deployment_target', 'docker')}
- **Container:** Docker + Docker Compose
- **Orchestration:** {self._get_orchestration(answers)}

#### CI/CD
- **Platform:** {answers.get('ci_cd', 'github-actions')}
- **Pipeline Stages:**
  1. Lint & Format
  2. Type Check
  3. Unit Tests
  4. Integration Tests
  5. Build
  6. Deploy (staging)
  7. E2E Tests
  8. Deploy (production)

## Features

### Core Features

#### 1. Authentication & Authorization
- **Method:** {answers.get('authentication', 'none')}
- **Features:**
  - User registration
  - Login/Logout
  - Password reset
  - Role-based access control (RBAC)
  - Session management

"""

        # Add payment if configured
        if answers.get("payment") and answers["payment"] != "none":
            spec += f"""#### 2. Payment Processing
- **Provider:** {answers['payment']}
- **Features:**
  - Payment intent creation
  - Subscription management
  - Webhook handling
  - Invoice generation
  - Payment history

"""

        # Add real-time if configured
        if answers.get("realtime") and answers["realtime"] != "none":
            spec += f"""#### 3. Real-time Communication
- **Protocol:** {answers['realtime']}
- **Use Cases:**
  - Live notifications
  - Real-time updates
  - Collaborative features

"""

        # Add file storage if configured
        if answers.get("file_storage") and answers["file_storage"] != "none":
            spec += f"""#### 4. File Management
- **Storage:** {answers['file_storage']}
- **Features:**
  - File upload
  - File download
  - Access control
  - Pre-signed URLs
  - CDN integration

"""

        # Quality standards
        spec += f"""## Quality Standards

### Testing
- **Minimum Coverage:** {answers.get('min_test_coverage', '85')}%
- **Testing Pyramid:**
  - Unit Tests: 70%
  - Integration Tests: 20%
  - E2E Tests: 10%

### Code Quality
- **Linting:** {answers.get('linting', 'strict')} mode
- **Type Checking:** {answers.get('type_checking', 'strict')}
- **Code Review:** Required for all PRs
- **Documentation:** Required for all public APIs

### Security
- **OWASP Compliance:** Top 10 vulnerabilities addressed
- **Dependency Scanning:** Automated via CI/CD
- **Secret Management:** Environment variables + vault
- **HTTPS:** Required in production
- **Rate Limiting:** Implemented on all public endpoints

## Development Workflow

### Git Workflow
- **Strategy:** Git Flow
- **Branches:**
  - `main` - Production
  - `develop` - Integration
  - `feature/*` - Features
  - `hotfix/*` - Urgent fixes

### Code Standards
- **Formatting:** Auto-formatted on commit
- **Naming:** {self._get_naming_convention(answers)}
- **Comments:** Required for complex logic
- **Commits:** Conventional Commits format

### Testing Strategy
- **TDD:** Encouraged for core features
- **Coverage:** Monitored in CI/CD
- **E2E:** Critical user flows only
- **Performance:** Load testing for APIs

## Documentation

### Required Documentation
1. **README.md** - Project overview & setup
2. **API Documentation** - OpenAPI/Swagger
3. **Architecture Diagrams** - System design
4. **Deployment Guide** - Production setup
5. **Development Guide** - Local setup
6. **Contributing Guide** - For contributors

## Deployment

### Environments
1. **Development** - Local development
2. **Staging** - Pre-production testing
3. **Production** - Live environment

### Deployment Process
1. Merge to `develop` � Auto-deploy to staging
2. Create release tag � Approval required
3. Deploy to production � Automated rollback on failure

### Monitoring
- **Logging:** Structured JSON logs
- **Metrics:** Prometheus + Grafana
- **Tracing:** OpenTelemetry
- **Alerts:** Critical errors only

## Success Metrics

### Technical Metrics
- Test coverage e {answers.get('min_test_coverage', '85')}%
- Build time < 10 minutes
- Deployment time < 5 minutes
- Zero critical vulnerabilities

### Performance Metrics
- API response time < 200ms (p95)
- Page load time < 2s
- Uptime e 99.9%

---

**Specification Status:** Draft
**Last Updated:** {datetime.utcnow().strftime('%Y-%m-%d')}
**Approved By:** Pending Review
"""

        return spec

    def validate_spec(self, spec_content: str) -> tuple[bool, list[str]]:
        """Validate spec completeness"""
        errors = []

        required_sections = [
            "# ",
            "## Overview",
            "## Architecture",
            "## Features",
            "## Quality Standards",
        ]

        for section in required_sections:
            if section not in spec_content:
                errors.append(f"Missing required section: {section}")

        return len(errors) == 0, errors

    def _get_framework_choices(self, language: str) -> list[str]:
        """Get framework choices for language"""
        frameworks = {
            "python": ["fastapi", "django", "flask", "sanic"],
            "node": ["express", "nestjs", "fastify", "koa"],
            "go": ["gin", "echo", "fiber", "chi"],
            "rust": ["axum", "actix-web", "rocket", "warp"],
            "java": ["spring-boot", "quarkus", "micronaut"],
        }
        return frameworks.get(language, ["custom"])

    def _get_orm(self, answers: dict[str, Any]) -> str:
        """Get ORM/driver based on language and database"""
        if answers.get("database") == "none":
            return "N/A"

        lang: str = answers.get("backend_language", "")
        db: str = answers.get("database", "")

        orms = {
            "python": {
                "postgresql": "SQLAlchemy + asyncpg",
                "mysql": "SQLAlchemy + aiomysql",
                "mongodb": "Motor",
                "sqlite": "SQLAlchemy + aiosqlite",
            },
            "node": {
                "postgresql": "Prisma / TypeORM",
                "mysql": "Prisma / TypeORM",
                "mongodb": "Mongoose",
                "sqlite": "Prisma",
            },
        }

        return orms.get(lang, {}).get(db, "Native driver")

    def _get_state_management(self, framework: str) -> str:
        """Get state management library"""
        state_libs = {
            "react": "Redux Toolkit / Zustand",
            "vue": "Pinia",
            "svelte": "Svelte stores",
            "angular": "NgRx",
        }
        return state_libs.get(framework, "Custom")

    def _get_build_tool(self, framework: str) -> str:
        """Get build tool"""
        build_tools = {"react": "Vite", "vue": "Vite", "svelte": "Vite", "angular": "Angular CLI"}
        return build_tools.get(framework, "Webpack")

    def _get_orchestration(self, answers: dict[str, Any]) -> str:
        """Get orchestration based on deployment target"""
        target = answers.get("deployment_target")
        if target == "kubernetes":
            return "Kubernetes + Helm"
        elif target == "docker":
            return "Docker Compose"
        else:
            return "N/A"

    def _get_naming_convention(self, answers: dict[str, Any]) -> str:
        """Get naming convention based on language"""
        lang: str = answers.get("backend_language", "")
        conventions = {
            "python": "snake_case",
            "node": "camelCase",
            "go": "camelCase (exported: PascalCase)",
            "rust": "snake_case",
            "java": "camelCase (classes: PascalCase)",
        }
        return conventions.get(lang, "Language-specific")

    def _save_answers(self):
        """Save answers to temp file for later use"""
        tmp_dir = self.project_root / ".claude" / "tmp"
        tmp_dir.mkdir(parents=True, exist_ok=True)

        answers_file = tmp_dir / "spec-answers.json"
        with open(answers_file, "w") as f:
            json.dump(self.answers, f, indent=2)


# CLI
if __name__ == "__main__":
    import sys

    generator = SpecGenerator()

    if len(sys.argv) > 1 and sys.argv[1] == "--from-answers":
        with open(sys.argv[2]) as f:
            answers = json.load(f)
        spec = generator.from_answers(answers)
    else:
        spec = generator.interactive_mode()

    # Output spec
    print(spec)

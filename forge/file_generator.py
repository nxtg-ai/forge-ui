#!/usr/bin/env python3
"""NXTG-Forge File Generator

Generates project files from specifications and templates
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn


console = Console()


class FileGenerator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.templates_dir = self.project_root / ".claude" / "templates"
        self.generated_files: list[str] = []

        # Setup Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.templates_dir)),
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
        )

        # Add custom filters
        self.jinja_env.filters["snake_case"] = self._snake_case
        self.jinja_env.filters["pascal_case"] = self._pascal_case
        self.jinja_env.filters["camel_case"] = self._camel_case
        self.jinja_env.filters["kebab_case"] = self._kebab_case

    def generate_from_spec(
        self,
        spec_content: str,
        template_set: str = "full",
        dry_run: bool = False,
    ) -> list[str]:
        """Generate project files from spec"""
        # Parse spec to extract configuration
        config = self._parse_spec(spec_content)

        # Determine which templates to use based on stack
        templates = self._select_templates(config, template_set)

        # Generate files
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Generating files...", total=len(templates))

            for template_info in templates:
                self._generate_file(template_info, config, dry_run)
                progress.advance(task)

        return self.generated_files

    def _parse_spec(self, spec_content: str) -> dict[str, Any]:
        """Parse spec markdown to extract configuration"""
        config = {
            "project_name": "my-project",
            "project_type": "web-app",
            "backend_language": "python",
            "backend_framework": "fastapi",
            "frontend_framework": "react",
            "database": "postgresql",
            "cache": "redis",
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Extract project name
        name_match = re.search(r"#\s+(.+?)\s+-\s+Project Specification", spec_content)
        if name_match:
            config["project_name"] = name_match.group(1).strip()

        # Extract type
        type_match = re.search(r"\*\*Type:\*\*\s+(.+)", spec_content)
        if type_match:
            config["project_type"] = type_match.group(1).strip()

        # Extract backend language
        lang_match = re.search(r"\*\*Language:\*\*\s+(.+)", spec_content)
        if lang_match:
            config["backend_language"] = lang_match.group(1).strip().lower()

        # Extract framework
        framework_match = re.search(r"\*\*Framework:\*\*\s+(.+)", spec_content)
        if framework_match:
            config["backend_framework"] = framework_match.group(1).strip().lower()

        # Extract database
        db_match = re.search(
            r"\*\*Type:\*\*\s+(postgresql|mysql|mongodb|sqlite)",
            spec_content,
            re.IGNORECASE,
        )
        if db_match:
            config["database"] = db_match.group(1).lower()

        # Extract frontend framework
        frontend_match = re.search(
            r"#### Frontend.*?\*\*Framework:\*\*\s+(.+)",
            spec_content,
            re.DOTALL,
        )
        if frontend_match:
            config["frontend_framework"] = frontend_match.group(1).split("\n")[0].strip().lower()

        return config

    def _select_templates(self, config: dict[str, Any], template_set: str) -> list[dict[str, str]]:
        """Select which templates to generate based on config"""
        templates = []

        # Backend templates
        backend_lang = config.get("backend_language")
        backend_framework = config.get("backend_framework")

        if backend_lang and backend_framework:
            backend_dir = f"backend/{backend_framework}"

            # Check if backend templates exist
            backend_template_dir = self.templates_dir / backend_dir
            if backend_template_dir.exists():
                templates.extend(self._scan_template_dir(backend_template_dir, backend_dir, config))

        # Frontend templates
        frontend_framework = config.get("frontend_framework")
        if frontend_framework and frontend_framework != "none":
            frontend_dir = f"frontend/{frontend_framework}"
            frontend_template_dir = self.templates_dir / frontend_dir

            if frontend_template_dir.exists():
                templates.extend(
                    self._scan_template_dir(frontend_template_dir, frontend_dir, config),
                )

        # Infrastructure templates
        infra_dir = "infrastructure"
        infra_template_dir = self.templates_dir / infra_dir
        if infra_template_dir.exists():
            templates.extend(self._scan_template_dir(infra_template_dir, infra_dir, config))

        return templates

    def _scan_template_dir(
        self,
        template_dir: Path,
        template_prefix: str,
        config: dict[str, Any],
    ) -> list[dict[str, str]]:
        """Scan directory for templates"""
        templates = []

        for template_file in template_dir.rglob("*.j2"):
            # Calculate relative path
            rel_path = template_file.relative_to(template_dir)

            # Remove .j2 extension and calculate output path
            output_rel_path = str(rel_path)[:-3]  # Remove .j2

            # Replace template variables in path
            output_rel_path = self._process_path_variables(output_rel_path, config)

            templates.append(
                {
                    "template": f"{template_prefix}/{rel_path}",
                    "output": output_rel_path,
                    "source_dir": str(template_dir),
                },
            )

        return templates

    def _process_path_variables(self, path: str, config: dict[str, Any]) -> str:
        """Process variables in output path"""
        # Replace {{variable}} in path
        path = path.replace("{{project_name}}", config.get("project_name", "project"))
        path = path.replace("{{entity}}", "example")  # Default entity name
        return path

    def _generate_file(
        self,
        template_info: dict[str, str],
        config: dict[str, Any],
        dry_run: bool = False,
    ):
        """Generate a single file from template"""
        try:
            # Load template
            template = self.jinja_env.get_template(template_info["template"])

            # Render template
            content = template.render(**config)

            # Determine output path
            output_path = self.project_root / template_info["output"]

            if dry_run:
                self.generated_files.append(str(output_path))
                return

            # Create parent directories
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            with open(output_path, "w") as f:
                f.write(content)

            self.generated_files.append(str(output_path))
            console.print(f"[green][/green] Generated: {output_path}")

        except Exception as e:
            console.print(f"[red][/red] Failed to generate {template_info['output']}: {e}")

    def create_directory_structure(self, config: dict[str, Any]) -> list[str]:
        """Create base directory structure"""
        project_type = config.get("project_type", "web-app")
        backend_lang = config.get("backend_language", "python")

        directories = [
            "src",
            "tests",
            "docs",
            "scripts",
            ".github/workflows",
        ]

        # Backend-specific directories
        if backend_lang == "python":
            directories.extend(
                [
                    "src/domain",
                    "src/application",
                    "src/infrastructure",
                    "src/interface",
                    "tests/unit",
                    "tests/integration",
                    "tests/e2e",
                ],
            )
        elif backend_lang in ["node", "javascript", "typescript"]:
            directories.extend(
                [
                    "src/domain",
                    "src/application",
                    "src/infrastructure",
                    "src/interface",
                    "tests/unit",
                    "tests/integration",
                ],
            )

        # Frontend directories
        if project_type in ["web-app", "platform"]:
            directories.extend(
                [
                    "frontend/src",
                    "frontend/public",
                    "frontend/src/components",
                    "frontend/src/pages",
                    "frontend/src/hooks",
                    "frontend/src/api",
                    "frontend/src/utils",
                ],
            )

        created = []
        for directory in directories:
            dir_path = self.project_root / directory
            dir_path.mkdir(parents=True, exist_ok=True)
            created.append(str(dir_path))

        return created

    def generate_boilerplate(self, config: dict[str, Any]) -> dict[str, str]:
        """Generate basic boilerplate files"""
        boilerplate = {}

        # README.md
        readme = self._generate_readme(config)
        readme_path = self.project_root / "README.md"
        with open(readme_path, "w") as f:
            f.write(readme)
        boilerplate["README.md"] = str(readme_path)

        # .gitignore
        gitignore = self._generate_gitignore(config)
        gitignore_path = self.project_root / ".gitignore"
        with open(gitignore_path, "w") as f:
            f.write(gitignore)
        boilerplate[".gitignore"] = str(gitignore_path)

        # .env.example
        env_example = self._generate_env_example(config)
        env_path = self.project_root / ".env.example"
        with open(env_path, "w") as f:
            f.write(env_example)
        boilerplate[".env.example"] = str(env_path)

        return boilerplate

    def _generate_readme(self, config: dict[str, Any]) -> str:
        """Generate README.md"""
        project_name = config.get("project_name", "Project")

        return f"""# {project_name}

> Generated by NXTG-Forge

## Overview

{config.get('description', 'Project description')}

## Technology Stack

- **Backend:** {config.get('backend_framework', 'N/A')}
- **Frontend:** {config.get('frontend_framework', 'N/A')}
- **Database:** {config.get('database', 'N/A')}

## Getting Started

### Prerequisites

- Python 3.9+ (for backend)
- Node.js 16+ (for frontend)
- Docker & Docker Compose

### Installation

```bash
# Clone repository
git clone <repository-url>
cd {config.get('project_name', 'project')}

# Install dependencies
make install

# Start development environment
make dev
```

## Development

### Running Tests

```bash
make test
```

### Code Quality

```bash
make lint
make format
```

## Deployment

```bash
make deploy
```

## Documentation

See [docs/](./docs/) for detailed documentation.

## License

MIT
"""

    def _generate_gitignore(self, config: dict[str, Any]) -> str:
        """Generate .gitignore"""
        lang = config.get("backend_language", "python")

        common = """# NXTG-Forge
.claude/tmp/
.claude/checkpoints/*.json

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
"""

        if lang == "python":
            common += """
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.pytest_cache/
.coverage
htmlcov/
dist/
build/
*.egg-info/
"""
        elif lang in ["node", "javascript", "typescript"]:
            common += """
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
dist/
build/
.next/
.nuxt/
"""

        return common

    def _generate_env_example(self, config: dict[str, Any]) -> str:
        """Generate .env.example"""
        env = """# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Application
DEBUG=false
SECRET_KEY=your-secret-key-here
"""

        # Add service-specific vars
        if config.get("authentication") == "jwt":
            env += "\n# JWT\nJWT_SECRET=your-jwt-secret\nJWT_ALGORITHM=HS256\n"

        if config.get("payment") == "stripe":
            env += "\n# Stripe\nSTRIPE_API_KEY=sk_test_...\nSTRIPE_WEBHOOK_SECRET=whsec_...\n"

        return env

    # Helper methods for Jinja2 filters

    def _snake_case(self, text: str) -> str:
        """Convert to snake_case"""
        text = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", text)
        text = re.sub("([a-z0-9])([A-Z])", r"\1_\2", text)
        return text.lower().replace(" ", "_").replace("-", "_")

    def _pascal_case(self, text: str) -> str:
        """Convert to PascalCase"""
        return "".join(word.capitalize() for word in re.split(r"[_\s-]+", text))

    def _camel_case(self, text: str) -> str:
        """Convert to camelCase"""
        pascal = self._pascal_case(text)
        return pascal[0].lower() + pascal[1:] if pascal else ""

    def _kebab_case(self, text: str) -> str:
        """Convert to kebab-case"""
        return self._snake_case(text).replace("_", "-")


# CLI
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: file_generator.py <spec-file> [--dry-run]")
        sys.exit(1)

    spec_file = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    with open(spec_file) as f:
        spec_content = f.read()

    generator = FileGenerator()
    generated = generator.generate_from_spec(spec_content, dry_run=dry_run)

    print(f"\n Generated {len(generated)} files")

    if dry_run:
        print("\nWould generate:")
        for file in generated:
            print(f"  • {file}")

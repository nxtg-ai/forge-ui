"""
Unit tests for FileGenerator
"""

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from forge.file_generator import FileGenerator


class TestFileGenerator:
    """Test FileGenerator class"""

    def test_init(self, temp_project_dir):
        """Test initialization"""
        # Create templates dir
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        assert generator.project_root == temp_project_dir
        assert generator.templates_dir == templates_dir
        assert generator.generated_files == []

    def test_snake_case_conversion(self, temp_project_dir):
        """Test snake_case filter"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        assert generator._snake_case("HelloWorld") == "hello_world"
        assert generator._snake_case("testCamelCase") == "test_camel_case"
        assert generator._snake_case("already_snake") == "already_snake"

    def test_pascal_case_conversion(self, temp_project_dir):
        """Test PascalCase filter"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        assert generator._pascal_case("hello_world") == "HelloWorld"
        assert generator._pascal_case("test-kebab") == "TestKebab"
        assert generator._pascal_case("mixed Case_example") == "MixedCaseExample"

    def test_camel_case_conversion(self, temp_project_dir):
        """Test camelCase filter"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        assert generator._camel_case("hello_world") == "helloWorld"
        assert generator._camel_case("test-example") == "testExample"

    def test_kebab_case_conversion(self, temp_project_dir):
        """Test kebab-case filter"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        assert generator._kebab_case("HelloWorld") == "hello-world"
        assert generator._kebab_case("test_example") == "test-example"

    def test_parse_spec_extracts_project_name(self, temp_project_dir):
        """Test parsing project name from spec"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        spec = "# MyProject - Project Specification\n\n**Type:** web-app"
        config = generator._parse_spec(spec)

        assert config["project_name"] == "MyProject"

    def test_parse_spec_extracts_backend_info(self, temp_project_dir):
        """Test parsing backend information"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        spec = """
        **Language:** Python
        **Framework:** FastAPI
        """
        config = generator._parse_spec(spec)

        assert config["backend_language"] == "python"
        assert config["backend_framework"] == "fastapi"

    def test_generate_readme(self, temp_project_dir):
        """Test README generation"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {
            "project_name": "TestApp",
            "description": "A test application",
            "backend_framework": "fastapi",
            "frontend_framework": "react",
            "database": "postgresql",
        }

        readme = generator._generate_readme(config)

        assert "# TestApp" in readme
        assert "fastapi" in readme.lower()
        assert "react" in readme.lower()

    def test_generate_gitignore_python(self, temp_project_dir):
        """Test .gitignore generation for Python"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {"backend_language": "python"}

        gitignore = generator._generate_gitignore(config)

        assert "__pycache__" in gitignore
        # *.pyc is included in *.py[cod] pattern
        assert "*.py[cod]" in gitignore or "*.pyc" in gitignore
        assert "venv/" in gitignore

    def test_generate_gitignore_node(self, temp_project_dir):
        """Test .gitignore generation for Node"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {"backend_language": "node"}

        gitignore = generator._generate_gitignore(config)

        assert "node_modules/" in gitignore
        assert "npm-debug.log" in gitignore

    def test_generate_env_example(self, temp_project_dir):
        """Test .env.example generation"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {"database": "postgresql", "authentication": "jwt", "payment": "stripe"}

        env_example = generator._generate_env_example(config)

        assert "DATABASE_URL" in env_example
        assert "JWT_SECRET" in env_example
        assert "STRIPE_API_KEY" in env_example

    def test_create_directory_structure_python(self, temp_project_dir):
        """Test directory structure creation for Python"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {"project_type": "web-app", "backend_language": "python"}

        created = generator.create_directory_structure(config)

        assert len(created) > 0
        assert (temp_project_dir / "src" / "domain").exists()
        assert (temp_project_dir / "tests" / "unit").exists()

    def test_generate_boilerplate(self, temp_project_dir):
        """Test boilerplate file generation"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)
        config = {
            "project_name": "TestApp",
            "description": "Test",
            "backend_framework": "fastapi",
            "database": "postgresql",
            "authentication": "jwt",
        }

        boilerplate = generator.generate_boilerplate(config)

        assert "README.md" in boilerplate
        assert ".gitignore" in boilerplate
        assert ".env.example" in boilerplate

        # Verify files were created
        assert (temp_project_dir / "README.md").exists()
        assert (temp_project_dir / ".gitignore").exists()
        assert (temp_project_dir / ".env.example").exists()

    def test_parse_spec_extracts_database(self, temp_project_dir):
        """Test parsing database from spec"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        spec = """
        #### Database
        **Type:** PostgreSQL
        """
        config = generator._parse_spec(spec)

        assert config["database"] == "postgresql"

    def test_parse_spec_extracts_frontend_framework(self, temp_project_dir):
        """Test parsing frontend framework from spec"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        generator = FileGenerator(temp_project_dir)

        spec = """
        #### Frontend
        **Framework:** React
        """
        config = generator._parse_spec(spec)

        assert config["frontend_framework"] == "react"

    def test_generate_from_spec_with_dry_run(self, temp_project_dir):
        """Test generate_from_spec method with dry_run"""
        templates_dir = temp_project_dir / ".claude" / "templates"
        templates_dir.mkdir(parents=True)

        # Create a simple template
        (templates_dir / "test.j2").write_text("# {{ project_name }}")

        generator = FileGenerator(temp_project_dir)

        spec = """# TestProject - Project Specification
        **Type:** web-app
        **Language:** Python
        **Framework:** FastAPI
        """

        generated = generator.generate_from_spec(spec, dry_run=True)

        assert isinstance(generated, list)

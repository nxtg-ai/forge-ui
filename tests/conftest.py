"""
Pytest configuration and shared fixtures
"""

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest


@pytest.fixture()
def temp_project_dir():
    """Create a temporary project directory for testing"""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_dir = Path(tmpdir)

        # Create basic structure
        (project_dir / ".claude").mkdir(parents=True)
        (project_dir / "forge").mkdir(parents=True)
        (project_dir / "docs").mkdir(parents=True)

        yield project_dir


@pytest.fixture()
def sample_state() -> dict[str, Any]:
    """Sample state.json for testing"""
    return {
        "version": "1.0.0",
        "project": {
            "name": "test-project",
            "type": "web-app",
            "created_at": "2025-01-04T12:00:00Z",
            "last_updated": "2025-01-04T12:00:00Z",
            "forge_version": "1.0.0",
        },
        "architecture": {
            "backend": {"language": "python", "framework": "fastapi"},
            "database": {"type": "postgresql"},
        },
        "development": {
            "current_phase": "implementation",
            "phases_completed": ["planning"],
            "phases_remaining": ["testing", "deployment"],
            "features": {"completed": [], "in_progress": [], "planned": []},
        },
        "quality": {
            "tests": {
                "unit": {"total": 0, "passing": 0, "coverage": 0},
                "integration": {"total": 0, "passing": 0, "coverage": 0},
                "e2e": {"total": 0, "passing": 0, "coverage": 0},
            },
        },
        "checkpoints": [],
        "last_session": None,
    }


@pytest.fixture()
def sample_spec_answers() -> dict[str, Any]:
    """Sample spec answers for testing"""
    return {
        "project_name": "test-app",
        "project_type": "web-app",
        "description": "A test application",
        "backend_language": "python",
        "backend_framework": "fastapi",
        "database": "postgresql",
        "cache": "redis",
        "frontend_framework": "react",
        "ui_library": "tailwind",
        "deployment_target": "docker",
        "ci_cd": "github-actions",
        "authentication": "jwt",
        "payment": "stripe",
        "realtime": "websocket",
        "file_storage": "s3",
        "min_test_coverage": "85",
        "linting": "strict",
        "type_checking": "strict",
    }


@pytest.fixture()
def create_state_file(temp_project_dir, sample_state):
    """Create a state.json file in temp project"""

    def _create(state_data=None):
        state_path = temp_project_dir / ".claude" / "state.json"
        with open(state_path, "w") as f:
            json.dump(state_data or sample_state, f, indent=2)
        return state_path

    return _create


@pytest.fixture()
def tmp_project_root(tmp_path):
    """Create temporary project root with complete .claude directory structure."""
    claude_dir = tmp_path / ".claude"
    claude_dir.mkdir()
    (claude_dir / "commands").mkdir()
    (claude_dir / "skills").mkdir()
    (claude_dir / "templates").mkdir()
    (claude_dir / "hooks").mkdir()
    (claude_dir / "features").mkdir()
    (claude_dir / "checkpoints").mkdir()
    (claude_dir / "backups").mkdir()
    return tmp_path


@pytest.fixture()
def minimal_state() -> dict[str, Any]:
    """Minimal valid state.json structure for testing."""
    return {
        "version": "1.0.0",
        "project": {
            "name": "",
            "type": "",
            "created_at": "",
            "last_updated": "",
            "forge_version": "1.0.0",
        },
        "development": {
            "current_phase": "planning",
            "phases_completed": [],
            "phases_remaining": [
                "planning",
                "architecture",
                "setup",
                "implementation",
                "testing",
                "documentation",
                "deployment",
            ],
            "features": {"completed": [], "in_progress": [], "planned": []},
        },
        "agents": {
            "active": [],
            "available": [
                "lead-architect",
                "backend-master",
                "cli-artisan",
                "platform-builder",
                "integration-specialist",
                "qa-sentinel",
            ],
        },
        "checkpoints": [],
        "mcp_servers": {"configured": [], "recommended": []},
        "quality": {
            "tests": {
                "unit": {"total": 0, "passing": 0, "coverage": 0},
                "integration": {"total": 0, "passing": 0, "coverage": 0},
                "e2e": {"total": 0, "passing": 0, "coverage": 0},
            },
        },
    }


@pytest.fixture()
def complete_state() -> dict[str, Any]:
    """Complete state.json with all features for testing."""
    return {
        "version": "1.0.0",
        "project": {
            "name": "complete-project",
            "type": "web-app",
            "created_at": "2025-01-01T00:00:00Z",
            "last_updated": "2025-01-04T00:00:00Z",
            "forge_version": "1.0.0",
        },
        "spec": {
            "status": "approved",
            "file": "docs/PROJECT-SPEC.md",
            "hash": "abc123",
            "last_modified": "2025-01-01T01:00:00Z",
        },
        "architecture": {
            "pattern": "clean-architecture",
            "layers": ["domain", "application", "infrastructure", "interface"],
            "backend": {"language": "python", "framework": "fastapi", "version": "0.100.0"},
            "frontend": {"framework": "react", "version": "18.2.0"},
            "database": {"type": "postgresql", "version": "15"},
            "cache": {"type": "redis", "version": "7"},
        },
        "development": {
            "current_phase": "testing",
            "phases_completed": ["planning", "architecture", "setup", "implementation"],
            "phases_remaining": ["testing", "documentation", "deployment"],
            "features": {
                "completed": [
                    {
                        "id": "feat-001",
                        "name": "User Authentication",
                        "status": "completed",
                        "completed_at": "2025-01-02T00:00:00Z",
                    },
                ],
                "in_progress": [
                    {
                        "id": "feat-002",
                        "name": "API Endpoints",
                        "status": "in_progress",
                        "started_at": "2025-01-03T00:00:00Z",
                    },
                ],
                "planned": [{"id": "feat-003", "name": "Payment Integration", "priority": "high"}],
            },
        },
        "agents": {
            "active": ["backend-master"],
            "available": [
                "lead-architect",
                "cli-artisan",
                "platform-builder",
                "integration-specialist",
                "qa-sentinel",
            ],
            "history": [
                {
                    "agent": "lead-architect",
                    "task": "Design system architecture",
                    "started": "2025-01-01T09:00:00Z",
                    "completed": "2025-01-01T11:00:00Z",
                    "output": "docs/ARCHITECTURE.md",
                },
            ],
        },
        "mcp_servers": {
            "configured": [
                {
                    "name": "github",
                    "status": "connected",
                    "auto_detected": True,
                    "reason": "Repository uses GitHub",
                },
            ],
            "recommended": [],
        },
        "quality": {
            "tests": {
                "unit": {"total": 50, "passing": 48, "coverage": 85},
                "integration": {"total": 20, "passing": 20, "coverage": 75},
                "e2e": {"total": 10, "passing": 10, "coverage": 60},
            },
            "linting": {"issues": 0, "last_run": "2025-01-04T00:00:00Z"},
            "security": {
                "vulnerabilities": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                "last_scan": "2025-01-04T00:00:00Z",
            },
        },
        "checkpoints": [
            {
                "id": "cp-001",
                "timestamp": "2025-01-01T12:00:00Z",
                "description": "After architecture design",
                "file": ".claude/checkpoints/checkpoint-001.json",
                "git_commit": "abc123",
            },
        ],
        "last_session": {
            "id": "sess-001",
            "started": "2025-01-04T00:00:00Z",
            "agent": "backend-master",
            "task": "Implement API",
            "status": "completed",
        },
    }


@pytest.fixture()
def sample_spec() -> dict[str, Any]:
    """Sample project specification for testing."""
    return {
        "name": "test-project",
        "type": "web-app",
        "description": "Test application",
        "framework": "fastapi",
        "database": "postgresql",
        "cache": "redis",
        "frontend": "react",
    }

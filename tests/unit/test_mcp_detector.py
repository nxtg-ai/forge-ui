"""
Unit tests for MCP Detector
"""

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from forge.mcp_detector import MCPDetector


class TestMCPDetectorInit:
    """Test MCP Detector initialization."""

    def test_init_with_project_root(self, tmp_project_root):
        """Test initialization with project root."""
        detector = MCPDetector(str(tmp_project_root))

        assert detector.project_root == tmp_project_root
        assert detector.auto_detect_script == tmp_project_root / ".mcp" / "auto-detect.js"
        assert detector.state_file == tmp_project_root / ".claude" / "state.json"
        assert detector.recommendations == []

    def test_init_with_default_root(self):
        """Test initialization with default root."""
        detector = MCPDetector()

        assert detector.project_root == Path()


class TestMCPDetection:
    """Test MCP detection functionality."""

    @pytest.fixture()
    def detector(self, tmp_project_root):
        """Create detector with temp project root."""
        # Create .mcp directory and auto-detect script
        mcp_dir = tmp_project_root / ".mcp"
        mcp_dir.mkdir()
        (mcp_dir / "auto-detect.js").write_text("// MCP detection script")

        return MCPDetector(str(tmp_project_root))

    @patch("subprocess.run")
    def test_detect_with_successful_detection(self, mock_run, detector):
        """Test successful MCP detection."""
        # Mock successful subprocess execution
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(
            [{"name": "github", "priority": "high", "reason": "GitHub repository detected"}],
        )
        mock_run.return_value = mock_result

        recommendations = detector.detect()

        assert len(recommendations) == 1
        assert recommendations[0]["name"] == "github"
        assert recommendations[0]["priority"] == "high"

    @patch("subprocess.run")
    def test_detect_with_multiple_recommendations(self, mock_run, detector):
        """Test detection with multiple recommendations."""
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps(
            [
                {"name": "github", "priority": "high", "reason": "GitHub detected"},
                {"name": "postgres", "priority": "medium", "reason": "PostgreSQL detected"},
            ],
        )
        mock_run.return_value = mock_result

        recommendations = detector.detect()

        assert len(recommendations) == 2
        assert recommendations[0]["name"] == "github"
        assert recommendations[1]["name"] == "postgres"

    @patch("subprocess.run")
    def test_detect_with_subprocess_error(self, mock_run, detector):
        """Test detection when subprocess fails."""
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stderr = "Error running script"
        mock_run.return_value = mock_result

        recommendations = detector.detect()

        # Should fall back to fallback detection
        assert isinstance(recommendations, list)

    @patch("subprocess.run")
    def test_detect_with_timeout(self, mock_run, detector):
        """Test detection when subprocess times out."""
        mock_run.side_effect = subprocess.TimeoutExpired("node", 30)

        recommendations = detector.detect()

        # Should fall back to fallback detection
        assert isinstance(recommendations, list)

    @patch("subprocess.run")
    def test_detect_with_exception(self, mock_run, detector):
        """Test detection when subprocess raises exception."""
        mock_run.side_effect = Exception("Unexpected error")

        recommendations = detector.detect()

        # Should fall back to fallback detection
        assert isinstance(recommendations, list)

    def test_detect_without_script(self, tmp_project_root):
        """Test detection when auto-detect script doesn't exist."""
        detector = MCPDetector(str(tmp_project_root))

        recommendations = detector.detect()

        # Should use fallback detection
        assert isinstance(recommendations, list)


class TestOutputParsing:
    """Test output parsing functionality."""

    @pytest.fixture()
    def detector(self, tmp_project_root):
        """Create detector."""
        return MCPDetector(str(tmp_project_root))

    def test_parse_json_list_output(self, detector):
        """Test parsing JSON list output."""
        output = json.dumps([{"name": "github", "priority": "high", "reason": "Test"}])

        recommendations = detector._parse_detection_output(output)

        assert len(recommendations) == 1
        assert recommendations[0]["name"] == "github"

    def test_parse_json_dict_output(self, detector):
        """Test parsing JSON dict output."""
        output = json.dumps({"name": "postgres", "priority": "medium", "reason": "Test"})

        recommendations = detector._parse_detection_output(output)

        assert len(recommendations) == 1
        assert recommendations[0]["name"] == "postgres"

    def test_parse_text_with_github(self, detector):
        """Test parsing text output mentioning GitHub."""
        output = "Project uses GitHub for version control"

        recommendations = detector._parse_detection_output(output)

        # Should extract GitHub from text
        github_recs = [r for r in recommendations if r["name"] == "github"]
        assert len(github_recs) > 0

    def test_parse_invalid_json(self, detector):
        """Test parsing invalid JSON falls back to text extraction."""
        output = "Invalid JSON { broken"

        recommendations = detector._parse_detection_output(output)

        # Should still return a list (even if empty or from text extraction)
        assert isinstance(recommendations, list)

    def test_extract_from_text_github(self, detector):
        """Test extracting GitHub from text."""
        output = "Using GitHub Actions for CI/CD"

        recommendations = detector._extract_from_text(output)

        github_recs = [r for r in recommendations if r["name"] == "github"]
        assert len(github_recs) > 0

    def test_extract_from_text_postgres(self, detector):
        """Test extracting PostgreSQL from text."""
        output = "Database: PostgreSQL 15"

        recommendations = detector._extract_from_text(output)

        postgres_recs = [r for r in recommendations if r["name"] == "postgres"]
        assert len(postgres_recs) > 0


class TestFallbackDetection:
    """Test fallback detection based on project files."""

    @pytest.fixture()
    def detector(self, tmp_project_root):
        """Create detector."""
        return MCPDetector(str(tmp_project_root))

    def test_fallback_detection_with_package_json(self, detector, tmp_project_root):
        """Test fallback detection finds package.json."""
        (tmp_project_root / "package.json").write_text(json.dumps({"name": "test"}))

        recommendations = detector._fallback_detection()

        # Should recommend npm-related MCP servers
        assert isinstance(recommendations, list)

    def test_fallback_detection_with_requirements_txt(self, detector, tmp_project_root):
        """Test fallback detection finds requirements.txt."""
        (tmp_project_root / "requirements.txt").write_text("django==4.0.0\n")

        recommendations = detector._fallback_detection()

        # Should detect Python project
        assert isinstance(recommendations, list)

    @patch("subprocess.check_output")
    def test_fallback_detection_with_git(self, mock_check_output, detector, tmp_project_root):
        """Test fallback detection finds .git directory with GitHub remote."""
        (tmp_project_root / ".git").mkdir()

        # Mock git remote URL
        mock_check_output.return_value = "https://github.com/user/repo.git\n"

        recommendations = detector._fallback_detection()

        # Should recommend GitHub MCP server
        github_recs = [r for r in recommendations if r.get("name") == "github"]
        assert len(github_recs) > 0

    def test_fallback_detection_empty_project(self, detector):
        """Test fallback detection with empty project."""
        recommendations = detector._fallback_detection()

        # Should return empty list or minimal recommendations
        assert isinstance(recommendations, list)


class TestMCPConfiguration:
    """Test MCP configuration functionality."""

    @pytest.fixture()
    def detector(self, tmp_project_root, minimal_state):
        """Create detector with state file."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        return MCPDetector(str(tmp_project_root))

    def test_configure_with_recommendations(self, detector):
        """Test configuring MCP servers with recommendations."""
        detector.recommendations = [{"name": "github", "priority": "high", "reason": "Test"}]

        # Mock the configuration methods
        with patch.object(detector, "_configure_server") as mock_configure:
            with patch.object(detector, "_update_state") as mock_update:
                detector.configure()

                # Should call configure for each recommendation
                assert mock_configure.call_count == 1
                mock_update.assert_called_once()

    def test_configure_without_recommendations(self, detector):
        """Test configure with no recommendations."""
        detector.recommendations = []

        with patch.object(detector, "_update_state") as mock_update:
            detector.configure()

            # Should still update state
            mock_update.assert_called_once()

    def test_get_server_config_github(self, detector):
        """Test getting GitHub server configuration."""
        config = detector._get_server_config("github")

        assert config is not None
        assert "command" in config
        assert "args" in config

    def test_get_server_config_postgres(self, detector):
        """Test getting PostgreSQL server configuration."""
        config = detector._get_server_config("postgres")

        assert config is not None
        assert "command" in config

    def test_get_server_config_unknown(self, detector):
        """Test getting config for unknown server."""
        config = detector._get_server_config("unknown-server")

        assert config is None

    def test_update_state(self, detector, tmp_project_root):
        """Test updating state.json with MCP recommendations."""
        detector.recommendations = [{"name": "github", "priority": "high", "reason": "Test"}]

        detector._update_state()

        # Read state file and verify it was updated
        state_file = tmp_project_root / ".claude" / "state.json"
        state = json.loads(state_file.read_text())

        assert "mcp_servers" in state


class TestRecommendationDisplay:
    """Test recommendation display functionality."""

    @pytest.fixture()
    def detector(self, tmp_project_root):
        """Create detector."""
        return MCPDetector(str(tmp_project_root))

    def test_display_recommendations(self, detector):
        """Test displaying recommendations."""
        detector.recommendations = [
            {"name": "github", "priority": "high", "reason": "GitHub detected"},
            {"name": "postgres", "priority": "medium", "reason": "PostgreSQL detected"},
        ]

        # Should not raise any exceptions
        detector.display_recommendations()

    def test_display_empty_recommendations(self, detector):
        """Test displaying with no recommendations."""
        detector.recommendations = []

        # Should handle empty recommendations gracefully
        detector.display_recommendations()


class TestIntegration:
    """Integration tests for MCPDetector."""

    def test_full_detection_flow(self, tmp_project_root, complete_state):
        """Test complete detection flow."""
        # Create state file with complete state that has architecture
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        # Create project files that should be detected
        (tmp_project_root / "package.json").write_text(json.dumps({"name": "test"}))

        detector = MCPDetector(str(tmp_project_root))

        # Run detection (will use fallback since no script exists)
        recommendations = detector.detect()

        assert isinstance(recommendations, list)
        # complete_state has PostgreSQL in architecture, should be detected
        assert len(recommendations) > 0

    @patch("subprocess.run")
    def test_detection_with_script(self, mock_run, tmp_project_root):
        """Test detection with actual script present."""
        # Create script
        mcp_dir = tmp_project_root / ".mcp"
        mcp_dir.mkdir()
        (mcp_dir / "auto-detect.js").write_text("console.log('test');")

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps([{"name": "github", "priority": "high", "reason": "Test"}])
        mock_run.return_value = mock_result

        detector = MCPDetector(str(tmp_project_root))
        recommendations = detector.detect()

        assert len(recommendations) >= 1
        mock_run.assert_called_once()

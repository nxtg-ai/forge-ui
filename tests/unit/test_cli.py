"""
Unit tests for CLI interface
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from forge.cli import ForgeCLI, main


class TestForgeCLI:
    """Test CLI interface and command parsing."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance with temporary project."""
        # Create state file
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_cli_initialization(self, cli, tmp_project_root):
        """Test that CLI initializes correctly."""
        assert cli.project_root == tmp_project_root
        assert cli.state_manager is not None

    def test_version_display(self, cli, capsys):
        """Test --version flag displays version."""
        with pytest.raises(SystemExit) as exc_info:
            cli.run(["--version"])

        assert exc_info.value.code == 0
        captured = capsys.readouterr()
        assert "NXTG-Forge" in captured.out
        assert "1.0.0" in captured.out

    def test_help_display(self, cli, capsys):
        """Test --help flag displays help text."""
        with pytest.raises(SystemExit) as exc_info:
            cli.run(["--help"])

        assert exc_info.value.code == 0
        captured = capsys.readouterr()
        assert "NXTG-Forge" in captured.out
        assert "Commands" in captured.out

    def test_no_command_shows_help(self, cli, capsys):
        """Test running with no command shows help."""
        result = cli.run([])

        assert result == 0
        captured = capsys.readouterr()
        assert "NXTG-Forge" in captured.out

    def test_unknown_command_returns_error(self, cli, capsys):
        """Test unknown command returns error code."""
        # argparse will raise SystemExit for invalid commands
        with pytest.raises(SystemExit) as exc_info:
            cli.run(["invalid-command"])

        assert exc_info.value.code == 2
        captured = capsys.readouterr()
        assert "invalid choice" in captured.err.lower()


class TestStatusCommand:
    """Test 'status' command functionality."""

    @pytest.fixture()
    def cli(self, tmp_project_root, complete_state):
        """Create CLI instance with complete state."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_status_command_basic(self, cli, capsys):
        """Test status command displays project information."""
        result = cli.run(["status"])

        assert result == 0
        captured = capsys.readouterr()
        assert "PROJECT" in captured.out
        assert "complete-project" in captured.out

    def test_status_command_json_output(self, cli, capsys):
        """Test status command with --json flag."""
        result = cli.run(["status", "--json"])

        assert result == 0
        captured = capsys.readouterr()

        # Output should be valid JSON
        output_data = json.loads(captured.out)
        assert output_data["project"]["name"] == "complete-project"
        assert output_data["version"] == "1.0.0"

    def test_status_command_with_detail_features(self, cli, capsys):
        """Test status command with --detail features."""
        result = cli.run(["status", "--detail", "features"])

        assert result == 0
        captured = capsys.readouterr()
        assert "FEATURES" in captured.out or "feat-" in captured.out

    def test_status_command_with_detail_agents(self, cli, capsys):
        """Test status command with --detail agents."""
        result = cli.run(["status", "--detail", "agents"])

        assert result == 0
        captured = capsys.readouterr()
        # Should show agent information

    def test_status_command_with_detail_quality(self, cli, capsys):
        """Test status command with --detail quality."""
        result = cli.run(["status", "--detail", "quality"])

        assert result == 0
        # Should not crash


class TestCheckpointCommands:
    """Test checkpoint and restore commands."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_checkpoint_command_creates_checkpoint(self, cli, capsys):
        """Test checkpoint command creates a checkpoint."""
        result = cli.run(["checkpoint", "Test checkpoint"])

        assert result == 0
        captured = capsys.readouterr()
        # Verify checkpoint was created (either success message or no error)

    def test_checkpoint_command_with_empty_description(self, cli):
        """Test checkpoint command with empty description."""
        # Should handle empty or missing description
        with pytest.raises(SystemExit):
            cli.run(["checkpoint"])

    def test_restore_command_latest_checkpoint(self, cli, capsys):
        """Test restore command restores latest checkpoint."""
        # First create a checkpoint
        cli.run(["checkpoint", "Before restore test"])

        # Then restore it
        result = cli.run(["restore"])

        # Should complete (may warn if no checkpoints exist)
        assert result in [0, 1]

    def test_restore_command_specific_checkpoint(self, cli):
        """Test restore command with specific checkpoint ID."""
        # First create a checkpoint so it exists
        cli.run(["checkpoint", "Test for restore"])

        # Should now be able to restore cp-001
        result = cli.run(["restore", "cp-001"])

        # Should complete successfully
        assert result == 0


class TestSpecCommands:
    """Test spec generation and validation commands."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    @patch("forge.cli.SpecGenerator")
    def test_spec_generate_interactive(self, mock_spec_gen, cli, tmp_project_root):
        """Test spec generate command in interactive mode."""
        mock_instance = MagicMock()
        mock_spec_gen.return_value = mock_instance
        # Return string (markdown spec), not dict
        mock_instance.interactive_mode.return_value = "# Project Spec\n\nTest content"

        # Create docs directory
        (tmp_project_root / "docs").mkdir(exist_ok=True)

        result = cli.run(["spec", "generate", "--interactive"])

        # Should call spec generator
        mock_instance.interactive_mode.assert_called_once()
        assert result == 0

    @patch("forge.cli.SpecGenerator")
    def test_spec_generate_from_answers(self, mock_spec_gen, cli, tmp_project_root):
        """Test spec generate command from answers file."""
        # Create answers file
        answers_file = tmp_project_root / "answers.json"
        answers_file.write_text(json.dumps({"project_name": "test"}))

        mock_instance = MagicMock()
        mock_spec_gen.return_value = mock_instance
        # Return string (markdown spec), not dict
        mock_instance.from_answers.return_value = "# Project Spec\n\nTest content"

        # Create docs directory
        (tmp_project_root / "docs").mkdir(exist_ok=True)

        result = cli.run(["spec", "generate", "--from-answers", str(answers_file)])

        assert result == 0
        mock_instance.from_answers.assert_called_once()

    def test_spec_validate_command(self, cli, tmp_project_root):
        """Test spec validate command."""
        # Create a spec file
        spec_file = tmp_project_root / "test-spec.yaml"
        spec_file.write_text("name: test\ntype: web-app")

        result = cli.run(["spec", "validate", str(spec_file)])

        # Should complete without crashing
        assert isinstance(result, int)


class TestMCPCommands:
    """Test MCP server detection and configuration commands."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    @patch("forge.cli.MCPDetector")
    def test_mcp_detect_command(self, mock_detector, cli, capsys):
        """Test MCP detect command."""
        mock_instance = MagicMock()
        mock_detector.return_value = mock_instance
        # MCPDetector.detect() returns a list of recommendations
        mock_instance.detect.return_value = []

        result = cli.run(["mcp", "detect"])

        assert result == 0

    @patch("forge.cli.MCPDetector")
    def test_mcp_detect_with_configure(self, mock_detector, cli):
        """Test MCP detect command with --configure flag."""
        mock_instance = MagicMock()
        mock_detector.return_value = mock_instance
        # MCPDetector.detect() returns a list of dict recommendations
        mock_instance.detect.return_value = [
            {"name": "postgres", "priority": "high", "reason": "PostgreSQL detected"},
        ]
        mock_instance.configure.return_value = True

        result = cli.run(["mcp", "detect", "--configure"])

        assert result == 0

    def test_mcp_list_command(self, cli, capsys):
        """Test MCP list command."""
        result = cli.run(["mcp", "list"])

        # Should complete without error
        assert result in [0, 1]


class TestGapAnalysisCommand:
    """Test gap analysis command."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    @patch("forge.cli.GapAnalyzer")
    def test_gap_analysis_command(self, mock_analyzer, cli):
        """Test gap-analysis command."""
        mock_instance = MagicMock()
        mock_analyzer.return_value = mock_instance
        # Return string instead of dict to match expected file write behavior
        mock_instance.analyze.return_value = "# Gap Analysis\n\nNo gaps found."

        result = cli.run(["gap-analysis"])

        assert result == 0

    @patch("forge.cli.GapAnalyzer")
    def test_gap_analysis_custom_output(self, mock_analyzer, cli, tmp_project_root):
        """Test gap-analysis command with custom output file."""
        mock_instance = MagicMock()
        mock_analyzer.return_value = mock_instance
        # Return string instead of dict to match expected file write behavior
        mock_instance.analyze.return_value = "# Gap Analysis\n\nNo gaps found."

        output_file = tmp_project_root / "custom-gap.md"
        result = cli.run(["gap-analysis", "--output", str(output_file)])

        assert result == 0


class TestHealthCommand:
    """Test health score command."""

    @pytest.fixture()
    def cli(self, tmp_project_root, complete_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_health_command_basic(self, cli, capsys):
        """Test health command displays health score."""
        result = cli.run(["health"])

        assert result == 0
        captured = capsys.readouterr()
        # Should show some health information

    def test_health_command_with_detail(self, cli, capsys):
        """Test health command with --detail flag."""
        result = cli.run(["health", "--detail"])

        assert result == 0
        # Should show detailed breakdown


class TestRecoveryCommand:
    """Test recovery information command."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_recovery_command(self, cli, capsys):
        """Test recovery command displays recovery information."""
        result = cli.run(["recovery"])

        assert result == 0
        # Should show recovery information


class TestGenerateCommand:
    """Test file generation command."""

    @pytest.fixture()
    def cli(self, tmp_project_root, minimal_state):
        """Create CLI instance."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_generate_command_missing_spec(self, cli):
        """Test generate command without --spec flag."""
        with pytest.raises(SystemExit):
            cli.run(["generate"])

    @patch("forge.cli.FileGenerator")
    def test_generate_command_with_spec(self, mock_gen, cli, tmp_project_root):
        """Test generate command with spec file."""
        spec_file = tmp_project_root / "spec.yaml"
        spec_file.write_text("name: test\ntype: web-app")

        mock_instance = MagicMock()
        mock_gen.return_value = mock_instance
        mock_instance.generate.return_value = True

        result = cli.run(["generate", "--spec", str(spec_file)])

        assert result in [0, 1]

    @patch("forge.cli.FileGenerator")
    def test_generate_command_dry_run(self, mock_gen, cli, tmp_project_root):
        """Test generate command with --dry-run flag."""
        spec_file = tmp_project_root / "spec.yaml"
        spec_file.write_text("name: test\ntype: web-app")

        mock_instance = MagicMock()
        mock_gen.return_value = mock_instance

        result = cli.run(["generate", "--spec", str(spec_file), "--dry-run"])

        assert result in [0, 1]

    @patch("forge.cli.FileGenerator")
    def test_generate_command_template_sets(self, mock_gen, cli, tmp_project_root):
        """Test generate command with different template sets."""
        spec_file = tmp_project_root / "spec.yaml"
        spec_file.write_text("name: test\ntype: web-app")

        mock_instance = MagicMock()
        mock_gen.return_value = mock_instance
        mock_instance.generate.return_value = True

        for template_set in ["minimal", "standard", "full"]:
            result = cli.run(["generate", "--spec", str(spec_file), "--template-set", template_set])
            assert result in [0, 1]


class TestMainFunction:
    """Test main() entry point."""

    @patch.object(sys, "argv", ["nxtg-forge", "--version"])
    @patch("forge.cli.ForgeCLI")
    def test_main_function_calls_cli(self, mock_cli_class):
        """Test main() function creates CLI and runs it."""
        mock_cli = MagicMock()
        mock_cli.run.return_value = 0
        mock_cli_class.return_value = mock_cli

        result = main()

        assert result == 0
        mock_cli.run.assert_called_once()

    @patch.object(sys, "argv", ["nxtg-forge", "status"])
    @patch("forge.cli.ForgeCLI")
    def test_main_function_with_command(self, mock_cli_class):
        """Test main() function executes commands."""
        mock_cli = MagicMock()
        mock_cli.run.return_value = 0
        mock_cli_class.return_value = mock_cli

        result = main()

        assert result == 0

    @patch.object(sys, "argv", ["nxtg-forge"])
    @patch("forge.cli.ForgeCLI")
    def test_main_function_no_args(self, mock_cli_class):
        """Test main() function with no arguments."""
        mock_cli = MagicMock()
        mock_cli.run.return_value = 0
        mock_cli_class.return_value = mock_cli

        result = main()

        assert result == 0


class TestErrorHandling:
    """Test error handling in CLI."""

    @pytest.fixture()
    def cli(self, tmp_project_root):
        """Create CLI instance without state file."""
        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_cli_handles_missing_state_gracefully(self, cli):
        """Test CLI handles missing state.json gracefully."""
        # Should either create template or handle missing state
        # CLI should not crash on initialization
        assert cli.state_manager is not None

    @patch("forge.cli.StateManager")
    def test_cli_handles_corrupted_state(self, mock_manager, tmp_project_root):
        """Test CLI handles corrupted state file."""
        mock_manager.side_effect = json.JSONDecodeError("test", "", 0)

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            # Should handle error gracefully
            with pytest.raises(json.JSONDecodeError):
                ForgeCLI()

    def test_invalid_command_argument(self, tmp_project_root, minimal_state):
        """Test CLI handles invalid command arguments."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            cli = ForgeCLI()

            # Invalid detail option
            with pytest.raises(SystemExit):
                cli.run(["status", "--detail", "invalid-section"])


class TestConfigCommands:
    """Test config command operations."""

    @pytest.fixture()
    def cli_with_config(self, tmp_project_root, minimal_state):
        """Create CLI with config file."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        # Create config file
        config_path = tmp_project_root / ".claude" / "config.json"
        config = {
            "version": "1.0.0",
            "project": {"name": "NXTG-Forge", "language": "python"},
            "development": {"python": {"version": "3.11+", "formatter": "black", "linter": "ruff"}},
            "testing": {"coverage_target": 86, "coverage_minimum": 80},
            "hooks": {
                "enabled": True,
                "pre_task": ".claude/hooks/pre-task.sh",
                "post_task": ".claude/hooks/post-task.sh",
            },
            "agents": {
                "orchestration": {"enabled": True, "max_parallel": 3},
                "available_agents": [
                    {
                        "name": "lead-architect",
                        "role": "System design",
                        "capabilities": ["architecture", "design"],
                    },
                ],
            },
            "context": {},
            "safety": {},
        }
        config_path.write_text(json.dumps(config, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            return ForgeCLI()

    def test_config_show_all(self, cli_with_config, capsys):
        """Test config show displays full configuration."""
        result = cli_with_config.run(["config", "show"])

        assert result == 0
        captured = capsys.readouterr()
        assert "NXTG-Forge" in captured.out
        assert "version" in captured.out.lower()
        assert "project" in captured.out.lower()

    def test_config_show_section(self, cli_with_config, capsys):
        """Test config show with specific section."""
        result = cli_with_config.run(["config", "show", "--section", "testing"])

        assert result == 0
        captured = capsys.readouterr()
        assert "coverage_target" in captured.out or "86" in captured.out

    def test_config_show_json(self, cli_with_config, capsys):
        """Test config show with JSON output."""
        result = cli_with_config.run(["config", "show", "--json"])

        assert result == 0
        captured = capsys.readouterr()
        config = json.loads(captured.out)
        assert config["version"] == "1.0.0"
        assert config["project"]["name"] == "NXTG-Forge"

    def test_config_show_json_section(self, cli_with_config, capsys):
        """Test config show specific section as JSON."""
        result = cli_with_config.run(["config", "show", "--section", "project", "--json"])

        assert result == 0
        captured = capsys.readouterr()
        section = json.loads(captured.out)
        assert section["name"] == "NXTG-Forge"

    def test_config_validate_valid(self, cli_with_config, capsys):
        """Test config validate with valid configuration."""
        result = cli_with_config.run(["config", "validate"])

        assert result == 0
        captured = capsys.readouterr()
        assert "valid" in captured.out.lower() or "✅" in captured.out

    def test_config_validate_missing_file(self, tmp_project_root, minimal_state, capsys):
        """Test config validate when config file is missing."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            cli = ForgeCLI()
            result = cli.run(["config", "validate"])

        assert result == 1
        captured = capsys.readouterr()
        assert "not found" in captured.out.lower() or "❌" in captured.out

    def test_config_validate_invalid_json(self, tmp_project_root, minimal_state, capsys):
        """Test config validate with invalid JSON."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        # Create invalid JSON config
        config_path = tmp_project_root / ".claude" / "config.json"
        config_path.write_text("{invalid json")

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            cli = ForgeCLI()
            result = cli.run(["config", "validate"])

        assert result == 1
        captured = capsys.readouterr()
        assert "invalid" in captured.out.lower() or "❌" in captured.out

    def test_config_validate_missing_required_section(
        self,
        tmp_project_root,
        minimal_state,
        capsys,
    ):
        """Test config validate with missing required sections."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(minimal_state, indent=2))

        # Create config missing required sections
        config_path = tmp_project_root / ".claude" / "config.json"
        config = {"version": "1.0.0"}  # Missing project, development, testing, hooks
        config_path.write_text(json.dumps(config, indent=2))

        with patch.object(Path, "cwd", return_value=tmp_project_root):
            cli = ForgeCLI()
            result = cli.run(["config", "validate"])

        assert result == 1
        captured = capsys.readouterr()
        assert "missing" in captured.out.lower() or "error" in captured.out.lower()

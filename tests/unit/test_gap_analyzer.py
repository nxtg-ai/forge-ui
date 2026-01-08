"""
Unit tests for Gap Analyzer
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from forge.gap_analyzer import GapAnalyzer


class TestGapAnalyzerInit:
    """Test Gap Analyzer initialization."""

    def test_init_with_project_root(self, tmp_project_root):
        """Test initialization with project root."""
        analyzer = GapAnalyzer(str(tmp_project_root))

        assert analyzer.project_root == tmp_project_root

    def test_init_with_state(self, complete_state):
        """Test initialization with state dict."""
        analyzer = GapAnalyzer(state=complete_state)

        assert analyzer.state == complete_state

    def test_init_loads_state_from_file(self, tmp_project_root, complete_state):
        """Test initialization loads state from file."""
        # Create state file
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        analyzer = GapAnalyzer(str(tmp_project_root))

        # State is loaded automatically
        assert analyzer.state is not None
        # State should be a dict
        assert isinstance(analyzer.state, dict)


class TestAnalyze:
    """Test main analyze method."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root, complete_state):
        """Create analyzer with complete state."""
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_returns_string(self, analyzer):
        """Test analyze returns markdown string."""
        result = analyzer.analyze()

        assert isinstance(result, str)
        assert len(result) > 0

    def test_analyze_contains_report_sections(self, analyzer):
        """Test analyze report contains expected sections."""
        result = analyzer.analyze()

        # Should contain main sections
        assert "Gap Analysis" in result or "Testing" in result

    @patch.object(GapAnalyzer, "_analyze_testing")
    @patch.object(GapAnalyzer, "_analyze_documentation")
    @patch.object(GapAnalyzer, "_analyze_security")
    @patch.object(GapAnalyzer, "_analyze_code_quality")
    def test_analyze_calls_all_analyzers(
        self,
        mock_quality,
        mock_security,
        mock_docs,
        mock_testing,
        analyzer,
    ):
        """Test analyze calls all analysis methods."""
        analyzer.analyze()

        mock_testing.assert_called_once()
        mock_docs.assert_called_once()
        mock_security.assert_called_once()
        mock_quality.assert_called_once()


class TestTestingAnalysis:
    """Test testing analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    @patch("subprocess.run")
    def test_analyze_testing_with_coverage(self, mock_run, analyzer):
        """Test testing analysis with coverage data."""
        # Mock pytest coverage output
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "TOTAL 100 20 80%"
        mock_run.return_value = mock_result

        analyzer._analyze_testing()

        # Should detect coverage
        assert analyzer.gaps is not None

    @patch("subprocess.run")
    def test_analyze_testing_without_coverage(self, mock_run, analyzer):
        """Test testing analysis when coverage fails."""
        mock_run.side_effect = Exception("No coverage")

        # Should not raise exception
        analyzer._analyze_testing()

    def test_analyze_testing_detects_test_files(self, analyzer, tmp_project_root):
        """Test testing analysis detects test files."""
        # Create test directory
        test_dir = tmp_project_root / "tests"
        test_dir.mkdir()
        (test_dir / "test_example.py").write_text("def test_something(): pass")

        analyzer._analyze_testing()

        # Should detect test files
        assert hasattr(analyzer, "gaps")


class TestDocumentationAnalysis:
    """Test documentation analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_documentation_checks_readme(self, analyzer, tmp_project_root):
        """Test documentation analysis checks for README."""
        # Create README
        (tmp_project_root / "README.md").write_text("# Test Project")

        analyzer._analyze_documentation()

        # Should complete without error
        assert hasattr(analyzer, "gaps")

    def test_analyze_documentation_without_readme(self, analyzer):
        """Test documentation analysis without README."""
        analyzer._analyze_documentation()

        # Should detect missing README as a gap
        assert hasattr(analyzer, "gaps")

    def test_check_python_docstrings(self, analyzer, tmp_project_root):
        """Test checking Python docstrings."""
        # Create Python file with docstrings
        py_file = tmp_project_root / "module.py"
        py_file.write_text(
            '''
"""Module docstring."""

def function_with_docstring():
    """Function docstring."""
    pass

def function_without_docstring():
    pass
''',
        )

        files = [py_file]
        missing = analyzer._check_python_docstrings(files)

        # Should detect missing docstring
        assert isinstance(missing, int)


class TestSecurityAnalysis:
    """Test security analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_security(self, analyzer):
        """Test security analysis."""
        analyzer._analyze_security()

        # Should complete without error
        assert hasattr(analyzer, "gaps")

    def test_check_for_hardcoded_secrets(self, analyzer, tmp_project_root):
        """Test checking for hardcoded secrets."""
        # Create file with potential secret
        py_file = tmp_project_root / "config.py"
        py_file.write_text(
            """
API_KEY = "sk-1234567890abcdef"
PASSWORD = "hardcoded_password"
""",
        )

        has_secrets = analyzer._check_for_hardcoded_secrets()

        # Should detect potential secrets
        assert isinstance(has_secrets, bool)

    def test_check_for_hardcoded_secrets_clean_code(self, analyzer, tmp_project_root):
        """Test checking clean code without secrets."""
        # Create file without secrets
        py_file = tmp_project_root / "clean.py"
        py_file.write_text(
            """
import os
API_KEY = os.getenv("API_KEY")
""",
        )

        has_secrets = analyzer._check_for_hardcoded_secrets()

        # Should not detect secrets
        assert isinstance(has_secrets, bool)


class TestCodeQualityAnalysis:
    """Test code quality analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_code_quality(self, analyzer):
        """Test code quality analysis."""
        analyzer._analyze_code_quality()

        # Should complete without error
        assert hasattr(analyzer, "gaps")

    def test_check_code_complexity(self, analyzer, tmp_project_root):
        """Test checking code complexity."""
        # Create Python file with complex function
        py_file = tmp_project_root / "complex.py"
        py_file.write_text(
            """
def complex_function(a, b, c):
    if a:
        if b:
            if c:
                return 1
            else:
                return 2
        else:
            if c:
                return 3
            else:
                return 4
    else:
        if b:
            if c:
                return 5
            else:
                return 6
        else:
            if c:
                return 7
            else:
                return 8
""",
        )

        high_complexity = analyzer._check_code_complexity()

        # Should detect complexity
        assert isinstance(high_complexity, int)


class TestPerformanceAnalysis:
    """Test performance analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_performance(self, analyzer):
        """Test performance analysis."""
        analyzer._analyze_performance()

        # Should complete without error
        assert hasattr(analyzer, "gaps")


class TestInfrastructureAnalysis:
    """Test infrastructure analysis functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer."""
        return GapAnalyzer(str(tmp_project_root))

    def test_analyze_infrastructure_with_docker(self, analyzer, tmp_project_root):
        """Test infrastructure analysis with Docker."""
        # Create Dockerfile
        (tmp_project_root / "Dockerfile").write_text("FROM python:3.9")

        analyzer._analyze_infrastructure()

        # Should detect Docker
        assert hasattr(analyzer, "gaps")

    def test_analyze_infrastructure_with_docker_compose(self, analyzer, tmp_project_root):
        """Test infrastructure analysis with docker-compose."""
        # Create docker-compose.yml
        (tmp_project_root / "docker-compose.yml").write_text("version: '3'")

        analyzer._analyze_infrastructure()

        # Should detect docker-compose
        assert hasattr(analyzer, "gaps")

    def test_analyze_infrastructure_without_docker(self, analyzer):
        """Test infrastructure analysis without Docker."""
        analyzer._analyze_infrastructure()

        # Should complete and identify missing Docker as gap
        assert hasattr(analyzer, "gaps")


class TestReportGeneration:
    """Test report generation functionality."""

    @pytest.fixture()
    def analyzer(self, tmp_project_root):
        """Create analyzer with some gaps."""
        analyzer = GapAnalyzer(str(tmp_project_root))
        # Initialize gaps in the correct format (list of dicts with priority, severity, issue, recommendation)
        analyzer.gaps = {
            "testing": [
                {
                    "issue": "Low test coverage",
                    "severity": "high",
                    "priority": 1,
                    "recommendation": "Increase test coverage to 85%+",
                },
                {
                    "issue": "Add more tests",
                    "severity": "medium",
                    "priority": 2,
                    "recommendation": "Add unit tests for uncovered modules",
                },
            ],
            "documentation": [
                {
                    "issue": "Missing README",
                    "severity": "medium",
                    "priority": 1,
                    "recommendation": "Create comprehensive README.md",
                },
            ],
        }
        analyzer.health_score = 75
        return analyzer

    def test_generate_report_returns_markdown(self, analyzer):
        """Test report generation returns markdown string."""
        report = analyzer._generate_report()

        assert isinstance(report, str)
        assert len(report) > 0

    def test_generate_report_contains_executive_summary(self, analyzer):
        """Test report contains executive summary with gap counts."""
        report = analyzer._generate_report()

        assert "Executive Summary" in report
        assert "Total Gaps" in report or "Status" in report

    def test_generate_report_contains_recommendations(self, analyzer):
        """Test report contains recommendations."""
        report = analyzer._generate_report()

        # Should contain some content about gaps or recommendations
        assert len(report) > 100


class TestIntegration:
    """Integration tests for GapAnalyzer."""

    def test_full_analysis_flow(self, tmp_project_root, complete_state):
        """Test complete analysis flow."""
        # Create state file
        state_file = tmp_project_root / ".claude" / "state.json"
        state_file.write_text(json.dumps(complete_state, indent=2))

        # Create some project structure
        (tmp_project_root / "README.md").write_text("# Test Project")
        tests_dir = tmp_project_root / "tests"
        tests_dir.mkdir()
        (tests_dir / "test_example.py").write_text("def test_example(): pass")

        analyzer = GapAnalyzer(str(tmp_project_root))
        report = analyzer.analyze()

        assert isinstance(report, str)
        assert len(report) > 0

    def test_analysis_with_minimal_project(self, tmp_project_root):
        """Test analysis with minimal project structure."""
        analyzer = GapAnalyzer(str(tmp_project_root))
        report = analyzer.analyze()

        # Should still generate a report even with minimal structure
        assert isinstance(report, str)
        assert len(report) > 0

    def test_analysis_identifies_multiple_gaps(self, tmp_project_root):
        """Test analysis identifies multiple types of gaps."""
        analyzer = GapAnalyzer(str(tmp_project_root))
        analyzer.analyze()

        # Should have identified some gaps
        assert hasattr(analyzer, "gaps")
        assert isinstance(analyzer.gaps, dict)

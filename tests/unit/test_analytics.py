"""Unit tests for analytics module."""

from datetime import datetime, timedelta

from forge.analytics import (
    Metric,
    ProjectAnalytics,
    Trend,
    record_quality_score,
    record_test_coverage,
    record_velocity,
)


class TestMetric:
    """Tests for Metric dataclass."""

    def test_metric_creation(self):
        """Test creating a metric."""
        metric = Metric(name="test_metric", value=42.0, tags={"type": "test"})

        assert metric.name == "test_metric"
        assert metric.value == 42.0
        assert metric.tags == {"type": "test"}
        assert isinstance(metric.timestamp, str)
        assert metric.timestamp.endswith("Z")

    def test_metric_with_metadata(self):
        """Test creating a metric with metadata."""
        metric = Metric(
            name="coverage",
            value=85.5,
            tags={"type": "quality"},
            metadata={"unit": "percent"},
        )

        assert metric.metadata == {"unit": "percent"}


class TestTrend:
    """Tests for Trend dataclass."""

    def test_trend_creation(self):
        """Test creating a trend."""
        trend = Trend(
            metric_name="test_coverage",
            direction="up",
            change_percent=5.0,
            current_value=90.0,
            previous_value=85.0,
            period_days=7,
        )

        assert trend.metric_name == "test_coverage"
        assert trend.direction == "up"
        assert trend.change_percent == 5.0
        assert trend.current_value == 90.0


class TestProjectAnalytics:
    """Tests for ProjectAnalytics class."""

    def test_initialization(self, tmp_path):
        """Test initializing analytics."""
        analytics = ProjectAnalytics(tmp_path)

        assert analytics.project_root == tmp_path
        assert analytics.metrics_dir == tmp_path / ".claude" / "analytics"
        assert analytics.metrics_dir.exists()
        assert isinstance(analytics.metrics, list)

    def test_record_metric(self, tmp_path):
        """Test recording a metric."""
        analytics = ProjectAnalytics(tmp_path)

        metric = analytics.record_metric(name="test_metric", value=42.0, tags={"type": "test"})

        assert metric.name == "test_metric"
        assert metric.value == 42.0
        assert len(analytics.metrics) == 1

    def test_save_and_load_metrics(self, tmp_path):
        """Test saving and loading metrics."""
        analytics = ProjectAnalytics(tmp_path)
        analytics.record_metric("metric1", 10.0)
        analytics.record_metric("metric2", 20.0)

        # Create new instance to test loading
        analytics2 = ProjectAnalytics(tmp_path)

        assert len(analytics2.metrics) == 2
        assert analytics2.metrics[0].name == "metric1"
        assert analytics2.metrics[1].name == "metric2"

    def test_get_metrics_by_name(self, tmp_path):
        """Test filtering metrics by name."""
        analytics = ProjectAnalytics(tmp_path)
        analytics.record_metric("coverage", 85.0)
        analytics.record_metric("coverage", 86.0)
        analytics.record_metric("velocity", 5.0)

        coverage_metrics = analytics.get_metrics(name="coverage")

        assert len(coverage_metrics) == 2
        assert all(m.name == "coverage" for m in coverage_metrics)

    def test_get_metrics_by_date_range(self, tmp_path):
        """Test filtering metrics by date range."""
        analytics = ProjectAnalytics(tmp_path)

        # Record metrics
        analytics.record_metric("test", 1.0)
        analytics.record_metric("test", 2.0)

        # Get metrics from last hour
        now = datetime.utcnow()
        start_date = now - timedelta(hours=1)

        metrics = analytics.get_metrics(name="test", start_date=start_date)

        assert len(metrics) == 2

    def test_get_metrics_by_tags(self, tmp_path):
        """Test filtering metrics by tags."""
        analytics = ProjectAnalytics(tmp_path)
        analytics.record_metric("metric1", 1.0, tags={"type": "quality"})
        analytics.record_metric("metric2", 2.0, tags={"type": "performance"})
        analytics.record_metric("metric3", 3.0, tags={"type": "quality"})

        quality_metrics = analytics.get_metrics(tags={"type": "quality"})

        assert len(quality_metrics) == 2

    def test_calculate_trend_up(self, tmp_path):
        """Test calculating upward trend."""
        analytics = ProjectAnalytics(tmp_path)

        # Record metrics with increasing values
        for i in range(10):
            analytics.record_metric("coverage", 80.0 + i)

        trend = analytics.calculate_trend("coverage", period_days=7)

        assert trend is not None
        assert trend.direction == "up"
        assert trend.change_percent > 0

    def test_calculate_trend_down(self, tmp_path):
        """Test calculating downward trend."""
        analytics = ProjectAnalytics(tmp_path)

        # Record metrics with decreasing values
        for i in range(10):
            analytics.record_metric("quality", 100.0 - (i * 2))

        trend = analytics.calculate_trend("quality", period_days=7)

        assert trend is not None
        assert trend.direction == "down"
        assert trend.change_percent < 0

    def test_calculate_trend_stable(self, tmp_path):
        """Test calculating stable trend."""
        analytics = ProjectAnalytics(tmp_path)

        # Record metrics with similar values
        for i in range(10):
            analytics.record_metric("metric", 50.0 + (i * 0.1))

        trend = analytics.calculate_trend("metric", period_days=7)

        assert trend is not None
        assert trend.direction == "stable"
        assert abs(trend.change_percent) < 5

    def test_calculate_trend_insufficient_data(self, tmp_path):
        """Test trend calculation with insufficient data."""
        analytics = ProjectAnalytics(tmp_path)
        analytics.record_metric("metric", 1.0)

        trend = analytics.calculate_trend("metric", period_days=7)

        assert trend is None

    def test_get_coverage_trend(self, tmp_path):
        """Test getting coverage trend."""
        analytics = ProjectAnalytics(tmp_path)

        for i in range(10):
            analytics.record_metric("test_coverage", 80.0 + i)

        trend = analytics.get_coverage_trend(period_days=30)

        assert trend is not None
        assert trend.metric_name == "test_coverage"

    def test_get_velocity_trend(self, tmp_path):
        """Test getting velocity trend."""
        analytics = ProjectAnalytics(tmp_path)

        for i in range(10):
            analytics.record_metric("velocity", float(i + 1))

        trend = analytics.get_velocity_trend(period_days=14)

        assert trend is not None
        assert trend.metric_name == "velocity"

    def test_get_quality_score_trend(self, tmp_path):
        """Test getting quality score trend."""
        analytics = ProjectAnalytics(tmp_path)

        for i in range(10):
            analytics.record_metric("quality_score", 90.0 + i * 0.5)

        trend = analytics.get_quality_score_trend(period_days=30)

        assert trend is not None
        assert trend.metric_name == "quality_score"

    def test_generate_summary(self, tmp_path):
        """Test generating analytics summary."""
        analytics = ProjectAnalytics(tmp_path)

        # Record various metrics
        analytics.record_metric("test_coverage", 85.0)
        analytics.record_metric("test_coverage", 86.0)
        analytics.record_metric("velocity", 5.0)

        summary = analytics.generate_summary(period_days=30)

        assert "period_days" in summary
        assert "total_metrics" in summary
        assert "metrics" in summary
        assert summary["total_metrics"] == 3
        assert summary["unique_metrics"] == 2

    def test_export_report(self, tmp_path):
        """Test exporting analytics report."""
        analytics = ProjectAnalytics(tmp_path)

        # Record metrics
        for i in range(10):
            analytics.record_metric("test_coverage", 80.0 + i)
            analytics.record_metric("velocity", float(i + 1))

        output_file = tmp_path / "analytics-report.md"
        analytics.export_report(output_file, period_days=30)

        assert output_file.exists()
        content = output_file.read_text()
        assert "# Project Analytics Report" in content
        assert "Test Coverage" in content
        assert "Velocity" in content


class TestConvenienceFunctions:
    """Tests for convenience functions."""

    def test_record_test_coverage(self, tmp_path):
        """Test recording test coverage."""
        record_test_coverage(tmp_path, 86.5)

        analytics = ProjectAnalytics(tmp_path)
        metrics = analytics.get_metrics(name="test_coverage")

        assert len(metrics) == 1
        assert metrics[0].value == 86.5
        assert metrics[0].tags == {"type": "quality"}

    def test_record_quality_score(self, tmp_path):
        """Test recording quality score."""
        record_quality_score(tmp_path, 95.0)

        analytics = ProjectAnalytics(tmp_path)
        metrics = analytics.get_metrics(name="quality_score")

        assert len(metrics) == 1
        assert metrics[0].value == 95.0
        assert metrics[0].tags == {"type": "quality"}

    def test_record_velocity(self, tmp_path):
        """Test recording velocity."""
        record_velocity(tmp_path, 8)

        analytics = ProjectAnalytics(tmp_path)
        metrics = analytics.get_metrics(name="velocity")

        assert len(metrics) == 1
        assert metrics[0].value == 8.0
        assert metrics[0].tags == {"type": "productivity"}

"""Text-based chart visualization utilities for terminal output.

Provides ASCII/Unicode bar charts, line charts, sparklines, and trend indicators
that are terminal-compatible and respect accessibility standards.
"""

import os
import sys
from dataclasses import dataclass
from enum import Enum


class TrendDirection(Enum):
    """Trend direction indicators."""

    UP = "↑"
    DOWN = "↓"
    STABLE = "→"
    UNKNOWN = "·"


@dataclass
class TrendIndicator:
    """Represents a trend with direction and color."""

    direction: TrendDirection
    value: float
    previous: float | None = None
    color: bool = True

    def render(self) -> str:
        """Render trend indicator with optional color.

        Returns:
            Formatted trend string
        """
        symbol = self.direction.value

        if self.previous is not None:
            delta = self.value - self.previous
            delta_str = f" ({delta:+.1f})"
        else:
            delta_str = ""

        # Color coding (if enabled and terminal supports it)
        if self.color and self._supports_color():
            if self.direction == TrendDirection.UP:
                return f"\033[32m{symbol}\033[0m{delta_str}"  # Green
            elif self.direction == TrendDirection.DOWN:
                return f"\033[31m{symbol}\033[0m{delta_str}"  # Red
            else:
                return f"\033[33m{symbol}\033[0m{delta_str}"  # Yellow

        return f"{symbol}{delta_str}"

    @staticmethod
    def _supports_color() -> bool:
        """Check if terminal supports color.

        Returns:
            True if colors are supported
        """
        return sys.stdout.isatty() and os.getenv("TERM") != "dumb" and os.getenv("NO_COLOR") is None


@dataclass
class BarChart:
    """ASCII/Unicode bar chart for displaying metrics."""

    data: dict[str, float]
    width: int = 40
    show_values: bool = True
    use_unicode: bool = True

    def render(self) -> str:
        """Render bar chart as multi-line string.

        Returns:
            Formatted bar chart
        """
        if not self.data:
            return "No data"

        max_value = max(self.data.values()) if self.data else 1
        max_label_len = max(len(label) for label in self.data.keys())

        lines = []
        for label, value in self.data.items():
            # Calculate bar length
            bar_length = int((value / max_value) * self.width) if max_value > 0 else 0

            # Choose bar character
            if self.use_unicode and self._supports_unicode():
                bar = "▓" * bar_length + "░" * (self.width - bar_length)
            else:
                bar = "=" * bar_length + " " * (self.width - bar_length)

            # Format line
            label_padded = label.ljust(max_label_len)
            if self.show_values:
                line = f"{label_padded} {bar} {value:.1f}"
            else:
                line = f"{label_padded} {bar}"

            lines.append(line)

        return "\n".join(lines)

    @staticmethod
    def _supports_unicode() -> bool:
        """Check if terminal supports Unicode.

        Returns:
            True if Unicode is supported
        """
        try:
            encoding = sys.stdout.encoding or "ascii"
            return "utf" in encoding.lower()
        except Exception:
            return False


@dataclass
class LineChart:
    """ASCII line chart for trends over time."""

    data: list[float]
    height: int = 10
    width: int = 50
    show_axes: bool = True
    label: str = ""

    def render(self) -> str:
        """Render line chart as multi-line string.

        Returns:
            Formatted line chart
        """
        if not self.data:
            return "No data"

        min_val = min(self.data)
        max_val = max(self.data)
        value_range = max_val - min_val if max_val != min_val else 1

        # Create grid
        grid = [[" " for _ in range(self.width)] for _ in range(self.height)]

        # Plot points
        for i, value in enumerate(self.data):
            x = int((i / (len(self.data) - 1)) * (self.width - 1)) if len(self.data) > 1 else 0
            y = self.height - 1 - int(((value - min_val) / value_range) * (self.height - 1))

            if 0 <= x < self.width and 0 <= y < self.height:
                grid[y][x] = "●" if self._supports_unicode() else "*"

                # Connect with lines
                if i > 0:
                    prev_value = self.data[i - 1]
                    prev_x = int(((i - 1) / (len(self.data) - 1)) * (self.width - 1))
                    prev_y = (
                        self.height
                        - 1
                        - int(((prev_value - min_val) / value_range) * (self.height - 1))
                    )

                    # Draw line between points
                    self._draw_line(grid, prev_x, prev_y, x, y)

        # Build output
        lines = []

        if self.label:
            lines.append(f"┌─ {self.label} " + "─" * (self.width - len(self.label) - 4) + "┐")

        for row in grid:
            line = "".join(row)
            if self.show_axes:
                lines.append(f"│{line}│")
            else:
                lines.append(line)

        if self.show_axes:
            lines.append("└" + "─" * self.width + "┘")
            lines.append(f"  {min_val:.1f}{' ' * (self.width - 10)}{max_val:.1f}")

        return "\n".join(lines)

    def _draw_line(self, grid: list[list[str]], x1: int, y1: int, x2: int, y2: int) -> None:
        """Draw line between two points using Bresenham's algorithm.

        Args:
            grid: Grid to draw on
            x1, y1: Start point
            x2, y2: End point
        """
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        sx = 1 if x1 < x2 else -1
        sy = 1 if y1 < y2 else -1
        err = dx - dy

        x, y = x1, y1

        while True:
            if 0 <= x < self.width and 0 <= y < self.height:
                if grid[y][x] == " ":
                    grid[y][x] = "·" if self._supports_unicode() else "."

            if x == x2 and y == y2:
                break

            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy

    @staticmethod
    def _supports_unicode() -> bool:
        """Check if terminal supports Unicode.

        Returns:
            True if Unicode is supported
        """
        try:
            encoding = sys.stdout.encoding or "ascii"
            return "utf" in encoding.lower()
        except Exception:
            return False


@dataclass
class Sparkline:
    """Inline sparkline for compact trend visualization."""

    data: list[float]
    use_unicode: bool = True

    def render(self) -> str:
        """Render sparkline as single-line string.

        Returns:
            Sparkline string
        """
        if not self.data:
            return "─"

        if not self.use_unicode or not self._supports_unicode():
            # ASCII fallback
            return self._render_ascii()

        # Unicode sparkline characters
        chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]

        min_val = min(self.data)
        max_val = max(self.data)
        value_range = max_val - min_val if max_val != min_val else 1

        sparkline = ""
        for value in self.data:
            normalized = (value - min_val) / value_range
            index = int(normalized * (len(chars) - 1))
            sparkline += chars[index]

        return sparkline

    def _render_ascii(self) -> str:
        """Render ASCII fallback sparkline.

        Returns:
            ASCII sparkline
        """
        if not self.data:
            return "-"

        min_val = min(self.data)
        max_val = max(self.data)
        value_range = max_val - min_val if max_val != min_val else 1

        chars = ["-", ".", ":", "=", "#"]
        sparkline = ""

        for value in self.data:
            normalized = (value - min_val) / value_range
            index = int(normalized * (len(chars) - 1))
            sparkline += chars[index]

        return sparkline

    @staticmethod
    def _supports_unicode() -> bool:
        """Check if terminal supports Unicode.

        Returns:
            True if Unicode is supported
        """
        try:
            encoding = sys.stdout.encoding or "ascii"
            return "utf" in encoding.lower()
        except Exception:
            return False


# Convenience functions


def create_bar_chart(
    data: dict[str, float],
    width: int = 40,
    show_values: bool = True,
    use_unicode: bool = True,
) -> str:
    """Create and render a bar chart.

    Args:
        data: Dictionary mapping labels to values
        width: Width of the bar in characters
        show_values: Whether to show numeric values
        use_unicode: Whether to use Unicode characters

    Returns:
        Rendered bar chart string
    """
    chart = BarChart(data=data, width=width, show_values=show_values, use_unicode=use_unicode)
    return chart.render()


def create_line_chart(
    data: list[float],
    height: int = 10,
    width: int = 50,
    show_axes: bool = True,
    label: str = "",
) -> str:
    """Create and render a line chart.

    Args:
        data: List of numeric values
        height: Height of chart in lines
        width: Width of chart in characters
        show_axes: Whether to show axes
        label: Optional label for chart

    Returns:
        Rendered line chart string
    """
    chart = LineChart(data=data, height=height, width=width, show_axes=show_axes, label=label)
    return chart.render()


def create_sparkline(data: list[float], use_unicode: bool = True) -> str:
    """Create and render a sparkline.

    Args:
        data: List of numeric values
        use_unicode: Whether to use Unicode characters

    Returns:
        Rendered sparkline string
    """
    sparkline = Sparkline(data=data, use_unicode=use_unicode)
    return sparkline.render()


def render_trend(
    value: float,
    previous: float | None = None,
    color: bool = True,
) -> str:
    """Render a trend indicator.

    Args:
        value: Current value
        previous: Previous value (optional)
        color: Whether to use color

    Returns:
        Rendered trend indicator
    """
    if previous is None:
        direction = TrendDirection.UNKNOWN
    elif value > previous:
        direction = TrendDirection.UP
    elif value < previous:
        direction = TrendDirection.DOWN
    else:
        direction = TrendDirection.STABLE

    indicator = TrendIndicator(direction=direction, value=value, previous=previous, color=color)
    return indicator.render()


# Example usage demonstration
if __name__ == "__main__":
    print("=== Bar Chart Example ===")
    test_data = {
        "Test Coverage": 89.5,
        "Linting": 95.0,
        "Security": 100.0,
        "Documentation": 75.0,
    }
    print(create_bar_chart(test_data))

    print("\n=== Line Chart Example ===")
    coverage_trend = [82.0, 85.0, 84.0, 86.0, 89.0, 89.5]
    print(create_line_chart(coverage_trend, label="Coverage Trend (7 days)"))

    print("\n=== Sparkline Example ===")
    print(f"Coverage: {create_sparkline(coverage_trend)}")

    print("\n=== Trend Indicators ===")
    print(f"Coverage: 89.5% {render_trend(89.5, 85.0)}")
    print(f"Tests: 142 {render_trend(142.0, 138.0)}")
    print(f"Errors: 3 {render_trend(3.0, 8.0)}")

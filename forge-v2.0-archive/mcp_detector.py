#!/usr/bin/env python3
"""NXTG-Forge MCP Detector

Python wrapper for MCP auto-detection and configuration with explicit error handling.
"""

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.table import Table

from forge.result import Err, Ok, Result


console = Console()


@dataclass(frozen=True)
class MCPDetectionError:
    """MCP detection errors."""

    message: str
    context: str | None = None

    @staticmethod
    def script_not_found(path: str) -> "MCPDetectionError":
        return MCPDetectionError(f"MCP auto-detect script not found: {path}")

    @staticmethod
    def detection_failed(reason: str) -> "MCPDetectionError":
        return MCPDetectionError("MCP detection failed", reason)

    @staticmethod
    def timeout(detail: str) -> "MCPDetectionError":
        return MCPDetectionError("MCP detection timed out", detail)

    @staticmethod
    def parse_failed(detail: str) -> "MCPDetectionError":
        return MCPDetectionError("Failed to parse detection output", detail)

    @staticmethod
    def file_not_found(path: str) -> "MCPDetectionError":
        return MCPDetectionError(f"File not found: {path}")

    @staticmethod
    def invalid_json(path: str, detail: str) -> "MCPDetectionError":
        return MCPDetectionError(f"Invalid JSON in {path}", detail)

    @staticmethod
    def configuration_failed(server: str, reason: str) -> "MCPDetectionError":
        return MCPDetectionError(f"Failed to configure {server}", reason)

    @staticmethod
    def state_update_failed(reason: str) -> "MCPDetectionError":
        return MCPDetectionError("Failed to update state", reason)


@dataclass
class MCPRecommendation:
    """MCP server recommendation."""

    name: str
    priority: str
    reason: str


class MCPDetector:
    """Detects and configures MCP servers with explicit error handling."""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.auto_detect_script = self.project_root / ".mcp" / "auto-detect.js"
        self.state_file = self.project_root / ".claude" / "state.json"
        self.recommendations: list[MCPRecommendation] = []

    def detect(self) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Run MCP auto-detection.

        Returns:
            Result containing list of recommendations or error
        """
        console.print("[cyan]🔍 Detecting required MCP servers...[/cyan]\n")

        if not self.auto_detect_script.exists():
            console.print("[yellow]⚠ MCP auto-detect script not found[/yellow]")
            return self._fallback_detection()

        return self._run_js_detection()

    def _run_js_detection(self) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Run JavaScript-based detection.

        Returns:
            Result containing recommendations or error
        """
        try:
            result = subprocess.run(
                ["node", str(self.auto_detect_script)],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.returncode == 0:
                return self._parse_detection_output(result.stdout)
            else:
                console.print(f"[yellow]⚠ MCP detection failed: {result.stderr}[/yellow]")
                return self._fallback_detection()

        except subprocess.TimeoutExpired:
            console.print("[yellow]⚠ MCP detection timed out[/yellow]")
            return self._fallback_detection()
        except FileNotFoundError:
            return Err(MCPDetectionError.detection_failed("Node.js not found"))
        except Exception as e:
            console.print(f"[yellow]⚠ Error running MCP detection: {e}[/yellow]")
            return self._fallback_detection()

    def _parse_detection_output(
        self,
        output: str,
    ) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Parse detection output to extract recommendations.

        Args:
            output: Raw output from detection script

        Returns:
            Result containing parsed recommendations or error
        """
        recommendations = []

        # Look for JSON in output
        try:
            # Try to find JSON block in output
            json_match = None
            for line in output.split("\n"):
                stripped = line.strip()
                if stripped.startswith("[") or stripped.startswith("{"):
                    try:
                        json_match = json.loads(stripped)
                        break
                    except json.JSONDecodeError:
                        continue

            if json_match:
                if isinstance(json_match, list):
                    for item in json_match:
                        recommendations.append(
                            MCPRecommendation(
                                name=item.get("name", ""),
                                priority=item.get("priority", "medium"),
                                reason=item.get("reason", "Detected"),
                            ),
                        )
                elif isinstance(json_match, dict):
                    recommendations.append(
                        MCPRecommendation(
                            name=json_match.get("name", ""),
                            priority=json_match.get("priority", "medium"),
                            reason=json_match.get("reason", "Detected"),
                        ),
                    )

        except Exception as e:
            return Err(MCPDetectionError.parse_failed(str(e)))

        # If parsing failed, try text extraction
        if not recommendations:
            return self._extract_from_text(output)

        self.recommendations = recommendations
        return Ok(recommendations)

    def _extract_from_text(self, output: str) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Extract recommendations from text output.

        Args:
            output: Text output to parse

        Returns:
            Result containing extracted recommendations
        """
        recommendations = []

        # Common patterns in output
        for line in output.split("\n"):
            lower_line = line.lower()
            if "github" in lower_line:
                recommendations.append(
                    MCPRecommendation(
                        name="github",
                        priority="high",
                        reason="GitHub integration detected",
                    ),
                )
            elif "postgres" in lower_line:
                recommendations.append(
                    MCPRecommendation(
                        name="postgres",
                        priority="high",
                        reason="PostgreSQL detected",
                    ),
                )
            elif "stripe" in lower_line:
                recommendations.append(
                    MCPRecommendation(
                        name="stripe",
                        priority="medium",
                        reason="Stripe integration detected",
                    ),
                )

        self.recommendations = recommendations
        return Ok(recommendations)

    def _fallback_detection(self) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Fallback detection using Python-based analysis.

        Returns:
            Result containing recommendations or error
        """
        recommendations = []

        # Load state if exists
        state_result = self._load_state()
        if state_result.is_ok():
            state = state_result.value
            recommendations.extend(self._detect_from_state(state))

        # Check for git repo
        git_result = self._detect_git_repo()
        if git_result.is_ok():
            recommendations.append(git_result.value)

        # Check for requirements.txt
        requirements_result = self._detect_from_requirements()
        if requirements_result.is_ok():
            recommendations.extend(requirements_result.value)

        # Deduplicate
        unique_recommendations = self._deduplicate(recommendations)
        self.recommendations = unique_recommendations
        return Ok(unique_recommendations)

    def _load_state(self) -> Result[dict[str, Any], MCPDetectionError]:
        """Load state file if it exists.

        Returns:
            Result containing state dict or error
        """
        if not self.state_file.exists():
            return Err(MCPDetectionError.file_not_found(str(self.state_file)))

        try:
            with open(self.state_file) as f:
                state = json.load(f)
            return Ok(state)
        except json.JSONDecodeError as e:
            return Err(MCPDetectionError.invalid_json(str(self.state_file), str(e)))
        except Exception as e:
            return Err(MCPDetectionError.detection_failed(f"Failed to read state: {e}"))

    def _detect_from_state(self, state: dict[str, Any]) -> list[MCPRecommendation]:
        """Detect recommendations from state data.

        Args:
            state: State dictionary

        Returns:
            List of recommendations
        """
        recommendations = []
        arch = state.get("architecture", {})

        # Database detection
        db_type = arch.get("database", {}).get("type")
        if db_type == "postgresql":
            recommendations.append(
                MCPRecommendation(
                    name="postgres",
                    priority="high",
                    reason="PostgreSQL in architecture",
                ),
            )
        elif db_type == "mysql":
            recommendations.append(
                MCPRecommendation(
                    name="mysql",
                    priority="high",
                    reason="MySQL in architecture",
                ),
            )

        # Cache detection
        cache_type = arch.get("cache", {}).get("type")
        if cache_type == "redis":
            recommendations.append(
                MCPRecommendation(
                    name="redis",
                    priority="medium",
                    reason="Redis in architecture",
                ),
            )

        return recommendations

    def _detect_git_repo(self) -> Result[MCPRecommendation, MCPDetectionError]:
        """Detect GitHub repository.

        Returns:
            Result containing GitHub recommendation or error
        """
        if not (self.project_root / ".git").exists():
            return Err(MCPDetectionError.detection_failed("Not a git repository"))

        try:
            remote = subprocess.check_output(
                ["git", "remote", "get-url", "origin"],
                cwd=self.project_root,
                stderr=subprocess.DEVNULL,
                text=True,
                timeout=5,
            ).strip()

            if "github.com" in remote:
                return Ok(
                    MCPRecommendation(
                        name="github",
                        priority="high",
                        reason="GitHub repository detected",
                    ),
                )

            return Err(MCPDetectionError.detection_failed("Not a GitHub repository"))
        except subprocess.TimeoutExpired:
            return Err(MCPDetectionError.timeout("git remote command timed out"))
        except subprocess.CalledProcessError:
            return Err(MCPDetectionError.detection_failed("No git remote configured"))
        except FileNotFoundError:
            return Err(MCPDetectionError.detection_failed("Git not installed"))
        except Exception as e:
            return Err(MCPDetectionError.detection_failed(f"Git detection failed: {e}"))

    def _detect_from_requirements(self) -> Result[list[MCPRecommendation], MCPDetectionError]:
        """Detect from requirements.txt.

        Returns:
            Result containing recommendations or error
        """
        requirements_file = self.project_root / "requirements.txt"
        if not requirements_file.exists():
            return Err(MCPDetectionError.file_not_found(str(requirements_file)))

        try:
            with open(requirements_file) as f:
                requirements = f.read().lower()

            recommendations = []

            if "stripe" in requirements:
                recommendations.append(
                    MCPRecommendation(
                        name="stripe",
                        priority="high",
                        reason="Stripe in dependencies",
                    ),
                )

            if "psycopg" in requirements or "sqlalchemy" in requirements:
                recommendations.append(
                    MCPRecommendation(
                        name="postgres",
                        priority="high",
                        reason="PostgreSQL drivers detected",
                    ),
                )

            return Ok(recommendations)
        except Exception as e:
            return Err(MCPDetectionError.detection_failed(f"Failed to read requirements: {e}"))

    def _deduplicate(self, recommendations: list[MCPRecommendation]) -> list[MCPRecommendation]:
        """Remove duplicate recommendations.

        Args:
            recommendations: List of recommendations

        Returns:
            Deduplicated list
        """
        seen = set()
        unique = []
        for rec in recommendations:
            if rec.name not in seen:
                seen.add(rec.name)
                unique.append(rec)
        return unique

    def configure(self) -> Result[None, MCPDetectionError]:
        """Configure detected MCP servers.

        Returns:
            Result indicating success or error
        """
        if not self.recommendations:
            detect_result = self.detect()
            if detect_result.is_error():
                return Err(detect_result.error)
            self.recommendations = detect_result.value

        console.print("\n[cyan]⚙️  Configuring MCP servers...[/cyan]\n")

        errors = []
        for rec in self.recommendations:
            result = self._configure_server(rec)
            if result.is_error():
                errors.append((rec.name, result.error))

        # Update state
        update_result = self._update_state()
        if update_result.is_error():
            return update_result

        if errors:
            error_details = ", ".join(f"{name}: {err.message}" for name, err in errors)
            return Err(MCPDetectionError.configuration_failed("multiple", error_details))

        console.print("\n[green]✓ MCP servers configured![/green]\n")
        return Ok(None)

    def _configure_server(
        self,
        recommendation: MCPRecommendation,
    ) -> Result[None, MCPDetectionError]:
        """Configure a single MCP server.

        Args:
            recommendation: Server recommendation

        Returns:
            Result indicating success or error
        """
        server_name = recommendation.name
        console.print(f"[cyan]Adding {server_name}...[/cyan]")

        # Get server config
        config_result = self._get_server_config(server_name)
        if config_result.is_error():
            console.print(f"[yellow]⚠ No config available for {server_name}[/yellow]")
            return config_result

        config = config_result.value

        try:
            # Use claude CLI to add MCP server
            config_json = json.dumps(config)

            cmd = ["claude", "mcp", "add-json", server_name, config_json, "--scope", "user"]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)

            if result.returncode == 0:
                console.print(f"[green]✓ {server_name} configured[/green]")
                return Ok(None)
            else:
                return Err(
                    MCPDetectionError.configuration_failed(
                        server_name,
                        result.stderr or "Unknown error",
                    ),
                )

        except subprocess.TimeoutExpired:
            return Err(MCPDetectionError.timeout(f"Configuration of {server_name} timed out"))
        except Exception as e:
            return Err(MCPDetectionError.configuration_failed(server_name, str(e)))

    def _get_server_config(self, server_name: str) -> Result[dict[str, Any], MCPDetectionError]:
        """Get configuration for MCP server.

        Args:
            server_name: Name of the server

        Returns:
            Result containing server config or error
        """
        # Check if server config file exists
        server_config_file = self.project_root / ".mcp" / "servers" / f"{server_name}.json"

        if server_config_file.exists():
            try:
                with open(server_config_file) as f:
                    config_data: dict[str, Any] = json.load(f)
                return Ok(config_data)
            except json.JSONDecodeError as e:
                return Err(MCPDetectionError.invalid_json(str(server_config_file), str(e)))
            except Exception as e:
                return Err(MCPDetectionError.detection_failed(f"Failed to read config: {e}"))

        # Fallback to default configs
        default_configs = {
            "github": {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"],
                "env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"},
            },
            "postgres": {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-postgres"],
                "env": {"DATABASE_URL": "${DATABASE_URL}"},
            },
            "stripe": {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", "mcp-stripe"],
                "env": {"STRIPE_API_KEY": "${STRIPE_API_KEY}"},
            },
            "redis": {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", "mcp-redis"],
                "env": {"REDIS_URL": "${REDIS_URL}"},
            },
        }

        config = default_configs.get(server_name)
        if config:
            return Ok(config)

        return Err(MCPDetectionError.detection_failed(f"No configuration for {server_name}"))

    def _update_state(self) -> Result[None, MCPDetectionError]:
        """Update state.json with configured MCP servers.

        Returns:
            Result indicating success or error
        """
        if not self.state_file.exists():
            # State file doesn't exist, nothing to update
            return Ok(None)

        try:
            with open(self.state_file) as f:
                state = json.load(f)
        except json.JSONDecodeError as e:
            return Err(MCPDetectionError.invalid_json(str(self.state_file), str(e)))
        except Exception as e:
            return Err(MCPDetectionError.state_update_failed(f"Failed to read state: {e}"))

        if "mcp_servers" not in state:
            state["mcp_servers"] = {"configured": [], "recommended": []}

        # Add to configured list
        for rec in self.recommendations:
            # Check if already configured
            if not any(s["name"] == rec.name for s in state["mcp_servers"]["configured"]):
                state["mcp_servers"]["configured"].append(
                    {
                        "name": rec.name,
                        "status": "connected",
                        "auto_detected": True,
                        "reason": rec.reason,
                        "priority": rec.priority,
                    },
                )

        try:
            with open(self.state_file, "w") as f:
                json.dump(state, f, indent=2)
            return Ok(None)
        except Exception as e:
            return Err(MCPDetectionError.state_update_failed(f"Failed to write state: {e}"))

    def display_recommendations(self) -> None:
        """Display recommendations in a table."""
        if not self.recommendations:
            console.print("[yellow]No MCP servers recommended[/yellow]")
            return

        table = Table(title="MCP Server Recommendations")

        table.add_column("Priority", style="cyan", no_wrap=True)
        table.add_column("Server", style="magenta")
        table.add_column("Reason", style="green")

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        sorted_recs = sorted(
            self.recommendations,
            key=lambda x: priority_order.get(x.priority, 3),
        )

        for rec in sorted_recs:
            priority = rec.priority
            icon = "⚡" if priority == "high" else "●" if priority == "medium" else "○"

            table.add_row(f"{icon} {priority}", rec.name, rec.reason)

        console.print(table)


# CLI
if __name__ == "__main__":
    import sys

    detector = MCPDetector()

    if "--configure" in sys.argv:
        result = detector.detect()

        if result.is_error():
            console.print(f"[red]Error: {result.error.message}[/red]")
            if result.error.context:
                console.print(f"[red]Context: {result.error.context}[/red]")
            sys.exit(1)

        recommendations = result.value
        detector.display_recommendations()

        response = input("\nConfigure these MCP servers now? (y/n): ")
        if response.lower() == "y":
            config_result = detector.configure()
            if config_result.is_error():
                console.print(f"[red]Configuration error: {config_result.error.message}[/red]")
                sys.exit(1)
    else:
        result = detector.detect()

        if result.is_error():
            console.print(f"[red]Error: {result.error.message}[/red]")
            if result.error.context:
                console.print(f"[red]Context: {result.error.context}[/red]")
            sys.exit(1)

        recommendations = result.value
        detector.display_recommendations()

        print(f"\nFound {len(recommendations)} recommended MCP servers")
        print("\nRun with --configure to auto-configure them")

#!/usr/bin/env python3
"""NXTG-Forge MCP Detector

Python wrapper for MCP auto-detection and configuration
"""

import json
import subprocess
from pathlib import Path
from typing import Any, Optional

from rich.console import Console
from rich.table import Table


console = Console()


class MCPDetector:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.auto_detect_script = self.project_root / ".mcp" / "auto-detect.js"
        self.state_file = self.project_root / ".claude" / "state.json"
        self.recommendations: list[dict[str, Any]] = []

    def detect(self) -> list[dict[str, Any]]:
        """Run MCP auto-detection"""
        console.print("[cyan]= Detecting required MCP servers...[/cyan]\n")

        if not self.auto_detect_script.exists():
            console.print("[yellow]  MCP auto-detect script not found[/yellow]")
            return self._fallback_detection()

        try:
            # Run JavaScript detector
            result = subprocess.run(
                ["node", str(self.auto_detect_script)],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.returncode == 0:
                # Parse recommendations from output
                self.recommendations = self._parse_detection_output(result.stdout)
            else:
                console.print(f"[yellow]Warning: MCP detection failed: {result.stderr}[/yellow]")
                self.recommendations = self._fallback_detection()

        except subprocess.TimeoutExpired:
            console.print("[yellow]Warning: MCP detection timed out[/yellow]")
            self.recommendations = self._fallback_detection()
        except Exception as e:
            console.print(f"[yellow]Warning: Error running MCP detection: {e}[/yellow]")
            self.recommendations = self._fallback_detection()

        return self.recommendations

    def _parse_detection_output(self, output: str) -> list[dict[str, Any]]:
        """Parse detection output to extract recommendations"""
        recommendations = []

        # Look for JSON in output
        try:
            # Try to find JSON block in output
            json_match = None
            for line in output.split("\n"):
                if line.strip().startswith("[") or line.strip().startswith("{"):
                    try:
                        json_match = json.loads(line.strip())
                        break
                    except:
                        continue

            if json_match:
                if isinstance(json_match, list):
                    recommendations = json_match
                elif isinstance(json_match, dict):
                    recommendations = [json_match]

        except Exception as e:
            console.print(f"[yellow]Could not parse MCP detection output: {e}[/yellow]")

        # If parsing failed, extract from text output
        if not recommendations:
            recommendations = self._extract_from_text(output)

        return recommendations

    def _extract_from_text(self, output: str) -> list[dict[str, Any]]:
        """Extract recommendations from text output"""
        recommendations = []

        # Common patterns in output
        for line in output.split("\n"):
            if "github" in line.lower():
                recommendations.append(
                    {"name": "github", "priority": "high", "reason": "GitHub integration detected"},
                )
            elif "postgres" in line.lower():
                recommendations.append(
                    {"name": "postgres", "priority": "high", "reason": "PostgreSQL detected"},
                )
            elif "stripe" in line.lower():
                recommendations.append(
                    {
                        "name": "stripe",
                        "priority": "medium",
                        "reason": "Stripe integration detected",
                    },
                )

        return recommendations

    def _fallback_detection(self) -> list[dict[str, Any]]:
        """Fallback detection using Python-based analysis"""
        recommendations = []

        # Load state if exists
        if self.state_file.exists():
            with open(self.state_file) as f:
                state = json.load(f)

            # Check architecture
            arch = state.get("architecture", {})

            # Database detection
            db_type = arch.get("database", {}).get("type")
            if db_type == "postgresql":
                recommendations.append(
                    {
                        "name": "postgres",
                        "priority": "high",
                        "reason": "PostgreSQL in architecture",
                    },
                )
            elif db_type == "mysql":
                recommendations.append(
                    {"name": "mysql", "priority": "high", "reason": "MySQL in architecture"},
                )

            # Cache detection
            cache_type = arch.get("cache", {}).get("type")
            if cache_type == "redis":
                recommendations.append(
                    {"name": "redis", "priority": "medium", "reason": "Redis in architecture"},
                )

        # Check for git repo
        if (self.project_root / ".git").exists():
            try:
                remote = subprocess.check_output(
                    ["git", "remote", "get-url", "origin"],
                    cwd=self.project_root,
                    stderr=subprocess.DEVNULL,
                    text=True,
                ).strip()

                if "github.com" in remote:
                    recommendations.append(
                        {
                            "name": "github",
                            "priority": "high",
                            "reason": "GitHub repository detected",
                        },
                    )
            except:
                pass

        # Check for requirements.txt or package.json
        if (self.project_root / "requirements.txt").exists():
            with open(self.project_root / "requirements.txt") as f:
                requirements = f.read()

            if "stripe" in requirements.lower():
                recommendations.append(
                    {"name": "stripe", "priority": "high", "reason": "Stripe in dependencies"},
                )

            if "psycopg" in requirements.lower() or "sqlalchemy" in requirements.lower():
                if not any(r["name"] == "postgres" for r in recommendations):
                    recommendations.append(
                        {
                            "name": "postgres",
                            "priority": "high",
                            "reason": "PostgreSQL drivers detected",
                        },
                    )

        # Deduplicate
        seen = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec["name"] not in seen:
                seen.add(rec["name"])
                unique_recommendations.append(rec)

        return unique_recommendations

    def configure(self):
        """Configure detected MCP servers"""
        if not self.recommendations:
            self.detect()

        console.print("\n[cyan]=' Configuring MCP servers...[/cyan]\n")

        for rec in self.recommendations:
            self._configure_server(rec)

        # Update state
        self._update_state()

        console.print("\n[green] MCP servers configured![/green]\n")

    def _configure_server(self, recommendation: dict[str, Any]):
        """Configure a single MCP server"""
        server_name = recommendation["name"]
        console.print(f"[cyan]Adding {server_name}...[/cyan]")

        try:
            # Get server config
            config = self._get_server_config(server_name)

            if not config:
                console.print(f"[yellow]    No config available for {server_name}[/yellow]")
                return

            # Use claude CLI to add MCP server
            config_json = json.dumps(config)

            cmd = ["claude", "mcp", "add-json", server_name, config_json, "--scope", "user"]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)

            if result.returncode == 0:
                console.print(f"[green]   {server_name} configured[/green]")
            else:
                console.print(f"[yellow]    {server_name}: {result.stderr}[/yellow]")

        except Exception as e:
            console.print(f"[red]   Failed to configure {server_name}: {e}[/red]")

    def _get_server_config(self, server_name: str) -> Optional[dict[str, Any]]:
        """Get configuration for MCP server"""
        # Check if server config file exists
        server_config_file = self.project_root / ".mcp" / "servers" / f"{server_name}.json"

        if server_config_file.exists():
            with open(server_config_file) as f:
                config_data: dict[str, Any] = json.load(f)
                return config_data

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

        return default_configs.get(server_name)

    def _update_state(self):
        """Update state.json with configured MCP servers"""
        if not self.state_file.exists():
            return

        with open(self.state_file) as f:
            state = json.load(f)

        if "mcp_servers" not in state:
            state["mcp_servers"] = {"configured": [], "recommended": []}

        # Add to configured list
        for rec in self.recommendations:
            # Check if already configured
            if not any(s["name"] == rec["name"] for s in state["mcp_servers"]["configured"]):
                state["mcp_servers"]["configured"].append(
                    {
                        "name": rec["name"],
                        "status": "connected",
                        "auto_detected": True,
                        "reason": rec["reason"],
                        "priority": rec["priority"],
                    },
                )

        with open(self.state_file, "w") as f:
            json.dump(state, f, indent=2)

    def display_recommendations(self):
        """Display recommendations in a table"""
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
            key=lambda x: priority_order.get(x.get("priority", "low"), 3),
        )

        for rec in sorted_recs:
            priority = rec.get("priority", "low")
            icon = "=4" if priority == "high" else "=" if priority == "medium" else "="

            table.add_row(f"{icon} {priority}", rec["name"], rec.get("reason", "N/A"))

        console.print(table)


# CLI
if __name__ == "__main__":
    import sys

    detector = MCPDetector()

    if "--configure" in sys.argv:
        recommendations = detector.detect()
        detector.display_recommendations()

        response = input("\nConfigure these MCP servers now? (y/n): ")
        if response.lower() == "y":
            detector.configure()
    else:
        recommendations = detector.detect()
        detector.display_recommendations()

        print(f"\nFound {len(recommendations)} recommended MCP servers")
        print("\nRun with --configure to auto-configure them")

"""Status command implementation."""

import json

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class StatusCommand(BaseCommand):
    """Display project status.

    Responsibilities:
    - Parse command arguments
    - Call StatusService for data
    - Format and display output
    - Handle JSON output flag

    Business logic delegated to StatusService.
    """

    def __init__(self, status_service):
        """Initialize status command.

        Args:
            status_service: StatusService instance for getting status data
        """
        self.status_service = status_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute status command.

        Args:
            context: Command context with args

        Returns:
            Result with exit code
        """
        args = context.args

        # Handle JSON output
        if getattr(args, "json", False):
            return self._display_json()

        # Handle detail view
        if getattr(args, "detail", None):
            return self._display_detail(args.detail)

        # Default: summary view
        return self._display_summary()

    def _display_json(self) -> Result[int, CommandError]:
        """Display full state as JSON."""
        result = self.status_service.get_full_state()

        if result.is_error():
            return Err(CommandError.execution_failed(result.error.message))

        print(json.dumps(result.value, indent=2))
        return Ok(0)

    def _display_summary(self) -> Result[int, CommandError]:
        """Display summary status view."""
        status_result = self.status_service.get_project_status()

        if status_result.is_error():
            return Err(CommandError.execution_failed(status_result.error.message))

        status = status_result.value
        state_result = self.status_service.get_full_state()

        if state_result.is_error():
            return Err(CommandError.execution_failed(state_result.error.message))

        state = state_result.value

        # Print formatted summary
        self.print_header("NXTG-Forge Project Status")

        print(f"\n📦 PROJECT: {status.project_name}")
        print(f"   Type: {status.project_type}")
        print(f"   Forge Version: {status.forge_version}")

        # Architecture
        if state.get("architecture"):
            arch = state["architecture"]
            print("\n📐 ARCHITECTURE")
            if "backend" in arch:
                backend = arch["backend"]
                lang = backend.get("language", "unknown")
                framework = backend.get("framework", "unknown")
                print(f"   Backend: {lang}/{framework}")
            if "database" in arch:
                print(f"   Database: {arch['database'].get('type', 'unknown')}")

        # Development phase
        print(f"\n🎯 DEVELOPMENT PHASE: {status.current_phase}")

        dev = state.get("development", {})
        phases_completed = dev.get("phases_completed", [])
        phases_remaining = dev.get("phases_remaining", [])

        completed_str = ", ".join(phases_completed) if phases_completed else "none"
        print(f"   ✓ Completed: {completed_str}")
        print(f"   ☐ Remaining: {', '.join(phases_remaining)}")

        # Features
        print("\n🚀 FEATURES")
        print(f"   ✅ Completed: {status.features_completed}")
        print(f"   🔄 In Progress: {status.features_in_progress}")
        print(f"   📋 Planned: {status.features_planned}")

        # Show in-progress features with progress bars
        features_result = self.status_service.get_detailed_features()
        if features_result.is_ok():
            features = features_result.value
            in_progress = features.get("in_progress", [])

            if in_progress:
                print("\n   Current Work:")
                for feat in in_progress:
                    progress = feat.get("progress", 0)
                    bar = self._progress_bar(progress)
                    print(f"     • {feat['name']}: {bar} {progress}%")

        # Agents
        print("\n🤖 AGENTS")
        if status.active_agents:
            print(f"   Active: {', '.join(status.active_agents)}")

        agents_result = self.status_service.get_detailed_agents()
        if agents_result.is_ok():
            agents = agents_result.value
            available = agents.get("available", [])
            print(f"   Available: {len(available)}")

        # MCP Servers
        mcp = state.get("mcp_servers", {})
        if mcp.get("configured"):
            print("\n🔌 MCP SERVERS")
            configured = mcp["configured"]
            print(f"   ✓ Connected: {len(configured)}")
            for server in configured[:3]:  # Show first 3
                print(f"     • {server['name']}")

        # Quality
        quality = state.get("quality", {})
        if quality.get("tests"):
            tests = quality["tests"]
            print("\n✅ QUALITY")
            unit = tests.get("unit", {})
            unit_cov = unit.get("coverage", 0)
            passing = unit.get("passing", 0)
            total = unit.get("total", 0)
            print(f"   Unit Tests: {passing}/{total} ({unit_cov}%)")

        # Health score
        print(f"\n📊 PROJECT HEALTH: {status.health_score}/100")

        # Interrupted session warning
        if status.has_interrupted_session and status.last_session_id:
            print("\n⚠️  INTERRUPTED SESSION DETECTED")
            print(f"   Resume: claude --resume {status.last_session_id}")

        # Quick actions
        print("\n" + "═" * 60)
        print("\n💡 Quick Actions:")
        print("   /status --detail features  - Detailed feature view")
        print('   /feature "name"           - Add new feature')
        print('   /checkpoint "desc"        - Save checkpoint')
        print("   /gap-analysis             - Analyze gaps")
        print("")

        return Ok(0)

    def _display_detail(self, section: str) -> Result[int, CommandError]:
        """Display detailed view of a section.

        Args:
            section: Section to display (features, agents, quality, mcp)

        Returns:
            Result with exit code
        """
        if section == "features":
            return self._display_features_detail()
        elif section == "agents":
            return self._display_agents_detail()
        elif section == "quality":
            return self._display_quality_detail()
        elif section == "mcp":
            return self._display_mcp_detail()
        else:
            return Err(CommandError.invalid_args(f"Unknown section: {section}"))

    def _display_features_detail(self) -> Result[int, CommandError]:
        """Display detailed feature view."""
        self.print_header("Features Detail")

        features_result = self.status_service.get_detailed_features()
        if features_result.is_error():
            return Err(CommandError.execution_failed(features_result.error.message))

        features = features_result.value

        # Completed features
        completed = features.get("completed", [])
        if completed:
            print("\n✅ COMPLETED:\n")
            for feat in completed:
                print(f"  • {feat['name']}")
                print(f"    ID: {feat['id']}")
                print(f"    Completed: {feat.get('completed_at', 'unknown')}")
                print(f"    Tests: {feat.get('tests', 'unknown')}")
                print(f"    Coverage: {feat.get('coverage', 0)}%")
                print()

        # In-progress features
        in_progress = features.get("in_progress", [])
        if in_progress:
            print("\n🔄 IN PROGRESS:\n")
            for feat in in_progress:
                progress = feat.get("progress", 0)
                print(f"  • {feat['name']} ({progress}%)")
                print(f"    ID: {feat['id']}")
                print(f"    Assigned: {feat.get('assigned_to', 'unassigned')}")
                print(f"    Started: {feat.get('started_at', 'unknown')}")

                subtasks = feat.get("subtasks", {})
                if subtasks:
                    print("    Subtasks:")
                    completed_sub = subtasks.get("completed", [])
                    if completed_sub:
                        print(f"      ✓ {', '.join(completed_sub)}")
                    current = subtasks.get("current")
                    if current:
                        print(f"      → {current}")
                    remaining = subtasks.get("remaining", [])
                    if remaining:
                        print(f"      ☐ {', '.join(remaining)}")
                print()

        # Planned features
        planned = features.get("planned", [])
        if planned:
            print("\n📋 PLANNED:\n")
            for feat in planned:
                print(f"  • {feat['name']}")
                print(f"    ID: {feat['id']}")
                print(f"    Priority: {feat.get('priority', 'normal')}")
                deps = feat.get("dependencies")
                if deps:
                    print(f"    Depends on: {', '.join(deps)}")
                print()

        return Ok(0)

    def _display_agents_detail(self) -> Result[int, CommandError]:
        """Display detailed agent view."""
        self.print_header("Agents Detail")

        agents_result = self.status_service.get_detailed_agents()
        if agents_result.is_error():
            return Err(CommandError.execution_failed(agents_result.error.message))

        agents = agents_result.value

        active = agents.get("active", [])
        available = agents.get("available", [])

        if active:
            print("\n🔴 ACTIVE:\n")
            for agent_name in active:
                print(f"  • {agent_name}")

        if available:
            print("\n🟢 AVAILABLE:\n")
            for agent_name in available:
                print(f"  • {agent_name}")

        return Ok(0)

    def _display_quality_detail(self) -> Result[int, CommandError]:
        """Display detailed quality view."""
        self.print_header("Quality Detail")

        quality_result = self.status_service.get_detailed_quality()
        if quality_result.is_error():
            return Err(CommandError.execution_failed(quality_result.error.message))

        quality = quality_result.value

        # Tests
        tests = quality.get("tests", {})
        if tests:
            print("\n✅ TESTS:\n")
            for test_type, test_data in tests.items():
                if isinstance(test_data, dict):
                    passing = test_data.get("passing", 0)
                    total = test_data.get("total", 0)
                    coverage = test_data.get("coverage", 0)
                    print(f"  {test_type.title()}: {passing}/{total} ({coverage}% coverage)")

        # Linting
        linting = quality.get("linting", {})
        if linting:
            print("\n📝 LINTING:\n")
            issues = linting.get("issues", 0)
            print(f"  Issues: {issues}")

        # Security
        security = quality.get("security", {})
        if security:
            print("\n🔒 SECURITY:\n")
            vulns = security.get("vulnerabilities", {})
            for severity, count in vulns.items():
                if count > 0:
                    print(f"  {severity.title()}: {count}")

        return Ok(0)

    def _display_mcp_detail(self) -> Result[int, CommandError]:
        """Display detailed MCP server view."""
        self.print_header("MCP Servers Detail")

        mcp_result = self.status_service.get_detailed_mcp()
        if mcp_result.is_error():
            return Err(CommandError.execution_failed(mcp_result.error.message))

        mcp = mcp_result.value

        configured = mcp.get("configured", [])
        if configured:
            print("\n🔌 CONFIGURED:\n")
            for server in configured:
                name = server.get("name", "unknown")
                status = server.get("status", "unknown")
                print(f"  • {name} ({status})")
                reason = server.get("reason")
                if reason:
                    print(f"    {reason}")

        return Ok(0)

    def _progress_bar(self, percentage: int, width: int = 20) -> str:
        """Generate progress bar.

        Args:
            percentage: Percentage complete (0-100)
            width: Width of bar in characters

        Returns:
            Formatted progress bar string
        """
        filled = int(width * percentage / 100)
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}]"


__all__ = ["StatusCommand"]

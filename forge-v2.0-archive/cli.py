#!/usr/bin/env python3
"""NXTG-Forge CLI

Main command-line interface for Forge operations outside of Claude Code
"""

import argparse
import json
import sys
from pathlib import Path

from forge import __version__ as FORGE_VERSION

from .file_generator import FileGenerator
from .gap_analyzer import GapAnalyzer
from .init_command import init_project
from .mcp_detector import MCPDetector
from .spec_generator import SpecGenerator
from .state_manager import StateManager


class ForgeCLI:
    def __init__(self):
        self.project_root = Path.cwd()
        self._state_manager = None

    @property
    def state_manager(self):
        """Lazy-load state manager to avoid creating .claude/ during init"""
        if self._state_manager is None:
            self._state_manager = StateManager(str(self.project_root))
        return self._state_manager

    def run(self, args):
        parser = argparse.ArgumentParser(
            description="NXTG-Forge - Self-Deploying AI Development Infrastructure",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  forge init                           # Initialize NXTG-Forge in project
  forge init --force                   # Reinitialize, overwriting existing
  nxtg-forge status                    # Show project status
  nxtg-forge checkpoint "milestone"    # Create checkpoint
  nxtg-forge restore                   # Restore latest checkpoint
  nxtg-forge spec generate             # Generate project spec
  nxtg-forge mcp detect                # Detect needed MCP servers
  nxtg-forge gap-analysis              # Analyze improvement gaps
  nxtg-forge health                    # Calculate health score
            """,
        )

        parser.add_argument("--version", action="version", version=f"NXTG-Forge {FORGE_VERSION}")

        subparsers = parser.add_subparsers(dest="command", help="Commands")

        # Init command - MUST BE FIRST
        init_parser = subparsers.add_parser(
            "init",
            help="Initialize NXTG-Forge in existing project"
        )
        init_parser.add_argument(
            "directory",
            nargs="?",
            type=Path,
            help="Target directory (default: current directory)",
        )
        init_parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing .claude/ directory",
        )
        init_parser.add_argument(
            "--quiet",
            action="store_true",
            help="Suppress output except errors",
        )

        # Status command
        status_parser = subparsers.add_parser("status", help="Show project status")
        status_parser.add_argument("--json", action="store_true", help="Output as JSON")
        status_parser.add_argument(
            "--detail",
            choices=["features", "agents", "quality", "mcp"],
            help="Show detailed view of section",
        )

        # Checkpoint commands
        checkpoint_parser = subparsers.add_parser("checkpoint", help="Create state checkpoint")
        checkpoint_parser.add_argument("description", help="Checkpoint description")

        restore_parser = subparsers.add_parser("restore", help="Restore from checkpoint")
        restore_parser.add_argument(
            "checkpoint_id",
            nargs="?",
            help="Checkpoint ID (default: latest)",
        )

        # Spec commands
        spec_parser = subparsers.add_parser("spec", help="Specification operations")
        spec_subparsers = spec_parser.add_subparsers(dest="spec_command")

        spec_gen = spec_subparsers.add_parser("generate", help="Generate project spec")
        spec_gen.add_argument("--interactive", action="store_true", help="Interactive mode")
        spec_gen.add_argument("--from-answers", help="Generate from answers JSON file")

        spec_validate = spec_subparsers.add_parser("validate", help="Validate spec file")
        spec_validate.add_argument("file", help="Spec file to validate")

        # MCP commands
        mcp_parser = subparsers.add_parser("mcp", help="MCP server operations")
        mcp_subparsers = mcp_parser.add_subparsers(dest="mcp_command")

        mcp_detect = mcp_subparsers.add_parser("detect", help="Auto-detect needed MCP servers")
        mcp_detect.add_argument(
            "--configure",
            action="store_true",
            help="Auto-configure detected servers",
        )

        mcp_list = mcp_subparsers.add_parser("list", help="List configured MCP servers")

        # Gap analysis
        gap_parser = subparsers.add_parser("gap-analysis", help="Analyze improvement gaps")
        gap_parser.add_argument("--output", default="docs/GAP-ANALYSIS.md", help="Output file")

        # Health score
        health_parser = subparsers.add_parser("health", help="Calculate project health score")
        health_parser.add_argument("--detail", action="store_true", help="Show detailed breakdown")

        # Recovery info
        recovery_parser = subparsers.add_parser("recovery", help="Show recovery information")

        # File generation
        generate_parser = subparsers.add_parser("generate", help="Generate project files")
        generate_parser.add_argument("--spec", required=True, help="Project spec file")
        generate_parser.add_argument(
            "--template-set",
            default="full",
            choices=["minimal", "standard", "full"],
            help="Template set to use",
        )
        generate_parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be generated",
        )

        # Config commands
        config_parser = subparsers.add_parser("config", help="Configuration operations")
        config_subparsers = config_parser.add_subparsers(dest="config_command")

        config_show = config_subparsers.add_parser("show", help="Show current configuration")
        config_show.add_argument(
            "--section",
            choices=["project", "development", "testing", "agents", "hooks", "context", "safety"],
            help="Show specific section",
        )
        config_show.add_argument("--json", action="store_true", help="Output as JSON")

        config_validate = config_subparsers.add_parser("validate", help="Validate configuration")
        config_validate.add_argument("--fix", action="store_true", help="Attempt to fix issues")

        parsed_args = parser.parse_args(args)

        if not parsed_args.command:
            parser.print_help()
            return 0

        # Route to command handlers
        command_map = {
            "init": self.cmd_init,
            "status": self.cmd_status,
            "checkpoint": self.cmd_checkpoint,
            "restore": self.cmd_restore,
            "spec": self.cmd_spec,
            "mcp": self.cmd_mcp,
            "gap-analysis": self.cmd_gap_analysis,
            "health": self.cmd_health,
            "recovery": self.cmd_recovery,
            "generate": self.cmd_generate,
            "config": self.cmd_config,
        }

        handler = command_map.get(parsed_args.command)
        if handler:
            return handler(parsed_args)
        else:
            print(f"Unknown command: {parsed_args.command}")
            return 1

    def cmd_init(self, args):
        """Initialize NXTG-Forge in project"""
        return init_project(
            target_dir=args.directory,
            force=args.force,
            quiet=args.quiet,
        )

    def cmd_status(self, args):
        """Show project status"""
        state = self.state_manager.state

        if args.json:
            print(json.dumps(state, indent=2))
            return 0

        if args.detail:
            return self._show_detail(args.detail)

        # Show summary status
        self._print_header("NXTG-Forge Project Status")

        print(f"\n📦 PROJECT: {state['project']['name']}")
        print(f"   Type: {state['project'].get('type', 'unknown')}")
        print(f"   Forge Version: {state['project']['forge_version']}")

        if state.get("architecture"):
            arch = state["architecture"]
            print("\n📐 ARCHITECTURE")
            if "backend" in arch:
                print(
                    f"   Backend: {arch['backend'].get('language')}/{arch['backend'].get('framework')}",
                )
            if "database" in arch:
                print(f"   Database: {arch['database'].get('type')}")

        dev = state["development"]
        print(f"\n🎯 DEVELOPMENT PHASE: {dev['current_phase']}")
        print(
            f"   ✓ Completed: {', '.join(dev['phases_completed']) if dev['phases_completed'] else 'none'}",
        )
        print(f"   ☐ Remaining: {', '.join(dev['phases_remaining'])}")

        features = dev["features"]
        print("\n🚀 FEATURES")
        print(f"   ✅ Completed: {len(features['completed'])}")
        print(f"   🔄 In Progress: {len(features['in_progress'])}")
        print(f"   📋 Planned: {len(features['planned'])}")

        if features["in_progress"]:
            print("\n   Current Work:")
            for feat in features["in_progress"]:
                progress = feat.get("progress", 0)
                bar = self._progress_bar(progress)
                print(f"     • {feat['name']}: {bar} {progress}%")

        agents = state["agents"]
        print("\n🤖 AGENTS")
        if agents["active"]:
            print(f"   Active: {', '.join(agents['active'])}")
        print(f"   Available: {len(agents['available'])}")

        mcp = state.get("mcp_servers", {})
        if mcp.get("configured"):
            print("\n🔌 MCP SERVERS")
            print(f"   ✓ Connected: {len(mcp['configured'])}")
            for server in mcp["configured"][:3]:  # Show first 3
                print(f"     • {server['name']}")

        quality = state.get("quality", {})
        if quality.get("tests"):
            tests = quality["tests"]
            print("\n✅ QUALITY")
            unit_cov = tests["unit"].get("coverage", 0)
            print(
                f"   Unit Tests: {tests['unit']['passing']}/{tests['unit']['total']} ({unit_cov}%)",
            )

        health_score = self._calculate_health_score(state)
        print(f"\n📊 PROJECT HEALTH: {health_score}/100")

        if state.get("last_session") and state["last_session"].get("status") == "interrupted":
            print("\n⚠️  INTERRUPTED SESSION DETECTED")
            print(f"   Resume: claude --resume {state['last_session']['id']}")

        print("\n" + "═" * 60)
        print("\n💡 Quick Actions:")
        print("   /status --detail features  - Detailed feature view")
        print('   /feature "name"           - Add new feature')
        print('   /checkpoint "desc"        - Save checkpoint')
        print("   /gap-analysis             - Analyze gaps")
        print("")

        return 0

    def cmd_checkpoint(self, args):
        """Create checkpoint"""
        checkpoint_id = self.state_manager.checkpoint(args.description)
        print(f"✓ Checkpoint created: {checkpoint_id}")
        print(f"  Description: {args.description}")
        return 0

    def cmd_restore(self, args):
        """Restore from checkpoint"""
        self.state_manager.restore(args.checkpoint_id)
        return 0

    def cmd_spec(self, args):
        """Spec operations"""
        if args.spec_command == "generate":
            generator = SpecGenerator(str(self.project_root))

            if args.interactive:
                spec = generator.interactive_mode()
            elif args.from_answers:
                with open(args.from_answers) as f:
                    answers = json.load(f)
                spec = generator.from_answers(answers)
            else:
                print("Error: Use --interactive or --from-answers")
                return 1

            spec_file = self.project_root / "docs" / "PROJECT-SPEC.md"
            spec_file.parent.mkdir(exist_ok=True)

            with open(spec_file, "w") as f:
                f.write(spec)

            print(f"✓ Spec generated: {spec_file}")
            return 0

        elif args.spec_command == "validate":
            # TODO: Implement validation
            print("Spec validation not yet implemented")
            return 1

    def cmd_mcp(self, args):
        """MCP operations"""
        if args.mcp_command == "detect":
            detector = MCPDetector(str(self.project_root))
            recommendations = detector.detect()

            print("\n📋 MCP Server Recommendations:\n")
            for rec in sorted(
                recommendations,
                key=lambda x: {"high": 3, "medium": 2, "low": 1}[x["priority"]],
                reverse=True,
            ):
                icon = (
                    "🔴"
                    if rec["priority"] == "high"
                    else "🟡" if rec["priority"] == "medium" else "🟢"
                )
                print(f"{icon} {rec['name']} ({rec['priority']})")
                print(f"   {rec['reason']}\n")

            if args.configure:
                detector.configure()
                print("\n✅ MCP servers configured!")

            return 0

        elif args.mcp_command == "list":
            mcp = self.state_manager.state.get("mcp_servers", {})
            configured = mcp.get("configured", [])

            print("\n🔌 Configured MCP Servers:\n")
            for server in configured:
                status_icon = "✓" if server.get("status") == "connected" else "✗"
                print(f"{status_icon} {server['name']}")
                if server.get("reason"):
                    print(f"   {server['reason']}")

            return 0

    def cmd_gap_analysis(self, args):
        """Run gap analysis"""
        analyzer = GapAnalyzer(str(self.project_root), self.state_manager.state)
        gaps = analyzer.analyze()

        output_file = self.project_root / args.output
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, "w") as f:
            f.write(gaps)

        print(f"✓ Gap analysis complete: {output_file}")

        # Show summary
        print("\n📋 Summary:")
        print(f"   Found {len(gaps.split('##')) - 1} improvement areas")
        print(f"   See {args.output} for details")

        return 0

    def cmd_health(self, args):
        """Calculate health score"""
        state = self.state_manager.state
        score = self._calculate_health_score(state)

        print(f"\n📊 Project Health Score: {score}/100\n")

        if args.detail:
            print("Breakdown:")
            # TODO: Show detailed breakdown

        if score >= 90:
            print("✅ Excellent! Project is in great shape.\n")
        elif score >= 75:
            print("👍 Good! Some minor improvements recommended.\n")
        elif score >= 60:
            print("⚠️  Fair. Several areas need attention.\n")
        else:
            print("🚨 Critical. Immediate improvements required.\n")

        return 0

    def cmd_recovery(self, args):
        """Show recovery information"""
        info = self.state_manager.get_recovery_info()

        if not info:
            print("✅ No recovery needed - all sessions completed normally\n")
            return 0

        print("\n⚠️  Recovery Information\n")
        print("=" * 60)
        print("\nInterrupted Session:")
        print(f"  ID: {info['session']['id']}")
        print(f"  Agent: {info['session']['agent']}")
        print(f"  Task: {info['session']['task']}")
        print(f"  Started: {info['session']['started']}")

        if info["checkpoint"]:
            print("\nLast Checkpoint:")
            print(f"  ID: {info['checkpoint']['id']}")
            print(f"  Description: {info['checkpoint']['description']}")
            print(f"  Time: {info['checkpoint']['timestamp']}")

        if info["in_progress_features"]:
            print("\nIn-Progress Features:")
            for feat in info["in_progress_features"]:
                print(f"  • {feat['name']} ({feat.get('progress', 0)}%)")

        print("\n💡 Recovery Commands:")
        for cmd in info["recovery_commands"]:
            if cmd:
                print(f"  {cmd}")

        print("\n" + "=" * 60 + "\n")

        return 0

    def cmd_generate(self, args):
        """Generate project files"""
        generator = FileGenerator(str(self.project_root))

        # Load spec
        with open(args.spec) as f:
            spec_content = f.read()

        # Generate files
        generated = generator.generate_from_spec(
            spec_content,
            template_set=args.template_set,
            dry_run=args.dry_run,
        )

        if args.dry_run:
            print("\n🔍 Dry Run - Would Generate:\n")
            for file_path in generated:
                print(f"  • {file_path}")
            print(f"\nTotal: {len(generated)} files\n")
        else:
            print(f"\n✓ Generated {len(generated)} files\n")

        return 0

    def cmd_config(self, args):
        """Configuration operations"""
        config_path = self.project_root / ".claude" / "config.json"

        if not config_path.exists():
            print(f"❌ Config file not found at {config_path}")
            return 1

        if args.config_command == "show":
            try:
                with open(config_path, encoding="utf-8") as f:
                    config = json.load(f)
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON in config file: {e}")
                return 1

            if args.json:
                if args.section:
                    print(json.dumps(config.get(args.section, {}), indent=2))
                else:
                    print(json.dumps(config, indent=2))
                return 0

            # Pretty print configuration
            if args.section:
                self._print_header(f"Configuration: {args.section.title()}")
                self._print_config_section(config.get(args.section, {}))
            else:
                self._print_header("NXTG-Forge Configuration")
                print(f"\n📄 Config File: {config_path}")
                print(f"📦 Version: {config.get('version', 'unknown')}\n")

                for section in [
                    "project",
                    "development",
                    "testing",
                    "agents",
                    "hooks",
                    "context",
                    "safety",
                ]:
                    if section in config:
                        print(f"\n{'─' * 60}")
                        print(f"📋 {section.upper()}")
                        print(f"{'─' * 60}")
                        self._print_config_section(config[section], indent=2)

            return 0

        elif args.config_command == "validate":
            print("\n🔍 Validating configuration...\n")

            errors = []
            warnings = []

            try:
                with open(config_path, encoding="utf-8") as f:
                    config = json.load(f)
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON: {e}")
                return 1

            # Validate required sections
            required_sections = ["project", "development", "testing", "hooks"]
            for section in required_sections:
                if section not in config:
                    errors.append(f"Missing required section: {section}")

            # Validate project section
            if "project" in config:
                project = config["project"]
                if "name" not in project:
                    errors.append("Missing project.name")
                if "language" not in project:
                    warnings.append("Missing project.language (optional)")

            # Validate development section
            if "development" in config:
                dev = config["development"]
                lang = config.get("project", {}).get("language", "python")
                if lang not in dev:
                    warnings.append(f"Missing development.{lang} configuration")

            # Validate testing section
            if "testing" in config:
                testing = config["testing"]
                if "coverage_target" in testing:
                    target = testing["coverage_target"]
                    if not isinstance(target, (int, float)) or not 0 <= target <= 100:
                        errors.append("testing.coverage_target must be between 0 and 100")

            # Validate hooks
            if "hooks" in config:
                hooks = config["hooks"]
                if "enabled" in hooks and not isinstance(hooks["enabled"], bool):
                    errors.append("hooks.enabled must be a boolean")

                # Check if hook files exist
                for hook_type in ["pre_task", "post_task", "on_error", "on_file_change"]:
                    if hook_type in hooks:
                        hook_path = self.project_root / hooks[hook_type]
                        if not hook_path.exists():
                            warnings.append(f"Hook file not found: {hooks[hook_type]}")

            # Validate agents
            if "agents" in config:
                agents_config = config["agents"]
                if "available_agents" in agents_config:
                    for agent in agents_config["available_agents"]:
                        if "name" not in agent:
                            errors.append(f"Agent missing 'name' field: {agent}")
                        if "capabilities" not in agent:
                            warnings.append(
                                f"Agent {agent.get('name', 'unknown')} missing capabilities",
                            )

            # Print results
            if not errors and not warnings:
                print("✅ Configuration is valid!\n")
                return 0
            else:
                if errors:
                    print("❌ ERRORS:\n")
                    for error in errors:
                        print(f"  • {error}")
                    print()

                if warnings:
                    print("⚠️  WARNINGS:\n")
                    for warning in warnings:
                        print(f"  • {warning}")
                    print()

                if errors:
                    print("❌ Configuration validation failed\n")
                    return 1
                else:
                    print("✅ Configuration is valid (with warnings)\n")
                    return 0

        return 0

    # Helper methods

    def _print_header(self, title):
        """Print formatted header"""
        print("\n" + "╔" + "═" * 58 + "╗")
        print(f"║ {title:^56} ║")
        print("╚" + "═" * 58 + "╝")

    def _print_config_section(self, section, indent=0):
        """Pretty print a configuration section"""
        indent_str = " " * indent

        if isinstance(section, dict):
            for key, value in section.items():
                if isinstance(value, (dict, list)):
                    print(f"{indent_str}{key}:")
                    self._print_config_section(value, indent + 2)
                else:
                    print(f"{indent_str}{key}: {value}")
        elif isinstance(section, list):
            for item in section:
                if isinstance(item, dict):
                    # For list of dicts, show condensed view
                    if "name" in item:
                        print(f"{indent_str}• {item['name']}")
                    else:
                        print(f"{indent_str}• {item}")
                else:
                    print(f"{indent_str}• {item}")
        else:
            print(f"{indent_str}{section}")

    def _progress_bar(self, percentage, width=20):
        """Generate progress bar"""
        filled = int(width * percentage / 100)
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}]"

    def _calculate_health_score(self, state):
        """Calculate project health score"""
        score = 100

        # Test coverage
        quality = state.get("quality", {})
        tests = quality.get("tests", {})

        if tests:
            unit_cov = tests.get("unit", {}).get("coverage", 0)
            int_cov = tests.get("integration", {}).get("coverage", 0)
            e2e_cov = tests.get("e2e", {}).get("coverage", 0)

            avg_coverage = (unit_cov + int_cov + e2e_cov) / 3

            if avg_coverage < 80:
                score -= (80 - avg_coverage) / 4

        # Security vulnerabilities
        security = quality.get("security", {}).get("vulnerabilities", {})
        score -= security.get("critical", 0) * 10
        score -= security.get("high", 0) * 5
        score -= security.get("medium", 0) * 2

        # Linting
        linting = quality.get("linting", {})
        issues = linting.get("issues", 0)
        score -= min(issues / 2, 10)

        # Feature completion
        features = state.get("development", {}).get("features", {})
        completed = len(features.get("completed", []))
        total = completed + len(features.get("in_progress", [])) + len(features.get("planned", []))

        if total > 0:
            completion_rate = completed / total
            if completion_rate < 0.5:
                score -= 10

        return max(0, min(100, int(score)))

    def _show_detail(self, section):
        """Show detailed view of a section"""
        state = self.state_manager.state

        if section == "features":
            self._print_header("Features Detail")

            features = state["development"]["features"]

            if features["completed"]:
                print("\n✅ COMPLETED:\n")
                for feat in features["completed"]:
                    print(f"  • {feat['name']}")
                    print(f"    ID: {feat['id']}")
                    print(f"    Completed: {feat['completed_at']}")
                    print(f"    Tests: {feat.get('tests', 'unknown')}")
                    print(f"    Coverage: {feat.get('coverage', 0)}%")
                    print()

            if features["in_progress"]:
                print("\n🔄 IN PROGRESS:\n")
                for feat in features["in_progress"]:
                    print(f"  • {feat['name']} ({feat.get('progress', 0)}%)")
                    print(f"    ID: {feat['id']}")
                    print(f"    Assigned: {feat.get('assigned_to', 'unassigned')}")
                    print(f"    Started: {feat.get('started_at', 'unknown')}")

                    subtasks = feat.get("subtasks", {})
                    if subtasks:
                        print("    Subtasks:")
                        print(f"      ✓ {', '.join(subtasks.get('completed', []))}")
                        print(f"      → {subtasks.get('current', 'none')}")
                        print(f"      ☐ {', '.join(subtasks.get('remaining', []))}")
                    print()

            if features["planned"]:
                print("\n📋 PLANNED:\n")
                for feat in features["planned"]:
                    print(f"  • {feat['name']}")
                    print(f"    ID: {feat['id']}")
                    print(f"    Priority: {feat.get('priority', 'normal')}")
                    if feat.get("dependencies"):
                        print(f"    Depends on: {', '.join(feat['dependencies'])}")
                    print()

        # Add other detail views as needed

        return 0


def main():
    cli = ForgeCLI()
    return cli.run(sys.argv[1:])


if __name__ == "__main__":
    sys.exit(main())

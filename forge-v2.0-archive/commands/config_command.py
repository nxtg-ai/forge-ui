"""Config command implementation."""

import json

from forge.result import CommandError, Err, Ok, Result

from .base import BaseCommand, CommandContext


class ConfigCommand(BaseCommand):
    """Configuration operations."""

    def __init__(self, config_service):
        """Initialize config command.

        Args:
            config_service: ConfigService instance
        """
        self.config_service = config_service

    def execute(self, context: CommandContext) -> Result[int, CommandError]:
        """Execute config command.

        Args:
            context: Command context

        Returns:
            Result with exit code
        """
        config_command = getattr(context.args, "config_command", None)

        if config_command == "show":
            return self._show(context)
        elif config_command == "validate":
            return self._validate(context)
        else:
            return Err(CommandError.invalid_args("No config subcommand specified"))

    def _show(self, context: CommandContext) -> Result[int, CommandError]:
        """Show configuration."""
        # Load config
        config_result = self.config_service.load_config()
        if config_result.is_error():
            return Err(CommandError.execution_failed(config_result.error.message))

        config = config_result.value

        # JSON output
        if context.args.json:
            if context.args.section:
                section_result = self.config_service.get_section(config, context.args.section)
                if section_result.is_error():
                    return Err(CommandError.execution_failed(section_result.error.message))
                print(json.dumps(section_result.value, indent=2))
            else:
                print(json.dumps(config, indent=2))
            return Ok(0)

        # Pretty print
        if context.args.section:
            self.print_header(f"Configuration: {context.args.section.title()}")
            section_result = self.config_service.get_section(config, context.args.section)
            if section_result.is_error():
                return Err(CommandError.execution_failed(section_result.error.message))
            self._print_section(section_result.value)
        else:
            self.print_header("NXTG-Forge Configuration")
            print(f"\n📄 Config File: {self.config_service.config_path}")
            print(f"📦 Version: {config.get('version', 'unknown')}\n")

            sections = [
                "project",
                "development",
                "testing",
                "agents",
                "hooks",
                "context",
                "safety",
            ]

            for section in sections:
                if section in config:
                    print(f"\n{'─' * 60}")
                    print(f"📋 {section.upper()}")
                    print(f"{'─' * 60}")
                    self._print_section(config[section], indent=2)

        return Ok(0)

    def _validate(self, context: CommandContext) -> Result[int, CommandError]:
        """Validate configuration."""
        print("\n🔍 Validating configuration...\n")

        # Load config
        config_result = self.config_service.load_config()
        if config_result.is_error():
            self.print_error(config_result.error.message)
            return Err(CommandError.execution_failed(config_result.error.message))

        config = config_result.value

        # Validate
        validate_result = self.config_service.validate_config(config)
        if validate_result.is_error():
            return Err(CommandError.execution_failed(validate_result.error.message))

        issues = validate_result.value

        if not issues:
            print("✅ Configuration is valid!\n")
            return Ok(0)

        # Display issues
        errors = [i for i in issues if "Missing required" in i or "must be" in i]
        warnings = [i for i in issues if i not in errors]

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
            return Ok(1)
        else:
            print("✅ Configuration is valid (with warnings)\n")
            return Ok(0)

    def _print_section(self, section, indent=0):
        """Pretty print a configuration section.

        Args:
            section: Section data to print
            indent: Indentation level
        """
        indent_str = " " * indent

        if isinstance(section, dict):
            for key, value in section.items():
                if isinstance(value, (dict, list)):
                    print(f"{indent_str}{key}:")
                    self._print_section(value, indent + 2)
                else:
                    print(f"{indent_str}{key}: {value}")
        elif isinstance(section, list):
            for item in section:
                if isinstance(item, dict):
                    if "name" in item:
                        print(f"{indent_str}• {item['name']}")
                    else:
                        print(f"{indent_str}• {item}")
                else:
                    print(f"{indent_str}• {item}")
        else:
            print(f"{indent_str}{section}")


__all__ = ["ConfigCommand"]

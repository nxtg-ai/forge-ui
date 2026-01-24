"""Directory structure management for NXTG-Forge.

Handles:
- Standard directory layout (.claude/forge/)
- Legacy migration (.nxtg-forge/ to .claude/forge/)
- Directory creation and validation
- Path resolution
"""

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from .result import Err, FileError, Ok, Result


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MigrationResult:
    """Result of a migration operation."""

    performed: bool
    from_path: Path | None = None
    to_path: Path | None = None
    message: str = ""


class DirectoryManager:
    """Manages the .claude/forge directory structure.

    Responsibilities:
    - Define standard directory layout
    - Create directory structure on demand
    - Handle migration from legacy locations
    - Provide path resolution

    Does NOT:
    - Load or save configuration
    - Manage file contents
    - Handle application logic
    """

    # Protocol version from design docs
    PROTOCOL_VERSION = "1.0"

    def __init__(self, project_root: Path | None = None):
        """Initialize directory manager.

        Args:
            project_root: Project root directory (default: current directory)
        """
        self.project_root = project_root or Path.cwd()

        # Standard directory structure
        self.claude_dir = self.project_root / ".claude"
        self.forge_dir = self.claude_dir / "forge"
        self.old_forge_dir = self.project_root / ".nxtg-forge"  # Legacy location

        # Subdirectories within .claude/forge/
        self.memory_dir = self.forge_dir / "memory"
        self.agents_dir = self.forge_dir / "agents"

        # Important files
        self.config_file = self.forge_dir / "config.yml"
        self.state_file = self.claude_dir / "state.json"
        self.checkpoints_dir = self.claude_dir / "checkpoints"

    def ensure_structure(self) -> Result[None, FileError]:
        """Create all required directories if they don't exist.

        Returns:
            Ok if directories created successfully, Err otherwise
        """
        try:
            # Create main directories
            self.claude_dir.mkdir(parents=True, exist_ok=True)
            self.forge_dir.mkdir(parents=True, exist_ok=True)
            self.memory_dir.mkdir(parents=True, exist_ok=True)
            self.agents_dir.mkdir(parents=True, exist_ok=True)
            self.checkpoints_dir.mkdir(parents=True, exist_ok=True)

            logger.debug(f"Directory structure ensured at {self.forge_dir}")
            return Ok(None)

        except PermissionError:
            return Err(FileError.permission_denied(str(self.forge_dir)))
        except Exception as e:
            return Err(FileError(f"Failed to create directories: {e}", str(self.forge_dir)))

    def migrate_legacy(self) -> MigrationResult:
        """Migrate from legacy .nxtg-forge/ to .claude/forge/ if needed.

        This implements the migration strategy from UX-REDESIGN-2026-01-07.md

        Returns:
            MigrationResult indicating what happened
        """
        # Check if legacy directory exists
        if not self.old_forge_dir.exists():
            return MigrationResult(
                performed=False,
                message="No legacy directory found, no migration needed",
            )

        # Check if new directory already exists
        if self.forge_dir.exists():
            logger.warning(
                f"Both {self.old_forge_dir} and {self.forge_dir} exist. "
                "Please manually verify migration and remove legacy directory.",
            )
            return MigrationResult(
                performed=False,
                from_path=self.old_forge_dir,
                to_path=self.forge_dir,
                message="Both directories exist - manual verification required",
            )

        # Perform migration
        try:
            logger.info(f"Migrating {self.old_forge_dir} to {self.forge_dir}")

            # Ensure parent directory exists
            self.claude_dir.mkdir(parents=True, exist_ok=True)

            # Move the directory
            shutil.move(str(self.old_forge_dir), str(self.forge_dir))

            logger.info("Migration complete: .nxtg-forge/ → .claude/forge/")

            return MigrationResult(
                performed=True,
                from_path=self.old_forge_dir,
                to_path=self.forge_dir,
                message="Successfully migrated to new location",
            )

        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return MigrationResult(
                performed=False,
                from_path=self.old_forge_dir,
                to_path=self.forge_dir,
                message=f"Migration failed: {e}",
            )

    def is_initialized(self) -> bool:
        """Check if the forge directory structure is initialized.

        Returns:
            True if .claude/forge/ exists
        """
        return self.forge_dir.exists()

    def get_relative_path(self, path: Path) -> Path:
        """Get path relative to project root.

        Args:
            path: Absolute path to make relative

        Returns:
            Path relative to project root
        """
        try:
            return path.relative_to(self.project_root)
        except ValueError:
            # Path is not relative to project root
            return path

    def validate_structure(self) -> Result[None, FileError]:
        """Validate that the directory structure is correct.

        Checks:
        - Required directories exist
        - Directories are accessible
        - No permission issues

        Returns:
            Ok if valid, Err with details if not
        """
        required_dirs = [
            self.claude_dir,
            self.forge_dir,
            self.checkpoints_dir,
        ]

        for directory in required_dirs:
            if not directory.exists():
                return Err(FileError(f"Required directory missing: {directory}", str(directory)))

            if not directory.is_dir():
                return Err(
                    FileError(f"Path exists but is not a directory: {directory}", str(directory)),
                )

            # Check write permissions
            if not os.access(directory, os.W_OK):
                return Err(FileError.permission_denied(str(directory)))

        return Ok(None)

    def create_gitignore(self) -> Result[None, FileError]:
        """Create .gitignore file in forge directory.

        The .gitignore ensures:
        - Memory directory is not committed
        - Log files are not committed
        - Config files ARE committed (explicit inclusion)

        Returns:
            Ok if created, Err otherwise
        """
        gitignore_path = self.forge_dir / ".gitignore"

        try:
            gitignore_content = """# Forge memory (don't commit)
memory/
*.log

# Keep config (do commit)
!config.yml
!config.json
"""

            gitignore_path.write_text(gitignore_content)
            logger.debug(f"Created .gitignore at {gitignore_path}")
            return Ok(None)

        except PermissionError:
            return Err(FileError.permission_denied(str(gitignore_path)))
        except Exception as e:
            return Err(FileError(f"Failed to create .gitignore: {e}", str(gitignore_path)))

    def clean_memory(self) -> Result[int, FileError]:
        """Clean the memory directory.

        Removes all files in the memory directory to free up space.

        Returns:
            Ok with count of files deleted, Err otherwise
        """
        if not self.memory_dir.exists():
            return Ok(0)

        try:
            files_deleted = 0
            for item in self.memory_dir.iterdir():
                if item.is_file():
                    item.unlink()
                    files_deleted += 1

            logger.info(f"Cleaned {files_deleted} files from memory directory")
            return Ok(files_deleted)

        except PermissionError:
            return Err(FileError.permission_denied(str(self.memory_dir)))
        except Exception as e:
            return Err(FileError(f"Failed to clean memory directory: {e}", str(self.memory_dir)))


# Utility function for backwards compatibility
def get_directory_manager(project_root: Path | None = None) -> DirectoryManager:
    """Get a DirectoryManager instance.

    Args:
        project_root: Project root directory

    Returns:
        DirectoryManager instance
    """
    return DirectoryManager(project_root)


# Import os for permission checking
import os


__all__ = [
    "DirectoryManager",
    "MigrationResult",
    "get_directory_manager",
]

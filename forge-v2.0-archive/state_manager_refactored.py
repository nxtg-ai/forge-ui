"""NXTG-Forge State Manager - Refactored with Result Types.

Handles all state operations with explicit error handling:
- State initialization and loading
- State updates and persistence
- Checkpoint creation/restore
- Recovery from interruption
"""

import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import ForgeConfig
from .result import CheckpointError, Err, Ok, Result, StateError


class StateManager:
    """Manages project state with explicit error handling."""

    def __init__(self, project_root: str = "."):
        """Initialize state manager.

        Args:
            project_root: Root directory of project
        """
        self.project_root = Path(project_root)
        self.forge_config = ForgeConfig(self.project_root)
        self.forge_config.ensure_directories()

        self.state_file = self.forge_config.state_file
        self.checkpoints_dir = self.forge_config.checkpoints_dir

        # Load state
        result = self.load()
        if result.is_ok():
            self.state = result.value
        else:
            # Fall back to initial state on error
            self.state = self.create_initial_state()

    def load(self) -> Result[dict[str, Any], StateError]:
        """Load current state from file.

        Returns:
            Result containing state dict or error
        """
        if not self.state_file.exists():
            return Ok(self.create_initial_state())

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state: dict[str, Any] = json.load(f)
                return Ok(state)
        except json.JSONDecodeError as e:
            return Err(StateError.load_failed(f"Invalid JSON: {e}"))
        except Exception as e:
            return Err(StateError.load_failed(str(e)))

    def save(self) -> Result[None, StateError]:
        """Save current state to file.

        Returns:
            Result indicating success or error
        """
        try:
            # Update timestamp
            self.state["project"]["last_updated"] = datetime.utcnow().isoformat() + "Z"

            # Write state
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2)

            # Run sync hook
            self.run_hook("state-sync.sh")

            return Ok(None)

        except Exception as e:
            return Err(StateError.save_failed(str(e)))

    def create_initial_state(self) -> dict[str, Any]:
        """Create initial state structure.

        Returns:
            Initial state dictionary
        """
        return {
            "version": "1.0.0",
            "project": {
                "name": self.project_root.name,
                "type": "unknown",
                "created_at": datetime.utcnow().isoformat() + "Z",
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "forge_version": "1.0.0",
            },
            "spec": {"status": "pending", "file": None, "hash": None},
            "architecture": {},
            "development": {
                "current_phase": "setup",
                "phases_completed": [],
                "phases_remaining": [
                    "planning",
                    "architecture",
                    "implementation",
                    "testing",
                    "documentation",
                    "deployment",
                ],
                "features": {"completed": [], "in_progress": [], "planned": []},
            },
            "agents": {
                "active": [],
                "available": [
                    "lead-architect",
                    "backend-master",
                    "cli-artisan",
                    "platform-builder",
                    "integration-specialist",
                    "qa-sentinel",
                ],
                "history": [],
            },
            "mcp_servers": {"configured": [], "recommended": []},
            "quality": {
                "tests": {
                    "unit": {"total": 0, "passing": 0, "coverage": 0},
                    "integration": {"total": 0, "passing": 0, "coverage": 0},
                    "e2e": {"total": 0, "passing": 0, "coverage": 0},
                },
                "linting": {"issues": 0, "last_run": None},
                "security": {
                    "vulnerabilities": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                    "last_scan": None,
                },
            },
            "checkpoints": [],
            "last_session": None,
        }

    def checkpoint(self, description: str) -> Result[str, CheckpointError]:
        """Create a checkpoint of current state.

        Args:
            description: Checkpoint description

        Returns:
            Result containing checkpoint ID or error
        """
        try:
            checkpoint_id = f"cp-{len(self.state['checkpoints']) + 1:03d}"
            timestamp = datetime.utcnow().isoformat() + "Z"

            # Get git commit if available
            git_commit = self._get_git_commit()

            # Save checkpoint file
            checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
            checkpoint_data = {
                "id": checkpoint_id,
                "timestamp": timestamp,
                "description": description,
                "state": self.state.copy(),
                "git_commit": git_commit,
            }

            with open(checkpoint_file, "w", encoding="utf-8") as f:
                json.dump(checkpoint_data, f, indent=2)

            # Update state
            self.state["checkpoints"].append(
                {
                    "id": checkpoint_id,
                    "timestamp": timestamp,
                    "description": description,
                    "file": str(checkpoint_file.relative_to(self.project_root)),
                    "git_commit": git_commit,
                },
            )

            # Save state
            save_result = self.save()
            if save_result.is_error():
                return Err(
                    CheckpointError.create_failed(f"Failed to save state: {save_result.error}"),
                )

            # Create latest symlink
            self._create_latest_symlink(checkpoint_file)

            return Ok(checkpoint_id)

        except Exception as e:
            return Err(CheckpointError.create_failed(str(e)))

    def restore(self, checkpoint_id: str | None = None) -> Result[None, CheckpointError]:
        """Restore from checkpoint.

        Args:
            checkpoint_id: Checkpoint to restore (latest if None)

        Returns:
            Result indicating success or error
        """
        try:
            # Determine checkpoint ID
            if checkpoint_id is None:
                if not self.state["checkpoints"]:
                    return Err(CheckpointError("No checkpoints available"))
                checkpoint_id = self.state["checkpoints"][-1]["id"]

            # Load checkpoint
            checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"

            if not checkpoint_file.exists():
                return Err(CheckpointError.not_found(checkpoint_id))

            with open(checkpoint_file, encoding="utf-8") as f:
                checkpoint_data = json.load(f)

            # Restore state
            self.state = checkpoint_data["state"]

            # Save restored state
            save_result = self.save()
            if save_result.is_error():
                return Err(
                    CheckpointError.restore_failed(
                        checkpoint_id,
                        f"Failed to save restored state: {save_result.error}",
                    ),
                )

            return Ok(None)

        except json.JSONDecodeError as e:
            return Err(
                CheckpointError.restore_failed(
                    checkpoint_id or "unknown",
                    f"Invalid checkpoint data: {e}",
                ),
            )
        except Exception as e:
            return Err(CheckpointError.restore_failed(checkpoint_id or "unknown", str(e)))

    def update_feature(self, feature_id: str, updates: dict[str, Any]) -> Result[None, StateError]:
        """Update feature status.

        Args:
            feature_id: Feature identifier
            updates: Updates to apply

        Returns:
            Result indicating success or error
        """
        # Find feature
        for status in ["completed", "in_progress", "planned"]:
            features = self.state["development"]["features"][status]
            for i, feature in enumerate(features):
                if feature["id"] == feature_id:
                    features[i].update(updates)
                    return self.save()

        return Err(StateError.invalid_state(f"Feature not found: {feature_id}"))

    def move_feature(
        self,
        feature_id: str,
        from_status: str,
        to_status: str,
    ) -> Result[None, StateError]:
        """Move feature between statuses.

        Args:
            feature_id: Feature identifier
            from_status: Source status
            to_status: Target status

        Returns:
            Result indicating success or error
        """
        features = self.state["development"]["features"]

        # Find and remove from source
        feature = None
        for i, f in enumerate(features[from_status]):
            if f["id"] == feature_id:
                feature = features[from_status].pop(i)
                break

        if not feature:
            return Err(StateError.invalid_state(f"Feature {feature_id} not found in {from_status}"))

        # Add to destination
        features[to_status].append(feature)
        return self.save()

    def record_session(
        self,
        session_id: str,
        agent: str,
        task: str,
        status: str = "active",
    ) -> Result[None, StateError]:
        """Record current session for recovery.

        Args:
            session_id: Session identifier
            agent: Active agent
            task: Current task
            status: Session status

        Returns:
            Result indicating success or error
        """
        self.state["last_session"] = {
            "id": session_id,
            "started": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "task": task,
            "status": status,
        }
        return self.save()

    def get_recovery_info(self) -> dict[str, Any] | None:
        """Get information for zero-context recovery.

        Returns:
            Recovery information or None if not needed
        """
        last_session = self.state.get("last_session")

        if not last_session or last_session["status"] != "interrupted":
            return None

        # Get last checkpoint
        last_checkpoint = None
        if self.state["checkpoints"]:
            last_checkpoint = self.state["checkpoints"][-1]

        # Get in-progress features
        in_progress = self.state["development"]["features"]["in_progress"]

        return {
            "session": last_session,
            "checkpoint": last_checkpoint,
            "in_progress_features": in_progress,
            "recovery_commands": [
                f"claude --resume {last_session['id']}",
                f"/restore {last_checkpoint['id']}" if last_checkpoint else None,
                "/status --detail features",
            ],
        }

    def run_hook(self, hook_name: str) -> None:
        """Run a lifecycle hook if it exists.

        Args:
            hook_name: Name of hook script
        """
        hook_path = self.forge_config.claude_dir / "hooks" / hook_name
        if hook_path.exists() and hook_path.stat().st_mode & 0o111:  # Check executable
            subprocess.run([str(hook_path)], cwd=self.project_root, check=False)

    def _get_git_commit(self) -> str | None:
        """Get current git commit hash.

        Returns:
            Commit hash or None
        """
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None

    def _create_latest_symlink(self, checkpoint_file: Path) -> None:
        """Create symlink to latest checkpoint.

        Args:
            checkpoint_file: Checkpoint file path
        """
        try:
            latest_link = self.checkpoints_dir / "latest.json"
            if latest_link.exists():
                latest_link.unlink()
            latest_link.symlink_to(checkpoint_file.name)
        except Exception:
            pass  # Symlinks not critical, ignore errors


__all__ = ["StateManager"]

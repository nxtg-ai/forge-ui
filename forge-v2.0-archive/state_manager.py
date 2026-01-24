#!/usr/bin/env python3
"""NXTG-Forge State Manager

Handles all state operations:
- State initialization
- State updates
- Checkpoint creation/restore
- Recovery from interruption
- Zero-context continuation

Refactored with Result types for explicit error handling.
"""

import json
import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import ForgeConfig
from .result import Err, Ok, Result, StateError


logger = logging.getLogger(__name__)


class StateManager:
    def __init__(self, project_root: str = "."):
        """Initialize StateManager.

        Args:
            project_root: Root directory of the project

        Note: Constructor doesn't raise exceptions. Call load() explicitly
              to get Result type for error handling.
        """
        self.project_root = Path(project_root)

        # Use ForgeConfig for path management
        self.forge_config = ForgeConfig(self.project_root)
        self.forge_config.ensure_directories()

        # Use paths from config
        self.state_file = self.forge_config.state_file
        self.checkpoints_dir = self.forge_config.checkpoints_dir

        # State is loaded lazily via load()
        self.state: dict[str, Any] = {}

    def load(self) -> Result[dict[str, Any], StateError]:
        """Load current state.

        Returns:
            Result containing state dict or StateError
        """
        if not self.state_file.exists():
            self.state = self.create_initial_state()
            return Ok(self.state)

        try:
            with open(self.state_file, encoding="utf-8") as f:
                state_data: dict[str, Any] = json.load(f)
                self.state = state_data
                logger.info(f"Loaded state from {self.state_file}")
                return Ok(state_data)
        except json.JSONDecodeError as e:
            error = StateError.invalid_json(str(e))
            logger.error(f"Failed to load state: {error}")
            return Err(error)
        except Exception as e:
            error = StateError(f"Failed to load state: {e}")
            logger.error(f"Failed to load state: {error}")
            return Err(error)

    def save(self) -> Result[None, StateError]:
        """Save current state.

        Returns:
            Result indicating success or StateError
        """
        try:
            self.state["project"]["last_updated"] = datetime.utcnow().isoformat() + "Z"

            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2)

            logger.info(f"Saved state to {self.state_file}")

            # Auto-sync state hook
            hook_result = self.run_hook("state-sync.sh")
            if hook_result.is_error():
                logger.warning(f"State sync hook failed: {hook_result.error}")
                # Don't fail save if hook fails

            return Ok(None)

        except Exception as e:
            error = StateError(f"Failed to save state: {e}")
            logger.error(str(error))
            return Err(error)

    def create_initial_state(self) -> dict[str, Any]:
        """Create initial state for new project"""
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

    def checkpoint(self, description: str) -> Result[str, StateError]:
        """Create a checkpoint of current state.

        Args:
            description: Description of the checkpoint

        Returns:
            Result containing checkpoint ID or StateError
        """
        try:
            checkpoint_id = f"cp-{len(self.state['checkpoints']) + 1:03d}"
            timestamp = datetime.utcnow().isoformat() + "Z"

            # Get git commit if in git repo
            git_commit = self._get_git_commit()

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

            # Add to checkpoints list
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
                return Err(StateError(f"Failed to save after checkpoint: {save_result.error}"))

            # Create symlink to latest
            try:
                latest_link = self.checkpoints_dir / "latest.json"
                if latest_link.exists():
                    latest_link.unlink()
                latest_link.symlink_to(checkpoint_file.name)
            except Exception as e:
                logger.warning(f"Failed to create latest symlink: {e}")
                # Don't fail checkpoint if symlink fails

            logger.info(f"Created checkpoint {checkpoint_id}: {description}")
            return Ok(checkpoint_id)

        except Exception as e:
            error = StateError(f"Failed to create checkpoint: {e}")
            logger.error(str(error))
            return Err(error)

    def _get_git_commit(self) -> str | None:
        """Get current git commit hash.

        Returns:
            Commit hash or None if not in git repo
        """
        try:
            commit = (
                subprocess.check_output(
                    ["git", "rev-parse", "HEAD"],
                    cwd=self.project_root,
                    stderr=subprocess.DEVNULL,
                )
                .decode()
                .strip()
            )
            return commit
        except Exception:
            return None

    def restore(
        self,
        checkpoint_id: str | None = None,
        restore_git: bool = False,
    ) -> Result[dict, StateError]:
        """Restore from checkpoint.

        Args:
            checkpoint_id: ID of checkpoint to restore, or None for latest
            restore_git: Whether to restore git state (non-interactive)

        Returns:
            Result containing checkpoint data or StateError
        """
        try:
            if checkpoint_id is None:
                # Restore from latest
                if not self.state["checkpoints"]:
                    return Err(StateError("No checkpoints available"))
                checkpoint_id = self.state["checkpoints"][-1]["id"]

            checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"

            if not checkpoint_file.exists():
                return Err(StateError.missing_file(f"Checkpoint {checkpoint_id} not found"))

            with open(checkpoint_file, encoding="utf-8") as f:
                checkpoint_data = json.load(f)

            # Restore state
            self.state = checkpoint_data["state"]

            save_result = self.save()
            if save_result.is_error():
                return Err(StateError(f"Failed to save after restore: {save_result.error}"))

            logger.info(f"Restored from checkpoint: {checkpoint_id}")
            logger.info(f"  Description: {checkpoint_data['description']}")
            logger.info(f"  Timestamp: {checkpoint_data['timestamp']}")

            # Optionally restore git state
            if restore_git and checkpoint_data.get("git_commit"):
                git_result = self._restore_git_state(checkpoint_data["git_commit"])
                if git_result.is_error():
                    logger.warning(f"Failed to restore git state: {git_result.error}")
                    # Don't fail restore if git fails

            return Ok(checkpoint_data)

        except Exception as e:
            error = StateError(f"Failed to restore checkpoint: {e}")
            logger.error(str(error))
            return Err(error)

    def _restore_git_state(self, commit_hash: str) -> Result[None, str]:
        """Restore git state to specific commit.

        Args:
            commit_hash: Git commit hash to restore

        Returns:
            Result indicating success or error message
        """
        try:
            result = subprocess.run(
                ["git", "checkout", commit_hash],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                return Err(f"Git checkout failed: {result.stderr}")

            logger.info(f"Restored git state to commit: {commit_hash[:8]}")
            return Ok(None)

        except Exception as e:
            return Err(f"Failed to restore git state: {e}")

    def update_feature(self, feature_id: str, updates: dict[str, Any]) -> Result[None, StateError]:
        """Update feature status.

        Args:
            feature_id: Feature identifier
            updates: Dictionary of updates to apply

        Returns:
            Result indicating success or StateError
        """
        # Find feature in state
        for status in ["completed", "in_progress", "planned"]:
            features = self.state["development"]["features"][status]
            for i, feature in enumerate(features):
                if feature["id"] == feature_id:
                    features[i].update(updates)

                    save_result = self.save()
                    if save_result.is_error():
                        return Err(
                            StateError(f"Failed to save after feature update: {save_result.error}"),
                        )

                    logger.info(f"Updated feature {feature_id}")
                    return Ok(None)

        return Err(StateError(f"Feature {feature_id} not found"))

    def move_feature(
        self,
        feature_id: str,
        from_status: str,
        to_status: str,
    ) -> Result[None, StateError]:
        """Move feature between statuses.

        Args:
            feature_id: Feature identifier
            from_status: Source status (completed, in_progress, planned)
            to_status: Destination status

        Returns:
            Result indicating success or StateError
        """
        features = self.state["development"]["features"]

        # Validate status values
        valid_statuses = ["completed", "in_progress", "planned"]
        if from_status not in valid_statuses:
            return Err(StateError(f"Invalid from_status: {from_status}"))
        if to_status not in valid_statuses:
            return Err(StateError(f"Invalid to_status: {to_status}"))

        # Find and remove from source
        feature = None
        for i, f in enumerate(features[from_status]):
            if f["id"] == feature_id:
                feature = features[from_status].pop(i)
                break

        if not feature:
            return Err(StateError(f"Feature {feature_id} not found in {from_status}"))

        # Add to destination
        features[to_status].append(feature)

        save_result = self.save()
        if save_result.is_error():
            return Err(StateError(f"Failed to save after feature move: {save_result.error}"))

        logger.info(f"Moved feature {feature_id} from {from_status} to {to_status}")
        return Ok(None)

    def record_session(
        self,
        session_id: str,
        agent: str,
        task: str,
        status: str = "active",
    ) -> Result[None, StateError]:
        """Record current session for recovery.

        Args:
            session_id: Unique session identifier
            agent: Agent name
            task: Task description
            status: Session status (default: active)

        Returns:
            Result indicating success or StateError
        """
        self.state["last_session"] = {
            "id": session_id,
            "started": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "task": task,
            "status": status,
        }

        save_result = self.save()
        if save_result.is_error():
            return Err(StateError(f"Failed to save session: {save_result.error}"))

        logger.info(f"Recorded session {session_id}: {agent} - {task}")
        return Ok(None)

    def get_recovery_info(self) -> Result[dict[str, Any], StateError]:
        """Get information for zero-context recovery.

        Returns:
            Result containing recovery info or StateError if no recovery needed
        """
        last_session = self.state.get("last_session")

        if not last_session or last_session["status"] != "interrupted":
            return Err(StateError("No recovery needed - no interrupted session"))

        # Get last checkpoint
        last_checkpoint = None
        if self.state["checkpoints"]:
            last_checkpoint = self.state["checkpoints"][-1]

        # Get in-progress features
        in_progress = self.state["development"]["features"]["in_progress"]

        recovery_info = {
            "session": last_session,
            "checkpoint": last_checkpoint,
            "in_progress_features": in_progress,
            "recovery_commands": [
                f"claude --resume {last_session['id']}",
                f"/restore {last_checkpoint['id']}" if last_checkpoint else None,
                "/status --detail features",
            ],
        }

        return Ok(recovery_info)

    def run_hook(self, hook_name: str) -> Result[None, str]:
        """Run a lifecycle hook.

        Args:
            hook_name: Name of hook script to run

        Returns:
            Result indicating success or error message
        """
        hook_path = self.forge_config.claude_dir / "hooks" / hook_name

        if not hook_path.exists():
            return Ok(None)  # No hook is not an error

        if not os.access(hook_path, os.X_OK):
            return Err(f"Hook {hook_name} is not executable")

        try:
            result = subprocess.run(
                [str(hook_path)],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode != 0:
                return Err(f"Hook {hook_name} failed: {result.stderr}")

            logger.info(f"Hook {hook_name} executed successfully")
            return Ok(None)

        except Exception as e:
            return Err(f"Failed to run hook {hook_name}: {e}")


# CLI
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: state_manager.py <command> [args]")
        sys.exit(1)

    manager = StateManager()

    # Load state
    load_result = manager.load()
    if load_result.is_error():
        print(f"Error loading state: {load_result.error}")
        sys.exit(1)

    command = sys.argv[1]

    if command == "checkpoint":
        description = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Manual checkpoint"
        result = manager.checkpoint(description)

        if result.is_ok():
            print(f"✓ Checkpoint created: {result.value}")
        else:
            print(f"Error creating checkpoint: {result.error}")
            sys.exit(1)

    elif command == "restore":
        restore_id: str | None = sys.argv[2] if len(sys.argv) > 2 else None
        restore_git = "--git" in sys.argv

        result = manager.restore(restore_id, restore_git=restore_git)

        if result.is_ok():
            data = result.value
            print(f"✓ Restored from checkpoint: {data['id']}")
            print(f"  Description: {data['description']}")
            print(f"  Timestamp: {data['timestamp']}")
            if data.get("git_commit"):
                print(f"  Git commit: {data['git_commit'][:8]}")
        else:
            print(f"Error restoring checkpoint: {result.error}")
            sys.exit(1)

    elif command == "recovery-info":
        result = manager.get_recovery_info()

        if result.is_ok():
            print(json.dumps(result.value, indent=2))
        else:
            print(f"No recovery needed: {result.error}")

    elif command == "status":
        print(json.dumps(manager.state, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

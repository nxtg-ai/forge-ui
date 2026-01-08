#!/usr/bin/env python3
"""NXTG-Forge State Manager

Handles all state operations:
- State initialization
- State updates
- Checkpoint creation/restore
- Recovery from interruption
- Zero-context continuation
"""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .config import ForgeConfig


class StateManager:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)

        # Use ForgeConfig for path management
        self.forge_config = ForgeConfig(self.project_root)
        self.forge_config.ensure_directories()

        # Use paths from config
        self.state_file = self.forge_config.state_file
        self.checkpoints_dir = self.forge_config.checkpoints_dir

        self.state = self.load()

    def load(self) -> dict[str, Any]:
        """Load current state"""
        if not self.state_file.exists():
            return self.create_initial_state()

        with open(self.state_file) as f:
            state_data: dict[str, Any] = json.load(f)
            return state_data

    def save(self):
        """Save current state"""
        self.state["project"]["last_updated"] = datetime.utcnow().isoformat() + "Z"

        with open(self.state_file, "w") as f:
            json.dump(self.state, f, indent=2)

        # Auto-sync state hook
        self.run_hook("state-sync.sh")

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

    def checkpoint(self, description: str) -> str:
        """Create a checkpoint of current state"""
        checkpoint_id = f"cp-{len(self.state['checkpoints']) + 1:03d}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Get git commit if in git repo
        git_commit = None
        try:
            git_commit = (
                subprocess.check_output(
                    ["git", "rev-parse", "HEAD"],
                    cwd=self.project_root,
                    stderr=subprocess.DEVNULL,
                )
                .decode()
                .strip()
            )
        except:
            pass

        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"

        checkpoint_data = {
            "id": checkpoint_id,
            "timestamp": timestamp,
            "description": description,
            "state": self.state.copy(),
            "git_commit": git_commit,
        }

        with open(checkpoint_file, "w") as f:
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

        self.save()

        # Create symlink to latest
        latest_link = self.checkpoints_dir / "latest.json"
        if latest_link.exists():
            latest_link.unlink()
        latest_link.symlink_to(checkpoint_file.name)

        return checkpoint_id

    def restore(self, checkpoint_id: Optional[str] = None):
        """Restore from checkpoint"""
        if checkpoint_id is None:
            # Restore from latest
            checkpoint_id = self.state["checkpoints"][-1]["id"]

        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"

        if not checkpoint_file.exists():
            raise ValueError(f"Checkpoint {checkpoint_id} not found")

        with open(checkpoint_file) as f:
            checkpoint_data = json.load(f)

        # Restore state
        self.state = checkpoint_data["state"]
        self.save()

        print(f"✓ Restored from checkpoint: {checkpoint_id}")
        print(f"  Description: {checkpoint_data['description']}")
        print(f"  Timestamp: {checkpoint_data['timestamp']}")

        if checkpoint_data.get("git_commit"):
            print(f"  Git commit: {checkpoint_data['git_commit'][:8]}")

            # Ask if should restore git state
            response = input("\nRestore git state? (y/n): ")
            if response.lower() == "y":
                subprocess.run(
                    ["git", "checkout", checkpoint_data["git_commit"]],
                    cwd=self.project_root,
                    check=False,
                )

    def update_feature(self, feature_id: str, updates: dict[str, Any]):
        """Update feature status"""
        # Find feature in state
        for status in ["completed", "in_progress", "planned"]:
            features = self.state["development"]["features"][status]
            for i, feature in enumerate(features):
                if feature["id"] == feature_id:
                    features[i].update(updates)
                    self.save()
                    return

        raise ValueError(f"Feature {feature_id} not found")

    def move_feature(self, feature_id: str, from_status: str, to_status: str):
        """Move feature between statuses"""
        features = self.state["development"]["features"]

        # Find and remove from source
        feature = None
        for i, f in enumerate(features[from_status]):
            if f["id"] == feature_id:
                feature = features[from_status].pop(i)
                break

        if not feature:
            raise ValueError(f"Feature {feature_id} not found in {from_status}")

        # Add to destination
        features[to_status].append(feature)
        self.save()

    def record_session(self, session_id: str, agent: str, task: str, status: str = "active"):
        """Record current session for recovery"""
        self.state["last_session"] = {
            "id": session_id,
            "started": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "task": task,
            "status": status,
        }
        self.save()

    def get_recovery_info(self) -> Optional[dict[str, Any]]:
        """Get information for zero-context recovery"""
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

    def run_hook(self, hook_name: str):
        """Run a lifecycle hook"""
        hook_path = self.forge_config.claude_dir / "hooks" / hook_name
        if hook_path.exists() and os.access(hook_path, os.X_OK):
            subprocess.run([str(hook_path)], cwd=self.project_root, check=False)


# CLI
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: state_manager.py <command> [args]")
        sys.exit(1)

    manager = StateManager()
    command = sys.argv[1]

    if command == "checkpoint":
        description = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Manual checkpoint"
        checkpoint_id = manager.checkpoint(description)
        print(f"✓ Checkpoint created: {checkpoint_id}")

    elif command == "restore":
        restore_id: Optional[str] = sys.argv[2] if len(sys.argv) > 2 else None
        manager.restore(restore_id)

    elif command == "recovery-info":
        info = manager.get_recovery_info()
        if info:
            print(json.dumps(info, indent=2))
        else:
            print("No recovery needed")

    elif command == "status":
        print(json.dumps(manager.state, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

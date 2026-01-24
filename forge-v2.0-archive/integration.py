#!/usr/bin/env python3
"""NXTG-Forge Integration API for Claude Code

This module provides the public API for Claude Code to detect and use nxtg-forge.
Implements the protocol from .claude/forge/AUTO-SETUP.md

Usage from Claude Code:
    from forge.integration import is_forge_available, handle_request

    if is_forge_available():
        result = handle_request(user_request, context)
"""

import logging
from pathlib import Path
from typing import Any, Optional

from forge import __version__

from .config import ForgeConfig, get_forge_config, requires_complex_handling


logger = logging.getLogger(__name__)

# Module-level flag set on first import
_FORGE_AVAILABLE = True
_FORGE_VERSION = __version__


def is_forge_available() -> bool:
    """Check if nxtg-forge is available

    This is a fast check that can be called on every request.
    No setup or initialization is performed.

    Returns:
        True if forge is available
    """
    return _FORGE_AVAILABLE


def get_forge_version() -> str:
    """Get forge version

    Returns:
        Version string (e.g., "1.0.0")
    """
    return _FORGE_VERSION


def should_use_forge(request: str) -> bool:
    """Determine if request should use forge

    Implements complexity detection from AUTO-SETUP.md.
    Fast check that can be called on every request.

    Args:
        request: User request text

    Returns:
        True if request should use forge orchestration

    Example:
        >>> should_use_forge("Fix typo in README")
        False
        >>> should_use_forge("Create REST API with authentication")
        True
    """
    return requires_complex_handling(request)


def handle_request(
    request: str,
    context: Optional[dict[str, Any]] = None,
    project_root: Optional[Path] = None,
) -> dict[str, Any]:
    """Handle user request using forge orchestration

    This is the main entry point for Claude Code to use forge.
    Implements silent fallback - always returns a result, never raises.

    Args:
        request: User request text
        context: Additional context (conversation history, file changes, etc.)
        project_root: Project root directory (default: current directory)

    Returns:
        Result dictionary with:
            - success: bool
            - plan: Optional[dict] - Execution plan
            - agents: Optional[list] - Agents used
            - result: Any - Final result or error
            - fallback: bool - True if fell back to standard behavior

    Example:
        >>> result = handle_request(
        ...     "Add OAuth2 authentication",
        ...     context={"current_phase": "implementation"}
        ... )
        >>> if result["success"]:
        ...     print(f"Used {len(result['agents'])} agents")
    """
    try:
        # Get configuration (lazy loaded)
        config = get_forge_config(project_root)

        # Check if forge should be used
        if not should_use_forge(request):
            return {
                "success": True,
                "fallback": True,
                "reason": "Request does not require complex handling",
                "result": None,
            }

        # Analyze request and create execution plan
        plan = _create_execution_plan(request, context, config)

        # Execute plan
        result = _execute_plan(plan, config)

        return {
            "success": True,
            "fallback": False,
            "plan": plan,
            "agents": plan.get("agents", []),
            "result": result,
        }

    except Exception as e:
        # Silent fallback - log but don't raise
        logger.error(f"Forge execution failed: {e}", exc_info=True)

        return {
            "success": False,
            "fallback": True,
            "error": str(e),
            "result": None,
        }


def _create_execution_plan(
    request: str,
    context: Optional[dict[str, Any]],
    config: ForgeConfig,
) -> dict[str, Any]:
    """Create execution plan for request

    Args:
        request: User request
        context: Additional context
        config: Forge configuration

    Returns:
        Execution plan dictionary
    """
    # Import here to avoid circular dependencies
    from .agents.orchestrator import AgentOrchestrator

    # Create orchestrator
    orchestrator = AgentOrchestrator(config.project_root)

    # Analyze request and suggest agents
    from .agents import suggest_agent

    # Simple plan for now - will be enhanced with full orchestration
    plan = {
        "request": request,
        "context": context or {},
        "agents": [suggest_agent(request)],
        "steps": _decompose_request(request),
        "config": {
            "max_parallel": config.get_max_parallel_agents(),
            "memory_enabled": config.get_memory_enabled(),
        },
    }

    return plan


def _decompose_request(request: str) -> list[dict[str, Any]]:
    """Decompose request into steps

    This is a simplified version - full implementation would use
    the orchestrator's planning capabilities.

    Args:
        request: User request

    Returns:
        List of execution steps
    """
    import re

    steps: list[dict[str, Any]] = []

    # Simple keyword-based decomposition
    if re.search(r"auth|authentication", request, re.I):
        steps.extend(
            [
                {
                    "name": "Create user model",
                    "agent": "backend-master",
                    "description": "Create user model with password hashing",
                },
                {
                    "name": "Create auth endpoints",
                    "agent": "backend-master",
                    "description": "Create login/logout/register endpoints",
                },
                {
                    "name": "Add authentication tests",
                    "agent": "qa-sentinel",
                    "description": "Create comprehensive auth tests",
                },
            ],
        )

    if re.search(r"api|rest|graphql", request, re.I):
        steps.extend(
            [
                {
                    "name": "Design API structure",
                    "agent": "lead-architect",
                    "description": "Design API endpoints and data models",
                },
                {
                    "name": "Implement endpoints",
                    "agent": "backend-master",
                    "description": "Implement API endpoints",
                },
                {
                    "name": "Add API tests",
                    "agent": "qa-sentinel",
                    "description": "Create API integration tests",
                },
            ],
        )

    if re.search(r"deploy|infrastructure|docker", request, re.I):
        steps.append(
            {
                "name": "Setup infrastructure",
                "agent": "platform-builder",
                "description": "Configure deployment infrastructure",
            },
        )

    # If no specific steps identified, create generic plan
    if not steps:
        steps.append(
            {
                "name": "Execute request",
                "agent": "backend-master",
                "description": request,
            },
        )

    return steps


def _execute_plan(plan: dict[str, Any], config: ForgeConfig) -> dict[str, Any]:
    """Execute the plan

    Args:
        plan: Execution plan
        config: Forge configuration

    Returns:
        Execution result
    """
    # Import here to avoid circular dependencies
    from .state_manager import StateManager

    # Get state manager
    state_manager = StateManager(str(config.project_root))

    # Record session
    import uuid

    session_id = str(uuid.uuid4())[:8]
    state_manager.record_session(
        session_id=session_id,
        agent=plan["agents"][0] if plan["agents"] else "unknown",
        task=plan["request"],
        status="active",
    )

    # Execute steps (simplified - full implementation would use orchestrator)
    results = []
    for step in plan["steps"]:
        # This is a placeholder - real implementation would dispatch to agents
        results.append(
            {
                "step": step["name"],
                "agent": step["agent"],
                "status": "planned",
                "description": step["description"],
            },
        )

    return {
        "session_id": session_id,
        "plan": plan,
        "steps": results,
        "message": f"Planned {len(results)} steps for execution",
    }


# Convenience functions


def get_config(project_root: Optional[Path] = None) -> ForgeConfig:
    """Get forge configuration

    Args:
        project_root: Project root directory

    Returns:
        ForgeConfig instance
    """
    return get_forge_config(project_root)


def is_feature_enabled(feature: str, project_root: Optional[Path] = None) -> bool:
    """Check if a feature is enabled

    Args:
        feature: Feature name (e.g., 'tdd_workflow')
        project_root: Project root directory

    Returns:
        True if feature is enabled
    """
    config = get_forge_config(project_root)
    return config.is_feature_enabled(feature)


# Simple API for quick checks
def quick_check() -> dict[str, Any]:
    """Quick health check of forge system

    Returns:
        Status dictionary with version, availability, and config
    """
    try:
        config = get_forge_config()
        return {
            "available": True,
            "version": _FORGE_VERSION,
            "protocol_version": config.PROTOCOL_VERSION,
            "project_root": str(config.project_root),
            "config_file": str(config.config_file),
            "config_exists": config.config_file.exists(),
            "features": config.config["defaults"]["features"],
        }
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
        }

"""Domain services for NXTG-Forge business logic.

Services contain business logic and coordinate between domain models.
They are pure Python classes with no CLI-specific code.

Services follow these principles:
- Single Responsibility: Each service handles one domain area
- Dependency Injection: All dependencies passed via constructor
- Result Types: All methods return Result for explicit error handling
- No I/O in constructors: Lazy-load or inject dependencies
- Testable: Easy to mock dependencies for unit testing
"""

from .activity_reporter import ActivityReporter
from .analytics_service import AnalyticsService
from .checkpoint_service import CheckpointService
from .config_service import ConfigService
from .context_restoration import ContextRestorationService
from .dashboard_service import DashboardService
from .health_service import HealthService
from .notification_service import NotificationService
from .project_service import ProjectService
from .quality_alerter import QualityAlerter
from .quality_monitor import QualityMonitor
from .recommendation_engine import RecommendationEngine
from .session_reporter import SessionReporter
from .status_service import StatusService


__all__ = [
    "ActivityReporter",
    "AnalyticsService",
    "CheckpointService",
    "ConfigService",
    "ContextRestorationService",
    "DashboardService",
    "HealthService",
    "NotificationService",
    "ProjectService",
    "QualityAlerter",
    "QualityMonitor",
    "RecommendationEngine",
    "SessionReporter",
    "StatusService",
]

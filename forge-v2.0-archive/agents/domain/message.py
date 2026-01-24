"""Immutable Message domain model."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class MessageType(Enum):
    """Agent communication message types."""

    HANDOFF = "handoff"  # Hand off task to another agent
    QUERY = "query"  # Query another agent for information
    RESULT = "result"  # Send result back
    STATUS = "status"  # Status update
    ERROR = "error"  # Error notification


@dataclass(frozen=True)
class Message:
    """Immutable message between agents.

    Represents communication between agents during task execution.
    Messages are immutable to ensure thread-safety in async execution.

    Attributes:
        message_id: Unique message identifier
        from_agent: Source agent type
        to_agent: Target agent type
        message_type: Type of message
        content: Message payload
        timestamp: ISO 8601 timestamp
        correlation_id: Optional ID linking related messages
    """

    message_id: str
    from_agent: str  # AgentType value
    to_agent: str  # AgentType value
    message_type: MessageType
    content: dict
    timestamp: str
    correlation_id: str | None = None

    def is_handoff(self) -> bool:
        """Check if this is a handoff message."""
        return self.message_type == MessageType.HANDOFF

    def is_query(self) -> bool:
        """Check if this is a query message."""
        return self.message_type == MessageType.QUERY

    def is_result(self) -> bool:
        """Check if this is a result message."""
        return self.message_type == MessageType.RESULT

    def is_error(self) -> bool:
        """Check if this is an error message."""
        return self.message_type == MessageType.ERROR


class MessageBuilder:
    """Builder for creating Message instances.

    Usage:
        message = (MessageBuilder(
                       message_id="msg-001",
                       from_agent="lead-architect",
                       to_agent="backend-master"
                   )
                   .with_type(MessageType.HANDOFF)
                   .with_content({"task_id": "task-1"})
                   .build())
    """

    def __init__(self, message_id: str, from_agent: str, to_agent: str):
        """Initialize builder with required fields.

        Args:
            message_id: Unique message ID
            from_agent: Source agent
            to_agent: Target agent
        """
        self._message_id = message_id
        self._from_agent = from_agent
        self._to_agent = to_agent
        self._message_type = MessageType.STATUS
        self._content: dict = {}
        self._timestamp = datetime.utcnow().isoformat() + "Z"
        self._correlation_id = None

    def with_type(self, message_type: MessageType) -> "MessageBuilder":
        """Set message type."""
        self._message_type = message_type
        return self

    def with_content(self, content: dict) -> "MessageBuilder":
        """Set message content."""
        self._content = content
        return self

    def with_timestamp(self, timestamp: str) -> "MessageBuilder":
        """Set timestamp."""
        self._timestamp = timestamp
        return self

    def with_correlation_id(self, correlation_id: str) -> "MessageBuilder":
        """Set correlation ID."""
        self._correlation_id = correlation_id
        return self

    def build(self) -> Message:
        """Build immutable Message.

        Returns:
            Immutable Message instance
        """
        return Message(
            message_id=self._message_id,
            from_agent=self._from_agent,
            to_agent=self._to_agent,
            message_type=self._message_type,
            content=self._content,
            timestamp=self._timestamp,
            correlation_id=self._correlation_id,
        )


__all__ = ["Message", "MessageBuilder", "MessageType"]

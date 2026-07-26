from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


@dataclass
class AuditEntry:
    timestamp: str
    user_id: str
    action: str
    document_id: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogger:
    """Logs audit events."""

    def __init__(self):
        self.logs: List[AuditEntry] = []

    def log(
        self,
        user_id: str,
        action: str,
        document_id: str = None,
        details: Dict[str, Any] = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> bool:
        """Log an audit event."""
        entry = AuditEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            user_id=user_id,
            action=action,
            document_id=document_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.logs.append(entry)
        return True

    def get_logs(
        self,
        user_id: str = None,
        action: str = None,
        limit: int = 100,
    ) -> List[AuditEntry]:
        """Get audit logs with optional filters."""
        filtered = self.logs

        if user_id:
            filtered = [l for l in filtered if l.user_id == user_id]

        if action:
            filtered = [l for l in filtered if l.action == action]

        return filtered[-limit:]

from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class AuditLog(Document):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    ip_address: Optional[str] = None
    action: str = Field(..., pattern="^(CREATE|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT|PUBLISH_FORM|RECORD_PAYMENT|ASSIGN_GROUP|READ)$")
    resource_type: str
    resource_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None

    class Settings:
        name = "audit_logs"
        indexes = [
            [("user_id", 1), ("timestamp", -1)],
            [("resource_type", 1), ("resource_id", 1)],
            [("action", 1), ("timestamp", -1)],
            [("timestamp", 1), {"expireAfterSeconds": 365 * 86400}],
        ]

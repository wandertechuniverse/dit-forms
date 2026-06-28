from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.deps import require_role

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def get_audit_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    current_user: User = Depends(require_role("admin", "auditor")),
):
    query: dict = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type

    logs = await AuditLog.find(query).sort(-AuditLog.timestamp).limit(limit).to_list()
    return {
        "logs": [
            {
                "id": str(log.id),
                "timestamp": log.timestamp.isoformat(),
                "user_id": log.user_id,
                "user_role": log.user_role,
                "ip_address": log.ip_address,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "success": log.success,
                "error_message": log.error_message,
            }
            for log in logs
        ],
        "total": len(logs),
    }


@router.get("/stats")
async def get_audit_stats(
    current_user: User = Depends(require_role("admin", "auditor")),
):
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    total = await AuditLog.find().count()
    last_24h_count = await AuditLog.find(AuditLog.timestamp >= last_24h).count()
    last_7d_count = await AuditLog.find(AuditLog.timestamp >= last_7d).count()
    failed = await AuditLog.find(AuditLog.success == False).count()

    return {
        "total_logs": total,
        "last_24h": last_24h_count,
        "last_7d": last_7d_count,
        "failed_attempts": failed,
    }

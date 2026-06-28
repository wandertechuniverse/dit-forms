import logging
from datetime import datetime, timedelta
from app.models.audit_log import AuditLog

logger = logging.getLogger("dit_forms.retention")

RETENTION_DAYS = 365


async def purge_old_audit_logs():
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    result = await AuditLog.find(AuditLog.timestamp < cutoff).delete()
    deleted = getattr(result, "deleted_count", 0) or 0

    if deleted > 0:
        logger.info(f"[RETENTION] Purged {deleted} audit logs older than {RETENTION_DAYS} days")
        await AuditLog(
            user_id="system-retention",
            user_role="system",
            action="DELETE",
            resource_type="AuditLog",
            metadata={"cutoff_date": cutoff.isoformat(), "deleted_count": deleted},
            success=True,
        ).insert()

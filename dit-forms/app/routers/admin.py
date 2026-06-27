from datetime import datetime
from fastapi import APIRouter, Depends

from app.models.user import User
from app.core.deps import require_role
from app.services.cloudinary_monitor import check_cloudinary_usage, get_usage_summary
from app.services.email_service import send_usage_alert
from app.models.alert_log import AlertLog

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/cloudinary/usage")
async def cloudinary_usage(
    current_user: User = Depends(require_role("admin")),
):
    """Get current Cloudinary storage/bandwidth usage."""
    return await get_usage_summary()


@router.get("/cloudinary/alerts")
async def cloudinary_alerts(
    current_user: User = Depends(require_role("admin")),
):
    """Check Cloudinary usage and return any active alerts."""
    alerts = await check_cloudinary_usage()

    sent_alerts = []
    for alert in alerts:
        existing = await AlertLog.find_one(
            AlertLog.metric == alert["type"],
            AlertLog.threshold == alert["threshold"],
            AlertLog.alertDate == datetime.utcnow().date(),
        )
        if not existing:
            log = AlertLog(
                metric=alert["type"],
                threshold=alert["threshold"],
                message=alert["message"],
                severity=alert["severity"],
            )
            await log.insert()
            send_usage_alert(
                alert_type=alert["type"],
                severity=alert["severity"],
                current_pct=alert["current_pct"],
                used_value=0,
                limit_value=25,
            )
            sent_alerts.append(alert)
        else:
            alert["suppressed"] = True
            sent_alerts.append(alert)

    return {"alerts": sent_alerts, "total": len(alerts)}


@router.post("/cloudinary/check")
async def trigger_usage_check(
    current_user: User = Depends(require_role("admin")),
):
    """Manually trigger a Cloudinary usage check and send alerts if needed."""
    alerts = await check_cloudinary_usage()
    results = []

    for alert in alerts:
        existing = await AlertLog.find_one(
            AlertLog.metric == alert["type"],
            AlertLog.threshold == alert["threshold"],
            AlertLog.alertDate == datetime.utcnow().date(),
        )
        if not existing:
            log = AlertLog(
                metric=alert["type"],
                threshold=alert["threshold"],
                message=alert["message"],
                severity=alert["severity"],
            )
            await log.insert()
            send_usage_alert(
                alert_type=alert["type"],
                severity=alert["severity"],
                current_pct=alert["current_pct"],
                used_value=0,
                limit_value=25,
            )
            results.append({"alert": alert, "sent": True})
        else:
            results.append({"alert": alert, "sent": False, "reason": "already_sent_today"})

    return {"checked_at": datetime.utcnow().isoformat(), "results": results}

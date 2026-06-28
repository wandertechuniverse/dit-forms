from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from app.models.user import User
from app.models.payment import Payment
from app.models.audit_log import AuditLog
from app.core.deps import require_role, require_scope
from app.services.analytics_service import (
    get_collection_rate,
    get_form_completion_rate,
    get_group_health,
    get_dashboard_summary,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/collection-rate")
async def collection_rate(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_collection_rate(programClassId, termId)


@router.get("/form-completion")
async def form_completion(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_form_completion_rate(programClassId, termId)


@router.get("/group-health")
async def group_health(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_group_health(programClassId, termId)


@router.get("/dashboard")
async def dashboard_summary(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_dashboard_summary(programClassId, termId)


@router.get("/my-performance")
async def get_my_performance(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    since = datetime.utcnow() - timedelta(days=days)

    payments = await Payment.find({
        "receivedByUserId": str(current_user.id),
        "paidAt": {"$gte": since},
    }).to_list()

    errors = await AuditLog.find({
        "user_id": str(current_user.id),
        "action": "RECORD_PAYMENT",
        "success": False,
        "timestamp": {"$gte": since},
    }).count()

    total = len(payments)
    if total == 0:
        return {"periodDays": days, "metrics": None, "benchmarks": None}

    error_rate = (errors / (total + errors) * 100) if (total + errors) > 0 else 0

    sorted_payments = sorted(payments, key=lambda x: x.paidAt)
    intervals = []
    for i in range(1, len(sorted_payments)):
        delta = (sorted_payments[i].paidAt - sorted_payments[i - 1].paidAt).total_seconds()
        if delta < 3600:
            intervals.append(delta)
    avg_interval = sum(intervals) / len(intervals) if intervals else None

    daily_counts: dict[str, int] = {}
    for p in payments:
        day_key = p.paidAt.strftime("%Y-%m-%d")
        daily_counts[day_key] = daily_counts.get(day_key, 0) + 1

    daily_values = list(daily_counts.values())
    mean_daily = sum(daily_values) / len(daily_values) if daily_values else 0
    variance = sum((x - mean_daily) ** 2 for x in daily_values) / len(daily_values) if daily_values else 0
    consistency = max(0, 100 - (variance ** 0.5 * 5))

    return {
        "periodDays": days,
        "metrics": {
            "totalRecorded": total,
            "errorRate": round(error_rate, 1),
            "avgIntervalSec": round(avg_interval, 1) if avg_interval else None,
            "consistencyScore": round(consistency, 1),
            "activeDays": len(daily_values),
            "dailyAverage": round(mean_daily, 1),
            "paymentsPerHour": round(3600 / avg_interval, 1) if avg_interval else None,
        },
        "benchmarks": {
            "targetErrorRate": 5.0,
            "targetPaymentsPerHour": 15,
            "targetConsistency": 80,
        },
    }

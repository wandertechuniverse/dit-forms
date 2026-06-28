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


@router.post("/rep-recognition/check")
async def check_rep_recognition(
    current_user: User = Depends(require_role("admin")),
):
    since = datetime.utcnow() - timedelta(days=7)
    reps = await User.find({"role": "class_rep", "status": "active"}).to_list()
    recognized = []

    for rep in reps:
        payments = await Payment.find({
            "receivedByUserId": str(rep.id),
            "paidAt": {"$gte": since},
        }).to_list()

        errors = await AuditLog.find({
            "user_id": str(rep.id),
            "action": "RECORD_PAYMENT",
            "success": False,
            "timestamp": {"$gte": since},
        }).count()

        total = len(payments)
        error_rate = (errors / (total + errors) * 100) if (total + errors) > 0 else 0

        badges = []

        if total >= 50 and error_rate < 2:
            badges.append({
                "type": "accuracy_champion",
                "title": "Accuracy Champion",
                "description": f"Recorded {total} payments with only {error_rate:.1f}% error rate this week",
            })

        if total >= 100:
            badges.append({
                "type": "volume_leader",
                "title": "Volume Leader",
                "description": f"Processed {total} payments — highest volume this week",
            })

        daily_counts: dict[str, int] = {}
        for p in payments:
            day = p.paidAt.strftime("%Y-%m-%d")
            daily_counts[day] = daily_counts.get(day, 0) + 1

        active_days = len(daily_counts)
        avg_daily = sum(daily_counts.values()) / active_days if active_days > 0 else 0

        if active_days >= 5 and avg_daily >= 10:
            badges.append({
                "type": "consistency_star",
                "title": "Consistency Star",
                "description": f"Active {active_days} days with {avg_daily:.0f} payments/day average",
            })

        if badges:
            recognized.append({
                "userId": str(rep.id),
                "fullName": getattr(rep, "fullName", rep.email),
                "badges": badges,
            })

    return {
        "period": "last_7_days",
        "recognized_count": len(recognized),
        "reps": recognized,
    }


@router.get("/rep-retention")
async def get_rep_retention(
    days: int = Query(90, ge=30, le=180),
    current_user: User = Depends(require_role("admin")),
):
    since = datetime.utcnow() - timedelta(days=days)
    reps = await User.find({"role": "class_rep", "status": "active"}).to_list()
    retention_data = []

    for rep in reps:
        first_payment = await Payment.find({
            "receivedByUserId": str(rep.id),
        }).sort("paidAt").limit(1).to_list()

        account_age_hours = None
        if first_payment:
            delta = (first_payment[0].paidAt - rep.createdAt).total_seconds() / 3600
            account_age_hours = round(delta, 1)

        recent_payments = await Payment.find({
            "receivedByUserId": str(rep.id),
            "paidAt": {"$gte": datetime.utcnow() - timedelta(days=14)},
        }).count()

        risk_score = 0
        if account_age_hours and account_age_hours > 72:
            risk_score += 25
        if recent_payments == 0:
            risk_score += 25

        retention_data.append({
            "userId": str(rep.id),
            "fullName": getattr(rep, "fullName", rep.email),
            "firstPaymentLatencyHours": account_age_hours,
            "recentPaymentsLast14d": recent_payments,
            "retentionRiskScore": min(100, risk_score),
            "riskLevel": "critical" if risk_score >= 70 else "warning" if risk_score >= 40 else "healthy",
        })

    retention_data.sort(key=lambda x: x["retentionRiskScore"], reverse=True)

    return {
        "periodDays": days,
        "totalReps": len(reps),
        "atRiskCount": sum(1 for r in retention_data if r["riskLevel"] in ("critical", "warning")),
        "reps": retention_data,
    }

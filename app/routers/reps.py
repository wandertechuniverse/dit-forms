from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import require_role
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/reps", tags=["rep-performance"])


@router.get("/{rep_id}/scorecard")
async def get_rep_scorecard(
    rep_id: str,
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(require_role("admin")),
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {
            "user_id": rep_id,
            "action": "RECORD_PAYMENT",
            "timestamp": {"$gte": cutoff},
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "successful": {"$sum": {"$cond": ["$success", 1, 0]}},
            "failed": {"$sum": {"$cond": ["$success", 0, 1]}},
            "first_action": {"$min": "$timestamp"},
            "last_action": {"$max": "$timestamp"},
        }},
    ]
    result = await AuditLog.aggregate(pipeline).to_list()
    stats = result[0] if result else {"total": 0, "successful": 0, "failed": 0, "first_action": None, "last_action": None}

    total = stats["total"]
    success_rate = (stats["successful"] / total * 100) if total > 0 else 0

    active_hours = 1.0
    if stats["first_action"] and stats["last_action"]:
        delta = stats["last_action"] - stats["first_action"]
        active_hours = max(delta.total_seconds() / 3600, 1)

    payments_per_hour = stats["successful"] / active_hours if active_hours > 0 else 0

    error_pipeline = [
        {"$match": {"user_id": rep_id, "action": "RECORD_PAYMENT", "success": False, "timestamp": {"$gte": cutoff}}},
        {"$group": {"_id": "$error_message", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_errors = await AuditLog.aggregate(error_pipeline).to_list()

    distinct_dates = await AuditLog.distinct(
        "timestamp",
        {"user_id": rep_id, "action": "RECORD_PAYMENT", "timestamp": {"$gte": cutoff}},
    )
    active_days = len(set(d.strftime("%Y-%m-%d") for d in distinct_dates))

    return {
        "rep_id": rep_id,
        "period_days": days,
        "metrics": {
            "total_payments_recorded": total,
            "success_rate": round(success_rate, 1),
            "payments_per_hour": round(payments_per_hour, 1),
            "error_count": stats["failed"],
            "active_days": active_days,
        },
        "top_errors": [
            {"message": e["_id"] or "Unknown error", "count": e["count"]}
            for e in top_errors
        ],
        "benchmark": {
            "target_success_rate": 95.0,
            "target_payments_per_hour": 15.0,
            "max_acceptable_error_rate": 5.0,
        },
    }


@router.get("")
async def list_reps(
    current_user: User = Depends(require_role("admin")),
):
    reps = await User.find({"role": "class_rep", "status": "active"}).to_list()
    return {
        "reps": [
            {
                "id": str(r.id),
                "email": r.email,
                "fullName": getattr(r, "fullName", r.email),
                "assignedClassTerms": [
                    {"programClassId": s.programClassId, "termId": s.termId}
                    for s in r.assignedClassTerms
                ],
            }
            for r in reps
        ],
        "total": len(reps),
    }

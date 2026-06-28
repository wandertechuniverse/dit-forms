from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Literal
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.deps import require_role

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackSubmission(BaseModel):
    source: Literal["status_checker", "pdf_receipt", "rep_dashboard"]
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=300)
    context: Optional[dict] = None


@router.post("/submit")
async def submit_feedback(payload: FeedbackSubmission):
    safe_context = {}
    if payload.context:
        for k, v in payload.context.items():
            if isinstance(v, str) and len(v) > 20:
                safe_context[k] = f"[redacted_{len(v)}_chars]"
            else:
                safe_context[k] = v

    await AuditLog(
        user_id=None,
        user_role="student" if payload.source != "rep_dashboard" else "class_rep",
        action="FEEDBACK_SUBMITTED",
        resource_type="Feedback",
        metadata={
            "source": payload.source,
            "rating": payload.rating,
            "comment_length": len(payload.comment) if payload.comment else 0,
            "context_keys": list(safe_context.keys()),
        },
        success=True,
    ).insert()

    return {"status": "recorded", "message": "Thank you for your feedback!"}


@router.get("/csat-summary")
async def get_csat_summary(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(require_role("admin")),
):
    since = datetime.utcnow() - timedelta(days=days)
    feedback_logs = await AuditLog.find({
        "action": "FEEDBACK_SUBMITTED",
        "timestamp": {"$gte": since},
    }).to_list()

    summaries: dict[str, dict] = {}
    for log in feedback_logs:
        src = log.metadata.get("source", "unknown")
        if src not in summaries:
            summaries[src] = {"total": 0, "sum": 0, "comments": 0}
        summaries[src]["total"] += 1
        summaries[src]["sum"] += log.metadata.get("rating", 0)
        if log.metadata.get("comment_length", 0) > 0:
            summaries[src]["comments"] += 1

    result = {}
    for src, data in summaries.items():
        avg = data["sum"] / data["total"] if data["total"] > 0 else 0
        result[src] = {
            "avg_rating": round(avg, 2),
            "total_responses": data["total"],
            "comment_rate": round((data["comments"] / data["total"]) * 100, 1) if data["total"] > 0 else 0,
        }

    return {"period_days": days, "sources": result}

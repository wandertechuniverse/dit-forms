from fastapi import APIRouter, Depends, Query
from app.models.user import User
from app.core.deps import require_role
from app.services.notification_service import (
    find_unpaid_invoices,
    find_missing_submissions,
    find_recent_payments,
    log_notification,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/unpaid-invoices")
async def check_unpaid(
    days_overdue: int = Query(3, ge=1),
    current_user: User = Depends(require_role("admin")),
):
    invoices = await find_unpaid_invoices(days_overdue)
    sent = []
    for inv in invoices:
        if inv["student_email"]:
            result = log_notification(
                "unpaid_invoice",
                inv["student_email"],
                f"Payment Reminder: {inv['currency']} {inv['total_amount']:.2f} overdue",
                f"Dear {inv['student_name']}, your handout invoice of "
                f"{inv['currency']} {inv['total_amount']:.2f} is {inv['days_overdue']} days overdue.",
            )
            sent.append(result)
    return {"found": len(invoices), "sent": len(sent), "details": sent}


@router.get("/missing-submissions")
async def check_missing(
    current_user: User = Depends(require_role("admin")),
):
    missing = await find_missing_submissions()
    sent = []
    for m in missing:
        if m["student_email"]:
            result = log_notification(
                "missing_submission",
                m["student_email"],
                f"Reminder: Please submit '{m['form_name']}'",
                f"Dear {m['student_name']}, please complete the form '{m['form_name']}' soon.",
            )
            sent.append(result)
    return {"found": len(missing), "sent": len(sent), "details": sent[:20]}


@router.get("/recent-payments")
async def recent_payments(
    hours: int = Query(1, ge=1, le=168),
    current_user: User = Depends(require_role("admin")),
):
    payments = await find_recent_payments(hours)
    sent = []
    for p in payments:
        result = log_notification(
            "payment_received",
            p["student_email"] or "admin",
            f"Payment Received: {p['currency']} {p['amount']:.2f}",
            f"Payment of {p['currency']} {p['amount']:.2f} received via {p['method']}.",
        )
        sent.append(result)
    return {"found": len(payments), "sent": len(sent), "details": sent}

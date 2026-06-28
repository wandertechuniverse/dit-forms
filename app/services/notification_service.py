import logging
from datetime import datetime, timedelta
from typing import Dict, List

from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.submission import FormSubmission
from app.models.student import Student

logger = logging.getLogger("dit_forms.notifications")


async def find_unpaid_invoices(days_overdue: int = 3) -> List[Dict]:
    cutoff = datetime.utcnow() - timedelta(days=days_overdue)
    orders = await HandoutOrder.find(
        HandoutOrder.invoice.invoiceStatus == "unpaid",
        HandoutOrder.givenOutAt <= cutoff,
    ).to_list()

    results = []
    for o in orders:
        student = await Student.get(o.student.matchedStudentId) if o.student.matchedStudentId else None
        results.append({
            "order_id": str(o.id),
            "student_name": o.student.fullNameSnapshot,
            "student_email": student.email if student else None,
            "total_amount": o.invoice.totalAmount,
            "currency": o.invoice.currency,
            "days_overdue": (datetime.utcnow() - o.givenOutAt).days,
        })
    return results


async def find_missing_submissions(hours_before_deadline: int = 24) -> List[Dict]:
    from app.models.form import FormDefinition

    upcoming = await FormDefinition.find(
        FormDefinition.status == "published",
    ).to_list()

    results = []
    for form in upcoming:
        students = await Student.find(
            Student.programClassId == form.programClassId,
            Student.termId == form.termId,
        ).to_list()

        submitted_ids = set()
        submissions = await FormSubmission.find(
            FormSubmission.formDefinitionId == str(form.id),
        ).to_list()
        for s in submissions:
            if s.studentMatch and s.studentMatch.get("matchedStudentId"):
                submitted_ids.add(s.studentMatch["matchedStudentId"])

        for student in students:
            if str(student.id) not in submitted_ids:
                results.append({
                    "form_id": str(form.id),
                    "form_name": form.name,
                    "student_name": student.fullNameSnapshot,
                    "student_email": student.email,
                    "program_class_id": form.programClassId,
                    "term_id": form.termId,
                })
    return results


async def find_recent_payments(hours: int = 1) -> List[Dict]:
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    payments = await Payment.find(
        Payment.paidAt >= cutoff,
    ).to_list()

    results = []
    for p in payments:
        order = await HandoutOrder.get(p.handoutOrderId) if p.handoutOrderId else None
        results.append({
            "payment_id": str(p.id),
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "reference": p.reference,
            "student_name": order.student.fullNameSnapshot if order else "Unknown",
            "student_email": None,
            "paid_at": p.paidAt.isoformat(),
        })
    return results


def log_notification(notification_type: str, recipient: str, subject: str, body: str):
    logger.info(
        f"[NOTIFICATION] type={notification_type} to={recipient} "
        f"subject={subject} sent_at={datetime.utcnow().isoformat()}"
    )
    return {
        "type": notification_type,
        "recipient": recipient,
        "subject": subject,
        "sent_at": datetime.utcnow().isoformat(),
        "status": "sent",
    }

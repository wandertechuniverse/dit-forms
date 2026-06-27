from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
import csv
import io
from datetime import datetime
from typing import Optional

from app.models.student import Student
from app.models.form import FormDefinition
from app.models.submission import FormSubmission
from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.user import User
from app.core.deps import require_scope

router = APIRouter(tags=["export"])


def stream_to_csv(headers: list, rows: list, filename: str):
    """Helper to stream CSV response."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/students")
async def export_students(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    """Export students to CSV."""
    students = await Student.find(
        Student.programClassId == programClassId,
        Student.termId == termId,
    ).to_list()

    headers = ["ID", "Full Name", "ID Number", "Program Class", "Term", "Created At"]
    rows = [
        [
            str(s.id),
            s.fullName,
            s.idNumber,
            s.programClassId,
            s.termId,
            s.createdAt.isoformat(),
        ]
        for s in students
    ]

    return stream_to_csv(
        headers,
        rows,
        f"students_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
    )


@router.get("/export/forms")
async def export_forms(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    """Export forms to CSV."""
    forms = await FormDefinition.find(
        FormDefinition.programClassId == programClassId,
        FormDefinition.termId == termId,
    ).to_list()

    headers = ["Form ID", "Name", "Purpose", "Status", "Created At"]
    rows = [
        [
            str(f.id),
            f.name,
            f.purpose or "",
            f.status,
            f.createdAt.isoformat(),
        ]
        for f in forms
    ]

    return stream_to_csv(
        headers,
        rows,
        f"forms_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
    )


@router.get("/export/submissions")
async def export_submissions(
    programClassId: str = Query(...),
    termId: str = Query(...),
    formId: Optional[str] = Query(None),
    dateFrom: Optional[datetime] = Query(None),
    dateTo: Optional[datetime] = Query(None),
    current_user: User = Depends(require_scope),
):
    """Export submissions to CSV."""
    query = {
        "programClassId": programClassId,
        "termId": termId,
    }
    if formId:
        query["formDefinitionId"] = formId
    if dateFrom or dateTo:
        date_filter = {}
        if dateFrom:
            date_filter["$gte"] = dateFrom
        if dateTo:
            date_filter["$lte"] = dateTo
        query["submittedAt"] = date_filter

    submissions = await FormSubmission.find(query).to_list()

    headers = [
        "Submission ID",
        "Form ID",
        "Student Name",
        "Student ID Number",
        "Matched Student ID",
        "Submitted At",
        "Status",
        "Answers (JSON)",
    ]
    rows = [
        [
            str(s.id),
            s.formDefinitionId,
            s.studentMatch.fullNameSnapshot,
            s.studentMatch.idNumberSnapshot,
            s.studentMatch.matchedStudentId or "",
            s.submittedAt.isoformat(),
            s.status,
            str(s.answers),
        ]
        for s in submissions
    ]

    return stream_to_csv(
        headers,
        rows,
        f"submissions_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
    )


@router.get("/export/handout-orders")
async def export_handout_orders(
    programClassId: str = Query(...),
    termId: str = Query(...),
    invoiceStatus: Optional[str] = Query(None),
    current_user: User = Depends(require_scope),
):
    """Export handout orders to CSV."""
    query = {
        "programClassId": programClassId,
        "termId": termId,
    }
    if invoiceStatus:
        query["invoice.invoiceStatus"] = invoiceStatus

    orders = await HandoutOrder.find(query).to_list()

    headers = [
        "Order ID",
        "Student Name",
        "Student ID",
        "Given Out At",
        "Invoice Status",
        "Total Amount",
        "Lines Count",
        "Created At",
    ]
    rows = [
        [
            str(o.id),
            o.student.fullNameSnapshot,
            o.student.idNumberSnapshot,
            o.givenOutAt.isoformat(),
            o.invoice.invoiceStatus,
            o.invoice.totalAmount,
            len(o.lines),
            o.createdAt.isoformat(),
        ]
        for o in orders
    ]

    return stream_to_csv(
        headers,
        rows,
        f"handout_orders_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
    )


@router.get("/export/payments")
async def export_payments(
    programClassId: str = Query(...),
    termId: str = Query(...),
    dateFrom: Optional[datetime] = Query(None),
    dateTo: Optional[datetime] = Query(None),
    current_user: User = Depends(require_scope),
):
    """Export payments to CSV."""
    orders = await HandoutOrder.find({
        "programClassId": programClassId,
        "termId": termId,
    }).to_list()
    order_ids = [str(o.id) for o in orders]

    if not order_ids:
        return stream_to_csv(
            ["Order ID", "Amount", "Method", "Reference", "Paid At", "Received By"],
            [],
            f"payments_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
        )

    query = {"handoutOrderId": {"$in": order_ids}}
    if dateFrom or dateTo:
        date_filter = {}
        if dateFrom:
            date_filter["$gte"] = dateFrom
        if dateTo:
            date_filter["$lte"] = dateTo
        query["paidAt"] = date_filter

    payments = await Payment.find(query).to_list()

    headers = [
        "Payment ID",
        "Order ID",
        "Amount",
        "Currency",
        "Method",
        "Reference",
        "Paid At",
        "Received By User ID",
    ]
    rows = [
        [
            str(p.id),
            p.handoutOrderId,
            p.amount,
            p.currency or "",
            p.method,
            p.reference or "",
            p.paidAt.isoformat(),
            p.receivedByUserId or "",
        ]
        for p in payments
    ]

    return stream_to_csv(
        headers,
        rows,
        f"payments_{programClassId}_{termId}_{datetime.now().strftime('%Y%m%d')}.csv",
    )
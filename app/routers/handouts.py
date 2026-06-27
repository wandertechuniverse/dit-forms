import csv
import io
from typing import List, Optional
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from beanie import PydanticObjectId
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

EUR = "\u20AC"

from app.models.handout import HandoutOrder
from app.models.student import Student
from app.models.user import User
from app.schemas.handout import HandoutOrderResponse, HandoutOrderListResponse
from app.core.deps import require_role, require_scope
from app.services.handout_service import find_duplicate_handouts

router = APIRouter(prefix="/handout-orders", tags=["handouts"])


def _order_to_response(order: HandoutOrder) -> HandoutOrderResponse:
    return HandoutOrderResponse(
        id=str(order.id),
        formSubmissionId=order.formSubmissionId,
        programClassId=order.programClassId,
        termId=order.termId,
        student=order.student.model_dump(),
        givenOutAt=order.givenOutAt,
        invoice=order.invoice.model_dump(),
        invoiceNumber=getattr(order, "invoiceNumber", None),
        lines=[line.model_dump() for line in order.lines],
        createdAt=order.createdAt,
    )


@router.get("", response_model=HandoutOrderListResponse)
async def list_handout_orders(
    programClassId: str = Query(...),
    termId: str = Query(...),
    studentId: Optional[str] = Query(None),
    invoiceStatus: Optional[str] = Query(None, pattern="^(unpaid|paid|partially_paid)$"),
    group: Optional[str] = Query(None),
    current_user: User = Depends(require_scope),
):
    query: dict = {
        "programClassId": programClassId,
        "termId": termId,
    }
    if studentId:
        query["student.matchedStudentId"] = studentId
    if invoiceStatus:
        query["invoice.invoiceStatus"] = invoiceStatus

    if group:
        students = await Student.find(
            Student.programClassId == programClassId,
            Student.termId == termId,
            Student.groups == group,
        ).to_list()
        student_ids = [str(s.id) for s in students]
        if not student_ids:
            return HandoutOrderListResponse(orders=[], total=0)
        query["student.matchedStudentId"] = {"$in": student_ids}

    orders = await HandoutOrder.find(query).sort("-createdAt").to_list()
    return HandoutOrderListResponse(
        orders=[_order_to_response(o) for o in orders],
        total=len(orders),
    )


@router.get("/export/invoices")
async def export_invoices_csv(
    programClassId: str = Query(...),
    termId: str = Query(...),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_scope),
):
    query: dict = {"programClassId": programClassId, "termId": termId}
    if status:
        query["invoice.invoiceStatus"] = status

    orders = await HandoutOrder.find(query).sort("-createdAt").to_list()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Invoice Number", "Student Name", "ID Number",
        "Courses", "Total Amount", "Status", "Date Given Out"
    ])

    for o in orders:
        courses = ", ".join([f"{l.courseId}(x{l.qty})" for l in o.lines])
        writer.writerow([
            getattr(o, "invoiceNumber", str(o.id)[-8:]),
            o.student.fullNameSnapshot,
            o.student.idNumberSnapshot,
            courses,
            f"{o.invoice.totalAmount:.2f}",
            o.invoice.invoiceStatus,
            o.givenOutAt.strftime("%Y-%m-%d") if o.givenOutAt else "",
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=invoices-{termId}.csv"}
    )


@router.get("/{orderId}", response_model=HandoutOrderResponse)
async def get_handout_order(orderId: str, current_user: User = Depends(require_role("admin", "class_rep"))):
    order = await HandoutOrder.get(PydanticObjectId(orderId))
    if not order:
        raise HTTPException(status_code=404, detail="Handout order not found")

    if current_user.role == "class_rep":
        has_access = any(
            s.programClassId == order.programClassId and s.termId == order.termId
            for s in current_user.assignedClassTerms
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    return _order_to_response(order)


@router.get("/{orderId}/pdf")
async def generate_invoice_pdf(orderId: str, current_user: User = Depends(require_role("admin", "class_rep"))):
    order = await HandoutOrder.get(PydanticObjectId(orderId))
    if not order:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == "class_rep":
        has_access = any(
            s.programClassId == order.programClassId and s.termId == order.termId
            for s in current_user.assignedClassTerms
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    inv_num = getattr(order, "invoiceNumber", None) or str(order.id)[-8:].upper()

    c.setFont("Helvetica-Bold", 18)
    c.drawString(30 * mm, height - 30 * mm, "INVOICE")

    c.setFont("Helvetica", 10)
    c.drawString(30 * mm, height - 38 * mm, f"Invoice #: {inv_num}")
    c.drawString(30 * mm, height - 44 * mm, f"Date: {order.givenOutAt.strftime('%d %b %Y') if order.givenOutAt else 'N/A'}")
    c.drawString(30 * mm, height - 50 * mm, f"Student: {order.student.fullNameSnapshot}")
    c.drawString(30 * mm, height - 56 * mm, f"ID Number: {order.student.idNumberSnapshot}")

    c.setFont("Helvetica-Bold", 9)
    y = height - 68 * mm
    c.drawString(30 * mm, y, "Course")
    c.drawString(80 * mm, y, "Item")
    c.drawString(130 * mm, y, "Qty")
    c.drawString(150 * mm, y, "Unit Price")
    c.drawString(175 * mm, y, "Total")
    c.line(30 * mm, y - 2 * mm, 185 * mm, y - 2 * mm)

    c.setFont("Helvetica", 9)
    y -= 8 * mm
    for line in order.lines:
        c.drawString(30 * mm, y, line.courseId)
        c.drawString(80 * mm, y, line.handoutItemId)
        c.drawString(130 * mm, y, str(line.qty))
        c.drawString(150 * mm, y, f"GH{EUR}{line.unitPrice:.2f}")
        c.drawString(175 * mm, y, f"GH{EUR}{line.lineTotal:.2f}")
        y -= 6 * mm

    y -= 4 * mm
    c.line(30 * mm, y, 185 * mm, y)
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(150 * mm, y, "TOTAL:")
    c.drawString(175 * mm, y, f"GH{EUR}{order.invoice.totalAmount:.2f}")

    y -= 10 * mm
    c.setFont("Helvetica", 9)
    status = order.invoice.invoiceStatus.upper()
    c.drawString(150 * mm, y, f"Status: {status}")

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{inv_num}.pdf"}
    )


@router.post("/check-duplicates")
async def check_duplicates_preview(
    programClassId: str = Query(...),
    termId: str = Query(...),
    studentId: Optional[str] = Query(None),
    idNumber: Optional[str] = Query(None),
    courseIds: List[str] = Query(..., description="Course IDs to check"),
    current_user: User = Depends(require_scope),
):
    if not studentId and not idNumber:
        raise HTTPException(
            status_code=400,
            detail="Either studentId or idNumber is required",
        )

    lines_to_check = [
        {"courseId": cid, "handoutItemId": "", "qty": 1, "unitPrice": 0}
        for cid in courseIds
    ]

    duplicates = await find_duplicate_handouts(
        programClassId=programClassId,
        termId=termId,
        student_id=studentId,
        id_number_snapshot=idNumber or "",
        lines=lines_to_check,
    )

    return {
        "studentId": studentId,
        "idNumber": idNumber,
        "programClassId": programClassId,
        "termId": termId,
        "checkedCourses": courseIds,
        "duplicates": [
            {
                "courseId": d.courseId,
                "handoutItemId": d.handoutItemId,
                "existingOrderId": d.existingOrderId,
            }
            for d in duplicates
        ],
        "hasDuplicates": len(duplicates) > 0,
    }


class MarkPaidRequest(BaseModel):
    amount: float = Field(ge=0)
    paymentMethod: str = "cash"
    transactionId: Optional[str] = None


@router.post("/{orderId}/mark-paid")
async def mark_order_paid(
    orderId: str,
    request: MarkPaidRequest,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    order = await HandoutOrder.get(PydanticObjectId(orderId))
    if not order:
        raise HTTPException(status_code=404, detail="Handout order not found")

    order.invoice.invoiceStatus = "paid"
    order.invoice.currency = "GHS"
    await order.save()

    return _order_to_response(order)

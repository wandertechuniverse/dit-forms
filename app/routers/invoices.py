from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import require_role
from app.models.user import User
from app.models.student import Student
from app.models.handout import HandoutOrder
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("/bulk-generate")
async def bulk_generate_invoices(
    programClassId: str = Query(...),
    termId: str = Query(...),
    amountPerStudent: float = Query(..., gt=0),
    description: str = Query(default="Term Handout Fee"),
    current_user: User = Depends(require_role("admin")),
):
    idempotency_key = f"bulk-{programClassId}-{termId}-{datetime.utcnow().strftime('%Y%m%d')}"

    existing = await AuditLog.find_one({
        "user_id": str(current_user.id),
        "action": "BULK_INVOICE_GENERATE",
        "metadata.idempotency_key": idempotency_key,
    })
    if existing:
        raise HTTPException(409, "Invoices already generated for this class/term today.")

    existing_orders = await HandoutOrder.find({
        "programClassId": programClassId,
        "termId": termId,
    }).to_list()
    existing_student_ids = {o.student.idNumberSnapshot for o in existing_orders if o.student.idNumberSnapshot}

    eligible = await Student.find({
        "programClassId": programClassId,
        "termId": termId,
        "idNumber": {"$nin": list(existing_student_ids)},
    }).to_list()

    if not eligible:
        return {"generated": 0, "message": "All students already have invoices for this term."}

    generated_count = 0
    errors = []

    for student in eligible:
        try:
            order = HandoutOrder(
                formSubmissionId=f"bulk-{student.idNumber}-{termId}",
                programClassId=programClassId,
                termId=termId,
                student={
                    "matchedStudentId": str(student.id),
                    "fullNameSnapshot": student.fullName,
                    "idNumberSnapshot": student.idNumber,
                },
                givenOutAt=datetime.utcnow(),
                invoice={
                    "invoiceStatus": "unpaid",
                    "currency": "GHS",
                    "totalAmount": amountPerStudent,
                },
                invoiceNumber=f"INV-{termId.upper()}-{generated_count + 1:04d}",
                lines=[{
                    "courseId": "general",
                    "handoutItemId": "term_fee",
                    "qty": 1,
                    "unitPrice": amountPerStudent,
                    "lineTotal": amountPerStudent,
                }],
            )
            await order.insert()
            generated_count += 1
        except Exception as e:
            errors.append({"studentId": student.idNumber, "error": str(e)})

    await AuditLog(
        user_id=str(current_user.id),
        user_role=current_user.role,
        action="BULK_INVOICE_GENERATE",
        resource_type="HandoutOrder",
        metadata={
            "idempotency_key": idempotency_key,
            "program_class_id": programClassId,
            "term_id": termId,
            "amount_per_student": amountPerStudent,
            "generated_count": generated_count,
            "error_count": len(errors),
        },
        success=len(errors) == 0,
    ).insert()

    return {
        "generated": generated_count,
        "totalEligible": len(eligible),
        "errors": errors[:20],
        "idempotencyKey": idempotency_key,
    }

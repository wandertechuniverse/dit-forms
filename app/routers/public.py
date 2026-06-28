import re
from fastapi import APIRouter, Query, HTTPException
from app.models.student import Student
from app.models.handout import HandoutOrder
from app.models.payment import Payment

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/status")
async def get_student_status(idNumber: str = Query(..., min_length=3, max_length=20)):
    clean_id = idNumber.strip().upper()
    if not re.match(r'^[A-Z0-9]+$', clean_id):
        raise HTTPException(400, "Invalid ID format. Use letters and numbers only.")

    student = await Student.find_one({"idNumber": clean_id})
    if not student:
        return {"found": False, "message": "No records found. Please verify your student ID."}

    orders = await HandoutOrder.find(
        {"student.idNumberSnapshot": clean_id}
    ).to_list()
    payments = await Payment.find().to_list()

    order_ids = {str(o.id) for o in orders}
    student_payments = [p for p in payments if p.handoutOrderId in order_ids]

    total_invoiced = sum(o.invoice.totalAmount for o in orders)
    total_paid = sum(p.amount for p in student_payments)
    pending = max(0, total_invoiced - total_paid)

    latest_receipt = None
    if student_payments:
        latest = max(student_payments, key=lambda p: p.paidAt)
        latest_receipt = f"/public/receipt/{latest.id}"

    return {
        "found": True,
        "studentName": student.fullName,
        "programClass": student.programClassId,
        "term": student.termId,
        "invoiceCount": len(orders),
        "totalInvoiced": total_invoiced,
        "totalPaid": total_paid,
        "pendingBalance": pending,
        "paymentCount": len(student_payments),
        "latestReceiptUrl": latest_receipt,
        "lastUpdated": max(
            [p.paidAt for p in student_payments] + [o.createdAt for o in orders],
            default=None,
        ),
    }

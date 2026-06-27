from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId

from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.student import Student
from app.schemas.payment import CreatePaymentRequest, StudentBalanceResponse


class PaymentValidationError(Exception):
    pass


async def _recompute_invoice_status(order: HandoutOrder) -> str:
    payments = await Payment.find(
        Payment.handoutOrderId == str(order.id)
    ).to_list()
    total_paid = sum(p.amount for p in payments)

    if total_paid >= order.invoice.totalAmount and order.invoice.totalAmount > 0:
        new_status = "paid"
    elif total_paid > 0:
        new_status = "partially_paid"
    else:
        new_status = "unpaid"

    order.invoice.invoiceStatus = new_status
    await order.save()
    return new_status


async def create_payment(
    request: CreatePaymentRequest,
    received_by_user_id: Optional[str] = None,
) -> Payment:
    order = await HandoutOrder.get(PydanticObjectId(request.handoutOrderId))
    if not order:
        raise PaymentValidationError("Handout order not found")

    existing_payments = await Payment.find(
        Payment.handoutOrderId == request.handoutOrderId
    ).to_list()
    total_paid = sum(p.amount for p in existing_payments)
    if total_paid + request.amount > order.invoice.totalAmount:
        remaining = order.invoice.totalAmount - total_paid
        raise PaymentValidationError(
            f"Payment would exceed remaining balance. "
            f"Remaining: {remaining:.2f}, attempted: {request.amount:.2f}"
        )

    payment = Payment(
        handoutOrderId=request.handoutOrderId,
        amount=request.amount,
        currency=request.currency or order.invoice.currency,
        method=request.method,
        reference=request.reference,
        paidAt=request.paidAt or datetime.utcnow(),
        receivedByUserId=received_by_user_id,
    )
    await payment.insert()

    await _recompute_invoice_status(order)

    return payment


async def get_student_balance(
    student_id: Optional[str],
    id_number: Optional[str],
    program_class_id: str,
    term_id: str,
) -> StudentBalanceResponse:
    if not student_id and not id_number:
        raise PaymentValidationError("Either studentId or idNumber is required")

    query: dict = {
        "programClassId": program_class_id,
        "termId": term_id,
    }
    if student_id:
        query["student.matchedStudentId"] = student_id
    else:
        query["student.idNumberSnapshot"] = id_number

    orders = await HandoutOrder.find(query).to_list()

    if not orders:
        student_info = None
        if student_id:
            student_info = await Student.get(PydanticObjectId(student_id))
        elif id_number:
            student_info = await Student.find_one(
                Student.programClassId == program_class_id,
                Student.termId == term_id,
                Student.idNumber == id_number,
            )

        return StudentBalanceResponse(
            studentId=student_id,
            idNumberSnapshot=id_number or (student_info.idNumber if student_info else None),
            fullNameSnapshot=student_info.fullName if student_info else None,
            programClassId=program_class_id,
            termId=term_id,
            totalOwed=0.0,
            totalPaid=0.0,
            balance=0.0,
            ordersCount=0,
        )

    total_owed = sum(o.invoice.totalAmount for o in orders)
    order_ids = [str(o.id) for o in orders]

    payments = await Payment.find(
        {"handoutOrderId": {"$in": order_ids}}
    ).to_list()
    total_paid = sum(p.amount for p in payments)

    first_order = orders[0]

    return StudentBalanceResponse(
        studentId=student_id or first_order.student.matchedStudentId,
        idNumberSnapshot=first_order.student.idNumberSnapshot,
        fullNameSnapshot=first_order.student.fullNameSnapshot,
        programClassId=program_class_id,
        termId=term_id,
        totalOwed=round(total_owed, 2),
        totalPaid=round(total_paid, 2),
        balance=round(total_owed - total_paid, 2),
        ordersCount=len(orders),
    )

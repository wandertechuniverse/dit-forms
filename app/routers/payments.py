from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from beanie import PydanticObjectId

from app.models.payment import Payment
from app.models.handout import HandoutOrder
from app.models.student import Student
from app.models.user import User
from app.schemas.payment import (
    CreatePaymentRequest,
    PaymentResponse,
    PaymentListResponse,
    StudentBalanceResponse,
)
from app.services.payment_service import (
    create_payment,
    get_student_balance,
    PaymentValidationError,
)
from app.core.deps import require_role, require_scope
from app.models.audit_log import AuditLog

router = APIRouter(tags=["payments"])


def _check_order_scope(order: HandoutOrder, user: User) -> None:
    if user.role == "admin":
        return
    for scope in user.assignedClassTerms:
        if (
            scope.programClassId == order.programClassId
            and scope.termId == order.termId
        ):
            return
    raise HTTPException(status_code=403, detail="Access denied to this order's scope")


@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def record_payment(
    request: CreatePaymentRequest,
    current_user: User = Depends(require_role("admin")),
):
    try:
        payment = await create_payment(
            request, received_by_user_id=str(current_user.id)
        )
        return payment
    except PaymentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payments", response_model=PaymentListResponse)
async def list_payments(
    programClassId: str = Query(...),
    termId: str = Query(...),
    handoutOrderId: Optional[str] = Query(None),
    studentId: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    group: Optional[str] = Query(None),
    dateFrom: Optional[datetime] = Query(None),
    dateTo: Optional[datetime] = Query(None),
    current_user: User = Depends(require_scope),
):
    order_query: dict = {
        "programClassId": programClassId,
        "termId": termId,
    }
    if studentId:
        order_query["student.matchedStudentId"] = studentId

    if group:
        group_students = await Student.find(
            Student.programClassId == programClassId,
            Student.termId == termId,
            Student.groups == group,
        ).to_list()
        student_ids = [str(s.id) for s in group_students]
        if not student_ids:
            return PaymentListResponse(payments=[], total=0, totalAmount=0.0)
        order_query["student.matchedStudentId"] = {"$in": student_ids}

    orders = await HandoutOrder.find(order_query).to_list()
    order_ids = [str(o.id) for o in orders]

    if not order_ids:
        return PaymentListResponse(payments=[], total=0, totalAmount=0.0)

    payment_query: dict = {"handoutOrderId": {"$in": order_ids}}
    if handoutOrderId:
        if handoutOrderId not in order_ids:
            raise HTTPException(status_code=403, detail="Order not in scope")
        payment_query["handoutOrderId"] = handoutOrderId
    if method:
        payment_query["method"] = method
    if dateFrom or dateTo:
        date_filter: dict = {}
        if dateFrom:
            date_filter["$gte"] = dateFrom
        if dateTo:
            date_filter["$lte"] = dateTo
        payment_query["paidAt"] = date_filter

    payments = await Payment.find(payment_query).sort("-paidAt").to_list()
    total_amount = sum(p.amount for p in payments)

    return PaymentListResponse(
        payments=[
            PaymentResponse(
                id=str(p.id),
                handoutOrderId=p.handoutOrderId,
                amount=p.amount,
                currency=p.currency,
                method=p.method,
                reference=p.reference,
                paidAt=p.paidAt,
                receivedByUserId=p.receivedByUserId,
            )
            for p in payments
        ],
        total=len(payments),
        totalAmount=round(total_amount, 2),
    )


@router.get(
    "/students/{studentId}/balance",
    response_model=StudentBalanceResponse,
)
async def get_balance(
    studentId: str,
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    try:
        return await get_student_balance(
            student_id=studentId,
            id_number=None,
            program_class_id=programClassId,
            term_id=termId,
        )
    except PaymentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/record")
async def quick_record_payment(
    invoiceNumber: str = Query(...),
    amount: float = Query(..., gt=0),
    reference: str = Query(..., min_length=1, max_length=100),
    method: str = Query(default="cash"),
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    order = await HandoutOrder.find_one({"invoiceNumber": invoiceNumber})
    if not order:
        raise HTTPException(404, f"Invoice {invoiceNumber} not found")
    if order.invoice.invoiceStatus == "paid":
        raise HTTPException(400, f"Invoice {invoiceNumber} is already fully paid")

    paid_so_far = sum(
        p.amount for p in await Payment.find(Payment.handoutOrderId == str(order.id)).to_list()
    )
    remaining = order.invoice.totalAmount - paid_so_far
    if amount > remaining + 0.01:
        raise HTTPException(400, f"Amount {amount} exceeds remaining balance {remaining:.2f}")

    _check_order_scope(order, current_user)

    payment = Payment(
        handoutOrderId=str(order.id),
        amount=amount,
        currency=order.invoice.currency,
        method=method,
        reference=reference,
        receivedByUserId=str(current_user.id),
    )
    await payment.insert()

    new_status = await _recompute_invoice_status(order)

    await AuditLog(
        user_id=str(current_user.id),
        user_role=current_user.role,
        action="RECORD_PAYMENT",
        resource_type="Payment",
        resource_id=str(payment.id),
        metadata={
            "invoice_number": invoiceNumber,
            "amount": amount,
            "reference": reference,
            "method": method,
            "student_id": order.student.idNumberSnapshot,
        },
        success=True,
    ).insert()

    return {
        "paymentId": str(payment.id),
        "invoiceNumber": invoiceNumber,
        "amount": amount,
        "status": "recorded",
        "invoiceStatus": new_status,
    }


@router.get(
    "/handout-orders/{orderId}/payments",
    response_model=PaymentListResponse,
)
async def list_order_payments(
    orderId: str,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    order = await HandoutOrder.get(PydanticObjectId(orderId))
    if not order:
        raise HTTPException(status_code=404, detail="Handout order not found")

    _check_order_scope(order, current_user)

    payments = await Payment.find(
        Payment.handoutOrderId == orderId
    ).sort("-paidAt").to_list()

    total_amount = sum(p.amount for p in payments)

    return PaymentListResponse(
        payments=[
            PaymentResponse(
                id=str(p.id),
                handoutOrderId=p.handoutOrderId,
                amount=p.amount,
                currency=p.currency,
                method=p.method,
                reference=p.reference,
                paidAt=p.paidAt,
                receivedByUserId=p.receivedByUserId,
            )
            for p in payments
        ],
        total=len(payments),
        totalAmount=round(total_amount, 2),
    )

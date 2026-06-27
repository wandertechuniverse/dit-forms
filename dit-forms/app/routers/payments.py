from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from beanie import PydanticObjectId

from app.models.payment import Payment
from app.models.handout import HandoutOrder
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

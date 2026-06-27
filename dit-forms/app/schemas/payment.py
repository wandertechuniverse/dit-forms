from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class CreatePaymentRequest(BaseModel):
    handoutOrderId: str
    amount: float = Field(gt=0)
    currency: Optional[str] = None
    method: str = Field(default="cash", pattern="^(cash|bank|mobile|other)$")
    reference: Optional[str] = None
    paidAt: Optional[datetime] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    handoutOrderId: str
    amount: float
    currency: Optional[str] = None
    method: str
    reference: Optional[str] = None
    paidAt: datetime
    receivedByUserId: Optional[str] = None

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int
    totalAmount: float


class StudentBalanceResponse(BaseModel):
    studentId: Optional[str] = None
    idNumberSnapshot: Optional[str] = None
    fullNameSnapshot: Optional[str] = None
    programClassId: str
    termId: str
    totalOwed: float
    totalPaid: float
    balance: float
    ordersCount: int

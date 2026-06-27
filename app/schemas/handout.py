from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class HandoutLineRequest(BaseModel):
    courseId: str
    handoutItemId: str
    qty: int = Field(gt=0)
    unitPrice: float = Field(ge=0)


class HandoutOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    formSubmissionId: str
    programClassId: str
    termId: str
    student: dict
    givenOutAt: datetime
    invoice: dict
    invoiceNumber: Optional[str] = None
    lines: List[dict]
    createdAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class HandoutOrderListResponse(BaseModel):
    orders: List[HandoutOrderResponse]
    total: int

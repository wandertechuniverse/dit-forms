from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class Payment(Document):
    handoutOrderId: Indexed(str)
    amount: float
    currency: Optional[str] = None
    method: str = Field(default="cash", pattern="^(cash|bank|mobile|other)$")
    reference: Optional[str] = None
    paidAt: datetime = Field(default_factory=datetime.utcnow)
    receivedByUserId: Optional[str] = None

    class Settings:
        name = "payments"
        indexes = [
            [("handoutOrderId", 1)],
            [("paidAt", -1)],
        ]

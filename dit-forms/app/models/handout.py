from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class HandoutLine(BaseModel):
    courseId: str
    handoutItemId: str
    qty: int
    unitPrice: float
    lineTotal: float


class InvoiceInfo(BaseModel):
    invoiceStatus: str = Field(default="unpaid", pattern="^(unpaid|paid|partially_paid)$")
    currency: Optional[str] = None
    totalAmount: float = 0.0


class StudentSnapshot(BaseModel):
    matchedStudentId: Optional[str] = None
    fullNameSnapshot: str
    idNumberSnapshot: str


class HandoutOrder(Document):
    formSubmissionId: Indexed(str, unique=True)
    programClassId: str
    termId: str
    student: StudentSnapshot
    givenOutAt: datetime
    invoice: InvoiceInfo
    invoiceNumber: Optional[str] = None
    lines: List[HandoutLine] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "handout_orders"
        indexes = [
            [("programClassId", 1), ("termId", 1)],
            [("student.matchedStudentId", 1), ("termId", 1)],
            # Helps enforce "one handout per course per student per term"
            [("student.matchedStudentId", 1), ("termId", 1), ("lines.courseId", 1)],
        ]

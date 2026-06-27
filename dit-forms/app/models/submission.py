from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class StudentMatch(BaseModel):
    matchedStudentId: Optional[str] = None
    idNumberSnapshot: str
    fullNameSnapshot: str


class FormSubmission(Document):
    formVersionId: Indexed(str)
    formDefinitionId: Indexed(str)
    programClassId: str
    termId: str
    submittedAt: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="submitted", pattern="^(submitted|processing|closed)$")
    studentMatch: StudentMatch
    answers: Dict[str, Any] = Field(default_factory=dict)

    class Settings:
        name = "form_submissions"
        indexes = [
            [("programClassId", 1), ("termId", 1)],
            [("formDefinitionId", 1), ("submittedAt", -1)],
            [("studentMatch.matchedStudentId", 1)],
        ]

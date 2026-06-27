from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer


# --- Request Schemas ---

class PublicSubmitRequest(BaseModel):
    fullName: str
    idNumber: str
    answers: Dict[str, Any]


# --- Response Schemas ---

class StudentMatchResponse(BaseModel):
    matchedStudentId: Optional[str] = None
    idNumberSnapshot: str
    fullNameSnapshot: str


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    formVersionId: str
    formDefinitionId: str
    programClassId: str
    termId: str
    submittedAt: datetime
    status: str
    studentMatch: StudentMatchResponse
    answers: Dict[str, Any]

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class SubmissionListResponse(BaseModel):
    submissions: List[SubmissionResponse]
    total: int


class PublicSubmitResponse(BaseModel):
    submissionId: str
    message: str = "Submission received successfully"

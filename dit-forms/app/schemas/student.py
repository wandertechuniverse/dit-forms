from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_serializer


class StudentCreate(BaseModel):
    programClassId: str
    termId: str
    fullName: str
    idNumber: str


class StudentUpdate(BaseModel):
    fullName: Optional[str] = None
    idNumber: Optional[str] = None
    programClassId: Optional[str] = None
    termId: Optional[str] = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    programClassId: str
    termId: str
    fullName: str
    idNumber: str
    createdAt: datetime
    updatedAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class StudentListResponse(BaseModel):
    students: List[StudentResponse]
    total: int


class ImportResult(BaseModel):
    total_rows: int
    created: int
    skipped_duplicates: int
    errors: List[str]

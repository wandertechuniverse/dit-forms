from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class CreateGroupRequest(BaseModel):
    name: str
    programClassId: str
    termId: str
    description: Optional[str] = None
    color: str = Field(default="#6366f1")


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    name: str
    programClassId: str
    termId: str
    description: Optional[str] = None
    color: str
    studentCount: int = 0
    createdAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class GroupListResponse(BaseModel):
    groups: List[GroupResponse]
    total: int

from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class ClassTermScope(BaseModel):
    programClassId: str
    termId: str


class User(Document):
    email: Indexed(str, unique=True)
    passwordHash: str
    role: str = Field(pattern="^(admin|class_rep|student|auditor)$")
    assignedClassTerms: List[ClassTermScope] = Field(default_factory=list)
    status: str = Field(default="active", pattern="^(active|disabled)$")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

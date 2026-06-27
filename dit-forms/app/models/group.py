from datetime import datetime
from typing import Optional
from pymongo import ASCENDING, IndexModel
from beanie import Document
from pydantic import Field


class StudentGroup(Document):
    name: str
    programClassId: str
    termId: str
    description: Optional[str] = None
    color: str = Field(default="#6366f1")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "student_groups"
        indexes = [
            IndexModel(
                [("programClassId", ASCENDING), ("termId", ASCENDING), ("name", ASCENDING)],
                name="programClassId_1_termId_1_name_1",
                unique=True,
            ),
            IndexModel(
                [("programClassId", ASCENDING), ("termId", ASCENDING)],
                name="programClassId_1_termId_1",
            ),
        ]

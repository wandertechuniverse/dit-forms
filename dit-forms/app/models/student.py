from datetime import datetime
from typing import List, Optional
from pymongo import ASCENDING, IndexModel
from beanie import Document, Indexed
from pydantic import Field


class Student(Document):
    programClassId: str
    termId: str
    fullName: str
    idNumber: str
    groups: List[str] = Field(default_factory=list)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "students"
        indexes = [
            IndexModel(
                [("programClassId", ASCENDING), ("termId", ASCENDING), ("idNumber", ASCENDING)],
                name="programClassId_1_termId_1_idNumber_1",
                unique=True,
            ),
            IndexModel(
                [("programClassId", ASCENDING), ("termId", ASCENDING)],
                name="programClassId_1_termId_1",
            ),
            IndexModel(
                [("idNumber", ASCENDING)],
                name="idNumber_1",
            ),
            IndexModel(
                [("groups", ASCENDING)],
                name="groups_1",
            ),
        ]

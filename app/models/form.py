from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import Document, Indexed
from pydantic import Field


class FormDefinition(Document):
    name: str
    programClassId: str
    termId: str
    purpose: Optional[str] = None
    courseId: Optional[str] = None
    formType: str = Field(default="general", pattern="^(general|handout_tracker)$")
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "form_definitions"
        indexes = [[("programClassId", 1), ("termId", 1)]]


class FormVersion(Document):
    formDefinitionId: Indexed(str)
    versionNumber: int
    schema: Dict[str, Any]
    status: str = Field(default="draft", pattern="^(draft|published|archived)$")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "form_versions"
        indexes = [
            [("formDefinitionId", 1), ("versionNumber", -1)],
            [("formDefinitionId", 1), ("status", 1)],
        ]

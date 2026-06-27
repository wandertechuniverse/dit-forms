from datetime import datetime
from beanie import Document, Indexed
from pydantic import Field


class SubmissionFile(Document):
    submissionId: Indexed(str)
    fieldKey: str
    programClassId: str
    termId: str
    fileName: str
    contentType: str
    sizeBytes: int
    r2Key: str
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "submission_files"
        indexes = [
            [("submissionId", 1)],
            [("programClassId", 1), ("termId", 1)],
        ]

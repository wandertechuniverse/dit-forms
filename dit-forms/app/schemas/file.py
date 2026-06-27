from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class PresignUploadRequest(BaseModel):
    fieldKey: str
    fileName: str
    contentType: str
    sizeBytes: int = Field(gt=0, le=50 * 1024 * 1024)


class PresignUploadResponse(BaseModel):
    fileId: str
    uploadUrl: str
    r2Key: str
    expiresIn: int


class FileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Any
    submissionId: str
    fieldKey: str
    programClassId: str
    termId: str
    fileName: str
    contentType: str
    sizeBytes: int
    r2Key: str
    uploadedAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class DownloadResponse(BaseModel):
    downloadUrl: str
    fileName: str
    expiresIn: int

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_serializer


class FieldOption(BaseModel):
    label: str
    value: str


class FieldSchema(BaseModel):
    id: Optional[str] = None
    key: str
    label: str
    type: str = Field(pattern="^(text|number|textarea|select|date|file|handout_array)$")
    required: bool = False
    options: Optional[List[FieldOption]] = None
    accept: Optional[str] = None
    maxFiles: Optional[int] = Field(default=1, ge=1)
    placeholder: Optional[str] = None
    helpText: Optional[str] = None


class FormSchema(BaseModel):
    fields: List[FieldSchema]


class CreateFormRequest(BaseModel):
    name: str
    programClassId: str
    termId: str
    purpose: Optional[str] = None
    courseId: Optional[str] = None
    formType: str = Field(default="general", pattern="^(general|handout_tracker)$")
    initialSchema: Optional[FormSchema] = None


class CreateFormVersionRequest(BaseModel):
    schema: FormSchema
    status: str = Field(default="draft", pattern="^(draft|published)$")


class UpdateFormDefinitionRequest(BaseModel):
    name: Optional[str] = None
    purpose: Optional[str] = None
    courseId: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|published|archived)$")


class UpdateFormVersionRequest(BaseModel):
    schema: Optional[FormSchema] = None
    status: Optional[str] = Field(None, pattern="^(draft|archived)$")


class FormDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Any
    name: str
    programClassId: str
    termId: str
    purpose: Optional[str] = None
    courseId: Optional[str] = None
    formType: str
    status: str
    createdAt: datetime
    updatedAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class FormVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Any
    formDefinitionId: str
    versionNumber: int
    schema: Dict[str, Any]
    status: str
    createdAt: datetime
    updatedAt: datetime

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)


class FormDetailResponse(FormDefinitionResponse):
    versions: List[FormVersionResponse] = []
    draftVersionId: Optional[str] = None
    publishedVersionId: Optional[str] = None


class PublicFormResponse(BaseModel):
    id: Any
    name: str
    programClassId: str
    termId: str
    purpose: Optional[str] = None
    courseId: Optional[str] = None
    formType: str
    versionNumber: int
    schema: Dict[str, Any]

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)

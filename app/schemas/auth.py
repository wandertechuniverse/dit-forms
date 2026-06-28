from pydantic import BaseModel, EmailStr, ConfigDict, field_serializer
from typing import List
from app.models.user import ClassTermScope


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StudentLoginRequest(BaseModel):
    idNumber: str
    dateOfBirth: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: str
    assignedClassTerms: List[ClassTermScope]
    status: str

    @field_serializer("id")
    def serialize_id(self, value):
        return str(value)

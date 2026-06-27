from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from app.models.user import ClassTermScope


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    assignedClassTerms: Optional[List[ClassTermScope]] = []


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    assignedClassTerms: Optional[List[ClassTermScope]] = None
    status: Optional[str] = None


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    email: str
    role: str
    assignedClassTerms: List[ClassTermScope]
    status: str
    createdAt: datetime
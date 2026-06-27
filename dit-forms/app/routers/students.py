from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from beanie import PydanticObjectId

from app.models.student import Student
from app.models.user import User
from app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentListResponse,
    ImportResult,
)
from app.services.student_service import import_students_from_excel
from app.core.deps import require_role, require_scope

router = APIRouter(prefix="/students", tags=["students"])


@router.post("/import", response_model=ImportResult, status_code=status.HTTP_200_OK)
async def import_students(
    file: UploadFile = File(...),
    programClassId: Optional[str] = Form(None),
    termId: Optional[str] = Form(None),
    current_user: User = Depends(require_role("admin")),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx and .xls files are supported.")

    content = await file.read()

    try:
        result = await import_students_from_excel(
            file_content=content,
            default_program_class_id=programClassId,
            default_term_id=termId,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("", response_model=StudentListResponse)
async def list_students(
    programClassId: str = Query(...),
    termId: str = Query(...),
    q: Optional[str] = Query(None, description="Search by name or ID number"),
    current_user: User = Depends(require_scope),
):
    query: dict = {
        "programClassId": programClassId,
        "termId": termId,
    }

    if q:
        query["$or"] = [
            {"fullName": {"$regex": q, "$options": "i"}},
            {"idNumber": {"$regex": q, "$options": "i"}},
        ]

    students = await Student.find(query).to_list()

    return StudentListResponse(
        students=[
            StudentResponse(
                id=str(s.id),
                programClassId=s.programClassId,
                termId=s.termId,
                fullName=s.fullName,
                idNumber=s.idNumber,
                createdAt=s.createdAt,
                updatedAt=s.updatedAt,
            )
            for s in students
        ],
        total=len(students),
    )


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    request: StudentCreate,
    current_user: User = Depends(require_role("admin")),
):
    try:
        student = Student(**request.model_dump())
        await student.insert()
        return student
    except Exception as e:
        if "DuplicateKey" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Student with this ID already exists in this class/term.",
            )
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{studentId}", response_model=StudentResponse)
async def update_student(
    studentId: str,
    request: StudentUpdate,
    current_user: User = Depends(require_role("admin")),
):
    student = await Student.get(PydanticObjectId(studentId))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(student, key, value)

    try:
        await student.save()
        return student
    except Exception as e:
        if "DuplicateKey" in str(e):
            raise HTTPException(
                status_code=409,
                detail="Update conflicts with an existing student ID.",
            )
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import RedirectResponse

from app.models.student import Student
from app.models.user import User
from app.core.deps import require_role, require_scope
from app.services import upload_service

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/students/{studentId}/upload-ic")
async def upload_student_ic(
    studentId: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    """Upload a student's IC card image with auto-optimization."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPG, PNG, or PDF files are allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, f"File too large. Max {MAX_SIZE // 1024 // 1024}MB")

    student = await Student.get(studentId)
    if not student:
        raise HTTPException(404, "Student not found")

    # RBAC: Class Reps can only upload for students in their scope
    if current_user.role == "class_rep":
        if student.programClassId != current_user.scope.programClassId:
            raise HTTPException(403, "Access denied")

    result = await upload_service.upload_student_ic(contents, file.filename, studentId)

    student.icDocumentUrl = result["url"]
    student.icPublicId = result["public_id"]
    await student.save()

    return {"fileUrl": result["url"], "publicId": result["public_id"]}


@router.get("/students/{studentId}/ic-download")
async def download_student_ic(
    studentId: str,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    """Get a signed download URL for a student's IC document."""
    student = await Student.get(studentId)
    if not student or not student.icPublicId:
        raise HTTPException(404, "No IC document found")

    # RBAC: Class Reps can only download students in their scope
    if current_user.role == "class_rep":
        if student.programClassId != current_user.scope.programClassId:
            raise HTTPException(403, "Access denied")

    signed_url = upload_service.generate_signed_download_url(student.icPublicId)
    return RedirectResponse(url=signed_url)


@router.delete("/students/{studentId}/ic")
async def delete_student_ic(
    studentId: str,
    current_user: User = Depends(require_role("admin")),
):
    """Remove a student's IC document from Cloudinary."""
    student = await Student.get(studentId)
    if not student:
        raise HTTPException(404, "Student not found")

    if not student.icPublicId:
        raise HTTPException(404, "No IC document to delete")

    try:
        import cloudinary.uploader

        cloudinary.uploader.destroy(student.icPublicId)
    except Exception:
        pass  # Log but don't fail if delete fails

    student.icDocumentUrl = None
    student.icPublicId = None
    await student.save()

    return {"detail": "IC document deleted"}

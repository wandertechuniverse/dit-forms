from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from app.models.file import SubmissionFile
from app.models.submission import FormSubmission
from app.models.user import User
from app.schemas.file import (
    PresignUploadRequest,
    PresignUploadResponse,
    FileResponse,
    DownloadResponse,
)
from app.services.r2_service import (
    build_r2_key,
    generate_presigned_upload,
    generate_presigned_download,
)
from app.core.deps import get_current_user
from app.config import get_settings

router = APIRouter(tags=["files"])


def _check_submission_scope(submission: FormSubmission, user: User) -> None:
    if user.role == "admin":
        return
    for scope in user.assignedClassTerms:
        if (
            scope.programClassId == submission.programClassId
            and scope.termId == submission.termId
        ):
            return
    raise HTTPException(status_code=403, detail="Access denied to this submission's scope")


@router.post(
    "/submissions/{submissionId}/files/presign",
    response_model=PresignUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def presign_upload(submissionId: str, request: PresignUploadRequest):
    submission = await FormSubmission.get(PydanticObjectId(submissionId))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    r2_key = build_r2_key(submissionId, request.fieldKey, request.fileName)

    file_doc = SubmissionFile(
        submissionId=submissionId,
        fieldKey=request.fieldKey,
        programClassId=submission.programClassId,
        termId=submission.termId,
        fileName=request.fileName,
        contentType=request.contentType,
        sizeBytes=request.sizeBytes,
        r2Key=r2_key,
    )
    await file_doc.insert()

    presign = generate_presigned_upload(r2_key=r2_key, content_type=request.contentType)

    current_answers = submission.answers or {}
    field_files = current_answers.get(request.fieldKey) or []
    if not isinstance(field_files, list):
        field_files = [field_files] if field_files else []
    field_files.append(str(file_doc.id))
    current_answers[request.fieldKey] = field_files
    submission.answers = current_answers
    await submission.save()

    return PresignUploadResponse(
        fileId=str(file_doc.id),
        uploadUrl=presign["uploadUrl"],
        r2Key=presign["r2Key"],
        expiresIn=presign["expiresIn"],
    )


@router.get("/files/{fileId}/download", response_model=DownloadResponse)
async def download_file(fileId: str, current_user: User = Depends(get_current_user)):
    file_doc = await SubmissionFile.get(PydanticObjectId(fileId))
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    submission = await FormSubmission.get(PydanticObjectId(file_doc.submissionId))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    _check_submission_scope(submission, current_user)

    settings = get_settings()
    download_url = generate_presigned_download(
        r2_key=file_doc.r2Key,
        filename=file_doc.fileName,
    )

    return DownloadResponse(
        downloadUrl=download_url,
        fileName=file_doc.fileName,
        expiresIn=settings.R2_PRESIGN_EXPIRES,
    )


@router.get("/submissions/{submissionId}/files", response_model=list[FileResponse])
async def list_submission_files(submissionId: str, current_user: User = Depends(get_current_user)):
    submission = await FormSubmission.get(PydanticObjectId(submissionId))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    _check_submission_scope(submission, current_user)

    files = await SubmissionFile.find(SubmissionFile.submissionId == submissionId).to_list()
    return files

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from app.models.submission import FormSubmission
from app.models.user import User
from app.schemas.submission import (
    PublicSubmitRequest,
    PublicSubmitResponse,
    SubmissionResponse,
    SubmissionListResponse,
    StudentMatchResponse,
)
from app.services.submission_service import create_public_submission
from app.core.deps import require_role, require_scope

router = APIRouter(tags=["submissions"])


@router.post(
    "/public/forms/{formId}/submit",
    response_model=PublicSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def public_submit_form(formId: str, request: PublicSubmitRequest):
    try:
        submission = await create_public_submission(formId, request)
        return PublicSubmitResponse(
            submissionId=str(submission.id),
            message="Submission received successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")


@router.get("/submissions", response_model=SubmissionListResponse)
async def list_submissions(
    programClassId: str = Query(...),
    termId: str = Query(...),
    formId: Optional[str] = Query(None),
    studentId: Optional[str] = Query(None),
    dateFrom: Optional[datetime] = Query(None),
    dateTo: Optional[datetime] = Query(None),
    current_user: User = Depends(require_scope),
):
    query: dict = {
        "programClassId": programClassId,
        "termId": termId,
    }

    if formId:
        query["formDefinitionId"] = formId

    if studentId:
        query["studentMatch.matchedStudentId"] = studentId

    if dateFrom or dateTo:
        date_query: dict = {}
        if dateFrom:
            date_query["$gte"] = dateFrom
        if dateTo:
            date_query["$lte"] = dateTo
        query["submittedAt"] = date_query

    submissions = await FormSubmission.find(query).sort("-submittedAt").to_list()

    submission_responses = [
        SubmissionResponse(
            id=str(s.id),
            formVersionId=s.formVersionId,
            formDefinitionId=s.formDefinitionId,
            programClassId=s.programClassId,
            termId=s.termId,
            submittedAt=s.submittedAt,
            status=s.status,
            studentMatch=StudentMatchResponse(
                matchedStudentId=s.studentMatch.matchedStudentId,
                idNumberSnapshot=s.studentMatch.idNumberSnapshot,
                fullNameSnapshot=s.studentMatch.fullNameSnapshot,
            ),
            answers=s.answers,
        )
        for s in submissions
    ]

    return SubmissionListResponse(
        submissions=submission_responses,
        total=len(submission_responses),
    )


@router.get("/submissions/{submissionId}", response_model=SubmissionResponse)
async def get_submission_detail(
    submissionId: str,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    submission = await FormSubmission.get(PydanticObjectId(submissionId))
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if current_user.role == "class_rep":
        has_access = any(
            scope.programClassId == submission.programClassId
            and scope.termId == submission.termId
            for scope in current_user.assignedClassTerms
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    return SubmissionResponse(
        id=str(submission.id),
        formVersionId=submission.formVersionId,
        formDefinitionId=submission.formDefinitionId,
        programClassId=submission.programClassId,
        termId=submission.termId,
        submittedAt=submission.submittedAt,
        status=submission.status,
        studentMatch=StudentMatchResponse(
            matchedStudentId=submission.studentMatch.matchedStudentId,
            idNumberSnapshot=submission.studentMatch.idNumberSnapshot,
            fullNameSnapshot=submission.studentMatch.fullNameSnapshot,
        ),
        answers=submission.answers,
    )

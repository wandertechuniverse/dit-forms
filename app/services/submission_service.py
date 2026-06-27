from typing import Any, Dict, List, Optional, Tuple
from beanie import PydanticObjectId

from app.models.student import Student
from app.models.form import FormDefinition, FormVersion
from app.models.submission import FormSubmission, StudentMatch
from app.schemas.submission import PublicSubmitRequest
from app.services.handout_service import (
    create_handout_order_from_submission,
    HandoutValidationError,
)


async def resolve_student(
    programClassId: str,
    termId: str,
    idNumber: str,
    fullName: str,
) -> Tuple[Optional[str], str, str]:
    student = await Student.find_one(
        Student.programClassId == programClassId,
        Student.termId == termId,
        Student.idNumber == idNumber,
    )

    if student:
        return str(student.id), idNumber, student.fullName
    else:
        return None, idNumber, fullName


async def get_active_form_version(formId: str) -> Optional[FormVersion]:
    return await FormVersion.find_one(
        FormVersion.formDefinitionId == formId,
        FormVersion.status == "published",
    )


def _transform_answers_for_handout(
    answers: Dict[str, Any],
    fields: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Transform form-field-based answers into the format the handout service expects."""
    transformed = dict(answers)

    # Find the handout_array field and date field to build handout service keys
    handout_field_id = None
    date_field_id = None
    for f in fields:
        if f.get("type") == "handout_array":
            handout_field_id = f.get("id")
        elif f.get("type") == "date" and date_field_id is None:
            date_field_id = f.get("id")

    # Build givenOutAt from the date field
    if date_field_id and date_field_id in transformed:
        transformed["givenOutAt"] = transformed.pop(date_field_id)

    # Build handouts array from the handout_array field
    if handout_field_id and handout_field_id in transformed:
        raw_lines = transformed.pop(handout_field_id, [])
        handouts = []
        for line in raw_lines:
            if isinstance(line, dict):
                handouts.append({
                    "courseId": line.get("courseId", line.get("item", "")),
                    "handoutItemId": line.get("handoutItemId", line.get("item", "")),
                    "qty": line.get("qty", 1),
                    "unitPrice": line.get("unitPrice", line.get("unitCost", 0)),
                })
        transformed["handouts"] = handouts

    return transformed


async def create_public_submission(
    formId: str,
    request: PublicSubmitRequest,
) -> FormSubmission:
    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def or form_def.status != "published":
        raise ValueError("Form not found or inactive")

    active_version = await get_active_form_version(formId)
    if not active_version:
        raise ValueError("No active form version found")

    # Duplicate submission check
    existing = await FormSubmission.find_one(
        FormSubmission.formDefinitionId == formId,
        FormSubmission.studentMatch.idNumberSnapshot == request.idNumber,
    )
    if existing:
        raise ValueError(
            f"Student {request.idNumber} has already submitted this form"
        )

    matchedStudentId, idNumberSnapshot, fullNameSnapshot = await resolve_student(
        programClassId=form_def.programClassId,
        termId=form_def.termId,
        idNumber=request.idNumber,
        fullName=request.fullName,
    )

    # Transform answers for handout service if this is a handout form
    handout_answers = request.answers
    if form_def.formType == "handout_tracker":
        fields = []
        if active_version.schema and "fields" in active_version.schema:
            fields = active_version.schema["fields"]
        handout_answers = _transform_answers_for_handout(request.answers, fields)

    submission = FormSubmission(
        formVersionId=str(active_version.id),
        formDefinitionId=formId,
        programClassId=form_def.programClassId,
        termId=form_def.termId,
        status="submitted",
        studentMatch=StudentMatch(
            matchedStudentId=matchedStudentId,
            idNumberSnapshot=idNumberSnapshot,
            fullNameSnapshot=fullNameSnapshot,
        ),
        answers=handout_answers,
    )
    await submission.insert()

    # Auto-invoice for HandOuts Tracker forms
    if form_def.formType == "handout_tracker":
        try:
            await create_handout_order_from_submission(submission)
        except HandoutValidationError as e:
            await submission.delete()
            raise ValueError(str(e))

    return submission

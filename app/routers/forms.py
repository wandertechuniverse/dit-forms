from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from beanie import PydanticObjectId

from app.models.form import FormDefinition, FormVersion
from app.models.user import User
from app.schemas.form import (
    CreateFormRequest,
    CreateFormVersionRequest,
    UpdateFormDefinitionRequest,
    UpdateFormVersionRequest,
    FormDefinitionResponse,
    FormVersionResponse,
    FormDetailResponse,
    PublicFormResponse,
)
from app.schemas.form_validation import validate_form_schema
from app.core.deps import require_role, require_scope

router = APIRouter(tags=["forms"])


def _serialize_def(d: FormDefinition) -> dict:
    return {
        "id": str(d.id), "name": d.name, "programClassId": d.programClassId,
        "termId": d.termId, "purpose": d.purpose, "courseId": d.courseId,
        "formType": d.formType, "status": d.status,
        "createdAt": d.createdAt, "updatedAt": d.updatedAt,
    }


def _serialize_version(v: FormVersion) -> dict:
    return {
        "id": str(v.id), "formDefinitionId": v.formDefinitionId,
        "versionNumber": v.versionNumber, "schema": v.schema,
        "status": v.status, "createdAt": v.createdAt, "updatedAt": v.updatedAt,
    }


@router.post("/forms", response_model=FormDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_form(
    request: CreateFormRequest,
    current_user: User = Depends(require_role("admin")),
):
    form_def = FormDefinition(
        name=request.name, programClassId=request.programClassId,
        termId=request.termId, purpose=request.purpose,
        courseId=request.courseId, formType=request.formType,
        status="draft",
    )
    await form_def.insert()

    if request.initialSchema:
        version = FormVersion(
            formDefinitionId=str(form_def.id),
            versionNumber=1,
            schema=request.initialSchema.model_dump(),
            status="draft",
        )
        await version.insert()

    return _serialize_def(form_def)


@router.get("/forms", response_model=List[FormDefinitionResponse])
async def list_forms(
    programClassId: str = Query(...),
    termId: str = Query(...),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(draft|published|archived)$"),
    current_user: User = Depends(require_scope),
):
    query = {"programClassId": programClassId, "termId": termId}
    if status_filter:
        query["status"] = status_filter
    forms = await FormDefinition.find(query).to_list()
    return [_serialize_def(f) for f in forms]


@router.get("/forms/{formId}", response_model=FormDetailResponse)
async def get_form_detail(
    formId: str,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def:
        raise HTTPException(status_code=404, detail="Form not found")

    if current_user.role == "class_rep":
        has_access = any(
            s.programClassId == form_def.programClassId and s.termId == form_def.termId
            for s in current_user.assignedClassTerms
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    versions = await FormVersion.find({"formDefinitionId": formId}).sort("-versionNumber").to_list()

    draft_v = next((v for v in versions if v.status == "draft"), None)
    published_v = next((v for v in versions if v.status == "published"), None)

    return {
        **_serialize_def(form_def),
        "versions": [_serialize_version(v) for v in versions],
        "draftVersionId": str(draft_v.id) if draft_v else None,
        "publishedVersionId": str(published_v.id) if published_v else None,
    }


@router.patch("/forms/{formId}", response_model=FormDefinitionResponse)
async def update_form_definition(
    formId: str,
    request: UpdateFormDefinitionRequest,
    current_user: User = Depends(require_role("admin")),
):
    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def:
        raise HTTPException(status_code=404, detail="Form not found")

    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(form_def, key, value)
    form_def.updatedAt = datetime.utcnow()
    await form_def.save()
    return _serialize_def(form_def)


@router.post("/forms/{formId}/versions", response_model=FormVersionResponse, status_code=201)
async def create_form_version(
    formId: str,
    request: CreateFormVersionRequest,
    current_user: User = Depends(require_role("admin")),
):
    # SERVER-SIDE VALIDATION PARITY (matches frontend form-validator.js)
    try:
        validate_form_schema(request.schema.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def:
        raise HTTPException(status_code=404, detail="Form not found")

    latest = await FormVersion.find_one(
        {"formDefinitionId": formId}, sort=[("versionNumber", -1)]
    )
    new_version_number = (latest.versionNumber + 1) if latest else 1

    if request.status == "published":
        await FormVersion.find(
            {"formDefinitionId": formId, "status": "published"}
        ).update({"$set": {"status": "archived"}})
        form_def.status = "published"
        await form_def.save()

    new_version = FormVersion(
        formDefinitionId=formId,
        versionNumber=new_version_number,
        schema=request.schema.model_dump(),
        status=request.status,
    )
    await new_version.insert()
    return _serialize_version(new_version)


@router.patch("/forms/{formId}/versions/{versionId}", response_model=FormVersionResponse)
async def update_form_version(
    formId: str,
    versionId: str,
    request: UpdateFormVersionRequest,
    current_user: User = Depends(require_role("admin")),
):
    version = await FormVersion.get(PydanticObjectId(versionId))
    if not version or version.formDefinitionId != formId:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only edit draft versions")

    if request.schema is not None:
        version.schema = request.schema.model_dump()
    if request.status is not None:
        version.status = request.status

    version.updatedAt = datetime.utcnow()
    await version.save()
    return _serialize_version(version)


@router.post("/forms/{formId}/versions/{versionId}/publish", response_model=FormVersionResponse)
async def publish_version(
    formId: str,
    versionId: str,
    current_user: User = Depends(require_role("admin")),
):
    version = await FormVersion.get(PydanticObjectId(versionId))
    if not version or version.formDefinitionId != formId:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Only drafts can be published")

    # RE-VALIDATE BEFORE PUBLISHING (CRITICAL: server-side parity check)
    try:
        validate_form_schema(version.schema)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Cannot publish invalid schema: {str(e)}")

    await FormVersion.find(
        {"formDefinitionId": formId, "status": "published"}
    ).update({"$set": {"status": "archived"}})

    version.status = "published"
    version.updatedAt = datetime.utcnow()
    await version.save()

    form_def = await FormDefinition.get(PydanticObjectId(formId))
    form_def.status = "published"
    form_def.updatedAt = datetime.utcnow()
    await form_def.save()

    return _serialize_version(version)


@router.delete("/forms/{formId}/versions/{versionId}", status_code=204)
async def delete_draft_version(
    formId: str,
    versionId: str,
    current_user: User = Depends(require_role("admin")),
):
    version = await FormVersion.get(PydanticObjectId(versionId))
    if not version or version.formDefinitionId != formId:
        raise HTTPException(status_code=404, detail="Version not found")
    if version.status != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft versions")
    await version.delete()


@router.delete("/forms/{formId}", status_code=204)
async def delete_form(
    formId: str,
    current_user: User = Depends(require_role("admin")),
):
    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def:
        raise HTTPException(status_code=404, detail="Form not found")
    form_def.status = "archived"
    form_def.updatedAt = datetime.utcnow()
    await form_def.save()


@router.get("/public/forms/{formId}", response_model=PublicFormResponse)
async def get_public_form(formId: str):
    form_def = await FormDefinition.get(PydanticObjectId(formId))
    if not form_def or form_def.status not in ("published", "active"):
        raise HTTPException(status_code=404, detail="Form not found or not published")

    published_version = await FormVersion.find_one(
        {"formDefinitionId": formId, "status": "published"}
    )
    if not published_version:
        fallback = await FormVersion.find_one(
            {"formDefinitionId": formId, "isActive": True}
        )
        if not fallback:
            raise HTTPException(status_code=404, detail="No published version")
        published_version = fallback

    return {
        "id": str(form_def.id), "name": form_def.name,
        "programClassId": form_def.programClassId, "termId": form_def.termId,
        "purpose": form_def.purpose, "courseId": form_def.courseId,
        "formType": form_def.formType,
        "versionNumber": published_version.versionNumber,
        "schema": published_version.schema,
    }

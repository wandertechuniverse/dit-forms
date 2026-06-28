from fastapi import APIRouter, Depends, Query
from app.models.user import User
from app.core.deps import require_role, require_scope
from app.services.analytics_service import (
    get_collection_rate,
    get_form_completion_rate,
    get_group_health,
    get_dashboard_summary,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/collection-rate")
async def collection_rate(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_collection_rate(programClassId, termId)


@router.get("/form-completion")
async def form_completion(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_form_completion_rate(programClassId, termId)


@router.get("/group-health")
async def group_health(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_group_health(programClassId, termId)


@router.get("/dashboard")
async def dashboard_summary(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_scope),
):
    return await get_dashboard_summary(programClassId, termId)

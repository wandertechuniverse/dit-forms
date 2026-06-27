from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from beanie import PydanticObjectId

from app.models.group import StudentGroup
from app.models.student import Student
from app.models.user import User
from app.schemas.group import (
    CreateGroupRequest, UpdateGroupRequest,
    GroupResponse, GroupListResponse,
)
from app.core.deps import require_role

router = APIRouter(prefix="/groups", tags=["groups"])


async def _group_with_count(group: StudentGroup) -> GroupResponse:
    count = await Student.find(
        Student.programClassId == group.programClassId,
        Student.termId == group.termId,
        Student.groups == group.name,
    ).count()
    return GroupResponse(
        id=str(group.id),
        name=group.name,
        programClassId=group.programClassId,
        termId=group.termId,
        description=group.description,
        color=group.color,
        studentCount=count,
        createdAt=group.createdAt,
    )


@router.get("", response_model=GroupListResponse)
async def list_groups(
    programClassId: str = Query(...),
    termId: str = Query(...),
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    groups = await StudentGroup.find(
        StudentGroup.programClassId == programClassId,
        StudentGroup.termId == termId,
    ).sort("name").to_list()
    return GroupListResponse(
        groups=[await _group_with_count(g) for g in groups],
        total=len(groups),
    )


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    request: CreateGroupRequest,
    current_user: User = Depends(require_role("admin")),
):
    existing = await StudentGroup.find_one(
        StudentGroup.name == request.name,
        StudentGroup.programClassId == request.programClassId,
        StudentGroup.termId == request.termId,
    )
    if existing:
        raise HTTPException(status_code=400, detail="Group with this name already exists")

    group = StudentGroup(**request.model_dump())
    await group.insert()
    return await _group_with_count(group)


@router.get("/{groupId}", response_model=GroupResponse)
async def get_group(
    groupId: str,
    current_user: User = Depends(require_role("admin", "class_rep")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return await _group_with_count(group)


@router.patch("/{groupId}", response_model=GroupResponse)
async def update_group(
    groupId: str,
    request: UpdateGroupRequest,
    current_user: User = Depends(require_role("admin")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)
    group.updatedAt = datetime.utcnow()
    await group.save()
    return await _group_with_count(group)


@router.delete("/{groupId}", status_code=204)
async def delete_group(
    groupId: str,
    current_user: User = Depends(require_role("admin")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    students = await Student.find(
        Student.programClassId == group.programClassId,
        Student.termId == group.termId,
        Student.groups == group.name,
    ).to_list()
    for student in students:
        student.groups = [g for g in student.groups if g != group.name]
        await student.save()

    await group.delete()


@router.post("/{groupId}/students/{studentId}")
async def add_student_to_group(
    groupId: str,
    studentId: str,
    current_user: User = Depends(require_role("admin")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    student = await Student.get(PydanticObjectId(studentId))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if group.name not in student.groups:
        student.groups.append(group.name)
        await student.save()

    return {"status": "added"}


@router.delete("/{groupId}/students/{studentId}")
async def remove_student_from_group(
    groupId: str,
    studentId: str,
    current_user: User = Depends(require_role("admin")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    student = await Student.get(PydanticObjectId(studentId))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.groups = [g for g in student.groups if g != group.name]
    await student.save()

    return {"status": "removed"}


@router.post("/{groupId}/assign-bulk")
async def bulk_assign_students(
    groupId: str,
    student_ids: List[str],
    current_user: User = Depends(require_role("admin")),
):
    group = await StudentGroup.get(PydanticObjectId(groupId))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    count = 0
    for sid in student_ids:
        student = await Student.get(PydanticObjectId(sid))
        if student and group.name not in student.groups:
            student.groups.append(group.name)
            await student.save()
            count += 1

    return {"assigned": count}

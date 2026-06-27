from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from beanie import PydanticObjectId

from app.models.user import User, ClassTermScope
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.core.security import hash_password
from app.core.deps import require_role

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=List[UserResponse])
async def list_all_users(current_user: User = Depends(require_role("admin"))):
    """List all users (admin only)."""
    return await User.find_all().to_list()


@router.post("/class-rep", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_class_rep(
    request: UserCreate,
    current_user: User = Depends(require_role("admin")),
):
    """Create a new class representative."""
    existing = await User.find_one(User.email == request.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=request.email,
        passwordHash=hash_password(request.password),
        role="class_rep",
        assignedClassTerms=request.assignedClassTerms or [],
        status="active",
    )
    await user.insert()
    return user


@router.patch("/{userId}", response_model=UserResponse)
async def update_user(
    userId: str,
    request: UserUpdate,
    current_user: User = Depends(require_role("admin")),
):
    """Update user (admin only)."""
    user = await User.get(PydanticObjectId(userId))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = request.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["passwordHash"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    await user.save()
    return user


@router.post("/{userId}/scopes", response_model=UserResponse)
async def add_user_scope(
    userId: str,
    scope: ClassTermScope,
    current_user: User = Depends(require_role("admin")),
):
    """Add a scope to a class rep's assigned terms."""
    user = await User.get(PydanticObjectId(userId))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "class_rep":
        raise HTTPException(status_code=400, detail="User is not a class rep")

    for existing_scope in user.assignedClassTerms:
        if (existing_scope.programClassId == scope.programClassId and
            existing_scope.termId == scope.termId):
            raise HTTPException(status_code=409, detail="Scope already assigned")

    user.assignedClassTerms.append(scope)
    await user.save()
    return user
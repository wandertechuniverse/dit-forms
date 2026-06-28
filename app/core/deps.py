from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from beanie import PydanticObjectId

from app.models.user import User
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.get(PydanticObjectId(user_id))
    if user is None or user.status != "active":
        raise credentials_exception
    return user


def require_role(*allowed_roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker


async def require_scope(
    programClassId: str = Query(..., description="Program Class ID"),
    termId: str = Query(..., description="Term ID"),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in ("admin", "auditor"):
        return current_user

    for scope in current_user.assignedClassTerms:
        if scope.programClassId == programClassId and scope.termId == termId:
            return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this class/term scope",
    )


def require_read_only():
    """Auditors get read-only access; admins/class_reps get full access."""
    async def checker(current_user: User = Depends(get_current_user)):
        if current_user.role == "auditor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Auditors have read-only access",
            )
        return current_user
    return checker

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User
from app.models.student import Student
from app.schemas.auth import LoginRequest, StudentLoginRequest, TokenResponse, UserResponse
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await User.find_one(User.email == request.email)
    if not user or not verify_password(request.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        assignedClassTerms=current_user.assignedClassTerms,
        status=current_user.status,
    )


@router.post("/student-login")
async def student_login(request: StudentLoginRequest):
    student = await Student.find_one(
        Student.idNumber == request.idNumber.upper(),
    )
    if not student:
        raise HTTPException(status_code=401, detail="Invalid ID number or date of birth")

    token = create_access_token(data={"sub": str(student.id), "role": "student"})
    return {"access_token": token, "token_type": "bearer", "studentId": str(student.id)}

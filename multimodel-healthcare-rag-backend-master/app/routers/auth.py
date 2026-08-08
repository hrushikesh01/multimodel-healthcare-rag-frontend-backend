from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.models.signup_request import SignupRequest, SignupRequestStatus
from app.schemas.auth import LoginRequest, TokenResponse, RegisterRequest
from app.schemas.signup_request import RegisterResponse
from app.schemas.user import UserRead
from app.services.auth_service import create_access_token, verify_password, hash_password
from app.services.audit_service import log_action

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if user is None:
        signup_request = db.execute(
            select(SignupRequest).where(SignupRequest.email == body.email)
        ).scalar_one_or_none()
        if signup_request and verify_password(body.password, signup_request.hashed_password):
            if signup_request.status == SignupRequestStatus.pending:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your signup request is pending admin approval.",
                )
            if signup_request.status == SignupRequestStatus.rejected:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your signup request was not accepted by the admin.",
                )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    token = create_access_token(str(user.id), extra={"role": user.role.value})
    log_action(db, user_id=user.id, action="login", resource_type="session", details={"email": user.email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
):
    if body.role == UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot register as admin")
        
    existing_user = db.execute(select(User).where(User.email == body.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    existing_request = db.execute(
        select(SignupRequest).where(SignupRequest.email == body.email)
    ).scalar_one_or_none()
    if existing_request and existing_request.status == SignupRequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A signup request for this email is already pending approval.",
        )

    signup_request = existing_request or SignupRequest(email=body.email)
    signup_request.full_name = body.full_name
    signup_request.hashed_password = hash_password(body.password)
    signup_request.role = body.role
    signup_request.status = SignupRequestStatus.pending
    signup_request.reviewed_by_admin_id = None
    signup_request.review_note = None
    signup_request.reviewed_at = None
    db.add(signup_request)
    db.commit()
    db.refresh(signup_request)

    log_action(
        db,
        user_id=None,
        action="signup_request_created",
        resource_type="signup_request",
        resource_id=signup_request.id,
        details={"email": signup_request.email, "role": signup_request.role.value},
    )
    return RegisterResponse(
        message="Signup request submitted. Please wait for admin approval.",
        status=SignupRequestStatus.pending,
    )

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import hash_password
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    return list(db.execute(select(User)).scalars().all())


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if body.role == UserRole.patient and body.patient_profile_id is None:
        raise HTTPException(status_code=400, detail="patient_profile_id required for patient role")
    user = User(
        email=body.email,
        full_name=body.full_name,
        role=body.role,
        patient_profile_id=body.patient_profile_id,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(
        db,
        user_id=admin.id,
        action="user_create",
        resource_type="user",
        resource_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )
    return user

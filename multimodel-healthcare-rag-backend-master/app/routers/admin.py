from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.signup_request import SignupRequest, SignupRequestStatus
from app.models.user import User
from app.schemas.signup_request import SignupRequestAction, SignupRequestRead
from app.services.audit_service import log_action
from app.services.rbac_service import get_accessible_patient_ids

router = APIRouter()


@router.get("/stats")
def stats(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.doctor, UserRole.nurse, UserRole.patient))],
):
    accessible_ids = get_accessible_patient_ids(db, user)
    
    if accessible_ids is None:
        # Admin: see all
        users = db.execute(select(func.count()).select_from(User)).scalar_one()
        patients = db.execute(select(func.count()).select_from(Patient)).scalar_one()
        documents = db.execute(select(func.count()).select_from(Document)).scalar_one()
    else:
        # Doctor/Nurse or Patient: see only accessible
        users = 1 # Self
        patients = len(accessible_ids)
        documents = db.execute(
            select(func.count()).select_from(Document).where(Document.patient_id.in_(accessible_ids))
        ).scalar_one() if accessible_ids else 0
    
    # Active sessions: count unique users who have performed any action in the last 24h
    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    if accessible_ids is None:
        active_sessions = db.execute(
            select(func.count(AuditLog.user_id.distinct()))
            .where(AuditLog.created_at >= since_24h)
        ).scalar_one()
    else:
        # For non-admins, active sessions is just 1 (them) for demo purposes
        active_sessions = 1

    return {
        "total_users": users,
        "total_patients": patients,
        "total_documents": documents,
        "active_sessions": max(1, active_sessions), 
    }


@router.get("/trends")
def trends(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.doctor, UserRole.nurse, UserRole.patient))],
):
    accessible_ids = get_accessible_patient_ids(db, user)
    
    # Get last 7 days including today
    days = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        days.append(d)

    result = []
    for d in days:
        start = d.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        if accessible_ids is None:
            # Admin: system-wide
            new_patients = db.execute(
                select(func.count(Patient.id)).where(Patient.created_at >= start, Patient.created_at < end)
            ).scalar_one()
            
            visits = db.execute(
                select(func.count(AuditLog.id)).where(
                    AuditLog.action == "patient_view",
                    AuditLog.created_at >= start,
                    AuditLog.created_at < end
                )
            ).scalar_one()
        else:
            # Doctor/Nurse/Patient: only their accessible patient activity
            if not accessible_ids:
                new_patients = 0
                visits = 0
            else:
                new_patients = db.execute(
                    select(func.count(Patient.id)).where(
                        Patient.id.in_(accessible_ids),
                        Patient.created_at >= start,
                        Patient.created_at < end
                    )
                ).scalar_one()
                
                visits = db.execute(
                    select(func.count(AuditLog.id)).where(
                        AuditLog.action == "patient_view",
                        AuditLog.resource_id.in_(accessible_ids),
                        AuditLog.created_at >= start,
                        AuditLog.created_at < end
                    )
                ).scalar_one()
        
        result.append({
            "name": d.strftime("%a"),
            "visits": visits,
            "patients": new_patients,
        })
    
    return result


@router.get("/signup-requests", response_model=list[SignupRequestRead])
def list_signup_requests(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    rows = db.execute(
        select(SignupRequest)
        .order_by(
            (SignupRequest.status == SignupRequestStatus.pending).desc(),
            SignupRequest.created_at.desc(),
        )
    ).scalars().all()
    return list(rows)


@router.post("/signup-requests/{request_id}/approve", response_model=SignupRequestRead)
def approve_signup_request(
    request_id: int,
    body: SignupRequestAction,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    request_row = db.execute(select(SignupRequest).where(SignupRequest.id == request_id)).scalar_one_or_none()
    if request_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signup request not found")
    if request_row.status != SignupRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup request is not pending")

    existing_user = db.execute(select(User).where(User.email == request_row.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    patient_profile_id = None
    if request_row.role == UserRole.patient:
        patient = Patient(full_name=request_row.full_name)
        db.add(patient)
        db.flush()
        patient_profile_id = patient.id

    user = User(
        email=request_row.email,
        full_name=request_row.full_name,
        hashed_password=request_row.hashed_password,
        role=request_row.role,
        patient_profile_id=patient_profile_id,
    )
    db.add(user)

    request_row.status = SignupRequestStatus.approved
    request_row.reviewed_by_admin_id = admin.id
    request_row.review_note = body.review_note
    request_row.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request_row)
    db.refresh(user)

    log_action(
        db,
        user_id=admin.id,
        action="signup_request_approved",
        resource_type="signup_request",
        resource_id=request_row.id,
        details={"email": request_row.email, "role": request_row.role.value, "created_user_id": user.id},
    )
    return request_row


@router.post("/signup-requests/{request_id}/reject", response_model=SignupRequestRead)
def reject_signup_request(
    request_id: int,
    body: SignupRequestAction,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    request_row = db.execute(select(SignupRequest).where(SignupRequest.id == request_id)).scalar_one_or_none()
    if request_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signup request not found")
    if request_row.status != SignupRequestStatus.pending:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup request is not pending")

    request_row.status = SignupRequestStatus.rejected
    request_row.reviewed_by_admin_id = admin.id
    request_row.review_note = body.review_note
    request_row.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request_row)

    log_action(
        db,
        user_id=admin.id,
        action="signup_request_rejected",
        resource_type="signup_request",
        resource_id=request_row.id,
        details={"email": request_row.email, "role": request_row.role.value},
    )
    return request_row

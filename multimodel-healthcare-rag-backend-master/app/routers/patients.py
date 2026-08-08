from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models.enums import AccessLevel, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess
from app.models.user import User
from app.schemas.patient import PatientAccessCreate, PatientCreate, PatientRead, PatientUpdate
from app.services.audit_service import log_action
from app.services.consent_service import ensure_clinical_ai_granted
from app.services.rbac_service import can_access_patient, can_write_patient, get_accessible_patient_ids

router = APIRouter()


def _patient_read(db: Session, user: User, p: Patient) -> PatientRead:
    # First, try to use the creator as the assigned doctor if they are medical staff
    creator = None
    if p.created_by_user_id:
        creator = db.get(User, p.created_by_user_id)
    
    doctor_assigned = "Unassigned"
    if creator and creator.role in (UserRole.doctor, UserRole.nurse):
        doctor_assigned = creator.full_name
    else:
        # Fallback: Find the first medical professional with write access
        stmt = (
            select(User.full_name)
            .join(PatientAccess, User.id == PatientAccess.user_id)
            .where(
                PatientAccess.patient_id == p.id,
                User.role.in_([UserRole.doctor, UserRole.nurse])
            )
            .limit(1)
        )
        assigned = db.execute(stmt).scalar()
        if assigned:
            doctor_assigned = assigned
        elif creator:
            doctor_assigned = creator.full_name # Fallback to creator name if no clinicians
        else:
            doctor_assigned = "System"

    return PatientRead(
        id=p.id,
        external_id=p.external_id,
        full_name=p.full_name,
        gender=p.gender,
        dob=p.dob,
        condition=p.condition,
        notes=p.notes,
        created_by_user_id=p.created_by_user_id,
        doctor_assigned=doctor_assigned,
        created_at=p.created_at,
        can_write=can_write_patient(db, user, p.id),
    )


def _list_patients_query(db: Session, user: User) -> list[Patient]:
    ids = get_accessible_patient_ids(db, user)
    if ids is None:
        return list(db.execute(select(Patient).order_by(Patient.id.desc())).scalars().all())
    if not ids:
        return []
    return list(db.execute(select(Patient).where(Patient.id.in_(ids)).order_by(Patient.id.desc())).scalars().all())


@router.get("/", response_model=list[PatientRead])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    patients = _list_patients_query(db, user)
    return [_patient_read(db, user, p) for p in patients]


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if user.role == UserRole.nurse:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nurses must use the Assistant for clinical data access")
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this patient")
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    log_action(db, user_id=user.id, action="patient_view", resource_type="patient", resource_id=patient_id)
    return _patient_read(db, user, p)


@router.post("/", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.doctor))],
):
    p = Patient(
        external_id=body.external_id,
        full_name=body.full_name,
        notes=body.notes,
        created_by_user_id=user.id,
    )
    db.add(p)
    db.flush()
    ensure_clinical_ai_granted(db, patient_id=p.id, recorded_by_user_id=user.id)
    db.commit()
    db.refresh(p)
    if user.role == UserRole.doctor:
        db.add(PatientAccess(user_id=user.id, patient_id=p.id, access_level=AccessLevel.write))
        db.commit()
    log_action(db, user_id=user.id, action="patient_create", resource_type="patient", resource_id=p.id)
    return _patient_read(db, user, p)


@router.patch("/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: int,
    body: PatientUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.doctor))],
):
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this patient")
    if not can_write_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Write access required")
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    log_action(
        db,
        user_id=user.id,
        action="patient_update",
        resource_type="patient",
        resource_id=patient_id,
        details={"fields": list(data.keys())},
    )
    return _patient_read(db, user, p)


@router.post("/{patient_id}/access", response_model=PatientRead)
def grant_access(
    patient_id: int,
    body: PatientAccessCreate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.admin))],
):
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    existing = db.execute(
        select(PatientAccess).where(PatientAccess.user_id == body.user_id, PatientAccess.patient_id == patient_id)
    ).scalar_one_or_none()
    if existing:
        existing.access_level = body.access_level
    else:
        db.add(PatientAccess(user_id=body.user_id, patient_id=patient_id, access_level=body.access_level))
    db.commit()
    log_action(
        db,
        user_id=admin.id,
        action="patient_access_grant",
        resource_type="patient",
        resource_id=patient_id,
        details={"target_user_id": body.user_id, "access_level": body.access_level.value},
    )
    db.refresh(p)
    return _patient_read(db, admin, p)

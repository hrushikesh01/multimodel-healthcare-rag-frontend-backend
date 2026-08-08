from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import AccessLevel, UserRole
from app.models.patient_access import PatientAccess
from app.models.user import User


def get_accessible_patient_ids(db: Session, user: User) -> list[int] | None:
    """Return None if admin (all patients); otherwise explicit id list."""
    if not user.is_active:
        return []
    if user.role == UserRole.admin:
        return None
    if user.role == UserRole.patient:
        if user.patient_profile_id is None:
            return []
        return [user.patient_profile_id]
    if user.role == UserRole.nurse:
        return None  # Nurses can retrieve any patient's data via the assistant
    if user.role == UserRole.doctor:
        rows = db.execute(select(PatientAccess.patient_id).where(PatientAccess.user_id == user.id)).scalars().all()
        return list(rows)
    return []


def can_access_patient(db: Session, user: User, patient_id: int) -> bool:
    ids = get_accessible_patient_ids(db, user)
    if ids is None:
        return True
    return patient_id in ids


def can_write_patient(db: Session, user: User, patient_id: int) -> bool:
    if not user.is_active:
        return False
    if user.role == UserRole.admin:
        return True
    if user.role == UserRole.patient:
        return user.patient_profile_id == patient_id
    if user.role == UserRole.doctor:
        pa = db.execute(
            select(PatientAccess).where(
                PatientAccess.user_id == user.id,
                PatientAccess.patient_id == patient_id,
            )
        ).scalar_one_or_none()
        return pa is not None and pa.access_level == AccessLevel.write
    return False


def can_read_clinical_data(db: Session, user: User, patient_id: int) -> bool:
    """Read includes doctor/nurse with read OR write grant."""
    return can_access_patient(db, user, patient_id)

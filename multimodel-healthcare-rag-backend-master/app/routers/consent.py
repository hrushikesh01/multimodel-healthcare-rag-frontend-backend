from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.consent import ConsentRecord
from app.models.user import User
from app.schemas.consent import ConsentCreate, ConsentRead
from app.services.audit_service import log_action
from app.services.consent_service import CLINICAL_AI_PURPOSE
from app.services.rbac_service import can_access_patient, can_write_patient

router = APIRouter()


@router.get("/patient/{patient_id}", response_model=list[ConsentRead])
def list_consent(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access")
    rows = db.execute(select(ConsentRecord).where(ConsentRecord.patient_id == patient_id)).scalars().all()
    return list(rows)


@router.post("/", response_model=ConsentRead, status_code=status.HTTP_201_CREATED)
def create_consent(
    body: ConsentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_access_patient(db, user, body.patient_id):
        raise HTTPException(status_code=403, detail="No access")
    if not can_write_patient(db, user, body.patient_id):
        raise HTTPException(status_code=403, detail="Write access required to record consent")
    row = ConsentRecord(
        patient_id=body.patient_id,
        purpose=body.purpose,
        granted=body.granted,
        recorded_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_action(
        db,
        user_id=user.id,
        action="consent_record",
        resource_type="patient",
        resource_id=body.patient_id,
        details={"purpose": body.purpose, "granted": body.granted},
    )
    return row


@router.post("/ensure-clinical-ai/{patient_id}", response_model=ConsentRead)
def ensure_clinical_ai_consent(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """Convenience: grant `clinical_ai_assistant` if caller has write access (demo/admin workflows)."""
    if not can_write_patient(db, user, patient_id):
        raise HTTPException(status_code=403, detail="Write access required")
    existing = db.execute(
        select(ConsentRecord).where(
            ConsentRecord.patient_id == patient_id,
            ConsentRecord.purpose == CLINICAL_AI_PURPOSE,
        )
    ).scalar_one_or_none()
    if existing:
        existing.granted = True
        db.commit()
        db.refresh(existing)
        return existing
    row = ConsentRecord(
        patient_id=patient_id,
        purpose=CLINICAL_AI_PURPOSE,
        granted=True,
        recorded_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

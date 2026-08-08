from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.models.consent import ConsentRecord

CLINICAL_AI_PURPOSE = "clinical_ai_assistant"


def ensure_clinical_ai_granted(db: Session, *, patient_id: int, recorded_by_user_id: int) -> None:
    """Ensure one `clinical_ai_assistant` row exists and is granted (staff workflow / uploads)."""
    row = db.execute(
        select(ConsentRecord).where(
            ConsentRecord.patient_id == patient_id,
            ConsentRecord.purpose == CLINICAL_AI_PURPOSE,
        )
    ).scalar_one_or_none()
    if row:
        if not row.granted:
            row.granted = True
    else:
        db.add(
            ConsentRecord(
                patient_id=patient_id,
                purpose=CLINICAL_AI_PURPOSE,
                granted=True,
                recorded_by_user_id=recorded_by_user_id,
            )
        )


def has_consent(db: Session, patient_id: int, purpose: str) -> bool:
    row = db.execute(
        select(ConsentRecord).where(
            and_(ConsentRecord.patient_id == patient_id, ConsentRecord.purpose == purpose, ConsentRecord.granted.is_(True))
        )
    ).scalar_one_or_none()
    return row is not None

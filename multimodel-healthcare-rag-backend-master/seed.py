"""
Populate Neon/Postgres with demo users, patients, access grants, and clinical AI consent.

Run from `backend/` after `DATABASE_URL` is set in `.env`:

    python seed.py

- If `patients` is **empty**, inserts all 5 demo patients.
- If you already have **only the old single row** (e.g. P-1001 "Demo Patient"), the next run
  **adds the missing** P-1002…P-1005 rows and fixes access/consent for all five.
"""

import sys

# Canonical demo rows (match by external_id so re-runs are safe)
PATIENT_SPECS: list[tuple[str, str, str]] = [
    ("P-1001", "Alex Morgan", "Seeded demo; portal login patient@demo.local maps here."),
    ("P-1002", "Jordan Rivera", "Follow-up for hypertension; allergies: penicillin."),
    ("P-1003", "Maria Santos", "Type 2 diabetes; last HbA1c discussed in clinic notes."),
    ("P-1004", "James Okonkwo", "Post-op follow-up; wound check scheduled."),
    ("P-1005", "Priya Patel", "Asthma; uses albuterol inhaler as needed."),
]


def seed() -> None:
    from sqlalchemy import func, select

    import app.models  # noqa: F401 — register models

    from app.database import Base, SessionLocal, engine
    from app.models.consent import ConsentRecord
    from app.models.enums import AccessLevel, UserRole
    from app.models.patient import Patient
    from app.models.patient_access import PatientAccess
    from app.models.user import User
    from app.services.auth_service import hash_password
    from app.services.consent_service import CLINICAL_AI_PURPOSE

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.execute(select(User).where(User.email == "admin@demo.local")).scalars().first()
        if not admin:
            admin = User(
                email="admin@demo.local",
                hashed_password=hash_password("admin123!"),
                full_name="Admin User",
                role=UserRole.admin,
            )
            doctor = User(
                email="doctor@demo.local",
                hashed_password=hash_password("doctor123!"),
                full_name="Dr. Sarah Chen",
                role=UserRole.doctor,
            )
            nurse = User(
                email="nurse@demo.local",
                hashed_password=hash_password("nurse123!"),
                full_name="Nurse Jordan Lee",
                role=UserRole.nurse,
            )
            db.add_all([admin, doctor, nurse])
            db.commit()
            db.refresh(admin)
            db.refresh(doctor)
            db.refresh(nurse)
            print("Created demo staff users (admin, doctor, nurse).\n")
        else:
            doctor = db.execute(select(User).where(User.email == "doctor@demo.local")).scalars().first()
            nurse = db.execute(select(User).where(User.email == "nurse@demo.local")).scalars().first()
            if not doctor or not nurse:
                print(
                    "ERROR: admin exists but doctor@demo.local or nurse@demo.local is missing.\n"
                    "Fix your database or use a fresh Neon database and run seed again.",
                    file=sys.stderr,
                )
                sys.exit(1)

        n_patients = db.execute(select(func.count()).select_from(Patient)).scalar_one()

        if n_patients == 0:
            _insert_all_fresh(db, admin, doctor, nurse)
        else:
            print(f"Found {n_patients} patient row(s). Syncing missing demo patients (P-1001…P-1005)…")
            _sync_missing_by_external_id(db, admin, doctor, nurse)

        _ensure_portal_user(db)
        db.commit()

        _seed_sample_documents(db, doctor)

        # Print current table summary
        rows = db.execute(select(Patient).order_by(Patient.id)).scalars().all()
        print("\nCurrent patients table:")
        for p in rows:
            print(f"  id={p.id:>3}  {p.external_id or '—':<10}  {p.full_name}")
        print("\nAccounts: admin@demo.local / doctor@demo.local / nurse@demo.local / patient@demo.local (see README for passwords).")
        print("Refresh Neon Table Editor to see all rows.")
    finally:
        db.close()


def _insert_all_fresh(db, admin, doctor, nurse) -> None:
    from sqlalchemy import select

    from app.models.consent import ConsentRecord
    from app.models.enums import AccessLevel, UserRole
    from app.models.patient import Patient
    from app.models.patient_access import PatientAccess
    from app.models.user import User
    from app.services.auth_service import hash_password
    from app.services.consent_service import CLINICAL_AI_PURPOSE

    created: list[Patient] = []
    for ext_id, name, notes in PATIENT_SPECS:
        p = Patient(
            external_id=ext_id,
            full_name=name,
            notes=notes,
            created_by_user_id=doctor.id,
        )
        db.add(p)
        created.append(p)
    db.commit()
    for p in created:
        db.refresh(p)

    for p in created:
        db.add(PatientAccess(user_id=doctor.id, patient_id=p.id, access_level=AccessLevel.write))
        db.add(PatientAccess(user_id=nurse.id, patient_id=p.id, access_level=AccessLevel.write))
        db.add(
            ConsentRecord(
                patient_id=p.id,
                purpose=CLINICAL_AI_PURPOSE,
                granted=True,
                recorded_by_user_id=admin.id,
            )
        )

    portal = db.execute(select(User).where(User.email == "patient@demo.local")).scalars().first()
    if not portal:
        db.add(
            User(
                email="patient@demo.local",
                hashed_password=hash_password("patient123!"),
                full_name="Alex Morgan (portal)",
                role=UserRole.patient,
                patient_profile_id=created[0].id,
            )
        )
    db.commit()
    print("Inserted 5 demo patients with access + consent.\n")


def _sync_missing_by_external_id(db, admin, doctor, nurse) -> None:
    from sqlalchemy import select

    from app.models.patient import Patient

    # Upgrade legacy single row (old seed) to current display name
    legacy = db.execute(select(Patient).where(Patient.external_id == "P-1001")).scalars().first()
    if legacy and legacy.full_name == "Demo Patient":
        legacy.full_name = "Alex Morgan"
        legacy.notes = PATIENT_SPECS[0][2]

    new_count = 0
    for ext_id, name, notes in PATIENT_SPECS:
        existing = db.execute(select(Patient).where(Patient.external_id == ext_id)).scalars().first()
        if existing:
            continue
        p = Patient(
            external_id=ext_id,
            full_name=name,
            notes=notes,
            created_by_user_id=doctor.id,
        )
        db.add(p)
        new_count += 1
    db.commit()

    # Ensure access + consent for every canonical patient row
    for ext_id, _, _ in PATIENT_SPECS:
        p = db.execute(select(Patient).where(Patient.external_id == ext_id)).scalars().first()
        if not p:
            continue
        _ensure_access(db, doctor, nurse, p.id)
        _ensure_consent(db, admin, p.id)

    db.commit()
    if new_count:
        print(f"Added {new_count} missing patient row(s).\n")
    else:
        print("All P-1001…P-1005 rows already present; access/consent checked.\n")


def _ensure_access(db, doctor, nurse, patient_id: int) -> None:
    from sqlalchemy import select

    from app.models.enums import AccessLevel
    from app.models.patient_access import PatientAccess

    for uid, level in ((doctor.id, AccessLevel.write), (nurse.id, AccessLevel.write)):
        row = db.execute(
            select(PatientAccess).where(PatientAccess.user_id == uid, PatientAccess.patient_id == patient_id)
        ).scalars().first()
        if not row:
            db.add(PatientAccess(user_id=uid, patient_id=patient_id, access_level=level))
        elif row.access_level != level:
            row.access_level = level


def _ensure_consent(db, admin, patient_id: int) -> None:
    from sqlalchemy import select

    from app.models.consent import ConsentRecord
    from app.services.consent_service import CLINICAL_AI_PURPOSE

    row = db.execute(
        select(ConsentRecord).where(
            ConsentRecord.patient_id == patient_id,
            ConsentRecord.purpose == CLINICAL_AI_PURPOSE,
        )
    ).scalars().first()
    if not row:
        db.add(
            ConsentRecord(
                patient_id=patient_id,
                purpose=CLINICAL_AI_PURPOSE,
                granted=True,
                recorded_by_user_id=admin.id,
            )
        )


def _seed_sample_documents(db, doctor) -> None:
    """Create one demo document + chunks per patient from `sample_documents/*.txt` for chat testing."""
    import uuid
    from pathlib import Path

    from sqlalchemy import select

    from app.config import settings
    from app.models.document import Document
    from app.models.document_chunk import DocumentChunk
    from app.models.enums import DocumentStatus
    from app.models.patient import Patient
    from app.utils.chunking import chunk_text

    backend_dir = Path(__file__).resolve().parent
    sample_dir = backend_dir / "sample_documents"
    if not sample_dir.is_dir():
        print("\nNo backend/sample_documents/ folder; skipping document seed.")
        return

    mapping = [
        ("P-1001", "alex_morgan_visit.txt"),
        ("P-1002", "jordan_rivera_labs.txt"),
        ("P-1003", "maria_santos_diabetes.txt"),
        ("P-1004", "james_okonkwo_postop.txt"),
        ("P-1005", "priya_patel_asthma.txt"),
    ]

    up = settings.uploads_path()
    added = 0
    for ext_id, fname in mapping:
        path = sample_dir / fname
        if not path.is_file():
            print(f"  (missing sample file: {fname})")
            continue
        patient = db.execute(select(Patient).where(Patient.external_id == ext_id)).scalars().first()
        if not patient:
            continue
        stored_name = f"seed_demo_{fname}"
        exists = db.execute(
            select(Document).where(Document.patient_id == patient.id, Document.filename == stored_name)
        ).scalars().first()
        if exists:
            continue
        text = path.read_text(encoding="utf-8")
        chunks = chunk_text(text)
        if not chunks:
            continue
        subdir = up / "documents" / str(patient.id)
        subdir.mkdir(parents=True, exist_ok=True)
        dest = subdir / f"{uuid.uuid4().hex}_{fname}"
        dest.write_text(text, encoding="utf-8")

        doc = Document(
            patient_id=patient.id,
            uploaded_by_user_id=doctor.id,
            filename=stored_name,
            storage_path=str(dest.resolve()),
            mime_type="text/plain",
            summary=chunks[0][:500] if chunks[0] else None,
            status=DocumentStatus.ready,
        )
        db.add(doc)
        db.flush()
        for i, content in enumerate(chunks):
            db.add(
                DocumentChunk(
                    document_id=doc.id,
                    patient_id=patient.id,
                    chunk_index=i,
                    content=content,
                    source_metadata={"seed": True, "source_file": fname},
                )
            )
        added += 1
    db.commit()
    if added:
        print(
            f"\nSeeded {added} demo document(s) into `documents` + `document_chunks` "
            "(uploads copied under uploads/documents/<patient_id>/)."
        )
        print("Chat tips: ask about blood pressure, HbA1c, diabetes, wound, albuterol — match words from the notes.")
    else:
        print("\nDemo documents already seeded (or nothing new to add).")


def _ensure_portal_user(db) -> None:
    from sqlalchemy import select

    from app.models.enums import UserRole
    from app.models.patient import Patient
    from app.models.user import User
    from app.services.auth_service import hash_password

    p1 = db.execute(select(Patient).where(Patient.external_id == "P-1001")).scalars().first()
    if not p1:
        return
    portal = db.execute(select(User).where(User.email == "patient@demo.local")).scalars().first()
    if not portal:
        db.add(
            User(
                email="patient@demo.local",
                hashed_password=hash_password("patient123!"),
                full_name="Alex Morgan (portal)",
                role=UserRole.patient,
                patient_profile_id=p1.id,
            )
        )
    elif portal.patient_profile_id != p1.id:
        portal.patient_profile_id = p1.id


if __name__ == "__main__":
    from pydantic import ValidationError

    try:
        seed()
    except ValidationError as e:
        print("Configuration error - fix backend/.env (copy from .env.example):\n", file=sys.stderr)
        print(e, file=sys.stderr)
        sys.exit(1)

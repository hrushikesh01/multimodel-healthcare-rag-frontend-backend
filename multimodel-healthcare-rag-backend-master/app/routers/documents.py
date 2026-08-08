import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.enums import DocumentStatus, UserRole
from app.models.user import User
from app.schemas.document import DocumentRead
from app.services.audit_service import log_action
from app.services.consent_service import ensure_clinical_ai_granted
from app.services.rbac_service import can_access_patient, can_write_patient
from app.utils.chunking import chunk_text
from app.utils.ingestion import extract_text_from_file

router = APIRouter()

ALLOWED_DOC_SUFFIXES = frozenset({".pdf", ".txt", ".text", ".md", ".docx", ".py"})


@router.get("/", response_model=list[DocumentRead])
def list_documents(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access")
    rows = db.execute(select(Document).where(Document.patient_id == patient_id).order_by(Document.id.desc())).scalars().all()
    return list(rows)


@router.post("/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    patient_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File()],
):
    if user.role == UserRole.patient:
        raise HTTPException(status_code=403, detail="Patients cannot upload clinical documents via this endpoint")
    if not can_write_patient(db, user, patient_id):
        raise HTTPException(status_code=403, detail="Write access required")

    safe_name = file.filename or "upload.bin"
    suf = Path(safe_name).suffix.lower()
    if suf not in ALLOWED_DOC_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Allowed: PDF (.pdf), plain text (.txt, .md, .py), Word (.docx). "
            "Legacy .doc is not supported — save as .docx in Word.",
        )

    base = settings.uploads_path() / "documents" / str(patient_id)
    base.mkdir(parents=True, exist_ok=True)
    uid = uuid.uuid4().hex
    dest = base / f"{uid}_{safe_name}"
    content = await file.read()
    dest.write_bytes(content)

    doc = Document(
        patient_id=patient_id,
        uploaded_by_user_id=user.id,
        filename=safe_name,
        storage_path=str(dest),
        mime_type=file.content_type,
        status=DocumentStatus.processing,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    text = extract_text_from_file(dest, file.content_type)
    chunks = chunk_text(text)
    for i, c in enumerate(chunks):
        db.add(
            DocumentChunk(
                document_id=doc.id,
                patient_id=patient_id,
                chunk_index=i,
                content=c,
                source_metadata={"filename": safe_name, "chunk_index": i},
            )
        )
    doc.status = DocumentStatus.ready if chunks else DocumentStatus.failed
    ensure_clinical_ai_granted(db, patient_id=patient_id, recorded_by_user_id=user.id)
    if chunks:
        doc.summary = chunks[0][:500]
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_action(
        db,
        user_id=user.id,
        action="document_upload",
        resource_type="document",
        resource_id=doc.id,
        details={"patient_id": patient_id, "chunks": len(chunks)},
    )
    return doc

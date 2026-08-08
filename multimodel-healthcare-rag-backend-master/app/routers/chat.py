from pathlib import Path
from types import SimpleNamespace
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.chat import ChatMessage
from app.models.enums import UserRole
from app.models.medical_image import MedicalImage
from app.models.patient import Patient
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageRead
from app.services.audit_service import log_action
from app.services.rbac_service import can_access_patient, get_accessible_patient_ids
from app.services.rag_service import (
    build_chat_answer,
    retrieve_chunks_for_query,
    retrieve_medical_images_for_query,
    should_include_imaging_for_query,
)
from app.utils.ingestion import build_imaging_context_excerpt

router = APIRouter()

MAX_LLM_CHUNKS = 8
MAX_IMAGES_FOR_CHAT = 4
MAX_IMAGING_CONTEXT_CHARS = 9000


def _patient_chart_excerpt(patient: Patient | None) -> str:
    """Structured header from EMR — not in document_chunks; needed for questions like patient name."""
    if not patient:
        return ""
    lines: list[str] = []
    if patient.full_name:
        lines.append(f"Registered full name: {patient.full_name}")
    if patient.external_id:
        lines.append(f"External / MRN identifier: {patient.external_id}")
    if patient.notes and str(patient.notes).strip():
        lines.append(f"Chart notes (free text): {str(patient.notes).strip()}")
    return "\n".join(lines)


def _build_imaging_context_chunk(images: list[MedicalImage]) -> SimpleNamespace | None:
    parts: list[str] = []
    for img in images:
        p = Path(img.storage_path)
        if not p.is_file():
            continue
        parts.append(
            build_imaging_context_excerpt(
                p,
                filename=img.filename,
                mime_type=img.mime_type,
                caption=img.caption,
                image_id=img.id,
            )
        )
    if not parts:
        return None
    body = "\n\n---\n\n".join(parts)
    if len(body) > MAX_IMAGING_CONTEXT_CHARS:
        body = body[:MAX_IMAGING_CONTEXT_CHARS] + "\n… [imaging context truncated]"
    return SimpleNamespace(
        id=0,
        content="IMAGING / SCANS (uploaded studies — extractable PDF text and staff captions; pure images need a caption or text report):\n\n"
        + body,
    )


def _merge_chart_docs_and_imaging(
    patient: Patient | None,
    doc_chunks: list[Any],
    images: list[MedicalImage],
) -> list[Any]:
    """Chart first, then imaging block, then document chunks (up to MAX_LLM_CHUNKS total slots)."""
    merged: list[Any] = []
    chart = _patient_chart_excerpt(patient)
    imaging_chunk = _build_imaging_context_chunk(images)
    if chart:
        merged.append(SimpleNamespace(id=0, content=chart))
    if imaging_chunk:
        merged.append(imaging_chunk)
    slots_docs = max(0, MAX_LLM_CHUNKS - len(merged))
    merged.extend(doc_chunks[:slots_docs])
    return merged


@router.post("/message", response_model=ChatResponse)
def chat_message(
    body: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    request: Request,
):
    # One RBAC lookup per request (avoid duplicate PatientAccess queries).
    allowed = get_accessible_patient_ids(db, user)
    if allowed is not None and body.patient_id not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to patient")

    doc_chunks = retrieve_chunks_for_query(
        db,
        query=body.message,
        patient_id=body.patient_id,
        allowed_patient_ids=allowed,
        user=user,
        limit=MAX_LLM_CHUNKS,
    )
    image_rows: list[MedicalImage] = []
    if should_include_imaging_for_query(body.message):
        image_rows = retrieve_medical_images_for_query(
            db,
            query=body.message,
            patient_id=body.patient_id,
            allowed_patient_ids=allowed,
            user=user,
            limit=MAX_IMAGES_FOR_CHAT,
        )
    patient = db.get(Patient, body.patient_id)
    pname = patient.full_name if patient else f"Patient #{body.patient_id}"
    pext = patient.external_id if patient else None
    chunks = _merge_chart_docs_and_imaging(patient, doc_chunks, image_rows)
    result = build_chat_answer(
        body.message,
        chunks,
        patient_id=body.patient_id,
        patient_name=pname,
        patient_external_id=pext,
    )

    db.add(ChatMessage(user_id=user.id, patient_id=body.patient_id, role="user", content=body.message))
    db.add(ChatMessage(user_id=user.id, patient_id=body.patient_id, role="assistant", content=result.text))
    db.commit()

    log_action(
        db,
        user_id=user.id,
        action="chat_message",
        resource_type="patient",
        resource_id=body.patient_id,
        ip_address=request.client.host if request.client else None,
        details={
            "chunk_ids": [c.id for c in doc_chunks],
            "image_ids": [i.id for i in image_rows],
            "role": user.role.value,
            "answer_source": result.source,
            "model": result.model,
        },
    )
    return ChatResponse(
        answer=result.text,
        chunk_ids=[c.id for c in doc_chunks],
        image_ids=[i.id for i in image_rows],
        patient_id=body.patient_id,
        answer_source=result.source,
        model=result.model,
    )


@router.get("/history", response_model=list[ChatMessageRead])
def chat_history(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=403, detail="No access")
    stmt = select(ChatMessage).where(ChatMessage.patient_id == patient_id).order_by(ChatMessage.id.asc())
    if user.role != UserRole.admin:
        stmt = stmt.where(ChatMessage.user_id == user.id)
    rows = db.execute(stmt).scalars().all()
    return list(rows)

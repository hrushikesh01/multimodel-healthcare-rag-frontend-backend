import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.enums import UserRole
from app.models.medical_image import MedicalImage
from app.models.user import User
from app.schemas.image import MedicalImageRead
from app.services.audit_service import log_action
from app.services.consent_service import ensure_clinical_ai_granted
from app.services.rbac_service import can_access_patient, can_write_patient

router = APIRouter()

ALLOWED_IMAGING_SUFFIXES = frozenset({
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".tif",
    ".tiff",
    ".dcm",
})


def _to_upload_url(storage_path: str) -> str | None:
    try:
        path_obj = Path(storage_path).resolve()
        upload_root = settings.uploads_path().resolve()
        rel = path_obj.relative_to(upload_root)
        return "/uploads/" + str(rel).replace("\\", "/")
    except Exception:
        return None


def _serialize_image(img: MedicalImage) -> MedicalImageRead:
    return MedicalImageRead.model_validate(
        {
            "id": img.id,
            "patient_id": img.patient_id,
            "filename": img.filename,
            "mime_type": img.mime_type,
            "caption": img.caption,
            "file_url": _to_upload_url(img.storage_path),
            "created_at": img.created_at,
        }
    )


@router.get("/", response_model=list[MedicalImageRead])
def list_images(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_access_patient(db, user, patient_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access")
    rows = db.execute(
        select(MedicalImage).where(MedicalImage.patient_id == patient_id).order_by(MedicalImage.id.desc())
    ).scalars().all()
    return [_serialize_image(r) for r in rows]


@router.post("/", response_model=MedicalImageRead, status_code=status.HTTP_201_CREATED)
async def upload_image(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    patient_id: Annotated[int, Form()],
    caption: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile, File()] = ...,
):
    if user.role == UserRole.patient:
        raise HTTPException(status_code=403, detail="Patients cannot upload imaging via this endpoint")
    if not can_write_patient(db, user, patient_id):
        raise HTTPException(status_code=403, detail="Write access required")

    safe_name = file.filename or "upload.bin"
    suf = Path(safe_name).suffix.lower()
    if suf not in ALLOWED_IMAGING_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported imaging file type. Use PDF reports, PNG/JPEG/WebP/GIF scans, TIFF, or DICOM (.dcm).",
        )
    if suf != ".pdf" and not (caption or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description is required when uploading image files (PNG/JPG/DICOM/etc).",
        )

    base = settings.uploads_path() / "images" / str(patient_id)
    base.mkdir(parents=True, exist_ok=True)
    uid = uuid.uuid4().hex
    dest = base / f"{uid}_{safe_name}"
    dest.write_bytes(await file.read())

    img = MedicalImage(
        patient_id=patient_id,
        uploaded_by_user_id=user.id,
        filename=safe_name,
        storage_path=str(dest),
        mime_type=file.content_type,
        caption=caption,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    ensure_clinical_ai_granted(db, patient_id=patient_id, recorded_by_user_id=user.id)
    db.commit()
    log_action(db, user_id=user.id, action="image_upload", resource_type="medical_image", resource_id=img.id, details={"patient_id": patient_id})
    return _serialize_image(img)

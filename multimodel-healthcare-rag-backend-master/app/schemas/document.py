from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    filename: str
    mime_type: str | None
    summary: str | None
    status: DocumentStatus
    created_at: datetime | None

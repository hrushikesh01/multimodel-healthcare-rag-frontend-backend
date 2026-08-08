from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MedicalImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    filename: str
    mime_type: str | None
    caption: str | None
    file_url: str | None = None
    created_at: datetime | None

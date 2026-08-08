from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConsentCreate(BaseModel):
    patient_id: int
    purpose: str
    granted: bool


class ConsentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    purpose: str
    granted: bool
    created_at: datetime | None

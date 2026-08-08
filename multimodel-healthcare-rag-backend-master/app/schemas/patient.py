from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AccessLevel


class PatientCreate(BaseModel):
    external_id: str | None = None
    full_name: str
    gender: str | None = None
    dob: str | None = None
    condition: str | None = None
    notes: str | None = None


class PatientUpdate(BaseModel):
    external_id: str | None = None
    full_name: str | None = None
    gender: str | None = None
    dob: str | None = None
    condition: str | None = None
    notes: str | None = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: str | None
    full_name: str
    gender: str | None = None
    dob: str | None = None
    condition: str | None = None
    notes: str | None
    created_by_user_id: int | None
    doctor_assigned: str | None = None
    created_at: datetime | None = None
    can_write: bool = False


class PatientAccessCreate(BaseModel):
    user_id: int
    access_level: AccessLevel = AccessLevel.read

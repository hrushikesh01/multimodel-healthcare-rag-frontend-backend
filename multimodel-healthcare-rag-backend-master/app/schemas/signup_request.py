from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class SignupRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    status: str
    review_note: str | None
    created_at: datetime
    reviewed_at: datetime | None


class SignupRequestAction(BaseModel):
    review_note: str | None = None


class RegisterResponse(BaseModel):
    message: str
    status: str

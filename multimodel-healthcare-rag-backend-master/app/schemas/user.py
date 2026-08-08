from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str | None = None
    role: UserRole
    patient_profile_id: int | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip()
        if not v or v.count("@") != 1:
            raise ValueError("Invalid email")
        local, domain = v.split("@", 1)
        if not local or not domain:
            raise ValueError("Invalid email")
        return v


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    patient_profile_id: int | None

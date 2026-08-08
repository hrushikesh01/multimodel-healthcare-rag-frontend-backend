from pydantic import BaseModel, Field, field_validator
from app.models.enums import UserRole


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Avoid overly-strict RFC checks that reject some demo/self-hosted domains
        # (e.g. `.local`), while still requiring a basic `local@domain` shape.
        v = v.strip()
        if not v or v.count("@") != 1:
            raise ValueError("Invalid email")
        local, domain = v.split("@", 1)
        if not local or not domain:
            raise ValueError("Invalid email")
        return v


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

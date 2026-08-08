from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (parent of app/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Loads `.env` from the `backend/` folder regardless of current working directory."""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = ""
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: str = (
        "http://127.0.0.1:8000,http://localhost:8000,"
        "http://127.0.0.1:8001,http://localhost:8001,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )
    upload_dir: str = "./uploads"

    # OpenRouter (optional) — LLM for /api/chat; leave empty to use excerpt-only stub
    openrouter_api_key: str = ""
    # Primary + fallbacks must be valid ids (404 = removed/renamed).
    # Default to OpenRouter's auto router with a free fallback.
    # You can override OPENROUTER_MODEL / OPENROUTER_MODEL_FALLBACKS in backend/.env.
    openrouter_model: str = "openrouter/auto"
    openrouter_model_fallbacks: str = "openrouter/free"
    openrouter_429_max_attempts: int = 3
    openrouter_429_retry_delay_seconds: float = 3.0
    openrouter_referer: str = "http://127.0.0.1:8000"

    def uploads_path(self) -> Path:
        """Always under `backend/` when relative (same cwd as `.env`)."""
        p = Path(self.upload_dir)
        if p.is_absolute():
            return p
        return (_BACKEND_DIR / self.upload_dir.lstrip("./")).resolve()

    @field_validator("database_url", mode="before")
    @classmethod
    def strip_database_url(cls, v: object) -> object:
        if v is None:
            return ""
        if isinstance(v, str):
            return v.strip().strip('"').strip("'")
        return v

    @model_validator(mode="after")
    def require_database_url(self):
        if not self.database_url:
            example = _BACKEND_DIR / ".env.example"
            env_path = _BACKEND_DIR / ".env"
            raise ValueError(
                "DATABASE_URL is missing or empty.\n"
                f"  1) Copy {example.name} to {env_path.name} in { _BACKEND_DIR }\n"
                "  2) Set DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST/db?sslmode=require\n"
                "  (Use your Neon connection string; never commit real credentials.)"
            )
        return self


settings = Settings()

from datetime import datetime, timedelta, timezone
import hashlib

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# 🔐 Normalize password to avoid bcrypt 72-byte limit
def _normalize_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ✅ Verify password (handles both old + new users)
def verify_password(plain: str, hashed: str) -> bool:
    # New method (SHA256 → bcrypt)
    normalized = _normalize_password(plain)
    try:
        if pwd_context.verify(normalized, hashed):
            return True
    except Exception:
        pass
    
    # Fallback for old users (raw bcrypt, pre-normalization)
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ✅ Hash password (always use normalized)
def hash_password(password: str) -> str:
    normalized = _normalize_password(password)
    return pwd_context.hash(normalized)


# 🔑 Create JWT token
def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload: dict = {"sub": subject, "exp": int(expire.timestamp())}

    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# 🔍 Decode JWT
def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


# 👤 Extract user ID
def parse_user_id_from_token(token: str) -> int:
    try:
        data = decode_token(token)
        sub = data.get("sub")

        if sub is None:
            raise ValueError("missing sub")

        return int(sub)

    except (JWTError, ValueError) as e:
        raise ValueError("invalid token") from e

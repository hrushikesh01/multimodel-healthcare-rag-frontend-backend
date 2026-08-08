from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.audit import AuditLogRead

router = APIRouter()


@router.get("/", response_model=list[AuditLogRead])
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
    limit: int = 200,
):
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 1000))
    return list(db.execute(stmt).scalars().all())

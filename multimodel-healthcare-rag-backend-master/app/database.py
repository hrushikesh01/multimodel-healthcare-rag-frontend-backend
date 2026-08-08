from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def _normalize_database_url(url: str) -> str:
    u = url.strip().strip('"').strip("'")
    if u.startswith("postgres://"):
        u = "postgresql+psycopg2://" + u[len("postgres://") :]
    elif u.startswith("postgresql://") and "+psycopg2" not in u.split("://", 1)[0]:
        u = "postgresql+psycopg2://" + u[len("postgresql://") :]
    return u


engine = create_engine(
    _normalize_database_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

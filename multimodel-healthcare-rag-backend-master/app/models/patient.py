from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(500), index=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(50), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(256), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    access_grants = relationship("PatientAccess", back_populates="patient", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="patient")
    images = relationship("MedicalImage", back_populates="patient")
    creator = relationship("User", foreign_keys=[created_by_user_id])

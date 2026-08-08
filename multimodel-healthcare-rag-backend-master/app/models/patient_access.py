from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import AccessLevel


class PatientAccess(Base):
    __tablename__ = "patient_access"
    __table_args__ = (UniqueConstraint("user_id", "patient_id", name="uq_user_patient_access"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    access_level: Mapped[AccessLevel] = mapped_column(
        SAEnum(AccessLevel, name="access_level", native_enum=False),
        default=AccessLevel.read,
    )

    user = relationship("User", backref="patient_access_grants")
    patient = relationship("Patient", back_populates="access_grants")

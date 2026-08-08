import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    nurse = "nurse"
    patient = "patient"


class AccessLevel(str, enum.Enum):
    read = "read"
    write = "write"


class DocumentStatus(str, enum.Enum):
    processing = "processing"
    ready = "ready"
    failed = "failed"

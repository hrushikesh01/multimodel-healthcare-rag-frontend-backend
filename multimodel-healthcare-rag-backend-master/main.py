import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.middleware.audit_middleware import AuditMiddleware
from app.routers import admin, audit, auth, chat, consent, documents, images, patients, users
from app.utils.schema_compat import ensure_schema_compat

import app.models  # noqa: F401 — register ORM models


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema_compat(engine)
    up = settings.uploads_path()
    os.makedirs(up, exist_ok=True)
    os.makedirs(up / "documents", exist_ok=True)
    os.makedirs(up / "images", exist_ok=True)
    yield


app = FastAPI(
    title="Healthcare RAG API",
    description="Multimodal healthcare RAG with RBAC — PostgreSQL backend",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditMiddleware)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(consent.router, prefix="/api/consent", tags=["consent"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

_upload_root = settings.uploads_path()
_upload_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_root)), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "healthcare-rag"}


FRONTEND_ROOT = Path(__file__).resolve().parent.parent / "clinicalassist-rag" / "dist"
if FRONTEND_ROOT.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_ROOT / "assets")), name="frontend_assets")

    @app.api_route("/{path_name:path}", methods=["GET"])
    async def serve_frontend(path_name: str):
        # Fallback to index.html for client-side routing, ignoring /api
        if not path_name.startswith("api/"):
            return FileResponse(FRONTEND_ROOT / "index.html")
        return {"detail": "Not Found"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

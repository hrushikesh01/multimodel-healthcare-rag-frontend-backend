"""
Apply PostgreSQL indexes for faster chat chunk retrieval.

Requires DATABASE_URL in backend/.env (same as the app). Safe to re-run.

From the backend/ directory:

    python apply_retrieval_indexes.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import text

from app.database import engine

# Mirrors sql/retrieval_indexes.sql (edit both if you change indexes).
_STATEMENTS = [
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    """CREATE INDEX IF NOT EXISTS ix_document_chunks_content_trgm
  ON document_chunks USING gin (content gin_trgm_ops)""",
    """CREATE INDEX IF NOT EXISTS ix_document_chunks_patient_id_id_desc
  ON document_chunks (patient_id, id DESC)""",
]


def main() -> None:
    with engine.begin() as conn:
        for sql in _STATEMENTS:
            conn.execute(text(sql))
    print("Retrieval indexes applied (pg_trgm + btree). See sql/retrieval_indexes.sql.")


if __name__ == "__main__":
    main()

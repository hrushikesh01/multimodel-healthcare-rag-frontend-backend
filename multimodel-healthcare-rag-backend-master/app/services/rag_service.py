import logging
import os
import re
import string
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import exists, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.consent import ConsentRecord
from app.models.document_chunk import DocumentChunk
from app.models.enums import UserRole
from app.models.medical_image import MedicalImage
from app.models.user import User
from app.services.consent_service import CLINICAL_AI_PURPOSE

logger = logging.getLogger(__name__)

# Ensure backend/.env is loaded into os.environ for GROQ_API_KEY.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=False)

# Trimmed from question text so keyword search still finds medical terms in the note
_QUERY_STOPWORDS = frozenset({
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "was", "one", "our", "out",
    "how", "who", "what", "when", "where", "which", "this", "that", "with", "from", "they",
    "have", "has", "had", "did", "does", "any", "will", "should", "could", "would", "there",
    "their", "them", "then", "than", "into", "about", "your", "some", "such", "also", "very",
})

_IMAGING_INTENT_TERMS = (
    "image",
    "images",
    "imaging",
    "scan",
    "scans",
    "ultrasound",
    "usg",
    "xray",
    "x-ray",
    "ct",
    "mri",
    "dicom",
    "doppler",
    "echo",
    "sonography",
)


def _query_keywords(q: str) -> list[str]:
    words: list[str] = []
    for raw in q.lower().split():
        w = raw.strip(string.punctuation)
        if len(w) > 2 and w not in _QUERY_STOPWORDS:
            words.append(w)
    return words[:12]


def should_include_imaging_for_query(query: str) -> bool:
    """Show/retrieve imaging only when user explicitly asks for it."""
    q = (query or "").lower().strip()
    if not q:
        return False
    q_words = set(re.findall(r"[a-z0-9-]+", q))
    return any(term in q_words or term in q for term in _IMAGING_INTENT_TERMS)


@dataclass(frozen=True)
class ChatAnswerResult:
    text: str
    """llm = Groq, stub = no API key, fallback = LLM error then excerpts"""
    source: str
    model: str | None = None


def _direct_fact_answer(query: str, chunks: list[DocumentChunk]) -> str | None:
    """Fast deterministic answers for common chart questions."""
    q = (query or "").lower().strip()
    if not q:
        return None

    texts = [(c.content or "").strip() for c in chunks if getattr(c, "content", None)]
    if not texts:
        return None
    joined = "\n".join(texts)

    asks_name = bool(
        re.search(
            r"\b("
            r"patient name|full name|registered full name|name of (the )?patient|"
            r"who is (the )?patient|patient identity|mrn"
            r")\b",
            q,
        )
    )
    asks_age = bool(re.search(r"\b(age|how old|years old|year old)\b", q))
    asks_symptoms = bool(re.search(r"\b(symptom|symptoms|complaint|complaints|presented with)\b", q))

    if asks_name:
        m = re.search(r"registered full name:\s*([^\n\r]+)", joined, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip().rstrip(".")

    if asks_age:
        # Prefer explicit "28-year-old" style mentions.
        m = re.search(r"\b(\d{1,3})\s*-\s*year\s*-\s*old\b|\b(\d{1,3})\s*year\s*old\b", joined, flags=re.IGNORECASE)
        if m:
            age = m.group(1) or m.group(2)
            return f"{age} years old."

    if asks_symptoms:
        m = re.search(
            r"(?:complaints?\s+of|presented with)\s+(.+?)(?:\.|\n|, assessment:| plan:| treatment plan)",
            joined,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if m:
            return m.group(1).strip().replace("\n", " ")

    return None


def retrieve_chunks_for_query(
    db: Session,
    *,
    query: str,
    patient_id: int,
    allowed_patient_ids: list[int] | None,
    user: User,
    limit: int = 8,
) -> list[DocumentChunk]:
    """Retrieve chunks by keyword match; pad with newest chunks so general questions still see uploads."""
    if allowed_patient_ids is not None and patient_id not in allowed_patient_ids:
        return []

    words = _query_keywords(query)

    # Staff (admin / doctor / nurse) are already constrained by patient RBAC; requiring a separate
    # consent row blocked the assistant after uploads when consent was never recorded.
    consent_ok = exists(
        select(ConsentRecord.id).where(
            ConsentRecord.patient_id == patient_id,
            ConsentRecord.purpose == CLINICAL_AI_PURPOSE,
            ConsentRecord.granted.is_(True),
        )
    )

    def base_stmt():
        s = select(DocumentChunk).where(DocumentChunk.patient_id == patient_id)
        if user.role == UserRole.patient:
            s = s.where(consent_ok)
        return s

    picked: list[DocumentChunk] = []
    seen: set[int] = set()

    if words:
        stmt_kw = base_stmt().where(or_(*[DocumentChunk.content.ilike(f"%{w}%") for w in words]))
        stmt_kw = stmt_kw.order_by(DocumentChunk.id.desc()).limit(limit)
        for row in db.execute(stmt_kw).scalars().all():
            if row.id not in seen:
                seen.add(row.id)
                picked.append(row)

    if len(picked) < limit:
        stmt_recent = base_stmt().order_by(DocumentChunk.id.desc())
        if seen:
            stmt_recent = stmt_recent.where(DocumentChunk.id.notin_(seen))
        stmt_recent = stmt_recent.limit(limit - len(picked))
        for row in db.execute(stmt_recent).scalars().all():
            if row.id not in seen:
                seen.add(row.id)
                picked.append(row)
            if len(picked) >= limit:
                break

    return picked[:limit]


def retrieve_medical_images_for_query(
    db: Session,
    *,
    query: str,
    patient_id: int,
    allowed_patient_ids: list[int] | None,
    user: User,
    limit: int = 4,
) -> list[MedicalImage]:
    """Keyword + newest imaging uploads (PDF reports, scans) for chat context."""
    if allowed_patient_ids is not None and patient_id not in allowed_patient_ids:
        return []

    words = _query_keywords(query)
    consent_ok = exists(
        select(ConsentRecord.id).where(
            ConsentRecord.patient_id == patient_id,
            ConsentRecord.purpose == CLINICAL_AI_PURPOSE,
            ConsentRecord.granted.is_(True),
        )
    )

    def base_stmt():
        s = select(MedicalImage).where(MedicalImage.patient_id == patient_id)
        if user.role == UserRole.patient:
            s = s.where(consent_ok)
        return s

    picked: list[MedicalImage] = []
    seen: set[int] = set()

    if words:
        fname_clauses = [MedicalImage.filename.ilike(f"%{w}%") for w in words]
        cap_clauses = [MedicalImage.caption.ilike(f"%{w}%") for w in words]
        stmt_kw = base_stmt().where(or_(*fname_clauses, *cap_clauses))
        stmt_kw = stmt_kw.order_by(MedicalImage.id.desc()).limit(limit)
        for row in db.execute(stmt_kw).scalars().all():
            if row.id not in seen:
                seen.add(row.id)
                picked.append(row)

    if len(picked) < limit:
        stmt_recent = base_stmt().order_by(MedicalImage.id.desc())
        if seen:
            stmt_recent = stmt_recent.where(MedicalImage.id.notin_(seen))
        stmt_recent = stmt_recent.limit(limit - len(picked))
        for row in db.execute(stmt_recent).scalars().all():
            if row.id not in seen:
                seen.add(row.id)
                picked.append(row)
            if len(picked) >= limit:
                break

    return picked[:limit]


def build_stub_answer(
    query: str,
    chunks: list[DocumentChunk],
    *,
    stub_reason: str = "no_key",
) -> str:
    if not chunks:
        return (
            "No permitted clinical context was found for this patient (check consent `clinical_ai_assistant`, "
            "documents, and imaging uploads), or nothing matched your query."
        )
    snippets = []
    for c in chunks[:3]:
        t = (c.content or "").strip().replace("\n", " ")
        if len(t) > 280:
            t = t[:277] + "…"
        snippets.append(f"• {t}")
    joined = "\n".join(snippets)

    if stub_reason == "no_key":
        header = (
            "[Excerpt mode — set GROQ_API_KEY in backend/.env for LLM answers]\n\n"
        )
    elif stub_reason == "rate_limit":
        header = (
            "[Groq returned 429 (rate limit) — wait 1–2 minutes and retry, or use another API key]\n\n"
        )
    else:
        header = "[LLM unavailable — excerpt fallback]\n\n"

    return (
        header + f"Your question: {query}\n\n" + "Matching record snippets (not a full answer):\n" + joined
    )


def build_chat_answer(
    query: str,
    chunks: list[DocumentChunk],
    *,
    patient_id: int,
    patient_name: str,
    patient_external_id: str | None,
) -> ChatAnswerResult:
    """Use Groq when API key is set; otherwise short excerpt stub."""
    if not chunks:
        return ChatAnswerResult(
            text=(
                "No permitted clinical context was found for this patient (check consent `clinical_ai_assistant`, "
                "documents, and imaging uploads), or nothing matched your query."
            ),
            source="no_context",
            model=None,
        )

    if not (os.getenv("GROQ_API_KEY") or "").strip():
        logger.info("Chat answer using excerpt stub (GROQ_API_KEY not set)")
        return ChatAnswerResult(text=build_stub_answer(query, chunks, stub_reason="no_key"), source="stub", model=None)

    # Deterministic fast-path for common factual questions.
    direct = _direct_fact_answer(query, chunks)
    if direct:
        return ChatAnswerResult(text=direct, source="llm", model="rule-fact-extractor")

    try:
        from app.services.llm_service import generate_clinical_answer

        text, model_used = generate_clinical_answer(
            patient_id=patient_id,
            question=query,
            chunks=chunks,
        )
        if not (text or "").strip():
            logger.warning("LLM returned empty answer; using excerpt fallback")
            return ChatAnswerResult(
                text=build_stub_answer(query, chunks, stub_reason="error"),
                source="fallback",
                model=model_used,
            )
        return ChatAnswerResult(text=text, source="llm", model=model_used)
    except Exception as e:
        logger.exception("LLM generation failed; using excerpt fallback")
        err_s = str(e).lower()
        is_rate = "429" in str(e) or "rate" in err_s or "rate-limited" in err_s
        stub_reason = "rate_limit" if is_rate else "error"
        short = build_stub_answer(query, chunks, stub_reason=stub_reason)
        return ChatAnswerResult(
            text=f"[LLM error: {e}]\n\n{short}",
            source="fallback",
            model=None,
        )

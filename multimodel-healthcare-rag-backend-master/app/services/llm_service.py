"""Groq chat completions for patient-scoped RAG answers (fast path)."""

from __future__ import annotations

import logging
import os
import re
import time
from collections import OrderedDict
from pathlib import Path
from typing import TYPE_CHECKING

from dotenv import load_dotenv
from groq import Groq

if TYPE_CHECKING:
    from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)

# Ensure backend/.env is loaded into os.environ for GROQ_API_KEY.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=False)

SYSTEM_PROMPT = (
    "You are a clinical AI assistant. Answer ONLY using the provided patient context. "
    "Do not hallucinate. If the answer is not found, say 'Insufficient data in patient records'. "
    "Keep answers concise."
)

GROQ_MODEL = "llama-3.1-8b-instant"
_FALLBACK_MODEL_ON_DECOMMISSION = "llama-3.1-8b-instant"
MAX_CONTEXT_CHARS = 4500
MAX_CONTEXT_CHUNKS = 3
MAX_TOKENS = 140
TEMPERATURE = 0.25
TOP_P = 0.9

# Lightweight in-memory cache: (patient_id, question_lower) -> answer
_CACHE_MAX_ITEMS = 256
_cache: "OrderedDict[tuple[int, str], str]" = OrderedDict()


def _cache_get(key: tuple[int, str]) -> str | None:
    v = _cache.get(key)
    if v is None:
        return None
    _cache.move_to_end(key)
    return v


def _cache_put(key: tuple[int, str], value: str) -> None:
    _cache[key] = value
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX_ITEMS:
        _cache.popitem(last=False)


def _build_context(chunks: list["DocumentChunk"], question: str) -> str:
    # Re-rank chunks so the model sees the most relevant parts for the specific question.
    # This avoids "Insufficient data..." when the correct chunk exists but isn't in the first N.
    q = (question or "").lower()
    q_tokens = set(re.findall(r"[a-z0-9-]+", q))
    q_has_age = "age" in q_tokens
    q_year_patterns = (
        "year-old",
        "years old",
        "year old",
        "y/o",
        "yo ",
        " yo",
    )

    scored: list[tuple[int, int]] = []  # (score, original_index)
    for idx, c in enumerate(chunks):
        t = (c.content or "").strip()
        tl = t.lower()
        score = 0
        for tok in q_tokens:
            if tok and tok in tl:
                score += 2
        if q_has_age and any(p in tl for p in q_year_patterns):
            score += 5
        scored.append((score, idx))

    # If everything scores 0, preserve original order (fallback).
    best_scores = sorted(scored, key=lambda x: (-x[0], x[1]))[:MAX_CONTEXT_CHUNKS]
    if all(s == 0 for s, _ in scored):
        chosen_indices = list(range(min(MAX_CONTEXT_CHUNKS, len(chunks))))
    else:
        chosen_indices = sorted(i for _, i in best_scores)

    parts: list[str] = []
    total = 0
    for c in (chunks[i] for i in chosen_indices):
        t = (c.content or "").strip()
        if not t:
            continue
        # Keep each chunk reasonably small to reduce latency + rate limit usage.
        if len(t) > 1800:
            t = t[:1800] + "…"
        if parts:
            parts.append("\n---\n")
            total += 6
        parts.append(t)
        total += len(t)
        if total >= MAX_CONTEXT_CHARS:
            break
    out = "".join(parts)
    if len(out) > MAX_CONTEXT_CHARS:
        out = out[:MAX_CONTEXT_CHARS] + "…"
    return out


def generate_clinical_answer(
    *,
    patient_id: int,
    question: str,
    chunks: list[DocumentChunk],
) -> tuple[str, str]:
    """Call Groq. Returns (answer_text, model_id_used). Raises on total failure."""
    api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")

    q_norm = (question or "").strip()
    cache_key = (int(patient_id), q_norm.lower())
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.info("Groq cache hit patient=%s qlen=%s", patient_id, len(q_norm))
        return cached, GROQ_MODEL

    context = _build_context(chunks, question)
    user_block = f"""Context:
{context}

User question:
{q_norm}"""

    client = Groq(api_key=api_key)
    backoffs = [1.0, 2.0, 4.0]
    last_err: Exception | None = None

    models_to_try = [GROQ_MODEL]
    for model_id in models_to_try:
        last_err = None
        for i, sleep_s in enumerate([0.0, *backoffs]):
            if sleep_s:
                time.sleep(sleep_s)
            try:
                logger.info(
                    "Groq request model=%s attempt=%s/%s ctx_len=%s",
                    model_id,
                    i + 1,
                    len(backoffs) + 1,
                    len(context),
                )
                resp = client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_block},
                    ],
                    temperature=TEMPERATURE,
                    top_p=TOP_P,
                    max_tokens=MAX_TOKENS,
                )
                text = ""
                try:
                    text = (resp.choices[0].message.content or "").strip()
                except Exception as e:  # noqa: BLE001
                    raise RuntimeError("Invalid response from language model") from e

                if text:
                    _cache_put(cache_key, text)
                return text, model_id
            except Exception as e:  # noqa: BLE001
                last_err = e
                msg = str(e)
                status = getattr(e, "status_code", None) or getattr(getattr(e, "response", None), "status_code", None)

                is_decommissioned = "decommissioned" in msg.lower() or "model_decommissioned" in msg.lower()
                if is_decommissioned and model_id != _FALLBACK_MODEL_ON_DECOMMISSION:
                    logger.warning(
                        "Groq model decommissioned (%s); switching to %s",
                        model_id,
                        _FALLBACK_MODEL_ON_DECOMMISSION,
                    )
                    models_to_try.append(_FALLBACK_MODEL_ON_DECOMMISSION)
                    break

                is_429 = status == 429 or "429" in msg or "rate" in msg.lower()
                if is_429 and i < len(backoffs):
                    logger.warning(
                        "Groq 429 rate limit; retrying in %.1fs (%s/%s)",
                        backoffs[i],
                        i + 1,
                        len(backoffs),
                    )
                    continue
                break

    # Let the caller fall back to stub answer after failures.
    if last_err is not None:
        raise RuntimeError(f"Groq LLM failed: {last_err}") from last_err
    raise RuntimeError("Groq LLM failed")


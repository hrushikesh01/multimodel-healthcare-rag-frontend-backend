from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    patient_id: int


class ChatResponse(BaseModel):
    answer: str
    chunk_ids: list[int]
    image_ids: list[int] = Field(
        default_factory=list,
        description="Imaging uploads included in context (metadata + PDF extract if applicable).",
    )
    patient_id: int
    answer_source: str = Field(
        description="llm=OpenRouter/Llama, stub=no API key (excerpts only), "
        "no_context=no chunks, fallback=LLM error"
    )
    model: str | None = Field(default=None, description="OpenRouter model id when answer_source is llm")


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    patient_id: int | None
    created_at: datetime | None

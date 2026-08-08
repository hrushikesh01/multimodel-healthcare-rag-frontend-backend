def chunk_text(text: str, max_chars: int = 1200, overlap: int = 200) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        piece = text[start:end]
        chunks.append(piece.strip())
        if end >= len(text):
            break
        start = end - overlap
        if start < 0:
            start = 0
    return [c for c in chunks if c]

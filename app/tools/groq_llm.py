from langchain_groq import ChatGroq
from app.core.config import get_settings


def get_llm(model: str | None = None, temperature: float = 0.2) -> ChatGroq:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return ChatGroq(
        groq_api_key=settings.groq_api_key,
        model=model or settings.groq_model,
        temperature=temperature,
    )

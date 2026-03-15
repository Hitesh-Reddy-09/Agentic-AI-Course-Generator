from __future__ import annotations

from langchain_core.messages import HumanMessage
from app.core.config import get_settings
from app.graph.state import GraphState
from app.rag.retriever import RAGRetriever
from app.tools.groq_llm import get_llm


def tutor_chat_agent(state: GraphState) -> GraphState:
    settings = get_settings()
    user_id = state.get("user_id", "anonymous")
    course_id = state.get("course_plan_id", "unknown")
    message = state.get("question") or state.get("query", "")

    collection_name = f"{settings.chroma_collection_prefix}-{user_id}-{course_id}"
    try:
        context = RAGRetriever(collection_name=collection_name).retrieve_context(message)
    except Exception:
        state["tutor_answer"] = (
            "Tutor retrieval index is currently unavailable. I can still help directly: "
            "tell me what part of this lesson is confusing and I will break it down simply."
        )
        return state

    try:
        llm = get_llm()
        response = llm.invoke(
            [
                HumanMessage(
                    content=(
                        "You are a tutor agent with access to course plan, progress, notes, and quiz history. "
                        f"Context:\n{context}\n\nUser message: {message}"
                    )
                )
            ]
        )
        state["tutor_answer"] = str(response.content)
    except Exception:
        state["tutor_answer"] = (
            "Tutor is in fallback mode. Next step: review the current lesson summary and retry the quiz. "
            "Ask for a specific concept and I will provide a focused revision plan."
        )
    return state

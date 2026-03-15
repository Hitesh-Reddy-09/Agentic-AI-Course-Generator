from __future__ import annotations

from langchain_core.messages import HumanMessage
from app.core.config import get_settings
from app.graph.state import GraphState
from app.rag.retriever import RAGRetriever
from app.tools.groq_llm import get_llm


def doubt_rag_agent(state: GraphState) -> GraphState:
    settings = get_settings()
    user_id = state.get("user_id", "anonymous")
    course_id = state.get("course_plan_id", "unknown")
    collection_name = f"{settings.chroma_collection_prefix}-{user_id}-{course_id}"

    question = state.get("question", "")
    try:
        context = RAGRetriever(collection_name=collection_name).retrieve_context(question)
    except Exception:
        state["rag_answer"] = (
            "I cannot access the retrieval index right now. I can still help from lesson context: "
            "share the exact concept or timestamp and I will explain it step by step."
        )
        return state
    try:
        llm = get_llm()
        answer = llm.invoke(
            [HumanMessage(content=f"Answer using only this context:\n{context}\n\nQuestion: {question}")]
        )
        state["rag_answer"] = str(answer.content)
    except Exception:
        state["rag_answer"] = (
            "I could not call the LLM right now. Based on retrieved notes, review the lesson summary "
            "and key points, then retry this doubt query."
        )
    return state
